#!/usr/bin/env bash
# Spins up a throwaway Postgres cluster, applies shim + migrations + seed, runs RLS tests.
# Requires: postgres 15+ binaries (initdb, pg_ctl) and the pgvector extension.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
WORK="$(mktemp -d)"
PORT="${PORT:-55432}"
trap '"$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

if [ "$(id -u)" = "0" ]; then RUNAS=(runuser -u postgres --); chown -R postgres "$WORK"; else RUNAS=(); fi
"${RUNAS[@]}" "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
PSQL=(psql -X -q -o /dev/null -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d postgres)

"${PSQL[@]}" -f "$HERE/00_supabase_shim.sql"
for f in "$ROOT"/migrations/*.sql; do echo "migrate: $(basename "$f")"; "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$ROOT/seed.sql"; echo "seed: ok"
if [ "${WITH_DEMO:-1}" = "1" ]; then "${PSQL[@]}" -f "$ROOT/seed/demo.sql"; echo "demo seed: ok"; fi
for t in "$HERE"/[1-9]*_test.sql; do echo "test: $(basename "$t")"; "${PSQL[@]}" -f "$t"; done
echo "ALL DATABASE TESTS PASSED"
