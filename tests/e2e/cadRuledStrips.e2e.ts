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
import { buildSweptSketchSolid } from "@/lib/cadSketchSweep";

// #1696: the side of an extruded curve meshed in straight strips instead of OCCT's leaning triangles, and the faces of
// a sweep in an even grid.

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

/**
 * The reporter's sweep: a lens 1 mm across and 5 mm tall (a straight side and a curve meeting it at both ends) swept
 * along a path of two curves, 11 mm straight down and 6 mm with a slight bend.
 */
const lensSweep: SketchProfile = {
  points: [
    { id: "a", x: -10, z: -10, mode: "split", handleIn: { x: -10, z: -8.5 }, handleOut: { x: -10, z: -9 } },
    { id: "b", x: -9, z: -7.5, mode: "smooth", handleIn: { x: -9, z: -8.5 }, handleOut: { x: -9, z: -6.5 } },
    { id: "c", x: -10, z: -5, mode: "split", handleIn: { x: -10, z: -6 }, handleOut: { x: -10, z: -6.5 } },
    { id: "p0", x: 0, z: 0, mode: "corner", handleOut: { x: 0, z: -4 } },
    { id: "p1", x: 0, z: -11, mode: "smooth", handleIn: { x: 0, z: -8 }, handleOut: { x: 0, z: -14 } },
    { id: "p2", x: 1, z: -17, mode: "corner", handleIn: { x: 2 / 3, z: -15 - 1 / 3 } },
  ],
  segments: [
    { id: "s0", kind: "bezier", startId: "a", endId: "b" },
    { id: "s1", kind: "bezier", startId: "b", endId: "c" },
    { id: "s2", kind: "bezier", startId: "c", endId: "a" },
    { id: "q0", kind: "bezier", startId: "p0", endId: "p1", construction: true },
    { id: "q1", kind: "bezier", startId: "p1", endId: "p2", construction: true },
  ],
};

/** How far any triangle tilts off the exact surface nearest its middle, in degrees (either way round). */
function worstTilt(shape: ReturnType<OcctKernel["makeBox"]>, mesh: Meshed) {
  const faces = cad.getSubShapes(shape, "face");
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
    if (!(length > 0)) continue;
    const middle = { x: (p[0][0] + p[1][0] + p[2][0]) / 3, y: (p[0][1] + p[1][1] + p[2][1]) / 3, z: (p[0][2] + p[1][2] + p[2][2]) / 3 };
    // Where two faces meet at a knife edge (the lens's tips) both lie as near: the one the triangle lies on counts.
    const near = faces.map((face) => {
      const on = cad.projectPointOnFace(face, middle);
      const uv = cad.uvFromPoint(face, on);
      const normal = cad.surfaceNormal(face, uv.u, uv.v);
      const dot = Math.abs(n[0] * normal.x + n[1] * normal.y + n[2] * normal.z) / length;
      return { gap: Math.hypot(on.x - middle.x, on.y - middle.y, on.z - middle.z), tilt: (Math.acos(Math.min(1, dot)) * 180) / Math.PI };
    });
    const nearest = Math.min(...near.map((entry) => entry.gap));
    const tilt = Math.min(...near.filter((entry) => entry.gap <= nearest + 0.02).map((entry) => entry.tilt));
    worst = Math.max(worst, tilt);
  }
  return worst;
}

describe("an even grid on the faces of a sweep (#1696)", () => {
  it("meshes the reporter's sweep with triangles that lie on the surface, closed and of the same volume", () => {
    const solid = buildSweptSketchSolid(cad, lensSweep);
    const kernelMesh = cad.tessellate(buildSweptSketchSolid(cad, lensSweep), options);
    const mesh = tessellateWithRuledStrips(cad, solid, options);
    // Measured: the kernel's triangles tilt up to 11.2 degrees off the surface, the grid's 1.2.
    expect(worstTilt(solid, kernelMesh)).toBeGreaterThan(7);
    expect(worstTilt(solid, mesh)).toBeLessThan(3);
    expect(cadMeshHasOpenEdges(mesh)).toBe(false);
    const exact = cad.getVolume(solid);
    expect(Math.abs(meshVolume(mesh) - exact)).toBeLessThan(exact * 0.01);
    expect(new Set(mesh.indices).size).toBe(mesh.vertexCount);
    // Every new point has a normal to shade with.
    for (let vertex = 0; vertex < mesh.vertexCount; vertex += 1) {
      expect(Math.hypot(mesh.normals[vertex * 3], mesh.normals[vertex * 3 + 1], mesh.normals[vertex * 3 + 2])).toBeGreaterThan(0.5);
    }
  });

  it("keeps the sweep closed with a hole cut through it", () => {
    const hole = cad.translate(cad.makeBox(4, 0.8, 0.8), -1.5, 2.1, -8.4);
    const solid = cad.cut(buildSweptSketchSolid(cad, lensSweep), hole);
    const mesh = tessellateWithRuledStrips(cad, solid, options);
    expect(cadMeshHasOpenEdges(mesh)).toBe(false);
    const exact = cad.getVolume(solid);
    expect(exact).toBeLessThan(cad.getVolume(buildSweptSketchSolid(cad, lensSweep)) - 0.1);
    expect(Math.abs(meshVolume(mesh) - exact)).toBeLessThan(exact * 0.01);
  });

  it("leaves a filleted box as the kernel meshed it", () => {
    const filleted = () => {
      const box = cad.makeBox(20, 10, 8);
      return cad.fillet(box, cad.getSubShapes(box, "edge"), 2);
    };
    expect(tessellateWithRuledStrips(cad, filleted(), options).triangleCount).toBe(cad.tessellate(filleted(), options).triangleCount);
  });
});
