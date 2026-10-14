FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# Stage 1: install + build
FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/quiniela/package.json ./apps/quiniela/
COPY packages/db/package.json ./packages/db/
COPY packages/seal/package.json ./packages/seal/
COPY packages/auth/package.json ./packages/auth/
COPY packages/ui/package.json ./packages/ui/
COPY packages/storage/package.json ./packages/storage/
RUN pnpm install --frozen-lockfile
COPY . .
WORKDIR /app/apps/quiniela
RUN pnpm build

# Stage 2: production runtime
FROM base AS runner
RUN apk add --no-cache curl postgresql-client
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/apps/quiniela/.next/standalone ./
COPY --from=builder /app/apps/quiniela/.next/static ./apps/quiniela/.next/static
COPY --from=builder /app/apps/quiniela/public ./apps/quiniela/public

# Drizzle migrations for entrypoint
COPY --from=builder /app/packages/db/drizzle ./packages/db/drizzle
COPY --from=builder /app/packages/db/drizzle.config.ts ./packages/db/drizzle.config.ts
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json

COPY apps/quiniela/scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "apps/quiniela/server.js"]
