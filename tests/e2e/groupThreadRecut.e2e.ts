import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// The exact kernel (Manifold) loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { groupNeedsThreadRecut, placeRecutGroup, threadRecutParts } from "@/lib/groupThreadRecut";
import type { WorkplaneShape } from "@/types/layerling";

// Discussion #1066: a group of a plate and a tapped hole is cut into one body; stretched, that body took the hole
// with it into an oval. Cut again from its parts, the hole stays an M6 and only the plate grows.
const plate = { id: "plate", name: "Plate", kind: "box", color: "#d41721", x: 0, z: 0, elevation: 0, rotation: 0, width: 40, depth: 20, height: 10, size: 40 } as unknown as WorkplaneShape;
const tapped = {
  id: "tap", name: "Tapped hole", kind: "thread", color: "#999999", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 6, depth: 6, height: 10, size: 6, threadDiameter: 6, threadPitch: 1, threadRole: "bore", hole: true,
} as unknown as WorkplaneShape;

function volume(shape: WorkplaneShape) {
  const positions = shape.importedMesh!.positions;
  let total = 0;
  for (let index = 0; index + 8 < positions.length; index += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(index, index + 9);
    total += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return Math.abs(total / 6);
}

describe("a resized group with a tapped hole (#1066)", () => {
  it("is cut again with the hole at its own size, where only the plate grows", async () => {
    const made = (await buildGroupedShapeFromSelection([plate, tapped], 250_000)).group!;
    expect(made).toBeTruthy();
    expect(groupNeedsThreadRecut(made)).toBe(false);
    const holeVolume = 40 * 20 * 10 - volume(made);
    expect(holeVolume).toBeGreaterThan(150);

    const stretched: WorkplaneShape = { ...made, width: 80, size: 80, rotation: 30 };
    expect(groupNeedsThreadRecut(stretched)).toBe(true);
    const tap = threadRecutParts(stretched).find((part) => part.kind === "thread")!;
    expect(tap.width).toBeCloseTo(6, 4);
    expect(tap.depth).toBeCloseTo(6, 4);

    const recut = placeRecutGroup((await buildGroupedShapeFromSelection(threadRecutParts(stretched), 250_000)).group!, stretched);
    expect(recut.id).toBe(made.id);
    expect(recut.width).toBeCloseTo(80, 3);
    expect(recut.depth).toBeCloseTo(20, 3);
    expect(recut.rotation).toBe(30);
    expect(recut.x).toBeCloseTo(stretched.x, 6);
    expect(groupNeedsThreadRecut(recut)).toBe(false);
    // The plate doubled, the hole did not: a stretched body would have lost twice the hole.
    expect(volume(recut)).toBeCloseTo(80 * 20 * 10 - holeVolume, 0);
  });

  it("leaves a group without a thread and a locked one as they are", () => {
    const box = { ...plate, id: "other" };
    const plain = { id: "g", name: "Group", kind: "group", color: "#d41721", x: 0, z: 0, elevation: 0, rotation: 0, width: 80, depth: 20, height: 10, size: 80, groupedBaseWidth: 40, groupedBaseDepth: 20, groupedBaseHeight: 10, groupedShapes: [box] } as unknown as WorkplaneShape;
    expect(groupNeedsThreadRecut(plain)).toBe(false);
    expect(groupNeedsThreadRecut({ ...plain, groupedShapes: [tapped], locked: true })).toBe(false);
    expect(groupNeedsThreadRecut({ ...plain, groupedShapes: [tapped] })).toBe(true);
  });
});
