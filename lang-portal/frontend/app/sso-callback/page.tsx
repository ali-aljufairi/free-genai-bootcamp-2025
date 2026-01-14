"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
    return (
        <>
            <AuthenticateWithRedirectCallback
                signInForceRedirectUrl="/study"
                signUpForceRedirectUrl="/pricing"
            />
            {/* Required for sign-up flows with bot protection */}
            <div id="clerk-captcha" />
        </>
    );
}
