import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";

import { resolveScene } from "./scenes/index.js";
import { verifyToken } from "./auth.js";
import { getAvatarProfile, isActiveUser } from "./db/users.js";
import { isWithinTableRange } from "./tableRange.js";
import { authRouter } from "./routes/auth.js";
import { ownerApplicationsRouter } from "./routes/ownerApplications.js";
import { accountRouter } from "./routes/account.js";
import { createAdminRouter } from "./routes/admin.js";
import { shopsRouter } from "./routes/shops.js";
import { createTournamentsRouter } from "./routes/tournaments.js";
import { cardsRouter } from "./routes/cards.js";
import { decksRouter } from "./routes/decks.js";
import { createOrdersRouter } from "./routes/orders.js";
import { notificationsRouter } from "./routes/notifications.js";
import { apiLimiter, socketEventLimiter } from "./middleware/rateLimit.js";
import { requireAuth } from "./middleware/auth.js";
import { getIceServers } from "./services/iceServers.js";
import { pool } from "./db/pool.js";
import { getShopByCode, insertChatMessage, recentShopMessages, recentTableMessages } from "./db/shops.js";
import {
  addPlayer,
  removePlayer,
  getPlayer,
  listPlayers,
  updatePosition,
  setTable,
  tableRoomName,
  setInCall,
  setVideoOn,
  setMicMuted,
  setDeafened,
  voiceCountAtTable,
  videoCountAtTable,
} from "./rooms.js";

const PORT = process.env.PORT || 3001;

// Per-table call caps (see README's "Voice & video calls"). Voice is a
// full mesh so it's kept modest; video is capped tighter since a mesh's
// bandwidth cost scales with the *square* of participants sending video.
const VOICE_LIMIT = 10;
const VIDEO_LIMIT = 4;

// Browser origins allowed to call the API and open a socket. In
// production this is CORS_ORIGINS (comma-separated) or, failing that,
// CLIENT_URL - and the server refuses to start with neither, rather
// than quietly accepting every origin. In dev any origin is allowed, so
// testing from another device on the LAN (http://<lan-ip>:5173) works.
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);
if (IS_PRODUCTION && ALLOWED_ORIGINS.length === 0) {
  throw new Error("Set CORS_ORIGINS (or CLIENT_URL) in production - see server/.env.example.");
}
const corsOrigin = IS_PRODUCTION ? ALLOWED_ORIGINS : true;

const app = express();
// Behind Render's (or any host's) proxy, req.ip would otherwise be the
// proxy's address and every visitor would share one rate-limit bucket.
// TRUST_PROXY = number of proxy hops; defaults to 1 in production.
const trustProxy = process.env.TRUST_PROXY ?? (IS_PRODUCTION ? "1" : "0");
app.set("trust proxy", Number(trustProxy));
app.use(
  helmet({
    // The API only serves JSON to a client on another origin; the
    // default same-origin resource policy has nothing to protect here.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors({ origin: corsOrigin }));
// Raised from Express's 100kb default - PATCH /me's avatarUrl can now
// be a resized-photo data: URL (tens of KB; see ui/settings.js's
// fileToAvatarDataUrl() client-side and routes/auth.js's own length
// check server-side for the actual cap on what's accepted).
app.use(express.json({ limit: "2mb" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(apiLimiter);
app.use("/auth", authRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: corsOrigin },
});

// Mounted after `io` exists because /orders needs it (to push realtime
// notifications into a buyer/seller's `user:<id>` room - see below and
// routes/orders.js).
app.use("/owner-applications", ownerApplicationsRouter);
app.use("/account", accountRouter);
app.use("/admin", createAdminRouter(io));
app.use("/shops", shopsRouter);
app.use("/events", createTournamentsRouter(io));
app.use("/cards", cardsRouter);
app.use("/decks", decksRouter);
app.use("/orders", createOrdersRouter(io));
app.use("/notifications", notificationsRouter);
// STUN/TURN servers for a table call - see services/iceServers.js.
app.get("/webrtc/ice-servers", requireAuth, async (_req, res, next) => {
  try {
    res.json({ iceServers: await getIceServers() });
  } catch (err) {
    next(err);
  }
});

// Unknown routes get JSON like every other error, not Express's HTML page.
app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Every route hands failures to next(err) - this is where they land.
// Clients only ever see a generic message for a 500; the details stay
// in the server log.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "That upload is too large." });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body." });
  }
  // Postgres invalid_text_representation - e.g. a non-UUID in /:id.
  if (err.code === "22P02") {
    return res.status(404).json({ error: "Not found." });
  }
  console.error(`[http] ${req.method} ${req.originalUrl} failed:`, err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Something went wrong on our side - try again in a moment." });
});

// Every socket must carry a valid account token (see client/src/net/socket.js
// and client/src/auth/session.js) - VobbLiX requires an account, there's
// no anonymous/guest path anymore.
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  const user = verifyToken(token);
  if (!user) {
    return next(new Error("unauthorized"));
  }
  // Same deleted-account check as REST's requireAuth. Fails open on a
  // DB error, like the avatar lookup below - a hiccup shouldn't lock
  // everyone out of the floor.
  try {
    if (!(await isActiveUser(user.userId))) return next(new Error("unauthorized"));
  } catch (err) {
    console.error("[socket] account check failed:", err);
  }
  // avatarUrl isn't in the token itself (see auth.js's verifyToken) -
  // fetched fresh here instead, once per connection, so a photo change
  // in Settings shows up on the next shop join/reconnect rather than
  // only after a full re-login (an improvement over the displayName
  // staleness trade-off this app already accepted).
  // Same for the 3D character pick (avatarConfig, migration 019).
  try {
    Object.assign(user, await getAvatarProfile(user.userId));
  } catch {
    // a DB hiccup shouldn't block login - worst case, default look this session
    user.avatarUrl = null;
    user.avatarConfig = null;
  }
  socket.user = user; // { userId, displayName, avatarUrl, avatarConfig }
  next();
});

// socket.id -> { roomId, tableId, tables, shopDbId }
const socketMeta = new Map();

// If this socket is mid-call, tell the rest of that table's call it's
// gone and clear the call state - used whenever a socket leaves its
// current table (switching tables, leaving the floor, or disconnecting),
// since a call is scoped to "whoever's currently at this table".
function endCallForSocket(socket, meta) {
  if (!meta.tableId) return;
  const player = getPlayer(meta.roomId, socket.id);
  if (!player?.inCall) return;
  setInCall(meta.roomId, socket.id, false);
  socket.to(tableRoomName(meta.roomId, meta.tableId)).emit("call-peer-left", { id: socket.id });
}

// Shared by the explicit "leave-shop" event (the player clicked back to
// the lobby, but is keeping their socket connected - see the topbar's
// leaveShop() in client/src/main.js) and the "disconnect" event (tab
// closed, refresh, connection dropped). Either way: end any call, leave
// the table/shop rooms, remove them from the room's player list, and
// tell everyone else still in the shop they're gone.
function leaveShop(socket) {
  const meta = socketMeta.get(socket.id);
  if (!meta) return;
  endCallForSocket(socket, meta);
  if (meta.tableId) {
    socket.leave(tableRoomName(meta.roomId, meta.tableId));
  }
  removePlayer(meta.roomId, socket.id);
  socket.leave(meta.roomId);
  socket.to(meta.roomId).emit("player-left", { id: socket.id });
  socketMeta.delete(socket.id);
}

io.on("connection", (socket) => {
  // Per-socket flood limits. Movement is sent ~20x/second by a normal
  // client (see README's "How it works"), so its cap only stops
  // scripted spam; chat allows a quick burst, then tells the sender why
  // a message didn't go through instead of dropping it silently.
  const allowMove = socketEventLimiter({ windowMs: 1000, limit: 40 });
  const allowChat = socketEventLimiter({ windowMs: 10 * 1000, limit: 8 });
  function chatAllowed() {
    if (allowChat()) return true;
    socket.emit("rate-limited", { message: "You're sending messages too fast - wait a few seconds." });
    return false;
  }

  console.log(`[connect] ${socket.id} user=${socket.user.userId}`);

  // Lets REST routes (routes/orders.js) push realtime events to this
  // account regardless of which shop/table it's currently in, or even if
  // it's just sitting on the lobby/admin/owner-dashboard screens.
  socket.join(`user:${socket.user.userId}`);

  socket.on("join-shop", async ({ roomId }, ack) => {
    try {
      console.log(`[join-shop] ${socket.id} user=${socket.user.userId} roomId=${roomId}`);
      const cleanRoomId = (roomId || "").trim().toLowerCase() || "default";

      // Only shops that already exist (owner shops, admin central shops,
      // the "default" room from migration 017) - typing an unknown code
      // no longer creates one.
      const shop = await getShopByCode(cleanRoomId);
      if (!shop) {
        ack?.({ error: "No shop with that code - check it and try again." });
        return;
      }

      // Owner-created shops are gated: only visible to everyone once an
      // admin has published them (see README's "Becoming a shop owner").
      // The owner themself can still walk in early to preview it, same
      // as an admin reviewing it.
      if (shop.owner_user_id && shop.status !== "published" && shop.owner_user_id !== socket.user.userId) {
        ack?.({ error: "This shop isn't open to the public yet." });
        return;
      }

      const scene = resolveScene(shop);

      // The socket outlives a shop visit (the client keeps it across
      // lobby <-> shop), so re-read the look here - a character or photo
      // changed in Settings since connecting shows on this very join.
      try {
        Object.assign(socket.user, await getAvatarProfile(socket.user.userId));
      } catch {
        // keep whatever the handshake loaded
      }

      const spawn = {
        x: scene.SPAWN.x + (Math.random() * 60 - 30),
        y: scene.SPAWN.y + (Math.random() * 60 - 30),
      };

      const player = addPlayer(
        cleanRoomId,
        socket.id,
        socket.user.userId,
        socket.user.displayName,
        socket.user.avatarUrl,
        spawn,
        socket.user.avatarConfig
      );
      socketMeta.set(socket.id, {
        roomId: cleanRoomId,
        tableId: null,
        tables: scene.TABLES,
        shopDbId: shop.id,
      });

      socket.join(cleanRoomId);

      const shopHistory = await recentShopMessages(shop.id);

      // Tell the new player about the world, who's already here, and the
      // persisted chat log for this shop. (Exclude themselves from
      // `players` - the client adds its own local player separately, so
      // including it here would draw a duplicate, stationary avatar.)
      ack?.({
        you: player,
        roomId: cleanRoomId,
        sceneType: scene.id,
        floor: { width: scene.FLOOR_WIDTH, height: scene.FLOOR_HEIGHT },
        tables: scene.TABLES,
        counter: scene.COUNTER,
        board: scene.BOARD,
        theme: scene.theme,
        isOwnedShop: !!shop.owner_user_id,
        shopDbId: shop.id,
        players: listPlayers(cleanRoomId).filter((p) => p.id !== socket.id),
        shopHistory,
      });

      // Tell everyone else a new player showed up.
      socket.to(cleanRoomId).emit("player-joined", player);
    } catch (err) {
      console.error("[join-shop] failed:", err);
      ack?.({ error: "Couldn't join that shop right now - try again in a moment." });
    }
  });

  socket.on("move", ({ x, y }) => {
    if (!allowMove()) return;
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const player = updatePosition(meta.roomId, socket.id, x, y);
    if (!player) return;
    socket.to(meta.roomId).emit("player-moved", { id: socket.id, x, y });
  });

  socket.on("join-table", async ({ tableId }, ack) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const table = meta.tables.find((t) => t.id === tableId);
    if (!table) return; // unknown table, ignore
    if (!isWithinTableRange(getPlayer(meta.roomId, socket.id), table)) {
      ack?.({ error: "too-far" });
      return;
    }

    // Leave previous table room, if any - and end any call there, since a
    // call only ever includes "whoever's at this table right now".
    if (meta.tableId) {
      endCallForSocket(socket, meta);
      socket.leave(tableRoomName(meta.roomId, meta.tableId));
    }
    socket.join(tableRoomName(meta.roomId, tableId));
    meta.tableId = tableId;
    setTable(meta.roomId, socket.id, tableId);

    io.to(meta.roomId).emit("player-table-changed", {
      id: socket.id,
      tableId,
    });

    try {
      const history = await recentTableMessages(meta.shopDbId, tableId);
      ack?.({ history });
    } catch (err) {
      console.error("[join-table] history load failed:", err);
      ack?.({ history: [] });
    }
  });

  socket.on("leave-table", () => {
    const meta = socketMeta.get(socket.id);
    if (!meta || !meta.tableId) return;
    endCallForSocket(socket, meta);
    socket.leave(tableRoomName(meta.roomId, meta.tableId));
    meta.tableId = null;
    setTable(meta.roomId, socket.id, null);

    io.to(meta.roomId).emit("player-table-changed", {
      id: socket.id,
      tableId: null,
    });
  });

  socket.on("shop-chat", async ({ text }) => {
    const meta = socketMeta.get(socket.id);
    const clean = (text || "").trim().slice(0, 500);
    if (!meta || !clean || !chatAllowed()) return;
    try {
      const saved = await insertChatMessage({
        shopId: meta.shopDbId,
        tableId: null,
        userId: socket.user.userId,
        authorName: socket.user.displayName,
        text: clean,
      });
      io.to(meta.roomId).emit("shop-chat", {
        id: saved.id,
        from: saved.author_name,
        fromId: socket.id,
        // Stable across reconnects (unlike fromId/socket.id) - needed
        // client-side to filter out a blocked user's messages even
        // after they reconnect with a new socket (see
        // client/src/ui/chat.js).
        fromUserId: socket.user.userId,
        text: saved.text,
        at: new Date(saved.created_at).getTime(),
      });
    } catch (err) {
      console.error("[shop-chat] failed to persist:", err);
    }
  });

  socket.on("table-chat", async ({ text }) => {
    const meta = socketMeta.get(socket.id);
    const clean = (text || "").trim().slice(0, 500);
    if (!meta || !meta.tableId || !clean || !chatAllowed()) return;
    try {
      const saved = await insertChatMessage({
        shopId: meta.shopDbId,
        tableId: meta.tableId,
        userId: socket.user.userId,
        authorName: socket.user.displayName,
        text: clean,
      });
      io.to(tableRoomName(meta.roomId, meta.tableId)).emit("table-chat", {
        id: saved.id,
        tableId: meta.tableId,
        from: saved.author_name,
        fromId: socket.id,
        fromUserId: socket.user.userId,
        text: saved.text,
        at: new Date(saved.created_at).getTime(),
      });
    } catch (err) {
      console.error("[table-chat] failed to persist:", err);
    }
  });

  // ---------- Voice/video calls (per table, WebRTC mesh) ----------
  // The server never sees any audio/video - only signaling (who's in the
  // call, and offer/answer/ICE relayed between peers). See
  // client/src/webrtc/callManager.js for the browser side.

  socket.on("join-call", (_payload, ack) => {
    const meta = socketMeta.get(socket.id);
    if (!meta || !meta.tableId) return ack?.({ ok: false, reason: "not-seated" });

    if (voiceCountAtTable(meta.roomId, meta.tableId) >= VOICE_LIMIT) {
      return ack?.({ ok: false, reason: "voice-full" });
    }

    const player = setInCall(meta.roomId, socket.id, true);
    if (!player) return ack?.({ ok: false, reason: "unknown" });

    // Existing call members at this table - the joiner dials each of
    // these (see callManager's "joiner always makes the offer" rule,
    // which avoids two peers racing to offer each other at once).
    const peers = listPlayers(meta.roomId)
      .filter((p) => p.tableId === meta.tableId && p.inCall && p.id !== socket.id)
      .map((p) => ({ id: p.id, name: p.name, videoOn: p.videoOn, micMuted: p.micMuted, deafened: p.deafened }));

    socket.to(tableRoomName(meta.roomId, meta.tableId)).emit("call-peer-joined", {
      id: socket.id,
      name: player.name,
    });

    ack?.({ ok: true, peers });
  });

  socket.on("leave-call", () => {
    const meta = socketMeta.get(socket.id);
    if (!meta || !meta.tableId) return;
    const player = getPlayer(meta.roomId, socket.id);
    if (!player?.inCall) return;
    setInCall(meta.roomId, socket.id, false);
    socket.to(tableRoomName(meta.roomId, meta.tableId)).emit("call-peer-left", { id: socket.id });
  });

  socket.on("enable-video", (_payload, ack) => {
    const meta = socketMeta.get(socket.id);
    if (!meta || !meta.tableId) return ack?.({ ok: false, reason: "not-seated" });

    const player = getPlayer(meta.roomId, socket.id);
    if (!player?.inCall) return ack?.({ ok: false, reason: "not-in-call" });

    if (videoCountAtTable(meta.roomId, meta.tableId) >= VIDEO_LIMIT) {
      return ack?.({ ok: false, reason: "video-full" });
    }

    setVideoOn(meta.roomId, socket.id, true);
    socket.to(tableRoomName(meta.roomId, meta.tableId)).emit("call-peer-video-on", { id: socket.id });
    ack?.({ ok: true });
  });

  socket.on("disable-video", () => {
    const meta = socketMeta.get(socket.id);
    if (!meta || !meta.tableId) return;
    setVideoOn(meta.roomId, socket.id, false);
    socket.to(tableRoomName(meta.roomId, meta.tableId)).emit("call-peer-video-off", { id: socket.id });
  });

  // Mic mute and "deafen" (mute incoming audio) are broadcast purely so
  // other participants can show a status badge, Discord-style - the
  // actual audio muting happens client-side (the track's .enabled flag
  // for mic, the <video> element's .muted flag for deafen - see
  // webrtc/callManager.js and ui/call.js). Both require being in the
  // call already; neither needs an ack, they're not gated by any limit.
  socket.on("mute-mic", () => {
    const meta = socketMeta.get(socket.id);
    if (!meta || !meta.tableId) return;
    const player = getPlayer(meta.roomId, socket.id);
    if (!player?.inCall) return;
    setMicMuted(meta.roomId, socket.id, true);
    socket.to(tableRoomName(meta.roomId, meta.tableId)).emit("call-peer-mic-muted", { id: socket.id });
  });

  socket.on("unmute-mic", () => {
    const meta = socketMeta.get(socket.id);
    if (!meta || !meta.tableId) return;
    const player = getPlayer(meta.roomId, socket.id);
    if (!player?.inCall) return;
    setMicMuted(meta.roomId, socket.id, false);
    socket.to(tableRoomName(meta.roomId, meta.tableId)).emit("call-peer-mic-unmuted", { id: socket.id });
  });

  socket.on("deafen", () => {
    const meta = socketMeta.get(socket.id);
    if (!meta || !meta.tableId) return;
    const player = getPlayer(meta.roomId, socket.id);
    if (!player?.inCall) return;
    setDeafened(meta.roomId, socket.id, true);
    socket.to(tableRoomName(meta.roomId, meta.tableId)).emit("call-peer-deafened", { id: socket.id });
  });

  socket.on("undeafen", () => {
    const meta = socketMeta.get(socket.id);
    if (!meta || !meta.tableId) return;
    const player = getPlayer(meta.roomId, socket.id);
    if (!player?.inCall) return;
    setDeafened(meta.roomId, socket.id, false);
    socket.to(tableRoomName(meta.roomId, meta.tableId)).emit("call-peer-undeafened", { id: socket.id });
  });

  // Generic WebRTC signaling relay - the payload (SDP offer/answer or an
  // ICE candidate) is opaque to the server, it just forwards it to the
  // named peer. Only relayed within the sender's own current table, so a
  // socket can't be used to reach peers outside its own table-call.
  socket.on("call-signal", ({ to, data }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta || !to) return;
    const targetMeta = socketMeta.get(to);
    if (!targetMeta || targetMeta.roomId !== meta.roomId || targetMeta.tableId !== meta.tableId) return;
    io.to(to).emit("call-signal", { from: socket.id, data });
  });

  // Explicit "I'm going back to the lobby" - unlike disconnect, the
  // socket itself stays open (still joined to `user:<id>` for order
  // push notifications), only shop/table membership is torn down.
  socket.on("leave-shop", () => leaveShop(socket));

  socket.on("disconnect", () => {
    leaveShop(socket);
  });
});

server.listen(PORT, () => {
  console.log(`VobbLiX server listening on http://localhost:${PORT}`);
});

// Log instead of crashing silently on a stray rejection, and shut down
// cleanly when the host stops the process (Render sends SIGTERM on every
// deploy): stop taking connections, close sockets, drain the pg pool.
process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandled promise rejection:", reason);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[process] ${signal} received - shutting down`);
  // Hard stop if something hangs (open keep-alive sockets, a slow query).
  setTimeout(() => process.exit(1), 10000).unref();
  io.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
