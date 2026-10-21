import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStartsAt, isPastStart, registrationOpen, upcomingWindow } from "../../src/tournament/schedule.js";

const now = new Date("2026-10-22T10:00:00.000Z");
const future = new Date(now.getTime() + 60_000);
const past = new Date(now.getTime() - 60_000);

test("parseStartsAt: ISO string -> Date, blank -> null, anything else -> invalid", () => {
  assert.equal(parseStartsAt("2026-11-01T06:00:00.000Z").toISOString(), "2026-11-01T06:00:00.000Z");
  assert.equal(parseStartsAt(""), null);
  assert.equal(parseStartsAt(null), null);
  assert.equal(parseStartsAt(undefined), null);
  assert.equal(parseStartsAt("tomorrow"), undefined);
  assert.equal(parseStartsAt(12), undefined);
});

test("parseStartsAt: only a full ISO time with a zone, a real calendar date and a sane year", () => {
  assert.equal(parseStartsAt("2026-11-01T13:00+07:00").toISOString(), "2026-11-01T06:00:00.000Z");
  assert.equal(parseStartsAt("2027"), undefined);
  assert.equal(parseStartsAt("2026-11-01T13:00"), undefined, "no zone");
  assert.equal(parseStartsAt("2026-02-30T10:00:00Z"), undefined, "no Feb 30");
  assert.equal(parseStartsAt("2028-02-29T10:00:00Z").toISOString(), "2028-02-29T10:00:00.000Z");
  assert.equal(parseStartsAt("2026-11-01T24:00:00Z"), undefined);
  assert.equal(parseStartsAt("-271821-04-20T00:00:00Z"), undefined);
  assert.equal(parseStartsAt("3100-01-01T00:00:00Z"), undefined);
});

test("isPastStart: no start time never passes; the start instant itself has passed", () => {
  assert.equal(isPastStart(null, now), false);
  assert.equal(isPastStart(now, now), true);
  assert.equal(isPastStart(new Date(now.getTime() + 1), now), false);
  assert.equal(isPastStart(now.toISOString(), now), true);
});

test("registrationOpen: registration/check-in before the start time only", () => {
  assert.equal(registrationOpen({ status: "registration", starts_at: future }, now), true);
  assert.equal(registrationOpen({ status: "check_in", starts_at: future }, now), true);
  assert.equal(registrationOpen({ status: "check_in", starts_at: past }, now), false);
  assert.equal(registrationOpen({ status: "registration", starts_at: null }, now), true);
  assert.equal(registrationOpen({ status: "swiss", starts_at: null }, now), false);
});

test("upcomingWindow: today is the Bangkok calendar day", () => {
  const late = upcomingWindow("today", new Date("2026-10-22T16:30:00Z")); // 23:30 on Oct 22 in Bangkok
  assert.equal(late.from.toISOString(), "2026-10-21T17:00:00.000Z");
  assert.equal(late.to.toISOString(), "2026-10-22T17:00:00.000Z");
  const midnight = upcomingWindow("today", new Date("2026-10-22T17:00:00Z")); // 00:00 on Oct 23
  assert.equal(midnight.from.toISOString(), "2026-10-22T17:00:00.000Z");
});

test("upcomingWindow: week spans 7 days from today; all/unknown -> no window", () => {
  const week = upcomingWindow("week", new Date("2026-10-22T05:00:00Z"));
  assert.equal(week.to - week.from, 7 * 86_400_000);
  assert.equal(week.from.toISOString(), "2026-10-21T17:00:00.000Z");
  assert.equal(upcomingWindow("all", new Date()), null);
  assert.equal(upcomingWindow("month", new Date()), null);
});
