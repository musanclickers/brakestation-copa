#!/bin/sh
set -e

echo "==> Brake Station Landing — startup"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no está seteada. Abortando."
  exit 1
fi

if [ -d "/app/packages/db/drizzle" ]; then
  echo "==> Aplicando migraciones desde /app/packages/db/drizzle/"
  for f in /app/packages/db/drizzle/0*.sql; do
    [ -e "$f" ] || continue
    echo "  → $(basename "$f")"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f "$f" 2>&1 \
      | grep -vE '(already exists|NOTICE|^$)' \
      || true
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
