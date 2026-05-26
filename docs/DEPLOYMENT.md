# Deployment — Kochbuch

Einstiegs-Doku fuer das Selbsthosten auf TrueNAS Scale (oder vergleichbarem
Docker-Host). Die Tiefen-Dokumente fuer Spezialfaelle (Ollama, HTTPS, Puppeteer-
Sidecar, Auto-Update) sind unten verlinkt — diese Datei ist die Landeseite.

---

## Schnellueberblick

| Aspekt             | Wert                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| Container-Registry | `ghcr.io/starkstrom05/kochbuch` (public)                                     |
| Standard-Tag       | `latest` (oder spezifisches `v0.X.Y`)                                        |
| Architektur        | linux/amd64 (TerraMaster x86, kein arm64 gebaut)                             |
| Persistenz         | SQLite-DB + Bild-Verzeichnis, beides via Bind-Mounts auf das TrueNAS-Dataset |
| Port               | 3000 (LAN-intern; HTTPS via Reverse-Proxy/Tailscale optional)                |
| Auth               | NextAuth v5, Credentials Provider, Cookie-Sessions                           |
| RAM-Bedarf         | App: ~2 GiB Limit; Ollama (optional): +2–4 GiB                               |

---

## Erst-Installation

Zwei Pfade. **Empfehlung:** Wizard, weil simpler.

### Pfad A — TrueNAS-Wizard (Custom App)

Single-Container-Setup ueber das TrueNAS-Apps-Formular, **ohne Ollama**. Web-Import
ohne KI-Fallback. Schnellster Weg.

Detail: [`docs/INSTALL-TRUENAS-WIZARD.md`](./INSTALL-TRUENAS-WIZARD.md)

Kurz:

1. App-Catalog → **Custom App** → Name `kochbuch`
2. Image: `ghcr.io/starkstrom05/kochbuch:latest`
3. Ports: Container 3000 → Node 3000
4. Volumes: zwei Bind-Mounts (siehe `docs/INSTALL-TRUENAS-WIZARD.md` Schritt 4)
5. Env-Variablen (siehe Tabelle unten)
6. Apply → die App startet, Datenbank-Migrationen laufen automatisch im
   `app-init`-Container

Ollama nachruesten geht jederzeit: [`docs/OLLAMA-NACHRUESTEN.md`](./OLLAMA-NACHRUESTEN.md)

### Pfad B — YAML-Compose (mit Ollama)

YAML-basiertes Setup mit lokalem Ollama-Container fuer KI-gestuetzten Web-Import.
Mehr Kontrolle, mehr Aufwand.

Detail: [`docs/INSTALL-TRUENAS.md`](./INSTALL-TRUENAS.md)

---

## Environment-Variablen

| Variable                      | Pflicht  | Default                             | Zweck                                                                                                                                                                                                      |
| ----------------------------- | -------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                | ✓        | `file:./prisma/dev.db`              | SQLite-Pfad. Im Container typisch `file:/data/db/kochbuch.db`.                                                                                                                                             |
| `AUTH_SECRET`                 | ✓        | —                                   | NextAuth-Cookie-Verschluesselung. Generieren: `openssl rand -base64 32`.                                                                                                                                   |
| `AUTH_URL`                    | ✓        | `http://localhost:3000`             | Externe App-URL (LAN-IP oder Tailscale-Host).                                                                                                                                                              |
| `AUTH_TRUST_HOST`             | ✓        | `true`                              | Hinter Reverse-Proxy auf `true` lassen.                                                                                                                                                                    |
| `UPLOAD_DIR`                  | ✓        | `./uploads`                         | Container-Pfad fuer Bilder. Bind-Mount auf TrueNAS-Dataset.                                                                                                                                                |
| `KOCHBUCH_SKIP_SEED`          | optional | —                                   | `1` setzen, wenn der `app-init`-Container keinen Seed laufen soll (z.B. nach Erst-Migration).                                                                                                              |
| `OURGROCERIES_ENCRYPTION_KEY` | optional | —                                   | Aktiviert die OurGroceries-Bruecke ([CHANGELOG v0.19.0](../CHANGELOG.md)). 32 Bytes Base64. Ohne Schluessel ist das Modul deaktiviert. **Bei Verlust sind hinterlegte OG-Credentials unentschluesselbar.** |
| `OLLAMA_BASE_URL`             | optional | `http://localhost:11434`            | URL eines lokalen Ollama-Servers fuer den KI-Import. Ohne den ist der Import nur als Cloudflare-tolerantes Web-Scraping verfuegbar (kein LLM-Fallback).                                                    |
| `OLLAMA_MODEL`                | optional | `phi3:3.8b-mini-4k-instruct-q4_K_M` | Modell-ID. NAS-CPU schwach → kleines Modell waehlen.                                                                                                                                                       |
| `PUPPETEER_EXECUTABLE_PATH`   | optional | —                                   | Pfad zum Chromium-Binary im Container (typisch `/usr/bin/chromium`). Nur setzen, wenn nicht das mitgelieferte Chromium genutzt werden soll.                                                                |
| `PUPPETEER_WS_URL`            | optional | —                                   | WebSocket-URL eines Browserless-Sidecars. Setzt den lokalen Chromium-Pfad ausser Kraft. Siehe [PUPPETEER-SIDECAR.md](./PUPPETEER-SIDECAR.md).                                                              |
| `APP_URL`                     | optional | —                                   | Interne App-URL fuer den Puppeteer-PDF-Renderer (typisch `http://app:3000` im Compose-Netzwerk).                                                                                                           |
| `KOCHBUCH_VERSION`            | optional | —                                   | Override fuer die App-Version. Normalerweise wird die Version aus `package.json` gelesen — nicht setzen, ausser fuer Debugging.                                                                            |

---

## Update-Prozedur

Image-Tag im Compose ist `latest` (Tag-Override in TrueNAS-UI funktioniert nicht
zuverlaessig, siehe [reference_truenas_update](../README.md)). Nach jedem Release:

**Manuell** (Standard):

```bash
sudo docker pull ghcr.io/starkstrom05/kochbuch:latest
```

Dann **TrueNAS → Apps → Kochbuch → Stop → Start**.

**Automatisiert** mit Watchtower-Sidecar: [`docs/AUTO-UPDATE.md`](./AUTO-UPDATE.md).

Migrationen werden beim Start automatisch via `prisma migrate deploy` im
`app-init`-Container angewandt — kein manueller Eingriff noetig.

Die [`CHANGELOG.md`](../CHANGELOG.md) listet pro Version, was sich geaendert hat.
Innerhalb der App zeigt der Whats-New-Drawer die Notes automatisch beim ersten
Besuch nach einem Update an.

---

## Backup / Restore

Volle Datensicherung unabhaengig vom NAS-Snapshot:

1. App ist eingeloggt mit einem **Admin-Account**
2. `/profil` → Abschnitt **Backup** → **Export herunterladen**
3. ZIP-Archiv enthaelt `backup.json` (alle Rezepte mit Zutaten, Schritten,
   Naehrwerten, Speiseplaenen, Vorraeten, Einkaufslisten) + alle Bild-Dateien

Restore: gleiche Stelle, **Import** mit Mode `skip` (default; ueberspringt
bestehende Rezepte mit gleicher Slug-Spalte) oder `duplicate` (legt Kopien an).

**Was NICHT im Backup ist:**

- Auth-Sessions (man muss sich neu einloggen)
- Verschluesselte OurGroceries-Credentials (kommt aus der DB-Datei; wenn die
  ueberspielt wird, klappt auch das — siehe naechsten Punkt)

Empfehlung zusaetzlich: TrueNAS-Snapshots auf das Dataset
`/mnt/<pool>/apps/kochbuch/db` (SQLite-Datei) plus
`/mnt/<pool>/apps/kochbuch/images` — das ist das robusteste Restore-Verfahren
und enthaelt auch die OurGroceries-Credentials.

---

## HTTPS

Im LAN per HTTP reicht oft. Wenn du auf dem iPad die Web-Share-API oder die
Clipboard-API brauchst, ist ein **Secure Context** Pflicht — sprich HTTPS.

Empfohlener Weg: **Tailscale** + MagicDNS + Let's Encrypt.
Detail: [`docs/HTTPS-SETUP.md`](./HTTPS-SETUP.md).

---

## Add-Ons

### Ollama (lokales LLM fuer Web-Import)

Wenn beim Web-Import die JSON-LD-Strukturen fehlen, faellt das Modul auf
Ollama zurueck und parsed mit einem kleinen LLM. Detail:
[`docs/OLLAMA-NACHRUESTEN.md`](./OLLAMA-NACHRUESTEN.md).

### Puppeteer-Sidecar (Browserless)

Wenn der App-Container OOM-Killed wird, weil Chromium zu hungrig ist: ein
externer Browserless-Container nimmt das Rendering ab. Detail:
[`docs/PUPPETEER-SIDECAR.md`](./PUPPETEER-SIDECAR.md).

---

## Troubleshooting

- **`prisma migrate deploy` schlaegt fehl** → Container-Logs des `app-init`
  pruefen (`docker logs kochbuch-app-init`). Typische Ursachen: `DATABASE_URL`
  zeigt auf einen nicht-existenten Pfad, oder das Volume ist read-only gemountet.
- **Update-Banner kommt nicht** → der Banner braucht **einen Browser-Aufruf**,
  um den Versions-Check anzustossen ([CHANGELOG v0.17.1](../CHANGELOG.md)).
  Nach `docker pull` einmal die App im Browser oeffnen.
- **OurGroceries-Modul „nicht aktiviert"** → `OURGROCERIES_ENCRYPTION_KEY`
  fehlt im Container-Env. Setzen, neu starten.
- **Whats-New-Drawer oeffnet nicht** → `CHANGELOG.md` fehlt im Image (sollte ab
  v0.20.0 via `outputFileTracingIncludes` automatisch dabei sein). Pruefen mit
  `docker exec kochbuch-app ls -la /app/CHANGELOG.md`.
