# Kochbuch — Session-Status

**Stand:** Mai 2026, nach erstem TrueNAS-Deploy

## Was steht

- Repo öffentlich auf GitHub: https://github.com/Starkstrom05/kochbuch
- Image in GHCR: `ghcr.io/starkstrom05/kochbuch:v0.1.7` (+ `:latest`)
- Läuft auf TrueNAS Scale (Pool `nvmedata`), erreichbar im LAN unter `http://<nas-ip>:3000`
- Phasen 0–7 + Buch-Modus + Deployment-Pipeline + 12 Review-Findings gefixt
- Tests grün: 31 Unit, 11 E2E, lokaler Container-Preflight für 17 kritische Module
- DB-Schema mit zwei Migrationen (init + recipe-Indizes), Admin-User `admin@kochbuch.local` (PW geändert via CLI-Workaround), 15 Rewe-Rezepte importiert

## Live-Tests bisher durchgeführt

- ✅ Login funktioniert
- ✅ Rezeptliste rendert mit Oma-Design
- ✅ Massen-Import von Rewe (15 Rezepte) via Puppeteer-Skript
- ❌ Cover-Bilder fehlen (Skript holt sie nicht)
- ❌ Web-Import via UI (Chefkoch) hat Ollama-Fallback ausgelöst → CPU bei 377 % stehengeblieben, Restart-Bedarf
- ⏸ PDF-Export noch nicht getestet
- ⏸ Buch-Modus auf iPad noch nicht getestet
- ⏸ Einkaufsliste-Workflow noch nicht durchprobiert

## Bekannte Bugs / offene Punkte

### Kritisch (in v0.1.8 angehen)

1. **Ollama-Runner hängt nach failed Chat-Call** (377 % CPU dauerhaft).
   - Verdacht: phi3 verarbeitet Cloudflare-Müll-HTML, llama-Runner-Prozess geht in Endlosschleife
   - Quick-Fix: Bei kaputtem JSON-LD Ollama-Fallback abschalten, klare Fehlermeldung zurück
   - Dauer-Fix: Ollama-Healthcheck nach jedem Call, Restart-Sentinel
2. **Web-Import schlägt bei Cloudflare-protected Sites fehl** (Chefkoch, Rewe, …).
   - JSON-LD-Parse läuft, aber wenn Site blockt, hängt der Ollama-Fallback
   - Fix: Puppeteer-Fallback in `lib/import/web.ts` einbauen (analog zu `scripts/import-rewe-recipes.ts`)
3. **Profil-Seite fehlt komplett** — kein Passwort-Change-UI, kein User-Management.
   - Quick-Fix: Profile-Page mit PW-Änderung. Ggf. später Familienmitglieder einladen.

### Mittel (v0.2.x)

4. **Cover-Bilder bei Rewe-Import** — Backfill-Skript schreiben das `sourceUrl` öffnet, Bild aus JSON-LD zieht, via sharp speichert.
5. **PWA auf iPad** geht nur über HTTPS. Tailscale + MagicDNS gibt kostenlos `*.ts.net`-Cert. Setup-Anleitung dazu schreiben.
6. **HotReload nach Tag-Push** — TrueNAS Custom App pullt nicht automatisch, immer Edit + Save. Watchtower-Container als Sidecar dokumentieren.

### Niedrig

7. **Vorräte-Seite** nutzt nicht `EmptyState`-Komponente (Inkonsistenz aus Code-Review).
8. **Image-Größe** ~1.2 GB wegen Chromium. v0.2 evtl. Puppeteer in Sidecar-Container auslagern.
9. **Migrate-Builds dauern 5–7 min** wegen Chromium-Install + Push. Bei stabilem Dockerfile sind's 1–2 min.

## Versions-Historie heute

| Tag | Was |
|---|---|
| v0.1.0 | Initial Release-Versuch — gescheitert |
| v0.1.1 | Phasen 1–7, Buch-Modus, Review-Fixes |
| v0.1.2 | Prisma libssl + entrypoint user-home |
| v0.1.3 | Prisma WASM-Lookup via direkter Pfad |
| v0.1.4 | `@esbuild/linux-x64` ins Image |
| v0.1.5 | `outputFileTracingIncludes` für puppeteer + bcryptjs |
| v0.1.6 | Puppeteer transitive deps explizit |
| **v0.1.7** | **prod-deps stage** — finale Lösung gegen Tracing-Lücken, lokal verifiziert ✓ |

## Plan für nächste Session

**Priorität 1 (Stabilität):**
- [ ] Ollama-Fallback abschalten bei fehlendem JSON-LD → klare Fehlermeldung im UI
- [ ] Untersuchen wieso Ollama nach Fehler weiter rechnet (separate Reproduktion)
- [ ] Puppeteer-Fallback in `lib/import/web.ts` einbauen → Chefkoch/Rewe via UI importierbar

**Priorität 2 (UX):**
- [ ] Profil-Seite mit Passwort-Change
- [ ] Cover-Backfill-Skript für die 15 importierten Rezepte
- [ ] PDF-Export auf einem Rezept live testen

**Priorität 3 (iPad-Test):**
- [ ] Tailscale auf NAS einrichten → HTTPS-URL → PWA-Installation testen
- [ ] Buch-Modus mit Touch-Wischen + Audio
- [ ] Handschrift-Canvas mit Apple Pencil

## Wieder einsteigen

```bash
cd /home/jonas/Projekte/Kochbuch
git status               # main, sauber, v0.1.7 deployed
docker stats --no-stream # auf dem NAS prüfen ob Ollama jetzt idle ist
```

Lokaler Dev-Server: `npm run dev` → http://localhost:3000 (eigene SQLite unter `prisma/dev.db` mit 15 Rezepten).
