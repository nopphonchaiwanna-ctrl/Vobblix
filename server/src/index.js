import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import { resolveScene, DEFAULT_SCENE_ID } from "./scenes/index.js";
import { verifyToken } from "./auth.js";
import { getAvatarUrl } from "./db/users.js";
import { authRouter } from "./routes/auth.js";
import { ownerApplicationsRouter } from "./routes/ownerApplications.js";
import { accountRouter } from "./routes/account.js";
import { adminRouter } from "./routes/admin.js";
import { shopsRouter } from "./routes/shops.js";
import { createOrdersRouter } from "./routes/orders.js";
import { findOrCreateShop, insertChatMessage, recentShopMessages, recentTableMessages } from "./db/shops.js";
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

const app = express();
app.use(cors());
// Raised from Express's 100kb default - PATCH /me's avatarUrl can now
// be a resized-photo data: URL (tens of KB; see ui/settings.js's
// fileToAvatarDataUrl() client-side and routes/auth.js's own length
// check server-side for the actual cap on what's accepted).
app.use(express.json({ limit: "2mb" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Mounted after `io` exists because /orders needs it (to push realtime
// notifications into a buyer/seller's `user:<id>` room - see below and
// routes/orders.js).
app.use("/owner-applications", ownerApplicationsRouter);
app.use("/account", accountRouter);
app.use("/admin", adminRouter);
app.use("/shops", shopsRouter);
app.use("/orders", createOrdersRouter(io));

// Every socket must carry a valid account token (see client/src/net/socket.js
// and client/src/auth/session.js) - VobbLiX requires an account, there's
// no anonymous/guest path anymore.
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  const user = verifyToken(token);
  if (!user) {
    return next(new Error("unauthorized"));
  }
  // avatarUrl isn't in the token itself (see auth.js's verifyToken) -
  // fetched fresh here instead, once per connection, so a photo change
  // in Settings shows up on the next shop join/reconnect rather than
  // only after a full re-login (an improvement over the displayName
  // staleness trade-off this app already accepted).
  try {
    user.avatarUrl = await getAvatarUrl(user.userId);
  } catch {
    user.avatarUrl = null; // a DB hiccup shouldn't block login - worst case, no avatar sprite this session
  }
  socket.user = user; // { userId, displayName, avatarUrl }
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
  console.log(`[connect] ${socket.id} user=${socket.user.userId}`);

  // Lets REST routes (routes/orders.js) push realtime events to this
  // account regardless of which shop/table it's currently in, or even if
  // it's just sitting on the lobby/admin/owner-dashboard screens.
  socket.join(`user:${socket.user.userId}`);

  socket.on("join-shop", async ({ roomId, sceneType }, ack) => {
    try {
      console.log(`[join-shop] ${socket.id} user=${socket.user.userId} roomId=${roomId} sceneType=${sceneType}`);
      const cleanRoomId = (roomId || "").trim().toLowerCase() || "default";

      // A shop's scene is fixed the moment it's first created in Postgres -
      // a sceneType a client asks for only matters the very first time
      // this code is used, so everyone in the shop always sees the same
      // floor. See findOrCreateShop() in db/shops.js.
      const shop = await findOrCreateShop(cleanRoomId, {
        sceneType: sceneType || DEFAULT_SCENE_ID,
      });

      // Owner-created shops are gated: only visible to everyone once an
      // admin has published them (see README's "Becoming a shop owner").
      // The owner themself can still walk in early to preview it, same
      // as an admin reviewing it.
      if (shop.owner_user_id && shop.status !== "published" && shop.owner_user_id !== socket.user.userId) {
        ack?.({ error: "This shop isn't open to the public yet." });
        return;
      }

      const scene = resolveScene(shop);

      const spawn = {
        x: scene.FLOOR_WIDTH / 2 + (Math.random() * 60 - 30),
        y: scene.FLOOR_HEIGHT / 2 + (Math.random() * 60 - 30),
      };

      const player = addPlayer(
        cleanRoomId,
        socket.id,
        socket.user.userId,
        socket.user.displayName,
        socket.user.avatarUrl,
        spawn
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
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const player = updatePosition(meta.roomId, socket.id, x, y);
    if (!player) return;
    socket.to(meta.roomId).emit("player-moved", { id: socket.id, x, y });
  });

  socket.on("join-table", async ({ tableId }, ack) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    if (!meta.tables.some((t) => t.id === tableId)) return; // unknown table, ignore

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
    if (!meta || !clean) return;
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
    if (!meta || !meta.tableId || !clean) return;
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
