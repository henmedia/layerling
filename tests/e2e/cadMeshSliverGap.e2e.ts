import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { cadMeshHasOpenEdges } from "@/lib/cadMeshAccuracy";
import { tessellateWithRuledStrips } from "@/lib/cadRuledStrips";
import { closeFlatMeshGaps, closeSmallMeshHoles, type IndexedMesh } from "@/lib/meshHoleFill";
import type { MeshData, Vec3 } from "@/lib/editorMeshCore";

// The vacuum nozzle of #2053 after a 1 mm chamfer: a capsule, a loft and a tapered tube joined, the tube 0.015 mm beside
// the loft's middle and nearly its size. A valid body, whose crescent faces between the two edges have no sound mesh.
const SLIVERS = readFileSync("tests/fixtures/chamfered-group-sliver-2053.brep", "utf8");
// The edge tool's standard and fine quality; a draft mesh of this body is too coarse round the slivers and stays open.
const QUALITIES = [
  { linearDeflection: 0.05, angularDeflection: 0.16 },
  { linearDeflection: 0.025, angularDeflection: 0.1 },
];

function dataOf(mesh: IndexedMesh): MeshData {
  return {
    name: "nozzle",
    vertices: Array.from({ length: mesh.vertexCount }, (_, vertex) => [...mesh.positions.subarray(vertex * 3, vertex * 3 + 3)] as Vec3),
    faces: Array.from({ length: mesh.triangleCount }, (_, triangle) => [...mesh.indices.subarray(triangle * 3, triangle * 3 + 3)] as [number, number, number]),
  };
}

function volumeOf({ vertices, faces }: MeshData) {
  return faces.reduce((sum, face) => {
    const [a, b, c] = face.map((corner) => vertices[corner]);
    return sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }, 0);
}

describe("a chamfered group with crescent faces hundredths of a millimetre wide (#2053)", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  it.each(QUALITIES)("is meshed whole at $linearDeflection / $angularDeflection", (quality) => {
    const body = cad.fromBREP(SLIVERS);
    const raw = tessellateWithRuledStrips(cad, body, quality);
    expect(cadMeshHasOpenEdges(raw)).toBe(true);
    const closed = closeFlatMeshGaps(raw);
    expect(cadMeshHasOpenEdges(closed)).toBe(false);
    const exact = cad.getVolume(body);
    expect(Math.abs(volumeOf(dataOf(closed)) - exact)).toBeLessThan(exact * 0.02);
    cad.release(body);
  });

  it("closes the mesh a saved design carries, before a cut", () => {
    const body = cad.fromBREP(SLIVERS);
    const repair = closeSmallMeshHoles(dataOf(tessellateWithRuledStrips(cad, body, QUALITIES[0])));
    expect(repair.open).toBe(0);
    expect(repair.closed).toBeGreaterThan(0);
    cad.release(body);
  });
});
