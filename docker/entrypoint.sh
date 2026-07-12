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
#
# Marker-Datei (.last-backed-up-version): verhindert, dass ein Restart-Loop
# (z.B. crashende Migration + restart:unless-stopped) bei JEDEM Neustart ein
# weiteres Backup derselben Version anlegt und dadurch nach BACKUP_KEEP
# Runden die eigentlich schuetzenswerten Vor-Update-Backups aus dem
# Rotationsfenster wirft. Ein Backup wird nur angelegt, wenn KOCHBUCH_VERSION
# sich seit dem letzten erfolgreichen Backup geaendert hat.
DB_PATH="${DATABASE_URL#file:}"
if [ -f "$DB_PATH" ]; then
  BACKUP_DIR="/data/db/backups"
  BACKUP_KEEP="${BACKUP_KEEP:-30}"
  mkdir -p "$BACKUP_DIR"
  VERSION="${KOCHBUCH_VERSION:-unknown}"
  MARKER_FILE="$BACKUP_DIR/.last-backed-up-version"
  LAST_VERSION="$(cat "$MARKER_FILE" 2>/dev/null || true)"

  if [ "$LAST_VERSION" = "$VERSION" ]; then
    echo "Backup fuer Version '$VERSION' existiert bereits (Marker: $MARKER_FILE) — ueberspringe, um bei einem Restart-Loop nicht Backups zu spammen."
  else
    TS="$(date -u +%Y%m%dT%H%M%SZ)"
    BACKUP_FILE="$BACKUP_DIR/pre-${VERSION}-${TS}.db"
    BACKUP_OK=0
    if command -v sqlite3 >/dev/null 2>&1 && sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"; then
      BACKUP_OK=1
    elif cp "$DB_PATH" "$BACKUP_FILE" 2>/dev/null; then
      BACKUP_OK=1
    fi

    if [ "$BACKUP_OK" = "1" ]; then
      echo "$VERSION" > "$MARKER_FILE"
    else
      echo "FEHLER: Pre-Migrations-Backup konnte NICHT angelegt werden (Ziel: $BACKUP_FILE)." >&2
      echo "Sowohl 'sqlite3 .backup' als auch 'cp' sind fehlgeschlagen (Disk voll? Rechte?)." >&2
      if [ "${KOCHBUCH_ALLOW_UNBACKED_MIGRATE:-0}" != "1" ]; then
        echo "Breche ab, um NICHT ungesichert zu migrieren. Escape-Hatch: KOCHBUCH_ALLOW_UNBACKED_MIGRATE=1 setzen, um trotzdem fortzufahren." >&2
        exit 1
      fi
      echo "KOCHBUCH_ALLOW_UNBACKED_MIGRATE=1 gesetzt — migriere trotz fehlgeschlagenem Backup weiter." >&2
    fi
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
