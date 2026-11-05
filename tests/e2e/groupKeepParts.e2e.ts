import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// The exact kernel (Manifold) loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };
import { buildGroupedShapeFromSelection, restoreGroupedChildren } from "@/lib/editorBooleans";
import { groupsToKeepParts, keptPartsForResize, placeKeptPartsGroup } from "@/lib/groupKeepParts";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

// Discussion #526: a plate of 100 x 60 x 4 with a 6 mm hole 5 mm in from each corner and a slot in the middle,
// grouped into one body and made 40 mm longer. Set to keep its holes and small parts, it is cut again from its
// parts: the holes stay round, 5 mm from the corners of the longer plate, and the slot stays in the middle.
const plate = { id: "plate", name: "Plate", kind: "box", color: "#3f8fd2", x: 0, z: 0, elevation: 0, rotation: 0, width: 100, depth: 60, height: 4, size: 100 } as WorkplaneShape;
const corners = [[-42, -22], [42, -22], [-42, 22], [42, 22]];
const holes = corners.map(([x, z], index) => ({
  id: `hole-${index}`, name: "Hole", kind: "cylinder", color: "#999999", hole: true, x, z, elevation: 0, rotation: 0, width: 6, depth: 6, height: 4, size: 6,
}) as WorkplaneShape);
const slot = { id: "slot", name: "Slot", kind: "box", color: "#999999", hole: true, x: 0, z: 0, elevation: 0, rotation: 0, width: 24, depth: 6, height: 4, size: 24 } as WorkplaneShape;

function volume(shape: WorkplaneShape) {
  const positions = shape.importedMesh!.positions;
  let total = 0;
  for (let index = 0; index + 8 < positions.length; index += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(index, index + 9);
    total += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return Math.abs(total / 6);
}

/** The mesh's corners on the wall of the hole round (x, z), in the group's frame: how far each lies from its axis. */
function wallDistances(shape: WorkplaneShape, x: number, z: number) {
  const positions = shape.importedMesh!.positions;
  const distances: number[] = [];
  for (let index = 0; index + 2 < positions.length; index += 3) {
    const distance = Math.hypot(positions[index] - x, positions[index + 2] - z);
    if (distance < 6) distances.push(distance);
  }
  return distances;
}

describe("a plate with corner holes made longer, keeping its holes and small parts (#526)", () => {
  it("is cut again from its parts with the holes round, 5 mm from the corners, and the slot in the middle", async () => {
    const made = { ...(await buildGroupedShapeFromSelection([plate, ...holes, slot], 250_000)).group!, groupResize: "keepParts" as const };
    expect(made.importedMesh).toBeTruthy();
    const holesVolume = 100 * 60 * 4 - volume(made);
    expect(holesVolume).toBeGreaterThan(4 * 4 * Math.PI * 8);

    const resized: WorkplaneShape = { ...made, width: 140, size: 140, x: 20 };
    expect(groupsToKeepParts(new Map([[made.id, made]]), [resized])).toHaveLength(1);
    const kept = keptPartsForResize(resized);
    expect(kept.shrunk).toBe(0);
    const rebuilt = placeKeptPartsGroup((await buildGroupedShapeFromSelection(kept.parts, 250_000)).group!, resized);
    expect(rebuilt.id).toBe(made.id);
    expect(rebuilt.groupResize).toBe("keepParts");
    expect(rebuilt.width).toBeCloseTo(140, 3);
    expect(rebuilt.depth).toBeCloseTo(60, 3);
    expect(rebuilt.x).toBeCloseTo(20, 3);
    // Built at its own size: it stretches its parts no more, and it is not found again.
    expect(rebuilt.groupedBaseWidth).toBeCloseTo(140, 3);
    expect(groupsToKeepParts(new Map([[made.id, resized]]), [rebuilt])).toEqual([]);

    // The parts it keeps: the holes 6 mm round, 5 mm in from the corners of the 140 mm plate, the slot in the middle.
    const parts = restoreGroupedChildren(rebuilt);
    const restoredHoles = parts.filter((part) => part.kind === "cylinder");
    expect(restoredHoles.map((hole) => [Number((hole.x - 20).toFixed(3)), Number(hole.z.toFixed(3))])).toEqual([[-62, -22], [62, -22], [-62, 22], [62, 22]]);
    for (const hole of restoredHoles) {
      expect(hole.hole).toBe(true);
      expect(shapeWidth(hole)).toBeCloseTo(6, 6);
      expect(shapeDepth(hole)).toBeCloseTo(6, 6);
      expect(70 - Math.abs(hole.x - 20) - 3).toBeCloseTo(5, 6);
    }
    const restoredSlot = parts.find((part) => part.id.startsWith("slot") || part.name === "Slot")!;
    expect(restoredSlot.x).toBeCloseTo(20, 6);
    expect(shapeWidth(restoredSlot)).toBeCloseTo(24, 6);

    // And in the body itself: the same holes cut out of a longer plate, each wall 3 mm from its axis all round.
    expect(volume(rebuilt)).toBeCloseTo(140 * 60 * 4 - holesVolume, 0);
    for (const [x, z] of [[-62, -22], [62, -22], [-62, 22], [62, 22]]) {
      const wall = wallDistances(rebuilt, x, z);
      expect(wall.length).toBeGreaterThan(16);
      expect(Math.min(...wall)).toBeGreaterThan(2.9);
      expect(Math.max(...wall)).toBeLessThan(3.01);
    }

    // Set to stretch everything, the same group gives its holes as ovals 8.4 mm long, 1.4 mm further in.
    const ovals = restoreGroupedChildren({ ...resized, groupResize: undefined }).filter((part) => part.kind !== "box");
    expect(ovals.map((hole) => Number(shapeWidth(hole).toFixed(3)))).toEqual([8.4, 8.4, 8.4, 8.4]);
    expect(ovals.map((hole) => Number((hole.x - 20).toFixed(3)))).toEqual([-58.8, 58.8, -58.8, 58.8]);
  });
});
