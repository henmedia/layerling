import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { BentTubeSegment, WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { bentTubeNaturalDimensions, bentTubeProfileRadii, bentTubeSelfIntersects, bentTubeSettings, createBentTubeGeometry, normalizedBentTubeFields } from "@/lib/bentTubeGeometry";
import { meshYawDegrees } from "@/lib/workplaneShapes";

/*
 * The bent tube's exact body - its section pushed along the straight runs and
 * turned through the bends - against the display mesh it replaces, built by
 * createBentTubeGeometry and placed the way transformMesh places it.
 */

type Vec3 = [number, number, number];

function tube(fields: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const normalized = normalizedBentTubeFields(fields);
  const natural = bentTubeNaturalDimensions(normalized);
  return {
    id: "test-bent-tube", name: "Bent tube", kind: "bentTube", x: 0, z: 0, elevation: 0, rotation: 0, color: "#ff8800",
    ...fields, ...normalized, width: natural.width, depth: natural.depth, height: natural.height, size: natural.size,
  } as WorkplaneShape;
}

/** createBentTubeGeometry, then transformMesh written out: turned about the centre, mirrored, lifted. */
function worldMesh(source: WorkplaneShape) {
  const geometry = createBentTubeGeometry({ ...source, width: source.width, depth: source.depth, height: source.height });
  const prepared = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = prepared.getAttribute("position");
  const centerY = source.height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(source.rotationX ?? 0),
    THREE.MathUtils.degToRad(meshYawDegrees(source)),
    THREE.MathUtils.degToRad(source.rotationZ ?? 0),
    "XYZ",
  ));
  const m: Vec3 = [source.mirrorX ? -1 : 1, source.mirrorY ? -1 : 1, source.mirrorZ ? -1 : 1];
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const v = new THREE.Vector3(position.getX(i) * m[0], (position.getY(i) - centerY) * m[1], position.getZ(i) * m[2]).applyMatrix4(rotation);
    vertices.push([v.x + source.x, v.y + (source.elevation ?? 0) + centerY, v.z + source.z]);
  }
  const faces: Vec3[] = [];
  for (let i = 0; i + 2 < position.count; i += 3) faces.push([i, i + 1, i + 2]);
  return { vertices, faces };
}

/** Area of the section: outer minus inner, round or regular polygon by its circumradius. */
function sectionArea(profile: string, circumradius: number, quality: number) {
  if (profile === "round") return Math.PI * circumradius * circumradius;
  const sides = profile === "square" ? 4 : profile === "hexagon" ? 6 : profile === "octagon" ? 8 : quality;
  return (sides / 2) * circumradius * circumradius * Math.sin((2 * Math.PI) / sides);
}

function pathLength(segments: BentTubeSegment[]) {
  return segments.reduce((total, segment) => total + segment.length + (Math.abs(segment.bendAngle) * Math.PI / 180) * segment.bendRadius, 0);
}

describe("bent tube: exact body", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  function body(source: WorkplaneShape) {
    const profile = cadModifierProfileForShape(source);
    expect(profile?.kind).toBe("sweep");
    const mesh = worldMesh(source);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    const part = { ...(profile as CadModifierProfilePart), expected };
    const local = profileExtrusionSolid(cad, part);
    const transform = part.transform;
    const solid = !transform ? local : cadTransformRequiresGeneralTransform(transform) ? cad.generalTransform(local, transform) : cad.transform(local, transform);
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    return { solid, expected, mesh };
  }

  /** Bounds from a fine mesh of a copy: the kernel's own box is loose on turned faces. */
  function trueBounds(solid: ShapeHandle) {
    const copy = cad.copy(solid);
    const { positions } = cad.tessellate(copy, { linearDeflection: 0.005, angularDeflection: 0.2 });
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

  const s = (length: number, bendAngle: number, bendRadius: number, roll = 0): BentTubeSegment => ({ length, bendAngle, bendRadius, roll });
  const cases: Array<[string, Partial<WorkplaneShape>]> = [
    ["the default tube", {}],
    ["a solid rod bent twice, out of plane", { bentTubeInnerProfile: "none", bentTubeSegments: [s(10, 90, 12), s(10, -60, 20, 90), s(15, 0, 20)] }],
    ["a square tube, rolled", { bentTubeProfile: "square", bentTubeInnerProfile: "square", bentTubeSize: 12, bentTubeWall: 2, bentTubeSegments: [s(25, 90, 15, 30), s(25, 45, 15, 45), s(10, 0, 15)] }],
    ["a hexagon bar bent back on itself", { bentTubeProfile: "hexagon", bentTubeInnerProfile: "none", bentTubeSegments: [s(5, 180, 8), s(5, 0, 8)] }],
    ["an octagon outside, round inside, bend first", { bentTubeProfile: "octagon", bentTubeInnerProfile: "round", bentTubeSize: 14, bentTubeWall: 2, bentTubeSegments: [s(0, 120, 20, 0), s(20, 0, 20)] }],
    ["a round tube with a square opening", { bentTubeProfile: "round", bentTubeInnerProfile: "square", bentTubeSize: 16, bentTubeWall: 2, bentTubeSegments: [s(15, 60, 25), s(15, 0, 25)] }],
    // A 180 degree bend ends in the plane it starts in: its far end is no joint, whether it comes first or last.
    ["a hexagon tube ending in a 180 degree bend", { bentTubeProfile: "hexagon", bentTubeInnerProfile: "octagon", bentTubeSize: 30, bentTubeWall: 4.5, bentTubeSegments: [s(0, 90, 52.26), s(15, 180, 26.13, 37)] }],
    ["an octagon tube starting with a 180 degree bend", { bentTubeProfile: "octagon", bentTubeInnerProfile: "hexagon", bentTubeSize: 20, bentTubeWall: 3, bentTubeSegments: [s(0, 180, 18), s(10, 90, 25, 60)] }],
    // Twelve segments zigzagging in three dimensions: a boolean union of the pieces ran for minutes here.
    ["a twelve-segment square tube", { bentTubeProfile: "square", bentTubeInnerProfile: "square", bentTubeSegments: Array.from({ length: 12 }, (_, k) => s(k % 3 === 0 ? 0 : 8, k % 2 ? 40 : -35, 12, k * 29)) }],
    // Bends at 1.01 times the tightest radius: occt-wasm 5.4.0 trapped in the face merge here.
    ["a hexagon tube with the tightest bends", { bentTubeProfile: "hexagon", bentTubeInnerProfile: "square", bentTubeSize: 30, bentTubeWall: 4.5, bentTubeSegments: [s(0, 30, 17.5947, 37), s(0, 30, 26.1308, 37), s(3, 30, 52.2615, -90), s(3, -90, 17.5947, -90), s(3, 180, 26.1308, 37), s(0, 30, 52.2615, 37), s(15, -90, 26.1308, 90)] }],
  ];

  it.each(cases)("builds %s: analytic faces, the section times the path, inside the display mesh's bounds", (_name, fields) => {
    const source = tube(fields);
    expect(bentTubeSelfIntersects(source)).toBe(false);
    const { solid, expected } = body(source);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    // Pappus: the section's centroid runs along the centre line, so the volume is area x length.
    const settings = normalizedBentTubeFields(source);
    const outerRadius = settings.bentTubeProfile === "round" ? settings.bentTubeSize / 2 : (settings.bentTubeSize / 2) / Math.cos(Math.PI / (settings.bentTubeProfile === "square" ? 4 : settings.bentTubeProfile === "hexagon" ? 6 : 8));
    const loops = (cadModifierProfileForShape(source) as CadModifierProfilePart).loops;
    expect(loops.length).toBe(settings.bentTubeInnerProfile === "none" ? 1 : 2);
    const outerArea = sectionArea(settings.bentTubeProfile, outerRadius, settings.bentTubeQuality);
    const innerRadius = bentTubeProfileRadii(bentTubeSettings(source)).inner;
    const innerArea = settings.bentTubeInnerProfile === "none" || innerRadius === null ? 0 : sectionArea(settings.bentTubeInnerProfile, innerRadius, settings.bentTubeQuality);
    const volume = cad.getVolume(solid);
    const length = pathLength(settings.bentTubeSegments);
    expect(volume / ((outerArea - innerArea) * length)).toBeCloseTo(1, 6);
    const kinds = new Set(cad.getSubShapes(solid, "face").map((face) => cad.surfaceType(face)));
    kinds.forEach((kind) => expect(["plane", "cylinder", "torus", "cone"]).toContain(kind));
    // The display draws the round profile and the bends as chords, inside the true surface.
    const bounds = trueBounds(solid);
    expected.bounds.forEach((value, index) => expect(Math.abs(bounds[index] - value)).toBeLessThan(0.1));
  });

  it("gives a round tube one edge per rim and one face per surface", () => {
    const { solid } = body(tube());
    const faces = cad.getSubShapes(solid, "face").map((face) => cad.surfaceType(face)).sort();
    // Outside and inside: cylinder, torus, cylinder each; two flat ends.
    expect(faces).toEqual(["cylinder", "cylinder", "cylinder", "cylinder", "plane", "plane", "torus", "torus"]);
  });

  it("has the hollow round tube's exact volume", () => {
    const source = tube({ bentTubeSize: 10, bentTubeWall: 1.5 });
    const { solid } = body(source);
    const settings = normalizedBentTubeFields(source);
    const expectedVolume = Math.PI * (5 * 5 - 3.5 * 3.5) * pathLength(settings.bentTubeSegments);
    expect(cad.getVolume(solid) / expectedVolume).toBeCloseTo(1, 6);
  });

  it("agrees with the display mesh turned, tipped over, mirrored and lifted", () => {
    const placement = { x: 12.5, z: -7, elevation: 4, rotation: 33, rotationX: 90, rotationZ: 15, mirrorX: true };
    for (const [, fields] of cases) {
      const { solid, expected } = body({ ...tube(fields), ...placement });
      expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
      trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.1));
    }
  });

  it("follows a box stretched away from the natural size", () => {
    const natural = tube();
    const { solid, expected } = body({ ...natural, width: natural.width * 1.5, height: natural.height * 0.8 });
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.1));
  });

  it("takes a fillet on the rims and a chamfer on a square tube's ends", () => {
    const round = body(tube()).solid;
    const rims = cad.getSubShapes(round, "edge").filter((edge) => cad.curveType(edge) === "circle");
    const filleted = cad.fillet(round, rims, 0.4);
    expect(cad.isValid(filleted)).toBe(true);
    expect(cad.getVolume(filleted)).toBeLessThan(cad.getVolume(round));
    const square = body(tube({ bentTubeProfile: "square", bentTubeInnerProfile: "square", bentTubeSize: 12, bentTubeWall: 2 })).solid;
    const ends = cad.getSubShapes(square, "face").filter((face) => cad.surfaceType(face) === "plane");
    expect(ends.length).toBeGreaterThan(2);
    const all = cad.getSubShapes(square, "edge");
    const chamfered = cad.chamfer(square, all.slice(0, 4), 0.3);
    expect(cad.isValid(chamfered)).toBe(true);
  });
});
