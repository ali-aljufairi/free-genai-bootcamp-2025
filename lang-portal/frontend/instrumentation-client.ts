import * as Sentry from "@sentry/nextjs"

// Initialize Sentry on the client
const sentryConfig: any = {
  dsn: "https://5f2aa379610a248fdb8e476f9680476a@o4509562367705088.ingest.de.sentry.io/4509562384023632",
  tracesSampleRate: 1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [],
};

// Add replay integration if available
if (typeof Sentry.replayIntegration === 'function') {
  sentryConfig.integrations.push(
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    })
  );
}

Sentry.init(sentryConfig);

// Export Sentry router transition hook for Next.js App Router instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;