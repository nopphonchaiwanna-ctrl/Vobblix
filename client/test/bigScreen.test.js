import { test } from "node:test";
import assert from "node:assert/strict";
import { pickBigTile } from "../src/ui/bigScreen.js";

const me = (videoOn) => ({ id: "local", isLocal: true, videoOn });
const peer = (id, videoOn) => ({ id, isLocal: false, videoOn });

test("a pinned tile wins while present", () => {
  assert.equal(pickBigTile([me(true), peer("a", true)], "local"), "local");
});

test("a pinned tile that left falls through to the first peer with video", () => {
  assert.equal(pickBigTile([me(true), peer("a", false), peer("b", true)], "gone"), "b");
});

test("without a pin, the first peer with video", () => {
  assert.equal(pickBigTile([me(true), peer("a", false), peer("b", true)], null), "b");
});

test("only my camera on shows me", () => {
  assert.equal(pickBigTile([me(true), peer("a", false)], null), "local");
});

test("no cameras at all shows the first peer", () => {
  assert.equal(pickBigTile([me(false), peer("a", false)], null), "a");
});

test("alone with no camera is null", () => {
  assert.equal(pickBigTile([me(false)], null), null);
  assert.equal(pickBigTile([], null), null);
});
