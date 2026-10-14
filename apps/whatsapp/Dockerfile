FROM node:20-alpine
RUN corepack enable

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/whatsapp/package.json ./apps/whatsapp/
RUN pnpm install --frozen-lockfile --filter @brakestation/whatsapp

COPY apps/whatsapp/ ./apps/whatsapp/

WORKDIR /app/apps/whatsapp
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]
