import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { normalizeSketchStroke } from "@/lib/sketchStroke";
import { customFontRevision, textFont } from "@/lib/textFonts";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { TextKeyring, TextKeyringSide, WorkplaneShape } from "@/types/layerling";

/** Font size the straight text is laid out at before it is fitted into its box. */
const LAYOUT_SIZE = 20;
export const DEFAULT_TEXT_SIZE = 10;
export const MIN_TEXT_RADIUS = 5;
export const MAX_TEXT_RADIUS = 500;
/** Longest arc the lettering may take, as a share of the full circle - leaves a gap so the ends never meet. */
const MAX_ARC_SHARE = 0.84;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function textOf(shape: Pick<WorkplaneShape, "text">) {
  return (shape.text ?? "TEXT").trim() || " ";
}

function textOptions(shape: WorkplaneShape, size: number) {
  const bevel = clamp(shape.bevel ?? 0, 0, 8);
  const fontName = shape.font ?? "Multilanguage";
  return {
    font: textFont(fontName),
    size,
    depth: shape.height,
    curveSegments: fontName === "Stencil" ? 1 : 8,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel * 0.22,
    bevelSize: bevel * 0.16,
    bevelSegments: Math.max(1, shape.segments ?? 0),
  };
}

/** How far the pen moves after a character - the font's own advance, so "i" and "m" sit as the typeface intends. */
function advanceOf(font: Font, char: string, size: number): number {
  const data = font.data as { resolution?: number; glyphs?: Record<string, { ha?: number }> };
  const glyph = data.glyphs?.[char] ?? data.glyphs?.["?"];
  const resolution = data.resolution || 1000;
  return glyph?.ha !== undefined ? (glyph.ha * size) / resolution : size * 0.6;
}

/** Height of a capital above the baseline - the band a line of text occupies. */
function capHeightOf(font: Font, size: number): number {
  const shapes = font.generateShapes("H", size);
  let top = 0;
  shapes.forEach((outline) => outline.getPoints().forEach((point) => { top = Math.max(top, point.y); }));
  return top > 0 ? top : size * 0.7;
}

function curvedRadius(shape: WorkplaneShape) {
  return clamp(shape.textRadius ?? 30, MIN_TEXT_RADIUS, MAX_TEXT_RADIUS);
}

function curvedSize(shape: WorkplaneShape) {
  return Math.max(0.5, shape.textSize ?? DEFAULT_TEXT_SIZE);
}

/**
 * How far a fill mode (#215) reaches out beyond the letters: a stroke outside or the widened
 * letters by the line width, a centred stroke by half of it. The shape's box is the box of the
 * whole body, so the letters are fitted into the box less this reach all round.
 */
export function textFillExtent(shape: Pick<WorkplaneShape, "textStroke">): number {
  const stroke = normalizeSketchStroke(shape.textStroke);
  if (!stroke) return 0;
  return stroke.align === "outside" || stroke.align === "grow" ? stroke.width : stroke.align === "center" ? stroke.width / 2 : 0;
}

export const TEXT_KEYRING_SIDES: readonly TextKeyringSide[] = ["left", "right", "top"];
/**
 * The ear of a name tag's key ring hole (#215), in the proportions of a tab plazmabokor measured
 * from a printed one: a straight-sided tab 2.35 times the hole wide (a 1.85 mm hole in a 4.34 mm
 * tab), its far end a half circle round the hole, the hole 2.41 times its diameter beyond the
 * bottom layer's edge (4.45 mm for 1.85 mm). They scale with the hole's diameter.
 */
export const DEFAULT_KEYRING_DIAMETER = 1.85;
export const MIN_KEYRING_DIAMETER = 1;
export const MAX_KEYRING_DIAMETER = 20;
export const KEYRING_TAB_WIDTH_RATIO = 2.35;
export const KEYRING_HOLE_DISTANCE_RATIO = 2.41;

export function normalizeTextKeyring(value: unknown): TextKeyring | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<TextKeyring>;
  const diameter = Number(candidate.diameter);
  const offset = Number(candidate.offset);
  if (!Number.isFinite(diameter) || diameter <= 0 || !Number.isFinite(offset)) return undefined;
  return {
    side: TEXT_KEYRING_SIDES.includes(candidate.side as TextKeyringSide) ? candidate.side as TextKeyringSide : "left",
    diameter: clamp(diameter, MIN_KEYRING_DIAMETER, MAX_KEYRING_DIAMETER),
    offset: clamp(offset, 0, 200),
    ...(candidate.ear ? { ear: true } : {}),
  };
}

/**
 * Whether a stored key ring hole is one layerling writes (#215): a known side, a diameter within
 * range, an offset of 0 to 200 mm and the ear switch. A file with anything else is refused rather
 * than read as something else.
 */
export function isTextKeyring(value: unknown): value is TextKeyring {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const finite = (entry: unknown): entry is number => typeof entry === "number" && Number.isFinite(entry);
  return TEXT_KEYRING_SIDES.includes(candidate.side as TextKeyringSide)
    && finite(candidate.diameter) && candidate.diameter >= MIN_KEYRING_DIAMETER && candidate.diameter <= MAX_KEYRING_DIAMETER
    && finite(candidate.offset) && candidate.offset >= 0 && candidate.offset <= 200
    && (candidate.ear === undefined || typeof candidate.ear === "boolean");
}

/** The key ring hole a text is drawn with (#215) - straight text only, curved text has none. */
export function textKeyringOf(shape: Pick<WorkplaneShape, "textKeyring" | "textCurved">): TextKeyring | undefined {
  return shape.textCurved ? undefined : normalizeTextKeyring(shape.textKeyring);
}

/** The radius of the ear's half circle round a key ring hole of this diameter: half the tab's width. */
export function keyringEarRadius(diameter: number) {
  return (KEYRING_TAB_WIDTH_RATIO * diameter) / 2;
}

/** How far beyond the bottom layer's edge the middle of a key ring hole of this diameter sits. */
export function keyringHoleDistance(diameter: number) {
  return KEYRING_HOLE_DISTANCE_RATIO * diameter;
}

/**
 * How far the ear of a key ring hole reaches out beyond the letters and the fill's reach, on
 * its side: what the box gains there. 0 for a text without an ear.
 */
export function textKeyringReach(shape: Pick<WorkplaneShape, "textKeyring" | "textCurved" | "textStroke">): number {
  const keyring = textKeyringOf(shape);
  if (!keyring?.ear) return 0;
  return Math.max(0, keyring.offset + keyringEarRadius(keyring.diameter) - textFillExtent(shape));
}

/** The box the letters themselves are laid out in: the shape's box less the fill's reach and the ear's. */
export function textLetterBox(shape: WorkplaneShape) {
  const extent = textFillExtent(shape);
  const reach = textKeyringReach(shape);
  const side = textKeyringOf(shape)?.side;
  return {
    width: Math.max(1, shapeWidth(shape) - 2 * extent - (side === "left" || side === "right" ? reach : 0)),
    depth: Math.max(1, shapeDepth(shape) - 2 * extent - (side === "top" ? reach : 0)),
  };
}

/** The box a text needs round letters of this size: the fill's reach all round, the ear's on its side. */
export function textBoxAroundLetters(shape: WorkplaneShape, letters: { width: number; depth: number }) {
  const extent = textFillExtent(shape);
  const reach = textKeyringReach(shape);
  const side = textKeyringOf(shape)?.side;
  const width = letters.width + 2 * extent + (side === "left" || side === "right" ? reach : 0);
  const depth = letters.depth + 2 * extent + (side === "top" ? reach : 0);
  return { width, depth, size: Math.max(width, depth) };
}

/**
 * Where the middle of the letters sits in the shape's own frame: the middle of the box, unless an
 * ear takes room on one side - then the letters move half of that to the other side.
 */
export function textLetterOffset(shape: WorkplaneShape): { x: number; z: number } {
  const reach = textKeyringReach(shape);
  if (reach <= 0) return { x: 0, z: 0 };
  const side = textKeyringOf(shape)?.side;
  // Seen from above the letters read along +x with their tops towards -z.
  return { x: side === "right" ? -reach / 2 : side === "left" ? reach / 2 : 0, z: side === "top" ? reach / 2 : 0 };
}

/** The middle of the key ring hole in the shape's own frame, or null without one. */
export function textKeyringCenter(shape: WorkplaneShape): { x: number; z: number } | null {
  const keyring = textKeyringOf(shape);
  if (!keyring) return null;
  const letters = textLetterBox(shape);
  const middle = textLetterOffset(shape);
  if (keyring.side === "top") return { x: middle.x, z: middle.z - letters.depth / 2 - keyring.offset };
  const direction = keyring.side === "right" ? 1 : -1;
  return { x: middle.x + direction * (letters.width / 2 + keyring.offset), z: middle.z };
}

/** The letters' footprint with the fill's reach added: what the shape's width and depth hold. */
function withFillReach(shape: Pick<WorkplaneShape, "textStroke">, footprint: { width: number; depth: number }) {
  const extent = textFillExtent(shape);
  return { width: footprint.width + 2 * extent, depth: footprint.depth + 2 * extent };
}

/**
 * A change of the fill keeps the letters as they are and moves the box instead: a stroke of
 * 1.5 mm outside makes the body 3 mm wider and deeper, back to an area takes it away again.
 */
export function textFillPatch(shape: WorkplaneShape, patch: Partial<WorkplaneShape>): Partial<WorkplaneShape> {
  if (!("textStroke" in patch) && !("textKeyring" in patch)) return patch;
  const letters = textLetterBox(shape);
  const before = textBoxAroundLetters(shape, letters);
  // A key ring's ear (#215) takes room on its side the same way.
  const after = textBoxAroundLetters({ ...shape, ...patch } as WorkplaneShape, letters);
  if (Math.abs(after.width - before.width) < 1e-9 && Math.abs(after.depth - before.depth) < 1e-9) return patch;
  return { ...patch, ...after };
}

/**
 * Curved text at its real measures: the baseline lies on a circle of
 * `textRadius`, the letters stand `textSize` tall. Every glyph keeps the
 * font's baseline (y = 0), so "a", "T", "g" and "." line up exactly as in a
 * straight line - only the line itself is bent. The centre of the circle stays
 * at the origin, so centring the text on a round body puts it concentric.
 *
 * Returns the text options and, for every character that draws something, the
 * matrix that takes its TextGeometry (at the letter size, thickness along +Z) to its
 * place on the circle. The edge tool puts each glyph's exact outline through
 * the same matrices, so its CAD bodies land on the drawn letters.
 */
export function curvedTextLayout(shape: WorkplaneShape) {
  const text = textOf(shape);
  const radius = curvedRadius(shape);
  const font = textFont(shape.font ?? "Multilanguage");
  let size = curvedSize(shape);
  const chars = [...text];

  // Too long for the circle: shrink the letters rather than let the ends overlap.
  const naturalLength = chars.reduce((sum, char) => sum + advanceOf(font, char, size), 0);
  const maxLength = 2 * Math.PI * radius * MAX_ARC_SHARE;
  if (naturalLength > maxLength) size *= maxLength / naturalLength;

  // Upside down: the straight line turned over before it is bent - the letters
  // swap order and each turns half round about the middle of the capital band,
  // so the line keeps its place on the circle and reads from the other side.
  const flipped = Boolean(shape.textFlipped);
  const ordered = flipped ? [...chars].reverse() : chars;
  const advances = ordered.map((char) => advanceOf(font, char, size));
  const totalLength = advances.reduce((sum, advance) => sum + advance, 0);
  const bandMiddle = capHeightOf(font, size) / 2;
  const inward = Boolean(shape.textInward);
  const options = textOptions(shape, size);
  const glyphs: Array<{ char: string; matrix: THREE.Matrix4 }> = [];

  let run = -totalLength / 2;
  ordered.forEach((char, index) => {
    const advance = advances[index];
    const angle = (run + advance / 2) / radius;
    run += advance;
    if (!char.trim()) return;

    // Built right to left: the first factor is the last step.
    const matrix = new THREE.Matrix4();
    if (inward) {
      // Along the bottom of the circle, read left to right, letters pointing at the centre.
      matrix.makeTranslation(radius * Math.sin(angle), 0, radius * Math.cos(angle)).multiply(new THREE.Matrix4().makeRotationY(angle));
    } else {
      // Along the top of the circle, letters pointing away from the centre.
      matrix.makeTranslation(radius * Math.sin(angle), 0, -radius * Math.cos(angle)).multiply(new THREE.Matrix4().makeRotationY(-angle));
    }
    if (flipped) {
      matrix
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, -bandMiddle))
        .multiply(new THREE.Matrix4().makeRotationY(Math.PI))
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, bandMiddle));
    }
    // Centre the advance box on its arc point - horizontally only, the baseline stays at z = 0.
    matrix.multiply(new THREE.Matrix4().makeTranslation(-advance / 2, 0, 0));
    // Flat on the workplane: letter height points to -Z, thickness to +Y.
    matrix.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    glyphs.push({ char, matrix });
  });
  return { options, glyphs };
}

export function buildCurvedText(shape: WorkplaneShape): THREE.BufferGeometry | null {
  const { options, glyphs } = curvedTextLayout(shape);
  const placed = glyphs.map(({ char, matrix }) => new TextGeometry(char, options).applyMatrix4(matrix));
  if (!placed.length) return null;
  const merged = mergeGeometries(placed, false);
  placed.forEach((glyph) => glyph.dispose());
  merged.computeBoundingBox();
  const box = merged.boundingBox;
  if (box) merged.translate(0, -box.min.y, 0);
  return merged;
}

/**
 * The box of curved text is symmetric around the circle centre: as wide and
 * deep as the lettering reaches out from it on either side. It may hold empty
 * space, but the shape's middle is the circle's middle.
 */
function symmetricExtent(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return null;
  return {
    width: Math.max(0.1, 2 * Math.max(Math.abs(box.min.x), Math.abs(box.max.x))),
    depth: Math.max(0.1, 2 * Math.max(Math.abs(box.min.z), Math.abs(box.max.z))),
  };
}

/**
 * The uniform scale that fits curved text into its box - 1 when the box
 * already matches (within 1e-3), as it normally does.
 */
export function curvedTextFitScale(shape: WorkplaneShape, curved: THREE.BufferGeometry): number {
  const extent = symmetricExtent(curved);
  if (!extent) return 1;
  const letters = textLetterBox(shape);
  const scale = Math.min(letters.width / extent.width, letters.depth / extent.depth);
  return Number.isFinite(scale) && Math.abs(scale - 1) > 1e-3 ? scale : 1;
}

const footprintCache = new Map<string, { width: number; depth: number }>();

/** The width and depth curved text takes at its own radius and letter size. */
export function curvedTextFootprint(shape: WorkplaneShape): { width: number; depth: number } {
  const key = JSON.stringify([textOf(shape), shape.font ?? "Multilanguage", customFontRevision(shape.font), curvedSize(shape), curvedRadius(shape), Boolean(shape.textInward), Boolean(shape.textFlipped), shape.bevel ?? 0]);
  const cached = footprintCache.get(key);
  if (cached) return cached;
  const geometry = buildCurvedText({ ...shape, height: 1 });
  let result = { width: curvedSize(shape), depth: curvedSize(shape) };
  if (geometry) {
    result = symmetricExtent(geometry) ?? result;
    geometry.dispose();
  }
  footprintCache.set(key, result);
  return result;
}

/** Width and depth of the straight line at layout size, before it is fitted into its box. */
function straightTextExtent(shape: WorkplaneShape) {
  const geometry = new TextGeometry(textOf(shape), textOptions({ ...shape, height: 1 }, LAYOUT_SIZE));
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const extent = box ? { width: Math.max(1, box.max.x - box.min.x), depth: Math.max(1, box.max.y - box.min.y) } : { width: LAYOUT_SIZE, depth: LAYOUT_SIZE };
  geometry.dispose();
  return extent;
}

const CURVE_KEYS = ["textCurved", "textRadius", "textInward", "textFlipped", "textSize", "text", "font", "bevel", "textStroke"] as const;

/**
 * Keeps curved text and its box in step. Straight text simply fills its box;
 * curved text is defined by radius and letter size, so the box follows them:
 *
 * - switching the curve on takes the letter size the straight text had,
 * - switching it off lays the straight line out at that letter size again,
 * - changing text, font, radius or size re-measures the box,
 * - pulling a handle scales radius and letter size together, so the values in
 *   the inspector always match what is drawn.
 */
export function curvedTextPatch(shape: WorkplaneShape, patch: Partial<WorkplaneShape>): Partial<WorkplaneShape> {
  const next = { ...shape, ...patch } as WorkplaneShape;
  if (next.kind !== "text") return patch;
  const wasCurved = Boolean(shape.textCurved);
  const isCurved = Boolean(next.textCurved);
  // Straight text: only a changed fill moves the box (textFillPatch); the letters fill the rest.
  if (!wasCurved && !isCurved) return textFillPatch(shape, patch);
  const boxOf = (footprint: { width: number; depth: number }) => {
    const box = withFillReach(next, footprint);
    return { ...box, size: Math.max(box.width, box.depth) };
  };

  if (!wasCurved && isCurved) {
    const extent = straightTextExtent(shape);
    const letters = textLetterBox(shape);
    const scale = Math.min(letters.width / extent.width, letters.depth / extent.depth);
    const textSize = Number((patch.textSize ?? LAYOUT_SIZE * scale).toFixed(2));
    const textRadius = patch.textRadius ?? shape.textRadius ?? Math.max(MIN_TEXT_RADIUS, Math.round(shapeWidth(shape) / Math.PI));
    return { ...patch, textSize, textRadius, ...boxOf(curvedTextFootprint({ ...next, textSize, textRadius })) };
  }

  if (wasCurved && !isCurved) {
    const extent = straightTextExtent(next);
    const scale = curvedSize(next) / LAYOUT_SIZE;
    return { ...patch, ...boxOf({ width: extent.width * scale, depth: extent.depth * scale }) };
  }

  const touchesCurve = CURVE_KEYS.some((key) => key in patch);
  const resized = patch.width !== undefined || patch.depth !== undefined || patch.size !== undefined;
  if (resized && !touchesCurve) {
    const current = withFillReach(shape, curvedTextFootprint(shape));
    const factors = [
      patch.width !== undefined ? patch.width / current.width : null,
      patch.depth !== undefined ? patch.depth / current.depth : null,
      patch.width === undefined && patch.depth === undefined && patch.size !== undefined ? patch.size / Math.max(current.width, current.depth) : null,
    ].filter((factor): factor is number => factor !== null && Number.isFinite(factor) && factor > 0);
    // One handle pulled: follow it. Both: the smaller step, so the text still fits.
    const factor = factors.length ? Math.min(...factors) : 1;
    const textSize = Number((curvedSize(shape) * factor).toFixed(2));
    const textRadius = Number(clamp(curvedRadius(shape) * factor, MIN_TEXT_RADIUS, MAX_TEXT_RADIUS).toFixed(2));
    return { ...patch, textSize, textRadius, ...boxOf(curvedTextFootprint({ ...next, textSize, textRadius })) };
  }

  if (touchesCurve) {
    return { ...patch, ...boxOf(curvedTextFootprint(next)) };
  }
  return patch;
}

export type TextGlyphShape = { glyph: THREE.Shape; map: (point: THREE.Vector2) => { x: number; z: number } };

/**
 * The glyphs of a text as the font's outlines, each with the map that takes its points to the
 * workplane (x/z, in mm, about the shape's own centre) - straight text scaled and centred the
 * way createTextGeometry fits it into the letter box, curved text through the matrix that
 * places its display glyph on the circle and the same fit. The exact outlines for the edge
 * tool and the fill modes (#215) both start from these. Null when nothing is drawn.
 */
export function textGlyphShapes(shape: WorkplaneShape): { glyphs: TextGlyphShape[]; curveSegments: number } | null {
  const fontName = shape.font ?? "Multilanguage";
  const curveSegments = fontName === "Stencil" ? 1 : 8;
  const glyphs: TextGlyphShape[] = [];
  if (shape.textCurved) {
    const display = buildCurvedText(shape);
    if (!display) return null;
    const fit = curvedTextFitScale(shape, display);
    display.dispose();
    const { options, glyphs: placed } = curvedTextLayout(shape);
    placed.forEach(({ char, matrix }) => {
      const map = (point: THREE.Vector2) => {
        const world = new THREE.Vector3(point.x, point.y, 0).applyMatrix4(matrix);
        return { x: fit * world.x, z: fit * world.z };
      };
      options.font.generateShapes(char, options.size).forEach((glyph) => glyphs.push({ glyph, map }));
    });
  } else {
    const shapes = textFont(fontName).generateShapes(textOf(shape), LAYOUT_SIZE);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    shapes.forEach((glyph) => {
      const sampled = glyph.extractPoints(curveSegments);
      [sampled.shape, ...sampled.holes].forEach((points) => points.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }));
    });
    const letters = textLetterBox(shape);
    const scale = Math.min(letters.width / Math.max(1, maxX - minX), letters.depth / Math.max(1, maxY - minY));
    // Scaled, turned flat (font y becomes -z) and centred, as the display does - beside an ear, off centre by it.
    const middle = textLetterOffset(shape);
    const map = (point: THREE.Vector2) => ({
      x: scale * point.x - (scale * (minX + maxX)) / 2 + middle.x,
      z: -scale * point.y + (scale * (minY + maxY)) / 2 + middle.z,
    });
    shapes.forEach((glyph) => glyphs.push({ glyph, map }));
  }
  return glyphs.length ? { glyphs, curveSegments } : null;
}

export function createTextGeometry(shape: WorkplaneShape): THREE.BufferGeometry {
  if (shape.textCurved) {
    const curved = buildCurvedText(shape);
    if (!curved) return new THREE.BoxGeometry(0.001, shape.height, 0.001);
    // The box normally matches already; if it does not (older data, a stray
    // width), fit uniformly so the drawing never leaves its own frame.
    const scale = curvedTextFitScale(shape, curved);
    if (scale !== 1) curved.scale(scale, 1, scale);
    curved.computeVertexNormals();
    return curved;
  }

  const geometry = new TextGeometry(textOf(shape), textOptions(shape, LAYOUT_SIZE));
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box) {
    const textWidth = Math.max(1, box.max.x - box.min.x);
    const textDepth = Math.max(1, box.max.y - box.min.y);
    const letters = textLetterBox(shape);
    const scale = Math.min(letters.width / textWidth, letters.depth / textDepth);
    geometry.scale(scale, scale, 1);
  }

  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const rotatedBox = geometry.boundingBox;
  if (rotatedBox) {
    const middle = textLetterOffset(shape);
    geometry.translate(
      -(rotatedBox.min.x + rotatedBox.max.x) / 2 + middle.x,
      -rotatedBox.min.y,
      -(rotatedBox.min.z + rotatedBox.max.z) / 2 + middle.z,
    );
  }
  return geometry;
}
