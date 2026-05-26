# Beitragen / Forken

Das Kochbuch ist primaer ein Familienprojekt, aber der Code ist public und
Forks sind willkommen. Dieser Guide ist fuer dich, wenn du Code anfassen oder
das Projekt erweitern willst — sei es als Fork-Maintainer, als PR-Beitragender
oder einfach um nach laengerer Pause wieder reinzukommen.

Vorher lesen:

- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — Modul-Karte und Datenfluesse.
- [`CLAUDE.md`](../CLAUDE.md) — verbindliche Code-Konventionen und Verbote.

---

## Dev-Setup

### Voraussetzungen

- Node.js 22 oder neuer (CI laeuft Node 24).
- npm (kein pnpm/yarn — Lockfile ist npm).
- Linux/macOS bevorzugt; Windows funktioniert ueber WSL.
- Optional: lokale Ollama-Installation fuer den KI-Web-Import.

### Erstes Setup

```bash
git clone https://github.com/Starkstrom05/kochbuch.git
cd kochbuch
npm ci
cp .env.example .env       # mindestens DATABASE_URL und AUTH_SECRET setzen
npx prisma migrate dev     # legt die SQLite-DB und das Schema an
npm run db:seed            # ~50 Zutaten mit Naehrwerten + ein paar Demo-Rezepte
npm run dev                # http://localhost:3000
```

`.env.example` listet alle Variablen mit Erklaerung; nur die ersten paar
sind Pflicht.

### Cheatsheet

```bash
npm run dev               # Next.js Dev-Server
npm run db:migrate        # Prisma Migration (interaktiv)
npm run db:studio         # Prisma Studio (UI fuer die DB)
npm run db:seed           # Initial-Daten
npm run typecheck         # tsc --noEmit
npm run lint              # ESLint
npm run test              # Vitest watch
npm run test:run          # Vitest single-shot
```

Pre-commit-Hook (Husky) laeuft `lint-staged` + `typecheck` automatisch.

---

## Konventionen (Kurzform)

Vollstaendig in `CLAUDE.md`. Drei Punkte als Mantra:

1. **`lib/` zuerst, UI danach.** Pure Logik in `src/lib/<bereich>/` mit Unit-
   Tests, dann erst die Server Component oder Client-Komponente.
2. **Zod an jeder Server-Grenze.** Server Actions und Route Handler parsen
   FormData/JSON mit Schemas aus `src/lib/schemas/`. Niemals `any`.
3. **Server Components Default, `"use client"` nur bei Interaktion.**
   Mutations bevorzugt via Server Actions; Route Handler nur fuer externe
   Konsumenten (PDFs, Share-Links, Webhooks, Imports/Exports).

Weitere Regeln, die du nicht uebersehen darfst:

- Datei-Namen: kebab-case fuer Routes/Utilities, PascalCase fuer Komponenten.
- Keine Kommentare ausser fuer non-obvious WHY-Erklaerungen.
- Bilder ausschliesslich in `UPLOAD_DIR`, **niemals** in `public/`.
- Keine externen Cloud-Calls zur Laufzeit. Ausnahmen muessen explizit in
  CLAUDE.md im Abschnitt „Bewusste Ausnahmen vom Lokal-First-Prinzip"
  dokumentiert sein.
- Versionsstring kommt aus `package.json`, niemals hartcodiert.

---

## Tests

| Ebene       | Werkzeug                                                    | Was wird getestet                                                     |
| ----------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Unit        | Vitest                                                      | `lib/`-Module: Konsolidierung, Mengen, Crypto, Parser, Format-Helper. |
| Integration | Vitest mit gemocktem Prisma oder echter SQLite-In-Memory-DB | Server-Glue, Service-Funktionen.                                      |
| E2E         | Playwright (`e2e/`)                                         | Happy-Path Rezept anlegen → ansehen → PDF; URL-Import.                |

Coverage-Ziel pragmatisch: **60 % in `lib/`**, kein Zwang fuer `app/`.

CI laeuft `lint`, `typecheck` und `test:run` auf jedem Push.

---

## Wie ein neues Modul aussieht

Beispiel: ein neues `src/lib/foo/`-Modul fuer Feature „Foo".

1. **Schema** in `src/lib/schemas/foo.ts` — Zod-Inputs und ggf. Response-Shapes.
2. **Pure Logik** in `src/lib/foo/foo.ts` + Unit-Tests (`foo.test.ts`).
3. **Server-Glue** in `src/lib/foo/server.ts` — DB-Queries + Tenancy-Check
   (`session.user.familyId`, falls Familien-Modell).
4. **Server Action** in `src/app/(app)/<route>/actions.ts` — `"use server"`,
   ruft Schema.parse() + server.ts auf.
5. **Komponenten:** Server Component fuer Listen/Read, Client-Component nur
   wenn Interaktion noetig.
6. **Migration** im selben Commit wie der Code, der sie braucht:
   ```bash
   npx prisma migrate dev --name <kebab-case-grund>
   ```
7. **Tests fuer den Happy-Path und einen Fehlerpfad** (mindestens) bevor PR.

---

## Conventional Commits

Praefixe: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.
Optionaler Scope: `feat(recipe): mengenskalierung`. Imperativ, Englisch bevorzugt
(konsistent zur Historie).

DB-Schema-Aenderung + Migration **im selben Commit**.

---

## Pull Requests

- Branch-Naming: `feat/<kurz>`, `fix/<kurz>`, `chore/<kurz>`.
- PR-Beschreibung: Was, Warum, Screenshots bei UI-Aenderung, Migrations-Hinweis.
- Klein halten (**< 400 Zeilen Diff**), sonst splitten.
- Bei UI-Aenderung: Vorher/Nachher-Screenshots iPad-Breite (820 px) + Desktop.

---

## Release-Prozess

SemVer strict. **PATCH** fuer Bugfix/Doku, **MINOR** fuer neue Features, **MAJOR**
fuer breaking DB-Migration ohne Auto-Pfad oder Auth-Format-Wechsel.

Schritte (siehe auch CLAUDE.md):

```bash
# 1. Version bumpen
# Edit package.json → "version": "X.Y.Z"

# 2. Tests gruen?
npm run typecheck && npm run test:run

# 3. CHANGELOG.md fuer X.Y.Z ergaenzen (Keep-a-Changelog-Format)

# 4. Feature-Commit(s) anlegen (siehe Conventional Commits)
git add -A && git commit -m "feat: ..."

# 5. Release-Commit
git commit --allow-empty -m "chore(release): vX.Y.Z"

# 6. Tag setzen und pushen
git tag vX.Y.Z
git push origin main && git push origin vX.Y.Z
```

GitHub Actions baut bei Tag-Push automatisch das Docker-Image und legt es
unter `ghcr.io/starkstrom05/kochbuch:vX.Y.Z` + `:latest` ab.

---

## Wann was anfassen

| Datei/Bereich                           | Wenn du...                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `CLAUDE.md`                             | eine neue Konvention durchsetzen willst (z.B. neue Ausnahme vom Lokal-First-Prinzip).     |
| `docs/ARCHITECTURE.md`                  | ein neues Modul hinzufuegst oder die Datenfluesse wesentlich aenderst.                    |
| `docs/DEPLOYMENT.md`                    | eine neue env-Variable einfuehrst oder den Deploy-Workflow aenderst.                      |
| `STATUS.md`                             | ein nutzbares Feature released hast (Live-Stand-Hinweis fuer Familie).                    |
| `CHANGELOG.md`                          | ein Release vorbereitest — eine Sektion pro Version, **vor** dem `chore(release)`-Commit. |
| `src/lib/<bereich>/`                    | Logik. Hier gehoeren Tests dazu.                                                          |
| `src/app/(app)/...`                     | Routen im eingeloggten Bereich. Server Component, sofern nicht zwingend Client.           |
| `src/components/oma/`                   | NEUE Oma-Theme-Bausteine. Bestehende wiederverwenden, nicht duplizieren.                  |
| `prisma/schema.prisma` + neue Migration | DB-Aenderungen, immer mit Code im selben Commit.                                          |

---

## Hilfe / Kontakt

Issues und Diskussionen auf GitHub:
https://github.com/Starkstrom05/kochbuch

Code-Review-Wunsch oder Frage zur Architektur: PR aufmachen, im Body Frage
formulieren. Maintainer schaut druebber.
