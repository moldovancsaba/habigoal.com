"use client";

import { useEffect } from "react";

// Virtual-keyboard safety (#412). When the on-screen keyboard opens on touch
// devices it covers the lower part of the screen. On Android (with
// `interactive-widget=resizes-content`) the layout viewport shrinks and the
// browser usually keeps the focused field visible; on iOS Safari the layout
// viewport does NOT resize — only the VisualViewport does — so a focused field
// near the bottom is hidden behind the keyboard with no automatic scroll.
//
// This module computes the keyboard inset from the VisualViewport and scrolls a
// just-focused/obscured field back into view. The math is split into pure
// functions so it is unit-testable without a DOM.

export type VisualViewportLike = {
  height: number;
  offsetTop: number;
};

/**
 * How many CSS px the on-screen keyboard (and any browser UI) covers at the
 * bottom, derived from the gap between the layout viewport and the visible
 * VisualViewport. Clamped at 0 (never negative).
 */
export function computeKeyboardInset(layoutHeight: number, visual: VisualViewportLike | null): number {
  if (!visual) return 0;
  const inset = layoutHeight - (visual.height + visual.offsetTop);
  return inset > 0 ? inset : 0;
}

/**
 * The bottom edge (in layout-viewport coordinates, matching
 * getBoundingClientRect) of the region that remains visible above the keyboard.
 */
export function visibleBottom(visual: VisualViewportLike): number {
  return visual.offsetTop + visual.height;
}

/**
 * Whether a field whose bottom is at `fieldBottom` (getBoundingClientRect.bottom)
 * is obscured by the keyboard, leaving `margin` px of breathing room.
 */
export function isFocusedFieldObscured(fieldBottom: number, visual: VisualViewportLike, margin = 16): boolean {
  return fieldBottom > visibleBottom(visual) - margin;
}

const FIELD_SELECTOR = "input, textarea, select, [contenteditable='true']";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/**
 * Keeps the currently focused form field visible above the virtual keyboard.
 * No-op on devices without a VisualViewport (older browsers) and on desktop
 * where the keyboard never covers content. Safe to mount in any client subtree;
 * renders nothing.
 */
export function useKeepFocusedFieldVisible(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    let frame = 0;

    const ensureVisible = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || !active.matches?.(FIELD_SELECTOR)) return;
      const rect = active.getBoundingClientRect();
      if (!isFocusedFieldObscured(rect.bottom, viewport)) return;
      active.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth"
      });
    };

    // iOS fires `resize`/`scroll` on the VisualViewport (sometimes late), so
    // debounce to the next animation frame and recompute against fresh metrics.
    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(ensureVisible);
    };

    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    document.addEventListener("focusin", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      document.removeEventListener("focusin", schedule);
    };
  }, []);
}
