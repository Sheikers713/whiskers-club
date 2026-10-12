#!/usr/bin/env bash
# Runs backup.sh once a day at BACKUP_HOUR (local time). A plain loop instead of
# cron keeps the container simple and logs visible in `docker compose logs`.
set -u
hour="${BACKUP_HOUR:-3}"
while true; do
  now=$(date +%s)
  next=$(date -d "today ${hour}:00" +%s)
  [ "$next" -le "$now" ] && next=$(date -d "tomorrow ${hour}:00" +%s)
  echo "next backup at $(date -d "@$next")"
  sleep $((next - now))
  /usr/local/bin/backup.sh || true
done
