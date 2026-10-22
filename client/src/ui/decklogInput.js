// Decklog link/code parsing, shared by My deck and submitting a deck to
// an event. Pure, so it's unit-tested.

// Users naturally copy the *full* decklog link from their browser's
// address bar, not just the trailing code - and each of the three
// sites' URLs already says which site it is, so there's no reason to
// make them figure that out by hand. If the "deck code" field holds
// a recognizable decklog view URL, pull the code and the site out of
// it directly; otherwise treat the input as a bare code and leave
// whatever site the dropdown already has.
export function parseDecklogInput(raw) {
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
