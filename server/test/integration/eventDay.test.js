// Event day: waitlist, lottery, check-in, start roster, tables, pairing alerts.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, socketFor, openCheckInAndApproveAll } from "./helpers.js";

describe("event day", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let owner;
  let shop;
  const players = [];

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    const admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    owner = await createAndLogin(api, { email: "owner@test.local", role: "shop_owner" });
    shop = await createPublishedShop(api, owner.token, admin.token, "eventday");
    for (let i = 1; i <= 8; i++) players.push(await createAndLogin(api, { email: `d${i}@test.local`, name: `Duelist ${i}` }));
  });
  after(() => server?.stop());

  async function createEvent(fields = {}) {
    const r = await api.post("/events", owner.token, {
      shopId: shop.id, name: "Day", game: "vanguard", vanguardRegion: "th", vanguardRegulation: "d_standard",
      format: "swiss_only", maxPlayers: 4, drawRule: "double_loss", ...fields,
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.event;
  }
  const playerRow = async (eventId, userId) =>
    (await api.get(`/events/${eventId}`, owner.token)).body.players.find((p) => p.userId === userId);
  const kinds = async (token) => (await api.get("/notifications", token)).body.notifications.map((n) => n.kind);

  test("first come: the 5th is waitlisted, and moves up when someone drops", async () => {
    const event = await createEvent();
    for (const p of players.slice(0, 4)) {
      const r = await api.post(`/events/${event.id}/register`, p.token);
      assert.equal(r.status, 201);
      assert.equal(r.body.player.entryStatus, "entered");
    }
    const fifth = await api.post(`/events/${event.id}/register`, players[4].token);
    assert.equal(fifth.status, 201);
    assert.equal(fifth.body.player.entryStatus, "waitlisted");
    assert.equal(fifth.body.player.waitlistPosition, 1);
    assert.equal((await api.post(`/events/${event.id}/drop`, players[0].token)).status, 200);
    assert.equal((await playerRow(event.id, players[4].id)).entryStatus, "entered");
    assert.ok((await kinds(players[4].token)).includes("event_promoted"));
  });

  test("lottery: everyone waits for the draw, 4 get in, 2 queue, the draw runs once", async () => {
    const event = await createEvent({ registrationMode: "lottery" });
    for (const p of players.slice(0, 6)) {
      const r = await api.post(`/events/${event.id}/register`, p.token);
      assert.equal(r.body.player.entryStatus, "pending_draw");
    }
    assert.equal((await api.post(`/events/${event.id}/draw`, players[0].token)).status, 403);
    const draw = await api.post(`/events/${event.id}/draw`, owner.token);
    assert.equal(draw.status, 200, JSON.stringify(draw.body));
    assert.equal(draw.body.entered.length, 4);
    assert.equal(draw.body.waitlisted.length, 2);
    const again = await api.post(`/events/${event.id}/draw`, owner.token);
    assert.equal(again.status, 409);
    assert.equal(again.body.error, "The draw has already been made.");
    const late = await api.post(`/events/${event.id}/register`, players[6].token);
    assert.equal(late.body.player.entryStatus, "waitlisted");
    assert.equal(late.body.player.waitlistPosition, 3);
    const won = players.slice(0, 6).filter((p) => draw.body.entered.includes(p.id));
    assert.ok((await kinds(won[0].token)).includes("event_lottery_won"));
  });

  test("draw on a first-come event is refused", async () => {
    const event = await createEvent();
    assert.equal((await api.post(`/events/${event.id}/draw`, owner.token)).status, 400);
  });

  async function registerAll(eventId, list) {
    for (const p of list) assert.equal((await api.post(`/events/${eventId}/register`, p.token)).status, 201);
  }

  test("start needs check-in, and pairs only approved players", async () => {
    const event = await createEvent();
    await registerAll(event.id, players.slice(0, 4));
    const early = await api.post(`/events/${event.id}/start`, owner.token);
    assert.equal(early.status, 409);
    assert.equal(early.body.error, "Open check-in first.");
    assert.equal((await api.post(`/events/${event.id}/check-in/open`, owner.token)).status, 200);
    assert.equal((await api.post(`/events/${event.id}/check-in`, players[0].token)).status, 200);
    assert.ok((await playerRow(event.id, players[0].id)).checkInRequestedAt);
    for (const p of players.slice(0, 3)) {
      const row = await playerRow(event.id, p.id);
      assert.equal((await api.post(`/events/${event.id}/check-in/approve`, owner.token, { playerId: row.id })).status, 200);
    }
    const start = await api.post(`/events/${event.id}/start`, owner.token);
    assert.equal(start.status, 200, JSON.stringify(start.body));
    const { body } = await api.get(`/events/${event.id}`, owner.token);
    const paired = new Set(body.currentRoundMatches.flatMap((m) => [m.player1Id, m.player2Id]).filter(Boolean));
    const noShow = body.players.find((p) => p.userId === players[3].id);
    assert.equal(noShow.noShow, true);
    assert.ok(!paired.has(noShow.id));
    assert.equal(paired.size, 3);
  });

  test("a no-show's spot goes to an approved waitlister", async () => {
    const event = await createEvent();
    await registerAll(event.id, players.slice(0, 5)); // 5th is waitlisted
    await api.post(`/events/${event.id}/check-in/open`, owner.token);
    const { body } = await api.get(`/events/${event.id}`, owner.token);
    for (const p of body.players.filter((x) => x.userId !== players[0].id)) {
      await api.post(`/events/${event.id}/check-in/approve`, owner.token, { playerId: p.id });
    }
    assert.equal((await api.post(`/events/${event.id}/start`, owner.token)).status, 200);
    const after = (await api.get(`/events/${event.id}`, owner.token)).body;
    const paired = new Set(after.currentRoundMatches.flatMap((m) => [m.player1Id, m.player2Id]).filter(Boolean));
    assert.ok(paired.has(after.players.find((p) => p.userId === players[4].id).id), "the waitlister plays");
    assert.ok(!paired.has(after.players.find((p) => p.userId === players[0].id).id), "the no-show doesn't");
  });

  test("open check-in on a lottery waits for the draw; newcomers then join the waitlist", async () => {
    const event = await createEvent({ registrationMode: "lottery" });
    await registerAll(event.id, players.slice(0, 2));
    const r = await api.post(`/events/${event.id}/check-in/open`, owner.token);
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "Run the draw before opening check-in.");
    await api.post(`/events/${event.id}/draw`, owner.token);
    assert.equal((await api.post(`/events/${event.id}/check-in/open`, owner.token)).status, 200);
    const late = await api.post(`/events/${event.id}/register`, players[5].token);
    assert.equal(late.body.player.entryStatus, "waitlisted");
  });

  test("auto check-in approves exactly the players standing in the shop", async () => {
    const event = await createEvent();
    await registerAll(event.id, players.slice(0, 3));
    await api.post(`/events/${event.id}/check-in/open`, owner.token);
    const inShop = await socketFor(server, players[1].token);
    try {
      await new Promise((resolve) => inShop.emit("join-shop", { roomId: "eventday" }, resolve));
      const staffView = (await api.get(`/events/${event.id}`, owner.token)).body;
      assert.deepEqual(staffView.inShopUserIds, [players[1].id], "the organizer sees who's in the shop");
      assert.equal((await api.get(`/events/${event.id}`, players[0].token)).body.inShopUserIds, undefined);
      const r = await api.post(`/events/${event.id}/check-in/auto`, owner.token);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.approved, 1);
      assert.ok((await playerRow(event.id, players[1].id)).checkedInAt);
      assert.equal((await playerRow(event.id, players[0].id)).checkedInAt, null);
    } finally {
      inShop.close();
    }
  });

  test("start twice -> one round 1", async () => {
    const event = await createEvent();
    await registerAll(event.id, players.slice(0, 4));
    await openCheckInAndApproveAll(api, owner.token, event.id);
    const [a, b] = await Promise.all([
      api.post(`/events/${event.id}/start`, owner.token),
      api.post(`/events/${event.id}/start`, owner.token),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    const { body } = await api.get(`/events/${event.id}`, owner.token);
    assert.equal(body.currentRoundMatches.length, 2);
  });

  test("round 1 gets table numbers 1..n on the shop's tables", async () => {
    const event = await createEvent({ maxPlayers: 8 });
    await registerAll(event.id, players.slice(0, 8));
    await openCheckInAndApproveAll(api, owner.token, event.id);
    assert.equal((await api.post(`/events/${event.id}/start`, owner.token)).status, 200);
    const { body } = await api.get(`/events/${event.id}`, owner.token);
    const numbers = body.currentRoundMatches.map((m) => m.tableNumber).sort((a, b) => a - b);
    assert.deepEqual(numbers, [1, 2, 3, 4]);
    assert.ok(body.currentRoundMatches.every((m) => m.tableOnline === false));
  });

  test("alert consent is stored per event; pairing alerts reach every player with their own table", async () => {
    const event = await createEvent({ maxPlayers: 4 });
    await registerAll(event.id, players.slice(0, 4));
    const key = await api.get("/notifications/push-key", players[0].token);
    assert.equal(key.status, 200);
    assert.equal(key.body.publicKey, null, "no VAPID keys in tests");
    assert.equal((await api.put(`/events/${event.id}/push-consent`, players[0].token, { granted: true })).status, 200);
    assert.equal((await api.get(`/events/${event.id}`, players[0].token)).body.myPushConsent, true);
    assert.equal((await api.get(`/events/${event.id}`, players[1].token)).body.myPushConsent, null);
    const sub = await api.post("/notifications/push-subscriptions", players[0].token, {
      endpoint: "https://push.example/abc", keys: { p256dh: "BKey", auth: "auth" },
    });
    assert.equal(sub.status, 200);

    await openCheckInAndApproveAll(api, owner.token, event.id);
    await api.post(`/events/${event.id}/start`, owner.token);
    assert.equal((await api.post(`/events/${event.id}/notify-pairings`, players[0].token)).status, 403);
    const sent = await api.post(`/events/${event.id}/notify-pairings`, owner.token);
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    assert.equal(sent.body.sent, 4);
    const { body } = await api.get(`/events/${event.id}`, owner.token);
    for (const p of players.slice(0, 4)) {
      const me = body.players.find((x) => x.userId === p.id);
      const match = body.currentRoundMatches.find((m) => m.player1Id === me.id || m.player2Id === me.id);
      const opp = body.players.find((x) => x.id === (match.player1Id === me.id ? match.player2Id : match.player1Id));
      const notes = (await api.get("/notifications", p.token)).body.notifications.filter((n) => n.kind === "event_pairing");
      assert.equal(notes.length, 1);
      assert.equal(notes[0].message, `Round 1: Table ${match.tableNumber} vs ${opp.displayName}`);
    }
  });
});
