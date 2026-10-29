import { beforeAll, describe, expect, it } from "vitest";
import { nameTagSource } from "@/lib/editorTextTags";
import { textLetterSize, textLetterSizePatch } from "@/lib/nameTag";
import { surfaceTextOutline } from "@/lib/surfaceTextOutline";
import { loadTextFonts } from "@/lib/textFonts";
import { createTextGeometry, straightTextShapes, textGlyphShapes } from "@/lib/textGeometry";
import { textLayerShapes, DEFAULT_TEXT_LAYERS } from "@/lib/textLayers";
import type { WorkplaneShape } from "@/types/layerling";

// #981: vertical text - the letters stacked top to bottom, on text shapes, name tags and text stuck on a surface.
beforeAll(async () => {
  await loadTextFonts();
});

const text = (overrides: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id: "t", name: "Text", kind: "text", color: "#ffffff", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 60, depth: 20, height: 1.2, size: 60, text: "CRAIG", font: "Sans", ...overrides,
});

/** The middle of each glyph's outline, in the font's own x/y, in the order the font gives them. */
function middles(shapes: ReturnType<typeof straightTextShapes>) {
  return shapes.map((glyph) => {
    const points = glyph.getPoints();
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, top: Math.max(...ys), bottom: Math.min(...ys) };
  });
}

describe("vertical text (#981)", () => {
  it("stacks the letters top to bottom, each centred on one line, without overlapping", () => {
    const shapes = straightTextShapes(text({ textVertical: true }), 20);
    const letters = middles(shapes);
    expect(letters).toHaveLength(5);
    for (const letter of letters) expect(Math.abs(letter.x)).toBeLessThan(0.01);
    for (let index = 1; index < letters.length; index += 1) expect(letters[index].top).toBeLessThan(letters[index - 1].bottom);
    // Side by side it stays the font's line.
    const line = middles(straightTextShapes(text(), 20));
    for (let index = 1; index < line.length; index += 1) expect(line[index].x).toBeGreaterThan(line[index - 1].x);
  });

  it("widens the gap with the spacing and leaves a capital's room for a space", () => {
    const span = (shape: WorkplaneShape) => {
      const letters = middles(straightTextShapes(shape, 20));
      return letters[0].top - letters[letters.length - 1].bottom;
    };
    expect(span(text({ textVertical: true, textSpacing: 50 }))).toBeGreaterThan(span(text({ textVertical: true })) + 30);
    expect(span(text({ textVertical: true, text: "C R" }))).toBeGreaterThan(span(text({ textVertical: true, text: "CR" })) + 10);
  });

  it("turns the box upright at the same letter size, and the drawing stands in it", () => {
    const flat = { ...text(), ...textLetterSizePatch(text(), 10) };
    const size = textLetterSize(flat);
    const upright = { ...flat, textVertical: true, ...textLetterSizePatch({ ...flat, textVertical: true }, size) };
    expect(upright.depth).toBeGreaterThan(upright.width * 3);
    expect(textLetterSize(upright)).toBeCloseTo(size, 3);
    const geometry = createTextGeometry(upright);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.max.z - box.min.z).toBeCloseTo(upright.depth, 1);
    expect(box.max.x - box.min.x).toBeLessThan(upright.depth / 3);
    // The exact outlines for the edge tool and the fills lie on the drawn letters.
    const glyphs = textGlyphShapes(upright)!;
    const zs = glyphs.glyphs.flatMap(({ glyph, map }) => glyph.getPoints().map((point) => map(point).z));
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(box.max.z - box.min.z, 1);
  });

  it("stands a name tag upright, all its layers with it", () => {
    const flat = { ...text(), ...textLetterSizePatch(text(), 9) };
    const source = nameTagSource(flat, { vertical: true });
    expect(source.textVertical).toBe(true);
    expect(textLetterSize(source)).toBeCloseTo(textLetterSize(flat), 3);
    const layers = textLayerShapes(source, DEFAULT_TEXT_LAYERS);
    for (const layer of layers) {
      expect(layer.textVertical).toBe(true);
      expect(layer.depth).toBeGreaterThan(layer.width);
    }
    expect(nameTagSource(source, { vertical: false }).textVertical).toBeUndefined();
  });

  it("stacks text stuck on a surface too", async () => {
    const extent = (rings: number[][]) => {
      const xs = rings.flatMap((ring) => ring.filter((_, index) => index % 2 === 0));
      const ys = rings.flatMap((ring) => ring.filter((_, index) => index % 2 === 1));
      return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    };
    const across = extent(await surfaceTextOutline({ content: "CRAIG", font: "Sans", size: 10 }));
    const down = extent(await surfaceTextOutline({ content: "CRAIG", font: "Sans", size: 10, vertical: true }));
    expect(across.width).toBeGreaterThan(across.height);
    expect(down.height).toBeGreaterThan(down.width * 3);
  });
});
