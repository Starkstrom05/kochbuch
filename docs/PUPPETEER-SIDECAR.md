# Puppeteer als Sidecar-Container

Standard-Setup hat Chromium direkt im App-Image (~1.2 GB Gesamt). Optional kannst
du Chromium in einen eigenen **Browserless**-Container auslagern. Vorteile:

- App-Image schrumpft auf ~600–700 MB (kein Chromium-Layer mehr nötig)
- Browser-Pool wird sauberer verwaltet (kein OOM, kein zombie-runner)
- Wenn Browserless hängt, crasht es allein und wird neu gestartet — die App bleibt online
- PDF und Web-Import nutzen denselben Pool

Trade-off: ein zusätzlicher Container (Browserless braucht ~500–800 MB RAM).

## Wann lohnt sich das?

- ✅ Wenn die Image-Größe stört (langsame Pulls, knapper Disk-Space)
- ✅ Wenn der App-Container regelmäßig wegen Chromium-Crashs unstable wird
- ❌ Wenn dein NAS knapp an RAM ist (Browserless braucht ~1 GB extra)
- ❌ Für ein Single-Family-Setup ohne PDF-Last — Standard reicht da meist

## Code-Side: PUPPETEER_WS_URL

Wenn `PUPPETEER_WS_URL` als env gesetzt ist, ruft die App `puppeteer.connect()`
statt `puppeteer.launch()`. Drei Stellen profitieren:

- `lib/pdf/render.ts` (PDF-Export)
- `lib/import/web.ts` (Web-Import-Fallback)
- `scripts/backfill-covers.ts` (Cover-Backfill)

Ist die Variable nicht gesetzt, fällt alles auf den eingebauten Chromium-Launch
zurück — Standard-Verhalten unverändert.

## Setup mit Compose

1. **Token generieren:**
   ```bash
   openssl rand -hex 16
   ```
   In `.env` ablegen:
   ```bash
   BROWSERLESS_TOKEN=<deinTokenHier>
   ```

2. **Hochfahren mit Overlay:**
   ```bash
   docker compose \
     -f docker-compose.yml \
     -f docker-compose.sidecar.yml \
     up -d
   ```

3. **Smoketest:**
   ```bash
   docker exec -it kochbuch-app sh -lc \
     'curl -sI "$PUPPETEER_WS_URL" | head -5'
   ```
   Browserless antwortet mit HTTP 101 (WebSocket-Upgrade) bei korrektem Token.

## Setup auf TrueNAS Scale

Browserless als zweiten Custom-App-Eintrag laufen lassen oder direkt eine
modifizierte Variante von `docker-compose.truenas.yml` einsetzen (Service-Block
unten ergänzen):

```yaml
  browserless:
    image: ghcr.io/browserless/chromium:latest
    container_name: kochbuch-browserless
    restart: unless-stopped
    environment:
      TOKEN: "DEIN_TOKEN"
      CONCURRENT: "1"
      QUEUED: "5"
      TIMEOUT: "60000"
    mem_limit: 1g
```

Und beim `app`-Service:

```yaml
    environment:
      PUPPETEER_WS_URL: "ws://browserless:3000?token=DEIN_TOKEN"
    depends_on:
      browserless:
        condition: service_healthy
```

## Image ohne Chromium bauen (späterer Schritt)

Solange `PUPPETEER_WS_URL` immer gesetzt ist, kann der Runtime-Layer im
`Dockerfile` ohne `chromium`-Paket auskommen:

```diff
- RUN apt-get update && apt-get install -y --no-install-recommends \
-     chromium fonts-liberation fonts-noto-color-emoji \
-     openssl ca-certificates dumb-init wget \
-     && rm -rf /var/lib/apt/lists/*
+ RUN apt-get update && apt-get install -y --no-install-recommends \
+     fonts-noto-color-emoji \
+     openssl ca-certificates dumb-init wget \
+     && rm -rf /var/lib/apt/lists/*
```

Aber: das ist **breaking** für alle, die ohne Sidecar deployen. Erst nach
ausreichend Live-Test (am besten v0.2.0 mit Migrations-Doku).

## Fehlerbilder

- **`Failed to launch the browser process`** bei gesetzter `PUPPETEER_WS_URL`:
  WS-URL/Token falsch — `docker logs kochbuch-browserless` prüfen.
- **App startet vor Browserless:** healthcheck + `depends_on: service_healthy`
  sollten das verhindern, beim ersten Pull kann der Healthcheck aber 30+ s brauchen.
- **`net::ERR_BLOCKED_BY_RESPONSE` bei PDF-Render:** Internal-URL ist `localhost`
  innerhalb des App-Containers — Browserless im Sidecar kann das nicht erreichen.
  Lösung: `APP_URL` in `app.environment` auf `http://app:3000` setzen, damit
  Browserless den Container-Hostnamen nutzt.
