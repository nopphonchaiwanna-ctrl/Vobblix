// Event panel (#events-panel): a shop's event list, and one event's view
// - the player dashboard (ui/events/playerView.js) or the organizer /
// judge view (ui/events/organizerView.js), picked by the `myRole` the
// server returns. All tournament math is server-side; this wires the
// views to the API and keeps the open event fresh.

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
  updateEvent,
  cancelEvent,
  runEventDraw,
  openEventCheckIn,
  requestEventCheckIn,
  approveEventCheckIn,
  autoEventCheckIn,
  notifyEventPairings,
  searchEventStaff,
  addEventJudge,
  removeEventJudge,
  callEventJudge,
  claimJudgeCall,
  resolveJudgeCall,
  issuePenalty,
  decidePenalty,
  withdrawEventDeck,
  getEventDeckStats,
} from "../net/api.js";
import { getSocket } from "../net/socket.js";
import { askEventPushConsent } from "../net/push.js";
import { escapeHtml } from "./format.js";
import { showToast } from "./toast.js";
import { confirmDialog } from "./confirmDialog.js";
import { initDashboardNav } from "./dashboardNav.js";
import { showPanelScreen } from "./screens.js";
import { renderPlayerView } from "./events/playerView.js";
import { renderStaffView } from "./events/organizerView.js";
import { eventFormHtml, bindEventForm } from "./events/eventForm.js";
import { openDeckDialog, openPlayerDeckDialog } from "./events/deckDialog.js";
import { deckStatsTableHtml } from "./deckStatsTable.js";
import { GAME_LABELS, STATUS_LABELS, REGION_LABELS, REGULATION_LABELS, formatDuration } from "./events/common.js";

const REFRESH_MS = 10_000;

function el(id) {
  return document.getElementById(id);
}

export function initEventsPanel({ getToken, getUserId, onBack, goToMatch, watchTable }) {
  const screen = el("events-panel");
  const backBtn = el("events-panel-back");
  const titleEl = el("events-panel-title");
  const errorEl = el("events-panel-error");
  const bodyEl = el("events-panel-body");
  initDashboardNav(screen.querySelector(".dashboard-shell"), { defaultSection: "events" });

  let mode = null; // 'list' | 'detail'
  let shopId = null;
  let eventId = null;
  let view = null; // last GET /events/:id
  let tab = null;
  // A finished event's G3 table never changes - fetched once per event.
  const deckStatsCache = new Map();
  const judgeCallCooldown = new Map(); // matchId -> ms timestamp
  const askedConsent = new Set(); // eventIds we already prompted this session

  // ---------- Round timer + refresh ----------
  let timerInterval = null;
  let refreshInterval = null;
  function stopTimers() {
    clearInterval(timerInterval);
    clearInterval(refreshInterval);
    timerInterval = refreshInterval = null;
  }
  function startRoundTimer() {
    clearInterval(timerInterval);
    const { event, currentRoundStartedAt } = view;
    if (!event.roundTimeLimitMinutes || !currentRoundStartedAt || !["swiss", "bracket"].includes(event.status)) return;
    const deadline = new Date(currentRoundStartedAt).getTime() + event.roundTimeLimitMinutes * 60_000;
    const tick = () => {
      const t = el("events-round-timer");
      if (!t) return;
      const left = deadline - Date.now();
      t.textContent = left > 0 ? `⏱ ${formatDuration(left)}` : "⏱ Time's up";
      t.classList.toggle("over", left <= 0);
    };
    tick();
    timerInterval = setInterval(tick, 1000);
  }
  // While an event is live, keep it fresh - but never re-render under
  // someone typing (penalty reason, judge search).
  function startRefresh() {
    clearInterval(refreshInterval);
    if (!["registration", "check_in", "swiss", "bracket"].includes(view?.event.status)) return;
    refreshInterval = setInterval(() => {
      if (screen.hidden || mode !== "detail") return stopTimers();
      if (bodyEl.contains(document.activeElement) && document.activeElement.matches("input, select, textarea")) return;
      renderDetail().catch(() => {});
    }, REFRESH_MS);
  }
  // Staff: a new judge call shows up right away, not on the next refresh.
  // The socket is created after login, so this hooks in on open().
  let listenedSocket = null;
  const onJudgeCall = ({ eventId: id }) => {
    if (!screen.hidden && mode === "detail" && id === eventId) renderDetail().catch(() => {});
  };
  function listenForJudgeCalls() {
    let socket;
    try {
      socket = getSocket();
    } catch {
      return; // not connected yet
    }
    if (socket === listenedSocket) return;
    listenedSocket?.off("judge-call:new", onJudgeCall);
    socket.on("judge-call:new", onJudgeCall);
    listenedSocket = socket;
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  function clearError() {
    errorEl.hidden = true;
  }

  // ---------- List ----------

  async function renderList() {
    stopTimers();
    titleEl.textContent = "Events";
    clearError();
    let isOwner = false;
    try {
      isOwner = (await myShop(getToken())).shop?.id === shopId;
    } catch {
      isOwner = false;
    }
    let events = [];
    try {
      events = (await listEventsByShop(getToken(), shopId)).events || [];
    } catch (err) {
      showError(err.message);
    }
    const rows = events
      .map(
        (e) => `<div class="row" data-event-id="${e.id}">
          <div class="row-main">
            <div class="row-title">${escapeHtml(e.name)}</div>
            <div class="row-meta">${escapeHtml(GAME_LABELS[e.game] || e.game)}${e.vanguardRegion ? ` · ${REGION_LABELS[e.vanguardRegion]} ${REGULATION_LABELS[e.vanguardRegulation] || ""}` : ""} · ${e.format === "swiss_cut" ? `Swiss + top ${e.configuredCutSize}` : "Swiss"} · max ${e.maxPlayers}${e.registrationMode === "lottery" ? " · lottery" : ""}</div>
          </div>
          <span class="status-pill">${STATUS_LABELS[e.status] || e.status}</span>
          <div class="row-actions"><button type="button" data-action="open-event" data-event-id="${e.id}">Open</button></div>
        </div>`
      )
      .join("");
    bodyEl.innerHTML = `${isOwner ? `<details class="ev-create"><summary>Create an event</summary>${eventFormHtml({ submitLabel: "Create event" })}</details>` : ""}
      <div class="list">${rows || `<p class="list-empty">No events yet${isOwner ? " - create one above." : " for this shop."}</p>`}</div>`;
    if (isOwner) {
      bindEventForm(
        bodyEl,
        async (fields) => {
          await createEvent(getToken(), { shopId, ...fields });
          showToast(`"${fields.name}" created.`);
          await renderList();
        },
        showError
      );
    }
  }

  // ---------- One event ----------

  async function renderDetail() {
    clearError();
    try {
      view = await getEvent(getToken(), eventId);
    } catch (err) {
      showError(err.message);
      return;
    }
    titleEl.textContent = view.event.name;
    const staff = view.myRole === "organizer" || view.myRole === "judge";
    const back = shopId ? `<p><button type="button" class="link-btn" data-action="back-to-list">&larr; All events</button></p>` : "";
    bodyEl.innerHTML =
      back +
      (staff
        ? renderStaffView(view, { userId: getUserId(), role: view.myRole, tab })
        : renderPlayerView(view, { userId: getUserId(), tab, judgeCooldownUntil: cooldownForMyMatch() }));
    fillDeckStats();
    startRoundTimer();
    startRefresh();
    // A judge is asked about alerts the first time they open the event.
    if (view.myRole === "judge" && view.myPushConsent === null) maybeAskConsent();
  }

  async function fillDeckStats() {
    const slot = bodyEl.querySelector("[data-deck-stats]");
    if (!slot) return;
    const id = eventId;
    try {
      if (!deckStatsCache.has(id)) deckStatsCache.set(id, (await getEventDeckStats(getToken(), id)).stats);
      const live = bodyEl.querySelector("[data-deck-stats]");
      if (live && id === eventId) live.innerHTML = deckStatsTableHtml(deckStatsCache.get(id), { mode: "event" });
    } catch (err) {
      showError(err.message);
    }
  }

  function cooldownForMyMatch() {
    const me = view.players.find((p) => p.userId === getUserId());
    const m = me && view.currentRoundMatches.find((x) => x.player1Id === me.id || x.player2Id === me.id);
    return m ? judgeCallCooldown.get(m.id) || 0 : 0;
  }

  async function maybeAskConsent() {
    if (view.myPushConsent !== null || askedConsent.has(eventId)) return;
    askedConsent.add(eventId);
    await askEventPushConsent({ eventId, eventName: view.event.name, getToken });
  }

  function renderEdit() {
    stopTimers();
    clearError();
    const { status } = view.event;
    const mode = status === "registration" ? "full" : status === "check_in" ? "checkin" : "basics";
    const hint = {
      checkin: "During check-in, only the name, start time and round time limit can change.",
      basics: "Once rounds are running, only the name and round time limit can change.",
    }[mode];
    bodyEl.innerHTML = `
      <p><button type="button" class="link-btn" data-action="cancel-edit">&larr; Back to event</button></p>
      <h2 class="panel-subhead">Edit event</h2>
      ${hint ? `<p class="hint">${hint}</p>` : ""}
      ${eventFormHtml({ values: view.event, submitLabel: "Save changes", mode, cancelLabel: "Discard" })}`;
    bindEventForm(
      bodyEl,
      async (fields) => {
        await updateEvent(getToken(), eventId, fields);
        showToast("Event updated.");
        await renderDetail();
      },
      showError
    );
  }

  // ---------- Actions ----------

  const token = () => getToken();
  const actions = {
    "open-event": async (btn) => {
      eventId = btn.dataset.eventId;
      mode = "detail";
      tab = null;
      await renderDetail();
    },
    "back-to-list": async () => {
      mode = "list";
      await renderList();
    },
    tab: async (btn) => {
      tab = btn.dataset.tab;
      await renderDetail();
    },
    register: async () => {
      const { player } = await registerForEvent(token(), eventId);
      if (player.entryStatus === "waitlisted") showToast(`You're #${player.waitlistPosition} on the waitlist.`);
    },
    "drop-self": async () => {
      const ok = await confirmDialog("You'll lose your spot - rejoining puts you at the back of the line.", {
        title: "Leave this event?",
        confirmLabel: "Leave",
        cancelLabel: "Stay",
        danger: true,
      });
      if (ok) await dropFromEvent(token(), eventId);
    },
    "check-in": async () => {
      await maybeAskConsent();
      await requestEventCheckIn(token(), eventId);
      showToast("Checked in - waiting for the organizer.");
    },
    report: async (btn) => reportMatchResult(token(), eventId, btn.dataset.matchId, btn.dataset.claim),
    "go-to-table": async () => goToMatch?.(eventId, view.shopCode),
    watch: async (btn) => {
      const n = Number(btn.dataset.tableNumber);
      const online = btn.dataset.online === "true";
      await watchTable?.(view.shopCode, online ? { tableId: `event:${eventId}:t${n}` } : { tableNumber: n });
    },
    "call-judge": async (btn) => {
      try {
        await callEventJudge(token(), eventId, btn.dataset.matchId);
        judgeCallCooldown.set(btn.dataset.matchId, Date.now() + 60_000);
        showToast("A judge is on the way.");
      } catch (err) {
        judgeCallCooldown.set(btn.dataset.matchId, Date.now() + 60_000);
        throw err;
      }
    },
    // ---- organizer / judge ----
    draw: async () => {
      const r = await runEventDraw(token(), eventId);
      showToast(`Draw done: ${r.entered.length} in, ${r.waitlisted.length} on the waitlist.`);
    },
    open_check_in: async () => {
      await maybeAskConsent();
      await openEventCheckIn(token(), eventId);
      tab = "check_in";
    },
    auto_check_in: async () => {
      const r = await autoEventCheckIn(token(), eventId);
      const skipped = r.skippedNoDeck?.length ? ` · No deck: ${r.skippedNoDeck.join(", ")}` : "";
      showToast(`${r.approved} player${r.approved === 1 ? "" : "s"} checked in.${skipped}`);
    },
    "approve-check-in": async (btn) => approveEventCheckIn(token(), eventId, btn.dataset.playerId),
    "submit-deck": async () => {
      if (await openDeckDialog({ getToken, eventId })) showToast("Deck submitted.");
    },
    "withdraw-deck": async () => {
      const ok = await confirmDialog("Your deck won't count toward this event's stats.", { title: "Withdraw your deck?", confirmLabel: "Withdraw" });
      if (ok) await withdrawEventDeck(token(), eventId);
    },
    "view-deck": async (btn) => openPlayerDeckDialog({ getToken, eventId, playerId: btn.dataset.playerId }),
    start: async () => {
      const r = await startEvent(token(), eventId);
      tab = "pairings";
      if (r.cutFallbackMessage) showToast(r.cutFallbackMessage);
    },
    notify_pairings: async () => {
      const r = await notifyEventPairings(token(), eventId);
      showToast(`Pairings sent to ${r.sent} player${r.sent === 1 ? "" : "s"}.`);
    },
    next_round: async () => advanceEvent(token(), eventId),
    override: async (btn) => {
      const select = bodyEl.querySelector(`select[data-override-select="${btn.dataset.matchId}"]`);
      await overrideMatchResult(token(), eventId, btn.dataset.matchId, select.value);
    },
    "claim-call": async (btn) => claimJudgeCall(token(), eventId, btn.dataset.callId),
    "resolve-call": async (btn) => resolveJudgeCall(token(), eventId, btn.dataset.callId),
    "penalty-confirm": async (btn) => decidePenalty(token(), eventId, btn.dataset.penaltyId, "confirm"),
    "penalty-reject": async (btn) => decidePenalty(token(), eventId, btn.dataset.penaltyId, "reject"),
    "add-judge": async (btn) => {
      await addEventJudge(token(), eventId, btn.dataset.userId);
      showToast("Judge added.");
    },
    "remove-judge": async (btn) => removeEventJudge(token(), eventId, btn.dataset.userId),
    "edit-event": async () => "edit",
    "cancel-edit": async () => {},
    "cancel-event": async () => {
      const ok = await confirmDialog("Cancelling stops the event for good - it can't be restarted. Registered players get a notification.", {
        title: `Cancel "${view.event.name}"?`,
        confirmLabel: "Cancel event",
        cancelLabel: "Keep event",
        danger: true,
      });
      if (!ok) return;
      const r = await cancelEvent(token(), eventId);
      showToast(r.notified ? `Event cancelled - ${r.notified} player${r.notified === 1 ? "" : "s"} notified.` : "Event cancelled.");
    },
  };
  // Actions that don't re-render the event afterwards.
  const NO_RERENDER = new Set(["view-deck", "open-event", "back-to-list", "tab", "go-to-table", "watch"]);

  bodyEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn || !actions[btn.dataset.action]) return;
    const action = btn.dataset.action;
    clearError();
    btn.disabled = true;
    try {
      const result = await actions[action](btn);
      if (result === "edit") return renderEdit();
      if (!NO_RERENDER.has(action)) await renderDetail();
    } catch (err) {
      showError(err.message);
      if (mode === "detail") renderDetail().catch(() => {});
    } finally {
      btn.disabled = false;
    }
  });

  // Penalty + judge search forms (organizer / judge view).
  bodyEl.addEventListener("submit", async (e) => {
    const form = e.target.closest("form[data-form]");
    if (!form) return;
    e.preventDefault();
    clearError();
    const data = Object.fromEntries(new FormData(form));
    try {
      if (form.dataset.form === "penalty") {
        const r = await issuePenalty(token(), eventId, { playerId: data.playerId, level: data.level, reason: data.reason });
        showToast(r.penalty.status === "pending" ? "Penalty sent to the organizer to confirm." : "Penalty recorded.");
        await renderDetail();
      } else if (form.dataset.form === "judge-search") {
        const { users } = await searchEventStaff(token(), eventId, data.q.trim());
        const judgeIds = new Set((view.judges || []).map((j) => j.userId));
        el("events-judge-results").innerHTML =
          users
            .map(
              (u) => `<div class="ev-row"><span class="ev-names">${escapeHtml(u.displayName)}</span><span class="ev-pair-actions">${
                judgeIds.has(u.id) ? `<span class="muted">Judge</span>` : `<button type="button" class="small" data-action="add-judge" data-user-id="${u.id}">Add as judge</button>`
              }</span></div>`
            )
            .join("") || `<p class="list-empty">No one found.</p>`;
      }
    } catch (err) {
      showError(err.message);
    }
  });

  backBtn.addEventListener("click", () => {
    stopTimers();
    screen.hidden = true;
    onBack?.();
  });

  return {
    /** Exactly one of shopId/eventId - shopId opens the list, eventId opens straight to one event. */
    async open({ shopId: openShopId, eventId: openEventId } = {}) {
      showPanelScreen(screen);
      listenForJudgeCalls();
      tab = null;
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
