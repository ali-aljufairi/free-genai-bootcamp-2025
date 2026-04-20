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

function toCspOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
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

function getAdditionalConnectHttpsSources(): string[] {
  return uniqueSources([
    toCspOrigin(process.env['SENTRY_DSN']),
    toCspOrigin(process.env['NEXT_PUBLIC_SENTRY_DSN']),
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

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}, () => {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const allowedHttpsSources = getAllowedHttpsSources();
  const connectHttpsSources = uniqueSources([
    ...allowedHttpsSources,
    ...getAdditionalConnectHttpsSources(),
  ]);
  const allowedWssSources = uniqueSources(allowedHttpsSources.map(toWebSocketSource));
  const devHttpSources = isProduction ? [] : ['http://localhost:*', 'http://127.0.0.1:*'];
  const devWsSources = isProduction ? [] : ['ws://localhost:*', 'ws://127.0.0.1:*'];

  // Clerk's generated strict CSP covers its nonce handling, Turnstile frames,
  // and App Router inline scripts. We only merge the app-specific hosts here.
  return {
    contentSecurityPolicy: {
      strict: true,
      directives: {
        'script-src': uniqueSources([
          'https://challenges.cloudflare.com',
          ...allowedHttpsSources,
          'blob:',
        ]),
        'style-src': allowedHttpsSources,
        'img-src': uniqueSources([...allowedHttpsSources, 'data:', 'blob:']),
        'font-src': uniqueSources([...allowedHttpsSources, 'data:']),
        'connect-src': uniqueSources([
          ...connectHttpsSources,
          ...allowedWssSources,
          ...devHttpSources,
          ...devWsSources,
        ]),
        'frame-src': uniqueSources([...allowedHttpsSources, 'blob:', 'data:', 'about:']),
        'media-src': uniqueSources([...allowedHttpsSources, 'blob:', 'data:']),
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': allowedHttpsSources,
      },
    },
  };
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
