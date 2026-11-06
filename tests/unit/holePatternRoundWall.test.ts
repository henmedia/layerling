import manifoldModule from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { normalizeHolePattern, roundWallCenters } from "@/lib/holePattern";
import {
  flatOrRoundFaceTriangles,
  holePatternShapes,
  isRoundWallFace,
  readHolePatternFace,
  readPerforableFace,
  type RoundWallFace,
} from "@/lib/holePatternShapes";
import { buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { meshForShape } from "@/lib/editorMeshCore";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The hole pattern on a round wall (Discussion #1393): click the wall of a cylinder, a tube or a bore and the holes go
 * round it, each a straight hole pointing at the axis. A wall that goes all the way round closes the ring with a whole
 * number of holes per row; the margin holds to the rims. Through the wall cuts that one wall clean, no skin left where
 * it bends away from the hole's flat end, and a solid cylinder is cut in to its middle.
 */

let kernel: Awaited<ReturnType<typeof manifoldModule>>;

beforeAll(async () => {
  kernel = await manifoldModule();
  kernel.setup();
  rememberManifoldRuntime(kernel);
});

const asset = (kind: string) => toolbarShapeAssets.find((entry) => entry.kind === kind)!;

function body(kind: string, patch: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const made = makeShapeFromAsset({ ...asset(kind), name: kind }, { x: 0, z: 0, elevation: 0 }, { width: 60, depth: 60, height: 40 });
  return { ...made, id: `test-${kind}`, width: 60, depth: 60, height: 40, size: 60, sides: 96, ...patch } as WorkplaneShape;
}

/** The world triangles of a shape, nine numbers each, as the tool reads a body. */
function positionsOf(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  return new Float64Array(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
}

/** The body the holes leave: the tool's group cut as the editor cuts it, its triangles in the world. */
async function cutBody(parts: WorkplaneShape[]) {
  const result = await buildGroupedShapeFromSelection(parts, 400_000);
  const group = result.group!;
  const local = Array.from(group.importedMesh!.positions);
  // The group's mesh stands on 0 round its middle.
  const world = local.map((value, index) => value + (index % 3 === 0 ? group.x : index % 3 === 1 ? group.elevation ?? 0 : group.z));
  return world;
}

/** Does a straight line from `from` to `to` cross any of these triangles? */
function lineHits(positions: number[], from: THREE.Vector3, to: THREE.Vector3) {
  const direction = to.clone().sub(from);
  const length = direction.length();
  const ray = new THREE.Ray(from, direction.normalize());
  const hit = new THREE.Vector3();
  const corner = (offset: number) => new THREE.Vector3(positions[offset], positions[offset + 1], positions[offset + 2]);
  for (let offset = 0; offset + 8 < positions.length; offset += 9) {
    if (ray.intersectTriangle(corner(offset), corner(offset + 3), corner(offset + 6), false, hit) && hit.distanceTo(from) <= length) return true;
  }
  return false;
}

const settings = (patch: Parameters<typeof normalizeHolePattern>[0] = {}) =>
  normalizeHolePattern({ form: "round", size: 5, spacing: 9, arrangement: "staggered", margin: 3, depth: null, ...patch });

function readWall(shape: WorkplaneShape, point: THREE.Vector3, normal: THREE.Vector3): RoundWallFace {
  const read = readHolePatternFace(positionsOf(shape), point, normal);
  expect(read.ok).toBe(true);
  if (!read.ok || !isRoundWallFace(read.face)) throw new Error("not read as a round wall");
  return read.face;
}

describe("the hole pattern on a round wall (#1393)", () => {
  const tube = body("tube", { bevel: 2.5 });

  it("reads the outside of a tube as a closed round wall, its axis, radius and the wall behind it", () => {
    const face = readWall(tube, new THREE.Vector3(0, 20, 30), new THREE.Vector3(0, 0, 1));
    expect(face.round.outside).toBe(true);
    expect(face.round.outline.closed).toBe(true);
    expect(face.round.radius).toBeCloseTo(30, 1);
    expect(Math.abs(face.round.axis.y)).toBeCloseTo(1, 4);
    expect(face.round.axis.y).toBeGreaterThan(0);
    expect(face.thickness).toBeCloseTo(2.5, 1);
    // The frame on the wall faces out where it was picked.
    expect(face.workplane.normal.z).toBeCloseTo(1, 3);
    expect(face.workplane.origin.z).toBeCloseTo(30, 1);
  });

  it("still reads the tube's top and a box's faces as flat, and the face tool's own read refuses the wall", () => {
    const top = readHolePatternFace(positionsOf(tube), new THREE.Vector3(0, 40, 28.7), new THREE.Vector3(0, 1, 0));
    expect(top.ok && !isRoundWallFace(top.face)).toBe(true);
    const box = body("box");
    for (const [point, normal] of [[new THREE.Vector3(0, 40, 0), new THREE.Vector3(0, 1, 0)], [new THREE.Vector3(0, 20, 30), new THREE.Vector3(0, 0, 1)]] as const) {
      const read = readHolePatternFace(positionsOf(box), point, normal);
      expect(read.ok && !isRoundWallFace(read.face)).toBe(true);
    }
    // A cylinder's cap is flat; the wall is the round face.
    const cylinder = body("cylinder");
    const cap = readHolePatternFace(positionsOf(cylinder), new THREE.Vector3(5, 40, 5), new THREE.Vector3(0, 1, 0));
    expect(cap.ok && !isRoundWallFace(cap.face)).toBe(true);
    // The face tool keeps to flat faces: it refuses the wall instead of taking one facet's strip of it.
    const pushed = readPerforableFace(positionsOf(tube), new THREE.Vector3(0, 20, 30), new THREE.Vector3(0, 0, 1));
    expect(pushed).toEqual({ ok: false, reason: "curved" });
    const flatTop = readPerforableFace(positionsOf(tube), new THREE.Vector3(0, 40, 28.7), new THREE.Vector3(0, 1, 0));
    expect(flatTop.ok).toBe(true);
  });

  it("lights the whole wall under the pointer, not one facet", () => {
    const positions = positionsOf(tube);
    const hit = (() => {
      for (let triangle = 0; triangle < positions.length / 9; triangle += 1) {
        const z = (positions[triangle * 9 + 2] + positions[triangle * 9 + 5] + positions[triangle * 9 + 8]) / 3;
        const y = (positions[triangle * 9 + 1] + positions[triangle * 9 + 4] + positions[triangle * 9 + 7]) / 3;
        if (z > 29.5 && y > 5 && y < 35) return triangle;
      }
      return -1;
    })();
    const found = flatOrRoundFaceTriangles(positions, hit);
    expect(found?.round).toBeTruthy();
    expect(found!.triangles.length).toBeGreaterThan(96);
  });

  it("closes each row round the wall with a whole number of holes, never closer than the spacing", () => {
    const face = readWall(tube, new THREE.Vector3(0, 20, 30), new THREE.Vector3(0, 0, 1));
    const result = roundWallCenters(face.round.outline, settings());
    const circumference = face.round.outline.circumference;
    expect(result.columns).toBe(Math.floor(circumference / 9));
    expect(result.spacing).toBeCloseTo(circumference / result.columns!, 6);
    expect(result.spacing!).toBeGreaterThanOrEqual(9);
    const rows = new Map<string, number[]>();
    for (const center of result.centers) rows.set(center.v.toFixed(4), [...(rows.get(center.v.toFixed(4)) ?? []), center.u]);
    expect(rows.size).toBeGreaterThan(2);
    for (const us of rows.values()) expect(us).toHaveLength(result.columns!);
    // Every hole keeps the margin to the rims: 3 mm plus its radius from the bottom and the top.
    const vs = face.round.outline.triangles.flatMap((triangle) => triangle.map((point) => point.v));
    const [bottom, top] = [Math.min(...vs), Math.max(...vs)];
    expect(top - bottom).toBeCloseTo(40, 3);
    for (const center of result.centers) {
      expect(center.v - 2.5 - bottom).toBeGreaterThanOrEqual(3 - 1e-6);
      expect(top - center.v - 2.5).toBeGreaterThanOrEqual(3 - 1e-6);
    }
  });

  it("cuts through the tube's one wall, clean to the edges of every hole, and leaves the far side whole", async () => {
    const face = readWall(tube, new THREE.Vector3(0, 20, 30), new THREE.Vector3(0, 0, 1));
    const plan = holePatternShapes(face, settings({ size: 8, spacing: 14 }), "Hole");
    expect(plan.wall).toMatchObject({ closed: true, diameter: expect.closeTo(60, 1) });
    expect(plan.holes.length).toBeGreaterThan(10);
    const cut = await cutBody([tube, ...plan.holes]);
    // Straight in through the middle and near both side edges of the first hole: open from outside to the bore.
    const hole = plan.holes[0];
    const centre = new THREE.Vector3(hole.x, (hole.elevation ?? 0) + hole.height / 2, hole.z);
    const out = centre.clone().setY(0).normalize();
    const around = new THREE.Vector3(0, 1, 0).cross(out);
    const v = centre.y;
    for (const side of [0, 3.6, -3.6]) {
      const at = (radius: number) => out.clone().multiplyScalar(radius).addScaledVector(around, side).setY(v);
      expect(lineHits(cut, at(31), at(27))).toBe(false);
    }
    // Between two holes the wall is still there, and the far side of the tube has its own holes only.
    const between = out.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / plan.wall!.columns!);
    expect(lineHits(cut, between.clone().multiplyScalar(31).setY(v), between.clone().multiplyScalar(27).setY(v))).toBe(true);
  }, 60_000);

  it("goes in to the middle of a solid cylinder, and a custom depth stops where it is set", () => {
    const cylinder = body("cylinder");
    const face = readWall(cylinder, new THREE.Vector3(30, 20, 0), new THREE.Vector3(1, 0, 0));
    expect(face.thickness).toBeCloseTo(30, 1);
    const through = holePatternShapes(face, settings({ arrangement: "grid", spacing: 20 }), "Hole");
    expect(through.holes.length).toBeGreaterThan(0);
    for (const hole of through.holes) expect(hole.height).toBeGreaterThan(29);
    const blind = holePatternShapes(face, settings({ arrangement: "grid", spacing: 20, depth: 4 }), "Hole");
    for (const hole of blind.holes) expect(hole.height).toBeCloseTo(4 + 0.2, 5);
  });

  it("cuts the wall of a bore picked from inside, outward through it", async () => {
    const face = readWall(tube, new THREE.Vector3(0, 20, 27.5), new THREE.Vector3(0, 0, -1));
    expect(face.round.outside).toBe(false);
    expect(face.round.radius).toBeCloseTo(27.5, 1);
    expect(face.thickness).toBeCloseTo(2.5, 1);
    const plan = holePatternShapes(face, settings({ size: 6, spacing: 12 }), "Hole");
    expect(plan.holes.length).toBeGreaterThan(5);
    const cut = await cutBody([tube, ...plan.holes]);
    const hole = plan.holes[0];
    const centre = new THREE.Vector3(hole.x, (hole.elevation ?? 0) + hole.height / 2, hole.z);
    const out = centre.clone().setY(0).normalize();
    const around = new THREE.Vector3(0, 1, 0).cross(out);
    for (const side of [0, 2.7, -2.7]) {
      const at = (radius: number) => out.clone().multiplyScalar(radius).addScaledVector(around, side).setY(centre.y);
      expect(lineHits(cut, at(27), at(31))).toBe(false);
    }
  }, 60_000);

  it("fills a part of a wall like a flat face, with the margin to its sides", () => {
    // A quarter of the wall, from the facets of the tube's outside that lie round +z within 45 degrees.
    const face = readWall(tube, new THREE.Vector3(0, 20, 30), new THREE.Vector3(0, 0, 1));
    const quarter = face.round.outline.triangles.filter((triangle) => triangle.every((point) => Math.abs(point.u) <= (Math.PI / 4) * 30 + 1e-6));
    const edges: [{ u: number; v: number }, { u: number; v: number }][] = [];
    const lowU = Math.min(...quarter.flatMap((triangle) => triangle.map((point) => point.u)));
    const highU = Math.max(...quarter.flatMap((triangle) => triangle.map((point) => point.u)));
    edges.push([{ u: lowU, v: 0 }, { u: lowU, v: 40 }], [{ u: highU, v: 0 }, { u: highU, v: 40 }], [{ u: lowU, v: 0 }, { u: highU, v: 0 }], [{ u: lowU, v: 40 }, { u: highU, v: 40 }]);
    const result = roundWallCenters({ ...face.round.outline, closed: false, triangles: quarter, edges }, settings());
    expect(result.centers.length).toBeGreaterThan(0);
    expect(result.columns).toBeUndefined();
    for (const center of result.centers) {
      expect(center.u - lowU).toBeGreaterThan(3 + 2.5 - 1e-6);
      expect(highU - center.u).toBeGreaterThan(3 + 2.5 - 1e-6);
    }
  });
});
