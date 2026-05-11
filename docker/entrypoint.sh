#!/bin/sh
set -e

# SQLite-Backup vor jeder Migration (preserviert den DB-Stand)
DB_PATH="${DATABASE_URL#file:}"
if [ -f "$DB_PATH" ]; then
  BACKUP_DIR="/data/db/backups"
  mkdir -p "$BACKUP_DIR"
  VERSION="${KOCHBUCH_VERSION:-unknown}"
  TS="$(date -u +%Y%m%dT%H%M%SZ)"
  cp "$DB_PATH" "$BACKUP_DIR/pre-${VERSION}-${TS}.db" || true
fi

# Migrationen anwenden — direkter Pfad ins echte Script, damit der bundle
# seine WASM-Datei via __dirname findet (.bin-Symlinks werden beim COPY
# dereferenziert und brechen die Pfad-Auflösung).
node /app/node_modules/prisma/build/index.js migrate deploy

exec "$@"
