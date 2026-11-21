/*
 * A breakaway base for a slender pin printed standing (a mail from Michael Celotto, 08.11.2026): the fit test's pin and
 * the Split tool's loose dowels are 5 mm thin and 10 mm and more tall, and on a printer whose bed moves back and forth
 * under them they wobble loose or come out wavy at the foot, a brim or not. The base is a flat plate that holds on to the
 * bed, with a round socket round the pin's foot: the pin does not touch its walls, it stands on a small square nub in the
 * socket's floor, and the socket's rim keeps it from swaying. Bent to and fro once printed, the pin snaps off the nub.
 *
 * The measures are those of the base Michael tried on his Elegoo Neptune 3 Pro at 0.2 mm layers: a 10.2 mm plate
 * 1.3 mm thick, a socket 0.35 mm wider than the pin per side above a 0.2 mm floor, the pin raised 0.5 mm, and a nub
 * half the pin's diameter. The nub reaches a little into the floor and into the pin, so all of it is one body.
 *
 * Only the measures are worked out here; the fit test builds its base from the editor's shapes (fitTest.ts), the Split
 * tool from Manifold in the worker (manifoldSplit.ts).
 */

export const BREAKAWAY_BASE = {
  /** The plate's thickness, in mm. */
  height: 1.3,
  /** The socket's floor under the pin, in mm: one or two first layers. */
  floor: 0.2,
  /** How high the pin's foot stands above the bed, in mm: the nub's height above the floor and the floor. */
  lift: 0.5,
  /** The air between the pin and the socket's wall, per side, in mm. */
  play: 0.35,
  /** The plate beyond the socket, per side, in mm. */
  wall: 2.25,
  /** How far the nub reaches into the floor below it and the pin above it, in mm, so they join into one body. */
  overlap: 0.1,
} as const;

/**
 * How high above a body's lowest point its breakaway base is made the way it is on purpose, in mm (#1633): the pin's foot
 * hangs over the socket at the lift, held by the nub, and the socket's floor below it is one layer thick. The print check
 * neither calls that foot an overhang nor that floor a thin wall. A little over the lift, for the mesh's rounding.
 */
export const BREAKAWAY_FOOT_MM = BREAKAWAY_BASE.lift + 0.05;

/** Whether a body stands on a breakaway base (the fit test's pin, the Split tool's loose dowels). */
export function standsOnBreakawayBase(shape: { breakawayBase?: boolean }) {
  return shape.breakawayBase === true;
}

/** The nub's side is half the pin's diameter, within these, in mm. */
const MIN_NUB = 0.8;
const MAX_NUB = 3;
/** How much of the flat end a chamfered pin keeps the nub's corners inside of. */
const FLAT_END_SHARE = 0.9;

/** The socket's diameter round a pin of this diameter, in mm. */
export function breakawaySocketDiameter(pinDiameter: number) {
  return pinDiameter + 2 * BREAKAWAY_BASE.play;
}

/** The plate's side under one pin of this diameter, in mm: the socket and the wall either side. */
export function breakawayPlateSize(pinDiameter: number) {
  return breakawaySocketDiameter(pinDiameter) + 2 * BREAKAWAY_BASE.wall;
}

/**
 * The nub's side under a pin of this diameter whose foot is chamfered by `endChamfer`, in mm: half the diameter, but
 * with its corners inside the flat end the chamfer leaves, so the pin rests on it with its whole end.
 */
export function breakawayNubSize(pinDiameter: number, endChamfer = 0) {
  const flatEnd = pinDiameter - 2 * endChamfer;
  const size = Math.min(pinDiameter / 2, (flatEnd * FLAT_END_SHARE) / Math.SQRT2);
  return Math.min(MAX_NUB, Math.max(MIN_NUB, size));
}

const FIT_TEST_BASE_STORAGE_KEY = "layerling.fitTestPinBase";

/** Whether the fit test's pin is to stand on a breakaway base, as last chosen in the settings in this browser; off at first. */
export function fitTestPinBaseChosen() {
  try {
    return window.localStorage.getItem(FIT_TEST_BASE_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function chooseFitTestPinBase(on: boolean) {
  try {
    window.localStorage.setItem(FIT_TEST_BASE_STORAGE_KEY, on ? "on" : "off");
  } catch {
    // A browser that keeps nothing makes the fit test without a base next time; the choice still holds for this one.
  }
}

/** Where the nub runs, from the bed up, in mm: into the floor at its foot and into the pin at its top. */
export function breakawayNubSpan() {
  const { floor, lift, overlap } = BREAKAWAY_BASE;
  return { bottom: floor - overlap, top: lift + overlap };
}
