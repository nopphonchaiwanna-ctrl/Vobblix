// Create / edit form for an event. Vanguard events also pick the card
// pool region (TH/JP) and regulation (Premium / D-Standard); every event
// picks how players get in (first come, or a lottery the organizer runs)
// and when it starts - registration closes at that time.

import { escapeHtml } from "../format.js";
import { GAME_LABELS, REGION_LABELS, REGULATION_LABELS } from "./common.js";
import { toLocalInputValue, fromLocalInputValue } from "./listing.js";

function rangeOptions(max, current) {
  let html = "";
  for (let i = 0; i <= max; i++) html += `<option value="${i}"${i === current ? " selected" : ""}>${i}</option>`;
  return html;
}

const opt = (value, label, current) =>
  `<option value="${value}"${String(value) === String(current) ? " selected" : ""}>${escapeHtml(label)}</option>`;

/**
 * `mode`: "full" (create, or edit during registration), "checkin" (name +
 * start time + round time) or "basics" (rounds running: name + round time).
 */
export function eventFormHtml({ values = {}, submitLabel, mode = "full", cancelLabel = null }) {
  const limit = values.roundTimeLimitMinutes || 0;
  const game = values.game || "vanguard";
  const creating = !values.id;
  const startField =
    mode === "basics"
      ? ""
      : `<label>Start date &amp; time
           <input type="datetime-local" id="events-form-starts" value="${escapeHtml(toLocalInputValue(values.startsAt))}"
             ${creating ? `min="${toLocalInputValue(new Date().toISOString())}"` : ""}
             ${creating || values.startsAt ? "required" : ""} />
         </label>`;
  const settings = mode !== "full"
    ? ""
    : `<label>Game
         <select id="events-form-game">${Object.entries(GAME_LABELS).map(([v, l]) => opt(v, l, game)).join("")}</select>
       </label>
       <div class="ev-form-row" id="events-form-vanguard" ${game === "vanguard" ? "" : "hidden"}>
         <label>Region
           <select id="events-form-region">${Object.entries(REGION_LABELS).map(([v, l]) => opt(v, l, values.vanguardRegion ?? "th")).join("")}</select>
         </label>
         <label>Regulation
           <select id="events-form-regulation">${Object.entries(REGULATION_LABELS).map(([v, l]) => opt(v, l, values.vanguardRegulation ?? "d_standard")).join("")}</select>
         </label>
       </div>
       <label id="events-form-deck-field">Deck submission (JP D-Standard only)
         <select id="events-form-deck-submission">
           ${opt("off", "Off - no decks", values.deckSubmission ?? "off")}
           ${opt("optional", "Optional - players may submit a Decklog deck", values.deckSubmission)}
           ${opt("required", "Required before check-in", values.deckSubmission)}
         </select>
       </label>
       <label>How players get in
         <select id="events-form-mode">
           ${opt("first_come", "First come, first served (then a waitlist)", values.registrationMode ?? "first_come")}
           ${opt("lottery", "Lottery - you run the draw", values.registrationMode)}
         </select>
       </label>
       <label>Format
         <select id="events-form-format">
           ${opt("swiss_only", "Swiss only (no top cut)", values.format)}
           ${opt("swiss_cut", "Swiss + top-cut bracket", values.format)}
         </select>
       </label>
       <label>Player limit
         <select id="events-form-maxplayers">${[4, 8, 16, 32, 64].map((n) => opt(n, String(n), values.maxPlayers ?? 16)).join("")}</select>
       </label>
       <label id="events-form-cutsize-field">Cut size
         <select id="events-form-cutsize">${[4, 8, 16, 32, 64].map((n) => opt(n, `Top ${n}`, values.configuredCutSize ?? 8)).join("")}</select>
       </label>
       <label>Draw / unresolved match counts as
         <select id="events-form-drawrule">
           ${opt("double_loss", "Double loss (both players get 0)", values.drawRule ?? "double_loss")}
           ${opt("draw", "Draw (both players get 1 point)", values.drawRule)}
         </select>
       </label>`;
  return `<form id="events-form" class="ev-form">
      <label>Event name
        <input id="events-form-name" maxlength="80" required value="${escapeHtml(values.name || "")}" />
      </label>
      ${startField}
      ${settings}
      <fieldset class="duration-fieldset">
        <legend>Round time limit (optional, max 2 days)</legend>
        <label>Days <select id="events-form-days">${rangeOptions(2, Math.floor(limit / 1440))}</select></label>
        <label>Hours <select id="events-form-hours">${rangeOptions(23, Math.floor((limit % 1440) / 60))}</select></label>
        <label>Minutes <select id="events-form-minutes">${rangeOptions(59, limit % 60)}</select></label>
      </fieldset>
      <div class="row-actions">
        <button type="submit">${escapeHtml(submitLabel)}</button>
        ${cancelLabel ? `<button type="button" class="secondary" data-action="cancel-edit">${escapeHtml(cancelLabel)}</button>` : ""}
      </div>
    </form>`;
}

/** Wires the rendered #events-form; calls onSubmit(fields) (may throw - shown by the caller). */
export function bindEventForm(root, onSubmit, onError) {
  const $ = (id) => root.querySelector(`#${id}`);
  const format = $("events-form-format");
  const gameSelect = $("events-form-game");
  // Mirrors the server's takesDecks(): only Vanguard JP D-Standard events take decks.
  const takesDecks = () =>
    gameSelect.value === "vanguard" && $("events-form-region").value === "jp" && $("events-form-regulation").value === "d_standard";
  if (format) {
    const sync = () => {
      $("events-form-cutsize-field").hidden = format.value !== "swiss_cut";
      $("events-form-vanguard").hidden = gameSelect.value !== "vanguard";
      $("events-form-deck-field").hidden = !takesDecks();
    };
    sync();
    format.addEventListener("change", sync);
    gameSelect.addEventListener("change", sync);
    $("events-form-region").addEventListener("change", sync);
    $("events-form-regulation").addEventListener("change", sync);
  }
  $("events-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = (id) => Math.max(0, Number($(id)?.value) || 0);
    const total = n("events-form-days") * 1440 + n("events-form-hours") * 60 + n("events-form-minutes");
    const fields = { name: $("events-form-name").value.trim(), roundTimeLimitMinutes: total > 0 ? total : null };
    const starts = $("events-form-starts");
    if (starts) fields.startsAt = fromLocalInputValue(starts.value);
    if (format) {
      const game = gameSelect.value;
      Object.assign(fields, {
        game,
        format: format.value,
        configuredCutSize: Number($("events-form-cutsize").value),
        maxPlayers: Number($("events-form-maxplayers").value),
        drawRule: $("events-form-drawrule").value,
        registrationMode: $("events-form-mode").value,
        vanguardRegion: game === "vanguard" ? $("events-form-region").value : null,
        vanguardRegulation: game === "vanguard" ? $("events-form-regulation").value : null,
        deckSubmission: takesDecks() ? $("events-form-deck-submission").value : "off",
      });
    }
    try {
      await onSubmit(fields);
    } catch (err) {
      onError(err.message);
    }
  });
}
