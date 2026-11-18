import type { OcctKernel, ShapeHandle, Vec3 } from "occt-wasm";
import { block, rimFaces, tracking } from "@/lib/cadLid";
import { GRIDFINITY_BASEPLATE_HEIGHT, GRIDFINITY_BASEPLATE_RADIUS, GRIDFINITY_GRID, GRIDFINITY_MAGNET_DEPTH, GRIDFINITY_MAGNET_DIAMETER, GRIDFINITY_MAGNET_OFFSET, GRIDFINITY_SOCKET, MAX_GRIDFINITY_LARGE_PLATE_UNITS, gridfinityDividerHeightTop, gridfinityOutlineCells } from "@/lib/gridfinityGeometry";
import {
  DIVIDERS_FAILED_MESSAGE,
  DIVIDERS_NEEDS_TOP_MESSAGE,
  GRID_FAILED_MESSAGE,
  GRID_NEEDS_TOP_MESSAGE,
  GRID_NO_CELL_MESSAGE,
  GRID_TOO_LOW_MESSAGE,
  SHELL_DIVIDER_THICKNESS,
  shellGridFloor,
  SHELL_GRID_MIN_DEPTH,
  SHELL_GRID_PLAY,
  type ShellDividers,
  type ShellGrid,
} from "@/lib/shellGridLimits";

/*
 * A Gridfinity floor, a fit of the walls to the grid, and dividers for a hollowed box with its top open. All in the scene's
 * frame, y up, on the hollowed body and the body before it (which holds the cavity as solid, to clip what is added to the
 * outline of the box).
 *
 * - The floor is as thick as a baseplate and its closed floor (6.2 mm), and a socket is cut into it for each cell the inside
 *   holds, with the profile the baseplate's own sockets have (GRIDFINITY_SOCKET).
 * - With the fit, the walls are thickened so the inside is the cells and a little play (0.5 mm) in a rounded rectangle:
 *   whole cells fit in it, and the box sized to them is the one that holds them.
 * - Dividers stand on the floor between the walls, evenly across and along the inside.
 */

/** The kernel builds a cylinder along z; this stands it up along y. */
const Z_TO_Y_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];

/** The cut that reaches a little past the floor's top, so the sockets open cleanly. */
const PAST = 0.01;

type Cell = { x: number; z: number };

/** A polygon of the points of a wire, chained from the edges the kernel samples (y is dropped: it lies in a plane). */
function wirePolygon(cad: OcctKernel, wire: ShapeHandle): Cell[] | null {
  const data = cad.wireframe(wire, { deflection: 0.05 });
  const edges: Cell[][] = [];
  for (let e = 0; e < data.edgeCount; e += 1) {
    // The groups count in floats: where an edge's points start, and how many floats they take (three to a point).
    const start = data.edgeGroups[e * 3];
    const count = data.edgeGroups[e * 3 + 1] / 3;
    const line: Cell[] = [];
    for (let k = 0; k < count; k += 1) line.push({ x: data.points[start + k * 3], z: data.points[start + k * 3 + 2] });
    if (line.length >= 2) edges.push(line);
  }
  if (!edges.length) return null;
  const same = (a: Cell, b: Cell) => Math.hypot(a.x - b.x, a.z - b.z) < 1e-3;
  const chain = [...edges.shift()!];
  while (edges.length) {
    const end = chain[chain.length - 1];
    const at = edges.findIndex((line) => same(line[0], end) || same(line[line.length - 1], end));
    if (at < 0) return null;
    const [line] = edges.splice(at, 1);
    const ordered = same(line[0], end) ? line : [...line].reverse();
    chain.push(...ordered.slice(1));
  }
  if (same(chain[0], chain[chain.length - 1])) chain.pop();
  return chain.length >= 3 ? chain : null;
}

/** A rounded square of half side `half` and corner radius `radius` about (cx, cz), in the plane y. */
function roundedWire(cad: OcctKernel, cx: number, cz: number, hx: number, hz: number, radius: number, y: number) {
  const r = Math.max(0, Math.min(radius, hx, hz));
  const at = (x: number, z: number): Vec3 => ({ x: cx + x, y, z: cz + z });
  const ax = hx - r;
  const az = hz - r;
  const k = r * Math.SQRT1_2;
  if (r < 1e-6) return cad.makeWire([cad.makeLineEdge(at(-hx, -hz), at(hx, -hz)), cad.makeLineEdge(at(hx, -hz), at(hx, hz)), cad.makeLineEdge(at(hx, hz), at(-hx, hz)), cad.makeLineEdge(at(-hx, hz), at(-hx, -hz))]);
  return cad.makeWire([
    cad.makeLineEdge(at(-ax, -hz), at(ax, -hz)),
    cad.makeArcEdge(at(ax, -hz), at(ax + k, -az - k), at(hx, -az)),
    cad.makeLineEdge(at(hx, -az), at(hx, az)),
    cad.makeArcEdge(at(hx, az), at(ax + k, az + k), at(ax, hz)),
    cad.makeLineEdge(at(ax, hz), at(-ax, hz)),
    cad.makeArcEdge(at(-ax, hz), at(-ax - k, az + k), at(-hx, az)),
    cad.makeLineEdge(at(-hx, az), at(-hx, -az)),
    cad.makeArcEdge(at(-hx, -az), at(-ax - k, -az - k), at(-ax, -hz)),
  ]);
}

/** A rounded rectangle pushed up from `low` to `high`. */
function prism(cad: OcctKernel, cx: number, cz: number, hx: number, hz: number, radius: number, low: number, high: number) {
  return cad.extrude(cad.makeFace(roundedWire(cad, cx, cz, hx, hz, radius, low)), 0, high - low, 0);
}

/** The socket of one cell of the baseplate, as a cutter: its stepped sides from `bottom` up and a little past `top`. */
function socketCutter(cad: OcctKernel, cell: Cell, bottom: number) {
  const half = GRIDFINITY_GRID / 2;
  const last = GRIDFINITY_SOCKET[GRIDFINITY_SOCKET.length - 1];
  const steps: Array<[number, number]> = [...GRIDFINITY_SOCKET.map(([inset, y]): [number, number] => [inset, y + bottom]), [last[0], last[1] + bottom + PAST]];
  return cad.loft(steps.map(([inset, y]) => roundedWire(cad, cell.x, cell.z, half - inset, half - inset, GRIDFINITY_BASEPLATE_RADIUS - inset, y)), true, true);
}

function oneSolid(cad: OcctKernel, shape: ShapeHandle, message: string) {
  const solids = cad.isSolid(shape) ? [shape] : cad.getSubShapes(shape, "solid");
  if (solids.length !== 1 || !cad.isValid(solids[0]) || cad.getVolume(solids[0]) <= 0) throw new Error(message);
  return solids[0];
}

/** The cavity of a box open on top as its outline in the rim's plane (one face with one opening), or throws `message`. */
function cavityOutline(cad: OcctKernel, body: ShapeHandle, message: string) {
  const box = cad.getBoundingBox(body);
  const total = box.ymax - box.ymin;
  const rim = box.ymax - Math.min(0.3, total * 0.02);
  const faces = rimFaces(cad, body, rim);
  if (!faces || faces.length !== 1 || faces[0].openings.length !== 1) throw new Error(message);
  const polygon = wirePolygon(cad, faces[0].openings[0]);
  if (!polygon) throw new Error(message);
  return { polygon, top: box.ymax, bottom: box.ymin, total, opening: faces[0].openings[0], rim };
}

function bounds(points: readonly Cell[]) {
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

/** The cells the inside holds, the `count` nearest its middle: the grid of the existing baseplate fitted to the outline. */
export function shellGridCells(polygon: readonly Cell[], count: number): Cell[] {
  const all = gridfinityOutlineCells(polygon, MAX_GRIDFINITY_LARGE_PLATE_UNITS);
  if (all.length === 0) throw new Error(GRID_NO_CELL_MESSAGE);
  const b = bounds(polygon);
  const middle = { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
  const distance = (c: Cell) => Math.hypot(c.x - middle.x, c.z - middle.z);
  return [...all].sort((p, q) => distance(p) - distance(q) || p.z - q.z || p.x - q.x).slice(0, Math.max(1, count));
}

/**
 * The hollowed `shelled` body (made from `original`, which holds its cavity as solid) with the Gridfinity floor, and with
 * `grid.fit` its walls thickened to the cells. Throws an error with one of the messages of shellGridLimits where it
 * cannot be done; the caller shows it.
 */
export function shellGridSolid(kernel: OcctKernel, original: ShapeHandle, shelled: ShapeHandle, grid: ShellGrid, lift = 0): ShapeHandle {
  const made: ShapeHandle[] = [];
  const cad = tracking(kernel, made);
  let result: ShapeHandle | null = null;
  try {
    const { polygon, top, bottom, total, opening, rim } = cavityOutline(cad, shelled, GRID_NEEDS_TOP_MESSAGE);
    const floorTop = bottom + Math.max(0, lift) + shellGridFloor(grid);
    if (total < floorTop - bottom + SHELL_GRID_MIN_DEPTH) throw new Error(GRID_TOO_LOW_MESSAGE);
    const cells = shellGridCells(polygon, grid.cells);
    const box = cad.getBoundingBox(original);
    const wide = { x0: box.xmin - 1, x1: box.xmax + 1, z0: box.zmin - 1, z1: box.zmax + 1 };
    const slab = (low: number, high: number) => cad.makeBoxFromCorners({ x: wide.x0, y: low, z: wide.z0 }, { x: wide.x1, y: high, z: wide.z1 });
    const parts: ShapeHandle[] = [shelled];
    // The floor, up to the top of the sockets, over the whole inside: where the box was hollowed it is the cavity's.
    // Within the cavity's outline only: under a stacking foot the band round it stays cut away.
    parts.push(cad.common(cad.common(original, slab(bottom, floorTop)), block(cad, cad.makeFace(opening), rim, bottom - 1, floorTop)));
    if (grid.fit) {
      // The walls reach in to the cells and their play: what lies in the box's outline, above the floor, outside the fitted
      // inside. The fitted inside never reaches past the inside of the box, as its cells fit in it.
      const b = bounds(cells);
      const half = GRIDFINITY_GRID / 2 + SHELL_GRID_PLAY / 2;
      const cx = (b.minX + b.maxX) / 2;
      const cz = (b.minZ + b.maxZ) / 2;
      const inside = prism(cad, cx, cz, (b.maxX - b.minX) / 2 + half, (b.maxZ - b.minZ) / 2 + half, GRIDFINITY_BASEPLATE_RADIUS + SHELL_GRID_PLAY / 2, floorTop - 1, top + 1);
      parts.push(cad.common(original, cad.cut(slab(floorTop - 1, top), inside)));
    }
    let body = cad.fuseAll(parts);
    const socketBottom = floorTop - GRIDFINITY_BASEPLATE_HEIGHT;
    body = cad.cutAll(body, cells.map((cell) => socketCutter(cad, cell, socketBottom)));
    if (grid.magnets) {
      // Four magnet holes under each socket, as under a bin's feet, reaching a little into the socket so they open cleanly.
      const holes = cells.flatMap((cell) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => cad.translate(
        cad.transform(cad.makeCylinder(GRIDFINITY_MAGNET_DIAMETER / 2, GRIDFINITY_MAGNET_DEPTH + PAST), Z_TO_Y_UP),
        cell.x + sx * GRIDFINITY_MAGNET_OFFSET, socketBottom - GRIDFINITY_MAGNET_DEPTH, cell.z + sz * GRIDFINITY_MAGNET_OFFSET,
      ))));
      body = cad.cutAll(body, holes);
    }
    body = cad.simplify(body);
    result = oneSolid(cad, body, GRID_FAILED_MESSAGE);
    return result;
  } finally {
    made.forEach((handle) => {
      if (handle === result) return;
      try {
        kernel.release(handle);
      } catch {
        // already gone
      }
    });
  }
}

/**
 * The body with dividers: `dividers.x` walls across (along z) and `dividers.z` along, evenly spaced over the inside, from
 * the floor (`floorTop`, the top of the Gridfinity floor if there is one) to the rim or `dividers.height` over the floor,
 * `dividers.thickness` thick, clipped to the box's outline; with a shelf ledge no higher than its top (`shelfTop`).
 */
export function shellDividersSolid(kernel: OcctKernel, original: ShapeHandle, body: ShapeHandle, dividers: ShellDividers, floorTop: number | null, shelfTop: number | null = null): ShapeHandle {
  const made: ShapeHandle[] = [];
  const cad = tracking(kernel, made);
  let result: ShapeHandle | null = null;
  try {
    const { polygon, top, bottom } = cavityOutline(cad, body, DIVIDERS_NEEDS_TOP_MESSAGE);
    const b = bounds(polygon);
    // The floor of a plain hollow body is as thick as its wall: found from the cavity's lowest point.
    const base = floorTop ?? cavityFloor(cad, body, polygon, bottom, top);
    const pieces: ShapeHandle[] = [];
    const t = dividers.thickness ?? SHELL_DIVIDER_THICKNESS;
    // Lower dividers by the rule the Gridfinity compartments keep (#1560): at least 3 mm over the floor, the full height
    // when unset, 0, or within 0.1 mm of the rim.
    // Under a shelf ledge they end level with its top, so the shelf plate lies on the ledge and on them.
    const dividerTop = Math.min(gridfinityDividerHeightTop(dividers.height, base, top), shelfTop ?? top);
    for (let i = 1; i <= dividers.x; i += 1) {
      const x = b.minX + ((b.maxX - b.minX) * i) / (dividers.x + 1);
      pieces.push(cad.makeBoxFromCorners({ x: x - t / 2, y: base - 0.2, z: b.minZ - 1 }, { x: x + t / 2, y: dividerTop, z: b.maxZ + 1 }));
    }
    for (let i = 1; i <= dividers.z; i += 1) {
      const z = b.minZ + ((b.maxZ - b.minZ) * i) / (dividers.z + 1);
      pieces.push(cad.makeBoxFromCorners({ x: b.minX - 1, y: base - 0.2, z: z - t / 2 }, { x: b.maxX + 1, y: dividerTop, z: z + t / 2 }));
    }
    const clipped = cad.common(original, cad.fuseAll(pieces));
    const joined = cad.simplify(cad.fuseAll([body, clipped]));
    result = oneSolid(cad, joined, DIVIDERS_FAILED_MESSAGE);
    return result;
  } finally {
    made.forEach((handle) => {
      if (handle === result) return;
      try {
        kernel.release(handle);
      } catch {
        // already gone
      }
    });
  }
}

/** The height of the cavity's floor: where the middle of the inside starts to be hollow, found by walking up. */
function cavityFloor(cad: OcctKernel, body: ShapeHandle, polygon: readonly Cell[], bottom: number, top: number) {
  const b = bounds(polygon);
  const x = (b.minX + b.maxX) / 2;
  const z = (b.minZ + b.maxZ) / 2;
  const steps = 200;
  for (let k = 0; k <= steps; k += 1) {
    const y = bottom + ((top - bottom) * k) / steps;
    if (cad.containsPoint(body, { x, y, z })) continue;
    // Narrowed down between the last step in the floor and this one, to a hundredth of a millimetre, so a divider height
    // set over the floor comes out as set.
    let low = k > 0 ? bottom + ((top - bottom) * (k - 1)) / steps : bottom;
    let high = y;
    while (high - low > 0.005) {
      const mid = (low + high) / 2;
      if (cad.containsPoint(body, { x, y: mid, z })) low = mid;
      else high = mid;
    }
    return high;
  }
  return bottom;
}
