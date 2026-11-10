import manifoldModule from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { meshForShape } from "@/lib/editorMeshCore";
import { shapeToManifoldSolid } from "@/lib/editorBooleans";
import { readPerforableFace } from "@/lib/holePatternShapes";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { buildSupportRib, DEFAULT_SUPPORT_RIB, normalizeSupportRib, resolveSupportRib, supportRibFace, type SupportRibFace } from "@/lib/supportRib";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The support rib (Discussion #1385), on Ingo's own example: a 50 mm cube tilted by 45 degrees, standing on one edge,
 * and a thin triangle under its lower face. The rib keeps the gap to the face everywhere; only the bridges reach into
 * the cube, each exactly one layer high and one line wide, on the layer grid.
 */

let kernel: Awaited<ReturnType<typeof manifoldModule>>;

beforeAll(async () => {
  kernel = await manifoldModule();
  kernel.setup();
  rememberManifoldRuntime(kernel);
});

const asset = (kind: string) => toolbarShapeAssets.find((entry) => entry.kind === kind)!;

function box(patch: Partial<WorkplaneShape>): WorkplaneShape {
  const made = makeShapeFromAsset({ ...asset("box"), name: "Box" }, { x: 0, z: 0, elevation: 0 }, { width: 50, depth: 50, height: 50 });
  return { ...made, id: "cube", width: 50, depth: 50, height: 50, size: 50, ...patch } as WorkplaneShape;
}

// Ingo's cube, as in his file.
const cube = box({ x: 13, z: 49.5, elevation: 10.355339059327378, rotationX: 315 });

function positionsOf(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  return new Float64Array(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
}

/** The middle of the face whose outward normal is nearest `wanted`, and that normal. */
function faceOf(shape: WorkplaneShape, wanted: THREE.Vector3) {
  const positions = positionsOf(shape);
  let best: { normal: THREE.Vector3; points: THREE.Vector3[] } | null = null;
  const groups = new Map<string, { normal: THREE.Vector3; points: THREE.Vector3[] }>();
  for (let o = 0; o < positions.length; o += 9) {
    const a = new THREE.Vector3(positions[o], positions[o + 1], positions[o + 2]);
    const b = new THREE.Vector3(positions[o + 3], positions[o + 4], positions[o + 5]);
    const c = new THREE.Vector3(positions[o + 6], positions[o + 7], positions[o + 8]);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const key = normal.toArray().map((value) => value.toFixed(3)).join(",");
    const group = groups.get(key) ?? { normal, points: [] };
    group.points.push(a, b, c);
    groups.set(key, group);
  }
  groups.forEach((group) => {
    if (!best || group.normal.dot(wanted) > best.normal.dot(wanted)) best = group;
  });
  const found = best as unknown as { normal: THREE.Vector3; points: THREE.Vector3[] };
  const middle = found.points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / found.points.length);
  return { positions, point: middle, normal: found.normal };
}

function ribFace(shape: WorkplaneShape, wanted: THREE.Vector3): SupportRibFace {
  const { positions, point, normal } = faceOf(shape, wanted);
  const read = readPerforableFace(positions, point, normal);
  if (!read.ok) throw new Error(`no face: ${read.reason}`);
  const result = supportRibFace(read.face);
  if (!result.ok) throw new Error(`no rib face: ${result.reason}`);
  return result.face;
}

const lowerFace = () => ribFace(cube, new THREE.Vector3(0, -1, 1));

describe("the support rib (#1385)", () => {
  it("takes the cube's lower face: 45 degrees, reaching the bed, up to its upper edge", () => {
    const face = lowerFace();
    expect(face.angle).toBeCloseTo(45, 3);
    expect(face.low).toBeCloseTo(0, 3);
    expect(face.high).toBeCloseTo(50 * Math.SQRT1_2, 2);
  });

  it("refuses a face that looks up, one standing upright and one that does not reach the bed", () => {
    const { positions, point, normal } = faceOf(cube, new THREE.Vector3(0, 1, 1));
    const up = readPerforableFace(positions, point, normal);
    expect(up.ok && supportRibFace(up.face)).toEqual({ ok: false, reason: "notDown" });
    const standing = box({ x: 0, z: 0, elevation: 0 });
    const side = faceOf(standing, new THREE.Vector3(1, 0, 0));
    const read = readPerforableFace(side.positions, side.point, side.normal);
    expect(read.ok && supportRibFace(read.face)).toEqual({ ok: false, reason: "notDown" });
    const raised = box({ x: 13, z: 49.5, elevation: 20, rotationX: 315 });
    const lifted = faceOf(raised, new THREE.Vector3(0, -1, 1));
    const liftedRead = readPerforableFace(lifted.positions, lifted.point, lifted.normal);
    expect(liftedRead.ok && supportRibFace(liftedRead.face)).toEqual({ ok: false, reason: "offBed" });
  });

  it("derives thickness, gap, bridge width and foot from the nozzle and the layers unless set", () => {
    expect(resolveSupportRib(DEFAULT_SUPPORT_RIB)).toEqual({ thickness: 0.8, gap: 0.2, bridgeWidth: 0.4, footThickness: 0.4 });
    expect(resolveSupportRib(normalizeSupportRib({ nozzle: 0.6, layerHeight: 0.3, firstLayer: 0.3, gap: 0.25 }))).toEqual({ thickness: 1.2, gap: 0.25, bridgeWidth: 0.6, footThickness: 0.6 });
  });

  it("keeps the gap to the face everywhere but at the bridges, which sit on the layer grid and reach into the cube", () => {
    const face = lowerFace();
    const settings = normalizeSupportRib({ height: 18.5 });
    const built = buildSupportRib(kernel, face, settings, cube);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const { plan, positions } = built;
    expect(plan.height).toBe(18.5);
    // Bridges every 3 mm (15 layers of 0.2) from the plate's top, each bottom a whole number of layers above the first.
    expect(plan.bridges[0]).toBeCloseTo(0.4, 6);
    for (const bottom of plan.bridges) expect(Math.abs((bottom - 0.2) / 0.2 - Math.round((bottom - 0.2) / 0.2))).toBeLessThan(1e-6);
    for (let i = 1; i < plan.bridges.length; i += 1) expect(plan.bridges[i] - plan.bridges[i - 1]).toBeCloseTo(3, 6);
    expect(plan.bridges.length).toBeGreaterThanOrEqual(5);
    // Every point of the rib lies at least the gap off the face; closer ones belong to a bridge.
    const n = new THREE.Vector3(face.normal.x, face.normal.y, face.normal.z);
    const p0 = new THREE.Vector3(face.point.x, face.point.y, face.point.z);
    let nearest = Infinity;
    let lowest = Infinity;
    for (let o = 0; o < positions.length; o += 3) {
      const point = new THREE.Vector3(positions[o], positions[o + 1], positions[o + 2]);
      lowest = Math.min(lowest, point.y);
      const distance = point.clone().sub(p0).dot(n);
      const onBridge = plan.bridges.some((bottom) => point.y >= bottom - 1e-4 && point.y <= bottom + 0.2 + 1e-4);
      if (!onBridge) {
        expect(distance).toBeGreaterThan(0.2 - 1e-3);
        nearest = Math.min(nearest, distance);
      }
    }
    expect(nearest).toBeCloseTo(0.2, 3);
    expect(lowest).toBeCloseTo(0, 6);
    // Each bridge reaches through the gap into the cube: it has points on the cube's side of the face, inside the cube.
    const created: never[] = [];
    const solid = shapeToManifoldSolid(kernel, cube, created)!;
    for (const bottom of plan.bridges) {
      let deepest = Infinity;
      for (let o = 0; o < positions.length; o += 3) {
        const point = new THREE.Vector3(positions[o], positions[o + 1], positions[o + 2]);
        if (point.y < bottom - 1e-4 || point.y > bottom + 0.2 + 1e-4) continue;
        deepest = Math.min(deepest, point.clone().sub(p0).dot(n));
      }
      expect(deepest).toBeLessThan(-0.1);
    }
    // The bridge is one layer high and one line wide.
    const bridgeBox = (bottom: number) => {
      const xs: number[] = [];
      for (let o = 0; o < positions.length; o += 3) {
        const point = new THREE.Vector3(positions[o], positions[o + 1], positions[o + 2]);
        if (point.y > bottom - 1e-4 && point.y < bottom + 0.2 + 1e-4 && point.clone().sub(p0).dot(n) < 0) xs.push(point.x);
      }
      return { width: Math.max(...xs) - Math.min(...xs) };
    };
    expect(bridgeBox(plan.bridges[1]).width).toBeCloseTo(0.4, 4);
    expect(solid.volume()).toBeGreaterThan(0);
  });

  it("refuses a rib that would run into the part beside the face", () => {
    // A block standing in the way under the cube's lower face, bundled with it as one part.
    const face = lowerFace();
    const built = buildSupportRib(kernel, face, normalizeSupportRib({ height: 18.5 }), {
      ...box({ x: 13, z: 49.5 + 25, elevation: 0, width: 30, depth: 10, height: 6 }),
      id: "block",
    });
    expect(built).toEqual({ ok: false, reason: "collides" });
  });
});
