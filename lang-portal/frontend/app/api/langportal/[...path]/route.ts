import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api-proxy'

// Catch-all proxy for all /api/langportal/* requests
// Forwards method, headers, query, and body to the Go backend while handling Clerk auth

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const subPath = '/' + (params.path?.join('/') || '')
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'GET',
  })
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const subPath = '/' + (params.path?.join('/') || '')
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'POST',
  })
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  const subPath = '/' + (params.path?.join('/') || '')
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'PUT',
  })
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  const subPath = '/' + (params.path?.join('/') || '')
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'PATCH',
  })
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  const subPath = '/' + (params.path?.join('/') || '')
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'DELETE',
  })
}


