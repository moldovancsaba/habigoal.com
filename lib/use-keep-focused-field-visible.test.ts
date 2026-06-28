import { describe, expect, it } from "vitest";
import {
  computeKeyboardInset,
  isFocusedFieldObscured,
  visibleBottom,
  type VisualViewportLike
} from "@/lib/use-keep-focused-field-visible";

describe("computeKeyboardInset", () => {
  it("is 0 when the visual viewport fills the layout viewport (no keyboard)", () => {
    expect(computeKeyboardInset(800, { height: 800, offsetTop: 0 })).toBe(0);
  });

  it("equals the covered height when the keyboard shrinks the visual viewport", () => {
    // 800px layout, keyboard leaves 500px visible at the top → 300px inset.
    expect(computeKeyboardInset(800, { height: 500, offsetTop: 0 })).toBe(300);
  });

  it("accounts for an offset visual viewport (page scrolled under the keyboard)", () => {
    expect(computeKeyboardInset(800, { height: 500, offsetTop: 100 })).toBe(200);
  });

  it("never returns a negative inset", () => {
    expect(computeKeyboardInset(800, { height: 900, offsetTop: 0 })).toBe(0);
  });

  it("is 0 when there is no visual viewport (unsupported browser)", () => {
    expect(computeKeyboardInset(800, null)).toBe(0);
  });
});

describe("isFocusedFieldObscured", () => {
  const keyboardOpen: VisualViewportLike = { height: 500, offsetTop: 0 }; // visible bottom = 500

  it("flags a field whose bottom sits below the visible region", () => {
    expect(isFocusedFieldObscured(620, keyboardOpen)).toBe(true);
  });

  it("treats a field comfortably above the keyboard as visible", () => {
    expect(isFocusedFieldObscured(300, keyboardOpen)).toBe(false);
  });

  it("respects the breathing-room margin at the boundary", () => {
    // visibleBottom 500, margin 16 → threshold 484.
    expect(isFocusedFieldObscured(490, keyboardOpen, 16)).toBe(true);
    expect(isFocusedFieldObscured(480, keyboardOpen, 16)).toBe(false);
  });

  it("uses offsetTop when computing the visible bottom", () => {
    expect(visibleBottom({ height: 500, offsetTop: 120 })).toBe(620);
  });
});
