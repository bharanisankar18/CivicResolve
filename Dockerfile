# Multi-stage production container build for Google Cloud Run
FROM node:20-alpine AS builder

WORKDIR /app

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

# 6. Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

RUN npm ci --omit=dev

# Generate Prisma client in runner stage
WORKDIR /app/apps/api
COPY apps/api/prisma ./prisma
RUN npx prisma generate
WORKDIR /app

# Copy compiled bundles and seeded database
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/dev.db ./apps/api/dev.db
COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
