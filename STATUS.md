# Kochbuch — Session-Status

**Stand:** Mai 2026, v0.28.0 (Familienprojekt auf TrueNAS Scale).

## Wo es läuft

- Repo öffentlich: https://github.com/Starkstrom05/kochbuch
- Image in GHCR: `ghcr.io/starkstrom05/kochbuch:latest` (Tag `v0.28.0`)
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
- **Einkaufsliste**: Konsolidierung über Rezepte, Abhaken (Erledigte sortieren
  nach unten), Drucken/Teilen mit Insecure-Context-Fallback. Stark ausgebaut in
  v0.23–v0.28 (OurGroceries-inspiriert):
  - **Gang-Sortierung** (v0.23.0): Items nach `Ingredient.category` gruppiert
    (Supermarkt-Laufreihenfolge, „Sonstiges" unten); Kategorie zur Lesezeit per
    Namens-Lookup, keine Migration.
  - **Auto-Complete + Mengen-Merge** (v0.23.0): Zutat-Vorschläge aus der
    Stammdaten-Tabelle; gleiche, offene Items werden mengenmäßig zusammengeführt
    (`planManualMerge`, reuse `addAmounts`) statt dupliziert.
  - **Master-List „Häufig gekauft"** (v0.24.0): pro User aggregierte Historie
    (`FrequentItem`), häufigste als 1-Tap-Chips, schon Gelistetes ausgeblendet.
  - **Item-Notizen** (v0.25.0): `ShoppingItem.note`, inline editierbar.
  - **Geteilte Listen** (v0.26.0–v0.27.0): eigenständig pro Liste freigebbar
    (`ShoppingListAccess`, analog `CookbookAccess`). Mitglieder haben **volle
    Bearbeitung**, nur Owner/Admin verwalten Freigaben + löschen
    (`canAccessShoppingList`/`canManageShoppingList` in `src/lib/shopping/permissions.ts`).
    Inline-ShareManager auf der Listenseite + Übersicht `/einkaufsliste/uebersicht`
    (eigene + geteilte).
  - **Live-Update** (v0.28.0): NAS-schonendes 15s-Polling eines Versionsstempels
    (`ShoppingList.updatedAt` via `touchList`, Endpoint `/api/shopping-list/[id]/version`);
    pausiert bei `document.hidden`, lädt nur bei Änderung neu, 404→redirect,
    Render-Phase-Resync ohne optimistische Edits zu zerstören.
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
- **Multi-Cookbook** (v0.22.0): jeder User besitzt 1+ eigene Kochbuecher (mit
  Name + Branding), Lese-Freigaben pro Buch (Owner oder Admin vergibt), eigener
  Switcher im Header. Schreibrechte: Cookbook-Owner ODER Admin. Rezepte aus
  fremden Buechern lassen sich per Button ins eigene importieren (Vollkopie
  inkl. Bilder, Quellen-Vermerk bleibt am importierten Rezept). Listen und
  Suche sind strikt aufs aktive Buch gefiltert. Loest das alte SHARED/FAMILY-
  Visibility-Modell vollstaendig ab (`Recipe.familyId` + `Recipe.visibility`
  gedroppt, `Recipe.cookbookId` ist Pflichtfeld). Backfill laeuft automatisch
  beim Container-Start; bestehende Familie bleibt als reine Nutzer-Gruppierung
  fuer Category-Scoping und Branding-Reste erhalten.
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

Seit Multi-Cookbook (v0.22.0):

- Sichtbarkeits-/Tenancy-Filter ueberall in der `where`-Klausel: ein Rezept ist
  sichtbar, wenn es zum aktiven Cookbook gehoert (`visibleInCookbook` in
  `src/lib/cookbooks/visibility.ts`). Detail-Endpoint prueft zusaetzlich
  `canReadRecipe` (Owner/Viewer/Admin) — relevant fuer direkte Slug-Aufrufe
  ueber den Cookbook-Wechsel hinweg.
- Schreib-Permissions ueber `canWriteRecipe` (Cookbook-Owner ODER Admin).
  Greift in `updateRecipe`, `deactivateRecipe`, `restoreRecipe`,
  `permanentlyDeleteRecipe` und im UI (Edit-Buttons, Zeichnen-Seite).
- `/api/images`: Bild sichtbar bei `isPublic`, sonst eingeloggt **und**
  Lese-Berechtigung aufs Cookbook. Internal-Token-Bypass fuer Puppeteer
  bleibt. Anonyme `/api/images`-Requests werden weiterhin in `proxy.ts` mit
  401 geblockt.

Aus dem Review-Pass v0.22.3 – v0.22.11 (Sicherheits-/Performance-Sweep):

- **Cookbook-Permissions** an allen Server-Action-/API-Grenzen durchgezogen
  (`rateRecipe`, `addRecipeToList`, `addMissingToList`, `addMealEntry`,
  `share-action`, `handwritten`). Schliesst Pfade, ueber die per Recipe-ID-
  Guess Titel/Zutaten aus fremden Cookbooks exfiltriert werden konnten.
- **Speiseplan-Picker** + Speiseplan-Sharing folgen dem Cookbook-Sharing-Graphen
  statt der seit v0.22 faktisch toten `User.familyId`.
- **Image-Import** mit `Content-Length`-Cap + Streaming-Limit + manuellem
  Redirect-Reject; Web-Import mit Hop-Counter; image-proxy lehnt 30x ab.
- **Quotas + Zod-Validierung** an allen offenen Server-Action-Grenzen
  (Einkaufsliste, Vorraete, Speiseplan, Admin); Cookbook-Quota auf 20/User.
- **SQLite WAL** + `busy_timeout` aktiv — kein `SQLITE_BUSY` mehr zwischen
  PDF-Renderer und Save.
- **Tesseract-Worker** als Singleton mit Mutex (statt Sprachpaket-Neuladen).
- **Ollama-Retries** auf 2 statt 3 gedeckelt; **JSON-LD-Wait** statt 3 s
  pauschal beim Web-Import.
- **OmaDialog** als zentraler a11y-Wrapper mit Focus-Trap/Escape/Body-Scroll-
  Lock; ersetzt `window.confirm/alert` an allen Stellen.
- **FTS5-Volltextsuche** (v0.22.11) loest die 5x-LIKE-Klauseln ab.

### Testabdeckung

- **253 Unit-Tests** (vorher 222): zusätzlich Einkaufslisten-Logik
  (`consolidate`/`merge`/`aisles`/`master-list`) und Shopping-Permissions
  (`decideAccessShoppingList`/`decideManageShoppingList`).
- **13 E2E** (Playwright) unveraendert. Sharing + Live-Update wurden manuell per
  Playwright-Skript verifiziert (zwei User/Kontexte), keine festen E2E-Specs dafür.

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
- **Dep-Upgrades:** Prisma 6→7 erledigt (7.8.0, better-sqlite3-Adapter +
  `prisma.config.ts`). ESLint 9→10 weiterhin extern blockiert (eslint-plugin-react
  unterstützt nur eslint ≤9.7).
- **Einkaufslisten-Sharing (bewusste Grenzen):** „Rezept/Fehlende → Liste"
  schreibt immer in die _eigene_ (ggf. neu angelegte) Liste, nicht in eine
  geteilte (kein Ziel-Listen-Selektor). `FrequentItem` bleibt pro User — die
  „Häufig gekauft"-Vorschläge unterscheiden sich also je Betrachter.
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
