import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { textFont } from "@/lib/textFonts";
import type { TagBack } from "@/types/layerling";

/**
 * Text on the back of a name tag or an icon tag: a phone number, an e-mail address. The lines are
 * centred under each other and sunk into the bottom layer's underside, mirrored, so they read
 * the right way round when the tag is turned over sideways, like a page of a book. (Layerling's Bottom
 * view turns a tag over top to bottom instead, so there the text stands on its head.) With a colour of its own the letters are
 * filled flush with the underside by a part in that colour; without, they stay sunk in.
 */

/** How tall a capital of the back text is to begin with, in mm. */
export const DEFAULT_BACK_SIZE = 4;
/** The smallest and largest capital, in mm: under 2 mm a 0.4 mm nozzle no longer draws the letters. */
export const MIN_BACK_SIZE = 2;
export const MAX_BACK_SIZE = 20;
/** How deep the back text is sunk in to begin with, in mm: four print layers of 0.2 mm, as a flat inlay's. */
export const DEFAULT_BACK_DEPTH = 0.8;
export const MIN_BACK_DEPTH = 0.2;
export const MAX_BACK_DEPTH = 3;
/** How much of the bottom layer is kept over the back text at least, in mm: two print layers, so the tag stays one piece. */
export const MIN_BACK_FLOOR = 0.4;
/** The most lines and characters the back takes. */
export const MAX_BACK_LINES = 6;
export const MAX_BACK_LENGTH = 200;
/** The fill's colour to begin with: white, which shows on the usual dark bottom layer. */
export const DEFAULT_BACK_FILL = "#ffffff";
/**
 * How far the back text keeps from the bottom layer's edges, in mm: letters that would come closer are cut off
 * there, so neither the letters' hollows nor their fill break through the tag's outline or its key ring hole.
 */
export const BACK_EDGE_MARGIN = 1;
/** Baseline to baseline, in capitals' heights. */
const LINE_PITCH = 1.6;
/** How finely the letters' curves are drawn, as the text's own. */
const CURVE_SEGMENTS = 8;

const round = (value: number) => Math.round(value * 1000) / 1000;

/** The back's lines as they are built: each line's ends trimmed, empty lines at the start and end dropped, at most MAX_BACK_LINES. */
export function tagBackLines(text: string | undefined): string[] {
  const lines = (text ?? "").slice(0, MAX_BACK_LENGTH).split(/\r?\n/).map((line) => line.trim());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines.slice(0, MAX_BACK_LINES);
}

/** A back as a .lyl file, the card or the AI bridge gives it, or undefined when there is no text on it. */
/**
 * The back text kept BACK_EDGE_MARGIN inside the layer's outline `region`, and whether some of it was cut off there
 * (the card then says it does not fit). Null when nothing of it is left.
 */
export function backInsideOutline(keep: (section: CrossSection) => CrossSection, back: CrossSection | null, region: CrossSection): { region: CrossSection | null; clipped: boolean } {
  if (!back || back.isEmpty()) return { region: null, clipped: false };
  const room = keep(region.offset(-BACK_EDGE_MARGIN, "Round", 2, 32));
  const inside = keep(back.intersect(room));
  const clipped = inside.area() < back.area() * 0.995;
  return { region: inside.isEmpty() ? null : inside, clipped };
}

export function normalizeTagBack(value: unknown): TagBack | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const text = typeof raw.text === "string" ? raw.text.slice(0, MAX_BACK_LENGTH) : "";
  if (!tagBackLines(text).length) return undefined;
  const size = Number(raw.size);
  const depth = Number(raw.depth);
  const fill = typeof raw.fill === "string" && /^#[0-9a-f]{6}$/i.test(raw.fill) ? raw.fill.toLowerCase() : undefined;
  return {
    text,
    size: round(Number.isFinite(size) ? Math.min(MAX_BACK_SIZE, Math.max(MIN_BACK_SIZE, size)) : DEFAULT_BACK_SIZE),
    depth: round(Number.isFinite(depth) ? Math.min(MAX_BACK_DEPTH, Math.max(MIN_BACK_DEPTH, depth)) : DEFAULT_BACK_DEPTH),
    ...(typeof raw.font === "string" && raw.font ? { font: raw.font } : {}),
    ...(fill ? { fill } : {}),
    ...(raw.clipped === true ? { clipped: true } : {}),
  };
}

/**
 * How deep the back text is sunk into a bottom layer this high: the depth asked for, as long as
 * MIN_BACK_FLOOR is kept over it - and, laid in flush, under the pocket in the layer's top as well.
 */
export function tagBackDepthFor(depth: number, bottomHeight: number, flushDepth = 0) {
  const most = Math.max(MIN_BACK_DEPTH, bottomHeight - Math.max(0, flushDepth) - MIN_BACK_FLOOR);
  return round(Math.min(most, Math.max(MIN_BACK_DEPTH, Number.isFinite(depth) ? depth : DEFAULT_BACK_DEPTH)));
}

/** The deepest the back text may go on this bottom layer, for the card's slider. */
export function tagBackMaxDepth(bottomHeight: number, flushDepth = 0) {
  return tagBackDepthFor(MAX_BACK_DEPTH, bottomHeight, flushDepth);
}

/** How tall a capital is in the font at size 1: the scale that makes `size` the capital's height. */
function capitalAtOne(font: ReturnType<typeof textFont>) {
  let top = 0;
  font.generateShapes("H", 1).forEach((outline) => outline.getPoints().forEach((point) => { top = Math.max(top, point.y); }));
  return top > 0 ? top : 0.7;
}

/**
 * The back text as a region of the 2D kernel in a layer's own frame (x along the letters, -z where
 * a tag's top is, as it is seen from above), mirrored left to right so it reads the right way round
 * when the tag is turned over sideways like a page of a book, its lines centred under each other
 * and the whole block centred on `middle`. Null without any letters.
 */
export function tagBackRegion(runtime: ManifoldToplevel, keep: (section: CrossSection) => CrossSection, back: TagBack, middle: { x: number; z: number }): CrossSection | null {
  const lines = tagBackLines(back.text);
  if (!lines.length) return null;
  const font = textFont(back.font);
  const scale = back.size / capitalAtOne(font);
  const pitch = back.size * LINE_PITCH;
  const pieces: CrossSection[] = [];
  lines.forEach((line, row) => {
    if (!line) return;
    const glyphs = font.generateShapes(line, scale).map((glyph) => glyph.extractPoints(CURVE_SEGMENTS));
    let minX = Infinity;
    let maxX = -Infinity;
    glyphs.forEach(({ shape }) => shape.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
    }));
    if (!Number.isFinite(minX)) return;
    const shift = -(minX + maxX) / 2;
    const baseline = -row * pitch;
    glyphs.forEach(({ shape, holes }) => {
      // Mirrored left to right, the font's up towards -z as on the front: turned over sideways like a page of a
      // book, the tag reads the right way round, the first line at the top.
      const rings = [shape, ...holes]
        .filter((ring) => ring.length >= 3)
        .map((ring) => ring.map((point) => [-(point.x + shift), -(point.y + baseline)] as [number, number]));
      if (rings.length) pieces.push(keep(new runtime.CrossSection(rings, "EvenOdd")));
    });
  });
  if (!pieces.length) return null;
  const block = keep(runtime.CrossSection.union(pieces));
  if (block.isEmpty()) return null;
  const { min, max } = block.bounds();
  return keep(block.translate([middle.x - (min[0] + max[0]) / 2, middle.z - (min[1] + max[1]) / 2]));
}

/**
 * A bottom layer with its back text: `region` extruded `height` high, the flush pocket (if any) out
 * of its top `pocketDepth` deep, and the back text out of its underside `backDepth` deep. Or, for the
 * fill (`region` null), the back text alone `backDepth` high. Positions with y up (x, height, the
 * region's second axis), as flushLayerSolid's; null when nothing is left.
 */
export function tagLayerSolid(runtime: ManifoldToplevel, region: CrossSection | null, pocket: CrossSection | null, height: number, pocketDepth: number, back: CrossSection | null, backDepth: number): { positions: Float32Array; indices: Uint32Array } | null {
  const made: Array<{ delete(): void }> = [];
  const keep = <T extends { delete(): void }>(item: T) => {
    made.push(item);
    return item;
  };
  try {
    const safeHeight = Math.max(1e-3, height);
    let solid;
    if (!region) {
      if (!back) return null;
      solid = keep(back.extrude(Math.max(1e-3, backDepth)));
    } else {
      solid = keep(region.extrude(safeHeight));
      if (pocket) {
        if (pocketDepth >= safeHeight - 1e-6) solid = keep(keep(keep(region.subtract(pocket)).simplify(1e-6)).extrude(safeHeight));
        // The cuts reach a little past the faces they open in, so no face of them lies on one of the body's own.
        else solid = keep(solid.subtract(keep(keep(pocket.extrude(pocketDepth + 0.01)).translate([0, 0, safeHeight - pocketDepth]))));
      }
      if (back) solid = keep(solid.subtract(keep(keep(back.extrude(backDepth + 0.01)).translate([0, 0, -0.01]))));
    }
    if (solid.status() !== "NoError" || solid.isEmpty() || solid.numTri() < 1) return null;
    const mesh = solid.getMesh();
    const count = mesh.vertProperties.length / mesh.numProp;
    const positions = new Float32Array(count * 3);
    // The section lies in x and its second axis, the extrusion runs along z: y up is (x, extrusion, second axis).
    for (let vertex = 0; vertex < count; vertex += 1) {
      positions[vertex * 3] = mesh.vertProperties[vertex * mesh.numProp];
      positions[vertex * 3 + 1] = mesh.vertProperties[vertex * mesh.numProp + 2];
      positions[vertex * 3 + 2] = mesh.vertProperties[vertex * mesh.numProp + 1];
    }
    // Swapping two axes mirrors the mesh, so each triangle turns the other way round to keep facing out.
    const indices = new Uint32Array(mesh.triVerts.length);
    for (let index = 0; index < mesh.triVerts.length; index += 3) {
      indices[index] = mesh.triVerts[index];
      indices[index + 1] = mesh.triVerts[index + 2];
      indices[index + 2] = mesh.triVerts[index + 1];
    }
    return indices.length ? { positions, indices } : null;
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}
