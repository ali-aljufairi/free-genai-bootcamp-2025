# ================================
# Stage 1: Build the application
# ================================
FROM node:24-alpine AS builder

ENV APP_HOME=/home/app
ENV PORT=3000
ENV PLT_SERVER_LOGGER_LEVEL="info"
ENV PLT_NEXT_WORKERS="1"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments for NEXT_PUBLIC_* variables (required at build time)
# These are public variables that get baked into the Next.js build
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuc29yYW1pLmFsanVmYWlyaS5vcmck
ARG NEXT_PUBLIC_APP_URL=https://sorami.aljufairi.org
ARG NEXT_PUBLIC_SENTRY_DSN=https://5f2aa379610a248fdb8e476f9680476a@o4509562367705088.ingest.de.sentry.io/4509562384023632
ARG NEXT_PUBLIC_VAPI_PUBLIC_KEY=41b8e3fe-53c2-4eb2-8d8c-fdb5675ec82a
ARG NEXT_PUBLIC_POSTHOG_KEY=phc_2kz11HzsCgyRqaSsIv9LmKHiptzjwBlSFeJRow8x4mA
ARG NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/study
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/study

# Set as environment variables for Next.js build
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_VAPI_PUBLIC_KEY=$NEXT_PUBLIC_VAPI_PUBLIC_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL

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
# Source maps will be automatically uploaded by @sentry/nextjs webpack plugin during build
# The manual upload command is a fallback in case the webpack plugin doesn't run
RUN pnpm run build && \
    (pnpm run sentry:sourcemaps || echo "Manual Sentry source map upload skipped or failed (webpack plugin should handle this)")

# ================================
# Stage 2: Production runner
# ================================
FROM node:24-alpine AS runner

ENV APP_HOME=/home/app
ENV PORT=3000
ENV PLT_SERVER_LOGGER_LEVEL="debug"
ENV PLT_NEXT_WORKERS="2"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR $APP_HOME

COPY --from=builder $APP_HOME ./

# Copy static files to standalone directory for Next.js standalone mode
# This is required for Next.js to serve static assets correctly
RUN mkdir -p .next/standalone/.next && \
    mkdir -p .next/standalone && \
    cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# Remove .env files to prevent them from overriding Kubernetes environment variables
# wattpm loads .env files which can override process.env values from Kubernetes
RUN rm -f .env .env.example .env.local .env.production .env.production.local 2>/dev/null || true

EXPOSE 3000

# Start with wattpm
CMD ["pnpm", "run", "start"]