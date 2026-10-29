import { describe, expect, it } from "vitest";
import { createMoveDimensionOverlay, formatMoveDimension } from "@/lib/moveDimensionLines";

describe("move dimension lines", () => {
  const project = ({ x, z }: { x: number; y: number; z: number }) => ({ x: 400 + x * 4, y: 300 + z * 4 });

  it("creates signed X and Z measurements from the common drag origin", () => {
    const overlay = createMoveDimensionOverlay({
      originX: 10,
      originZ: -5,
      planeY: 0,
      deltaX: -14,
      deltaZ: -17,
      accuracy: 2,
      width: 800,
      height: 600,
      project,
    });

    expect(overlay?.lines.map((line) => [line.axis, line.label])).toEqual([
      ["x", "-14.00"],
      // The move towards the viewer (inside z -17 is away from it) reads as Y +17: Y counts towards the back (#182).
      ["z", "17.00"],
    ]);
    expect(overlay?.lines[0]).toMatchObject({ x1: 452, y1: 280, x2: 384, y2: 280 });
    expect(overlay?.lines[1]).toMatchObject({ x1: 440, y1: 292, x2: 440, y2: 212 });
    expect(overlay?.guides).toEqual([
      { axis: "x", x1: 384, y1: 280, x2: 384, y2: 212 },
      { axis: "z", x1: 440, y1: 212, x2: 384, y2: 212 },
    ]);
  });

  it("uses the workspace accuracy and suppresses near-zero movement", () => {
    expect(formatMoveDimension(-0.0001, 2)).toBe("0.00");
    expect(createMoveDimensionOverlay({
      originX: 0,
      originZ: 0,
      planeY: 0,
      deltaX: 0.004,
      deltaZ: -0.004,
      accuracy: 2,
      width: 800,
      height: 600,
      project,
    })).toBeNull();
  });

  it("shows only the axis that actually moved", () => {
    const overlay = createMoveDimensionOverlay({
      originX: 0,
      originZ: 0,
      planeY: 0,
      deltaX: 12.5,
      deltaZ: 0,
      accuracy: 1,
      width: 800,
      height: 600,
      project,
    });

    expect(overlay?.lines).toHaveLength(1);
    expect(overlay?.lines[0]).toMatchObject({ axis: "x", label: "12.5" });
  });

  it("keeps a single-axis label on a stable side when projection noise changes sign", () => {
    const makeOverlay = (noise: number) => createMoveDimensionOverlay({
      originX: 0,
      originZ: 0,
      planeY: 0,
      deltaX: 12.5,
      deltaZ: 0,
      accuracy: 1,
      width: 800,
      height: 600,
      project: ({ x, z }) => ({
        x: 400 + x * 4,
        y: 300 + z * 4 + (x === 0 && z === 0 ? noise : 0),
      }),
    });

    const above = makeOverlay(0.001)?.lines[0];
    const below = makeOverlay(-0.001)?.lines[0];
    expect(above?.labelY).toBeGreaterThan(300);
    expect(below?.labelY).toBeGreaterThan(300);
  });

  it("measures a lift up the corner, with the label on the side away from the body (#979)", () => {
    // Seen from the front: x to the right, up is up on the screen.
    const front = ({ x, y }: { x: number; y: number; z: number }) => ({ x: 400 + x * 4, y: 300 - y * 4 });
    const lift = (delta: number) => createMoveDimensionOverlay({
      originX: -10,
      originZ: 0,
      planeY: 2,
      deltaX: 0,
      deltaZ: 0,
      lift: { start: { x: -10, y: 2, z: 0 }, axis: { x: 0, y: 1, z: 0 }, delta, side: { x: 0, y: 2, z: 0 } },
      accuracy: 2,
      width: 800,
      height: 600,
      project: front,
    });

    const up = lift(15)?.lines;
    expect(up).toHaveLength(1);
    expect(up?.[0]).toMatchObject({ axis: "lift", label: "15.00", value: 15, x2: 360, y2: 232 });
    expect(up?.[0].labelX).toBeLessThan(360);
    expect(lift(-2)?.lines[0]).toMatchObject({ axis: "lift", label: "-2.00" });
    expect(lift(0.001)).toBeNull();
  });

});
