import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { acceleratedRaycast, MeshBVH } from "three-mesh-bvh";
import type { WorkplaneShape } from "@/types/layerling";
import { buildImportedMeshGeometry, computeImportedBoundsTree, IMPORTED_MESH_BVH_OPTIONS, prepareImportedMeshDisplay, rememberPreparedDisplay, takePreparedImportedMeshGeometry } from "@/lib/importedMeshDisplay";

/**
 * The geometry worker prepares the view's geometry and raycasting index of a mesh it made
 * (lib/importedMeshDisplay.ts). Put together on the page, it must be the geometry the page would
 * have built itself: the same numbers, the same index, the same hits.
 */
type ImportedMesh = NonNullable<WorkplaneShape["importedMesh"]>;

function sphereMesh(withNormals: boolean): ImportedMesh {
  const sphere = new THREE.SphereGeometry(20, 64, 32).toNonIndexed();
  sphere.translate(3, 7, -2);
  const positions = Array.from(sphere.getAttribute("position").array);
  const normals = withNormals ? Array.from(sphere.getAttribute("normal").array) : undefined;
  return { positions, normals, baseWidth: 40, baseDepth: 40, baseHeight: 40, triangleCount: positions.length / 9, sourceFormat: "stl" };
}

/** What the page has without the worker: the geometry, then the index where it draws the mesh. */
function onThePage(mesh: ImportedMesh) {
  const geometry = buildImportedMeshGeometry(mesh);
  (geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH }).boundsTree = new MeshBVH(geometry, IMPORTED_MESH_BVH_OPTIONS);
  return geometry;
}

/** The worker's way: prepared there, sent across, put together on the page. */
function fromTheWorker(mesh: ImportedMesh) {
  const { display, transfer } = prepareImportedMeshDisplay(mesh);
  const received = structuredClone(display, { transfer });
  rememberPreparedDisplay(mesh, received);
  const geometry = takePreparedImportedMeshGeometry(mesh)!;
  computeImportedBoundsTree(geometry);
  return geometry;
}

function hits(geometry: THREE.BufferGeometry) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.raycast = acceleratedRaycast;
  const raycaster = new THREE.Raycaster();
  const found: number[] = [];
  for (let k = 0; k < 60; k += 1) {
    const angle = k * 0.37;
    raycaster.set(new THREE.Vector3(Math.cos(angle) * 80, 5 + (k % 9) * 4, Math.sin(angle) * 80), new THREE.Vector3(-Math.cos(angle), 0.01 * (k % 5), -Math.sin(angle)).normalize());
    const [first] = raycaster.intersectObject(mesh);
    found.push(first ? first.distance : -1, first?.faceIndex ?? -1);
  }
  return found;
}

describe("the view's geometry prepared in the worker", () => {
  for (const withNormals of [false, true]) {
    it(`is the geometry the page builds itself (${withNormals ? "with" : "without"} stored normals)`, () => {
      const page = onThePage(sphereMesh(withNormals));
      const worker = fromTheWorker(sphereMesh(withNormals));
      expect(Array.from(worker.getAttribute("position").array)).toEqual(Array.from(page.getAttribute("position").array));
      expect(Array.from(worker.getAttribute("normal").array)).toEqual(Array.from(page.getAttribute("normal").array));
      expect(worker.boundingBox).toEqual(page.boundingBox);
      expect(Array.from(worker.getIndex()!.array)).toEqual(Array.from(page.getIndex()!.array));
      expect(hits(worker)).toEqual(hits(page));
      expect(hits(page).some((value) => value > 0)).toBe(true);
    });
  }

  it("works the normals out once, with the same result as the old way that did it twice", () => {
    const mesh = sphereMesh(false);
    const old = new THREE.BufferGeometry();
    old.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions, 3));
    old.computeVertexNormals();
    old.computeVertexNormals();
    old.computeBoundingBox();
    old.translate(0, -(old.boundingBox?.min.y ?? 0), 0);
    const now = buildImportedMeshGeometry(mesh);
    expect(Array.from(now.getAttribute("normal").array)).toEqual(Array.from(old.getAttribute("normal").array));
    expect(Array.from(now.getAttribute("position").array)).toEqual(Array.from(old.getAttribute("position").array));
  });

  it("uses a prepared geometry once, and builds an index of its own without one", () => {
    const mesh = sphereMesh(false);
    expect(takePreparedImportedMeshGeometry(mesh)).toBeNull();
    const geometry = buildImportedMeshGeometry(mesh);
    computeImportedBoundsTree(geometry);
    expect((geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH }).boundsTree).toBeInstanceOf(MeshBVH);
  });
});

describe("normals a mesh can be lit by (#988)", () => {
  it("gives a corner without a usable normal its triangle's and keeps the others", () => {
    const mesh = sphereMesh(true);
    const normals = [...mesh.normals!];
    // The first triangle has 0 0 0 at one corner and NaN at another, as some exporters write them.
    normals.splice(0, 3, 0, 0, 0);
    normals.splice(3, 3, Number.NaN, Number.NaN, Number.NaN);
    const drawn = buildImportedMeshGeometry({ ...mesh, normals }).getAttribute("normal").array as Float32Array;

    const [a, b, c] = [0, 3, 6].map((i) => new THREE.Vector3(mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]));
    const face = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    expect(new THREE.Vector3(drawn[0], drawn[1], drawn[2]).distanceTo(face)).toBeLessThan(1e-6);
    expect(new THREE.Vector3(drawn[3], drawn[4], drawn[5]).distanceTo(face)).toBeLessThan(1e-6);
    // Every other corner keeps the smooth normal it came with.
    for (let i = 6; i < normals.length; i += 1) expect(drawn[i]).toBeCloseTo(normals[i], 6);
  });

  it("lights a mesh whose normals are all 0 0 0", () => {
    const mesh = sphereMesh(true);
    const drawn = buildImportedMeshGeometry({ ...mesh, normals: mesh.normals!.map(() => 0) }).getAttribute("normal").array as Float32Array;
    let lit = 0;
    for (let i = 0; i < drawn.length; i += 3) if (Math.hypot(drawn[i], drawn[i + 1], drawn[i + 2]) > 0.99) lit += 1;
    // Only the sphere's pole triangles, which have no area, are left without a direction.
    expect(lit / (drawn.length / 3)).toBeGreaterThan(0.95);
  });
});
