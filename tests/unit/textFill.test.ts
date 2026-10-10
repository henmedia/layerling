import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts } from "@/lib/textFonts";
import { textFillComponents, textFillPieceGeometry, textHasFill, type TextFillComponent } from "@/lib/textFill";
import { textFillExtent, textFillPatch, textLetterBox } from "@/lib/textGeometry";
import type { SketchStroke, WorkplaneShape } from "@/types/layerling";

// #215: fill modes for the Text shape - stroke outside/inside/centred, "Wider" and the silhouette.
let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  await loadTextFonts();
});

function text(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "t", name: "Text", kind: "text", color: "#f00", x: 0, z: 0, rotation: 0,
    width: 40, depth: 20, height: 5, size: 40, text: "O", ...overrides,
  };
}

const stroke = (align: SketchStroke["align"], width = 2): SketchStroke => ({ width, align, join: "miter", cap: "flat" });

const ringArea = (points: { x: number; z: number }[]) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point.x * next.z - next.x * point.z;
}, 0) / 2);
const area = (components: TextFillComponent[]) => components.reduce((sum, { outer, holes }) => sum + ringArea(outer) - holes.reduce((inner, hole) => inner + ringArea(hole), 0), 0);
const bounds = (components: TextFillComponent[]) => {
  const points = components.flatMap((component) => component.outer);
  return {
    width: Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x)),
    depth: Math.max(...points.map((point) => point.z)) - Math.min(...points.map((point) => point.z)),
  };
};

describe("text fill modes (#215)", () => {
  it("only a stroke or the silhouette takes the fill path", () => {
    expect(textHasFill(text())).toBe(false);
    expect(textHasFill(text({ textStroke: stroke("outside") }))).toBe(true);
    expect(textHasFill(text({ textSilhouette: true }))).toBe(true);
    expect(textFillComponents(runtime, text())).toBeNull();
  });

  it("the letters are fitted into the box less the fill's reach, so the body fills the box", () => {
    expect(textFillExtent({ textStroke: stroke("outside", 2) })).toBe(2);
    expect(textFillExtent({ textStroke: stroke("grow", 1.5) })).toBe(1.5);
    expect(textFillExtent({ textStroke: stroke("center", 2) })).toBe(1);
    expect(textFillExtent({ textStroke: stroke("inside", 2) })).toBe(0);
    expect(textFillExtent({})).toBe(0);
    expect(textLetterBox(text({ textStroke: stroke("grow", 1.5) }))).toEqual({ width: 37, depth: 17 });

    const grown = textFillComponents(runtime, text({ textStroke: stroke("grow", 1.5) }))!;
    const box = bounds(grown);
    // The "O" is limited by the box's depth: 17 tall plus 1.5 all round.
    expect(box.depth).toBeCloseTo(20, 0);
    expect(box.width).toBeLessThanOrEqual(40.01);
  });

  it("an outside stroke is a ring round the letter, and 'Wider' the letter grown by the width", () => {
    const grown = textFillComponents(runtime, text({ textStroke: stroke("grow", 1) }))!;
    const outside = textFillComponents(runtime, text({ textStroke: stroke("outside", 1) }))!;
    const centred = textFillComponents(runtime, text({ textStroke: stroke("center", 1) }))!;
    const inside = textFillComponents(runtime, text({ textStroke: stroke("inside", 1) }))!;
    // The same letters in every case (same box less 1 all round for grow/outside, less 0.5 for centred, 0 for inside) - so
    // compare shapes, not sizes: the "O" grown keeps one hole, an outside stroke adds a second ring round it.
    expect(grown).toHaveLength(1);
    expect(grown[0].holes).toHaveLength(1);
    // A stroke follows both edges of the O: a frame round the outside and a frame round the counter, two rings each.
    expect(outside).toHaveLength(2);
    expect(inside).toHaveLength(2);
    outside.forEach((ring) => expect(ring.holes).toHaveLength(1));
    expect(area(outside)).toBeGreaterThan(0);
    expect(area(inside)).toBeGreaterThan(0);
    expect(area(centred)).toBeGreaterThan(0);
    // The grown letter holds more than the ring round it alone.
    expect(area(grown)).toBeGreaterThan(area(outside));
  });

  it("the silhouette drops the counter, and widened letters that touch become one piece", () => {
    const silhouette = textFillComponents(runtime, text({ textSilhouette: true }))!;
    expect(silhouette).toHaveLength(1);
    expect(silhouette[0].holes).toHaveLength(0);
    const plainO = textFillComponents(runtime, text({ textStroke: stroke("inside", 0.5) }))!;
    expect(area(silhouette)).toBeGreaterThan(area(plainO));

    const apart = textFillComponents(runtime, text({ text: "I I", width: 40, textStroke: stroke("grow", 0.3) }))!;
    const joined = textFillComponents(runtime, text({ text: "I I", width: 40, textStroke: stroke("grow", 6) }))!;
    expect(apart).toHaveLength(2);
    expect(joined).toHaveLength(1);
  });

  it("every piece becomes a closed body of the text's height", () => {
    const components = textFillComponents(runtime, text({ text: "AB", textStroke: stroke("outside", 1) }))!;
    for (const component of components) {
      const geometry = textFillPieceGeometry(component, 5);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 6);
      expect(geometry.boundingBox!.max.y).toBeCloseTo(5, 6);
      // Walls plus two caps: a count that is a multiple of three positions per triangle.
      expect(geometry.getAttribute("position").count % 3).toBe(0);
      geometry.dispose();
    }
  });

  it("a changed fill moves the box and leaves the letters alone", () => {
    const plain = text({ width: 40, depth: 20 });
    const grown = textFillPatch(plain, { textStroke: stroke("grow", 1.5) });
    expect(grown).toMatchObject({ width: 43, depth: 23, size: 43 });
    const back = textFillPatch({ ...plain, ...grown } as WorkplaneShape, { textStroke: undefined });
    expect(back).toMatchObject({ width: 40, depth: 20, size: 40 });
    // Inside stays within the letters' box; the silhouette alone changes nothing.
    expect(textFillPatch(plain, { textStroke: stroke("inside", 2) })).toEqual({ textStroke: stroke("inside", 2) });
    expect(textFillPatch(plain, { textSilhouette: true })).toEqual({ textSilhouette: true });
  });
});
