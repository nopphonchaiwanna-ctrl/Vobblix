// Deck submission + G3 ride-line stats (deck-stats design §4, §7):
// which events take decks, how a ride deck becomes a G3 group, and the
// stats table. Pure, so every rule here is unit-tested.

const DECK_SUBMISSION_MODES = ["off", "optional", "required"];

/** Only Vanguard JP D-Standard events take decks (TH has no Decklog; Premium has no ride deck). */
export function takesDecks(event) {
  return event.game === "vanguard" && event.vanguard_region === "jp" && event.vanguard_regulation === "d_standard";
}

/**
 * The deck_submission an event ends up with: "off" wherever decks don't
 * apply, `current` when the request leaves it out, "off" for junk.
 */
export function normalizeDeckSubmission(fields, raw, current = "off") {
  const applies = takesDecks({
    game: fields.game,
    vanguard_region: fields.vanguardRegion,
    vanguard_regulation: fields.vanguardRegulation,
  });
  if (!applies) return "off";
  const value = raw === undefined ? current : raw;
  return DECK_SUBMISSION_MODES.includes(value) ? value : "off";
}
