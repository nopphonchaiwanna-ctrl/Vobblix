// Preset color themes an owner can pick for their shop floor - part of
// the "template + parameters, not freeform design" approach (see
// README). The client maps each id to actual colors/tile tints; the
// server only needs to know which ids are valid.

export const THEMES = {
  default: "Slate (default)",
  sunset: "Sunset",
  forest: "Forest",
  ocean: "Ocean",
  midnight: "Midnight",
};

export const DEFAULT_THEME_ID = "default";

export function isValidTheme(themeId) {
  return Object.prototype.hasOwnProperty.call(THEMES, themeId);
}

export function listThemes() {
  return Object.entries(THEMES).map(([id, label]) => ({ id, label }));
}
