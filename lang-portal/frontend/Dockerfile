FROM oven/bun:latest AS base

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json bun.lock ./

RUN bun install 


FROM oven/bun:latest AS release

COPY --from=base /usr/src/app/node_modules node_modules

COPY . .

# Optional: Pass SENTRY_AUTH_TOKEN as build arg to upload source maps
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

# Use build:sentry if token is available, otherwise regular build
RUN if [ -n "$SENTRY_AUTH_TOKEN" ]; then \
      bun --bun run build:sentry; \
    else \
      bun --bun run build; \
    fi

CMD ["bun", "--bun", "run", "start"]

EXPOSE 3000