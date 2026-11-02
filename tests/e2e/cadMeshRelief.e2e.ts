import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { chamfilletSolid } from "@/lib/cadChamfillet";
import { meshTreatedBody } from "@/lib/cadMeshAccuracy";
import { hasOverFineCadMesh, relieveOverFineCadMeshes, relievedCadDeflection, type RemeshCadBrep } from "@/lib/cadMeshRelief";
import type { EditorHistoryEntry } from "@/lib/editorHistory";
import type { WorkplaneShape } from "@/types/layerling";

// Layerling is Y-up; OCCT primitives are built along Z.
const ROTATE_Z_TO_Y: number[] = [
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, -1, 0, 0,
];

/** What an old Chamfillet meshed with, whatever the quality (Discussion #1042). */
const OLD_CHAMFILLET = { linear: 0.0025, angular: 0.028 };

function bounds(positions: ArrayLike<number>) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[index + axis]);
      max[axis] = Math.max(max[axis], positions[index + axis]);
    }
  }
  return { min, max };
}

describe("lightening bodies an old Chamfillet meshed too finely (Discussion #1042, real OCCT kernel)", () => {
  let kernel: OcctKernel;
  let brep: string;
  let fineShape: WorkplaneShape;
  let remesh: RemeshCadBrep;
  let remeshed = 0;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
    // A cylinder 31 mm across and 10 high, standing at (20, 0, -5), its bottom edge chamfilleted by 1 mm.
    const turned = kernel.transform(kernel.makeCylinder(15.5, 10), ROTATE_Z_TO_Y);
    const placed = kernel.translate(turned, 20, 0, -5);
    const bottom = kernel.getSubShapes(placed, "edge").filter((edge) => {
      const box = kernel.getBoundingBox(edge, false);
      return Math.abs(box.ymin) < 1e-3 && Math.abs(box.ymax) < 1e-3;
    });
    const solid: ShapeHandle = chamfilletSolid(kernel, placed, bottom, 1, 45);
    brep = kernel.toBREP(solid);
    const mesh = kernel.tessellate(solid, { linearDeflection: OLD_CHAMFILLET.linear, angularDeflection: OLD_CHAMFILLET.angular });
    const positions: number[] = [];
    for (const index of mesh.indices) positions.push(mesh.positions[index * 3] - 20, mesh.positions[index * 3 + 1], mesh.positions[index * 3 + 2] + 5);
    const extent = bounds(positions);
    const before = { id: "cylinder-1", kind: "cylinder", x: 20, z: -5, elevation: 0, width: 31, depth: 31, height: 10 } as WorkplaneShape;
    fineShape = {
      id: "cylinder-1",
      name: "Cylinder",
      kind: "mesh",
      x: 20,
      z: -5,
      elevation: 0,
      width: 31,
      depth: 31,
      height: 10,
      importedMesh: {
        positions,
        baseWidth: extent.max[0] - extent.min[0],
        baseHeight: extent.max[1] - extent.min[1],
        baseDepth: extent.max[2] - extent.min[2],
        triangleCount: mesh.triangleCount,
        sourceFormat: "json",
      },
      cadBrep: brep,
      cadBrepFrame: { x: 20, z: -5, elevation: 0, width: 31, depth: 31, height: 10 },
      cadMeshDeflection: OLD_CHAMFILLET,
      edgeTreatmentHistory: [{ id: "entry-1", createdAt: 0, feature: { kind: "chamfillet", amount: 1, edgeCount: 1 }, before }],
    } as WorkplaneShape;
    remesh = async (stored, deflection, capped) => {
      remeshed += 1;
      kernel.releaseAll();
      const body = kernel.fromBREP(stored);
      const meshed = meshTreatedBody(kernel, [body], body, deflection, capped);
      return {
        positions: new Float32Array(meshed.mesh.positions),
        normals: new Float32Array(meshed.mesh.normals),
        indices: new Uint32Array(meshed.mesh.indices),
        deflection: meshed.deflection,
      };
    };
  }, 120_000);

  it("meshes the body again at its treatment's own fineness, in place and in every step of the history", async () => {
    expect(hasOverFineCadMesh(fineShape)).toBe(true);
    expect(relievedCadDeflection(fineShape)).toEqual({ linear: 0.05, angular: 0.16 });
    // Two steps of the history and the design hold the same body: it is meshed once.
    const history = [{ shapes: [fineShape], selectedIds: [] }, { shapes: [{ ...fineShape, x: 40 }], selectedIds: [] }] as unknown as EditorHistoryEntry[];
    remeshed = 0;
    const { project, relieved } = await relieveOverFineCadMeshes({ shapes: [fineShape], history }, remesh);
    expect(remeshed).toBe(1);
    expect(relieved).toBe(1);

    const light = project.shapes[0];
    const oldTriangles = fineShape.importedMesh!.triangleCount;
    expect(light.importedMesh!.triangleCount).toBeLessThan(oldTriangles / 5);
    expect(light.cadMeshDeflection!.linear).toBeCloseTo(0.05, 6);
    expect(hasOverFineCadMesh(light)).toBe(false);
    // The same body: its outline within the coarser facets of the old one, its brep untouched.
    const before = bounds(fineShape.importedMesh!.positions);
    const after = bounds(light.importedMesh!.positions);
    for (let axis = 0; axis < 3; axis += 1) {
      expect(Math.abs(after.min[axis] - before.min[axis])).toBeLessThan(0.06);
      expect(Math.abs(after.max[axis] - before.max[axis])).toBeLessThan(0.06);
    }
    expect(light.cadBrep).toBe(brep);
    expect(light.importedMesh!.normals!.length).toBe(light.importedMesh!.positions.length);
    // The history carries the light mesh too, so the saved design is light; the moved step keeps its own place.
    project.history!.forEach((entry) => expect(entry.shapes[0].importedMesh).toBe(light.importedMesh));
    expect(project.history![1].shapes[0].x).toBe(40);
    // The body the Chamfillet started from had no fine mesh of its own: it is the same object.
    expect(light.edgeTreatmentHistory![0].before).toBe(fineShape.edgeTreatmentHistory![0].before);
  }, 120_000);

  it("leaves a design without such bodies, and a body whose exact body lies in another frame, as they are", async () => {
    const plain = { ...fineShape, cadMeshDeflection: { linear: 0.05, angular: 0.16 } };
    const elsewhere = { ...fineShape, cadBrepFrame: { ...fineShape.cadBrepFrame!, sourceTransform: [1, 0, 0, 3, 0, 1, 0, 0, 0, 0, 1, 0] } };
    remeshed = 0;
    const untouched = { shapes: [plain] };
    expect((await relieveOverFineCadMeshes(untouched, remesh)).project).toBe(untouched);
    expect(remeshed).toBe(0);
    const other = { shapes: [elsewhere] };
    const result = await relieveOverFineCadMeshes(other, remesh);
    expect(result.relieved).toBe(0);
    expect(result.project).toBe(other);
  }, 120_000);
});
