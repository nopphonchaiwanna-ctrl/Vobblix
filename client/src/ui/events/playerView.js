// Player's event view - the 2-column dashboard (layout "B"): left is the
// event (badges + where it's at), right is "what you need to do now"
// then the round's pairings / standings / players. One column on phones.

import { escapeHtml } from "../format.js";
import { g3Html } from "./deckDialog.js";
import { eventSteps, playerAction } from "./state.js";
import {
  badgesHtml, stepsHtml, pairingsHtml, standingsHtml, finalStandingsHtml, penaltiesHtml, tableLabel, playerStatusText,
  STATUS_LABELS, PLACEMENT_LABELS,
} from "./common.js";

const SIDE_CLAIMS = {
  player1: { won: "player1_win", lost: "player2_win" },
  player2: { won: "player2_win", lost: "player1_win" },
};

/** `judgeCooldownUntil`: ms timestamp until "Call judge" is available again for this match. */
function actionCard(view, action, { judgeCooldownUntil = 0 }) {
  const { event } = view;
  const card = (title, body) => `<section class="ev-action"><h2>${title}</h2>${body}</section>`;
  switch (action.kind) {
    case "register":
      return card("Join this event", `<button type="button" data-action="register">${escapeHtml(action.label)}</button>`);
    case "closed":
      return card("Registration closed", `<p class="muted">The event's start time has passed.</p>`);
    case "registered":
      return card("You're in", `<p class="muted">Check-in opens on the day - you'll check in here.</p>
        <button type="button" class="secondary" data-action="drop-self">Leave this event</button>`);
    case "pending_draw":
      return card("You're in the draw", `<p class="muted">The organizer runs the draw - you'll get a notification either way.</p>
        <button type="button" class="secondary" data-action="drop-self">Withdraw</button>`);
    case "waitlisted":
      return card(`Waitlist #${action.position}`, `<p class="muted">If a spot opens you move up automatically.</p>
        <button type="button" class="secondary" data-action="drop-self">Leave the waitlist</button>`);
    case "check_in":
      return card(
        "Check in",
        `<p class="muted">${action.waitlisted ? `You're #${action.position} on the waitlist - check in in case a spot frees up.` : "Let the organizer know you're here."}</p>
         <button type="button" data-action="check-in">Check in</button>`
      );
    case "awaiting_approval":
      return card("Waiting for the organizer", `<p class="muted">You asked to check in - the organizer approves it.</p>`);
    case "ready":
      return card("You're checked in", `<p class="muted">${action.waitlisted ? "If someone doesn't show, you'll get their spot." : "Pairings appear here when the event starts."}</p>`);
    case "match": {
      const m = action.match;
      const claims = SIDE_CLAIMS[action.side];
      const mySide = action.side === "player1" ? m.player1Claim : m.player2Claim;
      const isBracket = event.currentPhase === "bracket";
      const cooling = judgeCooldownUntil > Date.now();
      const report = m.result
        ? `<p class="muted">Result: ${escapeHtml(m.result.replace("_", " "))}</p>`
        : mySide
          ? `<p class="muted">You reported - waiting for your opponent.</p>`
          : `<div class="row-actions">
               <button type="button" data-action="report" data-match-id="${m.id}" data-claim="${claims.won}">I won</button>
               <button type="button" class="secondary" data-action="report" data-match-id="${m.id}" data-claim="${claims.lost}">I lost</button>
               ${isBracket ? "" : `<button type="button" class="secondary" data-action="report" data-match-id="${m.id}" data-claim="draw">Draw</button>`}
             </div>`;
      return `<section class="ev-action ev-match">
          <div class="ev-match-head">
            <span class="muted">${event.currentPhase === "bracket" ? "Top cut" : "Round"} ${event.currentRound}</span>
            <span id="events-round-timer" class="ev-timer"></span>
          </div>
          <h2>${escapeHtml(tableLabel(m))} · vs ${escapeHtml(action.opponent?.displayName || "?")}</h2>
          <div class="row-actions">
            <button type="button" data-action="go-to-table">Go to table</button>
            <button type="button" class="secondary" data-action="call-judge" data-match-id="${m.id}" ${cooling ? "disabled" : ""}>
              ${cooling ? "Judge called" : "Call judge"}
            </button>
          </div>
          ${report}
        </section>`;
    }
    case "bye":
      return card("Bye this round", `<p class="muted">You get the win - see you next round.</p>`);
    case "eliminated":
      return card("You're out of the top cut", `<p class="muted">Thanks for playing - watch the rest below.</p>`);
    case "done":
      return card(
        `You finished #${action.finalRank}`,
        action.finalLabel ? `<p><span class="status-pill">${PLACEMENT_LABELS[action.finalLabel]}</span></p>` : ""
      );
    default:
      return card(STATUS_LABELS[event.status] || "", "");
  }
}

/** "Your deck" (deck-stats design §8): only in events that collect decks, only for a registered player. */
function deckCard(view, mine) {
  const { event, myDeck } = view;
  if (!mine || event.deckSubmission === "off" || !("myDeck" in view)) return "";
  const open = event.status === "registration" || event.status === "check_in";
  const required = event.deckSubmission === "required";
  const status = myDeck
    ? `<p><strong>${escapeHtml(myDeck.title)}</strong></p><p>${g3Html(myDeck.g3)}</p>`
    : `<p class="muted">${required ? "Required before check-in." : "Optional - it counts toward the event's grade 3 stats."}</p>`;
  const buttons = open
    ? `<div class="row-actions">
         <button type="button" class="${myDeck ? "secondary" : ""}" data-action="submit-deck">${myDeck ? "Change deck" : "Submit deck"}</button>
         ${myDeck && !required ? `<button type="button" class="secondary" data-action="withdraw-deck">Withdraw deck</button>` : ""}
       </div>`
    : "";
  return `<section class="ev-action ev-deck-card"><h2>Your deck</h2>${status}${buttons}</section>`;
}

export function renderPlayerView(view, { userId, tab = "pairings", judgeCooldownUntil = 0 }) {
  const { event } = view;
  const action = playerAction(view, userId);
  const mine = view.players.find((p) => p.userId === userId && !p.dropped);
  const running = event.status === "swiss" || event.status === "bracket";

  const tabs = [
    ...(running ? [["pairings", "Pairings"], ["standings", "Standings"]] : []),
    ...(event.status === "completed" ? [["final", "Final standings"]] : []),
    ["players", "Players"],
    ...(view.penalties?.length ? [["penalties", "My penalties"]] : []),
  ];
  const activeTab = tabs.some(([id]) => id === tab) ? tab : tabs[0][0];
  const panel = {
    pairings: () => pairingsHtml(view, { myPlayerId: mine?.id, canWatch: true }),
    standings: () => standingsHtml(view, mine?.id),
    final: () => finalStandingsHtml(view, mine?.id),
    players: () =>
      `<div class="ev-list">${view.players
        .filter((p) => !p.dropped)
        .map((p) => `<div class="ev-row${p.id === mine?.id ? " mine" : ""}"><span class="ev-names">${escapeHtml(p.displayName)}</span><span class="muted">${playerStatusText(p)}</span></div>`)
        .join("") || `<p class="list-empty">Nobody yet.</p>`}</div>`,
    penalties: () => penaltiesHtml(view.penalties),
  }[activeTab]();

  return `<div class="ev-player">
      <aside class="ev-side">
        <h2 class="ev-title">${escapeHtml(event.name)}</h2>
        ${badgesHtml(event, view.players)}
        ${stepsHtml(eventSteps(event), { vertical: true })}
      </aside>
      <div class="ev-main">
        ${actionCard(view, action, { judgeCooldownUntil })}
        ${deckCard(view, mine)}
        <div class="ev-tabs" role="tablist">${tabs
          .map(([id, label]) => `<button type="button" role="tab" class="ev-tab" data-action="tab" data-tab="${id}" aria-selected="${id === activeTab}">${label}</button>`)
          .join("")}</div>
        <div class="ev-tab-panel" role="tabpanel">${panel}</div>
      </div>
    </div>`;
}
