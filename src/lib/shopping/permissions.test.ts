import { describe, it, expect } from "vitest";
import { decideAccessShoppingList, decideManageShoppingList, type Actor } from "./permissions";

const owner: Actor = { id: "u-owner", role: "MEMBER" };
const member: Actor = { id: "u-member", role: "MEMBER" };
const stranger: Actor = { id: "u-stranger", role: "MEMBER" };
const admin: Actor = { id: "u-admin", role: "ADMIN" };

const list = { ownerId: "u-owner", memberIds: ["u-member"] };

describe("decideAccessShoppingList", () => {
  it("owner darf zugreifen", () => {
    expect(decideAccessShoppingList(owner, list)).toBe(true);
  });

  it("eingetragenes Mitglied darf zugreifen", () => {
    expect(decideAccessShoppingList(member, list)).toBe(true);
  });

  it("Fremder darf nicht", () => {
    expect(decideAccessShoppingList(stranger, list)).toBe(false);
  });

  it("ADMIN darf immer", () => {
    expect(decideAccessShoppingList(admin, { ownerId: "x", memberIds: [] })).toBe(true);
  });
});

describe("decideManageShoppingList", () => {
  it("owner darf verwalten", () => {
    expect(decideManageShoppingList(owner, { ownerId: "u-owner" })).toBe(true);
  });

  it("Mitglied darf NICHT verwalten (nur Inhalt bearbeiten)", () => {
    expect(decideManageShoppingList(member, { ownerId: "u-owner" })).toBe(false);
  });

  it("Fremder darf nicht", () => {
    expect(decideManageShoppingList(stranger, { ownerId: "u-owner" })).toBe(false);
  });

  it("ADMIN darf immer", () => {
    expect(decideManageShoppingList(admin, { ownerId: "u-owner" })).toBe(true);
  });
});
