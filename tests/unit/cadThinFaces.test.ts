import { describe, expect, it } from "vitest";
import { THIN_FACE_WIDTH, thinFacesWith } from "@/lib/cadThinFaces";

type Face = Parameters<typeof thinFacesWith>[1][number];

const slant = { x: Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 };
const face = (id: number, neighbours: number[], fields: Partial<Face> = {}): Face => ({ id, center: { x: 0, y: 0, z: 0 }, normal: slant, width: 2, neighbours, ...fields });
const thin = (id: number, neighbours: number[], fields: Partial<Face> = {}) => face(id, neighbours, { width: 0.002, ...fields });

/*
 * The slanted end of an imported clip: one plane in three strips (0, 2, 4), their planes 0.0015 mm apart, kept apart
 * by two slivers (1, 3) that bad triangles left, all along an upright side face (5).
 */
const side = face(5, [0, 1, 2, 3, 4], { normal: { x: 1, y: 0, z: 0 } });
const clip = [
  face(0, [1, 5]),
  thin(1, [0, 2, 5], { normal: { x: 0.76, y: 0, z: 0.65 } }),
  face(2, [1, 3, 5], { center: { x: 0.0015 * Math.SQRT1_2, y: 0, z: -0.0015 * Math.SQRT1_2 } }),
  thin(3, [2, 4, 5], { normal: undefined }),
  face(4, [3, 5]),
  side,
];

describe("thin faces taken along when faces are deleted", () => {
  it("takes the slivers between picked faces and the faces in their plane", () => {
    expect(thinFacesWith([2, 4], clip)).toEqual([1, 3]);
    expect(thinFacesWith([4], clip)).toEqual([3]);
    expect(thinFacesWith([0], clip)).toEqual([1]);
  });

  it("takes a sliver 0.0135 mm wide, as the clip's other end has one", () => {
    expect(thinFacesWith([0], [face(0, [1]), thin(1, [0, 2], { width: 0.0135 }), face(2, [1])])).toEqual([1]);
  });

  it("takes a chain of thin faces as one, and nothing picked by hand twice", () => {
    const chain = [face(0, [1]), thin(1, [0, 2]), thin(2, [1, 3]), face(3, [2])];
    expect(thinFacesWith([0], chain)).toEqual([1, 2]);
    expect(thinFacesWith([0, 2], chain)).toEqual([1]);
  });

  it("takes no thin face that only leads to faces in another plane", () => {
    // A face beyond it at another angle (a thread's flank, a chamfer's other side), and a parallel face a step of about 0.03 mm away.
    const steep = { x: 0.5, y: 0, z: -Math.sqrt(3) / 2 };
    expect(thinFacesWith([0], [face(0, [1]), thin(1, [0, 2]), face(2, [1], { normal: steep })])).toEqual([]);
    expect(thinFacesWith([0], [face(0, [1]), thin(1, [0, 2]), face(2, [1], { center: { x: 0.02, y: 0, z: -0.02 } })])).toEqual([]);
  });

  it("takes a sliver between strips, but not the narrow faces it leads on to across the body", () => {
    // At the clip's other end a sliver also touches narrow faces of the upright side, which lead round to the far end.
    const across = [face(0, [1]), thin(1, [0, 2, 3]), face(2, [1]), thin(3, [1, 4], { normal: { x: 0, y: -1, z: 0 } }), thin(4, [3, 5], { normal: { x: 0, y: -1, z: 0 } }), face(5, [4], { normal: { x: 0, y: -1, z: 0 } })];
    expect(thinFacesWith([0], across)).toEqual([1]);
  });

  it("takes nothing from a fan of fine facets on a curve next to a picked face", () => {
    const facet = (id: number, neighbours: number[]) => thin(id, neighbours, { normal: { x: Math.cos(id / 10), y: 0, z: -Math.sin(id / 10) } });
    const fan = [face(0, [1, 2, 3]), facet(1, [0, 2]), facet(2, [0, 1, 3]), facet(3, [0, 2])];
    expect(thinFacesWith([0], fan)).toEqual([]);
  });

  it("counts a face as wide as the limit or a little wider as wide, and takes nothing for a thin pick", () => {
    const edge = [face(0, [1]), thin(1, [0, 2], { width: THIN_FACE_WIDTH }), face(2, [1])];
    expect(thinFacesWith([0], edge)).toEqual([]);
    expect(thinFacesWith([0], [face(0, [1]), thin(1, [0, 2], { width: 0.06 }), face(2, [1])])).toEqual([]);
    expect(thinFacesWith([1], [face(0, [1]), thin(1, [0, 2]), thin(2, [1, 3]), face(3, [2])])).toEqual([]);
  });
});
