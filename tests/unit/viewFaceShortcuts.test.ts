import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VIEW_FACE_SHORTCUTS, viewFaceDirection, viewFaceForKey, type ViewCubeFace } from "@/lib/viewCubeDrag";

const FACES: ViewCubeFace[] = ["top", "bottom", "front", "back", "right", "left"];

describe("view face shortcuts", () => {
  it("maps 1 to 6 onto the six straight views, each once", () => {
    expect(Object.keys(VIEW_FACE_SHORTCUTS).sort()).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(new Set(Object.values(VIEW_FACE_SHORTCUTS))).toEqual(new Set(FACES));
    expect(VIEW_FACE_SHORTCUTS["1"]).toBe("front");
    expect(VIEW_FACE_SHORTCUTS["5"]).toBe("top");
  });

  it("looks at each side along its own axis", () => {
    for (const face of FACES) {
      const direction = viewFaceDirection(face);
      expect(direction.length()).toBeCloseTo(1, 9);
      expect([Math.abs(direction.x), Math.abs(direction.y), Math.abs(direction.z)].sort()).toEqual([0, 0, 1]);
    }
    expect(viewFaceDirection("front").toArray()).toEqual([0, 0, 1]);
    expect(viewFaceDirection("top").toArray()).toEqual([0, 1, 0]);
    expect(viewFaceDirection("left").toArray()).toEqual([-1, 0, 0]);
  });

  it("finds the view from the digit, or from the key position with Shift", () => {
    expect(viewFaceForKey("5", "Digit5", false)).toBe("top");
    expect(viewFaceForKey("%", "Digit5", true)).toBe("top");
    expect(viewFaceForKey("!", "Digit1", true)).toBe("front");
    // A French keyboard: the digit needs Shift, its key alone means it too; the minus on 6 stays the zoom.
    expect(viewFaceForKey("&", "Digit1", false)).toBe("front");
    expect(viewFaceForKey("-", "Digit6", false)).toBeUndefined();
    expect(viewFaceForKey("&", "Digit7", true)).toBeUndefined();
    expect(viewFaceForKey("constructor", "KeyC", false)).toBeUndefined();
  });

  it("returns a fresh vector, so callers can scale it", () => {
    viewFaceDirection("right").multiplyScalar(50);
    expect(viewFaceDirection("right").toArray()).toEqual([1, 0, 0]);
  });
});

// focusSelection frames along the camera's current direction and does nothing
// without a selection, so calling it right after the jump (with Shift) zooms to
// the selection from the new side and otherwise leaves the plain view jump.
describe("view face shortcut wiring in the viewport", () => {
  const source = readFileSync(
    fileURLToPath(new URL("../../apps/web/src/components/WorkplaneViewport.tsx", import.meta.url)),
    "utf8",
  );
  const branchStart = source.indexOf("} else if (shortcutView) {");
  const branch = source.slice(branchStart, source.indexOf("} else if", branchStart + 1));

  it("zooms to the selection after jumping to the view only with Shift", () => {
    expect(branchStart).toBeGreaterThan(-1);
    const jump = branch.indexOf("setViewCubeFace(shortcutView);");
    const focus = branch.indexOf("if (event.shiftKey) focusSelection();");
    expect(jump).toBeGreaterThan(-1);
    expect(focus).toBeGreaterThan(jump);
  });

  it("leaves a click on the view cube as a plain view jump", () => {
    const cube = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/workplane/ViewCube.tsx", import.meta.url)), "utf8");
    expect(cube).toContain("setCameraToViewFace(rig, face)");
    expect(cube).not.toContain("focusSelection");
  });

  it("keeps focusSelection a no-op without a selection", () => {
    const focus = source.slice(source.indexOf("const focusSelection = useCallback"), source.indexOf("const resetView = useCallback"));
    // It says so (false), so F can show the whole scene instead (#465).
    expect(focus).toContain("if (!bounds) return false;");
  });
});
