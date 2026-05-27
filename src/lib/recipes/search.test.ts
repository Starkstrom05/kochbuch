import { describe, it, expect } from "vitest";
import { buildFtsQuery } from "./search";

describe("buildFtsQuery", () => {
  it("quoted-token mit Prefix-Stern für ein einzelnes Wort", () => {
    expect(buildFtsQuery("Tomate")).toBe('"Tomate"*');
  });

  it("AND-verknuepfte Tokens fuer eine Mehrwort-Suche", () => {
    expect(buildFtsQuery("tomatensuppe basilikum")).toBe('"tomatensuppe"* "basilikum"*');
  });

  it("ueberfluessigen Whitespace verwerfen", () => {
    expect(buildFtsQuery("  pfann   kuchen  ")).toBe('"pfann"* "kuchen"*');
  });

  it("FTS5-Syntax-Sonderzeichen werden durch Quotes neutralisiert", () => {
    // Anfuehrungszeichen im Token werden FTS-konform verdoppelt.
    expect(buildFtsQuery('omas "geheim"')).toBe('"omas"* """geheim"""*');
  });

  it("FTS-Operatoren (OR, NEAR, *) werden als Literal behandelt", () => {
    // Ohne das Quoten wuerde FTS5 das `OR` als Operator lesen.
    expect(buildFtsQuery("kraut OR ruebe")).toBe('"kraut"* "OR"* "ruebe"*');
  });

  it("Leerer/Whitespace-only Input gibt Leer-String zurueck", () => {
    expect(buildFtsQuery("")).toBe("");
    expect(buildFtsQuery("   ")).toBe("");
  });

  it("Unicode (Umlaute) bleibt erhalten — tokenizer remove_diacritics=2 macht den Rest", () => {
    expect(buildFtsQuery("kühlschrank pürée")).toBe('"kühlschrank"* "pürée"*');
  });
});
