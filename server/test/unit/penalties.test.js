import { test } from "node:test";
import assert from "node:assert/strict";
import { penaltyOutcome } from "../../src/tournament/penalties.js";

test("a warning is recorded straight away, from anyone on staff", () => {
  assert.deepEqual(penaltyOutcome({ level: "warning", issuerRole: "judge", matchIsCurrentRound: false }), { allowed: true, status: "recorded" });
  assert.deepEqual(penaltyOutcome({ level: "warning", issuerRole: "organizer", matchIsCurrentRound: true }), { allowed: true, status: "recorded" });
});

test("match loss only on the current round", () => {
  assert.deepEqual(penaltyOutcome({ level: "match_loss", issuerRole: "organizer", matchIsCurrentRound: false }), {
    allowed: false,
    reason: "Match loss only applies to the current round.",
  });
});

test("a judge's match loss or DQ waits for the organizer", () => {
  assert.deepEqual(penaltyOutcome({ level: "match_loss", issuerRole: "judge", matchIsCurrentRound: true }), { allowed: true, status: "pending" });
  assert.deepEqual(penaltyOutcome({ level: "disqualification", issuerRole: "judge", matchIsCurrentRound: false }), { allowed: true, status: "pending" });
});

test("the organizer's match loss or DQ applies immediately", () => {
  assert.deepEqual(penaltyOutcome({ level: "match_loss", issuerRole: "organizer", matchIsCurrentRound: true }), { allowed: true, status: "confirmed" });
  assert.deepEqual(penaltyOutcome({ level: "disqualification", issuerRole: "organizer", matchIsCurrentRound: false }), { allowed: true, status: "confirmed" });
});

test("unknown levels are refused", () => {
  assert.equal(penaltyOutcome({ level: "ban", issuerRole: "organizer", matchIsCurrentRound: true }).allowed, false);
});
