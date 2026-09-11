#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 2
fi

FILE="$1"
if [ ! -f "$FILE" ]; then
  echo "Backup not found: $FILE" >&2
  exit 2
fi

printf 'Restore %s into database %s? Type RESTORE to continue: ' "$FILE" "${POSTGRES_DB:-attendance}"
read CONFIRM
[ "$CONFIRM" = "RESTORE" ] || { echo "Cancelled."; exit 1; }

gzip -dc "$FILE" | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-attendance}" -d "${POSTGRES_DB:-attendance}"

echo "Restore completed."
