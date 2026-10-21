import { test } from "node:test";
import assert from "node:assert/strict";
import { formatStartsAt, toLocalInputValue, fromLocalInputValue } from "../src/ui/events/listing.js";

test("formatStartsAt: weekday, day, month and 24h time; Date TBA without one", () => {
  assert.equal(formatStartsAt("2026-10-25T06:00:00Z", "en-GB", "Asia/Bangkok"), "Sun 25 Oct · 13:00");
  assert.equal(formatStartsAt(null), "Date TBA");
});

test("datetime-local values round-trip to the same instant", () => {
  const iso = "2026-11-01T09:30:00.000Z";
  assert.match(toLocalInputValue(iso), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.equal(fromLocalInputValue(toLocalInputValue(iso)), iso);
  assert.equal(fromLocalInputValue(""), null);
  assert.equal(toLocalInputValue(null), "");
});
