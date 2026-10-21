// The lobby's "Events" card (lobby-events design §6.2): upcoming and live
// events from every published shop, searchable by shop or event name and
// filterable by game and date. Renders only inside the container it's
// given, so the lobby redesign can move it anywhere.

import { upcomingEvents } from "../net/api.js";
import { escapeHtml } from "./format.js";
import { icon } from "./icons.js";
import { GAME_LABELS, REGION_LABELS, REGULATION_LABELS } from "./events/common.js";
import { formatStartsAt, entryBadge, statusBadge } from "./events/listing.js";

const WHEN_OPTIONS = [
  ["today", "Today"],
  ["week", "This week"],
  ["all", "All"],
];
const SEARCH_DEBOUNCE_MS = 300;

export function initLobbyEvents({ container, getToken, openEvent }) {
  // Kept across refreshes, so coming back from an event keeps the filters.
  const filters = { q: "", game: "", when: "all" };
  let requestSeq = 0;
  let debounce = null;

  container.innerHTML = `
    <div class="lobby-events-controls">
      <input type="search" class="lobby-events-search" placeholder="Search shop or event" aria-label="Search shop or event" maxlength="80" />
      <select class="lobby-events-game" aria-label="Game">
        <option value="">All games</option>
        ${Object.entries(GAME_LABELS).map(([v, l]) => `<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`).join("")}
      </select>
      <div class="lobby-events-when" role="group" aria-label="Dates">
        ${WHEN_OPTIONS.map(([v, l]) => `<button type="button" class="secondary small" data-when="${v}">${l}</button>`).join("")}
      </div>
    </div>
    <p class="hint lobby-events-updating" hidden>Updating…</p>
    <div class="list lobby-events-list" aria-live="polite"></div>`;
  const search = container.querySelector(".lobby-events-search");
  const gameSelect = container.querySelector(".lobby-events-game");
  const whenButtons = [...container.querySelectorAll("[data-when]")];
  const list = container.querySelector(".lobby-events-list");
  const updating = container.querySelector(".lobby-events-updating");

  // Old rows stay up (dimmed) while a new filter loads, so the list doesn't jump.
  function setBusy(busy) {
    list.setAttribute("aria-busy", String(busy));
    updating.hidden = !busy || !list.querySelector(".lobby-event-row");
  }

  function syncWhen() {
    for (const b of whenButtons) b.setAttribute("aria-pressed", String(b.dataset.when === filters.when));
  }
  syncWhen();

  function rowHtml(e) {
    const logo = e.shop.logoUrl
      ? `<img class="shop-logo" src="${escapeHtml(e.shop.logoUrl)}" alt="" />`
      : `<div class="shop-logo-fallback">${icon("trophy", "icon-only")}</div>`;
    const game = [
      GAME_LABELS[e.game] || e.game,
      e.vanguardRegion ? `${REGION_LABELS[e.vanguardRegion]} ${REGULATION_LABELS[e.vanguardRegulation] || ""}`.trim() : null,
    ].filter(Boolean).join(" · ");
    const status = statusBadge(e);
    const mine = entryBadge(e.myEntry);
    return `
      <button type="button" class="row lobby-event-row" data-event-id="${escapeHtml(e.id)}">
        ${logo}
        <span class="row-main">
          <span class="row-title">${escapeHtml(e.name)}</span>
          <span class="row-meta">${escapeHtml(e.shop.name)} · ${escapeHtml(formatStartsAt(e.startsAt))}</span>
          <span class="row-meta">${escapeHtml(game)} · ${e.enteredCount} / ${e.maxPlayers} players</span>
        </span>
        <span class="lobby-event-badges">
          <span class="status-pill lobby-status-${status.toLowerCase().replace(/[^a-z]/g, "")}">${status}</span>
          ${mine ? `<span class="status-pill confirmed">${escapeHtml(mine)}</span>` : ""}
        </span>
      </button>`;
  }

  async function refresh() {
    const seq = ++requestSeq;
    if (!list.children.length) list.innerHTML = `<p class="list-empty">Loading events…</p>`;
    setBusy(true);
    let events;
    try {
      ({ events } = await upcomingEvents(getToken(), filters));
    } catch {
      if (seq === requestSeq) {
        setBusy(false);
        list.innerHTML = `<p class="list-empty">Couldn't load events right now.</p>`;
      }
      return;
    }
    if (seq !== requestSeq) return; // a newer search already went out
    setBusy(false);
    list.innerHTML = events.length
      ? events.map(rowHtml).join("")
      : `<p class="list-empty">No events match - try another shop name or All dates.</p>`;
  }

  search.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      filters.q = search.value.trim();
      refresh();
    }, SEARCH_DEBOUNCE_MS);
  });
  gameSelect.addEventListener("change", () => {
    filters.game = gameSelect.value;
    refresh();
  });
  for (const b of whenButtons) {
    b.addEventListener("click", () => {
      filters.when = b.dataset.when;
      syncWhen();
      refresh();
    });
  }
  list.addEventListener("click", (e) => {
    const row = e.target.closest("[data-event-id]");
    if (row) openEvent(row.dataset.eventId);
  });

  return { refresh };
}
