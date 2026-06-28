"use client";

import { useEffect, useState } from "react";

// Canonical input-capability detection (#401). The adaptive system has TWO
// channels: viewport WIDTH drives layout, input CAPABILITY (pointer precision +
// hover) drives affordances. This module is the only sanctioned way to branch on
// capability in JS — prefer CSS (the postcss `hover` mixin / `@media
// (any-pointer: coarse)`) and reach for this hook only when render must branch.
//
// Rule: use the UNION (`any-pointer`/`any-hover`) to decide what to OFFER, so
// hybrids (touch laptops, iPad + trackpad) get touch-safe affordances while
// keeping hover enhancements. Never use viewport width as an input proxy; never
// UA-sniff.

export type InputCapability = {
  /** Any attached pointer is coarse (finger/stylus). Offer touch-grade targets. */
  hasCoarse: boolean;
  /** Any attached pointer is fine (mouse/trackpad). */
  hasFine: boolean;
  /** Any attached input can hover. Enable hover enhancements. */
  canHover: boolean;
};

export const CAPABILITY_QUERIES = {
  hasCoarse: "(any-pointer: coarse)",
  hasFine: "(any-pointer: fine)",
  canHover: "(any-hover: hover)"
} as const;

// Pure resolver — easy to unit-test with a mocked matchMedia.
export function resolveInputCapability(matchMedia: (query: string) => { matches: boolean }): InputCapability {
  return {
    hasCoarse: matchMedia(CAPABILITY_QUERIES.hasCoarse).matches,
    hasFine: matchMedia(CAPABILITY_QUERIES.hasFine).matches,
    canHover: matchMedia(CAPABILITY_QUERIES.canHover).matches
  };
}

// Precise-pointer default (matches the CSS `--target-size` default), so SSR/first
// paint never assumes touch; real capability resolves after mount.
const DEFAULT_CAPABILITY: InputCapability = { hasCoarse: false, hasFine: true, canHover: true };

export function useInputCapability(): InputCapability {
  const [capability, setCapability] = useState<InputCapability>(DEFAULT_CAPABILITY);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const lists = Object.values(CAPABILITY_QUERIES).map((query) => window.matchMedia(query));
    const update = () => setCapability(resolveInputCapability((query) => window.matchMedia(query)));
    update();
    lists.forEach((list) => list.addEventListener("change", update));
    return () => lists.forEach((list) => list.removeEventListener("change", update));
  }, []);

  return capability;
}
