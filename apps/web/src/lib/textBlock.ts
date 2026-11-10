import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import { createLocalId } from "@/lib/localIds";
import { textLetterSize, textLetterSizePatch } from "@/lib/nameTag";
import { MAX_TEXT_LENGTH } from "@/lib/textLength";
import { canonicalizeShape, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A text block (#1207): several lines of text, one text shape each, laid out under one another
 * left-aligned, centred or right-aligned, as a word processor does. Every line stays a text of its
 * own, so it can take another size, font or fill afterwards.
 */
export type TextBlockAlign = "left" | "center" | "right";
export const TEXT_BLOCK_ALIGNS: readonly TextBlockAlign[] = ["left", "center", "right"];

/** At most this many lines, and as many letters per line as a text holds. */
export const MAX_TEXT_BLOCK_LINES = 20;
const MAX_LINE_LENGTH = MAX_TEXT_LENGTH;
/** The room between two lines, in mm, and how much each line may shrink or grow against the one above, in per cent. */
export const DEFAULT_TEXT_BLOCK_GAP = 2;
export const MAX_TEXT_BLOCK_GAP = 100;
export const MIN_TEXT_BLOCK_STEP = 25;
export const MAX_TEXT_BLOCK_STEP = 200;

export type TextBlockOptions = {
  align: TextBlockAlign;
  /** Room between the boxes of two lines, in mm. */
  gap: number;
  /** Each line's letter size in per cent of the one above: 100 all alike, 80 each a fifth smaller. */
  step: number;
};

/** The lines typed, one per line of the field; blank lines are left out and long ones cut to a text's length. */
export function textBlockLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().slice(0, MAX_LINE_LENGTH))
    .filter((line) => line.length > 0)
    .slice(0, MAX_TEXT_BLOCK_LINES);
}

/** A plain straight text the block can start from: not curved, not stacked, without a key ring, not wrapped round a cylinder. */
export function offersTextBlock(shape: WorkplaneShape | null | undefined): shape is WorkplaneShape {
  return Boolean(shape && shape.kind === "text" && !shape.locked && !shape.textCurved && !shape.textVertical && !shape.textKeyring
    && !shape.cylinderWrap && !shape.importedMesh && !shape.cadBrep);
}

function clamp(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/**
 * The lines as text shapes like `source`: the first takes its place and id, the others get new ids. The block's top
 * stays where the text's top was and its left edge, middle or right edge where the text's was, so the first line of a
 * left-aligned block keeps its left edge. A turned text turns the block with it.
 */
export function textBlockFor(source: WorkplaneShape, lines: readonly string[], options: TextBlockOptions): WorkplaneShape[] {
  if (!offersTextBlock(source) || lines.length === 0) return [];
  const gap = clamp(options.gap, 0, MAX_TEXT_BLOCK_GAP, DEFAULT_TEXT_BLOCK_GAP);
  const step = clamp(options.step, MIN_TEXT_BLOCK_STEP, MAX_TEXT_BLOCK_STEP, 100) / 100;
  const base = textLetterSize(source);
  const sized = lines.map((line, index) => {
    const words = { ...source, text: line } as WorkplaneShape;
    return { ...words, ...textLetterSizePatch(words, base * step ** index) } as WorkplaneShape;
  });
  // In the text's own frame the letters read along +x with their tops towards -z.
  const top = -shapeDepth(source) / 2;
  const anchor = options.align === "left" ? -shapeWidth(source) / 2 : options.align === "right" ? shapeWidth(source) / 2 : 0;
  const turn = quaternionForShape(source);
  const mirror = new THREE.Vector3(source.mirrorX ? -1 : 1, source.mirrorY ? -1 : 1, source.mirrorZ ? -1 : 1);
  const round = (value: number) => Number(value.toFixed(3));
  let down = top;
  return sized.map((line, index) => {
    const width = shapeWidth(line);
    const depth = shapeDepth(line);
    const along = options.align === "left" ? anchor + width / 2 : options.align === "right" ? anchor - width / 2 : 0;
    const offset = new THREE.Vector3(along, 0, down + depth / 2).multiply(mirror).applyQuaternion(turn);
    down += depth + gap;
    return canonicalizeShape({
      ...line,
      id: index === 0 ? source.id : createLocalId("text-line"),
      name: lines[index],
      x: round(source.x + offset.x),
      z: round(source.z + offset.z),
      ...(Math.abs(offset.y) > 1e-9 ? { elevation: round((source.elevation ?? 0) + offset.y) } : {}),
    });
  });
}
