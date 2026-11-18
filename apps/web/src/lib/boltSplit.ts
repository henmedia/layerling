import type { ManifoldToplevel, Mat4 } from "manifold-3d";
import { shapeToManifoldSolid } from "@/lib/editorBooleans";
import { getManifoldRuntime, type ManifoldSolid } from "@/lib/editorMeshCore";
import { t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { splitShapeFromWorldPositions } from "@/lib/modelSplit";
import { threadDriveRadius, threadSettings } from "@/lib/threadGeometry";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A screw or a threaded rod split lengthwise for printing: a thread printed standing breaks along its layers, one printed
 * lying flat is as strong along its length as the filament. The body is cut in two through its axis and each half laid
 * on its cut face (flat on the bed, the thread's flanks rising from it, nothing to support); the halves are glued
 * together after printing. The glued face carries the load: along the axis each half takes its own share from the head
 * through its own turns into the nut, and the flanks press the halves together. What matters is that the halves meet
 * exactly, along the axis too, or the turns of the two halves do not line up and the nut jams. Centring pins do that:
 * one in the head and one to three along the thread, by its length, each in a hole square to the cut face in both halves.
 * Laid flat, a hole stands upright from the bed with a 45 degree cone for its top, so it needs no bridge, and the pins
 * print standing, chamfered at both ends.
 */

export type BoltSplitOptions = {
  /** Holes in both halves and loose pins for them. */
  pins: boolean;
  /** The pins' play per side in their holes, mm. */
  pinPlay: number;
};

export const BOLT_SPLIT_DEFAULTS: BoltSplitOptions = { pins: true, pinPlay: 0.15 };
export const BOLT_PIN_PLAY_LIMITS: readonly [number, number] = [0, 0.5];
/** The pin's diameter is this share of the thread's core diameter, rounded to half millimetres, within the limits. */
const PIN_SHARE = 0.25;
export const BOLT_PIN_DIAMETER_LIMITS: readonly [number, number] = [2, 6];
/** Material kept round a hole, mm; the thinner wall where a pin would not fit otherwise. */
const PIN_WALL = 0.6;
const PIN_WALL_THIN = 0.4;
/** The thinnest pin, where the thread's own is too thick to fit, mm. */
export const BOLT_PIN_MIN_DIAMETER = 1.5;
/** A pin is shorter than its two holes by this at each end, and chamfered by PIN_CHAMFER. */
const PIN_END_PLAY = 0.3;
const PIN_CHAMFER = 0.4;
/** Pins along the thread: about one every this many mm, one to three. */
const PIN_SPACING = 20;
/** Room between the parts as they are laid out, mm. */
const LAYOUT_GAP = 5;

export function normalizeBoltSplitOptions(value?: Partial<Record<keyof BoltSplitOptions, unknown>> | null): BoltSplitOptions {
  const play = Number(value?.pinPlay);
  return {
    pins: typeof value?.pins === "boolean" ? value.pins : BOLT_SPLIT_DEFAULTS.pins,
    pinPlay: Number.isFinite(play) ? Math.min(BOLT_PIN_PLAY_LIMITS[1], Math.max(BOLT_PIN_PLAY_LIMITS[0], play)) : BOLT_SPLIT_DEFAULTS.pinPlay,
  };
}

/** Whether the shape is a screw or a threaded rod that can be split lengthwise: a body, not a hole, not a nut. */
export function boltSplitFits(shape: WorkplaneShape) {
  if (shape.kind !== "thread" || shape.hole) return false;
  const role = shape.threadRole ?? "rod";
  return role === "rod" || role === "screw";
}

/** The centring pins' diameter for this thread (mm). */
export function boltPinDiameter(shape: WorkplaneShape) {
  const settings = threadSettings(shape);
  const core = settings.diameter - 2 * settings.depth;
  const [min, max] = BOLT_PIN_DIAMETER_LIMITS;
  return Math.min(max, Math.max(min, Math.round(core * PIN_SHARE * 2) / 2));
}

/** A spot on the cut face (the plane x = cx) for a pin: its height and its offset from the axis across. */
export type BoltPinSpot = { y: number; z: number; where: "head" | "thread"; /** How far its holes reach into each half, mm. */ depth: number };

export type BoltSplitParts = {
  halves: [ManifoldSolid, ManifoldSolid];
  pins: ManifoldSolid[];
  /** The pins as printed: diameter and lengths (the thread's, then the head's where it differs), mm; 0 without pins. */
  pinDiameter: number;
  pinLength: number;
  headPinLength: number;
  /** Where they went, in the head and along the thread. */
  placed: { head: number; thread: number };
};

/**
 * Along x through the cut face (the plane x = cx) at (y, cz + z): a cylinder `half` long each way with a cone of 45
 * degrees on each end, so a hole of it stands up from the bed with a pointed top once its half is laid on the cut face.
 */
function pinBore(runtime: ManifoldToplevel, axis: { cx: number; cz: number }, y: number, z: number, radius: number, half: number, created: { delete?: () => void }[]) {
  const keep = <T extends { delete?: () => void }>(value: T) => (created.push(value), value);
  const joined = keep(runtime.Manifold.union([
    keep(runtime.Manifold.cylinder(2 * half, radius, radius, 32, true)),
    // The cones start a hundredth inside the cylinder, that much wider, so no ledge is left where they meet.
    keep(keep(runtime.Manifold.cylinder(radius + 0.01, radius + 0.01, 0, 32)).translate([0, 0, half - 0.01])),
    keep(keep(runtime.Manifold.cylinder(radius + 0.01, 0, radius + 0.01, 32)).translate([0, 0, -half - radius])),
  ]));
  return keep(keep(joined.rotate([0, 90, 0])).translate([axis.cx, y, axis.cz + z]));
}

/** Whether a hole for a pin at `spot` stays `wall` inside the body all round (a hundredth of it may poke out of a thread's root). */
function pinFits(runtime: ManifoldToplevel, body: ManifoldSolid, axis: { cx: number; cz: number }, spot: BoltPinSpot, bore: number, depth: number, wall: number, created: { delete?: () => void }[]) {
  const outer = pinBore(runtime, axis, spot.y, spot.z, bore + wall, depth + wall, created);
  const outside = outer.subtract(body);
  created.push(outside);
  return outside.volume() <= 0.01 * outer.volume();
}

/** Column-major 4 x 4: the image of x, of y, of z, then the move. */
const LAY_MINUS: Mat4 = [0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const LAY_PLUS: Mat4 = [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1];

/**
 * The halves (and the pins) of a body standing upright (y up, the scene's frame) with its axis through (`cx`, `cz`).
 * `spots` are the places for pins, checked already (planBoltPins). The parts come back laid out flat, in the scene's frame, round
 * the origin: the halves side by side along z, their length along x, the pins standing in a row beyond them.
 */
export function splitBoltSolid(
  runtime: ManifoldToplevel,
  body: ManifoldSolid,
  axis: { cx: number; cz: number },
  plan: { spots: readonly BoltPinSpot[]; diameter: number },
  options: BoltSplitOptions,
  created: { delete?: () => void }[],
): BoltSplitParts {
  const keep = <T extends { delete?: () => void }>(value: T) => (created.push(value), value);
  let cut = body;
  const pins: ManifoldSolid[] = [];
  const placed = { head: 0, thread: 0 };
  let pinLength = 0;
  let headPinLength = 0;
  if (options.pins && plan.spots.length) {
    const bore = plan.diameter / 2 + options.pinPlay;
    const holes: ManifoldSolid[] = [];
    for (const spot of plan.spots) {
      holes.push(pinBore(runtime, axis, spot.y, spot.z, bore, spot.depth, created));
      placed[spot.where] += 1;
    }
    if (holes.length) {
      cut = keep(body.subtract(holes.length > 1 ? keep(runtime.Manifold.union(holes)) : holes[0]));
      const r = plan.diameter / 2;
      const lengthOf = (spot: BoltPinSpot) => Math.round((2 * spot.depth - 2 * PIN_END_PLAY) * 100) / 100;
      for (const spot of plan.spots) {
        const length = lengthOf(spot);
        if (spot.where === "head") headPinLength = length;
        else pinLength = Math.max(pinLength, length);
        const c = Math.min(PIN_CHAMFER, r / 3, length / 4);
        // Standing, chamfered at both ends: its outline turned about the axis in one piece (revolve turns about y and
        // hands the axis back as z), then stood upright.
        const outline = keep(new runtime.CrossSection([[[0, 0], [r - c, 0], [r, c], [r, length - c], [r - c, length], [0, length]]]));
        const pin = keep(runtime.Manifold.revolve(outline, 32));
        pins.push(keep(pin.rotate([-90, 0, 0])));
      }
    }
  }
  const plus = keep(cut.trimByPlane([1, 0, 0], axis.cx));
  const minus = keep(cut.trimByPlane([-1, 0, 0], -axis.cx));
  const laid = [minus, plus].map((half, index) => keep(keep(half.translate([-axis.cx, 0, -axis.cz])).transform(index === 0 ? LAY_MINUS : LAY_PLUS)));
  // Side by side along z, each on the bed and centred on x; the pins in a row along x in front of them.
  const depths = laid.map((part) => part.boundingBox().max[2] - part.boundingBox().min[2]);
  const pinRow = pins.length ? plan.diameter : 0;
  const total = depths.reduce((sum, depth) => sum + depth, 0) + LAYOUT_GAP + (pins.length ? LAYOUT_GAP + pinRow : 0);
  let z = -total / 2;
  const placedHalves = laid.map((part, index) => {
    const box = part.boundingBox();
    const moved = keep(part.translate([-(box.min[0] + box.max[0]) / 2, -box.min[1], z - box.min[2]]));
    z += depths[index] + LAYOUT_GAP;
    return moved;
  });
  const step = plan.diameter + LAYOUT_GAP;
  const placedPins = pins.map((pin, index) => {
    const box = pin.boundingBox();
    const x = (index - (pins.length - 1) / 2) * step;
    return keep(pin.translate([x - (box.min[0] + box.max[0]) / 2, -box.min[1], z - box.min[2]]));
  });
  return {
    halves: [placedHalves[0], placedHalves[1]],
    pins: placedPins,
    pinDiameter: pins.length ? plan.diameter : 0,
    pinLength: pinLength || headPinLength,
    headPinLength: headPinLength && pinLength && headPinLength !== pinLength ? headPinLength : 0,
    placed,
  };
}

export type BoltSplitShapeResult =
  | { parts: WorkplaneShape[]; pins: number; pinDiameter: number; pinLength: number; headPinLength: number; placed: { head: number; thread: number } }
  | { parts: null; error: string };

function positionsOf(solid: ManifoldSolid) {
  const mesh = solid.getMesh();
  const positions: number[] = [];
  for (let index = 0; index < mesh.triVerts.length; index += 1) {
    const offset = mesh.triVerts[index] * mesh.numProp;
    positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
  }
  return positions;
}

/**
 * The screw or rod `shape` split lengthwise, as new mesh bodies laid flat where it stood (its turn on the workplane does
 * not count: it is split along its own axis). The caller replaces the shape with them.
 */
export async function splitBoltForShape(shape: WorkplaneShape, given?: Partial<BoltSplitOptions> | null): Promise<BoltSplitShapeResult> {
  if (!boltSplitFits(shape)) return { parts: null, error: t("boltSplit.error.notBolt") };
  const options = normalizeBoltSplitOptions(given);
  const created: { delete?: () => void }[] = [];
  const keep = <T extends { delete?: () => void }>(value: T) => (created.push(value), value);
  try {
    const runtime = await getManifoldRuntime();
    // Upright, as it was drawn: the axis is the shape's own y.
    const upright: WorkplaneShape = { ...shape, rotation: 0, rotationX: 0, rotationZ: 0 };
    const body = shapeToManifoldSolid(runtime, upright, created as ManifoldSolid[]);
    if (!body || body.status() !== "NoError" || body.isEmpty()) return { parts: null, error: t("boltSplit.error.notClosed") };
    const box = body.boundingBox();
    const cx = (box.min[0] + box.max[0]) / 2;
    const cz = (box.min[2] + box.max[2]) / 2;
    const y0 = box.min[1];
    const y1 = box.max[1];
    const settings = threadSettings(shape);
    const coreRadius = settings.diameter / 2 - settings.depth;
    // Where the head is, on a screw (on whichever end).
    let head: { end: number; inward: number; drive: number; driveRadius: number } | null = null;
    if ((shape.threadRole ?? "rod") === "screw") {
      const near = (y: number) => keep(body.slice(y)).area();
      const headLow = near(y0 + settings.headHeight / 2) >= near(y1 - settings.headHeight / 2);
      head = {
        end: headLow ? y0 : y1,
        inward: headLow ? 1 : -1,
        drive: settings.drive !== "none" ? settings.driveDepth : 0,
        driveRadius: settings.drive !== "none" ? threadDriveRadius(settings.drive, settings.driveSize) : 0,
      };
    }
    /**
     * The pins for a pin `diameter` with `wall` round its holes: one in the head (on the axis between the drive's floor
     * and the head's top, else half way up, else beside the drive), and along the thread one to three by its length
     * (a rod one near each end), or, where none of those fit, the one nearest the thread's middle that does. Each hole
     * reaches 1.5 diameters into its half, less where the core is thinner (its cone's tip stays `wall` inside the core).
     */
    const plan = (diameter: number, wall: number) => {
      const least = Math.max(0.6 * diameter, 1);
      // The thread's core too thin for this pin: the head still takes one, the thread none.
      const coreDepth = Math.min(1.5 * diameter, coreRadius - diameter / 2 - wall - 0.2);
      const threadFits = coreDepth >= least;
      const depth = threadFits ? coreDepth : 1.5 * diameter;
      const bore = diameter / 2 + options.pinPlay;
      const taken: BoltPinSpot[] = [];
      const add = (spot: BoltPinSpot) => {
        if (taken.some((other) => Math.hypot(other.y - spot.y, other.z - spot.z) < 2 * diameter + wall)) return false;
        if (!pinFits(runtime, body, { cx, cz }, spot, bore, spot.depth, wall, created)) return false;
        taken.push(spot);
        return true;
      };
      let low = y0 + Math.max(settings.chamferLow, 0) + diameter;
      let high = y1 - Math.max(settings.chamfer, 0) - diameter;
      if (head) {
        const height = settings.headHeight;
        // The head may take a shorter pin than the thread: a countersunk head is thin where the drive leaves room.
        const near = bore + wall + 0.2;
        // Last, on the axis just past the drive's floor: under a countersunk head the drive takes most of the head.
        const ups = [(head.drive + height) / 2, height / 2, near, head.drive + near];
        const besides = [(head.driveRadius + settings.headDiameter / 2) / 2, head.driveRadius + near];
        const tries = [...ups.map((up) => ({ up, z: 0 })), ...ups.flatMap((up) => besides.flatMap((side) => [side, -side]).map((z) => ({ up, z })))];
        const depths = [Math.max(depth, 1.5 * diameter), depth, (depth + least) / 2, least].filter((value, index, all) => value >= least && all.indexOf(value) === index);
        depths.some((reach) => tries.some(({ up, z }) => add({ y: head!.end + head!.inward * up, z, where: "head", depth: reach })));
        const past = height + settings.collarHeight + diameter;
        if (head.inward > 0) low = y0 + past;
        else high = y1 - past;
      }
      const span = high - low;
      const count = Math.max(1, Math.min(3, Math.round(Math.max(0, span) / PIN_SPACING)));
      let ideal = count === 1 ? [(low + high) / 2] : Array.from({ length: count }, (_, index) => low + (span * index) / (count - 1));
      if (!head && count === 1 && span > 2 * diameter + wall) ideal = [low, high];
      if (threadFits) ideal.forEach((y) => add({ y, z: 0, where: "thread", depth }));
      if (threadFits && !taken.some((spot) => spot.where === "thread") && span > 0) {
        const middle = (low + high) / 2;
        const step = Math.max(0.5, span / 40);
        const ys: number[] = [];
        for (let y = low; y <= high + 1e-9; y += step) ys.push(y);
        ys.sort((p, q) => Math.abs(p - middle) - Math.abs(q - middle)).some((y) => add({ y, z: 0, where: "thread", depth }));
      }
      return { spots: taken, diameter };
    };
    // The pin for this thread first, then thinner ones and a thinner wall, until the head (on a screw) and the thread
    // have one each; where nothing does, the plan with the most pins.
    let chosen: { spots: BoltPinSpot[]; diameter: number } = { spots: [], diameter: boltPinDiameter(shape) };
    if (options.pins) {
      search: for (let diameter = boltPinDiameter(shape); diameter >= BOLT_PIN_DIAMETER_LIMITS[0] - 0.5 - 1e-9; diameter -= 0.5) {
        for (const wall of [PIN_WALL, PIN_WALL_THIN]) {
          const tried = plan(Math.max(BOLT_PIN_MIN_DIAMETER, diameter), wall);
          const has = (where: BoltPinSpot["where"]) => tried.spots.some((spot) => spot.where === where);
          if ((!head || has("head")) && has("thread")) {
            chosen = tried;
            break search;
          }
          if (tried.spots.length > chosen.spots.length) chosen = tried;
        }
      }
    }
    const split = splitBoltSolid(runtime, body, { cx, cz }, chosen, options, created);
    const name = shape.name;
    const named: Array<[ManifoldSolid, string, string]> = [
      [split.halves[0], t("boltSplit.halfName", { name, number: 1 }), "half-1"],
      [split.halves[1], t("boltSplit.halfName", { name, number: 2 }), "half-2"],
    ];
    // The pins as one body: they are printed together.
    if (split.pins.length) named.push([split.pins.length > 1 ? keep(runtime.Manifold.union(split.pins)) : split.pins[0], t("boltSplit.pinsName", { name }), "pins"]);
    const parts: WorkplaneShape[] = [];
    for (const [solid, partName, role] of named) {
      // Laid out round the origin; moved to where the shape stood.
      const placed = keep(solid.translate([cx, 0, cz]));
      const part = splitShapeFromWorldPositions(shape, positionsOf(placed), createLocalId(`${shape.id}-${role}`), partName);
      if (!part) return { parts: null, error: t("boltSplit.error.notClosed") };
      parts.push(canonicalizeShape({ ...part, hidden: false, hole: false, locked: false }));
    }
    return { parts, pins: split.pins.length, pinDiameter: split.pinDiameter, pinLength: split.pinLength, headPinLength: split.headPinLength, placed: split.placed };
  } catch (error) {
    return { parts: null, error: t("boltSplit.error.kernel", { message: error instanceof Error ? error.message : String(error ?? "") }) };
  } finally {
    Array.from(new Set(created)).forEach((value) => value.delete?.());
  }
}
