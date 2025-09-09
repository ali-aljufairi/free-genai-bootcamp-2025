/**
 * API Utilities for consistent error handling and response formatting
 */

export interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

/**
 * Creates a consistent error response
 */
export function createErrorResponse(
  message: string, 
  code?: string, 
  status: number = 500,
  details?: any
): Response {
  const error: ApiError = {
    error: message,
    code,
    details
  };

  return Response.json(
    { error, success: false },
    { status }
  );
}

/**
 * Creates a consistent success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): Response {
  return Response.json(
    { data, success: true },
    { status }
  );
}

/**
 * Handles errors from the Go backend and formats them consistently
 */
export async function handleBackendError(response: Response): Promise<Response> {
  if (response.ok) {
    return response;
  }

  try {
    const errorData = await response.json();
    
    // If the backend already returns a structured error, use it
    if (errorData.error && errorData.code) {
      return createErrorResponse(
        errorData.error,
        errorData.code,
        response.status
      );
    }
    
    // Fallback for unstructured errors
    return createErrorResponse(
      errorData.error || errorData.message || 'Backend error',
      'BACKEND_ERROR',
      response.status
    );
  } catch {
    // If we can't parse the error response, return a generic error
    return createErrorResponse(
      `Backend request failed with status ${response.status}`,
      'BACKEND_REQUEST_FAILED',
      response.status
    );
  }
}

/**
 * Validates required environment variables
 */
export function validateEnvVars(required: string[]): void {
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Gets the Go backend URL with validation
 */
export function getBackendUrl(): string {
  const url = process.env.GO_BACKEND_URL || 'http://localhost:8080';
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('GO_BACKEND_URL must be a valid HTTP/HTTPS URL');
  }
  
  return url;
}



