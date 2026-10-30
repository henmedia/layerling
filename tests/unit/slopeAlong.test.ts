import { describe, expect, it } from "vitest";
import { narrowCurveForShape, narrowHalfWidthAt, normalizeSlopeSide, shapeHasNarrow, shapeHasSlope, slopeCurveForShape, slopeDistance, slopeEndHeight, slopeMesh, slopeTopAt } from "@/lib/slopeAlong";
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
