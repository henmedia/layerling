import * as THREE from "three";
import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { extrudeOutline, type OutlinePoint } from "@/lib/gearGeometry";
import { loadedManifoldRuntime, requestManifoldRuntime } from "@/lib/manifoldHandle";
import { normalizeSketchStroke, strokeRegion, type Keep } from "@/lib/sketchStroke";
import { createTextGeometry, textGlyphShapes } from "@/lib/textGeometry";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * Fill modes for the Text shape (#215, as Tinkercad's): instead of the filled letters, a line
 * round them - outside, inside or centred on their outline - the letters widened by that line
 * ("Wider", a base layer for a multicolour name tag), and the silhouette without the counters.
 * The letters are the same glyph outlines the edge tool uses, flattened to points at the
 * display's resolution; Manifold's 2D kernel does the widening and the union, and each loose
 * piece of the result is extruded on its own, so the edge tool can still take the pieces apart.
 */

export type TextFillComponent = { outer: OutlinePoint[]; holes: OutlinePoint[][] };

/** Whether this text is drawn through the fill path at all. */
export function textHasFill(shape: WorkplaneShape) {
  return shape.kind === "text" && (Boolean(normalizeSketchStroke(shape.textStroke)) || Boolean(shape.textSilhouette));
}

const signedArea = (points: OutlinePoint[]) => points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point.x * next.z - next.x * point.z;
}, 0) / 2;

/**
 * The filled outline of the text as loose pieces, each an outer ring with its holes, all rings
 * running the same way round (what extrudeOutline wants). Null when nothing is left, or when
 * the text has no fill mode.
 */
export function textFillComponents(runtime: ManifoldToplevel, shape: WorkplaneShape): TextFillComponent[] | null {
  if (!textHasFill(shape)) return null;
  const stroke = normalizeSketchStroke(shape.textStroke);
  const glyphs = textGlyphShapes(shape);
  if (!glyphs) return null;
  const made: CrossSection[] = [];
  const keep: Keep = (section) => {
    made.push(section);
    return section;
  };
  try {
    const letters = glyphs.glyphs.map(({ glyph, map }) => {
      const sampled = glyph.extractPoints(glyphs.curveSegments);
      const rings = (shape.textSilhouette ? [sampled.shape] : [sampled.shape, ...sampled.holes])
        .map((ring) => ring.map((point) => map(point)))
        .map((ring) => ring.map((point) => [point.x, point.z] as [number, number]))
        .filter((ring) => ring.length >= 3);
      return rings.length ? keep(new runtime.CrossSection(rings, "EvenOdd")) : null;
    }).filter((letter): letter is CrossSection => Boolean(letter));
    if (!letters.length) return null;
    const region = keep(runtime.CrossSection.union(letters));
    const filled = stroke ? strokeRegion(runtime, keep, region, stroke) : region;
    const result = keep(filled.simplify(1e-6));
    if (result.area() <= 1e-9) return null;
    const components: TextFillComponent[] = [];
    for (const piece of result.decompose().map(keep)) {
      const rings = piece.toPolygons().map((polygon) => polygon.map(([x, z]) => ({ x, z })));
      const outer = rings.filter((ring) => signedArea(ring) > 0).sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)))[0];
      if (!outer) continue;
      // Holes come the other way round; extrudeOutline wants every ring to run like the outer one.
      const holes = rings.filter((ring) => ring !== outer && signedArea(ring) < 0).map((ring) => [...ring].reverse());
      components.push({ outer, holes });
    }
    return components.length ? components : null;
  } finally {
    new Set(made).forEach((section) => section.delete());
  }
}

/** One piece as a body: the pieces are merged in order, so a piece's triangles stay together. */
export function textFillPieceGeometry(component: TextFillComponent, height: number) {
  return extrudeOutline(component.outer, component.holes, height);
}

/**
 * The text's display geometry: the fill path when the text has a fill mode and the 2D kernel is
 * there, else the filled letters. Before the kernel has loaded the text draws plain and asks for
 * it; the viewport draws the text again once it is there (manifoldRevision in its cache key).
 */
export function textDisplayGeometry(shape: WorkplaneShape): THREE.BufferGeometry {
  if (!textHasFill(shape)) return createTextGeometry(shape);
  const runtime = loadedManifoldRuntime();
  if (!runtime) {
    requestManifoldRuntime();
    return createTextGeometry(shape);
  }
  const components = textFillComponents(runtime, shape);
  if (!components) return new THREE.BoxGeometry(0.001, shape.height, 0.001);
  const pieces = components.map((component) => textFillPieceGeometry(component, shape.height));
  const merged = pieces.length === 1 ? pieces[0] : mergeGeometries(pieces, false);
  if (pieces.length > 1) pieces.forEach((piece) => piece.dispose());
  merged.computeBoundingBox();
  return merged;
}
