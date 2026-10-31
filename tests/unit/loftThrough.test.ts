import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOFT,
  LOFT_THROUGH_STEPS,
  MAX_LOFT_MIDDLES,
  createLoftGeometry,
  loftFieldsFromMeasures,
  loftFrameSize,
  loftIsTurned,
  loftMiddlesWithCount,
  loftProfileLoops,
  loftStoredMeasures,
  loftThroughStations,
  monotoneCubic,
  normalizeLoftMeasures,
  normalizeLoftMiddles,
  normalizeLoftThrough,
} from "@/lib/loftGeometry";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { LoftMiddleSection, WorkplaneShape } from "@/types/layerling";

/*
 * A loft through more sections (#1034): sections between the bottom and the top, each with its own
 * outline, size, height and offset. Smooth runs one surface through all of them without swelling
 * past them; straight runs flat walls from one to the next.
 */

function loft(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const base = {
    id: "through-loft", name: "loft", kind: "loft", x: 0, z: 0, elevation: 0, size: 30, height: 100, rotation: 0, color: "#c0703a",
    loftBottomOutline: "round", loftTopOutline: "round", loftBottomWidth: 10, loftBottomDepth: 10, loftTopWidth: 10, loftTopDepth: 10,
    loftBottomCorner: 0, loftTopCorner: 0, loftOffsetX: 0, loftOffsetZ: 0, loftWall: 0,
    ...extra,
  } as WorkplaneShape;
  const frame = loftFrameSize(loftStoredMeasures(base));
  return { ...base, width: frame.width, depth: frame.depth };
}

function bounds(geometry: ReturnType<typeof createLoftGeometry>) {
  geometry.computeBoundingBox();
  return geometry.boundingBox!;
}

/** The largest distance from the axis among the vertices between two heights. */
function widestBetween(geometry: ReturnType<typeof createLoftGeometry>, y0: number, y1: number) {
  const p = geometry.getAttribute("position");
  let widest = 0;
  for (let i = 0; i < p.count; i += 1) {
    if (p.getY(i) > y0 + 1e-6 && p.getY(i) < y1 - 1e-6) widest = Math.max(widest, Math.hypot(p.getX(i), p.getZ(i)));
  }
  return widest;
}

const bulge: LoftMiddleSection[] = [{ at: 0.5, outline: "round", width: 30, depth: 30 }];

describe("monotoneCubic", () => {
  it("goes through every point", () => {
    const xs = [0, 0.2, 0.5, 0.9, 1];
    const ys = [10, 30, 30, 5, 12];
    const curve = monotoneCubic(xs, ys);
    xs.forEach((x, k) => expect(curve(x)).toBeCloseTo(ys[k], 9));
  });

  it("stays between two neighbouring values: no overshoot", () => {
    const xs = [0, 0.1, 0.5, 0.55, 1];
    const ys = [10, 30, 30, 2, 40];
    const curve = monotoneCubic(xs, ys);
    for (let k = 0; k + 1 < xs.length; k += 1) {
      const low = Math.min(ys[k], ys[k + 1]);
      const high = Math.max(ys[k], ys[k + 1]);
      for (let step = 0; step <= 100; step += 1) {
        const value = curve(xs[k] + ((xs[k + 1] - xs[k]) * step) / 100);
        expect(value).toBeGreaterThanOrEqual(low - 1e-9);
        expect(value).toBeLessThanOrEqual(high + 1e-9);
      }
    }
  });

  it("is a straight line between two points", () => {
    const curve = monotoneCubic([0, 1], [4, 8]);
    expect(curve(0.25)).toBeCloseTo(5, 9);
  });
});

describe("normalizeLoftMiddles", () => {
  it("sorts, clamps and drops what is not a section", () => {
    const middles = normalizeLoftMiddles([
      { at: 0.8, outline: "rectangle", width: 20, depth: 10, corner: 99 },
      "nonsense",
      { at: -1, outline: "star", width: 0 },
      null,
    ]);
    expect(middles.map((middle) => middle.at)).toEqual([0.01, 0.8]);
    expect(middles[0].outline).toBe("round");
    expect(middles[0].width).toBe(1);
    // The corner radius fits the outline: at most half the smaller side.
    expect(middles[1].corner).toBeLessThanOrEqual(5);
  });

  it("keeps one of two sections in the same place and at most twelve", () => {
    expect(normalizeLoftMiddles([{ at: 0.5, width: 10 }, { at: 0.501, width: 20 }])).toHaveLength(1);
    const many = Array.from({ length: 20 }, (_, k) => ({ at: (k + 1) / 22, width: 10, depth: 10 }));
    expect(normalizeLoftMiddles(many)).toHaveLength(MAX_LOFT_MIDDLES);
  });

  it("returns none for anything that is not a list", () => {
    expect(normalizeLoftMiddles(undefined)).toEqual([]);
    expect(normalizeLoftMiddles("[]")).toEqual([]);
  });
});

describe("loftMiddlesWithCount", () => {
  const measures = normalizeLoftMeasures({ ...DEFAULT_LOFT, bottomWidth: 10, bottomDepth: 10, topWidth: 30, topDepth: 20, offsetX: 4 });

  it("puts a new section into the largest gap, halfway between its neighbours", () => {
    const [middle] = loftMiddlesWithCount(measures, 1);
    expect(middle.at).toBeCloseTo(0.5, 9);
    expect(middle.width).toBeCloseTo(20, 9);
    expect(middle.depth).toBeCloseTo(15, 9);
    expect(middle.offsetX).toBeCloseTo(2, 9);
    expect(middle.outline).toBe(measures.bottomOutline);
    const two = loftMiddlesWithCount({ ...measures, middles: [middle] }, 2);
    expect(two.map((entry) => entry.at)).toEqual([0.25, 0.5]);
  });

  it("drops the topmost when there are to be fewer", () => {
    const three = loftMiddlesWithCount(measures, 3);
    expect(loftMiddlesWithCount({ ...measures, middles: three }, 2)).toEqual(three.slice(0, 2));
    expect(loftMiddlesWithCount({ ...measures, middles: three }, 0)).toEqual([]);
  });
});

describe("a loft through more sections", () => {
  it("stores the sections only when there are any", () => {
    const plain = loftFieldsFromMeasures(normalizeLoftMeasures({ ...DEFAULT_LOFT }));
    expect(plain.loftSections).toBeUndefined();
    expect(plain.loftThrough).toBeUndefined();
    const stored = loftFieldsFromMeasures(normalizeLoftMeasures({ ...DEFAULT_LOFT, middles: normalizeLoftMiddles(bulge), through: "straight" }));
    expect(stored.loftSections).toHaveLength(1);
    expect(stored.loftThrough).toBe("straight");
  });

  it("is smooth unless set to straight", () => {
    expect(normalizeLoftThrough(undefined)).toBe("smooth");
    expect(normalizeLoftThrough("straight")).toBe("straight");
    expect(normalizeLoftThrough("wavy")).toBe("smooth");
  });

  it("leaves twist and tilt out", () => {
    const measures = loftStoredMeasures(loft({ loftSections: bulge, loftTwist: 90, loftTiltX: 20 }));
    expect(loftIsTurned(measures)).toBe(false);
  });

  it("frames the widest section", () => {
    const shape = loft({ loftSections: bulge });
    expect(shape.width).toBeCloseTo(30, 6);
    expect(shape.depth).toBeCloseTo(30, 6);
  });

  it("builds the smooth body through the stations of every gap", () => {
    expect(loftThroughStations([0, 0.5, 1])).toHaveLength(2 * LOFT_THROUGH_STEPS + 1);
    const loops = loftProfileLoops(loft({ loftSections: bulge }));
    expect(loops.through).toHaveLength(2 * LOFT_THROUGH_STEPS + 1);
    expect(loops.throughRuled).toBeFalsy();
    const straight = loftProfileLoops(loft({ loftSections: bulge, loftThrough: "straight" }));
    expect(straight.through).toHaveLength(3);
    expect(straight.throughRuled).toBe(true);
  });

  it("reaches the section and does not swell past it", () => {
    const geometry = createLoftGeometry(loft({ loftSections: bulge }));
    const box = bounds(geometry);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeCloseTo(100, 6);
    expect(box.max.x).toBeCloseTo(15, 1);
    expect(box.max.x).toBeLessThanOrEqual(15 + 1e-6);
    // Between the bottom and the section it stays within the two sizes.
    expect(widestBetween(geometry, 0, 50)).toBeLessThanOrEqual(15 + 1e-6);
  });

  it("runs straight walls when set to straight", () => {
    const geometry = createLoftGeometry(loft({ loftSections: bulge, loftThrough: "straight" }));
    // Two frustums from radius 5 to 15 and back, 50 high each; the circle is drawn with straight pieces.
    const p = geometry.getAttribute("position");
    let volume = 0;
    for (let i = 0; i + 2 < p.count; i += 3) {
      const [ax, ay, az] = [p.getX(i), p.getY(i), p.getZ(i)];
      const [bx, by, bz] = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
      const [cx, cy, cz] = [p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)];
      volume += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
    }
    const frustums = 2 * ((Math.PI * 50) / 3) * (5 * 5 + 5 * 15 + 15 * 15);
    expect(Math.abs(volume / frustums - 1)).toBeLessThan(2e-3);
  });

  it("keeps its sections in a saved design", async () => {
    const source = canonicalizeShape(loft({ loftSections: [...bulge, { at: 0.8, outline: "rectangle", width: 12, depth: 9, corner: 2, offsetX: 1.5 }], loftThrough: "straight" }));
    const exported = await exportLylProject({
      projectId: "loft",
      projectName: "Loft",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [source],
      history: [editorHistoryEntry([source], [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const [loaded] = (await importLylProject(exported)).shapes;
    expect(loaded.loftThrough).toBe("straight");
    expect(loaded.loftSections).toEqual(source.loftSections);
  });

  it("leaves a loft with two ends as it was", () => {
    const plain = loft();
    expect(loftProfileLoops(plain).through).toBeUndefined();
    expect(loftStoredMeasures(plain).middles).toEqual([]);
  });
});
