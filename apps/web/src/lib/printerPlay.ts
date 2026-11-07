import type { ShapeCustomization, ShapeKind } from "@/types/layerling";

/*
 * The printer's play (Spiel deines Druckers): how much room per side a printed pin needs to turn in a printed hole on
 * this printer, measured once with the fit test (fitTest.ts). Every printer makes holes a little smaller and pins a
 * little thicker than drawn, each by its own amount, so the clearances of the tools all start from a guess; once the
 * play is measured, the settings below start from it instead of the built-in value.
 *
 * It belongs to the printer the person prints on, not to a design: it is kept in this browser, like the clearance
 * check's minimum gap and the 3D mouse, and never travels with a design file. Only new uses start from it - a shape
 * made new, a tool window opened anew. A body already in a design keeps the value it was made with, and so does a
 * design opened from a file: nothing changes by itself when the play is set, changed or cleared.
 *
 * One play per printer (Discussion #1406): with several printers, each tuned differently, the play the settings show
 * and the tools start from is the one kept for the printer chosen under Printer in the design's settings. A printer
 * with no play of its own, and a design with no printer chosen, use the play kept without a printer - the one there
 * was before, so a play measured earlier still holds everywhere until a printer gets its own.
 *
 * Empty (null) means not measured: everything then starts from its built-in value, as before.
 */

/** The play per side each hole of the fit test is drawn with, in mm: the hole is the pin's 5 mm plus twice this. */
export const FIT_TEST_CLEARANCES = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4] as const;

/** The play a person can type, per side in mm. A printer that needs more than a millimetre is not one to tune this way. */
export const MIN_PRINTER_PLAY = 0;
export const MAX_PRINTER_PLAY = 1;

/** The play kept without a printer (and the only one before plays per printer). */
export const PRINTER_PLAY_STORAGE_KEY = "layerling.printerPlay";
/** The plays kept per printer: a JSON object from the printer's id (printerPresets) to its play. */
export const PRINTER_PLAYS_STORAGE_KEY = "layerling.printerPlays";

/**
 * The play as typed, stored or sent by an AI, or null when there is none: empty, not a number, below 0. Above
 * MAX_PRINTER_PLAY it is held there; a comma counts as the decimal point, as in the fields. Kept to a thousandth of a
 * millimetre, so 0.1 + 0.05 is 0.15 and not 0.15000000000000002.
 */
export function normalizePrinterPlay(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = typeof value === "string" ? value.trim().replace(",", ".") : value;
  if (text === "") return null;
  const number = Number(text);
  if (!Number.isFinite(number) || number < MIN_PRINTER_PLAY) return null;
  return roundPlay(Math.min(MAX_PRINTER_PLAY, number));
}

function roundPlay(value: number) {
  return Math.round(value * 1000) / 1000;
}

/*
 * Every clearance and play setting there is, and whether it starts from the printer's play. One list, so that what
 * follows the fit test and what does not is decided here and nowhere else. `takes` says how:
 * - "perSide": the setting is room on each side of a part, as the play is, and takes it as it is;
 * - "total": the setting is the room across a whole diameter, both sides together, and takes twice the play;
 * - null: it keeps its own starting value, for the reason given beside it.
 * The play is what a pin printed apart needs to turn in a hole printed apart. What is a fit of that kind takes it; a
 * press fit, a print in place and room for a bought part do not.
 */
export type PrinterPlaySettingId =
  | "lid.gap"
  | "lid.hingePinPlay"
  | "lid.hingeGap"
  | "lid.magnetGap"
  | "dovetail.clearance"
  | "snapFit.clearance"
  | "thread.clearance"
  | "thread.boltClearance"
  | "thread.axialClearance"
  | "clearance.threshold"
  | "hinge.clearance"
  | "flexi.clearance"
  | "gear.backlash"
  | "gridfinity.swallowtailClearance"
  | "port.clearance"
  | "sbcBoard.clearance"
  | "cutOut.clearance"
  | "punch.clearance"
  | "vase.fitClearance"
  | "vase.lidClearance"
  | "split.connectorClearance";

/** Where a shape keeps the setting (`key`) and what the inspector calls its row (`property`). */
type PrinterPlayShapeField = { kind: ShapeKind; key: keyof ShapeCustomization; property: string };

export type PrinterPlaySetting = {
  id: PrinterPlaySettingId;
  takes: "perSide" | "total" | null;
  shape?: PrinterPlayShapeField;
};

export const PRINTER_PLAY_SETTINGS: readonly PrinterPlaySetting[] = [
  // The lid's lip in the opening, or its rim over the wall: two parts printed apart that slide together, room per side.
  // A screw lid's thread takes it too, in the radius, as a nut's room is (twice the play across the diameter).
  { id: "lid.gap", takes: "perSide" },
  // The lid hinge's pin in the lid's holes, per side: exactly the pin in a hole the fit test measures.
  { id: "lid.hingePinPlay", takes: "perSide" },
  // Room for the swing: between the knuckles along the axis, behind the back wall and below the plate as the lid turns,
  // where a sagging layer or the first layer's spread closes it. Not a pin in a hole; it keeps its 0.3.
  { id: "lid.hingeGap", takes: null },
  // Room for a bought magnet: a little to press it in, more to glue it. A press fit, not a printed pair.
  { id: "lid.magnetGap", takes: null },
  // The tail's copy made a hole grows by the clearance on every side: a printed tail that slides into a printed socket.
  { id: "dovetail.clearance", takes: "perSide", shape: { kind: "dovetail", key: "dovetailClearance", property: "dovetailClearance" } },
  // The gap above the barb and beside the arm, between the hook on a lid and the catch on a box, printed apart.
  { id: "snapFit.clearance", takes: "perSide", shape: { kind: "snapFit", key: "snapFitClearance", property: "snapFitClearance" } },
  // A nut's or tapped hole's room across the whole diameter, both sides together: twice the play (0.2 gives the 0.4 a
  // new nut has always started with).
  { id: "thread.clearance", takes: "total", shape: { kind: "thread", key: "threadClearance", property: "clearance" } },
  // The bolt's own room stays 0: the pair gets its room once, on the nut or the tapped hole, not twice.
  { id: "thread.boltClearance", takes: null },
  // Play along the axis comes on top of the room in the diameter and starts at 0, so a thread keeps its standard flanks.
  { id: "thread.axialClearance", takes: null },
  // Check clearance's minimum gap, the room between two faces: a gap below what the printer needs is too tight on it.
  { id: "clearance.threshold", takes: "perSide" },
  // Printed in place, in one piece: besides the printer's play, the gap must stay open across layers, below the pin and
  // under the other leaf's knuckles, where a gap thinner than a layer closes. A pin printed apart says nothing about
  // that; the hinge keeps its 0.4.
  { id: "hinge.clearance", takes: null },
  // The flexi tool's joints are printed in place too, for the same reason: they keep their 0.4.
  { id: "flexi.clearance", takes: null },
  // The play of two meshing gears, along the pitch circle and half taken off each: not a pin in a hole.
  { id: "gear.backlash", takes: null },
  // The Gridfinity keys click in under a lip and hold the plates together: a press fit.
  { id: "gridfinity.swallowtailClearance", takes: null },
  // Extra room for a bought socket or plug, on top of the room the socket's size already has; it starts at 0.
  { id: "port.clearance", takes: null },
  // Room round a bought board's connectors, so they cut their openings through a case wall; it starts at 0.
  { id: "sbcBoard.clearance", takes: null },
  // Cut out and Punch start at 0, an exact cut, for a press fit and for a loose one alike: the room is the person's.
  { id: "cutOut.clearance", takes: null },
  { id: "punch.clearance", takes: null },
  // A vase's one clearance serves pegs that must hold its legs and inserts and a saucer that must come out again.
  { id: "vase.fitClearance", takes: null },
  // A vase's lid serves a lip and a screw thread with one value, wider than a plain fit (0.35), for a lip round a whole rim.
  { id: "vase.lidClearance", takes: null },
  // Split's dowels and plugs (Discussion #832): a pin or peg printed apart from the hole it goes into, room per side.
  { id: "split.connectorClearance", takes: "perSide" },
];

function settingOf(id: PrinterPlaySettingId) {
  return PRINTER_PLAY_SETTINGS.find((setting) => setting.id === id);
}

/**
 * What a setting starts from with this play: the play itself, twice it for a setting across a diameter, or null when
 * there is no play or the setting keeps its own start. The tool holds the value within its own field's range.
 */
export function printerPlayStart(id: PrinterPlaySettingId, play: number | null): number | null {
  const setting = settingOf(id);
  if (!setting?.takes || play === null) return null;
  return roundPlay(setting.takes === "total" ? 2 * play : play);
}

/** The shape settings that follow the play, as a shape of this kind made new gets them; empty without a play. */
export function printerPlayShapeStart(kind: ShapeKind, play: number | null): ShapeCustomization {
  const start: Record<string, number> = {};
  for (const setting of PRINTER_PLAY_SETTINGS) {
    if (setting.shape?.kind !== kind) continue;
    const value = printerPlayStart(setting.id, play);
    if (value !== null) start[setting.shape.key] = value;
  }
  return start as ShapeCustomization;
}

/**
 * What a new shape of this kind is made from: the defaults saved for the kind in the settings ("Save as default"),
 * and where they say nothing, the printer's play. A value saved by hand wins: it was chosen for this kind.
 */
export function withPrinterPlay(kind: ShapeKind, saved: ShapeCustomization | undefined, play: number | null): ShapeCustomization | undefined {
  const start = printerPlayShapeStart(kind, play);
  if (Object.keys(start).length === 0) return saved;
  const given = Object.fromEntries(Object.entries(saved ?? {}).filter(([, value]) => value !== undefined));
  return { ...start, ...given } as ShapeCustomization;
}

/**
 * Whether a field still shows the value it got from the fit test, for the small "from your fit test" beside it: there is
 * a play, the setting follows it, and the value is what the play gives (to a thousandth of a millimetre).
 */
export function fromPrinterPlay(id: PrinterPlaySettingId, value: number, play: number | null): boolean {
  const start = printerPlayStart(id, play);
  return start !== null && Number.isFinite(value) && Math.abs(value - start) < 5e-4;
}

/** The inspector rows of a shape of this kind that follow the play, by their property id. */
export function printerPlayShapeRows(kind: ShapeKind): ReadonlyArray<{ id: PrinterPlaySettingId; property: string }> {
  return PRINTER_PLAY_SETTINGS.flatMap((setting) => (setting.takes && setting.shape?.kind === kind ? [{ id: setting.id, property: setting.shape.property }] : []));
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The play kept without a printer in this storage, or null when there is none or the storage cannot be read. */
export function readPrinterPlay(storage: Storage | null = browserStorage()): number | null {
  if (!storage) return null;
  try {
    return normalizePrinterPlay(storage.getItem(PRINTER_PLAY_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Keeps the play without a printer in this storage, or takes it away for null. False where the storage refuses it. */
export function savePrinterPlay(play: number | null, storage: Storage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    if (play === null) storage.removeItem(PRINTER_PLAY_STORAGE_KEY);
    else storage.setItem(PRINTER_PLAY_STORAGE_KEY, String(play));
    return true;
  } catch {
    return false;
  }
}

/** The plays per printer as stored: every entry with a printer id and a play that holds; anything else is left out. */
export function normalizePrinterPlays(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const plays: Record<string, number> = {};
  for (const [printer, play] of Object.entries(value as Record<string, unknown>)) {
    const kept = printer.trim() ? normalizePrinterPlay(play) : null;
    if (kept !== null) plays[printer] = kept;
  }
  return plays;
}

/** The plays per printer kept in this storage; empty when there are none or the storage cannot be read. */
export function readPrinterPlays(storage: Storage | null = browserStorage()): Record<string, number> {
  if (!storage) return {};
  try {
    return normalizePrinterPlays(JSON.parse(storage.getItem(PRINTER_PLAYS_STORAGE_KEY) ?? "null"));
  } catch {
    return {};
  }
}

/** Keeps the plays per printer in this storage (none: the entry goes). False where the storage refuses it. */
export function savePrinterPlays(plays: Record<string, number>, storage: Storage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    if (Object.keys(plays).length === 0) storage.removeItem(PRINTER_PLAYS_STORAGE_KEY);
    else storage.setItem(PRINTER_PLAYS_STORAGE_KEY, JSON.stringify(plays));
    return true;
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();
// Where the browser keeps nothing (blocked storage), the plays hold until the page is closed.
let unsavedGeneral: { play: number | null } | null = null;
let unsavedPlays: Record<string, number> | null = null;
// The printer chosen in the design that is open (its settings' Printer; "" for none): what the tools start from.
let currentPrinter = "";

function generalPlay(): number | null {
  return unsavedGeneral ? unsavedGeneral.play : readPrinterPlay();
}

function printerPlays(): Record<string, number> {
  return unsavedPlays ?? readPrinterPlays();
}

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Whose play a printer gets: "printer" when it has one of its own, "general" when it uses the play kept without a
 * printer (it has none of its own, or no printer is chosen), null when neither is measured.
 */
export function printerPlaySource(printer: string): "printer" | "general" | null {
  if (printer && printerPlays()[printer] !== undefined) return "printer";
  return generalPlay() === null ? null : "general";
}

/** The play for this printer ("" for none): its own, else the play kept without a printer, else null. */
export function getPrinterPlayFor(printer: string): number | null {
  const own = printer ? printerPlays()[printer] : undefined;
  return own !== undefined ? own : generalPlay();
}

/**
 * Sets the play for this printer ("" for the play without a printer), keeps it in this browser and tells the windows
 * that show it. Clearing (null) takes away what the field showed: a printer's own play, so the printer falls back to
 * the play without a printer, or where it had none, that play itself. Returns what the printer now has.
 */
export function setPrinterPlayFor(printer: string, value: unknown): number | null {
  const play = normalizePrinterPlay(value);
  const plays = { ...printerPlays() };
  if (printer && (play !== null || plays[printer] !== undefined)) {
    if (play === null) delete plays[printer];
    else plays[printer] = play;
    unsavedPlays = savePrinterPlays(plays) ? null : plays;
  } else {
    unsavedGeneral = savePrinterPlay(play) ? null : { play };
  }
  notify();
  return getPrinterPlayFor(printer);
}

/** The printer the open design prints on (its settings' Printer, "" for none): the tools start from its play. */
export function setPrinterPlayPrinter(printer: string | undefined | null) {
  const next = printer ?? "";
  if (next === currentPrinter) return;
  currentPrinter = next;
  notify();
}

/** The printer the tools start from now ("" for none). */
export function printerPlayPrinter(): string {
  return currentPrinter;
}

/** The play as it is now for the open design's printer: what new shapes and tools start from. */
export function getPrinterPlay(): number | null {
  return getPrinterPlayFor(currentPrinter);
}

/** Sets the play for the open design's printer (null: not measured). Returns what it now has. */
export function setPrinterPlay(value: unknown): number | null {
  return setPrinterPlayFor(currentPrinter, value);
}

/** Calls `listener` when a play or the printer changes here, or a play in another tab of this browser. */
export function subscribeToPrinterPlay(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === PRINTER_PLAY_STORAGE_KEY || event.key === PRINTER_PLAYS_STORAGE_KEY || event.key === null) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
