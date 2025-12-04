# ================================
# Stage 1: Install dependencies
# ================================
FROM oven/bun:latest AS deps

WORKDIR /app

# Copy only dependency files first for better caching
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# ================================
# Stage 2: Build the application
# ================================
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Optional: Pass SENTRY_AUTH_TOKEN as build arg to upload source maps
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

# Build the application (uses standalone output from next.config.mjs)
RUN bun --bun run build

# ================================
# Stage 3: Production runner with Watt
# ================================
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install Watt globally for production
RUN npm install -g watt @platformatic/next

# Copy only the standalone output (much smaller than full node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Watt configuration
COPY --from=builder --chown=nextjs:nodejs /app/watt.json ./watt.json

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Default environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV LOG_LEVEL=info

# Number of workers - set based on CPU allocation
# For 2 CPU pods, use 2 workers. For 4 CPU pods, use 4 workers.
ENV WORKERS=2

# Use Watt to run Next.js with multi-worker SO_REUSEPORT support
# This provides ~93% faster latency and near-perfect reliability under load
CMD ["watt", "start", "--workers", "${WORKERS}"]