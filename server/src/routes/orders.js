// Buy/sell order threads: a buyer "inquires" about a listing, which
// opens a persisted chat thread with the seller (the shop owner) to
// arrange the sale by hand - see migration 002's comment on
// payment_provider/payment_reference for the future-gateway hook this
// leaves in place. Realtime push uses the same authenticated socket
// connection as the rest of the app (see index.js's `user:<id>` room);
// REST is still the source of truth so nothing is lost if the other
// side isn't currently connected.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getListingById } from "../db/marketplace.js";
import { getShopById } from "../db/shops.js";
import {
  createOrder,
  getOrderById,
  listOrdersForUser,
  setOrderStatus,
  insertOrderMessage,
  listOrderMessages,
} from "../db/marketplace.js";

export function createOrdersRouter(io) {
  const router = Router();
  router.use(requireAuth);

  router.get("/mine", async (req, res, next) => {
    try {
      res.json({ orders: await listOrdersForUser(req.auth.userId) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const listing = await getListingById(req.body?.listingId);
      if (!listing || listing.status !== "active") {
        return res.status(404).json({ error: "That listing isn't available anymore." });
      }
      const shop = await getShopById(listing.shop_id);
      if (shop.owner_user_id === req.auth.userId) {
        return res.status(400).json({ error: "You can't buy your own listing." });
      }
      const quantity = Math.max(1, Number(req.body?.quantity) || 1);
      const message = (req.body?.message || "").trim().slice(0, 500);
      if (!message) return res.status(400).json({ error: "Say something to the seller to start the order." });

      const order = await createOrder({
        listingId: listing.id,
        shopId: shop.id,
        buyerId: req.auth.userId,
        sellerId: shop.owner_user_id,
        quantity,
        priceCentsSnapshot: listing.price_cents,
      });
      const saved = await insertOrderMessage({
        orderId: order.id,
        senderId: req.auth.userId,
        authorName: req.auth.displayName,
        text: message,
      });
      notify(io, shop.owner_user_id, "order:new", {
        orderId: order.id,
        listingTitle: listing.title,
        buyerName: req.auth.displayName,
      });
      res.status(201).json({ order, message: saved });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const order = await loadAuthorizedOrder(req);
      if (!order) return res.status(404).json({ error: "Order not found." });
      res.json({ order, messages: await listOrderMessages(order.id) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/messages", async (req, res, next) => {
    try {
      const order = await loadAuthorizedOrder(req);
      if (!order) return res.status(404).json({ error: "Order not found." });
      const text = (req.body?.text || "").trim().slice(0, 500);
      if (!text) return res.status(400).json({ error: "Message can't be empty." });

      const saved = await insertOrderMessage({
        orderId: order.id,
        senderId: req.auth.userId,
        authorName: req.auth.displayName,
        text,
      });
      const otherParty = order.buyer_id === req.auth.userId ? order.seller_id : order.buyer_id;
      notify(io, otherParty, "order:message", {
        orderId: order.id,
        message: saved,
        listingTitle: order.listing_title,
      });
      res.status(201).json({ message: saved });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/status", async (req, res, next) => {
    try {
      const order = await loadAuthorizedOrder(req);
      if (!order) return res.status(404).json({ error: "Order not found." });
      const actorRole = order.buyer_id === req.auth.userId ? "buyer" : "seller";
      const updated = await setOrderStatus(order.id, actorRole, order.status, req.body?.status);
      if (!updated) return res.status(400).json({ error: "That status change isn't allowed right now." });

      const otherParty = actorRole === "buyer" ? order.seller_id : order.buyer_id;
      notify(io, otherParty, "order:status", {
        orderId: order.id,
        status: updated.status,
        listingTitle: order.listing_title,
      });
      res.json({ order: updated });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

async function loadAuthorizedOrder(req) {
  const order = await getOrderById(req.params.id);
  if (!order) return null;
  if (order.buyer_id !== req.auth.userId && order.seller_id !== req.auth.userId) return null;
  return order;
}

// Best-effort push to whichever of the user's tabs/sockets are currently
// connected (see index.js's `socket.join(\`user:\${id}\`)`) - REST above
// already persisted everything, so a missed notification just means the
// other party sees it next time they open "My orders" instead of live.
function notify(io, userId, event, payload) {
  io.to(`user:${userId}`).emit(event, payload);
}
