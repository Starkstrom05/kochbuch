import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { assertPublicUrl } from "@/lib/import/ssrf";

const FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

// Proxy für die Bild-Vorschau beim Web-Import. Externe Bild-URLs (Akamai-CDNs
// wie c.rewe-static.de) werden im Browser teilweise blockiert (Referer,
// CORS, CSP). Wir laden serverseitig und streamen das Bild zurück, damit das
// <img>-Element nur unsere eigene Origin sieht.
//
// SSRF-Schutz via assertPublicUrl, Auth-Schutz weil der Endpoint ansonsten ein
// offener Proxy wäre.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url fehlt" }, { status: 400 });

  const check = await assertPublicUrl(url);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  const upstream = await fetch(url, {
    headers: {
      "User-Agent": FETCH_UA,
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
    },
    // SSRF-Hardening: ohne manual-redirect würde fetch einer 30x-Antwort auf
    // eine interne IP folgen, an der `assertPublicUrl` nicht mehr greift.
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  }).catch((err: unknown) => {
    return new Response(
      `upstream-fetch-failed: ${err instanceof Error ? err.message : "unknown"}`,
      { status: 502 },
    );
  });

  if (upstream.status >= 300 && upstream.status < 400) {
    return new Response("Redirect von Upstream nicht erlaubt", { status: 502 });
  }
  if (!upstream.ok) {
    return new Response(`upstream HTTP ${upstream.status}`, { status: 502 });
  }

  const ct = upstream.headers.get("content-type") ?? "application/octet-stream";
  if (!ct.startsWith("image/")) {
    return new Response("Antwort ist kein Bild", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": ct,
      "Cache-Control": "private, max-age=600",
    },
  });
}
