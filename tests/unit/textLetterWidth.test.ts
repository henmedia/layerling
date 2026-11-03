import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts } from "@/lib/textFonts";
import { curvedTextLayout, curvedTextPatch, textGlyphShapes, textLetterWidthOf } from "@/lib/textGeometry";
import type { WorkplaneShape } from "@/types/layerling";

// #1196: curved text's letters drawn narrower or wider, in per cent of their own width.
const text = (overrides: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id: "t", name: "Text", kind: "text", color: "#ff0000", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 60, depth: 12, height: 3, size: 60, text: "H", font: "Sans", textCurved: true, textRadius: 500, textSize: 10, ...overrides,
});

/** The extent of every placed glyph point on the workplane, as the layout puts it there. */
function extent(shape: WorkplaneShape) {
  const { options, glyphs } = curvedTextLayout(shape);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  glyphs.forEach(({ char, matrix }) => options.font.generateShapes(char, options.size).forEach((glyph) => glyph.extractPoints(8).shape.forEach((point) => {
    const world = new THREE.Vector3(point.x, point.y, 0).applyMatrix4(matrix);
    minX = Math.min(minX, world.x);
    maxX = Math.max(maxX, world.x);
    minZ = Math.min(minZ, world.z);
    maxZ = Math.max(maxZ, world.z);
  })));
  return { width: maxX - minX, depth: maxZ - minZ, middle: (minX + maxX) / 2 };
}

describe("the letter width of curved text (#1196)", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  it("reads the per cent as a factor, 1 without one, within 25 to 400", () => {
    expect(textLetterWidthOf({})).toBe(1);
    expect(textLetterWidthOf({ textLetterWidth: 150 })).toBe(1.5);
    expect(textLetterWidthOf({ textLetterWidth: 5 })).toBe(0.25);
    expect(textLetterWidthOf({ textLetterWidth: 900 })).toBe(4);
  });

  it("stretches a letter across and keeps its height and its place on the arc", () => {
    const plain = extent(text());
    const wide = extent(text({ textLetterWidth: 200 }));
    const narrow = extent(text({ textLetterWidth: 50 }));
    expect(wide.width / plain.width).toBeCloseTo(2, 2);
    expect(narrow.width / plain.width).toBeCloseTo(0.5, 2);
    expect(wide.depth).toBeCloseTo(plain.depth, 3);
    expect(wide.middle).toBeCloseTo(plain.middle, 3);
  });

  it("takes more of the arc for wider letters, so they do not run into each other", () => {
    const plain = extent(text({ text: "HELLO", textRadius: 40 }));
    const wide = extent(text({ text: "HELLO", textRadius: 40, textLetterWidth: 150 }));
    expect(wide.width).toBeGreaterThan(plain.width * 1.3);
  });

  it("makes the letters of a column wider and leaves its length along the arc", () => {
    const column = { text: "HI", textVertical: true, textRadius: 40 };
    const plain = extent(text(column));
    const wide = extent(text({ ...column, textLetterWidth: 300 }));
    expect(wide.depth).toBeCloseTo(plain.depth, 1);
    expect(wide.width).toBeGreaterThan(plain.width * 2);
  });

  it("re-measures the box, and the exact outlines follow the drawn letters", () => {
    const base = text({ text: "HELLO", textRadius: 40 });
    const plain = { ...base, ...curvedTextPatch(base, { textSize: 10 }) } as WorkplaneShape;
    const wide = { ...plain, ...curvedTextPatch(plain, { textLetterWidth: 160 }) } as WorkplaneShape;
    expect(wide.width).toBeGreaterThan(plain.width * 1.3);
    // The glyphs the edge tool and the fills start from span the same width as the layout draws.
    const xs = textGlyphShapes(wide)!.glyphs.flatMap(({ glyph, map }) => glyph.extractPoints(8).shape.map((point) => map(point).x));
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(extent(wide).width, 1);
  });
});
