import { describe, it, expect } from "vitest";
import {
  splitInstructionsToSteps,
  stepsToInstructions,
  formatDuration,
} from "./steps";

describe("splitInstructionsToSteps", () => {
  it("splits on newlines and trims", () => {
    const steps = splitInstructionsToSteps("Schritt eins\nSchritt zwei");
    expect(steps).toEqual([
      { text: "Schritt eins", durationSeconds: null },
      { text: "Schritt zwei", durationSeconds: null },
    ]);
  });

  it("collapses multiple blank lines and drops empty entries", () => {
    const steps = splitInstructionsToSteps("  A  \n\n\n  B \n   \n");
    expect(steps.map((s) => s.text)).toEqual(["A", "B"]);
  });

  it("returns empty array for empty/whitespace input", () => {
    expect(splitInstructionsToSteps("")).toEqual([]);
    expect(splitInstructionsToSteps("   \n  \n")).toEqual([]);
  });
});

describe("stepsToInstructions", () => {
  it("joins step texts with newlines", () => {
    expect(stepsToInstructions([{ text: "A" }, { text: "B" }])).toBe("A\nB");
  });

  it("trims and drops empty steps", () => {
    expect(stepsToInstructions([{ text: " A " }, { text: "" }, { text: "B" }])).toBe("A\nB");
  });

  it("round-trips with splitInstructionsToSteps", () => {
    const text = "Zwiebeln hacken\nAnbraten\nWürzen";
    expect(stepsToInstructions(splitInstructionsToSteps(text))).toBe(text);
  });
});

describe("formatDuration", () => {
  it("formats sub-hour durations as mm:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(1200)).toBe("20:00");
  });

  it("formats durations from one hour as h:mm:ss", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3905)).toBe("1:05:05");
  });

  it("clamps negatives and floors fractions", () => {
    expect(formatDuration(-10)).toBe("0:00");
    expect(formatDuration(90.9)).toBe("1:30");
  });
});
