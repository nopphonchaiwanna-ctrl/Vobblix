import { test } from "node:test";
import assert from "node:assert/strict";
import { takesDecks, normalizeDeckSubmission, g3Group, computeDeckStats, bangkokRange, hasRideDeck } from "../../src/tournament/deckStats.js";

test("takesDecks: only Vanguard JP D-Standard events take decks", () => {
  assert.equal(takesDecks({ game: "vanguard", vanguard_region: "jp", vanguard_regulation: "d_standard" }), true);
  assert.equal(takesDecks({ game: "vanguard", vanguard_region: "th", vanguard_regulation: "d_standard" }), false);
  assert.equal(takesDecks({ game: "vanguard", vanguard_region: "jp", vanguard_regulation: "premium" }), false);
});

test("normalizeDeckSubmission: forced off where decks don't apply, kept when left out", () => {
  const jp = { game: "vanguard", vanguardRegion: "jp", vanguardRegulation: "d_standard" };
  const th = { ...jp, vanguardRegion: "th" };
  assert.equal(normalizeDeckSubmission(th, "required"), "off");
  assert.equal(normalizeDeckSubmission(jp, "required"), "required");
  assert.equal(normalizeDeckSubmission(jp, undefined, "optional"), "optional");
  assert.equal(normalizeDeckSubmission(jp, "bogus"), "off");
  assert.equal(normalizeDeckSubmission(th, undefined, "optional"), "off");
});

const card = (cardNumber, name, grade, extra = {}) => ({ cardNumber, name, grade, imageUrl: `img/${cardNumber}`, nation: "N", ...extra });

test("g3Group: reprints share a name, two G3s sort and join, none found is Unknown", () => {
  const one = g3Group([card("A-1", "Alpha", 3), card("A-2", "Alpha", 3), card("Z-0", "Zero", 0)]);
  assert.equal(one.key, "Alpha");
  assert.deepEqual(one.g3, [{ name: "Alpha", cardNumber: "A-1", imageUrl: "img/A-1", nation: "N" }]);
  assert.equal(g3Group([card("B-1", "Beta", 3), card("A-1", "Alpha", 3)]).key, "Alpha / Beta");
  const unknown = g3Group([card("X-1", null, null), card("Z-0", "Zero", 0)]);
  assert.equal(unknown.key, "Unknown");
  assert.deepEqual(unknown.g3, []);
});

const grp = (key) => (key === "Unknown" ? { key, g3: [] } : { key, g3: [{ name: key, cardNumber: `${key}-1`, imageUrl: `img/${key}`, nation: "N" }] });
const pl = (id, key, extra = {}) => ({ id, group: key ? grp(key) : null, finalRank: null, finalLabel: null, ...extra });
const mt = (player1Id, player2Id, result) => ({ player1Id, player2Id, result });

test("computeDeckStats: win %, mirrors and byes excluded, no-deck players counted apart", () => {
  const { rows, withDeck, noDeck } = computeDeckStats({
    players: [pl("A1", "A"), pl("A2", "A"), pl("B1", "B"), pl("U1", "Unknown"), pl("N1", null)],
    matches: [
      mt("A1", "B1", "player1_win"),
      mt("A1", "A2", "player1_win"),
      mt("B1", "U1", "draw"),
      mt("A2", null, "bye"),
      mt("U1", "N1", "double_loss"),
      mt("A2", "N1", "player1_win"),
    ],
  });
  assert.equal(withDeck, 4);
  assert.equal(noDeck, 1);
  assert.deepEqual(rows.map((r) => r.key), ["A", "B", "Unknown"]);
  const [a, b, u] = rows;
  assert.deepEqual([a.players, a.matches, a.wins, a.winRate, a.share], [2, 2, 2, 1, 0.5]);
  assert.deepEqual([b.matches, b.wins, b.losses, b.draws, b.winRate], [2, 0, 1, 1, 0.25]);
  assert.equal(u.matches, 2);
  assert.equal(u.winRate, null);
  assert.equal(a.imageUrl, "img/A");
  assert.equal(a.nation, "N");
});

test("computeDeckStats: Unknown vs Unknown is counted", () => {
  const { rows } = computeDeckStats({ players: [pl("U1", "Unknown"), pl("U2", "Unknown")], matches: [mt("U1", "U2", "player1_win")] });
  assert.deepEqual([rows[0].matches, rows[0].wins, rows[0].losses], [2, 1, 1]);
});

test("computeDeckStats: best finish, firsts and top cuts", () => {
  const { rows } = computeDeckStats({
    players: [
      pl("A1", "A", { finalRank: 1, finalLabel: "champion" }),
      pl("A2", "A", { finalRank: 3, finalLabel: "top4" }),
      pl("B1", "B", { finalRank: 1 }),
    ],
    matches: [],
  });
  const a = rows.find((r) => r.key === "A");
  const b = rows.find((r) => r.key === "B");
  assert.deepEqual([a.bestLabel, a.bestRank, a.firsts, a.topCuts], ["champion", 1, 1, 2]);
  assert.deepEqual([b.bestLabel, b.bestRank, b.firsts, b.topCuts], [null, 1, 1, 0]);
  assert.equal(a.winRate, null, "no matches, no win rate");
});

test("bangkokRange: whole Bangkok days, end exclusive; bad input is an error", () => {
  const r = bangkokRange("2026-10-01", "2026-10-31");
  assert.equal(r.start.toISOString(), "2026-09-30T17:00:00.000Z");
  assert.equal(r.end.toISOString(), "2026-10-31T17:00:00.000Z");
  assert.deepEqual(bangkokRange(), { start: null, end: null });
  assert.deepEqual(bangkokRange("2026-13-01"), { error: "Choose a valid date range." });
  assert.deepEqual(bangkokRange("2026-10-05", "2026-10-01"), { error: "Choose a valid date range." });
  const late = new Date("2026-10-31T17:30:00Z"); // 01 Nov 00:30 Bangkok
  assert.ok(late >= r.end, "excluded from to=2026-10-31");
  assert.ok(late >= bangkokRange("2026-11-01").start, "included from 2026-11-01");
});

test("hasRideDeck: a fetched Decklog deck needs at least one ride-zone card", () => {
  assert.equal(hasRideDeck([{ zone: "main" }, { zone: "ride" }]), true);
  assert.equal(hasRideDeck([{ zone: "main" }, { zone: "g_deck" }]), false);
  assert.equal(hasRideDeck([]), false);
});
