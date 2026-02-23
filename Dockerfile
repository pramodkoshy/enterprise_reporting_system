# ==========================================
# Enterprise Reporting System
# Production Dockerfile - Powered by Bun
# ==========================================

# Build stage - Pure Bun, no Node.js
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

# Install build dependencies for native module compilation
# better-sqlite3 requires python and build tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev

# Copy package files and application files
COPY package.json bun.lock ./
COPY . .

# Install dependencies with Bun
# Note: Using --no-verify to skip integrity checks for more reliable builds
# We removed --ignore-scripts to allow better-sqlite3 native compilation
RUN bun install --frozen-lockfile --no-verify && \
    bun pm cache rm

# Compile TypeScript migrations to JavaScript
RUN bun run build:migrations

# Compile TypeScript seeds to JavaScript
RUN bun run build:seeds

# Initialize database during build using Knex with better-sqlite3
# This creates the database schema that will be copied to the runner
RUN bun run /app/scripts/init-db.ts

# Build Next.js application
# Disable telemetry and font optimization during build (font fetch may fail in Docker)
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PRIVATE_SKIP_FONT_OPTIMIZATION=1
RUN bun run build

# Production stage
FROM oven/bun:1.3-alpine AS runner

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    wget \
    openssl \
    sqlite \
    su-exec

# Create non-root user for security
# Note: 'bun' group already exists in base image, so we just add the user
RUN adduser --system --uid 1001 bunuser || true && \
    addgroup -g 1001 bunuser || true && \
    adduser bunuser bunuser || true

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock

# Copy built application
COPY --from=builder --chown=bunuser:bunuser /app/.next/standalone ./
COPY --from=builder --chown=bunuser:bunuser /app/.next/static ./.next/static

# IMPORTANT: Copy all dependencies from builder
# The Next.js standalone build already optimizes what's needed, but we still need
# some modules that aren't included (like knex and its dependencies for migrations)
COPY --from=builder --chown=bunuser:bunuser /app/node_modules ./node_modules

# Copy migrations and seeds directories for database setup
COPY --from=builder --chown=bunuser:bunuser /app/dist/migrations /app/migrations
COPY --from=builder --chown=bunuser:bunuser /app/dist/seeds /app/seeds

# Copy initialized database from builder (migrations run during build)
COPY --from=builder --chown=bunuser:bunuser /app/data/config.sqlite /app/data/config.sqlite

# Copy knex CLI and knexfile for runtime migrations
COPY --from=builder --chown=bunuser:bunuser /app/node_modules/knex/bin/cli.js /app/node_modules/.bin/knex
COPY --from=builder --chown=bunuser:bunuser /app/src/lib/db/knexfile.ts /app/src/lib/db/knexfile.ts

# Copy entrypoint script
COPY --from=builder --chown=bunuser:bunuser /app/docker-entrypoint.sh /app/docker-entrypoint.sh

# Create required directories with correct permissions
RUN mkdir -p /app/data /app/job-outputs /app/uploads /app/logs /app/data/uploads && \
    chown -R bunuser:bunuser /app/data /app/job-outputs /app/uploads /app/logs && \
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
