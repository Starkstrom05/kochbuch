#!/usr/bin/env bash
# ZFS-Snapshot fuer Kochbuch-Daten auf TrueNAS.
# Aufruf: backup-zfs.sh <zfs-dataset> [keep-days]
# Beispiel: backup-zfs.sh tank/kochbuch 30
#
# Legt einen Snapshot an und bereinigt Snapshots, die aelter als keep-days Tage sind.
set -euo pipefail

DATASET="${1:?Usage: $0 <zfs-dataset> [keep-days]}"
KEEP_DAYS="${2:-30}"
SNAP_NAME="${DATASET}@kochbuch-$(date -u +%Y%m%dT%H%M%SZ)"

echo "[backup-zfs] Creating snapshot: $SNAP_NAME"
zfs snapshot "$SNAP_NAME"
echo "[backup-zfs] Snapshot created."

# Prune old snapshots
echo "[backup-zfs] Pruning snapshots older than $KEEP_DAYS days..."
zfs list -H -t snapshot -o name -s creation "$DATASET" \
  | grep "@kochbuch-" \
  | while read -r snap; do
    creation=$(zfs get -H -o value creation "$snap")
    age_days=$(( ( $(date -u +%s) - $(date -u -d "$creation" +%s) ) / 86400 ))
    if [ "$age_days" -gt "$KEEP_DAYS" ]; then
      echo "[backup-zfs] Removing old snapshot: $snap (${age_days}d old)"
      zfs destroy "$snap"
    fi
  done

echo "[backup-zfs] Done."
