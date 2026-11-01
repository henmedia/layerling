import { describe, expect, it } from "vitest";
import { createFinishingWasherGeometry, finishingWasherMeasures, finishingWasherProfile, finishingWasherSeatDepthFor } from "@/lib/finishingWasherGeometry";
import { finishingWasherFields, finishingWasherSizeFor, finishingWasherSizes } from "@/lib/screwHoleSizes";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";

/*
 * The finishing washer (rosette, Discussion #1131): a domed ring with a 90 degree seat for a countersunk screw.
 */

function stats(geometry: ReturnType<typeof createFinishingWasherGeometry>) {
  const position = geometry.getAttribute("position");
  const key = (i: number) => [position.getX(i), position.getY(i), position.getZ(i)].map((v) => v.toFixed(4)).join(",");
  const edges = new Map<string, number>();
  let volume = 0;
  for (let i = 0; i < position.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => [position.getX(i + k), position.getY(i + k), position.getZ(i + k)]);
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    for (let k = 0; k < 3; k += 1) {
      const p = key(i + k);
      const q = key(i + ((k + 1) % 3));
      const edge = p < q ? `${p}|${q}` : `${q}|${p}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  geometry.computeBoundingBox();
  return { volume, closed: [...edges.values()].every((count) => count === 2), box: geometry.boundingBox! };
}

/** The section's area times the way its centroid goes round (Pappus), from a fine profile. */
function revolvedVolume(profile: { r: number; y: number }[]) {
  let area = 0;
  let moment = 0;
  profile.forEach((p, index) => {
    const q = profile[(index + 1) % profile.length];
    const cross = p.r * q.y - q.r * p.y;
    area += cross / 2;
    moment += ((p.r + q.r) * cross) / 6;
  });
  return 2 * Math.PI * moment * Math.sign(area);
}

describe("finishing washer", () => {
  it("sizes follow the countersink: an M3 is 10.3 x 3 mm, an M6 16.6 x 4.5 mm", () => {
    expect(finishingWasherFields("M3")).toEqual({ width: 10.3, depth: 10.3, height: 2.95, screwHoleShaft: 3.4, screwHoleHeadDepth: 1.45, screwHoleAngle: 90 });
    expect(finishingWasherFields("M6")).toMatchObject({ width: 16.6, height: 4.5, screwHoleShaft: 6.6, screwHoleHeadDepth: 3 });
    expect(finishingWasherSizes()).toEqual(["M2", "M2.5", "M3", "M4", "M5", "M6", "M8", "M10", "M12", "M14", "M16", "M20"]);
  });

  it("knows its size again from its measures, and none once one is changed", () => {
    for (const size of finishingWasherSizes()) expect(finishingWasherSizeFor(finishingWasherFields(size))).toBe(size);
    expect(finishingWasherSizeFor({ ...finishingWasherFields("M4"), height: 5 })).toBeNull();
  });

  it("the seat opens from the bore to the head at its angle, with the lip where the dome ends", () => {
    const fields = finishingWasherFields("M4");
    const measures = finishingWasherMeasures(fields);
    expect(measures.shaft * 2).toBeCloseTo(4.5, 9);
    expect(measures.seat * 2).toBeCloseTo(9.4, 9);
    expect(finishingWasherSeatDepthFor(9.4, 4.5, 90)).toBeCloseTo(2.45, 9);
    const profile = finishingWasherProfile(fields);
    expect(profile[0]).toEqual({ r: 2.25, y: 0 });
    expect(profile[1]).toEqual({ r: 6.7, y: 0 });
    expect(profile[profile.length - 1]).toEqual({ r: 2.25, y: expect.closeTo(1.5, 9) });
    expect(profile[profile.length - 2]).toEqual({ r: expect.closeTo(4.7, 9), y: expect.closeTo(3.95, 9) });
  });

  it("keeps the seat inside the washer, however deep it is asked for", () => {
    const measures = finishingWasherMeasures({ width: 10, height: 2, screwHoleShaft: 3, screwHoleHeadDepth: 50, screwHoleAngle: 90 });
    expect(measures.seatDepth).toBeLessThan(2);
    expect(measures.seat).toBeLessThan(5);
    expect(finishingWasherMeasures({ width: 10, height: 2, screwHoleShaft: 30 }).shaft).toBeLessThan(5);
  });

  it.each(finishingWasherSizes())("builds a closed %s with outward faces and the volume of its section", (size) => {
    const fields = finishingWasherFields(size);
    const { volume, closed, box } = stats(createFinishingWasherGeometry({ ...fields, sides: 96 }));
    expect(closed).toBe(true);
    expect(volume).toBeGreaterThan(0);
    // The mesh's chords cut a little inside the round; the volume stays within a percent.
    expect(volume / revolvedVolume(finishingWasherProfile(fields, 400))).toBeGreaterThan(0.99);
    expect(box.max.y).toBeCloseTo(fields.height, 4);
    expect(box.min.y).toBeCloseTo(0, 4);
    expect(box.max.x).toBeCloseTo(fields.width / 2, 4);
  });

  it("comes out of the library as an M4 washer", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "finishingWasher")!;
    const shape = makeShapeFromAsset(asset);
    expect(finishingWasherSizeFor({ width: shape.width!, height: shape.height, screwHoleShaft: shape.screwHoleShaft!, screwHoleHeadDepth: shape.screwHoleHeadDepth!, screwHoleAngle: shape.screwHoleAngle! })).toBe("M4");
    expect(shape.hole).toBeFalsy();
  });
});
