import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const viewport = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/WorkplaneViewport.tsx", import.meta.url)), "utf8");

describe("moving snaps to the wall it runs into, in the viewport", () => {
  it("gives a drag the walls beside the part where the pointer is, along the axes it may move on, and their guides", () => {
    expect(viewport).toMatch(/dragRef\.current\.wallSnap = wallSnapForSelection\(/);
    expect(viewport).toMatch(/moveSnapWalls\(state, drag\.wallSnap, rawBox, /);
    expect(viewport).toMatch(/axis !== hiddenAxis && \(!axisLock \|\| axisLock\.along === axis\)/);
    expect(viewport).toMatch(/objectSnapOffset\(rawBox, drag\.snapTargets, [^;]*, walls\)/);
    expect(viewport).toMatch(/drag\.snapTargets, 1e-4, walls\)\.guides/);
  });

  it("gives an arrow the walls along its own axis, and none with Alt", () => {
    expect(viewport).toMatch(/walls: wallSnapForSelection\(/);
    expect(viewport).toMatch(/if \(!altKey\) \{\s*const moved = shiftSnapBox\(/);
    expect(viewport).toMatch(/objectSnapOffset\(moved, snap\.targets, [^;]*, walls\)/);
    expect(viewport).toMatch(/moveSnapWalls\(state, snap\.walls, moved, \[alongX \? "x" : "z"\]\)/);
    expect(viewport).toMatch(/snap\.targets, 1e-4, walls\)/);
  });

  it("finds a side handle's walls by the same rule as a move's", () => {
    expect(viewport).toMatch(/wallRaySkip\(shapes, moved\)/);
    expect(viewport).toMatch(/firstShapeHit\(state, \{ needsFace: true, skip \}\)/);
    expect(viewport).toMatch(/targets\.push\(\.\.\.wallLines\(hits, worldAxis\)\);/);
  });
});

describe("a corner handle snaps both sides, in the viewport", () => {
  it("sets up a snap for each side of a corner too, but not on a single body that cannot keep both sizes", () => {
    expect(viewport).toMatch(/\(!signs\.x && !signs\.z\)\) return undefined;/);
    expect(viewport).toMatch(/signs\.x && signs\.z && moved\.size === 1 \? /);
    expect(viewport).toMatch(/if \(single && !cornerKeepsBothSides\(single\)\) return undefined;/);
    expect(viewport).toMatch(/const boxes = moveSnapTargets\(shapes, moved, points, workplane\);/);
    expect(viewport).toMatch(/\.filter\(\(frameAxis\) => signs\[frameAxis\]\)\.map\(\(frameAxis\) => resizeSnapForSide/);
  });

  it("moves the pointer by the snapped sides, keeps their sizes off the grid and draws their guides", () => {
    expect(viewport).toMatch(/snapResizeSides\(snap\.sides, /);
    expect(viewport).toMatch(/transform\.items\.length === 1 \? transform\.startShape : undefined\)/);
    expect(viewport).toMatch(/worldPoint = worldPoint\.clone\(\)\.add\(snapped\.shift\);/);
    expect(viewport).toMatch(/freeAxes = snapped\.freeAxes;/);
    expect(viewport).toMatch(/guides = snapped\.guides;/);
    expect(viewport.match(/maxSize, freeAxes\)/g)).toHaveLength(2);
  });
});
