# Kochbuch — Entwicklungs-Regeln fuer Claude Code

## Projektueberblick

Familien-Kochbuch im Oma-Design (Handschrift-Fonts, Papier-Texturen, Tinten-Effekte).
PWA fuer iPad mit Apple-Pencil-Stifteingabe. Selbstgehostet via Docker auf
TrueNAS Scale. Multi-User (Familie) + oeffentlich teilbare Rezept-Links.

## Tech-Stack

- **Frontend/Backend:** Next.js 16 (App Router) + React 19 + TypeScript strict
- **DB:** SQLite + Prisma (FTS5 fuer Suche)
- **Auth:** NextAuth v5 (Credentials Provider) + Prisma-Adapter
- **Styling:** Tailwind CSS v3 + custom Oma-Theme
- **Validierung:** Zod an jeder Server-Grenze
- **KI/OCR:** Tesseract.js (Worker) + Ollama (lokales LLM ueber HTTP)
- **PDF:** Puppeteer (Chromium im Image)
- **Tests:** Vitest (Unit) + Playwright (E2E)
- **Deployment:** Docker Compose auf TrueNAS Scale (x86)

## Code-Style

- TypeScript **strict**; kein `any` — stattdessen `unknown` + Zod-Validierung
- Server Components als Default; `"use client"` nur wo noetig (Interaktion, Hooks, Browser-APIs)
- Mutations bevorzugt via **Server Actions**; Route Handler nur fuer externe Konsumenten (Share-Links, PDF, Webhooks)
- **Zod-Schemas** in `src/lib/schemas/` definieren und an jeder Server-Grenze validieren
- Pfad-Aliase: `@/lib/...`, `@/components/...`, `@/app/...`
- Tailwind: Klassen statt Inline-Styles (Ausnahme: dynamische Transforms aus Hash)
- Dateinamen: kebab-case fuer Routes/Utilities, PascalCase fuer Komponenten
- Keine Kommentare ausser fuer non-obvious WHY-Erklaerungen
- Bevorzuge Edit ueber Write bei bestehenden Dateien

## Commits (Conventional Commits)

- Praefix: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`, `build:`, `ci:`
- Scope optional: `feat(recipe): mengenskalierung`
- Imperativ, Englisch bevorzugt (konsistent halten)
- DB-Schema-Aenderung + Migration **im selben Commit**

## Migrations

- Nie eine existierende Migration editieren — immer eine neue erstellen
- `npx prisma migrate dev --name <kebab-case-grund>`
- Migration-Name beschreibt das Was, der Commit-Body das Warum
- Bei Production-Deploy laeuft `prisma migrate deploy` automatisch im Entrypoint

## Testing

- **Unit (Vitest):** `lib/units/`, `lib/shopping/`, `lib/ai/prompts.ts` (JSON-Parsing), `lib/import/`
- **Integration:** Server Actions mit better-sqlite3 In-Memory-DB
- **E2E (Playwright):** Happy-Path "Rezept anlegen → ansehen → PDF" + "URL-Import"
- Coverage-Ziel pragmatisch: 60% in `lib/`, kein Zwang in `app/`
- Pre-commit (kuenftig): `lint` + `typecheck`; CI: + tests

## Pull Requests

- Branch: `feat/<kurz>`, `fix/<kurz>`, `chore/<kurz>`
- PR-Beschreibung: Was, Warum, Screenshots bei UI-Aenderung, Migrations-Hinweis
- Klein halten (<400 Zeilen Diff), sonst splitten
- Bei UI-Aenderung: Vorher/Nachher-Screenshots iPad-Breite (820px) + Desktop

## Vorgehen bei Implementierung

1. Bei neuen Features: **ZUERST** `lib/`-Logik + Zod-Schema + Unit-Test, **DANN** UI
2. Bei DB-Aenderung: erst Schema-Diff zeigen, dann Migration erzeugen
3. Niemals direktes SQL ausser in dedizierten Modulen (z.B. FTS5-Setup)
4. Bei UI: Oma-Theme respektieren → `src/components/oma/*` nutzen, nicht neu erfinden
5. KI-Calls (Ollama):
   - Timeout 60 s
   - Antwort immer mit Zod validieren
   - Bei Fehler: Fallback (Roh-Text-Editor) bereitstellen
6. **Keine externen Cloud-Calls** (DSGVO, alles lokal — auch keine CDNs zur Laufzeit)
7. Bilder/Uploads: ausschliesslich in `UPLOAD_DIR`, **niemals** in `public/`
8. Bei groesseren Refactorings: kurz Plan in PR-Body schreiben

## Versionierung

- **SemVer** strict
  - MAJOR: Breaking DB-Migration ohne Auto-Pfad, Auth-Format-Wechsel
  - MINOR: neue Features, kompatible Migrationen
  - PATCH: Bugfix, Docs, Style
- Release: `git tag v0.x.y && git push --tags` → GitHub Action baut Docker-Image,
  taggt `ghcr.io/<user>/kochbuch:v0.x.y`, `0.x`, `latest`, erstellt GitHub Release.
- App liest `package.json`-Version → speichert in `AppMeta` → Update-Banner via
  GitHub-Releases-API-Vergleich.

## Release-Checkliste (vor jedem Push mit neuem Tag)

Diese Schritte **immer** in dieser Reihenfolge durchfuehren:

1. **Version in `package.json` erhoehen** (SemVer — MAJOR/MINOR/PATCH, s.o.)
2. **Typecheck + Tests grueen** bestaetigen:
   ```bash
   npm run typecheck && npm run test:run
   ```
3. **Feature-Commit(s)** anlegen (Conventional Commits, Migration im selben Commit)
4. **Release-Commit** anlegen:
   ```bash
   git commit --allow-empty -m "chore(release): vX.Y.Z"
   ```
5. **Tag setzen und pushen:**
   ```bash
   git tag vX.Y.Z
   git push origin main && git push origin vX.Y.Z
   ```

**Verboten vor dem Push:** hartcodierte Versionsstrings im Source. Die App liest
die Version ausschliesslich aus `package.json` (importiert per
`import packageJson from "...package.json"` — kein `KOCHBUCH_VERSION`
und kein manuelles String-Literal). Wenn du eine Versionsanzeige ergaenzt,
muss sie `packageJson.version` verwenden.

## Verbotene Dinge

- `dangerouslySetInnerHTML` ohne DOMPurify
- `eval`-artige Patterns auf KI-Output (z.B. `Function(...)` mit Modell-String)
- Secrets im Repo (`.env` ist gitignored — `.env.example` als Vorlage)
- Ungeprueftes Annehmen von Uploads >10 MB (`MAX_UPLOAD_BYTES`; Server-side sharp-Resize + Validierung)
- Cloud-API-Calls zur Laufzeit (KI laeuft lokal via Ollama)
- Bilder in `public/` (gehoeren ins `UPLOAD_DIR`-Volume)

## Bewusste Ausnahmen vom Lokal-First-Prinzip

Jede Ausnahme von „keine externen Cloud-Calls zur Laufzeit" muss hier explizit
gelistet werden — sonst veraltet die Ausnahme zur stillen Regel. Eintragsform:
Modulname, Datum, Datenfluss (was geht raus, wohin, warum), Opt-In-Mechanismus.

- **OurGroceries-Bruecke** (seit 2026-05-26):
  - Modul: `src/lib/integrations/ourgroceries/` + `/api/shopping-list/[id]/export/ourgroceries`
  - Datenfluss: Auf User-Auslosung schickt der NAS-Container Einkaufslisten-Items
    (Name, Menge, optional Kategorie, optional Rezept-Quelle als Notiz) per HTTPS
    an `ourgroceries.com` (USA). Nur **unchecked** Items, keine Bilder/Naehrwerte.
  - Auth: Username/Passwort pro User, AES-256-GCM-verschluesselt in
    `UserOurGroceriesCredentials` (Key aus `OURGROCERIES_ENCRYPTION_KEY`).
  - Opt-In: nur User mit hinterlegten Credentials exportieren; nichts passiert
    automatisch im Hintergrund.
  - Begruendung: OurGroceries ist der Familien-Workflow im Laden; CSV-Upload-Reibung
    war dem User zu hoch. Wartungsrisiko (reverse-engineerte API) bewusst akzeptiert.

## Datei-Konventionen

- Route-Handler: `src/app/api/<resource>/route.ts`
- Server Actions: `src/app/<segment>/actions.ts` oder neben der Komponente
- DB-Helper: `src/lib/db/` (Prisma-Singleton)
- KI-Module: `src/lib/ai/`
- OCR: `src/lib/ocr/`
- Komponenten: `src/components/<bereich>/<Name>.tsx`
- Oma-Theme-Bausteine: `src/components/oma/`

## Local-Dev Cheatsheet

```bash
npm run dev               # Next.js Dev-Server
npm run db:migrate        # Prisma Migration (interaktiv)
npm run db:studio         # Prisma Studio
npm run db:seed           # Initial-Daten
npm run typecheck         # tsc --noEmit
npm run lint              # ESLint
npm run test              # Vitest watch
npm run test:run          # Vitest single-shot
```
