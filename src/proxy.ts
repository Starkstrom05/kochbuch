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

  // /_print/* is rendered by Puppeteer; require a secret header so it can't
  // be hit from the outside even if someone guesses a recipe ID.
  if (pathname.startsWith("/_print/")) {
    const token = req.headers.get("x-internal-token");
    if (token && token === process.env.AUTH_SECRET) return NextResponse.next();
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
