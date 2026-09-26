import { promises as dns, type LookupAddress } from "node:dns";
import { isIP, type LookupFunction } from "node:net";
import { Agent, type Dispatcher } from "undici";

/**
 * Erzeugt aus der bereits validierten `lookup` (siehe assertPublicUrlPinned)
 * einen undici-Dispatcher, der beim eigentlichen Connect NICHT neu aufloest —
 * schliesst das DNS-Rebinding-Fenster (TOCTOU) zwischen Pruefung und Fetch.
 * Aufruf: `fetch(url, { dispatcher: pinnedDispatcher(lookup) })`. Der Agent
 * wird nach Verbrauch des Response GC-collected (Keep-Alive-Timeout raeumt den
 * Verbindungspool ab); bei der niedrigen Import-/Bild-Frequenz akzeptabel.
 */
export function pinnedDispatcher(lookup: LookupFunction): Dispatcher {
  return new Agent({ connect: { lookup } });
}

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
const BLOCKED_V6_PATTERNS: RegExp[] = [/^::1$/, /^f[cd][0-9a-f]{2}(:|$)/, /^fe[89ab][0-9a-f](:|$)/];

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

type ResolvedCheck = { ok: true; candidates: LookupAddress[] } | { ok: false; reason: string };

function parseHttpUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Ungültige URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `Protokoll ${url.protocol} nicht erlaubt` };
  }
  return { ok: true, url };
}

// Gemeinsamer Kern fuer assertPublicUrl + assertPublicUrlPinned: genau EINE
// DNS-Aufloesung, deren Ergebnis-IPs sowohl fuer die Validierung als auch
// (im Pinned-Fall) fuer den anschliessenden Verbindungsaufbau wiederverwendet
// werden. Zwei getrennte Lookups wuerden selbst ein (kleineres) Rebinding-
// Fenster zwischen Check und Pin oeffnen.
async function resolveAndValidate(url: URL): Promise<ResolvedCheck> {
  const host = url.hostname;
  if (!host) return { ok: false, reason: "Kein Hostname in URL" };

  const candidates: LookupAddress[] = isIP(host)
    ? [{ address: host, family: isIP(host) as 4 | 6 }]
    : await dns.lookup(host, { all: true });

  for (const { address } of candidates) {
    if (isPrivateIp(address)) {
      return { ok: false, reason: `IP ${address} ist privat/intern und nicht erlaubt` };
    }
  }
  return { ok: true, candidates };
}

/**
 * Prueft Protokoll + aufgeloeste IPs gegen die Private/Internal-Blockliste.
 *
 * TOCTOU-Hinweis (DNS-Rebinding): Diese Funktion validiert den Hostnamen
 * genau einmal. Ein anschliessendes `fetch(url)` beim Aufrufer loest den
 * Hostnamen unabhaengig ERNEUT auf — zwischen Check und Connect kann sich
 * die DNS-Antwort (kurze TTL, bösartiger Nameserver) auf eine private IP
 * aendern ("DNS-Rebinding"). Fuer volle Absicherung muss der Aufrufer statt
 * `fetch(url)` die bereits geprueften IPs pinnen (siehe assertPublicUrlPinned
 * unten, das eine dns.lookup-kompatible Funktion fuer einen Node-
 * http(s)-Agent bzw. undici-Dispatcher `{ connect: { lookup } }` liefert).
 * Aktuell verwenden web.ts und lib/recipes/images.ts noch die ungepinnte
 * Variante — das Schliessen des Fensters dort ist eine offene Anschluss-
 * arbeit ausserhalb des fuer diese Aenderung erlaubten Datei-Scopes.
 */
export async function assertPublicUrl(rawUrl: string): Promise<SsrfCheckResult> {
  const parsed = parseHttpUrl(rawUrl);
  if (!parsed.ok) return parsed;

  const result = await resolveAndValidate(parsed.url);
  if (!result.ok) return result;
  return { ok: true };
}

/**
 * Wie assertPublicUrl, liefert bei ok:true zusaetzlich eine dns.lookup-
 * kompatible `lookup`-Funktion, die IMMER exakt die bereits geprueften IPs
 * zurueckgibt (kein zweiter, potenziell abweichender DNS-Lookup). Ein
 * Aufrufer kann sie z.B. via `new http.Agent({ lookup })` /
 * `new https.Agent({ lookup })` (oder dem Aequivalent eines undici-
 * Dispatcher-Connect-Optionsobjekts) an `fetch(url, { dispatcher })`
 * durchreichen und damit das DNS-Rebinding-Fenster aus dem Hinweis oben
 * vollstaendig schliessen, weil der Hostname beim eigentlichen Connect
 * nicht mehr neu aufgeloest wird.
 */
export async function assertPublicUrlPinned(
  rawUrl: string,
): Promise<SsrfCheckResult & { lookup?: LookupFunction }> {
  const parsed = parseHttpUrl(rawUrl);
  if (!parsed.ok) return parsed;

  const result = await resolveAndValidate(parsed.url);
  if (!result.ok) return result;

  const candidates = result.candidates;
  const lookup: LookupFunction = (_hostname, options, callback) => {
    const wantsAll =
      typeof options === "object" && options !== null && (options as { all?: boolean }).all;
    if (wantsAll) {
      callback(null, candidates, undefined as unknown as number);
      return;
    }
    const first = candidates[0];
    callback(null, first.address, first.family);
  };

  return { ok: true, lookup };
}
