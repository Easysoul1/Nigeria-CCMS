# syntax=docker/dockerfile:1.7
# ---------- base ----------
FROM node:22-alpine AS base
RUN corepack enable \
 && apk add --no-cache openssl libc6-compat dumb-init \
 && mkdir -p /data && chown -R node:node /data
WORKDIR /app

# ---------- deps ----------
# Only manifests, so this layer caches unless a package.json changes.
FROM base AS deps
# tsconfig.base.json is *not* optional: apps/server/tsconfig.json extends it,
# and it carries esModuleInterop + skipLibCheck. Without it in the image tsc
# falls back to defaults and every default-imported CJS module errors out.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @court-ccms/server...

# ---------- builder ----------
FROM deps AS builder
COPY --from=deps /app/tsconfig.base.json ./tsconfig.base.json
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
RUN --mount=type=cache,id=prisma-engines,target=/root/.cache/prisma \
    pnpm --filter @court-ccms/server exec prisma generate
# Belt-and-braces: strip any incremental state that slipped past .dockerignore
# so nest build is guaranteed to actually emit dist/.
RUN find . -name '*.tsbuildinfo' -delete || true
RUN pnpm --filter @court-ccms/server build \
 && test -f apps/server/dist/main.js

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=4000

# Copy the workspace so pnpm's symlinks resolve.
#   /app/node_modules/.pnpm/...     ← real packages
#   /app/apps/server/node_modules/* ← symlinks into ^
# Root node_modules comes from `deps` (heavy, cached). The generated Prisma
# client payload is NOT at a predictable path in pnpm's layout — it nests
# inside `.pnpm/@prisma+client@<ver>/node_modules/...`. Trying to COPY a
# fixed path fails. Instead we regenerate in `runner` after the schema is
# present; ~1s and layout-independent.
COPY --from=deps    /app/node_modules                         ./node_modules
COPY --from=builder /app/apps/server/node_modules             ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist                     ./apps/server/dist
COPY --from=builder /app/apps/server/prisma                   ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json             ./apps/server/package.json
COPY --from=builder /app/packages/shared                      ./packages/shared
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/server/scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Regenerate the Prisma client in the final layer so it lands wherever pnpm
# resolved @prisma/client to. Cheap: the binary engines were downloaded once
# in `deps` and are already on disk.
RUN --mount=type=cache,id=prisma-engines,target=/home/node/.cache/prisma \
    cd apps/server && ./node_modules/.bin/prisma generate \
 && chmod +x /usr/local/bin/docker-entrypoint.sh \
 && chown -R node:node /app

WORKDIR /app/apps/server
USER node
EXPOSE 4000

ENTRYPOINT ["dumb-init", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
