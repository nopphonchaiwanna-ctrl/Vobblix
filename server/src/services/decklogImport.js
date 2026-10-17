// Fetches a deck from Bushiroad's official Decklog system by its
// public deck code and normalizes it into the shape decks/deck_cards
// (migration 013) expect. No scraping, no headless browser - Decklog
// has a plain public JSON API, confirmed by hand:
//
//   POST https://<decklog host>/system/app/api/view/<code>
//
// returns the deck as JSON with no auth/cookies/session required at
// all (tested with credentials: "omit" and it still works) - this is
// the exact same endpoint each site's own Vue frontend calls to
// render a deck's /view/<code> page.
//
// Decklog is actually THREE separate sites/deployments sharing the
// "Decklog" name, each its own deck-code namespace - confirmed by
// hand (separate JS bundles, separate /conf/const.js, separate API
// hosts):
//   - decklog_en     -> decklog-en.bushiroad.com, "ENGLISH EDITION"
//                       section (API base .../system/app/api/) -
//                       cards are English-edition prints
//   - decklog_en_ja  -> decklog-en.bushiroad.com, "JAPANESE EDITION"
//                       section (same domain, /ja/ path, API base
//                       .../system/app-ja/api/ - what a browser
//                       actually hits when it redirects you to
//                       .../ja/view/<code>) - for players outside
//                       Japan who use Japanese-print cards
//   - decklog_jp     -> decklog.bushiroad.com (no "-en" - a
//                       genuinely separate deployment: its own
//                       /conf/const.js, own JS bundles, own API at
//                       .../system/app/api/ on its own domain) - the
//                       actual Japan-domestic Decklog site
// A deck code only resolves its full card list on whichever of the
// three it was actually created on - hit another one and you get
// back bare metadata (an object like
// {id, deck_id, title, game_title_id, status}, no `list` at all) or
// an empty array, no error either way. There's no reliable way to
// tell which of the three a bare code belongs to (confirmed
// empirically), so the caller must say which one the code came from
// (locale: "decklog_en" | "decklog_en_ja" | "decklog_jp").
//
// The response has three card zones, not one:
//   - list      -> Main Deck
//   - p_list    -> Ride Deck (grade 0-3 + any format-specific ride
//                  cards, e.g. DivineZ's Energy Generator)
//   - sub_list  -> G-Deck (empty for a deck that doesn't use Stride)
// (there's also s_list2/s_list3 in the response, but those are just
// static clan-name/nation-name dictionaries, not deck content -
// ignored here.) Confirmed identical field names/response shape
// across all three sites (same underlying Decklog software, three
// separate deployments).
//
// Only decklog_en's card_numbers carry a literal "EN" suffix Decklog
// appends to English-edition prints (e.g. "DZ-BT15/001EN") -
// decklog_en_ja and decklog_jp both already use the plain JP format
// our own card catalog (migration 010, sourced from the Japanese
// cf-vanguard.com site) uses ("DZ-BT15/001"). normalizeCardNumber()
// strips the suffix only for decklog_en; it's a no-op for the other
// two.

const LOCALE_API_BASE = {
  decklog_en: "https://decklog-en.bushiroad.com/system/app/api",
  decklog_en_ja: "https://decklog-en.bushiroad.com/system/app-ja/api",
  decklog_jp: "https://decklog.bushiroad.com/system/app/api",
};

// The page a real browser would be on when it makes this same call -
// used to build a Referer/Origin below. Being tried as a fix for a
// live bug: our server's own fetch gets back HTTP 200 with an empty
// `[]` for a code/locale combo that resolves fine in an actual
// browser (confirmed both by live click-through earlier and by a
// user report) - no cookies/auth involved (this is the same
// unauthenticated endpoint, re-confirmed), so the leading suspect is
// Decklog filtering on Referer/Origin/User-Agent to tell a real page
// load apart from a bare server-to-server POST.
const VIEW_PAGE_BASE = {
  decklog_en: "https://decklog-en.bushiroad.com/view",
  decklog_en_ja: "https://decklog-en.bushiroad.com/ja/view",
  decklog_jp: "https://decklog.bushiroad.com/view",
};
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

const EN_SUFFIX = "EN";

export class DecklogImportError extends Error {}

function normalizeCardNumber(rawCardNumber, locale) {
  if (locale === "decklog_en" && rawCardNumber.endsWith(EN_SUFFIX)) {
    return rawCardNumber.slice(0, -EN_SUFFIX.length);
  }
  return rawCardNumber;
}

function flattenZone(entries, zone, locale) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((c) => c && c.card_number && c.num > 0)
    .map((c) => ({
      zone,
      decklogCardNumber: c.card_number,
      cardNumber: normalizeCardNumber(c.card_number, locale),
      quantity: c.num,
    }));
}

/**
 * Fetches and normalizes a deck by its Decklog deck code.
 * @param {string} deckCode - the code as the user typed/pasted it (e.g. from a /view/<code> URL)
 * @param {"decklog_en"|"decklog_en_ja"|"decklog_jp"} locale - which Decklog site the code is from
 * @returns {Promise<{title: string, memo: string|null, nation: string|null, cards: Array}>}
 */
export async function fetchDecklogDeck(deckCode, locale) {
  const apiBase = LOCALE_API_BASE[locale];
  if (!apiBase) {
    throw new DecklogImportError(`Unsupported Decklog source: ${locale}`);
  }

  const code = (deckCode || "").trim();
  if (!code) {
    throw new DecklogImportError("Deck code is required.");
  }

  let data;
  try {
    const origin = new URL(apiBase).origin;
    const referer = `${VIEW_PAGE_BASE[locale]}/${encodeURIComponent(code)}`;
    const res = await fetch(`${apiBase}/view/${encodeURIComponent(code)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BROWSER_USER_AGENT,
        Referer: referer,
        Origin: origin,
        Accept: "application/json, text/plain, */*",
      },
    });
    if (!res.ok) {
      throw new DecklogImportError(`Decklog returned HTTP ${res.status}.`);
    }
    data = await res.json();
  } catch (err) {
    if (err instanceof DecklogImportError) throw err;
    throw new DecklogImportError(`Could not reach Decklog: ${err.message}`);
  }

  // An unknown/empty code comes back as [], and a code that exists
  // but only on one of the OTHER two sites comes back as an object
  // with no `list` (just id/deck_id/title/game_title_id/status) -
  // either way there's no deck to import.
  if (!data || Array.isArray(data) || !Array.isArray(data.list)) {
    throw new DecklogImportError(
      "That deck code wasn't found. Double-check the code, and make sure you picked the right Decklog site it was actually created on (English Edition, Japanese Edition, or the Japan-domestic site)."
    );
  }

  const cards = [
    ...flattenZone(data.list, "main", locale),
    ...flattenZone(data.p_list, "ride", locale),
    ...flattenZone(data.sub_list, "g_deck", locale),
  ];

  return {
    title: data.title || code,
    memo: data.memo || null,
    nation: data.deck_param2 || null,
    cards,
  };
}
