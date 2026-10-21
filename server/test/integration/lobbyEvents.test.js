// The lobby's upcoming-events list (lobby-events design §6.1).
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, withDb, FUTURE_START } from "./helpers.js";

describe("lobby events", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let viewer;
  let dragon; // { owner, shop }
  let cafe;
  let draft;

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    const admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    const setUp = async (email, code, name, publish = true) => {
      const owner = await createAndLogin(api, { email, role: "shop_owner" });
      let shop;
      if (publish) {
        shop = await createPublishedShop(api, owner.token, admin.token, code);
      } else {
        shop = (await api.post("/shops", owner.token, { code, name })).body.shop;
      }
      await withDb((db) => db.query("UPDATE shops SET name = $2 WHERE id = $1", [shop.id, name]));
      return { owner, shop };
    };
    dragon = await setUp("dragon@test.local", "dragonden", "Dragon Den");
    cafe = await setUp("cafe@test.local", "cafe100", "Cafe 100% Fun");
    draft = await setUp("draft@test.local", "drafty", "Drafty Shop", false);
    viewer = await createAndLogin(api, { email: "viewer@test.local" });
  });
  after(() => server?.stop());

  async function createEvent({ owner, shop }, name, fields = {}) {
    const r = await api.post("/events", owner.token, {
      shopId: shop.id, name, startsAt: FUTURE_START, game: "vanguard", vanguardRegion: "th", vanguardRegulation: "d_standard",
      format: "swiss_only", maxPlayers: 4, drawRule: "double_loss", ...fields,
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.event;
  }
  const setRow = (id, sql) => withDb((db) => db.query(`UPDATE tournament_events SET ${sql} WHERE id = $1`, [id]));
  const upcoming = async (query = "", token = viewer.token) => {
    const r = await api.get(`/events/upcoming${query}`, token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.events;
  };
  const names = (events) => events.map((e) => e.name);

  test("lists open, check-in and live events from published shops only", async () => {
    const open = await createEvent(dragon, "Vis Open");
    const checkIn = await createEvent(dragon, "Vis CheckIn");
    const live = await createEvent(cafe, "Vis Live");
    const done = await createEvent(cafe, "Vis Done");
    const cancelled = await createEvent(cafe, "Vis Cancelled");
    await createEvent(draft, "Vis Draft");
    await setRow(checkIn.id, "status = 'check_in'");
    await setRow(live.id, "status = 'swiss'");
    await setRow(done.id, "status = 'completed'");
    await setRow(cancelled.id, "status = 'cancelled'");
    const got = names(await upcoming("?q=Vis"));
    assert.deepEqual(got.sort(), [open.name, checkIn.name, live.name].sort());
  });

  test("sorts live first, then soonest start, then undated", async () => {
    const later = await createEvent(dragon, "Ord Later");
    const sooner = await createEvent(dragon, "Ord Sooner");
    const undated = await createEvent(dragon, "Ord Undated");
    const live = await createEvent(dragon, "Ord Live");
    await setRow(later.id, "starts_at = now() + interval '5 days'");
    await setRow(sooner.id, "starts_at = now() + interval '1 day'");
    await setRow(undated.id, "starts_at = NULL");
    await setRow(live.id, "status = 'bracket'");
    assert.deepEqual(names(await upcoming("?q=Ord")), ["Ord Live", "Ord Sooner", "Ord Later", "Ord Undated"]);
  });

  test("hides events left unstarted for over 24h past their start, keeps live ones", async () => {
    const stale = await createEvent(dragon, "Stale Old");
    const recent = await createEvent(dragon, "Stale Recent");
    const live = await createEvent(dragon, "Stale Live");
    await setRow(stale.id, "starts_at = now() - interval '25 hours'");
    await setRow(recent.id, "starts_at = now() - interval '2 hours'");
    await setRow(live.id, "starts_at = now() - interval '3 days', status = 'swiss'");
    const got = await upcoming("?q=Stale");
    assert.deepEqual(names(got).sort(), ["Stale Live", "Stale Recent"]);
    assert.equal(got.find((e) => e.name === "Stale Recent").registrationOpen, false);
  });

  test("q matches shop or event name, case-insensitive", async () => {
    await createEvent(cafe, "Qx Weekly");
    const byShop = await upcoming("?q=DRAGON");
    assert.ok(byShop.length > 0);
    assert.ok(byShop.every((e) => e.shop.name === "Dragon Den"));
    assert.deepEqual(names(await upcoming("?q=qx%20week")), ["Qx Weekly"]);
  });

  test("q is matched literally", async () => {
    const got = await upcoming(`?q=${encodeURIComponent("100%")}`);
    assert.ok(got.length > 0);
    assert.ok(got.every((e) => e.shop.name === "Cafe 100% Fun"));
    assert.deepEqual(await upcoming(`?q=${encodeURIComponent("_")}`), []);
    assert.deepEqual(await upcoming(`?q=${encodeURIComponent("\\")}`), []);
  });

  test("game filter", async () => {
    const all = await upcoming();
    assert.equal((await upcoming("?game=vanguard")).length, all.length);
    const r = await api.get("/events/upcoming?game=pokemon", viewer.token);
    assert.equal(r.status, 400);
    assert.equal(r.body.error, "Choose a supported game.");
  });

  test("when=today and week", async () => {
    const today = await createEvent(dragon, "When Today");
    const soon = await createEvent(dragon, "When Soon");
    const far = await createEvent(dragon, "When Far");
    const undated = await createEvent(dragon, "When Undated");
    // 00:00-ish Bangkok + 1 minute is always inside "today", whatever time the test runs.
    await setRow(today.id, "starts_at = date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok' + interval '1 minute'");
    await setRow(soon.id, "starts_at = now() + interval '3 days'");
    await setRow(far.id, "starts_at = now() + interval '10 days'");
    await setRow(undated.id, "starts_at = NULL");
    assert.deepEqual(names(await upcoming("?q=When&when=today")), ["When Today"]);
    assert.deepEqual(names(await upcoming("?q=When&when=week")), ["When Today", "When Soon"]);
    assert.deepEqual(names(await upcoming("?q=When&when=all")), ["When Today", "When Soon", "When Far", "When Undated"]);
  });

  test("carries my entry and the entered count", async () => {
    const event = await createEvent(cafe, "Mine Entry", { maxPlayers: 4 });
    const find = async () => (await upcoming("?q=Mine")).find((e) => e.id === event.id);
    assert.equal((await find()).myEntry, null);
    assert.equal((await api.post(`/events/${event.id}/register`, viewer.token)).status, 201);
    const mine = await find();
    assert.deepEqual(mine.myEntry, { entryStatus: "entered", waitlistPosition: null });
    assert.equal(mine.enteredCount, 1);
    assert.deepEqual(mine.shop, { name: "Cafe 100% Fun", code: "cafe100", logoUrl: null });
    assert.equal((await api.post(`/events/${event.id}/drop`, viewer.token)).status, 200);
    const dropped = await find();
    assert.equal(dropped.myEntry, null);
    assert.equal(dropped.enteredCount, 0);
  });

  test("a waitlisted viewer sees their position", async () => {
    const event = await createEvent(cafe, "Wait List", { maxPlayers: 4 });
    for (let i = 0; i < 4; i++) {
      const p = await createAndLogin(api, { email: `w${i}@test.local` });
      await api.post(`/events/${event.id}/register`, p.token);
    }
    await api.post(`/events/${event.id}/register`, viewer.token);
    const mine = (await upcoming("?q=Wait%20List")).find((e) => e.id === event.id);
    assert.deepEqual(mine.myEntry, { entryStatus: "waitlisted", waitlistPosition: 1 });
    assert.equal(mine.enteredCount, 4);
  });

  test("needs a login", async () => {
    assert.equal((await api.get("/events/upcoming", null)).status, 401);
  });

  test("at most 50", async () => {
    await withDb((db) =>
      db.query(
        `INSERT INTO tournament_events (shop_id, name, game, vanguard_region, vanguard_regulation, max_players, starts_at)
         SELECT $1, 'Bulk ' || g, 'vanguard', 'th', 'd_standard', 4, now() + interval '2 days'
         FROM generate_series(1, 55) g`,
        [dragon.shop.id]
      )
    );
    assert.equal((await upcoming("?q=Bulk")).length, 50);
  });
});
