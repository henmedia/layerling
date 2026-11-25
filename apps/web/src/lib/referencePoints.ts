import type { WorkplaneNote } from "@/types/layerling";

export type ReferenceBox = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
export type ReferencePointSpot = "center" | "corners" | "midpoints";
export type ReferencePosition = { x: number; y: number; z: number };

/** Points closer than this to an existing one count as the same point. */
export const REFERENCE_POINT_TOLERANCE = 0.001;

/**
 * Where the marks go on the top face of an axis-parallel box: its centre, its
 * four corners or the middles of its four edges. They sit on the top face -
 * what a hole or a part is placed on - and are named in the world's axes
 * (y is the height).
 */
export function referencePointsForBox(box: ReferenceBox, spot: ReferencePointSpot): ReferencePosition[] {
  const y = box.maxY;
  const midX = (box.minX + box.maxX) / 2;
  const midZ = (box.minZ + box.maxZ) / 2;
  if (spot === "center") return [{ x: midX, y, z: midZ }];
  if (spot === "corners") {
    return [
      { x: box.minX, y, z: box.minZ },
      { x: box.maxX, y, z: box.minZ },
      { x: box.maxX, y, z: box.maxZ },
      { x: box.minX, y, z: box.maxZ },
    ];
  }
  return [
    { x: midX, y, z: box.minZ },
    { x: box.maxX, y, z: midZ },
    { x: midX, y, z: box.maxZ },
    { x: box.minX, y, z: midZ },
  ];
}

/** The union of several boxes; null for none. */
export function unionReferenceBoxes(boxes: readonly ReferenceBox[]): ReferenceBox | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((total, box) => ({
    minX: Math.min(total.minX, box.minX),
    maxX: Math.max(total.maxX, box.maxX),
    minY: Math.min(total.minY, box.minY),
    maxY: Math.max(total.maxY, box.maxY),
    minZ: Math.min(total.minZ, box.minZ),
    maxZ: Math.max(total.maxZ, box.maxZ),
  }));
}

/** Rounds away the float noise of a computed position, so a point lands on a clean value. */
export function cleanReferencePosition(position: ReferencePosition): ReferencePosition {
  const clean = (value: number) => {
    const rounded = Math.round(value * 1e4) / 1e4;
    return Object.is(rounded, -0) ? 0 : rounded;
  };
  return { x: clean(position.x), y: clean(position.y), z: clean(position.z) };
}

/** The points of `wanted` that are not already marked, each once. */
export function newReferencePositions(existing: readonly Pick<WorkplaneNote, "x" | "y" | "z" | "kind">[], wanted: readonly ReferencePosition[]): ReferencePosition[] {
  const marked = existing.filter((note) => note.kind === "point");
  const fresh: ReferencePosition[] = [];
  wanted.map(cleanReferencePosition).forEach((position) => {
    const known = (other: ReferencePosition) =>
      Math.abs(other.x - position.x) <= REFERENCE_POINT_TOLERANCE
      && Math.abs(other.y - position.y) <= REFERENCE_POINT_TOLERANCE
      && Math.abs(other.z - position.z) <= REFERENCE_POINT_TOLERANCE;
    if (!marked.some(known) && !fresh.some(known)) fresh.push(position);
  });
  return fresh;
}

/**
 * Where the middle of a measurement lies, for a reference point (#323). A straight measurement
 * between two points has its middle halfway; measured across a round hole that is its centre.
 * A closed edge, such as the rim of a round hole, has the centre of the area it encloses - that does
 * not depend on how many points the edge is cut into. An open edge has the point halfway along it.
 */
export function measurementMiddle(line: readonly ReferencePosition[]): ReferencePosition | null {
  if (line.length < 2) return null;
  const lerp = (a: ReferencePosition, b: ReferencePosition, amount: number): ReferencePosition => ({
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
    z: a.z + (b.z - a.z) * amount,
  });
  const gap = (a: ReferencePosition, b: ReferencePosition) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  if (line.length === 2) return lerp(line[0], line[1], 0.5);
  let length = 0;
  for (let index = 0; index + 1 < line.length; index += 1) length += gap(line[index], line[index + 1]);
  if (length < 1e-9) return { ...line[0] };
  const closed = line.length >= 4 && gap(line[0], line[line.length - 1]) <= 1e-6 * Math.max(1, length);
  if (closed) {
    // The centroid of the enclosed area: a fan of triangles from the first point, each weighted by
    // its area along the loop's normal, so a loop that bends in and out is still counted correctly.
    const origin = line[0];
    const edge = (point: ReferencePosition) => ({ x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z });
    const cross = (a: ReturnType<typeof edge>, b: ReturnType<typeof edge>) => ({
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    });
    const fan: Array<{ area: ReturnType<typeof edge>; centre: ReturnType<typeof edge> }> = [];
    const normal = { x: 0, y: 0, z: 0 };
    for (let index = 1; index + 1 < line.length - 1; index += 1) {
      const a = edge(line[index]);
      const b = edge(line[index + 1]);
      const area = cross(a, b);
      normal.x += area.x;
      normal.y += area.y;
      normal.z += area.z;
      fan.push({ area, centre: { x: (a.x + b.x) / 3, y: (a.y + b.y) / 3, z: (a.z + b.z) / 3 } });
    }
    const size = Math.hypot(normal.x, normal.y, normal.z);
    if (size > 1e-9) {
      const unit = { x: normal.x / size, y: normal.y / size, z: normal.z / size };
      let total = 0;
      const sum = { x: 0, y: 0, z: 0 };
      fan.forEach(({ area, centre }) => {
        const weight = area.x * unit.x + area.y * unit.y + area.z * unit.z;
        total += weight;
        sum.x += centre.x * weight;
        sum.y += centre.y * weight;
        sum.z += centre.z * weight;
      });
      if (Math.abs(total) > 1e-12) return { x: origin.x + sum.x / total, y: origin.y + sum.y / total, z: origin.z + sum.z / total };
    }
    const count = line.length - 1;
    const average = line.slice(0, count).reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y, z: total.z + point.z }), { x: 0, y: 0, z: 0 });
    return { x: average.x / count, y: average.y / count, z: average.z / count };
  }
  let walked = 0;
  for (let index = 0; index + 1 < line.length; index += 1) {
    const step = gap(line[index], line[index + 1]);
    if (walked + step >= length / 2 && step > 1e-9) return lerp(line[index], line[index + 1], (length / 2 - walked) / step);
    walked += step;
  }
  return { ...line[line.length - 1] };
}

/**
 * The spots a dragged reference point snaps to on a body's box (#799): its 8 corners, the middles of its
 * 12 edges and the centres of its 6 faces. `corners` are the box's corners as the box stands, turned or
 * not, in the order x outermost, then y, then z (index = 4·x + 2·y + z, 0 the minus side).
 */
export function boxSnapSpots(corners: readonly ReferencePosition[]): ReferencePosition[] {
  if (corners.length !== 8) return [];
  const mean = (indexes: number[]): ReferencePosition => ({
    x: indexes.reduce((sum, index) => sum + corners[index].x, 0) / indexes.length,
    y: indexes.reduce((sum, index) => sum + corners[index].y, 0) / indexes.length,
    z: indexes.reduce((sum, index) => sum + corners[index].z, 0) / indexes.length,
  });
  const spots: ReferencePosition[] = corners.map((corner) => ({ ...corner }));
  // Two corners share an edge when their indexes differ in one bit.
  for (let a = 0; a < 8; a += 1) {
    for (const bit of [1, 2, 4]) {
      if ((a & bit) === 0) spots.push(mean([a, a | bit]));
    }
  }
  // A face holds the four corners with one bit fixed.
  for (const bit of [1, 2, 4]) {
    for (const side of [0, bit]) spots.push(mean([0, 1, 2, 3, 4, 5, 6, 7].filter((index) => (index & bit) === side)));
  }
  return spots;
}

/** Whether two positions count as the same point. */
export function sameReferencePoint(a: ReferencePosition, b: ReferencePosition) {
  return Math.abs(a.x - b.x) <= REFERENCE_POINT_TOLERANCE
    && Math.abs(a.y - b.y) <= REFERENCE_POINT_TOLERANCE
    && Math.abs(a.z - b.z) <= REFERENCE_POINT_TOLERANCE;
}

/**
 * The reference point a rotation pivot goes to, dragged or clicked: the nearest within `reach` pixels. None while
 * the notes are hidden, and none with Shift held (`faceCentre`), which takes the centre of a face instead.
 */
export function pivotReference<T extends ReferencePosition>(
  points: readonly T[],
  { visible, faceCentre }: { visible: boolean; faceCentre: boolean },
  project: (point: ReferencePosition) => { x: number; y: number },
  pointer: { x: number; y: number },
  reach: number,
): T | null {
  return visible && !faceCentre ? nearestReferenceOnScreen(points, project, pointer, reach) : null;
}

/**
 * The reference point nearest to a pointer on the screen, within `reach` pixels; null if none is that close.
 * The tape measure snaps to it like to a measuring point (#334). `project` gives a point's place on the screen.
 */
export function nearestReferenceOnScreen<T extends ReferencePosition>(
  points: readonly T[],
  project: (point: ReferencePosition) => { x: number; y: number },
  pointer: { x: number; y: number },
  reach: number,
): T | null {
  let best: T | null = null;
  let bestDistance = reach;
  points.forEach((point) => {
    const screen = project(point);
    const distance = Math.hypot(screen.x - pointer.x, screen.y - pointer.y);
    if (distance <= bestDistance) {
      best = point;
      bestDistance = distance;
    }
  });
  return best;
}
