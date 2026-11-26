import * as THREE from "three";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import manifoldModule, { type CrossSection, type ManifoldToplevel } from "manifold-3d";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { typefaceFromFontFile } from "@/lib/customFonts";
import { flushSketchSolid } from "@/lib/flushSketch";
import { iconLayerProfile } from "@/lib/iconTag";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { tagBackRegion } from "@/lib/tagBack";
import { textFillClosedGeometry } from "@/lib/textFill";
import { loadTextFonts, registerCustomFont, resetCustomFontsForTests } from "@/lib/textFonts";
import { DEFAULT_TEXT_LAYERS, textLayerShapes } from "@/lib/textLayers";
import type { CustomTypeface } from "@/lib/customFonts";
import type { SketchPoint, SketchSegment, TagBack, WorkplaneShape } from "@/types/layerling";

/*
 * Text on the back of a tag in a font that arrives late (a font of one's own a design brings along, or the Japanese
 * face): a tag opened before its font is here is drawn with the fallback letters, and once the font has arrived it is
 * built again with its own, as the front's letters are. The font is kenpixel (CC0, with three.js), whose blocky letters
 * cover a clearly different area than the fallback's.
 */

let runtime: ManifoldToplevel;
let pixel: CustomTypeface;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
  await loadTextFonts();
  const buffer = readFileSync(join(process.cwd(), "node_modules/three/examples/fonts/ttf/kenpixel.ttf"));
  pixel = await typefaceFromFontFile(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer, "kenpixel.ttf", runtime);
});

beforeEach(() => resetCustomFontsForTests());

/** The volume of a mesh of positions and indices, by the divergence theorem. */
function volumeOf(positions: ArrayLike<number>, indices: ArrayLike<number>) {
  let sum = 0;
  for (let corner = 0; corner + 2 < indices.length; corner += 3) {
    const [a, b, c] = [indices[corner], indices[corner + 1], indices[corner + 2]].map((index) => new THREE.Vector3(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]));
    sum += a.dot(b.clone().cross(c));
  }
  return Math.abs(sum / 6);
}

function geometryVolume(geometry: THREE.BufferGeometry | null) {
  expect(geometry).not.toBeNull();
  const position = geometry!.getAttribute("position");
  const index = geometry!.getIndex();
  return volumeOf(position.array, index ? index.array : Array.from({ length: position.count }, (_, corner) => corner));
}

/** The back text's own letters, as the font has them now, filled `depth` high: what a fill holds when nothing is cut off. */
function lettersVolume(back: TagBack, depth: number) {
  const region = tagBackRegion(runtime, (section: CrossSection) => section, back, { x: 0, z: 0 });
  expect(region).not.toBeNull();
  const volume = region!.area() * depth;
  region!.delete();
  return volume;
}

describe("back text in a font that arrives late", () => {
  it("builds a name tag's fill and bottom layer again with the font's own letters", () => {
    const source: WorkplaneShape = {
      id: "t", name: "Tag", kind: "text", color: "#fff", x: 0, z: 0, rotation: 0,
      width: 60, depth: 60, height: 1.2, size: 60, text: "O", font: pixel.id,
    };
    const parts = textLayerShapes(source, DEFAULT_TEXT_LAYERS, [], null, null, { text: "Anna", size: 4, depth: 0.8, fill: "#ffffff" });
    const fill = parts.find((part) => part.textBackFill)!;
    const bottom = parts.find((part) => part.textBack && !part.textBackFill)!;
    const back = fill.textBack!;
    expect(back.font).toBe(pixel.id);
    expect(bottom.textBack?.clipped).toBeFalsy();

    // Opened before the font is here: the fallback letters.
    const fallbackFill = geometryVolume(textFillClosedGeometry(runtime, fill));
    const fallbackBottom = geometryVolume(textFillClosedGeometry(runtime, bottom));
    expect(fallbackFill).toBeCloseTo(lettersVolume(back, fill.height), 1);

    registerCustomFont(pixel, true);
    const ownFill = geometryVolume(textFillClosedGeometry(runtime, fill));
    const ownBottom = geometryVolume(textFillClosedGeometry(runtime, bottom));
    expect(lettersVolume(back, fill.height)).not.toBeCloseTo(fallbackFill, 0);
    expect(ownFill).toBeCloseTo(lettersVolume(back, fill.height), 1);
    expect(ownBottom).not.toBeCloseTo(fallbackBottom, 0);
  });

  it("builds an icon tag's fill again with the font's own letters", () => {
    const half = 25;
    const points: SketchPoint[] = [
      { id: "a", x: -half, z: -half }, { id: "b", x: half, z: -half }, { id: "c", x: half, z: half }, { id: "d", x: -half, z: half },
    ];
    const segments: SketchSegment[] = points.map((point, index) => ({ id: `s${index}`, type: "line", startId: point.id, endId: points[(index + 1) % points.length].id }));
    const back: TagBack = { text: "Anna", size: 4, depth: 0.8, font: pixel.id, fill: "#ffffff" };
    const fillProfile = iconLayerProfile({ points, segments }, DEFAULT_TEXT_LAYERS[2], undefined, undefined, back, true);
    const volume = () => {
      const solid = flushSketchSolid(runtime, fillProfile, back.depth);
      expect(solid).not.toBeNull();
      return volumeOf(solid!.positions, solid!.indices);
    };

    const fallback = volume();
    expect(fallback).toBeCloseTo(lettersVolume(back, back.depth), 1);
    registerCustomFont(pixel, true);
    expect(lettersVolume(back, back.depth)).not.toBeCloseTo(fallback, 0);
    expect(volume()).toBeCloseTo(lettersVolume(back, back.depth), 1);
  });
});
