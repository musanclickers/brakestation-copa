FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# Stage 1: install + build
FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/landing/package.json ./apps/landing/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile
COPY . .
WORKDIR /app/apps/landing
RUN pnpm build

# Stage 2: production runtime
FROM base AS runner
RUN apk add --no-cache curl postgresql-client
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/apps/landing/.next/standalone ./
COPY --from=builder /app/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=builder /app/apps/landing/public ./apps/landing/public

COPY --from=builder /app/packages/db/drizzle ./packages/db/drizzle
COPY --from=builder /app/packages/db/drizzle.config.ts ./packages/db/drizzle.config.ts
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json

COPY apps/landing/scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "apps/landing/server.js"]
