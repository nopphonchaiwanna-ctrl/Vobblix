import { test } from "node:test";
import assert from "node:assert/strict";
import { joystickVector } from "../src/scene3d/joystick.js";

test("centered stick is still", () => assert.deepEqual(joystickVector(0, 0, 50), { x: 0, y: 0 }));
test("inside the deadzone is still", () => assert.deepEqual(joystickVector(5, 0, 50), { x: 0, y: 0 }));
test("past the rim clamps to 1", () => assert.deepEqual(joystickVector(100, 0, 50), { x: 1, y: 0 }));
test("partial tilt keeps direction and magnitude", () => {
  const v = joystickVector(30, 40, 50);
  assert.ok(Math.abs(v.x - 0.6) < 1e-9 && Math.abs(v.y - 0.8) < 1e-9);
});
