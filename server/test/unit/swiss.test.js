import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeRoundCount,
  pairRound,
  pointsForResult,
  computeOpw,
  sortStandings,
} from "../../src/tournament/swiss.js";

// Deterministic "random" for pairing/tiebreak tests.
function seededRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const player = (id, points = 0, opponentIds = [], hadBye = false) => ({ id, points, opponentIds, hadBye, dropped: false });

test("computeRoundCount: ceil(log2 N) with a minimum of 3", () => {
  assert.equal(computeRoundCount(0), 3);
  assert.equal(computeRoundCount(2), 3);
  assert.equal(computeRoundCount(8), 3);
  assert.equal(computeRoundCount(9), 4);
  assert.equal(computeRoundCount(16), 4);
  assert.equal(computeRoundCount(17), 5);
  assert.equal(computeRoundCount(64), 6);
});

test("pairRound: empty field", () => {
  assert.deepEqual(pairRound([]), { pairings: [], byePlayerId: null });
});

test("pairRound: even field pairs everyone exactly once, no bye", () => {
  const players = ["a", "b", "c", "d", "e", "f"].map((id) => player(id));
  const { pairings, byePlayerId } = pairRound(players, seededRng(3));
  assert.equal(byePlayerId, null);
  assert.equal(pairings.length, 3);
  const seen = pairings.flatMap((p) => [p.player1Id, p.player2Id]).sort();
  assert.deepEqual(seen, ["a", "b", "c", "d", "e", "f"]);
});

test("pairRound: odd field gives the bye to the lowest-ranked player without one", () => {
  const players = [player("top", 6), player("mid", 3), player("low", 0, [], true), player("lowest", 0, [], true), player("nobye", 0)];
  const { pairings, byePlayerId } = pairRound(players, seededRng(5));
  assert.equal(byePlayerId, "nobye");
  assert.deepEqual(pairings.at(-1), { player1Id: "nobye", player2Id: null });
  assert.equal(pairings.length, 3);
});

test("pairRound: everyone already had a bye -> lowest-ranked gets it again", () => {
  const players = [player("a", 6, [], true), player("b", 3, [], true), player("c", 0, [], true)];
  const { byePlayerId } = pairRound(players, seededRng(1));
  assert.equal(byePlayerId, "c");
});

test("pairRound: avoids a rematch when another opponent exists", () => {
  // a and b already played; all on the same points.
  const players = [player("a", 3, ["b"]), player("b", 3, ["a"]), player("c", 3), player("d", 3)];
  for (let seed = 1; seed < 30; seed++) {
    const { pairings } = pairRound(players, seededRng(seed));
    for (const p of pairings) {
      const pair = [p.player1Id, p.player2Id].sort().join("-");
      assert.notEqual(pair, "a-b", `seed ${seed} forced an avoidable rematch`);
    }
  }
});

test("pairRound: backtracks instead of stranding two players who already met", () => {
  // Greedy top-down would pair c-d, leaving a-b (a rematch); c-a / d-b avoids it.
  const players = [player("c", 6), player("d", 6), player("a", 3, ["b"]), player("b", 3, ["a"])];
  const { pairings } = pairRound(players, seededRng(1));
  const pairs = pairings.map((p) => [p.player1Id, p.player2Id].sort().join("-"));
  assert.ok(!pairs.includes("a-b"), pairs.join(", "));
});

test("pairRound: a 64-player field with heavy history still pairs quickly", () => {
  // Everyone has played their 5 neighbours - forces some backtracking.
  const ids = Array.from({ length: 64 }, (_, i) => `p${i}`);
  const players = ids.map((id, i) =>
    player(id, (i % 4) * 3, [1, 2, 3, 4, 5].map((d) => ids[(i + d) % 64]).concat([1, 2, 3, 4, 5].map((d) => ids[(i - d + 64) % 64])))
  );
  const started = Date.now();
  const { pairings } = pairRound(players, seededRng(4));
  assert.equal(pairings.length, 32);
  assert.ok(Date.now() - started < 1000);
});

test("pairRound: forced rematch only when nobody else is left", () => {
  const players = [player("a", 3, ["b"]), player("b", 3, ["a"])];
  const { pairings } = pairRound(players, seededRng(1));
  assert.equal(pairings.length, 1);
});

test("pairRound: higher points paired before lower points", () => {
  const players = [player("w1", 6), player("w2", 6), player("l1", 0), player("l2", 0)];
  const { pairings } = pairRound(players, seededRng(9));
  const pairs = pairings.map((p) => [p.player1Id, p.player2Id].sort().join("-")).sort();
  assert.deepEqual(pairs, ["l1-l2", "w1-w2"]);
});

test("pointsForResult: win 3, loss 0, bye 3, draw depends on draw rule", () => {
  assert.equal(pointsForResult("player1_win", "player1", "draw"), 3);
  assert.equal(pointsForResult("player1_win", "player2", "draw"), 0);
  assert.equal(pointsForResult("player2_win", "player2", "double_loss"), 3);
  assert.equal(pointsForResult("bye", "player1", "double_loss"), 3);
  assert.equal(pointsForResult("draw", "player1", "draw"), 1);
  assert.equal(pointsForResult("draw", "player1", "double_loss"), 0);
  assert.equal(pointsForResult("double_loss", "player2", "draw"), 0);
});

test("computeOpw: averages opponents' win rate with a 1/3 floor, ignores byes", () => {
  const matches = [
    { player1Id: "me", player2Id: "strong", result: "player2_win" },
    { player1Id: "weak", player2Id: "me", result: "player2_win" },
    { player1Id: "me", player2Id: null, result: "bye" },
  ];
  const records = new Map([
    ["strong", { wins: 3, losses: 0, draws: 0 }], // 1.0
    ["weak", { wins: 0, losses: 3, draws: 0 }], // 0 -> floored to 1/3
  ]);
  assert.equal(computeOpw("me", matches, records), (1 + 1 / 3) / 2);
});

test("computeOpw: no real opponents -> 0", () => {
  assert.equal(computeOpw("me", [{ player1Id: "me", player2Id: null, result: "bye" }], new Map()), 0);
});

test("sortStandings: points, then OPW, then coin flip; input untouched", () => {
  const standings = [
    { id: "c", points: 3, opw: 0.9 },
    { id: "a", points: 6, opw: 0.1 },
    { id: "b", points: 3, opw: 0.5 },
  ];
  const copy = structuredClone(standings);
  const sorted = sortStandings(standings, seededRng(2));
  assert.deepEqual(sorted.map((s) => s.id), ["a", "c", "b"]);
  assert.deepEqual(standings, copy);
  assert.ok(sorted.every((s) => !("_coinFlip" in s)));
});

test("sortStandings: full tie is broken by the injected rng", () => {
  const standings = [
    { id: "x", points: 3, opw: 0.5 },
    { id: "y", points: 3, opw: 0.5 },
  ];
  const values = [0.2, 0.8];
  const sorted = sortStandings(standings, () => values.shift());
  assert.deepEqual(sorted.map((s) => s.id), ["y", "x"]);
});
