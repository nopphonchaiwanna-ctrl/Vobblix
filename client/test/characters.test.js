import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCharacter } from "../src/scene3d/characters.js";

const chars = [{ id: "male-a", file: "/a.glb" }, { id: "female-b", file: "/b.glb" }];

test("unknown character falls back to the default", () => {
  assert.deepEqual(resolveCharacter({ character: "nope", color: "#112233" }, chars, "male-a"), { id: "male-a", file: "/a.glb", color: "#112233" });
});

test("no config gives the default with no color", () => {
  assert.deepEqual(resolveCharacter(null, chars, "male-a"), { id: "male-a", file: "/a.glb", color: null });
});

test("a known character resolves to its file", () => {
  assert.deepEqual(resolveCharacter({ character: "female-b" }, chars, "male-a"), { id: "female-b", file: "/b.glb", color: null });
});
