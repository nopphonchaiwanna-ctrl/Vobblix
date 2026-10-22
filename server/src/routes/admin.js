// Admin-only review queues: shop-owner applications and owner-created
// shops, both gated behind requireRole("admin"). There's no admin UI
// bootstrap here on purpose - the first admin is made with
// `node scripts/set-role.js <email> admin` (see README).

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  listApplicationsByStatus,
  approveApplication,
  rejectApplication,
} from "../db/marketplace.js";
import {
  listShopsByStatus,
  setShopReviewStatus,
  createAdminShop,
  listAdminShops,
  isValidShopCode,
  listShopReviewEvents,
  getShopReviewDetail,
} from "../db/shops.js";
import { createNotification, publicNotification } from "../db/notifications.js";
import {
  listPendingDeletionRequests,
  getDeletionRequestDetail,
  approveDeletionRequest,
  declineDeletionRequest,
} from "../db/accountDeletion.js";
import { isValidTheme, DEFAULT_THEME_ID } from "../scenes/themes.js";
import { DEFAULT_LAYOUT_TEMPLATE_ID } from "../scenes/templates.js";
import { listDeckStatsRows } from "../db/eventDecks.js";
import { computeDeckStats, bangkokRange } from "../tournament/deckStats.js";

// Takes `io` (same reason as routes/orders.js's createOrdersRouter) so
// rejecting a shop can push a realtime "fix this and resubmit" notice
// to the owner, not just write rejection_reason to a row they might not
// think to go check - see the /shops/:id/reject route below.
export function createAdminRouter(io) {
  const adminRouter = Router();
  adminRouter.use(requireAuth, requireRole("admin"));

  // Persist first (so an owner who's offline right now still sees it in
  // their bell on next login - see db/notifications.js), then push live.
  // Best-effort: the review itself already succeeded, so a failure here
  // is logged rather than turned into an error response.
  async function notifyOwner(shop, kind, message) {
    if (!shop.owner_user_id) return;
    try {
      const n = await createNotification({ userId: shop.owner_user_id, kind, message, target: "/my-shop" });
      io.to(`user:${shop.owner_user_id}`).emit("notification:new", publicNotification(n));
    } catch (err) {
      console.error("[admin] failed to notify shop owner", err);
    }
  }

  // G3 stats across every finished JP D-Standard event that collected
  // decks, optionally limited to whole Bangkok days (deck-stats design §7.4).
  adminRouter.get("/deck-stats", async (req, res, next) => {
    try {
      const range = bangkokRange(req.query.from || undefined, req.query.to || undefined);
      if (range.error) return res.status(400).json({ error: range.error });
      const { players, matches, eventCount } = await listDeckStatsRows(range);
      res.json({ stats: computeDeckStats({ players, matches }), eventCount });
    } catch (err) {
      next(err);
    }
  });

  adminRouter.get("/owner-applications", async (req, res, next) => {
    try {
      const status = req.query.status || "pending";
      res.json({ applications: await listApplicationsByStatus(status) });
    } catch (err) {
      next(err);
    }
  });

  adminRouter.post("/owner-applications/:id/approve", async (req, res, next) => {
    try {
      const application = await approveApplication(req.params.id, req.auth.userId);
      if (!application) return res.status(404).json({ error: "No pending application with that id." });
      res.json({ application });
    } catch (err) {
      next(err);
    }
  });

  adminRouter.post("/owner-applications/:id/reject", async (req, res, next) => {
    try {
      const reason = (req.body?.reason || "").trim().slice(0, 500);
      const application = await rejectApplication(req.params.id, req.auth.userId, reason);
      if (!application) return res.status(404).json({ error: "No pending application with that id." });
      res.json({ application });
    } catch (err) {
      next(err);
    }
  });

  adminRouter.get("/shops", async (req, res, next) => {
    try {
      const status = req.query.status || "pending_review";
      res.json({ shops: await listShopsByStatus(status) });
    } catch (err) {
      next(err);
    }
  });

  adminRouter.post("/shops/:id/approve", async (req, res, next) => {
    try {
      const shop = await setShopReviewStatus(req.params.id, { status: "published", reviewedBy: req.auth.userId });
      if (!shop) return res.status(404).json({ error: "No owner shop with that id." });
      await notifyOwner(shop, "shop_published", `"${shop.name}" was approved and is now published.`);
      res.json({ shop });
    } catch (err) {
      next(err);
    }
  });

  adminRouter.post("/shops/:id/reject", async (req, res, next) => {
    try {
      const reason = (req.body?.reason || "").trim().slice(0, 500);
      // Required now (the client's shop-detail page has a dedicated
      // textarea for it, not an optional window.prompt() anymore) - a
      // rejection with no reason gives the owner nothing to act on.
      if (!reason) return res.status(400).json({ error: "Enter a reason so the owner knows what to fix." });

      const shop = await setShopReviewStatus(req.params.id, {
        status: "rejected",
        reviewedBy: req.auth.userId,
        rejectionReason: reason,
      });
      if (!shop) return res.status(404).json({ error: "No owner shop with that id." });

      await notifyOwner(shop, "shop_rejected", `"${shop.name}" was rejected: ${reason}`);

      res.json({ shop });
    } catch (err) {
      next(err);
    }
  });

  // Review history tab - the append-only log from migration 016.
  adminRouter.get("/shop-reviews", async (_req, res, next) => {
    try {
      res.json({ events: await listShopReviewEvents() });
    } catch (err) {
      next(err);
    }
  });

  // One shop's detail page from the Review history tab: the shop as it
  // is now plus its full timeline (oldest first).
  adminRouter.get("/shops/:id/reviews", async (req, res, next) => {
    try {
      const detail = await getShopReviewDetail(req.params.id);
      if (!detail) return res.status(404).json({ error: "No owner shop with that id." });
      res.json(detail);
    } catch (err) {
      next(err);
    }
  });

  // ---------- Account deletion requests ----------
  // Approving anonymizes the account (see db/accountDeletion.js for
  // exactly what's scrubbed vs kept) and kicks its live sockets.

  adminRouter.get("/deletion-requests", async (_req, res, next) => {
    try {
      res.json({ requests: await listPendingDeletionRequests() });
    } catch (err) {
      next(err);
    }
  });

  adminRouter.get("/deletion-requests/:id", async (req, res, next) => {
    try {
      const detail = await getDeletionRequestDetail(req.params.id);
      if (!detail) return res.status(404).json({ error: "No such deletion request." });
      res.json(detail);
    } catch (err) {
      next(err);
    }
  });

  adminRouter.post("/deletion-requests/:id/approve", async (req, res, next) => {
    try {
      const result = await approveDeletionRequest(req.params.id, req.auth.userId);
      if (!result) return res.status(409).json({ error: "This request was already handled." });
      io.in(`user:${result.userId}`).disconnectSockets(true);
      res.json(result);
    } catch (err) {
      if (err.code === "IS_ADMIN") return res.status(409).json({ error: err.message });
      next(err);
    }
  });

  adminRouter.post("/deletion-requests/:id/decline", async (req, res, next) => {
    try {
      const reason = (req.body?.reason || "").trim().slice(0, 500);
      if (!reason) return res.status(400).json({ error: "Enter a reason so the user knows why." });
      const request = await declineDeletionRequest(req.params.id, req.auth.userId, reason);
      if (!request) return res.status(409).json({ error: "This request was already handled." });
      try {
        const n = await createNotification({
          userId: request.user_id,
          kind: "account_deletion_declined",
          message: `Your account deletion request was declined: ${reason}`,
          target: "/settings",
        });
        io.to(`user:${request.user_id}`).emit("notification:new", publicNotification(n));
      } catch (err) {
        console.error("[admin] failed to notify user of declined deletion", err);
      }
      res.json({ request });
    } catch (err) {
      next(err);
    }
  });

  // ---------- Central ("admin") shops ----------
  // A separate thing from the review queue above: these are shops the
  // admin creates and owns directly (see db/shops.js's createAdminShop),
  // published immediately, not capped at one per admin. Path is
  // "central-shops" rather than reusing "shops" so it doesn't collide
  // with the review-queue GET /admin/shops above.

  adminRouter.get("/central-shops", async (_req, res, next) => {
    try {
      res.json({ shops: await listAdminShops() });
    } catch (err) {
      next(err);
    }
  });

  adminRouter.post("/central-shops", async (req, res, next) => {
    try {
      const code = (req.body?.code || "").trim().toLowerCase();
      const name = (req.body?.name || "").trim().slice(0, 40);
      const description = (req.body?.description || "").trim().slice(0, 500);
      const layoutTemplateId = req.body?.layoutTemplateId || DEFAULT_LAYOUT_TEMPLATE_ID;
      const theme = req.body?.theme || DEFAULT_THEME_ID;
      // Same "data: URL, not a real upload endpoint" pattern as the owner
      // dashboard's shop logo (see client/src/ui/imageUpload.js) - up to
      // 500KB, not 500 chars.
      const logoUrl = (req.body?.logoUrl || "").trim().slice(0, 500_000);

      if (!isValidShopCode(code)) {
        return res.status(400).json({ error: "Shop code must be 3-24 characters: lowercase letters, numbers, dashes." });
      }
      if (!name) return res.status(400).json({ error: "Enter a shop name." });
      if (!isValidTheme(theme)) return res.status(400).json({ error: "Unknown theme." });

      const shop = await createAdminShop({
        createdBy: req.auth.userId,
        code,
        name,
        description,
        layoutTemplateId,
        theme,
        logoUrl,
      });
      res.status(201).json({ shop });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "That shop code is already taken." });
      }
      next(err);
    }
  });

  return adminRouter;
}
