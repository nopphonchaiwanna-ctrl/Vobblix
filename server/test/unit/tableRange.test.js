import { test } from "node:test";
import assert from "node:assert/strict";
import { isWithinTableRange, RANGE_SLACK } from "../../src/tableRange.js";

const table = { x: 500, y: 500, radius: 95 };

test("standing on the table center is in range", () => {
  assert.equal(isWithinTableRange({ x: 500, y: 500 }, table), true);
});

test("radius plus slack is still in range", () => {
  assert.equal(RANGE_SLACK, 48);
  assert.equal(isWithinTableRange({ x: 500 + 95 + 48, y: 500 }, table), true);
});

test("one pixel past radius plus slack is out of range", () => {
  assert.equal(isWithinTableRange({ x: 500 + 95 + 49, y: 500 }, table), false);
});

test("a player with no known position is out of range", () => {
  assert.equal(isWithinTableRange({}, table), false);
});
