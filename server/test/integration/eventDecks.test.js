// Deck submission for JP D-Standard events (deck-stats design §4-§6).
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, withDb, openCheckInAndApproveAll, FUTURE_START } from "./helpers.js";

describe("event decks", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let owner;
  let shop;

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    const admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    owner = await createAndLogin(api, { email: "owner@test.local", role: "shop_owner" });
    shop = await createPublishedShop(api, owner.token, admin.token, "deckshop");
  });
  after(() => server?.stop());

  async function createEvent(fields = {}) {
    const r = await api.post("/events", owner.token, {
      shopId: shop.id, name: "Deck Cup", startsAt: FUTURE_START, game: "vanguard", vanguardRegion: "jp", vanguardRegulation: "d_standard",
      format: "swiss_only", maxPlayers: 8, drawRule: "double_loss", ...fields,
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.event;
  }
  const settings = (e, extra = {}) => ({
    name: e.name, game: e.game, format: e.format, drawRule: e.drawRule, maxPlayers: e.maxPlayers,
    registrationMode: e.registrationMode, vanguardRegion: e.vanguardRegion, vanguardRegulation: e.vanguardRegulation, ...extra,
  });

  test("deck submission is set on create and edit for JP D-Standard only", async () => {
    const jp = await createEvent({ deckSubmission: "required" });
    assert.equal(jp.deckSubmission, "required");
    const th = await createEvent({ vanguardRegion: "th", deckSubmission: "required" });
    assert.equal(th.deckSubmission, "off");
    let r = await api.patch(`/events/${jp.id}`, owner.token, settings(jp));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.event.deckSubmission, "required", "left out keeps the current value");
    r = await api.patch(`/events/${jp.id}`, owner.token, settings(jp, { vanguardRegion: "th" }));
    assert.equal(r.body.event.deckSubmission, "off");
  });

  test("can't change deck submission after check-in opens", async () => {
    const e = await createEvent({ deckSubmission: "optional" });
    await openCheckInAndApproveAll(api, owner.token, e.id);
    const r = await api.patch(`/events/${e.id}`, owner.token, { name: e.name, deckSubmission: "off" });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.event.deckSubmission, "optional");
  });
});
