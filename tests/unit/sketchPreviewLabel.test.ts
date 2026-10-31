import { describe, expect, it } from "vitest";
import { previewLabelSpot } from "@/lib/sketchPreviewLabel";

const pill = { width: 100, height: 26 };

function clearsPoint(spot: { x: number; z: number }, point: { x: number; z: number }) {
  return Math.abs(spot.x - point.x) > pill.width / 2 || Math.abs(spot.z - point.z) > pill.height / 2;
}

describe("previewLabelSpot (#1091)", () => {
  it("keeps a flat line's label straight above its middle, as before", () => {
    const spot = previewLabelSpot({ x: 0, z: 0 }, { x: 200, z: 0 }, pill, 8);
    expect(spot.x).toBeCloseTo(100);
    expect(spot.z).toBeCloseTo(-21);
  });

  it("puts the label beside a steep short line, clear of both ends", () => {
    const from = { x: 800, z: 427 };
    const to = { x: 842, z: 347 };
    const spot = previewLabelSpot(from, to, pill, 8);
    expect(clearsPoint(spot, from)).toBe(true);
    expect(clearsPoint(spot, to)).toBe(true);
  });

  it("clears the line itself on a vertical line, to either direction it is drawn", () => {
    for (const to of [{ x: 0, z: -60 }, { x: 0, z: 60 }]) {
      const spot = previewLabelSpot({ x: 0, z: 0 }, to, pill, 8);
      expect(Math.abs(spot.x)).toBeGreaterThanOrEqual(pill.width / 2 + 8 - 1e-9);
      expect(clearsPoint(spot, { x: 0, z: 0 })).toBe(true);
      expect(clearsPoint(spot, to)).toBe(true);
    }
  });

  it("does not move when the line has no length", () => {
    const spot = previewLabelSpot({ x: 5, z: 5 }, { x: 5, z: 5 }, pill, 8);
    expect(spot.x).toBe(5);
    expect(spot.z).toBe(5 - 13 - 8);
  });
});
