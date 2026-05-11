import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
