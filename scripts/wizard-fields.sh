#!/usr/bin/env bash
# =============================================================================
# Kochbuch — TrueNAS-Wizard-Felder generieren
# =============================================================================
#
# Fragt Pool und NAS-IP, generiert AUTH_SECRET und gibt alle Werte aus,
# die du im TrueNAS Custom-App-Wizard eintragen musst (Image, Env-Vars,
# Ports, Storage). Copy-Paste-fertig.
#
# Aufruf:
#   bash scripts/wizard-fields.sh
#
# =============================================================================
set -euo pipefail

prompt_default() {
  local label="$1" default="$2" var
  read -r -p "$label [$default]: " var
  echo "${var:-$default}"
}

echo "▸ Kochbuch — TrueNAS-Wizard-Felder"
echo

POOL="$(prompt_default 'TrueNAS-Pool-Name' 'nvmedata')"
NAS_IP="$(prompt_default 'NAS-IP (LAN)' '192.168.178.42')"

if ! command -v openssl >/dev/null 2>&1; then
  echo "✗ openssl fehlt — bitte installieren oder AUTH_SECRET manuell setzen." >&2
  exit 1
fi
AUTH_SECRET="$(openssl rand -base64 32)"

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 TrueNAS Custom App  →  Wizard-Modus  →  folgende Felder ausfüllen:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Application Name      : kochbuch

─── Container Images ─────────────────────────────────────────────────────
Image Repository      : ghcr.io/starkstrom05/kochbuch
Image Tag             : latest
Image Pull Policy     : Only pull image if not present

─── Container Environment Variables ──────────────────────────────────────
DATABASE_URL          = file:/data/db/kochbuch.db
AUTH_SECRET           = $AUTH_SECRET
AUTH_URL              = http://$NAS_IP:3000
AUTH_TRUST_HOST       = true
UPLOAD_DIR            = /data/images
TZ                    = Europe/Berlin

─── Port Forwarding ──────────────────────────────────────────────────────
Container Port        : 3000   (TCP)
Node Port             : 3000

─── Storage ──────────────────────────────────────────────────────────────
Mount 1 (Datenbank)
  Type                : Host Path
  Host Path           : /mnt/$POOL/apps/kochbuch/db
  Mount Path          : /data/db
  Read Only           : aus

Mount 2 (Bilder)
  Type                : Host Path
  Host Path           : /mnt/$POOL/apps/kochbuch/images
  Mount Path          : /data/images
  Read Only           : aus

─── Resources (optional, empfohlen) ──────────────────────────────────────
Memory Limit          : 2GB
CPU Limit             : 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ Vor dem Klick auf Install in TrueNAS sicherstellen, dass die Datasets
  existieren:
    /mnt/$POOL/apps/kochbuch/db
    /mnt/$POOL/apps/kochbuch/images

▸ Nach erfolgreichem Container-Start einmalig den Default-Admin anlegen:
    TrueNAS-UI → Apps → Installed → kochbuch → ⋮ → Shell → eingeben:
        node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed.ts

▸ Login:
    http://$NAS_IP:3000
    admin@kochbuch.local  /  kochbuch     (unter /profil sofort ändern!)
EOF
