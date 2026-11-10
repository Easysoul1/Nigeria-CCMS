# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@12
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server ./apps/server
COPY packages/shared ./packages/shared
RUN pnpm install --frozen-lockfile --filter @court-ccms/server...
RUN pnpm --filter @court-ccms/server prisma generate
RUN pnpm --filter @court-ccms/server build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma 2>/dev/null || true
USER node
EXPOSE 4000
CMD ["node","dist/main.js"]
