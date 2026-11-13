import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { OcctKernel } from "occt-wasm";
import type { SketchProfile } from "@/types/layerling";
import { cadSketchRegions } from "@/lib/sketchCadProfile";
import { pathWire } from "@/lib/sketchCadWire";
import { SKETCH_CAD_DEFLECTION } from "@/lib/cadModifierRuntime";
import { cadMeshHasOpenEdges } from "@/lib/cadMeshAccuracy";
import { tessellateWithRuledStrips } from "@/lib/cadRuledStrips";

// #1696: the side of an extruded curve meshed in straight strips instead of OCCT's leaning triangles.

let cad: OcctKernel;
const options = { linearDeflection: SKETCH_CAD_DEFLECTION.linear, angularDeflection: SKETCH_CAD_DEFLECTION.angular };

beforeAll(async () => {
  const { OcctKernel } = await import("occt-wasm");
  cad = await OcctKernel.init({ wasm: join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm") });
});

function extrudedSketch(profile: SketchProfile, height: number) {
  const solids = cadSketchRegions(profile).map((region) => {
    let face = cad.makeFace(pathWire(cad, region.outer));
    if (region.holes.length > 0) face = cad.addHolesInFace(face, region.holes.map((hole) => pathWire(cad, hole)));
    return cad.extrude(face, 0, height, 0);
  });
  return solids.length === 1 ? solids[0] : cad.makeCompound(solids);
}

/** The reporter's outline: a straight top 5 mm wide over a smooth dip 1 mm deep, two Bezier curves. */
const dip: SketchProfile = {
  points: [
    { id: "a", x: 0, z: 0, handleIn: { x: 1, z: 0 } },
    { id: "b", x: 5, z: 0, handleOut: { x: 4, z: 0 } },
    { id: "c", x: 2.5, z: 1, handleIn: { x: 3.4, z: 1 }, handleOut: { x: 1.6, z: 1 } },
  ],
  segments: [
    { id: "s0", kind: "line", startId: "a", endId: "b" },
    { id: "s1", kind: "bezier", startId: "b", endId: "c" },
    { id: "s2", kind: "bezier", startId: "c", endId: "a" },
  ],
};

/** A blob of four Bezier curves with a square hole in it. */
const blobWithHole: SketchProfile = {
  points: [
    { id: "n", x: 0, z: -10, handleIn: { x: -6, z: -10 }, handleOut: { x: 7, z: -10 } },
    { id: "e", x: 12, z: 0, handleIn: { x: 12, z: -7 }, handleOut: { x: 12, z: 5 } },
    { id: "s", x: 0, z: 9, handleIn: { x: 8, z: 9 }, handleOut: { x: -5, z: 9 } },
    { id: "w", x: -11, z: 0, handleIn: { x: -11, z: 6 }, handleOut: { x: -11, z: -5 } },
    { id: "h0", x: -3, z: -3 },
    { id: "h1", x: 3, z: -3 },
    { id: "h2", x: 3, z: 3 },
    { id: "h3", x: -3, z: 3 },
  ],
  segments: [
    { id: "o0", kind: "bezier", startId: "n", endId: "e" },
    { id: "o1", kind: "bezier", startId: "e", endId: "s" },
    { id: "o2", kind: "bezier", startId: "s", endId: "w" },
    { id: "o3", kind: "bezier", startId: "w", endId: "n" },
    { id: "i0", kind: "line", startId: "h0", endId: "h1" },
    { id: "i1", kind: "line", startId: "h1", endId: "h2" },
    { id: "i2", kind: "line", startId: "h2", endId: "h3" },
    { id: "i3", kind: "line", startId: "h3", endId: "h0" },
  ],
};

type Meshed = { positions: ArrayLike<number>; indices: ArrayLike<number>; triangleCount: number };

/** The most any side triangle leans off the extrusion (y) direction, in degrees; caps (normal along y) are left out. */
function worstLean(mesh: Meshed) {
  let worst = 0;
  for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
    const p = [0, 1, 2].map((k) => {
      const v = mesh.indices[triangle * 3 + k] * 3;
      return [mesh.positions[v], mesh.positions[v + 1], mesh.positions[v + 2]];
    });
    const u = p[1].map((x, i) => x - p[0][i]);
    const w = p[2].map((x, i) => x - p[0][i]);
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const length = Math.hypot(n[0], n[1], n[2]);
    if (!(length > 0) || Math.abs(n[1]) / length > 0.99) continue;
    worst = Math.max(worst, (Math.asin(Math.abs(n[1]) / length) * 180) / Math.PI);
  }
  return worst;
}

function meshVolume(mesh: Meshed) {
  let volume = 0;
  for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
    const [a, b, c] = [0, 1, 2].map((k) => {
      const v = mesh.indices[triangle * 3 + k] * 3;
      return [mesh.positions[v], mesh.positions[v + 1], mesh.positions[v + 2]];
    });
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return volume;
}

describe("straight strips on extruded curves (#1696)", () => {
  it("meshes the reporter's dip with upright, closed strips of the same volume", () => {
    const kernelMesh = cad.tessellate(extrudedSketch(dip, 20), options);
    const solid = extrudedSketch(dip, 20);
    const mesh = tessellateWithRuledStrips(cad, solid, options);
    // The kernel's own triangles lean; the strips do not.
    expect(worstLean(kernelMesh)).toBeGreaterThan(5);
    expect(worstLean(mesh)).toBeLessThan(0.01);
    expect(cadMeshHasOpenEdges(mesh)).toBe(false);
    expect(mesh.triangleCount).toBeLessThan(kernelMesh.triangleCount);
    const exact = cad.getVolume(solid);
    // As close to the exact body as the kernel's mesh, or closer (measured: 48.785 and 49.004 mm³ of 48.8).
    expect(Math.abs(meshVolume(mesh) - exact)).toBeLessThan(exact * 0.002);
    expect(Math.abs(meshVolume(mesh) - exact)).toBeLessThanOrEqual(Math.abs(meshVolume(kernelMesh) - exact));
    // No point is left that no triangle uses.
    expect(new Set(mesh.indices).size).toBe(mesh.vertexCount);
  });

  it("keeps a curved outline with a hole closed and upright", () => {
    const solid = extrudedSketch(blobWithHole, 15);
    const mesh = tessellateWithRuledStrips(cad, solid, options);
    expect(cadMeshHasOpenEdges(mesh)).toBe(false);
    expect(worstLean(mesh)).toBeLessThan(0.01);
    const exact = cad.getVolume(solid);
    expect(Math.abs(meshVolume(mesh) - exact)).toBeLessThan(exact * 0.01);
  });

  it("leaves a body without extruded curves as the kernel meshed it", () => {
    const box = cad.makeBox(10, 20, 30);
    const kernelMesh = cad.tessellate(cad.makeBox(10, 20, 30), options);
    const mesh = tessellateWithRuledStrips(cad, box, options);
    expect(mesh.triangleCount).toBe(kernelMesh.triangleCount);
    const sphere = cad.makeSphere(8);
    expect(tessellateWithRuledStrips(cad, sphere, options).triangleCount).toBe(cad.tessellate(cad.makeSphere(8), options).triangleCount);
  });
});
