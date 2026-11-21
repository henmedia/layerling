import manifoldModule from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { buildGroupDisplayMesh, groupedShape } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Discussion #1733: two cones with a gentle taper, mirrored top to bottom, came out upside down once they were
 * grouped. The kernel's cone was built without the shape's mirror; a cone with two radii is not the same upside down.
 */

beforeAll(async () => {
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

function cone(id: string, z: number, mirrorY: boolean): WorkplaneShape {
  return {
    id, name: id, kind: "cone", color: "#6e2786", x: 0, z, elevation: 0, size: 1.85, width: 1.85, depth: 1.85, height: 2, rotation: 0,
    topRadius: 0.8, baseRadius: 0.925, mirrorY: mirrorY || undefined,
  } as unknown as WorkplaneShape;
}

/** The width of the cone at the foot and at the top, from the corners of its mesh in the third of it nearest each end. */
function footAndTop(positions: number[], z: number) {
  const ys: number[] = [];
  for (let i = 1; i < positions.length; i += 3) ys.push(positions[i]);
  const low = Math.min(...ys);
  const high = Math.max(...ys);
  const third = (high - low) / 3;
  const width = (from: number, to: number) => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      if (positions[i + 1] >= from && positions[i + 1] <= to && Math.abs(positions[i + 2] - z) < 3) {
        min = Math.min(min, positions[i]);
        max = Math.max(max, positions[i]);
      }
    }
    return max - min;
  };
  return { foot: width(low, low + third), top: width(high - third, high) };
}

describe("a mirrored cone in a group (#1733)", () => {
  it("the merged body shows the cones the way they stand, mirrored or not", () => {
    for (const mirrored of [false, true]) {
      const group = groupedShape([cone("a", -9.29, mirrored), cone("b", 9.29, mirrored)])!;
      const real = meshForShape(group).vertices.flat();
      const merged = buildGroupDisplayMesh(group)!.positions;
      const wanted = footAndTop(real, 9.29);
      const got = footAndTop(merged, 9.29);
      // Wide at the foot when it stands as made, wide at the top when it is mirrored.
      expect(wanted.foot > wanted.top).toBe(!mirrored);
      expect(got.foot).toBeCloseTo(wanted.foot, 2);
      expect(got.top).toBeCloseTo(wanted.top, 2);
    }
  });
});
