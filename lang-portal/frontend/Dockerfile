# syntax=docker/dockerfile:1.7

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
ARG NEXT_PUBLIC_POSTHOG_KEY=
ARG NEXT_PUBLIC_POSTHOG_HOST=
ARG NEXT_PUBLIC_POSTHOG_UI_HOST=
ARG POSTHOG_PROXY_PATH=
ARG POSTHOG_PROXY_TARGET=
ARG POSTHOG_PROXY_ASSETS_HOST=
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/study
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/study
ARG SENTRY_RELEASE

# Set as environment variables for Next.js build
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_VAPI_PUBLIC_KEY=$NEXT_PUBLIC_VAPI_PUBLIC_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_UI_HOST=$NEXT_PUBLIC_POSTHOG_UI_HOST
ENV POSTHOG_PROXY_PATH=$POSTHOG_PROXY_PATH
ENV POSTHOG_PROXY_TARGET=$POSTHOG_PROXY_TARGET
ENV POSTHOG_PROXY_ASSETS_HOST=$POSTHOG_PROXY_ASSETS_HOST
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ENV SENTRY_RELEASE=$SENTRY_RELEASE

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR $APP_HOME

# Copy package files
COPY package*.json ./

# Install dependencies
RUN pnpm install

# Copy source files
COPY . .

# Build the application
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN,required=false \
    set -eu; \
    if [ -f /run/secrets/SENTRY_AUTH_TOKEN ]; then \
      export SENTRY_AUTH_TOKEN="$(cat /run/secrets/SENTRY_AUTH_TOKEN)"; \
    fi; \
    pnpm run build:k8s

# ================================
# Stage 2: Production runner
# ================================
FROM node:24-alpine AS runner

ARG POSTHOG_PROXY_PATH=
ARG POSTHOG_PROXY_TARGET=
ARG POSTHOG_PROXY_ASSETS_HOST=

ENV APP_HOME=/home/app
ENV PORT=3000
ENV PLT_SERVER_LOGGER_LEVEL="debug"
ENV PLT_NEXT_WORKERS="2"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV POSTHOG_PROXY_PATH=$POSTHOG_PROXY_PATH
ENV POSTHOG_PROXY_TARGET=$POSTHOG_PROXY_TARGET
ENV POSTHOG_PROXY_ASSETS_HOST=$POSTHOG_PROXY_ASSETS_HOST

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

# Remove and assert client sourcemaps are not present in publicly served assets
RUN set -eu; \
    for dir in .next/static .next/standalone/.next/static; do \
      if [ -d "$dir" ]; then \
        find "$dir" -type f -name "*.map" -delete; \
        if find "$dir" -type f -name "*.map" | grep -q .; then \
          echo "ERROR: sourcemap files still present in $dir"; \
          find "$dir" -type f -name "*.map"; \
          exit 1; \
        fi; \
      fi; \
    done

# Remove .env files to prevent them from overriding Kubernetes environment variables
# wattpm loads .env files which can override process.env values from Kubernetes
RUN rm -f .env .env.example .env.local .env.production .env.production.local 2>/dev/null || true

EXPOSE 3000

# Start with wattpm
CMD ["pnpm", "run", "start:k8s"]
