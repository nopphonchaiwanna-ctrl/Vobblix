import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveScene, OWNED_SCENE_TYPE } from "../../src/scenes/index.js";
import { getLayoutTemplate } from "../../src/scenes/templates.js";

const large = getLayoutTemplate("large");

test("owner shop draws its chosen layout and theme", () => {
  const scene = resolveScene({ scene_type: OWNED_SCENE_TYPE, owner_user_id: "u1", layout_template_id: "large", theme: "forest", name: "Mine" });
  assert.equal(scene.TABLES.length, large.TABLES.length);
  assert.equal(scene.FLOOR_HEIGHT, large.FLOOR_HEIGHT);
  assert.equal(scene.theme, "forest");
});

test("a shop with an owner but a stale scene_type still uses its layout (shops 111/222)", () => {
  const scene = resolveScene({ scene_type: "default", owner_user_id: "admin", is_admin_shop: true, layout_template_id: "large", theme: "forest", name: "111" });
  assert.equal(scene.TABLES.length, large.TABLES.length);
  assert.equal(scene.theme, "forest");
});

test("a plain room with no owner keeps its static scene", () => {
  const scene = resolveScene({ scene_type: "default", owner_user_id: null, layout_template_id: "large", theme: "forest", name: "default" });
  assert.notEqual(scene.TABLES.length, large.TABLES.length);
  assert.equal(scene.theme, "default");
});
