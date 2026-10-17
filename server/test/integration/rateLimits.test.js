// The one integration suite that runs with rate limits ON.
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, createUser, socketFor, joinShop } from "./helpers.js";

describe("rate limits", { skip: SKIP_REASON }, () => {
  let server;
  let api;

  before(async () => {
    await resetDatabase();
    await createUser({ email: "chatty@test.local" });
    server = await startServer({ rateLimits: true });
    api = apiFor(server);
  });
  after(() => server?.stop());

  test("chat flood: sender is told to slow down", async () => {
    // Log in before the login test below uses up this IP's budget.
    const token = await api.login("chatty@test.local");
    assert.equal((await joinShop(server, token, "default")).roomId, "default");

    const socket = await socketFor(server, token);
    await new Promise((resolve) => socket.emit("join-shop", { roomId: "default" }, resolve));
    const warned = new Promise((resolve) => socket.once("rate-limited", resolve));
    for (let i = 0; i < 9; i++) socket.emit("shop-chat", { text: `spam ${i}` });
    const { message } = await warned;
    assert.match(message, /too fast/);
    socket.close();
  });

  test("login: 10 attempts per 15 minutes per IP, then 429", async () => {
    const statuses = [];
    // One login already used above.
    for (let i = 0; i < 10; i++) {
      statuses.push((await api.post("/auth/login", null, { email: "chatty@test.local", password: "Wrong1234!" })).status);
    }
    assert.deepEqual(statuses.slice(0, 9), Array(9).fill(401));
    assert.equal(statuses[9], 429);
    const blocked = await api.post("/auth/login", null, { email: "chatty@test.local", password: "Wrong1234!" });
    assert.equal(blocked.body.code, "RATE_LIMITED");
  });
});
