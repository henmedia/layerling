import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts } from "@/lib/textFonts";
import { createTextGeometry, curvedTextFootprint, curvedTextLayout, curvedTextPatch, textGlyphShapes } from "@/lib/textGeometry";
import { textLetterSize, textLetterSizePatch } from "@/lib/nameTag";
import type { WorkplaneShape } from "@/types/layerling";

function mockShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "test-text",
    name: "Text",
    kind: "text",
    color: "#ff0000",
    x: 0,
    z: 0,
    size: 40,
    width: 40,
    depth: 20,
    height: 10,
    rotation: 0,
    text: "TEST",
    ...overrides,
  };
}

describe("textGeometry", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  it("builds flat linear text geometry with correct height and centered base", () => {
    const shape = mockShape({ text: "HELLO", height: 8 });
    const geometry = createTextGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;

    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeCloseTo(8, 3);
    expect(box.min.x).toBeLessThan(0);
    expect(box.max.x).toBeGreaterThan(0);
  });

  it("builds curved text geometry along an arc", () => {
    const shape = mockShape({
      text: "CIRCULAR",
      textCurved: true,
      textRadius: 40,
      height: 6,
    });
    const geometry = createTextGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;

    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeCloseTo(6, 3);
    // Position attribute must be present and contain triangles
    const pos = geometry.getAttribute("position");
    expect(pos.count).toBeGreaterThan(100);
  });

  it("supports inward facing curved text", () => {
    const shape = mockShape({
      text: "INWARD",
      textCurved: true,
      textRadius: 35,
      textInward: true,
      height: 5,
    });
    const geometry = createTextGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;

    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeCloseTo(5, 3);
    const pos = geometry.getAttribute("position");
    expect(pos.count).toBeGreaterThan(100);
  });

  it("handles spaces and whitespace gracefully", () => {
    const shape = mockShape({
      text: "A B C",
      textCurved: true,
      textRadius: 50,
      height: 4,
    });
    const geometry = createTextGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;

    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeCloseTo(4, 3);
  });

  it("keeps every letter on one baseline instead of centring each on its own", () => {
    // Nearest point of the lettering to the circle centre: the baseline sits on the radius.
    const innerRadius = (text: string) => {
      const shape = mockShape({ text, textCurved: true, textRadius: 40, textSize: 10 });
      const geometry = createTextGeometry({ ...shape, ...curvedTextFootprint(shape) });
      const position = geometry.getAttribute("position");
      let inner = Infinity;
      for (let index = 0; index < position.count; index += 1) {
        inner = Math.min(inner, Math.hypot(position.getX(index), position.getZ(index)));
      }
      return inner;
    };
    // "x", "." and "H" stand on the baseline ...
    expect(innerRadius("x")).toBeCloseTo(40, 0);
    expect(innerRadius(".")).toBeCloseTo(40, 0);
    expect(innerRadius("H")).toBeCloseTo(40, 0);
    // ... and "g" hangs below it, towards the centre.
    expect(innerRadius("g")).toBeLessThan(38);
  });

  it("keeps the circle centre in the middle of its box, with the lettering inside", () => {
    const base = mockShape({ text: "Layerling", textCurved: true, textRadius: 40, textSize: 8 });
    const footprint = curvedTextFootprint(base);
    const geometry = createTextGeometry({ ...base, ...footprint });
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(Math.max(-box.min.x, box.max.x)).toBeCloseTo(footprint.width / 2, 2);
    expect(Math.max(-box.min.z, box.max.z)).toBeCloseTo(footprint.depth / 2, 2);
    // A word along the top of the circle lies above its centre.
    expect(box.max.z).toBeLessThan(0);
  });

  it("turns the letters upside down in place, the line stays where it is", () => {
    const measure = (text: string, textFlipped: boolean) => {
      const shape = mockShape({ text, textCurved: true, textRadius: 40, textSize: 10, textFlipped });
      const geometry = createTextGeometry({ ...shape, ...curvedTextFootprint(shape) });
      geometry.computeBoundingBox();
      const position = geometry.getAttribute("position");
      let inner = Infinity;
      let outer = 0;
      for (let index = 0; index < position.count; index += 1) {
        const distance = Math.hypot(position.getX(index), position.getZ(index));
        inner = Math.min(inner, distance);
        outer = Math.max(outer, distance);
      }
      return { inner, outer, maxZ: geometry.boundingBox!.max.z };
    };
    // Capitals fill the same band either way, above the circle.
    const upright = measure("HHH", false);
    const flipped = measure("HHH", true);
    expect(flipped.maxZ).toBeLessThan(0);
    expect(flipped.inner).toBeCloseTo(upright.inner, 1);
    expect(flipped.outer).toBeCloseTo(upright.outer, 1);
    // A descender turns round with its letter: inward upright, outward flipped.
    expect(measure("HgH", false).inner).toBeLessThan(38);
    expect(measure("HgH", true).inner).toBeCloseTo(40, 0);
    expect(measure("HgH", true).outer).toBeGreaterThan(upright.outer + 1);
  });

  it("takes the straight letter size when the curve is switched on, and the box follows", () => {
    const straight = mockShape({ text: "TEXT", width: 86, depth: 28 });
    const patch = curvedTextPatch(straight, { textCurved: true });
    expect(patch.textSize).toBeGreaterThan(20);
    expect(patch.textRadius).toBeGreaterThan(5);
    const footprint = curvedTextFootprint({ ...straight, ...patch } as WorkplaneShape);
    expect(patch.width).toBeCloseTo(footprint.width, 5);
    expect(patch.depth).toBeCloseTo(footprint.depth, 5);
  });

  it("scales radius and letter size together when a handle is pulled", () => {
    const curved = mockShape({ text: "RING", textCurved: true, textRadius: 30, textSize: 6 });
    const footprint = curvedTextFootprint(curved);
    const shape = { ...curved, ...footprint };
    const patch = curvedTextPatch(shape, { width: footprint.width * 2 });
    expect(patch.textRadius).toBeCloseTo(60, 1);
    expect(patch.textSize).toBeCloseTo(12, 1);
    expect(patch.width).toBeCloseTo(footprint.width * 2, 0);
  });

  it("shrinks letters that would not fit on the circle", () => {
    const footprint = curvedTextFootprint(mockShape({ text: "THIS IS A VERY LONG CURVED TEXT STRING", textCurved: true, textRadius: 30, textSize: 10 }));
    expect(footprint.width).toBeLessThanOrEqual(2 * (30 + 10));
  });
});

describe("stretched text (#382)", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  const footprint = (shape: WorkplaneShape) => {
    const geometry = createTextGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    return { width: box.max.x - box.min.x, depth: box.max.z - box.min.z };
  };

  it("keeps the proportions of the letters in a box that is wider than they need", () => {
    const letters = footprint(mockShape({ text: "T", width: 40, depth: 20, size: 40 }));
    expect(letters.depth).toBeCloseTo(20, 1);
    expect(letters.width).toBeLessThan(39);
    const narrow = footprint(mockShape({ text: "T", width: 40, depth: 10, size: 40 }));
    expect(narrow.width / narrow.depth).toBeCloseTo(letters.width / letters.depth, 2);
  });

  it("fills the whole box in both directions when the letters are stretched", () => {
    const stretched = footprint(mockShape({ text: "T", width: 40, depth: 10, size: 40, textStretch: true }));
    expect(stretched.width).toBeCloseTo(40, 1);
    expect(stretched.depth).toBeCloseTo(10, 1);
  });

  it("draws the exact outlines at the same stretch", () => {
    const shape = mockShape({ text: "T", width: 40, depth: 10, size: 40, textStretch: true });
    const outlines = textGlyphShapes(shape)!;
    const xs: number[] = [];
    const zs: number[] = [];
    outlines.glyphs.forEach(({ glyph, map }) => glyph.extractPoints(8).shape.forEach((point) => {
      const placed = map(point);
      xs.push(placed.x);
      zs.push(placed.z);
    }));
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(40, 1);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(10, 1);
  });

  it("measures the letter size by the height of a stretched box and keeps its width when it is set", () => {
    const shape = mockShape({ text: "T", width: 40, depth: 10, size: 40, textStretch: true });
    const size = textLetterSize(shape);
    const patch = textLetterSizePatch(shape, size * 2);
    expect(patch.width).toBeCloseTo(40, 3);
    expect(patch.depth).toBeCloseTo(20, 1);
  });
  it("runs vertical curved text as a column along the circle, the letters upright (#981)", () => {
    const shape = mockShape({ text: "Harvey", textCurved: true, textVertical: true, textRadius: 40, textSize: 8 });
    const { glyphs } = curvedTextLayout(shape);
    expect(glyphs.map((glyph) => glyph.char).join("")).toBe("Harvey");
    const places = glyphs.map(({ matrix }) => new THREE.Vector3(0, 0, 0).applyMatrix4(matrix));
    // The glyph's own middle is the arc point, so the letters' places (matrix applied to the glyph middle) lie on the circle at the left.
    const middles = glyphs.map(({ char, matrix }) => {
      const outline = curvedTextLayout(shape).options.font.generateShapes(char, curvedTextLayout(shape).options.size).flatMap((glyph) => glyph.getPoints());
      const xs = outline.map((point) => point.x);
      const ys = outline.map((point) => point.y);
      return new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, 0).applyMatrix4(matrix);
    });
    middles.forEach((middle) => {
      expect(Math.hypot(middle.x, middle.z)).toBeCloseTo(40, 3);
      expect(middle.x).toBeLessThan(0);
    });
    // Top to bottom: z grows from letter to letter.
    for (let index = 1; index < middles.length; index += 1) expect(middles[index].z).toBeGreaterThan(middles[index - 1].z);
    // Upright: every letter's height still points to -Z and its width to +X, whatever its place on the arc.
    glyphs.forEach(({ matrix }) => {
      const up = new THREE.Vector3(0, 1, 0).transformDirection(matrix);
      const across = new THREE.Vector3(1, 0, 0).transformDirection(matrix);
      expect(up.z).toBeCloseTo(-1, 6);
      expect(across.x).toBeCloseTo(1, 6);
    });
    expect(places).toHaveLength(6);
  });

  it("puts the vertical curved column on the right with 'along the bottom', and sizes the box for it", () => {
    const left = mockShape({ text: "Harvey", textCurved: true, textVertical: true, textRadius: 40, textSize: 8 });
    const right = { ...left, textInward: true };
    const centre = (shape: WorkplaneShape) => {
      const { glyphs } = curvedTextLayout(shape);
      return glyphs.reduce((sum, { matrix }) => sum + new THREE.Vector3(0, 0, 0).applyMatrix4(matrix).x, 0) / glyphs.length;
    };
    expect(centre(left)).toBeLessThan(0);
    expect(centre(right)).toBeGreaterThan(0);
    const patch = curvedTextPatch({ ...left, textVertical: undefined, textCurved: true } as WorkplaneShape, { textVertical: true });
    expect(patch.width).toBeGreaterThan(70);
  });

  it("shrinks a vertical column that is too long for its circle", () => {
    const text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const shape = mockShape({ text, textCurved: true, textVertical: true, textRadius: 10, textSize: 8 });
    const { options } = curvedTextLayout(shape);
    expect(options.size).toBeLessThan(8);
  });
});
