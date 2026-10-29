import { describe, expect, it } from "vitest";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";
import { formatMeasurementNumber, lengthDisplayUnit, millimetersToDisplay, normalizeScaleForUnits, parseMeasurementInput, resolveMeasurementInput, scaleOptionsForUnits } from "@/lib/measurementUnits";
import { booleanTriangleLimitPreset, canBeginShapeDrag, customSnapGridDivisors, customSnapGridLabel, normalizeCustomSnapGrids, DEFAULT_ORBIT_ZOOM_SPEED, DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, keyboardNudgeStep, normalizeShapeCustomizations, snapGridForShortcut, snapGridForUnits, snapGridOptions, snapGridStep, normalizeSnapGrid, normalizeWorkspaceSettings, orbitControlsZoomSpeed, shapeDimensionLimit, workplaneSettingsFingerprint, ZOOM_SPEED_SLIDER_MAX, workspaceHydrationSyncDecision, zoomDistanceScale, standardGridSettings, resetGridInSavedDefault, readWorkspaceDefault, saveWorkspaceDefault } from "@/lib/workplaneSettings";
import { toolbarShapeAssets } from "@/lib/shapeCatalog";

describe("workplane settings helpers", () => {
  it("accepts known snap grid values and falls back for unknown values", () => {
    expect(normalizeSnapGrid("0.5 mm")).toBe("0.5 mm");
    expect(normalizeSnapGrid("Huge")).toBe(DEFAULT_SNAP_GRID);
    expect(normalizeSnapGrid(null, "Off")).toBe("Off");
  });

  it("normalizes workspace settings from partial or invalid data", () => {
    const fallback: WorkplaneWorkspaceSettings = {
      ...DEFAULT_WORKPLANE_WORKSPACE,
      width: 300,
      depth: 250,
      background: "#ffffff",
    };

    expect(normalizeWorkspaceSettings(null, fallback)).toEqual(fallback);
    expect(
      normalizeWorkspaceSettings(
        {
          width: 500,
          depth: Number.NaN,
          sizePreset: "",
          gridBlockSize: 2.5,
          gridBlockPreset: "Custom",
          gridColor: "#a34fd1",
          background: "#123456",
          showShadows: false,
          showGrid: false,
          clickToPlaceShapes: false,
          selectBeforeMove: true,
          zoomSpeed: Infinity,
          units: "Bricks",
          scale: "1:10 (centimeters)",
          accuracy: 3,
        },
        fallback,
      ),
    ).toEqual({
      ...fallback,
      width: 500,
      gridBlockSize: 2.5,
      gridBlockPreset: "Custom",
      gridColor: "#a34fd1",
      background: "#123456",
      showShadows: false,
      showGrid: false,
      clickToPlaceShapes: false,
      selectBeforeMove: true,
      units: "Bricks",
      scale: "1:1 (studs)",
      accuracy: 3,
    });

    expect(normalizeWorkspaceSettings({ accuracy: 9 }, fallback).accuracy).toBe(fallback.accuracy);
    expect(normalizeWorkspaceSettings({ historyLimit: 73 }).historyLimit).toBe(73);
    expect(normalizeWorkspaceSettings({ historyLimit: 9000 }).historyLimit).toBe(5000);
    expect(normalizeWorkspaceSettings({ historyLimit: "invalid" }).historyLimit).toBe(100);
    expect(normalizeWorkspaceSettings({}).booleanTriangleLimit).toBe(250_000);
    expect(normalizeWorkspaceSettings({ booleanTriangleLimit: 1_000_000 }).booleanTriangleLimit).toBe(1_000_000);
    expect(normalizeWorkspaceSettings({ booleanTriangleLimit: 5 }).booleanTriangleLimit).toBe(10_000);
    expect(normalizeWorkspaceSettings({ booleanTriangleLimit: 9e9 }).booleanTriangleLimit).toBe(5_000_000);
    expect(normalizeWorkspaceSettings({ booleanTriangleLimit: "many" }).booleanTriangleLimit).toBe(250_000);
    expect(booleanTriangleLimitPreset(250_000)).toBe("normal");
    expect(booleanTriangleLimitPreset(100_000)).toBe("older");
    expect(booleanTriangleLimitPreset(1_000_000)).toBe("fast");
    expect(booleanTriangleLimitPreset(300_000)).toBeNull();
    expect(normalizeWorkspaceSettings({ gridColor: "not-a-color" }).gridColor).toBe(DEFAULT_WORKPLANE_WORKSPACE.gridColor);
    expect(DEFAULT_WORKPLANE_WORKSPACE.dimensionsAlwaysVisible).toBe(true);
    expect(normalizeWorkspaceSettings({}).dimensionsAlwaysVisible).toBe(true);
    expect(normalizeWorkspaceSettings({ dimensionsAlwaysVisible: false }).dimensionsAlwaysVisible).toBe(false);
    expect(normalizeWorkspaceSettings({ dimensionsAlwaysVisible: "yes" }).dimensionsAlwaysVisible).toBe(true);
    expect(DEFAULT_WORKPLANE_WORKSPACE.clickToPlaceShapes).toBe(true);
    expect(normalizeWorkspaceSettings({}).clickToPlaceShapes).toBe(true);
    expect(normalizeWorkspaceSettings({ clickToPlaceShapes: false }).clickToPlaceShapes).toBe(false);
    expect(normalizeWorkspaceSettings({ clickToPlaceShapes: "no" }).clickToPlaceShapes).toBe(true);
    // Projects saved by 1.18.7 carry click placement as "off" by default.
    expect(normalizeWorkspaceSettings({ placeShapesByClick: false }).clickToPlaceShapes).toBe(true);
  });

  it("makes the fastest zoom twenty times the slowest", () => {
    const slow = orbitControlsZoomSpeed(1);
    const middle = orbitControlsZoomSpeed(DEFAULT_WORKPLANE_WORKSPACE.zoomSpeed);
    const fast = orbitControlsZoomSpeed(10);

    expect(middle).toBeCloseTo(DEFAULT_ORBIT_ZOOM_SPEED);
    expect(fast / slow).toBeCloseTo(20);
    expect(orbitControlsZoomSpeed(Number.NaN)).toBeCloseTo(DEFAULT_ORBIT_ZOOM_SPEED);
    expect(orbitControlsZoomSpeed(-4)).toBeCloseTo(slow);
    // The slider goes on above 10 with the same factor per step; the first ten steps are as they were (#331).
    const top = orbitControlsZoomSpeed(ZOOM_SPEED_SLIDER_MAX);
    expect(top / fast).toBeCloseTo((20 ** (1 / 9)) ** (ZOOM_SPEED_SLIDER_MAX - 10));
    expect(orbitControlsZoomSpeed(40)).toBeCloseTo(top);

    // The buttons and keys +/- always step at the default rate, whatever the slider says.
    expect(zoomDistanceScale(0.7)).toBeCloseTo(0.7);
  });

  it("keeps app limits until a shape receives an explicit customization", () => {
    const untouched = normalizeWorkspaceSettings({});
    const customized = normalizeWorkspaceSettings({
      shapeCustomizations: {
        box: { width: 48, maxDimension: 720 },
        sphere: { height: Number.NaN, maxDimension: 9000 },
      },
    });

    expect(untouched.shapeCustomizations).toEqual({});
    expect(shapeDimensionLimit(untouched, "box", 160)).toBe(160);
    expect(customized.shapeCustomizations.box).toEqual({ width: 48, maxDimension: 720 });
    expect(customized.shapeCustomizations.sphere).toEqual({ maxDimension: 2000 });
    expect(shapeDimensionLimit(customized, "box", 160)).toBe(720);
    expect(shapeDimensionLimit(customized, "cylinder", 220)).toBe(220);
  });

  it("normalizes supported special-shape defaults", () => {
    const customized = normalizeWorkspaceSettings({
      shapeCustomizations: {
        cylinder: { sides: 500 },
        ellipse: { sides: 500 },
        roundRoof: { sides: 900 },
        sphere: { steps: 2 },
        cone: { topRadius: -4, baseRadius: 9000, sides: 40 },
        text: { text: "A custom label that is much too long", font: "Serif", bevel: 12, segments: 9.6 },
        gear: { gearType: "helical", teeth: 23.7, toothSize: 3, centerHoleSize: -5, helixAngle: 90, helixQuality: 3 },
      },
    });

    expect(customized.shapeCustomizations.cylinder).toEqual({ sides: 500 });
    expect(customized.shapeCustomizations.ellipse).toEqual({ sides: 500 });
    expect(customized.shapeCustomizations.roundRoof).toEqual({ sides: 512 });
    expect(customized.shapeCustomizations.sphere).toEqual({ steps: 6 });
    expect(customized.shapeCustomizations.cone).toEqual({ topRadius: 0, baseRadius: 1000, sides: 40 });
    expect(customized.shapeCustomizations.text).toEqual({ text: "A custom label that is m", font: "Serif", bevel: 8, segments: 10 });
    expect(customized.shapeCustomizations.gear).toEqual({ gearType: "helical", teeth: 24, toothSize: 3, centerHoleSize: 0, helixAngle: 45, helixQuality: 4 });
  });

  it("can require selection before a shape starts moving", () => {
    expect(canBeginShapeDrag(false, false)).toBe(true);
    expect(canBeginShapeDrag(true, false)).toBe(false);
    expect(canBeginShapeDrag(true, true)).toBe(true);
  });

  it("keeps scale options in the selected unit family", () => {
    expect(scaleOptionsForUnits("Metric (Default)")).toEqual(["1:1 (millimeters)", "1:10 (centimeters)", "1:1000 (meters)"]);
    expect(normalizeScaleForUnits("Metric (Default)", "1:100 (meters)")).toBe("1:1000 (meters)");
    expect(scaleOptionsForUnits("Imperial")).toEqual(["1:1 (inches)", "1:1 (feet)"]);
    expect(normalizeScaleForUnits("Imperial", "1:100 (meters)")).toBe("1:1 (inches)");
    expect(normalizeWorkspaceSettings({ units: "Imperial", scale: "1:100 (meters)" }).scale).toBe("1:1 (inches)");
  });

  it("changes display units without scaling model values", () => {
    expect(lengthDisplayUnit({ units: "Metric (Default)", scale: "1:1000 (meters)" }).label).toBe("m");
    expect(millimetersToDisplay(20, { units: "Metric (Default)", scale: "1:1 (millimeters)" })).toBe(20);
    expect(millimetersToDisplay(20, { units: "Metric (Default)", scale: "1:1000 (meters)" })).toBe(0.02);
    expect(millimetersToDisplay(20, { units: "Metric (Default)", scale: "1:100 (meters)" })).toBe(0.02);
    expect(Number(millimetersToDisplay(25.4, { units: "Imperial", scale: "1:1 (inches)" }).toFixed(4))).toBe(1);
    expect(Number(millimetersToDisplay(304.8, { units: "Imperial", scale: "1:1 (feet)" }).toFixed(4))).toBe(1);
  });

  it("uses accuracy as display precision", () => {
    expect(formatMeasurementNumber(20, 1, 0.01)).toBe("20.0");
    expect(formatMeasurementNumber(20, 3, 0.01)).toBe("20.000");
    expect(formatMeasurementNumber(0.0004, 1, 0.001)).toBe("0.0004");
  });

  it("accepts dot and comma decimal measurement input", () => {
    expect(parseMeasurementInput("12.5")).toBe(12.5);
    expect(parseMeasurementInput("12,5")).toBe(12.5);
    expect(parseMeasurementInput("1.234,5")).toBe(1234.5);
    expect(parseMeasurementInput("1,234.5")).toBe(1234.5);
    expect(parseMeasurementInput("not a measurement")).toBeNaN();
  });

  it("scales the current value when the input is a percentage", () => {
    expect(resolveMeasurementInput("50%", 200)).toBe(100);
    expect(resolveMeasurementInput("120%", 200)).toBe(240);
    expect(resolveMeasurementInput("50,5%", 200)).toBe(101);
    expect(resolveMeasurementInput("50 %", 200)).toBe(100);
    expect(resolveMeasurementInput("100", 200)).toBe(100);
    expect(resolveMeasurementInput("33%", 66)).toBe(21.78);
    expect(resolveMeasurementInput("%", 200)).toBeNaN();
    expect(resolveMeasurementInput("abc%", 200)).toBeNaN();
    expect(resolveMeasurementInput("50%", Number.NaN)).toBeNaN();
  });

  it("fingerprints workspace and snap settings together", () => {
    const base = workplaneSettingsFingerprint(DEFAULT_WORKPLANE_WORKSPACE, "1.0 mm");
    const equivalentNewReference = workplaneSettingsFingerprint({ ...DEFAULT_WORKPLANE_WORKSPACE }, "1.0 mm");
    const changedSnap = workplaneSettingsFingerprint(DEFAULT_WORKPLANE_WORKSPACE, "5.0 mm");
    const changedWorkspace = workplaneSettingsFingerprint({ ...DEFAULT_WORKPLANE_WORKSPACE, width: 300 }, "1.0 mm");

    expect(equivalentNewReference).toBe(base);
    expect(changedSnap).not.toBe(base);
    expect(changedWorkspace).not.toBe(base);
  });

  /*
   * Eine Form, die hier fehlt, verliert ihre Vorgaben lautlos: Das Feld steht im
   * Einstellungsfenster, man trägt etwas ein, und beim nächsten Laden ist es
   * weg. Genau das war Gewinde und Feder passiert - aufgefallen ist es erst, als
   * dieselbe Prüfung die Werte aus einem MCP-Befehl schluckte.
   */
  it("keeps the settings of every shape in the palette", () => {
    const dropped = toolbarShapeAssets
      .map((asset) => asset.kind)
      .filter((kind) => normalizeShapeCustomizations({ [kind]: { width: 42 } })[kind] === undefined);

    expect(dropped).toEqual([]);
  });

  it("keeps a thread's own values instead of dropping them", () => {
    const kept = normalizeShapeCustomizations({ thread: { threadDiameter: 8, threadPitch: 1.25, threadRole: "screw", threadProfile: "trapezoidal" } }).thread;

    expect(kept?.threadDiameter).toBe(8);
    expect(kept?.threadPitch).toBe(1.25);
    expect(kept?.threadRole).toBe("screw");
    expect(kept?.threadProfile).toBe("trapezoidal");
  });

  it("keeps a spring's own values and reins in what is out of range", () => {
    const kept = normalizeShapeCustomizations({ spring: { springTurns: 9, springWire: 2, springQuality: 4000 } }).spring;

    expect(kept?.springTurns).toBe(9);
    expect(kept?.springWire).toBe(2);
    expect(kept?.springQuality).toBe(96);
  });

  it("blocks the previous project's workspace while a new project hydrates", () => {
    const projectOne = workplaneSettingsFingerprint({ ...DEFAULT_WORKPLANE_WORKSPACE, width: 350, depth: 260 }, "5.0 mm");
    const projectTwo = workplaneSettingsFingerprint(DEFAULT_WORKPLANE_WORKSPACE, "1.0 mm");

    const staleCommit = workspaceHydrationSyncDecision(projectTwo, projectOne);
    expect(staleCommit).toEqual({ shouldSync: false, pendingFingerprint: projectTwo });

    const hydratedCommit = workspaceHydrationSyncDecision(staleCommit.pendingFingerprint, projectTwo);
    expect(hydratedCommit).toEqual({ shouldSync: false, pendingFingerprint: null });

    expect(workspaceHydrationSyncDecision(hydratedCommit.pendingFingerprint, projectTwo).shouldSync).toBe(true);
  });
});

describe("custom snap grids", () => {
  const keyUnit = { name: "MX Key Unit", size: 19.05 };

  it("offers each measure whole, halved and quartered after the fixed steps", () => {
    const options = snapGridOptions("Metric (Default)", [keyUnit]);
    expect(options.slice(-3)).toEqual(["custom:19.05:1", "custom:19.05:2", "custom:19.05:4"]);
    expect(options.slice(0, -3)).toEqual(snapGridOptions("Metric (Default)"));
    expect(snapGridOptions("Imperial", [keyUnit]).slice(-3)).toEqual(options.slice(-3));
  });

  it("steps by the measure divided by the divisor", () => {
    expect(snapGridStep("custom:19.05:1")).toBeCloseTo(19.05, 9);
    expect(snapGridStep("custom:19.05:2")).toBeCloseTo(9.525, 9);
    expect(snapGridStep("custom:19.05:4")).toBeCloseTo(4.7625, 9);
    expect(keyboardNudgeStep("custom:19.05:4", false)).toBeCloseTo(4.7625, 9);
  });

  it("names a step after its measure, and after its size once the measure is gone", () => {
    expect(customSnapGridLabel("custom:19.05:1", [keyUnit])).toBe("MX Key Unit");
    expect(customSnapGridLabel("custom:19.05:4", [keyUnit])).toBe("¼ × MX Key Unit");
    expect(customSnapGridLabel("custom:19.05:2", [])).toBe("½ × 19.05 mm");
    expect(customSnapGridLabel("1.0 mm", [keyUnit])).toBeNull();
  });

  it("keeps a custom step through loading and a change of units, and refuses a malformed one", () => {
    expect(normalizeSnapGrid("custom:19.05:4")).toBe("custom:19.05:4");
    expect(snapGridForUnits("Imperial", "custom:19.05:4")).toBe("custom:19.05:4");
    expect(normalizeSnapGrid("custom:19.05:3")).toBe("1.0 mm");
    expect(normalizeSnapGrid("custom:0:1")).toBe("1.0 mm");
    expect(normalizeSnapGrid("custom:abc:1")).toBe("1.0 mm");
    expect(normalizeSnapGrid("custom:99999:1")).toBe("1.0 mm");
  });

  it("cleans the stored list", () => {
    expect(normalizeWorkspaceSettings({}).customSnapGrids).toEqual([]);
    expect(normalizeWorkspaceSettings({
      customSnapGrids: [{ name: "  MX Key Unit ", size: 19.05 }, { name: 7, size: 5 }, { name: "bad", size: -1 }, "nonsense", { name: "huge", size: 1e9 }],
    }).customSnapGrids).toEqual([{ name: "MX Key Unit", size: 19.05 }, { name: "", size: 5 }, { name: "huge", size: 1000 }]);
    expect(normalizeWorkspaceSettings({ customSnapGrids: Array.from({ length: 40 }, (_unused, index) => ({ name: `n${index}`, size: index + 1 })) }).customSnapGrids).toHaveLength(12);
  });
});

describe("a custom snap grid offered whole only (#329)", () => {
  it("offers the whole measure alone when it is set to that, and all three otherwise", () => {
    const withParts = snapGridOptions("Metric (Default)", [{ name: "Grid", size: 10 }]).slice(-3);
    const wholeOnly = snapGridOptions("Metric (Default)", [{ name: "Grid", size: 10, wholeOnly: true }]).slice(-1);
    expect(withParts).toEqual(["custom:10:1", "custom:10:2", "custom:10:4"]);
    expect(wholeOnly).toEqual(["custom:10:1"]);
    expect(snapGridOptions("Metric (Default)", [{ name: "Grid", size: 10, wholeOnly: true }])).toEqual([...snapGridOptions("Metric (Default)"), "custom:10:1"]);
    expect(customSnapGridDivisors({ wholeOnly: true })).toEqual([1]);
    expect(customSnapGridDivisors({})).toEqual([1, 2, 4]);
  });

  it("keeps the switch in the settings, and only when it is on", () => {
    expect(normalizeCustomSnapGrids([{ name: "A", size: 10, wholeOnly: true }, { name: "B", size: 5, wholeOnly: false }, { name: "C", size: 2, wholeOnly: "yes" }])).toEqual([
      { name: "A", size: 10, wholeOnly: true },
      { name: "B", size: 5 },
      { name: "C", size: 2 },
    ]);
  });
});

describe("reset grid (#503)", () => {
  function fakeStorage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial));
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
      clear: () => data.clear(),
      key: () => null,
      get length() {
        return data.size;
      },
    } as Storage;
  }

  it("brings back a visible grid in the colours the app starts with", () => {
    const standard = standardGridSettings("Metric");
    expect(standard.showGrid).toBe(true);
    expect(standard.gridColor).toBe(DEFAULT_WORKPLANE_WORKSPACE.gridColor);
    expect(standard.gridMajorColor).toBe("");
    expect(standard.gridBlockPreset).toBe("5 mm");
    expect(standard.gridBlockSize).toBe(5);
  });

  it("gives inch grids their own standard spacing", () => {
    const standard = standardGridSettings("Imperial");
    expect(standard.gridBlockPreset).toBe("1/4 in");
    expect(standard.gridBlockSize).toBeCloseTo(6.35, 5);
  });

  it("resets only the grid of the default saved with Make default", () => {
    const storage = fakeStorage();
    saveWorkspaceDefault({ ...DEFAULT_WORKPLANE_WORKSPACE, width: 300, gridColor: "#ffffff", gridMajorColor: "#ffffff", showGrid: false, gridBlockSize: 80, gridBlockPreset: "Custom" }, "0.5 mm", storage);
    expect(resetGridInSavedDefault(storage)).toBe(true);
    const saved = readWorkspaceDefault(storage)!;
    expect(saved.workspace.gridColor).toBe(DEFAULT_WORKPLANE_WORKSPACE.gridColor);
    expect(saved.workspace.showGrid).toBe(true);
    expect(saved.workspace.gridBlockSize).toBe(5);
    expect(saved.workspace.width).toBe(300);
    expect(saved.snap).toBe("0.5 mm");
  });

  it("does nothing when no default was ever saved", () => {
    const storage = fakeStorage();
    expect(resetGridInSavedDefault(storage)).toBe(false);
    expect(readWorkspaceDefault(storage)).toBeNull();
  });
});

describe("STL as a download (#731)", () => {
  it("is off until switched on, and a saved choice is kept", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.stlAsDownload).toBe(false);
    expect(normalizeWorkspaceSettings({}, DEFAULT_WORKPLANE_WORKSPACE).stlAsDownload).toBe(false);
    expect(normalizeWorkspaceSettings({ stlAsDownload: true }, DEFAULT_WORKPLANE_WORKSPACE).stlAsDownload).toBe(true);
    expect(normalizeWorkspaceSettings({ stlAsDownload: "yes" }, DEFAULT_WORKPLANE_WORKSPACE).stlAsDownload).toBe(false);
  });
});

describe("Ask before closing the tab", () => {
  it("is off until switched on, and a saved choice is kept", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.confirmTabClose).toBe(false);
    expect(normalizeWorkspaceSettings({}, DEFAULT_WORKPLANE_WORKSPACE).confirmTabClose).toBe(false);
    expect(normalizeWorkspaceSettings({ confirmTabClose: true }, DEFAULT_WORKPLANE_WORKSPACE).confirmTabClose).toBe(true);
    expect(normalizeWorkspaceSettings({ confirmTabClose: "yes" }, DEFAULT_WORKPLANE_WORKSPACE).confirmTabClose).toBe(false);
  });
});

describe("snap grid shortcuts (#748)", () => {
  const press = (key: string, code: string, mods: Partial<Record<"altKey" | "ctrlKey" | "metaKey" | "shiftKey", boolean>> = {}) =>
    ({ key, code, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...mods });
  const metric = snapGridOptions("Metric (Default)");

  it("picks the menu entry of Alt plus a digit, by the key's position", () => {
    expect(snapGridForShortcut(press("1", "Digit1", { altKey: true }), metric, "1.0 mm")).toBe("Off");
    expect(snapGridForShortcut(press("¡", "Digit2", { altKey: true }), metric, "1.0 mm")).toBe("0.1 mm");
    expect(snapGridForShortcut(press("8", "Digit8", { altKey: true }), metric, "1.0 mm")).toBe("Brick");
    expect(snapGridForShortcut(press("9", "Digit9", { altKey: true }), metric, "1.0 mm")).toBeNull();
    expect(snapGridForShortcut(press("5", "Digit5", { altKey: true }), metric, "1.0 mm")).toBeNull();
    expect(snapGridForShortcut(press("3", "Digit3", { altKey: true, ctrlKey: true }), metric, "1.0 mm")).toBeNull();
    const custom = snapGridOptions("Metric (Default)", [{ name: "Key", size: 19.05 }]);
    expect(snapGridForShortcut(press("9", "Digit9", { altKey: true }), custom, "1.0 mm")).toBe(custom[8]);
    expect(snapGridForShortcut(press("0", "Digit0", { altKey: true }), custom, "1.0 mm")).toBe(custom[9]);
  });

  it("steps finer and coarser with comma and period, Off lying below the finest step", () => {
    expect(snapGridForShortcut(press(".", "Period"), metric, "1.0 mm")).toBe("2.0 mm");
    expect(snapGridForShortcut(press(",", "Comma"), metric, "1.0 mm")).toBe("0.5 mm");
    expect(snapGridForShortcut(press(",", "Comma"), metric, "0.1 mm")).toBe("Off");
    expect(snapGridForShortcut(press(",", "Comma"), metric, "Off")).toBeNull();
    expect(snapGridForShortcut(press(".", "Period"), metric, "Brick")).toBeNull();
    expect(snapGridForShortcut(press(".", "Period"), metric, "Off")).toBe("0.1 mm");
    expect(snapGridForShortcut(press(",", "NumpadDecimal"), metric, "1.0 mm")).toBeNull();
    expect(snapGridForShortcut(press(";", "Comma", { shiftKey: true }), metric, "1.0 mm")).toBeNull();
  });
});
