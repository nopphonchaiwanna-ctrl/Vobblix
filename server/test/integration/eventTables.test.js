// Match tables in the socket layer: go-to-match, speaker vs spectator,
// the camera lock, and online tables you can join from anywhere in the shop.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, socketFor, withDb,
  openCheckInAndApproveAll, FUTURE_START,
} from "./helpers.js";

// Resolves { timedOut: true } instead of hanging if the server never acks.
const emit = (socket, event, payload) =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve({ timedOut: true }), 2000);
    socket.emit(event, payload, (r) => {
      clearTimeout(t);
      resolve(r);
    });
  });

describe("event match tables", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let owner;
  let shop;
  let event;
  const players = [];
  const sockets = [];

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    const admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    owner = await createAndLogin(api, { email: "owner@test.local", role: "shop_owner" });
    shop = await createPublishedShop(api, owner.token, admin.token, "tables");
    await withDb((db) => db.query(`UPDATE shops SET layout_template_id = 'small' WHERE id = $1`, [shop.id])); // 4 tables
    for (let i = 1; i <= 11; i++) players.push(await createAndLogin(api, { email: `t${i}@test.local`, name: `T${i}` }));
    const r = await api.post("/events", owner.token, {
      shopId: shop.id, startsAt: FUTURE_START, name: "Tables", game: "vanguard", vanguardRegion: "th", vanguardRegulation: "d_standard",
      format: "swiss_only", maxPlayers: 16, drawRule: "double_loss",
    });
    event = r.body.event;
    for (const p of players.slice(0, 10)) await api.post(`/events/${event.id}/register`, p.token);
    await openCheckInAndApproveAll(api, owner.token, event.id);
    assert.equal((await api.post(`/events/${event.id}/start`, owner.token)).status, 200);
  });
  after(() => {
    sockets.forEach((s) => s.close());
    server?.stop();
  });

  async function enterShop(token) {
    const s = await socketFor(server, token);
    sockets.push(s);
    const ack = await emit(s, "join-shop", { roomId: "tables" });
    assert.ok(!ack.error, ack.error);
    return s;
  }

  async function matchOf(userId) {
    const { body } = await api.get(`/events/${event.id}`, owner.token);
    const me = body.players.find((p) => p.userId === userId);
    return body.currentRoundMatches.find((m) => m.player1Id === me.id || m.player2Id === me.id);
  }

  test("a player goes to their in-shop table and speaks; a bystander there only watches", async () => {
    let player = null;
    for (const p of players.slice(0, 10)) {
      if ((await matchOf(p.id)).tableNumber === 1) { player = p; break; }
    }
    const ps = await enterShop(player.token);
    const go = await emit(ps, "go-to-match", { eventId: event.id });
    assert.equal(go.online, false);
    ps.emit("move", { x: go.x, y: go.y });
    await new Promise((r) => setTimeout(r, 100));
    assert.ok(!(await emit(ps, "join-table", { tableId: go.tableId }))?.error);
    const call = await emit(ps, "join-call", {});
    assert.equal(call.ok, true);
    assert.equal(call.role, "speaker");
    assert.ok(call.speakerUserIds.includes(player.id));

    const bystander = players[10];
    const bs = await enterShop(bystander.token);
    bs.emit("move", { x: go.x, y: go.y });
    await new Promise((r) => setTimeout(r, 100));
    assert.ok(!(await emit(bs, "join-table", { tableId: go.tableId }))?.error);
    const watch = await emit(bs, "join-call", {});
    assert.equal(watch.ok, true);
    assert.equal(watch.role, "spectator");
    assert.ok(watch.peers.some((p) => p.userId === player.id), "peers carry their account id for the client-side lock");
    assert.deepEqual(await emit(bs, "enable-video", {}), { ok: false, reason: "spectator" });
  });

  test("table 5 is online: its player goes straight there, and a spectator can join it from anywhere", async () => {
    let player = null;
    for (const p of players.slice(0, 10)) {
      if ((await matchOf(p.id)).tableNumber === 5) { player = p; break; }
    }
    const ps = await enterShop(player.token);
    const go = await emit(ps, "go-to-match", { eventId: event.id });
    assert.equal(go.online, true);
    assert.equal(go.tableId, `event:${event.id}:t5`);
    assert.ok(!(await emit(ps, "join-table", { tableId: go.tableId }))?.error);
    assert.equal((await emit(ps, "join-call", {})).role, "speaker");

    const viewer = await enterShop(players[10].token);
    assert.ok(!(await emit(viewer, "join-table", { tableId: go.tableId }))?.error, "no range check for online tables");
    assert.equal((await emit(viewer, "join-call", {})).role, "spectator");
  });

  test("the event view tells the client which shop to go to", async () => {
    const { body } = await api.get(`/events/${event.id}`, players[0].token);
    assert.equal(body.shopCode, "tables");
  });

  test("a judge added mid-round gets speaker rights at tables already in a call", async () => {
    let player = null;
    for (const p of players.slice(0, 10)) {
      if ((await matchOf(p.id)).tableNumber === 2) { player = p; break; }
    }
    const ps = await enterShop(player.token);
    const go = await emit(ps, "go-to-match", { eventId: event.id });
    ps.emit("move", { x: go.x, y: go.y });
    await new Promise((r) => setTimeout(r, 100));
    await emit(ps, "join-table", { tableId: go.tableId });
    await emit(ps, "join-call", {});
    const judge = players[10];
    const lock = new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), 3000);
      ps.on("table-lock", (l) => {
        if (l.tableId === go.tableId && l.speakerUserIds?.includes(judge.id)) {
          clearTimeout(t);
          resolve(l);
        }
      });
    });
    assert.equal((await api.post(`/events/${event.id}/judges`, owner.token, { userId: judge.id })).status, 200);
    assert.ok(await lock, "the table's lock now includes the new judge");
  });

  test("a disqualified player loses their voice at the table right away", async () => {
    let player = null;
    for (const p of players.slice(0, 10)) {
      if ((await matchOf(p.id)).tableNumber === 3) { player = p; break; }
    }
    const match = await matchOf(player.id);
    const opponentPlayerId = match.player1Id;
    const { body } = await api.get(`/events/${event.id}`, owner.token);
    const me = body.players.find((x) => x.userId === player.id);
    const opp = body.players.find((x) => x.id === (match.player1Id === me.id ? match.player2Id : match.player1Id));
    const oppSocket = await enterShop(players.find((p) => p.id === opp.userId).token);
    const go = await emit(oppSocket, "go-to-match", { eventId: event.id });
    oppSocket.emit("move", { x: go.x, y: go.y });
    await new Promise((r) => setTimeout(r, 100));
    await emit(oppSocket, "join-table", { tableId: go.tableId });
    await emit(oppSocket, "join-call", {});
    const lock = new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), 3000);
      oppSocket.on("table-lock", (l) => {
        if (l.tableId === go.tableId && l.speakerUserIds && !l.speakerUserIds.includes(player.id)) {
          clearTimeout(t);
          resolve(l);
        }
      });
    });
    const dq = await api.post(`/events/${event.id}/penalties`, owner.token, { playerId: me.id, level: "disqualification", reason: "Test" });
    assert.equal(dq.status, 201);
    assert.ok(await lock, "the table's speakers no longer include the disqualified player");
    void opponentPlayerId;
  });

  test("an unknown online table can't be joined", async () => {
    const s = await enterShop(players[10].token);
    const r = await emit(s, "join-table", { tableId: `event:${event.id}:t99` });
    assert.equal(r?.error, "unknown-table");
  });
});
