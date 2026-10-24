import type { OcctKernel, ShapeHandle } from "occt-wasm";
import type { CadModifierGridfinityPart } from "@/lib/cadModifierTypes";
import {
  GRIDFINITY_BASEPLATE_HEIGHT,
  GRIDFINITY_BASEPLATE_RADIUS,
  GRIDFINITY_BIN_RADIUS,
  GRIDFINITY_CLEARANCE,
  GRIDFINITY_DIVIDER_CUTTER_OVERLAP,
  GRIDFINITY_FOOT,
  GRIDFINITY_FOOT_HEIGHT,
  GRIDFINITY_GRID,
  GRIDFINITY_LEDGE_INSET,
  GRIDFINITY_MAGNET_DEPTH,
  GRIDFINITY_MAGNET_DIAMETER,
  GRIDFINITY_SOCKET,
  type GridfinityCompartmentPieces,
  type GridfinityLabelCornerShape,
  type GridfinityLabelPieces,
  type GridfinityLabelProfile,
  type GridfinityNotch,
  type GridfinityOpeningInside,
  type GridfinityPlan,
  type GridfinityScoopPieces,
  type GridfinityStep,
  gridfinityCompartmentCutBound,
  gridfinityCompartmentFloorBound,
  gridfinityCompartmentPieces,
  gridfinityDividerBound,
  gridfinityLabelCornerOutline,
  gridfinityLabelPieces,
  gridfinityLabelProfileEnds,
  gridfinityOpenCorners,
  gridfinityOpenGrown,
  gridfinityOpeningFloorCut,
  gridfinityOpeningFrame,
  gridfinityOpeningInside,
  gridfinityOpeningOutline,
  gridfinityOpeningSection,
  gridfinityPlan,
  gridfinityScoopPieces,
  gridfinityScoopPoint,
  gridfinityScoopSection,
  gridfinityWallProfile,
} from "@/lib/gridfinityGeometry";

/*
 * The exact body of a Gridfinity bin or baseplate, from the same plan as its
 * display mesh (`gridfinityTriangles`), with true arcs where the mesh has
 * polygons. Each foot and each socket is a ruled loft through its steps; the
 * bin is the feet joined to the block above them, the inside cut out by a
 * loft through the wall's inner steps (the lip, its support, the floor), and
 * the magnet holes drilled into the feet. The baseplate is a slab with the
 * sockets cut through it.
 *
 * Built with z up (the kernel's loft frame) and stood up on y at the end. The
 * label shelves are joined after that, in the shape's own frame, from the same
 * pieces as the display mesh (gridfinityLabelPieces): each a prism cut to the
 * bin's inside, the corner pieces trimmed to lie under the shelves they join.
 * The finger scoops (gridfinityScoopPieces) are taken out of the inside's
 * cutter before it is cut, each with a true arc, so the cut leaves them standing.
 * A bin with dividers (gridfinityCompartmentPieces) is cut by one cutter for all
 * its compartments, each with a rounded floor and its own scoops, and what stays
 * between them is the dividers. Its labels are the compartments' own, each cut to
 * its compartment and joined as the shelves are.
 *
 * A bin with an open side (#682) has its block square in the corners there,
 * and the inside's cutter and the compartments' run out through it far enough
 * that their roundings, and the floor's, lie beyond the block; the shelves are
 * cut to an inside that reaches out to the outline there.
 *
 * A chamfer on the lip's top (#780) is cut once the inside is out and checked,
 * by keeping what lies under its face, so everything before it is built and
 * checked as on a sharp lip.
 *
 * A wall thicker than 1.75 mm stops at a ledge 0.85 mm under the top, which a
 * loft cannot step across: below it the inside is a prism of the wall's inset,
 * run up into the loft over the ledge so their faces do not meet, and the
 * floor's rounding, the scoops and the compartments are cut on the prism.
 */

/** z up to y up: (x, y, z) -> (x, z, -y). */
const Z_TO_Y_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];
/** How far a cutting loft reaches past the face it opens, so the faces do not coincide. */
const PAST = 0.01;
/** Less than this taken from the cutter (mm³) is a scoop the kernel's cut missed; the smallest scoop takes about 29. */
const SCOOP_MISSED = 1e-3;
/** Less than a bound on the compartments, the dividers or a label by more than this (mm³) is geometry the kernel lost. */
const PIECE_MISSED = 1;

function oneSolid(cad: OcctKernel, shape: ShapeHandle, what: string) {
  const solids = cad.isSolid(shape) ? [shape] : cad.getSubShapes(shape, "solid");
  if (solids.length !== 1) throw new Error(`The Gridfinity ${what} came out as ${solids.length} solids`);
  return solids[0];
}

/**
 * A rounded rectangle at height z, centred on (cx, cz) of the shape's frame,
 * as a closed wire. The shape's depth (z) is the kernel's -y, so the turn up
 * at the end puts it back. A `square` corner is one point where its two sides
 * meet, with no arc.
 */
function roundedWire(cad: OcctKernel, cx: number, cz: number, hx: number, hz: number, radius: number, z: number, square?: ReturnType<typeof gridfinityOpenCorners>) {
  // An inside set in past its corners' radius (a wall of 3.75 mm or more) has square corners.
  const r = Math.max(0, radius);
  const squared = r > 0 ? square : { backLeft: true, backRight: true, frontLeft: true, frontRight: true };
  const at = (x: number, depth: number) => ({ x: cx + x, y: -(cz + depth), z });
  const ax = hx - r;
  const az = hz - r;
  const k = r * Math.SQRT1_2;
  if (squared && Object.values(squared).some(Boolean)) {
    const corners = [
      { square: squared.backRight, start: at(ax, -hz), middle: at(ax + k, -az - k), end: at(hx, -az), point: at(hx, -hz) },
      { square: squared.frontRight, start: at(hx, az), middle: at(ax + k, az + k), end: at(ax, hz), point: at(hx, hz) },
      { square: squared.frontLeft, start: at(-ax, hz), middle: at(-ax - k, az + k), end: at(-hx, az), point: at(-hx, hz) },
      { square: squared.backLeft, start: at(-hx, -az), middle: at(-ax - k, -az - k), end: at(-ax, -hz), point: at(-hx, -hz) },
    ];
    // Each side from the corner before it, then the corner's arc unless it is square: the same edges in the same order.
    return cad.makeWire(corners.flatMap((corner, i) => {
      const before = corners[(i + 3) % 4];
      const side = cad.makeLineEdge(before.square ? before.point : before.end, corner.square ? corner.point : corner.start);
      return corner.square ? [side] : [side, cad.makeArcEdge(corner.start, corner.middle, corner.end)];
    }));
  }
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

/** A ruled loft through steps of one rounded rectangle, each set in by its inset with the corner centres kept. */
function steppedSolid(cad: OcctKernel, cx: number, cz: number, hx: number, hz: number, radius: number, steps: GridfinityStep[]) {
  return cad.loft(steps.map(([inset, y]) => roundedWire(cad, cx, cz, hx - inset, hz - inset, radius - inset, y)), true, true);
}

function prism(cad: OcctKernel, hx: number, hz: number, radius: number, from: number, to: number, cx = 0, cz = 0, square?: ReturnType<typeof gridfinityOpenCorners>) {
  return cad.extrude(cad.makeFace(roundedWire(cad, cx, cz, hx, hz, radius, from, square)), 0, 0, to - from);
}

function binSolid(cad: OcctKernel, plan: GridfinityPlan, scoops: GridfinityScoopPieces | null, compartments: GridfinityCompartmentPieces | null) {
  const hx = plan.size.width / 2;
  const hz = plan.size.depth / 2;
  const cellHalf = plan.pitch / 2 - GRIDFINITY_CLEARANCE;
  // The inside is built with a sharp floor edge; a rounding is filleted on it afterwards, with true arcs. The lip's top is sharp too, and a chamfer is cut on it afterwards.
  const wall = gridfinityWallProfile(plan, 0, 0);
  const wallTop = wall[1][1];
  const feet = plan.cells.map((cell) => steppedSolid(cad, cell.x, cell.z, cellHalf, cellHalf, GRIDFINITY_BIN_RADIUS, GRIDFINITY_FOOT));
  const { open } = plan;
  // The corners touching an open side are square from the feet up, so the floor runs flat out to the edge there too.
  const square = gridfinityOpenCorners(open);
  const opened = Object.values(square).some(Boolean);
  let body = oneSolid(cad, cad.fuseAll([...feet, prism(cad, hx, hz, GRIDFINITY_BIN_RADIUS, GRIDFINITY_FOOT_HEIGHT, wallTop, 0, 0, square)]), "bin");
  // The inside, from the floor up: the wall's inner steps in rising order, then out past the top.
  const inside: GridfinityStep[] = wall.slice(2).reverse();
  if (plan.lip) inside.push([0, wallTop], [0, wallTop + PAST]);
  else inside.push([inside[inside.length - 1][0], wallTop + PAST]);
  // Through an open side it runs on until its corners, and the floor's rounding, lie 2 mm beyond the outline.
  const grown = gridfinityOpenGrown(hx, hz, open, plan.reach);
  // A ledge: two steps at one height, the wall's inset and the support's foot.
  const ledged = inside.length > 2 && inside[1][1] === inside[2][1];
  const upper = ledged ? steppedSolid(cad, grown.x, grown.z, grown.hx, grown.hz, GRIDFINITY_BIN_RADIUS, inside.slice(2)) : null;
  // Up into the loft by half the ledge's width (at most 0.4 mm), where the loft, leaning out with the support, is wider.
  const into = Math.min((plan.wallThickness - GRIDFINITY_LEDGE_INSET) / 2, 0.4);
  let cutter = upper
    ? prism(cad, grown.hx - plan.wallThickness, grown.hz - plan.wallThickness, plan.innerRadius, inside[0][1], inside[1][1] + into, grown.x, grown.z)
    : steppedSolid(cad, grown.x, grown.z, grown.hx, grown.hz, GRIDFINITY_BIN_RADIUS, inside);
  const below = cutter;
  if (compartments) cutter = compartmentCutter(cad, below, compartments, hx, hz, wallTop, !upper);
  else if (plan.floorRounding > 0) {
    const floor = inside[0][1];
    const floorEdges = cad.getSubShapes(cutter, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.abs(box.zmin - floor) < 1e-6 && Math.abs(box.zmax - floor) < 1e-6;
    });
    cutter = cad.fillet(cutter, floorEdges, plan.floorRounding);
  }
  if (scoops) cutter = scoopedCutter(cad, cutter, scoops);
  if (upper) cutter = oneSolid(cad, cad.fuse(cutter, upper), "bin's inside");
  // A side opened partly has its notch cut with the inside, in the one cut (#455).
  const opening = gridfinityOpeningInside(plan, compartments);
  const notches = plan.notches.map((notch) => notchSolid(cad, plan, notch, opening));
  if (notches.length > 0) cutter = oneSolid(cad, cad.fuseAll([cutter, ...notches]), "bin's inside");
  // The whole inside without the compartments, the floor's rounding or the scoops, for the dividers' check.
  const loft = upper ? oneSolid(cad, cad.fuse(below, upper), "bin's inside") : below;
  const block = body;
  // A bin without the lip whose floor is raised to the top is one solid block, with no inside to cut.
  if (plan.floor < wallTop) body = oneSolid(cad, cad.cut(body, cutter), "bin");
  // Checked before the magnet holes, which take volume the bound does not count; the loft's PAST over the top cuts nothing.
  if (compartments) {
    const [inset] = inside[inside.length - 1];
    const over = (4 * (hx - inset) * (hz - inset) - (4 - Math.PI) * Math.max(0, GRIDFINITY_BIN_RADIUS - inset) ** 2) * PAST;
    const bound = gridfinityDividerBound(plan, compartments) + gridfinityCompartmentFloorBound(plan, compartments) - gridfinityOpeningFloorCut(plan, compartments);
    // Through an open side the inside runs on past the block, and a notch takes the wall, so what they would leave is measured by cutting it.
    const plain = notches.length > 0 ? cad.getVolume(cad.cut(block, cad.fuseAll([loft, ...notches]))) : opened ? cad.getVolume(cad.cut(block, loft)) : cad.getVolume(block) - cad.getVolume(loft) + over;
    if (cad.getVolume(body) < plain + bound - PIECE_MISSED) throw new Error("The Gridfinity bin's dividers could not be cut");
  }
  if (plan.lipChamfer > 0) body = oneSolid(cad, cad.common(body, lipChamferKeeper(cad, plan, hx, hz, wallTop)), "bin");
  if (plan.magnetHoles.length > 0) {
    const holes = plan.magnetHoles.map((hole) => cad.translate(cad.makeCylinder(GRIDFINITY_MAGNET_DIAMETER / 2, GRIDFINITY_MAGNET_DEPTH + PAST), hole.x, -hole.z, -PAST));
    body = oneSolid(cad, cad.cutAll(body, holes), "bin");
  }
  return body;
}

/** A notch's section (#455) run along it, in the kernel's frame: x as the shape's, y as its -z, z up. */
function notchSolid(cad: OcctKernel, plan: GridfinityPlan, notch: GridfinityNotch, inside: GridfinityOpeningInside) {
  const outline = gridfinityOpeningOutline(plan, notch, inside);
  const cut = outline ? outline.notch : notch;
  const { origin, inward, along, length } = gridfinityOpeningFrame(plan, cut);
  const points = gridfinityOpeningSection(plan, cut, inside.rounding).map(([u, y]) => ({ x: origin.x + u * inward.x, y: -(origin.z + u * inward.z), z: y }));
  const section = cad.extrude(polygonFace(cad, points), along.x * length, -along.z * length, 0);
  if (!outline) return section;
  // Its rounded or chamfered corners: the outline seen from outside the wall, with true arcs, run across the wall.
  const [u0, u1] = outline.across;
  const at = ([t, y]: [number, number]) => ({ x: origin.x + u1 * inward.x + t * along.x, y: -(origin.z + u1 * inward.z + t * along.z), z: y });
  const edges = outline.segments.map(({ from, to, middle }) => (middle ? cad.makeArcEdge(at(from), at(middle), at(to)) : cad.makeLineEdge(at(from), at(to))));
  return oneSolid(cad, cad.common(section, cad.extrude(cad.makeFace(cad.makeWire(edges)), -inward.x * (u1 - u0), inward.z * (u1 - u0), 0)), "notch");
}

/**
 * What stays of a bin under the chamfer on its lip's top: a ruled loft whose side is the chamfer's face, run on
 * past the outer wall and the slope at both ends, and through an open side as the inside is.
 */
function lipChamferKeeper(cad: OcctKernel, plan: GridfinityPlan, hx: number, hz: number, wallTop: number) {
  const size = plan.lipChamfer;
  // The face rises 1 in 1 + sqrt 2 inwards (22.5 degrees), meeting the slope size / sqrt 2 in and down.
  const run = 1 + Math.SQRT2;
  const out = 1;
  const steps: GridfinityStep[] = [[-out, -PAST], [-out, wallTop - size - out / run], [size * run, wallTop], [size * run, wallTop + PAST]];
  const grown = gridfinityOpenGrown(hx, hz, plan.open, plan.reach);
  return steppedSolid(cad, grown.x, grown.z, grown.hx, grown.hz, GRIDFINITY_BIN_RADIUS, steps);
}

/**
 * The cutter for a bin with dividers (#554): the inside above the dividers' top and a rounded prism for each
 * compartment, its floor edges filleted and its scoops taken out, fused into one and kept to the inside, so the bin
 * is cut once. Cutting the compartments one by one took 7 to 15 times as long. Under a ledge the loft over it is the
 * inside above the dividers' top, so no box is added (`withAbove` false).
 */
function compartmentCutter(cad: OcctKernel, loft: ShapeHandle, pieces: GridfinityCompartmentPieces, hx: number, hz: number, wallTop: number, withAbove = true) {
  const above = withAbove ? cad.makeBoxFromCorners({ x: -hx - 1, y: -hz - 1, z: pieces.top }, { x: hx + 1, y: hz + 1, z: wallTop + 1 }) : null;
  const cutters = pieces.cells.map((cell) => {
    // A compartment on an open side runs out through it as the inside does.
    const grown = gridfinityOpenGrown(cell.inside.hx, cell.inside.hz, cell.open, pieces.reach);
    let cutter = prism(cad, grown.hx, grown.hz, cell.inside.radius, pieces.floor, pieces.top + GRIDFINITY_DIVIDER_CUTTER_OVERLAP, grown.x, grown.z);
    // Square corners (a wall of 3.75 mm or more) have no rounding to the floor either.
    if (pieces.floorRounding > 0) {
      const floorEdges = cad.getSubShapes(cutter, "edge").filter((edge) => {
        const box = cad.getBoundingBox(edge);
        return Math.abs(box.zmin - pieces.floor) < 1e-6 && Math.abs(box.zmax - pieces.floor) < 1e-6;
      });
      cutter = cad.fillet(cutter, floorEdges, pieces.floorRounding);
    }
    if (cell.scoops) cutter = scoopedCutter(cad, cutter, cell.scoops);
    return cad.translate(cutter, cell.centre.x, -cell.centre.z, 0);
  });
  const fused = cad.fuseAll([...(above ? [above] : []), ...cutters]);
  // A fuse the kernel gets wrong can leave a compartment out, which would be left solid without a word.
  if (cad.getVolume(fused) < gridfinityCompartmentCutBound(pieces, { box: above ? cad.getVolume(above) : 0, cutters: cutters.map((cutter) => cad.getVolume(cutter)) }) - PIECE_MISSED) {
    throw new Error("The Gridfinity bin's compartments could not be cut");
  }
  return cad.common(fused, loft);
}

function baseplateSolid(cad: OcctKernel, plan: GridfinityPlan) {
  const half = GRIDFINITY_GRID / 2;
  const slab = prism(cad, plan.size.width / 2, plan.size.depth / 2, GRIDFINITY_BASEPLATE_RADIUS, 0, GRIDFINITY_BASEPLATE_HEIGHT);
  const last = GRIDFINITY_SOCKET[GRIDFINITY_SOCKET.length - 1];
  const steps: GridfinityStep[] = [[GRIDFINITY_SOCKET[0][0], -PAST], ...GRIDFINITY_SOCKET, [last[0], last[1] + PAST]];
  const sockets = plan.cells.map((cell) => steppedSolid(cad, cell.x, cell.z, half, half, GRIDFINITY_BASEPLATE_RADIUS, steps));
  return oneSolid(cad, cad.cutAll(slab, sockets), "baseplate");
}

/** A closed polygon of points (x, y, z) as a face. */
function polygonFace(cad: OcctKernel, points: Array<{ x: number; y: number; z: number }>) {
  return cad.makeFace(cad.makeWire(points.map((p, i) => cad.makeLineEdge(p, points[(i + 1) % points.length]))));
}

/** The label shelves and their corner pieces, in the shape's own frame (y up), each cut to the bin's inside. */
function labelSolids(cad: OcctKernel, pieces: GridfinityLabelPieces) {
  const { hx, hz, radius, open = {}, wallThickness = 0 } = pieces.inside;
  const y0 = pieces.floor;
  const y1 = pieces.top;
  // The inside: the inner wall's rounded rectangle from the floor up to the shelves' top, out to the outline and square
  // in the corners at an open side, so a shelf beside it ends flush with the wall's end.
  const grown = gridfinityOpenGrown(hx, hz, open, wallThickness);
  const inside = cad.transform(prism(cad, grown.hx, grown.hz, radius, y0, y1, grown.x, grown.z, gridfinityOpenCorners(open)), Z_TO_Y_UP);
  const profile = (p: GridfinityLabelProfile) => {
    const { start, end } = gridfinityLabelProfileEnds(pieces, p);
    const face = polygonFace(cad, start.map(([x, y, z]) => ({ x, y, z })));
    return cad.extrude(face, end[0][0] - start[0][0], 0, end[0][2] - start[0][2]);
  };
  const cornerShape = (c: GridfinityLabelCornerShape) => {
    const { outline, circle } = gridfinityLabelCornerOutline(c);
    const block = cad.extrude(polygonFace(cad, outline.map((p) => ({ x: p.x, y: y0 - PAST, z: p.z }))), 0, y1 - y0 + 2 * PAST, 0);
    if (!circle) return block;
    const post = cad.translate(cad.transform(cad.makeCylinder(circle.radius, y1 - y0 + 4 * PAST), Z_TO_Y_UP), circle.centre.x, y0 - 2 * PAST, circle.centre.z);
    return cad.cut(block, post);
  };
  const shelves = pieces.shelves.map(({ profile: p, notches }) => cad.common(notches.reduce((solid, notch) => cad.cut(solid, cornerShape(notch)), profile(p)), inside));
  const corners = pieces.corners.map((c) => cad.common(cad.common(cornerShape(c), c.under.length === 1 ? profile(c.under[0]) : cad.fuseAll(c.under.map(profile))), inside));
  return [...shelves, ...corners];
}

/**
 * The cutter for the inside less the finger scoops, so the cut leaves them standing: each scoop is its section, with a
 * true arc, pushed along its wall. Built in the kernel's frame (z up) from the shape's points (y up).
 */
function scoopedCutter(cad: OcctKernel, cutter: ShapeHandle, pieces: GridfinityScoopPieces) {
  const { outline, arc } = gridfinityScoopSection(pieces);
  for (const scoop of pieces.scoops) {
    const point = ([v, y]: [number, number]) => {
      const [x, py, z] = gridfinityScoopPoint(pieces, scoop, scoop.from, [v, y]);
      return { x, y: -z, z: py };
    };
    const corners = [outline[0], outline[1], arc[0], arc[2], outline[outline.length - 1]].map(point);
    const edges = [
      cad.makeLineEdge(corners[0], corners[1]),
      cad.makeLineEdge(corners[1], corners[2]),
      cad.makeArcEdge(corners[2], point(arc[1]), corners[3]),
      cad.makeLineEdge(corners[3], corners[4]),
      cad.makeLineEdge(corners[4], corners[0]),
    ];
    const end = gridfinityScoopPoint(pieces, scoop, scoop.to, [0, 0]);
    const start = gridfinityScoopPoint(pieces, scoop, scoop.from, [0, 0]);
    const scoopSolid = cad.extrude(cad.makeFace(cad.makeWire(edges)), end[0] - start[0], start[2] - end[2], 0);
    const before = cad.getVolume(cutter);
    const next = cad.cut(cutter, scoopSolid);
    // A cut the kernel gets wrong can leave the cutter as it was; the STEP export would then lose the scoop without a word.
    if (before - cad.getVolume(next) < SCOOP_MISSED) throw new Error("The Gridfinity bin's finger scoop could not be cut");
    cutter = next;
  }
  return cutter;
}

/** The bin with dividers joined to its compartments' labels, each cut to its compartment and moved into place. */
function labelledCompartments(cad: OcctKernel, standing: ShapeHandle, pieces: GridfinityCompartmentPieces) {
  const solids = pieces.cells.flatMap((cell) => (cell.labels ? labelSolids(cad, cell.labels).map((solid, i) => ({ solid: cad.translate(solid, cell.centre.x, 0, cell.centre.z), shelf: i < cell.labels!.shelves.length })) : []));
  if (solids.length === 0) return standing;
  // A shelf the kernel's cut to its compartment lost, or a fuse that dropped them all, would leave a label out without a word.
  if (solids.some(({ solid, shelf }) => shelf && !(cad.getVolume(solid) > PIECE_MISSED))) throw new Error("The Gridfinity bin's labels could not be joined");
  const labelled = oneSolid(cad, cad.fuseAll([standing, ...solids.map(({ solid }) => solid)]), "bin with labels");
  if (cad.getVolume(labelled) - cad.getVolume(standing) < PIECE_MISSED) throw new Error("The Gridfinity bin's labels could not be joined");
  if (!cad.isValid(labelled)) throw new Error("The Gridfinity body is not a valid solid");
  return labelled;
}

/** The Gridfinity part's exact solid in the shape's own frame, y up. Throws when the kernel cannot build it. */
export function gridfinityPartSolid(cad: OcctKernel, part: CadModifierGridfinityPart): ShapeHandle {
  const plan = gridfinityPlan(part);
  const scoopPieces = gridfinityScoopPieces(part);
  const compartments = gridfinityCompartmentPieces(part);
  // A bin with dividers has its scoops in its compartments.
  const solid = plan.type === "bin" ? binSolid(cad, plan, compartments ? null : scoopPieces, compartments) : baseplateSolid(cad, plan);
  if (!cad.isValid(solid) || !(cad.getVolume(solid) > 0)) throw new Error("The Gridfinity body is not a valid solid");
  const standing = cad.transform(solid, Z_TO_Y_UP);
  if (compartments) return labelledCompartments(cad, standing, compartments);
  const pieces = gridfinityLabelPieces(part);
  if (!pieces) return standing;
  const labelled = oneSolid(cad, cad.fuseAll([standing, ...labelSolids(cad, pieces)]), "bin with label shelves");
  if (!cad.isValid(labelled)) throw new Error("The Gridfinity body is not a valid solid");
  return labelled;
}
