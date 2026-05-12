import { describe, expect, it } from "vitest";
import { parseRecipeFromHtml } from "./web";

const URL = "https://example.com/rezept";

function htmlWithLd(ld: Record<string, unknown> | Record<string, unknown>[]): string {
  return `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(
    ld,
  )}</script></head><body></body></html>`;
}

describe("parseRecipeFromHtml", () => {
  it("liest Recipe aus JSON-LD", () => {
    const html = htmlWithLd({
      "@type": "Recipe",
      name: "Pfannkuchen",
      recipeYield: "4",
      prepTime: "PT10M",
      cookTime: "PT15M",
      recipeIngredient: ["200 g Mehl", "2 Stk Eier", "Salz, nach Geschmack"],
      recipeInstructions: [
        { text: "Mehl mit Eiern verrühren." },
        { text: "Salz dazu, in Pfanne backen lange genug." },
      ],
      keywords: "schnell, vegetarisch",
    });
    const result = parseRecipeFromHtml(html, URL);
    expect(result).not.toBeNull();
    expect(result!.method).toBe("json-ld");
    expect(result!.recipe.title).toBe("Pfannkuchen");
    expect(result!.recipe.servings).toBe(4);
    expect(result!.recipe.prepTimeMinutes).toBe(10);
    expect(result!.recipe.cookTimeMinutes).toBe(15);
    expect(result!.recipe.ingredients).toHaveLength(3);
    expect(result!.recipe.ingredients[0]).toMatchObject({
      name: "Mehl",
      amount: 200,
      unit: "g",
    });
    expect(result!.recipe.tags).toEqual(["schnell", "vegetarisch"]);
  });

  it("findet Recipe innerhalb @graph", () => {
    const html = htmlWithLd({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "irgendeine Seite" },
        {
          "@type": "Recipe",
          name: "Quiche",
          recipeIngredient: ["1 Pkg Blätterteig"],
          recipeInstructions: "Backen bis goldbraun. Dann servieren.",
        },
      ],
    });
    const result = parseRecipeFromHtml(html, URL);
    expect(result?.recipe.title).toBe("Quiche");
  });

  it("liefert null wenn kein JSON-LD vorhanden", () => {
    const html = "<!doctype html><html><body><p>nix</p></body></html>";
    expect(parseRecipeFromHtml(html, URL)).toBeNull();
  });

  it("liefert null bei kaputtem JSON-LD", () => {
    const html =
      '<!doctype html><html><head><script type="application/ld+json">{not json</script></head><body></body></html>';
    expect(parseRecipeFromHtml(html, URL)).toBeNull();
  });

  it("ignoriert JSON-LD ohne @type=Recipe", () => {
    const html = htmlWithLd({ "@type": "Article", headline: "kein Rezept" });
    expect(parseRecipeFromHtml(html, URL)).toBeNull();
  });
});
