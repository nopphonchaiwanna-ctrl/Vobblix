// Floor-layout templates for owner-created marketplace shops (see
// "Becoming a shop owner" in README). Unlike the ad-hoc scene files in
// this folder (default.js, etc. - one JS file per bespoke layout), these
// are plain data: an owner picks one by id when creating their shop, and
// server/src/scenes/index.js's resolveScene() turns it into the same
// { FLOOR_WIDTH, FLOOR_HEIGHT, TABLES } shape every scene produces.
//
// Positions are pre-checked to leave enough gap for each table's
// proximity radius (see default.js) not to overlap its neighbors.

export const LAYOUT_TEMPLATES = {
  small: {
    label: "Small (4 tables)",
    FLOOR_WIDTH: 760,
    FLOOR_HEIGHT: 560,
    TABLES: [
      { id: "table-1", label: "Table 1", x: 220, y: 200, radius: 90 },
      { id: "table-2", label: "Table 2", x: 540, y: 200, radius: 90 },
      { id: "table-3", label: "Table 3", x: 220, y: 400, radius: 90 },
      { id: "table-4", label: "Table 4", x: 540, y: 400, radius: 90 },
    ],
  },
  medium: {
    label: "Medium (6 tables)",
    FLOOR_WIDTH: 1000,
    FLOOR_HEIGHT: 700,
    TABLES: [
      { id: "table-1", label: "Table 1", x: 220, y: 220, radius: 95 },
      { id: "table-2", label: "Table 2", x: 500, y: 220, radius: 95 },
      { id: "table-3", label: "Table 3", x: 780, y: 220, radius: 95 },
      { id: "table-4", label: "Table 4", x: 220, y: 480, radius: 95 },
      { id: "table-5", label: "Table 5", x: 500, y: 480, radius: 95 },
      { id: "table-6", label: "Table 6", x: 780, y: 480, radius: 95 },
    ],
  },
  large: {
    label: "Large (10 tables)",
    FLOOR_WIDTH: 1300,
    FLOOR_HEIGHT: 900,
    TABLES: [
      { id: "table-1", label: "Table 1", x: 220, y: 200, radius: 90 },
      { id: "table-2", label: "Table 2", x: 500, y: 200, radius: 90 },
      { id: "table-3", label: "Table 3", x: 780, y: 200, radius: 90 },
      { id: "table-4", label: "Table 4", x: 1060, y: 200, radius: 90 },
      { id: "table-5", label: "Table 5", x: 220, y: 460, radius: 90 },
      { id: "table-6", label: "Table 6", x: 500, y: 460, radius: 90 },
      { id: "table-7", label: "Table 7", x: 780, y: 460, radius: 90 },
      { id: "table-8", label: "Table 8", x: 1060, y: 460, radius: 90 },
      { id: "table-9", label: "Table 9", x: 360, y: 720, radius: 90 },
      { id: "table-10", label: "Table 10", x: 920, y: 720, radius: 90 },
    ],
  },
};

export const DEFAULT_LAYOUT_TEMPLATE_ID = "medium";

export function getLayoutTemplate(templateId) {
  return LAYOUT_TEMPLATES[templateId] || LAYOUT_TEMPLATES[DEFAULT_LAYOUT_TEMPLATE_ID];
}

/** Plain {id,label,tableCount} list - what the owner-facing "create shop" form needs. */
export function listLayoutTemplates() {
  return Object.entries(LAYOUT_TEMPLATES).map(([id, t]) => ({
    id,
    label: t.label,
    tableCount: t.TABLES.length,
  }));
}
