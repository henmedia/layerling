import * as THREE from "three";
import { normalizeHexColor } from "@/lib/coloredImport";
import { GRIDFINITY_LABEL_TEXT_HEIGHT, GRIDFINITY_LABEL_TEXT_SINK, gridfinityLabelTextGiven, normalizeGridfinityType, type GridfinityLabelLetters } from "@/lib/gridfinityGeometry";
import { gridfinityLabelLetters } from "@/lib/gridfinityLabelText";
import { pointInPolygon, type PlanePoint } from "@/lib/sketchContainment";
import type { MeshData, Vec3 } from "@/lib/editorMeshCore";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The letters on a Gridfinity bin's label shelves in a colour of their own (Discussion #1308), so that a 3MF goes to the
 * slicer with them ready for a second filament instead of a colour change at the shelf's height. The bin stays one body:
 * its letters are found among its faces, as a group's parts are for Multicolor (#153). A face belongs to a letter when a
 * point a hair inside it lies in one, so the letters' tops and sides take their colour and the shelf round them, between
 * them and inside an A or a B keeps the bin's.
 *
 * The view sorts the faces of the bin's mesh once, with the letters' outlines at hand (gridfinityLetterGroups); an
 * export asks the letters as solids (gridfinityLetterMeshes), the same way it asks a group's parts, so it finds them
 * also after a hole has cut the bin and in a group.
 */

/** How far inside a face its point is taken: exportFaceColors takes it 0.02 mm in too, and the two must agree. */
const FACE_PROBE = 0.02;

/** The colour of a bin's letters when it is one of their own (#1308): none on a tray, a baseplate, a hole or a bin without text, and none when it is the bin's own. */
export function gridfinityLabelColor(shape: WorkplaneShape) {
  if (shape.kind !== "gridfinity" || shape.hole || normalizeGridfinityType(shape.gridfinityType) !== "bin" || !gridfinityLabelTextGiven(shape)) return undefined;
  const color = normalizeHexColor(shape.gridfinityLabelColor);
  return color !== normalizeHexColor(shape.color) ? color : undefined;
}

/** A ring's points in x and z, counter-clockwise or clockwise as asked. */
function orientedRing(ring: Array<[number, number]>, clockwise: boolean) {
  const points = ring.map(([x, z]) => new THREE.Vector2(x, z));
  return THREE.ShapeUtils.isClockWise(points) === clockwise ? points : points.reverse();
}

/**
 * Each glyph of a bin's letters as a closed prism, from where it reaches into the shelf up to its top, in the frame the
 * bin's mesh is built in (before it is placed, as geometryMeshForShape gives it). One mesh a glyph: in Script the letters
 * run into one another, and one mesh of overlapping glyphs would count a point in both as outside.
 */
export function gridfinityLetterMeshes(shape: WorkplaneShape): MeshData[] {
  return gridfinityLabelLetters({ ...shape, width: shapeWidth(shape), depth: shapeDepth(shape) }).flatMap(({ top, glyphs }) => glyphs.map((rings) => {
    const loops = rings.map((ring, index) => orientedRing(ring, index > 0));
    const caps = THREE.ShapeUtils.triangulateShape(loops[0], loops.slice(1));
    const points = loops.flat();
    const count = points.length;
    const low = top - GRIDFINITY_LABEL_TEXT_SINK;
    const high = top + GRIDFINITY_LABEL_TEXT_HEIGHT;
    const vertices: Vec3[] = [...points.map((p): Vec3 => [p.x, low, p.y]), ...points.map((p): Vec3 => [p.x, high, p.y])];
    // Counter-clockwise in x and z is clockwise seen from above (+y): the bottom keeps that order, the top turns it.
    const faces: Array<[number, number, number]> = caps.flatMap(([a, b, c]): Array<[number, number, number]> => [[a, b, c], [a + count, c + count, b + count]]);
    let start = 0;
    loops.forEach((loop) => {
      loop.forEach((_, index) => {
        const a = start + index;
        const b = start + ((index + 1) % loop.length);
        faces.push([a, b + count, b], [a, a + count, b + count]);
      });
      start += loop.length;
    });
    return { name: "letter", vertices, faces };
  }));
}

/** Each glyph's rings with the box round it, to find a point's glyph quickly. */
function glyphBoxes(letters: GridfinityLabelLetters) {
  return letters.flatMap(({ glyphs }) => glyphs.map((rings) => {
    const points = rings.flat();
    return {
      rings: rings.map((ring) => ring.map(([x, z]): PlanePoint => ({ x, z }))),
      minX: Math.min(...points.map(([x]) => x)),
      maxX: Math.max(...points.map(([x]) => x)),
      minZ: Math.min(...points.map(([, z]) => z)),
      maxZ: Math.max(...points.map(([, z]) => z)),
    };
  }));
}

/** Whether a point lies in one of the glyphs: inside by the even-odd rule, as a glyph is built, so a point in a hole is in two rings. */
function inGlyphs(glyphs: ReturnType<typeof glyphBoxes>, point: PlanePoint) {
  return glyphs.some((glyph) => point.x >= glyph.minX && point.x <= glyph.maxX && point.z >= glyph.minZ && point.z <= glyph.maxZ
    && glyph.rings.reduce((inside, ring) => inside !== pointInPolygon(point, ring), false));
}

/**
 * A bin's mesh for the view with the faces of its letters moved to the end, in place, as a second group (#1308), which
 * the view draws in the letters' colour with a second material. Any colour of theirs draws on the same geometry, so choosing
 * another does not build the bin again. Without letters it stays as it is.
 */
export function gridfinityLetterGroups(geometry: THREE.BufferGeometry, letters: GridfinityLabelLetters) {
  if (letters.length === 0) return geometry;
  const position = geometry.getAttribute("position");
  const glyphs = glyphBoxes(letters);
  // A face below or above the letters is the bin's without asking each glyph; every shelf, and so every letter, stands at one height.
  const low = letters[0].top - GRIDFINITY_LABEL_TEXT_SINK;
  const high = letters[0].top + GRIDFINITY_LABEL_TEXT_HEIGHT;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const bin: number[] = [];
  const lettered: number[] = [];
  for (let triangle = 0; triangle < position.count / 3; triangle += 1) {
    a.fromBufferAttribute(position, triangle * 3);
    b.fromBufferAttribute(position, triangle * 3 + 1);
    c.fromBufferAttribute(position, triangle * 3 + 2);
    normal.subVectors(b, a).cross(edge.subVectors(c, a));
    // A face of no area has no inside: its point comes out as NaN, which lies in no letter, so it keeps the bin's colour, as in an export.
    const point = a.add(b).add(c).multiplyScalar(1 / 3).addScaledVector(normal, -FACE_PROBE / normal.length());
    (point.y > low && point.y < high && inGlyphs(glyphs, point) ? lettered : bin).push(triangle);
  }
  if (lettered.length === 0) return geometry;
  const order = [...bin, ...lettered];
  Object.entries(geometry.attributes).forEach(([name, attribute]) => {
    const size = attribute.itemSize * 3;
    const sorted = attribute.array.slice();
    order.forEach((triangle, index) => sorted.set(attribute.array.subarray(triangle * size, (triangle + 1) * size), index * size));
    geometry.setAttribute(name, new THREE.BufferAttribute(sorted, attribute.itemSize, attribute.normalized));
  });
  geometry.clearGroups();
  geometry.addGroup(0, bin.length * 3, 0);
  geometry.addGroup(bin.length * 3, lettered.length * 3, 1);
  return geometry;
}
