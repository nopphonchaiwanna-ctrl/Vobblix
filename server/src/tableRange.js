// Server-side check that a player asking to join a table is actually
// standing at it - the client only offers "Join table" inside the
// table's radius, but a forged join-table must not drop someone into a
// table chat/call from across the shop. RANGE_SLACK covers the position
// the server holds lagging the client by up to one move emit (50ms at
// 220px/s is ~11px) with plenty of margin.

export const RANGE_SLACK = 48;

export function isWithinTableRange(player, table) {
  if (!Number.isFinite(player?.x) || !Number.isFinite(player?.y)) return false;
  return Math.hypot(player.x - table.x, player.y - table.y) <= table.radius + RANGE_SLACK;
}
