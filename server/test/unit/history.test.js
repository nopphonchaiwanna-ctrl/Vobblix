import { test } from "node:test";
import assert from "node:assert/strict";
import { resultForPlayer, bracketRoundLabel, buildHistoryEntry } from "../../src/tournament/history.js";

test("resultForPlayer: each side sees the result from its own seat", () => {
  const m = (result) => ({ player1Id: "a", player2Id: "b", result });
  assert.equal(resultForPlayer(m("player1_win"), "a"), "win");
  assert.equal(resultForPlayer(m("player1_win"), "b"), "loss");
  assert.equal(resultForPlayer(m("player2_win"), "a"), "loss");
  assert.equal(resultForPlayer(m("player2_win"), "b"), "win");
  assert.equal(resultForPlayer(m("draw"), "b"), "draw");
  assert.equal(resultForPlayer(m("double_loss"), "a"), "double_loss");
  assert.equal(resultForPlayer({ player1Id: "a", player2Id: null, result: "bye" }, "a"), "bye");
  assert.equal(resultForPlayer(m(null), "a"), null);
});

test("bracketRoundLabel names rounds by how many players are left", () => {
  assert.equal(bracketRoundLabel(8, 1), "Top 8");
  assert.equal(bracketRoundLabel(8, 2), "Semifinal");
  assert.equal(bracketRoundLabel(8, 3), "Final");
  assert.equal(bracketRoundLabel(4, 1), "Semifinal");
  assert.equal(bracketRoundLabel(16, 1), "Top 16");
});

const ME = "me-player";
const event = {
  id: "ev1", name: "Sunday Cup", game: "vanguard", vanguard_region: "th", vanguard_regulation: "d_standard",
  starts_at: null, started_at: new Date("2026-10-20T03:00:00Z"), effective_cut_size: 4,
  shop_name: "Dragon Den", shop_code: "dragonden",
};
const match = (id, phase, round, p1, p2, result, opponent_name = "Opp") => ({
  id, phase, round_number: round, player1_id: p1, player2_id: p2, result, opponent_name,
});
function build(over = {}) {
  return buildHistoryEntry({
    event,
    me: { id: ME, final_rank: 2, final_label: null, dropped: false },
    matches: [],
    penalties: [],
    playedCount: 8,
    ...over,
  });
}

test("matches come out Swiss first, then bracket, each in round order, with labels", () => {
  const e = build({
    matches: [
      match("m4", "bracket", 2, ME, "x", "player2_win"),
      match("m2", "swiss", 2, "x", ME, "player1_win"),
      match("m3", "bracket", 1, ME, "x", "player1_win"),
      match("m1", "swiss", 1, ME, "x", "player1_win"),
    ],
  });
  assert.deepEqual(e.matches.map((m) => m.roundLabel), ["Round 1", "Round 2", "Semifinal", "Final"]);
  assert.deepEqual(e.matches.map((m) => m.result), ["win", "loss", "win", "loss"]);
  assert.deepEqual(e.matches.map((m) => [m.phase, m.round]), [["swiss", 1], ["swiss", 2], ["bracket", 1], ["bracket", 2]]);
});

test("record counts byes as wins, double losses as losses, skips unresolved", () => {
  const e = build({
    matches: [
      match("m1", "swiss", 1, ME, "x", "player1_win"),
      match("m2", "swiss", 2, ME, null, "bye", null),
      match("m3", "swiss", 3, ME, "x", "player2_win"),
      match("m4", "swiss", 4, ME, "x", "double_loss"),
      match("m5", "swiss", 5, ME, "x", "draw"),
      match("m6", "swiss", 6, ME, "x", null),
    ],
  });
  assert.deepEqual(e.record, { wins: 2, losses: 2, draws: 1 });
  assert.equal(e.matches[1].opponentName, "Bye");
  assert.equal(e.matches[0].opponentName, "Opp");
  assert.equal(e.matches[5].result, null);
});

test("a Swiss drop without a rank reports the last round played", () => {
  const e = build({
    me: { id: ME, final_rank: null, final_label: null, dropped: true },
    matches: [match("m1", "swiss", 1, ME, "x", "player1_win"), match("m2", "swiss", 2, ME, "x", "player2_win")],
  });
  assert.equal(e.dropRound, 2);
  assert.equal(e.dropped, true);
  assert.equal(e.finalRank, null);
  assert.equal(build().dropRound, null, "ranked players have no drop round");
});

test("disqualified only on a confirmed disqualification, and the rank stays", () => {
  const dq = (status) => ({ match_id: null, level: "disqualification", reason: "Cheating", status });
  const ranked = { id: ME, final_rank: 3, final_label: "top4", dropped: true };
  const e = build({ me: ranked, penalties: [dq("confirmed")] });
  assert.equal(e.disqualified, true);
  assert.equal(e.finalRank, 3);
  assert.equal(e.finalLabel, "top4");
  assert.equal(build({ me: ranked, penalties: [dq("pending")] }).disqualified, false);
});

test("penalties: pending/rejected hidden, linked under their match, unlinked in otherPenalties", () => {
  const e = build({
    matches: [match("m1", "swiss", 1, ME, "x", "player2_win")],
    penalties: [
      { match_id: "m1", level: "match_loss", reason: "Late", status: "confirmed" },
      { match_id: "m1", level: "warning", reason: "Slow play", status: "recorded" },
      { match_id: "m1", level: "match_loss", reason: "Maybe", status: "pending" },
      { match_id: null, level: "warning", reason: "Rude", status: "recorded" },
      { match_id: null, level: "match_loss", reason: "No", status: "rejected" },
    ],
  });
  assert.deepEqual(e.matches[0].penalties, [
    { level: "match_loss", reason: "Late" },
    { level: "warning", reason: "Slow play" },
  ]);
  assert.deepEqual(e.otherPenalties, [{ level: "warning", reason: "Rude" }]);
});

test("event fields, date fallback, player count and an empty deck slot", () => {
  const e = build({ matches: [match("m1", "swiss", 1, ME, "x", "player1_win")] });
  assert.equal(e.eventId, "ev1");
  assert.equal(e.name, "Sunday Cup");
  assert.equal(e.game, "vanguard");
  assert.equal(e.vanguardRegion, "th");
  assert.equal(e.vanguardRegulation, "d_standard");
  assert.equal(e.shopName, "Dragon Den");
  assert.equal(e.shopCode, "dragonden");
  assert.deepEqual(e.date, event.started_at, "falls back to started_at");
  const starts = new Date("2026-10-20T02:00:00Z");
  assert.deepEqual(build({ event: { ...event, starts_at: starts } }).date, starts);
  assert.equal(e.players, 8);
  assert.equal(e.finalRank, 2);
  assert.equal(e.matches[0].opponentDeck, null);
});

test("no player or user ids leak into the entry", () => {
  const json = JSON.stringify(build({ matches: [match("m1", "swiss", 1, ME, "opp-player-id", "player1_win")] }));
  assert.ok(!json.includes(ME));
  assert.ok(!json.includes("opp-player-id"));
});

test("opponentDeck comes from the map by opponent player id, null for a bye or no deck", () => {
  const deck = { g3: [{ name: "Blaster Blade", cardNumber: "X-1", imageUrl: null, nation: null }] };
  const e = build({
    matches: [
      { ...match("m1", "swiss", 1, ME, "opp-a", "player1_win"), opponent_player_id: "opp-a" },
      { ...match("m2", "swiss", 2, ME, "opp-b", "player1_win"), opponent_player_id: "opp-b" },
      { ...match("m3", "swiss", 3, ME, null, "bye", null), opponent_player_id: null },
    ],
    opponentDecks: new Map([["opp-a", deck]]),
  });
  assert.deepEqual(e.matches.map((m) => m.opponentDeck), [deck, null, null]);
});
