import { test } from "node:test";
import assert from "node:assert/strict";
import { emitWithTimeout } from "../src/scene3d/ackTimeout.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("an ack in time resolves with its payload", async () => {
  const result = await emitWithTimeout((ack) => setTimeout(() => ack({ history: [] }), 5), 50, () => assert.fail("not late"));
  assert.deepEqual(result, { timedOut: false, payload: { history: [] } });
});

test("no ack resolves as timed out", async () => {
  const result = await emitWithTimeout(() => {}, 20, () => {});
  assert.deepEqual(result, { timedOut: true, payload: undefined });
});

test("an ack after the timeout goes to onLate, not the caller", async () => {
  const late = [];
  const result = await emitWithTimeout((ack) => setTimeout(() => ack({ history: [1] }), 40), 10, (p) => late.push(p));
  assert.equal(result.timedOut, true);
  await sleep(50);
  assert.deepEqual(late, [{ history: [1] }]);
});
