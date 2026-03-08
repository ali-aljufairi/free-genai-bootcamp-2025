import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback',
  '/health',
  '/pricing',
  '/terms',
  '/privacy',
  '/contact',
  '/about',
  '/faq',
  '/blog',
  '/news',
  '/events',
  '/support',
  '/help',
  '/study', // Allow study page for tour (individual study sessions are still protected)
]);

function normalizePathPrefix(path: string | undefined): string {
  if (!path) {
    return '';
  }

  const trimmed = path.replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function toCspSource(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = trimTrailingSlashes(value.trim());
  if (!trimmed || trimmed.startsWith('/')) {
    return null;
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('ws://') ||
    trimmed.startsWith('wss://')
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function toWebSocketSource(source: string): string | null {
  if (source.startsWith('https://')) {
    return `wss://${source.slice('https://'.length)}`;
  }

  if (source.startsWith('http://')) {
    return `ws://${source.slice('http://'.length)}`;
  }

  return null;
}

function uniqueSources(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function joinDirective(name: string, ...values: string[]): string {
  return [name, ...values.filter(Boolean)].join(' ');
}

function getAllowedHttpsSources(): string[] {
  return uniqueSources([
    toCspSource(process.env['NEXT_PUBLIC_APP_URL']),
    toCspSource(process.env['APP_DOMAIN'] || '*.sorami.aljufairi.org'),
    toCspSource(process.env['CLOUDFRONT_DOMAIN'] || '*.cloudfront.net'),
    toCspSource(process.env['CLERK_DOMAIN'] || '*.clerk.accounts.dev'),
    toCspSource(process.env['NEXT_PUBLIC_POSTHOG_HOST']),
    toCspSource(process.env['NEXT_PUBLIC_POSTHOG_UI_HOST']),
    'https://api.vapi.ai',
    'https://*.daily.co',
  ]);
}

function getPostHogProxyPath(): string {
  const explicitProxyPath = process.env['POSTHOG_PROXY_PATH'];
  if (explicitProxyPath) {
    return normalizePathPrefix(explicitProxyPath);
  }

  const publicHost = process.env['NEXT_PUBLIC_POSTHOG_HOST'];
  if (publicHost?.startsWith('/')) {
    return normalizePathPrefix(publicHost);
  }

  return '';
}

function isPostHogProxyRequest(pathname: string, proxyPath: string): boolean {
  if (!proxyPath) {
    return false;
  }

  return pathname === proxyPath || pathname.startsWith(`${proxyPath}/`);
}

export default clerkMiddleware(async (auth, req) => {
  const posthogProxyPath = getPostHogProxyPath();
  const isProduction = process.env['NODE_ENV'] === 'production';
  const allowedHttpsSources = getAllowedHttpsSources();
  const allowedWssSources = uniqueSources(allowedHttpsSources.map(toWebSocketSource));
  const devHttpSources = isProduction ? [] : ['http://localhost:*', 'http://127.0.0.1:*'];
  const devWsSources = isProduction ? [] : ['ws://localhost:*', 'ws://127.0.0.1:*'];

  // Redirect /home to /
  if (req.nextUrl.pathname === '/home') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (
    req.nextUrl.pathname.length > 1 &&
    req.nextUrl.pathname.endsWith('/') &&
    !isPostHogProxyRequest(req.nextUrl.pathname, posthogProxyPath)
  ) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = req.nextUrl.pathname.replace(/\/+$/, '') || '/';
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Check authentication for protected routes first
  if (!isPostHogProxyRequest(req.nextUrl.pathname, posthogProxyPath) && !isPublicRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  // Generate a per-request CSP nonce and pass it downstream via headers
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  // Create response with security headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Third-party allowances for Clerk, PostHog, Vapi, and Daily are scoped to
  // the specific directives below instead of default-src.
  const cspDirectives = [
    joinDirective("default-src", "'self'", ...allowedHttpsSources, 'blob:'),
    // 'unsafe-eval' is required by Daily.co's call-machine bundle which uses eval() internally.
    // See: https://docs.daily.co/reference/daily-js/content-security-policy
    joinDirective("script-src", "'self'", `'nonce-${nonce}'`, "'unsafe-eval'", ...allowedHttpsSources, 'blob:'),
    joinDirective("style-src", "'self'", ...allowedHttpsSources, "'unsafe-inline'"),
    joinDirective("img-src", "'self'", ...allowedHttpsSources, 'data:', 'blob:'),
    joinDirective("font-src", "'self'", ...allowedHttpsSources, 'data:'),
    joinDirective(
      "connect-src",
      "'self'",
      ...allowedHttpsSources,
      ...allowedWssSources,
      ...devHttpSources,
      ...devWsSources,
    ),
    joinDirective("frame-src", "'self'", ...allowedHttpsSources, 'blob:', 'data:', 'about:'),
    joinDirective("media-src", "'self'", ...allowedHttpsSources, 'blob:', 'data:'),
    "object-src 'none'",
    "base-uri 'self'",
    joinDirective("form-action", "'self'", ...allowedHttpsSources),
    // Note: CSP sandbox interferes with Clerk CAPTCHA/Apple PAT iframes (about:blank)
    // and blocks script execution inside the challenge frame. Avoid sandboxing the
    // entire document; rely on Clerk + frame-src restrictions instead.
    "upgrade-insecure-requests",
  ];

  const cspHeader = cspDirectives.join('; ');

  // Set security headers
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
