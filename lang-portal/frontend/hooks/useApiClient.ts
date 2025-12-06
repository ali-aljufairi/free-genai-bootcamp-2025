/**
 * React Hook for API Client
 * 
 * Provides a configured API client instance using Clerk's useAuth hook.
 * 
 * Usage:
 * ```tsx
 * const api = useApiClient();
 * const data = await api.get('/api/langportal/words');
 * ```
 */

'use client';

import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';
import { ApiClient, createApiClient } from '@/lib/api-client';

/**
 * Hook that returns a configured API client instance
 * 
 * The client automatically handles authentication using Clerk's useAuth hook.
 * All requests will include the Authorization header with the Bearer token.
 * 
 * @returns Configured ApiClient instance
 */
export function useApiClient(): ApiClient {
  const { getToken } = useAuth();

  const client = useMemo(() => {
    return createApiClient(getToken);
  }, [getToken]);

  return client;
}

