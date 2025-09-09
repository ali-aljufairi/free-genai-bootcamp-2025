import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/api-proxy';

export async function GET(request: NextRequest) {
  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('pageSize') || '10';
  
  return proxyGet(
    request, 
    `/api/langportal/flashcards/history?page=${page}&pageSize=${pageSize}`
  );
}
