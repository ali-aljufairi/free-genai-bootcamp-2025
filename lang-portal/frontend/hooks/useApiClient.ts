'use client';

import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';
import { ApiClient, createApiClient } from '@/lib/api-client';

export function useApiClient(): ApiClient {
  const { getToken } = useAuth();
  return useMemo(() => createApiClient(getToken), [getToken]);
}
