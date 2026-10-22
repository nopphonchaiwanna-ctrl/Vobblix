// Deck dialogs for events (deck-stats design §6, §8): a player picks one
// of their My-deck decks or pastes a Decklog link/code to submit, and
// staff open a player's full submitted deck. Both are built on demand
// and removed on close, so the event view's 10s refresh can't wipe them.

import { listDecks, submitEventDeck, getEventPlayerDeck } from "../../net/api.js";
import { escapeHtml } from "../format.js";
import { parseDecklogInput } from "../decklogInput.js";
import { cardTile, markLandscapeTiles } from "../decksPanel.js";

const SITE_OPTIONS = [
  ["decklog_jp", "Japan domestic (decklog.bushiroad.com)"],
  ["decklog_en_ja", "Japanese Edition, overseas (decklog-en.bushiroad.com/ja)"],
  ["decklog_en", "English Edition (decklog-en.bushiroad.com)"],
];

function openDialog(html) {
  const dialog = document.createElement("dialog");
  dialog.className = "app-dialog ev-deck-dialog";
  dialog.setAttribute("closedby", "any");
  dialog.innerHTML = html;
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
  return dialog;
}

/** Resolves true once a deck was submitted, false if the player closed the dialog. */
export async function openDeckDialog({ getToken, eventId }) {
  let decks = [];
  try {
    decks = (await listDecks(getToken())).decks || [];
  } catch {
    // Still usable with a pasted code.
  }
  const options = decks.map((d) => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.title)}</option>`).join("");
  const dialog = openDialog(`
    <form method="dialog" class="ev-deck-form">
      <h2>Submit your deck</h2>
      <p>Your ride line's grade 3 is read from the deck's Ride Deck. Organizers and judges can see the whole deck; other players can't.</p>
      ${decks.length
        ? `<label>From My deck
             <select name="deckId"><option value="">- Paste a Decklog link instead -</option>${options}</select>
           </label>`
        : ""}
      <label data-paste>Decklog link or code
        <input name="code" autocomplete="off" placeholder="https://decklog.bushiroad.com/view/..." />
      </label>
      <label data-site hidden>Which Decklog site is this code from?
        <select name="sourceLocale">${SITE_OPTIONS.map(([v, l]) => `<option value="${v}">${escapeHtml(l)}</option>`).join("")}</select>
      </label>
      <p class="error" data-error hidden></p>
      <div class="dialog-actions">
        <button type="button" class="dialog-cancel" data-cancel>Cancel</button>
        <button type="submit" data-submit>Submit deck</button>
      </div>
    </form>`);

  const form = dialog.querySelector("form");
  const pick = form.elements.deckId;
  const code = form.elements.code;
  const paste = dialog.querySelector("[data-paste]");
  const site = dialog.querySelector("[data-site]");
  const errorEl = dialog.querySelector("[data-error]");
  const sync = () => {
    const usingPick = Boolean(pick?.value);
    paste.hidden = usingPick;
    // A link names its own site; only a bare code needs the dropdown.
    site.hidden = usingPick || !code.value.trim() || Boolean(parseDecklogInput(code.value).sourceLocale);
  };
  pick?.addEventListener("change", sync);
  code.addEventListener("input", sync);
  sync();

  return new Promise((resolve) => {
    let done = false;
    dialog.addEventListener("close", () => resolve(done));
    dialog.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      let body;
      if (pick?.value) {
        body = { deckId: pick.value };
      } else {
        const parsed = parseDecklogInput(code.value);
        if (!parsed.code) {
          errorEl.textContent = "Choose a deck or paste a Decklog link.";
          errorEl.hidden = false;
          return;
        }
        body = { code: parsed.code, sourceLocale: parsed.sourceLocale || form.elements.sourceLocale.value };
      }
      const submitBtn = dialog.querySelector("[data-submit]");
      submitBtn.disabled = true;
      try {
        await submitEventDeck(getToken(), eventId, body);
        done = true;
        dialog.close();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
      }
    });
  });
}

/** Staff: one player's full submitted deck, grouped by zone. */
export async function openPlayerDeckDialog({ getToken, eventId, playerId }) {
  const { playerName, deck } = await getEventPlayerDeck(getToken(), eventId, playerId);
  const zones = [
    ["ride", "Ride Deck"],
    ["main", "Main Deck"],
    ["g_deck", "G Deck"],
  ]
    .map(([zone, label]) => {
      const cards = deck.cards.filter((c) => c.zone === zone);
      return cards.length ? `<h3>${label}</h3><div class="deck-card-grid">${cards.map(cardTile).join("")}</div>` : "";
    })
    .join("");
  const dialog = openDialog(`
    <form method="dialog">
      <h2>${escapeHtml(playerName ?? "Player")} - ${escapeHtml(deck.title)}</h2>
      <p class="muted">Decklog ${escapeHtml(deck.decklogCode)}</p>
      <div class="ev-deck-view">${zones}</div>
      <div class="dialog-actions"><button type="submit">Close</button></div>
    </form>`);
  markLandscapeTiles(dialog);
}

/** "Alpha / Beta" with small images - used by the player's deck card. */
export function g3Html(g3) {
  if (!g3?.length) return `<span class="muted">Grade 3 not in our card list yet</span>`;
  return `<span class="ev-g3">${g3
    .map((c) => `${c.imageUrl ? `<img src="${escapeHtml(c.imageUrl)}" alt="" loading="lazy" />` : ""}<span>${escapeHtml(c.name)}</span>`)
    .join(`<span class="muted">/</span>`)}</span>`;
}
