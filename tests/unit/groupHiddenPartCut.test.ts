import manifoldModule from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { alignBounds } from "@/lib/alignSize";
import { buildGroupedShapeFromSelection, groupedShape, restoreGroupedChildren } from "@/lib/editorBooleans";
import { meshAabb } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

beforeAll(async () => {
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

function part(id: string, x: number, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id, name: id, kind: "box", color: "#ff0000", x, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0,
    ...extra,
  } as unknown as WorkplaneShape;
}

function maxX(mesh: NonNullable<WorkplaneShape["importedMesh"]>) {
  let max = Number.NEGATIVE_INFINITY;
  for (let offset = 0; offset < mesh.positions.length; offset += 3) max = Math.max(max, mesh.positions[offset]);
  return max;
}

describe("a part hidden in a group with a hole stays out of the cut (#1323)", () => {
  it("leaves the hidden part out of the group's body but keeps it as a part", async () => {
    // A body with a hole through it, and far to the right a part hidden while the group was open.
    const body = part("body", 0, { color: "#2266ff" });
    const hole = part("hole", 0, { kind: "cylinder", width: 4, depth: 4, size: 4, hole: true });
    const hidden = part("ring", 40, { color: "#ce7013", hidden: true });
    const result = await buildGroupedShapeFromSelection([body, hole, hidden], 200_000);
    expect(result.group?.importedMesh).toBeTruthy();
    // The hidden part reached from x 35 to 45; the body ends at x 5.
    expect(maxX(result.group!.importedMesh!)).toBeLessThan(10);
    expect(result.group?.groupedShapes?.map((child) => `${child.name}:${child.hidden === true}`)).toContain("ring:true");
    // Taken apart again, every part comes back at its own size and place, the hidden one too.
    const parts = restoreGroupedChildren(result.group!);
    const byName = new Map(parts.map((child) => [child.name, child]));
    expect(byName.get("body")?.width).toBeCloseTo(10, 3);
    expect(byName.get("body")?.x).toBeCloseTo(0, 3);
    expect(byName.get("ring")?.width).toBeCloseTo(10, 3);
    expect(byName.get("ring")?.x).toBeCloseTo(40, 3);
  });

  it("keeps the room of a hidden part off to one side, the body staying where it is (#1323)", async () => {
    // As on the axle: the body and its hole off to one side, a wide ring hidden above them.
    const body = part("body", 0, { color: "#2266ff" });
    const hole = part("hole", 0, { kind: "cylinder", width: 4, depth: 4, size: 4, hole: true });
    const ring = part("ring", 20, { kind: "cylinder", width: 90, depth: 90, size: 90, height: 1, elevation: 12, hidden: true });
    const group = (await buildGroupedShapeFromSelection([body, hole, ring], 200_000)).group!;
    expect(group.importedMesh).toBeTruthy();
    // The box takes in the ring: x from -25 to 65, z from -45 to 45, up to its top at 13.
    expect(shapeWidth(group)).toBeCloseTo(90, 3);
    expect(shapeDepth(group)).toBeCloseTo(90, 3);
    expect(group.height).toBeCloseTo(13, 3);
    expect(group.x).toBeCloseTo(20, 3);
    expect(group.z).toBeCloseTo(0, 3);
    expect(group.elevation ?? 0).toBeCloseTo(0, 3);
    // The body is drawn and exported where it stood, at its own size.
    const drawn = meshAabb(group);
    expect(drawn.minX).toBeCloseTo(-5, 3);
    expect(drawn.maxX).toBeCloseTo(5, 3);
    expect(drawn.minY).toBeCloseTo(0, 3);
    expect(drawn.maxY).toBeCloseTo(10, 3);
    // The alignment counts the ring.
    const aligned = alignBounds(group);
    expect(aligned.minX).toBeCloseTo(-25, 1);
    expect(aligned.maxX).toBeCloseTo(65, 1);
    expect(aligned.maxY).toBeCloseTo(13, 3);
    // Taken apart, every part comes back where it was.
    const byName = new Map(restoreGroupedChildren(group).map((child) => [child.name, child]));
    expect(byName.get("body")?.x).toBeCloseTo(0, 3);
    expect(byName.get("body")?.width).toBeCloseTo(10, 3);
    expect(byName.get("ring")?.x).toBeCloseTo(20, 3);
    expect(byName.get("ring")?.elevation ?? 0).toBeCloseTo(12, 3);
    expect(byName.get("ring")?.width).toBeCloseTo(90, 3);
    expect(byName.get("hole")?.x).toBeCloseTo(0, 3);
  });

  it("does not reach below the body's foot, though the alignment does (#1323)", async () => {
    const body = part("body", 0, { elevation: 5 });
    const hole = part("hole", 0, { kind: "cylinder", width: 4, depth: 4, size: 4, elevation: 5, hole: true });
    const disc = part("disc", 0, { kind: "cylinder", width: 30, depth: 30, size: 30, height: 2, elevation: 0, hidden: true });
    const group = (await buildGroupedShapeFromSelection([body, hole, disc], 200_000)).group!;
    expect(group.elevation ?? 0).toBeCloseTo(5, 3);
    expect(group.height).toBeCloseTo(10, 3);
    expect(shapeWidth(group)).toBeCloseTo(30, 3);
    expect(meshAabb(group).minY).toBeCloseTo(5, 3);
    expect(alignBounds(group).minY).toBeCloseTo(0, 3);
  });

  it("counts the hidden part for a turned group as it stands (#1323)", async () => {
    // A long bar hidden beside the body, along x; the group turned a quarter turn lays it along z.
    const body = part("body", 0);
    const hole = part("hole", 0, { kind: "cylinder", width: 4, depth: 4, size: 4, hole: true });
    const bar = part("bar", 20, { width: 90, depth: 4, size: 90, height: 1, elevation: 2, hidden: true });
    const group = (await buildGroupedShapeFromSelection([body, hole, bar], 200_000)).group!;
    const turned = { ...group, rotation: 90 };
    const aligned = alignBounds(turned);
    expect(aligned.maxZ - aligned.minZ).toBeCloseTo(90, 1);
    expect(aligned.maxX - aligned.minX).toBeCloseTo(10, 1);
  });

  it("leaves a group hidden as a whole out of the cut (#1323)", async () => {
    const body = part("body", 0);
    const shown = part("shown-hole", 3, { kind: "cylinder", width: 2, depth: 2, size: 2, hole: true });
    const inner = groupedShape([part("a", 0, { width: 30, depth: 30, size: 30 }), part("b", 0, { elevation: 20 })])!;
    const withHidden = await buildGroupedShapeFromSelection([body, shown, { ...inner, hidden: true }], 200_000);
    const without = await buildGroupedShapeFromSelection([body, shown], 200_000);
    expect(withHidden.group?.importedMesh?.triangleCount).toBe(without.group?.importedMesh?.triangleCount);
    expect(shapeWidth(withHidden.group!)).toBeCloseTo(30, 3);
  });

  it("does not let a hidden hole cut the body", async () => {
    const body = part("body", 0);
    const shown = part("shown-hole", 3, { kind: "cylinder", width: 2, depth: 2, size: 2, hole: true });
    const hiddenHole = part("hidden-hole", 0, { kind: "cylinder", width: 6, depth: 6, size: 6, hole: true, hidden: true });
    const withHidden = await buildGroupedShapeFromSelection([body, shown, hiddenHole], 200_000);
    const without = await buildGroupedShapeFromSelection([body, shown], 200_000);
    expect(withHidden.group?.importedMesh?.triangleCount).toBe(without.group?.importedMesh?.triangleCount);
  });
});
