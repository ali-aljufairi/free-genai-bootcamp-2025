const EU_POSTHOG_API_HOST = "https://eu.i.posthog.com";
const US_POSTHOG_API_HOST = "https://us.i.posthog.com";

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolvePostHogKey(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_TOKEN || "";
}

export function resolvePostHogHost(): string {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "";
  return host ? trimTrailingSlashes(host) : "";
}

export function resolvePostHogUiHost(): string | undefined {
  const explicitUiHost = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || "";
  if (explicitUiHost) {
    return trimTrailingSlashes(explicitUiHost);
  }

  const apiHost = resolvePostHogHost();
  if (apiHost === EU_POSTHOG_API_HOST) {
    return "https://eu.posthog.com";
  }
  if (apiHost === US_POSTHOG_API_HOST) {
    return "https://us.posthog.com";
  }

  return undefined;
}

export const POSTHOG_KEY = resolvePostHogKey();
export const POSTHOG_HOST = resolvePostHogHost();
export const POSTHOG_UI_HOST = resolvePostHogUiHost();
export const POSTHOG_ENABLED = Boolean(POSTHOG_KEY && POSTHOG_HOST);
