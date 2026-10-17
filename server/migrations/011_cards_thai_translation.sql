-- Thai translation of a card's SKILL TEXT. Filled in LAZILY - the
-- first time someone actually opens that card's detail view (see
-- routes/cards.js), not as a bulk pass over all 16k+ rows up front.
-- NULL means "not translated yet", not "no Thai available" - every
-- card with skill text gets one eventually, the first time it's
-- looked at. Card NAMES are deliberately not translated (scope
-- decision - skill text only; see migration 012 if this file's own
-- history ever matters - an earlier version of this migration added a
-- name_th column too, dropped there once the scope narrowed).
--
-- The translation itself goes through an AI call (see
-- src/services/translateCardTh.js) prompted specifically to use the
-- terminology Thai Cardfight!! Vanguard players actually say out loud
-- at a table, not a literal/mechanical translation - that's the whole
-- point of doing it this way instead of a translate-everything-now
-- pass with Google/DeepL.
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS skill_text_th TEXT;
