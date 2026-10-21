// Judges, "call a judge", and penalties.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, openCheckInAndApproveAll,
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
      shopId: shop.id, name: "Judged", game: "vanguard", vanguardRegion: "th", vanguardRegulation: "d_standard",
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
      shopId: shop.id, name: "Staffing", game: "vanguard", vanguardRegion: "jp", vanguardRegulation: "premium",
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
});
