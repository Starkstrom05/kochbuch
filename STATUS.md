# Kochbuch — Session-Status

**Stand:** Mai 2026, v0.1.9 fixt verbleibenden Ollama-Runaway aus v0.1.8

## v0.1.9 Hotfix

v0.1.8 hat den Ollama-Hänger nur teilweise behoben. Live-Test mit
`scripts/repro-ollama-runaway.ts` auf dem NAS zeigte: nach Client-Abort
nach 90 s blieb der Ollama-Daemon weiter bei 394 % CPU für ~10 min.
Ursache: `stream: false` — Ollama antwortet erst nach kompletter
Generation, HTTP-Close vom Client schließt nur die Connection, der
Inferenz-Loop läuft aber bis num_predict erreicht ist.

Fix in v0.1.9: `stream: true` (Server merkt Connection-Close beim
nächsten Chunk-Write und stoppt sofort) + `num_predict: 512` (statt
2048 — ein Rezept-JSON braucht 200–400 Tokens, 512 sind komfortabel).

## Was steht

- Repo öffentlich auf GitHub: https://github.com/Starkstrom05/kochbuch
- Image in GHCR: `ghcr.io/starkstrom05/kochbuch:v0.1.7` (+ `:latest`)
- Läuft auf TrueNAS Scale (Pool `nvmedata`), erreichbar im LAN unter `http://<nas-ip>:3000`
- Phasen 0–7 + Buch-Modus + Deployment-Pipeline + 12 Review-Findings gefixt
- Tests grün: 40 Unit, 11 E2E, lokaler Container-Preflight für 17 kritische Module
- DB-Schema mit zwei Migrationen (init + recipe-Indizes), Admin-User `admin@kochbuch.local`, 15 Rewe-Rezepte importiert

## v0.1.8-Arbeit (im Branch / nicht released)

### Erledigt — Code

- ✅ **P1.1** Ollama-Fallback im Web-Import abgeschaltet → `NoStructuredRecipeError`
- ✅ **P1.2** Ollama-`num_predict: 2048` als hartes Token-Limit (verhindert Runaway-Schleifen). Repro-Skript unter `scripts/repro-ollama-runaway.ts`
- ✅ **P1.3** Puppeteer-Fallback in `lib/import/web.ts` (Chefkoch/Rewe/etc.), gemeinsamer Mutex mit PDF-Render unter `lib/puppeteer/queue.ts`
- ✅ **P2.1** Profil-Seite mit Passwort-Change (`/profil`, Zod-Schema, bcrypt, Re-Login nach Change)
- ✅ **P2.2** Cover-Backfill-Skript `scripts/backfill-covers.ts` (Puppeteer + JSON-LD / og:image → sharp → DB)
- ✅ **L1** Vorräte-Seite nutzt jetzt `EmptyState`
- ✅ **L2** Puppeteer-Sidecar als opt-in: `PUPPETEER_WS_URL`-Support in `lib/puppeteer/browser.ts`, `docker-compose.sidecar.yml`, `docs/PUPPETEER-SIDECAR.md`. Default-Verhalten unverändert (eingebautes Chromium)
- ✅ **L3** BuildKit-Cache-Mounts für `npm ci` (Build-Zeit lokal)

### Erledigt — Doku

- ✅ **M1 / P3.1-Doku** `docs/HTTPS-SETUP.md` (Tailscale + MagicDNS für iPad-PWA)
- ✅ **M2** `docs/AUTO-UPDATE.md` (Watchtower-Sidecar)
- ✅ `docs/TEST-PLAN-v0.1.8.md` mit konkreten manuellen Tests

### Offen — Live-Tests (auf NAS / iPad)

- ⏸ **P2.3** PDF-Export auf einem Rezept live testen
- ⏸ **P3.1-Setup** Tailscale auf NAS einrichten (Doku siehe `HTTPS-SETUP.md`)
- ⏸ **P3.2** Buch-Modus auf iPad mit Touch-Wischen + Audio
- ⏸ **P3.3** Handschrift-Canvas mit Apple Pencil
- ⏸ Reproduktion + Verifikation der Quick-Fixes auf NAS (siehe `TEST-PLAN-v0.1.8.md`)

## Bekannte Bugs / offene Punkte aus v0.1.7

### Kritisch (in v0.1.8 angegangen)

1. **Ollama-Runner hängt nach failed Chat-Call** → Quick-Fix via `num_predict`-Limit (P1.2). Dauer-Fix später, wenn nötig.
2. **Web-Import schlägt bei Cloudflare-protected Sites fehl** → Puppeteer-Fallback (P1.3).
3. **Profil-Seite fehlt** → erledigt (P2.1).

### Mittel (v0.2.x)

- Cover-Bilder Rewe-Import: Backfill-Skript geschrieben (P2.2), muss auf NAS laufen
- PWA auf iPad: Doku da (`HTTPS-SETUP.md`), Setup steht aus
- HotReload nach Tag-Push: Doku da (`AUTO-UPDATE.md`)

### Niedrig

- Image-Größe ~1.2 GB wegen Chromium — Sidecar-Variante opt-in verfügbar, Default-Build noch mit Chromium. Endgültiges Schrumpfen ist ein Breaking Change und kommt in v0.2.

## Wieder einsteigen

```bash
cd /home/jonas/Projekte/Kochbuch
git status               # ggf. uncommitted Änderungen von v0.1.8
docker stats --no-stream # auf dem NAS prüfen ob Ollama idle ist
```

**Nächste Schritte:**
1. Live-Tests laut `docs/TEST-PLAN-v0.1.8.md`
2. Bei grün: v0.1.8 taggen → GitHub Action baut + pusht Image
3. TrueNAS Custom App → Edit → Image-Tag → Save → Auto-Restart

Lokaler Dev-Server: `npm run dev` → http://localhost:3000 (eigene SQLite unter `prisma/dev.db` mit 15 Rezepten).
