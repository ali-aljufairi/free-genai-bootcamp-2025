"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export function useAuthSetup() {
    const { isSignedIn, getToken } = useAuth();
    const { user } = useUser();

    useEffect(() => {
        if (isSignedIn && user) {
            // Optimistically ensure user exists in backend
            const setupUser = async () => {
                try {
                    const token = await getToken();
                    if (!token) return;

                    // Just call any authenticated endpoint - the middleware will create the user if needed
                    const response = await fetch('/api/langportal/users/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    // If user doesn't exist (404), the middleware has already created them
                    // We don't need to handle any response, just let it work in the background
                } catch (error) {
                    // Fail silently - we're being optimistic
                    console.debug('Auth setup running in background');
                }
            };

            setupUser();
        }
    }, [isSignedIn, user, getToken]);

    return null; // No loading states, just background work
}
