# Changelog

Alle nennenswerten Änderungen am Familien-Kochbuch.

Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/);
Versionsschema [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

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
