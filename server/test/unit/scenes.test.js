import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveScene, OWNED_SCENE_TYPE } from "../../src/scenes/index.js";
import { getLayoutTemplate } from "../../src/scenes/templates.js";

const large = getLayoutTemplate("large");

test("owner shop draws its chosen layout and theme", () => {
  const scene = resolveScene({ scene_type: OWNED_SCENE_TYPE, owner_user_id: "u1", layout_template_id: "large", theme: "forest", name: "Mine" });
  assert.equal(scene.TABLES.length, large.TABLES.length);
  assert.equal(scene.FLOOR_WIDTH, large.FLOOR_WIDTH);
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

import { FRONT_STRIP_H } from "../../src/scenes/index.js";
import { LAYOUT_TEMPLATES } from "../../src/scenes/templates.js";
import * as defaultScene from "../../src/scenes/default.js";

const ownerShop = (layout) => ({ scene_type: OWNED_SCENE_TYPE, owner_user_id: "u1", layout_template_id: layout, theme: "default", name: "S" });
const plainRoom = { scene_type: "default", owner_user_id: null, name: "default" };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test("every scene gets a front strip, counter, board and spawn", () => {
  for (const [shop, base] of [[ownerShop("large"), large], [plainRoom, defaultScene]]) {
    const scene = resolveScene(shop);
    assert.equal(scene.FLOOR_HEIGHT, base.FLOOR_HEIGHT + FRONT_STRIP_H);
    scene.TABLES.forEach((t, i) => {
      assert.equal(t.y, base.TABLES[i].y + FRONT_STRIP_H);
      assert.equal(t.x, base.TABLES[i].x);
    });
    assert.deepEqual(scene.COUNTER, { x: Math.round(base.FLOOR_WIDTH * 0.25), y: 100, radius: 110 });
    assert.deepEqual(scene.BOARD, { x: Math.round(base.FLOOR_WIDTH * 0.75), y: 70, radius: 110 });
    assert.deepEqual(scene.SPAWN, { x: base.FLOOR_WIDTH / 2, y: 120 });
  }
});

test("fixtures never overlap a table's proximity zone", () => {
  const scenes = [...Object.keys(LAYOUT_TEMPLATES).map((id) => resolveScene(ownerShop(id))), resolveScene(plainRoom)];
  for (const scene of scenes) {
    for (const table of scene.TABLES) {
      for (const fixture of [scene.COUNTER, scene.BOARD]) {
        assert.ok(dist(fixture, table) > fixture.radius + table.radius, `${table.id} overlaps a fixture`);
      }
      assert.ok(dist(scene.SPAWN, table) > 46 + 16, `spawn inside ${table.id}`);
    }
  }
});

test("resolveScene does not mutate template data", () => {
  const before = getLayoutTemplate("large").TABLES[0].y;
  resolveScene(ownerShop("large"));
  resolveScene(ownerShop("large"));
  assert.equal(getLayoutTemplate("large").TABLES[0].y, before);
});
