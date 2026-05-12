import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const PUBLIC_PATHS = ["/", "/login", "/register", "/share", "/sw.js", "/manifest.webmanifest"];
const PUBLIC_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/api/share",  // public share PDF endpoints
  "/_next",
  "/assets",
  "/share/",
  "/favicon",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Puppeteer rendert /print/* und laedt waehrenddessen auch Bilder via
  // /api/images/*. Beide Pfade akzeptieren den AUTH_SECRET-Token als
  // Internal-Bypass — von aussen nicht erratbar.
  const isInternalPath =
    pathname.startsWith("/print/") || pathname.startsWith("/api/images/");
  if (isInternalPath) {
    const token = req.headers.get("x-internal-token");
    if (token && token === process.env.AUTH_SECRET) return NextResponse.next();
    // Fuer /api/images/* fallen wir zurueck auf die Standard-Auth-Pruefung
    // (Session-User darf eigene Bilder sehen), fuer /print/* nicht.
    if (pathname.startsWith("/print/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!req.auth) {
    // API routes get 401, pages get redirect to /login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
