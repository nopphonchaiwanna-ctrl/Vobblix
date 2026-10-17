import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SKIP_REASON, resetDatabase, startServer, apiFor, TEST_PASSWORD } from "./helpers.js";

describe("auth + HTTP error handling", { skip: SKIP_REASON }, () => {
  let server;
  let api;

  before(async () => {
    await resetDatabase();
    server = await startServer();
    api = apiFor(server);
  });
  after(() => server?.stop());

  test("register -> verify email -> login -> /auth/me", async () => {
    const email = "newplayer@test.local";
    const reg = await api.post("/auth/register", null, { email, password: TEST_PASSWORD, displayName: "New Player" });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));

    const early = await api.post("/auth/login", null, { email, password: TEST_PASSWORD });
    assert.equal(early.status, 403);
    assert.equal(early.body.code, "EMAIL_NOT_VERIFIED");

    // SMTP is off in tests, so the email (and its link) lands in the server log.
    const [, token] = await server.waitForLog(/verify-email\?token=([A-Za-z0-9_-]+)/);
    const verified = await api.post("/auth/verify-email", null, { token });
    assert.equal(verified.status, 200, JSON.stringify(verified.body));

    const token2 = await api.login(email);
    const me = await api.get("/auth/me", token2);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.displayName, "New Player");
  });

  test("register rejects weak passwords and duplicate emails", async () => {
    const weak = await api.post("/auth/register", null, { email: "weak@test.local", password: "password", displayName: "W" });
    assert.equal(weak.status, 400);
    const dup = await api.post("/auth/register", null, { email: "newplayer@test.local", password: TEST_PASSWORD, displayName: "Dup" });
    assert.equal(dup.status, 409);
  });

  test("wrong password and unknown email look the same", async () => {
    const wrong = await api.post("/auth/login", null, { email: "newplayer@test.local", password: "Wrong1234!" });
    const unknown = await api.post("/auth/login", null, { email: "nobody@test.local", password: TEST_PASSWORD });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.error, unknown.body.error);
  });

  test("protected routes need a valid token", async () => {
    assert.equal((await api.get("/auth/me")).status, 401);
    assert.equal((await api.get("/auth/me", "garbage")).status, 401);
    assert.equal((await api.get("/decks")).status, 401);
  });

  test("errors come back as JSON", async () => {
    const notFound = await api.get("/no-such-route");
    assert.equal(notFound.status, 404);
    assert.equal(notFound.body.error, "Not found.");

    const badJson = await api.post("/auth/login", null, "{not json");
    assert.equal(badJson.status, 400);
    assert.equal(badJson.body.error, "Malformed JSON body.");

    const token = await api.login("newplayer@test.local");
    const badId = await api.get("/decks/not-a-uuid", token);
    assert.equal(badId.status, 404);
  });

  test("security headers are set", async () => {
    const res = await fetch(`${server.url}/health`);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.ok(res.headers.get("strict-transport-security"));
  });
});
