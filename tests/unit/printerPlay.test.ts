import { afterEach, describe, expect, it, vi } from "vitest";
import { CLEARANCE_DEFAULT_THRESHOLD_MM, clearanceStartThreshold, readClearanceSettings, writeClearanceSettings } from "@/lib/clearanceCheck";
import { DEFAULT_DOVETAIL_CLEARANCE, normalizeDovetailClearance } from "@/lib/dovetailGeometry";
import { DEFAULT_HINGE_CLEARANCE } from "@/lib/hingeGeometry";
import { LID_DEFAULTS, lidDefaults, MIN_HINGE_PIN_PLAY, normalizeLidOptions } from "@/lib/lidTool";
import {
  FIT_TEST_CLEARANCES,
  fromPrinterPlay,
  getPrinterPlay,
  getPrinterPlayFor,
  normalizePrinterPlay,
  normalizePrinterPlays,
  PRINTER_PLAY_SETTINGS,
  PRINTER_PLAY_STORAGE_KEY,
  PRINTER_PLAYS_STORAGE_KEY,
  printerPlayPrinter,
  printerPlayShapeRows,
  printerPlayShapeStart,
  printerPlaySource,
  printerPlayStart,
  readPrinterPlay,
  readPrinterPlays,
  savePrinterPlay,
  savePrinterPlays,
  setPrinterPlay,
  setPrinterPlayFor,
  setPrinterPlayPrinter,
  subscribeToPrinterPlay,
  withPrinterPlay,
} from "@/lib/printerPlay";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { MAX_CONNECTOR_CLEARANCE, normalizeSplitConnectorOptions, SPLIT_CONNECTOR_DEFAULTS, splitConnectorDefaults } from "@/lib/splitConnectors";
import { shapeDefaultsFromShape } from "@/lib/shapeDefaults";
import { DEFAULT_SNAP_FIT_CLEARANCE } from "@/lib/snapFit";
import { DEFAULT_THREAD_AXIAL_CLEARANCE, DEFAULT_THREAD_BOLT_CLEARANCE, DEFAULT_THREAD_CLEARANCE, MAX_THREAD_CLEARANCE } from "@/lib/threadGeometry";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { ShapeCustomization, ShapeKind, WorkplaneShape } from "@/types/layerling";

/*
 * The printer's play (printerPlay.ts): measured once with the fit test, kept in the browser, and the start of every
 * clearance that is a fit of parts printed apart - converted where the setting runs across a diameter - while press
 * fits, prints in place and what is already in a design stay as they are.
 */

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    items,
  } as unknown as Storage & { items: Map<string, string> };
}

function blockedStorage() {
  const fail = () => {
    throw new Error("blocked");
  };
  return { getItem: fail, setItem: fail, removeItem: fail } as unknown as Storage;
}

function made(kind: ShapeKind, customization?: ShapeCustomization): WorkplaneShape {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === kind)!;
  return makeShapeFromAsset(asset, undefined, customization);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the play as typed and kept", () => {
  it("takes a number or the text of one, a comma as the decimal point, to a thousandth of a millimetre", () => {
    expect(normalizePrinterPlay(0.15)).toBe(0.15);
    expect(normalizePrinterPlay(0.1 + 0.05)).toBe(0.15);
    expect(normalizePrinterPlay("0,15")).toBe(0.15);
    expect(normalizePrinterPlay(" 0.2 ")).toBe(0.2);
    expect(normalizePrinterPlay("0.1234")).toBe(0.123);
    expect(normalizePrinterPlay(0)).toBe(0);
  });

  it("holds a play over a millimetre at one and has none for empty, negative or no number at all", () => {
    expect(normalizePrinterPlay(2)).toBe(1);
    for (const nothing of [null, undefined, "", "  ", "abc", -0.1, Number.NaN, Number.POSITIVE_INFINITY, true, {}]) {
      expect(normalizePrinterPlay(nothing)).toBeNull();
    }
  });

  it("keeps it under its own key, and forgets it again", () => {
    const storage = memoryStorage();
    expect(readPrinterPlay(storage)).toBeNull();
    expect(savePrinterPlay(0.15, storage)).toBe(true);
    expect(storage.items.get(PRINTER_PLAY_STORAGE_KEY)).toBe("0.15");
    expect(readPrinterPlay(storage)).toBe(0.15);
    expect(savePrinterPlay(null, storage)).toBe(true);
    expect(storage.items.has(PRINTER_PLAY_STORAGE_KEY)).toBe(false);
    expect(readPrinterPlay(storage)).toBeNull();
  });

  it("reads a kept value that is no play as none", () => {
    const storage = memoryStorage();
    storage.setItem(PRINTER_PLAY_STORAGE_KEY, "much");
    expect(readPrinterPlay(storage)).toBeNull();
  });

  it("holds the play for the page where the browser keeps nothing, and tells the windows that show it", () => {
    vi.stubGlobal("window", { localStorage: blockedStorage(), addEventListener: () => {}, removeEventListener: () => {} });
    const seen: Array<number | null> = [];
    const stop = subscribeToPrinterPlay(() => seen.push(getPrinterPlay()));
    expect(readPrinterPlay(blockedStorage())).toBeNull();
    expect(setPrinterPlay("0,25")).toBe(0.25);
    expect(getPrinterPlay()).toBe(0.25);
    expect(setPrinterPlay("")).toBeNull();
    expect(getPrinterPlay()).toBeNull();
    stop();
    setPrinterPlay(0.1);
    expect(seen).toEqual([0.25, null]);
    setPrinterPlay(null);
  });

  it("is read from the browser's storage once it can keep it", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage, addEventListener: () => {}, removeEventListener: () => {} });
    setPrinterPlay(0.2);
    expect(storage.items.get(PRINTER_PLAY_STORAGE_KEY)).toBe("0.2");
    expect(getPrinterPlay()).toBe(0.2);
    setPrinterPlay(null);
    expect(getPrinterPlay()).toBeNull();
  });
});

describe("one play per printer (Discussion #1406)", () => {
  afterEach(() => {
    setPrinterPlayPrinter("");
  });

  it("keeps a play for each printer, and a printer without one uses the play without a printer", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage, addEventListener: () => {}, removeEventListener: () => {} });
    // Measured before there were plays per printer: it stays the play everywhere.
    setPrinterPlay(0.15);
    setPrinterPlayPrinter("Bambu Lab P2S");
    expect(getPrinterPlay()).toBe(0.15);
    expect(printerPlaySource("Bambu Lab P2S")).toBe("general");
    // A play set while the P2S is chosen is the P2S's own; the play without a printer stays.
    expect(setPrinterPlay(0.05)).toBe(0.05);
    expect(JSON.parse(storage.items.get(PRINTER_PLAYS_STORAGE_KEY)!)).toEqual({ "Bambu Lab P2S": 0.05 });
    expect(storage.items.get(PRINTER_PLAY_STORAGE_KEY)).toBe("0.15");
    expect(printerPlaySource("Bambu Lab P2S")).toBe("printer");
    // Another printer, and no printer at all, still have the play without a printer.
    setPrinterPlayPrinter("Bambu Lab A1");
    expect(getPrinterPlay()).toBe(0.15);
    expect(getPrinterPlayFor("")).toBe(0.15);
    expect(getPrinterPlayFor("Bambu Lab P2S")).toBe(0.05);
    setPrinterPlay(0.1);
    setPrinterPlayPrinter("Bambu Lab P2S");
    expect(getPrinterPlay()).toBe(0.05);
    expect(readPrinterPlays(storage)).toEqual({ "Bambu Lab P2S": 0.05, "Bambu Lab A1": 0.1 });
  });

  it("clears what the field shows: a printer's own play first, then the play without a printer", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage, addEventListener: () => {}, removeEventListener: () => {} });
    setPrinterPlayFor("", 0.2);
    setPrinterPlayFor("Prusa MK4", 0.1);
    expect(setPrinterPlayFor("Prusa MK4", null)).toBe(0.2);
    expect(storage.items.has(PRINTER_PLAYS_STORAGE_KEY)).toBe(false);
    expect(printerPlaySource("Prusa MK4")).toBe("general");
    expect(setPrinterPlayFor("Prusa MK4", "")).toBeNull();
    expect(storage.items.has(PRINTER_PLAY_STORAGE_KEY)).toBe(false);
    expect(printerPlaySource("Prusa MK4")).toBeNull();
    expect(printerPlaySource("")).toBeNull();
  });

  it("tells the windows when the design's printer changes, and only then", () => {
    vi.stubGlobal("window", { localStorage: memoryStorage(), addEventListener: () => {}, removeEventListener: () => {} });
    let calls = 0;
    const stop = subscribeToPrinterPlay(() => calls++);
    setPrinterPlayPrinter("Creality Ender-3");
    setPrinterPlayPrinter("Creality Ender-3");
    expect(printerPlayPrinter()).toBe("Creality Ender-3");
    setPrinterPlayPrinter(undefined);
    expect(printerPlayPrinter()).toBe("");
    stop();
    expect(calls).toBe(2);
  });

  it("reads only the plays per printer that hold", () => {
    expect(normalizePrinterPlays({ a: 0.1, b: "x", "": 0.2, " ": 0.3, c: -1, d: "0,2", e: 5 })).toEqual({ a: 0.1, d: 0.2, e: 1 });
    for (const nothing of [null, undefined, "x", 3, [0.1]]) expect(normalizePrinterPlays(nothing)).toEqual({});
    const storage = memoryStorage();
    storage.setItem(PRINTER_PLAYS_STORAGE_KEY, "{not json");
    expect(readPrinterPlays(storage)).toEqual({});
    expect(readPrinterPlays(blockedStorage())).toEqual({});
    expect(savePrinterPlays({ a: 0.1 }, storage)).toBe(true);
    expect(readPrinterPlays(storage)).toEqual({ a: 0.1 });
    expect(savePrinterPlays({}, storage)).toBe(true);
    expect(storage.items.has(PRINTER_PLAYS_STORAGE_KEY)).toBe(false);
  });
});

describe("which settings follow the play, and how", () => {
  it("names every setting once, with how it takes the play or why not", () => {
    const ids = PRINTER_PLAY_SETTINGS.map((setting) => setting.id);
    expect(new Set(ids).size).toBe(ids.length);
    const follow = PRINTER_PLAY_SETTINGS.filter((setting) => setting.takes).map((setting) => [setting.id, setting.takes]);
    expect(follow).toEqual([
      ["lid.gap", "perSide"],
      ["lid.hingePinPlay", "perSide"],
      ["dovetail.clearance", "perSide"],
      ["snapFit.clearance", "perSide"],
      ["thread.clearance", "total"],
      ["clearance.threshold", "perSide"],
      ["split.connectorClearance", "perSide"],
    ]);
  });

  it("starts a setting per side from the play and one across a diameter from twice it", () => {
    expect(printerPlayStart("lid.gap", 0.15)).toBe(0.15);
    expect(printerPlayStart("dovetail.clearance", 0.15)).toBe(0.15);
    expect(printerPlayStart("thread.clearance", 0.15)).toBe(0.3);
    expect(printerPlayStart("thread.clearance", 0.2)).toBe(DEFAULT_THREAD_CLEARANCE);
    expect(printerPlayStart("clearance.threshold", 0.25)).toBe(0.25);
  });

  it("leaves press fits, prints in place and room for bought parts out, and everything out without a play", () => {
    for (const setting of PRINTER_PLAY_SETTINGS.filter((entry) => !entry.takes)) expect(printerPlayStart(setting.id, 0.15)).toBeNull();
    for (const setting of PRINTER_PLAY_SETTINGS) expect(printerPlayStart(setting.id, null)).toBeNull();
  });

  it("says a field comes from the fit test only while it holds what the play gave it", () => {
    expect(fromPrinterPlay("lid.gap", 0.15, 0.15)).toBe(true);
    expect(fromPrinterPlay("thread.clearance", 0.3, 0.15)).toBe(true);
    expect(fromPrinterPlay("thread.clearance", 0.15, 0.15)).toBe(false);
    expect(fromPrinterPlay("lid.gap", 0.2, 0.15)).toBe(false);
    expect(fromPrinterPlay("lid.gap", 0.2, null)).toBe(false);
    expect(fromPrinterPlay("lid.magnetGap", 0.15, 0.15)).toBe(false);
  });

  it("knows the inspector rows of the shapes that follow it", () => {
    expect(printerPlayShapeRows("dovetail")).toEqual([{ id: "dovetail.clearance", property: "dovetailClearance" }]);
    expect(printerPlayShapeRows("snapFit")).toEqual([{ id: "snapFit.clearance", property: "snapFitClearance" }]);
    expect(printerPlayShapeRows("thread")).toEqual([{ id: "thread.clearance", property: "clearance" }]);
    expect(printerPlayShapeRows("hinge")).toEqual([]);
    expect(printerPlayShapeRows("box")).toEqual([]);
  });

  it("offers the tested values of the fit test", () => {
    expect([...FIT_TEST_CLEARANCES]).toEqual([0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4]);
  });
});

describe("new shapes start from the play", () => {
  it("gives a new dovetail, snap-fit and nut the play, the nut twice it across its diameter", () => {
    expect(made("dovetail", withPrinterPlay("dovetail", undefined, 0.15)).dovetailClearance).toBe(0.15);
    expect(made("snapFit", withPrinterPlay("snapFit", undefined, 0.15)).snapFitClearance).toBe(0.15);
    const thread = made("thread", withPrinterPlay("thread", undefined, 0.15));
    expect(thread.threadClearance).toBe(0.3);
    // Only the room on the nut follows; the bolt's own and the play along the axis keep their starts.
    expect(thread.threadBoltClearance).toBe(DEFAULT_THREAD_BOLT_CLEARANCE);
    expect(thread.threadAxialClearance).toBe(DEFAULT_THREAD_AXIAL_CLEARANCE);
  });

  it("starts from the built-in values without a play", () => {
    expect(withPrinterPlay("dovetail", undefined, null)).toBeUndefined();
    expect(made("dovetail", withPrinterPlay("dovetail", undefined, null)).dovetailClearance).toBe(DEFAULT_DOVETAIL_CLEARANCE);
    expect(made("snapFit", withPrinterPlay("snapFit", undefined, null)).snapFitClearance).toBe(DEFAULT_SNAP_FIT_CLEARANCE);
    expect(made("thread", withPrinterPlay("thread", undefined, null)).threadClearance).toBe(DEFAULT_THREAD_CLEARANCE);
  });

  it("holds a converted play within the field: a nut's room never goes past its largest", () => {
    expect(made("thread", withPrinterPlay("thread", undefined, 0.9)).threadClearance).toBe(MAX_THREAD_CLEARANCE);
  });

  it("keeps a print-in-place hinge at its own clearance", () => {
    expect(printerPlayShapeStart("hinge", 0.15)).toEqual({});
    expect(made("hinge", withPrinterPlay("hinge", undefined, 0.15)).hingeClearance).toBe(DEFAULT_HINGE_CLEARANCE);
  });

  it("lets a default saved for the kind win over the play, and a saved default without the clearance take it", () => {
    expect(withPrinterPlay("dovetail", { dovetailClearance: 0.3 }, 0.15)).toEqual({ dovetailClearance: 0.3 });
    expect(withPrinterPlay("dovetail", { width: 30, dovetailClearance: undefined }, 0.15)).toEqual({ dovetailClearance: 0.15, width: 30 });
    const saved = { width: 30 };
    expect(withPrinterPlay("box", saved, 0.15)).toBe(saved);
  });

  it("never changes a shape already made, nor one read from a design without the field", () => {
    const before = made("dovetail");
    setPrinterPlay(0.15);
    expect(canonicalizeShape(before).dovetailClearance).toBe(DEFAULT_DOVETAIL_CLEARANCE);
    // An old design's dovetail without the field reads as it always did, whatever the play.
    const old = canonicalizeShape({ ...before, dovetailClearance: undefined });
    expect(normalizeDovetailClearance(old.dovetailClearance)).toBe(DEFAULT_DOVETAIL_CLEARANCE);
    setPrinterPlay(null);
  });

  it("saves as default only a clearance that differs from what the play gives", () => {
    const atPlay = made("dovetail", withPrinterPlay("dovetail", undefined, 0.15));
    expect(shapeDefaultsFromShape(atPlay, {}, 0.15)).toBeNull();
    // Without a play the same dovetail differs from the app's 0.2 and is kept as a default of its own.
    expect(shapeDefaultsFromShape(atPlay, {}, null)).toEqual({ dovetailClearance: 0.15 });
    const builtIn = made("dovetail");
    expect(shapeDefaultsFromShape(builtIn, {}, 0.15)).toEqual({ dovetailClearance: DEFAULT_DOVETAIL_CLEARANCE });
  });
});

describe("the lid tool starts from the play", () => {
  it("takes it for the gap per side and the hinge pin's play, and only for those", () => {
    const lid = lidDefaults(0.15);
    expect(lid.gap).toBe(0.15);
    expect(lid.hingePinPlay).toBe(0.15);
    expect({ ...lid, gap: LID_DEFAULTS.gap, hingePinPlay: LID_DEFAULTS.hingePinPlay }).toEqual(LID_DEFAULTS);
    expect(lid.hingeGap).toBe(LID_DEFAULTS.hingeGap);
    expect(lid.magnetGap).toBe(LID_DEFAULTS.magnetGap);
  });

  it("holds the play within each field and has the built-in lid without one", () => {
    expect(lidDefaults(0.02).hingePinPlay).toBe(MIN_HINGE_PIN_PLAY);
    expect(lidDefaults(0.02).gap).toBe(0.02);
    expect(lidDefaults(null)).toEqual(LID_DEFAULTS);
  });

  it("fills what an AI does not give from the play, and keeps what it gives", () => {
    const start = lidDefaults(0.15);
    expect(normalizeLidOptions({}, start)).toMatchObject({ gap: 0.15, hingePinPlay: 0.15 });
    expect(normalizeLidOptions({ gap: 0.3, hingePinPlay: 0.25 }, start)).toMatchObject({ gap: 0.3, hingePinPlay: 0.25 });
    expect(normalizeLidOptions({})).toMatchObject({ gap: LID_DEFAULTS.gap, hingePinPlay: LID_DEFAULTS.hingePinPlay });
  });
});

describe("Check clearance starts from the play", () => {
  it("takes the play as its minimum gap until one is set by hand", () => {
    const storage = memoryStorage();
    expect(readClearanceSettings(0.15, storage)).toEqual({ threshold: 0.15, splitParts: true });
    expect(readClearanceSettings(null, storage)).toEqual({ threshold: CLEARANCE_DEFAULT_THRESHOLD_MM, splitParts: true });
    // Switching the separate parts off keeps no threshold: it goes on following the play.
    writeClearanceSettings({ splitParts: false }, storage);
    expect(readClearanceSettings(0.2, storage)).toEqual({ threshold: 0.2, splitParts: false });
    writeClearanceSettings({ threshold: 0.35 }, storage);
    expect(readClearanceSettings(0.2, storage)).toEqual({ threshold: 0.35, splitParts: false });
  });

  it("holds the play within the threshold's range and starts at 0.3 without one", () => {
    expect(clearanceStartThreshold(0.005)).toBe(0.01);
    expect(clearanceStartThreshold(null)).toBe(CLEARANCE_DEFAULT_THRESHOLD_MM);
  });

  it("falls back to the play's start where the browser keeps nothing", () => {
    expect(readClearanceSettings(0.15, blockedStorage())).toEqual({ threshold: 0.15, splitParts: true });
    expect(() => writeClearanceSettings({ threshold: 0.2 }, blockedStorage())).not.toThrow();
  });
});

describe("Split's connectors start from the play", () => {
  it("take it as the holes' clearance per side, and only that", () => {
    const start = splitConnectorDefaults(0.15);
    expect(start.clearance).toBe(0.15);
    expect({ ...start, clearance: SPLIT_CONNECTOR_DEFAULTS.clearance }).toEqual(SPLIT_CONNECTOR_DEFAULTS);
    expect(fromPrinterPlay("split.connectorClearance", start.clearance, 0.15)).toBe(true);
    expect(fromPrinterPlay("split.connectorClearance", 0.2, 0.15)).toBe(false);
  });

  it("start from the built-in 0.2 without a play, and hold a large play within the field", () => {
    expect(splitConnectorDefaults(null).clearance).toBe(0.2);
    expect(splitConnectorDefaults(0.9).clearance).toBe(MAX_CONNECTOR_CLEARANCE);
  });

  it("fill what an AI does not give from the play, and keep what it gives", () => {
    const start = splitConnectorDefaults(0.25);
    expect(normalizeSplitConnectorOptions({ kind: "dowels" }, start)).toMatchObject({ kind: "dowels", clearance: 0.25 });
    expect(normalizeSplitConnectorOptions({ kind: "plugs", clearance: 0.1 }, start)).toMatchObject({ kind: "plugs", clearance: 0.1 });
  });
});
