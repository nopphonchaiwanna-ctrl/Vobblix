// An event's start time (lobby-events design §4): registration closes
// once it passes, but the status never changes on its own - the
// organizer still opens check-in and starts the event.

const OPEN_STATUSES = ["registration", "check_in"];

/** null = not given, undefined = invalid, otherwise a Date. Only strings count. */
export function parseStartsAt(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function isPastStart(startsAt, now) {
  if (!startsAt) return false;
  return now.getTime() >= new Date(startsAt).getTime();
}

/** Can someone new still sign up (or join the waitlist)? */
export function registrationOpen(event, now) {
  return OPEN_STATUSES.includes(event.status) && !isPastStart(event.starts_at, now);
}

// The lobby's date filter counts days in Thai time (UTC+7, no DST).
const BANGKOK_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const WINDOW_DAYS = { today: 1, week: 7 };

/** { from, to } for "today" / "week" (from = 00:00 today in Bangkok), or null for no date filter. */
export function upcomingWindow(when, now) {
  const days = WINDOW_DAYS[when];
  if (!days) return null;
  const from = Math.floor((now.getTime() + BANGKOK_OFFSET_MS) / DAY_MS) * DAY_MS - BANGKOK_OFFSET_MS;
  return { from: new Date(from), to: new Date(from + days * DAY_MS) };
}
