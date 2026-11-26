"use client";

import { useEffect } from "react";
import { currentPointerType } from "@/lib/pointerReach";
import { installRangeTouch } from "@/lib/rangeTouch";

/** Marks on <html> whether a finger, a pen or a mouse was last in use, and drives sliders for a finger or pen (Discussion #2019); draws nothing. */
export function PointerKind() {
  useEffect(() => {
    currentPointerType();
    installRangeTouch();
  }, []);
  return null;
}
