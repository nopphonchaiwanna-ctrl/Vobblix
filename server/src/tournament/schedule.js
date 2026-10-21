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
