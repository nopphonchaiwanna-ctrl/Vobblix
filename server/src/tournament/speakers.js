// Who may speak at a table that's hosting a match right now (event-day
// design §2.6 + §2.9): the match's two players and the event's staff
// (organizer + judges). Everyone else at that table is a spectator -
// hears and sees, but no mic or camera.
//
// Voice cap at a match table: spectators up to 8, everyone non-staff up
// to 10 (so both players always fit), staff can still join up to 12.

const SPECTATOR_LIMIT = 8;
const NON_STAFF_LIMIT = 10;
const STAFF_LIMIT = 12;

export function speakerUserIds({ playerUserIds, staffUserIds }) {
  return new Set([...playerUserIds, ...staffUserIds].filter(Boolean));
}

/** kind: "player" | "staff" | "spectator"; total/spectators = who's already in the call. */
export function callAdmission({ kind, total, spectators }) {
  if (kind === "staff") return total < STAFF_LIMIT ? { ok: true } : { ok: false, reason: "voice-full" };
  if (kind === "player") return total < STAFF_LIMIT ? { ok: true } : { ok: false, reason: "voice-full" };
  if (spectators >= SPECTATOR_LIMIT) return { ok: false, reason: "spectators-full" };
  if (total >= NON_STAFF_LIMIT) return { ok: false, reason: "voice-full" };
  return { ok: true };
}
