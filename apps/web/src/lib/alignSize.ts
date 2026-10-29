import * as THREE from "three";
import { cuboidAlongAxes, type AlignAxes } from "@/lib/alignFrame";
import { roundedAlignedValue } from "@/lib/alignRounding";
import { meshAabb, meshForShape, shapeAabb, type Cuboid } from "@/lib/editorMeshCore";
import { quaternionForShape } from "@/lib/geometryRotation";
import { scaledHorizontalShapePatch } from "@/lib/scaleByPercent";
import { canonicalizeShape, cleanNearZero, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { AlignAxis, AlignTarget, WorkplaneShape } from "@/types/layerling";

/**
 * Align by size (#998). Alt on an align dot leaves the parts where they are and stretches them instead:
 * on a side dot each one keeps its other side and grows (or shrinks) until it reaches that side of the
 * reference, as if its handle were dragged there; on the middle dot each one keeps its middle and takes
 * the reference's size along that axis. The reference is the anchor; without one the side dots stretch to
 * the farthest side of them all and the middle dot gives every part the size of the largest.
 *
 * A part changes the one own size that runs along the axis, so it only works for a part that stands
 * square to it; one turned at some other angle stays as it is.
 */

const ALIGN_EPSILON = 0.0005;
const MIN_SIZE = 0.01;
/** How close to the axis an own axis of the part must run: about 0.8 degrees, as orientedMeasures. */
const ALONG = 1 - 1e-4;
const ALIGN_AXES: AlignAxis[] = ["x", "y", "z"];

export type OwnSize = "width" | "height" | "depth";

type Vec = { x: number; y: number; z: number };

const WORLD_AXES: AlignAxes = {
  x: { x: 1, y: 0, z: 0 },
  y: { x: 0, y: 1, z: 0 },
  z: { x: 0, y: 0, z: 1 },
};

/** The box of a part along a workplane's axes, as the alignment measures it there (#232). */
export function frameAabb(shape: WorkplaneShape, axes: AlignAxes): Cuboid {
  const mesh = shape.cylinderWrap && shape.importedMesh ? null : meshForShape(shape);
  const own = mesh && mesh.vertices.length > 0 ? cuboidAlongAxes(mesh.vertices, axes) : null;
  if (own) return own;
  const box = shapeAabb(shape);
  const corners: Array<[number, number, number]> = [];
  for (const x of [box.minX, box.maxX]) for (const y of [box.minY, box.maxY]) for (const z of [box.minZ, box.maxZ]) corners.push([x, y, z]);
  return cuboidAlongAxes(corners, axes) ?? box;
}

function boundsOf(shape: WorkplaneShape, axes: AlignAxes | null) {
  return axes ? frameAabb(shape, axes) : meshAabb(shape);
}

function range(bounds: Cuboid, axis: AlignAxis) {
  return axis === "x" ? { min: bounds.minX, max: bounds.maxX } : axis === "y" ? { min: bounds.minY, max: bounds.maxY } : { min: bounds.minZ, max: bounds.maxZ };
}

/** The own size of the part that runs along `direction`; null when the part is turned at some other angle. */
export function ownSizeAlong(shape: WorkplaneShape, direction: Vec): OwnSize | null {
  const turn = quaternionForShape(shape);
  const own: Array<[OwnSize, THREE.Vector3]> = [
    ["width", new THREE.Vector3(1, 0, 0)],
    ["height", new THREE.Vector3(0, 1, 0)],
    ["depth", new THREE.Vector3(0, 0, 1)],
  ];
  for (const [size, vector] of own) {
    vector.applyQuaternion(turn);
    if (Math.abs(vector.x * direction.x + vector.y * direction.y + vector.z * direction.z) >= ALONG) return size;
  }
  return null;
}

/**
 * The part with one own size multiplied by `factor`. A round part (a cylinder, a star, a knurl, a gear
 * by module) has one diameter, so its other side grows with it, as it does with the handles.
 */
export function withOwnSizeScaled(shape: WorkplaneShape, size: OwnSize, factor: number): WorkplaneShape {
  if (size === "height") return canonicalizeShape({ ...shape, height: Math.max(MIN_SIZE, shape.height * factor) });
  const scaleX = size === "width" ? factor : 1;
  const scaleZ = size === "depth" ? factor : 1;
  const sized = canonicalizeShape({ ...shape, ...scaledHorizontalShapePatch(shape, scaleX, scaleZ) });
  const wanted = size === "width" ? shapeWidth(shape) * factor : shapeDepth(shape) * factor;
  const got = size === "width" ? shapeWidth(sized) : shapeDepth(sized);
  if (Math.abs(got - wanted) <= ALIGN_EPSILON) return sized;
  return canonicalizeShape({ ...shape, ...scaledHorizontalShapePatch(shape, factor, factor) });
}

/**
 * What the reference asks of all parts along one axis: the side a side dot stretches them to, and the
 * size the middle dot gives them - the anchor's, or else the largest of them, so that they all grow to it.
 */
type Reference = { box: Cuboid; size: Record<AlignAxis, number> };

/** What the reference asks of one part: where it should begin and end along the axis. */
function wantedRange(bounds: Cuboid, reference: Reference, axis: AlignAxis, target: AlignTarget) {
  const own = range(bounds, axis);
  const ref = range(reference.box, axis);
  if (target === "max") return { min: own.min, max: ref.max };
  if (target === "min") return { min: ref.min, max: own.max };
  const middle = (own.min + own.max) / 2;
  const half = reference.size[axis] / 2;
  return { min: middle - half, max: middle + half };
}

function matches(bounds: Cuboid, reference: Reference, axis: AlignAxis, target: AlignTarget) {
  const own = range(bounds, axis);
  const wanted = wantedRange(bounds, reference, axis, target);
  return Math.abs(own.min - wanted.min) <= ALIGN_EPSILON && Math.abs(own.max - wanted.max) <= ALIGN_EPSILON;
}

/**
 * The part stretched along `axis` so that it covers `wanted` there, its middle kept along the other two
 * axes. A turned part grows about its own middle, and the move afterwards puts it back where it belongs.
 * The size is measured on the body itself and set again once or twice, so a part whose outline does not
 * grow exactly with its size (a cylinder whose segments change) still ends up on the line.
 */
function stretchedTo(shape: WorkplaneShape, size: OwnSize, axis: AlignAxis, wanted: { min: number; max: number }, axes: AlignAxes | null, start: Cuboid) {
  const frame = axes ?? WORLD_AXES;
  const wantedSize = wanted.max - wanted.min;
  let current = shape;
  let bounds = start;
  for (let round = 0; round < 3; round += 1) {
    const span = range(bounds, axis);
    const extent = span.max - span.min;
    if (extent <= 1e-9) return null;
    if (round > 0 && Math.abs(extent - wantedSize) <= ALIGN_EPSILON / 2) break;
    current = withOwnSizeScaled(current, size, wantedSize / extent);
    bounds = boundsOf(current, axes);
  }
  const shift = { x: 0, y: 0, z: 0 };
  for (const along of ALIGN_AXES) {
    const now = range(bounds, along);
    const before = range(start, along);
    const delta = along === axis ? wanted.min - now.min : (before.min + before.max) / 2 - (now.min + now.max) / 2;
    const direction = frame[along];
    shift.x += direction.x * delta;
    shift.y += direction.y * delta;
    shift.z += direction.z * delta;
  }
  return {
    ...current,
    x: cleanNearZero(roundedAlignedValue(current.x + shift.x), ALIGN_EPSILON),
    z: cleanNearZero(roundedAlignedValue(current.z + shift.z), ALIGN_EPSILON),
    elevation: cleanNearZero(roundedAlignedValue((current.elevation ?? 0) + shift.y), ALIGN_EPSILON),
  };
}

function referenceFor(boundsById: Map<string, Cuboid>, anchorId: string | null): Reference {
  const anchor = anchorId ? boundsById.get(anchorId) : undefined;
  const all = anchor ? [anchor] : Array.from(boundsById.values());
  const box = {
    minX: Math.min(...all.map((entry) => entry.minX)),
    maxX: Math.max(...all.map((entry) => entry.maxX)),
    minY: Math.min(...all.map((entry) => entry.minY)),
    maxY: Math.max(...all.map((entry) => entry.maxY)),
    minZ: Math.min(...all.map((entry) => entry.minZ)),
    maxZ: Math.max(...all.map((entry) => entry.maxZ)),
  };
  const largest = (axis: AlignAxis) => Math.max(...all.map((entry) => range(entry, axis).max - range(entry, axis).min));
  return { box, size: { x: largest("x"), y: largest("y"), z: largest("z") } };
}

export type SizedSelection = {
  nextShapes: WorkplaneShape[];
  /** Parts that took the new size. */
  resized: number;
  /** Parts that should have changed but are turned at an angle, or would shrink to nothing or past the limit. */
  skipped: number;
};

/** Every selected part, apart from the anchor and locked ones, stretched to the reference along `axis`. */
export function sizedShapesForSelection(
  shapes: WorkplaneShape[],
  selectedIds: string[],
  selectedShapes: WorkplaneShape[],
  anchorId: string | null,
  axis: AlignAxis,
  target: AlignTarget,
  axes: AlignAxes | null = null,
  maxSize: (shape: WorkplaneShape) => number = () => Number.POSITIVE_INFINITY,
): SizedSelection {
  const selected = new Set(selectedIds);
  const boundsById = new Map(selectedShapes.map((shape) => [shape.id, boundsOf(shape, axes)]));
  const reference = referenceFor(boundsById, anchorId);
  const direction = (axes ?? WORLD_AXES)[axis];
  let resized = 0;
  let skipped = 0;

  const nextShapes = shapes.map((shape) => {
    if (!selected.has(shape.id) || shape.locked || shape.id === anchorId) return shape;
    const bounds = boundsById.get(shape.id);
    if (!bounds || matches(bounds, reference, axis, target)) return shape;
    const wanted = wantedRange(bounds, reference, axis, target);
    const size = ownSizeAlong(shape, direction);
    if (!size || wanted.max - wanted.min < MIN_SIZE) {
      skipped += 1;
      return shape;
    }
    const next = stretchedTo(shape, size, axis, wanted, axes, bounds);
    if (!next || [shapeWidth(next), shapeDepth(next), next.height].some((value) => value > maxSize(shape) + 1e-9)) {
      skipped += 1;
      return shape;
    }
    resized += 1;
    return next;
  });

  return { nextShapes, resized, skipped };
}

/** Whether a dot in the size mode would change a part, and whether every part already has that size. */
export function sizeAlignmentState(selection: WorkplaneShape[], anchorId: string | null, axis: AlignAxis, target: AlignTarget, axes: AlignAxes | null = null) {
  const boundsById = new Map(selection.map((shape) => [shape.id, boundsOf(shape, axes)]));
  const reference = referenceFor(boundsById, anchorId);
  const direction = (axes ?? WORLD_AXES)[axis];
  const aligned = selection.every((shape) => {
    const bounds = boundsById.get(shape.id);
    return !bounds || shape.id === anchorId || matches(bounds, reference, axis, target);
  });
  const wouldChange = selection.some((shape) => {
    if (shape.locked || shape.id === anchorId) return false;
    const bounds = boundsById.get(shape.id);
    if (!bounds || matches(bounds, reference, axis, target)) return false;
    const wanted = wantedRange(bounds, reference, axis, target);
    return wanted.max - wanted.min >= MIN_SIZE && ownSizeAlong(shape, direction) !== null;
  });
  return { aligned, wouldChange };
}
