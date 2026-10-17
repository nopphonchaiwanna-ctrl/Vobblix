// "My deck" screen (#decks-panel) - import a Vanguard deck from one
// of Bushiroad's three official Decklog sites by its public deck
// code, and browse the decks you've already imported. See
// server/src/services/decklogImport.js for how the import itself
// works (what a deck code is, the three-way site split, and why
// decklog_en codes need converting before they match our own card
// catalog).
//
// One screen, two modes (list/detail), same pattern as
// ui/eventsPanel.js - a list of your decks with an import form up top,
// and opening one shows its Ride Deck / Main Deck / G-Deck broken out
// by zone, each card pulling its name/grade/Thai translation from our
// own catalog (ui/cards.js on the server) when we have it.

import { listDecks, getDeck, importDeck, deleteDeck } from "../net/api.js";
import { escapeHtml } from "./format.js";
import { initDashboardNav } from "./dashboardNav.js";
import { confirmDialog } from "./confirmDialog.js";

function el(id) {
  return document.getElementById(id);
}

const ZONE_LABELS = {
  ride: "Ride Deck",
  main: "Main Deck",
  g_deck: "G Deck",
};
const ZONE_ORDER = ["ride", "main", "g_deck"];

// Keep in sync with decklogImport.js's LOCALE_API_BASE and
// routes/decks.js's VALID_SOURCE_LOCALES.
const SOURCE_LABELS = {
  decklog_en: "Decklog (English Edition)",
  decklog_en_ja: "Decklog (Japanese Edition, overseas)",
  decklog_jp: "Decklog (Japan domestic)",
};
function sourceLabel(sourceLocale) {
  return SOURCE_LABELS[sourceLocale] || `Decklog (${sourceLocale})`;
}

// Users naturally copy the *full* decklog link from their browser's
// address bar, not just the trailing code - and each of the three
// sites' URLs already says which site it is, so there's no reason to
// make them figure that out by hand. If the "deck code" field holds
// a recognizable decklog view URL, pull the code and the site out of
// it directly; otherwise treat the input as a bare code and leave
// whatever site the dropdown already has.
function parseDecklogInput(raw) {
  const trimmed = (raw || "").trim();
  const match = trimmed.match(
    /^https?:\/\/(decklog-en\.bushiroad\.com|decklog\.bushiroad\.com)\/(?:(ja)\/)?view\/([A-Za-z0-9]+)/i
  );
  if (!match) return { code: trimmed, sourceLocale: null };
  const [, host, jaSegment] = match;
  const code = match[3];
  let sourceLocale;
  if (host.toLowerCase() === "decklog.bushiroad.com") {
    sourceLocale = "decklog_jp";
  } else if (jaSegment) {
    sourceLocale = "decklog_en_ja";
  } else {
    sourceLocale = "decklog_en";
  }
  return { code, sourceLocale };
}

// Renders one card as a single image-forward tile, Decklog-style
// grid. Each row already represents one distinct card_number with
// its total count in `quantity` - Decklog's own API returns one
// entry per distinct card per zone (num = total copies), and
// db/decks.js stores that 1:1, so no grouping is needed here.
// Reverted from an earlier "one tile per physical copy, no badge"
// version back to this grouped form on request - a x4 card is one
// tile with a quantity badge again, not four repeated images.
//
// Everything a .deck-card-row text line used to show (grade, Thai
// skill-text translation, etc.) is still here, just moved into the
// tile's `title` tooltip instead of always-on text, so the grid stays
// image-first and scannable instead of getting crowded.
function cardTile(card) {
  const captionLine2 = card.inCatalog
    ? card.grade != null
      ? `Grade ${escapeHtml(String(card.grade))}`
      : ""
    : "not in catalog yet";
  const qtyBadge = card.quantity >= 1 ? `<span class="deck-card-tile-qty">&times;${card.quantity}</span>` : "";

  if (card.inCatalog) {
    const tooltipParts = [card.name, card.nameReading, card.grade != null ? `Grade ${card.grade}` : null, card.power != null ? `Power ${card.power}` : null, card.shield != null ? `Shield ${card.shield}` : null, card.skillText, card.skillTextTh].filter(Boolean);
    const tooltip = escapeHtml(tooltipParts.join(" \u2022 "));
    const media = card.imageUrl
      ? `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)}" loading="lazy" />`
      : `<div class="deck-card-tile-fallback">${escapeHtml(card.name)}</div>`;
    return `
      <div class="deck-card-tile" title="${tooltip}">
        ${media}
        ${qtyBadge}
        <div class="deck-card-tile-caption">
          <div class="deck-card-tile-name">${escapeHtml(card.name)}</div>
          ${captionLine2 ? `<div class="deck-card-tile-grade">${captionLine2}</div>` : ""}
        </div>
      </div>`;
  }

  return `
    <div class="deck-card-tile" title="${escapeHtml(card.cardNumber)} - not in catalog yet">
      <div class="deck-card-tile-fallback">${escapeHtml(card.cardNumber)}</div>
      ${qtyBadge}
      <div class="deck-card-tile-caption">
        <div class="deck-card-tile-name">${escapeHtml(card.cardNumber)}</div>
        <div class="deck-card-tile-grade">${captionLine2}</div>
      </div>
    </div>`;
}

// Some real Vanguard cards (e.g. certain trigger/G-unit prints) are
// genuinely landscape artwork, not a scan-orientation bug - forcing
// those into the grid's portrait aspect-ratio box with object-fit:
// cover crops most of the image away. Rather than guess which card
// numbers are landscape, check each loaded image's actual pixel
// dimensions and widen that one tile to a landscape box + double grid
// width once we know. Runs after the grid is in the DOM (images may
// still be loading, so this also handles the still-loading case via
// the "load" event instead of assuming .complete).
function markLandscapeTiles(container) {
  container.querySelectorAll(".deck-card-tile img").forEach((img) => {
    const markIfLandscape = () => {
      if (img.naturalWidth > img.naturalHeight) {
        img.closest(".deck-card-tile")?.classList.add("deck-card-tile--landscape");
      }
    };
    if (img.complete) markIfLandscape();
    else img.addEventListener("load", markIfLandscape, { once: true });
  });
}

export function initDecksPanel({ getToken, onBack }) {
  const screen = el("decks-panel");
  const backBtn = el("decks-panel-back");
  const titleEl = el("decks-panel-title");
  const errorEl = el("decks-panel-error");
  const bodyEl = el("decks-panel-body");
  initDashboardNav(screen.querySelector(".dashboard-shell"), { defaultSection: "decks" });

  let mode = null; // 'list' | 'detail'
  let deckId = null;

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  function clearError() {
    errorEl.hidden = true;
  }

  // ---------- List view ----------

  async function renderList() {
    titleEl.textContent = "My deck";
    clearError();
    let decks = [];
    try {
      const res = await listDecks(getToken());
      decks = res.decks || [];
    } catch (err) {
      showError(err.message);
    }

    const importForm = `
      <form id="decks-import-form">
        <label>
          Deck code
          <input id="decks-import-code" required placeholder="paste the full decklog link, or just the code" />
        </label>
        <label>
          Which Decklog site is this code from?
          <select id="decks-import-locale">
            <option value="decklog_en">English Edition (decklog-en.bushiroad.com)</option>
            <option value="decklog_en_ja">Japanese Edition, overseas (decklog-en.bushiroad.com/ja)</option>
            <option value="decklog_jp">Japan domestic (decklog.bushiroad.com)</option>
          </select>
        </label>
        <p class="hint">Paste the whole decklog link and the site below is detected automatically. A bare code only works on the site it was actually created on, so if you type/paste just the code, make sure the dropdown matches where you got it - if the import fails, try one of the other two. Most Thai players building decks with real Japanese-print cards on the actual Japan site want "Japan domestic" here, not "Japanese Edition, overseas".</p>
        <button type="submit">Import deck</button>
      </form>`;

    const list =
      decks.length === 0
        ? `<p class="list-empty">No decks imported yet - paste a Decklog deck code above to bring one in.</p>`
        : decks
            .map(
              (d) => `
          <div class="row" data-deck-id="${d.id}">
            <div class="row-main">
              <div class="row-title">${escapeHtml(d.title)}</div>
              <div class="row-meta">${d.nation ? escapeHtml(d.nation) + " &middot; " : ""}${escapeHtml(sourceLabel(d.sourceLocale))} &middot; ${escapeHtml(d.decklogCode)}</div>
            </div>
            <div class="row-actions">
              <button type="button" data-action="open-deck" data-deck-id="${d.id}">Open</button>
              <button type="button" data-action="delete-deck" data-deck-id="${d.id}">Delete</button>
            </div>
          </div>`
            )
            .join("");

    bodyEl.innerHTML = `${importForm}<div class="list">${list}</div>`;

    el("decks-import-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();
      const rawInput = el("decks-import-code").value.trim();
      if (!rawInput) return;
      const parsed = parseDecklogInput(rawInput);
      const deckCode = parsed.code;
      const sourceLocale = parsed.sourceLocale || el("decks-import-locale").value;
      if (parsed.sourceLocale) {
        // A full link was pasted - show what was actually detected so
        // the dropdown and field match what's being submitted, even if
        // the import still fails for some other reason.
        el("decks-import-code").value = deckCode;
        el("decks-import-locale").value = parsed.sourceLocale;
      }
      const submitBtn = e.target.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      try {
        const res = await importDeck(getToken(), { deckCode, sourceLocale });
        deckId = res.deck.id;
        mode = "detail";
        await renderDetail();
        if (res.missingCount > 0) {
          showError(`Imported, but ${res.missingCount} card(s) in this deck aren't in our catalog yet - they're saved, just missing name/image/translation for now.`);
        }
      } catch (err) {
        showError(err.message);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // ---------- Detail view ----------

  async function renderDetail() {
    clearError();
    let deck, cards;
    try {
      const res = await getDeck(getToken(), deckId);
      deck = res.deck;
      cards = res.cards || [];
    } catch (err) {
      showError(err.message);
      mode = "list";
      await renderList();
      return;
    }

    titleEl.textContent = deck.title;
    const missingCount = cards.filter((c) => !c.inCatalog).length;
    const missingBanner =
      missingCount > 0
        ? `<p class="hint">${missingCount} card(s) in this deck aren't in our catalog yet - shown below by their Decklog card number only.</p>`
        : "";

    const zones = ZONE_ORDER.filter((z) => cards.some((c) => c.zone === z))
      .map((z) => {
        const zoneCards = cards.filter((c) => c.zone === z);
        const tiles = zoneCards.map(cardTile).join("");
        return `
          <h2 class="deck-zone-title">${ZONE_LABELS[z]} <span class="hint">(${zoneCards.reduce((n, c) => n + c.quantity, 0)} cards)</span></h2>
          <div class="deck-card-grid">${tiles}</div>`;
      })
      .join("");

    bodyEl.innerHTML = `
      <p><button type="button" class="link-btn" data-action="back-to-list">&larr; My decks</button></p>
      <p class="row-meta">${deck.nation ? escapeHtml(deck.nation) + " &middot; " : ""}${escapeHtml(sourceLabel(deck.sourceLocale))} &middot; ${escapeHtml(deck.decklogCode)}</p>
      ${missingBanner}
      ${zones || `<p class="list-empty">This deck has no cards.</p>`}`;
    markLandscapeTiles(bodyEl);
  }

  bodyEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    clearError();
    try {
      if (action === "open-deck") {
        deckId = btn.dataset.deckId;
        mode = "detail";
        await renderDetail();
      } else if (action === "delete-deck") {
        const ok = await confirmDialog("Delete this deck? This can't be undone.", { title: "Delete deck", confirmLabel: "Delete", danger: true });
        if (!ok) return;
        await deleteDeck(getToken(), btn.dataset.deckId);
        await renderList();
      } else if (action === "back-to-list") {
        mode = "list";
        deckId = null;
        await renderList();
      }
    } catch (err) {
      showError(err.message);
    }
  });

  backBtn.addEventListener("click", () => {
    screen.hidden = true;
    onBack?.();
  });

  return {
    async open() {
      document
        .querySelectorAll("#auth, #lobby, #game-screen, #owner-dashboard, #admin-panel, #orders-panel, #order-thread, #settings-panel, #events-panel")
        .forEach((s) => (s.hidden = true));
      screen.hidden = false;
      mode = "list";
      deckId = null;
      await renderList();
    },
  };
}
