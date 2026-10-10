import manifoldModule, { type CrossSection, type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { guideChapterForShape, guideHref, guideSectionForShape } from "@/lib/guideLinks";
import { addTextLayer, MIN_NAME_TAG_LAYERS, NAME_TAG_GAP, removeTextLayer, textLetterSize, textLetterSizePatch } from "@/lib/nameTag";
import { libraryShapeAssets, nameTagAsset, parseDroppedShapeAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { textFillComponents, textHasFill } from "@/lib/textFill";
import { TEXT_FILL_CHOICES, textFillChoice, textLineSettingsInView, textStrokeForChoice, textStrokeWider } from "@/lib/textFillChoice";
import { loadTextFonts } from "@/lib/textFonts";
import { textGlyphShapes } from "@/lib/textGeometry";
import { DEFAULT_TEXT_LAYERS, MAX_TEXT_LAYERS, nameTagOffsets, textLayerShapes, textLayersOf, type TextLayer } from "@/lib/textLayers";
import type { SketchStroke, WorkplaneShape } from "@/types/layerling";

// #215: the name tag panel - letter size, "+" / "–" and the Tinkercad fill list - on top of the layers of textLayers.
let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  await loadTextFonts();
});

const text = (overrides: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id: "t", name: "Text", kind: "text", color: "#ffffff", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 60, depth: 20, height: 1.2, size: 60, text: "Name", font: "Sans", ...overrides,
});

const sized = (shape: WorkplaneShape, size: number) => ({ ...shape, ...textLetterSizePatch(shape, size) });

/** A layer's outline as Manifold sees it, in the world's x/z: the fill path where it has one, else the glyphs. */
function outline(shape: WorkplaneShape, made: CrossSection[]): CrossSection {
  const keep = (section: CrossSection) => {
    made.push(section);
    return section;
  };
  let rings: [number, number][][];
  if (textHasFill(shape)) {
    rings = textFillComponents(runtime, shape)!.flatMap(({ outer, holes }) => [outer, ...holes]).map((ring) => ring.map((point) => [point.x, point.z] as [number, number]));
  } else {
    const glyphs = textGlyphShapes(shape)!;
    rings = glyphs.glyphs.flatMap(({ glyph, map }) => {
      const sampled = glyph.extractPoints(glyphs.curveSegments);
      return [sampled.shape, ...sampled.holes].map((ring) => ring.map((point) => map(point)).map((point) => [point.x, point.z] as [number, number]));
    });
  }
  return keep(keep(new runtime.CrossSection(rings, "EvenOdd")).translate([shape.x, shape.z]));
}

function bounds(section: CrossSection) {
  const { min, max } = section.bounds();
  return { width: max[0] - min[0], depth: max[1] - min[1] };
}

describe("letter size (#215)", () => {
  it("is the height of the capitals, measured on the letters themselves", () => {
    for (const size of [8, 12, 25]) {
      const made: CrossSection[] = [];
      const letters = outline(sized(text({ text: "HI" }), size), made);
      // H and I stand on the baseline and reach the cap height: their outline is exactly that tall.
      expect(bounds(letters).depth).toBeCloseTo(size, 2);
      made.forEach((section) => section.delete());
    }
  });

  it("reads back what was set, and other words or fonts keep it", () => {
    for (const words of ["Anna", "Benjamin", "Zoë", "W"]) {
      for (const font of ["Sans", "Serif", "Rounded"]) {
        const shape = sized(text({ text: words, font }), 12);
        expect(textLetterSize(shape)).toBeCloseTo(12, 6);
      }
    }
    // The capital N of "Name" is the tallest letter of the word: the outline is 12 mm plus at most the overshoot of a and e.
    const made: CrossSection[] = [];
    const name = bounds(outline(sized(text(), 12), made));
    expect(name.depth).toBeGreaterThanOrEqual(12 - 1e-6);
    expect(name.depth).toBeLessThan(12.4);
    made.forEach((section) => section.delete());
  });

  it("follows a box pulled by hand, as the letters do", () => {
    // 60 x 20 is wider than "HI" needs: the depth decides, H is 20 mm tall.
    const made: CrossSection[] = [];
    const shape = text({ text: "HI", width: 60, depth: 20 });
    expect(textLetterSize(shape)).toBeCloseTo(bounds(outline(shape, made)).depth, 2);
    made.forEach((section) => section.delete());
  });
});

describe("the layers of a name tag line up (#215)", () => {
  const stacks: [string, TextLayer[]][] = [
    ["the default three", [...DEFAULT_TEXT_LAYERS]],
    ["five, after + twice", addTextLayer(addTextLayer(DEFAULT_TEXT_LAYERS))],
  ];
  it.each(stacks)("%s: every lower layer holds the one above it, wider by its own grow", (_label, layers) => {
    for (const size of [10, 16]) {
      const source = sized(text({ x: 12, z: -7, elevation: 3 }), size);
      const parts = textLayerShapes(source, layers);
      const made: CrossSection[] = [];
      const outlines = parts.map((part) => outline(part, made));
      for (let index = 1; index < parts.length; index += 1) {
        // What the upper layer covers and the lower one does not: nothing.
        const sticksOut = outlines[index - 1].subtract(outlines[index]);
        made.push(sticksOut);
        expect(sticksOut.area()).toBeLessThan(1e-3);
      }
      // Each layer is wider than the letters by its grow on every side: measured from the outlines.
      const letters = bounds(outlines[0]);
      parts.forEach((part, index) => {
        const box = bounds(outlines[index]);
        expect(box.width - letters.width).toBeCloseTo(2 * layers[index].grow, 1);
        expect(box.depth - letters.depth).toBeCloseTo(2 * layers[index].grow, 1);
        // Stacked from the source's elevation up, the letters on top.
        const below = layers.slice(index + 1).reduce((sum, layer) => sum + layer.height, 0);
        expect(part.elevation).toBeCloseTo(3 + below, 6);
      });
      // A changed letter size reads back from the stack as it was set.
      // textLayerShapes keeps measures to a thousandth of a millimetre.
      expect(textLetterSize(textLayersOf(parts)!.source)).toBeCloseTo(size, 3);
      made.forEach((section) => section.delete());
    }
  });
});

describe("+ and – (#215)", () => {
  it("adds a layer under the last, as much wider again, in a colour not used yet, up to six", () => {
    const four = addTextLayer(DEFAULT_TEXT_LAYERS);
    expect(four).toHaveLength(4);
    expect(four.slice(0, 3)).toEqual(DEFAULT_TEXT_LAYERS);
    expect(four[3]).toEqual({ grow: 4.5, height: 2, color: "#f2cf10", silhouette: true });
    const five = addTextLayer(four);
    expect(five[4]).toEqual({ grow: 6, height: 2, color: "#0098c7", silhouette: true });
    const six = addTextLayer(five);
    expect(six.map((layer) => layer.grow)).toEqual([0, 1.5, 3, 4.5, 6, 7.5]);
    expect(new Set(six.map((layer) => layer.color)).size).toBe(6);
    expect(six).toHaveLength(MAX_TEXT_LAYERS);
    expect(addTextLayer(six)).toEqual(six);
  });

  it("takes the bottom layer away, down to two", () => {
    expect(MIN_NAME_TAG_LAYERS).toBe(2);
    const two = removeTextLayer(DEFAULT_TEXT_LAYERS);
    expect(two).toEqual(DEFAULT_TEXT_LAYERS.slice(0, 2));
    expect(removeTextLayer(two)).toEqual(two);
    expect(removeTextLayer(addTextLayer(DEFAULT_TEXT_LAYERS))).toEqual(DEFAULT_TEXT_LAYERS);
  });
});

describe("the fill list of a plain text, as Tinkercad's (#215)", () => {
  const stroke = (align: SketchStroke["align"], width = 1.2): SketchStroke => ({ width, align, join: "round", cap: "flat" });

  it("maps Filled, Outline, Outer line and Inner line onto area, centred, outside and inside", () => {
    expect(TEXT_FILL_CHOICES.map(({ choice, align }) => [choice, align])).toEqual([
      ["filled", null],
      ["outline", "center"],
      ["outer", "outside"],
      ["inner", "inside"],
    ]);
    expect(textStrokeForChoice("filled", stroke("outside"))).toBeUndefined();
    expect(textStrokeForChoice("outline", stroke("outside"))).toEqual(stroke("center"));
    expect(textStrokeForChoice("outer", stroke("center"))).toEqual(stroke("outside"));
    expect(textStrokeForChoice("inner", stroke("outside"))).toEqual(stroke("inside"));
    // From the filled letters a line starts with the default width.
    expect(textStrokeForChoice("outer", undefined)).toEqual({ width: 2, align: "outside", join: "miter", cap: "flat" });
  });

  it("reads each stroke back as its entry; Wider is filled letters and has its own switch", () => {
    expect(textFillChoice(undefined)).toBe("filled");
    expect(textFillChoice(stroke("center"))).toBe("outline");
    expect(textFillChoice(stroke("outside"))).toBe("outer");
    expect(textFillChoice(stroke("inside"))).toBe("inner");
    expect(textFillChoice(stroke("grow"))).toBe("filled");
    expect(textStrokeWider(true, stroke("inside", 3))).toEqual(stroke("grow", 3));
    expect(textStrokeWider(false, stroke("grow", 3))).toBeUndefined();
  });

  it("shows a line's width and corners right under the list for the three line entries only", () => {
    expect(textLineSettingsInView(textStrokeForChoice("filled", undefined))).toBe(false);
    expect(textLineSettingsInView(textStrokeForChoice("outline", undefined))).toBe(true);
    expect(textLineSettingsInView(textStrokeForChoice("outer", undefined))).toBe(true);
    expect(textLineSettingsInView(textStrokeForChoice("inner", undefined))).toBe(true);
    // "Wider" reads as filled: its corners go with its switch under "More".
    expect(textLineSettingsInView(stroke("grow"))).toBe(false);
  });

  it("each entry builds the outline it names: outer and centred lines reach past the letters, the inner one stays inside", () => {
    const made: CrossSection[] = [];
    const letters = text({ text: "O", width: 20, depth: 20 });
    const filled = outline(letters, made);
    const widths = Object.fromEntries((["outline", "outer", "inner"] as const).map((choice) => {
      const shape = { ...letters, textStroke: textStrokeForChoice(choice, stroke("center", 1)) };
      // The box grows with the stroke's reach so the letters keep their size; measured from the outline.
      const box = bounds(outline({ ...shape, width: 20 + (choice === "outer" ? 2 : choice === "outline" ? 1 : 0), depth: 20 + (choice === "outer" ? 2 : choice === "outline" ? 1 : 0) }, made));
      return [choice, box.width];
    }));
    const letterWidth = bounds(filled).width;
    expect(widths.outer - letterWidth).toBeCloseTo(2, 1);
    expect(widths.outline - letterWidth).toBeCloseTo(1, 1);
    expect(widths.inner - letterWidth).toBeCloseTo(0, 1);
    made.forEach((section) => section.delete());
  });
});

describe("the name list (#215)", () => {
  it("lays the tags out 5 mm apart, the gap layer_text takes when none is given", () => {
    expect(NAME_TAG_GAP).toBe(5);
    expect(nameTagOffsets(3, 50, 20, NAME_TAG_GAP)).toEqual([{ x: 0, z: 0 }, { x: 0, z: 25 }, { x: 0, z: 50 }]);
  });
});

describe("finding the name tag (#215)", () => {
  it("is in the shape library right after Text, as a text, and can be dragged out", () => {
    const ids = libraryShapeAssets.map((asset) => asset.id);
    expect(ids.indexOf("nameTag")).toBe(ids.indexOf("text") + 1);
    expect(nameTagAsset.kind).toBe("text");
    expect(libraryShapeAssets).toHaveLength(toolbarShapeAssets.length + 1);
    // The catalogue of kinds keeps one tile per kind.
    expect(toolbarShapeAssets.some((asset) => asset.id === "nameTag")).toBe(false);
    expect(parseDroppedShapeAsset(JSON.stringify(nameTagAsset))).toMatchObject({ id: "nameTag", kind: "text" });
  });

  it("the question mark of a name tag opens its section of the text chapter", () => {
    const tag = { kind: "mesh" as const, groupedShapes: [{}], groupOperation: "bundle", layeredText: true };
    expect(guideSectionForShape(tag)).toBe("textLayers");
    expect(guideHref("en", guideChapterForShape(tag), guideSectionForShape(tag))).toBe("/guide/text.html#layers-and-name-tags");
    expect(guideHref("de", guideChapterForShape(tag), guideSectionForShape(tag))).toBe("/anleitung/text.html#schichten-und-namensschilder");
    // A plain bundle still opens the bundle's section.
    expect(guideSectionForShape({ kind: "mesh", groupedShapes: [{}], groupOperation: "bundle" })).toBe("bundling");
  });
});
