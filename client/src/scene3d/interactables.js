// What the player is standing at, if anything: a table (offers "Join
// table"), the counter (listings) or the events board. Nothing happens
// on its own - the HUD just shows a button for whatever this returns.

export function nearestInteractable(pos, { tables = [], counter = null, board = null }) {
  const candidates = [
    ...tables.map((t) => ({ kind: "table", id: t.id, label: t.label, x: t.x, y: t.y, radius: t.radius })),
    ...(counter ? [{ kind: "counter", id: null, label: null, ...counter }] : []),
    ...(board ? [{ kind: "board", id: null, label: null, ...board }] : []),
  ];
  let best = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(pos.x - c.x, pos.y - c.y);
    if (d <= c.radius && d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best && { kind: best.kind, id: best.id, label: best.label };
}
