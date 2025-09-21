#!/usr/bin/env bash
set -euo pipefail

# scripts/transfer-db.sh
# Safe helper to transfer a local Postgres database to a remote Supabase Postgres
# - Requires: pg_dump, pg_restore (or psql), and network access to the remote DB
# - This script will create a local dump file and prompt before restoring to remote

LOCAL_DB_URL="postgresql://user:password@localhost:5432/romani_ai"
# Resolve script directory so env lookup works regardless of PWD
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_DB_URL="$(grep -m1 '^DATABASE_URL=' "$SCRIPT_DIR/../.env" | cut -d'=' -f2- | tr -d '"')"

DUMPFILE="/tmp/romani_ai_dump_$(date +%Y%m%d%H%M%S).sql"

echo "Local DB URL: $LOCAL_DB_URL"
echo "Remote DB URL: $REMOTE_DB_URL"
echo "Dump file: $DUMPFILE"

read -p "Proceed to dump local DB to $DUMPFILE? [y/N] " yn
if [[ "$yn" != "y" && "$yn" != "Y" ]]; then
  echo "Aborting."
  exit 1
fi

# Create a compressed plain SQL dump (custom format is optional)
pg_dump "$LOCAL_DB_URL" -Fc -f "$DUMPFILE" --no-owner --no-acl

echo "Dump complete. Review $DUMPFILE before restoring."
read -p "Ready to restore to remote (this will overwrite data in the remote DB)? Type YES to continue: " confirm
if [[ "$confirm" != "YES" ]]; then
  echo "Restore cancelled. To manually restore later run: pg_restore -d \"$REMOTE_DB_URL\" -c $DUMPFILE"
  exit 0
fi

# Perform restore
echo "Restoring to remote..."
pg_restore --verbose --clean --no-owner --no-acl -d "$REMOTE_DB_URL" "$DUMPFILE"

echo "Restore complete. Verify remote DB contents."

# Optionally remove dump
read -p "Remove local dump file $DUMPFILE? [y/N] " rmd
if [[ "$rmd" == "y" || "$rmd" == "Y" ]]; then
  rm -f "$DUMPFILE"
  echo "Dump removed."
fi

echo "Done."
