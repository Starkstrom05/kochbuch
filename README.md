# Omas Kochbuch

Selbstgehostetes Familien-Kochbuch im nostalgischen "Oma-Rezeptbuch"-Design.

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
- PDF-Export im Oma-Design (A5)
- Multi-User (Familie) + oeffentliche Share-Links

## Lokale Entwicklung

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Dann <http://localhost:3000> oeffnen.

## Deployment auf TrueNAS

Siehe `docs/deployment.md` (folgt nach Phase 6).

## Status

Pre-Alpha — siehe Plan in `/home/jonas/.claude/plans/`.

## Lizenz

MIT (folgt mit `LICENSE`-Datei).
