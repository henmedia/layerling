import * as THREE from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { checkClearance } from "@/lib/clearanceCheck";
import { expandBundles, groupedShape } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { readPerforableFace } from "@/lib/holePatternShapes";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { checkPrint } from "@/lib/printCheck";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { buildSupportRib, normalizeSupportRib, supportRibFace, supportRibShape } from "@/lib/supportRib";
import { supportRibHolds } from "@/lib/supportRibMark";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The support rib and the two checks (Discussion #1385, Ingo, 07.11.2026): the rib's bridges reach into the part it
 * holds and are one line wide, on purpose, so the clearance check found an overlap and the print check thin walls and
 * overhangs that are none. A rib marked with its part is left out of both; one without the mark still warns.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
let runtime: ManifoldToplevel;
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((loaded) => { loaded.setup(); rememberManifoldRuntime(loaded); return loaded; });
  runtime = (await kernel.runtime) as ManifoldToplevel;
});

const asset = (kind: string) => toolbarShapeAssets.find((entry) => entry.kind === kind)!;
// Ingo's cube, as in his file: 50 mm, tilted by 45 degrees, standing on one edge.
const cube = (): WorkplaneShape => {
  const made = makeShapeFromAsset({ ...asset("box"), name: "Box" }, { x: 0, z: 0, elevation: 0 }, { width: 50, depth: 50, height: 50 });
  return { ...made, id: "cube-1a2b", width: 50, depth: 50, height: 50, size: 50, x: 13, z: 49.5, elevation: 10.355339059327378, rotationX: 315 } as WorkplaneShape;
};

/** The rib under the cube's lower face, as the tool makes it, with or without the mark of its part. */
function ribFor(part: WorkplaneShape, marked: boolean) {
  const mesh = meshForShape(part);
  const positions = new Float64Array(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
  const wanted = new THREE.Vector3(0, -1, 1).normalize();
  let best = { dot: -Infinity, point: new THREE.Vector3(), normal: new THREE.Vector3() };
  for (let o = 0; o < positions.length; o += 9) {
    const a = new THREE.Vector3(positions[o], positions[o + 1], positions[o + 2]);
    const b = new THREE.Vector3(positions[o + 3], positions[o + 4], positions[o + 5]);
    const c = new THREE.Vector3(positions[o + 6], positions[o + 7], positions[o + 8]);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if (normal.dot(wanted) > best.dot) best = { dot: normal.dot(wanted), point: a.clone().add(b).add(c).multiplyScalar(1 / 3), normal };
  }
  const read = readPerforableFace(positions, best.point, best.normal);
  if (!read.ok) throw new Error(read.reason);
  const face = supportRibFace(read.face);
  if (!face.ok) throw new Error(face.reason);
  const built = buildSupportRib(runtime, face.face, normalizeSupportRib({}), part);
  if (!built.ok) throw new Error(built.reason);
  return supportRibShape("support-rib-9z8y", "Support rib", part.color, built.positions, marked ? part.id : undefined)!;
}

/** Cube and rib bundled, as the tool does unless switched off. */
function bundled(marked: boolean) {
  const part = cube();
  const group = groupedShape([part, ribFor(part, marked)])!;
  return canonicalizeShape({ ...group, name: "Box", groupOperation: "bundle" });
}

describe("the support rib in the checks (#1385)", () => {
  it("knows its part also once the two are bundled and come apart for a check", () => {
    const parts = expandBundles([bundled(true)]);
    expect(parts).toHaveLength(2);
    const [first, second] = parts;
    expect(supportRibHolds(first, second)).toBe(true);
    expect(supportRibHolds(first, { id: "another-body" })).toBe(false);
  });

  it("is no overlap in the clearance check with the part it holds; an unmarked rib still is", async () => {
    const marked = await checkClearance([bundled(true)]);
    expect(marked.overlaps).toEqual([]);
    expect(marked.touching).toEqual([]);
    expect(marked.tight).toEqual([]);
    const unmarked = await checkClearance([bundled(false)]);
    expect(unmarked.overlaps.length + unmarked.touching.length).toBeGreaterThan(0);
  });

  it("has no thin walls or overhangs in the print check, and holds the cube on the plate", async () => {
    const unmarked = await checkPrint([bundled(false)], { nozzle: 0.4 });
    const ribPlaces = (result: Awaited<ReturnType<typeof checkPrint>>) => (result.thinWalls?.places ?? []).filter((place) => place.name === "Support rib");
    expect(ribPlaces(unmarked).length).toBeGreaterThan(0);
    const marked = await checkPrint([bundled(true)], { nozzle: 0.4 });
    expect(ribPlaces(marked)).toEqual([]);
    expect(marked.overhang.areaMm2).toBeLessThan(unmarked.overhang.areaMm2);
    // The rib still holds the cube: one piece on the plate, nothing floating.
    expect(marked.pieces.every((piece) => !piece.floating)).toBe(true);
  });
});
