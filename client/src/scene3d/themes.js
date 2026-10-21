// Owner-picked shop themes (server/src/scenes/themes.js holds the valid
// ids) -> the colors the 3D shop is painted with. Furniture models keep
// their own materials; the theme paints the room around them.

export const THEME_PALETTES = {
  default: { floor: "#c9b79c", wall: "#e8dcc8", wood: "#8a5a36", accent: "#38bdf8", sky: "#1b2634" },
  sunset: { floor: "#d9a97c", wall: "#f3cfa8", wood: "#8f4a2c", accent: "#f97316", sky: "#3b1f2b" },
  forest: { floor: "#a8b58a", wall: "#dfe6c8", wood: "#6b4a2b", accent: "#22c55e", sky: "#13261c" },
  ocean: { floor: "#9fb8c9", wall: "#d8e8f0", wood: "#5d6f7f", accent: "#06b6d4", sky: "#0f2233" },
  midnight: { floor: "#5b5f7a", wall: "#8e93b5", wood: "#3d3550", accent: "#8b5cf6", sky: "#0b0c18" },
};

export function paletteFor(themeId) {
  return THEME_PALETTES[themeId] || THEME_PALETTES.default;
}
