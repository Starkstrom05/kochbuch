import { z } from "zod";

/**
 * Zod-Schemas an der Grenze zur OurGroceries-Bruecke. Zwei Familien:
 *  1) Eingaben aus dem Kochbuch-UI (Connect, Liste auswaehlen)
 *  2) Antworten der reverse-engineerten OurGroceries-Web-API
 *
 * Die zweite Familie ist bewusst tolerant (passthrough auf Top-Level-Objekten),
 * weil die API undokumentiert ist und zusaetzliche Felder zurueckliefern darf.
 */

// --- Eingaben aus dem Kochbuch-UI -----------------------------------------

export const connectOurGroceriesSchema = z.object({
  username: z.string().min(1, "E-Mail fehlt").max(200),
  password: z.string().min(1, "Passwort fehlt").max(200),
});

export type ConnectOurGroceriesInput = z.infer<typeof connectOurGroceriesSchema>;

export const selectDefaultListSchema = z.object({
  listId: z.string().min(1, "Liste fehlt").max(200),
});

export type SelectDefaultListInput = z.infer<typeof selectDefaultListSchema>;

// --- Antworten der OurGroceries-API ----------------------------------------

export const ogListSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    listType: z.string().optional(),
  })
  .passthrough();

export type OgList = z.infer<typeof ogListSchema>;

/**
 * `getOverview` liefert ein Objekt mit (u.a.) `shoppingLists: [...]`.
 * Andere Felder (z.B. recipes, masterList) interessieren uns nicht.
 */
export const ogListsResponseSchema = z
  .object({
    shoppingLists: z.array(ogListSchema).default([]),
  })
  .passthrough();

/**
 * Ein Eintrag in einer OG-Liste (Shopping oder Category). Bei einer
 * Category-Typ-Liste ist `value` der Aisle-Name.
 */
export const ogCategorySchema = z
  .object({
    id: z.string().min(1),
    value: z.string().min(1),
  })
  .passthrough();

export type OgCategory = z.infer<typeof ogCategorySchema>;

/**
 * `getList` liefert `{ list: { id, items: [...] } }`. Wir nutzen `items`
 * fuer die Kategorien einer CATEGORY-Liste.
 */
export const ogListDetailResponseSchema = z
  .object({
    list: z
      .object({
        id: z.string().min(1),
        items: z.array(ogCategorySchema).default([]),
      })
      .passthrough(),
  })
  .passthrough();

/**
 * `insertItem` liefert (mind. in einer Version der API) `{ itemId }`. Aeltere
 * Reverse-Engineerings haben `listItemId` gesehen — wir tolerieren beides.
 */
export const ogInsertItemResponseSchema = z
  .object({
    itemId: z.string().min(1).optional(),
    listItemId: z.string().min(1).optional(),
  })
  .passthrough()
  .refine((d) => d.itemId || d.listItemId, "Weder itemId noch listItemId in der Antwort.");

/**
 * `insertItems` liefert i.d.R. `{ items: [...] }` mit den angelegten Items.
 * Wir verifizieren nur, dass die Top-Level-Struktur stimmt.
 */
export const ogAddItemsResponseSchema = z
  .object({
    items: z.array(z.unknown()).optional(),
  })
  .passthrough();

/**
 * Eintrag in der `g_staticMetalist`-JSON, die im HTML des `/your-lists/`-
 * Endpoints eingebettet ist. Listentyp-CATEGORY-Eintrag liefert die ID
 * der Master-Kategorienliste.
 */
export const ogCategoryListItemSchema = z
  .object({
    id: z.string().min(1),
    listType: z.string(),
  })
  .passthrough();
