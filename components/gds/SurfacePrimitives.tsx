"use client";

import { Box, InlineAlert } from "@sovereignsquad/gds/client";
import type { CSSProperties, ElementType, ReactElement, ReactNode } from "react";

type LooseProps = {
  [key: string]: unknown;
};

type GdsTextProps = LooseProps & {
  children?: ReactNode;
  className?: string;
  c?: string;
  component?: ElementType;
  fw?: CSSProperties["fontWeight"];
  id?: string;
  lh?: CSSProperties["lineHeight"];
  maw?: CSSProperties["maxWidth"];
  mb?: string | number;
  mt?: string | number;
  role?: string;
  size?: string | number;
  style?: CSSProperties;
  ta?: CSSProperties["textAlign"];
  tt?: CSSProperties["textTransform"];
};

type GdsTitleProps = GdsTextProps & {
  order?: 1 | 2 | 3 | 4 | 5 | 6;
};

type GdsSurfacePanelProps = LooseProps & {
  children?: ReactNode;
  className?: string;
  component?: ElementType;
  id?: string;
  radius?: string | number;
  style?: CSSProperties;
  withBorder?: boolean;
};

type GdsAlertProps = LooseProps & {
  children?: ReactNode;
  color?: string;
  role?: string;
  title: string;
};

const sizeMap: Record<string, CSSProperties["fontSize"]> = {
  xs: "0.75rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem"
};

const titleSizeMap: Record<number, CSSProperties["fontSize"]> = {
  1: "2rem",
  2: "1.5rem",
  3: "1.25rem",
  4: "1.125rem",
  5: "1rem",
  6: "0.875rem"
};

const GdsBox = Box as unknown as (props: LooseProps & { children?: ReactNode }) => ReactElement;
const productColorTokens: Record<string, CSSProperties["color"]> = {
  checklist: "var(--gds-vibe-accent, var(--accent-gold))",
  ingress: "var(--gds-vibe-accent, var(--accent-gold))",
  knowmore: "var(--gds-vibe-accent, var(--accent-gold))",
  neutral: "var(--gds-vibe-muted, var(--text-secondary))",
  red: "var(--gds-vibe-accent, var(--accent-gold))",
  review: "var(--gds-vibe-accent, var(--accent-gold))",
  risk: "var(--gds-vibe-accent, var(--accent-gold))",
  strategy: "var(--gds-vibe-accent, var(--accent-gold))",
  success: "var(--gds-vibe-accent, var(--accent-gold))",
  synthesis: "var(--gds-vibe-accent, var(--accent-gold))",
  tactical: "var(--gds-vibe-accent, var(--accent-gold))",
  warning: "var(--gds-vibe-accent, var(--accent-gold))"
};

export function Text({
  c,
  children,
  className,
  component = "p",
  fw,
  lh,
  maw,
  mb,
  mt,
  size,
  style,
  ta,
  tt,
  ...props
}: GdsTextProps) {
  return (
    <GdsBox
      {...props}
      className={className}
      component={component}
      mb={mb as never}
      mt={mt as never}
      style={{
        color: resolveTextColor(c),
        display: component === "span" ? "inline" : undefined,
        fontSize: resolveFontSize(size),
        fontWeight: fw,
        lineHeight: lh,
        margin: 0,
        maxWidth: maw,
        textAlign: ta,
        textTransform: tt,
        ...style
      }}
    >
      {children}
    </GdsBox>
  );
}

export function Title({
  children,
  className,
  component,
  fw,
  order = 2,
  size,
  style,
  ...props
}: GdsTitleProps) {
  const Heading = component ?? (`h${order}` as ElementType);
  return (
    <GdsBox
      {...props}
      className={className}
      component={Heading}
      style={{
        color: "var(--gds-vibe-text, var(--text-primary))",
        fontSize: resolveTitleSize(size, order),
        fontWeight: fw ?? 900,
        letterSpacing: 0,
        lineHeight: 1.12,
        margin: 0,
        ...style
      }}
    >
      {children}
    </GdsBox>
  );
}

export function Paper({
  children,
  className,
  component = "div",
  radius,
  style,
  withBorder,
  ...props
}: GdsSurfacePanelProps) {
  return (
    <GdsBox
      {...props}
      className={["gds-surface-panel", withBorder ? "gds-surface-panel-bordered" : "", className].filter(Boolean).join(" ")}
      component={component}
      style={{
        borderRadius: radius ? `var(--mantine-radius-${radius}, ${typeof radius === "number" ? `${radius}px` : radius})` : undefined,
        ...style
      }}
    >
      {children}
    </GdsBox>
  );
}

export function Alert({ children, color, role, title }: GdsAlertProps) {
  return (
    <Box role={role}>
      <InlineAlert
        title={title}
        message={children}
        severity={role === "alert" || color === "red" || color === "risk" ? "error" : "warning"}
      />
    </Box>
  );
}

function resolveTextColor(color: unknown): CSSProperties["color"] {
  if (!color) return undefined;
  if (color === "dimmed") return "var(--gds-vibe-muted, var(--text-secondary))";
  if (typeof color === "string" && productColorTokens[color]) return productColorTokens[color];
  if (typeof color === "string" && color.includes("--mantine-color-") && color.includes("dimmed")) return "var(--gds-vibe-muted, var(--text-secondary))";
  if (typeof color === "string" && color.includes("--mantine-color-")) return "var(--gds-vibe-accent, var(--accent-gold))";
  if (typeof color === "string" && color.startsWith("var(")) return color;
  if (typeof color === "string" && /^[a-z]+\.[0-9]$/.test(color)) {
    const [name] = color.split(".");
    return productColorTokens[name] ?? "var(--gds-vibe-accent, var(--accent-gold))";
  }
  if (typeof color === "string") return productColorTokens[color] ?? "var(--gds-vibe-accent, var(--accent-gold))";
  return "var(--gds-vibe-accent, var(--accent-gold))";
}

function resolveFontSize(size: unknown): CSSProperties["fontSize"] {
  if (!size) return undefined;
  if (typeof size === "number") return size;
  return sizeMap[String(size)] ?? String(size);
}

function resolveTitleSize(size: unknown, order: number): CSSProperties["fontSize"] {
  if (typeof size === "string" && sizeMap[size]) return sizeMap[size];
  if (typeof size === "string" && /^h[1-6]$/.test(size)) {
    return titleSizeMap[Number(size.slice(1))];
  }
  if (size) return resolveFontSize(size);
  return titleSizeMap[order];
}
