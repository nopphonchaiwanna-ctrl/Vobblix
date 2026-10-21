// "Match history" (match-history design §9): the player's own finished
// events, newest first, each opening into its rounds - opponent, result,
// any penalty - plus the rank they finished on. Only ever the caller's
// own history; the server takes no user id.

import { getMatchHistory } from "../net/api.js";
import { escapeHtml } from "./format.js";
import { initDashboardNav } from "./dashboardNav.js";
import { showPanelScreen } from "./screens.js";
import { GAME_LABELS, REGION_LABELS, REGULATION_LABELS, PENALTY_LABELS } from "./events/common.js";
import { formatStartsAt } from "./events/listing.js";
import { placementText, recordText, resultText } from "./events/history.js";

const el = (id) => document.getElementById(id);

function penaltiesHtml(penalties) {
  if (!penalties.length) return "";
  return `<ul class="history-penalties">${penalties
    .map((p) => `<li><span class="status-pill">${escapeHtml(PENALTY_LABELS[p.level] || p.level)}</span> ${escapeHtml(p.reason)}</li>`)
    .join("")}</ul>`;
}

// Green only for a plain finish - a drop or disqualification stays neutral.
function placedCleanly(e) {
  return (e.finalRank != null || e.finalLabel != null) && !e.disqualified;
}

function eventHtml(e) {
  const game = [
    GAME_LABELS[e.game] || e.game,
    e.vanguardRegion ? `${REGION_LABELS[e.vanguardRegion]} ${REGULATION_LABELS[e.vanguardRegulation] || ""}`.trim() : null,
  ].filter(Boolean).join(" · ");
  // Part 4 fills opponentDeck; until then the column doesn't exist.
  const showDeck = e.matches.some((m) => m.opponentDeck);
  const matches = e.matches
    .map(
      (m) => `
        <li class="history-match">
          <span class="history-round">${escapeHtml(m.roundLabel)}</span>
          <span class="history-opponent">${escapeHtml(m.opponentName ?? "")}</span>
          ${showDeck ? `<span class="history-deck">${escapeHtml(m.opponentDeck ?? "")}</span>` : ""}
          <span class="status-pill history-result history-result-${escapeHtml(m.result || "none")}">${escapeHtml(resultText(m.result))}</span>
          ${penaltiesHtml(m.penalties)}
        </li>`
    )
    .join("");
  return `
    <details class="history-event">
      <summary class="row">
        <span class="row-main">
          <span class="row-title">${escapeHtml(e.name)}</span>
          <span class="row-meta">${escapeHtml(e.shopName)} · ${escapeHtml(formatStartsAt(e.date))}</span>
          <span class="row-meta">${escapeHtml(game)}</span>
        </span>
        <span class="history-badges">
          <span class="status-pill${placedCleanly(e) ? " confirmed" : ""}">${escapeHtml(placementText(e))}</span>
          <span class="status-pill">${escapeHtml(recordText(e.record))}</span>
        </span>
      </summary>
      <div class="history-detail">
        <ol class="history-matches">${matches}</ol>
        ${e.otherPenalties.length ? `<p class="hint">Other penalties</p>${penaltiesHtml(e.otherPenalties)}` : ""}
        <button type="button" class="secondary small" data-open-event="${escapeHtml(e.eventId)}">View event</button>
      </div>
    </details>`;
}

export function initMatchHistory({ getToken, onBack, openEvent }) {
  const screen = el("history-panel");
  const errorEl = el("history-panel-error");
  const bodyEl = el("history-panel-body");
  initDashboardNav(screen.querySelector(".dashboard-shell"), { defaultSection: "history" });

  async function render() {
    errorEl.hidden = true;
    bodyEl.innerHTML = `<p class="hint">Loading…</p>`;
    let events;
    try {
      events = (await getMatchHistory(getToken())).events || [];
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      bodyEl.innerHTML = `<button type="button" class="secondary" data-retry>Try again</button>`;
      return;
    }
    bodyEl.innerHTML = events.length
      ? `<div class="list history-list">${events.map(eventHtml).join("")}</div>`
      : `<p class="list-empty">No finished events yet.</p>
         <button type="button" class="secondary" data-find-events>Find events in the lobby</button>`;
  }

  bodyEl.addEventListener("click", (ev) => {
    const target = ev.target.closest("button");
    if (!target) return;
    if (target.dataset.openEvent) openEvent(target.dataset.openEvent);
    else if (target.hasAttribute("data-retry")) render();
    else if (target.hasAttribute("data-find-events")) {
      screen.hidden = true;
      onBack?.();
    }
  });

  el("history-panel-back").addEventListener("click", () => {
    screen.hidden = true;
    onBack?.();
  });

  return {
    async open() {
      showPanelScreen(screen);
      await render();
    },
  };
}
