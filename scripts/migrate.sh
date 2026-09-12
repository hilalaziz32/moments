#!/usr/bin/env bash
# Applies every migration in order. Safe to re-run: each file is either
# transactional and idempotent, or guarded.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required (see .env.example)}"

for f in docs/database/000*.sql; do
  echo "== $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo "== regenerating types"
node scripts/gen-db-types.mjs

echo "Done. Remember: 00021_postgrest_expose.sql must be the last schema change applied."
