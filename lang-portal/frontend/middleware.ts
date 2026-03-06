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

function getPostHogProxyPath(): string {
  const explicitProxyPath = process.env.POSTHOG_PROXY_PATH;
  if (explicitProxyPath) {
    return normalizePathPrefix(explicitProxyPath);
  }

  const publicHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
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

  const cspDirectives = [
    "default-src 'self' https: 'unsafe-inline' 'unsafe-eval' blob:",
    "script-src 'self' https: 'unsafe-inline' 'unsafe-eval' blob:",
    "style-src 'self' https: 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' https: data:",
    "connect-src 'self' https: ws: wss:",
    "frame-src 'self' https: blob: data: about:",
    "media-src 'self' https: blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:",
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
