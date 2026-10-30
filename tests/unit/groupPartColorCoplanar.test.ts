import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { NORMAL_IMPORTED_SELECTION_EDGE_ANGLE, buildPartColoredMeshGeometry, createShapeObject, getImportedMeshGeometry } from "@/components/workplane/viewportShapeObjects";
import { buildGroupDisplayMesh, buildGroupedShapeFromSelection } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import type { WorkplaneShape } from "@/types/layerling";

let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

const RED = "#ff0000";
const BLUE = "#0000ff";

function part(id: string, kind: string, x: number, z: number, color: string, width = 20, height = 20): WorkplaneShape {
  return {
    id, name: id, kind, color, x, z, elevation: 0, size: width, width, depth: width, height, rotation: 0,
  } as unknown as WorkplaneShape;
}

/** Whether a point lies on a part's own surface: a short ray along the face normal, from either side, meets it there. */
function surfaceProbe(source: WorkplaneShape) {
  const object = createShapeObject(source, false, undefined, false);
  object.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  object.traverse((node) => { if (node instanceof THREE.Mesh && node.visible) meshes.push(node); });
  const raycaster = new THREE.Raycaster();
  // The viewport keeps shape meshes off layer 0, which a default raycaster ignores.
  raycaster.layers.enableAll();
  const eps = 1e-2;
  return (point: THREE.Vector3, normal: THREE.Vector3) => {
    for (const side of [1, -1]) {
      const origin = point.clone().addScaledVector(normal, eps * side);
      raycaster.set(origin, normal.clone().multiplyScalar(-side));
      const hit = raycaster.intersectObjects(meshes, false)[0];
      if (hit && Math.abs(hit.distance - eps) < 1e-3 && Math.abs(hit.face!.normal.clone().transformDirection(hit.object.matrixWorld).dot(normal)) > 0.999) return true;
    }
    return false;
  };
}

/**
 * Samples every triangle of the coloured mesh and compares its colour with the part(s) whose own surface
 * really passes through the sampled point. Returns how much area carries the wrong colour, and how many
 * triangles straddle the boundary between two parts' exclusive regions (no single colour can be right).
 */
function surfaceReport(geometry: THREE.BufferGeometry, parts: WorkplaneShape[]) {
  const position = geometry.getAttribute("position");
  const color = geometry.getAttribute("color");
  const owners = parts.filter((p) => !p.hole).map((p) => ({ part: p, on: surfaceProbe(p), rgb: new THREE.Color(p.color) }));
  const [a, b, c, point, normal, edge] = [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3());
  const grid = 8;
  let wrongArea = 0;
  let totalArea = 0;
  let straddling = 0;
  let unowned = 0;
  const wrongTriangles: number[] = [];
  for (let offset = 0; offset < position.count; offset += 3) {
    a.fromBufferAttribute(position, offset);
    b.fromBufferAttribute(position, offset + 1);
    c.fromBufferAttribute(position, offset + 2);
    normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
    const area = new THREE.Triangle(a, b, c).getArea();
    const triangleColor = new THREE.Color(color.getX(offset), color.getY(offset), color.getZ(offset));
    const exclusive = new Set<string>();
    let samples = 0;
    let wrong = 0;
    for (let i = 0; i <= grid; i += 1) {
      for (let j = 0; j <= grid - i; j += 1) {
        const u = (i + 1 / 3) / (grid + 1);
        const v = (j + 1 / 3) / (grid + 1);
        point.copy(a).multiplyScalar(1 - u - v).addScaledVector(b, u).addScaledVector(c, v);
        const on = owners.filter((entry) => entry.on(point, normal));
        if (on.length === 0) { unowned += 1; continue; }
        samples += 1;
        if (on.length === 1) exclusive.add(on[0].part.id);
        if (!on.some((entry) => entry.rgb.equals(triangleColor))) wrong += 1;
      }
    }
    if (exclusive.size > 1) straddling += 1;
    totalArea += area;
    if (samples > 0) { wrongArea += area * (wrong / samples); if (wrong) wrongTriangles.push(offset / 3); }
  }
  return { triangles: position.count / 3, straddling, unowned, wrongTriangles: wrongTriangles.length, wrongArea, totalArea, wrongShare: totalArea > 0 ? wrongArea / totalArea : 0 };
}

type Placement = { sides: number; width: number; x: number; z: number; rotation: number };

async function buildColoured(placement: Placement, order: "cube-first" | "polygon-first" = "cube-first") {
  const cube = part("cube", "box", 0, 0, RED);
  const polygon = { ...part("polygon", "polygon", placement.x, placement.z, BLUE, placement.width), sides: placement.sides, rotation: placement.rotation } as WorkplaneShape;
  const built = await buildGroupedShapeFromSelection(order === "cube-first" ? [cube, polygon] : [polygon, cube], 100_000);
  const group = built.group!;
  const mesh = buildGroupDisplayMesh(group)!;
  expect(mesh).toBeTruthy();
  const geometry = buildPartColoredMeshGeometry(mesh, group.groupedShapes!)!;
  expect(geometry).toBeTruthy();
  return { group, mesh, geometry, parts: group.groupedShapes! };
}

// Placements where the merged top and bottom faces are re-triangulated across the cube/polygon boundary. Before the
// triangles were cut along the parts' own face edges, each of these carried triangles of one colour over ground
// that belongs to the other part.
const PLACEMENTS: Placement[] = [
  { sides: 4, width: 22, x: 5.5, z: 4.9, rotation: 35 },
  { sides: 8, width: 26, x: -1.3, z: 10.4, rotation: 83 },
  { sides: 7, width: 16, x: -4.7, z: 2.4, rotation: 7 },
  { sides: 7, width: 20, x: -4, z: -1.7, rotation: 83 },
  { sides: 3, width: 28, x: 3.7, z: 1.3, rotation: 66 },
  { sides: 6, width: 20, x: 11, z: 6, rotation: 0 },
];

describe("part colours on coplanar tops", () => {
  it.each(PLACEMENTS)("colours the joint top and bottom faces by the part that owns each area: %j", async (placement) => {
    const { geometry, parts } = await buildColoured(placement);
    const report = surfaceReport(geometry, parts);
    expect(report.wrongShare).toBeLessThan(1e-6);
    expect(report.wrongTriangles).toBe(0);
  });

  it("leaves the cuts out of the mesh when no triangle needs one", async () => {
    // Aligned tops that the kernel keeps triangulated along the boundary stay exactly as they were.
    const { geometry, mesh } = await buildColoured({ sides: 6, width: 20, x: 11, z: 6, rotation: 0 });
    if (geometry.userData.splitTriangleCount === undefined) {
      expect(geometry.getAttribute("position").count).toBe(mesh.triangleCount * 3);
      expect(geometry.userData.edgesSource).toBeUndefined();
    }
  });

  it("gives the same colours whichever part was picked first", async () => {
    for (const placement of PLACEMENTS.slice(0, 3)) {
      const first = await buildColoured(placement, "cube-first");
      const second = await buildColoured(placement, "polygon-first");
      expect(surfaceReport(second.geometry, second.parts).wrongShare).toBeLessThan(1e-6);
      expect(second.geometry.getAttribute("position").count).toBe(first.geometry.getAttribute("position").count);
    }
  });

  it("draws the edge lines of the uncut mesh, so no cut shows up as a stray stroke", async () => {
    const placement = PLACEMENTS[0];
    const { group, mesh, geometry } = await buildColoured(placement);
    expect(geometry.userData.splitTriangleCount).toBeGreaterThan(0);
    const object = createShapeObject({ ...group, importedMesh: mesh, multicolor: true } as WorkplaneShape, true);
    const lines: THREE.LineSegments[] = [];
    object.traverse((node) => { if (node instanceof THREE.LineSegments && node.userData.shapeEdge) lines.push(node); });
    expect(lines.length).toBeGreaterThan(0);
    const surface = object.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh && Boolean(child.userData.shapeSurface))!;
    expect(surface.geometry.getAttribute("color")).toBeTruthy();
    const plain = new THREE.EdgesGeometry(getImportedMeshGeometry(mesh), NORMAL_IMPORTED_SELECTION_EDGE_ANGLE);
    expect(lines[0].geometry.getAttribute("position").count).toBe(plain.getAttribute("position").count);
  });
});
