# ================================
# Stage 1: Build the application
# ================================
FROM node:22-alpine AS builder

ENV APP_HOME=/home/app
ENV PORT=3000
ENV PLT_SERVER_LOGGER_LEVEL="info"
ENV PLT_NEXT_WORKERS="1"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Set Clerk publishable key for build-time (required by Clerk SDK to build)
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuc29yYW1pLmFsanVmYWlyaS5vcmck

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR $APP_HOME

# Copy package files
COPY package*.json ./

# Install dependencies
RUN pnpm install

# Copy source files
COPY . .

# Optional: Pass SENTRY_AUTH_TOKEN as build arg to upload source maps
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

# Build the application using wattpm
RUN pnpm run build && \
    (npm run sentry:sourcemaps || echo "Sentry source map upload failed, continuing...")

# ================================
# Stage 2: Production runner
# ================================
FROM node:22-alpine AS runner

ENV APP_HOME=/home/app
ENV PORT=3000
ENV PLT_SERVER_LOGGER_LEVEL="info"
ENV PLT_NEXT_WORKERS="1"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR $APP_HOME

# Copy everything from builder (wattpm needs full structure)
COPY --from=builder $APP_HOME ./

EXPOSE 3000

# Start with wattpm
CMD ["pnpm", "run", "start"]