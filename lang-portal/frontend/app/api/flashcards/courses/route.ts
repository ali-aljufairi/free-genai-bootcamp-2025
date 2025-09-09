import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080';

import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/api-proxy';

export async function GET(request: NextRequest) {
  return proxyGet(request, '/api/langportal/flashcards/courses');
}
