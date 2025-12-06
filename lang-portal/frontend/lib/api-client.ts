/**
 * Unified API Client for Lang Portal
 * 
 * Provides a consistent, type-safe API client that:
 * - Uses Clerk's recommended useAuth().getToken() pattern
 * - Works for both development and production
 * - Handles authentication automatically
 * - Provides consistent error handling with Sentry integration
 * - Supports all HTTP methods
 */

import * as Sentry from '@sentry/nextjs';

export interface ApiClientOptions extends RequestInit {
  /** Whether to require authentication (default: true) */
  requireAuth?: boolean;
  /** Whether to unwrap {success, data} response wrapper (default: true) */
  unwrapResponse?: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

/**
 * Get token from browser Clerk session (fallback for when getToken is not provided)
 */
async function getTokenFromBrowser(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const clerk = (window as any).Clerk;
    const session = clerk?.session;
    if (session && typeof session.getToken === 'function') {
      return await session.getToken();
    }
  } catch (error) {
    console.warn('Failed to get token from browser Clerk session:', error);
  }

  return null;
}

/**
 * Unified API Client class
 * 
 * Usage:
 * ```ts
 * const { getToken } = useAuth();
 * const client = new ApiClient(getToken);
 * const data = await client.get('/words');
 * ```
 * 
 * Or without explicit getToken (uses browser Clerk session):
 * ```ts
 * const client = new ApiClient();
 * const data = await client.get('/words');
 * ```
 */
export class ApiClient {
  private getToken: (() => Promise<string | null>) | null;

  constructor(getToken?: () => Promise<string | null>) {
    this.getToken = getToken || null;
  }

  /**
   * Internal method to make authenticated requests
   */
  private async request<T>(
    endpoint: string,
    options: ApiClientOptions = {}
  ): Promise<T> {
    const {
      requireAuth = true,
      unwrapResponse = true,
      headers = {},
      ...fetchOptions
    } = options;

    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };

    // Add authentication token if required
    if (requireAuth) {
      try {
        // Use provided getToken function or fall back to browser Clerk session
        const token = this.getToken 
          ? await this.getToken() 
          : await getTokenFromBrowser();
        if (token) {
          defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('Failed to get auth token:', error);
        // Continue without token - backend will handle auth errors
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        // Prevent sending cookies to Next.js API (avoids 431 due to large Clerk cookies)
        credentials: 'omit',
        cache: 'no-store',
        headers: defaultHeaders,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ApiError = {
          message: errorData.message || errorData.error || `API request failed with status ${response.status}`,
          code: errorData.code,
          status: response.status,
          details: errorData,
        };
        
        // Report API errors to Sentry
        Sentry.captureException(new Error(error.message), {
          tags: {
            location: 'api-client',
            endpoint: url,
            method: fetchOptions.method || 'GET',
            status: response.status,
          },
          extra: {
            url,
            status: response.status,
            statusText: response.statusText,
            errorData,
          },
        });
        
        throw error;
      }

      const data = await response.json();

      // Unwrap {success, data} response wrapper if present
      if (unwrapResponse && data && typeof data === 'object' && 'success' in data && 'data' in data) {
        if (data.success) {
          return data.data as T;
        } else {
          // Handle error response wrapper
          const error: ApiError = {
            message: data.error?.error || data.error?.message || 'API request failed',
            code: data.error?.code,
            details: data.error,
          };
          throw error;
        }
      }

      return data as T;
    } catch (error) {
      // Re-throw ApiError as-is
      if (error && typeof error === 'object' && 'message' in error) {
        throw error;
      }

      // Handle network errors
      const networkError: ApiError = {
        message: error instanceof Error ? error.message : 'Network error occurred',
        code: 'NETWORK_ERROR',
      };

      // Report network errors to Sentry
      Sentry.captureException(error instanceof Error ? error : new Error(networkError.message), {
        tags: {
          location: 'api-client',
          endpoint: url,
          method: fetchOptions.method || 'GET',
          errorType: 'network',
        },
        extra: {
          url,
          options: fetchOptions,
        },
      });

      throw networkError;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: any, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

/**
 * Create an API client instance
 * 
 * @param getToken - Function to get auth token (from useAuth().getToken)
 * @returns ApiClient instance
 */
export function createApiClient(getToken?: () => Promise<string | null>): ApiClient {
  return new ApiClient(getToken);
}

