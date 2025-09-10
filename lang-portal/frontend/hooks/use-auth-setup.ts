"use client";

import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";

/**
 * Hook to handle user setup after authentication
 * This ensures the user exists in our backend database
 * Runs optimistically in the background
 */
export function useAuthSetup() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const setupUser = async () => {
      try {
        // Make an authenticated request to trigger user creation in backend
        const token = await getToken();
        if (!token) return;
        
        // Just call any authenticated endpoint - the middleware will create the user if needed
        await fetch(`/api/v2/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        // No need to handle response - working optimistically
      } catch (error) {
        // Fail silently - we're being optimistic
        console.debug('Auth setup running in background');
      }
    };

    setupUser();
  }, [isLoaded, user, getToken]);

  return null; // No loading states, just background work
}
