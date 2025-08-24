import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/v2/words/random',
  '/api/v2/kanji/stats',
  '/health'
]);

export default clerkMiddleware(async (auth, req) => {
  // Redirect /home to /
  if (req.nextUrl.pathname === '/home') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (isPublicRoute(req)) return NextResponse.next();
  
  // Check if user is authenticated for protected routes
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};