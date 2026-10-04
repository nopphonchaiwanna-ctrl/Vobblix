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
import { listShopsByStatus, setShopReviewStatus } from "../db/shops.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

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
    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/shops/:id/reject", async (req, res, next) => {
  try {
    const reason = (req.body?.reason || "").trim().slice(0, 500);
    const shop = await setShopReviewStatus(req.params.id, {
      status: "rejected",
      reviewedBy: req.auth.userId,
      rejectionReason: reason,
    });
    if (!shop) return res.status(404).json({ error: "No owner shop with that id." });
    res.json({ shop });
  } catch (err) {
    next(err);
  }
});
