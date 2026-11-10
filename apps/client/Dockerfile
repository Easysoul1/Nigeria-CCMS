FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@12
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/client ./apps/client
COPY packages/shared ./packages/shared
RUN pnpm install --frozen-lockfile --filter @court-ccms/client...
RUN pnpm --filter @court-ccms/client build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/client/.next ./.next
COPY --from=builder /app/apps/client/package.json ./package.json
COPY --from=builder /app/apps/client/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["pnpm","start"]
