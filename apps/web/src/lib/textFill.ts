import * as THREE from "three";
import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { toCreasedNormals } from "@/lib/creasedNormals";
import { flushLayerSolid } from "@/lib/flushLayers";
import { backInsideOutline, cachedBackInside, tagBackRegion, tagLayerSolid } from "@/lib/tagBack";
import { extrudeOutline, type OutlinePoint } from "@/lib/gearGeometry";
import { maxTextEdgeSize, normalizeTextEdge, textEdgeProfile, textEdgeSide, textHasEdge } from "@/lib/textEdge";
import { loftedTextEdge } from "@/lib/textEdgeLoft";
import { loadedManifoldRuntime, requestManifoldRuntime } from "@/lib/manifoldHandle";
import { normalizeSketchStroke, strokeRegion, type Keep } from "@/lib/sketchStroke";
import { createTextGeometry, freeKeyringStrip, keyringBandCenter, keyringEarRadius, textFillExtent, textGlyphShapes, textKeyringCenter, textKeyringOf, textLetterBox, textLetterOffset } from "@/lib/textGeometry";
import type { TextEdge, TextKeyringSide, WorkplaneShape } from "@/types/layerling";

/**
 * Fill modes for the Text shape (#215, as similar tools's): instead of the filled letters, a line
 * round them - outside, inside or centred on their outline - the letters widened by that line
 * ("Wider", a base layer for a multicolour name tag), and the silhouette without the counters.
 * The letters are the same glyph outlines the edge tool uses, flattened to points at the
 * display's resolution; Manifold's 2D kernel does the widening and the union, and each loose
 * piece of the result is extruded on its own, so the edge tool can still take the pieces apart.
 */

export type TextFillComponent = { outer: OutlinePoint[]; holes: OutlinePoint[][] };

/** Whether this text is drawn through the fill path at all - a key ring hole (#215) is cut there too. */
export function textHasFill(shape: WorkplaneShape) {
  return shape.kind === "text" && (Boolean(normalizeSketchStroke(shape.textStroke)) || Boolean(shape.textSilhouette) || Boolean(textKeyringOf(shape)) || Boolean(shape.textFlush?.pocket) || Boolean(shape.textBack));
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
  const made: CrossSection[] = [];
  const keep: Keep = (section) => {
    made.push(section);
    return section;
  };
  try {
    const result = textBodyRegion(runtime, keep, shape);
    if (!result) return null;
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

/**
 * The outline a text fills, whatever its fill mode: the letters with the fill's line or widening,
 * a key ring's ear and hole. Null when nothing is left.
 */
function textBodyRegion(runtime: ManifoldToplevel, keep: Keep, shape: WorkplaneShape): CrossSection | null {
  const filled = textRegion(runtime, keep, shape);
  if (!filled) return null;
  const eared = withKeyringEar(runtime, keep, shape, filled);
  // The silhouette has no holes at all: dropping each letter's counters is not enough once a
  // wider outline makes neighbouring letters touch and close a pocket between them (#215,
  // "Arany" 1.5 mm wider kept one between n and y). Only the outer rings stay - before the
  // key ring hole is cut, which stays.
  const closed = shape.textSilhouette ? withoutHoles(runtime, keep, eared) : eared;
  const result = keep(withKeyringHole(runtime, keep, shape, closed).simplify(1e-6));
  return result.area() > 1e-9 ? result : null;
}

/** The letters with the fill's line or widening, before any key ring: null without letters. */
function textRegion(runtime: ManifoldToplevel, keep: Keep, shape: WorkplaneShape): CrossSection | null {
  const stroke = normalizeSketchStroke(shape.textStroke);
  const glyphs = textGlyphShapes(shape);
  if (!glyphs) return null;
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
  return stroke ? strokeRegion(keep, region, stroke) : region;
}

/**
 * How far the text's outline - the letters with the fill's line or widening, no key ring -
 * reaches towards a side, from the middle of the letters, within `halfBand` either side of the
 * line through that middle (#215), or `shift` mm along the side off it (#671): where a key ring
 * tab's flat end meets the plate. Null when none of the outline is in the band.
 */
export function textOutlineReach(runtime: ManifoldToplevel, shape: WorkplaneShape, side: TextKeyringSide, halfBand: number, shift = 0): number | null {
  const made: CrossSection[] = [];
  const keep: Keep = (section) => {
    made.push(section);
    return section;
  };
  try {
    const near = outlineInBand(runtime, keep, shape, side, halfBand, shift);
    if (!near) return null;
    const middle = textLetterOffset(shape);
    const reach = near.bounds();
    // Seen from above the letters read along +x with their tops towards -z.
    return side === "right" ? reach.max[0] - middle.x : side === "left" ? middle.x - reach.min[0] : middle.z - reach.min[1];
  } finally {
    new Set(made).forEach((section) => section.delete());
  }
}

/** The text's outline, no key ring, within `halfBand` either side of the line through the letters' middle (moved `shift` along the side) towards a side; null when empty. */
function outlineInBand(runtime: ManifoldToplevel, keep: Keep, shape: WorkplaneShape, side: TextKeyringSide, halfBand: number, shift: number): CrossSection | null {
  const region = textRegion(runtime, keep, shape);
  if (!region || region.isEmpty()) return null;
  const { min, max } = region.bounds();
  const middle = keyringBandCenter(textLetterOffset(shape), side, shift);
  const [x0, z0, x1, z1] = side === "top" ? [middle.x - halfBand, min[1], middle.x + halfBand, max[1]] : [min[0], middle.z - halfBand, max[0], middle.z + halfBand];
  const band = keep(new runtime.CrossSection([[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]], "Positive"));
  const near = keep(region.intersect(band));
  return near.isEmpty() ? null : near;
}

/**
 * Where a key ring hole's middle (#215) stands `clearance` clear of the text's outline - the
 * letters with the fill's line or widening, no key ring - on the line through the letters'
 * middle towards a side: its distance from that middle. Only the outline within `halfBand`
 * either side of that line counts, the band the tab runs in. The line can be moved `shift` mm
 * along the side (#671). Null when none of it is there.
 */
export function textOutlineClearance(runtime: ManifoldToplevel, shape: WorkplaneShape, side: TextKeyringSide, halfBand: number, clearance: number, shift = 0): number | null {
  const made: CrossSection[] = [];
  const keep: Keep = (section) => {
    made.push(section);
    return section;
  };
  try {
    const near = outlineInBand(runtime, keep, shape, side, halfBand, shift);
    if (!near) return null;
    const middle = textLetterOffset(shape);
    const line = keyringBandCenter(middle, side, shift);
    const top = side === "top";
    // Along the side (s, outwards) and across it (v), from the letters' middle; seen from above
    // the letters read along +x with their tops towards -z.
    const along = ([x, z]: readonly number[]) => (side === "right" ? x - middle.x : side === "left" ? middle.x - x : middle.z - z);
    const across = ([x, z]: readonly number[]) => (top ? x - line.x : z - line.z);
    // A point of the outline at (s, v) keeps the middle clear from s + sqrt(c² - v²) on; the
    // furthest such place over the outline's edges is where the middle goes. Along an edge that
    // is a concave function, so a ternary search finds its top.
    let furthest = -Infinity;
    for (const ring of near.toPolygons()) {
      ring.forEach((start, index) => {
        const end = ring[(index + 1) % ring.length];
        const [s0, v0, s1, v1] = [along(start), across(start), along(end), across(end)];
        // Only the part of the edge within the clearance across the line can come that close.
        let low = 0;
        let high = 1;
        if (v1 !== v0) {
          const a = (-clearance - v0) / (v1 - v0);
          const b = (clearance - v0) / (v1 - v0);
          low = Math.max(low, Math.min(a, b));
          high = Math.min(high, Math.max(a, b));
        } else if (Math.abs(v0) > clearance) return;
        if (low > high) return;
        const reach = (t: number) => {
          const v = v0 + t * (v1 - v0);
          return s0 + t * (s1 - s0) + Math.sqrt(Math.max(0, clearance * clearance - v * v));
        };
        for (let step = 0; step < 60 && high - low > 1e-9; step += 1) {
          const left = low + (high - low) / 3;
          const right = high - (high - low) / 3;
          if (reach(left) < reach(right)) low = left;
          else high = right;
        }
        furthest = Math.max(furthest, reach((low + high) / 2));
      });
    }
    return Number.isFinite(furthest) ? furthest : null;
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
 * out from the middle of its side (or where `along` moved it, #671), as wide as the hole and a 1.75 mm wall either side, its far
 * end a half circle round the hole. Inwards the tab runs on until it overlaps the outline by half its width, wherever the
 * letters end on that side, so the two are one piece; outside the plate it stays a clean tab.
 */
function withKeyringEar(runtime: ManifoldToplevel, keep: Keep, shape: WorkplaneShape, filled: CrossSection): CrossSection {
  const keyring = textKeyringOf(shape);
  const center = textKeyringCenter(shape);
  if (!keyring || !center) return filled;
  const disc = (radius: number) => keyringDisc(runtime, keep, center, radius);
  let outline = filled;
  if (keyring.ear && keyring.free) {
    // A free ear (#598) is drawn as it was placed: the disc round the hole and the strip towards the tag.
    const strip = keep(new runtime.CrossSection([freeKeyringStrip(center, keyring.diameter, keyring.free)], "Positive"));
    return keep(keep(filled.add(strip)).add(disc(keyringEarRadius(keyring.diameter))));
  }
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
 * The text's fill as one closed body, extruded by the 2D kernel: the region of the letters with the fill's
 * line or widening and the key ring, from the floor to the text's height, standing the way the text does.
 * Null when the kernel makes nothing of it, so the pieces built by hand take over.
 */
export function textFillClosedGeometry(runtime: ManifoldToplevel, shape: WorkplaneShape): THREE.BufferGeometry | null {
  if (!textHasFill(shape)) return null;
  const made: { delete: () => void }[] = [];
  const keep = <T extends { delete: () => void }>(item: T): T => {
    made.push(item);
    return item;
  };
  try {
    if (shape.textBack) {
      // Text on the back: sunk into the bottom layer's underside, or, for its fill, the letters alone (tagBack.ts),
      // kept inside the layer's outline. The fill has the bottom layer's outline, so both are cut off alike.
      if (shape.textBackFill) {
        const fill = tagLayerSolid(runtime, null, null, 0, 0, textBackInside(runtime, keep as Keep, shape).region, shape.height);
        return fill ? indexedGeometry(fill.positions, fill.indices) : null;
      }
      const own = textBodyRegion(runtime, keep as Keep, shape);
      if (!own) return null;
      const back = textBackInside(runtime, keep as Keep, shape, own).region;
      const pocket = flushPocketRegion(runtime, keep as Keep, shape);
      const solid = tagLayerSolid(runtime, own, pocket, shape.height, pocket && shape.textFlush ? shape.textFlush.depth : 0, back, shape.textBack.depth);
      return solid ? indexedGeometry(solid.positions, solid.indices) : null;
    }
    const region = textBodyRegion(runtime, keep as Keep, shape);
    if (!region) return null;
    const flushed = flushPocketRegion(runtime, keep as Keep, shape);
    if (flushed && shape.textFlush) {
      // A layer laid in flush (#215): the layer above it lies in a pocket in its top.
      const solid = flushLayerSolid(runtime, region, flushed, shape.height, shape.textFlush.depth);
      return solid ? indexedGeometry(solid.positions, solid.indices) : null;
    }
    return extrudedRegionGeometry(keep, region, shape.height);
  } catch {
    return null;
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}

/**
 * A name tag layer's outline without its key ring ear, where its letters stand in it: what the back text is kept inside
 * (tagBack.ts), so no letter runs into the tab or round the hole. Null when nothing is left.
 */
function textPlateRegion(runtime: ManifoldToplevel, keep: Keep, shape: WorkplaneShape): CrossSection | null {
  const { textKeyring: _keyring, textFlush: _flush, textBack: _back, textBackFill: _fill, ...plain } = shape;
  const letters = textLetterBox(shape);
  const reach = textFillExtent(shape);
  const width = letters.width + 2 * reach;
  const depth = letters.depth + 2 * reach;
  const region = textRegion(runtime, keep, { ...plain, width, depth, size: Math.max(width, depth) });
  if (!region || region.isEmpty()) return null;
  const middle = textLetterOffset(shape);
  const placed = middle.x || middle.z ? keep(region.translate([middle.x, middle.z])) : region;
  return shape.textSilhouette ? withoutHoles(runtime, keep, placed) : placed;
}

/**
 * A name tag layer's back text kept inside its outline without the ear (tagBack.ts), worked out once for the layer, its
 * fill and the card: remembered by what the outline and the text are made of. `own` is the layer's outline if known.
 */
function textBackInside(runtime: ManifoldToplevel, keep: Keep, shape: WorkplaneShape, own?: CrossSection | null) {
  const back = shape.textBack!;
  const { id: _id, name: _name, color: _color, x: _x, z: _z, elevation: _elevation, height: _height, rotation: _rotation, rotationX: _rx, rotationZ: _rz, textFlush: _flush, textBackFill: _fill, textEdge: _edge, locked: _locked, hidden: _hidden, ...outline } = shape;
  const key = JSON.stringify({ ...outline, textBack: { text: back.text, size: back.size, font: back.font } });
  return cachedBackInside(runtime, keep, key, () => {
    // Without an ear the layer's own outline is the plate; with one, the plate is worked out without it.
    const plate = shape.textKeyring ? textPlateRegion(runtime, keep, shape) : own ?? textPlateRegion(runtime, keep, shape);
    return plate ? backInsideOutline(keep, tagBackRegion(runtime, keep, back, textLetterOffset(shape)), plate) : { region: null, clipped: false };
  });
}

/** Whether a name tag's bottom layer cuts some of its back text off at its outline (tagBack.ts); false without the 2D kernel. */
export function textBackClipped(runtime: ManifoldToplevel, shape: WorkplaneShape): boolean {
  if (!shape.textBack) return false;
  const made: { delete: () => void }[] = [];
  const keep = <T extends { delete: () => void }>(item: T): T => {
    made.push(item);
    return item;
  };
  try {
    return textBackInside(runtime, keep as Keep, shape).clipped;
  } catch {
    return false;
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}

/**
 * The pocket a name tag layer laid in flush (#215) has in its top: the outline of the layer above it - the same letters with
 * that layer's widening, corners and holes, without a key ring. Null when the layer has none.
 */
function flushPocketRegion(runtime: ManifoldToplevel, keep: Keep, shape: WorkplaneShape): CrossSection | null {
  const pocket = shape.textFlush?.pocket;
  if (!pocket) return null;
  const { textKeyring: _keyring, textStroke: _stroke, textSilhouette: _silhouette, ...plain } = shape;
  const stroke = pocket.grow > 0 ? { width: pocket.grow, align: "grow" as const, join: pocket.join ?? "round", cap: "flat" as const } : undefined;
  // The letters are fitted into a text's box less its fill's reach and its ear: the layer above has a box of its own
  // round the same letters, and the letters stand where they stand in this layer (off its middle beside an ear).
  const letters = textLetterBox(shape);
  const reach = textFillExtent({ textStroke: stroke });
  const width = letters.width + 2 * reach;
  const depth = letters.depth + 2 * reach;
  const above: WorkplaneShape = {
    ...plain,
    width,
    depth,
    size: Math.max(width, depth),
    ...(stroke ? { textStroke: stroke } : {}),
    ...(pocket.silhouette ? { textSilhouette: true } : {}),
  };
  const region = textRegion(runtime, keep, above);
  if (!region || region.isEmpty()) return null;
  const middle = textLetterOffset(shape);
  const placed = middle.x || middle.z ? keep(region.translate([middle.x, middle.z])) : region;
  return pocket.silhouette ? withoutHoles(runtime, keep, placed) : placed;
}

/** Triangles with y up as a display body, its normals creased as a 2D kernel extrusion's. */
function indexedGeometry(positions: Float32Array, indices: Uint32Array): THREE.BufferGeometry {
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(Array.from(indices));
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(12));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}

/** A region of the text's x/z plane as one closed body from the floor to `height`, extruded by the 2D kernel. */
function extrudedRegionGeometry(keep: <T extends { delete: () => void }>(item: T) => T, region: CrossSection, height: number): THREE.BufferGeometry | null {
  const solid = keep(region.extrude(Math.max(1e-3, height)));
  if (solid.status() !== "NoError" || solid.numTri() < 1) return null;
  const mesh = solid.getMesh();
  const stride = mesh.numProp;
  const positions: number[] = [];
  // Manifold's x/y plane is the text's x/z plane and its z the height: x, y and z are swapped, which turns
  // the faces over, so the triangles are written the other way round.
  for (let index = 0; index < mesh.vertProperties.length; index += stride) {
    positions.push(mesh.vertProperties[index], mesh.vertProperties[index + 2], mesh.vertProperties[index + 1]);
  }
  const indices: number[] = [];
  for (let index = 0; index + 2 < mesh.triVerts.length; index += 3) {
    indices.push(mesh.triVerts[index], mesh.triVerts[index + 2], mesh.triVerts[index + 1]);
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(12));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}

/** Whether the kernel takes the triangles of a geometry as a closed solid. */
function geometryIsSolid(runtime: ManifoldToplevel, geometry: THREE.BufferGeometry): boolean {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const vertProperties = new Float32Array(position.count * 3);
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    vertProperties[vertex * 3] = position.getX(vertex);
    vertProperties[vertex * 3 + 1] = position.getY(vertex);
    vertProperties[vertex * 3 + 2] = position.getZ(vertex);
  }
  const triVerts = new Uint32Array(count);
  for (let corner = 0; corner < count; corner += 1) triVerts[corner] = index ? index.getX(corner) : corner;
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties, triVerts, tolerance: 0.0001 });
  try {
    mesh.merge();
    const solid = runtime.Manifold.ofMesh(mesh);
    try {
      return solid.status() === "NoError" && solid.volume() > 0;
    } finally {
      solid.delete();
    }
  } catch {
    return false;
  }
}

/**
 * The text as the union of its letters, extruded by the 2D kernel: one closed body whatever the font's outlines do. Some letters
 * are drawn by outlines that touch or cross themselves - the "#" of most fonts, the "f" of Rounded - and the plain mesh built
 * from them is refused by the 3D kernel as "Not manifold" (#916). Null for curved text, for a text with a bevel (the region
 * cannot carry it) and when the kernel makes nothing of it, and, with `onlyIfOverlapping`, when no letters overlap: strokes that
 * cross make solids that overlap, which the kernel takes but a slice of the mesh (the DXF footprint) leaves open.
 */
export function textJoinedGeometry(runtime: ManifoldToplevel, shape: WorkplaneShape, onlyIfOverlapping = false): THREE.BufferGeometry | null {
  if (shape.kind !== "text" || shape.textCurved || (shape.bevel ?? 0) > 0 || shape.height <= 0) return null;
  const made: { delete: () => void }[] = [];
  const keep = <T extends { delete: () => void }>(item: T): T => {
    made.push(item);
    return item;
  };
  try {
    const glyphs = textGlyphShapes(shape);
    if (!glyphs) return null;
    const letters = glyphs.glyphs.map(({ glyph, map }) => {
      const sampled = glyph.extractPoints(glyphs.curveSegments);
      const rings = [sampled.shape, ...sampled.holes]
        .map((ring) => ring.map((point) => map(point)))
        .map((ring) => ring.map((point) => [point.x, point.z] as [number, number]))
        .filter((ring) => ring.length >= 3);
      return rings.length ? keep(new runtime.CrossSection(rings, "EvenOdd")) : null;
    }).filter((letter): letter is CrossSection => Boolean(letter));
    if (!letters.length) return null;
    const joined = keep(runtime.CrossSection.union(letters));
    if (onlyIfOverlapping) {
      // Letters that only touch share an edge and no area; strokes that cross make the parts add up to more than the whole.
      const separate = letters.reduce((sum, letter) => sum + letter.area(), 0);
      if (separate - joined.area() <= 1e-4 * Math.max(joined.area(), 1e-9)) return null;
    }
    return extrudedRegionGeometry(keep, keep(joined.simplify(1e-6)), shape.height);
  } catch {
    return null;
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}

/**
 * The text's display geometry: the fill path when the text has a fill mode and the 2D kernel is
 * there, else the filled letters. Before the kernel has loaded the text draws plain and asks for
 * it; the viewport draws the text again once it is there (manifoldRevision in its cache key).
 */
export function textDisplayGeometry(shape: WorkplaneShape): THREE.BufferGeometry {
  if (!textHasFill(shape) && !textHasEdge(shape)) {
    const plain = createTextGeometry(shape);
    // A text whose letters the 3D kernel refuses (the "#", #916) is built from the union of its letters instead, once the kernel is there.
    const kernel = loadedManifoldRuntime();
    if (!kernel || shape.textCurved || (shape.bevel ?? 0) > 0) return plain;
    const joined = textJoinedGeometry(kernel, shape, geometryIsSolid(kernel, plain));
    if (!joined) return plain;
    plain.dispose();
    return joined;
  }
  const runtime = loadedManifoldRuntime();
  if (!runtime) {
    requestManifoldRuntime();
    return createTextGeometry(shape);
  }
  if (textHasEdge(shape)) return textEdgeGeometry(runtime, shape) ?? new THREE.BoxGeometry(0.001, shape.height, 0.001);
  // The 2D kernel extrudes the region itself: its mesh is closed whatever the outline looks like, where the
  // pieces built by hand could leave gaps along letters that touch (a line round a block font, #352).
  const closed = textFillClosedGeometry(runtime, shape);
  if (closed) return closed;
  // A back text's fill is its letters alone; the text's own letters are no stand-in for them.
  if (shape.textBackFill) return new THREE.BoxGeometry(0.001, shape.height, 0.001);
  const components = textFillComponents(runtime, shape);
  if (!components) return new THREE.BoxGeometry(0.001, shape.height, 0.001);
  const pieces = components.map((component) => textFillPieceGeometry(component, shape.height));
  const merged = pieces.length === 1 ? pieces[0] : mergeGeometries(pieces, false);
  if (pieces.length > 1) pieces.forEach((piece) => piece.dispose());
  merged.computeBoundingBox();
  return merged;
}

/** Steps the slabs of an edge are built in: about 0.08 mm each, below what a printer lays down, within these limits. */
const EDGE_STEP = 0.08;
const MIN_EDGE_STEPS = 3;
const MAX_EDGE_STEPS = 12;
/**
 * A chamfer's slabs: about 0.1 mm each up to 24 of them, so a chamfer cut into a side wall leaves ledges
 * of 0.1 mm up to 2.4 mm and of 0.21 at 5 mm, not of 0.42. Each slab adds to the build's time, which
 * grows with their number; the round keeps its 12, whose steps follow the curve more closely.
 */
const CHAMFER_SLAB_STEP = 0.1;
const MAX_CHAMFER_SLAB_STEPS = 24;

/** How large the edge is built: as set, at most what its side of a text this high takes. */
function builtEdgeSize(edge: TextEdge, height: number) {
  return Math.min(edge.size, maxTextEdgeSize(height, textEdgeSide(edge)));
}

/**
 * Marks an edge on the bottom (or both ends) to stand where it is built: where every stroke runs out
 * before the underside, nothing reaches it, and a hole or an export must not move the letters down
 * onto it, or the cut would go deeper than the view shows (editorMeshCore's bufferGeometryToMeshData).
 */
function keepEdgeHeight(geometry: THREE.BufferGeometry, edge: TextEdge) {
  if (textEdgeSide(edge) !== "top") geometry.userData.keepsItsHeight = true;
  return geometry;
}

/**
 * The letters stepped in by `inset`, each made once. Stepping in only ever takes away, so once an
 * inset leaves nothing, no deeper one is made: an offset of 40 letters costs the 2D kernel about
 * half a second however deep it goes (measured 21.11.2026, Script), and an edge larger than the
 * strokes are wide would otherwise make every one of them. Asked shallow to deep, the first empty
 * one ends the work.
 */
function insetSections(region: CrossSection, keep: Keep) {
  const sections = new Map<number, CrossSection | null>([[0, region]]);
  let emptyFrom = Infinity;
  return (inset: number): CrossSection | null => {
    if (inset >= emptyFrom) return null;
    if (!sections.has(inset)) {
      const section = keep(region.offset(-inset, "Round", 2, 48));
      if (section.area() <= 1e-9) {
        emptyFrom = inset;
        sections.set(inset, null);
      } else {
        sections.set(inset, section);
      }
    }
    return sections.get(inset) ?? null;
  };
}

/** The insets of a profile from shallow to deep, each once: the order insetSections works best in. */
const insetsShallowFirst = (profile: { inset: number }[]) => [...new Set(profile.map((point) => point.inset))].sort((a, b) => a - b);

/**
 * The text with the edge of its letters rounded or chamfered (#225), on the top, the bottom or
 * both: one smooth skin where the outlines allow it (textEdgeLoft), else slabs. Null when the
 * letters leave nothing to stand on.
 */
export function textEdgeGeometry(runtime: ManifoldToplevel, shape: WorkplaneShape): THREE.BufferGeometry | null {
  const edge = normalizeTextEdge(shape.textEdge);
  if (!edge || shape.height <= 0) return null;
  const made: { delete: () => void }[] = [];
  const keep = <T extends { delete: () => void }>(item: T): T => {
    made.push(item);
    return item;
  };
  try {
    const region = textBodyRegion(runtime, keep as Keep, shape);
    if (!region) return null;
    const size = builtEdgeSize(edge, shape.height);
    const sectionAt = insetSections(region, keep as Keep);
    // The letters stepped in, as rings: the 2D kernel makes them, so they are valid whatever the corners.
    // One array for each inset, so the full outline at both ends of a wall is the same and makes the wall.
    const ringsByInset = new Map<number, { x: number; z: number }[][] | null>();
    const ringsAt = (inset: number) => {
      if (!ringsByInset.has(inset)) {
        const section = sectionAt(inset);
        ringsByInset.set(inset, section ? section.toPolygons().map((polygon) => polygon.map(([x, z]) => ({ x, z }))) : null);
      }
      return ringsByInset.get(inset) ?? null;
    };
    const skinOf = (steps: number) => {
      const profile = textEdgeProfile(edge, size, shape.height, steps);
      if (insetsShallowFirst(profile).some((inset) => !ringsAt(inset))) return null;
      return loftedTextEdge(profile.map((point) => ringsAt(point.inset)!), profile.map((point) => point.height));
    };
    // A chamfer is one slope; a round edge a few segments, fewer for a small one: a printer lays down no finer.
    // A chamfer whose one slope would fold (a long one, a sharp inner corner) tries again in a few shorter
    // ones - not where the strokes run out before its narrow end, which no number of slopes mends.
    const roundSteps = Math.min(8, Math.max(3, Math.ceil(size / 0.12)));
    const skin = edge.kind === "chamfer"
      ? skinOf(1) ?? (sectionAt(size) ? skinOf(Math.min(8, Math.max(2, Math.ceil(size / 0.25)))) : null)
      : skinOf(roundSteps);
    if (skin) {
      const indexed = new THREE.BufferGeometry();
      indexed.setAttribute("position", new THREE.Float32BufferAttribute(skin.positions, 3));
      indexed.setIndex(skin.indices);
      const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(12));
      geometry.computeBoundingBox();
      return keepEdgeHeight(geometry, edge);
    }
    const slabs = textEdgeSlabGeometry(runtime, keep, edge, size, shape.height, sectionAt);
    return slabs ? keepEdgeHeight(slabs, edge) : null;
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}

const footFloats = new WeakMap<WorkplaneShape, boolean>();

/**
 * Whether a piece of the letters is thinner everywhere than twice its edge on the bottom, so that
 * it starts above the underside and would be printed in the air - for a text standing on the bed;
 * a text cut out of a body just cuts shallower there, as a V-shaped bit does. False for an edge on
 * the top, null before the kernel is there. Kept per shape, which changes as a whole when edited.
 */
export function textEdgeFootFloats(shape: WorkplaneShape): boolean | null {
  const edge = normalizeTextEdge(shape.textEdge);
  if (!edge || textEdgeSide(edge) === "top" || !textHasEdge(shape) || shape.height <= 0) return false;
  const known = footFloats.get(shape);
  if (known !== undefined) return known;
  const runtime = loadedManifoldRuntime();
  if (!runtime) return null;
  const made: { delete: () => void }[] = [];
  const keep = <T extends { delete: () => void }>(item: T): T => {
    made.push(item);
    return item;
  };
  try {
    const region = textBodyRegion(runtime, keep as Keep, shape);
    const size = builtEdgeSize(edge, shape.height);
    const floats = Boolean(region) && region!.decompose().map(keep).some((piece) => keep(piece.offset(-size, "Round", 2, 48)).area() <= 1e-9);
    footFloats.set(shape, floats);
    return floats;
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}

/**
 * The same edge built as slabs, which always stand: one slab between each two heights of the
 * outline's profile (textEdgeProfile), each the outline stepped in by the more it stands in at
 * either end, so the steps lie inside the true edge and its narrow end is exactly as far in as
 * asked. The slabs are one union, so the mesh has no faces inside and no gaps. Where the letters
 * are thinner than twice the edge the slabs run out and the edge simply ends in a narrower top,
 * or on the bottom a narrower foot that starts above the underside. Takes the stepped-in outlines
 * the skin already made (`sectionAt`) and leaves what it makes to `keep`, which deletes them.
 * Null when the letters leave nothing to stand on.
 */
function textEdgeSlabGeometry(
  runtime: ManifoldToplevel,
  keep: <T extends { delete: () => void }>(item: T) => T,
  edge: TextEdge,
  size: number,
  height: number,
  sectionAt: (inset: number) => CrossSection | null,
): THREE.BufferGeometry | null {
  const steps = edge.kind === "chamfer"
    ? Math.min(MAX_CHAMFER_SLAB_STEPS, Math.max(MIN_EDGE_STEPS, Math.ceil(size / CHAMFER_SLAB_STEP)))
    : Math.min(MAX_EDGE_STEPS, Math.max(MIN_EDGE_STEPS, Math.ceil(size / EDGE_STEP)));
  const profile = textEdgeProfile(edge, size, height, steps);
  // The slabs are made standing on the plane with the outline's z as y, then turned up: a
  // quarter turn about x takes (x, y, z) to (x, -z, y), so a slab from height a to b is placed from -b to -a.
  const slab = (footprint: CrossSection, from: number, to: number) => keep(keep(runtime.Manifold.extrude(footprint, to - from)).translate([0, 0, -to]));
  // Shallow to deep first, so the first inset that leaves nothing spares every deeper one.
  insetsShallowFirst(profile).forEach(sectionAt);
  const slabs: InstanceType<ManifoldToplevel["Manifold"]>[] = [];
  for (let step = 1; step < profile.length; step += 1) {
    const from = profile[step - 1];
    const to = profile[step];
    if (to.height - from.height <= 1e-6) continue;
    const footprint = sectionAt(Math.max(from.inset, to.inset));
    if (footprint) slabs.push(slab(footprint, from.height, to.height));
  }
  if (!slabs.length) return null;
  const body = keep(keep(runtime.Manifold.union(slabs)).rotate([90, 0, 0]));
  const mesh = body.getMesh();
  if (mesh.triVerts.length < 9) return null;
  const positions: number[] = [];
  for (let offset = 0; offset + 2 < mesh.vertProperties.length; offset += mesh.numProp) {
    positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(Array.from(mesh.triVerts));
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(12));
  geometry.computeBoundingBox();
  return geometry;
}
