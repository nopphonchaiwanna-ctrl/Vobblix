import { test } from "node:test";
import assert from "node:assert/strict";
import { WORLD_SCALE, floorToWorld, worldToFloor } from "../src/scene3d/coords.js";

test("floor pixels map to world units at 0.01, y becomes z", () => {
  assert.equal(WORLD_SCALE, 0.01);
  assert.deepEqual(floorToWorld(300, 450), { x: 3, z: 4.5 });
});

test("worldToFloor inverts floorToWorld", () => {
  assert.deepEqual(worldToFloor(3, 4.5), { x: 300, y: 450 });
});
