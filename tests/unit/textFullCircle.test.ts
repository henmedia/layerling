import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts } from "@/lib/textFonts";
import { curvedRadiusPatch, curvedTextLayout, curvedTextPatch } from "@/lib/textGeometry";
import type { WorkplaneShape } from "@/types/layerling";

// #1840: curved text all the way round its circle, the gap at the join like every other gap.
const text = (overrides: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id: "t", name: "Text", kind: "text", color: "#ff0000", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 60, depth: 12, height: 3, size: 60, text: "H", font: "Sans", textCurved: true, textRadius: 40, textSize: 6, ...overrides,
});

/** Where on the circle each drawn letter's middle lies, in degrees, 0 at the top and clockwise, as seen from above. */
function angles(shape: WorkplaneShape) {
  const { options, glyphs } = curvedTextLayout(shape);
  return glyphs.map(({ char, matrix }) => {
    const box = new THREE.Box2();
    options.font.generateShapes(char, options.size).forEach((glyph) => glyph.extractPoints(8).shape.forEach((point) => box.expandByPoint(point)));
    // The letter's own middle on its baseline: the arc point its box is centred on.
    const middle = new THREE.Vector3((box.min.x + box.max.x) / 2, 0, 0).applyMatrix4(matrix);
    return THREE.MathUtils.radToDeg(Math.atan2(middle.x, -middle.z));
  });
}

/** The steps from each letter to the next, the last one back to the first, in degrees. */
function steps(shape: WorkplaneShape) {
  const at = angles(shape);
  return at.map((angle, index) => (((at[(index + 1) % at.length] - angle) % 360) + 360) % 360);
}

describe("curved text all the way round (#1840)", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  it("leaves a gap at the ends without it, as before", () => {
    const open = steps(text({ text: "H H H H H H H H H H H H H H H H H H H H H H H H H H H H H H H H H H H H", textRadius: 20 }));
    // The line takes at most 84% of the circle: the step across the ends is far larger than the others.
    expect(open[open.length - 1]).toBeGreaterThan(360 * 0.16);
    expect(open[0]).toBeLessThan(15);
  });

  it("spreads words evenly, the join like every other gap", () => {
    const round = steps(text({ text: "H H H H H H", textFullCircle: true }));
    expect(round).toHaveLength(6);
    round.forEach((step) => expect(step).toBeCloseTo(60, 6));
  });

  it("spreads the letters of one word evenly, with no extra space at the join", () => {
    const round = steps(text({ text: "HHHH", textFullCircle: true }));
    round.forEach((step) => expect(step).toBeCloseTo(90, 6));
  });

  it("puts the join opposite the middle of the line", () => {
    const at = angles(text({ text: "H H H H", textFullCircle: true }));
    expect(at[0]).toBeCloseTo(-135, 6);
    expect(at[3]).toBeCloseTo(135, 6);
    // Along the bottom and upside down the line still closes evenly.
    steps(text({ text: "H H H H", textFullCircle: true, textInward: true })).forEach((step) => expect(Math.min(step, 360 - step)).toBeCloseTo(90, 6));
    steps(text({ text: "H H H H", textFullCircle: true, textFlipped: true })).forEach((step) => expect(Math.min(step, 360 - step)).toBeCloseTo(90, 6));
  });

  it("closes a date ring: from 31 back to 1 as far as from 11 to 12", () => {
    const days = Array.from({ length: 31 }, (_, index) => String(index + 1)).join(" ");
    const shape = text({ text: days, textFullCircle: true, textRadius: 60, textSize: 5 });
    const at = angles(shape);
    // 9 single digits, then two digits a day: "1" is the first glyph, "31" the last two, "11" and "12" start at 9 + 2 and 9 + 4.
    expect(at).toHaveLength(9 + 22 * 2);
    const fromLastOne = (((at[0] - at[at.length - 1]) % 360) + 360) % 360;
    const fromElevenOne = at[9 + 4] - at[9 + 3];
    // Both lead from the middle of a "1" over a space to the middle of a "1".
    expect(fromLastOne).toBeCloseTo(fromElevenOne, 6);
    // The letters keep their size: the room left over went between them.
    expect(curvedTextLayout(shape).options.size).toBeCloseTo(5, 9);
  });

  it("makes the letters smaller when the text is too long for the circle, and still closes it evenly", () => {
    const shape = text({ text: "H H H H H H H H H H H H", textFullCircle: true, textRadius: 5, textSize: 10 });
    expect(curvedTextLayout(shape).options.size).toBeLessThan(10);
    steps(shape).forEach((step) => expect(step).toBeCloseTo(30, 6));
  });

  it("is left alone by a column of upright letters", () => {
    const column = text({ text: "HHHH", textVertical: true });
    const plain = curvedTextLayout(column).glyphs.map(({ matrix }) => matrix.elements.slice());
    const asked = curvedTextLayout({ ...column, textFullCircle: true }).glyphs.map(({ matrix }) => matrix.elements.slice());
    expect(asked).toEqual(plain);
  });

  it("re-measures the box when switched on, around the circle's centre", () => {
    const plain = text({ text: "H H H H" });
    const round = { ...plain, ...curvedTextPatch(plain, { textFullCircle: true }) } as WorkplaneShape;
    // Letters at 45°, 135°, ... on a 40 mm circle, standing 6 mm tall outside it: the box reaches out the same on every side.
    expect(round.width).toBeCloseTo(round.depth, 1);
    expect(round.width).toBeGreaterThan(2 * 40 * Math.SQRT1_2);
    expect(round.x).toBe(plain.x);
    expect(round.z).toBe(plain.z);
  });

  it("grows about its centre when the radius changes", () => {
    const round = text({ text: "H H H H", textFullCircle: true });
    expect(curvedRadiusPatch(round, 60)).toEqual({ textRadius: 60 });
    expect(curvedRadiusPatch(text({ text: "H H H H" }), 60)).toHaveProperty("z");
  });
});
