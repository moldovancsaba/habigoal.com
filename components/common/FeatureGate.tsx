"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Capabilities, CapabilityKey } from "@/lib/capabilities";
import { NotAvailableYet } from "./NotAvailableYet";

// Client-side wire-or-hide gate (#440). Renders children only when the named
// capability is enabled; otherwise an honest fallback (default: NotAvailableYet).
// Server components should gate with `getCapabilities()` directly instead.
//
// `capabilities` can be passed in (e.g. resolved on the server and handed down)
// to avoid a fetch; otherwise the gate reads /api/capabilities once. While
// loading it renders nothing, so a disabled feature never flashes.
export function FeatureGate({
  capability,
  capabilities,
  children,
  fallback
}: {
  capability: CapabilityKey;
  capabilities?: Capabilities;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [resolved, setResolved] = useState<Capabilities | null>(capabilities ?? null);

  useEffect(() => {
    if (capabilities) return;
    let active = true;
    fetch("/api/capabilities")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.capabilities) setResolved(data.capabilities as Capabilities);
      })
      .catch(() => {
        if (active) setResolved({} as Capabilities);
      });
    return () => {
      active = false;
    };
  }, [capabilities]);

  if (!resolved) return null;
  if (resolved[capability]) return <>{children}</>;
  return <>{fallback ?? <NotAvailableYet />}</>;
}
