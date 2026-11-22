import { describe, expect, it } from "vitest";
import { insideToScreenPositions, makeSurfaceTextureLayout, normalizeSurfaceTexture, surfaceTextureValueAt, SURFACE_TEXTURE_PATTERNS } from "@/lib/surfaceTexture";
import { prepareSurfaceBase } from "@/lib/surfaceTextureMesh";
import { SURFACE_TEXTURE_LABELS } from "@/lib/surfaceTextureShape";

/*
 * Hammered (Discussion #1892): round dents of a few sizes and depths, overlapping, as a hand-hammered copper mug.
 * Checked on the front of a box through the value the texture lays (0 the surface, 1 its full depth).
 */

type Vec3 = [number, number, number];

function box(w: number, h: number, d: number): number[] {
  const p = (x: number, y: number, z: number): Vec3 => [(x - 0.5) * w, y * h, (z - 0.5) * d];
  const quads: Vec3[][] = [
    [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)],
    [p(1, 0, 0), p(0, 0, 0), p(0, 1, 0), p(1, 1, 0)],
    [p(1, 0, 1), p(1, 0, 0), p(1, 1, 0), p(1, 1, 1)],
    [p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)],
    [p(0, 1, 1), p(1, 1, 1), p(1, 1, 0), p(0, 1, 0)],
    [p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)],
  ];
  return quads.flatMap(([a, b, c, d]) => [...a, ...b, ...c, ...a, ...c, ...d]);
}

/** The values along rows across the front of a 60 mm box (screen frame: its front faces -y), `step` mm apart. */
function frontValues(settings: Record<string, unknown>, step = 0.1) {
  const s = normalizeSurfaceTexture({ pattern: "hammered", ...settings });
  const layout = makeSurfaceTextureLayout(prepareSurfaceBase(insideToScreenPositions(box(60, 60, 60))), s);
  const rows: number[][] = [];
  for (const z of [12.3, 24.7, 31.1, 47.9]) {
    const row: number[] = [];
    for (let x = -25; x <= 25; x += step) row.push(surfaceTextureValueAt(x, -30, z, 0, -1, 0, s, layout));
    rows.push(row);
  }
  return rows;
}

describe("the hammered pattern", () => {
  it("is a pattern of its own with a name, and starts soft and round, about 7 mm a dent, sunk in", () => {
    expect(SURFACE_TEXTURE_PATTERNS).toContain("hammered");
    expect(normalizeSurfaceTexture({ pattern: "hammered" })).toMatchObject({ spacing: 5, depth: 0.5, profile: "round", direction: "inward" });
    expect(SURFACE_TEXTURE_LABELS.pattern.hammered).toBe("surfaceTexture.hammered");
  });

  it("covers the face with dents of different depths, close together", () => {
    const values = frontValues({}).flat();
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    // Most of the face is in a dent; little of it is left flat between them.
    expect(values.filter((value) => value > 0.02).length / values.length).toBeGreaterThan(0.8);
    // The dents' deepest points are not all equally deep.
    const bottoms = frontValues({}).flatMap((row) => row.filter((value, i) => i > 0 && i < row.length - 1 && value >= row[i - 1] && value >= row[i + 1] && value > 0.5));
    expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeGreaterThan(0.1);
  });

  it("has no step anywhere: the rims and the ridges between dents run on without a jump", () => {
    // (A dome's rim is a wall: a half ball's print.)
    for (const profile of ["round", "pointed", "flat"] as const) {
      for (const row of frontValues({ profile }, 0.02)) {
        for (let i = 1; i < row.length; i += 1) expect(Math.abs(row[i] - row[i - 1])).toBeLessThan(0.06);
      }
    }
  });

  it("makes the dents larger with the width", () => {
    const flat = (width: number) => {
      const values = frontValues({ width }).flat();
      return values.filter((value) => value < 0.02).length / values.length;
    };
    expect(flat(0.2)).toBeGreaterThan(flat(0.6) + 0.1);
  });
});
