#!/usr/bin/env bash
# Runs all migrations plus the pgTAP suites on a throwaway local PostgreSQL (no Supabase CLI needed).
# Usage: supabase/tests/run_local.sh   (requires PostgreSQL 15+ and the pgtap extension)
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN=${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin | tail -1)}
export PGHOST=${PGHOST:-/tmp} PGPORT=${PGPORT:-54329} PGUSER=${PGUSER:-postgres}
DATA=${DATA:-/tmp/find_pg}
if [ ! -d "$DATA" ]; then
  mkdir -p "$DATA"; chown -R postgres "$DATA" 2>/dev/null || true
  su postgres -c "$PGBIN/initdb -D $DATA -A trust >/dev/null"
fi
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-p $PGPORT -k /tmp' -l /tmp/find_pg.log -w start" >/dev/null 2>&1 || true
psql -qAt -d postgres -c "drop database if exists find_test" -c "create database find_test" -c "alter database find_test set search_path = \"\$user\", public, extensions"
export PGDATABASE=find_test
psql -q -v ON_ERROR_STOP=1 -f tests/support/supabase_stub.sql
for f in migrations/*.sql; do echo "== $f"; psql -q -v ON_ERROR_STOP=1 -f "$f"; done
fail=0
for t in tests/0*.sql; do
  echo "== $t"; out=$(psql -q -At -v ON_ERROR_STOP=0 -f "$t" 2>&1) || true
  echo "$out" | grep -E "^(ok|not ok|1\.\.|# )|ERROR" || true
  if echo "$out" | grep -qE "^not ok|ERROR|Looks like you (failed|planned)"; then fail=1; fi
done
exit $fail
