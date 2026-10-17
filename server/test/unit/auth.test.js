import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "unit-test-secret";
const { isStrongPassword, hashPassword, verifyPassword, signToken, verifyToken } = await import("../../src/auth.js");

test("isStrongPassword: 8+ chars with uppercase, number and symbol", () => {
  assert.ok(isStrongPassword("Test1234!"));
  for (const weak of ["", "Tes123!", "test1234!", "TestTest!", "Test12345"]) {
    assert.ok(!isStrongPassword(weak), weak);
  }
});

test("hashPassword / verifyPassword round trip", async () => {
  const hash = await hashPassword("Test1234!");
  assert.notEqual(hash, "Test1234!");
  assert.ok(await verifyPassword("Test1234!", hash));
  assert.ok(!(await verifyPassword("Wrong1234!", hash)));
});

test("signToken / verifyToken round trip", () => {
  const token = signToken({ id: "user-1", display_name: "Nopphon" });
  const payload = verifyToken(token);
  assert.equal(payload.userId, "user-1");
  assert.equal(payload.displayName, "Nopphon");
});

test("verifyToken rejects missing, garbage, foreign-secret and expired tokens", () => {
  assert.equal(verifyToken(undefined), null);
  assert.equal(verifyToken("not-a-jwt"), null);
  assert.equal(verifyToken(jwt.sign({ sub: "x" }, "other-secret")), null);
  const expired = jwt.sign({ sub: "x", displayName: "x", exp: Math.floor(Date.now() / 1000) - 10 }, "unit-test-secret");
  assert.equal(verifyToken(expired), null);
});
