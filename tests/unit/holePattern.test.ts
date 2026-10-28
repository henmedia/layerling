import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOLE_PATTERN,
  faceOutlineFromTriangles,
  HEXAGON_FLAT_RATIO,
  HOLE_PATTERN_MANY_HOLES,
  holeFootprintPolygon,
  holePatternCenters,
  holePatternMinRowSpacing,
  holePatternMinSpacing,
  holePatternWall,
  normalizeHolePattern,
  rectangleOutline,
  type FaceOutline,
  type HolePatternSettings,
} from "@/lib/holePattern";

const round: HolePatternSettings = { ...DEFAULT_HOLE_PATTERN, form: "round", size: 6, height: 6, spacing: 9, arrangement: "grid", margin: 4, depth: null };

function distinct(values: number[]) {
  return [...new Set(values.map((value) => Number(value.toFixed(4))))].sort((a, b) => a - b);
}

describe("hole pattern", () => {
  it("fills a rectangular face with rows and columns that keep the margin", () => {
    const { centers, rows } = holePatternCenters(rectangleOutline(-50, -30, 50, 30), round);
    const columns = distinct(centers.map((c) => c.u));
    const lines = distinct(centers.map((c) => c.v));
    expect(columns).toHaveLength(10);
    expect(lines).toHaveLength(6);
    expect(rows).toBe(6);
    expect(centers).toHaveLength(60);
    // The rim of every hole stays 4 mm from the edge, and the pattern is centred.
    centers.forEach((c) => {
      expect(Math.abs(c.u) + 3).toBeLessThanOrEqual(50 - 4 + 1e-9);
      expect(Math.abs(c.v) + 3).toBeLessThanOrEqual(30 - 4 + 1e-9);
    });
    expect(columns[0]).toBeCloseTo(-columns[columns.length - 1], 6);
    expect(lines[0]).toBeCloseTo(-lines[lines.length - 1], 6);
  });

  it("keeps the spacing between neighbouring holes", () => {
    const { centers } = holePatternCenters(rectangleOutline(0, 0, 60, 40), round);
    const columns = distinct(centers.map((c) => c.u));
    columns.slice(1).forEach((value, index) => expect(value - columns[index]).toBeCloseTo(9, 3));
  });

  it("shifts every second row of a staggered pattern by half a spacing", () => {
    const { centers } = holePatternCenters(rectangleOutline(-50, -30, 50, 30), { ...round, arrangement: "staggered" });
    const lines = distinct(centers.map((c) => c.v));
    expect(lines.length).toBeGreaterThan(3);
    // Rows are packed closer so each hole has neighbours one spacing away.
    expect(lines[1] - lines[0]).toBeCloseTo(9 * Math.sqrt(3) / 2, 3);
    const first = centers.filter((c) => Math.abs(c.v - lines[0]) < 1e-3).map((c) => c.u).sort((a, b) => a - b);
    const second = centers.filter((c) => Math.abs(c.v - lines[1]) < 1e-3).map((c) => c.u).sort((a, b) => a - b);
    const third = centers.filter((c) => Math.abs(c.v - lines[2]) < 1e-3).map((c) => c.u).sort((a, b) => a - b);
    const phase = (list: number[]) => ((list[0] % 9) + 9) % 9;
    const apart = Math.abs(phase(first) - phase(second));
    expect(Math.min(apart, 9 - apart)).toBeCloseTo(4.5, 3);
    // The row after next is back in line with the first.
    expect(phase(third)).toBeCloseTo(phase(first), 3);
  });

  it("drops holes that would reach into the margin", () => {
    // 20 wide, margin 4, hole 6: only the middle column of the 9 mm lattice fits across 12 mm.
    const { centers } = holePatternCenters(rectangleOutline(0, 0, 20, 40), round);
    expect(distinct(centers.map((c) => c.u))).toHaveLength(1);
    expect(distinct(centers.map((c) => c.u))[0]).toBeCloseTo(10, 6);
    // A face smaller than one hole plus margins gets none.
    expect(holePatternCenters(rectangleOutline(0, 0, 13, 13), round).centers).toHaveLength(0);
    expect(holePatternCenters(rectangleOutline(0, 0, 14, 14), round).centers).toHaveLength(1);
  });

  it("works on an L-shaped face and leaves the notch alone", () => {
    const lShape: FaceOutline = {
      loops: [[
        { u: 0, v: 0 }, { u: 60, v: 0 }, { u: 60, v: 20 }, { u: 20, v: 20 }, { u: 20, v: 60 }, { u: 0, v: 60 },
      ]],
    };
    const { centers } = holePatternCenters(lShape, round);
    expect(centers.length).toBeGreaterThan(8);
    centers.forEach((c) => {
      const inLeg = c.u >= 4 + 3 - 1e-9 && c.u <= 60 - 7 + 1e-9 && c.v >= 7 - 1e-9 && c.v <= 20 - 7 + 1e-9;
      const inColumn = c.u >= 7 - 1e-9 && c.u <= 20 - 7 + 1e-9 && c.v >= 7 - 1e-9 && c.v <= 60 - 7 + 1e-9;
      expect(inLeg || inColumn).toBe(true);
    });
    // Nothing in the cut-away corner.
    expect(centers.some((c) => c.u > 24 && c.v > 24)).toBe(false);
  });

  it("keeps clear of an opening in the face", () => {
    const withOpening: FaceOutline = {
      loops: [
        ...rectangleOutline(0, 0, 60, 60).loops,
        [{ u: 20, v: 20 }, { u: 40, v: 20 }, { u: 40, v: 40 }, { u: 20, v: 40 }],
      ],
    };
    const { centers } = holePatternCenters(withOpening, round);
    expect(centers.length).toBeGreaterThan(0);
    centers.forEach((c) => {
      const dx = Math.max(20 - c.u, 0, c.u - 40);
      const dy = Math.max(20 - c.v, 0, c.v - 40);
      expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(3 + 4 - 1e-6);
    });
  });

  it("allows for the size of non-round holes", () => {
    const slot = holePatternCenters(rectangleOutline(0, 0, 60, 30), { ...round, form: "slot", size: 20, height: 5, spacing: 22 });
    slot.centers.forEach((c) => {
      expect(c.u - 10).toBeGreaterThanOrEqual(4 - 1e-6);
      expect(60 - (c.u + 10)).toBeGreaterThanOrEqual(4 - 1e-6);
    });
    const hexagon = holeFootprintPolygon({ form: "hexagon", size: 10, height: 10 });
    expect(hexagon).toHaveLength(6);
    expect(Math.max(...hexagon.map((p) => p.v))).toBeCloseTo(5, 6);
    expect(Math.max(...hexagon.map((p) => p.u))).toBeCloseTo(5 * Math.sqrt(3) / 2, 6);
  });

  it("refuses patterns of too many holes", () => {
    const result = holePatternCenters(rectangleOutline(0, 0, 400, 400), { ...round, size: 1, spacing: 2, margin: 0 });
    expect(result.tooMany).toBe(true);
    expect(result.centers).toHaveLength(0);
  });

  it("lets a pattern of more holes through once the warning was accepted (#941)", () => {
    // 400 x 400 mm at spacing 8 is 50 x 50 = 2500 holes: over 400, under the raised limit.
    const settings = { ...round, size: 2, spacing: 8, margin: 0 };
    expect(holePatternCenters(rectangleOutline(0, 0, 400, 400), settings).tooMany).toBe(true);
    const allowed = holePatternCenters(rectangleOutline(0, 0, 400, 400), { ...settings, allowMany: true });
    expect(allowed.tooMany).toBe(false);
    expect(allowed.centers.length).toBeGreaterThan(400);
    expect(allowed.centers.length).toBeLessThanOrEqual(HOLE_PATTERN_MANY_HOLES);
    // still ends somewhere
    expect(holePatternCenters(rectangleOutline(0, 0, 400, 400), { ...round, size: 1, spacing: 2, margin: 0, allowMany: true }).tooMany).toBe(true);
    expect(normalizeHolePattern({ ...settings, allowMany: true }).allowMany).toBe(true);
    expect(normalizeHolePattern(settings).allowMany).toBeUndefined();
  });

  it("reads the outline of a face from its triangles", () => {
    // A 40 x 20 face in the plane y = 5, made of two triangles; frame x = world x, z = world z.
    const positions = [
      0, 5, 0, 40, 5, 0, 40, 5, 20,
      0, 5, 0, 40, 5, 20, 0, 5, 20,
    ];
    const frame = { origin: { x: 0, y: 5, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } };
    const outline = faceOutlineFromTriangles(positions, [0, 1], frame);
    expect(outline?.loops).toHaveLength(1);
    expect(outline?.loops[0]).toHaveLength(4);
    const { centers } = holePatternCenters(outline as FaceOutline, round);
    expect(centers.length).toBeGreaterThan(0);
  });

  it("lets staggered hexagons interlock closer than their corner-to-corner size", () => {
    // 6 mm across the corners is 5.2 mm across the flats: a 0.4 mm wall needs 5.6 mm, not 6.4.
    const hex = normalizeHolePattern({ form: "hexagon", size: 6, spacing: 1, arrangement: "staggered" });
    expect(hex.spacing).toBeCloseTo(5.196 + 0.4, 2);
    // In a grid the corners face each other along the columns.
    expect(normalizeHolePattern({ form: "hexagon", size: 6, spacing: 1, arrangement: "grid" }).spacing).toBeCloseTo(6.4, 2);
    // A staggered square needs more than its own width: the next row sits diagonally.
    expect(normalizeHolePattern({ form: "square", size: 10, spacing: 1, arrangement: "staggered" }).spacing).toBeGreaterThan(10.4);
    expect(holePatternMinSpacing({ form: "round", size: 6, height: 6, arrangement: "grid" })).toBeCloseTo(6.4, 2);
  });

  it("keeps the numbers inside what the tool offers", () => {
    const settings = normalizeHolePattern({ form: "slot", size: 10, height: 4, spacing: 1, margin: -3, depth: -2 });
    expect(settings.spacing).toBeGreaterThanOrEqual(10.4);
    expect(settings.margin).toBe(0);
    expect(settings.depth).toBeNull();
    expect(normalizeHolePattern({ form: "nonsense" as never }).form).toBe(DEFAULT_HOLE_PATTERN.form);
  });
});

describe("wall between the holes (#239)", () => {
  const round = { form: "round" as const, size: 6, height: 6, arrangement: "grid" as const };

  it("is the spacing minus the hole size for round holes in a grid", () => {
    expect(holePatternWall({ ...round, spacing: 9 })).toBeCloseTo(3, 4);
    expect(holePatternWall({ ...round, spacing: 12 })).toBeCloseTo(6, 4);
  });

  it("is zero for holes that overlap", () => {
    expect(holePatternWall({ ...round, spacing: 5 })).toBe(0);
  });

  it("gives the spacing for a wanted wall, and back", () => {
    for (const settings of [
      round,
      { ...round, arrangement: "staggered" as const },
      { form: "hexagon" as const, size: 6, height: 6, arrangement: "staggered" as const },
      { form: "rectangle" as const, size: 8, height: 4, arrangement: "grid" as const },
      { form: "slot" as const, size: 10, height: 4, arrangement: "staggered" as const },
    ]) {
      const spacing = holePatternMinSpacing(settings, 1.6);
      expect(holePatternWall({ ...settings, spacing })).toBeCloseTo(1.6, 2);
    }
  });

  it("is the same wall in every direction for hexagons that interlock", () => {
    const hexagon = { form: "hexagon" as const, size: 6, height: 6, arrangement: "staggered" as const };
    // flats face each other along the row and along the diagonal, so the wall is the spacing less the flat-to-flat width
    expect(holePatternWall({ ...hexagon, spacing: 9 })).toBeCloseTo(9 - 6 * HEXAGON_FLAT_RATIO, 3);
  });
});

describe("a rectangle or slot with its own row spacing (#975)", () => {
  // Narrow, tall holes: 2 mm wide, 14 mm high, as in the report.
  const narrow = { form: "rectangle" as const, size: 2, height: 14, arrangement: "grid" as const };

  it("takes the wall along the row from the width and between the rows from the height", () => {
    const spacing = holePatternMinSpacing(narrow, 2);
    expect(spacing).toBeCloseTo(4, 3);
    expect(holePatternMinRowSpacing({ ...narrow, spacing }, 2)).toBeCloseTo(16, 3);
    expect(holePatternWall({ ...narrow, spacing: 4, rowSpacing: 16 })).toBeCloseTo(2, 3);
  });

  it("puts the holes of a row 4 mm apart and the rows 16 mm apart", () => {
    const settings = normalizeHolePattern({ ...narrow, spacing: 4, rowSpacing: 16, margin: 2, depth: null });
    expect(settings.spacing).toBeCloseTo(4, 3);
    expect(settings.rowSpacing).toBeCloseTo(16, 3);
    const { centers } = holePatternCenters(rectangleOutline(-23, -23, 23, 23), settings);
    const us = distinct(centers.map((center) => center.u));
    const vs = distinct(centers.map((center) => center.v));
    expect(us[1] - us[0]).toBeCloseTo(4, 3);
    expect(vs[1] - vs[0]).toBeCloseTo(16, 3);
    expect(us.length).toBeGreaterThan(8);
  });

  it("raises a row spacing that would let the rows overlap", () => {
    expect(normalizeHolePattern({ ...narrow, spacing: 4, rowSpacing: 4 }).rowSpacing).toBeGreaterThan(14);
  });

  it("keeps the rows of a pattern saved without a row spacing where they were", () => {
    const saved = normalizeHolePattern({ form: "rectangle", size: 10, height: 5, spacing: 13, arrangement: "staggered" });
    expect(saved.spacing).toBe(13);
    expect(saved.rowSpacing).toBeCloseTo(13 * Math.sqrt(3) / 2, 6);
  });

  it("leaves the other forms without one", () => {
    expect(normalizeHolePattern({ ...round, rowSpacing: 30 }).rowSpacing).toBeUndefined();
  });
});
