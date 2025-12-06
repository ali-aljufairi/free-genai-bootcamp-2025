import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api-proxy'

async function getSubPath(params: Promise<{ path: string[] }> | { path: string[] }): Promise<string> {
  const resolvedParams = params instanceof Promise ? await params : params;
  return '/' + (resolvedParams.path?.join('/') || '');
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const subPath = await getSubPath(params);
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'GET',
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const subPath = await getSubPath(params);
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'POST',
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const subPath = await getSubPath(params);
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'PUT',
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const subPath = await getSubPath(params);
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'PATCH',
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const subPath = await getSubPath(params);
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'DELETE',
  })
}


