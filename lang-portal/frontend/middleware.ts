import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
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
]);

export default clerkMiddleware(async (auth, req) => {
  // Redirect /home to /
  if (req.nextUrl.pathname === '/home') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Check authentication for protected routes first
  if (!isPublicRoute(req)) {
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

  // Get configurable domains from environment variables (with sensible defaults)
  // These can be set via K8s ConfigMap or environment variables
  // Note: Using regular env vars (not NEXT_PUBLIC_*) since middleware runs server-side
  const appDomain = process.env.APP_DOMAIN || '*.sorami.aljufairi.org';
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || '*.cloudfront.net';
  const clerkDomain = process.env.CLERK_DOMAIN || '*.clerk.accounts.dev';
  
  // Bare minimum CSP: allow what's needed, block nothing else
  const cspDirectives = [
    "default-src 'self' https:",
    "script-src 'self' https: 'unsafe-eval' 'unsafe-inline' blob:",
    "worker-src 'self' https: blob:",
    "style-src 'self' https: 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' https: data:",
    "connect-src 'self' https: ws: wss:",
    "frame-src 'self' https:",
    "media-src 'self' https: blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:",
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