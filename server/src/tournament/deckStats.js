// Deck submission + G3 ride-line stats (deck-stats design §4, §7):
// which events take decks, how a ride deck becomes a G3 group, and the
// stats table. Pure, so every rule here is unit-tested.

import { resultForPlayer } from "./history.js";

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

/**
 * A ride deck's G3 group: the distinct names of its grade-3 cards found
 * in the catalog, sorted and joined with " / ". Reprints share a name,
 * so they share a group. Nothing found = "Unknown" (a set the catalog
 * hasn't imported yet) - it turns into the real name once it has.
 */
export function g3Group(rideCards) {
  const byName = new Map();
  for (const c of rideCards) {
    if (c.grade !== 3 || !c.name || byName.has(c.name)) continue;
    byName.set(c.name, { name: c.name, cardNumber: c.cardNumber, imageUrl: c.imageUrl ?? null, nation: c.nation ?? null });
  }
  if (!byName.size) return { key: UNKNOWN, g3: [] };
  const g3 = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { key: g3.map((c) => c.name).join(" / "), g3 };
}

const UNKNOWN = "Unknown";
const LABEL_ORDER = ["champion", "runner_up", "top4", "top8", "top16", "top32", "top64"];

/**
 * The G3 table (design §7.2). `players` are the played players of the
 * events in scope, `group` null when they sent no deck; `matches` every
 * match of those events. Win % = (wins + draws/2) / matches, leaving out
 * byes, unresolved matches and same-group mirrors (but Unknown vs
 * Unknown counts - those may be different decks). Unknown gets no win %.
 */
export function computeDeckStats({ players, matches }) {
  const groupOf = new Map(players.map((p) => [p.id, p.group]));
  const rows = new Map();
  let withDeck = 0;
  let noDeck = 0;
  for (const p of players) {
    if (!p.group) {
      noDeck++;
      continue;
    }
    withDeck++;
    let row = rows.get(p.group.key);
    if (!row) {
      row = { key: p.group.key, g3: p.group.g3, players: 0, wins: 0, losses: 0, draws: 0, matches: 0, bestLabel: null, bestRank: null, firsts: 0, topCuts: 0, art: new Map() };
      rows.set(p.group.key, row);
    }
    row.players++;
    if (p.finalRank === 1) row.firsts++;
    if (p.finalLabel) {
      row.topCuts++;
      if (!row.bestLabel || LABEL_ORDER.indexOf(p.finalLabel) < LABEL_ORDER.indexOf(row.bestLabel)) row.bestLabel = p.finalLabel;
    }
    if (p.finalRank != null && (row.bestRank == null || p.finalRank < row.bestRank)) row.bestRank = p.finalRank;
    const lead = p.group.g3[0];
    if (lead) row.art.set(lead.cardNumber, { count: (row.art.get(lead.cardNumber)?.count ?? 0) + 1, card: lead });
  }

  for (const m of matches) {
    if (!m.player2Id || !m.result || m.result === "bye") continue;
    const g1 = groupOf.get(m.player1Id);
    const g2 = groupOf.get(m.player2Id);
    if (g1 && g2 && g1.key === g2.key && g1.key !== UNKNOWN) continue; // mirror
    for (const [id, group] of [[m.player1Id, g1], [m.player2Id, g2]]) {
      if (!group) continue;
      const row = rows.get(group.key);
      const result = resultForPlayer(m, id);
      row.matches++;
      if (result === "win") row.wins++;
      else if (result === "draw") row.draws++;
      else row.losses++; // loss, double_loss
    }
  }

  const out = [...rows.values()].map(({ art, ...row }) => {
    const top = [...art.values()].sort((a, b) => b.count - a.count)[0]?.card;
    return {
      ...row,
      imageUrl: top?.imageUrl ?? null,
      nation: top?.nation ?? null,
      share: withDeck ? row.players / withDeck : 0,
      winRate: row.key === UNKNOWN || !row.matches ? null : (row.wins + row.draws / 2) / row.matches,
    };
  });
  out.sort((a, b) => b.players - a.players || (b.winRate ?? -1) - (a.winRate ?? -1));
  return { rows: out, withDeck, noDeck };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const RANGE_ERROR = { error: "Choose a valid date range." };

/** Whole Asia/Bangkok (UTC+7, no DST) days: [from 00:00, the day after `to` 00:00). Either side optional. */
export function bangkokRange(from, to) {
  const at = (day) => {
    if (!DAY.test(day)) return null;
    // Round-trips through UTC to reject days like 2026-02-31 that Date would roll over.
    const utc = new Date(`${day}T00:00:00Z`);
    if (Number.isNaN(utc.getTime()) || utc.toISOString().slice(0, 10) !== day) return null;
    return new Date(`${day}T00:00:00+07:00`);
  };
  const start = from ? at(from) : null;
  const toStart = to ? at(to) : null;
  if ((from && !start) || (to && !toStart)) return RANGE_ERROR;
  const end = toStart ? new Date(toStart.getTime() + 86_400_000) : null;
  if (start && end && start >= end) return RANGE_ERROR;
  return { start, end };
}

/** A D-Standard deck has a Ride Deck - checked before a new Decklog import is saved anywhere. */
export function hasRideDeck(cards) {
  return cards.some((c) => c.zone === "ride");
}
