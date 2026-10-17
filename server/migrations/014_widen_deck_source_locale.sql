-- Fixes the real database's decks.source_locale CHECK constraint,
-- which is still stuck on the original 2-value scheme
-- ('en', 'jp') even though migration 013's *file* was edited in
-- place to the 3-value scheme ('decklog_en', 'decklog_en_ja',
-- 'decklog_jp') when the decklog_jp (Japan-domestic) source was
-- added. That edit was safe ONLY for a database where 013 had never
-- been applied yet - this hand-rolled migration runner
-- (scripts/migrate.js) tracks applied migrations by filename in
-- schema_migrations and never re-runs one, so on a database where
-- 013 was already applied (confirmed: a real import attempt failed
-- with "new row for relation \"decks\" violates check constraint
-- \"decks_source_locale_check\"" when sending sourceLocale =
-- 'decklog_en_ja'), the in-place edit to 013 never took effect.
-- This migration brings such a database in line with the current
-- 013 file via a proper new migration instead.
--
-- Safe to just swap the constraint rather than write a data-fixup
-- step: the old scheme only had two values ('en'/'jp') and nothing
-- in deployment this phase could have inserted a row yet (the
-- "My deck" feature only just got its first real-world test), so
-- there's no existing data to reconcile.
ALTER TABLE decks DROP CONSTRAINT IF EXISTS decks_source_locale_check;
ALTER TABLE decks ADD CONSTRAINT decks_source_locale_check
  CHECK (source_locale IN ('decklog_en', 'decklog_en_ja', 'decklog_jp'));
