-- Cleanup: an earlier version of migration 011 also added a name_th
-- column (Thai translation of the card NAME), before that was
-- scoped back down to skill-text-only (see migration 011's current
-- comment + the card-catalog decision log). This drops it in case
-- 011 already ran with the old content on this database before the
-- scope changed - a no-op (IF EXISTS) on any database that only ever
-- saw the corrected 011.
ALTER TABLE cards
  DROP COLUMN IF EXISTS name_th;
