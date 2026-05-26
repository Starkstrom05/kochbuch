# Merys Kochbuch

Selbstgehostetes Familien-Kochbuch im nostalgischen "Mery-Rezeptbuch"-Design.

- **Stack:** Next.js 16 + TypeScript + Prisma/SQLite + Tailwind + Ollama + Tesseract.js + Puppeteer
- **Deployment:** Docker auf TrueNAS Scale (TerraMaster NAS), x86
- **Client:** PWA fuer iPad mit Apple-Pencil-Stifteingabe
- **Lizenz:** MIT

## Features (Roadmap)

- Rezepte verwalten, kategorisieren, bewerten
- Mengenskalierung nach Personenzahl
- Web-Import (Chefkoch.de etc. via JSON-LD)
- Foto-OCR + Handschrift-Eingabe via Apple Pencil
- Einkaufsliste aus mehreren Rezepten konsolidieren
- "Was kann ich aus diesen Zutaten kochen?" — lokales LLM-Vorschlag
- PDF-Export im Mery-Design (A5)
- Multi-User: jeder mit eigenem Kochbuch, Lese-Freigaben, Cookbook-Switcher im Header
- Rezepte aus fremden Kochbuechern ins eigene importieren (Vollkopie inkl. Bilder)
- Oeffentliche Share-Links pro Rezept

## Lokale Entwicklung

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Dann <http://localhost:3000> oeffnen.

## Deployment auf TrueNAS Scale

Zwei Wege, je nachdem ob du KI-Features brauchst:

### Wizard-Modus — Single-Container, schnell, ohne KI

```bash
bash scripts/wizard-fields.sh
```

Gibt alle Werte aus, die du in **Apps → Custom App → Wizard** einträgst.
Kein YAML, nur Formularfelder. Web-Import funktioniert für strukturierte
Sites; KI-Fallback und Rezept-Vorschläge fallen weg.

Anleitung: [`docs/INSTALL-TRUENAS-WIZARD.md`](docs/INSTALL-TRUENAS-WIZARD.md).

### YAML-Modus — Multi-Container mit Ollama, voller Funktionsumfang

```bash
bash scripts/install-truenas.sh -o kochbuch-truenas.yml
```

Erzeugt fertige Compose-YAML, die du unter **Apps → Custom App → Install
via YAML** einfügst. Init-Containers übernehmen Migration, Seed und
Ollama-Modell-Pull automatisch.

Anleitung: [`docs/INSTALL-TRUENAS.md`](docs/INSTALL-TRUENAS.md).

## Doku

- **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)** — Einstieg fuers Selbsthosten:
  Pfad-Auswahl, env-Vars-Referenz, Update-Prozedur, Backup, HTTPS, Add-Ons.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Modul-Karte und Datenfluesse
  fuer Maintainer.
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — Dev-Setup, Konventionen,
  Release-Prozess fuer Forks und PRs.
- [`CHANGELOG.md`](CHANGELOG.md) — Release-Notes pro Version.
- [`STATUS.md`](STATUS.md) — Live-Stand der Funktionen.
- [`CLAUDE.md`](CLAUDE.md) — Code-Regeln und Konventionen.

In-App fuer Familienmitglieder: **`/hilfe`** (Kurzanleitungen zu allen Funktionen).

## Status

Pre-Alpha — siehe Plan in `/home/jonas/.claude/plans/`.

## Lizenz

MIT (folgt mit `LICENSE`-Datei).
