import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/api-proxy';

interface Params {
  courseId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { courseId } = await params;
  return proxyGet(request, `/api/langportal/flashcards/courses/${courseId}/units`);
}
