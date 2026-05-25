import { describe, it, expect } from "vitest";
import { toThumbPath } from "./thumb";

describe("toThumbPath", () => {
  it("derives the -thumb.jpg path next to the original", () => {
    expect(toThumbPath("/recipes/r1/m123.jpg")).toBe("/recipes/r1/m123-thumb.jpg");
  });

  it("is case-insensitive on the extension", () => {
    expect(toThumbPath("/recipes/r1/m123.JPG")).toBe("/recipes/r1/m123-thumb.jpg");
  });

  it("leaves non-jpg paths unchanged (falls back to original)", () => {
    expect(toThumbPath("/recipes/r1/x.png")).toBe("/recipes/r1/x.png");
    expect(toThumbPath("/recipes/r1/x.webp")).toBe("/recipes/r1/x.webp");
  });

  it("only rewrites the trailing extension", () => {
    expect(toThumbPath("/recipes/jpg-folder/m.jpg")).toBe("/recipes/jpg-folder/m-thumb.jpg");
  });
});
