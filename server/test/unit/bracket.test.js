import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidCutSize,
  largestPowerOfTwoAtMost,
  nextPowerOfTwoAtLeast,
  meetsMinimumPlayersThreshold,
  resolveCutEligibility,
  resolveCutRoster,
  generateBracketRound1,
  advanceBracketRound,
  totalBracketRounds,
  placementLabel,
} from "../../src/tournament/bracket.js";

const standing = (id, losses) => ({ id, losses });

test("isValidCutSize: only 4..64 powers of two", () => {
  for (const n of [4, 8, 16, 32, 64]) assert.ok(isValidCutSize(n));
  for (const n of [0, 2, 6, 12, 128, "8"]) assert.ok(!isValidCutSize(n));
});

test("power-of-two helpers", () => {
  assert.equal(largestPowerOfTwoAtMost(1), 1);
  assert.equal(largestPowerOfTwoAtMost(12), 8);
  assert.equal(largestPowerOfTwoAtMost(16), 16);
  assert.equal(nextPowerOfTwoAtLeast(1), 1);
  assert.equal(nextPowerOfTwoAtLeast(5), 8);
  assert.equal(nextPowerOfTwoAtLeast(8), 8);
});

test("1.5x minimum-players threshold is inclusive", () => {
  assert.ok(meetsMinimumPlayersThreshold(12, 8));
  assert.ok(!meetsMinimumPlayersThreshold(11, 8));
  assert.ok(meetsMinimumPlayersThreshold(6, 4));
});

test("resolveCutEligibility", () => {
  assert.deepEqual(resolveCutEligibility("swiss_only", 100, 8), { cutEnabled: false, reason: null });
  assert.deepEqual(resolveCutEligibility("swiss_cut", 12, 8), { cutEnabled: true, reason: null });
  const tooFew = resolveCutEligibility("swiss_cut", 10, 8);
  assert.equal(tooFew.cutEnabled, false);
  assert.match(tooFew.reason, /10/);
});

test("resolveCutRoster: underflow fills from the next-best standings", () => {
  const standings = [standing("a", 0), standing("b", 1), standing("c", 2), standing("d", 2), standing("e", 3)];
  const r = resolveCutRoster(standings, 4, 5);
  assert.equal(r.cutSize, 4);
  assert.deepEqual(r.qualified.map((p) => p.id), ["a", "b", "c", "d"]);
  assert.equal(r.expanded, false);
});

test("resolveCutRoster: exact fit", () => {
  const standings = [standing("a", 0), standing("b", 1), standing("c", 1), standing("d", 1), standing("e", 2)];
  const r = resolveCutRoster(standings, 4, 6);
  assert.deepEqual(r.qualified.map((p) => p.id), ["a", "b", "c", "d"]);
  assert.equal(r.expanded, false);
});

test("resolveCutRoster: overflow expands to the next power of two and fills it from the next-best", () => {
  const guaranteed = ["a", "b", "c", "d", "e"].map((id) => standing(id, 1));
  const rest = ["f", "g", "h", "i"].map((id) => standing(id, 2));
  const r = resolveCutRoster([...guaranteed, ...rest], 4, 9);
  assert.equal(r.cutSize, 8);
  assert.deepEqual(r.qualified.map((p) => p.id), ["a", "b", "c", "d", "e", "f", "g", "h"], "5 guaranteed + next 3");
  assert.equal(r.expanded, true);
  assert.equal(r.guaranteedTrimmed, false);
});

test("resolveCutRoster: overflow after drops can leave the bracket short", () => {
  // 16 registered, but only 6 still active to choose from.
  const standings = ["a", "b", "c", "d", "e"].map((id) => standing(id, 1)).concat(standing("f", 2));
  const r = resolveCutRoster(standings, 4, 16);
  assert.equal(r.cutSize, 8);
  assert.equal(r.qualified.length, 6);
});

test("resolveCutRoster: overflow capped by field size trims the guaranteed group", () => {
  const standings = ["a", "b", "c", "d", "e"].map((id) => standing(id, 1));
  const r = resolveCutRoster(standings, 4, 6); // cap = 4
  assert.equal(r.cutSize, 4);
  assert.deepEqual(r.qualified.map((p) => p.id), ["a", "b", "c", "d"]);
  assert.equal(r.guaranteedTrimmed, true);
});

test("generateBracketRound1: everyone placed exactly once in pairs", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const pairings = generateBracketRound1(ids, () => 0.42);
  assert.equal(pairings.length, 4);
  assert.deepEqual(pairings.flatMap((p) => [p.player1Id, p.player2Id]).sort(), ids);
});

test("generateBracketRound1: short bracket gives byes to the top seeds, spread apart", () => {
  // 6 players in an 8-slot bracket: seeds a and b get byes.
  const pairings = generateBracketRound1(["a", "b", "c", "d", "e", "f"], 8, () => 0.3);
  assert.equal(pairings.length, 4, "bracket keeps its shape");
  const byes = pairings.filter((p) => p.player2Id === null).map((p) => p.player1Id);
  assert.deepEqual(byes.sort(), ["a", "b"]);
  // Adjacent entries meet in round 2 - the two bye holders shouldn't.
  assert.ok(!(pairings[0].player2Id === null && pairings[1].player2Id === null));
  assert.ok(!(pairings[2].player2Id === null && pairings[3].player2Id === null));
  const everyone = pairings.flatMap((p) => [p.player1Id, p.player2Id]).filter(Boolean).sort();
  assert.deepEqual(everyone, ["a", "b", "c", "d", "e", "f"]);
});

test("advanceBracketRound: a bye advances player 1", () => {
  const next = advanceBracketRound([
    { player1Id: "a", player2Id: null, result: "bye" },
    { player1Id: "c", player2Id: "d", result: "player2_win" },
  ]);
  assert.deepEqual(next, [{ player1Id: "a", player2Id: "d" }]);
});

test("advanceBracketRound: winners of adjacent matches meet", () => {
  const next = advanceBracketRound([
    { player1Id: "a", player2Id: "b", result: "player1_win" },
    { player1Id: "c", player2Id: "d", result: "player2_win" },
  ]);
  assert.deepEqual(next, [{ player1Id: "a", player2Id: "d" }]);
});

test("advanceBracketRound: rejects a non-decisive result", () => {
  assert.throws(() => advanceBracketRound([{ id: "m1", player1Id: "a", player2Id: "b", result: "draw" }]), /decisive winner/);
});

test("placement labels for an 8-player cut", () => {
  assert.equal(totalBracketRounds(8), 3);
  assert.equal(placementLabel(8, 1, false), "top8");
  assert.equal(placementLabel(8, 2, false), "top4");
  assert.equal(placementLabel(8, 3, false), "runner_up");
  assert.equal(placementLabel(8, 3, true), "champion");
});
