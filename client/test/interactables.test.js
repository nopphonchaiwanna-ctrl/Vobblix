import { test } from "node:test";
import assert from "node:assert/strict";
import { nearestInteractable } from "../src/scene3d/interactables.js";

const world = {
  tables: [
    { id: "table-1", label: "Table 1", x: 100, y: 100, radius: 90 },
    { id: "table-2", label: "Table 2", x: 250, y: 100, radius: 90 },
  ],
  counter: { x: 600, y: 100, radius: 110 },
  board: { x: 900, y: 70, radius: 110 },
};

test("inside two zones picks the closer one", () => {
  assert.deepEqual(nearestInteractable({ x: 190, y: 100 }, world), { kind: "table", id: "table-2", label: "Table 2" });
});

test("exactly on the radius counts as inside", () => {
  assert.equal(nearestInteractable({ x: 100, y: 190 }, world)?.id, "table-1");
});

test("outside every zone is null", () => {
  assert.equal(nearestInteractable({ x: 400, y: 600 }, world), null);
});

test("the counter has no id or label", () => {
  assert.deepEqual(nearestInteractable({ x: 600, y: 150 }, world), { kind: "counter", id: null, label: null });
});

test("the board is found too", () => {
  assert.equal(nearestInteractable({ x: 900, y: 120 }, world)?.kind, "board");
});
