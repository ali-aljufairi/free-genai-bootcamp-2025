import * as Sentry from '@sentry/nextjs';
import type { ApiResponse } from '@/lib/api-utils';

export interface ApiClientOptions extends RequestInit {
  requireAuth?: boolean;
  unwrapResponse?: boolean;
  /**
   * Number of retries after the initial request (GET requests only).
   * Must be a non-negative integer.
   * Hard-capped at 3 retries.
   */
  retryCount?: number;
  retryDelayMs?: number;
  retryJitterMs?: number;
  retryStatuses?: number[];
}

export class ApiError extends Error {
  code?: string;
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.code = options?.code;
    this.status = options?.status;
    this.details = options?.details;
  }
}

const DEFAULT_RETRY_DELAY_MS = 300;
const DEFAULT_RETRY_JITTER_MS = 120;
const MAX_RETRY_COUNT = 3;
const RETRYABLE_STATUS_CODES = new Set<number>([502, 503, 504, 520, 521, 522, 523, 524]);
type WrappedApiResponse<T> = ApiResponse<T> & {
  error?: ApiResponse<T>['error'] & { message?: string };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(baseDelayMs: number, attempt: number, jitterMs: number): number {
  const exponentialDelay = baseDelayMs * 2 ** (attempt - 1);
  if (jitterMs <= 0) {
    return exponentialDelay;
  }

  const jitter = Math.floor(Math.random() * (jitterMs * 2 + 1)) - jitterMs;
  return Math.max(0, exponentialDelay + jitter);
}

function normalizeRetryCount(retryCount: number): number {
  if (!Number.isFinite(retryCount) || retryCount < 0) {
    throw new ApiError('Invalid retryCount: expected a non-negative finite number', {
      code: 'INVALID_RETRY_COUNT',
      details: { retryCount },
    });
  }
  if (!Number.isInteger(retryCount)) {
    throw new ApiError('Invalid retryCount: expected a non-negative integer', {
      code: 'INVALID_RETRY_COUNT',
      details: { retryCount },
    });
  }

  if (retryCount > MAX_RETRY_COUNT) {
    console.warn(
      `[ApiClient] retryCount=${retryCount} exceeds max ${MAX_RETRY_COUNT}; clamping to ${MAX_RETRY_COUNT}.`
    );
    return MAX_RETRY_COUNT;
  }

  return retryCount;
}

function isWrappedApiResponse<T>(value: unknown): value is WrappedApiResponse<T> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'success' in value &&
      'data' in value
  );
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
      retryCount = 0,
      retryDelayMs = DEFAULT_RETRY_DELAY_MS,
      retryJitterMs = DEFAULT_RETRY_JITTER_MS,
      retryStatuses,
      headers = {},
      ...fetchOptions
    } = options;

    const method = (fetchOptions.method || 'GET').toUpperCase();
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const normalizedRetryCount = normalizeRetryCount(retryCount);
    const maxAttempts = normalizedRetryCount + 1;
    const retryableStatuses = new Set<number>(
      retryStatuses && retryStatuses.length > 0 ? retryStatuses : Array.from(RETRYABLE_STATUS_CODES)
    );
    
    // Only set Content-Type if there's a body to send
    const hasBody = fetchOptions.body !== undefined && fetchOptions.body !== null;
    const defaultHeaders: Record<string, string> = {
      ...(headers as Record<string, string>),
    };
    
    if (hasBody) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

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

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          credentials: 'omit',
          cache: 'no-store',
          headers: defaultHeaders,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new ApiError(
            errorData.message || errorData.error || `API request failed with status ${response.status}`,
            { code: errorData.code, status: response.status, details: errorData }
          );

          const canRetry =
            method === 'GET' &&
            attempt < maxAttempts &&
            typeof error.status === 'number' &&
            retryableStatuses.has(error.status);

          if (canRetry) {
            await sleep(getRetryDelayMs(retryDelayMs, attempt, retryJitterMs));
            continue;
          }

          Sentry.captureException(error, {
            tags: {
              location: 'api-client',
              endpoint: url,
              method,
              status: String(response.status),
            },
            extra: {
              url,
              status: response.status,
              statusText: response.statusText,
              errorData,
              attempt,
              maxAttempts,
            },
          });

          throw error;
        }

        let data: unknown;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new ApiError(
            parseError instanceof Error
              ? `Invalid JSON response: ${parseError.message}`
              : 'Invalid JSON response from API',
            {
              code: 'INVALID_JSON_RESPONSE',
              status: response.status,
              details: {
                url,
                statusText: response.statusText,
                contentType: response.headers.get('content-type'),
                contentLength: response.headers.get('content-length'),
              },
            }
          );
        }

        if (unwrapResponse && isWrappedApiResponse<T>(data)) {
          if (data.success) {
            return data.data as T;
          }
          throw new ApiError(
            data.error?.error || data.error?.message || 'API request failed',
            { code: data.error?.code, details: data.error }
          );
        }

        return data as T;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        const networkError = new ApiError(
          error instanceof Error ? error.message : 'Network error occurred',
          { code: 'NETWORK_ERROR' }
        );

        const canRetry = method === 'GET' && attempt < maxAttempts;
        if (canRetry) {
          await sleep(getRetryDelayMs(retryDelayMs, attempt, retryJitterMs));
          continue;
        }

        Sentry.captureException(networkError, {
          tags: {
            location: 'api-client',
            endpoint: url,
            method,
            errorType: 'network',
          },
          extra: { url, options: fetchOptions, attempt, maxAttempts },
        });

        throw networkError;
      }
    }

    // Intentional exhaustiveness guard: the retry loop should always return or throw ApiError before maxAttempts is exceeded.
    // This final throw keeps Promise<T> total for TypeScript and protects future loop changes.
    throw new ApiError('API request failed after retry attempts', { code: 'RETRY_EXHAUSTED' });
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
