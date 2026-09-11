#!/usr/bin/env sh
set -eu

OUT_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/attendance_${STAMP}.sql.gz"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-attendance}" -d "${POSTGRES_DB:-attendance}" --no-owner --no-privileges \
  | gzip -9 > "$FILE"

echo "Backup created: $FILE"
