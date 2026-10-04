// "Become a shop owner" application flow - any logged-in customer can
// apply once; an admin approves/rejects (see routes/admin.js). See
// README's "Becoming a shop owner".

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createOwnerApplication, latestApplicationForUser } from "../db/marketplace.js";

export const ownerApplicationsRouter = Router();

ownerApplicationsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const message = (req.body?.message || "").trim().slice(0, 500);
    const latest = await latestApplicationForUser(req.auth.userId);
    if (latest?.status === "pending") {
      return res.status(409).json({ error: "You already have an application pending review." });
    }
    const application = await createOwnerApplication(req.auth.userId, message);
    res.status(201).json({ application });
  } catch (err) {
    if (err.code === "23505") {
      // Unique-violation backstop for the one-pending-per-user index, in
      // case of a race with the check above.
      return res.status(409).json({ error: "You already have an application pending review." });
    }
    next(err);
  }
});

ownerApplicationsRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const application = await latestApplicationForUser(req.auth.userId);
    res.json({ application });
  } catch (err) {
    next(err);
  }
});
