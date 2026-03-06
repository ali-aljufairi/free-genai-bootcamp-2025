import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server instrumentation
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 0.1,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 0.1,
      debug: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
