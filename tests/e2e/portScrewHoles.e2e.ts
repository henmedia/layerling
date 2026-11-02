import { describe, expect, it } from "vitest";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { portWithScrewHolesGroup } from "@/lib/editorPortScrewHoles";
import { portContourPoints, portPresetSize } from "@/lib/portGeometry";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A D-Sub 9 opening comes grouped with its two screw holes. Grouped with a wall, the group cuts the
 * opening and both holes through it, with the real Manifold kernel.
 */

const LIMIT = 250_000;

/** The volume of a closed triangle soup, from the signed tetrahedra to the origin. */
function meshVolume(positions: ArrayLike<number>) {
  let volume = 0;
  for (let index = 0; index < positions.length; index += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from({ length: 9 }, (_, offset) => positions[index + offset]);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return Math.abs(volume);
}

function polygonArea(points: { x: number; y: number }[]) {
  let area = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    area += point.x * next.y - next.x * point.y;
  });
  return Math.abs(area) / 2;
}

describe("a D-Sub 9 with its screw holes", () => {
  it("cuts the opening and both screw holes through a wall it is grouped with", async () => {
    const size = portPresetSize("dsub9", 0);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "port")!;
    const opening = makeShapeFromAsset(asset, { x: 0, z: 0, elevation: 4 }, { width: size.width, depth: 8, height: size.height, cornerFillet: size.corner, portProfile: size.profile }) as WorkplaneShape;
    const group = portWithScrewHolesGroup(opening)!;
    expect(group).not.toBeNull();
    // A 2 mm wall, 60 x 20 mm, across the opening: the opening reaches 4 mm to either side of it.
    const wall = {
      id: "wall", name: "wall", kind: "box", color: "#cccccc", x: 0, z: 0, elevation: 0,
      size: 60, width: 60, depth: 2, height: 20, rotation: 0,
    } as unknown as WorkplaneShape;
    const result = await buildGroupedShapeFromSelection([wall, group], LIMIT);
    expect(result.group, result.failureNotice).not.toBeNull();
    const cut = polygonArea(portContourPoints(size.width, size.height, size.corner, 64, "dsub9")) + 2 * Math.PI * 1.59 ** 2;
    const volume = meshVolume(result.group!.importedMesh!.positions);
    // The wall less the opening and two round holes, 2 mm deep; 1 % for the round holes' facets.
    expect(volume).toBeCloseTo(60 * 2 * 20 - cut * 2, -1);
    expect(Math.abs(volume - (60 * 2 * 20 - cut * 2)) / (cut * 2)).toBeLessThan(0.01);
    // Without the holes the wall would keep more: both holes are cut.
    expect(volume).toBeLessThan(60 * 2 * 20 - polygonArea(portContourPoints(size.width, size.height, size.corner, 64, "dsub9")) * 2 - 2 * Math.PI * 1.5 ** 2 * 2);
  });
});
