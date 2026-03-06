// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,

  // 10% trace sampling (dev and prod) to limit transaction volume while keeping performance visibility
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable in development mode
  enabled: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production',

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Before send hook to filter out certain errors
  beforeSend(event, hint) {
    // Filter out health check errors
    if (event.request && event.request.url && event.request.url.includes('/health')) {
      return null;
    }
    return event;
  },
});
