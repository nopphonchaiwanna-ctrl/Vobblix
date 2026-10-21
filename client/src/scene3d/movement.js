// Walking on the shop floor, in floor pixels - same rules the 2D
// ShopScene used, so the server's view of where everyone stands
// (join-table range check, server/src/tableRange.js) doesn't change.

export const PLAYER_SPEED = 220; // px/sec at full tilt
export const PLAYER_RADIUS = 16;
export const TABLE_SOLID_RADIUS = 46; // can't walk inside this
export const FIXTURE_SOLID_RADIUS = 70; // counter / events board

/** Circles nobody can walk through: every table, plus the counter and board. */
export function solidsFor(tables, counter, board) {
  const solids = tables.map((t) => ({ x: t.x, y: t.y, r: TABLE_SOLID_RADIUS }));
  for (const f of [counter, board]) if (f) solids.push({ x: f.x, y: f.y, r: FIXTURE_SOLID_RADIUS });
  return solids;
}

/**
 * One movement step. `dir` is keyboard (unit) or joystick (analog,
 * length <= 1) input; anything longer is normalized so diagonals aren't
 * faster. Clamps to the floor, then pushes out of every solid circle.
 */
export function stepPosition(pos, dir, dtMs, world) {
  let { x: dx, y: dy } = dir;
  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: pos.x, y: pos.y };
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  const step = (PLAYER_SPEED * dtMs) / 1000;
  let nx = clamp(pos.x + dx * step, PLAYER_RADIUS, world.floor.width - PLAYER_RADIUS);
  let ny = clamp(pos.y + dy * step, PLAYER_RADIUS, world.floor.height - PLAYER_RADIUS);

  for (const s of world.solids) {
    const minDist = s.r + PLAYER_RADIUS;
    const d = Math.hypot(nx - s.x, ny - s.y);
    if (d < minDist) {
      const angle = Math.atan2(ny - s.y, nx - s.x);
      nx = s.x + Math.cos(angle) * minDist;
      ny = s.y + Math.sin(angle) * minDist;
    }
  }
  return { x: nx, y: ny };
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
