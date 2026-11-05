import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts, textFont } from "@/lib/textFonts";
import { kerningOf } from "@/lib/textKerning";
import { createTextGeometry, curvedTextLayout, textLayoutFont } from "@/lib/textGeometry";
import { textKerningPatch, textLetterSize } from "@/lib/nameTag";
import { makeShapeFromAsset } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

function text(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "text-1", name: "Text", kind: "text", color: "#ffcc00", x: 0, z: 0, size: 80, width: 80, depth: 14, height: 3, rotation: 0, text: "LAYNE", font: "Multilanguage", ...overrides } as WorkplaneShape;
}

function lineWidth(shape: WorkplaneShape, size = 20) {
  let min = Infinity;
  let max = -Infinity;
  textLayoutFont(shape).generateShapes(shape.text ?? "", size).forEach((glyph) => glyph.getPoints().forEach((point) => {
    min = Math.min(min, point.x);
    max = Math.max(max, point.x);
  }));
  return max - min;
}

describe("automatic kerning (#1297)", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  it("moves open pairs closer and leaves pairs the font spaced well alone", () => {
    for (const name of ["Multilanguage", "Sans", "Serif", "Rounded", "Script"]) {
      const font = textFont(name);
      const resolution = (font.data as unknown as { resolution: number }).resolution;
      for (const pair of ["AY", "LT", "To", "Ty", "T."]) expect(kerningOf(font, pair[0], pair[1]), `${name} ${pair}`).toBeLessThan(-0.02 * resolution);
      for (const pair of ["HH", "NN", "OO", "HO", "AH", "He", "no", "on", "ll"]) expect(kerningOf(font, pair[0], pair[1]), `${name} ${pair}`).toBe(0);
    }
    // In the font of the report the gap between A and Y closes by more than a tenth of the letter size.
    const helvetiker = textFont("Multilanguage");
    expect(kerningOf(helvetiker, "A", "Y")).toBeLessThan(-0.1 * (helvetiker.data as unknown as { resolution: number }).resolution);
    expect(kerningOf(helvetiker, " ", "Y")).toBe(0);
  });

  it("never brings two letters closer than a floor, so they stay apart when printed", () => {
    const font = textFont("Multilanguage");
    const glyphX = (char: string, offset: number) => {
      const xs: Array<{ y: number; x: number }> = [];
      font.generateShapes(char, 1000).forEach((glyph) => glyph.extractPoints(8).shape.forEach((point) => xs.push({ y: point.y, x: point.x + offset })));
      return xs;
    };
    const advance = (font.data as unknown as { glyphs: Record<string, { ha: number }> }).glyphs.A.ha;
    const a = glyphX("A", 0);
    const y = glyphX("Y", advance + kerningOf(font, "A", "Y"));
    // The rightmost point of A lies left of the leftmost point of Y at the same height.
    for (const point of y) {
      const near = a.filter((candidate) => Math.abs(candidate.y - point.y) < 20);
      if (near.length) expect(point.x).toBeGreaterThan(Math.max(...near.map((candidate) => candidate.x)));
    }
  });

  it("changes nothing for a text without it: the same font object as before", () => {
    const plain = text();
    expect(textLayoutFont(plain)).toBe(textFont("Multilanguage"));
    expect(textLayoutFont({ ...plain, textKerning: false })).toBe(textFont("Multilanguage"));
    expect(textLayoutFont({ ...plain, textKerning: true })).not.toBe(textFont("Multilanguage"));
    // Arabic and Hebrew join up and are not kerned.
    expect(textLayoutFont({ ...plain, text: "שלום", textKerning: true })).toBe(textFont("Multilanguage"));
  });

  it("makes a straight line shorter, keeps a line without open pairs as it is, and adds the letter spacing on top", () => {
    const plain = text();
    const kerned = text({ textKerning: true });
    expect(lineWidth(kerned)).toBeLessThan(lineWidth(plain) - 1);
    expect(lineWidth(text({ text: "HOHO", textKerning: true }))).toBeCloseTo(lineWidth(text({ text: "HOHO" })), 6);
    const spacedPlain = lineWidth(text({ textSpacing: 20 }));
    const spacedKerned = lineWidth(text({ textSpacing: 20, textKerning: true }));
    expect(spacedPlain - spacedKerned).toBeCloseTo(lineWidth(plain) - lineWidth(kerned), 6);
    // A new line still starts at the left.
    const twoLines = textLayoutFont(kerned).generateShapes("AY\nH", 20);
    expect(twoLines.length).toBeGreaterThanOrEqual(3);
  });

  it("closes the gap on curved text too, the right way round when it is upside down", () => {
    const arcLength = (shape: WorkplaneShape) => {
      const { glyphs } = curvedTextLayout(shape);
      const angle = (matrix: THREE.Matrix4) => {
        const position = new THREE.Vector3().setFromMatrixPosition(matrix);
        return Math.atan2(position.x, Math.abs(position.z));
      };
      return angle(glyphs[glyphs.length - 1].matrix) - angle(glyphs[0].matrix);
    };
    const curved = text({ textCurved: true, textRadius: 40, textSize: 10 });
    expect(Math.abs(arcLength({ ...curved, textKerning: true }))).toBeLessThan(Math.abs(arcLength(curved)));
    const flipped = { ...curved, textFlipped: true };
    expect(Math.abs(arcLength({ ...flipped, textKerning: true }))).toBeLessThan(Math.abs(arcLength(flipped)));
  });

  it("keeps the letter size when switched, so the box follows the shorter line", () => {
    const shape = text({ text: "LAYNE JOHNSON", width: 120, depth: 12 });
    const size = textLetterSize(shape);
    const kerned = { ...shape, ...textKerningPatch(shape, true) } as WorkplaneShape;
    expect(kerned.textKerning).toBe(true);
    expect(textLetterSize(kerned)).toBeCloseTo(size, 3);
    expect(kerned.width).toBeLessThan(shape.width);
    const geometry = createTextGeometry(kerned);
    expect(geometry.getAttribute("position").count).toBeGreaterThan(100);
  });

  it("goes into a design file and comes back", async () => {
    const { exportLylProject, importLylProject } = await import("@/lib/lylProject");
    const shapes = [text({ textKerning: true }), text({ id: "text-2", x: 40 })];
    const saved = await exportLylProject({ projectName: "Kerning", createdAt: 1, modifiedAt: 2, shapes, history: [], historyIndex: 0, assets: [], compressionLevel: 1 });
    const restored = await importLylProject(saved);
    expect(restored.shapes.map((shape) => shape.textKerning)).toEqual([true, undefined]);
  });

  it("is on for a new text and off for one saved without it", () => {
    const made = makeShapeFromAsset({ id: "text", name: "Text", src: "text.png", kind: "text", color: "#cf101b" });
    expect(made.textKerning).toBe(true);
    expect(text().textKerning).toBeUndefined();
  });
});
