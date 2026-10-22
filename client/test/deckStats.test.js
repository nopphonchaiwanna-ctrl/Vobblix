import { test } from "node:test";
import assert from "node:assert/strict";
import { winRateText, shareText, bestFinishText, rangePreset } from "../src/ui/events/deckStats.js";

test("winRateText and shareText round to whole percents; no win rate is a dash", () => {
  assert.equal(winRateText({ winRate: null }), "—");
  assert.equal(winRateText({ winRate: 0.625 }), "63%");
  assert.equal(shareText({ share: 1 / 3 }), "33%");
});

test("bestFinishText: one event shows the best placement, all events count firsts and top cuts", () => {
  assert.equal(bestFinishText({ bestLabel: "top4", bestRank: 3 }, "event"), "Top 4");
  assert.equal(bestFinishText({ bestLabel: null, bestRank: 5 }, "event"), "#5");
  assert.equal(bestFinishText({ bestLabel: null, bestRank: null }, "event"), "—");
  assert.equal(bestFinishText({ firsts: 2, topCuts: 3 }, "all"), "1st ×2 · Top cut ×3");
  assert.equal(bestFinishText({ firsts: 0, topCuts: 1 }, "all"), "Top cut ×1");
  assert.equal(bestFinishText({ firsts: 0, topCuts: 0 }, "all"), "—");
});

test("rangePreset: last N days in Bangkok, today included; all time is open", () => {
  const today = new Date("2026-10-23T20:00:00Z"); // 24 Oct, 03:00 in Bangkok
  assert.deepEqual(rangePreset("30d", today), { from: "2026-09-25", to: "2026-10-24" });
  assert.deepEqual(rangePreset("90d", today), { from: "2026-07-27", to: "2026-10-24" });
  assert.deepEqual(rangePreset("all", today), {});
});
