export type ProductSurfaceKey = "public" | "dashboard" | "habigoal" | "athlete_iq";

export type ProductThemeMode = "neutral" | "whitelabel" | "professional_dark_gold";

export type ProductColorIntent =
  | "primaryAction"
  | "secondaryAction"
  | "success"
  | "warning"
  | "risk"
  | "neutral"
  | "progressGood"
  | "progressWatch"
  | "progressRisk";

export type ChromeOwner = "public" | "dashboard" | "product" | "none";

export type RouteChromeContract = {
  activeSurface: ProductSurfaceKey;
  allowMobileProductNav: boolean;
  allowPageHeader: boolean;
  allowProductTopBar: boolean;
  routePattern: string;
  shellOwner: ChromeOwner;
};

// The whole app is dark-only; product surfaces differentiate through mode
// (branding lane) and semantic colors, never through a color scheme.
export type ProductSurfaceContract = {
  mode: ProductThemeMode;
  portalRootId: string;
  surface: ProductSurfaceKey;
};

const PRODUCT_SURFACE_CONTRACTS: Record<ProductSurfaceKey, ProductSurfaceContract> = {
  athlete_iq: {
    mode: "professional_dark_gold",
    portalRootId: "product-surface-portal",
    surface: "athlete_iq"
  },
  dashboard: {
    mode: "neutral",
    portalRootId: "product-surface-portal",
    surface: "dashboard"
  },
  habigoal: {
    mode: "whitelabel",
    portalRootId: "product-surface-portal",
    surface: "habigoal"
  },
  public: {
    mode: "neutral",
    portalRootId: "product-surface-portal",
    surface: "public"
  }
};

const PRODUCT_COLORS: Record<ProductSurfaceKey, Record<ProductColorIntent, string>> = {
  athlete_iq: {
    neutral: "neutral",
    primaryAction: "review",
    progressGood: "tactical",
    progressRisk: "red",
    progressWatch: "review",
    risk: "red",
    secondaryAction: "neutral",
    success: "tactical",
    warning: "review"
  },
  dashboard: {
    neutral: "neutral",
    primaryAction: "review",
    progressGood: "tactical",
    progressRisk: "red",
    progressWatch: "review",
    risk: "red",
    secondaryAction: "neutral",
    success: "tactical",
    warning: "review"
  },
  habigoal: {
    neutral: "neutral",
    primaryAction: "knowmore",
    progressGood: "tactical",
    progressRisk: "red",
    progressWatch: "review",
    risk: "red",
    secondaryAction: "neutral",
    success: "tactical",
    warning: "review"
  },
  public: {
    neutral: "neutral",
    primaryAction: "ingress",
    progressGood: "tactical",
    progressRisk: "red",
    progressWatch: "review",
    risk: "red",
    secondaryAction: "neutral",
    success: "tactical",
    warning: "review"
  }
};

export function normalizeAppPath(pathname: string): string {
  const clean = pathname || "/";
  return clean.replace(/^\/(en|hu|ar|es|de|he)(?=\/|$)/, "") || "/";
}

export function resolveProductSurfaceFromPathname(pathname: string): ProductSurfaceKey {
  const path = normalizeAppPath(pathname);
  if (path === "/athlete-iq" || path.startsWith("/athlete-iq/")) return "athlete_iq";
  if (path === "/habigoal" || path.startsWith("/habigoal/")) return "habigoal";
  if (path === "/dashboard" || path.startsWith("/dashboard/") || path.startsWith("/athletes/")) return "dashboard";
  return "public";
}

export function getProductSurfaceContract(surface: ProductSurfaceKey): ProductSurfaceContract {
  return PRODUCT_SURFACE_CONTRACTS[surface];
}

export function getRouteChromeContract(pathname: string): RouteChromeContract {
  const path = normalizeAppPath(pathname);
  const activeSurface = resolveProductSurfaceFromPathname(pathname);
  const productRoute = activeSurface === "athlete_iq" || activeSurface === "habigoal";
  const dashboardRoute = activeSurface === "dashboard";

  return {
    activeSurface,
    allowMobileProductNav: !productRoute,
    allowPageHeader: true,
    allowProductTopBar: !dashboardRoute && !productRoute,
    routePattern: routePatternForPath(path),
    shellOwner: dashboardRoute || productRoute ? "dashboard" : activeSurface === "public" ? "public" : "none"
  };
}

export function getProductColor(surface: ProductSurfaceKey, intent: ProductColorIntent): string {
  return PRODUCT_COLORS[surface][intent];
}

export function signalStateToIntent(state: "good" | "missing" | "neutral" | "risk" | "watch"): ProductColorIntent {
  if (state === "good") return "success";
  if (state === "risk") return "risk";
  if (state === "watch") return "warning";
  return "neutral";
}

export function scoreToProgressIntent(score: number | null | undefined): ProductColorIntent {
  if (typeof score !== "number" || !Number.isFinite(score)) return "neutral";
  if (score >= 70) return "progressGood";
  if (score > 0) return "progressWatch";
  return "neutral";
}

export function routePatternForPath(pathname: string): string {
  const path = normalizeAppPath(pathname);
  if (path.startsWith("/dashboard/athletes/") && path.endsWith("/intelligence")) return "/dashboard/athletes/[id]/intelligence";
  if (path.startsWith("/dashboard/athletes/") && path.endsWith("/vision")) return "/dashboard/athletes/[id]/vision";
  if (path.startsWith("/dashboard/athletes/")) return "/dashboard/athletes/[id]";
  if (path.startsWith("/athletes/") && path.endsWith("/session")) return "/athletes/[id]/session";
  if (path.startsWith("/athletes/")) return "/athletes/[id]";
  if (path.startsWith("/records/")) return "/records/[id]";
  return path;
}
