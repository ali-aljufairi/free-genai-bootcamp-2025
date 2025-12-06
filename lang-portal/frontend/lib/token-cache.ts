/**
 * Token Cache Utility
 * 
 * @deprecated This file is deprecated. Use the unified API client (lib/api-client.ts) 
 * with useApiClient() hook instead. The unified client uses Clerk's recommended 
 * useAuth().getToken() pattern and handles token management automatically.
 * 
 * This file is kept for backward compatibility during migration but will be removed
 * in a future version.
 * 
 * Migration guide:
 * - Replace: getCachedToken(session) 
 * - With: useApiClient() hook which automatically handles authentication
 * 
 * Reduces unnecessary Clerk token requests by caching tokens with expiration
 */

type CachedToken = {
  token: string;
  expiresAt: number; // timestamp in milliseconds
};

let tokenCache: CachedToken | null = null;
const TOKEN_REFRESH_BUFFER = 30 * 60 * 1000; // Refresh 30 minutes before expiration

/**
 * Gets a Clerk token with caching to reduce API calls
 * @param session - Clerk session object
 * @returns Promise<string | null> - The token or null if unavailable
 */
export async function getCachedToken(session: any): Promise<string | null> {
  if (!session || typeof session.getToken !== 'function') {
    return null;
  }

  const now = Date.now();

  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiresAt > now + TOKEN_REFRESH_BUFFER) {
    return tokenCache.token;
  }

  try {
    // Get fresh token from Clerk
    const token = await session.getToken();
    
    if (!token) {
      tokenCache = null;
      return null;
    }

    // Decode token to get expiration (basic JWT parsing)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = (payload.exp || 0) * 1000; // Convert to milliseconds

      // Cache the token with expiration
      tokenCache = {
        token,
        expiresAt,
      };

      return token;
    } catch (e) {
      // If we can't parse the token, still use it but don't cache
      // This shouldn't happen with valid Clerk tokens
      console.warn('Failed to parse token expiration, not caching');
      return token;
    }
  } catch (error) {
    console.warn('Failed to get Clerk token:', error);
    tokenCache = null;
    return null;
  }
}

/**
 * Clears the token cache (useful for logout)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

