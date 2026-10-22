// Organizer's event view (layout "A"): the step bar, then an action bar
// for whatever stage the event is at, then tabs. Judges get the same
// view minus anything that changes results or runs the event.

import { escapeHtml } from "../format.js";
import { eventSteps, organizerActions } from "./state.js";
import { badgesHtml, stepsHtml, pairingsHtml, standingsHtml, finalStandingsHtml, penaltiesHtml, playerStatusText, tableLabel } from "./common.js";

const JUDGE_ACTIONS = new Set(["notify_pairings"]);

function checkInTab(view, organizer) {
  const inShop = new Set(view.inShopUserIds || []);
  const rows = view.players
    .filter((p) => !p.dropped && p.entryStatus !== "pending_draw")
    .sort((a, b) => (a.entryStatus === b.entryStatus ? 0 : a.entryStatus === "entered" ? -1 : 1))
    .map((p) => {
      // Decks (deck-stats design §8): only present when this event collects them.
      const decks = "deckSubmitted" in p;
      const needsDeck = decks && view.event.deckSubmission === "required" && !p.deckSubmitted;
      const approve =
        organizer && view.event.status === "check_in" && !p.checkedInAt
          ? `<button type="button" class="small${p.checkInRequestedAt ? "" : " secondary"}" data-action="approve-check-in" data-player-id="${p.id}"
               ${needsDeck ? `disabled title="No deck submitted yet"` : ""}>Approve</button>`
          : "";
      const deck = !decks
        ? ""
        : p.deckSubmitted
          ? `<button type="button" class="ev-badge deck-ok" data-action="view-deck" data-player-id="${p.id}" title="${escapeHtml(p.deckG3 || "")}">Deck ✓</button>`
          : `<span class="ev-badge no-deck">No deck</span>`;
      return `<div class="ev-row">
          <span class="ev-names">${escapeHtml(p.displayName)}</span>
          ${inShop.has(p.userId) ? `<span class="ev-badge in-shop">In shop</span>` : ""}
          ${deck}
          <span class="muted">${playerStatusText(p)}</span>
          <span class="ev-pair-actions">${approve}</span>
        </div>`;
    })
    .join("");
  return `<div class="ev-list">${rows || `<p class="list-empty">Nobody registered yet.</p>`}</div>`;
}

function waitlistTab(view) {
  const rows = view.players
    .filter((p) => !p.dropped && p.entryStatus === "waitlisted")
    .sort((a, b) => a.waitlistPosition - b.waitlistPosition)
    .map((p) => `<div class="ev-row"><span class="ev-rank">#${p.waitlistPosition}</span><span class="ev-names">${escapeHtml(p.displayName)}</span><span class="muted">${p.checkedInAt ? "Checked in" : ""}</span></div>`)
    .join("");
  return `<div class="ev-list">${rows || `<p class="list-empty">No one is waiting.</p>`}</div>`;
}

function judgeCallsTab(view, userId, organizer) {
  const rows = (view.openJudgeCalls || [])
    .map((c) => {
      const table = tableLabel({ tableNumber: c.tableNumber, tableOnline: c.tableOnline }) || "A match";
      const mine = c.claimedBy === userId;
      const actions =
        c.status === "open"
          ? `<button type="button" class="small" data-action="claim-call" data-call-id="${c.id}">Take it</button>`
          : `<span class="muted">${escapeHtml(c.claimedByName || "")}</span>
             ${mine || organizer ? `<button type="button" class="secondary small" data-action="resolve-call" data-call-id="${c.id}">Done</button>` : ""}`;
      return `<div class="ev-row ev-call ${c.status}">
          <span class="ev-names">${escapeHtml(table)}</span>
          <span class="muted">${escapeHtml(c.calledBy || "")}</span>
          <span class="ev-pair-actions">
            ${c.tableNumber ? `<button type="button" class="secondary small" data-action="watch" data-table-number="${c.tableNumber}" data-online="${c.tableOnline}">Go to table</button>` : ""}
            ${actions}
          </span>
        </div>`;
    })
    .join("");
  return `<div class="ev-list">${rows || `<p class="list-empty">No one needs a judge.</p>`}</div>`;
}

function penaltiesTab(view, organizer) {
  const players = view.players.filter((p) => !p.dropped && p.entryStatus === "entered" && !p.noShow);
  return `<form class="ev-penalty-form" data-form="penalty">
      <select name="playerId" aria-label="Player" required>${players.map((p) => `<option value="${p.id}">${escapeHtml(p.displayName)}</option>`).join("")}</select>
      <select name="level" aria-label="Penalty">
        <option value="warning">Warning</option>
        <option value="match_loss">Match loss (this round)</option>
        <option value="disqualification">Disqualification</option>
      </select>
      <input name="reason" maxlength="300" required placeholder="Reason" aria-label="Reason" />
      <button type="submit" class="small">${organizer ? "Give penalty" : "Give penalty (organizer confirms losses)"}</button>
    </form>
    ${penaltiesHtml(view.penalties || [], { organizer })}`;
}

function judgesTab(view) {
  const rows = (view.judges || [])
    .map((j) => `<div class="ev-row"><span class="ev-names">${escapeHtml(j.displayName)}</span><span class="ev-pair-actions"><button type="button" class="secondary small" data-action="remove-judge" data-user-id="${j.userId}">Remove</button></span></div>`)
    .join("");
  return `<form class="ev-judge-search" data-form="judge-search">
      <input name="q" minlength="2" placeholder="Search players by name" aria-label="Search players by name" />
      <button type="submit" class="small secondary">Search</button>
    </form>
    <div id="events-judge-results" class="ev-list"></div>
    <h3 class="panel-subhead">Judges</h3>
    <div class="ev-list">${rows || `<p class="list-empty">No judges yet.</p>`}</div>`;
}

export function renderStaffView(view, { userId, role, tab }) {
  const { event } = view;
  const organizer = role === "organizer";
  const running = event.status === "swiss" || event.status === "bracket";
  const actions = organizerActions(view).filter((a) => organizer || JUDGE_ACTIONS.has(a.id));
  const openCalls = (view.openJudgeCalls || []).filter((c) => c.status === "open").length;
  const pendingPenalties = (view.penalties || []).filter((p) => p.status === "pending").length;

  const tabs = [
    ...(["registration", "check_in"].includes(event.status) ? [["check_in", "Check-in"], ["waitlist", "Waitlist"]] : []),
    ...(running ? [["pairings", "Pairings"], ["calls", `Judge calls${openCalls ? ` (${openCalls})` : ""}`], ["standings", "Standings"]] : []),
    ...(event.status === "completed" ? [["final", "Final standings"]] : []),
    ["penalties", `Penalties${pendingPenalties ? ` (${pendingPenalties})` : ""}`],
    ...(organizer ? [["judges", "Judges"]] : []),
  ];
  const activeTab = tabs.some(([id]) => id === tab) ? tab : tabs[0][0];
  const panel = {
    check_in: () => checkInTab(view, organizer),
    waitlist: () => waitlistTab(view),
    pairings: () => pairingsHtml(view, { canWatch: true, override: organizer }),
    calls: () => judgeCallsTab(view, userId, organizer),
    standings: () => standingsHtml(view),
    final: () => finalStandingsHtml(view),
    penalties: () => penaltiesTab(view, organizer),
    judges: () => judgesTab(view),
  }[activeTab]();

  const bar = actions
    .map((a) =>
      a.id === "more"
        ? `<span class="ev-bar-spacer"></span>
           <button type="button" class="secondary" data-action="edit-event">Edit</button>
           <button type="button" class="secondary danger" data-action="cancel-event">Cancel event</button>`
        : `<button type="button" class="${a.primary ? "" : "secondary"}" data-action="${a.id}" ${a.disabled ? "disabled" : ""}>${escapeHtml(a.label)}</button>`
    )
    .join("");

  return `<div class="ev-staff">
      <div class="ev-staff-head">
        <h2 class="ev-title">${escapeHtml(event.name)} <span class="ev-badge role">${organizer ? "Organizer" : "Judge"}</span></h2>
        ${badgesHtml(event, view.players)}
        ${running ? `<span id="events-round-timer" class="ev-timer"></span>` : ""}
      </div>
      ${stepsHtml(eventSteps(event))}
      ${bar ? `<div class="ev-action-bar">${bar}</div>` : ""}
      <div class="ev-tabs" role="tablist">${tabs
        .map(([id, label]) => `<button type="button" role="tab" class="ev-tab" data-action="tab" data-tab="${id}" aria-selected="${id === activeTab}">${escapeHtml(label)}</button>`)
        .join("")}</div>
      <div class="ev-tab-panel" role="tabpanel">${panel}</div>
    </div>`;
}
