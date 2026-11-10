import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { exactSolidFromMesh } from "@/lib/cadMeshExact";

/*
 * A hull of cylinders (a flange with round ends, #1442) joins corners of their polygons, so its flat sides miss the
 * circles' common tangent by half a polygon step. Rebuilt exact, each side must touch its cylinders, or the kernel
 * refuses every chamfer and fillet round them.
 */

let cad: OcctKernel;
beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
});

function convexHull(points: [number, number][]) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const out: [number, number][] = [];
    for (const q of list) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], q) <= 1e-12) out.pop();
      out.push(q);
    }
    return out.slice(0, -1);
  };
  return half(p).concat(half(p.slice().reverse()));
}

/** The outline stood up `height` high as a closed triangle mesh, facing out. */
function extruded(outline: [number, number][], height: number) {
  const out: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => out.push(...a, ...b, ...c);
  const n = outline.length;
  for (let i = 1; i + 1 < n; i += 1) {
    tri([...outline[0], 0], [...outline[i + 1], 0], [...outline[i], 0]);
    tri([...outline[0], height], [...outline[i], height], [...outline[i + 1], height]);
  }
  for (let i = 0; i < n; i += 1) {
    const a = outline[i], b = outline[(i + 1) % n];
    tri([...a, 0], [...b, 0], [...b, height]);
    tri([...a, 0], [...b, height], [...a, height]);
  }
  return new Float32Array(out);
}

/** The hull of circles, each a polygon of 96 sides as the editor makes a cylinder. */
function hullOfCylinders(circles: [number, number, number][], height: number) {
  const corners = circles.flatMap(([x, y, r]) => Array.from({ length: 96 }, (_, i) => [x + r * Math.cos((i * Math.PI) / 48), y + r * Math.sin((i * Math.PI) / 48)] as [number, number]));
  return extruded(convexHull(corners), height);
}

function edgesAt(solid: ShapeHandle, z: number) {
  return cad.getSubShapes(solid, "edge").filter((edge) => {
    const q = cad.curveParameters(edge);
    return [q.first, q.last].every((t) => Math.abs(cad.curvePointAtParam(edge, t).z - z) < 1e-3);
  });
}

describe("hull of cylinders rebuilt exact", () => {
  // The flange of #1442: a 25 mm disc between two 8 mm ones, 17.25 mm off its middle.
  const flange: [number, number, number][] = [[0, 0, 12.5], [-17.25, 0, 4], [17.25, 0, 4]];

  it("takes a chamfer and a fillet on its rim, all of it or one edge", () => {
    const exact = exactSolidFromMesh(cad, hullOfCylinders(flange, 5));
    expect(exact).not.toBeNull();
    const solid = exact!.solid;
    expect(exact!.report.cylinder).toBeGreaterThan(0);
    const top = edgesAt(solid, 5);
    expect(top.length).toBeGreaterThanOrEqual(8);
    for (const edges of [top, top.slice(0, 1)]) {
      expect(cad.isValid(cad.chamfer(solid, edges, 1))).toBe(true);
      expect(cad.isValid(cad.fillet(solid, edges, 1))).toBe(true);
    }
  });

  it("has flat sides that touch the round ends", () => {
    const solid = exactSolidFromMesh(cad, hullOfCylinders(flange, 5))!.solid;
    const sides = cad.getSubShapes(solid, "face").filter((face) => cad.surfaceType(face) === "plane" && cad.getSurfaceArea(face) < 200);
    expect(sides).toHaveLength(4);
    // A plane touching a 4 mm and a 12.5 mm circle 17.25 mm apart is turned so that n . (big - small) = 12.5 - 4.
    const [big, small] = flange;
    for (const face of sides) {
      const corner = cad.vertexPosition(cad.getSubShapes(face, "vertex")[0]);
      const uv = cad.uvFromPoint(face, corner);
      const n = cad.surfaceNormal(face, uv.u, uv.v);
      const along = Math.abs(n.x * (big[0] - small[0]));
      expect(Math.abs(along - (big[2] - small[2]))).toBeLessThan(1e-6);
    }
  });
});
