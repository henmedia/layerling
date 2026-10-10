import * as THREE from "three";
import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { extrudeOutline, type OutlinePoint } from "@/lib/gearGeometry";
import { loadedManifoldRuntime, requestManifoldRuntime } from "@/lib/manifoldHandle";
import { normalizeSketchStroke, strokeRegion, type Keep } from "@/lib/sketchStroke";
import { createTextGeometry, keyringEarRadius, textGlyphShapes, textKeyringCenter, textKeyringOf, textLetterOffset } from "@/lib/textGeometry";
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

/** Whether this text is drawn through the fill path at all - a key ring hole (#215) is cut there too. */
export function textHasFill(shape: WorkplaneShape) {
  return shape.kind === "text" && (Boolean(normalizeSketchStroke(shape.textStroke)) || Boolean(shape.textSilhouette) || Boolean(textKeyringOf(shape)));
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
    const eared = withKeyringEar(runtime, keep, shape, filled);
    // The silhouette has no holes at all: dropping each letter's counters is not enough once a
    // wider outline makes neighbouring letters touch and close a pocket between them (#215,
    // "Arany" 1.5 mm wider kept one between n and y). Only the outer rings stay - before the
    // key ring hole is cut, which stays.
    const closed = shape.textSilhouette ? withoutHoles(runtime, keep, eared) : eared;
    const result = keep(withKeyringHole(runtime, keep, shape, closed).simplify(1e-6));
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

/** The outline with only its outer rings: every hole filled, whatever made it. */
function withoutHoles(runtime: ManifoldToplevel, keep: Keep, section: CrossSection): CrossSection {
  const area = (ring: [number, number][]) => ring.reduce((sum, [x, z], index) => {
    const [nextX, nextZ] = ring[(index + 1) % ring.length];
    return sum + x * nextZ - nextX * z;
  }, 0) / 2;
  const outers = section.toPolygons().filter((ring) => area(ring as [number, number][]) > 0);
  return outers.length ? keep(new runtime.CrossSection(outers, "Positive")) : section;
}

/** A key ring hole's disc of this radius round its middle (#215). */
function keyringDisc(runtime: ManifoldToplevel, keep: Keep, center: { x: number; z: number }, radius: number) {
  return keep(keep(runtime.CrossSection.circle(radius, 64)).translate([center.x, center.z]));
}

/** The key ring hole (#215) through the outline, on every layer that has one. */
function withKeyringHole(runtime: ManifoldToplevel, keep: Keep, shape: WorkplaneShape, outline: CrossSection): CrossSection {
  const keyring = textKeyringOf(shape);
  const center = textKeyringCenter(shape);
  if (!keyring || !center) return outline;
  return keep(outline.subtract(keyringDisc(runtime, keep, center, keyring.diameter / 2)));
}

/**
 * The ear of a key ring hole (#215), on the bottom layer: a straight-sided tab sticking straight
 * out from the middle of its side, 2.35 hole diameters wide, its far end a half circle round the
 * hole. Inwards the tab runs on until it overlaps the outline by half its width, wherever the
 * letters end on that side, so the two are one piece; outside the plate it stays a clean tab.
 */
function withKeyringEar(runtime: ManifoldToplevel, keep: Keep, shape: WorkplaneShape, filled: CrossSection): CrossSection {
  const keyring = textKeyringOf(shape);
  const center = textKeyringCenter(shape);
  if (!keyring || !center) return filled;
  const disc = (radius: number) => keyringDisc(runtime, keep, center, radius);
  let outline = filled;
  if (keyring.ear && !filled.isEmpty()) {
    const radius = keyringEarRadius(keyring.diameter);
    const rectangle = (x0: number, z0: number, x1: number, z1: number) => keep(new runtime.CrossSection([[
      [Math.min(x0, x1), Math.min(z0, z1)], [Math.max(x0, x1), Math.min(z0, z1)], [Math.max(x0, x1), Math.max(z0, z1)], [Math.min(x0, x1), Math.max(z0, z1)],
    ]], "Positive"));
    const { min, max } = filled.bounds();
    const top = keyring.side === "top";
    // The band the tab runs in, across the whole outline; where the outline reaches furthest
    // towards the tab inside it, the tab starts half its width further in.
    const band = top ? rectangle(center.x - radius, min[1], center.x + radius, max[1]) : rectangle(min[0], center.z - radius, max[0], center.z + radius);
    const near = keep(filled.intersect(band));
    const middle = textLetterOffset(shape);
    let inner: number;
    if (near.isEmpty()) inner = top ? middle.z : middle.x;
    else {
      const reach = near.bounds();
      inner = keyring.side === "right" ? reach.max[0] - radius : keyring.side === "left" ? reach.min[0] + radius : reach.min[1] + radius;
    }
    const tab = top ? rectangle(center.x - radius, inner, center.x + radius, center.z) : rectangle(inner, center.z - radius, center.x, center.z + radius);
    outline = keep(keep(filled.add(tab)).add(disc(radius)));
  }
  return outline;
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
