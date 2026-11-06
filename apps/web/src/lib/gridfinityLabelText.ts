import * as THREE from "three";
import { isCustomFontId } from "@/lib/customFonts";
import { GRIDFINITY_LABEL_FONTS, MIN_GRIDFINITY_LABEL_TEXT_SIZE, gridfinityLabelTextPlaces, type GridfinityLabelLetters, type GridfinityLabelTextPlace, type GridfinityShapeFields } from "@/lib/gridfinityGeometry";
import { textFont, textFontsLoaded } from "@/lib/textFonts";
import { straightTextShapes } from "@/lib/textGeometry";

/**
 * The letters on a Gridfinity bin's label shelves (#1308). A shelf's text is laid out as a text shape lays out one line,
 * with its kerning, and fitted into the room on the shelf's top (gridfinityLabelTextPlaces): the box round the letters,
 * descenders and accents included, as large as the room's length and height let it, its capitals at most the bin's
 * letter size where it has one. Below a capital of 3 mm the text is left out; the settings window says so.
 *
 * The fonts live on the page, so the letters are made here and handed to the display mesh (gridfinityLabelledTriangles)
 * and, with the font's own curves, to the exact body (gridfinitySolid.ts) - the worker never reads a font. Each glyph keeps
 * its outline and its holes together, so letters that run into one another, as in Script, are joined rather than cut
 * out of each other.
 */

/**
 * The font of a bin's letters as they are built: a built-in one or a font of one's own, else Multilanguage. A font of
 * one's own this browser does not have keeps its id, so the settings say it is missing; textFont draws Multilanguage
 * meanwhile, as for a text.
 */
export function gridfinityLabelFont(shape: Pick<GridfinityShapeFields, "gridfinityLabelFont">) {
  const font = shape.gridfinityLabelFont;
  return font !== undefined && (GRIDFINITY_LABEL_FONTS.includes(font) || isCustomFontId(font)) ? font : GRIDFINITY_LABEL_FONTS[0];
}

/** The size a line is laid out at before it is scaled into its shelf. */
const LAYOUT_SIZE = 100;

type Layout = {
  glyphs: THREE.Shape[];
  /** Each glyph's outline and holes, as the display mesh draws them, at the layout size. */
  rings: Array<Array<Array<[number, number]>>>;
  /** The box round the letters at the layout size, and a capital's height. */
  box: { minX: number; maxX: number; minY: number; maxY: number };
  capital: number;
  /** Points along each curve: Stencil is drawn with straight segments, as the text shape draws it. */
  segments: number;
};

function layoutOf(text: string, font: string): Layout {
  const segments = font === "Stencil" ? 1 : 6;
  const glyphs = straightTextShapes({ text, font, textKerning: true }, LAYOUT_SIZE);
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const rings = glyphs.map((glyph) => {
    const sampled = glyph.extractPoints(segments);
    return [sampled.shape, ...sampled.holes].filter((points) => points.length >= 3).map((points) => points.map((point): [number, number] => {
      box.minX = Math.min(box.minX, point.x);
      box.maxX = Math.max(box.maxX, point.x);
      box.minY = Math.min(box.minY, point.y);
      box.maxY = Math.max(box.maxY, point.y);
      return [point.x, point.y];
    }));
  });
  let capital = 0;
  textFont(font).generateShapes("H", LAYOUT_SIZE).forEach((glyph) => {
    for (const point of glyph.extractPoints(1).shape) capital = Math.max(capital, point.y);
  });
  return { glyphs, rings, box, capital, segments };
}

/**
 * A shelf's letters fitted into its room: the glyphs at the layout size, the capital's height they are scaled to, and
 * the map from the layout into the shape's x and z.
 */
type GridfinityLabelGlyphs = {
  place: GridfinityLabelTextPlace;
  size: number;
  layout: Layout;
  map: (x: number, y: number) => { x: number; z: number };
};

/**
 * A place's letters as large as its room lets them, or with capitals no higher than the bin's letter size where it has
 * one, so shelves of different lengths match; never under 3 mm on that account, and never larger than the room.
 */
function fitted(place: GridfinityLabelTextPlace, font: string, letterSize = 0): GridfinityLabelGlyphs {
  const layout = layoutOf(place.text, font);
  const { box } = layout;
  const fit = Math.min(place.length / (box.maxX - box.minX), place.height / (box.maxY - box.minY));
  const scale = letterSize > 0 ? Math.min(fit, Math.max(MIN_GRIDFINITY_LABEL_TEXT_SIZE, letterSize) / layout.capital) : fit;
  const [cx, cy] = [(box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2];
  const { centre, along, up } = place;
  const map = (x: number, y: number) => {
    const [a, b] = [(x - cx) * scale, (y - cy) * scale];
    return { x: centre.x + a * along.x + b * up.x, z: centre.z + a * along.z + b * up.z };
  };
  return { place, size: layout.capital * scale, layout, map };
}

/** Whether letters of this capital's height are built: 3 mm or more. */
function largeEnough(glyphs: GridfinityLabelGlyphs) {
  return glyphs.size >= MIN_GRIDFINITY_LABEL_TEXT_SIZE - 1e-9;
}

/** The letters of every shelf whose text fits at 3 mm or more; none before the fonts have loaded, which keeps Node and the tests from throwing (the editor loads the fonts first). */
export function gridfinityLabelGlyphs(shape: GridfinityShapeFields): GridfinityLabelGlyphs[] {
  if (!textFontsLoaded()) return [];
  const font = gridfinityLabelFont(shape);
  return gridfinityLabelTextPlaces(shape).map((place) => fitted(place, font, shape.gridfinityLabelTextSize)).filter(largeEnough);
}

/** The letters as the display mesh joins them: each glyph's rings in the shape's x and z. */
export function gridfinityLabelLetters(shape: GridfinityShapeFields): GridfinityLabelLetters {
  return gridfinityLabelGlyphs(shape).map(({ place, layout, map }) => ({
    top: place.top,
    glyphs: layout.rings.map((rings) => rings.map((ring) => ring.map(([x, y]): [number, number] => {
      const point = map(x, y);
      return [point.x, point.z];
    }))),
  }));
}

/**
 * Whether a shelf that is built leaves its text out because the capitals would come out under 3 mm; `shelf` is the wall
 * or the compartment's column and row. A shelf that is not built has its own note, or none. False before the fonts have
 * loaded, which keeps Node and the tests from throwing (the editor loads the fonts first).
 */
export function gridfinityLabelTextLeftOut(shape: GridfinityShapeFields, shelf: GridfinityLabelTextPlace["shelf"]) {
  if (!textFontsLoaded()) return false;
  const same = (other: GridfinityLabelTextPlace["shelf"]) => (typeof shelf === "string" ? other === shelf : typeof other !== "string" && other.column === shelf.column && other.row === shelf.row);
  const place = gridfinityLabelTextPlaces(shape).find((entry) => same(entry.shelf));
  return place !== undefined && !largeEnough(fitted(place, gridfinityLabelFont(shape)));
}
