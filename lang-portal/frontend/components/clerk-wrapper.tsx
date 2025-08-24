"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/components/navbar";
import { useEffect } from "react";

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
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        >
            {children}
        </ClerkProvider>
    );
}
