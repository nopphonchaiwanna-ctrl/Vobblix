// Tournament/event panel (#events-panel) - one screen that does double
// duty: a shop's event list (register/browse) and a single event's
// detail view (standings, round pairings, result reporting, and -
// only for whoever owns that shop - the organizer controls: create,
// start, override, advance). Reachable from the in-shop topbar menu
// (current shop) and from the owner dashboard's Events section (any
// shop you own) - see main.js for both entry points. All the Swiss/
// bracket math itself lives server-side (server/src/tournament/) -
// this file is just rendering + wiring the HTTP calls in net/api.js.

import {
  myShop,
  createEvent,
  listEventsByShop,
  getEvent,
  registerForEvent,
  dropFromEvent,
  startEvent,
  reportMatchResult,
  overrideMatchResult,
  advanceEvent,
} from "../net/api.js";
import { escapeHtml } from "./format.js";
import { icon } from "./icons.js";
import { initDashboardNav } from "./dashboardNav.js";

function el(id) {
  return document.getElementById(id);
}

const STATUS_LABELS = {
  registration: "Open for registration",
  swiss: "Swiss rounds",
  bracket: "Top-cut bracket",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PLACEMENT_LABELS = {
  champion: "Champion",
  runner_up: "Runner-up",
  top4: "Top 4",
  top8: "Top 8",
  top16: "Top 16",
  top32: "Top 32",
  top64: "Top 64",
};

function fmtPercent(n) {
  return `${Math.round(n * 1000) / 10}%`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

/** 0..max as <option> tags, 0 selected by default (it's listed first). */
function rangeOptions(max) {
  let html = "";
  for (let i = 0; i <= max; i++) html += `<option value="${i}">${i}</option>`;
  return html;
}

export function initEventsPanel({ getToken, getUserId, onBack }) {
  const screen = el("events-panel");
  const backBtn = el("events-panel-back");
  const titleEl = el("events-panel-title");
  const errorEl = el("events-panel-error");
  const bodyEl = el("events-panel-body");
  // No real sub-sections to switch between (unlike owner-dashboard/
  // admin-panel) - just reusing the same dashboard-shell chrome for
  // visual consistency, same as orders-panel.
  initDashboardNav(screen.querySelector(".dashboard-shell"), { defaultSection: "events" });

  // Context for whatever's currently showing - set by open(), read by
  // every re-render after an action (register/report/advance/...).
  let mode = null; // 'list' | 'detail'
  let shopId = null; // the shop whose event list we came from, if any
  let eventId = null; // the event currently shown in detail, if any
  let isOwner = false;

  // Live countdown for the current round's time limit (purely a
  // display - nothing here auto-resolves a match at zero). Re-created
  // on every renderDetail() since the deadline depends on fresh data
  // from the server; always stopped before anything re-renders or the
  // panel is left, so only one interval is ever running.
  let roundTimerInterval = null;
  function stopRoundTimer() {
    if (roundTimerInterval) {
      clearInterval(roundTimerInterval);
      roundTimerInterval = null;
    }
  }
  function startRoundTimer(deadlineMs) {
    stopRoundTimer();
    const tick = () => {
      const timerEl = el("events-round-timer");
      if (!timerEl) {
        stopRoundTimer();
        return;
      }
      const remaining = deadlineMs - Date.now();
      timerEl.textContent = remaining > 0 ? `Time left: ${formatDuration(remaining)}` : "Time's up";
      timerEl.style.color = remaining > 0 ? "" : "var(--danger)";
    };
    tick();
    roundTimerInterval = setInterval(tick, 1000);
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  function clearError() {
    errorEl.hidden = true;
  }

  async function resolveIsOwner(targetShopId) {
    try {
      const { shop } = await myShop(getToken());
      return shop?.id === targetShopId;
    } catch {
      return false;
    }
  }

  // ---------- List view ----------

  async function renderList() {
    stopRoundTimer();
    titleEl.textContent = "Events";
    clearError();
    isOwner = await resolveIsOwner(shopId);
    let events = [];
    try {
      const res = await listEventsByShop(getToken(), shopId);
      events = res.events || [];
    } catch (err) {
      showError(err.message);
    }

    const createForm = isOwner
      ? `<form id="events-create-form">
           <label>
             Event name
             <input id="events-create-name" maxlength="80" required />
           </label>
           <label>
             Format
             <select id="events-create-format">
               <option value="swiss_only">Swiss only (no top cut)</option>
               <option value="swiss_cut">Swiss + top-cut bracket</option>
             </select>
           </label>
           <label>
             Player limit
             <select id="events-create-maxplayers">
               <option value="4">4</option>
               <option value="8">8</option>
               <option value="16" selected>16</option>
               <option value="32">32</option>
               <option value="64">64</option>
             </select>
           </label>
           <label id="events-create-cutsize-field">
             Cut size
             <select id="events-create-cutsize">
               <option value="4">Top 4</option>
               <option value="8" selected>Top 8</option>
               <option value="16">Top 16</option>
               <option value="32">Top 32</option>
               <option value="64">Top 64</option>
             </select>
           </label>
           <label>
             Draw / unresolved match counts as
             <select id="events-create-drawrule">
               <option value="double_loss" selected>Double loss (both players get 0)</option>
               <option value="draw">Draw (both players get 1 point)</option>
             </select>
           </label>
           <fieldset class="duration-fieldset">
             <legend>Round time limit (optional, max 2 days)</legend>
             <label>
               Days
               <select id="events-create-roundtimelimit-days">${rangeOptions(2)}</select>
             </label>
             <label>
               Hours
               <select id="events-create-roundtimelimit-hours">${rangeOptions(23)}</select>
             </label>
             <label>
               Minutes
               <select id="events-create-roundtimelimit-minutes">${rangeOptions(59)}</select>
             </label>
           </fieldset>
           <button type="submit">Create event</button>
         </form>`
      : "";

    const list =
      events.length === 0
        ? `<p class="list-empty">No events yet${isOwner ? " - create one above." : " for this shop."}</p>`
        : events
            .map(
              (e) => `
          <div class="row" data-event-id="${e.id}">
            <div class="row-main">
              <div class="row-title">${escapeHtml(e.name)}</div>
              <div class="row-meta">${e.format === "swiss_cut" ? `Swiss + top ${e.configuredCutSize}` : "Swiss only"}${e.maxPlayers ? ` &middot; max ${e.maxPlayers}` : ""}${e.roundTimeLimitMinutes ? ` &middot; ${e.roundTimeLimitMinutes} min/round` : ""}</div>
            </div>
            <span class="status-pill">${STATUS_LABELS[e.status] || e.status}</span>
            <div class="row-actions"><button type="button" data-action="open-event" data-event-id="${e.id}">Open</button></div>
          </div>`
            )
            .join("");

    bodyEl.innerHTML = `${createForm}<div class="list">${list}</div>`;

    const createFormEl = el("events-create-form");
    if (createFormEl) {
      const formatSelect = el("events-create-format");
      const cutsizeField = el("events-create-cutsize-field");
      const syncCutsizeVisibility = () => {
        cutsizeField.hidden = formatSelect.value !== "swiss_cut";
      };
      syncCutsizeVisibility();
      formatSelect.addEventListener("change", syncCutsizeVisibility);
      createFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearError();
        try {
          const roundTimeLimitDays = Math.max(0, Number(el("events-create-roundtimelimit-days").value) || 0);
          const roundTimeLimitHours = Math.max(0, Number(el("events-create-roundtimelimit-hours").value) || 0);
          const roundTimeLimitMins = Math.max(0, Number(el("events-create-roundtimelimit-minutes").value) || 0);
          const roundTimeLimitTotal = roundTimeLimitDays * 1440 + roundTimeLimitHours * 60 + roundTimeLimitMins;
          await createEvent(getToken(), {
            shopId,
            name: el("events-create-name").value.trim(),
            format: formatSelect.value,
            configuredCutSize: Number(el("events-create-cutsize").value),
            maxPlayers: Number(el("events-create-maxplayers").value),
            drawRule: el("events-create-drawrule").value,
            roundTimeLimitMinutes: roundTimeLimitTotal > 0 ? roundTimeLimitTotal : null,
          });
          await renderList();
        } catch (err) {
          showError(err.message);
        }
      });
    }
  }

  // ---------- Detail view ----------

  async function renderDetail() {
    stopRoundTimer();
    clearError();
    let data;
    try {
      data = await getEvent(getToken(), eventId);
    } catch (err) {
      showError(err.message);
      return;
    }
    const { event, players, standings, currentRoundMatches, currentRoundStartedAt } = data;
    titleEl.textContent = event.name;
    isOwner = await resolveIsOwner(event.shopId);

    const myPlayer = players.find((p) => p.userId === getUserId());
    const backToListLink = shopId
      ? `<p><button type="button" class="link-btn" data-action="back-to-list">&larr; All events</button></p>`
      : "";

    const meta = `
      <p class="hint">
        ${event.format === "swiss_cut" ? `Swiss + top ${event.effectiveCutSize || event.configuredCutSize}` : "Swiss only"}
        &middot; ${STATUS_LABELS[event.status] || event.status}
        ${event.status === "swiss" ? `&middot; round ${event.currentRound}/${event.roundCount}` : ""}
        ${event.status === "bracket" ? `&middot; bracket round ${event.currentRound}` : ""}
        &middot; draw rule: ${event.drawRule === "draw" ? "draw (1 pt each)" : "double loss"}
        ${event.roundTimeLimitMinutes ? `&middot; round time limit: ${event.roundTimeLimitMinutes} min` : ""}
      </p>`;

    // Live countdown, display-only - the organizer still decides what
    // happens at zero (via the draw rule above + the override button).
    const showsRounds = event.status === "swiss" || event.status === "bracket";
    const roundTimer =
      showsRounds && event.roundTimeLimitMinutes && currentRoundStartedAt
        ? `<p class="hint">⏱ <span id="events-round-timer"></span></p>`
        : "";

    let body = "";

    body += roundTimer;

    if (event.status === "registration") {
      body += renderRegistrationSection(event, players, myPlayer);
    } else if (event.status === "swiss" || event.status === "bracket") {
      body += renderStandingsTable(standings, players);
      body += renderRoundMatches(event, currentRoundMatches, players, myPlayer);
      if (isOwner) {
        const allConfirmed = currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.result);
        body += `<p><button type="button" data-action="advance" ${allConfirmed ? "" : "disabled"}>
          ${event.currentPhase === "swiss" && event.currentRound >= event.roundCount ? "Finish Swiss / start bracket" : "Advance to next round"}
        </button>${allConfirmed ? "" : ` <span class="hint">Every match needs a confirmed result first.</span>`}</p>`;
      }
    } else if (event.status === "completed") {
      body += renderFinalStandings(players);
    } else if (event.status === "cancelled") {
      body += `<p class="hint">This event was cancelled.</p>`;
    }

    bodyEl.innerHTML = backToListLink + meta + body;

    if (showsRounds && event.roundTimeLimitMinutes && currentRoundStartedAt) {
      const deadlineMs = new Date(currentRoundStartedAt).getTime() + event.roundTimeLimitMinutes * 60_000;
      startRoundTimer(deadlineMs);
    }
  }

  function renderRegistrationSection(event, players, myPlayer) {
    const activeCount = players.filter((p) => !p.dropped).length;
    const isFull = Boolean(event.maxPlayers) && activeCount >= event.maxPlayers;

    const playerRows = players
      .map(
        (p) => `
        <div class="row" data-player-id="${p.id}">
          <div class="row-main"><div class="row-title">${escapeHtml(p.displayName)}</div></div>
          ${p.dropped ? `<span class="status-pill">Dropped</span>` : ""}
          ${isOwner && !p.dropped ? `<div class="row-actions"><button type="button" data-action="drop" data-player-id="${p.id}">Drop</button></div>` : ""}
        </div>`
      )
      .join("");

    const myActions = myPlayer
      ? myPlayer.dropped
        ? isFull
          ? `<p class="hint">You've left this event.</p><p><button type="button" disabled>Event is full</button></p>`
          : `<p class="hint">You've left this event.</p><p><button type="button" data-action="register">Join again</button></p>`
        : `<p><button type="button" data-action="drop-self">Leave this event</button></p>`
      : isFull
        ? `<p><button type="button" disabled>Event is full</button></p>`
        : `<p><button type="button" data-action="register">Register</button></p>`;

    const capacityLine = event.maxPlayers
      ? `<p class="hint">${activeCount} / ${event.maxPlayers} registered</p>`
      : "";

    const startButton = isOwner
      ? `<p><button type="button" data-action="start">Start event (${activeCount} registered)</button></p>`
      : "";

    return `
      ${capacityLine}
      ${myActions}
      <h2 class="panel-subhead">Registered players</h2>
      <div class="list">${playerRows || `<p class="list-empty">Nobody's registered yet.</p>`}</div>
      ${startButton}`;
  }

  function renderStandingsTable(standings, players) {
    const byId = new Map(players.map((p) => [p.id, p]));
    const rows = standings
      .map((s, i) => {
        const p = byId.get(s.id);
        return `
        <div class="row">
          <div class="row-main">
            <div class="row-title">#${i + 1} ${escapeHtml(p?.displayName || "?")}</div>
            <div class="row-meta">${s.points} pts &middot; ${s.wins}-${s.losses}-${s.draws} &middot; OPW ${fmtPercent(s.opw)}</div>
          </div>
        </div>`;
      })
      .join("");
    return `<h2 class="panel-subhead">Standings</h2><div class="list">${rows || `<p class="list-empty">No results yet.</p>`}</div>`;
  }

  function renderRoundMatches(event, matches, players, myPlayer) {
    const byId = new Map(players.map((p) => [p.id, p]));
    const name = (id) => (id ? escapeHtml(byId.get(id)?.displayName || "?") : "BYE");
    const isBracket = event.currentPhase === "bracket";

    const rows = matches
      .map((m) => {
        const iAmPlayer1 = myPlayer && m.player1Id === myPlayer.id;
        const iAmPlayer2 = myPlayer && m.player2Id === myPlayer.id;
        const resultText = m.result ? resultLabel(m, name) : "Awaiting result";

        let reportControls = "";
        if (!m.result && (iAmPlayer1 || iAmPlayer2) && m.player2Id) {
          const side = iAmPlayer1 ? "player1" : "player2";
          const won = side === "player1" ? "player1_win" : "player2_win";
          const lost = side === "player1" ? "player2_win" : "player1_win";
          reportControls = `
            <div class="row-actions">
              <button type="button" data-action="report" data-match-id="${m.id}" data-claim="${won}">I won</button>
              <button type="button" data-action="report" data-match-id="${m.id}" data-claim="${lost}">I lost</button>
              ${isBracket ? "" : `<button type="button" data-action="report" data-match-id="${m.id}" data-claim="draw">Draw</button>
              <button type="button" data-action="report" data-match-id="${m.id}" data-claim="double_loss">Double loss</button>`}
            </div>`;
        }

        const overrideControls =
          isOwner && m.player2Id
            ? `<div class="row-actions">
                 <select data-override-select="${m.id}">
                   <option value="player1_win">${name(m.player1Id)} wins</option>
                   <option value="player2_win">${name(m.player2Id)} wins</option>
                   ${isBracket ? "" : `<option value="draw">Draw</option><option value="double_loss">Double loss</option>`}
                 </select>
                 <button type="button" data-action="override" data-match-id="${m.id}">Override</button>
               </div>`
            : "";

        return `
          <div class="row" data-match-id="${m.id}" style="flex-direction:column;align-items:stretch">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="row-main">
                <div class="row-title">${name(m.player1Id)} vs ${name(m.player2Id)}</div>
                <div class="row-meta">${resultText}</div>
              </div>
            </div>
            ${reportControls}
            ${overrideControls}
          </div>`;
      })
      .join("");

    return `<h2 class="panel-subhead">${isBracket ? "Bracket" : "Round"} ${event.currentRound}</h2><div class="list">${rows}</div>`;
  }

  function resultLabel(m, name) {
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
        return "Awaiting result";
    }
  }

  function renderFinalStandings(players) {
    const sorted = [...players].sort((a, b) => (a.finalRank || 999) - (b.finalRank || 999));
    const rows = sorted
      .map(
        (p) => `
        <div class="row">
          <div class="row-main">
            <div class="row-title">#${p.finalRank ?? "?"} ${escapeHtml(p.displayName)}</div>
          </div>
          ${p.finalLabel ? `<span class="status-pill">${PLACEMENT_LABELS[p.finalLabel] || p.finalLabel}</span>` : ""}
        </div>`
      )
      .join("");
    return `<h2 class="panel-subhead">Final standings</h2><div class="list">${rows}</div>`;
  }

  // ---------- Actions (delegated click listener) ----------

  bodyEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    clearError();
    try {
      if (action === "open-event") {
        eventId = btn.dataset.eventId;
        mode = "detail";
        await renderDetail();
      } else if (action === "back-to-list") {
        mode = "list";
        await renderList();
      } else if (action === "register") {
        await registerForEvent(getToken(), eventId);
        await renderDetail();
      } else if (action === "drop-self") {
        await dropFromEvent(getToken(), eventId);
        await renderDetail();
      } else if (action === "drop") {
        await dropFromEvent(getToken(), eventId, btn.dataset.playerId);
        await renderDetail();
      } else if (action === "start") {
        const res = await startEvent(getToken(), eventId);
        await renderDetail();
        if (res.cutFallbackMessage) showError(res.cutFallbackMessage);
      } else if (action === "report") {
        await reportMatchResult(getToken(), eventId, btn.dataset.matchId, btn.dataset.claim);
        await renderDetail();
      } else if (action === "override") {
        const select = bodyEl.querySelector(`select[data-override-select="${btn.dataset.matchId}"]`);
        await overrideMatchResult(getToken(), eventId, btn.dataset.matchId, select.value);
        await renderDetail();
      } else if (action === "advance") {
        await advanceEvent(getToken(), eventId);
        await renderDetail();
      }
    } catch (err) {
      showError(err.message);
    }
  });

  backBtn.addEventListener("click", () => {
    stopRoundTimer();
    screen.hidden = true;
    onBack?.();
  });

  return {
    /** Exactly one of shopId/eventId - shopId opens the list, eventId opens straight to one event's detail. */
    async open({ shopId: openShopId, eventId: openEventId } = {}) {
      document
        .querySelectorAll("#auth, #lobby, #game-screen, #owner-dashboard, #admin-panel, #orders-panel, #order-thread, #settings-panel")
        .forEach((s) => (s.hidden = true));
      screen.hidden = false;

      if (openEventId) {
        eventId = openEventId;
        shopId = null;
        mode = "detail";
        await renderDetail();
      } else {
        shopId = openShopId;
        eventId = null;
        mode = "list";
        await renderList();
      }
    },
  };
}
