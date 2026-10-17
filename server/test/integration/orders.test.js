// Marketplace order threads: who may move an order to which status.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createAndLogin, createPublishedShop } from "./helpers.js";

describe("orders", { skip: SKIP_REASON }, () => {
  let server;
  let api;
  let seller;
  let buyer;
  let stranger;
  let listing;

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
    const admin = await createAndLogin(api, { email: "admin@test.local", role: "admin" });
    seller = await createAndLogin(api, { email: "seller@test.local", role: "shop_owner" });
    buyer = await createAndLogin(api, { email: "buyer@test.local" });
    stranger = await createAndLogin(api, { email: "stranger@test.local" });
    const shop = await createPublishedShop(api, seller.token, admin.token, "market");
    listing = (await api.post(`/shops/${shop.id}/listings`, seller.token, { title: "Sleeves", priceCents: 25000 })).body.listing;
  });
  after(() => server?.stop());

  async function newOrder() {
    const r = await api.post("/orders", buyer.token, { listingId: listing.id, message: "Hi" });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.order;
  }
  const setStatus = (order, user, status) => api.post(`/orders/${order.id}/status`, user.token, { status });

  test("seller confirms then completes; completed is final", async () => {
    const order = await newOrder();
    assert.equal((await setStatus(order, buyer, "confirmed")).status, 400, "buyer can't confirm");
    assert.equal((await setStatus(order, seller, "completed")).status, 400, "can't skip confirmed");
    assert.equal((await setStatus(order, seller, "confirmed")).body.order.status, "confirmed");
    assert.equal((await setStatus(order, seller, "completed")).body.order.status, "completed");
    assert.equal((await setStatus(order, buyer, "cancelled")).status, 400, "completed is final");
  });

  test("either side can cancel before completion", async () => {
    const a = await newOrder();
    assert.equal((await setStatus(a, buyer, "cancelled")).body.order.status, "cancelled");
    const b = await newOrder();
    await setStatus(b, seller, "confirmed");
    assert.equal((await setStatus(b, seller, "cancelled")).body.order.status, "cancelled");
  });

  test("thread messages and visibility", async () => {
    const order = await newOrder();
    assert.equal((await api.post(`/orders/${order.id}/messages`, seller.token, { text: "Yes, still here" })).status, 201);
    const thread = (await api.get(`/orders/${order.id}`, buyer.token)).body;
    assert.deepEqual(thread.messages.map((m) => m.text), ["Hi", "Yes, still here"]);
    assert.equal((await api.get(`/orders/${order.id}`, stranger.token)).status, 404, "outsiders can't read it");
    assert.equal((await setStatus(order, stranger, "cancelled")).status, 404);
  });

  test("can't order from yourself", async () => {
    const r = await api.post("/orders", seller.token, { listingId: listing.id, message: "me" });
    assert.ok(r.status >= 400 && r.status < 500, String(r.status));
  });
});
