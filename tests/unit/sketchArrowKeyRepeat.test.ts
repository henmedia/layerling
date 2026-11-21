import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createKeyRepeatBatch, type KeyNudge } from "@/lib/keyRepeatBatch";
import { sketchSelectionMovePointIds } from "@/lib/sketchSelection";

const workspace = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/SketchWorkspace.tsx", import.meta.url)), "utf8");

/** The arrow-key branch of the sketch's keydown handler. */
function arrowBranch() {
  const start = workspace.indexOf('tool === "select" && !pointerAction && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]');
  expect(start).toBeGreaterThan(-1);
  return workspace.slice(start, workspace.indexOf("const handleKeyUp", start));
}

describe("a held arrow key in the sketch keeps up (#1930)", () => {
  it("adds the repeats of a held key up and moves once a frame, as the 3D view does (#1042)", () => {
    const branch = arrowBranch();
    expect(branch).toContain("keyRepeatBatchRef.current?.add({ x: dx, z: dz, rise: 0 }, event.repeat)");
    // No move of its own per key event any more.
    expect(branch).not.toContain("onTransformPoints(");
    expect(branch).not.toContain("onMoveHandle(");
    expect(branch).not.toContain("onUpdateImage(");
  });

  it("moves from the sketch as it is when the frame comes, drawn at once", () => {
    expect(workspace).toMatch(/createKeyRepeatBatch\(\(\{ x, z \}\) => \{\s*flushSync\(\(\) => \{\s*nudgeSketchSelectionRef\.current\(x, z\);/);
    expect(workspace).toContain("nudgeSketchSelectionRef.current = nudgeSketchSelection;");
  });

  it("hands over what is left when the key comes up or the window loses focus", () => {
    const start = workspace.indexOf("const flush = () => keyRepeatBatchRef.current?.flush();");
    expect(start).toBeGreaterThan(-1);
    const effect = workspace.slice(start, workspace.indexOf("}, []);", start));
    expect(effect).toContain('window.addEventListener("keyup", flush)');
    expect(effect).toContain('window.addEventListener("blur", flush)');
    expect(effect).toContain("keyRepeatBatchRef.current?.cancel()");
  });

  it("turns twenty repeats in one frame into one move by their sum, and a fresh press into one at once", () => {
    const moves: KeyNudge[] = [];
    const frames: (() => void)[] = [];
    const batch = createKeyRepeatBatch((nudge) => moves.push(nudge), {
      schedule: (run) => frames.push(run),
      cancel: () => undefined,
    });
    batch.add({ x: 1, z: 0, rise: 0 }, false);
    expect(moves).toEqual([{ x: 1, z: 0, rise: 0 }]);
    for (let i = 0; i < 20; i += 1) batch.add({ x: 1, z: 0, rise: 0 }, true);
    expect(moves).toHaveLength(1);
    frames.shift()?.();
    expect(moves).toEqual([{ x: 1, z: 0, rise: 0 }, { x: 20, z: 0, rise: 0 }]);
    batch.add({ x: 1, z: 0, rise: 0 }, true);
    batch.flush();
    expect(moves.at(-1)).toEqual({ x: 1, z: 0, rise: 0 });
  });
});

describe("the points a frame selection moves are found quickly (#1930)", () => {
  it("still leaves out the far ends of the lines leading out of the frame (#1800) on a large outline", () => {
    const count = 2000;
    const points = Array.from({ length: count }, (_, i) => ({ id: `p${i}` }));
    const segments = points.map((point, i) => ({ id: `s${i}`, startId: point.id, endId: points[(i + 1) % count].id }));
    // The frame takes points 10 to 1009 and every line touching them: s9 and s1009 lead out.
    const pointIds = points.slice(10, 1010).map((point) => point.id);
    const segmentIds = segments.slice(9, 1010).map((segment) => segment.id);
    const moved = new Set(sketchSelectionMovePointIds({ segments }, { kind: "multiple", pointIds, segmentIds }));
    expect(moved.size).toBe(1000);
    expect(moved.has("p9")).toBe(false);
    expect(moved.has("p1010")).toBe(false);
  });
});
