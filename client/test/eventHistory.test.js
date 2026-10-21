import { test } from "node:test";
import assert from "node:assert/strict";
import { placementText, recordText, resultText } from "../src/ui/events/history.js";

const base = { finalRank: null, finalLabel: null, players: 24, dropped: false, dropRound: null, disqualified: false };

test("placementText: top-cut label, then rank of field, then how they left", () => {
  assert.equal(placementText({ ...base, finalRank: 1, finalLabel: "champion" }), "Champion");
  assert.equal(placementText({ ...base, finalRank: 5 }), "#5 of 24");
  assert.equal(placementText({ ...base, dropped: true, dropRound: 3 }), "Dropped after round 3");
  assert.equal(placementText({ ...base, dropped: true, dropRound: 3, disqualified: true }), "Disqualified");
  assert.equal(placementText(base), "Unranked");
});

test("placementText: a ranked player who was disqualified keeps the rank, flagged", () => {
  assert.equal(placementText({ ...base, finalRank: 3, finalLabel: "top4", disqualified: true }), "Top 4 · Disqualified");
  assert.equal(placementText({ ...base, finalRank: 9, disqualified: true }), "#9 of 24 · Disqualified");
});

test("recordText and resultText", () => {
  assert.equal(recordText({ wins: 3, losses: 1, draws: 0 }), "3-1-0");
  assert.equal(resultText("double_loss"), "Double loss");
  assert.equal(resultText("bye"), "Bye");
  assert.equal(resultText(null), "No result");
});
