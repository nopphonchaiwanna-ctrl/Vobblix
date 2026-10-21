// The server keeps every position in floor pixels (see
// server/src/scenes/). The 3D world is the same floor laid flat on the
// X/Z plane: 1 floor px = 1 cm, so a 1000x900 floor is a 10m x 9m room
// and a 1-unit-tall character is about a meter.

export const WORLD_SCALE = 0.01;

export function floorToWorld(x, y) {
  return { x: x * WORLD_SCALE, z: y * WORLD_SCALE };
}

export function worldToFloor(x, z) {
  return { x: Math.round((x / WORLD_SCALE) * 1e6) / 1e6, y: Math.round((z / WORLD_SCALE) * 1e6) / 1e6 };
}
