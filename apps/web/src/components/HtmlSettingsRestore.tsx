"use client";

import { useLayoutEffect } from "react";
import { applyShapeColors, getShapeColors } from "@/lib/shapeColors";
import { applySimpleMode, getSimpleMode } from "@/lib/simpleMode";
import { applyToolbarSize, getToolbarSize } from "@/lib/toolbarSize";
import { applyViewCubePosition, getViewCubePosition } from "@/lib/viewCubePosition";

/**
 * The boot scripts in <head> put the stored settings on <html> before the page paints. When the page does not match
 * what the server sent (a browser extension or Translate changed it while it loaded), React builds it again and clears
 * every attribute of <html> on the way, so a small toolbar came back at medium size after a restart (#981). This puts
 * them back once the page is up.
 */
export function HtmlSettingsRestore() {
  useLayoutEffect(() => {
    applyToolbarSize(getToolbarSize());
    applySimpleMode(getSimpleMode());
    applyShapeColors(getShapeColors());
    applyViewCubePosition(getViewCubePosition());
  }, []);
  return null;
}
