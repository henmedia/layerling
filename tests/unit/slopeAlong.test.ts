import { describe, expect, it } from "vitest";
import { narrowCurveForShape, narrowHalfWidthAt, normalizeSlopeFrom, normalizeSlopeSide, shapeHasAlongDeform, shapeHasNarrow, shapeHasSideDrop, shapeHasSlope, shapeHasSymmetricDeform, sideDropCurveForShape, slopeCurveForShape, slopeDistance, slopeEndHeight, slopeMesh, slopeTopAt, slopeTopAtDistance } from "@/lib/slopeAlong";
import type { WorkplaneShape } from "@/types/layerling";

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `s-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 40, width: 30, depth: 40, height: 20, rotation: 0, color: "#888888", ...extra } as WorkplaneShape;
}

describe("slope along", () => {
  it("is on only for the kinds it suits, with a lower end", () => {
    expect(shapeHasSlope(shape("box", { slopeEnd: 8 }))).toBe(true);
    expect(shapeHasSlope(shape("roundRoof", { slopeEnd: 8 }))).toBe(true);
    expect(shapeHasSlope(shape("box", { slopeEnd: 20 }))).toBe(false);
    expect(shapeHasSlope(shape("box"))).toBe(false);
    expect(shapeHasSlope(shape("cylinder", { slopeEnd: 8 }))).toBe(true);
    expect(shapeHasSlope(shape("sphere", { slopeEnd: 8 }))).toBe(false);
    expect(shapeHasNarrow(shape("tube", { narrowEnd: 8 }))).toBe(false);
    expect(normalizeSlopeSide("wedge", "right")).toBe("back");
  });

  it("keeps the lower end between 0.2 mm and the body's height", () => {
    expect(slopeEndHeight(shape("box", { slopeEnd: -3 }))).toBe(0.2);
    expect(slopeEndHeight(shape("box", { slopeEnd: 50 }))).toBe(20);
  });

  it("lets a round roof slope only along its length", () => {
    expect(normalizeSlopeSide("roundRoof", "left")).toBe("back");
    expect(normalizeSlopeSide("box", "left")).toBe("left");
  });

  it("runs the top straight, bulging or sagging between the two ends, never above or below them", () => {
    for (const slopeCurve of [0, 0.5, 1, -0.5, -1]) {
      const curve = slopeCurveForShape(shape("box", { slopeEnd: 8, slopeCurve }));
      expect(slopeTopAt(curve, 0)).toBeCloseTo(20, 9);
      expect(slopeTopAt(curve, 40)).toBeCloseTo(8, 9);
      for (let s = 0; s <= 40; s += 0.5) {
        const top = slopeTopAt(curve, s);
        expect(top).toBeLessThanOrEqual(20 + 1e-9);
        expect(top).toBeGreaterThanOrEqual(8 - 1e-9);
      }
      const middle = slopeTopAt(curve, 20);
      if (slopeCurve === 0) expect(middle).toBeCloseTo(14, 9);
      if (slopeCurve > 0) expect(middle).toBeGreaterThan(14);
      if (slopeCurve < 0) expect(middle).toBeLessThan(14);
    }
  });

  it("measures the distance from the kept end on every side (the back is the small z)", () => {
    const min = { x: -15, z: -20 };
    const max = { x: 15, z: 20 };
    expect(slopeDistance("back", 0, 20, min, max, 40)).toBeCloseTo(0, 9);
    expect(slopeDistance("back", 0, -20, min, max, 40)).toBeCloseTo(40, 9);
    expect(slopeDistance("front", 0, 20, min, max, 40)).toBeCloseTo(40, 9);
    expect(slopeDistance("right", 15, 0, min, max, 30)).toBeCloseTo(30, 9);
    expect(slopeDistance("left", 15, 0, min, max, 30)).toBeCloseTo(0, 9);
  });

  it("lowers a mesh's corners by the top's height at their place", () => {
    const source = shape("box", { slopeEnd: 5, slopeSide: "right" });
    const vertices: Array<[number, number, number]> = [[-15, 0, 0], [15, 0, 0], [15, 20, 0], [-15, 20, 0]];
    const { vertices: out } = slopeMesh(vertices, [[0, 1, 2], [0, 2, 3]], source);
    expect(out[2][1]).toBeCloseTo(5, 9);
    expect(out[3][1]).toBeCloseTo(20, 9);
    expect(out[1][1]).toBeCloseTo(0, 9);
  });

  it("narrows from where it starts to the end, never wider or narrower than the two widths", () => {
    expect(shapeHasNarrow(shape("box", { narrowEnd: 10 }))).toBe(true);
    expect(shapeHasNarrow(shape("box", { narrowEnd: 30 }))).toBe(false);
    for (const narrowCurve of [0, 1, -1]) {
      const curve = narrowCurveForShape(shape("box", { narrowEnd: 6, narrowStart: 0.5, narrowCurve }));
      expect(narrowHalfWidthAt(curve, 0)).toBeCloseTo(15, 9);
      expect(narrowHalfWidthAt(curve, 20)).toBeCloseTo(15, 9);
      expect(narrowHalfWidthAt(curve, 40)).toBeCloseTo(3, 9);
      for (let s = 20; s <= 40; s += 0.5) {
        expect(narrowHalfWidthAt(curve, s)).toBeLessThanOrEqual(15 + 1e-9);
        expect(narrowHalfWidthAt(curve, s)).toBeGreaterThanOrEqual(3 - 1e-9);
      }
    }
  });
});

type Vec3 = [number, number, number];

/** A closed box of 30 (x) by 40 (z) by 20, bottom on y = 0, as 12 triangles. */
function boxMesh() {
  const vertices: Vec3[] = [];
  for (const y of [0, 20]) for (const z of [-20, 20]) for (const x of [-15, 15]) vertices.push([x, y, z]);
  const quad = (a: number, b: number, c: number, d: number): Array<[number, number, number]> => [[a, b, c], [a, c, d]];
  const faces = [
    ...quad(0, 2, 3, 1), ...quad(4, 5, 7, 6),
    ...quad(0, 1, 5, 4), ...quad(2, 6, 7, 3),
    ...quad(0, 4, 6, 2), ...quad(1, 3, 7, 5),
  ];
  return { vertices, faces };
}

/** The highest y of the vertices that lie at x (or z) = value. */
function topAt(vertices: Vec3[], axis: 0 | 2, value: number) {
  const near = vertices.filter((vertex) => Math.abs(vertex[axis] - value) < 1e-6);
  return near.length ? Math.max(...near.map((vertex) => vertex[1])) : null;
}

describe("slope from the middle", () => {
  it("keeps the old slope exactly as it was when nothing new is set", () => {
    const { vertices, faces } = boxMesh();
    for (const extra of [{ slopeEnd: 6, slopeSide: "back" as const }, { slopeEnd: 4, slopeSide: "right" as const, slopeCurve: -0.6 }, { slopeEnd: 8, slopeCurve: 0.5 }]) {
      const plain = slopeMesh(vertices, faces, shape("box", extra));
      const explicit = slopeMesh(vertices, faces, shape("box", { ...extra, slopeFrom: "end", sideDrop: 0, sideCurve: 0 }));
      expect(explicit).toEqual(plain);
    }
  });

  it("holds the full height in the middle and the end height at both ends, the two halves mirror images", () => {
    for (const slopeCurve of [0, 0.6, -0.6]) {
      const source = shape("box", { slopeEnd: 6, slopeSide: "back", slopeFrom: "middle", slopeCurve });
      const mesh = boxMesh();
      const out = slopeMesh(mesh.vertices, mesh.faces, source).vertices;
      expect(topAt(out, 2, 0)).toBeCloseTo(20, 9);
      expect(topAt(out, 2, -20)).toBeCloseTo(6, 9);
      expect(topAt(out, 2, 20)).toBeCloseTo(6, 9);
      // The two halves are mirror images: where there are vertices on both sides at the same distance, they stand equally high.
      let pairs = 0;
      for (const z of new Set(out.map(([, , value]) => Math.round(value * 1e6) / 1e6))) {
        if (z <= 0) continue;
        const here = topAt(out, 2, z);
        const there = topAt(out, 2, -z);
        if (here === null || there === null) continue;
        pairs += 1;
        expect(here).toBeCloseTo(there, 6);
      }
      // A straight slope has few cuts (the two ends only); a curved one is cut often.
      expect(pairs).toBeGreaterThan(slopeCurve === 0 ? 0 : 5);
    }
  });

  it("runs across the width when the slope side is left or right", () => {
    const mesh = boxMesh();
    const out = slopeMesh(mesh.vertices, mesh.faces, shape("box", { slopeEnd: 8, slopeSide: "right", slopeFrom: "middle" })).vertices;
    expect(topAt(out, 0, 0)).toBeCloseTo(20, 9);
    expect(topAt(out, 0, -15)).toBeCloseTo(8, 9);
    expect(topAt(out, 0, 15)).toBeCloseTo(8, 9);
  });

  it("stays a closed body: every edge belongs to two triangles", () => {
    for (const slopeCurve of [0, 0.7, -0.7]) {
      const mesh = boxMesh();
      const out = slopeMesh(mesh.vertices, mesh.faces, shape("box", { slopeEnd: 5, slopeSide: "front", slopeFrom: "middle", slopeCurve }));
      const key = (v: number) => out.vertices[v].map((c) => Math.round(c * 1e5)).join(",");
      const edges = new Map<string, number>();
      for (const face of out.faces) {
        for (let i = 0; i < 3; i += 1) {
          const a = key(face[i]);
          const b = key(face[(i + 1) % 3]);
          const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
          edges.set(edge, (edges.get(edge) ?? 0) + 1);
        }
      }
      expect([...edges.values()].every((count) => count === 2)).toBe(true);
    }
  });

  it("measures the top from the middle, symmetric about it", () => {
    const curve = slopeCurveForShape(shape("box", { slopeEnd: 6, slopeSide: "back", slopeFrom: "middle", slopeCurve: 0.4 }));
    expect(curve.middle).toBe(true);
    expect(curve.length).toBe(20);
    for (const offset of [0, 3, 9, 20]) {
      expect(slopeTopAtDistance(curve, 20 + offset)).toBeCloseTo(slopeTopAtDistance(curve, 20 - offset), 9);
    }
    expect(slopeTopAtDistance(curve, 20)).toBeCloseTo(20, 9);
    expect(slopeTopAtDistance(curve, 0)).toBeCloseTo(6, 9);
  });

  it("has no exact CAD body yet", () => {
    expect(shapeHasSymmetricDeform(shape("box", { slopeEnd: 6, slopeFrom: "middle" }))).toBe(true);
    expect(shapeHasSymmetricDeform(shape("box", { slopeEnd: 6 }))).toBe(false);
  });
});

describe("side drop", () => {
  it("is on only with a drop above zero, for the kinds a slope suits", () => {
    expect(shapeHasSideDrop(shape("box", { sideDrop: 3 }))).toBe(true);
    expect(shapeHasSideDrop(shape("box", { sideDrop: 0 }))).toBe(false);
    expect(shapeHasSideDrop(shape("box"))).toBe(false);
    expect(shapeHasSideDrop(shape("sphere", { sideDrop: 3 }))).toBe(false);
    expect(shapeHasAlongDeform(shape("box", { sideDrop: 3 }))).toBe(true);
  });

  it("lowers the two longer sides evenly across the shorter way", () => {
    const source = shape("box", { sideDrop: 5 });
    const curve = sideDropCurveForShape(source);
    // 30 wide, 40 deep: the long sides are the ones at x = +-15, so the line runs across the width
    expect(curve.length).toBe(15);
    const mesh = boxMesh();
    const out = slopeMesh(mesh.vertices, mesh.faces, source).vertices;
    expect(topAt(out, 0, 0)).toBeCloseTo(20, 9);
    expect(topAt(out, 0, -15)).toBeCloseTo(15, 9);
    expect(topAt(out, 0, 15)).toBeCloseTo(15, 9);
  });

  it("keeps the body's height above the floor for any curve, never above the full height", () => {
    for (const sideCurve of [0, 1, -1, 0.5]) {
      const source = shape("box", { sideDrop: 8, sideCurve });
      const mesh = boxMesh();
      const out = slopeMesh(mesh.vertices, mesh.faces, source).vertices;
      for (const [, y] of out) {
        expect(y).toBeGreaterThanOrEqual(-1e-9);
        expect(y).toBeLessThanOrEqual(20 + 1e-9);
      }
      expect(topAt(out, 0, 0)).toBeCloseTo(20, 9);
      expect(topAt(out, 0, 15)).toBeCloseTo(12, 9);
    }
  });

  it("adds its drop to a slope's where both are set", () => {
    const source = shape("box", { sideDrop: 4, slopeEnd: 10, slopeSide: "back" });
    const mesh = boxMesh();
    const out = slopeMesh(mesh.vertices, mesh.faces, source).vertices;
    // the high end's middle keeps everything, its edge loses 4; the low end's middle loses 10, its edge 14
    expect(out.some(([x, y, z]) => Math.abs(x - 15) < 1e-6 && Math.abs(z - 20) < 1e-6 && Math.abs(y - 16) < 1e-6)).toBe(true);
    expect(out.some(([x, y, z]) => Math.abs(x - 15) < 1e-6 && Math.abs(z + 20) < 1e-6 && Math.abs(y - 6) < 1e-6)).toBe(true);
    expect(out.some(([x, y, z]) => Math.abs(x) < 1e-6 && Math.abs(z + 20) < 1e-6 && Math.abs(y - 10) < 1e-6)).toBe(true);
  });
});

describe("side drop: a closed body", () => {
  it("stays closed: every edge belongs to two triangles, with and without a slope", () => {
    for (const extra of [{ sideDrop: 5 }, { sideDrop: 6, sideCurve: 0.6 }, { sideDrop: 4, sideCurve: -0.6, slopeEnd: 8, slopeSide: "back" as const }]) {
      const mesh = boxMesh();
      const out = slopeMesh(mesh.vertices, mesh.faces, shape("box", extra));
      const key = (v: number) => out.vertices[v].map((c) => Math.round(c * 1e5)).join(",");
      const edges = new Map<string, number>();
      for (const face of out.faces) {
        for (let i = 0; i < 3; i += 1) {
          const a = key(face[i]);
          const b = key(face[(i + 1) % 3]);
          const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
          edges.set(edge, (edges.get(edge) ?? 0) + 1);
        }
      }
      expect([...edges.values()].every((count) => count === 2)).toBe(true);
    }
  });

  it("has no exact CAD body: it stays its display mesh", () => {
    expect(shapeHasSymmetricDeform(shape("box", { sideDrop: 3 }))).toBe(true);
  });
});

describe("side drop on a body drawn at unit size", () => {
  // The display builds a box one unit across and stretches it afterwards: the drop is still worked out in millimetres.
  it("lowers the edges by the same share as on the body in millimetres", () => {
    const unit = (sideCurve: number) => {
      const vertices: Vec3[] = [];
      for (const y of [0, 1]) for (const z of [-0.5, 0.5]) for (const x of [-0.5, 0.5]) vertices.push([x, y, z]);
      const faces = boxMesh().faces;
      return slopeMesh(vertices, faces, shape("box", { sideDrop: 5, sideCurve }));
    };
    for (const sideCurve of [0, 0.6, -0.6]) {
      const mm = boxMesh();
      const real = slopeMesh(mm.vertices, mm.faces, shape("box", { sideDrop: 5, sideCurve })).vertices;
      const small = unit(sideCurve).vertices;
      // the box is 30 wide and 40 deep: the long sides are at x = +-15, one unit box at x = +-0.5; heights as a share of 20 and of 1
      expect(topAt(small, 0, 0)).toBeCloseTo(1, 9);
      expect(topAt(small, 0, 0.5)).toBeCloseTo(topAt(real, 0, 15)! / 20, 9);
      expect(topAt(small, 0, -0.5)).toBeCloseTo(topAt(real, 0, -15)! / 20, 9);
    }
  });
});

describe("slope arched from its middle", () => {
  const arch = (slopeCurve: number, extra: Partial<WorkplaneShape> = {}) => shape("box", { slopeEnd: 8, slopeSide: "back", slopeFrom: "arch", slopeCurve, ...extra });

  it("is the plain straight slope when the curve is 0", () => {
    const { vertices, faces } = boxMesh();
    const straight = slopeMesh(vertices, faces, shape("box", { slopeEnd: 8, slopeSide: "back" }));
    expect(slopeMesh(vertices, faces, arch(0))).toEqual(straight);
  });

  it("keeps the two end heights and bends the line evenly about its middle", () => {
    for (const slopeCurve of [0.3, 0.6, 1, -0.3, -0.6, -1]) {
      const curve = slopeCurveForShape(arch(slopeCurve));
      expect(curve.middle).toBeUndefined();
      expect(slopeTopAt(curve, 0)).toBeCloseTo(20, 9);
      expect(slopeTopAt(curve, 40)).toBeCloseTo(8, 9);
      // the line lifts or sags by the same amount, mirrored, at equal distances either side of its middle
      const line = (s: number) => 20 - (12 * s) / 40;
      for (const offset of [4, 10, 17]) {
        const before = slopeTopAt(curve, 20 - offset) - line(20 - offset);
        const after = slopeTopAt(curve, 20 + offset) - line(20 + offset);
        expect(before).toBeCloseTo(after, 9);
        expect(Math.sign(before)).toBe(Math.sign(slopeCurve));
      }
      // never above the body or below the lower end
      for (let s = 0; s <= 40; s += 0.5) {
        const top = slopeTopAt(curve, s);
        expect(top).toBeLessThanOrEqual(20 + 1e-9);
        expect(top).toBeGreaterThanOrEqual(8 - 1e-9);
      }
    }
  });

  it("reaches a quarter of the drop above the straight line in the middle at full curve, and goes level at the high end", () => {
    const curve = slopeCurveForShape(arch(1));
    expect(slopeTopAt(curve, 20) - 14).toBeCloseTo((20 - 8) / 4, 9);
    expect(slopeTopAt(curve, 0) - slopeTopAt(curve, 0.5)).toBeLessThan(0.01);
  });

  it("is cut often enough along the mesh to follow the arch", () => {
    const mesh = boxMesh();
    const out = slopeMesh(mesh.vertices, mesh.faces, arch(0.8)).vertices;
    const zs = new Set(out.map(([, , z]) => Math.round(z * 1e6) / 1e6));
    expect(zs.size).toBeGreaterThan(8);
    expect(topAt(out, 2, 20)).toBeCloseTo(20, 9);
    expect(topAt(out, 2, -20)).toBeCloseTo(8, 9);
  });

  it("is not a symmetric deformation, and is read from a saved value only when valid", () => {
    expect(shapeHasSymmetricDeform(arch(0.5))).toBe(false);
    expect(normalizeSlopeFrom("arch")).toBe("arch");
    expect(normalizeSlopeFrom("middle")).toBe("middle");
    expect(normalizeSlopeFrom("nonsense")).toBe("end");
    expect(normalizeSlopeFrom(undefined)).toBe("end");
  });
});

