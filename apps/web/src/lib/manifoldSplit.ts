import type { ManifoldToplevel, Mat4 } from "manifold-3d";
import {
  CONNECTOR_FLOOR_SKIN,
  CONNECTOR_WALL,
  connectorChamfer,
  connectorHoleRadius,
  dowelLength,
  fromSplitFrame,
  placeSplitConnectors,
  plugHeight,
  splitPlaneFrame,
  toSplitFrame,
  type SectionRing,
  type SplitConnectorOptions,
  type SplitConnectorTally,
  type SplitPlaneFrame,
} from "@/lib/splitConnectors";

export type ManifoldSolid = ReturnType<ManifoldToplevel["Manifold"]["cube"]>;

/** The same surface facing the other way: a cavity turned into the solid that fills it. */
function invertedManifold(runtime: ManifoldToplevel, source: ManifoldSolid) {
  const mesh = source.getMesh();
  const triVerts = Uint32Array.from(mesh.triVerts);
  for (let index = 0; index < triVerts.length; index += 3) {
    const second = triVerts[index + 1];
    triVerts[index + 1] = triVerts[index + 2];
    triVerts[index + 2] = second;
  }
  const inverted = new runtime.Mesh({ numProp: mesh.numProp, vertProperties: mesh.vertProperties, triVerts });
  try {
    return runtime.Manifold.ofMesh(inverted);
  } finally {
    (mesh as { delete?: () => void }).delete?.();
    (inverted as { delete?: () => void }).delete?.();
  }
}

/**
 * Merges overlapping bodies into one before a split. A closed hollow comes
 * apart into its outer skin and an inward-facing cavity; a union would fill
 * that cavity, so only the outward-facing bodies are united and the cavities
 * are cut back out afterwards.
 */
export function unionSplitManifoldComponents(runtime: ManifoldToplevel, source: ManifoldSolid) {
  const components = source.decompose();
  const bodies = components.filter((component) => component.volume() > 0);
  const cavities = components.filter((component) => component.volume() < 0);
  if (bodies.length <= 1) {
    return { solid: source, created: components };
  }

  const created: ManifoldSolid[] = [...components];
  let solid = runtime.Manifold.union(bodies);
  created.push(solid);
  if (cavities.length > 0) {
    const filled = cavities.map((cavity) => invertedManifold(runtime, cavity));
    created.push(...filled);
    const cavitySolid = filled.length === 1 ? filled[0] : runtime.Manifold.union(filled);
    created.push(cavitySolid);
    solid = solid.subtract(cavitySolid);
    created.push(solid);
  }
  return {
    solid: solid.status() === "NoError" && solid.numTri() > 0 ? solid : null,
    created,
  };
}

/** A corner this close to the plane (mm) lies on it. */
const ON_PLANE = 1e-4;
/** How far each half is cut clear of a face lying on the plane (mm), then moved back. */
const CLEAR_OF_FACE = 1e-3;

/**
 * Splits a solid by a plane. A face lying exactly on the plane - the top of a
 * lid's plate under its rim, cut at the plate's thickness (#1263) - goes to one
 * half as a sheet without thickness, and where that sheet touches the half's
 * own surface it stays joined to it: the rim comes out with a flat brim as wide
 * as the plate, which dropSplitSlivers cannot take off. So when corners lie on
 * the plane, each half is cut a hair clear of it on its own side, where no face
 * lies, and its cut face is moved back onto the plane. Elsewhere it is the
 * plain split.
 */
export function splitByPlaneClearOfFaces(solid: ManifoldSolid, normal: [number, number, number], position: number): [ManifoldSolid, ManifoldSolid] {
  const length = Math.hypot(...normal);
  const unit: [number, number, number] = [normal[0] / length, normal[1] / length, normal[2] / length];
  // As in Manifold's own splitByPlane, `position` is the distance along the normal, whatever its length.
  const offset = position;
  const height = (x: number, y: number, z: number) => unit[0] * x + unit[1] * y + unit[2] * z - offset;
  const mesh = solid.getMesh();
  let touches = false;
  try {
    for (let index = 0; index + 2 < mesh.vertProperties.length && !touches; index += mesh.numProp) {
      touches = Math.abs(height(mesh.vertProperties[index], mesh.vertProperties[index + 1], mesh.vertProperties[index + 2])) < ON_PLANE;
    }
  } finally {
    (mesh as { delete?: () => void }).delete?.();
  }
  if (!touches) return solid.splitByPlane(normal, position);

  // Each half from its own cut; the other half of that cut is not needed.
  const [positiveCut, abovePositive] = solid.splitByPlane(unit, offset + CLEAR_OF_FACE);
  const [belowNegative, negativeCut] = solid.splitByPlane(unit, offset - CLEAR_OF_FACE);
  abovePositive.delete();
  belowNegative.delete();
  const backOnto = (cut: ManifoldSolid, at: number) => {
    const moved = cut.warp((vertex) => {
      if (Math.abs(height(vertex[0], vertex[1], vertex[2]) - at) > ON_PLANE / 10) return;
      vertex[0] -= unit[0] * at;
      vertex[1] -= unit[1] * at;
      vertex[2] -= unit[2] * at;
    });
    cut.delete();
    return moved;
  };
  return [backOnto(positiveCut, CLEAR_OF_FACE), backOnto(negativeCut, -CLEAR_OF_FACE)];
}

/** Thinner than this (in mm, roughly volume over half the surface) a piece is a skin, not a body. */
const SLIVER_THICKNESS = 1e-5;

/**
 * Drops the zero-thickness skins a cut leaves behind. A plane lying exactly on
 * a face - as one laid on a picked face does - hands that face to one half as
 * a flat sheet of its own. Cavities count by their size too, so a hollowed
 * half keeps them.
 */
export function dropSplitSlivers(runtime: ManifoldToplevel, half: ManifoldSolid) {
  const components = half.decompose();
  const kept = components.filter((component) => Math.abs(component.volume()) * 2 > component.surfaceArea() * SLIVER_THICKNESS);
  if (kept.length === components.length) {
    return { solid: half, created: components };
  }
  if (kept.length === 0) {
    return { solid: null, created: components };
  }
  const solid = runtime.Manifold.compose(kept);
  return { solid, created: [...components, solid] };
}

type Disposable = { delete?: () => void };
type FramePoint = [number, number];

/** How far from the plane each half's section is read, in mm: inside the half, clear of its cut face. */
const SECTION_STEP = 0.01;
/** How many sides the holes, pegs and pins have. */
const CONNECTOR_SIDES = 48;
/** The chamfer round a hole's mouth, in mm, so a first layer that spread on the plate does not narrow it. */
const HOLE_MOUTH_CHAMFER = 0.4;
/** How far a hole's cutter reaches out past the cut face, and a peg's foot into its half, in mm, so no skin is left. */
const CONNECTOR_OVERLAP = 0.5;
/** How much wall a hole needs beside it all the way down, beyond its radius, in mm. */
const HOLE_SIDE_WALL = CONNECTOR_WALL / 2;
/** How much of a hole's probe must lie in its half for the hole to fit there. */
const PROBE_INSIDE = 0.99;
/** Loose dowels stand beside the body, this far from it and from one another, so many to a row, in mm. */
const PIN_SPACING = 5;
const PIN_GAP = 3;
const PINS_PER_ROW = 5;
/** A pin's axis (z as it is made) stood up along the scene's y. */
const PIN_UPRIGHT: Mat4 = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];

export type SplitConnectorPlan = {
  frame: SplitPlaneFrame;
  position: number;
  /** Where the connectors go, in the plane's frame. */
  points: FramePoint[];
  tally: SplitConnectorTally;
};

/**
 * The cut face as separate pieces, each its outline and holes in the plane's frame: where both halves have material, a
 * hair either side of the plane. A connector needs both - a plane laid on a step's face meets one half wider than the
 * other, and only what they share is face against face.
 */
export function splitCutFacePieces(runtime: ManifoldToplevel, positive: ManifoldSolid, negative: ManifoldSolid, frame: SplitPlaneFrame, position: number, created: Disposable[]) {
  const toFrame = toSplitFrame(frame);
  const above = positive.transform(toFrame);
  const below = negative.transform(toFrame);
  created.push(above, below);
  const upper = above.slice(position + SECTION_STEP);
  const lower = below.slice(position - SECTION_STEP);
  created.push(upper, lower);
  const face = runtime.CrossSection.intersection(upper, lower);
  created.push(face);
  const pieces = face.decompose();
  created.push(...pieces);
  return pieces.filter((piece) => piece.area() > 1e-6).map((piece) => piece.toPolygons() as SectionRing[]);
}

/** A round solid about the frame's z axis, from its profile: radius and height pairs, counter-clockwise. */
function revolved(runtime: ManifoldToplevel, profile: FramePoint[], created: Disposable[]) {
  const solid = runtime.Manifold.revolve([profile], CONNECTOR_SIDES);
  created.push(solid);
  return solid;
}

/** A hole's cutter in the frame, from the plane (z 0) into the half above it, with its chamfered mouth. */
function holeCutter(runtime: ManifoldToplevel, options: SplitConnectorOptions, created: Disposable[]) {
  const radius = connectorHoleRadius(options);
  const mouth = radius + HOLE_MOUTH_CHAMFER + CONNECTOR_OVERLAP;
  return revolved(runtime, [[0, -CONNECTOR_OVERLAP], [mouth, -CONNECTOR_OVERLAP], [radius, HOLE_MOUTH_CHAMFER], [radius, options.depth], [0, options.depth]], created);
}

/** A plug's peg in the frame, standing up from the plane with its foot in the half below and its end chamfered. */
function plugPeg(runtime: ManifoldToplevel, options: SplitConnectorOptions, created: Disposable[]) {
  const radius = options.diameter / 2;
  const height = plugHeight(options);
  const chamfer = connectorChamfer(options.diameter);
  return revolved(runtime, [[0, -CONNECTOR_OVERLAP], [radius, -CONNECTOR_OVERLAP], [radius, height - chamfer], [radius - chamfer, height], [0, height]], created);
}

/** A loose dowel standing on z 0, chamfered at both ends. */
function dowelPin(runtime: ManifoldToplevel, options: SplitConnectorOptions, created: Disposable[]) {
  const radius = options.diameter / 2;
  const length = dowelLength(options);
  const chamfer = connectorChamfer(options.diameter);
  return revolved(runtime, [[0, 0], [radius - chamfer, 0], [radius, chamfer], [radius, length - chamfer], [radius - chamfer, length], [0, length]], created);
}

function unionOf(runtime: ManifoldToplevel, solids: ManifoldSolid[], created: Disposable[]) {
  if (solids.length === 1) return solids[0];
  const union = runtime.Manifold.union(solids);
  created.push(union);
  return union;
}

/**
 * Where the connectors go on the cut face of these two halves (splitConnectors.ts), with those left out where a half is
 * too thin for its hole: a hole, a little wall beside it and a skin below its floor must lie in the half. A plug's peg
 * stands out of its half and needs only the face.
 */
export function planSplitConnectors(runtime: ManifoldToplevel, positive: ManifoldSolid, negative: ManifoldSolid, normal: readonly [number, number, number], position: number, options: SplitConnectorOptions, created: Disposable[]): SplitConnectorPlan {
  const frame = splitPlaneFrame(normal);
  const pieces = splitCutFacePieces(runtime, positive, negative, frame, position, created);
  const placed = placeSplitConnectors(pieces, options);
  const toFrame = toSplitFrame(frame);
  const probeRadius = connectorHoleRadius(options) + HOLE_SIDE_WALL;
  const probeLength = options.depth + CONNECTOR_FLOOR_SKIN;
  const fits = (half: ManifoldSolid, upward: boolean) => {
    if (!placed.points.length) return [];
    const probe = runtime.Manifold.cylinder(probeLength, probeRadius, probeRadius, CONNECTOR_SIDES);
    created.push(probe);
    const probes = placed.points.map(([a, b]) => {
      const placedProbe = probe.translate([a, b, upward ? position + SECTION_STEP : position - SECTION_STEP - probeLength]);
      created.push(placedProbe);
      return placedProbe;
    });
    const framed = half.transform(toFrame);
    created.push(framed);
    const inside = framed.intersect(unionOf(runtime, probes, created));
    created.push(inside);
    return probes.map((each) => {
      const kept = inside.intersect(each);
      created.push(kept);
      return kept.volume() >= PROBE_INSIDE * each.volume();
    });
  };
  const above = fits(positive, true);
  const below = options.kind === "dowels" ? fits(negative, false) : above.map(() => true);
  const points = placed.points.filter((_, index) => above[index] && below[index]);
  return {
    frame,
    position,
    points,
    tally: { placed: points.length, faces: placed.faces, tooSmall: placed.tooSmall, tooThin: placed.points.length - points.length },
  };
}

/**
 * The connectors made: the holes cut into the halves, a plug's pegs joined to the half on the minus side of the plane
 * (they point along its normal into the other half), and a dowel's loose pins. The pins stand upright beside `beside`
 * (the body's box) on its floor, in rows: standing, they print round in the layers as their holes do in a half laid on
 * its cut face, and as the fit test's pin does, so the printer's play holds for them; a chamfer at each end takes the
 * first layer's spread and finds the hole.
 */
export function applySplitConnectors(
  runtime: ManifoldToplevel,
  positive: ManifoldSolid,
  negative: ManifoldSolid,
  plan: SplitConnectorPlan,
  options: SplitConnectorOptions,
  beside: { min: readonly number[]; max: readonly number[] },
  created: Disposable[],
): { positive: ManifoldSolid; negative: ManifoldSolid; pins: ManifoldSolid | null } {
  if (!plan.points.length || options.kind === "none") return { positive, negative, pins: null };
  const toWorld = fromSplitFrame(plan.frame);
  const world = (solids: ManifoldSolid[]) => {
    const moved = unionOf(runtime, solids, created).transform(toWorld);
    created.push(moved);
    return moved;
  };
  const cutter = holeCutter(runtime, options, created);
  const placedAbove = plan.points.map(([a, b]) => {
    const placed = cutter.translate([a, b, plan.position]);
    created.push(placed);
    return placed;
  });
  const cutPositive = positive.subtract(world(placedAbove));
  created.push(cutPositive);
  if (options.kind === "plugs") {
    const peg = plugPeg(runtime, options, created);
    const pegs = plan.points.map(([a, b]) => {
      const placed = peg.translate([a, b, plan.position]);
      created.push(placed);
      return placed;
    });
    const joined = negative.add(world(pegs));
    created.push(joined);
    return { positive: cutPositive, negative: joined, pins: null };
  }
  const mirrored = cutter.mirror([0, 0, 1]);
  created.push(mirrored);
  const placedBelow = plan.points.map(([a, b]) => {
    const placed = mirrored.translate([a, b, plan.position]);
    created.push(placed);
    return placed;
  });
  const cutNegative = negative.subtract(world(placedBelow));
  created.push(cutNegative);
  const pin = dowelPin(runtime, options, created).transform(PIN_UPRIGHT);
  created.push(pin);
  const radius = options.diameter / 2;
  const pitch = options.diameter + PIN_GAP;
  const pins = plan.points.map((_, index) => {
    const placed = pin.translate([
      beside.max[0] + PIN_SPACING + radius + (index % PINS_PER_ROW) * pitch,
      beside.min[1],
      beside.min[2] + radius + Math.floor(index / PINS_PER_ROW) * pitch,
    ]);
    created.push(placed);
    return placed;
  });
  const allPins = unionOf(runtime, pins, created);
  return { positive: cutPositive, negative: cutNegative, pins: allPins };
}
