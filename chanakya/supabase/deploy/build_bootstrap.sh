#!/usr/bin/env bash
# Builds one SQL file that sets up CHANAKYA on an existing Supabase project (e.g. SamaPatra)
# for pasting into the Supabase SQL editor. Includes: migrations, reference seed, real corpus.
# Pass --skip-foundation if migration 0100 (enums/extensions) is already applied.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$HERE/deploy/bootstrap.sql"
{
  echo "-- CHANAKYA bootstrap. Generated $(date -u +%FT%TZ). Run once in the Supabase SQL editor."
  for f in "$HERE"/migrations/*.sql; do
    if [[ "${1:-}" == "--skip-foundation" && "$f" == *_foundation.sql ]]; then continue; fi
    echo; echo "-- ===== $(basename "$f") ====="; cat "$f"
  done
  echo; echo "-- ===== seed.sql ====="; cat "$HERE/seed.sql"
  echo; echo "-- ===== real_corpus.sql ====="; cat "$HERE/seed/real_corpus.sql"
} > "$OUT"
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
