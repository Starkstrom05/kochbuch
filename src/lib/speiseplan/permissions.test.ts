import { describe, it, expect } from "vitest";
import { decideViewMealPlan } from "./permissions";

const ownerPlan = { ownerId: "alice", familyShared: false };
const sharedPlan = { ownerId: "alice", familyShared: true };

describe("decideViewMealPlan", () => {
  it("Owner sieht seinen eigenen Plan, auch wenn nicht geteilt", () => {
    expect(decideViewMealPlan({ id: "alice", role: "MEMBER" }, ownerPlan, false)).toBe(true);
  });

  it("Owner sieht seinen Plan auch ohne shared-Cookbook", () => {
    expect(decideViewMealPlan({ id: "alice", role: "MEMBER" }, sharedPlan, false)).toBe(true);
  });

  it("ADMIN sieht jeden Plan — auch nicht-geteilte fremder User", () => {
    expect(decideViewMealPlan({ id: "admin", role: "ADMIN" }, ownerPlan, false)).toBe(true);
    expect(decideViewMealPlan({ id: "admin", role: "ADMIN" }, sharedPlan, false)).toBe(true);
  });

  it("Fremder User sieht nicht-geteilte Pläne nicht", () => {
    expect(decideViewMealPlan({ id: "bob", role: "MEMBER" }, ownerPlan, true)).toBe(false);
  });

  it("Fremder User sieht geteilten Plan nur mit gemeinsamem Cookbook", () => {
    expect(decideViewMealPlan({ id: "bob", role: "MEMBER" }, sharedPlan, true)).toBe(true);
    expect(decideViewMealPlan({ id: "bob", role: "MEMBER" }, sharedPlan, false)).toBe(false);
  });

  it("CHILD-Rolle nutzt dieselben Regeln wie MEMBER (kein Bonus, kein Malus)", () => {
    expect(decideViewMealPlan({ id: "kid", role: "CHILD" }, sharedPlan, true)).toBe(true);
    expect(decideViewMealPlan({ id: "kid", role: "CHILD" }, sharedPlan, false)).toBe(false);
  });

  it("familyShared = false bricht den Pfad ab — kein Fallback auf sharedCookbook", () => {
    // selbst wenn beide User ein Cookbook teilen, aber der Plan nicht geshared
    // ist, soll niemand außer Owner/Admin reinsehen.
    expect(decideViewMealPlan({ id: "bob", role: "MEMBER" }, ownerPlan, true)).toBe(false);
  });
});
