// Admin account deletion (anonymize) and join-shop only entering
// existing shops.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop, socketFor, joinShop, TEST_PASSWORD,
} from "./helpers.js";

describe("account deletion + join-shop", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let admin;
  let owner;
  let buyer;
  let shop;
  let pastEvent;
  let openEvent;

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    owner = await createAndLogin(api, { email: "owner@test.local", name: "Owner", role: "shop_owner" });
    buyer = await createAndLogin(api, { email: "buyer@test.local", name: "Buyer" });
    shop = await createPublishedShop(api, owner.token, admin.token, "deltest");

    // Buyer has: an open order, a finished-ish event entry, an open registration.
    const listing = (await api.post(`/shops/${shop.id}/listings`, owner.token, { title: "Booster box", priceCents: 150000 })).body.listing;
    assert.equal((await api.post("/orders", buyer.token, { listingId: listing.id, message: "Still available?" })).status, 201);
    const ev = (fields) => api.post("/events", owner.token, { shopId: shop.id, game: "vanguard", vanguardRegion: "th", vanguardRegulation: "d_standard", format: "swiss_only", maxPlayers: 8, drawRule: "double_loss", ...fields });
    pastEvent = (await ev({ name: "Past" })).body.event;
    await api.post(`/events/${pastEvent.id}/register`, buyer.token);
    await api.post(`/events/${pastEvent.id}/register`, owner.token);
    await api.post(`/events/${pastEvent.id}/start`, owner.token);
    openEvent = (await ev({ name: "Upcoming" })).body.event;
    await api.post(`/events/${openEvent.id}/register`, buyer.token);
  });
  after(() => server?.stop());

  async function requestDeletion(user, reason = "please") {
    assert.equal((await api.post("/account/delete-request", user.token, { reason })).status, 201);
    const list = (await api.get("/admin/deletion-requests", admin.token)).body.requests;
    return list.find((r) => r.user_id === user.id);
  }

  test("join-shop: unknown codes are refused, nothing is created", async () => {
    assert.equal((await joinShop(server, buyer.token, "no-such-shop")).error, "No shop with that code - check it and try again.");
    assert.equal((await joinShop(server, buyer.token, "")).roomId, "default");
    assert.equal((await joinShop(server, buyer.token, "deltest")).roomId, "deltest");
  });

  test("admin-only endpoints", async () => {
    assert.equal((await api.get("/admin/deletion-requests", buyer.token)).status, 403);
  });

  test("decline needs a reason, notifies the user, leaves the account alone", async () => {
    const req = await requestDeletion(owner, "testing decline");
    assert.equal(req.owned_shops, 1);
    assert.equal(req.open_orders, 1);
    assert.equal((await api.post(`/admin/deletion-requests/${req.id}/decline`, admin.token, { reason: " " })).status, 400);
    const r = await api.post(`/admin/deletion-requests/${req.id}/decline`, admin.token, { reason: "Finish your open order first." });
    assert.equal(r.status, 200);
    assert.equal((await api.get("/account/delete-request/me", owner.token)).body.request.decline_reason, "Finish your open order first.");
    const note = (await api.get("/notifications", owner.token)).body.notifications.find((n) => n.kind === "account_deletion_declined");
    assert.equal(note?.target, "/settings");
    assert.equal((await api.post(`/admin/deletion-requests/${req.id}/approve`, admin.token)).status, 409, "already handled");
    assert.equal((await api.get("/auth/me", owner.token)).status, 200);
  });

  test("admin accounts can't be approved", async () => {
    const req = await requestDeletion(admin, "self");
    const r = await api.post(`/admin/deletion-requests/${req.id}/approve`, admin.token);
    assert.equal(r.status, 409);
    await api.post(`/admin/deletion-requests/${req.id}/decline`, admin.token, { reason: "cleanup" });
  });

  test("detail page shows exactly what approving touches", async () => {
    const req = await requestDeletion(buyer, "bye");
    const d = (await api.get(`/admin/deletion-requests/${req.id}`, admin.token)).body;
    assert.equal(d.user.email, "buyer@test.local");
    assert.equal(d.openOrders.length, 1);
    assert.equal(d.openOrders[0].side, "buyer");
    assert.equal(d.openOrders[0].listing_title, "Booster box");
    assert.deepEqual(d.activeEvents.map((e) => e.status).sort(), ["registration", "swiss"]);
    assert.equal((await api.get("/admin/deletion-requests/00000000-0000-0000-0000-000000000000", admin.token)).status, 404);
  });

  test("approve anonymizes, kicks live sockets, kills the token, keeps others' history", async () => {
    const live = await socketFor(server, buyer.token);
    const kicked = new Promise((resolve) => live.on("disconnect", resolve));

    const req = (await api.get("/admin/deletion-requests", admin.token)).body.requests.find((r) => r.user_id === buyer.id);
    const r = await api.post(`/admin/deletion-requests/${req.id}/approve`, admin.token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(
      { cancelledOrders: r.body.cancelledOrders, droppedRegistrations: r.body.droppedRegistrations, suspendedShops: r.body.suspendedShops },
      { cancelledOrders: 1, droppedRegistrations: 1, suspendedShops: 0 }
    );
    assert.equal(await kicked, "io server disconnect");

    assert.equal((await api.get("/auth/me", buyer.token)).status, 401);
    await assert.rejects(socketFor(server, buyer.token), /unauthorized/);
    assert.equal((await api.post("/auth/login", null, { email: "buyer@test.local", password: TEST_PASSWORD })).status, 401);
    assert.equal((await api.post("/auth/forgot-password", null, { email: "buyer@test.local" })).status, 200, "no account enumeration");

    const orders = (await api.get("/orders/mine", owner.token)).body.orders;
    assert.equal(orders[0].status, "cancelled");
    const past = (await api.get(`/events/${pastEvent.id}`, owner.token)).body;
    assert.ok(past.players.some((p) => p.displayName === "Deleted user"), "past results kept");
    const upcoming = (await api.get(`/events/${openEvent.id}`, owner.token)).body;
    assert.ok(upcoming.players.every((p) => p.dropped), "open registration dropped");
  });

  test("approving a shop owner suspends their shop", async () => {
    const req = await requestDeletion(owner, "closing");
    const r = await api.post(`/admin/deletion-requests/${req.id}/approve`, admin.token);
    assert.equal(r.body.suspendedShops, 1);
    assert.equal((await joinShop(server, admin.token, "deltest")).error, "This shop isn't open to the public yet.");
    assert.ok(!JSON.stringify((await api.get("/shops/public", admin.token)).body).includes("deltest"));
  });
});
