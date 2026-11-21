import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { acceleratedRaycast } from "three-mesh-bvh";
import { describe, expect, it } from "vitest";
import { castWallHits, moveSnapWalls, RENDER_LAYER_SHAPES, wallSnapForSelection } from "@/components/workplane/viewportPicking";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import { createShapeObject } from "@/components/workplane/viewportShapeObjects";
import { groupedShape } from "@/lib/editorBooleans";
import { computeImportedBoundsTree } from "@/lib/importedMeshDisplay";
import { wallTargetsFromHits, type SnapBox, type WallHit } from "@/lib/objectSnap";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Moving a part snaps to the wall it runs into: rays right across the scene find every wall, the inner ones of a box
 * too, and tell which way each faces, also for mirrored, stretched and twisted bodies.
 */

const part: SnapBox = { minX: 20, maxX: 30, minZ: 25, maxZ: 35 };
const height = { min: 0, max: 10 };

function body(id: string, geometry: THREE.BufferGeometry, place?: (mesh: THREE.Mesh) => void) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.userData.shapeId = id;
  mesh.layers.set(RENDER_LAYER_SHAPES);
  place?.(mesh);
  return mesh;
}

function scene(...objects: THREE.Object3D[]) {
  const shapeLayer = new THREE.Group();
  objects.forEach((object) => shapeLayer.add(object));
  shapeLayer.updateMatrixWorld(true);
  return { state: { shapeLayer, sectionPlane: null } as unknown as ThreeState };
}

function slab(minX: number, maxX: number, minZ: number, maxZ: number) {
  return new THREE.BoxGeometry(maxX - minX, 20, maxZ - minZ).translate((minX + maxX) / 2, 10, (minZ + maxZ) / 2);
}

/** A box 80 by 60 with walls 4 thick, open at the top, as one mesh with a bounds tree, as an imported case is. */
function hollowBox() {
  const geometry = mergeGeometries([slab(0, 4, 0, 60), slab(76, 80, 0, 60), slab(4, 76, 0, 4), slab(4, 76, 56, 60)])!;
  computeImportedBoundsTree(geometry);
  return body("case", geometry, (mesh) => { mesh.raycast = acceleratedRaycast; });
}

function leg(id: string, x: number, z: number, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#6e2786", x, z, elevation: 5, size: 5, width: 5, depth: 5, height: 30, rotation: 0, rotationX: 0, rotationZ: 0, ...extra } as WorkplaneShape;
}

const values = (hits: WallHit[], axis: "x" | "z") => {
  const walls = wallTargetsFromHits(hits, axis);
  return { min: walls.min.map((wall) => wall.value), max: walls.max.map((wall) => wall.value) };
};

describe("rays across the scene find the walls a moved part can snap to", () => {
  it("finds the inner walls of a box from outside it", () => {
    const { state } = scene(hollowBox());
    expect(values(castWallHits(state, part, height, "x", new Set()), "x")).toEqual({ min: [4, 80], max: [0, 76] });
    expect(values(castWallHits(state, part, height, "z", new Set()), "z")).toEqual({ min: [4, 60], max: [0, 56] });
  });

  it("tells which way a face of a mirrored body faces", () => {
    const { state } = scene(body("mirrored", slab(40, 50, 0, 60), (mesh) => mesh.scale.set(-1, 1, 1)));
    // Mirrored, the slab stands from -50 to -40: its face at -50 faces -X, the one at -40 faces +X.
    expect(values(castWallHits(state, part, height, "x", new Set()), "x")).toEqual({ min: [-40], max: [-50] });
  });

  it("turns a stretched body's sloped face as the stretch does, not as the turn alone", () => {
    const turned = new THREE.Group();
    turned.scale.set(2, 1, 1);
    turned.add(body("stretched", new THREE.BoxGeometry(10, 20, 10).translate(0, 10, 0), (mesh) => {
      mesh.rotation.y = Math.PI / 4;
      mesh.position.set(30, 0, 30);
    }));
    const hits = castWallHits(scene(turned).state, part, height, "x", new Set());
    expect(hits.length).toBeGreaterThan(0);
    // A face turned 45 degrees, its normal (0.71, 0.71) across X and Z, stretched twice along X: (0.45, 0.89).
    hits.forEach((hit) => {
      expect(Math.abs(hit.normal.x)).toBeCloseTo(1 / Math.sqrt(5), 6);
      expect(Math.abs(hit.normal.z)).toBeCloseTo(2 / Math.sqrt(5), 6);
    });
  });

  it("finds each leg of a twisted bundle, a mirrored one too, as a face turned against the ray and then one turned along it (#1419)", () => {
    const legs = [
      leg("l1", -12.5, -12.5),
      leg("l2", 12.5, -12.5, { mirrorX: true }),
      leg("l3", 12.5, 12.5),
      leg("l4", -12.5, 12.5),
    ];
    const bundle = { ...groupedShape(legs)!, name: "Bundle", groupOperation: "bundle", extrudeTwist: 90 } as WorkplaneShape;
    const object = createShapeObject(bundle, false, undefined, false);
    object.traverse((child) => child.layers.set(RENDER_LAYER_SHAPES));
    const { state } = scene(object);
    // The part passes beside the whole bundle, so the rays cross every leg, the mirrored one too, at many heights.
    const rays: WallHit[][] = [];
    for (let z = -20; z <= 20; z += 2.5) {
      const byRay = new Map<string, WallHit[]>();
      castWallHits(state, { minX: 40, maxX: 50, minZ: z - 2.5, maxZ: z + 2.5 }, { min: 5, max: 35 }, "x", new Set()).forEach((hit) => {
        const key = `${hit.point.y.toFixed(3)} ${hit.point.z.toFixed(3)}`;
        byRay.set(key, [...(byRay.get(key) ?? []), hit]);
      });
      rays.push(...byRay.values());
    }
    expect(rays.length).toBeGreaterThan(100);
    expect(rays.some((onRay) => onRay.some((hit) => hit.point.x > 0 && hit.point.z < 0))).toBe(true);
    // Each ray crosses a leg or two: in, out, in, out, in the order the ray meets them. A ray along a seam between two
    // bands meets both triangles at one point: one crossing.
    rays.forEach((onRay) => {
      const crossings = onRay.sort((a, b) => a.point.x - b.point.x).filter((hit, index) => index === 0 || hit.point.x - onRay[index - 1].point.x > 1e-6);
      expect(crossings.length % 2).toBe(0);
      crossings.forEach((hit, index) => expect(Math.sign(hit.normal.x)).toBe(index % 2 === 0 ? -1 : 1));
    });
  });

  it("leaves out the moved and hidden bodies, the bodies off to the side and what the section view cuts away", () => {
    // A post narrower than the part: only the middle rays meet it.
    const near = body("near", slab(40, 50, 27, 33));
    const moved = body("moved", slab(20, 30, 25, 35));
    const hidden = body("hidden", slab(60, 70, 0, 60));
    const aside = body("aside", slab(40, 50, 70, 90));
    // A body on another layer, as the rays of a pick never meet it either.
    const elsewhere = body("elsewhere", slab(80, 90, 0, 60), (mesh) => mesh.layers.set(RENDER_LAYER_SHAPES + 1));
    const { state } = scene(near, moved, hidden, aside, elsewhere);
    expect(values(castWallHits(state, part, height, "x", new Set(["moved", "hidden"])), "x")).toEqual({ min: [50], max: [40] });
    // Only the bodies the rays can meet are given a picking tree.
    expect(aside.geometry.boundsTree).toBeUndefined();
    // The section view keeps what lies on the near side of x = 45.
    (state as { sectionPlane: THREE.Plane | null }).sectionPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 45);
    expect(values(castWallHits(state, part, height, "x", new Set(["moved", "hidden"])), "x")).toEqual({ min: [], max: [40] });
  });

  it("gives a treated body a picking tree once, and leaves its triangles in their order", () => {
    // Face picking and its caches (the tape, face centres) go by the body's own triangle numbers.
    const treated = body("treated", new THREE.SphereGeometry(10, 16, 10).translate(45, 5, 30));
    const order = Array.from(treated.geometry.index!.array);
    const { state } = scene(treated);
    expect(treated.geometry.boundsTree).toBeUndefined();
    const walls = values(castWallHits(state, part, height, "x", new Set()), "x");
    expect(walls.max.length).toBeGreaterThan(0);
    expect(walls.min.length).toBeGreaterThan(0);
    const tree = treated.geometry.boundsTree;
    expect(tree).toBeDefined();
    expect(Array.from(treated.geometry.index!.array)).toEqual(order);
    castWallHits(state, part, height, "x", new Set());
    expect(treated.geometry.boundsTree).toBe(tree);
  });

  it("leaves a plain body that picks without a tree as it is", () => {
    const small = body("small", slab(40, 50, 0, 60), (mesh) => { mesh.raycast = acceleratedRaycast; });
    const { state } = scene(small);
    expect(values(castWallHits(state, part, height, "x", new Set()), "x")).toEqual({ min: [50], max: [40] });
    expect(small.geometry.boundsTree).toBeUndefined();
  });

  it("finds nothing in an empty scene", () => {
    expect(castWallHits(scene().state, part, height, "x", new Set())).toEqual([]);
  });
});

describe("the walls a moved selection snaps to", () => {
  const moved = leg("part", 25, 30, { elevation: 0, size: 10, width: 10, depth: 10, height: 10 });

  it("sends rays on the first move and again only once the part's middle has left the stretch they covered", () => {
    const { state } = scene(body("near", slab(40, 50, 27, 33)));
    const wallSnap = wallSnapForSelection([moved], new Set(["part"]))!;
    const walls = (box: SnapBox) => moveSnapWalls(state, wallSnap, box, ["x"]).x;
    expect(walls(part)).toEqual({ min: [{ value: 50, from: 28, to: 32 }], max: [{ value: 40, from: 28, to: 32 }] });
    // A wall put there since is only met by the next rays.
    state.shapeLayer.add(body("late", slab(60, 70, 0, 60)));
    state.shapeLayer.updateMatrixWorld(true);
    expect(walls({ ...part, minZ: 29, maxZ: 39 }).min.map((wall) => wall.value)).toEqual([50]);
    expect(walls({ ...part, minZ: 45, maxZ: 55 }).min.map((wall) => wall.value)).toEqual([70]);
  });

  it("leaves out the moved part and a hidden body", () => {
    const { state } = scene(body("part", slab(20, 30, 25, 35)), body("near", slab(40, 50, 27, 33)), body("ghost", slab(60, 70, 0, 60)));
    const wallSnap = wallSnapForSelection([moved, leg("ghost", 65, 30, { hidden: true })], new Set(["part"]))!;
    expect(moveSnapWalls(state, wallSnap, part, ["x"]).x.min.map((wall) => wall.value)).toEqual([50]);
  });

  it("finds none for a selection with a part turned part of the way", () => {
    expect(wallSnapForSelection([moved, leg("turned", 40, 30, { rotation: 45 })], new Set(["part", "turned"]))).toBeUndefined();
    expect(wallSnapForSelection([moved, leg("turned", 40, 30, { rotation: 90 })], new Set(["part", "turned"]))).toBeDefined();
  });
});
