import * as Sentry from '@sentry/nextjs';

export interface ApiClientOptions extends RequestInit {
  requireAuth?: boolean;
  unwrapResponse?: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

async function getTokenFromBrowser(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const clerk = (window as any).Clerk;
    const session = clerk?.session;
    if (session && typeof session.getToken === 'function') {
      return await session.getToken();
    }
  } catch {
    // Silent fail - will proceed without token
  }

  return null;
}

export class ApiClient {
  private getToken: (() => Promise<string | null>) | null;

  constructor(getToken?: () => Promise<string | null>) {
    this.getToken = getToken || null;
  }

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

    if (requireAuth) {
      try {
        const token = this.getToken 
          ? await this.getToken() 
          : await getTokenFromBrowser();
        if (token) {
          defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
      } catch {
        // Continue without token
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
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
        
        Sentry.captureException(new Error(error.message), {
          tags: {
            location: 'api-client',
            endpoint: url,
            method: fetchOptions.method || 'GET',
            status: response.status,
          },
          extra: { url, status: response.status, statusText: response.statusText, errorData },
        });
        
        throw error;
      }

      const data = await response.json();

      if (unwrapResponse && data && typeof data === 'object' && 'success' in data && 'data' in data) {
        if (data.success) {
          return data.data as T;
        }
        const error: ApiError = {
          message: data.error?.error || data.error?.message || 'API request failed',
          code: data.error?.code,
          details: data.error,
        };
        throw error;
      }

      return data as T;
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw error;
      }

      const networkError: ApiError = {
        message: error instanceof Error ? error.message : 'Network error occurred',
        code: 'NETWORK_ERROR',
      };

      Sentry.captureException(error instanceof Error ? error : new Error(networkError.message), {
        tags: {
          location: 'api-client',
          endpoint: url,
          method: fetchOptions.method || 'GET',
          errorType: 'network',
        },
        extra: { url, options: fetchOptions },
      });

      throw networkError;
    }
  }

  async get<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export function createApiClient(getToken?: () => Promise<string | null>): ApiClient {
  return new ApiClient(getToken);
}
