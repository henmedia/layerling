import * as THREE from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { meshForShape } from "@/lib/editorMeshCore";
import { readPerforableFace } from "@/lib/holePatternShapes";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { clearanceMeshShape } from "@/lib/clearanceCheck";
import { buildSupportRib, normalizeSupportRib, supportRibFace, SUPPORT_RIB_RAISED_END } from "@/lib/supportRib";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The support rib under a part whose bottom edge is rounded (Discussion #1385, Ingo, 07.11.2026): he rounded the edge
 * the tilted cube stands on so the slicer finds its first layer, and then no rib could be placed - the rounding was
 * curved, and the flat face above it no longer reached the bed. The flat face may now stop a little above the bed; the
 * rib follows its plane down to the bed, and its bridges begin above the rounding.
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

/**
 * Ingo's 50 mm cube tilted by 45 degrees onto one edge, that edge rounded by `radius` as the edge tool does, set down
 * onto the bed: a square with one corner rounded, turned so that corner points down, drawn out 50 mm along X.
 */
const cube = (radius: number, edge: "round" | "chamfer" = "round"): WorkplaneShape => {
  const profile: Array<[number, number]> = [[radius, 0], [50, 0], [50, 50], [0, 50], [0, radius]];
  for (let k = 1; edge === "round" && k < 16; k += 1) {
    const a = Math.PI + (Math.PI / 2) * (k / 16);
    profile.push([radius + radius * Math.cos(a), radius + radius * Math.sin(a)]);
  }
  const { CrossSection } = runtime;
  const section = new CrossSection([profile], "Positive");
  const turned = section.rotate(45);
  const drawn = turned.extrude(50);
  // (profile x, profile y, along) -> (along, y, -profile x): the rounded edge runs along X, as in Ingo's file.
  const placed = drawn.transform([0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1]);
  const lowest = placed.boundingBox().min[1];
  const onBed = placed.translate([13, -lowest, 49.5]);
  const mesh = onBed.getMesh();
  const positions = new Float64Array(mesh.triVerts.length * 3);
  for (let i = 0; i < mesh.triVerts.length; i += 1) {
    for (let axis = 0; axis < 3; axis += 1) positions[i * 3 + axis] = mesh.vertProperties[mesh.triVerts[i] * mesh.numProp + axis];
  }
  [section, turned, drawn, placed, onBed].forEach((value) => value.delete());
  return { ...clearanceMeshShape("cube-1a2b", "Box", "#d41721", positions)!, locked: false };
};

function positionsOf(part: WorkplaneShape) {
  const mesh = meshForShape(part);
  return new Float64Array(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
}

/** The flat lower face, clicked in its middle, as the tool reads it. */
function lowerFace(part: WorkplaneShape) {
  const positions = positionsOf(part);
  const wanted = new THREE.Vector3(0, -1, 1).normalize();
  const flat: Array<{ point: THREE.Vector3; area: number }> = [];
  let normal = new THREE.Vector3();
  for (let o = 0; o < positions.length; o += 9) {
    const a = new THREE.Vector3(positions[o], positions[o + 1], positions[o + 2]);
    const b = new THREE.Vector3(positions[o + 3], positions[o + 4], positions[o + 5]);
    const c = new THREE.Vector3(positions[o + 6], positions[o + 7], positions[o + 8]);
    const cross = b.clone().sub(a).cross(c.clone().sub(a));
    const n = cross.clone().normalize();
    if (n.dot(wanted) > 0.99999) {
      flat.push({ point: a.clone().add(b).add(c).multiplyScalar(1 / 3), area: cross.length() / 2 });
      normal = n;
    }
  }
  const total = flat.reduce((sum, entry) => sum + entry.area, 0);
  const middle = flat.reduce((sum, entry) => sum.addScaledVector(entry.point, entry.area / total), new THREE.Vector3());
  const read = readPerforableFace(positions, middle, normal);
  if (!read.ok) throw new Error(read.reason);
  return { face: supportRibFace(read.face), positions };
}

describe("the support rib under a rounded bottom edge (#1385)", () => {
  it("stands under the flat face above a 3 mm rounding, down to the bed, without touching the part", () => {
    const part = cube(3);
    const { face, positions } = lowerFace(part);
    let lowest = Infinity;
    for (let i = 1; i < positions.length; i += 3) lowest = Math.min(lowest, positions[i]);
    expect(lowest).toBeCloseTo(0, 3);
    if (!face.ok) throw new Error(face.reason);
    // The flat face stops above the bed: before, this was refused as not reaching it.
    expect(face.face.low).toBeGreaterThan(0.5);
    expect(face.face.low).toBeLessThan(SUPPORT_RIB_RAISED_END);
    const built = buildSupportRib(runtime, face.face, normalizeSupportRib({}), part);
    if (!built.ok) throw new Error(built.reason);
    let ribLowest = Infinity;
    for (let i = 1; i < built.positions.length; i += 3) ribLowest = Math.min(ribLowest, built.positions[i]);
    expect(ribLowest).toBeCloseTo(0, 4);
    // The bridges begin above the rounding, where the flat face is there to hold them.
    expect(built.plan.bridges.length).toBeGreaterThan(2);
    expect(Math.min(...built.plan.bridges)).toBeGreaterThanOrEqual(face.face.low - 1e-6);
  });

  it("stands under the flat face beside a 45-degree chamfer, which is no round wall", () => {
    // The two faces and the chamfer have their four corners on one circle and were read as a cylinder: "curved".
    const part = cube(3, "chamfer");
    const { face } = lowerFace(part);
    if (!face.ok) throw new Error(face.reason);
    expect(face.face.angle).toBeCloseTo(45, 3);
    const built = buildSupportRib(runtime, face.face, normalizeSupportRib({}), part);
    if (!built.ok) throw new Error(built.reason);
    expect(built.plan.bridges.length).toBeGreaterThan(2);
  });

  it("still refuses a face that stops more than 3 mm above the bed", () => {
    const { face } = lowerFace(cube(15));
    expect(face).toEqual({ ok: false, reason: "offBed" });
  });
});
