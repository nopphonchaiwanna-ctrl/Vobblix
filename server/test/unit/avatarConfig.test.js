import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAvatarConfig } from "../../src/avatarConfig.js";

test("a valid config round-trips with the color lowercased", () => {
  assert.deepEqual(normalizeAvatarConfig({ character: "male-a", color: "#22C55E" }), { v: 1, character: "male-a", color: "#22c55e" });
});

test("null clears the config", () => {
  assert.equal(normalizeAvatarConfig(null), null);
});

test("extra keys are dropped", () => {
  assert.deepEqual(normalizeAvatarConfig({ character: "female-b", color: "#000000", hat: "crown", v: 9 }), { v: 1, character: "female-b", color: "#000000" });
});

test("bad input throws invalid-avatar-config", () => {
  const bad = [
    { character: "../x", color: "#000000" },
    { character: "male-a", color: "red" },
    { character: "a".repeat(33), color: "#000000" },
    "male-a",
    42,
    [],
    undefined,
  ];
  for (const input of bad) {
    assert.throws(() => normalizeAvatarConfig(input), /invalid-avatar-config/, JSON.stringify(input));
  }
});
