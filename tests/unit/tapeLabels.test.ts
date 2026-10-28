import { describe, expect, it } from "vitest";
import { placeTapeLabel, screenPolylineMiddle, segmentHitsBox, tapeAxisSpans, tapeAxisTag } from "@/lib/tapeLabels";

describe("tape measurement axes", () => {
  it("names the axes as the editor shows them (Y is -z inside, Z is y)", () => {
    const tag = (a: [number, number, number], b: [number, number, number]) =>
      tapeAxisTag(tapeAxisSpans([{ x: a[0], y: a[1], z: a[2] }, { x: b[0], y: b[1], z: b[2] }]), 2);
    expect(tag([0, 0, 0], [10, 0, 0])).toBe("X");
    expect(tag([0, 0, 0], [0, 0, -10])).toBe("Y");
    expect(tag([0, 0, 0], [0, 10, 0])).toBe("Z");
    expect(tag([0, 0, 0], [3, 0, 4])).toBe("XY");
    expect(tag([0, 0, 0], [0, 3, 4])).toBe("YZ");
    expect(tag([0, 0, 0], [1, 2, 3])).toBe("3D");
    // Noise below what the accuracy shows does not count as an axis.
    expect(tag([0, 0, 0], [10, 0.001, 0])).toBe("X");
  });
});

describe("tape label placement", () => {
  it("finds the middle of a line and its direction there", () => {
    const { point, direction } = screenPolylineMiddle([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 30 }]);
    expect(point).toEqual({ x: 10, y: 10 });
    expect(direction).toEqual({ x: 0, y: 1 });
  });

  it("tells whether a line crosses a box", () => {
    const box = { x: 0, y: 0, w: 10, h: 10 };
    expect(segmentHitsBox({ x: -20, y: 0 }, { x: 20, y: 0 }, box)).toBe(true);
    expect(segmentHitsBox({ x: -20, y: 8 }, { x: 20, y: 8 }, box)).toBe(false);
    expect(segmentHitsBox({ x: 1, y: 1 }, { x: 2, y: 2 }, box)).toBe(true);
  });

  it("puts the label above a flat line, clear of it", () => {
    const line = [{ x: 0, y: 100 }, { x: 200, y: 100 }];
    const placed = placeTapeLabel({ x: 100, y: 100 }, { x: 1, y: 0 }, { w: 60, h: 24 }, [line], []);
    expect(placed.x).toBe(100);
    expect(placed.y).toBeLessThan(100 - 12);
  });

  it("moves to the other side when a line runs close above", () => {
    const line = [{ x: 0, y: 100 }, { x: 200, y: 100 }];
    const above = [{ x: 0, y: 80 }, { x: 200, y: 80 }];
    const placed = placeTapeLabel({ x: 100, y: 100 }, { x: 1, y: 0 }, { w: 60, h: 24 }, [line, above], []);
    expect(placed.y).toBeGreaterThan(100 + 12);
  });

  it("stays close beside a steep line with its middle mark on it", () => {
    const line = [{ x: 100, y: 0 }, { x: 100, y: 200 }];
    const mark = { x: 100, y: 100, w: 12, h: 12 };
    const placed = placeTapeLabel({ x: 100, y: 100 }, { x: 0, y: 1 }, { w: 80, h: 24 }, [line], [mark]);
    expect(Math.abs(placed.x - 100)).toBeLessThanOrEqual(40 + 8);
  });

  it("moves to the side of a steep line, not onto it", () => {
    const line = [{ x: 100, y: 0 }, { x: 100, y: 200 }];
    const placed = placeTapeLabel({ x: 100, y: 100 }, { x: 0, y: 1 }, { w: 60, h: 24 }, [line], []);
    expect(Math.abs(placed.x - 100)).toBeGreaterThan(30);
    expect(placed.y).toBe(100);
  });
});
