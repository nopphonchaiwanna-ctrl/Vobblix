// Whole events played through the API: Swiss-only to completion, and
// Swiss + top cut down to a champion. Every match is reported by both
// players with the same claim (player 1 always wins), so the outcome
// is deterministic even though pairings are shuffled.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, openCheckInAndApproveAll, FUTURE_START } from "./helpers.js";

describe("tournament flow", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let admin;
  let owner;
  let shop;
  const players = [];

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    owner = await createAndLogin(api, { email: "owner@test.local", role: "shop_owner" });
    shop = await createPublishedShop(api, owner.token, admin.token, "tourney");
    for (let i = 1; i <= 8; i++) players.push(await createAndLogin(api, { email: `p${i}@test.local`, name: `Player ${i}` }));
  });
  after(() => server?.stop());

  async function createEvent(fields) {
    const r = await api.post("/events", owner.token, {
      shopId: shop.id, startsAt: FUTURE_START,
      game: "vanguard",
      vanguardRegion: "th",
      vanguardRegulation: "d_standard",
      format: "swiss_only",
      maxPlayers: 8,
      drawRule: "double_loss",
      ...fields,
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.event;
  }

  /**
   * Both players report the same claim for every open match, then the
   * owner advances. `claimFor(match, index)` picks the result (default:
   * player 1 wins); `onReported` sees every finalized match.
   */
  async function playRound(eventId, { claimFor = () => "player1_win", onReported = () => {} } = {}) {
    const { body } = await api.get(`/events/${eventId}`, owner.token);
    const byPlayerId = new Map(body.players.map((p) => [p.id, players.find((x) => x.id === p.userId)]));
    const open = body.currentRoundMatches.filter((m) => !m.result); // byes are already final
    for (const [i, m] of open.entries()) {
      const claim = claimFor(m, i);
      let last;
      for (const side of [m.player1Id, m.player2Id]) {
        last = await api.post(`/events/${eventId}/matches/${m.id}/report`, byPlayerId.get(side).token, { claim });
        assert.equal(last.status, 200, JSON.stringify(last.body));
      }
      assert.equal(last.body.match.result, claim, "matching claims finalize the match");
      onReported(last.body.match);
    }
    for (const m of body.currentRoundMatches.filter((x) => x.result)) onReported(m);
    const adv = await api.post(`/events/${eventId}/advance`, owner.token);
    assert.equal(adv.status, 200, JSON.stringify(adv.body));
    return adv.body;
  }

  /** Points every finalized Swiss match is worth under the event's draw rule. */
  function pointsFor(match, drawRule) {
    if (match.result === "bye") return 3;
    if (match.result === "draw") return drawRule === "draw" ? 2 : 0; // 1 each, or 0 each
    if (match.result === "double_loss") return 0;
    return 3;
  }

  async function registerAndStart(event, field) {
    for (const p of field) assert.equal((await api.post(`/events/${event.id}/register`, p.token)).status, 201);
    await openCheckInAndApproveAll(api, owner.token, event.id);
    const start = await api.post(`/events/${event.id}/start`, owner.token);
    assert.equal(start.status, 200, JSON.stringify(start.body));
    return start.body;
  }

  test("Swiss only, 5 players: byes rotate, every player ranked at the end", async () => {
    const event = await createEvent({ name: "Swiss 5" });
    for (const p of players.slice(0, 5)) assert.equal((await api.post(`/events/${event.id}/register`, p.token)).status, 201);

    await openCheckInAndApproveAll(api, owner.token, event.id);
    const start = await api.post(`/events/${event.id}/start`, owner.token);
    assert.equal(start.status, 200);
    assert.equal(start.body.event.roundCount, 3);
    assert.equal(start.body.round1Pairings.filter((p) => p.player2Id === null).length, 1, "odd field -> one bye");

    const byes = new Set([start.body.round1Pairings.find((p) => p.player2Id === null).player1Id]);
    let last;
    for (let round = 1; round <= 3; round++) {
      last = await playRound(event.id);
      const bye = last.nextRoundPairings?.find((p) => p.player2Id === null);
      if (bye) {
        assert.ok(!byes.has(bye.player1Id), "nobody gets a second bye while others haven't had one");
        byes.add(bye.player1Id);
      }
    }
    assert.equal(last.event.status, "completed");
    const ranks = last.finalStandings.map((_, i) => i + 1);
    assert.deepEqual(ranks, [1, 2, 3, 4, 5]);

    const detail = (await api.get(`/events/${event.id}`, owner.token)).body;
    assert.deepEqual(detail.players.map((p) => p.finalRank).sort(), [1, 2, 3, 4, 5]);
  });

  test("Swiss + top 4 cut, 8 players: bracket down to one champion", async () => {
    const event = await createEvent({ name: "Cut 8", format: "swiss_cut", configuredCutSize: 4 });
    for (const p of players) await api.post(`/events/${event.id}/register`, p.token);
    await openCheckInAndApproveAll(api, owner.token, event.id);
    const start = await api.post(`/events/${event.id}/start`, owner.token);
    assert.equal(start.body.event.cutEnabled, true);

    let state;
    for (let i = 0; i < 3; i++) state = await playRound(event.id);
    assert.equal(state.event.status, "bracket");
    assert.ok([4, 8].includes(state.event.effectiveCutSize));
    // However many were guaranteed, the bracket is always full (an
    // overflow is topped up from the next-best standings).
    assert.equal(state.bracketRound1Pairings.length, state.event.effectiveCutSize / 2);
    assert.ok(state.bracketRound1Pairings.every((p) => p.player2Id), "no byes in a full field");

    for (let i = 0; i < 4 && state.event.status !== "completed"; i++) state = await playRound(event.id);
    assert.equal(state.event.status, "completed");

    const detail = (await api.get(`/events/${event.id}`, owner.token)).body;
    assert.equal(detail.players.filter((p) => p.finalLabel === "champion").length, 1);
    assert.equal(detail.players.filter((p) => p.finalLabel === "runner_up").length, 1);
    assert.ok(detail.players.every((p) => p.finalRank !== null), "every player gets a final rank");
  });

  test("draws and double losses, played to the end: standings add up", async () => {
    const event = await createEvent({ name: "Draw rule", drawRule: "draw" });
    await registerAndStart(event, players.slice(0, 4));

    // Round 1: one draw, one double loss. Rounds 2-3: alternate draw / win.
    const swissMatches = [];
    const collect = (m) => swissMatches.push(m);
    let state = await playRound(event.id, { claimFor: (_m, i) => (i === 0 ? "draw" : "double_loss"), onReported: collect });
    state = await playRound(event.id, { claimFor: (_m, i) => (i === 0 ? "draw" : "player2_win"), onReported: collect });
    state = await playRound(event.id, { claimFor: (_m, i) => (i === 0 ? "player1_win" : "draw"), onReported: collect });
    assert.equal(state.event.status, "completed");

    const results = swissMatches.map((m) => m.result).sort();
    assert.deepEqual(results, ["double_loss", "draw", "draw", "draw", "player1_win", "player2_win"]);
    const expectedTotal = swissMatches.reduce((sum, m) => sum + pointsFor(m, "draw"), 0);
    const actualTotal = state.finalStandings.reduce((sum, s) => sum + s.points, 0);
    assert.equal(actualTotal, expectedTotal, "3 per win, 1 each per draw, 0 for a double loss");
    assert.deepEqual(state.finalStandings.map((s) => s.wins + s.losses + s.draws), [3, 3, 3, 3], "every player has 3 results");
    for (let i = 1; i < state.finalStandings.length; i++) {
      assert.ok(state.finalStandings[i - 1].points >= state.finalStandings[i].points, "sorted by points");
    }
  });

  test("players dropping mid-event: organizer settles their open match, they're never paired again", async () => {
    const event = await createEvent({ name: "Drops" });
    await registerAndStart(event, players.slice(0, 6));
    await playRound(event.id); // round 1 played; advancing already paired round 2

    // Two players leave with a round-2 match still open - one dropped by
    // the organizer, one leaving on their own.
    const { body } = await api.get(`/events/${event.id}`, owner.token);
    const entryOf = (u) => body.players.find((p) => p.userId === u.id);
    const leaverA = entryOf(players[0]);
    const leaverB = entryOf(players[1]);
    assert.equal((await api.post(`/events/${event.id}/drop`, owner.token, { playerId: leaverA.id })).status, 200);
    assert.equal((await api.post(`/events/${event.id}/drop`, players[1].token)).status, 200, "a player can drop themselves");
    const gone = new Set([leaverA.id, leaverB.id]);

    // Their open matches block the round until the organizer settles them.
    assert.equal((await api.post(`/events/${event.id}/advance`, owner.token)).status, 409);
    const tokenOf = (playerId) => players.find((x) => x.id === body.players.find((p) => p.id === playerId).userId).token;
    for (const m of body.currentRoundMatches) {
      if (m.result) continue;
      if (gone.has(m.player1Id) || gone.has(m.player2Id)) {
        const result = gone.has(m.player1Id) ? (gone.has(m.player2Id) ? "double_loss" : "player2_win") : "player1_win";
        assert.equal((await api.post(`/events/${event.id}/matches/${m.id}/override`, owner.token, { result })).status, 200);
      } else {
        for (const side of [m.player1Id, m.player2Id]) {
          await api.post(`/events/${event.id}/matches/${m.id}/report`, tokenOf(side), { claim: "player1_win" });
        }
      }
    }
    let state = await api.post(`/events/${event.id}/advance`, owner.token);
    assert.equal(state.status, 200, JSON.stringify(state.body));
    state = state.body;
    assert.equal(state.nextRoundPairings.length, 2, "4 players left -> 2 matches, no bye");
    for (const p of state.nextRoundPairings) {
      assert.ok(!gone.has(p.player1Id) && !gone.has(p.player2Id), "dropped player paired again");
    }

    state = await playRound(event.id);
    assert.equal(state.event.status, "completed");
    assert.equal(state.finalStandings.length, 4, "the 4 remaining players are ranked");
    assert.ok(state.finalStandings.every((s) => !gone.has(s.id)));
  });

  test("cut overflow: everyone unbeaten in Swiss -> top 4 expands to top 8, played to a champion", async () => {
    const event = await createEvent({ name: "Overflow", format: "swiss_cut", configuredCutSize: 4, drawRule: "draw" });
    const start = await registerAndStart(event, players);
    assert.equal(start.event.cutEnabled, true);

    // Draws aren't losses, so all 8 finish Swiss with 0 losses = all guaranteed a cut spot.
    let state;
    for (let i = 0; i < 3; i++) state = await playRound(event.id, { claimFor: () => "draw" });
    assert.equal(state.event.status, "bracket");
    assert.equal(state.cutExpanded, true);
    assert.equal(state.guaranteedTrimmed, false);
    assert.equal(state.event.effectiveCutSize, 8);
    assert.equal(state.bracketRound1Pairings.length, 4);

    for (let i = 0; i < 3; i++) state = await playRound(event.id);
    assert.equal(state.event.status, "completed");
    const detail = (await api.get(`/events/${event.id}`, owner.token)).body;
    const labels = detail.players.map((p) => p.finalLabel).sort();
    assert.deepEqual(labels, ["champion", "runner_up", "top4", "top4", "top8", "top8", "top8", "top8"]);
  });

  test("cut overflow capped by field size: unbeaten players trimmed by tiebreakers", async () => {
    const event = await createEvent({ name: "Trimmed", format: "swiss_cut", configuredCutSize: 4, drawRule: "draw" });
    await registerAndStart(event, players.slice(0, 6));

    // 6 unbeaten would need a top 8, but a 6-player field caps the bracket at 4.
    let state;
    for (let i = 0; i < 3; i++) state = await playRound(event.id, { claimFor: () => "draw" });
    assert.equal(state.event.status, "bracket");
    assert.equal(state.guaranteedTrimmed, true);
    assert.equal(state.event.effectiveCutSize, 4);

    for (let i = 0; i < 2; i++) state = await playRound(event.id);
    assert.equal(state.event.status, "completed");
    const detail = (await api.get(`/events/${event.id}`, owner.token)).body;
    // No third-place match: both semifinal losers share 3rd, then the
    // two trimmed players rank below the whole cut.
    assert.deepEqual(detail.players.map((p) => p.finalRank).sort((a, b) => a - b), [1, 2, 3, 3, 5, 6], "trimmed players still ranked");
  });

  test("drops leave the expanded bracket short: top seeds get byes, event still finishes", async () => {
    const event = await createEvent({ name: "Short bracket", format: "swiss_cut", configuredCutSize: 4, drawRule: "draw" });
    await registerAndStart(event, players);
    await playRound(event.id, { claimFor: () => "draw" });

    // 3 players leave with round-2 matches open; the organizer settles those.
    const { body } = await api.get(`/events/${event.id}`, owner.token);
    const leaving = players.slice(0, 3).map((u) => body.players.find((p) => p.userId === u.id).id);
    for (const playerId of leaving) await api.post(`/events/${event.id}/drop`, owner.token, { playerId });
    const gone = new Set(leaving);
    const tokenOf = (playerId) => players.find((x) => x.id === body.players.find((p) => p.id === playerId).userId).token;
    for (const m of body.currentRoundMatches) {
      if (gone.has(m.player1Id) || gone.has(m.player2Id)) {
        const result = gone.has(m.player1Id) ? (gone.has(m.player2Id) ? "double_loss" : "player2_win") : "player1_win";
        await api.post(`/events/${event.id}/matches/${m.id}/override`, owner.token, { result });
      } else {
        for (const side of [m.player1Id, m.player2Id]) await api.post(`/events/${event.id}/matches/${m.id}/report`, tokenOf(side), { claim: "draw" });
      }
    }
    assert.equal((await api.post(`/events/${event.id}/advance`, owner.token)).status, 200);
    let state = await playRound(event.id, { claimFor: () => "draw" }); // round 3: 5 active, one bye

    // 5 unbeaten -> top 8 (8 registered), nobody left to fill -> 3 byes.
    assert.equal(state.event.status, "bracket");
    assert.equal(state.event.effectiveCutSize, 8);
    const r1 = state.bracketRound1Pairings;
    assert.equal(r1.length, 4, "bracket keeps its shape");
    assert.equal(r1.filter((p) => p.player2Id === null).length, 3);
    assert.ok(r1.flatMap((p) => [p.player1Id, p.player2Id]).every((id) => !gone.has(id)), "dropped players not in the bracket");

    for (let i = 0; i < 3 && state.event.status !== "completed"; i++) state = await playRound(event.id);
    assert.equal(state.event.status, "completed");
    const detail = (await api.get(`/events/${event.id}`, owner.token)).body;
    const active = detail.players.filter((p) => !gone.has(p.id));
    assert.equal(active.filter((p) => p.finalLabel === "champion").length, 1);
    assert.equal(active.filter((p) => p.finalLabel === "runner_up").length, 1);
    assert.ok(active.every((p) => p.finalRank !== null), "every remaining player ranked");
  });

  test("too few players for the cut falls back to Swiss only", async () => {
    const event = await createEvent({ name: "Small cut", format: "swiss_cut", configuredCutSize: 4 });
    for (const p of players.slice(0, 5)) await api.post(`/events/${event.id}/register`, p.token);
    await openCheckInAndApproveAll(api, owner.token, event.id);
    const start = await api.post(`/events/${event.id}/start`, owner.token);
    assert.equal(start.body.event.cutEnabled, false);
    assert.ok(start.body.cutFallbackMessage);
  });

  test("disputed results wait for the organizer's override", async () => {
    const event = await createEvent({ name: "Dispute" });
    for (const p of players.slice(0, 2)) await api.post(`/events/${event.id}/register`, p.token);
    await openCheckInAndApproveAll(api, owner.token, event.id);
    await api.post(`/events/${event.id}/start`, owner.token);
    const { body } = await api.get(`/events/${event.id}`, owner.token);
    const m = body.currentRoundMatches[0];
    const tokenOf = (playerId) => players.find((x) => x.id === body.players.find((p) => p.id === playerId).userId).token;

    await api.post(`/events/${event.id}/matches/${m.id}/report`, tokenOf(m.player1Id), { claim: "player1_win" });
    const disputed = await api.post(`/events/${event.id}/matches/${m.id}/report`, tokenOf(m.player2Id), { claim: "player2_win" });
    assert.equal(disputed.body.match.result, null);
    assert.equal((await api.post(`/events/${event.id}/advance`, owner.token)).status, 409);

    assert.equal((await api.post(`/events/${event.id}/matches/${m.id}/override`, tokenOf(m.player1Id), { result: "player1_win" })).status, 403);
    const ov = await api.post(`/events/${event.id}/matches/${m.id}/override`, owner.token, { result: "player2_win" });
    assert.equal(ov.body.match.result, "player2_win");
    assert.equal((await api.post(`/events/${event.id}/matches/${m.id}/report`, tokenOf(m.player1Id), { claim: "draw" })).status, 409);
  });

  test("registration rules: cap, double registration, drop and rejoin", async () => {
    const event = await createEvent({ name: "Cap", maxPlayers: 4 });
    for (const p of players.slice(0, 4)) assert.equal((await api.post(`/events/${event.id}/register`, p.token)).status, 201);
    const full = await api.post(`/events/${event.id}/register`, players[4].token);
    assert.equal(full.status, 201, "full - goes on the waitlist");
    assert.equal(full.body.player.entryStatus, "waitlisted");
    assert.equal((await api.post(`/events/${event.id}/register`, players[0].token)).status, 409, "already in");
    assert.equal((await api.post(`/events/${event.id}/drop`, players[0].token)).status, 200);
    const rejoin = await api.post(`/events/${event.id}/register`, players[0].token);
    assert.equal(rejoin.status, 201, "rejoining after the waitlister took the freed spot");
    assert.equal(rejoin.body.player.entryStatus, "waitlisted", "full again - back of the queue");
  });
});
