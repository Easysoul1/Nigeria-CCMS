# syntax=docker/dockerfile:1.7
# ---------- base ----------
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
# See apps/server/Dockerfile: tsconfig.base.json carries esModuleInterop and
# skipLibCheck, and apps/client/tsconfig.json extends it. Without it the
# build fails on default-imported CJS modules.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/client/package.json ./apps/client/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @court-ccms/client...

# ---------- builder ----------
FROM deps AS builder
COPY --from=deps /app/tsconfig.base.json ./tsconfig.base.json
# NEXT_PUBLIC_* values are baked into the JS bundle at build time — they must
# be present as ARGs here, not runtime ENVs on the runner.
ARG NEXT_PUBLIC_API_URL
ARG API_UPSTREAM
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    API_UPSTREAM=${API_UPSTREAM} \
    NEXT_TELEMETRY_DISABLED=1
COPY packages/shared ./packages/shared
COPY apps/client ./apps/client
RUN pnpm --filter @court-ccms/client build

# ---------- runner ----------
# Next standalone emits a self-contained server.js + the minimal node_modules
# it needs. Smaller and simpler than copying .next + the full store.
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/apps/client/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/client/.next/static ./apps/client/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/client/public ./apps/client/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/client/server.js"]
