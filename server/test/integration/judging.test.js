// Judges, "call a judge", and penalties.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, openCheckInAndApproveAll, FUTURE_START,
} from "./helpers.js";

describe("judging", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let owner;
  let judgeA;
  let judgeB;
  let outsider;
  let shop;
  const players = [];

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    const admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    owner = await createAndLogin(api, { email: "owner@test.local", role: "shop_owner" });
    judgeA = await createAndLogin(api, { email: "ja@test.local", name: "Judge Alpha" });
    judgeB = await createAndLogin(api, { email: "jb@test.local", name: "Judge Beta" });
    outsider = await createAndLogin(api, { email: "out@test.local", name: "Outsider" });
    shop = await createPublishedShop(api, owner.token, admin.token, "judged");
    for (let i = 1; i <= 4; i++) players.push(await createAndLogin(api, { email: `j${i}@test.local`, name: `Contender ${i}` }));
  });
  after(() => server?.stop());

  async function runningEvent() {
    const r = await api.post("/events", owner.token, {
      shopId: shop.id, startsAt: FUTURE_START, name: "Judged", game: "vanguard", vanguardRegion: "th", vanguardRegulation: "d_standard",
      format: "swiss_only", maxPlayers: 4, drawRule: "double_loss",
    });
    const event = r.body.event;
    for (const p of players) await api.post(`/events/${event.id}/register`, p.token);
    assert.equal((await api.post(`/events/${event.id}/judges`, owner.token, { userId: judgeA.id })).status, 200);
    assert.equal((await api.post(`/events/${event.id}/judges`, owner.token, { userId: judgeB.id })).status, 200);
    await openCheckInAndApproveAll(api, owner.token, event.id);
    assert.equal((await api.post(`/events/${event.id}/start`, owner.token)).status, 200);
    const body = (await api.get(`/events/${event.id}`, owner.token)).body;
    const match = body.currentRoundMatches.find((m) => m.player2Id);
    const p1 = players.find((p) => p.id === body.players.find((x) => x.id === match.player1Id).userId);
    const p2 = players.find((p) => p.id === body.players.find((x) => x.id === match.player2Id).userId);
    return { event, match, p1, p2, body };
  }
  const kinds = async (token) => (await api.get("/notifications", token)).body.notifications.map((n) => n.kind);

  test("organizer searches and adds judges; players can't judge, judges can't play", async () => {
    const r = await api.post("/events", owner.token, {
      shopId: shop.id, startsAt: FUTURE_START, name: "Staffing", game: "vanguard", vanguardRegion: "jp", vanguardRegulation: "premium",
      format: "swiss_only", maxPlayers: 4, drawRule: "double_loss",
    });
    const event = r.body.event;
    const found = await api.get(`/events/${event.id}/staff/search?q=Judge`, owner.token);
    assert.equal(found.status, 200);
    assert.deepEqual(found.body.users.map((u) => u.displayName).sort(), ["Judge Alpha", "Judge Beta"]);
    assert.equal((await api.get(`/events/${event.id}/staff/search?q=J`, owner.token)).status, 400);
    assert.equal((await api.get(`/events/${event.id}/staff/search?q=Judge`, outsider.token)).status, 403);

    await api.post(`/events/${event.id}/register`, players[0].token);
    const asPlayer = await api.post(`/events/${event.id}/judges`, owner.token, { userId: players[0].id });
    assert.equal(asPlayer.status, 409);
    assert.equal(asPlayer.body.error, "Players in this event can't judge it.");

    assert.equal((await api.post(`/events/${event.id}/judges`, owner.token, { userId: judgeA.id })).status, 200);
    const view = await api.get(`/events/${event.id}`, judgeA.token);
    assert.equal(view.body.myRole, "judge");
    assert.deepEqual(view.body.judges.map((j) => j.displayName), ["Judge Alpha"]);
    const reg = await api.post(`/events/${event.id}/register`, judgeA.token);
    assert.equal(reg.status, 409);
    assert.equal(reg.body.error, "Judges can't play in this event.");
    assert.equal((await api.delete(`/events/${event.id}/judges/${judgeA.id}`, owner.token)).status, 200);
    assert.equal((await api.get(`/events/${event.id}`, judgeA.token)).body.myRole, "none");
  });

  test("a player calls a judge: staff are notified, one judge claims, re-calls wait 60s", async () => {
    const { event, match, p1 } = await runningEvent();
    const call = await api.post(`/events/${event.id}/matches/${match.id}/call-judge`, p1.token);
    assert.equal(call.status, 201, JSON.stringify(call.body));
    assert.ok((await kinds(owner.token)).includes("judge_call"));
    assert.ok((await kinds(judgeA.token)).includes("judge_call"));
    const again = await api.post(`/events/${event.id}/matches/${match.id}/call-judge`, p1.token);
    assert.equal(again.status, 429);
    assert.ok(again.body.retryAfterSeconds > 0);
    assert.equal((await api.post(`/events/${event.id}/matches/${match.id}/call-judge`, outsider.token)).status, 403);

    const callId = call.body.call.id;
    assert.equal((await api.post(`/events/${event.id}/judge-calls/${callId}/claim`, outsider.token)).status, 403);
    assert.equal((await api.post(`/events/${event.id}/judge-calls/${callId}/claim`, judgeA.token)).status, 200);
    assert.equal((await api.post(`/events/${event.id}/judge-calls/${callId}/claim`, judgeB.token)).status, 409);
    const staffView = await api.get(`/events/${event.id}`, judgeB.token);
    assert.equal(staffView.body.openJudgeCalls[0].status, "claimed");
    assert.equal((await api.post(`/events/${event.id}/judge-calls/${callId}/resolve`, judgeB.token)).status, 403);
    assert.equal((await api.post(`/events/${event.id}/judge-calls/${callId}/resolve`, judgeA.token)).status, 200);
    assert.equal((await api.get(`/events/${event.id}`, judgeA.token)).body.openJudgeCalls.length, 0);
    assert.equal((await api.get(`/events/${event.id}`, p1.token)).body.openJudgeCalls, undefined, "players don't see the queue");
  });

  test("judges can't override results", async () => {
    const { event, match } = await runningEvent();
    const r = await api.post(`/events/${event.id}/matches/${match.id}/override`, judgeA.token, { result: "player1_win" });
    assert.equal(r.status, 403);
  });

  test("no judge calls once the event is over", async () => {
    const { event, match, p1 } = await runningEvent();
    await api.post(`/events/${event.id}/cancel`, owner.token);
    assert.equal((await api.post(`/events/${event.id}/matches/${match.id}/call-judge`, p1.token)).status, 409);
  });

  test("a judge's warning is recorded and only the player (and staff) see it", async () => {
    const { event, match, p1, p2, body } = await runningEvent();
    const playerId = match.player1Id;
    const r = await api.post(`/events/${event.id}/penalties`, judgeA.token, { playerId, matchId: match.id, level: "warning", reason: "Slow play" });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.penalty.status, "recorded");
    assert.equal((await api.get(`/events/${event.id}`, p1.token)).body.penalties.length, 1);
    assert.equal((await api.get(`/events/${event.id}`, p2.token)).body.penalties.length, 0);
    assert.equal((await api.get(`/events/${event.id}`, owner.token)).body.penalties.length, 1);
    assert.equal(
      (await api.post(`/events/${event.id}/penalties`, p2.token, { playerId, level: "warning", reason: "x" })).status,
      403
    );
    assert.equal(
      (await api.post(`/events/${event.id}/penalties`, judgeA.token, { playerId, level: "warning", reason: "" })).status,
      400
    );
    void body;
  });

  test("a judge's match loss waits; the organizer confirms and the result flips", async () => {
    const { event, match } = await runningEvent();
    const r = await api.post(`/events/${event.id}/penalties`, judgeA.token, {
      playerId: match.player1Id, matchId: match.id, level: "match_loss", reason: "Marked cards",
    });
    assert.equal(r.body.penalty.status, "pending");
    let m = (await api.get(`/events/${event.id}`, owner.token)).body.currentRoundMatches.find((x) => x.id === match.id);
    assert.equal(m.result, null);
    assert.equal((await api.post(`/events/${event.id}/penalties/${r.body.penalty.id}/confirm`, judgeA.token)).status, 403);
    assert.equal((await api.post(`/events/${event.id}/penalties/${r.body.penalty.id}/confirm`, owner.token)).status, 200);
    m = (await api.get(`/events/${event.id}`, owner.token)).body.currentRoundMatches.find((x) => x.id === match.id);
    assert.equal(m.result, "player2_win");
  });

  test("match loss on an earlier round is refused; a confirmed DQ keeps them out of the next round", async () => {
    const { event, match, body } = await runningEvent();
    for (const mm of body.currentRoundMatches.filter((x) => !x.result)) {
      await api.post(`/events/${event.id}/matches/${mm.id}/override`, owner.token, { result: "player1_win" });
    }
    assert.equal((await api.post(`/events/${event.id}/advance`, owner.token)).status, 200);
    const old = await api.post(`/events/${event.id}/penalties`, owner.token, {
      playerId: match.player1Id, matchId: match.id, level: "match_loss", reason: "Late find",
    });
    assert.equal(old.status, 400);
    assert.equal(old.body.error, "Match loss only applies to the current round.");

    const dq = await api.post(`/events/${event.id}/penalties`, owner.token, {
      playerId: match.player1Id, level: "disqualification", reason: "Cheating",
    });
    assert.equal(dq.body.penalty.status, "confirmed");
    const after = (await api.get(`/events/${event.id}`, owner.token)).body;
    assert.equal(after.players.find((p) => p.id === match.player1Id).dropped, true);
    const cur = after.currentRoundMatches.find((x) => x.player1Id === match.player1Id || x.player2Id === match.player1Id);
    if (cur && cur.player2Id) {
      const lost = cur.player1Id === match.player1Id ? "player2_win" : "player1_win";
      assert.equal(cur.result, lost, "their unfinished match is a loss");
    }
  });

  test("a match-loss penalty must name a player who is in that match", async () => {
    const { event, body } = await runningEvent();
    const [m1, m2] = body.currentRoundMatches.filter((m) => m.player2Id);
    const r = await api.post(`/events/${event.id}/penalties`, owner.token, {
      playerId: m2.player1Id, matchId: m1.id, level: "match_loss", reason: "Wrong table",
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, "That player isn't in this match.");
  });

  test("confirming a match loss after the round moved on is refused", async () => {
    const { event, match, body } = await runningEvent();
    const pending = await api.post(`/events/${event.id}/penalties`, judgeA.token, {
      playerId: match.player1Id, matchId: match.id, level: "match_loss", reason: "Late",
    });
    for (const mm of body.currentRoundMatches.filter((x) => !x.result)) {
      await api.post(`/events/${event.id}/matches/${mm.id}/override`, owner.token, { result: "player1_win" });
    }
    assert.equal((await api.post(`/events/${event.id}/advance`, owner.token)).status, 200);
    const r = await api.post(`/events/${event.id}/penalties/${pending.body.penalty.id}/confirm`, owner.token);
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "That round is over - this match loss can't be applied any more.");
  });

  test("no judge calls for a match that already has its result", async () => {
    const { event, match, p1 } = await runningEvent();
    await api.post(`/events/${event.id}/matches/${match.id}/override`, owner.token, { result: "player1_win" });
    assert.equal((await api.post(`/events/${event.id}/matches/${match.id}/call-judge`, p1.token)).status, 409);
  });

  test("a disqualification before the start hands the spot on - and the new entrant is told", async () => {
    const r = await api.post("/events", owner.token, {
      shopId: shop.id, startsAt: FUTURE_START, name: "Early DQ", game: "vanguard", vanguardRegion: "th", vanguardRegulation: "d_standard",
      format: "swiss_only", maxPlayers: 4, drawRule: "double_loss",
    });
    const event = r.body.event;
    for (const p of players) await api.post(`/events/${event.id}/register`, p.token);
    await api.post(`/events/${event.id}/register`, outsider.token); // waitlist #1
    const before = (await api.get(`/events/${event.id}`, owner.token)).body;
    const target = before.players.find((p) => p.userId === players[0].id);
    const dq = await api.post(`/events/${event.id}/penalties`, owner.token, { playerId: target.id, level: "disqualification", reason: "Banned list" });
    assert.equal(dq.status, 201);
    const after = (await api.get(`/events/${event.id}`, owner.token)).body;
    assert.equal(after.players.find((p) => p.userId === outsider.id).entryStatus, "entered");
    assert.ok((await kinds(outsider.token)).includes("event_promoted"));
    const own = (await api.get(`/events/${event.id}`, players[0].token)).body.penalties;
    assert.equal(own.length, 1, "a disqualified player still sees why");
  });

  test("two quick judge calls on one match: only the first goes through", async () => {
    const { event, match, p1 } = await runningEvent();
    const [a, b] = await Promise.all([
      api.post(`/events/${event.id}/matches/${match.id}/call-judge`, p1.token),
      api.post(`/events/${event.id}/matches/${match.id}/call-judge`, p1.token),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [201, 429]);
  });
});
