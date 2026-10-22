// Deck submission for JP D-Standard events (deck-stats design §4-§6).
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, withDb, openCheckInAndApproveAll, socketFor, FUTURE_START } from "./helpers.js";

describe("event decks", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let owner;
  let shop;
  let n = 0;
  const newPlayer = async (name) => createAndLogin(api, { email: `p${++n}@test.local`, name: name ?? `Player ${n}` });

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

  async function seedCard(cardNumber, name, grade) {
    await withDb((db) => db.query(
      `INSERT INTO cards (card_number, set_code, name, grade, image_url) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [cardNumber, cardNumber.split("/")[0], name, grade, `https://img.test/${cardNumber}.png`]
    ));
  }
  async function seedDeck(userId, { ride = [], main = [] }, title = "My Deck") {
    return withDb(async (db) => {
      const deck = (await db.query(
        `INSERT INTO decks (user_id, title, source_locale, decklog_code, nation) VALUES ($1, $2, 'decklog_jp', 'CODE1', 'N') RETURNING id`,
        [userId, title]
      )).rows[0];
      for (const [zone, list] of [["ride", ride], ["main", main]]) {
        for (const cn of list) {
          await db.query(
            `INSERT INTO deck_cards (deck_id, card_number, decklog_card_number, zone, quantity) VALUES ($1, $2, $2, $3, 1)`,
            [deck.id, cn, zone]
          );
        }
      }
      return deck.id;
    });
  }
  async function registeredEvent(deckSubmission, players) {
    const e = await createEvent({ deckSubmission });
    for (const p of players) assert.equal((await api.post(`/events/${e.id}/register`, p.token)).status, 201);
    return e;
  }
  const submit = (e, p, body) => api.put(`/events/${e.id}/deck`, p.token, body);
  const myDeck = async (e, p) => (await api.get(`/events/${e.id}`, p.token)).body.myDeck;

  before(async () => {
    await seedCard("DZ-BT01/001", "Blaster Blade Exceed", 3);
    await seedCard("DZ-BT01/002", "Blaster Blade Exceed", 3); // reprint
    await seedCard("DZ-BT02/001", "Dragonic Overlord", 3);
    await seedCard("DZ-BT01/050", "Starter", 0);
  });

  test("submit, replace and withdraw a deck", async () => {
    const p = await newPlayer();
    const e = await registeredEvent("optional", [p]);
    const d1 = await seedDeck(p.id, { ride: ["DZ-BT01/050", "DZ-BT01/001"], main: ["DZ-BT01/050"] });
    let r = await submit(e, p, { deckId: d1 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.myDeck.g3[0].name, "Blaster Blade Exceed");
    assert.equal((await myDeck(e, p)).g3[0].name, "Blaster Blade Exceed");
    const d2 = await seedDeck(p.id, { ride: ["DZ-BT02/001"] }, "Second");
    r = await submit(e, p, { deckId: d2 });
    assert.equal(r.body.myDeck.title, "Second");
    assert.equal(r.body.myDeck.g3[0].name, "Dragonic Overlord");
    assert.equal((await api.delete(`/events/${e.id}/deck`, p.token)).status, 204);
    assert.equal(await myDeck(e, p), null);
  });

  test("the event keeps its own copy", async () => {
    const p = await newPlayer();
    const e = await registeredEvent("optional", [p]);
    const d = await seedDeck(p.id, { ride: ["DZ-BT01/001"] });
    await submit(e, p, { deckId: d });
    await withDb((db) => db.query("UPDATE deck_cards SET card_number = 'DZ-BT02/001' WHERE deck_id = $1", [d]));
    await api.delete(`/decks/${d}`, p.token);
    const mine = await myDeck(e, p);
    assert.equal(mine.g3[0].name, "Blaster Blade Exceed");
    assert.equal(mine.cards.length, 1);
  });

  test("an empty ride deck is rejected", async () => {
    const p = await newPlayer();
    const e = await registeredEvent("optional", [p]);
    const d = await seedDeck(p.id, { main: ["DZ-BT01/001"] });
    const r = await submit(e, p, { deckId: d });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, "This deck has no ride deck - submit a D Standard deck.");
  });

  test("a G3 missing from the catalog is accepted as Unknown", async () => {
    const p = await newPlayer();
    const e = await registeredEvent("optional", [p]);
    const d = await seedDeck(p.id, { ride: ["DZ-BT99/001"] });
    const r = await submit(e, p, { deckId: d });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.myDeck.g3, []);
  });

  test("someone else's deck can't be submitted", async () => {
    const p = await newPlayer();
    const other = await newPlayer();
    const e = await registeredEvent("optional", [p]);
    const d = await seedDeck(other.id, { ride: ["DZ-BT01/001"] });
    assert.equal((await submit(e, p, { deckId: d })).status, 404);
  });

  test("decks lock when the event starts", async () => {
    const [p, q] = [await newPlayer(), await newPlayer()];
    const e = await registeredEvent("optional", [p, q]);
    const d = await seedDeck(p.id, { ride: ["DZ-BT01/001"] });
    await openCheckInAndApproveAll(api, owner.token, e.id);
    assert.equal((await submit(e, p, { deckId: d })).status, 200, "still open during check-in");
    assert.equal((await api.post(`/events/${e.id}/start`, owner.token)).status, 200);
    const r = await submit(e, p, { deckId: d });
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "Decks can't change once the event has started.");
    assert.equal((await api.delete(`/events/${e.id}/deck`, p.token)).status, 409);
  });

  test("events that don't take decks refuse", async () => {
    const p = await newPlayer();
    const e = await registeredEvent("off", [p]);
    const d = await seedDeck(p.id, { ride: ["DZ-BT01/001"] });
    const r = await submit(e, p, { deckId: d });
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "This event doesn't take decks.");
  });

  test("players never see other decks", async () => {
    const [a, b, judge] = [await newPlayer("Alice"), await newPlayer("Bob"), await newPlayer("Judy")];
    const e = await registeredEvent("optional", [a, b]);
    assert.equal((await api.post(`/events/${e.id}/judges`, owner.token, { userId: judge.id })).status, 200);
    await submit(e, a, { deckId: await seedDeck(a.id, { ride: ["DZ-BT01/001"] }) });
    const bView = (await api.get(`/events/${e.id}`, b.token)).body;
    for (const pl of bView.players) {
      assert.equal(pl.deckG3, undefined);
      assert.equal(pl.deckSubmitted, undefined);
    }
    assert.equal(bView.myDeck, null);
    const aRow = bView.players.find((x) => x.userId === a.id);
    assert.equal((await api.get(`/events/${e.id}/decks/${aRow.id}`, b.token)).status, 403);
    const staffView = (await api.get(`/events/${e.id}`, owner.token)).body;
    const aStaff = staffView.players.find((x) => x.userId === a.id);
    assert.equal(aStaff.deckSubmitted, true);
    assert.equal(aStaff.deckG3, "Blaster Blade Exceed");
    assert.equal(staffView.players.find((x) => x.userId === b.id).deckSubmitted, false);
    for (const t of [owner.token, judge.token]) {
      const r = await api.get(`/events/${e.id}/decks/${aRow.id}`, t);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.playerName, "Alice");
      assert.equal(r.body.deck.cards.length, 1);
    }
  });

  test("required: check-in, approve and auto check-in need a deck", async () => {
    const [a, b] = [await newPlayer("Has Deck"), await newPlayer("No Deck")];
    const e = await registeredEvent("required", [a, b]);
    await submit(e, a, { deckId: await seedDeck(a.id, { ride: ["DZ-BT01/001"] }) });
    assert.equal((await api.post(`/events/${e.id}/check-in/open`, owner.token)).status, 200);
    let r = await api.post(`/events/${e.id}/check-in`, b.token);
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "Submit your deck before checking in.");
    const bRow = (await api.get(`/events/${e.id}`, owner.token)).body.players.find((x) => x.userId === b.id);
    r = await api.post(`/events/${e.id}/check-in/approve`, owner.token, { playerId: bRow.id });
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "This player hasn't submitted a deck.");
    const sockets = [await socketFor(server, a.token), await socketFor(server, b.token)];
    try {
      for (const s of sockets) await new Promise((resolve) => s.emit("join-shop", { roomId: "deckshop" }, resolve));
      r = await api.post(`/events/${e.id}/check-in/auto`, owner.token);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.deepEqual(r.body, { approved: 1, skippedNoDeck: ["No Deck"] });
    } finally {
      for (const s of sockets) s.close();
    }
  });

  test("optional: withdraw allowed, check-in without a deck allowed", async () => {
    const p = await newPlayer();
    const e = await registeredEvent("optional", [p]);
    await api.post(`/events/${e.id}/check-in/open`, owner.token);
    assert.equal((await api.post(`/events/${e.id}/check-in`, p.token)).status, 200);
  });

  test("required: withdrawing is refused", async () => {
    const p = await newPlayer();
    const e = await registeredEvent("required", [p]);
    await submit(e, p, { deckId: await seedDeck(p.id, { ride: ["DZ-BT01/001"] }) });
    const r = await api.delete(`/events/${e.id}/deck`, p.token);
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "A deck is required for this event.");
  });
});
