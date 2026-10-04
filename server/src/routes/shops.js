// Owner-facing shop management (create/edit your one shop, manage its
// listings) plus the public marketplace directory. Becoming able to
// create a shop at all requires role "shop_owner" (see
// routes/ownerApplications.js + routes/admin.js); a newly-created shop
// starts in "pending_review" and only customers can see it once an
// admin publishes it (see README's "Becoming a shop owner").

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getShopById,
  getShopByOwner,
  createOwnedShop,
  updateOwnedShop,
  isValidShopCode,
  listPublishedShops,
} from "../db/shops.js";
import { listLayoutTemplates } from "../scenes/templates.js";
import { listThemes, isValidTheme, DEFAULT_THEME_ID } from "../scenes/themes.js";
import { DEFAULT_LAYOUT_TEMPLATE_ID } from "../scenes/templates.js";
import {
  createListing,
  updateListing,
  listListingsForShop,
} from "../db/marketplace.js";

export const shopsRouter = Router();

// ---------- Public ----------

shopsRouter.get("/public", async (_req, res, next) => {
  try {
    res.json({ shops: await listPublishedShops() });
  } catch (err) {
    next(err);
  }
});

shopsRouter.get("/templates", (_req, res) => {
  res.json({ templates: listLayoutTemplates(), themes: listThemes() });
});

// Listings of a published shop are public (anyone can browse before
// deciding to walk in); an owner/admin previewing their own
// pending/rejected shop needs auth, handled by the guard below.
shopsRouter.get("/:id/listings", async (req, res, next) => {
  try {
    const shop = await getShopById(req.params.id);
    if (!shop || !shop.owner_user_id) return res.status(404).json({ error: "Shop not found." });
    if (shop.status !== "published") {
      return res.status(404).json({ error: "Shop not found." });
    }
    res.json({ shop: publicShop(shop), listings: await listListingsForShop(shop.id, { activeOnly: true }) });
  } catch (err) {
    next(err);
  }
});

// ---------- Owner ----------

shopsRouter.use(requireAuth);

shopsRouter.get("/mine", async (req, res, next) => {
  try {
    const shop = await getShopByOwner(req.auth.userId);
    if (!shop) return res.json({ shop: null });
    res.json({ shop, listings: await listListingsForShop(shop.id) });
  } catch (err) {
    next(err);
  }
});

shopsRouter.post("/", requireRole("shop_owner", "admin"), async (req, res, next) => {
  try {
    const existing = await getShopByOwner(req.auth.userId);
    if (existing) {
      return res.status(409).json({ error: "You already have a shop. Edit it instead of creating a new one." });
    }

    const code = (req.body?.code || "").trim().toLowerCase();
    const name = (req.body?.name || "").trim().slice(0, 40);
    const description = (req.body?.description || "").trim().slice(0, 500);
    const layoutTemplateId = req.body?.layoutTemplateId || DEFAULT_LAYOUT_TEMPLATE_ID;
    const theme = req.body?.theme || DEFAULT_THEME_ID;
    const logoUrl = (req.body?.logoUrl || "").trim().slice(0, 500);

    if (!isValidShopCode(code)) {
      return res.status(400).json({ error: "Shop code must be 3-24 characters: lowercase letters, numbers, dashes." });
    }
    if (!name) return res.status(400).json({ error: "Enter a shop name." });
    if (!isValidTheme(theme)) return res.status(400).json({ error: "Unknown theme." });

    const shop = await createOwnedShop({
      ownerUserId: req.auth.userId,
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

shopsRouter.patch("/:id", async (req, res, next) => {
  try {
    const shop = await updateOwnedShop(req.params.id, req.auth.userId, {
      name: trimmedOr(req.body?.name, 40),
      description: trimmedOr(req.body?.description, 500),
      layoutTemplateId: req.body?.layoutTemplateId,
      theme: req.body?.theme,
      logoUrl: trimmedOr(req.body?.logoUrl, 500),
    });
    if (!shop) return res.status(404).json({ error: "You don't own a shop with that id." });
    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

// ---------- Owner: listings ----------

shopsRouter.post("/:id/listings", async (req, res, next) => {
  try {
    const shop = await getShopById(req.params.id);
    if (!shop || shop.owner_user_id !== req.auth.userId) {
      return res.status(404).json({ error: "You don't own a shop with that id." });
    }
    const title = (req.body?.title || "").trim().slice(0, 80);
    const priceCents = Number(req.body?.priceCents);
    if (!title) return res.status(400).json({ error: "Enter a listing title." });
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      return res.status(400).json({ error: "Price must be a whole number of cents, 0 or more." });
    }
    const listing = await createListing(shop.id, {
      title,
      description: (req.body?.description || "").trim().slice(0, 500),
      priceCents,
      currency: req.body?.currency,
      photoUrl: (req.body?.photoUrl || "").trim().slice(0, 500),
      stockQty: req.body?.stockQty === "" || req.body?.stockQty == null ? null : Number(req.body.stockQty),
    });
    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
});

shopsRouter.patch("/:id/listings/:listingId", async (req, res, next) => {
  try {
    const shop = await getShopById(req.params.id);
    if (!shop || shop.owner_user_id !== req.auth.userId) {
      return res.status(404).json({ error: "You don't own a shop with that id." });
    }
    const listing = await updateListing(req.params.listingId, shop.id, {
      title: trimmedOr(req.body?.title, 80),
      description: trimmedOr(req.body?.description, 500),
      priceCents: req.body?.priceCents !== undefined ? Number(req.body.priceCents) : undefined,
      photoUrl: trimmedOr(req.body?.photoUrl, 500),
      stockQty: req.body?.stockQty === "" ? null : req.body?.stockQty !== undefined ? Number(req.body.stockQty) : undefined,
      status: req.body?.status,
    });
    if (!listing) return res.status(404).json({ error: "No listing with that id in this shop." });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

function trimmedOr(value, maxLen) {
  return value === undefined ? undefined : String(value).trim().slice(0, maxLen);
}

function publicShop(shop) {
  return {
    id: shop.id,
    code: shop.code,
    name: shop.name,
    description: shop.description,
    logoUrl: shop.logo_url,
    theme: shop.theme,
  };
}
