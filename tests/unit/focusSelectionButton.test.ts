import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(fileURLToPath(new URL(`../../apps/web/src/components/${file}`, import.meta.url)), "utf8");
}

/** The camera bar's "Center view on selection" button, from its label to the end of its tag. */
function focusButton(text: string) {
  const start = text.indexOf('aria-label={t("camera.focusSelection")}');
  expect(start).toBeGreaterThan(-1);
  return text.slice(start, text.indexOf("<Crosshair", start));
}

describe("Center view on selection does what F does (Discussion #1082)", () => {
  it("is never greyed out in the 3D view, the sketch and the second view", () => {
    for (const file of ["WorkplaneViewport.tsx", "SketchWorkspace.tsx", "workplane/SecondViewCameraBar.tsx"]) {
      expect(focusButton(source(file))).not.toContain("disabled");
    }
  });

  it("shows everything when nothing is selected", () => {
    for (const file of ["WorkplaneViewport.tsx", "SketchWorkspace.tsx"]) {
      expect(focusButton(source(file))).toMatch(/if \(!focusSelection\(\)\) resetView\(\);/);
    }
    expect(source("workplane/SecondViewWindow.tsx")).toMatch(/onFocusSelection=\{\(\) => moveCamera\(\(view\) => \{\s*if \(!focusSelection\(view\)\) resetCamera\(view\);/);
  });
});
