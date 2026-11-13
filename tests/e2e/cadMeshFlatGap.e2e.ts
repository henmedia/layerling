import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { cadMeshHasOpenEdges } from "@/lib/cadMeshAccuracy";
import { tessellateWithRuledStrips } from "@/lib/cadRuledStrips";
import { closeFlatMeshGaps } from "@/lib/meshHoleFill";

// The group of #1711 (a bent tube, ellipses and a cylinder joined) after a 2 mm chamfer on one edge: a valid body
// whose mesh left three flat faces - half an ellipse on top and two small faces beside the chamfer - without a triangle.
const GAPPED = readFileSync("tests/fixtures/chamfered-group-gap-1711.brep", "utf8");
// The edge tool's standard quality, as the reporter's file was meshed.
const STANDARD = { linearDeflection: 0.05, angularDeflection: 0.16 };

function meshVolume(mesh: { positions: ArrayLike<number>; indices: ArrayLike<number>; triangleCount: number }) {
  let volume = 0;
  for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
    const [a, b, c] = [0, 1, 2].map((corner) => {
      const at = mesh.indices[triangle * 3 + corner] * 3;
      return [mesh.positions[at], mesh.positions[at + 1], mesh.positions[at + 2]];
    });
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return volume;
}

describe("a chamfered group whose mesh left flat faces out (#1711)", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  it("had an open mesh as the kernel made it", () => {
    const body = cad.fromBREP(GAPPED);
    expect(cad.isValid(body)).toBe(true);
    expect(cadMeshHasOpenEdges(tessellateWithRuledStrips(cad, body, STANDARD))).toBe(true);
    cad.release(body);
  });

  it("is closed with its flat faces capped, at the exact body's volume", () => {
    const body = cad.fromBREP(GAPPED);
    const raw = tessellateWithRuledStrips(cad, body, STANDARD);
    const closed = closeFlatMeshGaps(raw);
    expect(cadMeshHasOpenEdges(closed)).toBe(false);
    // The kernel's own triangles stay as they were; the caps come after them.
    expect(Array.from(closed.indices.subarray(0, raw.indices.length))).toEqual(Array.from(raw.indices));
    // Within the chord the edge tool allows: 2892.2 of 2894.1 mm3, where the open mesh had 2785.
    const exact = cad.getVolume(body);
    expect(Math.abs(meshVolume(closed) - exact)).toBeLessThan(exact * 0.002);
    expect(Math.abs(meshVolume(raw) - exact)).toBeGreaterThan(exact * 0.03);
    cad.release(body);
  });

  it("leaves a closed mesh as it is", () => {
    const box = cad.makeBox(20, 10, 5);
    const edges = cad.getSubShapes(box, "edge");
    const chamfered = cad.chamfer(box, edges.slice(0, 4), 1);
    const mesh = tessellateWithRuledStrips(cad, chamfered, STANDARD);
    expect(closeFlatMeshGaps(mesh)).toBe(mesh);
  });
});
