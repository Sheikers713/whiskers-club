#!/usr/bin/env bash
# Restores the database and uploads from a restic snapshot (default: latest).
# Stop the app first; see README, section "Восстановление из бэкапа".
set -euo pipefail
uploads="${UPLOADS_DIR:-/data/uploads}"
snapshot="${1:-latest}"
target=/tmp/whiskers-restore
rm -rf "$target"
restic restore "$snapshot" --tag whiskers --target "$target"
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" "$target/tmp/whiskers-backup/whiskers.dump"
src="$target$uploads"
if [ -d "$src" ]; then
  rm -rf "${uploads:?}"/*
  cp -a "$src"/. "$uploads"/
fi
rm -rf "$target"
echo "restore ok: $snapshot"
