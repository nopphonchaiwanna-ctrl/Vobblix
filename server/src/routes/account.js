// Account-settings endpoints that aren't part of the "me" resource
// (routes/auth.js): changing your password, and asking to have your
// account deleted. Deletion is request-only for now - there's no
// self-service "delete immediately" button, and no admin UI yet either;
// an admin processes account_deletion_requests by hand (query the table
// directly) the same way shop-owner applications started out before
// routes/admin.js existed. See migration 003.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { hashPassword, verifyPassword, isStrongPassword, PASSWORD_REQUIREMENT_MESSAGE } from "../auth.js";
import {
  getPasswordHash,
  updatePasswordHash,
  createDeletionRequest,
  latestDeletionRequestForUser,
} from "../db/users.js";
import { blockUser, unblockUser, listBlockedUsers } from "../db/blocks.js";

export const accountRouter = Router();

accountRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: PASSWORD_REQUIREMENT_MESSAGE });
    }

    const currentHash = await getPasswordHash(req.auth.userId);
    const ok = currentHash && (await verifyPassword(currentPassword || "", currentHash));
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const newHash = await hashPassword(newPassword);
    await updatePasswordHash(req.auth.userId, newHash);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

accountRouter.post("/delete-request", requireAuth, async (req, res, next) => {
  try {
    const reason = (req.body?.reason || "").trim().slice(0, 500);
    const latest = await latestDeletionRequestForUser(req.auth.userId);
    if (latest?.status === "pending") {
      return res.status(409).json({ error: "You already have a pending deletion request." });
    }
    const request = await createDeletionRequest(req.auth.userId, reason);
    res.status(201).json({ request });
  } catch (err) {
    if (err.code === "23505") {
      // Unique-violation backstop for the one-pending-per-user index, in
      // case of a race with the check above (same pattern as
      // routes/ownerApplications.js).
      return res.status(409).json({ error: "You already have a pending deletion request." });
    }
    next(err);
  }
});

accountRouter.get("/delete-request/me", requireAuth, async (req, res, next) => {
  try {
    const request = await latestDeletionRequestForUser(req.auth.userId);
    res.json({ request });
  } catch (err) {
    next(err);
  }
});

// ---------- Chat block list (migration 004) ----------
// One-way, per-user: only hides that person's chat messages from the
// caller - see client/src/ui/chat.js for the actual filtering.

accountRouter.post("/block", requireAuth, async (req, res, next) => {
  try {
    const blockedUserId = req.body?.userId;
    if (!blockedUserId) return res.status(400).json({ error: "userId is required." });
    if (blockedUserId === req.auth.userId) {
      return res.status(400).json({ error: "You can't block yourself." });
    }
    await blockUser(req.auth.userId, blockedUserId);
    res.json({ blocked: await listBlockedUsers(req.auth.userId) });
  } catch (err) {
    if (err.code === "23503") {
      // Foreign-key violation - blockedUserId doesn't name a real user.
      return res.status(404).json({ error: "That user doesn't exist." });
    }
    next(err);
  }
});

accountRouter.post("/unblock", requireAuth, async (req, res, next) => {
  try {
    const blockedUserId = req.body?.userId;
    if (!blockedUserId) return res.status(400).json({ error: "userId is required." });
    await unblockUser(req.auth.userId, blockedUserId);
    res.json({ blocked: await listBlockedUsers(req.auth.userId) });
  } catch (err) {
    next(err);
  }
});

accountRouter.get("/blocked", requireAuth, async (req, res, next) => {
  try {
    res.json({ blocked: await listBlockedUsers(req.auth.userId) });
  } catch (err) {
    next(err);
  }
});
