// A player's own match history (match-history design §4-§8). Events are
// created through the API, then their finished state is seeded straight
// into the tables so every rank, drop and result is deterministic.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, withDb, FUTURE_START } from "./helpers.js";

describe("match history", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let owner;
  let shop;
  let me;
  let other; // never plays - sees an empty history
  const opp = [];

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    const admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    owner = await createAndLogin(api, { email: "owner@test.local", role: "shop_owner" });
    shop = await createPublishedShop(api, owner.token, admin.token, "historyshop");
    me = await createAndLogin(api, { email: "me@test.local", name: "Me" });
    other = await createAndLogin(api, { email: "other@test.local", name: "Other" });
    for (let i = 1; i <= 3; i++) opp.push(await createAndLogin(api, { email: `o${i}@test.local`, name: `Opponent ${i}` }));
  });
  after(() => server?.stop());

  async function finishedEvent(name, { status = "completed", completedAt = "2026-10-20T10:00:00Z", cut = null } = {}) {
    const r = await api.post("/events", owner.token, {
      shopId: shop.id, name, startsAt: FUTURE_START, game: "vanguard", vanguardRegion: "th", vanguardRegulation: "d_standard",
      format: cut ? "swiss_cut" : "swiss_only", configuredCutSize: cut ?? undefined, maxPlayers: 8, drawRule: "double_loss",
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    await withDb((db) =>
      db.query(
        `UPDATE tournament_events SET status = $2, started_at = '2026-10-20T03:00:00Z', completed_at = $3,
                effective_cut_size = $4::int, cut_enabled = $4::int IS NOT NULL WHERE id = $1`,
        [r.body.event.id, status, status === "completed" ? completedAt : null, cut]
      )
    );
    return r.body.event.id;
  }
  async function addPlayer(eventId, userId, fields = {}) {
    const f = { entry_status: "entered", no_show: false, dropped: false, final_rank: null, final_label: null, ...fields };
    return withDb(async (db) => (await db.query(
      `INSERT INTO tournament_players (event_id, user_id, entry_status, no_show, dropped, final_rank, final_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [eventId, userId, f.entry_status, f.no_show, f.dropped, f.final_rank, f.final_label]
    )).rows[0].id);
  }
  async function addMatch(eventId, phase, round, p1, p2, result) {
    return withDb(async (db) => (await db.query(
      `INSERT INTO tournament_matches (event_id, phase, round_number, player1_id, player2_id, result)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [eventId, phase, round, p1, p2, result]
    )).rows[0].id);
  }
  async function addPenalty(eventId, playerId, matchId, level, status, reason = "Reason") {
    await withDb((db) => db.query(
      `INSERT INTO event_penalties (event_id, player_id, match_id, level, reason, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventId, playerId, matchId, level, reason, status]
    ));
  }
  async function history(token = me.token) {
    const r = await api.get("/events/history", token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.events;
  }
  const entryFor = async (eventId) => (await history()).find((e) => e.eventId === eventId);

  test("a finished Swiss event lists every match in order with rank and record", async () => {
    const id = await finishedEvent("Swiss Cup");
    const mine = await addPlayer(id, me.id, { final_rank: 2 });
    const [a, b, c] = [await addPlayer(id, opp[0].id, { final_rank: 1 }), await addPlayer(id, opp[1].id, { final_rank: 3 }), await addPlayer(id, opp[2].id, { final_rank: 4 })];
    await addMatch(id, "swiss", 1, mine, b, "player1_win");
    await addMatch(id, "swiss", 1, a, c, "player1_win");
    await addMatch(id, "swiss", 2, a, mine, "player1_win");
    await addMatch(id, "swiss", 2, b, c, "player1_win");
    const e = await entryFor(id);
    assert.equal(e.name, "Swiss Cup");
    assert.equal(e.shopName, "Shop historyshop");
    assert.equal(e.finalRank, 2);
    assert.equal(e.players, 4);
    assert.deepEqual(e.record, { wins: 1, losses: 1, draws: 0 });
    assert.deepEqual(e.matches.map((m) => m.result), ["win", "loss"]);
    assert.deepEqual(e.matches.map((m) => m.roundLabel), ["Round 1", "Round 2"]);
    assert.deepEqual(e.matches.map((m) => m.opponentName), ["Opponent 2", "Opponent 1"]);
    assert.equal(e.matches[0].opponentDeck, null);
  });

  test("top cut follows Swiss, labelled by round", async () => {
    const id = await finishedEvent("Cut Cup", { cut: 4 });
    const mine = await addPlayer(id, me.id, { final_rank: 2, final_label: "runner_up" });
    const a = await addPlayer(id, opp[0].id, { final_rank: 1, final_label: "champion" });
    const b = await addPlayer(id, opp[1].id, { final_rank: 3, final_label: "top4" });
    await addMatch(id, "bracket", 2, a, mine, "player1_win");
    await addMatch(id, "bracket", 1, mine, b, "player1_win");
    await addMatch(id, "swiss", 1, mine, a, "player1_win");
    const e = await entryFor(id);
    assert.deepEqual(e.matches.map((m) => m.roundLabel), ["Round 1", "Semifinal", "Final"]);
    assert.equal(e.finalLabel, "runner_up");
  });

  test("a Swiss drop shows the round they left", async () => {
    const id = await finishedEvent("Drop Cup");
    const mine = await addPlayer(id, me.id, { dropped: true });
    const a = await addPlayer(id, opp[0].id, { final_rank: 1 });
    await addMatch(id, "swiss", 1, mine, a, "player1_win");
    await addMatch(id, "swiss", 2, a, mine, "player1_win");
    const e = await entryFor(id);
    assert.equal(e.finalRank, null);
    assert.equal(e.dropped, true);
    assert.equal(e.dropRound, 2);
  });

  test("disqualified in top cut keeps the rank and is flagged", async () => {
    const id = await finishedEvent("DQ Cup", { cut: 4 });
    const mine = await addPlayer(id, me.id, { dropped: true, final_rank: 3, final_label: "top4" });
    const a = await addPlayer(id, opp[0].id, { final_rank: 1, final_label: "champion" });
    const m = await addMatch(id, "bracket", 1, mine, a, "player2_win");
    await addPenalty(id, mine, m, "disqualification", "confirmed", "Cheating");
    const e = await entryFor(id);
    assert.equal(e.finalLabel, "top4");
    assert.equal(e.finalRank, 3);
    assert.equal(e.disqualified, true);
    assert.deepEqual(e.matches[0].penalties, [{ level: "disqualification", reason: "Cheating" }]);
  });

  test("not listed: cancelled, still running, waitlisted, no-show, pre-start withdrawal", async () => {
    const ids = [];
    const cancelled = await finishedEvent("Hidden Cancelled", { status: "cancelled" });
    const running = await finishedEvent("Hidden Running", { status: "swiss" });
    for (const id of [cancelled, running]) {
      const mine = await addPlayer(id, me.id);
      const a = await addPlayer(id, opp[0].id);
      await addMatch(id, "swiss", 1, mine, a, "player1_win");
      ids.push(id);
    }
    const waitlisted = await finishedEvent("Hidden Waitlist");
    await addPlayer(waitlisted, me.id, { entry_status: "waitlisted" });
    const noShow = await finishedEvent("Hidden NoShow");
    await addPlayer(noShow, me.id, { no_show: true });
    const withdrew = await finishedEvent("Hidden Withdrew");
    await addPlayer(withdrew, me.id, { dropped: true }); // left before the start: no matches
    for (const id of [waitlisted, noShow, withdrew]) {
      const a = await addPlayer(id, opp[0].id, { final_rank: 1 });
      const b = await addPlayer(id, opp[1].id, { final_rank: 2 });
      await addMatch(id, "swiss", 1, a, b, "player1_win");
      ids.push(id);
    }
    const listed = new Set((await history()).map((e) => e.eventId));
    for (const id of ids) assert.ok(!listed.has(id), `event ${id} should not be in history`);
  });

  test("bye and deleted opponent", async () => {
    const id = await finishedEvent("Bye Cup");
    const ghost = await createAndLogin(api, { email: "ghost@test.local", name: "Ghost" });
    const mine = await addPlayer(id, me.id, { final_rank: 1 });
    const g = await addPlayer(id, ghost.id, { final_rank: 2 });
    await addMatch(id, "swiss", 1, mine, null, "bye");
    await addMatch(id, "swiss", 2, mine, g, "player1_win");
    await withDb((db) => db.query("UPDATE users SET deleted_at = now() WHERE id = $1", [ghost.id]));
    const e = await entryFor(id);
    assert.deepEqual(e.matches.map((m) => [m.opponentName, m.result]), [["Bye", "bye"], ["Deleted player", "win"]]);
  });

  test("penalties: confirmed/recorded shown, pending/rejected hidden; unlinked go to otherPenalties", async () => {
    const id = await finishedEvent("Penalty Cup");
    const mine = await addPlayer(id, me.id, { final_rank: 2 });
    const a = await addPlayer(id, opp[0].id, { final_rank: 1 });
    const m = await addMatch(id, "swiss", 1, a, mine, "player1_win");
    await addPenalty(id, mine, m, "match_loss", "confirmed", "Marked cards");
    await addPenalty(id, mine, m, "match_loss", "pending", "Pending one");
    await addPenalty(id, mine, null, "warning", "recorded", "Slow play");
    await addPenalty(id, mine, null, "match_loss", "rejected", "Rejected one");
    await addPenalty(id, a, m, "warning", "recorded", "Someone else's");
    const e = await entryFor(id);
    assert.deepEqual(e.matches[0].penalties, [{ level: "match_loss", reason: "Marked cards" }]);
    assert.deepEqual(e.otherPenalties, [{ level: "warning", reason: "Slow play" }]);
  });

  test("only the caller's own history; 401 without login", async () => {
    assert.deepEqual(await history(other.token), []);
    const body = JSON.stringify(await history());
    for (const u of [me, other, ...opp]) assert.ok(!body.includes(u.id), "no user ids in the response");
    assert.equal((await api.get("/events/history")).status, 401);
  });

  test("newest completed first", async () => {
    const older = await finishedEvent("Order Older", { completedAt: "2026-01-01T00:00:00Z" });
    const newer = await finishedEvent("Order Newer", { completedAt: "2027-01-01T00:00:00Z" });
    for (const id of [older, newer]) {
      const mine = await addPlayer(id, me.id, { final_rank: 1 });
      await addMatch(id, "swiss", 1, mine, null, "bye");
    }
    const order = (await history()).map((e) => e.eventId);
    assert.equal(order[0], newer);
    assert.equal(order[order.length - 1], older);
  });
});
