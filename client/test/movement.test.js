import { test } from "node:test";
import assert from "node:assert/strict";
import { stepPosition, solidsFor, PLAYER_RADIUS, TABLE_SOLID_RADIUS, FIXTURE_SOLID_RADIUS } from "../src/scene3d/movement.js";

const open = { floor: { width: 1000, height: 900 }, solids: [] };
const close = (a, b) => Math.abs(a - b) < 1e-6;

test("walks PLAYER_SPEED px per second", () => {
  assert.deepEqual(stepPosition({ x: 100, y: 100 }, { x: 1, y: 0 }, 1000, open), { x: 320, y: 100 });
});

test("is clamped to the floor edge", () => {
  const p = stepPosition({ x: 990, y: 100 }, { x: 1, y: 0 }, 1000, open);
  assert.equal(p.x, 1000 - PLAYER_RADIUS);
});

test("cannot walk into a table", () => {
  const world = { ...open, solids: [{ x: 500, y: 500, r: TABLE_SOLID_RADIUS }] };
  const p = stepPosition({ x: 500 - 70, y: 500 }, { x: 1, y: 0 }, 200, world);
  assert.ok(Math.hypot(p.x - 500, p.y - 500) >= TABLE_SOLID_RADIUS + PLAYER_RADIUS - 1e-9);
});

test("diagonal input is normalized", () => {
  const p = stepPosition({ x: 100, y: 100 }, { x: 1, y: 1 }, 1000, open);
  assert.ok(close(p.x, 100 + 220 / Math.SQRT2) && close(p.y, 100 + 220 / Math.SQRT2));
});

test("analog input below full tilt walks slower", () => {
  const p = stepPosition({ x: 100, y: 100 }, { x: 0.5, y: 0 }, 1000, open);
  assert.equal(p.x, 210);
});

test("solidsFor lists tables, counter and board", () => {
  const solids = solidsFor([{ x: 1, y: 2, radius: 95 }], { x: 3, y: 4, radius: 110 }, { x: 5, y: 6, radius: 110 });
  assert.deepEqual(solids, [
    { x: 1, y: 2, r: TABLE_SOLID_RADIUS },
    { x: 3, y: 4, r: FIXTURE_SOLID_RADIUS },
    { x: 5, y: 6, r: FIXTURE_SOLID_RADIUS },
  ]);
});
