import { test } from "node:test";
import assert from "node:assert/strict";
import { formatStartsAt, toLocalInputValue, fromLocalInputValue, entryBadge, statusBadge } from "../src/ui/events/listing.js";

test("formatStartsAt: weekday, day, month and 24h time; Date TBA without one", () => {
  assert.equal(formatStartsAt("2026-10-25T06:00:00Z", "en-GB", "Asia/Bangkok"), "Sun 25 Oct · 13:00");
  assert.equal(formatStartsAt(null), "Date TBA");
});

test("datetime-local values round-trip to the same instant", () => {
  const iso = "2026-11-10T09:30:00.000Z"; // no DST change that night anywhere common
  assert.match(toLocalInputValue(iso), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.equal(fromLocalInputValue(toLocalInputValue(iso)), iso);
  assert.equal(fromLocalInputValue(""), null);
  assert.equal(toLocalInputValue(null), "");
});

test("entryBadge: the viewer's own place in the event", () => {
  assert.equal(entryBadge({ entryStatus: "entered" }), "Registered");
  assert.equal(entryBadge({ entryStatus: "pending_draw" }), "Entered draw");
  assert.equal(entryBadge({ entryStatus: "waitlisted", waitlistPosition: 2 }), "Waitlist #2");
  assert.equal(entryBadge(null), null);
});

test("statusBadge: Open / Check-in / Live / Closed", () => {
  assert.equal(statusBadge({ status: "registration", registrationOpen: true }), "Open");
  assert.equal(statusBadge({ status: "check_in", registrationOpen: true }), "Check-in");
  assert.equal(statusBadge({ status: "swiss", registrationOpen: false }), "Live");
  assert.equal(statusBadge({ status: "bracket", registrationOpen: false }), "Live");
  assert.equal(statusBadge({ status: "check_in", registrationOpen: false }), "Closed");
});
