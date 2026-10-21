// Event day: waitlist, lottery, check-in, start roster, tables, pairing alerts.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop } from "./helpers.js";

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
});
