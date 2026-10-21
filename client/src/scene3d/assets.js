// Asset manifest for the 3D shop. Every file is CC0 - see
// client/public/models/CREDITS.md before adding one.
//
// Character ids are what users.avatar_config.character stores (the
// server only checks their shape, see server/src/avatarConfig.js) - so
// renaming one here silently resets anyone who picked it to the default.

const BASE = "/models";

const CHARACTER_IDS = [
  "female-a", "female-b", "female-c", "female-d", "female-e", "female-f",
  "male-a", "male-b", "male-c", "male-d", "male-e", "male-f",
];

export const CHARACTERS = CHARACTER_IDS.map((id) => ({
  id,
  file: `${BASE}/characters/character-${id}.glb`,
  thumb: `${BASE}/thumbs/character-${id}.png`,
}));

export const DEFAULT_CHARACTER_ID = "male-a";

// Outfit colors offered in Settings - the same 8 the server falls back
// to when someone hasn't picked one (AVATAR_COLORS in server/src/rooms.js).
export const CHARACTER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

// Animation clip names inside every character .glb (Kenney Mini Characters).
export const CHARACTER_CLIPS = { idle: "idle", walk: "walk" };

export const PROPS = {
  table: { file: `${BASE}/props/tableRound.glb` },
  counter: { file: `${BASE}/props/kitchenBar.glb` },
  counterEnd: { file: `${BASE}/props/kitchenBarEnd.glb` },
  shelf: { file: `${BASE}/props/bookcaseOpen.glb` },
  plant: { file: `${BASE}/props/pottedPlant.glb` },
  rug: { file: `${BASE}/props/rugRectangle.glb` },
  books: { file: `${BASE}/props/books.glb` },
  box: { file: `${BASE}/props/cardboardBoxClosed.glb` },
  stool: { file: `${BASE}/props/stoolBar.glb` },
};
