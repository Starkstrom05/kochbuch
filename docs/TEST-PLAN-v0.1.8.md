# Test-Plan v0.1.8

Manuelle Live-Tests, die auf NAS bzw. iPad ausgeführt werden müssen.
Die Code-Änderungen (P1.1–P2.2) sind erledigt; hier nur die Verifikation.

## NAS-Tests

### 1. Ollama-Runaway (P1.2) reproduzieren bzw. ausschließen

```bash
# auf NAS
docker exec -it kochbuch-app sh -lc '
  cd /app && node /app/node_modules/tsx/dist/cli.mjs /app/scripts/repro-ollama-runaway.ts
'

# parallel im zweiten Terminal:
docker stats kochbuch-ollama --no-stream
```

Erwartung mit `num_predict: 2048`:
- Call endet innerhalb ~90 s (entweder Schema-Failure oder Schema-OK).
- CPU des Ollama-Containers fällt nach Call zurück auf < 10 %.

Wenn CPU > 100 % länger als 2 min: weiter untersuchen, Ollama-Container neu starten.

### 2. Web-Import Chefkoch (P1.3)

1. App im Browser öffnen → `/rezepte/importieren`
2. URL z. B. `https://www.chefkoch.de/rezepte/8147381854...`
3. Erwartung: nach 5–15 s landet ein vorausgefülltes Editor-Formular auf der Seite. Method-Banner zeigt "Importiert via Schema.org".

Bei `NoStructuredRecipeError`: Fehlertext wird im UI angezeigt, kein Hänger.

### 3. Profil + Passwort-Change (P2.1)

1. Eingeloggt auf "Angemeldet als …"-Link klicken → `/profil`
2. Neues Passwort vergeben (>= 8 Zeichen, anders als altes)
3. Speichern → Login-Seite mit "Passwort geändert" sollte erscheinen
4. Mit neuem Passwort einloggen → klappt
5. Mit altem Passwort einloggen → "Anmeldung fehlgeschlagen"

### 4. Cover-Backfill (P2.2)

```bash
docker exec -it kochbuch-app sh -lc '
  cd /app && node /app/node_modules/tsx/dist/cli.mjs /app/scripts/backfill-covers.ts
'
```

Erwartung: für jedes Rezept mit `sourceUrl` und ohne `coverImagePath` wird ein Cover heruntergeladen. Rezeptliste zeigt danach Vorschau-Bilder.

### 5. PDF-Export (P2.3)

1. Auf einem beliebigen Rezept "PDF" anklicken
2. Erwartung: A5-PDF mit Rezept-Layout downloadt
3. Bei Fehler: Container-Logs `docker logs kochbuch-app | tail -100` prüfen, Puppeteer-Chromium-Status

## iPad-Tests (nach Tailscale-Setup, siehe `HTTPS-SETUP.md`)

### 6. PWA-Installation

1. Safari → `https://nas.<tailnet>.ts.net`
2. Teilen → Zum Home-Bildschirm → "Kochbuch" wird installiert
3. Vom Home-Bildschirm öffnen: läuft Standalone (keine Safari-URL-Bar)

### 7. Buch-Modus (P3.2)

1. Rezeptliste → "Als Buch lesen"
2. Touch-Wischen links/rechts → blättert
3. Audio (sofern aktiviert) spielt Schritt
4. Notieren: Latenz, Aussetzer, Layout-Brüche

### 8. Handschrift-Canvas (P3.3)

1. Beim Rezept-Anlegen oder -Bearbeiten Handschrift-Modus wählen
2. Mit Apple Pencil schreiben
3. Speichern → Wiederöffnen prüft Persist
4. Notieren: Latenz (gefühlt > 50 ms ist sichtbar), Druckempfindlichkeit, Radierer

## Abnahme

Wenn 1–4 grün: v0.1.8 als Patch-Release taggen. iPad-Tests können in v0.2.x folgen.
