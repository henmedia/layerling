import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { manifoldFromMeshData, meshDataToManifoldMesh, takeHoleFillTally } from "@/lib/editorBooleans";
import type { MeshData } from "@/lib/editorMeshCore";
import { closeFlatMeshGaps, closeSmallMeshHoles } from "@/lib/meshHoleFill";

let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
});

/** A 10 mm cube cut into `segments` cells a side, every triangle with its own corners, as an OBJ brings it. */
function cubeMesh(segments: number): MeshData {
  const geometry = new THREE.BoxGeometry(10, 10, 10, segments, segments, segments).toNonIndexed();
  const positions = geometry.getAttribute("position").array as Float32Array;
  const vertices: [number, number, number][] = [];
  const faces: [number, number, number][] = [];
  for (let i = 0; i < positions.length; i += 9) {
    const start = vertices.length;
    vertices.push([positions[i], positions[i + 1], positions[i + 2]], [positions[i + 3], positions[i + 4], positions[i + 5]], [positions[i + 6], positions[i + 7], positions[i + 8]]);
    faces.push([start, start + 1, start + 2]);
  }
  return { name: "cube", vertices, faces };
}

/** The mesh without the faces `drop` picks. */
function without(mesh: MeshData, drop: (index: number) => boolean): MeshData {
  return { ...mesh, faces: mesh.faces.filter((_, index) => !drop(index)) };
}

function solidVolume(mesh: MeshData) {
  const solid = runtime.Manifold.ofMesh(meshDataToManifoldMesh(runtime, mesh));
  try {
    return { status: solid.status(), volume: solid.volume() };
  } finally {
    solid.delete();
  }
}

describe("closing small holes of an open mesh (#791)", () => {
  it("caps a small opening so the kernel takes the mesh, turned the right way", () => {
    const open = without(cubeMesh(30), (index) => index < 2);
    expect(() => solidVolume(open)).toThrow();
    const repair = closeSmallMeshHoles(open);
    expect(repair).toMatchObject({ closed: 1, open: 0 });
    const solid = solidVolume(repair.mesh);
    expect(solid.status).toBe("NoError");
    expect(solid.volume).toBeCloseTo(1000, 0);
  });

  it("closes each of several openings, and leaves a closed mesh as it is", () => {
    const closedMesh = cubeMesh(30);
    expect(closeSmallMeshHoles(closedMesh)).toEqual({ mesh: closedMesh, closed: 0, open: 0 });
    const twoHoles = without(closedMesh, (index) => index < 2 || index === 500 || index === 501);
    const repair = closeSmallMeshHoles(twoHoles);
    expect(repair.closed).toBe(2);
    expect(solidVolume(repair.mesh).volume).toBeCloseTo(1000, 0);
  });

  it("caps a flat opening of any size, such as a missing side", () => {
    const repair = closeSmallMeshHoles(without(cubeMesh(1), (index) => index < 2));
    expect(repair).toMatchObject({ closed: 1, open: 0 });
    expect(solidVolume(repair.mesh).volume).toBeCloseTo(1000, 3);
  });

  it("leaves a large opening whose rim bends open", () => {
    // Two sides of the cube that meet in an edge are missing: the rim runs round a corner.
    const missingCorner = without(cubeMesh(1), (index) => index < 2 || index === 4 || index === 5);
    const repair = closeSmallMeshHoles(missingCorner);
    expect(repair).toMatchObject({ closed: 0, open: 1 });
    expect(repair.mesh).toBe(missingCorner);
  });

  it("builds the solid of an open mesh through the kernel and says how many holes it closed", () => {
    takeHoleFillTally();
    const solid = manifoldFromMeshData(runtime, without(cubeMesh(30), (index) => index < 2));
    try {
      expect(solid.status()).toBe("NoError");
      expect(solid.volume()).toBeCloseTo(1000, 0);
    } finally {
      solid.delete();
    }
    expect(takeHoleFillTally()).toEqual({ closed: 1, open: 0 });
    expect(() => manifoldFromMeshData(runtime, without(cubeMesh(1), (index) => index < 2 || index === 4 || index === 5))).toThrow();
    expect(takeHoleFillTally()).toEqual({ closed: 0, open: 1 });
  });
});

/**
 * A U 10 mm wide and 2 mm tall without its top: a flat opening whose middle lies in the notch, so a fan from
 * there folds over, with a point on the straight bottom edge between its corners (#1711).
 */
function openU(): MeshData {
  const outline = [[0, 0], [5, 0], [10, 0], [10, 10], [7, 10], [7, 3], [3, 3], [3, 10], [0, 10]].map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: 2, bevelEnabled: false }).toNonIndexed();
  const positions = geometry.getAttribute("position").array as Float32Array;
  const vertices: [number, number, number][] = [];
  const faces: [number, number, number][] = [];
  for (let i = 0; i < positions.length; i += 9) {
    // The top face is what OpenCascade left out.
    if (positions[i + 2] === 2 && positions[i + 5] === 2 && positions[i + 8] === 2) continue;
    const start = vertices.length;
    vertices.push([positions[i], positions[i + 1], positions[i + 2]], [positions[i + 3], positions[i + 4], positions[i + 5]], [positions[i + 6], positions[i + 7], positions[i + 8]]);
    faces.push([start, start + 1, start + 2]);
  }
  return { name: "U", vertices, faces };
}

describe("closing a flat face OpenCascade left without triangles (#1711)", () => {
  it("triangulates a flat opening a fan would fold over", () => {
    const repair = closeSmallMeshHoles(openU());
    expect(repair).toMatchObject({ closed: 1, open: 0 });
    const solid = solidVolume(repair.mesh);
    expect(solid.status).toBe("NoError");
    expect(solid.volume).toBeCloseTo(72 * 2, 6);
  });

  it("caps the mesh of an exact body with corners of its own, facing out, and leaves a closed one as it is", () => {
    const open = openU();
    const indexed = {
      positions: Float32Array.from(open.vertices.flat()),
      normals: new Float32Array(open.vertices.length * 3),
      indices: Uint32Array.from(open.faces.flat()),
      vertexCount: open.vertices.length,
      triangleCount: open.faces.length,
    };
    const capped = closeFlatMeshGaps(indexed);
    expect(capped.triangleCount).toBeGreaterThan(indexed.triangleCount);
    expect(Array.from(capped.positions.subarray(0, indexed.positions.length))).toEqual(Array.from(indexed.positions));
    // Every new corner faces up, out of the U's top.
    for (let vertex = indexed.vertexCount; vertex < capped.vertexCount; vertex += 1) {
      expect(Array.from(capped.normals.subarray(vertex * 3, vertex * 3 + 3), (value) => value + 0)).toEqual([0, 0, 1]);
    }
    const asData: MeshData = {
      name: "capped",
      vertices: Array.from({ length: capped.vertexCount }, (_, vertex) => [capped.positions[vertex * 3], capped.positions[vertex * 3 + 1], capped.positions[vertex * 3 + 2]] as [number, number, number]),
      faces: Array.from({ length: capped.triangleCount }, (_, triangle) => [capped.indices[triangle * 3], capped.indices[triangle * 3 + 1], capped.indices[triangle * 3 + 2]] as [number, number, number]),
    };
    expect(solidVolume(asData).volume).toBeCloseTo(72 * 2, 6);
    expect(closeFlatMeshGaps(capped)).toBe(capped);
  });

  it("leaves a missing piece of curved surface open", () => {
    // Two sides of a cube that meet in an edge: the rim bends round the corner, however small the opening.
    const missingCorner = without(cubeMesh(1), (index) => index < 2 || index === 4 || index === 5);
    const indexed = {
      positions: Float32Array.from(missingCorner.vertices.flat()),
      normals: new Float32Array(missingCorner.vertices.length * 3),
      indices: Uint32Array.from(missingCorner.faces.flat()),
      vertexCount: missingCorner.vertices.length,
      triangleCount: missingCorner.faces.length,
    };
    expect(closeFlatMeshGaps(indexed)).toBe(indexed);
  });
});
