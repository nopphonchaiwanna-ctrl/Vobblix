// Text for the G3 stats table (deck-stats design §7) - shared by the
// organizer's "Deck stats" tab and the admin's all-events view. Pure,
// so it's unit-tested.

import { PLACEMENT_LABELS } from "./common.js";

const percent = (x) => `${Math.round(x * 100)}%`;
const BANGKOK_OFFSET_MS = 7 * 3_600_000; // UTC+7, no DST
const DAY_MS = 86_400_000;

export function winRateText(row) {
  return row.winRate == null ? "—" : percent(row.winRate);
}

export function shareText(row) {
  return percent(row.share);
}

/** One event: its best placement. All events: how often the G3 won or made top cut. */
export function bestFinishText(row, mode) {
  if (mode === "all") {
    const parts = [row.firsts ? `1st ×${row.firsts}` : null, row.topCuts ? `Top cut ×${row.topCuts}` : null].filter(Boolean);
    return parts.length ? parts.join(" · ") : "—";
  }
  if (row.bestLabel) return PLACEMENT_LABELS[row.bestLabel] || row.bestLabel;
  return row.bestRank != null ? `#${row.bestRank}` : "—";
}

/** "Last 30 days" etc. as Bangkok dates, today included; "all" = no limit. */
export function rangePreset(name, today = new Date()) {
  const days = { "30d": 30, "90d": 90 }[name];
  if (!days) return {};
  const bangkokToday = new Date(today.getTime() + BANGKOK_OFFSET_MS);
  const day = (d) => d.toISOString().slice(0, 10);
  return { from: day(new Date(bangkokToday.getTime() - (days - 1) * DAY_MS)), to: day(bangkokToday) };
}
