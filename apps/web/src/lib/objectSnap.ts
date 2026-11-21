/**
 * Fangen beim Verschieben: der gezogene Umriss rastet mit Kante oder Mitte an
 * Kante oder Mitte einer anderen Form ein, getrennt fuer X und Z.
 *
 * Alles in Weltkoordinaten auf der Grundebene; die Umrisse sind achsparallele
 * Huellrechtecke, so wie Ausrichten sie auch nimmt.
 */

export type SnapBox = { minX: number; maxX: number; minZ: number; maxZ: number };

/** A guide line at `value` on `axis`, drawn across the other axis from `from` to `to`. */
export type ObjectSnapGuide = { axis: "x" | "z"; value: number; from: number; to: number };

export type ObjectSnapResult = { dx: number | null; dz: number | null; guides: ObjectSnapGuide[] };

const SAME_LINE = 1e-6;

/** Below this, a face is seen side-on by a ray along the axis and is no wall across it. */
const WALL_FACING = 1e-3;

function lines(min: number, max: number) {
  return [min, (min + max) / 2, max];
}

function nearer(best: number | null, offset: number, threshold: number) {
  return Math.abs(offset) <= threshold && (best === null || Math.abs(offset) < Math.abs(best) - SAME_LINE) ? offset : best;
}

function bestOffset(moving: number[], targets: SnapBox[], pick: (box: SnapBox) => number[], threshold: number): number | null {
  let best: number | null = null;
  targets.forEach((target) => {
    pick(target).forEach((line) => {
      moving.forEach((own) => {
        best = nearer(best, line - own, threshold);
      });
    });
  });
  return best;
}

export function shiftSnapBox(box: SnapBox, dx: number, dz: number): SnapBox {
  return { minX: box.minX + dx, maxX: box.maxX + dx, minZ: box.minZ + dz, maxZ: box.maxZ + dz };
}

/**
 * Finds the smallest shift (each axis on its own, at most `threshold`) that lays
 * an edge or the centre of `moving` onto an edge or centre of a target, or a side
 * of it onto a wall it faces, plus the guide lines that show every alignment the
 * shifted box then has. `walls` are the ones beside the box (`wallsInBand`).
 */
export function objectSnapOffset(moving: SnapBox, targets: SnapBox[], threshold: number, walls?: SideWalls): ObjectSnapResult {
  if ((targets.length === 0 && !walls) || !(threshold > 0)) return { dx: null, dz: null, guides: [] };
  let dx = bestOffset(lines(moving.minX, moving.maxX), targets, (box) => lines(box.minX, box.maxX), threshold);
  let dz = bestOffset(lines(moving.minZ, moving.maxZ), targets, (box) => lines(box.minZ, box.maxZ), threshold);
  if (walls) {
    // A wall pulls only the side that faces it, never the middle or the far side, so a part never jumps through it.
    walls.x.min.forEach((wall) => { dx = nearer(dx, wall.value - moving.minX, threshold); });
    walls.x.max.forEach((wall) => { dx = nearer(dx, wall.value - moving.maxX, threshold); });
    walls.z.min.forEach((wall) => { dz = nearer(dz, wall.value - moving.minZ, threshold); });
    walls.z.max.forEach((wall) => { dz = nearer(dz, wall.value - moving.maxZ, threshold); });
  }
  const snapped = shiftSnapBox(moving, dx ?? 0, dz ?? 0);
  const guides: ObjectSnapGuide[] = [];
  const addGuide = (axis: "x" | "z", value: number, from: number, to: number) => {
    const existing = guides.find((guide) => guide.axis === axis && Math.abs(guide.value - value) < SAME_LINE);
    if (existing) {
      existing.from = Math.min(existing.from, from);
      existing.to = Math.max(existing.to, to);
    } else {
      guides.push({ axis, value, from, to });
    }
  };
  const addGuides = (axis: "x" | "z") => {
    const own = axis === "x" ? lines(snapped.minX, snapped.maxX) : lines(snapped.minZ, snapped.maxZ);
    targets.forEach((target) => {
      const theirs = axis === "x" ? lines(target.minX, target.maxX) : lines(target.minZ, target.maxZ);
      theirs.forEach((line) => {
        if (!own.some((value) => Math.abs(value - line) < SAME_LINE)) return;
        const from = axis === "x" ? Math.min(snapped.minZ, target.minZ) : Math.min(snapped.minX, target.minX);
        const to = axis === "x" ? Math.max(snapped.maxZ, target.maxZ) : Math.max(snapped.maxX, target.maxX);
        addGuide(axis, line, from, to);
      });
    });
    if (!walls) return;
    // A wall's guide runs along it and over the part, wherever the part was pulled to on the other axis.
    const [min, max] = axis === "x" ? [snapped.minX, snapped.maxX] : [snapped.minZ, snapped.maxZ];
    const [crossMin, crossMax] = axis === "x" ? [snapped.minZ, snapped.maxZ] : [snapped.minX, snapped.maxX];
    const touching = (side: number) => (wall: EdgeSnapTarget) => Math.abs(wall.value - side) < SAME_LINE;
    [...walls[axis].min.filter(touching(min)), ...walls[axis].max.filter(touching(max))].forEach((wall) => {
      addGuide(axis, wall.value, Math.min(wall.from, crossMin), Math.max(wall.to, crossMax));
    });
  };
  if (dx !== null) addGuides("x");
  if (dz !== null) addGuides("z");
  return { dx, dz, guides };
}

/**
 * Where the dragged side of a resize can stop (Discussion #1647): a line along `axis` with the stretch it takes up
 * across the other axis, for the guide line. Edges and middles of other bodies, and the walls the side runs into.
 */
export type EdgeSnapTarget = { value: number; from: number; to: number };

/**
 * The walls a moved part runs into along each axis, by the side of it they face: `max` holds the faces turned towards
 * -X (or -Z), which the part's right (or front) side meets, `min` those turned towards +X (or +Z).
 */
export type SideWalls = Record<"x" | "z", { min: EdgeSnapTarget[]; max: EdgeSnapTarget[] }>;

/** The walls along one axis by the side they face, and the stretch across it, `from` to `to`, the rays covered. */
type CastWalls = SideWalls["x"] & { from: number; to: number };

/**
 * The walls a moved selection runs into, the inner walls of a box or a case too, as a side handle finds them
 * (Discussion #1647): `height` is the selection's own, `skip` the moved and hidden bodies.
 */
export type MoveWallSnap = { height: { min: number; max: number }; skip: ReadonlySet<string>; x: CastWalls; z: CastWalls };

/** The left, middle and right (or front, middle and back) lines of each box along `axis`. */
export function boxEdgeTargets(boxes: readonly SnapBox[], axis: "x" | "z"): EdgeSnapTarget[] {
  return boxes.flatMap((box) => {
    const [min, max] = axis === "x" ? [box.minX, box.maxX] : [box.minZ, box.maxZ];
    const [from, to] = axis === "x" ? [box.minZ, box.maxZ] : [box.minX, box.maxX];
    return lines(min, max).map((value) => ({ value, from, to }));
  });
}

/**
 * The side handle of a resize (Discussion #1647). The side opposite the handle stays at `anchor` (or, with `symmetric`,
 * the middle stays at `anchor` and both sides move); the dragged side lies `direction` (+1 or -1) times the size from it,
 * half of it when symmetric. When that side comes within `threshold` of a target it is pulled onto it: the answer is
 * the size that puts it there exactly, with the target, or null when nothing is near or the size would be below `minSize`.
 */
export function snapResizeEdge(
  edge: { anchor: number; direction: 1 | -1; size: number; symmetric: boolean },
  targets: readonly EdgeSnapTarget[],
  threshold: number,
  minSize: number,
): { size: number; target: EdgeSnapTarget } | null {
  if (!(threshold > 0) || !(edge.size > 0)) return null;
  const reach = edge.symmetric ? edge.size / 2 : edge.size;
  const side = edge.anchor + edge.direction * reach;
  let best: { size: number; target: EdgeSnapTarget; distance: number } | null = null;
  for (const target of targets) {
    const distance = Math.abs(target.value - side);
    if (distance > threshold || (best && distance >= best.distance - SAME_LINE)) continue;
    const towards = (target.value - edge.anchor) * edge.direction;
    // Rounded to a millionth, so a side snapped to 45.2 from -35.2 gives 80.4 and not 80.40000000000001.
    const size = Math.round((edge.symmetric ? towards * 2 : towards) * 1e6) / 1e6;
    if (!(size >= minSize)) continue;
    best = { size, target, distance };
  }
  return best ? { size: best.size, target: best.target } : null;
}

/** The guide line of a snapped side: along the target, reaching over the moving body's own stretch too. */
export function edgeSnapGuide(axis: "x" | "z", target: EdgeSnapTarget, movingFrom: number, movingTo: number): ObjectSnapGuide {
  return { axis, value: target.value, from: Math.min(target.from, movingFrom), to: Math.max(target.to, movingTo) };
}

/**
 * The walls beside `box`: those whose stretch, from the rays that met them, overlaps the box's own across them. A wall
 * left behind by a move to the side no longer counts, so the part is never pulled onto a wall that is not there.
 */
export function wallsInBand(walls: SideWalls, box: SnapBox): SideWalls {
  const beside = (from: number, to: number) => (wall: EdgeSnapTarget) => wall.to >= from && wall.from <= to;
  const alongX = beside(box.minZ, box.maxZ);
  const alongZ = beside(box.minX, box.maxX);
  return {
    x: { min: walls.x.min.filter(alongX), max: walls.x.max.filter(alongX) },
    z: { min: walls.z.min.filter(alongZ), max: walls.z.max.filter(alongZ) },
  };
}

/** A ray's hit on a body: where, and the outward normal of the face it met, in world space. */
export type WallHit = { point: { x: number; y: number; z: number }; normal: { x: number; y: number; z: number } };

/** The walls along `axis` that rays met at `points`, each one line over the stretch its hits span across the axis. */
export function wallLines(points: readonly { x: number; z: number }[], axis: "x" | "z"): EdgeSnapTarget[] {
  const across = axis === "x" ? "z" : "x";
  const walls = new Map<string, EdgeSnapTarget>();
  points.forEach((point) => {
    // To a hundredth: a mesh carries float rounding, and a hole cuts a thousandth wider than typed.
    const value = Math.round(point[axis] * 100) / 100;
    const key = value.toFixed(2);
    const along = point[across];
    const wall = walls.get(key);
    if (wall) {
      wall.from = Math.min(wall.from, along);
      wall.to = Math.max(wall.to, along);
    } else {
      walls.set(key, { value, from: along, to: along });
    }
  });
  return [...walls.values()];
}

/**
 * The walls along `axis` from rays that crossed the whole scene along it: a face turned towards -axis is met by the
 * moved part's right (or front) side (`max`), one turned towards +axis by its left (or back) side (`min`).
 */
export function wallTargetsFromHits(hits: readonly WallHit[], axis: "x" | "z"): SideWalls["x"] {
  const facing = (sign: 1 | -1) => wallLines(hits.filter((hit) => hit.normal[axis] * sign >= WALL_FACING).map((hit) => hit.point), axis)
    .sort((a, b) => a.value - b.value);
  return { min: facing(1), max: facing(-1) };
}
