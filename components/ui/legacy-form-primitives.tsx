"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Alert as MantineAlert, Badge, Box as MantineBox, Button as MantineButton, Checkbox as MantineCheckbox, Divider as MantineDivider, Group, Modal, Paper as MantinePaper, Select, Stack as MantineStack, Text, TextInput, Textarea } from "@mantine/core";

type AnyProps = Record<string, any>;

function resolveResponsiveValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const map = value as Record<string, unknown>;
  return map.lg ?? map.md ?? map.sm ?? map.xs ?? Object.values(map)[0];
}

function sxToStyle(sx?: any): CSSProperties | undefined {
  if (!sx) return undefined;
  if (typeof sx === "function") return undefined;
  const raw = sx as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[key] = resolveResponsiveValue(value);
  }
  return normalized as CSSProperties;
}

export function Alert(props: AnyProps) {
  const { severity, children, onClose } = props;
  const color = severity === "error" ? "red" : severity === "success" ? "green" : "blue";
  return <MantineAlert color={color} withCloseButton={Boolean(onClose)} onClose={onClose as any}>{children as any}</MantineAlert>;
}

export function Box(props: AnyProps) {
  const { sx, component, ...rest } = props;
  return <MantineBox component={component as any} style={sxToStyle(sx)} {...(rest as any)} />;
}

export function Button(props: AnyProps) {
  const { variant, children, sx, ...rest } = props;
  const mappedVariant = variant === "contained" ? "filled" : variant === "outlined" ? "light" : "subtle";
  return <MantineButton variant={mappedVariant as any} style={sxToStyle(sx)} {...(rest as any)}>{children as any}</MantineButton>;
}

export function Checkbox(props: AnyProps) {
  const { slotProps, ...rest } = props;
  const ariaLabel = slotProps?.input?.["aria-label"];
  return <MantineCheckbox aria-label={ariaLabel} {...(rest as any)} />;
}

export function Chip(props: AnyProps) {
  const { label, sx } = props;
  const styles = sxToStyle(sx);
  return <Badge variant="light" style={styles}>{label as any}</Badge>;
}

export function Dialog(props: AnyProps) {
  const { open, onClose, children, maxWidth } = props;
  const size = maxWidth === "sm" ? "md" : "lg";
  return <Modal opened={Boolean(open)} onClose={onClose as any} size={size}>{children as any}</Modal>;
}

export function DialogTitle({ children }: AnyProps) {
  return <Text fw={600} mb="xs">{children as any}</Text>;
}

export function DialogContent({ children }: AnyProps) {
  return <Box>{children}</Box>;
}

export function DialogActions({ children }: AnyProps) {
  return <Group justify="flex-end" mt="md">{children as any}</Group>;
}

export function Divider(props: AnyProps) {
  const { sx, ...rest } = props;
  return <MantineDivider style={sxToStyle(sx)} {...(rest as any)} />;
}

export function FormControl({ children }: AnyProps) {
  return <Box>{children}</Box>;
}

export function FormControlLabel({ control, label }: AnyProps) {
  return <Group gap="xs">{control as any}<Text size="sm">{label as any}</Text></Group>;
}

export function InputLabel(props: AnyProps) {
  return <Text size="sm" c="dimmed">{props.children as any}</Text>;
}

export function Link(props: AnyProps) {
  const { children, ...rest } = props;
  return <Text component="a" {...(rest as any)}>{children as any}</Text>;
}

export function MenuItem(props: AnyProps) {
  const { value, children } = props;
  return <option value={value as any}>{children as any}</option>;
}

export function PaperWrapper(props: AnyProps) {
  const { sx, children, ...rest } = props;
  return <MantinePaper withBorder style={sxToStyle(sx)} {...(rest as any)}>{children as any}</MantinePaper>;
}
export { PaperWrapper as Paper };

export function MuiSelect(props: AnyProps) {
  const { value, onChange, children, label, disabled } = props;
  const items = Array.isArray(children) ? children : [children];
  const data = items
    .filter(Boolean)
    .map((child) => child as ReactElement<{ value?: string; children?: ReactNode }>)
    .map((child) => ({
      value: child.props?.value ?? "",
      label: String(child.props?.children ?? "")
    }));
  return (
    <Select
      data={data}
      value={value as any}
      disabled={disabled as any}
      label={label as any}
      onChange={(next) => onChange?.({ target: { value: next ?? "" } })}
    />
  );
}

export function Stack(props: AnyProps) {
  const { direction, spacing, sx, children } = props;
  const dir = typeof direction === "string" ? direction : "column";
  const style = { ...(sxToStyle(sx) || {}), flexDirection: dir, display: "flex" } as CSSProperties;
  return (
    <MantineStack
      gap={typeof spacing === "number" ? `${spacing * 0.25}rem` : (spacing as any)}
      style={style}
    >
      {children as any}
    </MantineStack>
  );
}

export function TextField(props: AnyProps) {
  const { multiline, minRows, type, ...rest } = props;
  if (multiline) {
    return <Textarea minRows={minRows as any} {...(rest as any)} />;
  }
  return <TextInput type={type as any} {...(rest as any)} />;
}

export function ToggleButton(props: AnyProps) {
  const { selected, onChange, children, sx, ...rest } = props;
  return (
    <MantineButton
      variant={selected ? "filled" : "light"}
      size="md"
      onClick={(event) => onChange?.(event)}
      style={sxToStyle(sx)}
      {...(rest as any)}
    >
      {children as any}
    </MantineButton>
  );
}

export function Typography(props: AnyProps) {
  const { variant, children, color, sx, ...rest } = props;
  const size = variant === "h6" ? "xl" : variant === "h5" ? "xl" : variant === "subtitle1" ? "lg" : variant === "caption" ? "sm" : "md";
  const fw = variant === "h6" || variant === "h5" || variant === "subtitle1" ? 700 : undefined;
  const c = color === "text.secondary" ? "dimmed" : undefined;
  return <Text size={size as any} fw={fw as any} c={c as any} style={sxToStyle(sx)} {...(rest as any)}>{children as any}</Text>;
}
