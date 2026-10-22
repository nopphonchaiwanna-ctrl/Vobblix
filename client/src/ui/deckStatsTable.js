// The G3 stats table (deck-stats design §7): the organizer's "Deck stats"
// tab for one finished event, and the admin's all-events view with a
// date range. Numbers come from the server; wording from events/deckStats.js.

import { getAdminDeckStats } from "../net/api.js";
import { escapeHtml } from "./format.js";
import { winRateText, shareText, bestFinishText, rangePreset } from "./events/deckStats.js";

/** mode "event" (one event) or "all" (admin, across events). */
export function deckStatsTableHtml(stats, { mode }) {
  if (!stats.rows.length) return `<p class="list-empty">No decks submitted.</p>`;
  const rows = stats.rows
    .map((r) => {
      const art = r.imageUrl ? `<img src="${escapeHtml(r.imageUrl)}" alt="" loading="lazy" />` : `<span class="deck-stats-noart"></span>`;
      return `<tr>
          <td class="deck-stats-g3">${art}<span>${escapeHtml(r.key)}</span></td>
          <td>${r.players}</td>
          <td>${shareText(r)}</td>
          <td>${winRateText(r)}</td>
          <td>${r.matches}</td>
          <td>${escapeHtml(bestFinishText(r, mode))}</td>
        </tr>`;
    })
    .join("");
  const footer = stats.noDeck ? `<p class="hint">${stats.noDeck} player${stats.noDeck === 1 ? "" : "s"} didn't submit a deck.</p>` : "";
  return `<div class="deck-stats-scroll">
      <table class="deck-stats">
        <thead><tr><th>Grade 3</th><th>Players</th><th>Share</th><th>Win %</th><th>Matches</th><th>Best finish</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="hint">Win % counts draws as half and leaves out byes and mirror matches.</p>
    ${footer}`;
}

/** Admin: presets + a custom range, then the table across every finished event in it. */
export function initAdminDeckStats({ container, getToken }) {
  container.innerHTML = `
    <div class="deck-stats-range" role="group" aria-label="Date range">
      <button type="button" class="secondary small" data-preset="30d">Last 30 days</button>
      <button type="button" class="secondary small" data-preset="90d">Last 90 days</button>
      <button type="button" class="secondary small" data-preset="all">All time</button>
      <label>From <input type="date" name="from" /></label>
      <label>To <input type="date" name="to" /></label>
      <button type="button" class="small" data-apply>Apply</button>
    </div>
    <p class="error" hidden></p>
    <div class="deck-stats-body"></div>`;
  const from = container.querySelector("input[name=from]");
  const to = container.querySelector("input[name=to]");
  const errorEl = container.querySelector(".error");
  const body = container.querySelector(".deck-stats-body");
  const presets = [...container.querySelectorAll("[data-preset]")];

  async function load() {
    errorEl.hidden = true;
    body.setAttribute("aria-busy", "true");
    try {
      const { stats, eventCount } = await getAdminDeckStats(getToken(), { from: from.value, to: to.value });
      body.innerHTML = `<p class="hint">Across ${eventCount} event${eventCount === 1 ? "" : "s"} · ${stats.withDeck} deck${stats.withDeck === 1 ? "" : "s"}</p>${deckStatsTableHtml(stats, { mode: "all" })}`;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      body.removeAttribute("aria-busy");
    }
  }
  function choose(name) {
    const r = rangePreset(name);
    from.value = r.from || "";
    to.value = r.to || "";
    presets.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.preset === name)));
    load();
  }
  presets.forEach((b) => b.addEventListener("click", () => choose(b.dataset.preset)));
  container.querySelector("[data-apply]").addEventListener("click", () => {
    presets.forEach((b) => b.setAttribute("aria-pressed", "false"));
    load();
  });

  return { open: () => choose("30d") };
}
