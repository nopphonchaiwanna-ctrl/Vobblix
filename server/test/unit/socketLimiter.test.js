import { test } from "node:test";
import assert from "node:assert/strict";
import { socketEventLimiter } from "../../src/middleware/rateLimit.js";

test("socketEventLimiter: allows `limit` events per window, then blocks", () => {
  const allow = socketEventLimiter({ windowMs: 60_000, limit: 3 });
  assert.deepEqual([allow(), allow(), allow(), allow(), allow()], [true, true, true, false, false]);
});

test("socketEventLimiter: a new window resets the count", async () => {
  const allow = socketEventLimiter({ windowMs: 50, limit: 1 });
  assert.equal(allow(), true);
  assert.equal(allow(), false);
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(allow(), true);
});

test("socketEventLimiter: each socket gets its own counter", () => {
  const a = socketEventLimiter({ windowMs: 60_000, limit: 1 });
  const b = socketEventLimiter({ windowMs: 60_000, limit: 1 });
  assert.equal(a(), true);
  assert.equal(a(), false);
  assert.equal(b(), true);
});
