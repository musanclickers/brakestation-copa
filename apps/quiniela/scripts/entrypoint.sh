#!/bin/sh
set -e

echo "==> Copa Brake Station · Quiniela: arranque"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no está definida. Abortando."
  exit 1
fi

# Migraciones y seed son idempotentes (IF NOT EXISTS / ON CONFLICT DO NOTHING):
# se aplican en cada arranque. Si alguna falla, el container no arranca, para
# que el error se vea en el deploy en vez de servir con un schema a medias.
export PGOPTIONS="-c client_min_messages=warning"
for f in /app/packages/db/drizzle/0*.sql /app/packages/db/drizzle/seed_*.sql; do
  [ -e "$f" ] || continue
  echo "  -> $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "==> Base de datos lista."

exec "$@"
