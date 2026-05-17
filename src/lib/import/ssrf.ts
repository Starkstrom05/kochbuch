import { promises as dns } from "node:dns";
import { isIP } from "node:net";

const BLOCKED_V4 = [
  // RFC 1918
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  // Loopback
  /^127\./,
  // Link-local + cloud metadata (169.254.169.254)
  /^169\.254\./,
  // CGNAT
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  // 0.0.0.0/8
  /^0\./,
];

// IPv6: Loopback ::1, Unique-Local fc00::/7, Link-Local fe80::/10.
// Die alte Prefix-Heuristik mit ":" als Separator hat fc00::1 durchgelassen,
// weil die Adresse mit "fc00:" startet, nicht mit "fc:".
const BLOCKED_V6_PATTERNS: RegExp[] = [
  /^::1$/,
  /^f[cd][0-9a-f]{2}(:|$)/,
  /^fe[89ab][0-9a-f](:|$)/,
];

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    return BLOCKED_V4.some((r) => r.test(ip));
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    return BLOCKED_V6_PATTERNS.some((r) => r.test(lower));
  }
  return false;
}

export type SsrfCheckResult = { ok: true } | { ok: false; reason: string };

export async function assertPublicUrl(rawUrl: string): Promise<SsrfCheckResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Ungültige URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `Protokoll ${url.protocol} nicht erlaubt` };
  }
  const host = url.hostname;
  if (!host) return { ok: false, reason: "Kein Hostname in URL" };

  const candidates: string[] = isIP(host)
    ? [host]
    : (await dns.lookup(host, { all: true })).map((a) => a.address);

  for (const ip of candidates) {
    if (isPrivateIp(ip)) {
      return { ok: false, reason: `IP ${ip} ist privat/intern und nicht erlaubt` };
    }
  }
  return { ok: true };
}
