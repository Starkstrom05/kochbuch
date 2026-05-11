/**
 * Preflight: smoke-test that all critical modules can be required at runtime.
 * Run inside the built container before pushing to catch tracing/dependency
 * gaps (next.js standalone often misses transitive deps).
 *
 *   docker run --rm <image> node /app/node_modules/tsx/dist/cli.mjs scripts/preflight.ts
 *
 * Exits 0 if all imports resolve, 1 with the failing module otherwise.
 */

const critical = [
  "bcryptjs",
  "next-auth",
  "@auth/prisma-adapter",
  "@prisma/client",
  "prisma",
  "cheerio",
  "puppeteer",
  "puppeteer-core",
  "@puppeteer/browsers",
  "chromium-bidi",
  "devtools-protocol",
  "ws",
  "tesseract.js",
  "sharp",
  "tsx",
  "esbuild",
  "zod",
];

async function main() {
  let failed = 0;
  for (const mod of critical) {
    try {
      await import(mod);
      console.log(`✓ ${mod}`);
    } catch (err) {
      console.error(`✗ ${mod}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} module(s) missing.`);
    process.exit(1);
  }
  console.log(`\nAll ${critical.length} critical modules load.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
