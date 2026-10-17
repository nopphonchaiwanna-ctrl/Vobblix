#!/usr/bin/env bash
# One-off script to move the WHOLE local Postgres database (every
# table - users, shops, orders, tournaments, the Vanguard card
# catalog, everything) to a Neon (cloud) Postgres project, so this
# isn't just the card catalog moving - it's the entire dev database,
# matching the "Deployment - lowest-budget plan" doc's existing choice
# of Neon for eventual production anyway.
#
# Reads the CURRENT (local) connection string from server/.env's
# DATABASE_URL - don't type/paste that one anywhere, it's already on
# disk. The NEW (Neon) connection string is the one argument you pass
# on the command line yourself - this script never stores it anywhere
# beyond your own shell history for this one run.
#
# Usage (run from the server/ directory, in your own terminal):
#   bash scripts/migrate-db-to-neon.sh "<neon-connection-string>" [docker-container-name]
#
# The second argument is only needed when the real Postgres is running
# inside a Docker container (confirmed the case for this project -
# `docker ps` showed a `postgres` image container named `coPlaying`,
# server version 18.6) rather than a Postgres installed directly on
# the Mac. When given, BOTH pg_dump and the restore psql run *inside*
# that container via `docker exec`, so their version always exactly
# matches the server's own version. This matters for more than just
# the dump step: pg_dump 18's output includes `\restrict`/`\unrestrict`
# psql meta-commands (a newer security feature), which an older local
# psql (e.g. Homebrew's 14.x) doesn't understand and fails on with
# "invalid command \restrict" - so the restore has to go through the
# same version-matched psql inside the container too, not just the
# dump. The dump file lives on the host (in /tmp); it's streamed into
# the container's psql over stdin (`docker exec -i ... < file`) rather
# than copied in, so nothing extra is left inside the container after.
# Example for this project:
#   bash scripts/migrate-db-to-neon.sh "postgresql://...neon-url..." coPlaying
#
# If you're sure Postgres is NOT in Docker, omit the second argument
# and it falls back to plain local `pg_dump`/`psql` calls (this needs
# a version-matching pg_dump/psql on PATH for both dump and restore).
#
# What it does:
#   1. pg_dump's your current local DB (schema + all data) to a temp file
#   2. Restores that dump into the Neon database you point it at
#   3. Prints row counts from both databases side by side so you can
#      visually confirm everything actually moved before you touch
#      server/.env yourself
#
# Nothing here changes server/.env - that's a deliberate manual step
# for you to do after confirming the counts match (see the printed
# instructions at the end).

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: bash scripts/migrate-db-to-neon.sh \"<your-neon-connection-string>\" [docker-container-name]" >&2
  exit 1
fi

NEW_URL="$1"
DOCKER_CONTAINER="${2:-}"

# Load server/.env the same way the app does (dotenv), just to read
# DATABASE_URL - this script must be run from the server/ directory.
if [ ! -f .env ]; then
  echo "server/.env not found - run this from the server/ directory." >&2
  exit 1
fi
OLD_URL=$(grep -E '^DATABASE_URL=' .env | head -n1 | cut -d'=' -f2-)
if [ -z "$OLD_URL" ]; then
  echo "DATABASE_URL is not set in server/.env - nothing to migrate from." >&2
  exit 1
fi

DUMP_FILE="/tmp/vobblix_neon_migration_$(date +%s).sql"

echo "Dumping current local database..."
if [ -n "$DOCKER_CONTAINER" ]; then
  echo "  (using pg_dump inside Docker container '$DOCKER_CONTAINER' - version-matched automatically)"
  docker exec "$DOCKER_CONTAINER" pg_dump --no-owner --no-privileges --clean --if-exists "$OLD_URL" > "$DUMP_FILE"
else
  pg_dump --no-owner --no-privileges --clean --if-exists "$OLD_URL" -f "$DUMP_FILE"
fi
echo "  -> wrote $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

echo ""
echo "Restoring into the Neon database..."
if [ -n "$DOCKER_CONTAINER" ]; then
  echo "  (using psql inside Docker container '$DOCKER_CONTAINER' too - the dump has"
  echo "   version-18-only \\restrict meta-commands an older local psql can't parse)"
  docker exec -i "$DOCKER_CONTAINER" psql "$NEW_URL" -v ON_ERROR_STOP=1 < "$DUMP_FILE"
else
  psql "$NEW_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"
fi

echo ""
echo "Row counts, local vs. Neon (should match):"
for TABLE in users shops cards tournament_events tournament_players tournament_matches; do
  if [ -n "$DOCKER_CONTAINER" ]; then
    LOCAL_COUNT=$(docker exec "$DOCKER_CONTAINER" psql "$OLD_URL" -tAc "SELECT count(*) FROM $TABLE" 2>/dev/null || echo "n/a")
    NEON_COUNT=$(docker exec "$DOCKER_CONTAINER" psql "$NEW_URL" -tAc "SELECT count(*) FROM $TABLE" 2>/dev/null || echo "n/a")
  else
    LOCAL_COUNT=$(psql "$OLD_URL" -tAc "SELECT count(*) FROM $TABLE" 2>/dev/null || echo "n/a")
    NEON_COUNT=$(psql "$NEW_URL" -tAc "SELECT count(*) FROM $TABLE" 2>/dev/null || echo "n/a")
  fi
  printf "  %-24s local=%-8s neon=%-8s\n" "$TABLE" "$LOCAL_COUNT" "$NEON_COUNT"
done

echo ""
echo "If every row above matches: open server/.env yourself and replace the"
echo "DATABASE_URL= line's value with the same Neon connection string you"
echo "passed to this script, then restart 'npm run dev'. The dump file at"
echo "$DUMP_FILE is left on disk in case you want to double-check it - safe to"
echo "delete once you've confirmed the app works against Neon."
