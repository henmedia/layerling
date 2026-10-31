import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { meshForShape } from "@/lib/editorMeshCore";
import { deleteFacesSolid } from "@/lib/cadDeleteFaces";

/*
 * The wedge, the pyramid and the paraboloid (#1007) as exact bodies, against
 * the display meshes they replace: the worker's plausibility check lets each
 * through, also turned, tipped, mirrored and lifted; the flat ones are the
 * display's own faces, and the paraboloid is the true dome the display draws
 * with chords.
 */

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `test-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0, color: "#ff8800", ...extra } as WorkplaneShape;
}

describe("the wedge, pyramid and paraboloid as exact bodies", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  /** The body as the worker builds and places it, and what the display mesh expects of it. */
  function body(source: WorkplaneShape) {
    const profile = cadModifierProfileForShape(source);
    expect(profile).not.toBeNull();
    const mesh = meshForShape(source);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    const part = { ...(profile as CadModifierProfilePart), expected };
    const local = profileExtrusionSolid(cad, part);
    const transform = part.transform;
    const solid = !transform ? local : cadTransformRequiresGeneralTransform(transform) ? cad.generalTransform(local, transform) : cad.transform(local, transform);
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    return { solid, expected };
  }

  /** Bounds measured on a fine mesh of a copy: the kernel's own box is loose on a turned curved face. */
  function trueBounds(solid: ShapeHandle) {
    const copy = cad.copy(solid);
    const { positions } = cad.tessellate(copy, { linearDeflection: 0.005, angularDeflection: 0.3 });
    cad.release(copy);
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let index = 0; index < positions.length; index += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        box[axis] = Math.min(box[axis], positions[index + axis]);
        box[axis + 3] = Math.max(box[axis + 3], positions[index + axis]);
      }
    }
    return box;
  }

  const faceTypes = (solid: ShapeHandle) => cad.getSubShapes(solid, "face").map((face) => cad.surfaceType(face));

  /** Whether every corner of the body is a corner of the display mesh: box and volume alone miss a triangle facing the other way. */
  function cornersOnMesh(solid: ShapeHandle, source: WorkplaneShape) {
    const mesh = meshForShape(source).vertices;
    return cad.getSubShapes(solid, "vertex").every((vertex) => {
      const { x, y, z } = cad.vertexPosition(vertex);
      return mesh.some(([mx, my, mz]) => Math.hypot(mx - x, my - y, mz - z) < 1e-4);
    });
  }

  /** Shapes whose every face is flat, with their number of faces. */
  const flat = (): Array<[WorkplaneShape, number]> => [
    [shape("wedge", { width: 30, depth: 12, height: 8 }), 5],
    [shape("pyramid", { width: 30, depth: 20, height: 25, sides: 4 }), 5],
    [shape("pyramid", { width: 30, depth: 20, height: 25, sides: 3 }), 4],
    [shape("pyramid", { width: 30, depth: 20, height: 25, sides: 5 }), 6],
    [shape("pyramid", { width: 30, depth: 30, height: 25, sides: 8 }), 9],
    // A top that narrows as the base does keeps every side flat.
    [shape("pyramid", { width: 30, depth: 20, height: 25, sides: 4, topWidth: 15, topDepth: 10 }), 6],
    [shape("pyramid", { width: 30, depth: 30, height: 25, sides: 6, topWidth: 12, topDepth: 12 }), 8],
  ];

  it("builds the wedge and the pyramids as the display's own flat faces", () => {
    flat().forEach(([source, faces]) => {
      const { solid, expected } = body(source);
      expect(faceTypes(solid)).toEqual(Array(faces).fill("plane"));
      expect(cornersOnMesh(solid, source)).toBe(true);
      expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
      // The display mesh is stored in 32-bit floats, good to about 1e-7.
      expect(Math.abs(cad.getVolume(solid) / expected.volume - 1)).toBeLessThan(1e-6);
      trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(1e-4));
    });
  });

  it("builds a pyramid whose top narrows differently across and along, its sides between their edges", () => {
    // The display folds each side that is out of plane along a diagonal; the body's side is the ruled surface
    // between its bottom and top edge, a little apart from either fold.
    const { solid, expected } = body(shape("pyramid", { width: 30, depth: 20, height: 25, sides: 4, topWidth: 6, topDepth: 16 }));
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    expect(Math.abs(cad.getVolume(solid) / expected.volume - 1)).toBeLessThan(0.02);
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(1e-3));
  });

  it("builds the paraboloid as the true dome, round or oval", () => {
    // Round: the volume of a paraboloid is half that of its cylinder, pi R^2 h / 2.
    const round = body(shape("paraboloid", { width: 30, depth: 30, height: 20 }));
    expect(faceTypes(round.solid)).toHaveLength(2);
    expect(cad.getVolume(round.solid) / ((Math.PI * 15 * 15 * 20) / 2)).toBeCloseTo(1, 4);
    // The display's chords lie inside the dome, so its volume is a little less.
    expect(cad.getVolume(round.solid) / round.expected.volume).toBeGreaterThan(1);
    expect(cad.getVolume(round.solid) / round.expected.volume).toBeLessThan(1.01);
    trueBounds(round.solid).forEach((value, index) => expect(Math.abs(value - round.expected.bounds[index])).toBeLessThan(0.01));
    const oval = body(shape("paraboloid", { width: 30, depth: 20, height: 20 }));
    expect(cadProfileSolidMismatch(cad, oval.solid, oval.expected)).toBeNull();
    trueBounds(oval.solid).forEach((value, index) => expect(Math.abs(value - oval.expected.bounds[index])).toBeLessThan(0.01));
  });

  it("takes a fillet and a chamfer on their edges", () => {
    const treated = (source: WorkplaneShape, pick: (edge: ShapeHandle) => boolean, size: number) => {
      const { solid } = body(source);
      const edges = cad.getSubShapes(solid, "edge").filter(pick);
      expect(edges.length).toBeGreaterThan(0);
      for (const result of [cad.fillet(solid, edges, size), cad.chamfer(solid, edges, size)]) {
        expect(cad.isValid(result)).toBe(true);
        expect(cad.getVolume(result)).toBeLessThan(cad.getVolume(solid));
      }
    };
    const every = () => true;
    treated(shape("wedge", { width: 30, depth: 12, height: 8 }), every, 0.5);
    // A pyramid's four sloping edges, which run up to the tip, and its base edges at the sizes that failed with its
    // corners unrounded and turned the other way.
    treated(shape("pyramid", { width: 30, depth: 20, height: 25, sides: 4 }), (edge) => cad.getBoundingBox(edge).ymax > 24.99, 0.5);
    for (const size of [0.5, 1]) treated(shape("pyramid", { width: 30, depth: 20, height: 25, sides: 4 }), (edge) => cad.getBoundingBox(edge).ymax < 1e-6, size);
    treated(shape("pyramid", { width: 30, depth: 30, height: 25, sides: 6, topWidth: 12, topDepth: 12 }), every, 0.5);
    // The paraboloid's rim; its other edge is the seam of the turn, which the tool does not offer.
    const rim = (edge: ShapeHandle) => cad.getBoundingBox(edge).ymax < 1e-6;
    treated(shape("paraboloid", { width: 30, depth: 30, height: 20 }), rim, 1);
    treated(shape("paraboloid", { width: 30, depth: 20, height: 20 }), rim, 1);
  });

  it("lets Delete face take off a wedge where it sticks out of a box on two sides", () => {
    // The case of #1007: a 30 mm box with a 60 mm wedge through it, joined, and the wedge's faces outside the box
    // deleted; the box's walls close over the gap and the box is whole again.
    const block = cad.translate(cad.makeBox(30, 30, 20), -15, -15, 0);
    const wedge = body(shape("wedge", { width: 60, depth: 6, height: 15 })).solid;
    const joined = cad.fuse(block, cad.transform(wedge, [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0]));
    // Outside the box the wedge rises from 0 to 3.75 mm over 15 mm at one end and from 11.25 to 15 mm at the other,
    // 6 mm deep: 15 * (0 + 3.75) / 2 * 6 = 168.75 and 15 * (11.25 + 15) / 2 * 6 = 1181.25.
    expect(cad.getVolume(joined)).toBeCloseTo(18000 + 168.75 + 1181.25, 3);
    const outside = cad.getSubShapes(joined, "face").filter((face) => {
      const bb = cad.getBoundingBox(face);
      return (bb.xmin >= 15 - 1e-6 && bb.xmax > 15.01) || (bb.xmax <= -15 + 1e-6 && bb.xmin < -15.01);
    });
    expect(outside.length).toBeGreaterThan(0);
    const result = deleteFacesSolid(cad, joined, outside);
    expect(cad.isValid(result)).toBe(true);
    expect(cad.getVolume(result)).toBeCloseTo(18000, 3);
  });

  it("agrees with the display mesh turned, tipped over, mirrored and lifted", () => {
    // The wedge is the one of them that is not symmetric: mirrored, its right angle goes to -x.
    const placement = { x: 12.5, z: -7, elevation: 4, rotation: 33, rotationX: 90, rotationZ: 15, mirrorX: true };
    [...flat().map(([source]) => source), shape("paraboloid", { width: 30, depth: 20, height: 20 })].forEach((source) => {
      const placed = { ...source, ...placement };
      const { solid, expected } = body(placed);
      if (source.kind !== "paraboloid") expect(cornersOnMesh(solid, placed)).toBe(true);
      expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
      trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.05));
    });
    const mirrored = body(shape("wedge", { width: 30, depth: 12, height: 8, mirrorX: true }));
    expect(cornersOnMesh(mirrored.solid, shape("wedge", { width: 30, depth: 12, height: 8, mirrorX: true }))).toBe(true);
    expect(Math.abs(cad.getVolume(mirrored.solid) / mirrored.expected.volume - 1)).toBeLessThan(1e-6);
    trueBounds(mirrored.solid).forEach((value, index) => expect(Math.abs(value - mirrored.expected.bounds[index])).toBeLessThan(1e-4));
  });
});
