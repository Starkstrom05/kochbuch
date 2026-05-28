# Changelog

Alle nennenswerten Änderungen am Familien-Kochbuch.

Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/);
Versionsschema [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [0.27.0] — 2026-05-28

### Hinzugefuegt

- **Einkaufslisten teilen** — Owner (oder Admin) können eine Liste direkt auf
  der Listenseite für Familienmitglieder freigeben (anzeigen/vergeben/entziehen,
  Liste löschen). Freigegebene Mitglieder haben **volle Bearbeitung**.
- **Listen-Übersicht** unter „Alle Listen" (`/einkaufsliste/uebersicht`): eigene
  und mit einem geteilte Listen mit Eintrags-Anzahl — behebt den bisher ins
  Leere führenden „Alle Listen"-Link.

## [0.26.0] — 2026-05-28

### Geaendert (Fundament fuer geteilte Einkaufslisten)

- **Berechtigungsmodell der Einkaufsliste** auf ein Sharing-faehiges Fundament
  umgestellt: neue Tabelle `ShoppingListAccess` (analog `CookbookAccess`) und
  zentrale Permission-Helper (`canAccessShoppingList`/`canManageShoppingList`).
  Alle Listen-Actions und Export-Routes pruefen jetzt Zugriff statt nur
  Owner-Identitaet. **Verhaltensneutral** — ohne vergebene Freigaben bleibt
  alles wie bisher; die Freigabe-UI folgt in der naechsten Version. Additive
  Migration.

## [0.25.0] — 2026-05-28

### Hinzugefuegt

- **Item-Notizen** in der Einkaufsliste — pro Eintrag eine optionale Freitext-
  Notiz („welche Marke" o. Ä.), inline anzeig- und editierbar. Bei Einzelquell-
  Items direkt unter dem Namen, bei aus mehreren Rezepten zusammengefuehrten
  Gruppen je Eintrag in der aufgeklappten Ansicht. Additive Migration
  (`ShoppingItem.note`).

## [0.24.0] — 2026-05-28

### Hinzugefuegt

- **„Häufig gekauft"-Liste (Master-List)** in der Einkaufsliste — manuell
  hinzugefuegte Items werden pro User aggregiert (Anzahl + Aktualitaet) und als
  1-Tap-Chips angeboten. Schon auf der Liste stehende Items werden ausgeblendet;
  Tappen nutzt denselben Merge-/Gang-Pfad wie das manuelle Hinzufuegen. Neue
  Tabelle `FrequentItem` (additive Migration). Rezept-Zutaten zaehlen bewusst
  nicht mit, damit die Liste auf manuelle Staples fokussiert bleibt.

## [0.23.0] — 2026-05-28

### Hinzugefuegt

- **Gang-Sortierung der Einkaufsliste** — Items werden nach Supermarkt-Gang
  gruppiert (Gemuese, Kuehlregal, Trockenwaren, …) statt flach gelistet. Die
  Kategorie kommt zur Lesezeit per Namens-Abgleich gegen `Ingredient.category`
  (keine Migration). Bekannte Gaenge in Laufreihenfolge, Unbekanntes als
  „Sonstiges" am Ende; abgehakte Eintraege sinken je Gang nach unten.
- **Zutaten-Auto-Complete** beim manuellen Hinzufuegen — Vorschlaege aus der
  Zutaten-Stammdatentabelle (debounced), vereinheitlicht Schreibweisen.
- **Mengen-Merge** — gleichnamige, noch nicht abgehakte Eintraege werden beim
  manuellen Hinzufuegen zusammengefuehrt (`500 ml + 250 ml → 750 ml`) statt als
  Duplikat angelegt. Neu hinzugefuegte Eintraege landen sofort im richtigen Gang.

## [0.22.11] — 2026-05-27

### Performance

- **FTS5-Volltextsuche** loest die fuenf OR-LIKE-Klauseln in `/rezepte`
  ab. Token-Prefix-Match (`tom` findet `Tomatensuppe`), Umlaute werden ueber
  den Tokenizer auf ASCII normalisiert. Triggers halten den FTS-Index bei
  jedem Recipe-INSERT/UPDATE/DELETE synchron; die Migration backfilled den
  Bestand. Spuerbar schneller, besonders auf dem NAS.

## [0.22.10] — 2026-05-27

### Behoben / Aufgeraeumt

- **Inline-Permission-Checks** fuer Rezept-Schreibrecht (`role === "ADMIN" || …`)
  an drei Stellen durch `decideWriteRecipe` ersetzt.
- **Web-Import wartet auf JSON-LD** statt pauschal 3 s zu sleepen — Chefkoch,
  Rewe & Co. kommen schneller durch den Puppeteer-Pfad.
- **`window.confirm` / `window.alert`** rausgeworfen: vier Stellen
  (Plan-Loeschen, Cookbook-Loeschen, User-Loeschen, Rezept-Importfehler) nutzen
  jetzt einen Oma-Dialog mit Focus-Trap statt System-Modal.
- **Pantry-Match** ist jetzt case-insensitive — „Tomate" und „tomate" landen
  endgueltig im selben Ingredient.
- **`requireUser`** zentral aus `lib/auth/helpers`, drei lokal duplizierte
  Kopien entfernt.
- **`actorFromSession`** validiert die Rolle per `isRole`-Check, statt sie
  blind in das `Role`-Union zu casten.
- **A11y**: `aria-label` an Zutat-Inputs, Skeleton-Loader mit `role="status"`,
  Tinten-Farbwahl im Zeichen-Modus mit `aria-pressed`.

## [0.22.9] — 2026-05-27

### Behoben

- **Speiseplan-Sharing** folgt jetzt dem Cookbook-Sharing-Graphen. „Familie
  freigeben" hatte nach der v0.22-Migration kaum noch gegriffen, weil
  `User.familyId` nur per Admin gesetzt wird — jetzt sieht jeder, der mit
  dem Plan-Owner mindestens ein Cookbook teilt.
- **App-Theme** zieht primaer das aktive Cookbook fuer Akzent-/Tinte-/Papier-
  Farben, nicht mehr die `Family`-Tabelle (die nach v0.22 fuer die meisten
  User leer ist).

## [0.22.8] — 2026-05-27

### Performance

- **Drei fehlende Indexes** auf `Account.userId`, `Session.userId`,
  `Rating.userId` — jeder Login schlaegt jetzt sofort den Index, kein
  Full-Scan mehr.
- **Buch-Ansicht** macht nur noch eine statt zwei Recipe-Queries.

### Behoben

- **`reconcileImages`** laeuft in einer Transaktion — bei einem Crash mitten
  in der Bilder-Sortierung bleibt der Satz nicht mehr mit negativen
  `order`-Werten unsichtbar liegen.
- **Ollama-Retries** auf 2 statt 3 gedeckelt — verhindert bis zu 4,5 min
  CPU-Voll-Last bei halbkaputtem LLM-JSON.
- **User-/Rezept-Loeschen** zeigt freundliche Meldung statt kryptischem
  Prisma-FK-Crash, wenn das Rezept noch in einem Speiseplan steckt bzw. der
  User noch eigene Rezepte hat.

## [0.22.7] — 2026-05-27

### Behoben / Aufgeraeumt

- **Image-URL-Import** verweigert Redirects + cappt den Download per
  `Content-Length` + Streaming-Limit. Vorher konnte ein boesartiger Server
  500 MB in den RAM ziehen, bevor der Size-Check zuschlug.
- **`image-proxy`** lehnt Upstream-Redirects ab — keine SSRF-Lücke ueber
  301-auf-interne-IP mehr.
- **Web-Import** cappt die Redirect-Tiefe bei 5 Hops (vorher unbegrenzte
  Rekursion moeglich).
- **DB-Backup** im Entrypoint nutzt `sqlite3 .backup` statt `cp` (WAL-konsistent),
  Rotation auf 30 Backups; Healthcheck-Toleranz auf 60 s.
- **OmaDialog**: drei Modals (Whats-New, Rezept-Picker, Speiseplan-Add) nutzen
  jetzt einen gemeinsamen Wrapper mit Focus-Trap, Escape und Body-Scroll-Lock.
- **CI-Skip** ueberspringt nur noch single-commit Release-Pushes; bei multi-
  commit Pushes laeuft die Test-Suite normal.
- **Coverage**: 26 neue Unit-Tests fuer `extractJson` / `aiRecipeSchema` /
  `scale` — das LLM-JSON-Parsing hat jetzt eine echte Regression-Bremse.

## [0.22.6] — 2026-05-27

### Performance

- **SQLite WAL** aktiv: `PRAGMA journal_mode=WAL`, `busy_timeout=5000`,
  `synchronous=NORMAL` — paralleler Read/Write moeglich, kein `SQLITE_BUSY`
  mehr zwischen Puppeteer-PDF und gleichzeitigem Save.
- **Tesseract-Worker** ist jetzt ein Prozess-weiter Singleton mit Mutex —
  spart das ~10–20 MB Sprachpaket-Neuladen bei jedem OCR-Aufruf.

### Behoben

- **Cookbook-Quota**: max 20 eigene Buecher pro User (vorher unbegrenzt).
- **Zod-Validierung** an allen offenen Server-Action-Grenzen (Einkaufsliste,
  Vorraete, Speiseplan, Admin) — Laengen-Limits, Range-Checks, Enum fuer
  Mahlzeit-Typen.

## [0.22.5] — 2026-05-27

### Sicherheit

- **Cookbook-Permission-Drift** geschlossen: `addRecipeToList`, `rateRecipe`,
  `addMissingToList`, `addMealEntry` pruefen jetzt `canReadRecipe`, der
  Speiseplan-Picker filtert per `readableCookbookIds`. Share-Link-Toggle und
  Handschrift-Upload pruefen `canWriteRecipe` statt `createdById`. Schliesst
  einen Pfad, ueber den ein angemeldeter User mit geratenem `recipeId` Zutaten
  und Titel aus fremden Cookbooks in seine eigene Liste/Plan ziehen konnte.

## [0.22.4] — 2026-05-27

### Geaendert

- **Release-Pipeline** beschleunigt: `npm prune` statt zweitem `npm ci`,
  `.next/cache` als Buildx-Mount, Registry-Cache zusaetzlich zu GHA-Cache.

## [0.22.3] — 2026-05-27

### Behoben

- **PDF-Export** + **Bild-Endpoint** + **Buch-Ansicht** nach v0.22-Migration
  repariert: griffen noch auf das vor v0.22 gedroppte `Recipe.familyId`/
  `visibility` zu, Prisma-Query schlug fehl. Cookbook-Permissions sind jetzt
  die einzige Wahrheit, Buch-Titel zeigt den Namen des aktiven Cookbooks
  (vorher hartcodiert „Merys Kochbuch").
- **Share-Link-UI**: das readonly URL-Feld unter dem Toggle entfernt; nur
  noch „Link kopieren"-Button.

## [0.22.2] — 2026-05-26

### Behoben

- **Seed legt jetzt ein Default-Cookbook fuer den Admin an** und setzt es als
  aktives Cookbook. Frische Installationen (und CI mit frisch migrierter DB)
  konnten sonst keine Rezepte anlegen — `createRecipeAction` warf „Kein aktives
  Kochbuch ausgewaehlt". Bestehende Installationen sind nicht betroffen
  (Backfill aus v0.22.0 hat sie bereits versorgt).

## [0.22.1] — 2026-05-26

### Behoben

- **E2E-Tests (CI)** grün — Whats-New-Drawer ueberdeckte in Playwright-Sessions
  Formularbuttons (Rezept speichern / importieren). Auth-Setup setzt jetzt den
  LocalStorage-Marker `kochbuch.lastSeenReleaseNotes` auf die aktuelle Version,
  damit der Drawer nicht auto-oeffnet. Keine User-Auswirkung.

## [0.22.0] — 2026-05-26

### Neu

- **Mehrere Kochbuecher pro User** — jeder Benutzer hat ein eigenes Kochbuch
  (Standardname „<Name> Kochbuch"), kann beliebig viele weitere anlegen und
  pro Buch Branding (Akzent-, Tinte-, Papier-Farbe) und Cover hinterlegen.
- **Cookbook-Switcher im Header** neben dem Profil-Link. Listet eigene plus
  freigegebene Buecher; ein Wechsel filtert die Rezeptliste sofort um.
- **Lese-Freigaben** pro Buch — Owner und Admin koennen anderen Usern Lese-
  zugriff geben und entziehen (Profil → Meine Kochbuecher → Freigaben).
- **Rezept-Import** aus fremden Buechern: „In mein Kochbuch importieren"-Button
  auf der Detail-Seite kopiert das Rezept (inkl. Bilder) ins aktive Buch und
  haengt einen Quellen-Vermerk an („importiert aus „Backbuch" von Anna").
- **Admin-Rechte fuer alle Rezepte**: ADMIN-User koennen jedes Rezept
  bearbeiten/deaktivieren/loeschen, auch in fremden Buechern.

### Geändert

- Recipe-Sichtbarkeit ist jetzt ausschliesslich an `cookbookId` gebunden; die
  alten Felder `Recipe.visibility` (SHARED/FAMILY) und `Recipe.familyId`
  wurden ersatzlos entfernt. Migration laeuft beim Container-Start
  automatisch, keine User-Aktion noetig.
- `Family` bleibt als Konzept fuer User-Gruppierung und Category-Scoping
  erhalten, ist fuer Rezepte aber nicht mehr relevant.
- Neue User bekommen beim Anlegen automatisch ein leeres Kochbuch.

### Migration

- Phase A (`add_cookbook_models`): legt Cookbook + CookbookAccess an und
  verschiebt alle bestehenden Rezepte ins Cookbook ihres Erstellers.
- Phase C (`enforce_cookbook_required`): zieht `Recipe.cookbookId` auf
  NOT NULL nach und droppt die Legacy-Spalten.

## [0.21.0] — 2026-05-26

### Neu

- **In-App-Hilfe-Seite `/hilfe`** — Kurzanleitungen für Familienmitglieder zu
  allen Funktionen: Rezept anlegen, Mengen skalieren, Speiseplan, Einkaufsliste,
  OurGroceries-Brücke, Vorrat, Buch-Modus, Familien-Sichtbarkeit, Updates.
  Erreichbar als Karte im Profil.
- **`docs/ARCHITECTURE.md`** — Modul-Karte, Routen-Übersicht, DB-Mentalmodell
  und fünf kritische Datenflüsse (Auth, Tenancy, Rezept-Lifecycle, Web-Import,
  Speiseplan → Einkaufsliste). Für Maintainer, die nach Pause zurückkommen.
- **`docs/CONTRIBUTING.md`** — Dev-Setup, Konventionen-Kurzform (verlinkt
  `CLAUDE.md`), Test-Strategie, „wie sieht ein neues Modul aus", Release-Prozess.

### Geändert

- README-Doku-Sektion um die neuen Dokumente erweitert.

## [0.20.0] — 2026-05-26

### Neu

- **Was ist neu?-Drawer** — Release-Notes der jeweils neuen Version werden nach
  einem Update automatisch einmal angezeigt; im Profil ist der Knopf jederzeit
  erreichbar. Inhalt kommt aus `CHANGELOG.md`, das mit ins Standalone-Build
  gezogen wird (kein Cloud-Call, alles lokal).
- **`CHANGELOG.md`** im Repo-Root, retroaktiv ab v0.13.0 nach Keep-a-Changelog.

### Geändert

- **Doku konsolidiert.** Neue Landeseite [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
  fasst Erst-Install, env-Vars-Referenz, Update-Prozedur, Backup und Add-Ons
  zusammen. Die sechs Spezial-Docs (Wizard, YAML, Ollama, HTTPS, Auto-Update,
  Puppeteer-Sidecar) bleiben als Tiefen-Verweise erhalten.

### Entfernt

- `docs/TEST-PLAN-v0.1.8.md` — obsolet (Stand von vor 18 Releases).

## [0.19.1] — 2026-05-26

### Behoben

- Profil-Seite verlinkt jetzt sichtbar auf die OurGroceries-Setup-Seite. Bisher
  war `/profil/ourgroceries` nur per direkter URL erreichbar.

## [0.19.0] — 2026-05-26

### Neu

- **OurGroceries-Brücke** — Opt-In-Direktexport der Einkaufsliste in die
  OurGroceries-App via inoffizielle Web-API. Pro User AES-256-GCM-
  verschlüsselte Zugangsdaten (Key aus `OURGROCERIES_ENCRYPTION_KEY`,
  ohne den ist das Modul deaktiviert). Items werden batched gepusht; bei
  Aisle-Mismatch werden Custom-Aisles aus den deutschen Kategorien angelegt.
- **Format-Menü beim Teilen** — der „Teilen"-Knopf in der Einkaufsliste bietet
  jetzt drei Ziele: Klartext (Standard), OurGroceries-Push, CSV-Download als
  Fallback.
- **CSV-Export für die Einkaufsliste** — `GET /api/shopping-list/[id]/export/csv`
  liefert ein OurGroceries-importfähiges CSV (`name,category,quantity,note`,
  RFC-4180-Quoting).
- **Setup-Seite `/profil/ourgroceries`** — Verbinden, Zielliste wählen,
  trennen; mit Datenschutz-Hinweis, dass Items an `ourgroceries.com` (USA)
  übertragen werden.

### Geändert

- Neuer Abschnitt „Bewusste Ausnahmen vom Lokal-First-Prinzip" in `CLAUDE.md`
  dokumentiert, dass die OurGroceries-Brücke der erste Cloud-Pfad ist und
  rechtfertigt, warum.

## [0.18.0] — 2026-05-25

### Geändert

- **Prisma 6 → 7** mit `@prisma/adapter-better-sqlite3` als Driver-Adapter.
  Connection-URL wandert aus `schema.prisma` in `prisma.config.ts`.
- GitHub-Actions-Runner auf node24 angehoben.
- TrueNAS-Sidecar-Compose-Variante als zusätzliche Deployment-Form ergänzt.
- `STATUS.md` durchgehend auf den aktuellen Stand gebracht (v0.7.6 → v0.17.2).

### Behoben

- CI: `DATABASE_URL` für `prisma generate` im Lint-Job gesetzt (war Folge des
  Prisma-7-Umzugs).

## [0.17.2] — 2026-05-25

### Geändert

- **Thumbnails in Rezeptliste und Foto-Ansicht** — statt Vollbilder werden in
  beiden Übersichten serverseitig erzeugte Thumbnails ausgeliefert. Spürbar
  schnelleres Laden auf dem iPad, weniger Bandbreite auf dem NAS.

## [0.17.1] — 2026-05-25

### Behoben

- **Update-Banner zeigt sich wieder.** Der Versions-Check wurde nicht mehr
  ausgelöst — der Banner blieb in v0.17.0 still, selbst wenn ein neues Release
  vorlag.
- E2E-Smoketest für den step-basierten Schritt-Editor repariert.

### Neu

- **Husky Pre-Commit-Hook** mit `lint-staged` und `typecheck` läuft automatisch
  vor jedem Commit.

## [0.17.0] — 2026-05-25

### Geändert

- **Prisma 5 → 6**. Erste Hälfte des Prisma-Major-Upgrade-Pfades.

## [0.16.0] — 2026-05-25

### Neu

- **Pro-Familie-Branding (8e)** — jede Familie hat einen eigenen Namen plus
  Theme-Farben (`accentColor`, `inkColor`, `paperColor`) und optional ein
  Cover-Bild. Wird im PWA-Header und im Buch-Modus angezeigt.

## [0.15.0] — 2026-05-25

### Neu

- **Optional familien-geteilte Speisepläne (8f)** — `MealPlan.familyShared`-
  Flag, sichtbar für alle Mitglieder der Familie. Default bleibt
  „eigener Speiseplan".
- **Pro-Familie-Kategorien (8c)** — Kategorien gehören jetzt einer Familie,
  nicht mehr global. Erleichtert das Trennen mehrerer Haushalte im selben
  Kochbuch.

## [0.14.0] — 2026-05-25

### Neu

- **Multi-Family-Kern** — `Family`-Modell, `User.familyId`, `Recipe.familyId`
  und `Recipe.visibility` (`PRIVATE` / `FAMILY` / `SHARED`). Mehrere Familien
  teilen einen Rezept-Pool für `SHARED`-Rezepte, behalten aber familien-
  private Inhalte. Admin-UI im Profil zum Anlegen und Wechseln.

## [0.13.0] — 2026-05-25

### Neu

- **Nährwerte pro Portion** — automatisch aus der Zutaten-Tabelle berechnet
  (Volumen ↔ Masse über `Ingredient.density`, ~50 Zutaten geseedet), pro
  Rezept manuell übersteuerbar. Reagiert live auf die Portions-Auswahl.

[Unreleased]: https://github.com/Starkstrom05/kochbuch/compare/v0.21.0...HEAD
[0.21.0]: https://github.com/Starkstrom05/kochbuch/compare/v0.20.0...v0.21.0
[0.20.0]: https://github.com/Starkstrom05/kochbuch/compare/v0.19.1...v0.20.0
[0.19.1]: https://github.com/Starkstrom05/kochbuch/compare/v0.19.0...v0.19.1
[0.19.0]: https://github.com/Starkstrom05/kochbuch/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/Starkstrom05/kochbuch/compare/v0.17.2...v0.18.0
[0.17.2]: https://github.com/Starkstrom05/kochbuch/compare/v0.17.1...v0.17.2
[0.17.1]: https://github.com/Starkstrom05/kochbuch/compare/v0.17.0...v0.17.1
[0.17.0]: https://github.com/Starkstrom05/kochbuch/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/Starkstrom05/kochbuch/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/Starkstrom05/kochbuch/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/Starkstrom05/kochbuch/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/Starkstrom05/kochbuch/releases/tag/v0.13.0
