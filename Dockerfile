FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate both Prisma clients — postgresql last so its engine is available at runtime
# The sqlite client is used during the Next.js build (no DB needed)
RUN DATABASE_URL=file:./dev.db npx prisma generate --schema=prisma/schema.sqlite.prisma
# Save sqlite client artifacts before overwriting with pg client
RUN cp -r node_modules/.prisma/client node_modules/.prisma/client-sqlite
RUN DATABASE_URL=file:./dev.db npx prisma generate --schema=prisma/schema.postgresql.prisma
RUN cp -r node_modules/.prisma/client node_modules/.prisma/client-postgresql
# Restore sqlite client for the build
RUN cp -r node_modules/.prisma/client-sqlite/. node_modules/.prisma/client/
RUN DATABASE_URL=file:./dev.db npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Defaults for simple "docker run" usage (SQLite)
ENV DATABASE_URL="file:/app/data/trivyhub.db"
ENV JWT_SECRET="change-me-in-production"
ENV NODE_ENV=production
ENV PORT=3000

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
