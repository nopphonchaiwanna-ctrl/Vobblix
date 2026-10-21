// What a penalty does when it's issued (event-day design §2.7 + §2.9):
// a warning is just recorded; a match loss or disqualification from a
// judge waits for the organizer, who is the only one who changes results.
// Match losses only touch the round being played - never past rounds.

const LEVELS = ["warning", "match_loss", "disqualification"];

export function penaltyOutcome({ level, issuerRole, matchIsCurrentRound }) {
  if (!LEVELS.includes(level)) return { allowed: false, reason: "Choose warning, match loss or disqualification." };
  if (level === "warning") return { allowed: true, status: "recorded" };
  if (level === "match_loss" && !matchIsCurrentRound) {
    return { allowed: false, reason: "Match loss only applies to the current round." };
  }
  return { allowed: true, status: issuerRole === "organizer" ? "confirmed" : "pending" };
}
