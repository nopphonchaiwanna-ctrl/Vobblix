// Default shop floor - the original single-scene MVP layout, now living
// in the scene registry instead of being hardcoded in two places.
//
// x/y are the table's center point on the floor, in floor pixel coordinates.
// radius is the "you're at this table" proximity distance used for
// scoping chat (and later, voice/video) to just the people sitting there.

export const id = "default";
export const label = "Default Shop";

export const FLOOR_WIDTH = 1000;
export const FLOOR_HEIGHT = 700;

export const TABLES = [
  { id: "table-1", label: "Table 1", x: 220, y: 220, radius: 95 },
  { id: "table-2", label: "Table 2", x: 500, y: 220, radius: 95 },
  { id: "table-3", label: "Table 3", x: 780, y: 220, radius: 95 },
  { id: "table-4", label: "Table 4", x: 220, y: 480, radius: 95 },
  { id: "table-5", label: "Table 5", x: 500, y: 480, radius: 95 },
  { id: "table-6", label: "Table 6", x: 780, y: 480, radius: 95 },
];
