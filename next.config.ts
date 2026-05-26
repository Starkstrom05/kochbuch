import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // LAN-Geraete (z.B. iPad) duerfen die Dev-HMR-Ressourcen abrufen. Greift
  // nur im dev-Modus; in Production ist die App ohnehin host-gebunden.
  allowedDevOrigins: ["192.168.188.55", "192.168.188.*"],
  images: {
    remotePatterns: [],
  },
  // Next traces only what it can statically detect. bcryptjs is called from
  // auth.ts (NextAuth Credentials provider) but the tracer misses it because
  // of how next-auth resolves providers; puppeteer is loaded via
  // `await import("puppeteer")` and not traced either. Force them into the
  // standalone bundle.
  outputFileTracingIncludes: {
    "/**/*": [
      "./node_modules/bcryptjs/**",
      "./node_modules/puppeteer/**",
      "./node_modules/puppeteer-core/**",
      "./node_modules/@puppeteer/**",
      "./node_modules/chromium-bidi/**",
      "./node_modules/devtools-protocol/**",
      "./node_modules/cosmiconfig/**",
      "./node_modules/typed-query-selector/**",
      "./node_modules/cheerio/**",
      "./CHANGELOG.md",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
