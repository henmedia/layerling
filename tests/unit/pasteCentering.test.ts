import { describe, expect, it } from "vitest";
import { meshAabb } from "@/lib/editorMeshCore";
import { PASTE_NUDGE, pasteCenteringShift, pasteNudged } from "@/lib/pasteCentering";
import { horizontalPlacementWorkplane } from "@/lib/placementWorkplane";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

const box = (id: string, x: number, z: number, elevation: number, width = 20, depth = 10, height = 6): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#ff0000", x, z, elevation, size: Math.max(width, depth), width, depth, height, rotation: 0,
});

// #876: a paste can set the parts in the middle of the workplane and drop them onto it.
describe("pasting in the middle and dropping (#876)", () => {
  const plate = horizontalPlacementWorkplane(0);

  it("is off by default", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.pasteCentered).toBe(false);
  });

  it("moves parts far from the plate to its middle, together, onto the plane", () => {
    const parts = [box("a", 400, -300, 80), box("b", 440, -300, 90, 20, 10, 20)];
    const shift = pasteCenteringShift(parts, plate)!;
    const moved = parts.map((part) => ({ ...part, x: part.x + shift.x, z: part.z + shift.z, elevation: (part.elevation ?? 0) + shift.y }));
    const boxes = moved.map(meshAabb);
    expect((Math.min(...boxes.map((b) => b.minX)) + Math.max(...boxes.map((b) => b.maxX))) / 2).toBeCloseTo(0, 6);
    expect((Math.min(...boxes.map((b) => b.minZ)) + Math.max(...boxes.map((b) => b.maxZ))) / 2).toBeCloseTo(0, 6);
    expect(Math.min(...boxes.map((b) => b.minY))).toBeCloseTo(0, 6);
    // They keep their places to each other: b is 40 mm to the right of a and 10 mm higher.
    expect(moved[1].x - moved[0].x).toBeCloseTo(40, 6);
    expect((moved[1].elevation ?? 0) - (moved[0].elevation ?? 0)).toBeCloseTo(10, 6);
  });

  it("has nothing to move for parts with nothing to measure", () => {
    expect(pasteCenteringShift([], plate)).toBeNull();
  });
});

// #1304: a plain paste beyond the edge of the plate kept a cylinder in the corner of a box only on the plate.
describe("plain paste keeps the parts together (#1304)", () => {
  it("sets every copy the same step from its original, also far beyond the plate", () => {
    const parts = [box("box", 220, 180, 0, 20, 20, 20), box("pin", 225, 185, 20, 10, 10, 10)];
    const pasted = pasteNudged(parts, parts);
    expect(pasted.map((part) => [part.x, part.z])).toEqual([[220 + PASTE_NUDGE, 180 + PASTE_NUDGE], [225 + PASTE_NUDGE, 185 + PASTE_NUDGE]]);
    expect(pasted[1].x - pasted[0].x).toBe(5);
    expect(pasted[1].z - pasted[0].z).toBe(5);
    expect(pasted[1].elevation).toBe(20);
  });
});
