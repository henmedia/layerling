import * as THREE from "three";
import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { toCreasedNormals } from "@/lib/creasedNormals";
import { extrudeOutline, type OutlinePoint } from "@/lib/gearGeometry";
import { normalizeTextEdge, textEdgeLevels, textHasEdge } from "@/lib/textEdge";
import { loftedTextEdge } from "@/lib/textEdgeLoft";
import { loadedManifoldRuntime, requestManifoldRuntime } from "@/lib/manifoldHandle";
import { normalizeSketchStroke, strokeRegion, type Keep } from "@/lib/sketchStroke";
import { createTextGeometry, freeKeyringStrip, keyringBandCenter, keyringEarRadius, textGlyphShapes, textKeyringCenter, textKeyringOf, textLetterOffset } from "@/lib/textGeometry";
import type { TextKeyringSide, WorkplaneShape } from "@/types/layerling";

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
    const region = textBodyRegion(runtime, keep as Keep, shape);
    if (!region) return null;
    return extrudedRegionGeometry(keep, region, shape.height);
  } catch {
    return null;
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
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
  const components = textFillComponents(runtime, shape);
  if (!components) return new THREE.BoxGeometry(0.001, shape.height, 0.001);
  const pieces = components.map((component) => textFillPieceGeometry(component, shape.height));
  const merged = pieces.length === 1 ? pieces[0] : mergeGeometries(pieces, false);
  if (pieces.length > 1) pieces.forEach((piece) => piece.dispose());
  merged.computeBoundingBox();
  return merged;
}

/** Steps the edge is built in: about 0.08 mm each, below what a printer lays down, within these limits. */
const EDGE_STEP = 0.08;
const MIN_EDGE_STEPS = 3;
const MAX_EDGE_STEPS = 12;

/**
 * The text with its top edge rounded or chamfered (#225): one smooth skin where the outlines allow
 * it (textEdgeLoft), else slabs. Null when the letters leave nothing to stand on.
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
    const size = Math.min(edge.size, shape.height);
    // A chamfer is one slope; a round edge a few segments, fewer for a small one: a printer lays down no finer.
    const steps = edge.kind === "chamfer" ? 1 : Math.min(8, Math.max(3, Math.ceil(size / 0.12)));
    const levels = textEdgeLevels({ kind: edge.kind, size }, steps);
    // The letters stepped in for each boundary of the edge, as rings: the 2D kernel makes them, so they are valid whatever the corners.
    const rings: { x: number; z: number }[][][] = [];
    for (const level of levels) {
      const section = level.inset === 0 ? region : keep(region.offset(-level.inset, "Round", 2, 48));
      if (section.area() <= 1e-9) break;
      rings.push(section.toPolygons().map((polygon) => polygon.map(([x, z]) => ({ x, z }))));
    }
    const skin = rings.length === levels.length ? loftedTextEdge(rings, levels.map((level) => shape.height - size + level.height)) : null;
    if (skin) {
      const indexed = new THREE.BufferGeometry();
      indexed.setAttribute("position", new THREE.Float32BufferAttribute(skin.positions, 3));
      indexed.setIndex(skin.indices);
      const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(12));
      geometry.computeBoundingBox();
      return geometry;
    }
    return textEdgeSlabGeometry(runtime, shape);
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}

/**
 * The same edge built as slabs, which always stand: the body up to where the edge begins,
 * then slabs on top of it, each the outline stepped in by how far the edge has come in at its
 * upper side, so the steps lie inside the true edge and the top is exactly as far in as asked.
 * The slabs are one union, so the mesh has no faces inside and no gaps. Where the letters are
 * thinner than twice the edge the slabs run out and the edge simply ends in a narrower top.
 * Null when the letters leave nothing to stand on.
 */
function textEdgeSlabGeometry(runtime: ManifoldToplevel, shape: WorkplaneShape): THREE.BufferGeometry | null {
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
    const size = Math.min(edge.size, shape.height);
    const steps = Math.min(MAX_EDGE_STEPS, Math.max(MIN_EDGE_STEPS, Math.ceil(size / EDGE_STEP)));
    const levels = textEdgeLevels({ kind: edge.kind, size }, steps);
    const start = shape.height - size;
    // The slabs are made standing on the plane with the outline's z as y, then turned up: a
    // quarter turn about x takes (x, y, z) to (x, -z, y), so a slab from height a to b is placed from -b to -a.
    const slab = (footprint: CrossSection, from: number, to: number) => keep(keep(runtime.Manifold.extrude(footprint, to - from)).translate([0, 0, -to]));
    const slabs: InstanceType<ManifoldToplevel["Manifold"]>[] = [];
    if (start > 1e-4) slabs.push(slab(region, 0, start));
    for (let step = 1; step < levels.length; step += 1) {
      const footprint = keep(region.offset(-levels[step].inset, "Round", 2, 48));
      if (footprint.area() <= 1e-9) break;
      slabs.push(slab(footprint, start + levels[step - 1].height, start + levels[step].height));
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
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}
