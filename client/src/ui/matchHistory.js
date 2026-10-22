// "Match history" (match-history design §9): the player's own finished
// events, newest first, each opening into its rounds - opponent, result,
// any penalty - plus the rank they finished on. Only ever the caller's
// own history; the server takes no user id.

import { getMatchHistory } from "../net/api.js";
import { escapeHtml } from "./format.js";
import { icon } from "./icons.js";
import { initDashboardNav } from "./dashboardNav.js";
import { showPanelScreen } from "./screens.js";
import { GAME_LABELS, REGION_LABELS, REGULATION_LABELS, PENALTY_LABELS } from "./events/common.js";
import { formatStartsAt } from "./events/listing.js";
import { placementText, recordText, resultText } from "./events/history.js";
import { g3Html } from "./events/deckDialog.js";

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
  // The opponent's G3 ride line (part 4) - only in events that collected decks.
  const showDeck = e.matches.some((m) => m.opponentDeck);
  const matches = e.matches
    .map(
      (m) => `
        <li class="history-match">
          <span class="history-round">${escapeHtml(m.roundLabel)}</span>
          <span class="history-opponent">${escapeHtml(m.opponentName ?? "")}</span>
          ${showDeck ? `<span class="history-deck">${m.opponentDeck ? g3Html(m.opponentDeck.g3) : `<span class="muted">No deck</span>`}</span>` : ""}
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
        ${icon("chevron-down", "history-chevron")}
      </summary>
      <div class="history-detail">
        <ol class="history-matches">${matches}</ol>
        ${e.otherPenalties.length ? `<p class="hint">Other penalties</p>${penaltiesHtml(e.otherPenalties)}` : ""}
        <button type="button" class="secondary small" data-open-event="${escapeHtml(e.eventId)}">View event</button>
      </div>
    </details>`;
}

export function initMatchHistory({ getToken, onBack, openEvent, findEvents }) {
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
      findEvents();
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
