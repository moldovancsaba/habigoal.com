"use client";

import { useEffect } from "react";

export function NewsSeenTracker({
  version
}: {
  version: string;
}) {
  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/me")
      .then((response) => {
        if (!response.ok) {
          return null;
        }

        return response.json();
      })
      .then((payload) => {
        if (cancelled || !payload?.user?.email) {
          return;
        }

        return fetch("/api/onboarding/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "seen-release",
            version
          })
        }).catch(() => null);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [version]);

  return null;
}
