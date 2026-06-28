"use client";

import { useKeepFocusedFieldVisible } from "@/lib/use-keep-focused-field-visible";

// Mount inside any touch form to keep the focused field above the virtual
// keyboard (#412). Renders nothing; safe in server-component subtrees.
export function KeepFocusedFieldVisible() {
  useKeepFocusedFieldVisible();
  return null;
}
