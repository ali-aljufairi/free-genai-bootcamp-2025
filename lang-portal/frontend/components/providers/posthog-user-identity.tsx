"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { POSTHOG_ENABLED } from "@/lib/posthog";

export default function PostHogUserIdentity() {
  const { isLoaded, isSignedIn, user } = useUser();
  const identifiedUserId = useRef<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!POSTHOG_ENABLED || !isLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      if (identifiedUserId.current !== null) {
        posthog.reset();
      }
      identifiedUserId.current = null;
      return;
    }

    if (identifiedUserId.current === userId) {
      return;
    }

    posthog.identify(userId);
    identifiedUserId.current = userId;
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
