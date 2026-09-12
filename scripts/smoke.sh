#!/usr/bin/env bash
# Engine smoke test. Runs in a transaction and rolls back.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
psql "$DATABASE_URL" -f docs/database/tests/smoke_bilal_birthday.sql
