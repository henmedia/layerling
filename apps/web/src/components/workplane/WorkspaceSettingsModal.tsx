"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import type { GuideSection } from "@/lib/guideLinks";
import { MAX_OVERHANG_ANGLE, MIN_OVERHANG_ANGLE } from "@/lib/overhangLimits";
import { Box as BoxIcon, ChevronDown, Grid3X3, History, Palette, Plus, RotateCcw, Ruler, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMovablePanel } from "@/lib/useMovablePanel";
import { SpaceMouseSetting } from "@/components/workplane/SpaceMouseSetting";
import { createPortal } from "react-dom";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { APP_THEME_OPTIONS, type AppThemePreference } from "@/lib/appTheme";
import { setToolbarSize, TOOLBAR_SIZE_OPTIONS, type ToolbarSize } from "@/lib/toolbarSize";
import { useToolbarSize } from "@/lib/useToolbarSize";
import { useSimpleMode } from "@/lib/useSimpleMode";
import { useShapeColors } from "@/lib/useShapeColors";
import { setShapeColors } from "@/lib/shapeColors";
import { isSimpleModeFixedByServer, setSimpleMode } from "@/lib/simpleMode";
import { useViewCubePosition } from "@/lib/useViewCubePosition";
import { setViewCubePosition, VIEW_CUBE_POSITION_OPTIONS, type ViewCubePosition } from "@/lib/viewCubePosition";
import { gearCenterHoleLimits, gearToothPitch, gearTypeHasHelix, MAX_GEAR_TEETH, MIN_GEAR_TEETH } from "@/lib/gearGeometry";
import { automaticSideCount } from "@/lib/roundSideCount";
import { torusTessellation } from "@/lib/torusTessellation";
import { printerPresetById } from "@/lib/printBed";
import { PRINTER_PRESETS } from "@/lib/printerPresets.generated";
import {
  DEFAULT_THREAD_CLEARANCE,
  DEFAULT_THREAD_BOLT_CLEARANCE,
  MIN_THREAD_BOLT_CLEARANCE,
  DEFAULT_THREAD_AXIAL_CLEARANCE,
  threadAxialClearanceLimit,
  MAX_THREAD_BOLT_CLEARANCE,
  DEFAULT_THREAD_DIAMETER,
  DEFAULT_THREAD_HAND,
  DEFAULT_THREAD_HEAD,
  DEFAULT_THREAD_PITCH,
  DEFAULT_THREAD_PROFILE,
  DEFAULT_THREAD_QUALITY,
  DEFAULT_THREAD_ROLE,
  MAX_THREAD_CLEARANCE,
  MAX_THREAD_DIAMETER,
  MAX_THREAD_QUALITY,
  MIN_THREAD_CLEARANCE,
  MIN_THREAD_DIAMETER,
  MIN_THREAD_QUALITY,
  threadPitchLimits,
  defaultThreadChamfer,
} from "@/lib/threadGeometry";
import {
  DEFAULT_SPRING_QUALITY,
  DEFAULT_SPRING_TURNS,
  DEFAULT_SPRING_HAND,
  DEFAULT_SPRING_WIRE,
  MAX_SPRING_QUALITY,
  MIN_SPRING_QUALITY,
  springTurnLimits,
  springWireLimits,
} from "@/lib/springGeometry";
import {
  DEFAULT_FLAT_SPRING_ENDS,
  DEFAULT_FLAT_SPRING_PATTERN,
  DEFAULT_FLAT_SPRING_TURNS,
  DEFAULT_FLAT_SPRING_WIRE,
  flatSpringTurnLimits,
  flatSpringWireLimits,
  normalizeFlatSpringEnds,
  normalizeFlatSpringPattern,
} from "@/lib/flatSpringGeometry";
import {
  DEFAULT_ROUNDED_BOX_CORNER_FILLET,
  DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET,
  DEFAULT_ROUNDED_BOX_QUALITY,
  MIN_ROUNDED_BOX_QUALITY,
  MAX_ROUNDED_BOX_QUALITY,
} from "@/lib/roundedBoxGeometry";
import {
  DEFAULT_BENT_TUBE_INNER_PROFILE,
  DEFAULT_BENT_TUBE_PROFILE,
  DEFAULT_BENT_TUBE_QUALITY,
  DEFAULT_BENT_TUBE_SIZE,
  DEFAULT_BENT_TUBE_WALL,
  MAX_BENT_TUBE_QUALITY,
  MIN_BENT_TUBE_QUALITY,
  MIN_BENT_TUBE_SIZE,
  MIN_BENT_TUBE_WALL,
} from "@/lib/bentTubeGeometry";
import { numberLocale, t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { measurementOptionLabel, normalizeScaleForUnits, parseMeasurementInput, scaleOptionsForUnits, WORKSPACE_UNIT_OPTIONS } from "@/lib/measurementUnits";
import { shapeAssetDefaultDimensions, shapeAssetLabel, shapeAssetSpecialDefaults, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { BOOLEAN_TRIANGLE_LIMIT_PRESETS, BOOLEAN_TRIANGLE_LIMIT_STEP, DEFAULT_WORKPLANE_WORKSPACE, ZOOM_SPEED_SLIDER_MAX, MAX_BOOLEAN_TRIANGLE_LIMIT, MAX_CUSTOM_SHAPE_DIMENSION, MAX_HIGH_RESOLUTION_SIDES, MAX_HIGH_RESOLUTION_STEPS, MIN_BOOLEAN_TRIANGLE_LIMIT, MIN_CUSTOM_SHAPE_DIMENSION, booleanTriangleLimitPreset, workspaceForUnits, snapGridForUnits, type BooleanTriangleLimitPreset, DEFAULT_SNAP_GRID, MAX_CUSTOM_SNAP_GRID, MAX_CUSTOM_SNAP_GRID_NAME, MAX_CUSTOM_SNAP_GRIDS, MIN_CUSTOM_SNAP_GRID, customSnapGridDivisors, customSnapGridLabel, customSnapGridSize, parseCustomSnapGrid, readWorkspaceDefault, resetGridInSavedDefault, snapGridOptions, standardGridSettings, workspaceWithSavedDefault } from "@/lib/workplaneSettings";
import { DEFAULT_SKETCH_BACKGROUND, DEFAULT_SKETCH_GRID_COLOR, DEFAULT_SKETCH_PLATE_COLOR, IMPERIAL_GRID_BLOCK_PRESETS, inchGridPresetMm, workplaneGridPalette } from "@/lib/workplaneGrid";
import type { BentTubeProfile, CustomSnapGrid, GearProfile, GearType, GridSize, ShapeCustomization, ShapeKind, ThreadHand, ThreadHead, ThreadProfile, ThreadRole, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { DEFAULT_LOFT } from "@/lib/loftGeometry";
import { DEFAULT_GRIDFINITY_TRAY_SIZE, normalizeGridfinityType } from "@/lib/gridfinityGeometry";
import { selectWholeValue } from "@/lib/numberField";
import { DEFAULT_HIRTH_BORE, DEFAULT_HIRTH_TEETH, MAX_HIRTH_TEETH, MIN_HIRTH_TEETH, MIN_HIRTH_TOOTH_HEIGHT, hirthBoreLimit, hirthToothHeightLimit } from "@/lib/hirthGeometry";

type WorkspaceSettings = WorkplaneWorkspaceSettings;
type WorkspaceSettingsSection = "appearance" | "measurement" | "workplane" | "shapes" | "history";
// The question mark of each tab opens that tab's own part of the guide.
const SETTINGS_HELP_SECTION: Record<WorkspaceSettingsSection, GuideSection> = {
  appearance: "settingsAppearance",
  measurement: "settingsMeasurement",
  workplane: "settingsWorkplane",
  shapes: "shapeSettings",
  history: "backingUp",
};

const MIN_WORKSPACE_SIZE = 60;
const MAX_WORKSPACE_SIZE = 5000;
const MIN_GRID_BLOCK_SIZE = 1;
const MAX_GRID_BLOCK_SIZE = 200;
const WORKSPACE_SIZE_PRESETS = [
  { label: "200 x 200 mm", width: 200, depth: 200 },
  { label: "300 x 300 mm", width: 300, depth: 300 },
  { label: "500 x 500 mm", width: 500, depth: 500 },
  { label: "1000 x 1000 mm", width: 1000, depth: 1000 },
  { label: "2000 x 2000 mm", width: 2000, depth: 2000 },
  { label: "Custom", width: 200, depth: 200 },
];
// Alphabetical, numbers counted as numbers (Ender 3 before Ender 10): the list of the slicer is in no order a person could search by (#305).
const PRINTER_COLLATOR = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const PRINTER_VENDORS = [...new Set(PRINTER_PRESETS.map((preset) => preset.vendor))].sort(PRINTER_COLLATOR.compare);
const PRINTERS_BY_VENDOR = new Map(PRINTER_VENDORS.map((vendor) => [
  vendor,
  PRINTER_PRESETS.filter((preset) => preset.vendor === vendor).sort((a, b) => PRINTER_COLLATOR.compare(a.model, b.model)),
]));
const GRID_BLOCK_PRESETS = ["1 mm", "2.5 mm", "5 mm", "10 mm", "20 mm", "50 mm", "100 mm", "Custom"] as const;
/** Nur die freie Wahl wird uebersetzt; Masse bleiben Masse. */
const THEME_LABEL_KEYS: Record<AppThemePreference, MessageKey> = {
  system: "workspace.themeSystem",
  light: "workspace.themeLight",
  dark: "workspace.themeDark",
  graphite: "workspace.themeGraphite",
};

const TOOLBAR_SIZE_LABEL_KEYS: Record<ToolbarSize, MessageKey> = {
  small: "workspace.toolbarSizeSmall",
  medium: "workspace.toolbarSizeMedium",
  large: "workspace.toolbarSizeLarge",
};

const VIEW_CUBE_POSITION_LABEL_KEYS: Record<ViewCubePosition, MessageKey> = {
  "top-left": "workspace.viewCubePositionTopLeft",
  "top-right": "workspace.viewCubePositionTopRight",
  "bottom-left": "workspace.viewCubePositionBottomLeft",
  "bottom-right": "workspace.viewCubePositionBottomRight",
};

function gridBlockPresetLabel(preset: string) {
  return preset === "Custom" ? t("workspace.custom") : preset;
}
const HISTORY_LIMIT_OPTIONS = [30, 50, 100, "unlimited", "custom"] as const;
const BOOLEAN_LIMIT_PRESET_LABEL_KEYS: Record<BooleanTriangleLimitPreset, MessageKey> = {
  older: "workspace.booleanTriangleLimitOlder",
  normal: "workspace.booleanTriangleLimitNormal",
  fast: "workspace.booleanTriangleLimitFast",
};
const HISTORY_CUSTOM_DEFAULT = 250;
const TEXT_FONT_OPTIONS = ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", "Stencil", "Japanese"];
const GEAR_TYPE_OPTIONS: Array<{ value: GearType; label: MessageKey }> = [
  { value: "spur", label: "gear.spur" },
  { value: "helical", label: "gear.helical" },
  { value: "herringbone", label: "gear.herringbone" },
  { value: "bevel", label: "gear.bevel" },
  { value: "internal", label: "gear.internal" },
  { value: "rack", label: "gear.rack" },
];
const GEAR_PROFILE_OPTIONS: Array<{ value: GearProfile; label: MessageKey }> = [
  { value: "involute", label: "gear.profileInvolute" },
  { value: "round", label: "gear.profileRound" },
  { value: "simple", label: "gear.profileSimple" },
];
const THREAD_ROLE_OPTIONS: Array<{ value: ThreadRole; label: MessageKey }> = [
  { value: "rod", label: "thread.rod" },
  { value: "screw", label: "thread.screw" },
  { value: "nut", label: "thread.nut" },
  { value: "bore", label: "thread.bore" },
];
const THREAD_HEAD_OPTIONS: Array<{ value: ThreadHead; label: MessageKey }> = [
  { value: "cylinder", label: "thread.headCylinder" },
  { value: "countersunk", label: "thread.headCountersunk" },
  { value: "hex", label: "thread.headHex" },
];
const THREAD_HAND_OPTIONS: Array<{ value: ThreadHand; label: MessageKey }> = [
  { value: "right", label: "thread.right" },
  { value: "left", label: "thread.left" },
];
const THREAD_PROFILE_OPTIONS: Array<{ value: ThreadProfile; label: MessageKey }> = [
  { value: "v", label: "thread.profileV" },
  { value: "trapezoidal", label: "thread.profileTrapezoidal" },
  { value: "round", label: "thread.profileRound" },
  { value: "whitworth", label: "thread.profileWhitworth" },
];

const BENT_TUBE_PROFILE_OPTIONS: Array<{ value: BentTubeProfile; label: MessageKey }> = [
  { value: "round", label: "bentTube.profileRound" },
  { value: "square", label: "bentTube.profileSquare" },
  { value: "hexagon", label: "bentTube.profileHexagon" },
  { value: "octagon", label: "bentTube.profileOctagon" },
];

type ShapeSpecialNumberKey = "steps" | "sides" | "bevel" | "segments" | "topRadius" | "baseRadius" | "teeth" | "toothSize" | "toothWidth" | "centerHoleSize" | "helixAngle" | "helixQuality" | "gearPressureAngle" | "gearBacklash" | "gearRim" | "threadDiameter" | "threadPitch" | "threadClearance" | "threadBoltClearance" | "threadAxialClearance" | "threadQuality" | "threadChamfer" | "threadHeadChamfer" | "springTurns" | "springWire" | "springQuality" | "topWidth" | "topDepth" | "starPoints" | "starInnerSize" | "starOuterFillet" | "starInnerFillet" | "starQuality" | "heartTipFillet" | "heartQuality" | "crescentThickness" | "crescentTipFillet" | "crescentQuality" | "honeycombCellSize" | "honeycombWallThickness" | "honeycombFrameWidth" | "dovetailNeckWidth" | "dovetailClearance" | "hingeKnuckles" | "hingePinDiameter" | "hingeLeafThickness" | "hingeClearance" | "screwHoleShaft" | "screwHoleHeadDepth" | "screwHoleAngle" | "cornerFillet" | "topBottomFillet" | "roundedBoxQuality" | "bentTubeSize" | "bentTubeWall" | "bentTubeQuality" | "knurlCount" | "knurlDepth" | "knurlAngle" | "knurlChamfer"
  | "loftBottomWidth" | "loftBottomDepth" | "loftTopWidth" | "loftTopDepth" | "loftWall";
type ShapeSpecialField =
  | { type: "number"; key: ShapeSpecialNumberKey; label: string; defaultValue: number; min: number; max: number; step?: number; unit?: string }
  | { type: "select"; key: "font" | "gearType" | "gearProfile" | "threadRole" | "threadHead" | "threadHand" | "threadProfile" | "springHand" | "springForm" | "springPattern" | "springEnds" | "bentTubeProfile" | "bentTubeInnerProfile" | "knurlPattern" | "gridfinityType" | "loftBottomOutline" | "loftTopOutline"; label: string; defaultValue: string; options: Array<{ value: string; label: string }> }
  | { type: "text"; key: "text"; label: string; defaultValue: string; maxLength: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gridBlockSizeForPreset(preset: string, fallback: number) {
  if (preset === "Custom") {
    return clamp(fallback, MIN_GRID_BLOCK_SIZE, MAX_GRID_BLOCK_SIZE);
  }
  return clamp(inchGridPresetMm(preset) ?? (Number.parseFloat(preset) || DEFAULT_WORKPLANE_WORKSPACE.gridBlockSize), MIN_GRID_BLOCK_SIZE, MAX_GRID_BLOCK_SIZE);
}

function isHistoryLimitPreset(value: unknown): value is 30 | 50 | 100 {
  return value === 30 || value === 50 || value === 100;
}

function specialFieldsForShape(
  kind: ShapeKind,
  dimensions: { width: number; depth: number; height: number },
  customization: ShapeCustomization,
): ShapeSpecialField[] {
  const defaults = shapeAssetSpecialDefaults(kind, dimensions);
  // Ohne eigene Angabe folgt die Seitenzahl der Groesse; hier steht, was das
  // bei den Vorgabemassen ergibt. Eine eingetragene Zahl haelt sie fest.
  if (kind === "cylinder" || kind === "ellipse" || kind === "slot") {
    return [{
      type: "number",
      key: "sides",
      label: t("prop.sides"),
      defaultValue: defaults.sides ?? automaticSideCount(dimensions.width, dimensions.depth),
      min: 3,
      max: MAX_HIGH_RESOLUTION_SIDES,
      step: 1,
    }];
  }
  if (kind === "sphere" || kind === "halfSphere" || kind === "paraboloid") return [{ type: "number", key: "steps", label: t("prop.steps"), defaultValue: defaults.steps ?? (kind === "halfSphere" || kind === "paraboloid" ? 32 : 24), min: 6, max: MAX_HIGH_RESOLUTION_STEPS, step: 1 }];
  if (kind === "torus") {
    const effective = torusTessellation({ sides: defaults.sides, steps: defaults.steps }, dimensions.width, dimensions.depth, dimensions.height);
    return [
      { type: "number", key: "sides", label: t("prop.torusSides"), defaultValue: effective.ringSides, min: 12, max: MAX_HIGH_RESOLUTION_SIDES, step: 1 },
      { type: "number", key: "steps", label: t("prop.torusSteps"), defaultValue: effective.tubeSteps, min: 6, max: MAX_HIGH_RESOLUTION_STEPS, step: 1 },
    ];
  }
  if (kind === "cone") {
    return [
      { type: "number", key: "topRadius", label: t("prop.topRadius"), defaultValue: defaults.topRadius ?? 0, min: 0, max: MAX_CUSTOM_SHAPE_DIMENSION / 2, unit: "mm" },
      { type: "number", key: "baseRadius", label: t("prop.baseRadius"), defaultValue: defaults.baseRadius ?? dimensions.width / 2, min: MIN_CUSTOM_SHAPE_DIMENSION, max: MAX_CUSTOM_SHAPE_DIMENSION / 2, unit: "mm" },
      { type: "number", key: "sides", label: t("prop.sides"), defaultValue: defaults.sides ?? automaticSideCount(dimensions.width, dimensions.depth), min: 3, max: MAX_HIGH_RESOLUTION_SIDES, step: 1 },
    ];
  }
  if (kind === "pyramid") {
    return [
      { type: "number", key: "sides", label: t("prop.sides"), defaultValue: defaults.sides ?? 4, min: 3, max: 24, step: 1 },
      { type: "number", key: "topDepth", label: t("prop.topLength"), defaultValue: defaults.topDepth ?? 0, min: 0, max: MAX_CUSTOM_SHAPE_DIMENSION, unit: "mm" },
      { type: "number", key: "topWidth", label: t("prop.topWidth"), defaultValue: defaults.topWidth ?? 0, min: 0, max: MAX_CUSTOM_SHAPE_DIMENSION, unit: "mm" },
    ];
  }
  if (kind === "polygon") return [{ type: "number", key: "sides", label: t("prop.sides"), defaultValue: defaults.sides ?? 6, min: 3, max: 24, step: 1 }];
  if (kind === "roundRoof") return [{ type: "number", key: "sides", label: t("prop.sides"), defaultValue: defaults.sides ?? 64, min: 4, max: MAX_HIGH_RESOLUTION_SIDES, step: 1 }];
  if (kind === "tube" || kind === "ring") {
    return [
      { type: "number", key: "sides", label: t("prop.sides"), defaultValue: defaults.sides ?? automaticSideCount(dimensions.width, dimensions.depth), min: 3, max: MAX_HIGH_RESOLUTION_SIDES, step: 1 },
      { type: "number", key: "bevel", label: t("prop.thickness"), defaultValue: defaults.bevel ?? 4, min: 0.5, max: 20, unit: "mm" },
    ];
  }
  if (kind === "text") {
    return [
      { type: "text", key: "text", label: t("prop.text"), defaultValue: defaults.text ?? "TEXT", maxLength: 24 },
      { type: "select", key: "font", label: t("prop.font"), defaultValue: defaults.font ?? "Multilanguage", options: TEXT_FONT_OPTIONS.map((value) => ({ value, label: value })) },
      { type: "number", key: "bevel", label: t("prop.bevel"), defaultValue: defaults.bevel ?? 0, min: 0, max: 8, unit: "mm" },
      { type: "number", key: "segments", label: t("prop.segments"), defaultValue: defaults.segments ?? 0, min: 0, max: 24, step: 1 },
    ];
  }
  if (kind === "spring") {
    const form = { type: "select" as const, key: "springForm" as const, label: t("prop.springForm"), defaultValue: defaults.springForm ?? "coil", options: [{ value: "coil", label: t("spring.coil") }, { value: "flat", label: t("spring.flat") }] };
    if ((customization.springForm ?? defaults.springForm) === "flat") {
      const pattern = normalizeFlatSpringPattern(customization.springPattern ?? defaults.springPattern);
      const ends = normalizeFlatSpringEnds(customization.springEnds ?? defaults.springEnds);
      const wireLimits = flatSpringWireLimits(dimensions.width, dimensions.depth, pattern, ends);
      const turnLimits = flatSpringTurnLimits(dimensions.width, dimensions.depth, customization.springWire ?? defaults.springWire, pattern, ends);
      return [
        form,
        { type: "select", key: "springPattern", label: t("prop.springPattern"), defaultValue: defaults.springPattern ?? DEFAULT_FLAT_SPRING_PATTERN, options: [{ value: "round", label: t("spring.round") }, { value: "zigzag", label: t("spring.zigzag") }, { value: "square", label: t("spring.square") }] },
        { type: "select", key: "springEnds", label: t("prop.springEnds"), defaultValue: defaults.springEnds ?? DEFAULT_FLAT_SPRING_ENDS, options: [{ value: "eye", label: t("spring.eye") }, { value: "tab", label: t("spring.tab") }, { value: "none", label: t("spring.none") }] },
        { type: "number", key: "springTurns", label: t("prop.bends"), defaultValue: defaults.springTurns ?? DEFAULT_FLAT_SPRING_TURNS, min: turnLimits.min, max: turnLimits.max, step: 1 },
        { type: "number", key: "springWire", label: t("prop.band"), defaultValue: defaults.springWire ?? DEFAULT_FLAT_SPRING_WIRE, min: wireLimits.min, max: wireLimits.max, unit: "mm" },
        { type: "number", key: "springQuality", label: t("prop.quality"), defaultValue: defaults.springQuality ?? DEFAULT_SPRING_QUALITY, min: MIN_SPRING_QUALITY, max: MAX_SPRING_QUALITY, step: 4 },
      ];
    }
    const across = Math.max(dimensions.width, dimensions.depth);
    const wireLimits = springWireLimits(across, dimensions.height);
    const turnLimits = springTurnLimits(across, dimensions.height, customization.springWire ?? defaults.springWire);
    return [
      form,
      { type: "number", key: "springTurns", label: t("prop.turns"), defaultValue: defaults.springTurns ?? DEFAULT_SPRING_TURNS, min: turnLimits.min, max: turnLimits.max, step: 1 },
      { type: "number", key: "springWire", label: t("prop.wire"), defaultValue: defaults.springWire ?? DEFAULT_SPRING_WIRE, min: wireLimits.min, max: wireLimits.max, unit: "mm" },
      { type: "number", key: "springQuality", label: t("prop.quality"), defaultValue: defaults.springQuality ?? DEFAULT_SPRING_QUALITY, min: MIN_SPRING_QUALITY, max: MAX_SPRING_QUALITY, step: 4 },
      { type: "select", key: "springHand", label: t("prop.springHand"), defaultValue: defaults.springHand ?? DEFAULT_SPRING_HAND, options: [{ value: "right", label: t("spring.right") }, { value: "left", label: t("spring.left") }] },
    ];
  }
  if (kind === "thread") {
    const diameter = customization.threadDiameter ?? defaults.threadDiameter ?? DEFAULT_THREAD_DIAMETER;
    const pitchLimits = threadPitchLimits(diameter);
    const fields: ShapeSpecialField[] = [
      { type: "select", key: "threadRole", label: t("inspector.threadRole"), defaultValue: defaults.threadRole ?? DEFAULT_THREAD_ROLE, options: THREAD_ROLE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })) },
    ];
    if ((customization.threadRole ?? defaults.threadRole) === "screw") {
      fields.push({ type: "select", key: "threadHead", label: t("inspector.threadHead"), defaultValue: defaults.threadHead ?? DEFAULT_THREAD_HEAD, options: THREAD_HEAD_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })) });
    }
    // Die Aussenfase kennen Schraubenkopf und Mutter gleichermassen.
    if (["screw", "nut"].includes(customization.threadRole ?? defaults.threadRole ?? DEFAULT_THREAD_ROLE)) {
      const istMutter = (customization.threadRole ?? defaults.threadRole) === "nut";
      fields.push({ type: "number", key: "threadHeadChamfer", label: t(istMutter ? "prop.rimChamfer" : "prop.headChamfer"), defaultValue: defaults.threadHeadChamfer ?? 0, min: 0, max: 40, unit: "mm" });
    }
    fields.push(
      { type: "number", key: "threadDiameter", label: t("prop.diameter"), defaultValue: defaults.threadDiameter ?? DEFAULT_THREAD_DIAMETER, min: MIN_THREAD_DIAMETER, max: MAX_THREAD_DIAMETER, unit: "mm" },
      { type: "number", key: "threadPitch", label: t("prop.pitch"), defaultValue: defaults.threadPitch ?? DEFAULT_THREAD_PITCH, min: pitchLimits.min, max: pitchLimits.max, unit: "mm" },
      { type: "select", key: "threadHand", label: t("prop.threadHand"), defaultValue: defaults.threadHand ?? DEFAULT_THREAD_HAND, options: THREAD_HAND_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })) },
      { type: "select", key: "threadProfile", label: t("prop.threadProfile"), defaultValue: defaults.threadProfile ?? DEFAULT_THREAD_PROFILE, options: THREAD_PROFILE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })) },
      { type: "number", key: "threadClearance", label: t("prop.clearance"), defaultValue: defaults.threadClearance ?? DEFAULT_THREAD_CLEARANCE, min: MIN_THREAD_CLEARANCE, max: MAX_THREAD_CLEARANCE, unit: "mm" },
      { type: "number", key: "threadAxialClearance", label: t("prop.axialClearance"), defaultValue: defaults.threadAxialClearance ?? DEFAULT_THREAD_AXIAL_CLEARANCE, min: 0, max: threadAxialClearanceLimit(defaults.threadPitch ?? DEFAULT_THREAD_PITCH), step: 0.05, unit: "mm" },
      { type: "number", key: "threadBoltClearance", label: t("prop.boltClearance"), defaultValue: defaults.threadBoltClearance ?? DEFAULT_THREAD_BOLT_CLEARANCE, min: MIN_THREAD_BOLT_CLEARANCE, max: MAX_THREAD_BOLT_CLEARANCE, unit: "mm" },
      { type: "number", key: "threadChamfer", label: t("prop.chamfer"), defaultValue: defaults.threadChamfer ?? defaultThreadChamfer(defaults.threadPitch ?? DEFAULT_THREAD_PITCH, defaults.threadProfile ?? DEFAULT_THREAD_PROFILE, defaults.threadRole ?? DEFAULT_THREAD_ROLE), min: 0, max: 40, unit: "mm" },
      { type: "number", key: "threadQuality", label: t("prop.quality"), defaultValue: defaults.threadQuality ?? DEFAULT_THREAD_QUALITY, min: MIN_THREAD_QUALITY, max: MAX_THREAD_QUALITY, step: 6 },
    );
    return fields;
  }
  if (kind === "gear") {
    const teeth = customization.teeth ?? defaults.teeth ?? 12;
    const toothSize = customization.toothSize ?? defaults.toothSize ?? 2.5;
    const toothPitch = gearToothPitch(dimensions.width, dimensions.depth, teeth);
    const gearProfile = customization.gearProfile ?? defaults.gearProfile ?? "involute";
    const centerHoleLimits = gearCenterHoleLimits(dimensions.width, dimensions.depth, toothSize, { teeth, gearProfile });
    const gearType = customization.gearType ?? defaults.gearType ?? "spur";
    const fields: ShapeSpecialField[] = [
      { type: "select", key: "gearType", label: t("inspector.gearType"), defaultValue: defaults.gearType ?? "spur", options: GEAR_TYPE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })) },
      { type: "select", key: "gearProfile", label: t("prop.gearProfile"), defaultValue: defaults.gearProfile ?? "involute", options: GEAR_PROFILE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })) },
      { type: "number", key: "teeth", label: t("prop.teeth"), defaultValue: defaults.teeth ?? 12, min: MIN_GEAR_TEETH, max: MAX_GEAR_TEETH, step: 1 },
      ...(gearProfile === "involute" || gearProfile === "round" ? [
        ...(gearProfile === "involute" ? [
          { type: "number", key: "gearPressureAngle", label: t("prop.gearPressureAngle"), defaultValue: defaults.gearPressureAngle ?? 20, min: 14.5, max: 30, step: 0.5, unit: "°" },
        ] satisfies ShapeSpecialField[] : []),
        { type: "number", key: "gearBacklash", label: t("prop.gearBacklash"), defaultValue: defaults.gearBacklash ?? 0.2, min: 0, max: 2, step: 0.05, unit: "mm" },
      ] satisfies ShapeSpecialField[] : [
        { type: "number", key: "toothSize", label: t("prop.toothSize"), defaultValue: defaults.toothSize ?? 2.5, min: 0.2, max: Math.max(0.2, Math.min(dimensions.width, dimensions.depth) * 0.22), unit: "mm" },
        { type: "number", key: "toothWidth", label: t("prop.toothWidth"), defaultValue: defaults.toothWidth ?? toothPitch * 0.54, min: toothPitch * 0.12, max: toothPitch * 0.82, unit: "mm" },
      ] satisfies ShapeSpecialField[]),
      { type: "number", key: "centerHoleSize", label: t("prop.centerHole"), defaultValue: defaults.centerHoleSize ?? 6, min: centerHoleLimits.min, max: centerHoleLimits.max, unit: "mm" },
    ];
    if (gearType === "internal") {
      fields.push({ type: "number", key: "gearRim", label: t("prop.gearRim"), defaultValue: defaults.gearRim ?? 3, min: 0.5, max: 60, unit: "mm" });
    }
    if (gearTypeHasHelix(gearType)) {
      fields.push(
        { type: "number", key: "helixAngle", label: t("prop.helixAngle"), defaultValue: defaults.helixAngle ?? 22.5, min: -45, max: 45, unit: "°" },
        { type: "number", key: "helixQuality", label: t("prop.helixQuality"), defaultValue: defaults.helixQuality ?? 16, min: 4, max: 32, step: 1 },
      );
    }
    return fields;
  }
  if (kind === "hirth") {
    return [
      { type: "number", key: "teeth", label: t("prop.teeth"), defaultValue: defaults.teeth ?? DEFAULT_HIRTH_TEETH, min: MIN_HIRTH_TEETH, max: MAX_HIRTH_TEETH, step: 1 },
      { type: "number", key: "toothSize", label: t("prop.hirthToothHeight"), defaultValue: defaults.toothSize ?? 2.6, min: MIN_HIRTH_TOOTH_HEIGHT, max: hirthToothHeightLimit(dimensions.width, dimensions.depth, dimensions.height), unit: "mm" },
      { type: "number", key: "centerHoleSize", label: t("prop.centerHole"), defaultValue: defaults.centerHoleSize ?? DEFAULT_HIRTH_BORE, min: 0, max: hirthBoreLimit(dimensions.width, dimensions.depth), unit: "mm" },
    ];
  }
  if (kind === "star") {
    return [
      { type: "number", key: "starPoints", label: t("prop.starPoints"), defaultValue: defaults.starPoints ?? 5, min: 3, max: 32, step: 1 },
      { type: "number", key: "starInnerSize", label: t("prop.starInnerSize"), defaultValue: defaults.starInnerSize ?? 20, min: 0.1, max: dimensions.width - 0.1, unit: "mm" },
      { type: "number", key: "starOuterFillet", label: t("prop.starOuterFillet"), defaultValue: defaults.starOuterFillet ?? 0, min: 0, max: 40, unit: "mm" },
      { type: "number", key: "starInnerFillet", label: t("prop.starInnerFillet"), defaultValue: defaults.starInnerFillet ?? 0, min: 0, max: 40, unit: "mm" },
      { type: "number", key: "starQuality", label: t("prop.quality"), defaultValue: defaults.starQuality ?? 16, min: 4, max: 48, step: 2 },
    ];
  }
  if (kind === "counterbore" || kind === "countersink" || kind === "doubleCountersink") {
    return [
      { type: "number", key: "screwHoleShaft", label: t("prop.screwHoleShaft"), defaultValue: defaults.screwHoleShaft ?? 3.4, min: 0.1, max: Math.max(0.2, dimensions.width * 0.95), unit: "mm" },
      kind === "counterbore"
        ? { type: "number", key: "screwHoleHeadDepth", label: t("prop.screwHoleHeadDepth"), defaultValue: defaults.screwHoleHeadDepth ?? 3.2, min: 0.1, max: Math.max(0.3, dimensions.height - 0.2), unit: "mm" }
        : { type: "number", key: "screwHoleAngle", label: t("prop.screwHoleAngle"), defaultValue: defaults.screwHoleAngle ?? 90, min: 30, max: 150, step: 1, unit: "°" },
      { type: "number", key: "sides", label: t("prop.sides"), defaultValue: defaults.sides ?? automaticSideCount(dimensions.width, dimensions.depth), min: 3, max: MAX_HIGH_RESOLUTION_SIDES, step: 1 },
    ];
  }
  if (kind === "teardrop") {
    return [{ type: "number", key: "sides", label: t("prop.sides"), defaultValue: defaults.sides ?? automaticSideCount(dimensions.width, dimensions.width), min: 3, max: MAX_HIGH_RESOLUTION_SIDES, step: 1 }];
  }
  if (kind === "knurl") {
    return [
      { type: "select", key: "knurlPattern", label: t("prop.knurlPattern"), defaultValue: defaults.knurlPattern ?? "straight", options: [{ value: "straight", label: t("knurl.straight") }, { value: "diamond", label: t("knurl.diamond") }, { value: "round", label: t("knurl.round") }] },
      { type: "number", key: "knurlCount", label: t("prop.knurlCount"), defaultValue: defaults.knurlCount ?? 30, min: 6, max: 180, step: 1 },
      { type: "number", key: "knurlDepth", label: t("prop.knurlDepth"), defaultValue: defaults.knurlDepth ?? 0.6, min: 0.1, max: Math.max(0.2, dimensions.width / 6), step: 0.05, unit: "mm" },
      { type: "number", key: "knurlAngle", label: t("prop.knurlAngle"), defaultValue: defaults.knurlAngle ?? 30, min: 10, max: 60, step: 1, unit: "°" },
      { type: "number", key: "knurlChamfer", label: t("prop.knurlChamfer"), defaultValue: defaults.knurlChamfer ?? 0.5, min: 0, max: Math.max(0.05, Math.min(dimensions.width / 4, dimensions.height / 2 - 0.05)), step: 0.05, unit: "mm" },
    ];
  }
  if (kind === "gridfinity") {
    // The lip and the magnet holes are switches, which this list has no field for; saving a bin as the default from its panel keeps them.
    return [
      { type: "select", key: "gridfinityType", label: t("prop.gridfinityType"), defaultValue: defaults.gridfinityType ?? "bin", options: [{ value: "bin", label: t("gridfinity.bin") }, { value: "baseplate", label: t("gridfinity.baseplate") }, { value: "tray", label: t("gridfinity.tray") }] },
    ];
  }
  if (kind === "hinge") {
    return [
      { type: "number", key: "hingeKnuckles", label: t("prop.hingeKnuckles"), defaultValue: defaults.hingeKnuckles ?? 5, min: 3, max: 15, step: 2 },
      { type: "number", key: "hingePinDiameter", label: t("prop.hingePinDiameter"), defaultValue: defaults.hingePinDiameter ?? 3, min: 0.2, max: Math.max(0.4, dimensions.height - 1), step: 0.1, unit: "mm" },
      { type: "number", key: "hingeLeafThickness", label: t("prop.hingeLeafThickness"), defaultValue: defaults.hingeLeafThickness ?? 2, min: 0.4, max: Math.max(0.5, dimensions.height / 2), step: 0.1, unit: "mm" },
      { type: "number", key: "hingeClearance", label: t("prop.hingeClearance"), defaultValue: defaults.hingeClearance ?? 0.4, min: 0.1, max: 1, step: 0.05, unit: "mm" },
    ];
  }
  if (kind === "dovetail") {
    return [
      { type: "number", key: "dovetailNeckWidth", label: t("prop.dovetailNeckWidth"), defaultValue: defaults.dovetailNeckWidth ?? dimensions.width / 2, min: 0.1, max: Math.max(0.2, dimensions.width * 0.95), unit: "mm" },
      { type: "number", key: "dovetailClearance", label: t("prop.dovetailClearance"), defaultValue: defaults.dovetailClearance ?? 0.2, min: 0, max: 2, step: 0.05, unit: "mm" },
    ];
  }
  if (kind === "heart") {
    return [
      { type: "number", key: "heartTipFillet", label: t("prop.heartTipFillet"), defaultValue: defaults.heartTipFillet ?? 0, min: 0, max: 20, unit: "mm" },
      { type: "number", key: "heartQuality", label: t("prop.quality"), defaultValue: defaults.heartQuality ?? 32, min: 16, max: 64, step: 2 },
    ];
  }
  if (kind === "crescent") {
    return [
      { type: "number", key: "crescentThickness", label: t("prop.crescentThickness"), defaultValue: defaults.crescentThickness ?? 14, min: 1, max: Math.max(2, dimensions.width * 0.85), unit: "mm" },
      { type: "number", key: "crescentTipFillet", label: t("prop.crescentTipFillet"), defaultValue: defaults.crescentTipFillet ?? 0.5, min: 0, max: 8, unit: "mm" },
      { type: "number", key: "crescentQuality", label: t("prop.quality"), defaultValue: defaults.crescentQuality ?? 32, min: 16, max: 64, step: 2 },
    ];
  }
  if (kind === "honeycomb") {
    return [
      { type: "number", key: "honeycombCellSize", label: t("prop.honeycombCellSize"), defaultValue: defaults.honeycombCellSize ?? 8, min: 3, max: 25, step: 0.5, unit: "mm" },
      { type: "number", key: "honeycombWallThickness", label: t("prop.honeycombWallThickness"), defaultValue: defaults.honeycombWallThickness ?? 1.6, min: 0.8, max: 5, step: 0.1, unit: "mm" },
      { type: "number", key: "honeycombFrameWidth", label: t("prop.honeycombFrameWidth"), defaultValue: defaults.honeycombFrameWidth ?? 3, min: 0, max: 15, step: 0.5, unit: "mm" },
    ];
  }
  if (kind === "loft") {
    const outlines = [{ value: "round", label: t("loft.round") }, { value: "rectangle", label: t("loft.rectangle") }, { value: "polygon", label: t("loft.polygon") }];
    return [
      { type: "select", key: "loftBottomOutline", label: t("prop.loftBottomOutline"), defaultValue: defaults.loftBottomOutline ?? DEFAULT_LOFT.bottomOutline, options: outlines },
      { type: "number", key: "loftBottomWidth", label: t("prop.loftBottomWidth"), defaultValue: defaults.loftBottomWidth ?? DEFAULT_LOFT.bottomWidth, min: 1, max: 300, unit: "mm" },
      { type: "number", key: "loftBottomDepth", label: t("prop.loftBottomDepth"), defaultValue: defaults.loftBottomDepth ?? DEFAULT_LOFT.bottomDepth, min: 1, max: 300, unit: "mm" },
      { type: "select", key: "loftTopOutline", label: t("prop.loftTopOutline"), defaultValue: defaults.loftTopOutline ?? DEFAULT_LOFT.topOutline, options: outlines },
      { type: "number", key: "loftTopWidth", label: t("prop.loftTopWidth"), defaultValue: defaults.loftTopWidth ?? DEFAULT_LOFT.topWidth, min: 1, max: 300, unit: "mm" },
      { type: "number", key: "loftTopDepth", label: t("prop.loftTopDepth"), defaultValue: defaults.loftTopDepth ?? DEFAULT_LOFT.topDepth, min: 1, max: 300, unit: "mm" },
      { type: "number", key: "loftWall", label: t("prop.loftWall"), defaultValue: defaults.loftWall ?? DEFAULT_LOFT.wall, min: 0, max: 50, step: 0.1, unit: "mm" },
    ];
  }
  if (kind === "bentTube") {
    const profileOptions = BENT_TUBE_PROFILE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }));
    return [
      { type: "select", key: "bentTubeProfile", label: t("prop.bentTubeProfile"), defaultValue: defaults.bentTubeProfile ?? DEFAULT_BENT_TUBE_PROFILE, options: profileOptions },
      { type: "select", key: "bentTubeInnerProfile", label: t("prop.bentTubeInnerProfile"), defaultValue: defaults.bentTubeInnerProfile ?? DEFAULT_BENT_TUBE_INNER_PROFILE, options: [{ value: "none", label: t("bentTube.innerNone") }, ...profileOptions] },
      { type: "number", key: "bentTubeSize", label: t("prop.bentTubeSize"), defaultValue: defaults.bentTubeSize ?? DEFAULT_BENT_TUBE_SIZE, min: MIN_BENT_TUBE_SIZE, max: 100, step: 0.5, unit: "mm" },
      { type: "number", key: "bentTubeWall", label: t("prop.bentTubeWall"), defaultValue: defaults.bentTubeWall ?? DEFAULT_BENT_TUBE_WALL, min: MIN_BENT_TUBE_WALL, max: 20, step: 0.1, unit: "mm" },
      { type: "number", key: "bentTubeQuality", label: t("prop.quality"), defaultValue: defaults.bentTubeQuality ?? DEFAULT_BENT_TUBE_QUALITY, min: MIN_BENT_TUBE_QUALITY, max: MAX_BENT_TUBE_QUALITY, step: 4 },
    ];
  }
  if (kind === "roundedBox") {
    return [
      { type: "number", key: "cornerFillet", label: t("prop.cornerFillet"), defaultValue: defaults.cornerFillet ?? DEFAULT_ROUNDED_BOX_CORNER_FILLET, min: 0, max: Math.max(1, Math.min(dimensions.width, dimensions.depth) / 2), step: 0.05, unit: "mm" },
      { type: "number", key: "topBottomFillet", label: t("prop.topBottomFillet"), defaultValue: defaults.topBottomFillet ?? DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET, min: 0, max: Math.max(1, dimensions.height / 2), step: 0.05, unit: "mm" },
      { type: "number", key: "roundedBoxQuality", label: t("prop.quality"), defaultValue: defaults.roundedBoxQuality ?? DEFAULT_ROUNDED_BOX_QUALITY, min: MIN_ROUNDED_BOX_QUALITY, max: MAX_ROUNDED_BOX_QUALITY, step: 1 },
    ];
  }
  return [];
}

export function WorkspaceSettingsModal({
  workspace,
  snap,
  themePreference,
  moveDimensionsEnabled,
  originDimensionsEnabled,
  startInPerspective,
  onWorkspaceChange,
  onSnapChange,
  onThemePreferenceChange,
  onMoveDimensionsEnabledChange,
  onOriginDimensionsEnabledChange,
  onStartInPerspectiveChange,
  hasStartView,
  onSaveStartView,
  onResetStartView,
  onMakeDefault,
  onClose,
}: {
  workspace: WorkspaceSettings;
  snap: GridSize;
  themePreference: AppThemePreference;
  moveDimensionsEnabled: boolean;
  originDimensionsEnabled: boolean;
  startInPerspective: boolean;
  onWorkspaceChange: (next: WorkspaceSettings) => void;
  onSnapChange: (next: GridSize) => void;
  onThemePreferenceChange?: (preference: AppThemePreference) => void;
  onMoveDimensionsEnabledChange: (enabled: boolean) => void;
  onOriginDimensionsEnabledChange: (enabled: boolean) => void;
  onStartInPerspectiveChange: (perspective: boolean) => void;
  /** Whether a start view of the user's own is set (#853). */
  hasStartView: boolean;
  onSaveStartView: () => void;
  onResetStartView: () => void;
  onMakeDefault: () => void;
  onClose: () => void;
}) {
  const [defaultSaved, setDefaultSaved] = useState(false);
  // A default saved earlier or just now: what "Use my default" puts on this design (#754).
  const savedDefault = useMemo(() => readWorkspaceDefault(), [defaultSaved]);
  useLanguage();
  const [activeSection, setActiveSection] = useState<WorkspaceSettingsSection>("appearance");
  const toolbarSize = useToolbarSize();
  const shapeColors = useShapeColors();
  const viewCubePosition = useViewCubePosition();
  const [selectedShapeKind, setSelectedShapeKind] = useState<ShapeKind>(toolbarShapeAssets[0].kind);
  const [dimensionDrafts, setDimensionDrafts] = useState(() => ({
    width: workspace.width.toFixed(workspace.accuracy),
    depth: workspace.depth.toFixed(workspace.accuracy),
  }));
  const [gridBlockSizeDraft, setGridBlockSizeDraft] = useState(() => workspace.gridBlockSize.toFixed(workspace.accuracy));
  const [customHistoryDraft, setCustomHistoryDraft] = useState(() =>
    typeof workspace.historyLimit === "number" && !isHistoryLimitPreset(workspace.historyLimit)
      ? String(workspace.historyLimit)
      : String(HISTORY_CUSTOM_DEFAULT),
  );
  const historyLimitMode: (typeof HISTORY_LIMIT_OPTIONS)[number] = workspace.historyLimit === "unlimited" || isHistoryLimitPreset(workspace.historyLimit)
    ? workspace.historyLimit
    : "custom";
  const historyLimitIndex = HISTORY_LIMIT_OPTIONS.indexOf(historyLimitMode);
  const [customBooleanLimitDraft, setCustomBooleanLimitDraft] = useState(() => String(workspace.booleanTriangleLimit));
  // "Custom" stays chosen while the field is open, even when the typed value happens to equal a preset.
  const [booleanLimitCustomOpen, setBooleanLimitCustomOpen] = useState(() => booleanTriangleLimitPreset(workspace.booleanTriangleLimit) === null);
  const booleanLimitMode: BooleanTriangleLimitPreset | "custom" = booleanLimitCustomOpen ? "custom" : booleanTriangleLimitPreset(workspace.booleanTriangleLimit) ?? "custom";
  const formatSettingCount = (value: number) => value.toLocaleString(numberLocale());
  const scaleOptions = scaleOptionsForUnits(workspace.units);
  const scaleValue = normalizeScaleForUnits(workspace.units, workspace.scale);
  const gridColor = /^#[0-9a-f]{6}$/i.test(workspace.gridColor)
    ? workspace.gridColor
    : DEFAULT_WORKPLANE_WORKSPACE.gridColor;
  const hexOrDefault = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const backgroundColor = hexOrDefault(workspace.background, DEFAULT_WORKPLANE_WORKSPACE.background);
  const surfaceColor = hexOrDefault(workspace.surfaceColor, DEFAULT_WORKPLANE_WORKSPACE.surfaceColor);
  const edgeColor = hexOrDefault(workspace.edgeColor, DEFAULT_WORKPLANE_WORKSPACE.edgeColor);
  const sketchBackground = hexOrDefault(workspace.sketchBackground, DEFAULT_SKETCH_BACKGROUND);
  const sketchGridColor = hexOrDefault(workspace.sketchGridColor, DEFAULT_SKETCH_GRID_COLOR);
  const sketchPlateColor = hexOrDefault(workspace.sketchPlateColor, DEFAULT_SKETCH_PLATE_COLOR);
  const mainGridColor = hexOrDefault(workspace.gridColor, DEFAULT_WORKPLANE_WORKSPACE.gridColor);
  // The darker grid lines: their own colour, or by default the one the grid colour gives them (#143).
  const derivedGridMajorColor = workplaneGridPalette("light", gridColor).major.color;
  const gridMajorColor = /^#[0-9a-f]{6}$/i.test(workspace.gridMajorColor) ? workspace.gridMajorColor : derivedGridMajorColor;
  const selectedShapeAsset = toolbarShapeAssets.find((asset) => asset.kind === selectedShapeKind) ?? toolbarShapeAssets[0];
  const selectedShapeCustomization = workspace.shapeCustomizations[selectedShapeKind] ?? {};
  // A Gridfinity tray (#837) starts at a tray's size, as a new one is made, not at the bin's.
  const selectedShapeAppDefaults = selectedShapeKind === "gridfinity" && normalizeGridfinityType(selectedShapeCustomization.gridfinityType) === "tray" ? DEFAULT_GRIDFINITY_TRAY_SIZE : shapeAssetDefaultDimensions(selectedShapeKind);
  const selectedShapeEffectiveDimensions = {
    width: selectedShapeCustomization.width ?? selectedShapeAppDefaults.width,
    depth: selectedShapeCustomization.depth ?? selectedShapeAppDefaults.depth,
    height: selectedShapeCustomization.height ?? selectedShapeAppDefaults.height,
  };
  const selectedShapeSpecialFields = specialFieldsForShape(selectedShapeKind, selectedShapeEffectiveDimensions, selectedShapeCustomization);
  // Breite und Tiefe eines Gewindes folgen dem Durchmesser; nur die Hoehe
  // laesst sich sinnvoll vorgeben. Ein Zylinder ist immer kreisrund, daher
  // nur ein Durchmesser- (= Breiten-)Feld statt Breite und Tiefe getrennt.
  // Ein gebogenes Rohr bekommt seinen Rahmen ganz aus Profil und Segmenten.
  // Ein Uebergang bekommt Breite und Tiefe aus seinen beiden Enden, nur die Hoehe ist frei.
  const selectedShapeDimensionKeys: Array<"width" | "depth" | "height"> = selectedShapeKind === "bentTube"
    ? []
    : selectedShapeKind === "loft"
    ? ["height"]
    : selectedShapeKind === "thread"
    ? ["height"]
    : selectedShapeKind === "cylinder"
      ? ["width", "height"]
      : ["width", "depth", "height"];
  const selectedShapeCustomized = Object.keys(selectedShapeCustomization).length > 0;
  useEffect(() => {
    setDimensionDrafts({
      width: workspace.width.toFixed(workspace.accuracy),
      depth: workspace.depth.toFixed(workspace.accuracy),
    });
  }, [workspace.accuracy, workspace.depth, workspace.width]);
  useEffect(() => {
    setGridBlockSizeDraft(workspace.gridBlockSize.toFixed(workspace.accuracy));
  }, [workspace.accuracy, workspace.gridBlockSize]);
  useEffect(() => {
    if (typeof workspace.historyLimit === "number" && !isHistoryLimitPreset(workspace.historyLimit)) {
      setCustomHistoryDraft(String(workspace.historyLimit));
    }
  }, [workspace.historyLimit]);
  const patchWorkspace = (patch: Partial<WorkspaceSettings>) => {
    setDefaultSaved(false);
    const next = { ...workspace, ...patch };
    onWorkspaceChange({ ...next, scale: normalizeScaleForUnits(next.units, next.scale) });
  };
  const patchShapeCustomization = (kind: ShapeKind, patch: Partial<ShapeCustomization>) => {
    const nextEntry = Object.fromEntries(
      Object.entries({ ...workspace.shapeCustomizations[kind], ...patch }).filter(([, value]) => value !== undefined),
    ) as ShapeCustomization;
    const nextCustomizations = { ...workspace.shapeCustomizations };
    if (Object.keys(nextEntry).length > 0) nextCustomizations[kind] = nextEntry;
    else delete nextCustomizations[kind];
    patchWorkspace({ shapeCustomizations: nextCustomizations });
  };
  const setShapeDefaultDimension = (key: "width" | "depth" | "height", rawValue: string) => {
    const parsed = parseMeasurementInput(rawValue);
    if (!Number.isFinite(parsed)) return;
    const nextValue = clamp(parsed, MIN_CUSTOM_SHAPE_DIMENSION, MAX_CUSTOM_SHAPE_DIMENSION);
    patchShapeCustomization(selectedShapeKind, key === "width" && selectedShapeKind === "cone"
      ? { width: nextValue, baseRadius: nextValue / 2 }
      : key === "width" && selectedShapeKind === "cylinder"
        ? { width: nextValue, depth: nextValue }
        : { [key]: nextValue });
  };
  const setShapeSpecialNumber = (field: Extract<ShapeSpecialField, { type: "number" }>, rawValue: string) => {
    if (!rawValue.trim()) {
      patchShapeCustomization(selectedShapeKind, { [field.key]: undefined });
      return;
    }
    const parsed = parseMeasurementInput(rawValue);
    if (!Number.isFinite(parsed)) return;
    const clamped = clamp(parsed, field.min, field.max);
    const nextValue = field.step === 1 ? Math.round(clamped) : clamped;
    patchShapeCustomization(selectedShapeKind, field.key === "baseRadius" && selectedShapeKind === "cone"
      ? { baseRadius: nextValue, width: nextValue * 2 }
      : { [field.key]: nextValue });
  };
  const setShapeSpecialText = (field: Extract<ShapeSpecialField, { type: "text" }>, rawValue: string) => {
    const nextValue = rawValue.slice(0, field.maxLength);
    patchShapeCustomization(selectedShapeKind, { [field.key]: nextValue || undefined });
  };
  const setShapeLimit = (rawValue: string) => {
    if (!rawValue.trim()) {
      patchShapeCustomization(selectedShapeKind, { maxDimension: undefined });
      return;
    }
    const parsed = parseMeasurementInput(rawValue);
    if (!Number.isFinite(parsed)) return;
    patchShapeCustomization(selectedShapeKind, {
      maxDimension: clamp(parsed, MIN_CUSTOM_SHAPE_DIMENSION, MAX_CUSTOM_SHAPE_DIMENSION),
    });
  };
  const resetSelectedShapeCustomization = () => {
    const nextCustomizations = { ...workspace.shapeCustomizations };
    delete nextCustomizations[selectedShapeKind];
    patchWorkspace({ shapeCustomizations: nextCustomizations });
  };
  const setDimension = (key: "width" | "depth", value: string) => {
    const parsed = parseMeasurementInput(value);
    const next = clamp(Number.isFinite(parsed) ? parsed : workspace[key], MIN_WORKSPACE_SIZE, MAX_WORKSPACE_SIZE);
    setDimensionDrafts((current) => ({ ...current, [key]: next.toFixed(workspace.accuracy) }));
    // A size typed by hand is no longer the chosen printer's plate.
    patchWorkspace({ [key]: next, sizePreset: "Custom", printer: "" } as Partial<WorkspaceSettings>);
  };
  const setPrinter = (id: string) => {
    const printer = printerPresetById(id);
    if (!printer) {
      patchWorkspace({ printer: "" });
      return;
    }
    patchWorkspace({ printer: printer.id, width: printer.width, depth: printer.depth, sizePreset: "Custom" });
  };
  const chosenPrinter = printerPresetById(workspace.printer);
  const setWorkspaceSizePreset = (sizePreset: string) => {
    const preset = WORKSPACE_SIZE_PRESETS.find((entry) => entry.label === sizePreset);
    if (!preset || sizePreset === "Custom") {
      patchWorkspace({ sizePreset: "Custom" });
      return;
    }
    patchWorkspace({ sizePreset, width: preset.width, depth: preset.depth, printer: "" });
  };
  // Back to the grid the app starts with, here and in the default saved with "Make default" (#503).
  const resetGrid = () => {
    const standard = standardGridSettings(workspace.units);
    patchWorkspace(standard);
    setGridBlockSizeDraft(standard.gridBlockSize.toFixed(workspace.accuracy));
    resetGridInSavedDefault();
  };
  const setGridBlockPreset = (gridBlockPreset: string) => {
    patchWorkspace({ gridBlockPreset, gridBlockSize: gridBlockSizeForPreset(gridBlockPreset, workspace.gridBlockSize) });
  };
  const setGridBlockSize = (value: string) => {
    const parsed = parseMeasurementInput(value);
    const next = clamp(Number.isFinite(parsed) ? parsed : workspace.gridBlockSize, MIN_GRID_BLOCK_SIZE, MAX_GRID_BLOCK_SIZE);
    setGridBlockSizeDraft(next.toFixed(workspace.accuracy));
    patchWorkspace({ gridBlockPreset: "Custom", gridBlockSize: next });
  };
  const setHistoryLimitMode = (mode: (typeof HISTORY_LIMIT_OPTIONS)[number]) => {
    if (mode === "custom") {
      const parsed = Number.parseInt(customHistoryDraft, 10);
      patchWorkspace({ historyLimit: Number.isFinite(parsed) ? clamp(parsed, 1, 5000) : HISTORY_CUSTOM_DEFAULT });
      return;
    }
    patchWorkspace({ historyLimit: mode });
  };
  const setBooleanLimitMode = (mode: BooleanTriangleLimitPreset | "custom") => {
    if (mode === "custom") {
      // The free field starts from the current value, so picking "Custom" changes nothing yet.
      setCustomBooleanLimitDraft(String(workspace.booleanTriangleLimit));
      setBooleanLimitCustomOpen(true);
      return;
    }
    setBooleanLimitCustomOpen(false);
    const preset = BOOLEAN_TRIANGLE_LIMIT_PRESETS.find((entry) => entry.id === mode);
    if (preset) patchWorkspace({ booleanTriangleLimit: preset.limit });
  };
  const setCustomBooleanLimit = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    const next = Number.isFinite(parsed) ? Math.round(clamp(parsed, MIN_BOOLEAN_TRIANGLE_LIMIT, MAX_BOOLEAN_TRIANGLE_LIMIT)) : workspace.booleanTriangleLimit;
    setCustomBooleanLimitDraft(String(next));
    patchWorkspace({ booleanTriangleLimit: next });
  };
  // The window is moved by its title bar, like every other panel, and remembers where it stood.
  const movable = useMovablePanel<HTMLDivElement>("layerling.editor.settingsPosition", {
    floatingStyle: { position: "absolute", margin: 0 },
  });
  const setCustomHistoryLimit = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    const next = Number.isFinite(parsed) ? Math.round(clamp(parsed, 1, 5000)) : HISTORY_CUSTOM_DEFAULT;
    setCustomHistoryDraft(String(next));
    patchWorkspace({ historyLimit: next });
  };

  return (
    <div className="workspace-modal" role="dialog" aria-modal="true" aria-label={t("workspace.title")}>
      <div
        ref={movable.panelRef}
        className={`workspace-modal-card ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
        style={movable.style}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workspace-modal-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
          <strong>{t("workspace.title")}</strong>
          <div className="panel-header-actions">
            <GuideHelpLink section={SETTINGS_HELP_SECTION[activeSection]} />
            <button aria-label={t("workspace.close")} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="workspace-modal-layout">
          <nav className="workspace-settings-nav" aria-label={t("workspace.sections")}>
            <button className={activeSection === "appearance" ? "active" : ""} aria-current={activeSection === "appearance" ? "page" : undefined} onClick={() => setActiveSection("appearance")}>
              <Palette size={18} />
              <span>{t("workspace.appearance")}</span>
            </button>
            <button className={activeSection === "measurement" ? "active" : ""} aria-current={activeSection === "measurement" ? "page" : undefined} onClick={() => setActiveSection("measurement")}>
              <Ruler size={18} />
              <span>{t("workspace.measurement")}</span>
            </button>
            <button className={activeSection === "workplane" ? "active" : ""} aria-current={activeSection === "workplane" ? "page" : undefined} onClick={() => setActiveSection("workplane")}>
              <Grid3X3 size={18} />
              <span>{t("workspace.workplane")}</span>
            </button>
            <button className={activeSection === "shapes" ? "active" : ""} aria-current={activeSection === "shapes" ? "page" : undefined} onClick={() => setActiveSection("shapes")}>
              <BoxIcon size={18} />
              <span>{t("workspace.shapeDefaults")}</span>
            </button>
            <button className={activeSection === "history" ? "active" : ""} data-help={t("workspace.savedHistory")} aria-current={activeSection === "history" ? "page" : undefined} onClick={() => setActiveSection("history")}>
              <History size={18} />
              <span>{t("workspace.history")}</span>
            </button>
          </nav>

          <div className="workspace-modal-content">
            <div className="workspace-modal-body">
              {activeSection === "appearance" ? (
                <>
                  <div className="workspace-section-heading">
                    <strong>{t("workspace.appearance")}</strong>
                    <span>{t("workspace.appearanceHint")}</span>
                  </div>
                  <SimpleModeSetting />
                  <WorkspaceToggle
                    label={t("workspace.fastMode")}
                    description={t("workspace.fastModeHint")}
                    checked={workspace.fastMode}
                    onChange={(fastMode) => patchWorkspace({ fastMode })}
                  />
                  <label className="workspace-select" data-help={t("workspace.theme")}>
                    <span>{t("workspace.theme")}</span>
                    <select
                      value={themePreference}
                      onChange={(event) => onThemePreferenceChange?.(event.currentTarget.value as AppThemePreference)}
                    >
                      {APP_THEME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(THEME_LABEL_KEYS[option.value])}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="workspace-select" data-help={t("workspace.toolbarSize")}>
                    <span>{t("workspace.toolbarSize")}</span>
                    <select
                      value={toolbarSize}
                      onChange={(event) => setToolbarSize(event.currentTarget.value as ToolbarSize)}
                    >
                      {TOOLBAR_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {t(TOOLBAR_SIZE_LABEL_KEYS[size])}
                        </option>
                      ))}
                    </select>
                  </label>
                  <WorkspaceToggle
                    label={t("workspace.shapeColors")}
                    description={t("workspace.shapeColorsHint")}
                    checked={shapeColors}
                    onChange={setShapeColors}
                  />
                  <label className="workspace-select view-cube-position-setting" data-help={t("workspace.viewCubePosition")}>
                    <span>{t("workspace.viewCubePosition")}</span>
                    <select
                      value={viewCubePosition}
                      onChange={(event) => setViewCubePosition(event.currentTarget.value as ViewCubePosition)}
                    >
                      {VIEW_CUBE_POSITION_OPTIONS.map((position) => (
                        <option key={position} value={position}>
                          {t(VIEW_CUBE_POSITION_LABEL_KEYS[position])}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ColorSettingControl
                    label={t("workspace.backgroundColor")}
                    color={backgroundColor}
                    defaultColor={DEFAULT_WORKPLANE_WORKSPACE.background}
                    presets={BACKGROUND_COLOR_PRESETS}
                    onChange={(background) => patchWorkspace({ background })}
                  />
                  <ColorSettingControl
                    label={t("workspace.surfaceColor")}
                    color={surfaceColor}
                    defaultColor={DEFAULT_WORKPLANE_WORKSPACE.surfaceColor}
                    presets={SURFACE_COLOR_PRESETS}
                    onChange={(nextSurface) => patchWorkspace({ surfaceColor: nextSurface })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.showAxes")}
                    description={t("workspace.showAxesHint")}
                    checked={workspace.showAxes}
                    onChange={(showAxes) => patchWorkspace({ showAxes })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.edgeLines")}
                    description={workspace.fastMode ? t("workspace.offInFastMode") : t("workspace.edgeLinesHint")}
                    checked={workspace.edgeLines && !workspace.fastMode}
                    disabled={workspace.fastMode}
                    onChange={(edgeLines) => patchWorkspace({ edgeLines })}
                  />
                  <ColorSettingControl
                    label={t("workspace.edgeColor")}
                    color={edgeColor}
                    defaultColor={DEFAULT_WORKPLANE_WORKSPACE.edgeColor}
                    presets={EDGE_COLOR_PRESETS}
                    disabled={!workspace.edgeLines || workspace.fastMode}
                    onChange={(nextEdgeColor) => patchWorkspace({ edgeColor: nextEdgeColor })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.strongHoles")}
                    description={t("workspace.strongHolesHint")}
                    checked={workspace.strongHoles}
                    onChange={(strongHoles) => patchWorkspace({ strongHoles })}
                  />
                  <ColorSettingControl
                    label={t("workspace.sketchBackground")}
                    color={sketchBackground}
                    defaultColor={DEFAULT_SKETCH_BACKGROUND}
                    presets={SKETCH_BACKGROUND_PRESETS}
                    onChange={(nextBackground) => patchWorkspace({ sketchBackground: nextBackground })}
                  />
                  <ColorSettingControl
                    label={t("workspace.sketchPlateColor")}
                    color={sketchPlateColor}
                    defaultColor={DEFAULT_SKETCH_PLATE_COLOR}
                    presets={SKETCH_BACKGROUND_PRESETS}
                    onChange={(nextPlate) => patchWorkspace({ sketchPlateColor: nextPlate })}
                  />
                  <ColorSettingControl
                    label={t("workspace.sketchGridColor")}
                    color={sketchGridColor}
                    defaultColor={DEFAULT_SKETCH_GRID_COLOR}
                    presets={SKETCH_GRID_PRESETS}
                    onChange={(nextGrid) => patchWorkspace({ sketchGridColor: nextGrid })}
                  />
                  <div className="property-defaults-actions">
                    <button
                      type="button"
                      title={t("workspace.sketchMatchHint")}
                      disabled={sketchBackground === backgroundColor && sketchGridColor === mainGridColor && sketchPlateColor === surfaceColor}
                      onClick={() => patchWorkspace({ sketchBackground: backgroundColor, sketchGridColor: mainGridColor, sketchPlateColor: surfaceColor })}
                    >
                      {t("workspace.sketchMatch")}
                    </button>
                  </div>
                  <hr className="workspace-divider" />
                  <WorkspaceToggle
                    label={t("workspace.showMoveDimensions")}
                    checked={moveDimensionsEnabled}
                    onChange={onMoveDimensionsEnabledChange}
                  />
                  <WorkspaceToggle
                    label={t("workspace.showOriginDimensions")}
                    checked={originDimensionsEnabled}
                    onChange={onOriginDimensionsEnabledChange}
                  />
                  <WorkspaceToggle
                    label={t("workspace.dimensionsAlwaysVisible")}
                    checked={workspace.dimensionsAlwaysVisible}
                    onChange={(dimensionsAlwaysVisible) => patchWorkspace({ dimensionsAlwaysVisible })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.showRotationAngles")}
                    checked={workspace.showRotationAngles}
                    onChange={(showRotationAngles) => patchWorkspace({ showRotationAngles })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.startInPerspective")}
                    checked={startInPerspective}
                    onChange={onStartInPerspectiveChange}
                  />
                  <div className="workspace-reset-row" data-help={t("workspace.startViewHint")}>
                    <span>{t("workspace.startView")}</span>
                    <div className="property-defaults-actions">
                      <button type="button" title={t("workspace.startViewHint")} onClick={onSaveStartView}>
                        {t("workspace.startViewUseCurrent")}
                      </button>
                      <button type="button" disabled={!hasStartView} onClick={onResetStartView}>
                        <RotateCcw size={14} />
                        <span>{t("workspace.startViewStandard")}</span>
                      </button>
                    </div>
                  </div>
                  <WorkspaceToggle
                    label={t("workspace.selectBeforeMoving")}
                    checked={workspace.selectBeforeMove}
                    onChange={(selectBeforeMove) => patchWorkspace({ selectBeforeMove })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.frameByDirection")}
                    description={t("workspace.frameByDirectionHint")}
                    checked={workspace.frameByDirection}
                    onChange={(frameByDirection) => patchWorkspace({ frameByDirection })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.pasteCentered")}
                    description={t("workspace.pasteCenteredHint")}
                    checked={workspace.pasteCentered}
                    onChange={(pasteCentered) => patchWorkspace({ pasteCentered })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.doubleClickOpensSketch")}
                    checked={workspace.doubleClickOpensSketch}
                    onChange={(doubleClickOpensSketch) => patchWorkspace({ doubleClickOpensSketch })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.doubleClickOpensGroup")}
                    checked={workspace.doubleClickOpensGroup}
                    onChange={(doubleClickOpensGroup) => patchWorkspace({ doubleClickOpensGroup })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.doubleClickCentersView")}
                    checked={workspace.doubleClickCentersView}
                    onChange={(doubleClickCentersView) => patchWorkspace({ doubleClickCentersView })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.objectSnap")}
                    checked={workspace.objectSnap}
                    onChange={(objectSnap) => patchWorkspace({ objectSnap })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.stlAsDownload")}
                    description={t("workspace.stlAsDownloadHint")}
                    checked={workspace.stlAsDownload}
                    onChange={(stlAsDownload) => patchWorkspace({ stlAsDownload })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.confirmTabClose")}
                    description={t("workspace.confirmTabCloseHint")}
                    checked={workspace.confirmTabClose}
                    onChange={(confirmTabClose) => patchWorkspace({ confirmTabClose })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.showShadows")}
                    description={workspace.fastMode ? t("workspace.offInFastMode") : undefined}
                    checked={workspace.showShadows && !workspace.fastMode}
                    disabled={workspace.fastMode}
                    onChange={(showShadows) => patchWorkspace({ showShadows })}
                  />
                  <label className="workspace-range" data-help={t("workspace.shadowStrength")}>
                    <span>{t("workspace.shadowStrength")}: {workspace.shadowStrength} %</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={workspace.shadowStrength}
                      disabled={!workspace.showShadows || workspace.fastMode}
                      onChange={(event) => patchWorkspace({ shadowStrength: Number(event.currentTarget.value) })}
                      onDoubleClick={() => patchWorkspace({ shadowStrength: DEFAULT_WORKPLANE_WORKSPACE.shadowStrength })}
                    />
                  </label>
                  <label className="workspace-range" data-help={t("workspace.shadowSoftness")}>
                    <span>{t("workspace.shadowSoftness")}: {workspace.shadowSoftness} %</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={workspace.shadowSoftness}
                      disabled={!workspace.showShadows || workspace.fastMode}
                      onChange={(event) => patchWorkspace({ shadowSoftness: Number(event.currentTarget.value) })}
                      onDoubleClick={() => patchWorkspace({ shadowSoftness: DEFAULT_WORKPLANE_WORKSPACE.shadowSoftness })}
                    />
                    <small>
                      <span>{t("workspace.shadowCrisp")}</span>
                      <span>{t("workspace.shadowSoft")}</span>
                    </small>
                  </label>
                  <label className="workspace-range" data-help={t("workspace.lightAzimuth")}>
                    <span>{t("workspace.lightAzimuth")}: {workspace.lightAzimuth}°</span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={5}
                      value={workspace.lightAzimuth}
                      onChange={(event) => patchWorkspace({ lightAzimuth: Number(event.currentTarget.value) })}
                      onDoubleClick={() => patchWorkspace({ lightAzimuth: DEFAULT_WORKPLANE_WORKSPACE.lightAzimuth })}
                    />
                    <small>
                      <span>{t("workspace.lightFromLeft")}</span>
                      <span>{t("workspace.lightFromFront")}</span>
                      <span>{t("workspace.lightFromRight")}</span>
                    </small>
                  </label>
                  <label className="workspace-range" data-help={t("workspace.lightElevation")}>
                    <span>{t("workspace.lightElevation")}: {workspace.lightElevation}°</span>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={workspace.lightElevation}
                      onChange={(event) => patchWorkspace({ lightElevation: Number(event.currentTarget.value) })}
                      onDoubleClick={() => patchWorkspace({ lightElevation: DEFAULT_WORKPLANE_WORKSPACE.lightElevation })}
                    />
                    <small>
                      <span>{t("workspace.lightLow")}</span>
                      <span>{t("workspace.lightAbove")}</span>
                    </small>
                  </label>
                  <WorkspaceToggle
                    label={t("workspace.softLighting")}
                    description={t("workspace.softLightingHint")}
                    checked={workspace.softLighting}
                    onChange={(softLighting) => patchWorkspace({ softLighting })}
                  />
                  <label className="workspace-range" data-help={t("workspace.shadeContrast")}>
                    <span>{t("workspace.shadeContrast")}: {workspace.shadeContrast}</span>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={5}
                      value={workspace.shadeContrast}
                      onChange={(event) => patchWorkspace({ shadeContrast: Number(event.currentTarget.value) })}
                      onDoubleClick={() => patchWorkspace({ shadeContrast: DEFAULT_WORKPLANE_WORKSPACE.shadeContrast })}
                    />
                    <small>
                      <span>{t("workspace.shadeSoft")}</span>
                      <span>{t("workspace.shadePunchy")}</span>
                    </small>
                  </label>
                  <div className="property-defaults-actions">
                    <button
                      type="button"
                      disabled={(["shadowStrength", "shadowSoftness", "shadeContrast", "lightAzimuth", "lightElevation", "softLighting"] as const).every((key) => workspace[key] === DEFAULT_WORKPLANE_WORKSPACE[key])}
                      onClick={() => patchWorkspace({
                        shadowStrength: DEFAULT_WORKPLANE_WORKSPACE.shadowStrength,
                        shadowSoftness: DEFAULT_WORKPLANE_WORKSPACE.shadowSoftness,
                        shadeContrast: DEFAULT_WORKPLANE_WORKSPACE.shadeContrast,
                        lightAzimuth: DEFAULT_WORKPLANE_WORKSPACE.lightAzimuth,
                        lightElevation: DEFAULT_WORKPLANE_WORKSPACE.lightElevation,
                        softLighting: DEFAULT_WORKPLANE_WORKSPACE.softLighting,
                      })}
                    >
                      {t("workspace.lightReset")}
                    </button>
                    <button
                      type="button"
                      title={t("workspace.classicLookHint")}
                      onClick={() => patchWorkspace(classicLookPatch(workspace))}
                    >
                      {t("workspace.classicLook")}
                    </button>
                  </div>
                  <label className="workspace-range" data-help={t("workspace.overhangAngle", { angle: "{angle}" })}>
                    <span>{t("workspace.overhangAngle", { angle: workspace.overhangAngle })}</span>
                    <input
                      type="range"
                      min={MIN_OVERHANG_ANGLE}
                      max={MAX_OVERHANG_ANGLE}
                      step={5}
                      value={workspace.overhangAngle}
                      onChange={(event) => patchWorkspace({ overhangAngle: Number(event.currentTarget.value) })}
                      onDoubleClick={() => patchWorkspace({ overhangAngle: DEFAULT_WORKPLANE_WORKSPACE.overhangAngle })}
                    />
                    <small>
                      <span>{t("workspace.overhangStrict")}</span>
                      <span>{t("workspace.overhangLoose")}</span>
                    </small>
                  </label>
                  <WorkspaceToggle
                    label={t("workspace.cruise")}
                    checked={workspace.clickToPlaceShapes}
                    onChange={(clickToPlaceShapes) => patchWorkspace({ clickToPlaceShapes })}
                  />
                  <label className="workspace-range" data-help={t("workspace.zoomSpeed")}>
                    <span>{t("workspace.zoomSpeed")}</span>
                    <input
                      type="range"
                      min={1}
                      max={ZOOM_SPEED_SLIDER_MAX}
                      value={workspace.zoomSpeed}
                      onChange={(event) => patchWorkspace({ zoomSpeed: Number(event.currentTarget.value) })}
                      onDoubleClick={() => patchWorkspace({ zoomSpeed: DEFAULT_WORKPLANE_WORKSPACE.zoomSpeed })}
                    />
                    <small>
                      <span>{t("workspace.slow")}</span>
                      <span>{t("workspace.fast")}</span>
                    </small>
                  </label>
                  <label className="workspace-select" data-help={t("workspace.mouseScheme")}>
                    <span>{t("workspace.mouseScheme")}</span>
                    <select
                      value={workspace.mouseScheme}
                      onChange={(event) => patchWorkspace({ mouseScheme: event.currentTarget.value === "slicer" ? "slicer" : "layerling" })}
                    >
                      <option value="layerling">{t("workspace.mouseSchemeLayerling")}</option>
                      <option value="slicer">{t("workspace.mouseSchemeSlicer")}</option>
                    </select>
                    <small>{workspace.mouseScheme === "slicer" ? t("workspace.mouseSchemeSlicerHint") : t("workspace.mouseSchemeLayerlingHint")}</small>
                  </label>
                  <SpaceMouseSetting />
                  <WorkspaceToggle
                    label={t("workspace.cameraInertia")}
                    description={workspace.fastMode ? t("workspace.offInFastMode") : t("workspace.cameraInertiaHint")}
                    checked={workspace.cameraInertia && !workspace.fastMode}
                    disabled={workspace.fastMode}
                    onChange={(cameraInertia) => patchWorkspace({ cameraInertia })}
                  />
                  <label className="workspace-select" data-help={t("workspace.booleanTriangleLimit")}>
                    <span>{t("workspace.booleanTriangleLimit")}</span>
                    <select
                      value={booleanLimitMode}
                      onChange={(event) => setBooleanLimitMode(event.currentTarget.value as BooleanTriangleLimitPreset | "custom")}
                    >
                      {BOOLEAN_TRIANGLE_LIMIT_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {t(BOOLEAN_LIMIT_PRESET_LABEL_KEYS[preset.id], { count: formatSettingCount(preset.limit) })}
                        </option>
                      ))}
                      <option value="custom">{t("workspace.custom")}</option>
                    </select>
                  </label>
                  {booleanLimitMode === "custom" ? (
                    <label className="workspace-history-custom">
                      <span>{t("workspace.booleanTriangleLimitCustom")}</span>
                      <input
                        type="number"
                        min={MIN_BOOLEAN_TRIANGLE_LIMIT}
                        max={MAX_BOOLEAN_TRIANGLE_LIMIT}
                        step={BOOLEAN_TRIANGLE_LIMIT_STEP}
                        value={customBooleanLimitDraft}
                        onChange={(event) => setCustomBooleanLimitDraft(event.currentTarget.value)}
                        onBlur={(event) => setCustomBooleanLimit(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                      />
                    </label>
                  ) : null}
                  <p className="workspace-history-note">{t("workspace.booleanTriangleLimitNote")}</p>
                </>
              ) : null}

              {activeSection === "measurement" ? (
                <>
                  <div className="workspace-section-heading">
                    <strong>{t("workspace.measurement")}</strong>
                    <span>{t("workspace.measurementHint")}</span>
                  </div>
                  <WorkspaceSelect
                    label={t("workspace.units")}
                    value={workspace.units}
                    options={WORKSPACE_UNIT_OPTIONS}
                    optionLabel={measurementOptionLabel}
                    onChange={(units) => {
                      patchWorkspace(workspaceForUnits(workspace, units));
                      const nextSnap = snapGridForUnits(units, snap);
                      if (nextSnap !== snap) onSnapChange(nextSnap);
                    }}
                  />
                  {workspace.units === "Imperial" ? (
                    <WorkspaceSelect
                      label={t("workspace.inchFormat")}
                      value={workspace.inchFormat}
                      options={["fraction", "decimal"]}
                      optionLabel={(value) => t(value === "decimal" ? "workspace.inchFormatDecimal" : "workspace.inchFormatFraction")}
                      onChange={(inchFormat) => patchWorkspace({ inchFormat: inchFormat === "decimal" ? "decimal" : "fraction" })}
                    />
                  ) : null}
                  <WorkspaceSelect
                    label={t("workspace.scale")}
                    value={scaleValue}
                    options={scaleOptions}
                    optionLabel={measurementOptionLabel}
                    onChange={(scale) => patchWorkspace({ scale })}
                  />
                  <WorkspaceSelect
                    label={t("workspace.accuracy")}
                    value={`0.${"0".repeat(workspace.accuracy)}`}
                    options={["0.0", "0.00", "0.000"]}
                    onChange={(accuracy) => patchWorkspace({ accuracy: accuracy.slice(2).length as WorkspaceSettings["accuracy"] })}
                  />
                  <WorkspaceSelect
                    label={t("workspace.snapGrid")}
                    value={snap}
                    options={snapGridOptions(workspace.units, workspace.customSnapGrids)}
                    optionLabel={(option) => customSnapGridLabel(option, workspace.customSnapGrids) ?? measurementOptionLabel(option)}
                    onChange={(next) => {
                      setDefaultSaved(false);
                      onSnapChange(next as GridSize);
                    }}
                  />
                  <CustomSnapGridList
                    grids={workspace.customSnapGrids}
                    onChange={(customSnapGrids, resized) => {
                      patchWorkspace({ customSnapGrids });
                      // The step in use follows its measure: resized with it, back to the usual step when it goes.
                      const current = parseCustomSnapGrid(snap);
                      if (!current) return;
                      const owner = customSnapGrids.find((grid) => grid.size === (resized && resized.from === current.size ? resized.to : current.size));
                      // Only the whole measure is offered now: a half or quarter in use goes to the whole.
                      if (owner && !customSnapGridDivisors(owner).includes(current.divisor)) onSnapChange(customSnapGridSize(owner.size, 1));
                      else if (resized && resized.from === current.size) onSnapChange(customSnapGridSize(resized.to, current.divisor));
                      else if (!customSnapGrids.some((grid) => grid.size === current.size)) onSnapChange(workspace.units === "Imperial" ? "1/8 in" : DEFAULT_SNAP_GRID);
                    }}
                  />
                </>
              ) : null}

              {activeSection === "workplane" ? (
                <>
                  <div className="workspace-section-heading">
                    <strong>{t("workspace.workplane")}</strong>
                    <span>{t("workspace.workplaneHint")}</span>
                  </div>
                  <label className="workspace-select" data-help={t("workspace.printer")}>
                    <span>{t("workspace.printer")}</span>
                    <select value={chosenPrinter?.id ?? ""} onChange={(event) => setPrinter(event.currentTarget.value)}>
                      <option value="">{t("workspace.printerNone")}</option>
                      {PRINTER_VENDORS.map((vendor) => (
                        <optgroup key={vendor} label={vendor}>
                          {(PRINTERS_BY_VENDOR.get(vendor) ?? []).map((preset) => (
                            <option key={preset.id} value={preset.id}>{`${preset.vendor} ${preset.model}`}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <p className="workspace-printer-info">
                    {chosenPrinter
                      ? chosenPrinter.round
                        ? t("workspace.printerInfoRound", { diameter: chosenPrinter.width, height: chosenPrinter.height })
                        : t("workspace.printerInfo", { width: chosenPrinter.width, depth: chosenPrinter.depth, height: chosenPrinter.height })
                      : t("workspace.printerHint")}
                  </p>
                  <WorkspaceToggle
                    label={t("workspace.showPlateLabels")}
                    description={t("workspace.showPlateLabelsHint")}
                    checked={workspace.showPlateLabels}
                    onChange={(showPlateLabels) => patchWorkspace({ showPlateLabels })}
                  />
                  <WorkspaceToggle
                    label={t("workspace.gridLinesGrow")}
                    description={t("workspace.gridLinesGrowHint")}
                    checked={workspace.gridLinesGrow}
                    onChange={(gridLinesGrow) => patchWorkspace({ gridLinesGrow })}
                  />
                  <WorkspaceSelect
                    label={t("workspace.size")}
                    value={workspace.sizePreset}
                    options={WORKSPACE_SIZE_PRESETS.map((preset) => preset.label)}
                    optionLabel={gridBlockPresetLabel}
                    onChange={setWorkspaceSizePreset}
                  />
                  <div className="workspace-dimensions">
                    <label data-help={t("workspace.size")}>
                      <span>{t("workspace.width")}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        onFocus={(event) => selectWholeValue(event.currentTarget)}
                        value={dimensionDrafts.width}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setDimensionDrafts((current) => ({ ...current, width: value }));
                        }}
                        onBlur={(event) => setDimension("width", event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                      />
                    </label>
                    <label data-help={t("workspace.size")}>
                      <span>{t("workspace.length")}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        onFocus={(event) => selectWholeValue(event.currentTarget)}
                        value={dimensionDrafts.depth}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setDimensionDrafts((current) => ({ ...current, depth: value }));
                        }}
                        onBlur={(event) => setDimension("depth", event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                      />
                    </label>
                  </div>
                  <WorkspaceToggle
                    label={t("workspace.showGrid")}
                    checked={workspace.showGrid}
                    onChange={(showGrid) => patchWorkspace({ showGrid })}
                  />
                  <WorkspaceSelect label={t("workspace.gridBlockSize")} value={workspace.gridBlockPreset} options={workspace.units === "Imperial" ? [...IMPERIAL_GRID_BLOCK_PRESETS, "Custom"] : GRID_BLOCK_PRESETS}
                    optionLabel={gridBlockPresetLabel} onChange={setGridBlockPreset} />
                  <ColorSettingControl
                    label={t("workspace.gridColor")}
                    color={gridColor}
                    defaultColor={DEFAULT_WORKPLANE_WORKSPACE.gridColor}
                    presets={GRID_COLOR_PRESETS}
                    onChange={(nextGridColor) => patchWorkspace({ gridColor: nextGridColor })}
                  />
                  {workspace.units === "Imperial" ? null : (
                    <WorkspaceSelect
                      label={t("workspace.gridMajorEvery")}
                      value={String(workspace.gridMajorInterval === 10 ? 10 : 5)}
                      options={["5", "10"]}
                      optionLabel={(option) => t("workspace.gridMajorSteps", { count: Number(option) })}
                      onChange={(option) => patchWorkspace({ gridMajorInterval: option === "10" ? 10 : 5 })}
                    />
                  )}
                  <ColorSettingControl
                    label={t("workspace.gridMajorColor")}
                    color={gridMajorColor}
                    defaultColor={derivedGridMajorColor}
                    presets={GRID_COLOR_PRESETS}
                    onChange={(nextColor) => patchWorkspace({ gridMajorColor: nextColor.toLowerCase() === derivedGridMajorColor.toLowerCase() ? "" : nextColor })}
                  />
                  {workspace.gridBlockPreset === "Custom" ? (
                    <div className="workspace-dimensions workspace-grid-dimensions">
                      <label>
                        <span>{t("workspace.blockSize")}</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          onFocus={(event) => selectWholeValue(event.currentTarget)}
                          value={gridBlockSizeDraft}
                          onChange={(event) => setGridBlockSizeDraft(event.currentTarget.value)}
                          onBlur={(event) => setGridBlockSize(event.currentTarget.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                        />
                      </label>
                    </div>
                  ) : null}
                  <div className="workspace-reset-row">
                    <span>{t("workspace.resetGridHint")}</span>
                    <button type="button" onClick={resetGrid}>
                      <RotateCcw size={14} />
                      <span>{t("workspace.resetGrid")}</span>
                    </button>
                  </div>
                </>
              ) : null}

              {activeSection === "shapes" ? (
                <>
                  <div className="workspace-section-heading">
                    <strong>{t("workspace.shapeDefaults")}</strong>
                    <span>{t("workspace.shapeDefaultsHint")}</span>
                  </div>
                  <label className="workspace-shape-picker">
                    <span>{t("workspace.shape")}</span>
                    <span className="workspace-shape-picker-control">
                      <img src={selectedShapeAsset.menuIcon} alt="" />
                      <select value={selectedShapeKind} onChange={(event) => setSelectedShapeKind(event.currentTarget.value as ShapeKind)}>
                        {toolbarShapeAssets.map((asset) => (
                          <option key={asset.kind} value={asset.kind}>
                            {shapeAssetLabel(asset)}{workspace.shapeCustomizations[asset.kind] ? t("workspace.customizedSuffix") : ""}
                          </option>
                        ))}
                      </select>
                    </span>
                  </label>
                  <div className="workspace-shape-card">
                    <div className="workspace-shape-card-heading">
                      <span>
                        <strong>{shapeAssetLabel(selectedShapeAsset)}</strong>
                        <small>{selectedShapeCustomized ? t("workspace.customActive") : t("workspace.usingDefaults")}</small>
                      </span>
                      <button type="button" onClick={resetSelectedShapeCustomization} disabled={!selectedShapeCustomized}>
                        <RotateCcw size={14} />
                        <span>{t("workspace.useAppDefaults")}</span>
                      </button>
                    </div>
                    <div className="workspace-shape-dimensions">
                      {selectedShapeDimensionKeys.map((key) => (
                        <label data-help={t("workspace.shapeDefaults")} key={`${selectedShapeKind}-${key}`}>
                          <span>{t(key === "depth" ? "prop.length" : key === "width" ? (selectedShapeKind === "cylinder" ? "prop.diameter" : "prop.width") : "prop.height")}</span>
                          <input
                            key={`${selectedShapeKind}-${key}-${selectedShapeCustomization[key] ?? "app"}`}
                            type="text"
                            inputMode="decimal"
                            onFocus={(event) => selectWholeValue(event.currentTarget)}
                            defaultValue={(selectedShapeCustomization[key] ?? selectedShapeAppDefaults[key]).toFixed(workspace.accuracy)}
                            onBlur={(event) => setShapeDefaultDimension(key, event.currentTarget.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.currentTarget.blur();
                            }}
                          />
                          <small>{t("workspace.appDefault", { value: `${selectedShapeAppDefaults[key]} mm` })}</small>
                        </label>
                      ))}
                    </div>
                    {selectedShapeSpecialFields.length > 0 ? (
                      <div className="workspace-shape-specials">
                        <div className="workspace-shape-specials-heading">
                          <strong>{t("workspace.shapeDetails")}</strong>
                          <small>{t("workspace.shapeDetailsHint")}</small>
                        </div>
                        <div className="workspace-shape-special-fields">
                          {selectedShapeSpecialFields.map((field) => {
                            const customizedValue = selectedShapeCustomization[field.key];
                            const effectiveValue = customizedValue ?? field.defaultValue;
                            if (field.type === "select") {
                              return (
                                <label data-help={t("workspace.shapeDefaults")} key={`${selectedShapeKind}-${field.key}`}>
                                  <span>{field.label}</span>
                                  <select
                                    value={String(effectiveValue)}
                                    onChange={(event) => patchShapeCustomization(selectedShapeKind, { [field.key]: event.currentTarget.value })}
                                  >
                                    {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </select>
                                  <small>{t("workspace.appDefault", {
                                    value: field.options.find((option) => option.value === field.defaultValue)?.label ?? field.defaultValue,
                                  })}</small>
                                </label>
                              );
                            }
                            if (field.type === "text") {
                              return (
                                <label data-help={t("workspace.shapeDefaults")} key={`${selectedShapeKind}-${field.key}`}>
                                  <span>{field.label}</span>
                                  <input
                                    key={`${selectedShapeKind}-${field.key}-${String(customizedValue ?? "app")}`}
                                    type="text"
                                    maxLength={field.maxLength}
                                    defaultValue={String(effectiveValue)}
                                    onBlur={(event) => setShapeSpecialText(field, event.currentTarget.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") event.currentTarget.blur();
                                    }}
                                  />
                                  <small>{t("workspace.appDefault", { value: field.defaultValue })}</small>
                                </label>
                              );
                            }
                            const numericValue = Number(effectiveValue);
                            return (
                              <label data-help={t("workspace.shapeDefaults")} key={`${selectedShapeKind}-${field.key}`}>
                                <span>{field.label}</span>
                                <input
                                  key={`${selectedShapeKind}-${field.key}-${String(customizedValue ?? "app")}-${field.defaultValue}`}
                                  type="text"
                                  inputMode="decimal"
                                  onFocus={(event) => selectWholeValue(event.currentTarget)}
                                  defaultValue={field.step === 1 ? String(Math.round(numericValue)) : numericValue.toFixed(workspace.accuracy)}
                                  onBlur={(event) => setShapeSpecialNumber(field, event.currentTarget.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") event.currentTarget.blur();
                                  }}
                                />
                                <small>{t("workspace.appDefault", {
                                    value: `${field.step === 1 ? Math.round(field.defaultValue) : Number(field.defaultValue.toFixed(workspace.accuracy))}${field.unit ? ` ${field.unit}` : ""}`,
                                  })}</small>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    <label className="workspace-shape-limit" data-help={t("workspace.customLimit")}>
                      <span>
                        <strong>{t("workspace.customLimit")}</strong>
                        <small>{t("workspace.customLimitHint")}</small>
                      </span>
                      <input
                        key={`${selectedShapeKind}-limit-${selectedShapeCustomization.maxDimension ?? "app"}`}
                        type="text"
                        inputMode="decimal"
                        onFocus={(event) => selectWholeValue(event.currentTarget)}
                        defaultValue={selectedShapeCustomization.maxDimension?.toFixed(workspace.accuracy) ?? ""}
                        placeholder={t("workspace.appLimits")}
                        onBlur={(event) => setShapeLimit(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                      />
                    </label>
                    <p className="workspace-shape-note">{t("workspace.shapeNote", { max: MAX_CUSTOM_SHAPE_DIMENSION })}</p>
                  </div>
                </>
              ) : null}

              {activeSection === "history" ? (
                <>
                  <div className="workspace-section-heading">
                    <strong>{t("workspace.savedHistory")}</strong>
                    <span>{t("workspace.savedHistoryHint")}</span>
                  </div>
                  <div className="workspace-history-setting">
                    <div
                      className="workspace-history-range-control"
                      data-limit={String(historyLimitMode)}
                    >
                      <input
                        type="range"
                        min={0}
                        max={HISTORY_LIMIT_OPTIONS.length - 1}
                        step={1}
                        value={historyLimitIndex}
                        aria-label={t("workspace.historyActions")}
                        data-help={t("workspace.savedHistory")}
                        aria-valuetext={historyLimitMode === "unlimited"
                          ? t("workspace.unlimited")
                          : t("export.actionCount", { count: historyLimitMode === "custom" ? String(workspace.historyLimit) : historyLimitMode })}
                        onChange={(event) => setHistoryLimitMode(HISTORY_LIMIT_OPTIONS[Number(event.currentTarget.value)] ?? "unlimited")}
                      />
                    </div>
                    <div className="workspace-history-labels" aria-hidden="true">
                      {HISTORY_LIMIT_OPTIONS.map((option) => (
                        <span key={option} className={historyLimitMode === option ? "active" : undefined}>
                          {option === "unlimited" ? t("workspace.unlimited") : option === "custom" ? t("workspace.custom") : option}
                        </span>
                      ))}
                    </div>
                    {historyLimitMode === "custom" ? (
                      <label className="workspace-history-custom">
                        <span>{t("workspace.actionsToRetain")}</span>
                        <input
                          type="number"
                          min={1}
                          max={5000}
                          step={1}
                          value={customHistoryDraft}
                          onChange={(event) => setCustomHistoryDraft(event.currentTarget.value)}
                          onBlur={(event) => setCustomHistoryLimit(event.currentTarget.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                        />
                      </label>
                    ) : null}
                    <p className="workspace-history-note">
                      {t("workspace.historyNote", { count: DEFAULT_WORKPLANE_WORKSPACE.historyLimit })}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            <div className="workspace-modal-footer">
              <span className="workspace-footer-hint">{t("workspace.footerHint")}</span>
              <div className="workspace-footer-buttons">
                {savedDefault ? (
                  <button
                    className="make-default-button"
                    title={t("workspace.useMyDefaultHint")}
                    onClick={() => {
                      const next = workspaceWithSavedDefault(workspace, savedDefault.workspace);
                      setGridBlockSizeDraft(next.gridBlockSize.toFixed(next.accuracy));
                      onWorkspaceChange({ ...next, scale: normalizeScaleForUnits(next.units, next.scale) });
                    }}
                  >
                    {t("workspace.useMyDefault")}
                  </button>
                ) : null}
                <button
                  className="make-default-button"
                  onClick={() => {
                    onMakeDefault();
                    setDefaultSaved(true);
                  }}
                >
                  {defaultSaved ? t("workspace.defaultSaved") : t("workspace.makeDefault")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button className="workspace-modal-backdrop" aria-label={t("workspace.close")} onClick={onClose} />
    </div>
  );
}

const GRID_COLOR_PRESETS = [
  DEFAULT_WORKPLANE_WORKSPACE.gridColor,
  "#0e69f1",
  "#23a66f",
  "#e0842f",
  "#dc5252",
  "#945bd4",
  "#718695",
] as const;

// The light theme's own cream first, then neutral and cool grounds.
const BACKGROUND_COLOR_PRESETS = [
  DEFAULT_WORKPLANE_WORKSPACE.background,
  "#ffffff",
  "#f1f1f1",
  "#dfe4e8",
  "#c4cad0",
  "#8a949c",
  "#3a3f44",
] as const;

const SURFACE_COLOR_PRESETS = [
  DEFAULT_WORKPLANE_WORKSPACE.surfaceColor,
  "#ffffff",
  "#ececec",
  "#d9dee3",
  "#c8d3dc",
  "#b9c8b5",
  "#8a949c",
] as const;

const SKETCH_BACKGROUND_PRESETS = [
  DEFAULT_SKETCH_BACKGROUND,
  "#ffffff",
  "#f1f1f1",
  "#dfe4e8",
  "#c4cad0",
  "#8a949c",
  "#3a3f44",
] as const;

const SKETCH_GRID_PRESETS = [
  DEFAULT_SKETCH_GRID_COLOR,
  "#c08a12",
  "#777777",
  "#333333",
  "#0e69f1",
  "#2f8f5b",
  "#ffffff",
] as const;

const EDGE_COLOR_PRESETS = [
  DEFAULT_WORKPLANE_WORKSPACE.edgeColor,
  "#333333",
  "#777777",
  "#ffffff",
  "#0e69f1",
  "#e0842f",
  "#dc5252",
] as const;

/**
 * The work area as similar tools show it, with the values @prmod3d measured (#143): white ground,
 * pale blue grid with darker lines every centimetre, black edge lines, light from straight above
 * with soft shadows. Everything stays adjustable afterwards.
 */
function classicLookPatch(workspace: WorkplaneWorkspaceSettings): Partial<WorkplaneWorkspaceSettings> {
  return {
    background: "#ffffff",
    surfaceColor: "#fafafa",
    gridColor: "#c8edf9",
    gridMajorColor: "#8fcbe1",
    gridMajorInterval: 10,
    ...(workspace.units === "Imperial" ? {} : { gridBlockPreset: "1 mm", gridBlockSize: 1 }),
    sketchBackground: "#ffffff",
    sketchPlateColor: "#fafafa",
    sketchGridColor: "#8fcbe1",
    edgeLines: true,
    edgeColor: "#000000",
    shadeContrast: 10,
    shadowStrength: 100,
    shadowSoftness: 100,
    lightAzimuth: 90,
    lightElevation: 90,
    softLighting: false,
  };
}

function ColorSettingControl({
  label,
  color,
  defaultColor,
  presets,
  disabled = false,
  onChange,
}: {
  label: string;
  color: string;
  defaultColor: string;
  presets: readonly string[];
  disabled?: boolean;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(color);
  const draftColorRef = useRef(color);
  const pickerCommitAbortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const previewColor = (nextColor: string) => {
    draftColorRef.current = nextColor;
    setDraftColor(nextColor);
  };

  // The outside-click listener lives as long as the picker is open; it must call the newest onChange.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const commitDraftColor = () => {
    onChangeRef.current(draftColorRef.current);
  };
  // A hex value typed into the field counted only when the field lost focus, and a click
  // outside closed the picker first - so the value was lost (#143). Closing keeps it now.
  const colorRef = useRef(color);
  colorRef.current = color;
  const closeKeepingDraft = () => {
    if (draftColorRef.current.toLowerCase() !== colorRef.current.toLowerCase()) commitDraftColor();
    setOpen(false);
  };

  const armPickerCommit = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    pickerCommitAbortRef.current?.abort();
    const controller = new AbortController();
    pickerCommitAbortRef.current = controller;
    const finish = () => {
      commitDraftColor();
      controller.abort();
      if (pickerCommitAbortRef.current === controller) {
        pickerCommitAbortRef.current = null;
      }
    };
    window.addEventListener("pointerup", finish, { once: true, signal: controller.signal });
    window.addEventListener("pointercancel", finish, { once: true, signal: controller.signal });
  };

  useEffect(() => () => pickerCommitAbortRef.current?.abort(), []);

  useEffect(() => {
    if (!open) {
      previewColor(color);
    }
  }, [color, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        closeKeepingDraft();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePopoverPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const triggerRect = trigger.getBoundingClientRect();
      const viewportPadding = 12;
      const gap = 8;
      const width = Math.min(286, Math.max(220, window.innerWidth - viewportPadding * 2));
      const measuredHeight = popoverRef.current?.offsetHeight ?? 320;
      const roomBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
      const roomAbove = triggerRect.top - viewportPadding;
      const openAbove = roomBelow < measuredHeight + gap && roomAbove > roomBelow;
      const preferredTop = openAbove
        ? triggerRect.top - measuredHeight - gap
        : triggerRect.bottom + gap;
      const top = Math.min(
        Math.max(viewportPadding, preferredTop),
        Math.max(viewportPadding, window.innerHeight - measuredHeight - viewportPadding),
      );
      const left = Math.min(
        Math.max(viewportPadding, triggerRect.right - width),
        Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
      );
      const popover = popoverRef.current;
      if (!popover) return;
      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
      popover.style.width = `${width}px`;
      popover.style.visibility = "visible";
    };

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open]);

  const popover = open && typeof document !== "undefined"
    ? createPortal(
      <div
        ref={popoverRef}
        className="workspace-color-popover"
        role="group"
        aria-label={label}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}
      >
        <div onPointerDownCapture={armPickerCommit} data-help-all={label}>
          <HexColorPicker
            className="workspace-hex-color-picker"
            color={draftColor}
            onChange={previewColor}
            onChangeEnd={(nextColor) => {
              previewColor(nextColor);
              onChange(nextColor);
            }}
          />
        </div>
        <div className="workspace-color-presets" aria-label={t("aria.colorPresets", { name: label })}>
          {presets.map((preset) => (
            <button
              key={preset}
              className={preset.toLowerCase() === draftColor.toLowerCase() ? "selected" : ""}
              data-help={label}
              type="button"
              aria-label={t("aria.useColor", { name: label, color: preset })}
              aria-pressed={preset.toLowerCase() === draftColor.toLowerCase()}
              style={{ backgroundColor: preset }}
              onClick={() => {
                previewColor(preset);
                onChange(preset);
              }}
            />
          ))}
        </div>
        <div className="workspace-color-popover-footer">
          <label data-help={label}>
            <span>HEX</span>
            <HexColorInput
              color={draftColor}
              onChange={previewColor}
              onBlur={commitDraftColor}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitDraftColor();
                }
              }}
              prefixed
              aria-label={t("aria.colorHex", { name: label })}
            />
          </label>
          <button
            className="workspace-color-reset"
            data-help={label}
            type="button"
            title={t("aria.resetColor", { name: label })}
            aria-label={t("aria.resetColor", { name: label })}
            onClick={() => {
              previewColor(defaultColor);
              onChange(defaultColor);
            }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <div className="workspace-row workspace-grid-color-row">
      <span>{label}</span>
      <div
        className="workspace-color-control"
        ref={rootRef}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <button
          ref={triggerRef}
          className="workspace-color-trigger"
          data-help={label}
          type="button"
          aria-label={t("aria.colorValue", { name: label, color })}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            if (open) {
              closeKeepingDraft();
              return;
            }
            previewColor(color);
            setOpen(true);
          }}
        >
          <span className="workspace-color-swatch" style={{ backgroundColor: color }} aria-hidden="true" />
          <span>{color.toUpperCase()}</span>
          <ChevronDown className={open ? "open" : ""} size={15} aria-hidden="true" />
        </button>
        {popover}
      </div>
    </div>
  );
}

/** How long the button to leave the simple mode is held: a child does not switch it off by a tap, an adult does (#695). */
const SIMPLE_MODE_HOLD_MS = 2000;

/**
 * The simple mode switch (#695). Switching it on is a tap; switching it off is a press held for two seconds. A server that
 * fixes the mode (`LAYERLING_SIMPLE_MODE=always`) takes the switch away.
 */
function SimpleModeSetting() {
  const simple = useSimpleMode();
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const cancel = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setHolding(false);
  };
  const start = () => {
    if (timerRef.current !== null) return;
    setHolding(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      setSimpleMode(false);
    }, SIMPLE_MODE_HOLD_MS);
  };
  useEffect(() => cancel, []);
  if (isSimpleModeFixedByServer()) return null;
  if (!simple) {
    return <WorkspaceToggle label={t("workspace.simpleMode")} description={t("workspace.simpleModeHint")} checked={false} onChange={() => setSimpleMode(true)} />;
  }
  return (
    <div className="workspace-toggle simple-mode-setting" data-help={t("workspace.simpleMode")}>
      <span className="workspace-toggle-copy">
        <span>{t("workspace.simpleMode")}</span>
        <small>{t("workspace.simpleModeHint")}</small>
      </span>
      <button
        type="button"
        className={holding ? "simple-mode-hold holding" : "simple-mode-hold"}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !event.repeat) start();
        }}
        onKeyUp={cancel}
        onBlur={cancel}
      >
        {t("workspace.simpleModeOff")}
      </button>
    </div>
  );
}

function WorkspaceToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={disabled ? "workspace-toggle is-disabled" : "workspace-toggle"} data-help={label}>
      <span className="workspace-toggle-copy">
        <span>{label}</span>
        {description ? <small>{description}</small> : null}
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  );
}

/**
 * The user's own snap measures: a name and a size in millimetres each. The
 * snap menu then offers every one whole, halved and quartered - for a key
 * unit of 19.05 mm that is 1U, 0.5U and 0.25U.
 */
function CustomSnapGridList({
  grids,
  onChange,
}: {
  grids: CustomSnapGrid[];
  /** `resized` names the measure whose size changed, so a snap step set to it can follow. */
  onChange: (grids: CustomSnapGrid[], resized?: { from: number; to: number }) => void;
}) {
  const [sizeDrafts, setSizeDrafts] = useState<Record<number, string>>({});
  const [nameDrafts, setNameDrafts] = useState<Record<number, string>>({});
  const commitSize = (index: number) => {
    const draft = sizeDrafts[index];
    setSizeDrafts(({ [index]: _committed, ...rest }) => rest);
    if (draft === undefined) return;
    const parsed = Number(draft.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const size = Number(clamp(parsed, MIN_CUSTOM_SNAP_GRID, MAX_CUSTOM_SNAP_GRID).toFixed(4));
    const from = grids[index].size;
    if (size === from) return;
    onChange(grids.map((grid, at) => (at === index ? { ...grid, size } : grid)), { from, to: size });
  };
  return (
    <div className="workspace-custom-snap">
      <div className="workspace-custom-snap-heading">
        <strong>{t("workspace.customSnapGrids")}</strong>
        <span>{t("workspace.customSnapGridsHint")}</span>
      </div>
      {grids.map((grid, index) => (
        <div className="workspace-custom-snap-row" key={index}>
          <input
            type="text"
            value={nameDrafts[index] ?? grid.name}
            maxLength={MAX_CUSTOM_SNAP_GRID_NAME}
            placeholder={t("workspace.customSnapGridName")}
            aria-label={t("workspace.customSnapGridName")}
            onChange={(event) => {
              // The settings come back a moment later; the field shows what is typed meanwhile.
              const name = event.currentTarget.value;
              setNameDrafts((drafts) => ({ ...drafts, [index]: name }));
              onChange(grids.map((entry, at) => (at === index ? { ...entry, name } : entry)));
            }}
            onBlur={() => setNameDrafts(({ [index]: _committed, ...rest }) => rest)}
          />
          <label>
            <input
              type="text"
              inputMode="decimal"
              value={sizeDrafts[index] ?? String(grid.size)}
              aria-label={t("workspace.customSnapGridSize")}
              onChange={(event) => {
                // Read now: by the time the updater runs, the event has let go of its target.
                const value = event.currentTarget.value;
                setSizeDrafts((drafts) => ({ ...drafts, [index]: value }));
              }}
              onBlur={() => commitSize(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
            <span>mm</span>
          </label>
          <span className="workspace-custom-snap-steps" aria-hidden="true">
            {customSnapGridDivisors(grid).map((divisor) => Number((grid.size / divisor).toFixed(4))).join(" · ")}
          </span>
          <label className="workspace-custom-snap-parts">
            <input
              type="checkbox"
              checked={!grid.wholeOnly}
              onChange={(event) => {
                const parts = event.currentTarget.checked;
                onChange(grids.map((entry, at) => {
                  if (at !== index) return entry;
                  const { wholeOnly: _whole, ...rest } = entry;
                  return parts ? rest : { ...rest, wholeOnly: true };
                }));
              }}
            />
            <span>{t("workspace.customSnapGridParts")}</span>
          </label>
          <button
            type="button"
            aria-label={t("workspace.customSnapGridRemove")}
            title={t("workspace.customSnapGridRemove")}
            onClick={() => {
              setSizeDrafts({});
              setNameDrafts({});
              onChange(grids.filter((_entry, at) => at !== index));
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {grids.length < MAX_CUSTOM_SNAP_GRIDS ? (
        <button type="button" className="workspace-custom-snap-add" data-help={t("workspace.customSnapGrids")} onClick={() => onChange([...grids, { name: "", size: 10 }])}>
          <Plus size={15} />
          <span>{t("workspace.customSnapGridAdd")}</span>
        </button>
      ) : null}
    </div>
  );
}

function WorkspaceSelect({
  label,
  value,
  options,
  optionLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  /** Uebersetzt einzelne Eintraege; Masszahlen bleiben ohne. */
  optionLabel?: (option: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="workspace-select" data-help={label}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel ? optionLabel(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}
