import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const viewport = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/WorkplaneViewport.tsx", import.meta.url)), "utf8");
const overlay = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/workplane/GridfinityDividersOverlay.tsx", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../apps/web/src/app/globals.css", import.meta.url)), "utf8");
const zIndexOf = (selector: string) => Number(new RegExp(`(?:^|\\n)${selector.replace(/\./g, "\\.")} \\{[^}]*?z-index: (\\d+);`).exec(css)?.[1]);

describe("a Gridfinity bin's divider grips in the viewport (Discussion #1799)", () => {
  it("are worked out for one selected shape while no transform or body drag runs", () => {
    expect(viewport).toMatch(/syncGridfinityDividersOverlay\(state, selectedIdsRef\.current\.length === 1 && !transformRef\.current && !dragRef\.current \?/);
    // With the divider being dragged, whose grip stays whatever the view.
    expect(viewport).toMatch(/setGridfinityDividersOverlay, gridfinityDividerDragRef\.current\);/);
  });

  it("show only where the move handles show and Hollow's grips do not, new for each bin", () => {
    expect(viewport).toMatch(/\{gridfinityDividersOverlay && selectedShape && transformOverlayShown && !shellWalls \? \(\s*<GridfinityDividersOverlay\s+key=\{selectedShape\.id\}/);
  });

  it("hand camera presses and the wheel to the view, as the move handles do", () => {
    expect(viewport).toMatch(/<GridfinityDividersOverlay[^>]*onBeginCameraDrag=\{beginCameraDragFromOverlay\}\s+onCameraWheel=\{forwardCameraWheelFromOverlay\}/);
  });

  it("are called off with Esc", () => {
    expect(viewport).toMatch(/event\.key === "Escape" && \([^)]*gridfinityDividerDragRef\.current\)/);
    expect(viewport).toMatch(/if \(endGridfinityDividerDrag\(gridfinityDividerDragRef, onInteractionActiveChange, onCancelInteraction\)\) return true;/);
  });

  it("lie under the move handles, which show beside them, and over the view", () => {
    expect(overlay).toContain('className="shell-walls-overlay gridfinity-dividers-overlay"');
    const own = zIndexOf(".shell-walls-overlay.gridfinity-dividers-overlay");
    expect(own).toBeGreaterThan(0);
    expect(own).toBeLessThan(zIndexOf(".transform-overlay"));
  });
});
