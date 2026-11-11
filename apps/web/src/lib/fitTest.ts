import { BREAKAWAY_BASE, breakawayNubSize, breakawayNubSpan, breakawayPlateSize, breakawaySocketDiameter } from "@/lib/breakawayBase";
import { buildGroupedShapeFromSelection, groupedShape } from "@/lib/editorBooleans";
import { numberLocale, t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { textLetterSizePatch } from "@/lib/nameTag";
import { FIT_TEST_CLEARANCES } from "@/lib/printerPlay";
import { makeShapeFromAsset, shapeAssetColor, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { loadTextFonts } from "@/lib/textFonts";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { ShapeKind, WorkplaneShape } from "@/types/layerling";

/*
 * The fit test (Passprobe): a piece printed once to measure the printer's play (printerPlay.ts). A flat plate with a
 * row of round holes, each drawn for the same 5 mm pin with a little more play per side than the one before, the play
 * raised beside each hole; and the pin itself, printed with it. Pushed into one hole after the other, the snuggest
 * hole the pin still turns in names the play: that number goes into the settings.
 *
 * It is made of the editor's own shapes, so it prints with the rest and stays editable: the plate is a group of a box,
 * the holes (cylinders made holes, through the plate and a little past it) and the numbers (text, raised on top), cut
 * and joined as any group is; the pin a group of a cylinder and a cone that chamfers its top end. Both lie in a bundle,
 * two bodies moved as one, side by side on the plate.
 *
 * Everything prints without supports: the holes and the pin stand upright, so both are round in the layers, as the
 * fit between them is. The pin's chamfer is the end that goes into a hole first; its other end, on the plate, may have
 * spread a little in the first layer. On a printer whose bed moves, the pin can stand on a breakaway base instead
 * (breakawayBase.ts), a plate it snaps off once printed; it is then one body with the base.
 */

export const FIT_TEST_PIN_DIAMETER = 5;
/** The plate, in mm: wide enough for the seven holes 8 mm apart and the numbers, as thick as a usual wall is long. */
export const FIT_TEST_PLATE = { width: 60, depth: 20, height: 4 } as const;
/** From one hole's middle to the next, in mm. */
export const FIT_TEST_HOLE_PITCH = 8;
/** The numbers' capital height and how far they stand out of the plate, in mm: about the smallest a 0.4 mm nozzle prints legibly. */
export const FIT_TEST_LABEL_SIZE = 3.5;
export const FIT_TEST_LABEL_HEIGHT = 0.6;
/** The pin's length, standing, and the chamfer on its top end, in mm. */
export const FIT_TEST_PIN_LENGTH = 15;
export const FIT_TEST_PIN_CHAMFER = 0.5;
/** How far the pin stands from the plate's right end, in mm. */
const PIN_SPACING = 5;
/** How far the numbers stay from the widest hole's edge, in mm. */
const LABEL_GAP = 1;
/** How far a hole reaches past the plate above and below, so the cut leaves no skin. */
const HOLE_OVERSHOOT = 0.5;
/** The sides of the holes and the pin: so many that a flat lies within a thousandth of a millimetre of the circle. */
const ROUND_SIDES = 128;
const LABEL_FONT = "Sans";

export type FitTestHole = {
  /** The play per side this hole is drawn with, in mm. */
  clearance: number;
  /** The hole's diameter: the pin's and twice the play. */
  diameter: number;
  /** Its middle along the plate, from the plate's middle, in mm. */
  x: number;
  /** The number raised beside it, with the reader's decimal separator. */
  label: string;
  /** Whether the number stands in front of the hole (towards +z) or behind it: they take turns, so each has room. */
  front: boolean;
};

/** A play as the fit test writes it: two decimals, the decimal separator of `locale`, Latin digits. */
export function fitTestLabel(clearance: number, locale = numberLocale()) {
  return new Intl.NumberFormat(`${locale}-u-nu-latn`, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(clearance);
}

/** The holes of the fit test, left to right from the tightest: where each lies, how large it is and what it says. */
export function fitTestHoles(locale = numberLocale()): FitTestHole[] {
  const middle = (FIT_TEST_CLEARANCES.length - 1) / 2;
  return FIT_TEST_CLEARANCES.map((clearance, index) => ({
    clearance,
    diameter: Number((FIT_TEST_PIN_DIAMETER + 2 * clearance).toFixed(6)),
    x: (index - middle) * FIT_TEST_HOLE_PITCH,
    label: fitTestLabel(clearance, locale),
    front: index % 2 === 0,
  }));
}

function asset(kind: ShapeKind) {
  const found = toolbarShapeAssets.find((entry) => entry.kind === kind && entry.id === kind) ?? toolbarShapeAssets.find((entry) => entry.kind === kind);
  if (!found) throw new Error(`no ${kind} in the shape library`);
  return found;
}

/** How the fit test is made: `base` stands the pin on a breakaway base (breakawayBase.ts), for a printer whose bed moves. */
export type FitTestOptions = { base?: boolean };

/**
 * The pin's breakaway base, its middle under the pin at `pinX`: the plate and the socket cut into it (a hole), and the
 * nub the pin stands on, reaching into the socket's floor and into the pin.
 */
function fitTestPinBase(pinX: number, color: string) {
  const { height, floor } = BREAKAWAY_BASE;
  const plateSize = breakawayPlateSize(FIT_TEST_PIN_DIAMETER);
  const socketSize = breakawaySocketDiameter(FIT_TEST_PIN_DIAMETER);
  const plate = { ...makeShapeFromAsset(asset("box"), { x: pinX, z: 0 }, { width: plateSize, depth: plateSize, height }), name: t("fitTest.pinBase"), color };
  const socket = {
    ...makeShapeFromAsset(asset("cylinder"), { x: pinX, z: 0, elevation: floor }, { width: socketSize, depth: socketSize, height: height - floor + HOLE_OVERSHOOT, sides: ROUND_SIDES }),
    name: t("fitTest.pinBase"),
    hole: true,
    color,
  };
  const nubSize = breakawayNubSize(FIT_TEST_PIN_DIAMETER);
  const span = breakawayNubSpan();
  const nub = { ...makeShapeFromAsset(asset("box"), { x: pinX, z: 0, elevation: span.bottom }, { width: nubSize, depth: nubSize, height: span.top - span.bottom }), name: t("fitTest.pinBase"), color };
  return { plate, socket, nub };
}

/**
 * The shapes the fit test is made of, before they are cut and joined, the plate's middle at the origin on the plate:
 * the box, the holes, the numbers, and the pin's cylinder and chamfer - with `base`, the pin raised onto its breakaway
 * base, whose parts come along as `pinBase`. The text typefaces must be loaded.
 */
export function fitTestParts(locale = numberLocale(), options: FitTestOptions = {}) {
  const color = shapeAssetColor(asset("box"));
  const { width, depth, height } = FIT_TEST_PLATE;
  const plate = { ...makeShapeFromAsset(asset("box"), { x: 0, z: 0 }, { width, depth, height }), name: t("fitTest.plate"), color };
  const holes = fitTestHoles(locale);
  const widest = Math.max(...holes.map((hole) => hole.diameter)) / 2;
  const holeShapes = holes.map((hole) => ({
    ...makeShapeFromAsset(asset("cylinder"), { x: hole.x, z: 0, elevation: -HOLE_OVERSHOOT }, {
      width: hole.diameter,
      depth: hole.diameter,
      height: height + 2 * HOLE_OVERSHOOT,
      sides: ROUND_SIDES,
    }),
    name: `Ø ${fitTestLabel(hole.diameter, locale)}`,
    hole: true,
    color,
  }));
  const labels = holes.map((hole) => {
    const words = { ...makeShapeFromAsset(asset("text"), { x: hole.x, z: 0, elevation: height }, { text: hole.label, font: LABEL_FONT, height: FIT_TEST_LABEL_HEIGHT }), name: hole.label, color };
    const sized = { ...words, ...textLetterSizePatch(words, FIT_TEST_LABEL_SIZE) };
    const along = widest + LABEL_GAP + sized.depth / 2;
    return canonicalizeShape({ ...sized, z: hole.front ? along : -along });
  });
  const pinX = width / 2 + PIN_SPACING + FIT_TEST_PIN_DIAMETER / 2;
  const lift = options.base ? BREAKAWAY_BASE.lift : 0;
  const pin = {
    ...makeShapeFromAsset(asset("cylinder"), { x: pinX, z: 0, elevation: lift }, {
      width: FIT_TEST_PIN_DIAMETER,
      depth: FIT_TEST_PIN_DIAMETER,
      height: FIT_TEST_PIN_LENGTH - FIT_TEST_PIN_CHAMFER,
      sides: ROUND_SIDES,
    }),
    name: t("fitTest.pin"),
    color,
  };
  const chamfer = {
    ...makeShapeFromAsset(asset("cone"), { x: pinX, z: 0, elevation: lift + FIT_TEST_PIN_LENGTH - FIT_TEST_PIN_CHAMFER }, {
      width: FIT_TEST_PIN_DIAMETER,
      depth: FIT_TEST_PIN_DIAMETER,
      height: FIT_TEST_PIN_CHAMFER,
      baseRadius: FIT_TEST_PIN_DIAMETER / 2,
      topRadius: FIT_TEST_PIN_DIAMETER / 2 - FIT_TEST_PIN_CHAMFER,
      sides: ROUND_SIDES,
    }),
    name: t("fitTest.pinChamfer"),
    color,
  };
  return { plate, holes: holeShapes, labels, pin, chamfer, pinBase: options.base ? fitTestPinBase(pinX, color) : null };
}

/**
 * The fit test as one new shape: a bundle of the plate, its holes cut and its numbers joined, and the pin with its
 * chamfer, standing on the plate with the plate's middle at the origin. Placed and named by the caller's language.
 */
export async function fitTestShape(triangleLimit: number, locale = numberLocale(), options: FitTestOptions = {}): Promise<WorkplaneShape> {
  await loadTextFonts();
  const parts = fitTestParts(locale, options);
  const plate = await buildGroupedShapeFromSelection([parts.plate, ...parts.holes, ...parts.labels], triangleLimit);
  if (!plate.group) throw new Error(plate.failureNotice || t("fitTest.failed"));
  // With a base, its plate and socket are cut first, so the socket leaves the nub and the pin standing in it whole.
  const base = parts.pinBase ? await buildGroupedShapeFromSelection([parts.pinBase.plate, parts.pinBase.socket], triangleLimit) : null;
  if (base && !base.group) throw new Error(base.failureNotice || t("fitTest.failed"));
  const pinParts = base?.group && parts.pinBase
    ? [canonicalizeShape({ ...base.group, color: parts.pin.color, groupOperation: "group" }), parts.pinBase.nub, parts.pin, parts.chamfer]
    : [parts.pin, parts.chamfer];
  const pin = await buildGroupedShapeFromSelection(pinParts, triangleLimit);
  if (!pin.group) throw new Error(pin.failureNotice || t("fitTest.failed"));
  const bundle = groupedShape([
    canonicalizeShape({ ...plate.group, id: createLocalId("fit-test-plate"), name: t("fitTest.plate"), color: parts.plate.color, groupOperation: "group" }),
    canonicalizeShape({ ...pin.group, id: createLocalId("fit-test-pin"), name: t("fitTest.pin"), color: parts.pin.color, groupOperation: "group", ...(base ? { breakawayBase: true } : {}) }),
  ]);
  if (!bundle) throw new Error(t("fitTest.failed"));
  return canonicalizeShape({ ...bundle, id: createLocalId("fit-test"), name: t("fitTest.name"), color: parts.plate.color, groupOperation: "bundle", elevation: 0 });
}

/** A footprint on the plate, seen from above, in mm. */
export type FitTestArea = { minX: number; maxX: number; minZ: number; maxZ: number };

/**
 * Where the fit test's middle goes so it does not land in what is already on the plate: at `origin` (the plate's
 * middle) when that is free, otherwise in front of everything it would meet, `gap` mm clear of the frontmost of it.
 * Only bodies across the fit test's width count; one step is enough, as the new place is in front of all of them.
 */
export function fitTestSpot(size: { width: number; depth: number }, origin: { x: number; z: number }, taken: readonly FitTestArea[], gap = 10) {
  const across = taken.filter((area) => area.maxX > origin.x - size.width / 2 && area.minX < origin.x + size.width / 2);
  const meets = across.some((area) => area.maxZ > origin.z - size.depth / 2 && area.minZ < origin.z + size.depth / 2);
  if (!meets) return { x: origin.x, z: origin.z };
  const front = Math.max(...across.map((area) => area.maxZ));
  return { x: origin.x, z: front + gap + size.depth / 2 };
}
