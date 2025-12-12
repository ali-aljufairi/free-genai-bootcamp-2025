"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useSubscription } from "@/components/subscription/subscription-gate";

export default function SSOCallbackPage() {
    const router = useRouter();
    const { isLoaded: authLoaded, userId } = useAuth();
    const { isLoaded: userLoaded } = useUser();
    const { hasActiveSubscription, isLoaded: subscriptionLoaded } = useSubscription();

    useEffect(() => {
        // Wait for all auth and subscription data to be loaded
        if (!authLoaded || !userLoaded || !subscriptionLoaded) {
            return;
        }

        // If user is not authenticated, redirect to sign-in
        if (!userId) {
            router.push("/sign-in");
            return;
        }

        // Check subscription status and redirect accordingly
        // Default to pricing if subscription check fails (safety measure)
        const redirectPath = hasActiveSubscription ? "/study" : "/pricing";
        router.push(redirectPath);
    }, [authLoaded, userLoaded, subscriptionLoaded, userId, hasActiveSubscription, router]);

    // Show loading state while checking subscription
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-muted-foreground">Setting up your account...</p>
            </div>
        </div>
    );
}
