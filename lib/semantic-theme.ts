import type { SemanticTone } from "@/theme/tokens";

export type ThemeMode = "light" | "dark";

type SemanticToneScale = {
  color: string;
  surface: string;
  hoverSurface: string;
  glow: string;
  border: string;
  rgb: string;
  palette: [string, string, string, string, string, string, string, string, string, string];
};

type ThemeFoundation = {
  appBg: string;
  sidebarBg: string;
  surfaceBase: string;
  surfaceElevated: string;
  borderPrimary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  overlayColor: string;
  surfaceGradientTop: string;
  surfaceGradientBottom: string;
  surfaceHoverTop: string;
  surfaceHoverBottom: string;
  surfaceShadowElevated: string;
  surfaceShadowFlat: string;
  surfaceIconBorder: string;
  surfaceIconShadow: string;
  surfaceSectionBorder: string;
  navCompanyLabel: string;
  navCompanyDescription: string;
  navLinkActive: string;
  navLinkInactive: string;
};

const FOUNDATIONS: Record<ThemeMode, ThemeFoundation> = {
  light: {
    appBg: "#edf3ff",
    sidebarBg: "#f2f7ff",
    surfaceBase: "rgba(255, 255, 255, 0.78)",
    surfaceElevated: "rgba(246, 250, 255, 0.88)",
    borderPrimary: "rgba(61, 79, 130, 0.14)",
    textPrimary: "#10203d",
    textSecondary: "#51627f",
    textMuted: "#7888a7",
    overlayColor: "rgba(233, 241, 255, 0.82)",
    surfaceGradientTop: "rgba(255, 255, 255, 0.82)",
    surfaceGradientBottom: "rgba(255, 255, 255, 0.4)",
    surfaceHoverTop: "rgba(255, 255, 255, 0.9)",
    surfaceHoverBottom: "rgba(255, 255, 255, 0.56)",
    surfaceShadowElevated: "0 18px 50px rgba(43, 79, 165, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.85)",
    surfaceShadowFlat: "0 1px 0 rgba(255, 255, 255, 0.88) inset",
    surfaceIconBorder: "rgba(61, 79, 130, 0.14)",
    surfaceIconShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.8)",
    surfaceSectionBorder: "rgba(61, 79, 130, 0.1)",
    navCompanyLabel: "#3958d9",
    navCompanyDescription: "#5871c6",
    navLinkActive: "#10203d",
    navLinkInactive: "#5d6f94"
  },
  dark: {
    appBg: "#050917",
    sidebarBg: "#081123",
    surfaceBase: "rgba(16, 24, 45, 0.72)",
    surfaceElevated: "rgba(21, 31, 54, 0.82)",
    borderPrimary: "rgba(141, 171, 255, 0.16)",
    textPrimary: "#edf4ff",
    textSecondary: "#b3c1df",
    textMuted: "#7f8db0",
    overlayColor: "rgba(5, 9, 23, 0.84)",
    surfaceGradientTop: "rgba(255, 255, 255, 0.1)",
    surfaceGradientBottom: "rgba(255, 255, 255, 0.03)",
    surfaceHoverTop: "rgba(255, 255, 255, 0.14)",
    surfaceHoverBottom: "rgba(255, 255, 255, 0.05)",
    surfaceShadowElevated: "0 22px 60px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    surfaceShadowFlat: "0 1px 0 rgba(255, 255, 255, 0.08) inset",
    surfaceIconBorder: "rgba(255, 255, 255, 0.12)",
    surfaceIconShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
    surfaceSectionBorder: "rgba(255, 255, 255, 0.08)",
    navCompanyLabel: "#8db0ff",
    navCompanyDescription: "#c5d4ff",
    navLinkActive: "#edf4ff",
    navLinkInactive: "#b9c7ea"
  }
};

const TONES: Record<ThemeMode, Record<SemanticTone, SemanticToneScale>> = {
  light: {
    ingress: {
      color: "#2563eb",
      surface: "rgba(232, 241, 255, 0.82)",
      hoverSurface: "rgba(219, 234, 254, 0.92)",
      glow: "rgba(37, 99, 235, 0.2)",
      border: "rgba(37, 99, 235, 0.18)",
      rgb: "37, 99, 235",
      palette: ["#eef4ff", "#dfeaff", "#c4d8ff", "#9fbfff", "#77a4ff", "#4f89ff", "#2563eb", "#1d4fd1", "#173fa7", "#122f7d"]
    },
    synthesis: {
      color: "#4f46e5",
      surface: "rgba(237, 233, 254, 0.82)",
      hoverSurface: "rgba(226, 221, 255, 0.92)",
      glow: "rgba(79, 70, 229, 0.2)",
      border: "rgba(79, 70, 229, 0.18)",
      rgb: "79, 70, 229",
      palette: ["#f1efff", "#e6e2ff", "#d2ccff", "#b8b0ff", "#9b91ff", "#7f72ff", "#635bff", "#4f46e5", "#3f39b7", "#302b8a"]
    },
    knowmore: {
      color: "#0891b2",
      surface: "rgba(227, 248, 255, 0.82)",
      hoverSurface: "rgba(209, 243, 255, 0.92)",
      glow: "rgba(8, 145, 178, 0.18)",
      border: "rgba(8, 145, 178, 0.18)",
      rgb: "8, 145, 178",
      palette: ["#ecfbff", "#daf7ff", "#b7eefb", "#8de0f5", "#5bcde9", "#2bb9dd", "#0891b2", "#0b7390", "#0a5970", "#083e4f"]
    },
    strategy: {
      color: "#a855f7",
      surface: "rgba(245, 233, 255, 0.82)",
      hoverSurface: "rgba(238, 219, 255, 0.92)",
      glow: "rgba(168, 85, 247, 0.2)",
      border: "rgba(168, 85, 247, 0.18)",
      rgb: "168, 85, 247",
      palette: ["#f9f0ff", "#f3e2ff", "#ebcbff", "#ddb0ff", "#cb8aff", "#bb68ff", "#a855f7", "#8d3ce0", "#6d2bb3", "#4d1d80"]
    },
    checklist: {
      color: "#0ea5e9",
      surface: "rgba(230, 246, 255, 0.82)",
      hoverSurface: "rgba(214, 240, 255, 0.92)",
      glow: "rgba(14, 165, 233, 0.2)",
      border: "rgba(14, 165, 233, 0.18)",
      rgb: "14, 165, 233",
      palette: ["#eefaff", "#dbf4ff", "#b9ebff", "#91deff", "#60cbff", "#32b8ff", "#0ea5e9", "#0780b7", "#066288", "#044357"]
    },
    tactical: {
      color: "#14b8a6",
      surface: "rgba(225, 251, 248, 0.82)",
      hoverSurface: "rgba(208, 245, 240, 0.92)",
      glow: "rgba(20, 184, 166, 0.18)",
      border: "rgba(20, 184, 166, 0.18)",
      rgb: "20, 184, 166",
      palette: ["#edfffd", "#d9fbf7", "#b5f3ea", "#87e8db", "#55d7c8", "#2bc7b6", "#14b8a6", "#129181", "#0e6f62", "#094b41"]
    },
    review: {
      color: "#f97316",
      surface: "rgba(255, 239, 225, 0.82)",
      hoverSurface: "rgba(255, 227, 203, 0.92)",
      glow: "rgba(249, 115, 22, 0.18)",
      border: "rgba(249, 115, 22, 0.18)",
      rgb: "249, 115, 22",
      palette: ["#fff5ef", "#ffe8dc", "#ffd1b7", "#ffb285", "#ff8f56", "#ff7b33", "#f97316", "#dd5d08", "#b14705", "#7d3103"]
    },
    neutral: {
      color: "#64748b",
      surface: "rgba(244, 247, 251, 0.72)",
      hoverSurface: "rgba(237, 242, 248, 0.88)",
      glow: "rgba(100, 116, 139, 0.12)",
      border: "rgba(100, 116, 139, 0.14)",
      rgb: "100, 116, 139",
      palette: ["#f7f9fc", "#eef2f8", "#dde5ef", "#c6d1e0", "#acbbce", "#8da0ba", "#64748b", "#4e5d72", "#394658", "#232f3f"]
    }
  },
  dark: {
    ingress: {
      color: "#6aa6ff",
      surface: "rgba(16, 36, 73, 0.78)",
      hoverSurface: "rgba(22, 48, 96, 0.9)",
      glow: "rgba(106, 166, 255, 0.24)",
      border: "rgba(106, 166, 255, 0.24)",
      rgb: "106, 166, 255",
      palette: ["#eaf2ff", "#cfe0ff", "#afcbff", "#8ab5ff", "#6aa6ff", "#4c94ff", "#327cf7", "#2465d7", "#184dab", "#10367a"]
    },
    synthesis: {
      color: "#7f72ff",
      surface: "rgba(28, 29, 86, 0.78)",
      hoverSurface: "rgba(37, 39, 112, 0.9)",
      glow: "rgba(127, 114, 255, 0.24)",
      border: "rgba(127, 114, 255, 0.24)",
      rgb: "127, 114, 255",
      palette: ["#f1efff", "#ddd8ff", "#c2b8ff", "#a695ff", "#8d7dff", "#7f72ff", "#695ef2", "#5548d0", "#4035a3", "#2c2573"]
    },
    knowmore: {
      color: "#4bd7ff",
      surface: "rgba(10, 52, 70, 0.78)",
      hoverSurface: "rgba(16, 69, 92, 0.9)",
      glow: "rgba(75, 215, 255, 0.22)",
      border: "rgba(75, 215, 255, 0.24)",
      rgb: "75, 215, 255",
      palette: ["#ebfcff", "#d1f7ff", "#abefff", "#7fe4ff", "#58dbff", "#4bd7ff", "#1dc2eb", "#1398b8", "#0d7188", "#084a59"]
    },
    strategy: {
      color: "#d58bff",
      surface: "rgba(51, 22, 78, 0.78)",
      hoverSurface: "rgba(71, 31, 108, 0.9)",
      glow: "rgba(213, 139, 255, 0.24)",
      border: "rgba(213, 139, 255, 0.24)",
      rgb: "213, 139, 255",
      palette: ["#f9f0ff", "#eedbff", "#ddbaff", "#cb9bff", "#bc85ff", "#b776ff", "#a855f7", "#8d3ce0", "#6d2cb0", "#4b1d7a"]
    },
    checklist: {
      color: "#4fd6ff",
      surface: "rgba(13, 48, 68, 0.78)",
      hoverSurface: "rgba(19, 66, 94, 0.9)",
      glow: "rgba(79, 214, 255, 0.22)",
      border: "rgba(79, 214, 255, 0.24)",
      rgb: "79, 214, 255",
      palette: ["#edfbff", "#d7f6ff", "#b2eeff", "#84e3ff", "#59d8ff", "#4fd6ff", "#21bde8", "#1794b5", "#106d84", "#0a4857"]
    },
    tactical: {
      color: "#45e3cf",
      surface: "rgba(12, 54, 52, 0.78)",
      hoverSurface: "rgba(17, 73, 70, 0.9)",
      glow: "rgba(69, 227, 207, 0.22)",
      border: "rgba(69, 227, 207, 0.24)",
      rgb: "69, 227, 207",
      palette: ["#eefffc", "#d6fdf6", "#abf8ec", "#7aeddc", "#56e6d4", "#45e3cf", "#1ac6b1", "#129887", "#0c6f63", "#084842"]
    },
    review: {
      color: "#ff9b66",
      surface: "rgba(68, 35, 20, 0.8)",
      hoverSurface: "rgba(93, 49, 28, 0.92)",
      glow: "rgba(255, 155, 102, 0.22)",
      border: "rgba(255, 155, 102, 0.24)",
      rgb: "255, 155, 102",
      palette: ["#fff3eb", "#ffe2d4", "#ffc5a7", "#ffaa7d", "#ff9865", "#ff8b52", "#f97316", "#d75f08", "#a94905", "#723003"]
    },
    neutral: {
      color: "#a9b7d0",
      surface: "rgba(19, 27, 45, 0.72)",
      hoverSurface: "rgba(28, 38, 59, 0.88)",
      glow: "rgba(169, 183, 208, 0.12)",
      border: "rgba(169, 183, 208, 0.18)",
      rgb: "169, 183, 208",
      palette: ["#f5f8fc", "#e7edf6", "#d1dbe9", "#bac8da", "#a6b6cc", "#92a6bf", "#7d93af", "#647792", "#4b5c73", "#313f54"]
    }
  }
};

export function getThemeFoundation(mode: ThemeMode) {
  return FOUNDATIONS[mode];
}

export function getSemanticTone(mode: ThemeMode, tone: SemanticTone) {
  return TONES[mode][tone];
}

export function getSemanticSurfaceCss(mode: ThemeMode, tone: SemanticTone, state: "base" | "hover" = "base") {
  const foundation = getThemeFoundation(mode);
  const semanticTone = getSemanticTone(mode, tone);

  if (state === "hover") {
    return {
      background: `linear-gradient(180deg, ${foundation.surfaceHoverTop}, ${foundation.surfaceHoverBottom}), ${semanticTone.hoverSurface}`,
      boxShadow: `0 0 0 1px rgba(${semanticTone.rgb}, 0.24), 0 18px 38px ${semanticTone.glow}`
    };
  }

  return {
    background: `linear-gradient(180deg, ${foundation.surfaceGradientTop}, ${foundation.surfaceGradientBottom}), ${semanticTone.surface}`,
    boxShadow: foundation.surfaceShadowElevated
  };
}

export function getNavStateCss(mode: ThemeMode, tone: SemanticTone, active: boolean) {
  const semanticTone = getSemanticTone(mode, tone);
  if (active) {
    return {
      background: `linear-gradient(90deg, rgba(${semanticTone.rgb}, 0.26), rgba(${semanticTone.rgb}, 0.07))`,
      borderLeft: `2px solid rgb(${semanticTone.rgb})`
    };
  }

  return {
    background: `linear-gradient(90deg, rgba(${semanticTone.rgb}, 0.12), rgba(${semanticTone.rgb}, 0.03))`,
    borderLeft: "2px solid transparent"
  };
}

export function resolveLegacyTone(input?: string | null): SemanticTone {
  const normalized = (input ?? "").trim().toLowerCase();
  const aliases: Record<string, SemanticTone> = {
    brand: "ingress",
    blue: "ingress",
    indigo: "synthesis",
    teal: "tactical",
    green: "knowmore",
    knowledge: "knowmore",
    purple: "strategy",
    violet: "strategy",
    cyan: "checklist",
    execution: "checklist",
    orange: "review",
    amber: "review",
    gray: "neutral",
    grey: "neutral",
    dark: "neutral",
    red: "neutral",
    yellow: "neutral"
  };

  return (aliases[normalized] ?? normalized) as SemanticTone;
}
