// Event edit / cancel and the status guards on every event action.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop } from "./helpers.js";

describe("event edit + cancel", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let owner;
  let player;
  let shop;
  const base = { name: "Friday Swiss", game: "vanguard", vanguardRegion: "th", vanguardRegulation: "d_standard", format: "swiss_only", maxPlayers: 4, drawRule: "double_loss", roundTimeLimitMinutes: 50 };

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    const admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    owner = await createAndLogin(api, { email: "owner@test.local", role: "shop_owner" });
    player = await createAndLogin(api, { email: "player@test.local", name: "Player" });
    shop = await createPublishedShop(api, owner.token, admin.token, "events");
  });
  after(() => server?.stop());

  async function newEvent(fields = {}) {
    const r = await api.post("/events", owner.token, { shopId: shop.id, ...base, ...fields });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.event;
  }

  test("create validates settings", async () => {
    assert.equal((await api.post("/events", owner.token, { shopId: shop.id, ...base, roundTimeLimitMinutes: 9999 })).status, 400);
    assert.equal((await api.post("/events", owner.token, { shopId: shop.id, ...base, maxPlayers: 7 })).status, 400);
    assert.equal((await api.post("/events", owner.token, { shopId: shop.id, ...base, game: "pokemon" })).status, 400);
    assert.equal((await api.post("/events", player.token, { shopId: shop.id, ...base })).status, 403);
  });

  test("Vanguard events need TH/JP and a regulation", async () => {
    const r = await api.post("/events", owner.token, { shopId: shop.id, ...base, vanguardRegion: undefined });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, "Choose TH or JP for a Vanguard event.");
    const r2 = await api.post("/events", owner.token, { shopId: shop.id, ...base, vanguardRegulation: "classic" });
    assert.equal(r2.status, 400);
    assert.equal(r2.body.error, "Choose Premium or D-Standard for a Vanguard event.");
  });

  test("format fields and registration mode round-trip", async () => {
    const event = await newEvent({ vanguardRegion: "jp", vanguardRegulation: "premium" });
    assert.equal(event.vanguardRegion, "jp");
    assert.equal(event.vanguardRegulation, "premium");
    assert.equal(event.registrationMode, "first_come");
    const r = await api.patch(`/events/${event.id}`, owner.token, { ...base, registrationMode: "lottery" });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.event.registrationMode, "lottery");
    assert.equal(r.body.event.vanguardRegion, "th");
    const bad = await api.patch(`/events/${event.id}`, owner.token, { ...base, registrationMode: "auction" });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error, "Choose how players get in: first come or lottery.");
  });

  test("while registering, every setting can be edited", async () => {
    const event = await newEvent();
    const r = await api.patch(`/events/${event.id}`, owner.token, {
      ...base, name: "Friday Swiss + Cut", format: "swiss_cut", configuredCutSize: 4, maxPlayers: 8, roundTimeLimitMinutes: null,
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.event.format, "swiss_cut");
    assert.equal(r.body.event.maxPlayers, 8);
    assert.equal(r.body.event.roundTimeLimitMinutes, null);
    assert.equal((await api.patch(`/events/${event.id}`, player.token, base)).status, 403);
    assert.equal((await api.patch(`/events/${event.id}`, owner.token, { ...base, name: "  " })).status, 400);
  });

  test("advance before start is refused (used to complete the event)", async () => {
    const event = await newEvent();
    assert.equal((await api.post(`/events/${event.id}/advance`, owner.token)).status, 409);
    assert.equal((await api.get(`/events/${event.id}`, player.token)).body.event.status, "registration");
  });

  test("once running, only name and round time limit change", async () => {
    const event = await newEvent({ maxPlayers: 8 });
    await api.post(`/events/${event.id}/register`, player.token);
    await api.post(`/events/${event.id}/register`, owner.token);
    assert.equal((await api.post(`/events/${event.id}/start`, owner.token)).status, 200);
    const r = await api.patch(`/events/${event.id}`, owner.token, { name: "Renamed", roundTimeLimitMinutes: 30, format: "swiss_cut", maxPlayers: 64 });
    assert.equal(r.status, 200);
    assert.equal(r.body.event.name, "Renamed");
    assert.equal(r.body.event.roundTimeLimitMinutes, 30);
    assert.equal(r.body.event.format, "swiss_only");
    assert.equal(r.body.event.maxPlayers, 8);
  });

  test("cancel notifies active players (not the organizer), then everything is closed", async () => {
    const event = await newEvent({ maxPlayers: 8 });
    await api.post(`/events/${event.id}/register`, player.token);
    await api.post(`/events/${event.id}/register`, owner.token);
    await api.post(`/events/${event.id}/start`, owner.token);

    assert.equal((await api.post(`/events/${event.id}/cancel`, player.token)).status, 403);
    const r = await api.post(`/events/${event.id}/cancel`, owner.token);
    assert.equal(r.status, 200);
    assert.equal(r.body.event.status, "cancelled");
    assert.equal(r.body.notified, 1);

    const note = (await api.get("/notifications", player.token)).body.notifications.find((n) => n.kind === "event_cancelled");
    assert.equal(note?.target, `/events/${event.id}`);
    assert.ok(!(await api.get("/notifications", owner.token)).body.notifications.some((n) => n.kind === "event_cancelled"));

    const match = (await api.get(`/events/${event.id}`, player.token)).body.currentRoundMatches[0];
    for (const [label, res] of [
      ["cancel twice", await api.post(`/events/${event.id}/cancel`, owner.token)],
      ["edit", await api.patch(`/events/${event.id}`, owner.token, base)],
      ["advance", await api.post(`/events/${event.id}/advance`, owner.token)],
      ["register", await api.post(`/events/${event.id}/register`, player.token)],
      ["drop", await api.post(`/events/${event.id}/drop`, player.token)],
      ["report", await api.post(`/events/${event.id}/matches/${match.id}/report`, player.token, { claim: "player1_win" })],
      ["override", await api.post(`/events/${event.id}/matches/${match.id}/override`, owner.token, { result: "player1_win" })],
    ]) {
      assert.equal(res.status, 409, `${label} after cancel`);
    }
  });
});
