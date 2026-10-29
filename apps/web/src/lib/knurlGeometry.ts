import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import { roundWave, roundWaveCorners, roundToothArcs, type RoundWave } from "@/lib/gearGeometry";

/**
 * Knurling: a round grip with grooves around it, straight along the axis or
 * crossed into small diamonds. The cross-section is a ring of V grooves -
 * a ridge on the outer radius, a groove bottom `depth` further in, joined by
 * straight flanks. Straight knurling pushes that outline up; crossed
 * knurling is what two copies of it, turned against each other on helices,
 * have in common - the exact body the kernel builds (gearSolid) and the mesh
 * drawn here as the smaller of the two radii at every point.
 *
 * Round knurling (#201) is straight knurling with a wave instead of the V:
 * each ridge one convex arc, each groove one concave arc, touching smoothly -
 * a pleasant grip on a knob.
 *
 * Frame as the gear's: centred on x and z, from y = 0 to the height, angles
 * from +x towards +z.
 */

export type KnurlPattern = "straight" | "diamond" | "round";

export const DEFAULT_KNURL_DIAMETER = 20;
export const DEFAULT_KNURL_HEIGHT = 15;
export const DEFAULT_KNURL_PATTERN: KnurlPattern = "straight";
export const DEFAULT_KNURL_COUNT = 30;
export const DEFAULT_KNURL_DEPTH = 0.6;
export const DEFAULT_KNURL_ANGLE = 30;
export const DEFAULT_KNURL_CHAMFER = 0.5;
export const MIN_KNURL_COUNT = 6;
export const MAX_KNURL_COUNT = 180;
export const MIN_KNURL_DEPTH = 0.1;
export const MIN_KNURL_ANGLE = 10;
export const MAX_KNURL_ANGLE = 60;

export function normalizeKnurlPattern(value: unknown): KnurlPattern {
  return value === "diamond" || value === "round" ? value : "straight";
}

/**
 * Round grooves stay shallower than 0.45 of the pitch around the grip: two arcs per pitch
 * standing deeper would bulge at the foot of each ridge.
 */
export function maxRoundKnurlDepth(diameter: number, count: number) {
  return Math.max(MIN_KNURL_DEPTH, (0.45 * Math.PI * diameter) / Math.max(1, count));
}

/** The round knurl's wave: ridges on the outer radius, grooves `depth` in, as wide as the ridges halfway down. */
export function roundKnurlWave(diameter: number, count: number, depth: number): RoundWave {
  const radius = diameter / 2;
  return roundWave(count, radius, radius - depth, radius - depth / 2, Math.PI / (2 * count), 0);
}

/** Narrowest groove pitch around the grip, in mm: finer than this no FDM printer shows. */
export const MIN_KNURL_PITCH = 0.8;

/** Most grooves that fit around this diameter at the narrowest pitch. */
export function maxKnurlCount(diameter?: number) {
  if (!(typeof diameter === "number" && diameter > 0)) return MAX_KNURL_COUNT;
  return Math.max(MIN_KNURL_COUNT, Math.min(MAX_KNURL_COUNT, Math.floor((Math.PI * diameter) / MIN_KNURL_PITCH)));
}

export function normalizeKnurlCount(value: unknown, diameter?: number) {
  const count = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : DEFAULT_KNURL_COUNT;
  return Math.min(maxKnurlCount(diameter), Math.max(MIN_KNURL_COUNT, count));
}

/** Grooves may go a third of the way to the axis, and never below the minimum. */
export function maxKnurlDepth(diameter: number) {
  return Math.max(MIN_KNURL_DEPTH, (diameter / 2) / 3);
}

export function normalizeKnurlDepth(value: unknown, diameter: number) {
  const depth = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_KNURL_DEPTH;
  return Math.min(maxKnurlDepth(diameter), Math.max(MIN_KNURL_DEPTH, depth));
}

/** How steeply the crossed grooves run, in degrees from the axis. */
export function normalizeKnurlAngle(value: unknown) {
  const angle = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_KNURL_ANGLE;
  return Math.min(MAX_KNURL_ANGLE, Math.max(MIN_KNURL_ANGLE, angle));
}

/**
 * The 45-degree chamfer on both ends, in mm: at most a quarter of the
 * diameter and a little under half the height, so the two never meet.
 */
export function maxKnurlChamfer(diameter: number, height: number) {
  return Math.max(0, Math.min(diameter / 4, height / 2 - 0.05));
}

export function normalizeKnurlChamfer(value: unknown, diameter: number, height: number) {
  const chamfer = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(maxKnurlChamfer(diameter, height), Math.max(0, chamfer));
}

export type KnurlCorner = { angle: number; radius: number };

/** The outline's corners: ridges on the outer radius, groove bottoms between them. */
export function knurlCorners(diameter: number, count: number, depth: number, pattern?: KnurlPattern): KnurlCorner[] {
  const radius = diameter / 2;
  const grooves = normalizeKnurlCount(count, diameter);
  if (pattern === "round") {
    return roundWaveCorners(roundKnurlWave(diameter, grooves, depth)).map(({ angle, radiusX }) => ({ angle, radius: radiusX }));
  }
  const step = (Math.PI * 2) / grooves;
  const corners: KnurlCorner[] = [];
  for (let index = 0; index < grooves; index += 1) {
    corners.push({ angle: index * step, radius });
    corners.push({ angle: index * step + step / 2, radius: radius - depth });
  }
  return corners;
}

/** The turn from foot to top of a groove that climbs at `angle` degrees from the axis, in radians. */
export function knurlTwist(diameter: number, height: number, angle: number) {
  return (height * Math.tan(THREE.MathUtils.degToRad(normalizeKnurlAngle(angle)))) / (diameter / 2);
}

export type KnurlShapeFields = {
  width: number;
  height: number;
  knurlPattern?: KnurlPattern;
  knurlCount?: number;
  knurlDepth?: number;
  knurlAngle?: number;
  knurlChamfer?: number;
};

export function knurlSettings(shape: KnurlShapeFields) {
  const diameter = Math.max(1, shape.width);
  const pattern = normalizeKnurlPattern(shape.knurlPattern);
  const count = normalizeKnurlCount(shape.knurlCount, diameter);
  const depth = normalizeKnurlDepth(shape.knurlDepth, diameter);
  return {
    diameter,
    height: Math.max(0.1, shape.height),
    pattern,
    count,
    depth: pattern === "round" ? Math.min(depth, maxRoundKnurlDepth(diameter, count)) : depth,
    angle: normalizeKnurlAngle(shape.knurlAngle),
    chamfer: normalizeKnurlChamfer(shape.knurlChamfer, diameter, Math.max(0.1, shape.height)),
  };
}

/** Radius of the straight outline in direction `phi`: where that ray meets the flank between a ridge and a groove. */
function outlineRadiusAt(phi: number, radius: number, depth: number, count: number) {
  const step = (Math.PI * 2) / count;
  const local = ((phi % step) + step) % step;
  // Ridge at 0, groove at step/2, ridge again at step: mirror the second half.
  const toward = local <= step / 2 ? local : step - local;
  const ridge = { x: radius, z: 0 };
  const groove = { x: Math.cos(step / 2) * (radius - depth), z: Math.sin(step / 2) * (radius - depth) };
  const direction = { x: Math.cos(toward), z: Math.sin(toward) };
  const edge = { x: groove.x - ridge.x, z: groove.z - ridge.z };
  const cross = (a: { x: number; z: number }, b: { x: number; z: number }) => a.x * b.z - a.z * b.x;
  return cross(ridge, edge) / cross(direction, edge);
}

/**
 * Radius of the round outline in direction `phi`: on the ridge's arc (the far side of its circle)
 * up to where it touches the groove's, then on the groove's arc (the near side of its circle).
 */
function roundOutlineRadiusAt(phi: number, wave: RoundWave) {
  const step = (Math.PI * 2) / wave.teeth;
  const local = ((phi % step) + step) % step;
  const toward = local <= step / 2 ? local : step - local;
  const arcs = roundToothArcs(wave, 0);
  const touch = { x: arcs.tooth.x + arcs.tooth.radius * Math.cos(arcs.tooth.end), z: arcs.tooth.z + arcs.tooth.radius * Math.sin(arcs.tooth.end) };
  // Where the ray at angle `toward` meets a circle round (cx, cz): the far or the near crossing.
  const meet = (cx: number, cz: number, r: number, far: boolean) => {
    const along = cx * Math.cos(toward) + cz * Math.sin(toward);
    const across = Math.max(0, r * r - (cx * cx + cz * cz - along * along));
    return along + (far ? 1 : -1) * Math.sqrt(across);
  };
  if (toward <= Math.atan2(touch.z, touch.x)) return meet(arcs.tooth.x, arcs.tooth.z, arcs.tooth.radius, true);
  return meet(arcs.gap.x, arcs.gap.z, arcs.gap.radius, false);
}

export function createKnurlGeometry(shape: KnurlShapeFields): THREE.BufferGeometry {
  const { diameter, height, pattern, count, depth, angle, chamfer } = knurlSettings(shape);
  const radius = diameter / 2;
  const positions: number[] = [];
  const indices: number[] = [];

  if (pattern !== "diamond" && chamfer <= 0) {
    // Exactly the outline the kernel pushes up: one ring at the foot, one at the top.
    const corners = knurlCorners(diameter, count, depth, pattern);
    [0, height].forEach((y) => corners.forEach(({ angle: a, radius: r }) => positions.push(Math.cos(a) * r, y, Math.sin(a) * r)));
    const n = corners.length;
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      indices.push(i, n + i, j, j, n + i, n + j);
    }
    addCaps(positions, indices, 0, n, n, height);
  } else {
    // Six columns per flank, fewer when many grooves on a long, steep grip
    // would pass about 200 000 cells: one column per flank still puts every
    // ridge and groove on the grid, the surface just gets fewer facets.
    const diamond = pattern === "diamond";
    const twistGuess = diamond ? Math.abs(knurlTwist(diameter, height, angle)) : 0;
    const columnBudget = Math.sqrt((200000 * Math.PI * 2) / Math.max(twistGuess, 1e-6));
    // Round grooves follow their arcs in steps of a few degrees, so they shade and outline smooth.
    const columnsPerHalfGroove = Math.max(1, Math.min(pattern === "round" ? 20 : 6, Math.floor(columnBudget / (count * 2))));
    const columns = count * columnsPerHalfGroove * 2;
    const columnStep = (Math.PI * 2) / columns;
    // Crossed: the grid is laid along the grooves - each row turns both rows
    // of grooves by exactly one column, so every groove line runs through grid
    // points, straight up a diagonal, and each cell is split along the
    // diagonal of the groove row that forms its surface. No staircase along
    // the creases; the angle moves by a hair for it. Straight: rows only where
    // the chamfer cuts, the grooves run straight between them.
    const levels: Array<{ y: number; turn: number }> = [];
    if (diamond) {
      const rows = Math.max(1, Math.min(2000, Math.round(knurlTwist(diameter, height, angle) / columnStep)));
      for (let row = 0; row <= rows; row += 1) levels.push({ y: (row / rows) * height, turn: row * columnStep });
    } else {
      const steps = 8;
      for (let step = 0; step <= steps; step += 1) levels.push({ y: (step / steps) * chamfer, turn: 0 });
      for (let step = 0; step <= steps; step += 1) levels.push({ y: height - chamfer + (step / steps) * chamfer, turn: 0 });
    }
    const wave = pattern === "round" ? roundKnurlWave(diameter, count, depth) : null;
    const outline = (phi: number) => (wave ? roundOutlineRadiusAt(phi, wave) : outlineRadiusAt(phi, radius, depth, count));
    // The chamfer is a cone at 45 degrees: no point further out than the full
    // radius less the chamfer, plus how far it is from the nearer end.
    const cone = (y: number) => (chamfer > 0 ? radius - chamfer + Math.min(y, height - y) : Infinity);
    levels.forEach(({ y, turn }) => {
      for (let column = 0; column < columns; column += 1) {
        const phi = column * columnStep;
        const r = Math.min(outline(phi - turn), outline(phi + turn), cone(y));
        positions.push(Math.cos(phi) * r, y, Math.sin(phi) * r);
      }
    });
    for (let level = 0; level + 1 < levels.length; level += 1) {
      const turn = (levels[level].turn + levels[level + 1].turn) / 2;
      for (let column = 0; column < columns; column += 1) {
        const a = level * columns + column;
        const b = level * columns + ((column + 1) % columns);
        const phi = (column + 0.5) * columnStep;
        // The row turning with the height forms the surface here: its grooves run up and to the right.
        if (outline(phi - turn) <= outline(phi + turn)) indices.push(a, a + columns, b + columns, a, b + columns, b);
        else indices.push(a, a + columns, b, b, a + columns, b + columns);
      }
    }
    addCaps(positions, indices, 0, columns, (levels.length - 1) * columns, height);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  if (pattern === "round") {
    // The wave shades smooth; only the ends and the chamfer keep their edge.
    const smooth = toCreasedNormals(geometry, THREE.MathUtils.degToRad(30));
    geometry.dispose();
    return smooth;
  }
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();
  return flat;
}

/** Flat ends: a fan from the axis to each ring, the foot facing down, the top facing up. */
function addCaps(positions: number[], indices: number[], footStart: number, ringSize: number, topStart: number, height: number) {
  const foot = positions.length / 3;
  positions.push(0, 0, 0);
  const top = foot + 1;
  positions.push(0, height, 0);
  for (let i = 0; i < ringSize; i += 1) {
    const j = (i + 1) % ringSize;
    indices.push(foot, footStart + i, footStart + j);
    indices.push(top, topStart + j, topStart + i);
  }
}
