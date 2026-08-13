FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build || npx next build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=2550
ENV NEXT_TELEMETRY_DISABLED=1

# Copy next built artifacts
COPY --from=frontend-builder /app/package.json ./package.json
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/node_modules ./node_modules

EXPOSE 2550

CMD ["node_modules/.bin/next", "start", "-p", "2550"]
