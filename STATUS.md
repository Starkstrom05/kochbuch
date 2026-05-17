# Kochbuch — Session-Status

**Stand:** Mai 2026, v0.7.6 live (Family-Familienprojekt auf TrueNAS Scale).

## Wo es läuft

- Repo öffentlich: https://github.com/Starkstrom05/kochbuch
- Image in GHCR: `ghcr.io/starkstrom05/kochbuch:latest` (Tag `v0.7.6`)
- TrueNAS Scale auf TerraMaster F4-423 (Celeron N5095, 31 GiB RAM, keine GPU)
- LAN-Erreichbarkeit `http://<nas-ip>:3000`, HTTPS-Setup via Tailscale optional

## Aktuelle Funktionen

- **Rezepte**: Anlegen / Bearbeiten / Archiv, Bewertung, Multi-Image-Upload mit
  drag-and-drop-Reihenfolge, Apple-Pencil-Handschriftnotizen, Cover-Auto-
  Sepia-Filter.
- **Drei Listenansichten** (v0.6.4): Karten / Fotos / Liste — Toggle per
  Query-Param, behält Such- und Kategorie-Filter.
- **Web-Import**: Chefkoch, REWE (Cloudflare-Bot-Schutz via Puppeteer-
  Fallback), Koro (JSON-LD + DOM-Step-Fallback für defektes Schema),
  generische JSON-LD-Seiten inkl. verschachtelter `mainEntity`/`@graph`.
- **OCR-Import** für Foto-Aufnahmen.
- **Speiseplan**: Wochenpläne mit Mahlzeit-Slots, PDF-Export A4 quer,
  Übernahme in Einkaufsliste.
- **Einkaufsliste**: pro User, Konsolidierung über Rezepte, Abhaken,
  Drucken/Teilen.
- **Vorrat** (v0.7.0): Persistente Pantry-Tabelle, deterministischer Match
  gegen Rezepte (kein LLM mehr), Fuzzy-Substring auf Zutaten-Namen
  (v0.7.3: „Ketchup" matched „Tomatenketchup"). „Fehlende → Einkaufsliste".
- **Buch-Modus**: Pageflip-PWA mit Audio + Lightbox.
- **Share-Links**: Pro Rezept aktivierbarer Public-Token mit eigener
  PDF-Variante.
- **PWA**: iPad + iPhone, Safe-Area-Insets, ≥44 px Touch-Targets, Mobile-
  Burger-Header auf `/rezepte`.

## Sicherheitstand

Nach dem Review-Pass v0.7.4–v0.7.6 geschlossen:

- SSRF-Schutz auch im Web-Image-Download (vorher fehlte `assertPublicUrl`
  in `addImageFromUrl`).
- Pfad-Traversal `/api/images` jetzt per `path.resolve` + `startsWith`,
  nicht mehr String-Heuristik.
- Owner-Check auf `/api/images`: Recipe-Bilder sind nur sichtbar wenn
  Owner ODER `isPublic = true`. Internal-Token-Bypass für Puppeteer
  bleibt.
- IPv6-Unique-Local-Range (`fc00::/7`) wurde von der alten Heuristik
  durchgelassen — Fix per Regex-Pattern.
- 15 SSRF-Unit-Tests + 76 Tests gesamt.

## Bekannte Tech-Debt (akzeptiert)

- `src/components/oma/`-Designsystem-Ordner: alte Bezeichnung aus der
  Single-Maintainer-Phase, niemand sieht das im UI. Umbenennen wäre ein
  Massen-Import-Refactor ohne sichtbaren Nutzen.
- `next.config.ts` `images.remotePatterns: []` — wir nutzen `<img>` direkt
  statt `next/image` für externe URLs (Akamai-CDN-Embed-Politik). Der
  Image-Proxy unter `/api/image-proxy` löst das deterministisch.
- `STATUS.md` (diese Datei) wird gelegentlich nachgezogen, ist aber keine
  Wahrheitsquelle für Versionsstand — `package.json` ist's.

## Releasezyklus

SemVer strict; CLAUDE.md Release-Checkliste:

1. `package.json` bumpen (PATCH bei Bugfix, MINOR bei Feature, MAJOR bei
   breaking Migration).
2. `npm run typecheck && npm run test:run` grün.
3. Feature-Commit(s) + Release-Commit `chore(release): vX.Y.Z`.
4. `git tag vX.Y.Z && git push origin main vX.Y.Z` → GHCR-Workflow baut.
5. Auf NAS: `sudo docker pull ghcr.io/starkstrom05/kochbuch:latest` +
   Stop/Start in TrueNAS UI.
