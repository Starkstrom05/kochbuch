import {
  ogAddItemsResponseSchema,
  ogCategoryListItemSchema,
  ogInsertItemResponseSchema,
  ogListDetailResponseSchema,
  ogListsResponseSchema,
  type OgCategory,
  type OgList,
} from "@/lib/schemas/ourgroceries";

/**
 * Inoffizieller OurGroceries-Client.
 *
 * Reverse-engineered Webapp-API von ourgroceries.com. Endpoints sind nicht
 * offiziell dokumentiert und koennen sich ohne Vorwarnung aendern.
 * Referenz: https://github.com/ljmerza/py-our-groceries
 *
 * Architektur-Hinweise:
 * - Alle HTTP-Calls gehen ueber `opts.fetchImpl` (Default: global fetch),
 *   damit Tests einen Mock injizieren koennen.
 * - Auth-State (Cookie + teamId + categoryListId) ist in `OurGroceriesSession`
 *   gekapselt; ruft sich nicht selbst, sondern wird explizit weitergereicht.
 * - Antworten werden mit Zod validiert — bricht die API, wirft `OurGroceriesApiError`
 *   und der UI-Pfad faellt auf CSV zurueck.
 *
 * Bei OG sind "Aisles" (Kategorien) selbst Items in einer speziellen
 * Listentyp-"CATEGORY"-Liste pro Team. Diese Liste-ID wird beim Login aus dem
 * `g_staticMetalist`-JS-Snippet extrahiert.
 */

const BASE = "https://www.ourgroceries.com";
const SIGN_IN_PATH = "/sign-in";
const RPC_PATH = "/your-lists/";

export class OurGroceriesAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OurGroceriesAuthError";
  }
}

export class OurGroceriesApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OurGroceriesApiError";
  }
}

export class OurGroceriesNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OurGroceriesNetworkError";
  }
}

export type OurGroceriesSession = {
  cookie: string;
  teamId: string;
  /** ID der Listentyp-CATEGORY-Liste fuer dieses Team. */
  categoryListId: string | null;
};

export type OurGroceriesItem = {
  name: string;
  /** OG erwartet die Menge als Freitext-String im `value`-Feld neben dem Namen. */
  amountLabel?: string;
  /** Anzeigename der Aisle/Kategorie. Wird ggf. als Custom-Aisle angelegt. */
  aisle?: string | null;
  /** Optionale Notiz (z.B. Rezept-Quelle). */
  note?: string | null;
};

export type OurGroceriesClientOptions = {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
};

type RpcArgs = Record<string, unknown>;

export class OurGroceriesClient {
  private readonly fetchImpl: typeof fetch;
  private readonly base: string;

  constructor(opts: OurGroceriesClientOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.base = opts.baseUrl ?? BASE;
  }

  async login(username: string, password: string): Promise<OurGroceriesSession> {
    const body = new URLSearchParams({
      emailAddress: username,
      password,
      action: "sign-in",
    });

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}${SIGN_IN_PATH}`, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        redirect: "manual",
      });
    } catch (err) {
      throw new OurGroceriesNetworkError(`Login-Request fehlgeschlagen: ${(err as Error).message}`);
    }

    const cookie = extractAuthCookie(res);
    if (!cookie) {
      throw new OurGroceriesAuthError(
        "Login abgelehnt — E-Mail oder Passwort falsch (kein Auth-Cookie zurückgegeben).",
      );
    }

    return await this.fetchTeamAndCategoryList(cookie);
  }

  private async fetchTeamAndCategoryList(cookie: string): Promise<OurGroceriesSession> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}${RPC_PATH}`, {
        method: "GET",
        headers: { Cookie: cookie },
      });
    } catch (err) {
      throw new OurGroceriesNetworkError(`teamId-Abruf fehlgeschlagen: ${(err as Error).message}`);
    }
    if (!res.ok) {
      throw new OurGroceriesApiError(`teamId-Abruf gab HTTP ${res.status} zurück.`, res.status);
    }
    const html = await res.text();
    const teamMatch = /g_teamId\s*=\s*"([^"]+)"/.exec(html);
    if (!teamMatch) {
      throw new OurGroceriesApiError(
        "teamId konnte aus der Login-Folge-Seite nicht extrahiert werden (API-Format hat sich vermutlich geändert).",
      );
    }
    let categoryListId: string | null = null;
    const metaMatch = /g_staticMetalist\s*=\s*(\[[\s\S]*?\]);/.exec(html);
    if (metaMatch) {
      try {
        const meta = JSON.parse(metaMatch[1]) as unknown;
        if (Array.isArray(meta)) {
          for (const raw of meta) {
            const entry = ogCategoryListItemSchema.safeParse(raw);
            if (entry.success && entry.data.listType === "CATEGORY") {
              categoryListId = entry.data.id;
              break;
            }
          }
        }
      } catch {
        // Schweigend: Kategorie-Anlage funktioniert dann nicht, Items gehen aber durch.
      }
    }
    return { cookie, teamId: teamMatch[1], categoryListId };
  }

  async listLists(session: OurGroceriesSession): Promise<OgList[]> {
    const data = await this.rpc(session, { command: "getOverview" });
    const parsed = ogListsResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new OurGroceriesApiError(
        `getOverview-Antwort konnte nicht geparst werden: ${parsed.error.message}`,
      );
    }
    return parsed.data.shoppingLists;
  }

  async listCategories(session: OurGroceriesSession): Promise<OgCategory[]> {
    if (!session.categoryListId) return [];
    const data = await this.rpc(session, {
      command: "getList",
      listId: session.categoryListId,
    });
    const parsed = ogListDetailResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new OurGroceriesApiError(
        `getList-Antwort (Kategorien) konnte nicht geparst werden: ${parsed.error.message}`,
      );
    }
    return parsed.data.list.items;
  }

  async createCategory(session: OurGroceriesSession, name: string): Promise<string> {
    if (!session.categoryListId) {
      throw new OurGroceriesApiError(
        "categoryListId fehlt — Kategorien können nicht angelegt werden.",
      );
    }
    const data = await this.rpc(session, {
      command: "insertItem",
      listId: session.categoryListId,
      value: name,
    });
    const parsed = ogInsertItemResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new OurGroceriesApiError(
        `insertItem-Antwort (Kategorie) konnte nicht geparst werden: ${parsed.error.message}`,
      );
    }
    return parsed.data.itemId ?? parsed.data.listItemId ?? "";
  }

  /**
   * Fuegt mehrere Items in einer Liste hinzu. Loest unbekannte Aisles
   * auto-create auf und cached die IDs lokal. Nutzt das `insertItems`-Batch
   * der OG-API, faellt bei Bedarf auf Einzel-Inserts zurueck.
   */
  async addItems(
    session: OurGroceriesSession,
    listId: string,
    items: OurGroceriesItem[],
  ): Promise<{ added: number; failed: Array<{ item: OurGroceriesItem; reason: string }> }> {
    const categories = await this.listCategories(session);
    const aisleCache = new Map<string, string>();
    for (const c of categories) aisleCache.set(c.value.toLowerCase(), c.id);

    // Aisles vorab anlegen, damit Batch-Insert mit IDs gehen kann.
    const failed: Array<{ item: OurGroceriesItem; reason: string }> = [];
    const toInsert: Array<{ item: OurGroceriesItem; categoryId?: string }> = [];
    for (const item of items) {
      let categoryId: string | undefined;
      if (item.aisle) {
        const key = item.aisle.toLowerCase();
        categoryId = aisleCache.get(key);
        if (!categoryId && session.categoryListId) {
          try {
            categoryId = await this.createCategory(session, item.aisle);
            if (categoryId) aisleCache.set(key, categoryId);
          } catch (err) {
            if (err instanceof OurGroceriesAuthError) throw err;
            // Aisle-Anlage fehlgeschlagen — Item geht ohne Kategorie raus.
          }
        }
      }
      toInsert.push({ item, categoryId });
    }

    if (toInsert.length === 0) return { added: 0, failed };

    const payloadItems = toInsert.map(({ item, categoryId }) => {
      const entry: RpcArgs = { value: buildItemValue(item), listId };
      if (categoryId) entry.categoryId = categoryId;
      if (item.note) entry.note = item.note;
      return entry;
    });

    try {
      const data = await this.rpc(session, {
        command: "insertItems",
        items: payloadItems,
      });
      const parsed = ogAddItemsResponseSchema.safeParse(data);
      if (parsed.success) {
        return { added: toInsert.length, failed };
      }
      // Format hat sich geaendert — Best-effort: einzeln retry'en.
    } catch (err) {
      if (err instanceof OurGroceriesAuthError) throw err;
      // Batch-Pfad gescheitert → Single-Insert-Fallback.
    }

    let added = 0;
    for (const { item, categoryId } of toInsert) {
      try {
        await this.addItem(session, listId, item, categoryId);
        added++;
      } catch (err) {
        if (err instanceof OurGroceriesAuthError) throw err;
        failed.push({ item, reason: (err as Error).message });
      }
    }
    return { added, failed };
  }

  async addItem(
    session: OurGroceriesSession,
    listId: string,
    item: OurGroceriesItem,
    categoryId?: string,
  ): Promise<string> {
    const args: RpcArgs = {
      command: "insertItem",
      listId,
      value: buildItemValue(item),
    };
    if (categoryId) args.categoryId = categoryId;
    if (item.note) args.note = item.note;
    const data = await this.rpc(session, args);
    const parsed = ogInsertItemResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new OurGroceriesApiError(
        `insertItem-Antwort konnte nicht geparst werden: ${parsed.error.message}`,
      );
    }
    return parsed.data.itemId ?? parsed.data.listItemId ?? "";
  }

  private async rpc(session: OurGroceriesSession, args: RpcArgs): Promise<unknown> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}${RPC_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          Cookie: session.cookie,
        },
        body: JSON.stringify({ ...args, teamId: session.teamId }),
      });
    } catch (err) {
      throw new OurGroceriesNetworkError(`RPC-Request fehlgeschlagen: ${(err as Error).message}`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new OurGroceriesAuthError("Session abgelaufen — bitte erneut verbinden.");
    }
    if (!res.ok) {
      throw new OurGroceriesApiError(
        `OurGroceries-API antwortete mit HTTP ${res.status}.`,
        res.status,
      );
    }
    try {
      return await res.json();
    } catch (err) {
      throw new OurGroceriesApiError(`Antwort war kein JSON: ${(err as Error).message}`);
    }
  }
}

function extractAuthCookie(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = /ourgroceries-auth=([^;,\s]+)/i.exec(setCookie);
  if (!match) return null;
  return `ourgroceries-auth=${match[1]}`;
}

function buildItemValue(item: OurGroceriesItem): string {
  if (!item.amountLabel) return item.name;
  return `${item.name}, ${item.amountLabel}`;
}
