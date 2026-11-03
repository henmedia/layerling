import { describe, expect, it } from "vitest";
import { normalizeOverhangAngle, overhangArea } from "@/lib/overhang";

type V = [number, number, number];

/** An axis-aligned box as 12 outward triangles, y up. */
function box(min: V, max: V) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const vertices: V[] = [
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
  ];
  const faces: V[] = [
    [0, 1, 2], [0, 2, 3], // bottom, facing -y
    [4, 6, 5], [4, 7, 6], // top
    [0, 4, 5], [0, 5, 1], // z0
    [3, 2, 6], [3, 6, 7], // z1
    [0, 3, 7], [0, 7, 4], // x0
    [1, 5, 6], [1, 6, 2], // x1
  ];
  return { vertices, faces };
}

/** A wedge: a ramp that leans out over the plate by `run` over its height. */
function overhangingRamp(height: number, run: number) {
  // Cross-section in x/y; the left side runs from (0, 0) up to (run, height).
  const depth = 10;
  const section: [number, number][] = [[0, 0], [10, 0], [10 + run, height], [run, height]];
  const vertices: V[] = [];
  section.forEach(([x, y]) => vertices.push([x, y, 0]));
  section.forEach(([x, y]) => vertices.push([x, y, depth]));
  const faces: V[] = [
    [0, 2, 1], [0, 3, 2], // front cap at z = 0, facing -z
    [4, 5, 6], [4, 6, 7], // back cap
    [0, 1, 5], [0, 5, 4], // bottom on the plate
    [1, 2, 6], [1, 6, 5], // right side, leans out
    [2, 3, 7], [2, 7, 6], // top
    [3, 0, 4], [3, 4, 7], // left side: underside of the lean
  ];
  return { vertices, faces };
}

describe("overhangArea", () => {
  it("finds nothing on a box standing on the plate", () => {
    const { vertices, faces } = box([0, 0, 0], [20, 20, 20]);
    expect(overhangArea(vertices, faces).areaMm2).toBe(0);
  });

  it("counts the underside of a box floating above the plate", () => {
    const { vertices, faces } = box([0, 5, 0], [20, 25, 20]);
    const result = overhangArea(vertices, faces);
    expect(result.areaMm2).toBeCloseTo(400, 6);
    expect(result.lowestY).toBe(5);
  });

  it("does not care which way the triangles are wound", () => {
    const { vertices, faces } = box([0, 5, 0], [20, 25, 20]);
    const inside = faces.map(([a, b, c]) => [a, c, b] as V);
    expect(overhangArea(vertices, inside).areaMm2).toBeCloseTo(400, 6);
  });

  it("flags a lean steeper than the angle and passes a gentler one", () => {
    // Leaning 60° from vertical: run = height * tan(60°)
    const steep = overhangingRamp(10, 10 * Math.tan((60 * Math.PI) / 180));
    expect(overhangArea(steep.vertices, steep.faces, 45).areaMm2).toBeGreaterThan(0);
    // Leaning 30° from vertical
    const gentle = overhangingRamp(10, 10 * Math.tan((30 * Math.PI) / 180));
    expect(overhangArea(gentle.vertices, gentle.faces, 45).areaMm2).toBe(0);
    // The 60° lean passes once the printer manages 65°
    expect(overhangArea(steep.vertices, steep.faces, 55).areaMm2).toBeGreaterThan(0);
    expect(overhangArea(steep.vertices, steep.faces, 65).areaMm2).toBe(0);
  });

  it("does not mark a face that lies exactly on the angle, however the float noise of its mesh falls (#269)", () => {
    // A 45 degree lean is a chamfer; its corners come from a float32 mesh, so each carries a little noise.
    const rampAt = (degrees: number, wobble: number) => {
      const ramp = overhangingRamp(10, 10 * Math.tan((degrees * Math.PI) / 180));
      // Move one corner of the leaning side by the noise.
      ramp.vertices[2][1] += wobble;
      ramp.vertices[6][1] += wobble;
      return ramp;
    };
    for (const wobble of [-2e-6, -1e-7, 0, 1e-7, 2e-6]) {
      const exact = rampAt(45, wobble);
      expect(overhangArea(exact.vertices, exact.faces, 45).areaMm2).toBe(0);
    }
    // A lean a degree steeper is still an overhang.
    const steeper = overhangingRamp(10, 10 * Math.tan((46 * Math.PI) / 180));
    expect(overhangArea(steeper.vertices, steeper.faces, 45).areaMm2).toBeGreaterThan(0);
  });

  it("says how steep the steepest overhang is, and that a box standing on the plate has none", () => {
    const standing = box([0, 0, 0], [20, 20, 20]);
    expect(overhangArea(standing.vertices, standing.faces).steepestDegrees).toBeNull();
    const floating = box([0, 5, 0], [20, 25, 20]);
    expect(overhangArea(floating.vertices, floating.faces).steepestDegrees).toBeCloseTo(90, 6);
    // A lean of 30° counts as the steepest overhang even though it needs no supports.
    for (const degrees of [30, 60]) {
      const ramp = overhangingRamp(10, 10 * Math.tan((degrees * Math.PI) / 180));
      expect(overhangArea(ramp.vertices, ramp.faces).steepestDegrees).toBeCloseTo(degrees, 6);
    }
  });

  it("keeps the angle in its range", () => {
    expect(normalizeOverhangAngle(10)).toBe(30);
    expect(normalizeOverhangAngle(89)).toBe(70);
    expect(normalizeOverhangAngle("x")).toBe(45);
    expect(normalizeOverhangAngle(52.4)).toBe(52);
  });
});
