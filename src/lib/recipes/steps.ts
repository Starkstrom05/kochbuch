export type StepInput = { text: string; durationSeconds: number | null };

/**
 * Split free-text instructions into discrete steps — one per non-empty line
 * block. Mirrors the inline logic used by the book mode so structured steps and
 * the legacy `instructions` field stay consistent.
 */
export function splitInstructionsToSteps(instructions: string): StepInput[] {
  return instructions
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => ({ text, durationSeconds: null }));
}

/** Join structured steps back into the free-text `instructions` field. */
export function stepsToInstructions(steps: { text: string }[]): string {
  return steps
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join("\n");
}

/** Format a duration in seconds as `mm:ss` (or `h:mm:ss` from one hour). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
