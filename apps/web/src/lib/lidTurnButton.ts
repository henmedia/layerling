/**
 * A turn button for a lid (`latchStyle` "turn"), as on a cupboard door or a window: a small bar on a pin standing up
 * from a ledge on the box's wall just below the rim. Turned a quarter turn, its inner end lies over the lid's edge and
 * holds the lid down; turned back along the wall, the lid is free. Nothing bends, so nothing wears.
 *
 * The bar prints in place on its pin, lying along the wall (open), `TURN_BUTTON_PLAY` over the ledge's top, which is level
 * with the lid's top, so the bar passes just over the lid. Its hole is that much wider than the pin and widens at 45
 * degrees at the top into a countersink, round which the pin's head widens at 45 degrees too, the same play off it: the
 * head keeps the bar on and prints without support, as does the bar on the ledge. A small bump on the ledge sits in one
 * of four grooves under the bar, a quarter turn apart, and keeps it from turning by itself: between them the bar rides
 * over the bump, a little more than its play lets it.
 *
 * In the frame used here o is out from the wall's face and z up from the lid's top, as it lies closed on the rim.
 */

export const DEFAULT_LID_TURN_LENGTH = 24;
export const MIN_LID_TURN_LENGTH = 20;
export const MAX_LID_TURN_LENGTH = 40;
/** The play round the pin, under the bar and off the head, mm. */
export const TURN_BUTTON_PLAY = 0.3;
/** How far the ledge and the bar keep off the lid's edge, mm. */
const EDGE_GAP = 0.4;
const THICKNESS = 3;
const PIN = 2;
/** How deep the countersink at the top of the bar's hole is, mm. */
const COUNTERSINK = 1.2;
/** How far the head stands over the bar, mm. */
const HEAD_OVER = 0.6;
/** The detent bump: its length along the radius, its width and height, mm. */
const BUMP_LENGTH = 1;
const BUMP_WIDTH = 1.4;
/** How much higher the bump is than the bar can lift freely (its play under it and at the head), mm. */
const BUMP_GRIP = 0.13;
/** How thick the ledge is under its top before it falls back to the wall at 45 degrees, mm. */
const LEDGE = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export type LidTurnButtonMeasures = {
  /** The bar's length from end to end (its ends are round) and its width. */
  length: number;
  width: number;
  thickness: number;
  play: number;
  /** The pin's radius and the bar's hole's. */
  pin: number;
  hole: number;
  /** How far the pin's middle is out from the wall, and how far the bar reaches over the lid when turned. */
  out: number;
  overlap: number;
  /** The ledge's far edge out from the wall. */
  ledgeOut: number;
  edgeGap: number;
  /** The bar's underside and top, above the lid's top. */
  barBottom: number;
  barTop: number;
  /** Where the head starts, its radius growing at 45 degrees from the pin's, and its top. */
  headStart: number;
  headTop: number;
  countersink: number;
  /** The detent: the bump's distance from the pin, its size, and how high it stands on the ledge. */
  detent: number;
  bumpLength: number;
  bumpWidth: number;
  bumpHeight: number;
  /** How wide one button is along the wall. */
  span: number;
};

/** The turn button's measures from the bar's length (held within its limits). */
export function lidTurnButtonMeasures(length: number): LidTurnButtonMeasures {
  const l = clamp(Number.isFinite(length) ? length : DEFAULT_LID_TURN_LENGTH, MIN_LID_TURN_LENGTH, MAX_LID_TURN_LENGTH);
  const g = TURN_BUTTON_PLAY;
  const width = clamp(0.45 * l, 10, 14);
  const hole = PIN + g;
  const out = width / 2 + EDGE_GAP;
  const barBottom = g;
  const barTop = barBottom + THICKNESS;
  // The head's 45 degree face the play (square to it) inside the countersink's.
  const sink = barTop - COUNTERSINK;
  const headStart = sink + g * Math.SQRT2 - (hole - PIN);
  // The bar can lift by its play under it and at the head; the bump stands a little higher than that into it.
  const bumpHeight = g + g * Math.SQRT2 + BUMP_GRIP;
  const ledgeOut = width + EDGE_GAP;
  return {
    length: l, width, thickness: THICKNESS, play: g, pin: PIN, hole, out, overlap: l / 2 - out, ledgeOut,
    edgeGap: EDGE_GAP, barBottom, barTop, headStart, headTop: barTop + HEAD_OVER,
    countersink: COUNTERSINK, detent: hole + 0.6 + BUMP_LENGTH / 2, bumpLength: BUMP_LENGTH, bumpWidth: BUMP_WIDTH, bumpHeight,
    span: l + 2,
  };
}

/**
 * The ledge's side view in (o, z), `rim` (the lid's thickness) below the lid's top being the box's rim: from the wall below
 * the rim out under the bar and up, clear of the lid's edge, to the lid's top; under it, as thick as the lid and 1 mm
 * more (2 mm at least), it falls back to the wall at 45 degrees. `lowest` is its lowest point.
 */
export function lidTurnButtonLedge(measures: LidTurnButtonMeasures, rim: number) {
  const embed = 0.4;
  const depth = Math.max(LEDGE, rim + 1);
  const lowest = -depth - (measures.ledgeOut + embed);
  const points: Array<[number, number]> = [
    [-embed, lowest], [measures.ledgeOut, -depth], [measures.ledgeOut, 0], [measures.edgeGap, 0], [measures.edgeGap, -rim], [-embed, -rim],
  ];
  return { points, lowest };
}
