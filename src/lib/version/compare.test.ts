import { describe, it, expect } from "vitest";
import { compareVersions, hasNewerVersion, versionResponseSchema } from "./compare";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("detects higher major/minor/patch", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.3.0", "1.2.9")).toBeGreaterThan(0);
    expect(compareVersions("1.2.4", "1.2.3")).toBeGreaterThan(0);
  });

  it("detects lower versions as negative", () => {
    expect(compareVersions("1.2.3", "1.3.0")).toBeLessThan(0);
  });

  it("treats missing segments as 0", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1.2.1", "1.2")).toBeGreaterThan(0);
  });

  it("tolerates a leading v", () => {
    expect(compareVersions("v0.17.0", "0.17.0")).toBe(0);
    expect(compareVersions("v0.18.0", "0.17.0")).toBeGreaterThan(0);
  });
});

describe("hasNewerVersion", () => {
  it("is true only when latest is strictly newer than current", () => {
    expect(hasNewerVersion("0.18.0", "0.17.0")).toBe(true);
    expect(hasNewerVersion("0.17.0", "0.17.0")).toBe(false);
    expect(hasNewerVersion("0.16.0", "0.17.0")).toBe(false);
  });
});

describe("versionResponseSchema", () => {
  it("accepts a well-formed response", () => {
    const parsed = versionResponseSchema.safeParse({
      current: "0.17.0",
      latest: "0.18.0",
      hasUpdate: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects malformed payloads", () => {
    expect(versionResponseSchema.safeParse({ current: "0.17.0" }).success).toBe(false);
    expect(
      versionResponseSchema.safeParse({ current: 1, latest: 2, hasUpdate: "yes" }).success,
    ).toBe(false);
  });
});
