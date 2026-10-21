// Small pure helpers for showing an event's start time and the lobby's
// event rows - kept DOM-free so they're unit-tested (test/eventListing.test.js).

/** "Sun 25 Oct · 13:00" in the viewer's locale/zone (overridable for tests), or "Date TBA". */
export function formatStartsAt(iso, locale = undefined, timeZone = undefined) {
  if (!iso) return "Date TBA";
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone })
    .formatToParts(date)
    .filter((p) => p.type !== "literal")
    .map((p) => p.value)
    .join(" ");
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(date);
  return `${day} · ${time}`;
}

const pad = (n) => String(n).padStart(2, "0");

/** ISO instant -> "YYYY-MM-DDTHH:mm" in local time, for <input type="datetime-local">. */
export function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A datetime-local value (local time) -> ISO instant, or null when empty/invalid. */
export function fromLocalInputValue(value) {
  if (!value) return null;
  const d = new Date(value); // no zone suffix = local time
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
