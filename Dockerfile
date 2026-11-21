# Multi-stage production container build for Google Cloud Run & Render
FROM node:20-alpine AS builder

# Install OpenSSL required by Prisma engine on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Provide default SQLite DATABASE_URL during container build
ENV DATABASE_URL="file:./dev.db"

# 1. Copy package definitions
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# 2. Install dependencies for building
RUN npm ci

# 3. Copy source code
COPY . .

# 4. Generate Prisma client & setup database FIRST
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npx prisma db push
RUN npx tsx prisma/seed.ts
WORKDIR /app

# 5. Build all workspaces (shared -> api -> web)
RUN npm run build

# 6. Prune devDependencies to keep container lean
RUN npm prune --omit=dev

# 7. Production runner stage
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma runtime on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_URL="file:./dev.db"

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Copy compiled bundles and seeded database
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/dev.db ./apps/api/dev.db
COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
