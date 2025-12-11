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
  
    // In development, allow 'unsafe-inline' for styles to support libraries like Radix UI and React dev tools
    // that inject styles without CSP nonce support. In production, use strict nonce-only policy.
    const isDevEnvironment = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
    
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'sha256-9xsy6/apLYZ0YvQVk+Yi9ZlSKW7tnhYBZWcTU9ERUlk=' https://static.cloudflareinsights.com https://*.cloudflare.com https://challenges.cloudflare.com https://www.gstatic.com https://*.clerk.accounts.dev https://github.com https://*.github.com https://js.stripe.com https://*.stripe.com https://${appDomain} blob:`,
      `worker-src 'self' blob: https://${appDomain}`,
      `connect-src 'self' https://static.cloudflareinsights.com https://*.cloudflare.com https://challenges.cloudflare.com https://www.google.com https://play.google.com https://*.google.com https://github.com https://*.github.com https://api.github.com https://*.clerk.accounts.dev https://*.sentry.io https://*.stripe.com wss://*.clerk.accounts.dev https://${appDomain} wss://${appDomain} https://${cloudfrontDomain} ws://localhost:3000 ws://127.0.0.1:3000`,
      `media-src 'self' https://${cloudfrontDomain} blob: data:`,
      "img-src 'self' data: https: blob:",
      // Allow inline styles for all libraries to prevent blocking
      `style-src 'self' 'unsafe-inline'`,
      "font-src 'self' data: https:",
      `frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://www.google.com https://*.google.com https://github.com https://*.github.com https://*.stripe.com https://${appDomain}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
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