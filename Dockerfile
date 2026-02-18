# ==========================================
# Enterprise Reporting System
# Production Dockerfile
# ==========================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Copy package files and application files
COPY package.json package-lock.json ./
COPY . .

# Install ALL dependencies (including dev dependencies needed for build)
# Rebuild better-sqlite3 from source to ensure it's compiled for Alpine/musl
RUN npm ci --build-from-source=better-sqlite3 && \
    npm cache clean --force

# Compile TypeScript migrations to JavaScript
RUN npm run build:migrations

# Compile TypeScript seeds to JavaScript
RUN npm run build:seeds

# Build Next.js application
# Disable telemetry and font optimization during build (font fetch may fail in Docker)
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PRIVATE_SKIP_FONT_OPTIMIZATION=1
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache \
    wget \
    openssl \
    sqlite \
    su-exec

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# IMPORTANT: Copy all node_modules from builder
# The Next.js standalone build already optimizes what's needed, but we still need
# some modules that aren't included (like knex and its dependencies for migrations)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy migrations and seeds directories for database setup
COPY --from=builder --chown=nextjs:nodejs /app/dist/migrations /app/migrations
COPY --from=builder --chown=nextjs:nodejs /app/dist/seeds /app/seeds

# Copy knex CLI and knexfile for runtime migrations
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/knex/bin/cli.js /app/node_modules/.bin/knex
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/knexfile.ts /app/src/lib/db/knexfile.ts

# Copy entrypoint script
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh /app/docker-entrypoint.sh

# Create required directories with correct permissions
RUN mkdir -p /app/data /app/job-outputs /app/uploads /app/logs /app/data/uploads && \
    chown -R nextjs:nodejs /app/data /app/job-outputs /app/uploads /app/logs && \
    chmod +x /app/docker-entrypoint.sh

# Copy Sakila demo database (if exists)
COPY data/uploads/sakila.db /app/data/uploads/sakila.db

# Expose application port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Use entrypoint script to handle database initialization
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
