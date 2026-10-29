import { describe, expect, it } from "vitest";
import {
  DIMENSION_LABEL_MAX_SCREEN_OFFSET,
  DIMENSION_LABEL_MIN_SCREEN_OFFSET,
  dimensionMarkNeedsScreenLayout,
  dimensionMarkScreenPush,
  screenSpaceDimensionMark,
} from "@/components/workplane/transformOverlayTypes";

const EDGE = { x: 600, y: 470 };

function pushedDistance(labelPoint: { x: number; y: number }) {
  const push = dimensionMarkScreenPush(EDGE, labelPoint);
  return Math.hypot(labelPoint.x + push.x - EDGE.x, labelPoint.y + push.y - EDGE.y);
}

function labelAt(distance: number, angle: number) {
  return { x: EDGE.x + Math.cos(angle) * distance, y: EDGE.y + Math.sin(angle) * distance };
}

// Projected world offset of the label across the zoom range: a couple of pixels
// when the selection is a speck, far outside the handles when it fills the view.
const PROJECTED_DISTANCES = [0.5, 2, 5, 9, 14, 20, 26, 37.6, 50, 61, 62, 63, 90, 160, 320];
const DIRECTIONS = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, -Math.PI / 3];

describe("dimension label clearance from rotate handles", () => {
  it("never leaves a label closer to the edge than the minimum", () => {
    for (const distance of PROJECTED_DISTANCES) {
      for (const angle of DIRECTIONS) {
        expect(pushedDistance(labelAt(distance, angle))).toBeGreaterThanOrEqual(
          Math.min(distance, DIMENSION_LABEL_MIN_SCREEN_OFFSET) - 0.001,
        );
      }
    }
  });

  it("lifts close labels to exactly the minimum offset", () => {
    for (const distance of PROJECTED_DISTANCES.filter((value) => value < DIMENSION_LABEL_MIN_SCREEN_OFFSET)) {
      for (const angle of DIRECTIONS) {
        expect(pushedDistance(labelAt(distance, angle))).toBeCloseTo(DIMENSION_LABEL_MIN_SCREEN_OFFSET, 6);
      }
    }
  });

  it("leaves zoomed-in views untouched", () => {
    for (const distance of PROJECTED_DISTANCES.filter((value) => value >= DIMENSION_LABEL_MIN_SCREEN_OFFSET)) {
      for (const angle of DIRECTIONS) {
        const push = dimensionMarkScreenPush(EDGE, labelAt(distance, angle));
        expect(push).toEqual({ x: 0, y: 0 });
      }
    }
  });

  it("keeps the outward direction the projection produced", () => {
    for (const angle of DIRECTIONS) {
      const label = labelAt(9, angle);
      const push = dimensionMarkScreenPush(EDGE, label);
      const before = Math.atan2(label.y - EDGE.y, label.x - EDGE.x);
      const after = Math.atan2(label.y + push.y - EDGE.y, label.x + push.x - EDGE.x);
      expect(after).toBeCloseTo(before, 9);
    }
  });

  it("clears the rotate handles it used to hide behind", () => {
    // Rotate handles sit at most 28px outside the silhouette with a 40px hit
    // area, so a label centre must stay 28 + 20 + 13 = 61px away to stay free.
    expect(DIMENSION_LABEL_MIN_SCREEN_OFFSET).toBeGreaterThan(28 + 20 + 13);
    // The reported case: label projected 37.6px out, handle 26px out.
    expect(pushedDistance(labelAt(37.6, Math.PI / 2)) - 26).toBeGreaterThan(20 + 13);
  });

  it("returns no push for degenerate input", () => {
    expect(dimensionMarkScreenPush(EDGE, { ...EDGE })).toEqual({ x: 0, y: 0 });
    expect(dimensionMarkScreenPush(EDGE, { x: Number.NaN, y: EDGE.y })).toEqual({ x: 0, y: 0 });
    expect(dimensionMarkScreenPush(EDGE, { x: Number.POSITIVE_INFINITY, y: EDGE.y })).toEqual({ x: 0, y: 0 });
  });

  it("moves continuously as the projection crosses the minimum", () => {
    const justUnder = pushedDistance(labelAt(DIMENSION_LABEL_MIN_SCREEN_OFFSET - 0.01, 0));
    const justOver = pushedDistance(labelAt(DIMENSION_LABEL_MIN_SCREEN_OFFSET + 0.01, 0));
    expect(Math.abs(justOver - justUnder)).toBeLessThan(0.1);
  });
});

describe("dimension label stays near a tiny part zoomed in (#989)", () => {
  const OFFSETS = { rail: 5.8, overrun: 1.4, label: 3.2 };
  const FROM = { x: 500, y: 470 };
  const TO = { x: 700, y: 470 };

  it("keeps the maximum clear of the rotate handles", () => {
    expect(DIMENSION_LABEL_MAX_SCREEN_OFFSET).toBeGreaterThan(DIMENSION_LABEL_MIN_SCREEN_OFFSET);
    // The rail sits 5.8 of the 9mm out, so it must still clear the 28 + 20px handle area.
    expect((DIMENSION_LABEL_MAX_SCREEN_OFFSET * OFFSETS.rail) / (OFFSETS.rail + OFFSETS.label)).toBeGreaterThan(28 + 20);
  });

  it("switches to screen layout when the label lands far away", () => {
    // 9mm world offset on a 0.5mm part filling the view: thousands of pixels.
    for (const distance of [121, 320, 1200, 10800]) {
      for (const angle of DIRECTIONS) {
        expect(dimensionMarkNeedsScreenLayout(EDGE, labelAt(distance, angle), true)).toBe(true);
      }
    }
  });

  it("keeps the world layout for labels within the maximum", () => {
    for (const distance of [0.5, 9, 62, 90, DIMENSION_LABEL_MAX_SCREEN_OFFSET - 0.01]) {
      for (const angle of DIRECTIONS) {
        expect(dimensionMarkNeedsScreenLayout(EDGE, labelAt(distance, angle), true)).toBe(false);
      }
    }
  });

  it("switches to screen layout when an offset point lies behind the camera", () => {
    // Close up, the projection of such a point flips across the body and can land near it.
    expect(dimensionMarkNeedsScreenLayout(EDGE, labelAt(40, Math.PI), false)).toBe(true);
    expect(dimensionMarkNeedsScreenLayout(EDGE, { x: Number.NaN, y: EDGE.y }, true)).toBe(true);
  });

  it("places the label exactly the maximum out, along the outward direction", () => {
    for (const angle of DIRECTIONS) {
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      const mark = screenSpaceDimensionMark(FROM, TO, EDGE, direction, OFFSETS);
      expect(Math.hypot(mark.labelPoint.x - EDGE.x, mark.labelPoint.y - EDGE.y)).toBeCloseTo(DIMENSION_LABEL_MAX_SCREEN_OFFSET, 6);
      expect(Math.atan2(mark.labelPoint.y - EDGE.y, mark.labelPoint.x - EDGE.x)).toBeCloseTo(angle, 9);
    }
  });

  it("keeps rail and extension lines at the ratios of their world offsets", () => {
    const mark = screenSpaceDimensionMark(FROM, TO, EDGE, { x: 0, y: 1 }, OFFSETS);
    const perUnit = DIMENSION_LABEL_MAX_SCREEN_OFFSET / (OFFSETS.rail + OFFSETS.label);
    expect(mark.railFrom).toEqual({ x: FROM.x, y: FROM.y + OFFSETS.rail * perUnit });
    expect(mark.railTo).toEqual({ x: TO.x, y: TO.y + OFFSETS.rail * perUnit });
    expect(mark.extensionFrom.y - FROM.y).toBeCloseTo((OFFSETS.rail + OFFSETS.overrun) * perUnit, 9);
    expect(mark.extensionTo.y - TO.y).toBeCloseTo((OFFSETS.rail + OFFSETS.overrun) * perUnit, 9);
    // The label stands beyond the rail, so the number never sits on its own line.
    expect(mark.labelPoint.y - EDGE.y).toBeGreaterThan(mark.railFrom.y - FROM.y);
  });
});
