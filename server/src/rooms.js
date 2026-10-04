// In-memory "shop" room state - who's connected right now, where they
// are, which table they're at, and voice/video call membership. This is
// intentionally NOT persisted: it's live presence, not history. Durable
// shop metadata (scene_type, name, owner) and chat history live in
// Postgres - see db/shops.js.
//
// If this ever needs to run on more than one server process, swap this
// module for something backed by Redis (or use a framework like
// Colyseus) - see README roadmap.

const shops = new Map(); // roomId -> { players: Map<socketId, Player> }

/**
 * @typedef {Object} Player
 * @property {string} id socket id
 * @property {string} userId the account's id (server/src/db - users table)
 * @property {string} name display name (from the account, at join time)
 * @property {number} x
 * @property {number} y
 * @property {string|null} tableId table the player currently counts as "at"
 * @property {string} color hex color assigned on join, for the fallback avatar circle
 * @property {string|null} avatarUrl profile picture URL (from Settings), if any - used as the on-floor sprite when the client can load it
 * @property {boolean} inCall whether they've opted into this table's voice call
 * @property {boolean} videoOn whether their camera is on within that call
 * @property {boolean} micMuted whether they've muted their own mic while in the call
 * @property {boolean} deafened whether they've muted incoming audio for themselves
 */

const AVATAR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

function colorFor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getShop(roomId) {
  if (!shops.has(roomId)) {
    shops.set(roomId, { players: new Map() });
  }
  return shops.get(roomId);
}

export function addPlayer(roomId, socketId, userId, name, avatarUrl, spawn) {
  const shop = getShop(roomId);
  const player = {
    id: socketId,
    userId,
    name: name.slice(0, 24) || "Guest",
    avatarUrl: avatarUrl || null,
    x: spawn.x,
    y: spawn.y,
    tableId: null,
    color: colorFor(shop.players.size),
    inCall: false,
    videoOn: false,
    micMuted: false,
    deafened: false,
  };
  shop.players.set(socketId, player);
  return player;
}

export function removePlayer(roomId, socketId) {
  const shop = shops.get(roomId);
  if (!shop) return;
  shop.players.delete(socketId);
  if (shop.players.size === 0) {
    shops.delete(roomId);
  }
}

export function getPlayer(roomId, socketId) {
  const shop = shops.get(roomId);
  return shop?.players.get(socketId) || null;
}

export function listPlayers(roomId) {
  const shop = shops.get(roomId);
  return shop ? Array.from(shop.players.values()) : [];
}

export function updatePosition(roomId, socketId, x, y) {
  const shop = shops.get(roomId);
  const player = shop?.players.get(socketId);
  if (!player) return null;
  player.x = x;
  player.y = y;
  return player;
}

export function setTable(roomId, socketId, tableId) {
  const shop = shops.get(roomId);
  const player = shop?.players.get(socketId);
  if (!player) return null;
  player.tableId = tableId;
  return player;
}

export function tableRoomName(roomId, tableId) {
  return `${roomId}::${tableId}`;
}

// ---------- Voice/video call membership ----------
// Scoped to "whoever is currently at this table" (player.tableId), same
// grouping table-chat already uses. Capacity is enforced here so the
// limit holds regardless of which socket handler asks.

export function setInCall(roomId, socketId, inCall) {
  const shop = shops.get(roomId);
  const player = shop?.players.get(socketId);
  if (!player) return null;
  player.inCall = inCall;
  if (!inCall) {
    // Leaving the call always drops video and resets mic/deafen state too -
    // rejoining later starts fresh rather than remembering last time's mute.
    player.videoOn = false;
    player.micMuted = false;
    player.deafened = false;
  }
  return player;
}

export function setVideoOn(roomId, socketId, videoOn) {
  const shop = shops.get(roomId);
  const player = shop?.players.get(socketId);
  if (!player) return null;
  player.videoOn = videoOn;
  return player;
}

export function setMicMuted(roomId, socketId, micMuted) {
  const shop = shops.get(roomId);
  const player = shop?.players.get(socketId);
  if (!player) return null;
  player.micMuted = micMuted;
  return player;
}

export function setDeafened(roomId, socketId, deafened) {
  const shop = shops.get(roomId);
  const player = shop?.players.get(socketId);
  if (!player) return null;
  player.deafened = deafened;
  return player;
}

export function voiceCountAtTable(roomId, tableId) {
  return listPlayers(roomId).filter((p) => p.tableId === tableId && p.inCall).length;
}

export function videoCountAtTable(roomId, tableId) {
  return listPlayers(roomId).filter((p) => p.tableId === tableId && p.videoOn).length;
}
