// Validation for users.avatar_config (migration 019) - the 3D shop
// character a player picked in Settings. The server deliberately does
// not keep the list of character ids: those belong to the client's
// asset manifest (client/src/scene3d/assets.js), which falls back to the
// default character for any id it doesn't know. Here we only make sure
// the stored value has a safe, known shape.

const CHARACTER_RE = /^[a-z0-9-]{1,32}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeAvatarConfig(input) {
  if (input === null) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid-avatar-config");
  const { character, color } = input;
  if (typeof character !== "string" || !CHARACTER_RE.test(character)) throw new Error("invalid-avatar-config");
  if (typeof color !== "string" || !COLOR_RE.test(color)) throw new Error("invalid-avatar-config");
  return { v: 1, character, color: color.toLowerCase() };
}
