#!/bin/sh
set -e

echo "==> Brake Station Goleadora — startup"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no está seteada. Abortando."
  exit 1
fi

if [ -d "/app/packages/db/drizzle" ]; then
  echo "==> Aplicando migraciones desde /app/packages/db/drizzle/"
  for f in /app/packages/db/drizzle/0*.sql; do
    [ -e "$f" ] || continue
    echo "  → $(basename "$f")"
    output=$(psql -v ON_ERROR_STOP=0 "$DATABASE_URL" -f "$f" 2>&1) || true
    errors=$(echo "$output" | grep -i 'ERROR:' | grep -vE '(already exists|duplicate key|does not exist)' || true)
    if [ -n "$errors" ]; then
      echo "  ⚠️  $(basename "$f") had unexpected errors:"
      echo "$errors"
    fi
  done
  for f in /app/packages/db/drizzle/seed_*.sql; do
    [ -e "$f" ] || continue
    echo "  → seed: $(basename "$f")"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f "$f" > /dev/null 2>&1 || true
  done
  echo "==> Migraciones aplicadas."
else
  echo "WARNING: /app/packages/db/drizzle no existe. Sin migraciones que aplicar."
fi

echo "==> Arrancando server..."
exec "$@"
