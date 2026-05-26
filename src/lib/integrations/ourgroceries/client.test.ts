import { describe, expect, it, vi } from "vitest";
import { OurGroceriesApiError, OurGroceriesAuthError, OurGroceriesClient } from "./client";

type Handler = (req: { url: string; init?: RequestInit }) => Response | Promise<Response>;

function mkFetch(handler: Handler): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler({ url, init });
  }) as unknown as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const HTML_OK = (teamId = "team-42", categoryListId = "cat-7") =>
  `<html><script>
    var g_teamId = "${teamId}";
    var g_staticMetalist = ${JSON.stringify([
      { id: "shop-1", listType: "SHOPPING" },
      { id: categoryListId, listType: "CATEGORY" },
    ])};
   </script></html>`;

const BASE = "https://og.test";

describe("OurGroceriesClient.login", () => {
  it("returns session with cookie, teamId, categoryListId on happy path", async () => {
    const handler = vi.fn<Handler>(({ url }) => {
      if (url.endsWith("/sign-in")) {
        return new Response(null, {
          status: 302,
          headers: { "set-cookie": "ourgroceries-auth=abc123; Path=/; HttpOnly" },
        });
      }
      if (url.endsWith("/your-lists/")) {
        return new Response(HTML_OK(), { status: 200 });
      }
      throw new Error(`Unexpected url: ${url}`);
    });

    const client = new OurGroceriesClient({ fetchImpl: mkFetch(handler), baseUrl: BASE });
    const session = await client.login("alice@example.com", "pw");

    expect(session.cookie).toBe("ourgroceries-auth=abc123");
    expect(session.teamId).toBe("team-42");
    expect(session.categoryListId).toBe("cat-7");
  });

  it("sends emailAddress/password/action form fields", async () => {
    let captured: string | null = null;
    const handler: Handler = ({ url, init }) => {
      if (url.endsWith("/sign-in")) {
        captured = init?.body?.toString() ?? null;
        return new Response(null, {
          status: 302,
          headers: { "set-cookie": "ourgroceries-auth=ok" },
        });
      }
      return new Response(HTML_OK(), { status: 200 });
    };
    const client = new OurGroceriesClient({ fetchImpl: mkFetch(handler), baseUrl: BASE });
    await client.login("alice@example.com", "pw");
    expect(captured).toContain("emailAddress=alice%40example.com");
    expect(captured).toContain("password=pw");
    expect(captured).toContain("action=sign-in");
    expect(captured).not.toContain("sign-me-in");
  });

  it("throws OurGroceriesAuthError when no auth cookie is set", async () => {
    const client = new OurGroceriesClient({
      fetchImpl: mkFetch(() => new Response(null, { status: 200 })),
      baseUrl: BASE,
    });
    await expect(client.login("x", "y")).rejects.toBeInstanceOf(OurGroceriesAuthError);
  });

  it("throws OurGroceriesApiError when teamId cannot be parsed", async () => {
    const client = new OurGroceriesClient({
      fetchImpl: mkFetch(({ url }) => {
        if (url.endsWith("/sign-in"))
          return new Response(null, {
            status: 302,
            headers: { "set-cookie": "ourgroceries-auth=x" },
          });
        return new Response("<html>no teamId here</html>", { status: 200 });
      }),
      baseUrl: BASE,
    });
    await expect(client.login("x", "y")).rejects.toBeInstanceOf(OurGroceriesApiError);
  });

  it("survives missing g_staticMetalist (categoryListId becomes null)", async () => {
    const client = new OurGroceriesClient({
      fetchImpl: mkFetch(({ url }) => {
        if (url.endsWith("/sign-in"))
          return new Response(null, {
            status: 302,
            headers: { "set-cookie": "ourgroceries-auth=x" },
          });
        return new Response('<script>var g_teamId = "T";</script>', { status: 200 });
      }),
      baseUrl: BASE,
    });
    const s = await client.login("x", "y");
    expect(s.categoryListId).toBeNull();
  });
});

describe("OurGroceriesClient.listLists", () => {
  it("uses command=getOverview and returns shoppingLists", async () => {
    let capturedCmd: string | undefined;
    const client = new OurGroceriesClient({
      fetchImpl: mkFetch(({ init }) => {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        capturedCmd = body.command;
        return jsonResponse({
          shoppingLists: [
            { id: "L1", name: "Wocheneinkauf" },
            { id: "L2", name: "Mami" },
          ],
        });
      }),
      baseUrl: BASE,
    });
    const lists = await client.listLists({ cookie: "c", teamId: "t", categoryListId: null });
    expect(capturedCmd).toBe("getOverview");
    expect(lists.map((l) => l.id)).toEqual(["L1", "L2"]);
  });

  it("throws OurGroceriesAuthError on 401", async () => {
    const client = new OurGroceriesClient({
      fetchImpl: mkFetch(() => new Response("nope", { status: 401 })),
      baseUrl: BASE,
    });
    await expect(
      client.listLists({ cookie: "c", teamId: "t", categoryListId: null }),
    ).rejects.toBeInstanceOf(OurGroceriesAuthError);
  });
});

describe("OurGroceriesClient.addItems", () => {
  it("creates missing aisles via the master category list and batches inserts", async () => {
    const calls: Array<{ command: string; payload: Record<string, unknown> }> = [];

    const handler: Handler = async ({ init }) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      calls.push({ command: body.command, payload: body });
      if (body.command === "getList") {
        // Master-Kategorienliste-Antwort: enthält "Produce" als Item
        return jsonResponse({
          list: { id: body.listId, items: [{ id: "AISLE-Produce", value: "Produce" }] },
        });
      }
      if (body.command === "insertItem") {
        return jsonResponse({ itemId: `AISLE-${body.value}` });
      }
      if (body.command === "insertItems") {
        return jsonResponse({ items: body.items });
      }
      throw new Error(`Unexpected cmd ${body.command}`);
    };

    const client = new OurGroceriesClient({ fetchImpl: mkFetch(handler), baseUrl: BASE });
    const result = await client.addItems(
      { cookie: "c", teamId: "t", categoryListId: "CAT-LIST" },
      "L1",
      [
        { name: "Tomate", amountLabel: "500 g", aisle: "Produce" },
        { name: "Mehl", amountLabel: "1 kg", aisle: "Dry Goods" },
        { name: "Salz", aisle: null, note: "Pasta Carbonara" },
      ],
    );

    expect(result.added).toBe(3);
    expect(result.failed).toEqual([]);

    // Erwartete Aufrufe: 1× getList (Kategorien), 1× insertItem für "Dry Goods", 1× insertItems
    const insertItemForDryGoods = calls.find(
      (c) => c.command === "insertItem" && c.payload.value === "Dry Goods",
    );
    expect(insertItemForDryGoods?.payload.listId).toBe("CAT-LIST");

    const batch = calls.find((c) => c.command === "insertItems");
    expect(batch).toBeDefined();
    const items = batch!.payload.items as Array<{
      value: string;
      categoryId?: string;
      note?: string;
    }>;
    expect(items[0]).toEqual({ value: "Tomate, 500 g", listId: "L1", categoryId: "AISLE-Produce" });
    expect(items[1]).toMatchObject({ value: "Mehl, 1 kg", categoryId: "AISLE-Dry Goods" });
    expect(items[2]).toMatchObject({ value: "Salz", note: "Pasta Carbonara" });
    expect(items[2].categoryId).toBeUndefined();
  });

  it("falls back to single insertItem when batch fails", async () => {
    let insertItemCount = 0;
    const handler: Handler = async ({ init }) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (body.command === "getList") {
        return jsonResponse({ list: { id: body.listId, items: [] } });
      }
      if (body.command === "insertItems") {
        return new Response("nope", { status: 500 });
      }
      if (body.command === "insertItem") {
        insertItemCount++;
        return jsonResponse({ itemId: `I${insertItemCount}` });
      }
      throw new Error(`Unexpected ${body.command}`);
    };
    const client = new OurGroceriesClient({ fetchImpl: mkFetch(handler), baseUrl: BASE });
    const result = await client.addItems({ cookie: "c", teamId: "t", categoryListId: null }, "L1", [
      { name: "A" },
      { name: "B" },
    ]);
    expect(result.added).toBe(2);
    expect(insertItemCount).toBe(2);
  });

  it("propagates auth errors immediately", async () => {
    const handler: Handler = async () => new Response("nope", { status: 401 });
    const client = new OurGroceriesClient({ fetchImpl: mkFetch(handler), baseUrl: BASE });
    await expect(
      client.addItems({ cookie: "c", teamId: "t", categoryListId: "CAT" }, "L1", [{ name: "X" }]),
    ).rejects.toBeInstanceOf(OurGroceriesAuthError);
  });
});
