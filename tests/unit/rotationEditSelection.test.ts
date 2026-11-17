import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The viewport's code without its line comments, on one line.
const viewport = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/WorkplaneViewport.tsx", import.meta.url)), "utf8")
  .replace(/\/\/.*$/gm, "")
  .replace(/\s+/g, " ");

describe("an angle typed with several bodies selected turns them all", () => {
  // Outside an interaction each update starts from the shapes as they were, so the last body's turn undid the others'.
  it("turns every body inside one interaction", () => {
    const start = viewport.indexOf("const commitRotationEdit = useCallback(");
    expect(start).toBeGreaterThan(-1);
    const commit = viewport.slice(start, viewport.indexOf("useEffect(", start));
    expect(commit).toMatch(/onInteractionActiveChange\?\.\(true\); selectedIdsRef\.current\.forEach\(/);
    expect(commit).toMatch(/\}\); onInteractionActiveChange\?\.\(false\); \} setEditingRotation\(null\);/);
    expect(commit).toMatch(/\[[^\]]*\bonInteractionActiveChange\b[^\]]*\],? ?\);/);
  });
});
