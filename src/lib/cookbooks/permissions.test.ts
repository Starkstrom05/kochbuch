import { describe, expect, it } from "vitest";
import { decideReadCookbook, decideWriteCookbook } from "./permissions";

const owner = { id: "user-owner", role: "MEMBER" as const };
const viewer = { id: "user-viewer", role: "MEMBER" as const };
const stranger = { id: "user-stranger", role: "MEMBER" as const };
const admin = { id: "user-admin", role: "ADMIN" as const };
const child = { id: "user-child", role: "CHILD" as const };

const cookbook = { ownerId: owner.id, viewerIds: [viewer.id] };

describe("decideWriteCookbook", () => {
  it("erlaubt Owner", () => {
    expect(decideWriteCookbook(owner, cookbook)).toBe(true);
  });
  it("verbietet eingetragenen Viewer", () => {
    expect(decideWriteCookbook(viewer, cookbook)).toBe(false);
  });
  it("verbietet fremden User", () => {
    expect(decideWriteCookbook(stranger, cookbook)).toBe(false);
  });
  it("erlaubt ADMIN ueberall", () => {
    expect(decideWriteCookbook(admin, cookbook)).toBe(true);
  });
  it("verbietet CHILD trotz Rolle", () => {
    expect(decideWriteCookbook(child, cookbook)).toBe(false);
  });
});

describe("decideReadCookbook", () => {
  it("erlaubt Owner", () => {
    expect(decideReadCookbook(owner, cookbook)).toBe(true);
  });
  it("erlaubt eingetragenen Viewer", () => {
    expect(decideReadCookbook(viewer, cookbook)).toBe(true);
  });
  it("verbietet fremden User ohne Eintrag", () => {
    expect(decideReadCookbook(stranger, cookbook)).toBe(false);
  });
  it("erlaubt ADMIN ueberall", () => {
    expect(decideReadCookbook(admin, cookbook)).toBe(true);
  });
  it("verbietet CHILD ohne Eintrag", () => {
    expect(decideReadCookbook(child, cookbook)).toBe(false);
  });
  it("erlaubt CHILD mit Eintrag", () => {
    expect(decideReadCookbook(child, { ownerId: owner.id, viewerIds: [child.id] })).toBe(true);
  });
});
