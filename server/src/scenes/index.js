// Scene registry: the single place that knows about every shop/event
// floor layout. Two kinds of shop draw from here:
//
//   1. Ad-hoc shops (the original "type any code to get a room" flow -
//      see db/shops.js's findOrCreateShop). Their scene_type names a
//      static file below. To add a new one:
//        a. Create server/src/scenes/<your-scene-id>.js exporting `id`,
//           `label`, `FLOOR_WIDTH`, `FLOOR_HEIGHT`, `TABLES` (see
//           default.js).
//        b. Import it below and add it to the SCENES map.
//
//   2. Owner-created marketplace shops (scene_type === OWNED_SCENE_TYPE
//      - see "Becoming a shop owner" in README). Their layout comes from
//      a shared parametrized template (scenes/templates.js) plus the
//      shop's own theme/assets, not a bespoke file - an owner picks a
//      template size instead of a developer writing a new scene file.
//
// Either way, resolveScene(shop) is the one function callers need - the
// client never hardcodes a layout, it always receives tables/floor size
// (and now theme/assets) from the server at join time (see README).

import * as defaultScene from "./default.js";
import { getLayoutTemplate } from "./templates.js";
import { DEFAULT_THEME_ID } from "./themes.js";

const SCENES = {
  [defaultScene.id]: defaultScene,
};

export const DEFAULT_SCENE_ID = defaultScene.id;

// Sentinel scene_type stored on a shop row once it was created through
// the deliberate "become a shop owner" flow, instead of naming one of
// the static SCENES above.
export const OWNED_SCENE_TYPE = "owned";

export function getScene(sceneType) {
  return SCENES[sceneType] || SCENES[DEFAULT_SCENE_ID];
}

/**
 * Resolves the full table/floor-size (+ theme/assets) payload for ANY
 * shop row, whichever of the two paths above created it. This is what
 * join-shop's ack sends the client and what join-table's server-side
 * table lookup is built from (see index.js) - the shape is identical
 * either way, so nothing downstream needs to know which path a shop
 * came from.
 */
export function resolveScene(shop) {
  if (shop.scene_type === OWNED_SCENE_TYPE) {
    const template = getLayoutTemplate(shop.layout_template_id);
    return {
      id: OWNED_SCENE_TYPE,
      label: shop.name,
      FLOOR_WIDTH: template.FLOOR_WIDTH,
      FLOOR_HEIGHT: template.FLOOR_HEIGHT,
      TABLES: template.TABLES,
      theme: shop.theme || DEFAULT_THEME_ID,
      // Reserved for future per-shop custom assets (a theme swaps preset
      // colors/tiles; this is where an owner-uploaded floor/table sprite
      // set would eventually be referenced instead) - unused by the
      // client today, but already flowing through end-to-end so that
      // feature doesn't need another payload-shape change.
      assets: shop.assets || {},
    };
  }
  const scene = getScene(shop.scene_type);
  return { ...scene, theme: DEFAULT_THEME_ID, assets: {} };
}

export function tableById(sceneType, tableId) {
  return getScene(sceneType).TABLES.find((t) => t.id === tableId) || null;
}
