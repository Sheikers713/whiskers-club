#!/usr/bin/env bash
# Daily encrypted off-site backup: database dump + uploaded files, via restic.
# Retention: 14 daily, 8 weekly, 12 monthly. Failures and low disk space are
# written to SystemEvent and show up in the superadmin dashboard (decision 2.5).
set -uo pipefail
uploads="${UPLOADS_DIR:-/data/uploads}"

event() { # level kind message
  local msg=${3//\'/\'\'}
  psql "$DATABASE_URL" -q -c \
    "INSERT INTO \"SystemEvent\" (id, level, kind, message) VALUES (gen_random_uuid(), '$1', '$2', '$msg')" \
    || echo "could not record event: $3" >&2
}

fail() { echo "backup failed: $1" >&2; event error backup "Бэкап не выполнен: $1"; exit 1; }

used=$(df -P "$uploads" | awk 'NR==2 {gsub("%", "", $5); print $5}')
if [ -n "$used" ] && [ "$used" -ge "${DISK_WARN_PERCENT:-85}" ]; then
  event warning disk "Диск заполнен на ${used}%"
fi

work=/tmp/whiskers-backup
mkdir -p "$work"
trap 'rm -rf "$work"' EXIT

restic cat config >/dev/null 2>&1 || restic init || fail "не удалось открыть или создать хранилище restic"
pg_dump --format=custom --no-owner --file="$work/whiskers.dump" "$DATABASE_URL" || fail "pg_dump"
restic backup --tag whiskers --host whiskers "$work/whiskers.dump" "$uploads" || fail "restic backup"
restic forget --tag whiskers --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune || fail "restic forget"

size=$(du -h "$work/whiskers.dump" | cut -f1)
event info backup "Бэкап выполнен (дамп базы ${size})"
echo "backup ok"
