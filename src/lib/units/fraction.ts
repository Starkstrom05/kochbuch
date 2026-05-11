const VULGAR: Record<string, string> = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
  "1/8": "⅛",
  "3/8": "⅜",
  "5/8": "⅝",
  "7/8": "⅞",
};

const NICE_DENOMS = [2, 3, 4, 8];

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function approxFraction(value: number): { n: number; d: number } | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  let best: { n: number; d: number; err: number } | null = null;
  for (const d of NICE_DENOMS) {
    const n = Math.round(value * d);
    if (n === 0) continue;
    const err = Math.abs(value - n / d);
    if (err > 0.05) continue;
    const g = gcd(n, d);
    const cand = { n: n / g, d: d / g, err };
    if (!best || cand.err < best.err) best = cand;
  }
  return best ? { n: best.n, d: best.d } : null;
}

export function formatAmount(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  if (amount === 0) return "0";

  const whole = Math.trunc(amount);
  const rest = amount - whole;

  if (rest < 0.01) return String(whole);

  if (rest >= 0.99) return String(whole + 1);

  const frac = approxFraction(rest);
  if (frac) {
    const key = `${frac.n}/${frac.d}`;
    const glyph = VULGAR[key] ?? key;
    if (whole === 0) return glyph;
    return `${whole}${glyph.length === 1 ? "" : " "}${glyph}`;
  }

  // Fallback: dezimal mit max 2 Nachkommastellen
  return Number(amount.toFixed(2)).toString().replace(".", ",");
}

export function scaleAmount(
  amount: number | null | undefined,
  fromServings: number,
  toServings: number,
): number | null {
  if (amount == null) return null;
  if (fromServings <= 0 || toServings <= 0) return amount;
  return (amount * toServings) / fromServings;
}
