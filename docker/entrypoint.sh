#!/bin/sh
set -e

# SQLite-Backup vor jeder Migration (preserviert den DB-Stand).
#
# `sqlite3 .backup` statt `cp`, weil mit WAL aktiv (siehe lib/db/prisma.ts)
# ein einfaches cp die zugehoerigen `-wal`/`-shm`-Dateien NICHT mitnimmt und
# das Backup damit potentiell inkonsistent ist. Die .backup-API liest die
# DB konsistent auch wenn parallel geschrieben wird.
#
# Rotation: max BACKUP_KEEP Dateien (Default 30). Sonst waechst /data/db/backups
# pro Update um eine weitere Kopie der gesamten DB.
DB_PATH="${DATABASE_URL#file:}"
if [ -f "$DB_PATH" ]; then
  BACKUP_DIR="/data/db/backups"
  BACKUP_KEEP="${BACKUP_KEEP:-30}"
  mkdir -p "$BACKUP_DIR"
  VERSION="${KOCHBUCH_VERSION:-unknown}"
  TS="$(date -u +%Y%m%dT%H%M%SZ)"
  BACKUP_FILE="$BACKUP_DIR/pre-${VERSION}-${TS}.db"
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'" || \
      cp "$DB_PATH" "$BACKUP_FILE" || true
  else
    cp "$DB_PATH" "$BACKUP_FILE" || true
  fi
  # Aelteste Backups jenseits von BACKUP_KEEP loeschen.
  ls -1t "$BACKUP_DIR"/pre-*.db 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) | \
    while read -r f; do rm -f "$f"; done
fi

# Migrationen anwenden — direkter Pfad ins echte Script, damit der bundle
# seine WASM-Datei via __dirname findet (.bin-Symlinks werden beim COPY
# dereferenziert und brechen die Pfad-Auflösung).
node /app/node_modules/prisma/build/index.js migrate deploy

# Seed läuft bei jedem Start — alle Operationen sind upserts, also idempotent.
# So muss der User auf TrueNAS nach dem Erststart nichts mehr manuell anstoßen.
# Skip via KOCHBUCH_SKIP_SEED=1 möglich, falls jemand das Default-Admin-Konto
# nicht haben möchte.
if [ "${KOCHBUCH_SKIP_SEED:-0}" != "1" ]; then
  node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed.ts || \
    echo "Seed schlug fehl — App startet trotzdem (Migrationen sind ok)."
fi

exec "$@"
