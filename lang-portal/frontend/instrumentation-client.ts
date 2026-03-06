// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { POSTHOG_ENABLED, POSTHOG_HOST, POSTHOG_KEY, POSTHOG_UI_HOST } from "@/lib/posthog";

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

if (typeof window !== "undefined" && POSTHOG_ENABLED) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    ...(POSTHOG_UI_HOST ? { ui_host: POSTHOG_UI_HOST } : {}),
    defaults: "2026-01-30",
  });
}

// Export Sentry router transition hook for Next.js App Router instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
