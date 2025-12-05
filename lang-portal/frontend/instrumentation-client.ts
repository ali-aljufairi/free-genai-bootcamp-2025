// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 0.1 : 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable in development mode
  enabled: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production',

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Disable source map loading to prevent 404 errors
  // Source maps are disabled in next.config.mjs (productionBrowserSourceMaps: false)
  ignoreErrors: [
    /Failed to fetch dynamically imported module/,
    /Loading chunk/,
    /ChunkLoadError/,
    /Source map error/,
    /request failed with status 404/,
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
    
    // Filter out source map errors
    if (event.exception && event.exception.values) {
      const exception = event.exception.values[0];
      if (exception.value && (
        exception.value.includes('Source map error') ||
        exception.value.includes('installHook.js.map') ||
        exception.value.includes('request failed with status 404')
      )) {
        return null;
      }
    }
    
    return event;
  },
});

// Export Sentry router transition hook for Next.js App Router instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;