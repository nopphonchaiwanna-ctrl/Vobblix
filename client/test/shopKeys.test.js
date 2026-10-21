import { test } from "node:test";
import assert from "node:assert/strict";
import { shopKeysActive } from "../src/scene3d/input.js";

const docWith = (matches) => ({ querySelector: (sel) => (matches.some((m) => sel.includes(m)) ? {} : null) });

test("shop keys act when nothing is open over the shop", () => {
  assert.equal(shopKeysActive({ querySelector: () => null }), true);
});

test("an open panel, menu or dialog takes the keys", () => {
  assert.equal(shopKeysActive(docWith([".over-shop"])), false);
  assert.equal(shopKeysActive({ querySelector: (sel) => (sel.includes("#hud-menu:not([hidden])") ? {} : null) }), false);
});
