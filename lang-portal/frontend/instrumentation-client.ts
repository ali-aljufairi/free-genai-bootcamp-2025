// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% trace sampling (dev and prod) to limit transaction volume while keeping performance visibility
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable in development mode
  enabled: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production',

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Ignore common non-critical errors
  ignoreErrors: [
    /Failed to fetch dynamically imported module/,
    /Loading chunk/,
    /ChunkLoadError/,
  ],

  // Before send hook to filter out certain errors
  beforeSend(event, hint) {
    // Filter out certain errors in development
    if (process.env.NODE_ENV === 'development') {
      // Don't send console errors in development
      if (event.exception && event.exception.values) {
        const exception = event.exception.values[0];
        if (exception.value && exception.value.includes('console.error')) {
          return null;
        }
      }
    }
    
    return event;
  },
});

// Export Sentry router transition hook for Next.js App Router instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;