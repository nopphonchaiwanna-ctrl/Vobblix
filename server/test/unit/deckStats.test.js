import { test } from "node:test";
import assert from "node:assert/strict";
import { takesDecks, normalizeDeckSubmission } from "../../src/tournament/deckStats.js";

test("takesDecks: only Vanguard JP D-Standard events take decks", () => {
  assert.equal(takesDecks({ game: "vanguard", vanguard_region: "jp", vanguard_regulation: "d_standard" }), true);
  assert.equal(takesDecks({ game: "vanguard", vanguard_region: "th", vanguard_regulation: "d_standard" }), false);
  assert.equal(takesDecks({ game: "vanguard", vanguard_region: "jp", vanguard_regulation: "premium" }), false);
});

test("normalizeDeckSubmission: forced off where decks don't apply, kept when left out", () => {
  const jp = { game: "vanguard", vanguardRegion: "jp", vanguardRegulation: "d_standard" };
  const th = { ...jp, vanguardRegion: "th" };
  assert.equal(normalizeDeckSubmission(th, "required"), "off");
  assert.equal(normalizeDeckSubmission(jp, "required"), "required");
  assert.equal(normalizeDeckSubmission(jp, undefined, "optional"), "optional");
  assert.equal(normalizeDeckSubmission(jp, "bogus"), "off");
  assert.equal(normalizeDeckSubmission(th, undefined, "optional"), "off");
});
