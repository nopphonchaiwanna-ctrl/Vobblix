// G3 stats per event (shop owner) and across events (admin) - deck-stats design §7.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, withDb, FUTURE_START } from "./helpers.js";

describe("deck stats", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let admin;
  let owner;
  let shop;
  let judge;
  const people = [];

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    owner = await createAndLogin(api, { email: "owner@test.local", role: "shop_owner" });
    shop = await createPublishedShop(api, owner.token, admin.token, "statshop");
    judge = await createAndLogin(api, { email: "judge@test.local", name: "Judge" });
    for (let i = 1; i <= 4; i++) people.push(await createAndLogin(api, { email: `p${i}@test.local`, name: `P${i}` }));
    await withDb(async (db) => {
      for (const [cn, name, grade] of [["A/1", "Alpha", 3], ["B/1", "Beta", 3], ["Z/0", "Zero", 0]]) {
        await db.query("INSERT INTO cards (card_number, set_code, name, grade) VALUES ($1, $2, $3, $4)", [cn, cn.split("/")[0], name, grade]);
      }
    });
  });
  after(() => server?.stop());

  const q = (sql, params) => withDb((db) => db.query(sql, params));

  /**
   * A finished JP D-Standard event with decks: P1 Alpha (champion of a
   * Swiss-only event = rank 1), P2 Alpha, P3 Beta, P4 no deck.
   * R1: P1 beats P3, P2 beats P4. R2: P1 vs P2 (mirror), P3 draws P4.
   */
  async function finishedEvent({ status = "completed", completedAt = "2026-10-15T05:00:00Z" } = {}) {
    const r = await api.post("/events", owner.token, {
      shopId: shop.id, name: "Stats Cup", startsAt: FUTURE_START, game: "vanguard", vanguardRegion: "jp", vanguardRegulation: "d_standard",
      format: "swiss_only", maxPlayers: 8, drawRule: "draw", deckSubmission: "optional",
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const id = r.body.event.id;
    await q("UPDATE tournament_events SET status = $2, completed_at = $3 WHERE id = $1", [id, status, status === "completed" ? completedAt : null]);
    const ids = [];
    for (const [i, p] of people.entries()) {
      ids.push((await q("INSERT INTO tournament_players (event_id, user_id, final_rank) VALUES ($1, $2, $3) RETURNING id", [id, p.id, i + 1])).rows[0].id);
    }
    const deckOf = async (playerId, g3) => {
      const d = (await q("INSERT INTO event_decks (event_id, player_id, decklog_code, source_locale, title) VALUES ($1, $2, 'C', 'decklog_jp', 'T') RETURNING id", [id, playerId])).rows[0].id;
      for (const cn of ["Z/0", g3]) await q("INSERT INTO event_deck_cards (event_deck_id, card_number, decklog_card_number, zone, quantity) VALUES ($1, $2, $2, 'ride', 1)", [d, cn]);
    };
    await deckOf(ids[0], "A/1");
    await deckOf(ids[1], "A/1");
    await deckOf(ids[2], "B/1");
    const m = (round, a, b, result) => q("INSERT INTO tournament_matches (event_id, phase, round_number, player1_id, player2_id, result) VALUES ($1, 'swiss', $2, $3, $4, $5)", [id, round, a, b, result]);
    await m(1, ids[0], ids[2], "player1_win");
    await m(1, ids[1], ids[3], "player1_win");
    await m(2, ids[0], ids[1], "player1_win");
    await m(2, ids[2], ids[3], "draw");
    return id;
  }

  test("owner sees the event's stats", async () => {
    const id = await finishedEvent();
    const r = await api.get(`/events/${id}/deck-stats`, owner.token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const { rows, withDeck, noDeck } = r.body.stats;
    assert.deepEqual([withDeck, noDeck], [3, 1]);
    const [alpha, beta] = rows;
    assert.deepEqual([alpha.key, alpha.players, alpha.matches, alpha.wins, alpha.winRate, alpha.firsts], ["Alpha", 2, 2, 2, 1, 1]);
    assert.deepEqual([beta.key, beta.matches, beta.losses, beta.draws, beta.winRate], ["Beta", 2, 1, 1, 0.25]);
  });

  test("judge and player can't see event stats", async () => {
    const id = await finishedEvent();
    assert.equal((await api.post(`/events/${id}/judges`, owner.token, { userId: judge.id })).status, 200);
    assert.equal((await api.get(`/events/${id}/deck-stats`, judge.token)).status, 403);
    assert.equal((await api.get(`/events/${id}/deck-stats`, people[0].token)).status, 403);
  });

  test("stats wait for the event to finish", async () => {
    const id = await finishedEvent({ status: "swiss" });
    const r = await api.get(`/events/${id}/deck-stats`, owner.token);
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "Stats are ready once the event is finished.");
  });

  test("admin stats span events in a Bangkok date range", async () => {
    await q("DELETE FROM tournament_events");
    await finishedEvent({ completedAt: "2026-10-31T17:30:00Z" }); // X: 01 Nov 00:30 in Bangkok
    await finishedEvent({ completedAt: "2026-10-15T05:00:00Z" }); // Y
    const get = (qs, token = admin.token) => api.get(`/admin/deck-stats${qs}`, token);
    assert.equal((await get("?from=2026-10-01&to=2026-10-31")).body.eventCount, 1);
    assert.equal((await get("?from=2026-11-01")).body.eventCount, 1);
    const all = await get("");
    assert.equal(all.body.eventCount, 2);
    assert.equal(all.body.stats.rows[0].players, 4, "entries, not distinct people");
    assert.equal((await get("", owner.token)).status, 403);
    assert.equal((await get("?to=garbage")).status, 400);
  });
});
