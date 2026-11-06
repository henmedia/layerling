import manifoldModule from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { buildGroupedShapeFromSelection, restoreGroupedChildren } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
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

  it("does not let a hidden hole cut the body", async () => {
    const body = part("body", 0);
    const shown = part("shown-hole", 3, { kind: "cylinder", width: 2, depth: 2, size: 2, hole: true });
    const hiddenHole = part("hidden-hole", 0, { kind: "cylinder", width: 6, depth: 6, size: 6, hole: true, hidden: true });
    const withHidden = await buildGroupedShapeFromSelection([body, shown, hiddenHole], 200_000);
    const without = await buildGroupedShapeFromSelection([body, shown], 200_000);
    expect(withHidden.group?.importedMesh?.triangleCount).toBe(without.group?.importedMesh?.triangleCount);
  });
});
