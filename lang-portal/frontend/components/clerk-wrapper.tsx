"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { useEffect } from "react";

// Configure Clerk to automatically include auth tokens in fetch requests
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
}

interface ClerkWrapperProps {
    children: React.ReactNode;
}

export default function ClerkWrapper({ children }: ClerkWrapperProps) {
    useEffect(() => {
        // Handle any client-side initialization if needed
    }, []);

    return (
        <ClerkProvider
            appearance={clerkAppearance}
            afterSignInUrl="/study"
            afterSignUpUrl="/study"
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            publishableKey={publishableKey}
        >
            {children}
        </ClerkProvider>
    );
}
