import { beforeAll, describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OcctKernel } from "occt-wasm";
import { buildSketchLoftSolid, SKETCH_LOFT_HOLES, SKETCH_LOFT_OUTLINES, SKETCH_LOFT_STROKE_UNSUPPORTED, type SketchLoftPlace } from "@/lib/cadSketchLoft";
import type { SketchPoint, SketchProfile, SketchSegment, SketchStroke } from "@/types/layerling";

const K = 0.5522847498;

/** A rectangle round (cx, cz), `ring` naming its points so that several fit in one sketch. */
function rectangle(width: number, depth: number, cx = 0, cz = 0, ring = "r"): SketchProfile {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const points: SketchPoint[] = corners.map(([sx, sz], index) => ({ id: `${ring}${index}`, x: cx + (sx * width) / 2, z: cz + (sz * depth) / 2, mode: "corner" }));
  const segments: SketchSegment[] = corners.map((_, index) => ({ id: `${ring}s${index}`, kind: "line", startId: `${ring}${index}`, endId: `${ring}${(index + 1) % 4}` }));
  return { points, segments };
}

/** A circle of four Bezier quarters, as the sketch draws one. */
function circle(radius: number, cx = 0, cz = 0, ring = "c"): SketchProfile {
  const at = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const points: SketchPoint[] = at.map(([x, z], index) => ({
    id: `${ring}${index}`,
    x: cx + x * radius,
    z: cz + z * radius,
    mode: "smooth",
    handleIn: { x: cx + x * radius + z * radius * K, z: cz + z * radius - x * radius * K },
    handleOut: { x: cx + x * radius - z * radius * K, z: cz + z * radius + x * radius * K },
  }));
  const segments: SketchSegment[] = at.map((_, index) => ({ id: `${ring}s${index}`, kind: "bezier", startId: `${ring}${index}`, endId: `${ring}${(index + 1) % 4}` }));
  return { points, segments };
}

function joined(...profiles: SketchProfile[]): SketchProfile {
  return { points: profiles.flatMap((profile) => profile.points), segments: profiles.flatMap((profile) => profile.segments) };
}

const at = (y: number, extra: Partial<SketchLoftPlace> = {}): SketchLoftPlace => ({ centerX: 0, centerZ: 0, x: 0, z: 0, y, rotation: 0, ...extra });

/** The loft of two sketches, the bottom one placed by `lower`, the top one by `upper`. */
const loft = (cad: OcctKernel, bottom: SketchProfile, top: SketchProfile, lower: SketchLoftPlace, upper: SketchLoftPlace, stroke?: SketchStroke) =>
  buildSketchLoftSolid(cad, { profile: bottom, place: lower, ...(stroke ? { stroke } : {}) }, { profile: top, place: upper, ...(stroke ? { stroke } : {}) });

describe("a loft between two sketches with the real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  it("lofts a square into a smaller square as a frustum", () => {
    const solid = loft(kernel, rectangle(20, 20), rectangle(10, 10), at(0), at(10));
    expect(kernel.isValid(solid)).toBe(true);
    // A frustum: h/3 (A1 + A2 + sqrt(A1 A2)).
    expect(kernel.getVolume(solid)).toBeCloseTo((10 / 3) * (400 + 100 + 200), 3);
    // Straight walls: six plane faces.
    expect(kernel.getSubShapes(solid, "face")).toHaveLength(6);
  });

  it("puts each outline where its body stands, also turned and drawn away from the middle", () => {
    // The top sketch is drawn round (50, 50) and stands at (30, -10), turned by 90 degrees.
    const solid = loft(kernel, rectangle(40, 20), rectangle(20, 10, 50, 50), at(2), at(12, { centerX: 50, centerZ: 50, x: 30, z: -10, rotation: 90 }));
    const box = kernel.getBoundingBox(solid, true);
    expect(box.ymin).toBeCloseTo(2, 5);
    expect(box.ymax).toBeCloseTo(12, 5);
    expect(box.xmin).toBeCloseTo(-20, 5);
    // Turned, the 20 x 10 top is 10 across and 20 along: x 25 to 35.
    expect(box.xmax).toBeCloseTo(35, 5);
    expect(box.zmin).toBeCloseTo(-20, 5);
    expect(box.zmax).toBeCloseTo(10, 5);
  });

  it("lofts a rectangle into a circle", () => {
    const solid = loft(kernel, rectangle(30, 30), circle(10), at(0), at(20));
    expect(kernel.isValid(solid)).toBe(true);
    const volume = kernel.getVolume(solid);
    // Between the prism of the square (18 000) and the cylinder of the circle (6 283).
    expect(volume).toBeGreaterThan(8000);
    expect(volume).toBeLessThan(16000);
    const box = kernel.getBoundingBox(solid, true);
    expect(box.ymax - box.ymin).toBeCloseTo(20, 4);
  });

  it("lofts the hole of a ring too, so two frames give a hollow wall", () => {
    const lower = joined(rectangle(60, 30, 0, 0, "o"), rectangle(56, 26, 0, 0, "i"));
    const upper = joined(rectangle(40, 20, 0, 0, "o"), rectangle(36, 16, 0, 0, "i"));
    const solid = loft(kernel, lower, upper, at(0), at(30));
    expect(kernel.isValid(solid)).toBe(true);
    // Prismatoids: h/6 (bottom + top + 4 x the section halfway up).
    const outer = (30 / 6) * (60 * 30 + 40 * 20 + 4 * 50 * 25);
    const inner = (30 / 6) * (56 * 26 + 36 * 16 + 4 * 46 * 21);
    expect(kernel.getVolume(solid)).toBeCloseTo(outer - inner, 2);
  });

  it("lofts two lines with a width as the walls they are, their round corners arcs", () => {
    const wall: SketchStroke = { width: 2, align: "outside", join: "round", cap: "flat" };
    const solid = loft(kernel, rectangle(80, 30), rectangle(50, 20), at(0), at(30, { x: 10 }), wall);
    expect(kernel.isValid(solid)).toBe(true);
    const box = kernel.getBoundingBox(solid, true);
    expect(box.xmin).toBeCloseTo(-42, 4);
    expect(box.xmax).toBeCloseTo(42, 4);
    expect(box.ymax).toBeCloseTo(30, 4);
    // Four sides and four rounded corners outside, four sides inside: 12 walls and the two rims, not hundreds of facets.
    expect(kernel.getSubShapes(solid, "face")).toHaveLength(14);
    // A line with bevelled corners is left to the straight pieces.
    expect(() => loft(kernel, rectangle(80, 30), rectangle(50, 20), at(0), at(30), { ...wall, join: "bevel" })).toThrow(SKETCH_LOFT_STROKE_UNSUPPORTED);
  });

  it("refuses sketches with more than one outline, or with holes that do not match", () => {
    expect(() => loft(kernel, joined(rectangle(10, 10, 0, 0, "a"), rectangle(10, 10, 30, 0, "b")), rectangle(10, 10), at(0), at(10))).toThrow(SKETCH_LOFT_OUTLINES);
    expect(() => loft(kernel, joined(rectangle(20, 20, 0, 0, "o"), rectangle(10, 10, 0, 0, "i")), rectangle(20, 20), at(0), at(10))).toThrow(SKETCH_LOFT_HOLES);
  });
});
