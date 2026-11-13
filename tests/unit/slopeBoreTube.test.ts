import { describe, expect, it } from "vitest";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { splitBoreTube } from "@/lib/editorBooleans";
import { slopeMesh } from "@/lib/slopeAlong";
import type { WorkplaneShape } from "@/types/layerling";

type Vec3 = [number, number, number];

/** A tube as in Discussion #1698: 20 mm across, a 2 mm wall, 50 mm long, its top sloped to 30 mm at the back. */
const tube = {
  id: "tube-1",
  name: "Tube",
  kind: "tube",
  color: "#ce7013",
  x: 0,
  z: 0,
  elevation: 0,
  size: 20,
  width: 20,
  depth: 20,
  height: 50,
  rotation: 0,
  bevel: 2,
  tubeBoreHole: true,
  slopeEnd: 30,
  slopeSide: "back",
} as unknown as WorkplaneShape;

/** A box mesh from -half to +half across, 0 to height up: its corners stand where the body's outline ends. */
function boxMesh(half: number, height: number) {
  const vertices: Vec3[] = [];
  for (const y of [0, height]) for (const z of [-half, half]) for (const x of [-half, half]) vertices.push([x, y, z]);
  const faces: Array<[number, number, number]> = [
    [0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1],
    [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3],
  ];
  return { vertices, faces };
}

/** The top's height at the body's back (small z) and front (large z) edges. */
function topAt(shape: WorkplaneShape, half: number) {
  const { vertices, faces } = boxMesh(half, shape.height);
  const sloped = slopeMesh(vertices, faces, shape).vertices;
  const top = (z: number) => Math.max(...sloped.filter(([, , vz]) => Math.abs(vz - z) < 1e-9).map(([, y]) => y));
  return { back: top(-half), front: top(half) };
}

describe("a sloped tube's bore cut as a hole (Discussion #1698)", () => {
  const [outer, bore] = splitBoreTube(tube);

  it("splits off a bore that knows the tube around it", () => {
    expect(outer.kind).toBe("cylinder");
    expect(bore.hole).toBe(true);
    expect(bore.width).toBeCloseTo(16);
    expect(bore.slopeSpan).toEqual({ width: 20, depth: 20 });
  });

  it("gives the bore the tube's top line, not a steeper one of its own", () => {
    // The tube runs from 50 at the front (kept end) to 30 at the back: 1 mm down for every mm.
    expect(topAt(outer, 10)).toEqual({ front: 50, back: 30 });
    const inside = topAt(bore, 8);
    expect(inside.front).toBeCloseTo(48, 6);
    expect(inside.back).toBeCloseTo(32, 6);
    // Measured over its own 16 mm, the bore went from 50 to 30: 2 mm past the sloped end at one side, 2 mm short at the other.
    const alone = topAt({ ...bore, slopeSpan: undefined }, 8);
    expect(alone).toEqual({ front: 50, back: 30 });
  });

  it("keeps the line when the slope starts from the middle", () => {
    const [, middleBore] = splitBoreTube({ ...tube, slopeFrom: "middle" } as WorkplaneShape);
    const [middleOuter] = splitBoreTube({ ...tube, slopeFrom: "middle" } as WorkplaneShape);
    const outerTop = topAt(middleOuter, 10);
    expect(outerTop.front).toBeCloseTo(30, 6);
    const inside = topAt(middleBore, 8);
    // 8 of the 10 mm from the middle: 50 - 20 * 8 / 10.
    expect(inside.front).toBeCloseTo(34, 6);
    expect(inside.back).toBeCloseTo(34, 6);
  });

  it("lowers the bore's sides by the tube's side drop", () => {
    const dropped = { ...tube, slopeEnd: undefined, sideDrop: 10 } as unknown as WorkplaneShape;
    const [, droppedBore] = splitBoreTube(dropped);
    const { vertices, faces } = boxMesh(8, 50);
    // As wide as deep, the tube lowers its sides across its depth.
    const edge = slopeMesh(vertices, faces, droppedBore).vertices.filter(([, , z]) => Math.abs(Math.abs(z) - 8) < 1e-9);
    // 8 of the 10 mm out from the middle: 50 - 10 * 8 / 10.
    expect(Math.max(...edge.map(([, y]) => y))).toBeCloseTo(42, 6);
  });

  it("trims the exact bore with the tube's top line", () => {
    const profile = cadModifierProfileForShape(bore);
    const trim = profile && "trim" in profile ? profile.trim : undefined;
    expect(trim).toBeTruthy();
    const points = trim!.loops[0].segments.map((segment) => [segment.x, segment.z]);
    // The line runs from the tube's kept end (+10 mm, 50 high) to its far end (-10 mm, 30 high), past the bore's own 8 mm.
    expect(points).toContainEqual([10, 50]);
    expect(points).toContainEqual([-10, 30]);
  });
});
