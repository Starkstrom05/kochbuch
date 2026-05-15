#!/usr/bin/env bash
# =============================================================================
# Kochbuch — TrueNAS-Install-Helfer
# =============================================================================
#
# Fragt die drei Werte ab, die in der Compose-Datei eingesetzt werden müssen
# (Pool-Name, NAS-IP, AUTH_SECRET) und schreibt eine fertige YAML-Datei.
# Den Inhalt dieser Datei einfach in die TrueNAS-Custom-App-Maske kopieren.
#
# Aufruf:
#   bash scripts/install-truenas.sh                  # interaktiv
#   bash scripts/install-truenas.sh -o /tmp/k.yml    # in Datei statt stdout
#
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

TEMPLATE="docker-compose.truenas.yml"
OUT=""
NON_INTERACTIVE=0

while [ $# -gt 0 ]; do
  case "$1" in
    -o|--out)         OUT="$2"; shift 2 ;;
    -p|--pool)        POOL="$2"; NON_INTERACTIVE=1; shift 2 ;;
    -i|--ip)          NAS_IP="$2"; NON_INTERACTIVE=1; shift 2 ;;
    -s|--secret)      AUTH_SECRET="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Unbekanntes Argument: $1" >&2; exit 1 ;;
  esac
done

if [ ! -f "$TEMPLATE" ]; then
  echo "Fehler: $TEMPLATE nicht gefunden. Dieses Skript im Projekt-Root ausführen." >&2
  exit 1
fi

prompt_default() {
  local label="$1" default="$2" var
  if [ "$NON_INTERACTIVE" = "1" ]; then
    echo "$default"
    return
  fi
  read -r -p "$label [$default]: " var
  echo "${var:-$default}"
}

echo "▸ Kochbuch — TrueNAS-Install-Helfer"
echo

POOL="${POOL:-$(prompt_default 'TrueNAS-Pool-Name' 'nvmedata')}"
NAS_IP="${NAS_IP:-$(prompt_default 'NAS-IP (LAN)' '192.168.178.42')}"

if [ -z "${AUTH_SECRET:-}" ]; then
  if command -v openssl >/dev/null 2>&1; then
    AUTH_SECRET="$(openssl rand -base64 32)"
    echo "✓ AUTH_SECRET automatisch erzeugt (openssl)"
  else
    echo "✗ openssl fehlt — generiere selbst (z.B. via Python):" >&2
    echo "    python3 -c \"import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())\"" >&2
    echo "  und übergib via --secret '...'" >&2
    exit 1
  fi
fi

# Einsetzen — sed mit | als Delimiter, damit / im base64-Secret nicht stört.
RENDERED="$(
  sed \
    -e "s|<POOL>|$POOL|g" \
    -e "s|<NAS-IP>|$NAS_IP|g" \
    -e "s|<AUTH_SECRET>|$AUTH_SECRET|g" \
    "$TEMPLATE"
)"

if [ -n "$OUT" ]; then
  printf '%s\n' "$RENDERED" > "$OUT"
  echo
  echo "✓ Geschrieben nach: $OUT"
else
  echo
  echo "─── Compose-YAML (in TrueNAS Custom App einfügen) ──────────────────────"
  printf '%s\n' "$RENDERED"
  echo "─── Ende ───────────────────────────────────────────────────────────────"
fi

cat <<EOF

Nächste Schritte in TrueNAS:
  1. Datasets anlegen (falls noch nicht geschehen):
       /mnt/$POOL/apps/kochbuch/db
       /mnt/$POOL/apps/kochbuch/images
       /mnt/$POOL/apps/kochbuch/ollama
  2. Apps → Discover → Custom App → "Install via YAML" → obigen Block einfügen.
  3. Speichern, ca. 5–15 min auf das Modell-Pulldown warten.
  4. Browser:  http://$NAS_IP:3000
       Login:  admin@kochbuch.local  /  kochbuch   (sofort unter /profil ändern!)
EOF
