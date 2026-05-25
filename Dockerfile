# syntax=docker/dockerfile:1.7
# --- Dev deps (for builder) -------------------------------------------------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# python3/make/g++ compile the native better-sqlite3 (Prisma 7 driver adapter);
# openssl for the prisma CLI. Build-layer only — the runner copies the compiled
# .node, not these tools.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# --- Prod deps (for runtime) ------------------------------------------------
# Separate stage with only production dependencies. We copy this into the
# runner so puppeteer/bcryptjs and their transitive deps (ws, chromium-bidi,
# @puppeteer/browsers, ...) are guaranteed to be there, regardless of what
# Next.js's standalone tracing did or didn't pick up.
FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app
# Same native build tools as deps — better-sqlite3 is also compiled here for the
# production node_modules that get copied into the runner.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholder: prisma.config.ts (Prisma 7) reads DATABASE_URL eagerly
# when loaded, so it must be set before any prisma CLI call. The real URL is
# injected at runtime by docker compose. No queries run at build.
ENV DATABASE_URL="file:./build-time-placeholder.db" \
    AUTH_SECRET="build-time-only"
RUN npx prisma generate
RUN npm run build

# --- Runtime ---------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium fuer Puppeteer + openssl fuer Prisma + Build-Tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium fonts-liberation fonts-noto-color-emoji \
    openssl ca-certificates dumb-init wget \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home --home-dir /home/nextjs nextjs && \
    mkdir -p /data/db /data/images /data/db/backups && \
    chown -R nextjs:nodejs /data /home/nextjs

ENV HOME=/home/nextjs

# Full production node_modules (puppeteer, bcryptjs, cheerio, sharp, ...)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
# Next.js standalone build — overlays its tracing output on top, but the
# important transitive deps are already covered by prod-deps above.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Prisma 7: die CLI (migrate deploy im Entrypoint) liest die DB-URL aus
# prisma.config.ts statt aus schema.prisma — muss daher im Image liegen.
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
# DevDeps needed for migrate + seed/import scripts (called directly via node,
# not via .bin/ symlinks because COPY dereferences them and breaks the
# bundle's __dirname-relative WASM lookup for prisma's WASM file).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/resolve-pkg-maps ./node_modules/resolve-pkg-maps
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --chown=nextjs:nodejs docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/app/entrypoint.sh"]
CMD ["node", "server.js"]
