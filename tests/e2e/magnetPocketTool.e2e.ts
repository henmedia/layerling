import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import type { WorkplaneShape } from "@/types/layerling";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { readHolePatternFace } from "@/lib/holePatternShapes";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import type { ManifoldSolid } from "@/lib/manifoldSplit";
import { magnetPocketMeasures, normalizeMagnetPocketSpec } from "@/lib/magnetPocket";
import { findMagnetPartnerSpot, magnetInsertSpec, makeMagnetPocketHole } from "@/lib/magnetPocketGeometry";
import { measureThreadInsert } from "@/lib/threadInsertGeometry";

/*
 * The Magnet pocket tool on two parts of a joint standing where they fit: a lower block and an upper one resting on it.
 * The pocket goes into the lower block's top at the picked spot, the part that meets it there is found, and the same
 * pocket goes into its bottom facing it. Cut in the kernel, each part loses exactly its pocket and glue well, and the
 * two magnets meet across the joint.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));

let runtime: ManifoldToplevel;

beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => {
    loaded.setup();
    rememberManifoldRuntime(loaded);
    return loaded;
  });
  runtime = (await kernel.runtime) as ManifoldToplevel;
});

const base = { color: "#fff", x: 0, z: 0, size: 30, rotation: 0, locked: false, hidden: false } as const;
const block = (id: string, elevation: number): WorkplaneShape => ({ ...base, id, name: id, kind: "box", elevation, width: 30, depth: 30, height: 10 } as WorkplaneShape);

/** A block's triangles in the scene, as the tool reads them: 30 × 10 × 30 standing at `elevation`, `dx` along x. */
function triangles(elevation: number, dx = 0) {
  const geometry = new THREE.BoxGeometry(30, 10, 30).toNonIndexed();
  geometry.translate(dx, elevation + 5, 0);
  return Array.from(geometry.getAttribute("position").array as Float32Array);
}

function solidOf(shape: WorkplaneShape, created: ManifoldSolid[]) {
  const mesh = meshForShape(shape);
  const made = new runtime.Mesh({ numProp: 3, vertProperties: new Float32Array(mesh.vertices.flat()), triVerts: new Uint32Array(mesh.faces.flat()), tolerance: 1e-4 });
  made.merge();
  const solid = runtime.Manifold.ofMesh(made);
  created.push(solid);
  return solid;
}

const dispose = (values: { delete?: () => void }[]) => Array.from(new Set(values)).forEach((value) => value.delete?.());

describe("the magnet pocket tool on a joint", () => {
  const spec = normalizeMagnetPocketSpec({ diameter: 5, height: 2, gap: 0.1, well: true });
  const measures = magnetPocketMeasures(spec);
  const spot = { x: 4, y: 10, z: -3 };
  const up = { x: 0, y: 1, z: 0 };

  it("finds the part resting on the face, and its bottom facing the spot", () => {
    const found = findMagnetPartnerSpot(triangles(10), spot, up);
    expect(found).not.toBeNull();
    expect(found!.point.x).toBeCloseTo(4, 6);
    expect(found!.point.y).toBeCloseTo(10, 6);
    expect(found!.point.z).toBeCloseTo(-3, 6);
    expect(found!.normal).toEqual({ x: -0, y: -1, z: -0 });
    expect(found!.distance).toBeCloseTo(0, 6);
    // A part printed a little apart still counts; one well away, or only beside the spot, does not.
    expect(findMagnetPartnerSpot(triangles(10.6), spot, up)?.distance).toBeCloseTo(0.6, 6);
    expect(findMagnetPartnerSpot(triangles(12), spot, up)).toBeNull();
    expect(findMagnetPartnerSpot(triangles(10, 40), spot, up)).toBeNull();
    // The part's own top faces away from it: a part below the face is not its partner.
    expect(findMagnetPartnerSpot(triangles(0), spot, up)).toBeNull();
  });

  it("cuts the same pocket and well into both parts, facing each other, so the magnets meet", async () => {
    const lower = block("lower", 0);
    const upper = block("upper", 10);
    const readLower = readHolePatternFace(triangles(0), spot, up);
    if (!readLower.ok) throw new Error("no face");
    const insert = magnetInsertSpec(spec);
    expect(measureThreadInsert(readLower.face, insert).allowed).toBe(true);
    const partner = findMagnetPartnerSpot(triangles(10), readLower.face.workplane.origin, readLower.face.workplane.normal)!;
    const readUpper = readHolePatternFace(triangles(10), partner.point, partner.normal);
    if (!readUpper.ok) throw new Error("no partner face");
    expect(measureThreadInsert(readUpper.face, insert).allowed).toBe(true);
    const holeLower = makeMagnetPocketHole(readLower.face, spec);
    const holeUpper = makeMagnetPocketHole(readUpper.face, spec);
    expect(holeLower.kind).toBe("counterbore");
    expect(holeLower.hole).toBe(true);
    expect(holeLower.screwHoleShaft).toBeCloseTo(measures.wellDiameter, 6);
    const created: ManifoldSolid[] = [];
    const built = async (parts: WorkplaneShape[]) => {
      const result = await buildGroupedShapeFromSelection(parts, 500_000);
      if (!result.group) throw new Error("no group");
      return solidOf(result.group, created);
    };
    const cutLower = await built([lower, holeLower]);
    const cutUpper = await built([upper, holeUpper]);
    const pocketAndWell = Math.PI * ((measures.pocketDiameter / 2) ** 2 * measures.pocketDepth + (measures.wellDiameter / 2) ** 2 * measures.wellDepth);
    for (const solid of [cutLower, cutUpper]) {
      expect(solid.status()).toBe("NoError");
      expect(30 * 30 * 10 - solid.volume()).toBeGreaterThan(pocketAndWell * 0.97);
      expect(30 * 30 * 10 - solid.volume()).toBeLessThan(pocketAndWell * 1.03);
    }
    // A 5 × 2 magnet on the floor of each pocket touches neither part, and the two meet 0.4 mm apart across the joint.
    const magnet = (bottom: number) => {
      const disc = runtime.Manifold.cylinder(2, 2.5, 2.5, 64);
      created.push(disc);
      const placed = disc.transform([1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 4, bottom, -3, 1]);
      created.push(placed);
      return placed;
    };
    const inLower = cutLower.intersect(magnet(10 - measures.pocketDepth + 0.01));
    const inUpper = cutUpper.intersect(magnet(10 + measures.pocketDepth - 2 - 0.01));
    created.push(inLower, inUpper);
    expect(inLower.volume()).toBeLessThan(1e-3);
    expect(inUpper.volume()).toBeLessThan(1e-3);
    expect(2 * (measures.pocketDepth - spec.height)).toBeCloseTo(0.4, 6);
    dispose(created);
  });

  it("blocks a pocket where the part is too thin for it", () => {
    // A 2 mm plate: no room for a 2.2 mm pocket.
    const geometry = new THREE.BoxGeometry(30, 2, 30).toNonIndexed();
    geometry.translate(0, 1, 0);
    const read = readHolePatternFace(Array.from(geometry.getAttribute("position").array as Float32Array), { x: 0, y: 2, z: 0 }, up);
    if (!read.ok) throw new Error("no face");
    const measured = measureThreadInsert(read.face, magnetInsertSpec(spec));
    expect(measured.allowed).toBe(false);
    expect(measured.depthShort).toBe(true);
  });
});
