# Architecture — Kochbuch

Wegweiser durch die Codebase. Geschrieben fuer den Fall, dass du (oder ich
nach drei Monaten Pause) wieder reinkommen musst und nicht im Code aufgehen
willst. Kein vollstaendiges Refbook — `CLAUDE.md` regelt Code-Style,
`docs/DEPLOYMENT.md` regelt Hosting, `CHANGELOG.md` regelt Geschichte.
Diese Datei beantwortet **„Wo liegt was und warum"**.

---

## Stack-Schichten

```
                    Browser (PWA, iPad-optimiert)
                    │
                    ▼
                Next.js 16 App Router (TypeScript strict)
                ├─ Server Components als Default
                ├─ Server Actions fuer Mutations
                └─ Route Handler nur fuer externe Konsumenten
                    │
                    ▼
                Prisma 7 + better-sqlite3 Driver-Adapter
                    │
                    ▼
                SQLite (Datei, gemountet vom NAS-Dataset)
```

**Daneben:**

- NextAuth v5 (Credentials, Prisma-Adapter)
- Tailwind v3 mit Custom-Oma-Theme (`src/components/oma/`)
- Zod an jeder Server-Grenze (`src/lib/schemas/`)
- Vitest (unit) + Playwright (e2e)

**Verbotene Cloud-Calls zur Laufzeit** (siehe CLAUDE.md). Einzige bewusste
Ausnahme: OurGroceries-Bruecke, Opt-In pro User.

---

## `src/lib/` — Logik-Module

Jedes Modul hat **eine** Verantwortung. Bei neuem Feature: zuerst hier, dann
UI.

| Modul                        | Zustaendig fuer                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `ai/`                        | Ollama-HTTP-Client + Zod-Schemas fuer KI-Output (`aiRecipeSchema`). Fehler-Klassen wie `OllamaUnreachableError`. |
| `auth/`                      | NextAuth-Setup, `auth()`-Helper. Credentials-Provider gegen `User.passwordHash`.                                 |
| `backup/`                    | JSON+ZIP-Export aller Rezepte, Restore mit `skip`/`duplicate`-Mode.                                              |
| `changelog/`                 | Parsed `CHANGELOG.md` zur Laufzeit (server-side), liefert Releases fuer den Whats-New-Drawer.                    |
| `config/`                    | App-Name, Familien-Branding, Feature-Flags.                                                                      |
| `crypto/`                    | AES-256-GCM fuer pro-User-Secrets (aktuell nur OurGroceries-Credentials).                                        |
| `db/`                        | Prisma-Singleton + Enums (`ROLES`, `VISIBILITY`).                                                                |
| `images/`                    | Sharp-basierte Upload-Verarbeitung (Sepia, Resize, Thumbnails). Pfade in `UPLOAD_DIR`, niemals `public/`.        |
| `import/`                    | Web-Scraping (Cheerio + JSON-LD), Puppeteer-Fallback, SSRF-Schutz (`assertPublicUrl`).                           |
| `integrations/ourgroceries/` | Inoffizieller HTTP-Client + CSV-Export + Item-Transformer.                                                       |
| `nutrition/`                 | Naehrwerte aus `IngredientNutrition`-Tabelle, Volumen↔Masse via `Ingredient.density`.                            |
| `ocr/`                       | Tesseract.js-Wrapper (Worker im Browser, nicht Server).                                                          |
| `pantry/`                    | Vorrats-CRUD + Fuzzy-Match Rezept↔Vorrat.                                                                        |
| `pdf/`                       | Puppeteer-PDF-Render fuer Rezept, Speiseplan, Share-Link.                                                        |
| `puppeteer/`                 | Browser-Queue (Mutex, damit Web-Import und PDF nicht parallel rennen).                                           |
| `recipes/`                   | Rezept-CRUD, Slug-Generierung, Schritt-Parsing, **Family-Tenancy via `visibleToFamily()`**.                      |
| `schemas/`                   | Zod-Schemas an der Server-Grenze (`profile.ts`, `recipe.ts`, `backup.ts`, `ourgroceries.ts`).                    |
| `shopping/`                  | Einkaufslisten-Konsolidierung (`consolidateList`), gleiche Items aggregieren.                                    |
| `sound/`                     | Timer-Ping, Page-Flip-Sound im Buch-Modus.                                                                       |
| `speiseplan/`                | Speiseplan-CRUD + `buildShoppingItemsForEntries()` fuer „Plan → Einkaufsliste".                                  |
| `units/`                     | Mengen-Parser, ml↔g via Dichte, Skalierung `scaleAmount()`.                                                      |
| `version/`                   | Vergleich `package.json` ↔ GitHub-Release-Tag, Cache in `AppMeta`.                                               |
| `visual/`                    | Hash-basierte CSS-Transforms fuer Oma-Look (Rotation, Papier-Textur).                                            |

---

## `src/app/` — Routen

### `(app)/` — Eingeloggter Bereich

Force-dynamic (Layout-Default), Auth ueber `auth()`-Helper.

- `/rezepte` Galerie, drei Ansichten (Karten/Fotos/Liste), FTS5-Suche
- `/rezepte/[slug]` Detail mit Bewertungen, Mengenskalierung
- `/rezepte/[slug]/bearbeiten` Editor
- `/rezepte/[slug]/koch` Schritt-fuer-Schritt-Modus mit Timer + Wake-Lock
- `/rezepte/neu` Anlage (manuell, OCR, Web-Import)
- `/rezepte/buch` Pageflip-PWA mit Sound
- `/speiseplan`, `/speiseplan/[id]`, `/speiseplan/neu`
- `/einkaufsliste`, `/einkaufsliste/[id]`
- `/vorraete`
- `/profil` mit Sub-Routen `/profil/ourgroceries`, Whats-New-Knopf
- `/hilfe` Familienmitglieder-Anleitung

### Oeffentliche Bereiche

- `/login`
- `/share/[token]` Token-basierte Rezept-Ansicht
- `/print/recipe`, `/print/speiseplan`
- `/offline` PWA-Fallback

### API-Route-Handler (`/api/...`)

Nur fuer externe Konsumenten — siehe `CLAUDE.md`-Regel „Server Actions bevorzugt".

| Route                                         | Methode  | Zweck                                   |
| --------------------------------------------- | -------- | --------------------------------------- |
| `/api/auth/[...nextauth]`                     | GET/POST | NextAuth-Standard-Endpoints             |
| `/api/recipes/[id]/pdf`                       | GET      | Rezept-PDF (Puppeteer)                  |
| `/api/speiseplan/[id]/pdf`                    | GET      | Speiseplan-PDF                          |
| `/api/share/[token]/pdf`                      | GET      | Public-Rezept-PDF (Token)               |
| `/api/images/[...path]`                       | GET      | Bild-Proxy mit Ownership-Check          |
| `/api/image-proxy`                            | GET      | Externe-Bild-Cache (URL validiert)      |
| `/api/import/web`                             | POST     | URL → JSON-LD/Ollama → Rezept-Vorschlag |
| `/api/import/ocr`                             | POST     | Tesseract auf Upload                    |
| `/api/shopping-list/[id]/export/csv`          | GET      | CSV-Download                            |
| `/api/shopping-list/[id]/export/ourgroceries` | POST     | OurGroceries-Push                       |
| `/api/backup/export`, `/api/backup/import`    | GET/POST | Admin-Backup                            |
| `/api/health`, `/api/version`                 | GET      | Liveness + Update-Banner                |

---

## DB-Modelle — Kurzueberblick

Siehe `prisma/schema.prisma` fuer Ground-Truth. Hier nur das Mentalmodell:

```
User ──────┐
  │        │ (familyId)
  │        ▼
  │     Family ─── Recipe ─── RecipeImage
  │        │         │  │
  │        │         │  ├── RecipeStep
  │        │         │  └── RecipeIngredient ─── Ingredient ─── IngredientNutrition
  │        │         │                              │
  │        │         └── Category(OnRecipe)         ├── PantryItem (per User)
  │        │                                        └── (per User)
  │        └── Category (familyId optional → SHARED)
  │
  ├── MealPlan ─── MealPlanEntry (planId, recipeId, dayIndex, mealType)
  ├── ShoppingList ─── ShoppingItem
  ├── Rating (recipeId, userId, unique)
  ├── UserOurGroceriesCredentials (verschluesselt)
  └── Session, Account (NextAuth)

AppMeta — key/value-Cache fuer App-Name, Version-Check, etc.
```

**Tenancy-Schluessel:**

- `Recipe.visibility ∈ {PRIVATE, FAMILY, SHARED}` + `Recipe.familyId`
- `Category.familyId` (null = SHARED quer ueber Familien)
- `MealPlan.familyShared` (boolean Flag)
- `ShoppingList.ownerId` (rein persoenlich, **nicht** familien-geteilt)
- `PantryItem.ownerId` (rein persoenlich)

---

## Kritische Datenfluesse

### Auth

1. Login-Form (`/login`) POSTet zu NextAuth-Endpoint
2. Credentials-Provider in `src/lib/auth/` macht `bcrypt.compare()` gegen `User.passwordHash`
3. JWT-Session-Cookie wird gesetzt; `Session`-Row in DB ist Backup
4. Folgende Server-Komponenten und -Actions rufen `auth()` aus `src/lib/auth/auth.ts` ab → bekommen `session.user.id`, `session.user.familyId`, `session.user.role`

### Multi-Family-Tenancy

- **Lese-Pfad:** `visibleToFamily(familyId)` in `src/lib/recipes/visibility.ts` liefert ein Prisma-Where-Fragment, das ueberall vor `.findMany()` auf Recipe steht. Fragment: `{ OR: [{ visibility: "SHARED" }, { familyId }, { createdById: userId, visibility: "PRIVATE" }] }`.
- **Schreib-Pfad:** Bei `createRecipe()` wird `familyId` aus `session.user.familyId` gezogen, nicht vom Client.
- **Owner-Check vor Edit/Delete:** Server Action laedt das Rezept, vergleicht `createdById` mit `session.user.id`.

### Rezept-Lifecycle

1. `POST` via Server Action in `src/lib/recipes/server.ts:createRecipe()`
   - Slug-Eindeutigkeit ueber `uniqueSlug()`
   - Ingredients per Upsert (Name als Unique-Key)
   - Schritte: entweder Input-Steps oder Auto-Split aus `instructions`
   - Alles in einer `prisma.$transaction()`
2. Bilder kommen separat ueber Upload-Action → `src/lib/images/` (Sharp: Sepia, Resize, Thumbnail-Variante)
3. Anzeige: Server Component laedt Recipe + RecipeImages (geordnet) + RecipeSteps + Naehrwerte
4. PDF: `GET /api/recipes/[id]/pdf` startet Puppeteer, der die Print-Route rendert (`/print/recipe?id=...`)

### Web-Import

1. User gibt URL ein, `POST /api/import/web`
2. `src/lib/import/ssrf.ts:assertPublicUrl()` lehnt Localhost, RFC1918 etc. ab
3. `src/lib/import/web.ts` versucht in Reihenfolge:
   - JSON-LD-Recipe aus statischem HTML (Cheerio)
   - Puppeteer-Fallback (Cloudflare, JS-Heavy)
   - Ollama-Fallback (lokales LLM, optional — nur wenn `OLLAMA_BASE_URL` reagiert)
4. Ergebnis durch `aiRecipeSchema.parse()` validiert
5. User sieht Editor mit vorgefuellten Feldern, bestaetigt → `createRecipe()`

### Speiseplan → Einkaufsliste

1. User markiert MealPlan-Entries
2. Server Action ruft `src/lib/speiseplan/shopping-export.ts:buildShoppingItemsForEntries()`
3. Pro Entry: `scaleAmount(originalAmount, recipe.servings, entry.servings)` aus `units/`
4. Aggregation ueber gleiche Zutaten in `src/lib/shopping/consolidate.ts`
5. ShoppingItem-Rows werden in die aktive ShoppingList des Users geschrieben

### OurGroceries-Push

1. User klickt im Teilen-Menue „→ OurGroceries"
2. `POST /api/shopping-list/[id]/export/ourgroceries`
3. Credentials werden entschluesselt (`crypto/credentials.ts`), Login via `integrations/ourgroceries/client.ts`
4. Aisles aus `Ingredient.category` ueber `category-map.ts` (DE → Englisch); fehlende Aisles werden als Custom-Aisle in OG angelegt
5. `insertItems`-Batch mit Single-Insert-Fallback bei API-Bruch
6. 412 wenn Setup fehlt, 502 mit `{ fallback: "csv" }` bei API-Problem → UI bietet CSV-Download an

---

## Konventionen, die im Code immer wiederkommen

Acht Sachen, die nicht-offensichtlich sind und beim Wiedereinstieg Aha-Momente:

1. **Zod an jeder Server-Grenze.** Server Actions parsen `FormData` mit Schemas aus `src/lib/schemas/`. Route Handler ebenso. Tests pruefen Schema-Verstoesse mit.
2. **Multi-Step-DB-Operationen in `prisma.$transaction()`.** Beispiel: `createRecipe` mit Slug + Ingredients + Steps.
3. **`visibleToFamily()` ueberall vor Recipe-Reads.** Wenn du eine neue Read-Stelle baust, geht es nie ohne. Gleiches Muster: `categoryVisibleToFamily()`.
4. **Bilder ausschliesslich in `UPLOAD_DIR`.** Nie `public/`. Route `/api/images/[...path]` macht Ownership-Check beim Ausliefern.
5. **Server Components Default, `"use client"` nur bei Interaktion.** Recipe-Editor ist Client (useState), Recipe-Liste ist Server (Prisma direkt).
6. **Server Actions bevorzugt, Route Handler nur fuer externe Konsumenten** (PDFs, Share-Links, Webhooks, Imports, Exports).
7. **Ollama-Calls mit Timeout + Abort.** 60 s Default, Fallback auf Roh-Text-Editor bei Fehler. Niemals `eval`-artig auf Output.
8. **Versionsstring kommt ausschliesslich aus `package.json`.** Nie hartcodiert, nie aus `KOCHBUCH_VERSION` env-Var im Source (siehe CLAUDE.md Release-Checkliste).

---

## Quer-Verweise

- Code-Regeln und Verbote: [`CLAUDE.md`](../CLAUDE.md)
- Selbsthosting / env-Vars: [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md)
- Geschichte: [`CHANGELOG.md`](../CHANGELOG.md)
- Live-Stand: [`STATUS.md`](../STATUS.md)
- Beitragen: [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md)
