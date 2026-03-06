"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { POSTHOG_ENABLED } from "@/lib/posthog";

function getPrimaryEmail(user: ReturnType<typeof useUser>["user"]): string | undefined {
  return user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
}

export default function PostHogUserIdentity() {
  const { isLoaded, isSignedIn, user } = useUser();
  const identifiedUserId = useRef<string | null>(null);
  const primaryEmail = getPrimaryEmail(user);
  const userId = user?.id;
  const fullName = user?.fullName || undefined;
  const username = user?.username || undefined;

  useEffect(() => {
    if (!POSTHOG_ENABLED || !isLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      if (identifiedUserId.current) {
        posthog.reset();
        identifiedUserId.current = null;
      }
      return;
    }

    posthog.identify(userId, {
      email: primaryEmail,
      name: fullName,
      username,
    });
    identifiedUserId.current = userId;
  }, [
    fullName,
    isLoaded,
    isSignedIn,
    primaryEmail,
    userId,
    username,
  ]);

  return null;
}
