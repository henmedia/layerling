import { describe, expect, it } from "vitest";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";
import { formatMeasurementNumber, lengthDisplayUnit, millimetersToDisplay, normalizeScaleForUnits, parseMeasurementInput, resolveMeasurementInput, scaleOptionsForUnits } from "@/lib/measurementUnits";
import { canBeginShapeDrag, DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations, normalizeSnapGrid, normalizeWorkspaceSettings, shapeDimensionLimit, workplaneSettingsFingerprint, workspaceHydrationSyncDecision } from "@/lib/workplaneSettings";
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
    expect(normalizeWorkspaceSettings({ gridColor: "not-a-color" }).gridColor).toBe(DEFAULT_WORKPLANE_WORKSPACE.gridColor);
    expect(DEFAULT_WORKPLANE_WORKSPACE.dimensionsAlwaysVisible).toBe(true);
    expect(normalizeWorkspaceSettings({}).dimensionsAlwaysVisible).toBe(true);
    expect(normalizeWorkspaceSettings({ dimensionsAlwaysVisible: false }).dimensionsAlwaysVisible).toBe(false);
    expect(normalizeWorkspaceSettings({ dimensionsAlwaysVisible: "yes" }).dimensionsAlwaysVisible).toBe(true);
    expect(DEFAULT_WORKPLANE_WORKSPACE.startInPerspective).toBe(true);
    expect(normalizeWorkspaceSettings({}).startInPerspective).toBe(true);
    expect(normalizeWorkspaceSettings({ startInPerspective: false }).startInPerspective).toBe(false);
    expect(normalizeWorkspaceSettings({ startInPerspective: "no" }).startInPerspective).toBe(true);
    expect(DEFAULT_WORKPLANE_WORKSPACE.clickToPlaceShapes).toBe(true);
    expect(normalizeWorkspaceSettings({}).clickToPlaceShapes).toBe(true);
    expect(normalizeWorkspaceSettings({ clickToPlaceShapes: false }).clickToPlaceShapes).toBe(false);
    expect(normalizeWorkspaceSettings({ clickToPlaceShapes: "no" }).clickToPlaceShapes).toBe(true);
    // Projects saved by 1.18.7 carry click placement as "off" by default.
    expect(normalizeWorkspaceSettings({ placeShapesByClick: false }).clickToPlaceShapes).toBe(true);
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
