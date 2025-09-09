/**
 * API Proxy Utilities
 * Eliminates code duplication in Next.js API routes by providing reusable proxy functions
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleBackendError, 
  getBackendUrl,
  validateEnvVars 
} from '@/lib/api-utils';

export interface ProxyOptions {
  /** The backend path to proxy to (e.g., '/api/langportal/flashcards/start') */
  backendPath: string;
  /** HTTP method for the backend request */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Whether authentication is required (default: true) */
  requireAuth?: boolean;
  /** Success status code to return (default: 200) */
  successStatus?: number;
  /** Additional headers to send to backend */
  additionalHeaders?: Record<string, string>;
  /** Transform the request body before sending to backend */
  transformRequest?: (body: any) => any;
  /** Transform the response data before returning to client */
  transformResponse?: (data: any) => any;
}

/**
 * Generic API proxy function that handles authentication, request forwarding, and error handling
 */
export async function proxyToBackend(
  request: NextRequest,
  options: ProxyOptions
): Promise<Response> {
  try {
    // Validate environment variables
    validateEnvVars(['GO_BACKEND_URL']);
    
    const {
      backendPath,
      method,
      requireAuth = true,
      successStatus = 200,
      additionalHeaders = {},
      transformRequest,
      transformResponse
    } = options;

    let token: string | null = null;
    let userId: string | null = null;

    // Handle authentication if required
    if (requireAuth) {
      const authResult = await auth();
      userId = authResult.userId;
      
      if (!userId) {
        return createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        );
      }

      token = await authResult.getToken();
      if (!token) {
        return createErrorResponse(
          'No authentication token available',
          'NO_TOKEN',
          401
        );
      }
    }

    // Parse request body for non-GET requests
    let body: any = null;
    if (method !== 'GET' && request.body) {
      try {
        body = await request.json();
        if (transformRequest) {
          body = transformRequest(body);
        }
      } catch (error) {
        return createErrorResponse(
          'Invalid JSON in request body',
          'INVALID_JSON',
          400
        );
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Forward request to backend
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}${backendPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle backend errors
    if (!response.ok) {
      return handleBackendError(response);
    }

    // Parse and transform response
    let data = await response.json();
    if (transformResponse) {
      data = transformResponse(data);
    }

    return createSuccessResponse(data, successStatus);
    
  } catch (error) {
    console.error(`API Proxy Error (${options.backendPath}):`, error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Missing required environment variables')) {
        return createErrorResponse(
          'Server configuration error',
          'CONFIGURATION_ERROR',
          500
        );
      }
      
      if (error.message.includes('fetch')) {
        return createErrorResponse(
          'Backend service unavailable',
          'BACKEND_UNAVAILABLE',
          503
        );
      }
    }
    
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * Convenience function for simple GET requests
 */
export async function proxyGet(
  request: NextRequest,
  backendPath: string,
  options: Omit<ProxyOptions, 'backendPath' | 'method'> = {}
): Promise<Response> {
  return proxyToBackend(request, {
    ...options,
    backendPath,
    method: 'GET'
  });
}

/**
 * Convenience function for simple POST requests
 */
export async function proxyPost(
  request: NextRequest,
  backendPath: string,
  options: Omit<ProxyOptions, 'backendPath' | 'method'> = {}
): Promise<Response> {
  return proxyToBackend(request, {
    ...options,
    backendPath,
    method: 'POST',
    successStatus: 201
  });
}

/**
 * Convenience function for simple PUT requests
 */
export async function proxyPut(
  request: NextRequest,
  backendPath: string,
  options: Omit<ProxyOptions, 'backendPath' | 'method'> = {}
): Promise<Response> {
  return proxyToBackend(request, {
    ...options,
    backendPath,
    method: 'PUT'
  });
}

/**
 * Convenience function for simple DELETE requests
 */
export async function proxyDelete(
  request: NextRequest,
  backendPath: string,
  options: Omit<ProxyOptions, 'backendPath' | 'method'> = {}
): Promise<Response> {
  return proxyToBackend(request, {
    ...options,
    backendPath,
    method: 'DELETE',
    successStatus: 204
  });
}

/**
 * Helper to extract URL parameters from Next.js dynamic routes
 */
export function extractParams(request: NextRequest): Record<string, string> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const params: Record<string, string> = {};
  
  // Extract query parameters
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}
