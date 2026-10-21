// Pieces every event view uses: labels, the step tracker, badges, the
// pairings list (your own match highlighted, online tables marked, a
// Watch button), standings, final standings and penalties.

import { escapeHtml } from "../format.js";

export const GAME_LABELS = { vanguard: "Cardfight!! Vanguard" };
export const REGION_LABELS = { th: "TH", jp: "JP" };
export const REGULATION_LABELS = { premium: "Premium", d_standard: "D-Standard" };
export const STATUS_LABELS = {
  registration: "Open for registration",
  check_in: "Check-in",
  swiss: "Swiss rounds",
  bracket: "Top cut",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const PLACEMENT_LABELS = {
  champion: "Champion",
  runner_up: "Runner-up",
  top4: "Top 4",
  top8: "Top 8",
  top16: "Top 16",
  top32: "Top 32",
  top64: "Top 64",
};
export const PENALTY_LABELS = { warning: "Warning", match_loss: "Match loss", disqualification: "Disqualification" };

export function fmtPercent(n) {
  return `${Math.round(n * 1000) / 10}%`;
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hh = String(Math.floor((total % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

export function badgesHtml(event, players) {
  const entered = players.filter((p) => !p.dropped && p.entryStatus === "entered").length;
  const pills = [
    GAME_LABELS[event.game] || event.game,
    event.vanguardRegion ? `${REGION_LABELS[event.vanguardRegion]} · ${REGULATION_LABELS[event.vanguardRegulation] || ""}` : null,
    event.format === "swiss_cut" ? `Swiss + top ${event.effectiveCutSize || event.configuredCutSize}` : "Swiss",
    `${entered}/${event.maxPlayers} players`,
    event.registrationMode === "lottery" ? "Lottery" : null,
    event.roundTimeLimitMinutes ? `${event.roundTimeLimitMinutes} min/round` : null,
  ].filter(Boolean);
  return `<div class="ev-badges">${pills.map((p) => `<span class="ev-badge">${escapeHtml(p)}</span>`).join("")}</div>`;
}

/** `vertical` = the player view's column; otherwise the organizer's horizontal bar. */
export function stepsHtml(steps, { vertical = false } = {}) {
  return `<ol class="ev-steps${vertical ? " vertical" : ""}">${steps
    .map((s) => `<li class="ev-step ${s.state}" ${s.state === "now" ? 'aria-current="step"' : ""}>${escapeHtml(s.label)}</li>`)
    .join("")}</ol>`;
}

export function namer(players) {
  const byId = new Map(players.map((p) => [p.id, p]));
  return (id) => (id ? escapeHtml(byId.get(id)?.displayName || "?") : "BYE");
}

export function tableLabel(m) {
  if (!m.tableNumber) return "";
  return `Table ${m.tableNumber}${m.tableOnline ? " 🌐" : ""}`;
}

export function resultLabel(m, name) {
  switch (m.result) {
    case "player1_win":
      return `${name(m.player1Id)} won`;
    case "player2_win":
      return `${name(m.player2Id)} won`;
    case "draw":
      return "Draw";
    case "double_loss":
      return "Double loss";
    case "bye":
      return "Bye";
    default:
      return "Playing";
  }
}

/**
 * The current round's pairings. `myPlayerId` is highlighted; `canWatch`
 * adds a Watch button to every playing table; `override` (organizer)
 * adds the result override per match.
 */
export function pairingsHtml(view, { myPlayerId = null, canWatch = false, override = false } = {}) {
  const { event } = view;
  const name = namer(view.players);
  const isBracket = event.currentPhase === "bracket";
  const rows = [...view.currentRoundMatches]
    .sort((a, b) => (a.tableNumber ?? 999) - (b.tableNumber ?? 999))
    .map((m) => {
      const mine = myPlayerId && (m.player1Id === myPlayerId || m.player2Id === myPlayerId);
      const watch =
        canWatch && !mine && m.player2Id && m.tableNumber
          ? `<button type="button" class="secondary small" data-action="watch" data-table-number="${m.tableNumber}" data-online="${m.tableOnline}">Watch</button>`
          : "";
      const overrideControls =
        override && m.player2Id
          ? `<select data-override-select="${m.id}" aria-label="Result">
               <option value="player1_win">${name(m.player1Id)} wins</option>
               <option value="player2_win">${name(m.player2Id)} wins</option>
               ${isBracket ? "" : `<option value="draw">Draw</option><option value="double_loss">Double loss</option>`}
             </select>
             <button type="button" class="secondary small" data-action="override" data-match-id="${m.id}">Override</button>`
          : "";
      return `<div class="ev-pair${mine ? " mine" : ""}" data-match-id="${m.id}">
          <span class="ev-table">${escapeHtml(tableLabel(m)) || "—"}</span>
          <span class="ev-names">${name(m.player1Id)} <span class="muted">vs</span> ${name(m.player2Id)}</span>
          <span class="ev-result">${escapeHtml(resultLabel(m, name))}</span>
          <span class="ev-pair-actions">${watch}${overrideControls}</span>
        </div>`;
    })
    .join("");
  return `<div class="ev-pairs">${rows || `<p class="list-empty">No pairings yet.</p>`}</div>`;
}

export function standingsHtml(view, myPlayerId = null) {
  const name = namer(view.players);
  const rows = (view.standings || [])
    .map(
      (s, i) => `<div class="ev-row${s.id === myPlayerId ? " mine" : ""}">
        <span class="ev-rank">#${i + 1}</span>
        <span class="ev-names">${name(s.id)}</span>
        <span class="muted">${s.points} pts · ${s.wins}-${s.losses}-${s.draws} · OPW ${fmtPercent(s.opw)}</span>
      </div>`
    )
    .join("");
  return `<div class="ev-list">${rows || `<p class="list-empty">No results yet.</p>`}</div>`;
}

export function finalStandingsHtml(view, myPlayerId = null) {
  const rows = view.players
    .filter((p) => p.finalRank)
    .sort((a, b) => a.finalRank - b.finalRank)
    .map(
      (p) => `<div class="ev-row${p.id === myPlayerId ? " mine" : ""}">
        <span class="ev-rank">#${p.finalRank}</span>
        <span class="ev-names">${escapeHtml(p.displayName)}</span>
        ${p.finalLabel ? `<span class="status-pill">${PLACEMENT_LABELS[p.finalLabel] || p.finalLabel}</span>` : ""}
      </div>`
    )
    .join("");
  return `<div class="ev-list">${rows || `<p class="list-empty">No final standings.</p>`}</div>`;
}

export function playerStatusText(p) {
  if (p.dropped) return "Dropped";
  if (p.noShow) return "No-show";
  if (p.entryStatus === "pending_draw") return "In the draw";
  if (p.entryStatus === "waitlisted") return `Waitlist #${p.waitlistPosition}`;
  if (p.checkedInAt) return "Checked in";
  if (p.checkInRequestedAt) return "Wants to check in";
  return "Registered";
}

export function penaltiesHtml(penalties, { organizer = false } = {}) {
  const rows = penalties
    .map(
      (p) => `<div class="ev-row">
        <span class="status-pill">${PENALTY_LABELS[p.level]}</span>
        <span class="ev-names">${escapeHtml(p.playerName || "")}</span>
        <span class="muted">${escapeHtml(p.reason)}${p.issuedByName ? ` — ${escapeHtml(p.issuedByName)}` : ""}</span>
        <span class="ev-pair-actions">${
          p.status === "pending"
            ? organizer
              ? `<button type="button" class="small" data-action="penalty-confirm" data-penalty-id="${p.id}">Confirm</button>
                 <button type="button" class="secondary small" data-action="penalty-reject" data-penalty-id="${p.id}">Reject</button>`
              : `<span class="muted">Pending organizer</span>`
            : `<span class="muted">${p.status === "rejected" ? "Rejected" : ""}</span>`
        }</span>
      </div>`
    )
    .join("");
  return `<div class="ev-list">${rows || `<p class="list-empty">No penalties.</p>`}</div>`;
}
