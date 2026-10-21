// Labels for the match-history screen (match-history design §5-§6).
// Pure, so they're unit-tested without a DOM.

import { PLACEMENT_LABELS } from "./common.js";

export const RESULT_LABELS = { win: "Win", loss: "Loss", draw: "Draw", double_loss: "Double loss", bye: "Bye" };

/** "Champion", "#5 of 24", "Dropped after round 3", "Disqualified"; a disqualified ranked player gets " · Disqualified". */
export function placementText(entry) {
  const rank = entry.finalLabel
    ? PLACEMENT_LABELS[entry.finalLabel] || entry.finalLabel
    : entry.finalRank != null
      ? `#${entry.finalRank} of ${entry.players}`
      : null;
  if (rank) return entry.disqualified ? `${rank} · Disqualified` : rank;
  if (entry.disqualified) return "Disqualified";
  if (entry.dropRound != null) return `Dropped after round ${entry.dropRound}`;
  return "Unranked";
}

export function recordText({ wins, losses, draws }) {
  return `${wins}-${losses}-${draws}`;
}

export function resultText(result) {
  return RESULT_LABELS[result] || "No result";
}
