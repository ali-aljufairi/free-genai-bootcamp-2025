import { NextRequest } from 'next/server';
import { proxyPost } from '@/lib/api-proxy';

export async function POST(request: NextRequest) {
  return proxyPost(request, '/api/langportal/speech-study/save');
}