import { describe, expect, it } from "vitest";
import {
  pickDefaultTargetListId,
  shouldShowListPicker,
  targetListIdSchema,
  type SelectableList,
} from "./target";

const list = (id: string, isOwn: boolean): SelectableList => ({
  id,
  name: id,
  isOwn,
  ownerName: "x",
});

describe("pickDefaultTargetListId", () => {
  it("wählt die erste eigene Liste, auch wenn geteilte davor stünden", () => {
    expect(pickDefaultTargetListId([list("shared", false), list("own", true)])).toBe("own");
  });

  it("fällt auf die erste Liste zurück, wenn keine eigene dabei ist", () => {
    expect(pickDefaultTargetListId([list("s1", false), list("s2", false)])).toBe("s1");
  });

  it("liefert null bei leerer Liste", () => {
    expect(pickDefaultTargetListId([])).toBeNull();
  });
});

describe("shouldShowListPicker", () => {
  it("zeigt den Picker ab zwei Listen", () => {
    expect(shouldShowListPicker([list("a", true), list("b", false)])).toBe(true);
  });

  it("versteckt ihn bei einer oder keiner Liste", () => {
    expect(shouldShowListPicker([list("a", true)])).toBe(false);
    expect(shouldShowListPicker([])).toBe(false);
  });
});

describe("targetListIdSchema", () => {
  it("akzeptiert eine cuid-artige ID und trimmt", () => {
    expect(targetListIdSchema.parse("  clx123abc  ")).toBe("clx123abc");
  });

  it("lehnt Leerstrings ab", () => {
    expect(targetListIdSchema.safeParse("").success).toBe(false);
    expect(targetListIdSchema.safeParse("   ").success).toBe(false);
  });
});
