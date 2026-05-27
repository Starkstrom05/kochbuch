-- FTS5-Volltext-Index für Recipe.
--
-- Vorher: Suche lief über 5 OR-LIKE-Klauseln (title, description, instructions,
-- tags, ingredients.ingredient.name) — full table scan bei jedem Suchaufruf.
-- Mit FTS5 reduziert sich das auf einen Token-Index-Lookup.
--
-- recipe_fts spiegelt nur die textuellen Recipe-Spalten. Ingredient-Namen
-- werden serverseitig (search.ts) separat aufgelöst — sie sind über die
-- normalisierte Ingredient-Tabelle verlinkt, eine FTS-Synchronisierung waere
-- nur über Many-to-Many-Triggers machbar (RecipeIngredient ↔ Ingredient).
-- Pragmatisch: Tags + Title/Description/Instructions decken den Großteil ab;
-- der Caller darf ergänzend nach Ingredient-Namen nachladen.

-- 1) Virtuelle FTS5-Tabelle. content_rowid linked auf Recipe.rowid (SQLite-intern).
CREATE VIRTUAL TABLE "recipe_fts" USING fts5(
  title,
  description,
  instructions,
  tags,
  content = "Recipe",
  content_rowid = "rowid",
  tokenize = "unicode61 remove_diacritics 2"
);

-- 2) Bestandsdaten in den FTS-Index laden (idempotent für Erststart).
INSERT INTO "recipe_fts" (rowid, title, description, instructions, tags)
SELECT rowid, title, COALESCE(description, ''), instructions, COALESCE(tags, '')
FROM "Recipe";

-- 3) Triggers: bei jedem INSERT/UPDATE/DELETE auf Recipe synchron halten.
--    SQLite FTS5-Triggers nutzen den 'delete'-Sentinel-Befehl (siehe sqlite docs).
CREATE TRIGGER "recipe_fts_ai" AFTER INSERT ON "Recipe" BEGIN
  INSERT INTO "recipe_fts" (rowid, title, description, instructions, tags)
  VALUES (new.rowid, new.title, COALESCE(new.description, ''), new.instructions, COALESCE(new.tags, ''));
END;

CREATE TRIGGER "recipe_fts_ad" AFTER DELETE ON "Recipe" BEGIN
  INSERT INTO "recipe_fts" (recipe_fts, rowid, title, description, instructions, tags)
  VALUES ('delete', old.rowid, old.title, COALESCE(old.description, ''), old.instructions, COALESCE(old.tags, ''));
END;

CREATE TRIGGER "recipe_fts_au" AFTER UPDATE ON "Recipe" BEGIN
  INSERT INTO "recipe_fts" (recipe_fts, rowid, title, description, instructions, tags)
  VALUES ('delete', old.rowid, old.title, COALESCE(old.description, ''), old.instructions, COALESCE(old.tags, ''));
  INSERT INTO "recipe_fts" (rowid, title, description, instructions, tags)
  VALUES (new.rowid, new.title, COALESCE(new.description, ''), new.instructions, COALESCE(new.tags, ''));
END;
