# Kochbuch — Session-Status

**Stand:** Mai 2026, v0.20.0 (Familienprojekt auf TrueNAS Scale).

## Wo es läuft

- Repo öffentlich: https://github.com/Starkstrom05/kochbuch
- Image in GHCR: `ghcr.io/starkstrom05/kochbuch:latest` (Tag `v0.20.0`)
- TrueNAS Scale auf TerraMaster F4-423 (Celeron N5095, 31 GiB RAM, keine GPU)
- LAN-Erreichbarkeit `http://<nas-ip>:3000`, HTTPS-Setup via Tailscale optional
  (siehe `docs/HTTPS-SETUP.md` — behebt den Secure-Context für Teilen/Clipboard)

## Aktuelle Funktionen

- **Rezepte**: Anlegen / Bearbeiten / Archiv, Bewertung, Multi-Image-Upload mit
  drag-and-drop-Reihenfolge, Apple-Pencil-Handschriftnotizen, Cover-Auto-
  Sepia-Filter.
- **Strukturierte Schritte + Koch-/Timer-Modus** (v0.8.0): `RecipeStep`-Model
  mit Dauer-Feld; Vollbild-Schritt-für-Schritt-Ansicht mit Timern pro Schritt,
  Wake-Lock, Alarm. Bestandsrezepte fallen lazy aus `instructions` zurück.
- **Drei Listenansichten** (v0.6.4): Karten / Fotos / Liste — Toggle per
  Query-Param, behält Such- und Kategorie-Filter. Fotos/Liste laden Thumbnails
  (v0.17.2), nicht die Vollbilder.
- **Mengenskalierung** (v0.10.0): Portionen-Stepper mit Live-Skalierung auf
  Detail-, Druck-, PDF- und Buch-Ansicht; Auswahl via `?servings`-URL teilbar
  und in `localStorage` je Rezept gemerkt.
- **Nährwerte** (v0.13.0): hybrid — auto aus lokaler Zutaten-Tabelle (~50
  Zutaten geseedet, Volumen→Masse via Dichte) + pro Rezept manuell übersteuerbar,
  reagiert auf die Portionswahl.
- **Web-Import**: Chefkoch, REWE (Cloudflare-Bot-Schutz via Puppeteer-
  Fallback), Koro (JSON-LD + DOM-Step-Fallback für defektes Schema),
  generische JSON-LD-Seiten inkl. verschachtelter `mainEntity`/`@graph`.
- **OCR-Import** für Foto-Aufnahmen.
- **Backup** (v0.12.0): Voll-Export/Import aller Rezepte inkl. Bilder als ZIP
  (jszip), Admin-UI im Profil — Datensicherung unabhängig vom NAS-Snapshot.
- **Speiseplan**: Wochenpläne mit Mahlzeit-Slots, PDF-Export A4 quer,
  Übernahme in Einkaufsliste; optional familien-geteilt (v0.15.0).
- **Einkaufsliste**: pro User, Konsolidierung über Rezepte, Abhaken
  (Erledigte sortieren nach unten), Drucken/Teilen mit Insecure-Context-Fallback.
- **OurGroceries-Brücke** (v0.19.0): Opt-In-Direkt-Export der Einkaufsliste in
  die OurGroceries-App. Per-User-Credentials AES-256-GCM-verschlüsselt (Key aus
  `OURGROCERIES_ENCRYPTION_KEY`); Modul ist ohne Key deaktiviert. Teilen-Menü
  bietet Klartext / OurGroceries / CSV-Download (Fallback). **Bewusste Ausnahme
  vom Lokal-First-Prinzip** (siehe `CLAUDE.md`) — Items werden an
  `ourgroceries.com` (USA) übertragen, nur wenn der User aktiv verbindet.
  Reverse-engineerte API; mittleres Wartungsrisiko, automatischer CSV-Fallback
  bei API-Bruch. E2E-Test mit Mock-Server bewusst zurückgestellt (manuelle
  Verifikation via Setup-Seite + Push-Knopf).
- **Vorrat** (v0.7.0): Persistente Pantry-Tabelle, deterministischer Match
  gegen Rezepte (kein LLM mehr), Fuzzy-Substring auf Zutaten-Namen
  (v0.7.3: „Ketchup" matched „Tomatenketchup"). „Fehlende → Einkaufsliste".
- **Multi-Family** (v0.14.0–v0.16.0): mehrere Familien teilen einen gemeinsamen
  Rezept-Pool (`visibility = SHARED`) und haben zugleich familien-private
  Inhalte (`FAMILY`); eigene Kategorien, Nutzerverwaltung pro Familie und
  volles Branding (Name + Theme-Farben paper/ink/ribbon/sepia inkl. Ornamente).
- **Buch-Modus**: Pageflip-PWA mit Audio + Lightbox.
- **Share-Links**: Pro Rezept aktivierbarer Public-Token mit eigener
  PDF-Variante.
- **Auto-Update-Banner** (gefixt v0.17.1): vergleicht `package.json`-Version mit
  der GitHub-Releases-API (24 h-Cache); erscheint app-weit bei verfügbarem Update.
- **PWA**: iPad + iPhone, Safe-Area-Insets, ≥44 px Touch-Targets, Mobile-
  Burger-Header; Offline-Fallback-Seite + Service-Worker-Precache (v0.11.0).

## Sicherheitstand

Aus dem Review-Pass v0.7.4–v0.7.6:

- SSRF-Schutz auch im Web-Image-Download (`assertPublicUrl` in `addImageFromUrl`).
- Pfad-Traversal `/api/images` per `path.resolve` + `startsWith`.
- IPv6-Unique-Local-Range (`fc00::/7`) per Regex-Pattern blockiert.

Seit Multi-Family (v0.14.0):

- Sichtbarkeits-/Tenancy-Filter überall in der `where`-Klausel: ein Rezept ist
  sichtbar bei `visibility = SHARED` **oder** gleicher Family. Greift in
  Suche, Detail, Buch, Pantry-Match, Print/PDF.
- `/api/images`: Bild sichtbar bei `isPublic`, sonst eingeloggt **und**
  (SHARED **oder** gleiche Family). Internal-Token-Bypass für Puppeteer bleibt.
  Anonyme `/api/images`-Requests werden schon in `proxy.ts` mit 401 geblockt.
- Testabdeckung: 121 Unit-Tests + 13 E2E (Playwright).

## Entwicklung / CI

- **Pre-commit-Hook** (Husky + lint-staged): `eslint --fix` + `prettier` auf
  staged Files, plus voller `tsc --noEmit` — blockt Commits mit Lint-/Typfehlern.
- **CI** (`.github/workflows/ci.yml`): typecheck → lint → Unit-Tests, dann
  E2E (migrate + seed + Playwright). Alle Actions auf Node-24-Runtimes.

## Bekannte Tech-Debt (akzeptiert)

- `src/components/oma/`-Designsystem-Ordner: alte Bezeichnung aus der
  Single-Maintainer-Phase, niemand sieht das im UI. Umbenennen wäre ein
  Massen-Import-Refactor ohne sichtbaren Nutzen.
- `next.config.ts` `images.remotePatterns: []` — wir nutzen `<img>` direkt
  statt `next/image` für externe URLs (Akamai-CDN-Embed-Politik). Der
  Image-Proxy unter `/api/image-proxy` löst das deterministisch.
- **Dep-Upgrades vertagt:** ESLint 9→10 ist extern blockiert (eslint-plugin-react
  unterstützt nur eslint ≤9.7); Prisma 6→7 verlangt einen Driver-Adapter-Umbau
  (better-sqlite3 + `prisma.config.ts` + Docker native-build) — eigener Schritt.
- **Puppeteer-Sidecar**: `docker-compose.truenas-sidecar.yml` vorbereitet (lagert
  Chromium-RAM aus), aber noch nicht auf dem NAS ausgerollt. Siehe
  `docs/PUPPETEER-SIDECAR.md`.
- `STATUS.md` (diese Datei) wird gelegentlich nachgezogen, ist aber keine
  Wahrheitsquelle für Versionsstand — `package.json` ist's.

## Releasezyklus

SemVer strict; CLAUDE.md Release-Checkliste:

1. `package.json` bumpen (PATCH bei Bugfix, MINOR bei Feature, MAJOR bei
   breaking Migration).
2. `npm run typecheck && npm run test:run` grün (lokal zusätzlich vom
   Pre-commit-Hook erzwungen).
3. Feature-Commit(s) + Release-Commit `chore(release): vX.Y.Z`.
4. `git tag vX.Y.Z && git push origin main vX.Y.Z` → GHCR-Workflow baut.
5. Auf NAS: `sudo docker pull ghcr.io/starkstrom05/kochbuch:latest` +
   Stop/Start in TrueNAS UI.
