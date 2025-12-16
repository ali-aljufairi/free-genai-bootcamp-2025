import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8002'

// Catch-all proxy for all /api/agent/* requests
// Forwards method, headers, query, and body to the Python agent service while handling Clerk auth

async function proxyToAgentService(
  request: NextRequest,
  { params }: { params: { path: string[] } },
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
) {
  try {
    // Preserve the full path after /api/agent when forwarding to the Python service
    const originalPath = request.nextUrl.pathname
    const pathWithoutPrefix = originalPath.replace(/^\/api\/agent/, '') || '/'
    const fullPath = `${pathWithoutPrefix}${request.nextUrl.search}`

    // Get authentication token
    let token: string | null = null

    // Prefer the Authorization header from the incoming request
    const incomingAuth = request.headers.get('authorization') || request.headers.get('Authorization')
    if (incomingAuth?.toLowerCase().startsWith('bearer ')) {
      token = incomingAuth.slice(7).trim()
    }

    // If no token in header, get from Clerk
    if (!token) {
      const authResult = await auth()
      if (authResult.userId) {
        token = await authResult.getToken()
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Copy other important headers
    const contentType = request.headers.get('content-type')
    if (contentType) {
      headers['Content-Type'] = contentType
    }

    // Parse request body for non-GET requests
    let body: string | undefined = undefined
    if (method !== 'GET' && request.body) {
      try {
        const requestBody = await request.text()
        if (requestBody) {
          body = requestBody
        }
      } catch (error) {
        console.error('Error reading request body:', error)
      }
    }

    // Forward request to agent service
    const response = await fetch(`${AGENT_SERVICE_URL}/api/agent${fullPath}`, {
      method,
      headers,
      body,
      cache: 'no-store',
    })

    // Handle errors
    if (!response.ok) {
      const errorText = await response.text()
      return new Response(
        JSON.stringify({
          error: errorText || `Request failed with status ${response.status}`,
          status: response.status,
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Return response
    const data = await response.json()
    return Response.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Agent service proxy error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to connect to agent service',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyToAgentService(request, context, 'GET')
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyToAgentService(request, context, 'POST')
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyToAgentService(request, context, 'PUT')
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyToAgentService(request, context, 'DELETE')
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyToAgentService(request, context, 'PATCH')
}

