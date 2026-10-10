"use client";

import { displayY, displayYTurn, insideZ, insideZTurn } from "@/lib/displayAxes";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { guideChapterForShape, guideSectionForShape } from "@/lib/guideLinks";
import { ChevronDown, ChevronUp, Cylinder, Eye, EyeOff, Layers, Lock, Minus, Pencil, Plus, RotateCcw, Split, Tags, Unlock } from "lucide-react";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  DEFAULT_GEAR_HELIX_ANGLE,
  DEFAULT_GEAR_HELIX_QUALITY,
  DEFAULT_GEAR_TEETH,
  DEFAULT_GEAR_TOOTH_SIZE,
  MAX_GEAR_HELIX_ANGLE,
  MAX_GEAR_HELIX_QUALITY,
  MIN_GEAR_HELIX_ANGLE,
  MIN_GEAR_HELIX_QUALITY,
  gearCenterHoleLimits,
  normalizeGearHelixAngle,
  normalizeGearHelixQuality,
  normalizeGearCenterHoleSize,
  normalizeGearToothSize,
  normalizeGearToothWidth,
  normalizeGearType,
  gearToothPitch,
  DEFAULT_GEAR_BACKLASH,
  involuteGearDiameter,
  involuteGearModule,
  involuteGearPair,
  MAX_GEAR_BACKLASH,
  MAX_GEAR_PRESSURE_ANGLE,
  MIN_GEAR_PRESSURE_ANGLE,
  normalizeGearBacklash,
  normalizeGearPressureAngle,
  normalizeGearProfile,
  DEFAULT_GEAR_RIM,
  MAX_GEAR_RIM,
  MIN_GEAR_RIM,
  gearAddendum,
  gearModuleOf,
  gearSizeForModule,
  gearToothProfile,
  gearTypeIsModular,
  gearUsesModule,
  normalizeGearRim,
  rackMinDepth,
  rackModule,
  rackToothHeight,
} from "@/lib/gearGeometry";
import {
  MAX_THREAD_CLEARANCE,
  MAX_THREAD_DIAMETER,
  MAX_THREAD_QUALITY,
  MIN_THREAD_CLEARANCE,
  MIN_THREAD_DIAMETER,
  MIN_THREAD_QUALITY,
  THREAD_SIZE_GROUPS,
  THREAD_SERIES_TEXT,
  threadSeriesFor,
  defaultThreadHeadHeight,
  normalizeThreadChamfer,
  normalizeThreadClearance,
  normalizeThreadBoltClearance,
  MIN_THREAD_BOLT_CLEARANCE,
  MAX_THREAD_BOLT_CLEARANCE,
  normalizeThreadDiameter,
  normalizeThreadHand,
  normalizeThreadHead,
  normalizeThreadHeadChamfer,
  normalizeThreadHeadHeight,
  normalizeThreadPitch,
  normalizeThreadProfile,
  normalizeThreadQuality,
  normalizeThreadRole,
  threadNaturalFootprint,
  pitchToThreadsPerInch,
  threadChamferLimits,
  threadHeadChamferLimits,
  threadHeadHeightLimits,
  threadNaturalHeight,
  threadPitchLimits,
  threadSettings,
  threadSizeFor,
  threadSizeById,
  threadProfileForSize,
  threadUsesInchPitch,
  threadsPerInchToPitch,
  type ThreadSettings,
} from "@/lib/threadGeometry";
import {
  DEFAULT_STAR_INNER_SIZE,
  DEFAULT_STAR_INNER_FILLET,
  DEFAULT_STAR_OUTER_FILLET,
  DEFAULT_STAR_POINTS,
  DEFAULT_STAR_QUALITY,
  MIN_STAR_QUALITY,
  MAX_STAR_QUALITY,
  normalizeStarQuality,
  starMaxFilletRadii,
} from "@/lib/starGeometry";
import {
  DEFAULT_HEART_TIP_FILLET,
  DEFAULT_HEART_QUALITY,
  MIN_HEART_QUALITY,
  MAX_HEART_QUALITY,
  normalizeHeartTipFillet,
  normalizeHeartQuality,
} from "@/lib/heartGeometry";
import {
  DEFAULT_CRESCENT_THICKNESS,
  DEFAULT_CRESCENT_TIP_FILLET,
  DEFAULT_CRESCENT_QUALITY,
  MIN_CRESCENT_QUALITY,
  MAX_CRESCENT_QUALITY,
  normalizeCrescentThickness,
  normalizeCrescentTipFillet,
  normalizeCrescentQuality,
} from "@/lib/crescentGeometry";
import {
  DEFAULT_HONEYCOMB_CELL_SIZE,
  DEFAULT_HONEYCOMB_WALL_THICKNESS,
  DEFAULT_HONEYCOMB_FRAME_WIDTH,
  normalizeHoneycombCellSize,
  normalizeHoneycombWallThickness,
  normalizeHoneycombFrameWidth,
} from "@/lib/honeycombGeometry";
import {
  DEFAULT_ROUNDED_BOX_CORNER_FILLET,
  DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET,
  DEFAULT_ROUNDED_BOX_QUALITY,
  MIN_ROUNDED_BOX_QUALITY,
  MAX_ROUNDED_BOX_QUALITY,
  normalizeCornerFillet,
  normalizeTopBottomFillet,
  normalizeRoundedBoxQuality,
} from "@/lib/roundedBoxGeometry";
import {
  MAX_BENT_TUBE_BEND_ANGLE,
  MAX_BENT_TUBE_QUALITY,
  MAX_BENT_TUBE_ROLL,
  MAX_BENT_TUBE_SEGMENTS,
  MIN_BENT_TUBE_QUALITY,
  MIN_BENT_TUBE_SIZE,
  bentTubeParameterPatch,
  bentTubeSelfIntersects,
  bentTubeWallLimits,
  minBentTubeBendRadius,
  normalizedBentTubeFields,
} from "@/lib/bentTubeGeometry";
import { displayStepFromMillimeters, formatFractionalInches, showsInchFractions, displayToMillimeters, formatMeasurementNumber, lengthDisplayUnit, measurementOptionLabel, millimetersToDisplay, parseMeasurementInput, resolveMeasurementInput } from "@/lib/measurementUnits";
import { t, type MessageKey } from "@/lib/i18n";
import { displayShapeName, makeShapeFromAsset, renamedShapeName } from "@/lib/shapeCatalog";
import { shapeDefaultsAsset, shapeDefaultsFromShape } from "@/lib/shapeDefaults";
import { MAX_SCREW_HOLE_ANGLE, MIN_SCREW_HOLE_ANGLE, normalizeScrewHoleAngle, normalizeScrewHoleHeadDepth, normalizeScrewHoleShaft } from "@/lib/screwHoleGeometry";
import { MAX_TEARDROP_TIP_ANGLE, MIN_TEARDROP_TIP_ANGLE, normalizeTeardropTipAngle, teardropHeightForTipAngle, teardropTipAngle } from "@/lib/teardropGeometry";
import { MAX_DOVETAIL_CLEARANCE, normalizeDovetailClearance, normalizeDovetailNeckWidth } from "@/lib/dovetailGeometry";
import { DEFAULT_SKETCH_STROKE, MAX_SKETCH_STROKE_WIDTH, MIN_SKETCH_STROKE_WIDTH, normalizeSketchStroke, SKETCH_STROKE_JOINS } from "@/lib/sketchStroke";
import { textHasFill } from "@/lib/textFill";
import { TEXT_FILL_CHOICES, textFillChoice, textLineSettingsInView, textStrokeForChoice, textStrokeWider, type TextFillChoice } from "@/lib/textFillChoice";
import { DEFAULT_TEXT_LAYERS, MAX_TEXT_LAYERS, MAX_TEXT_LAYER_GROW, MIN_TEXT_LAYER_HEIGHT, namesFromList, type TextLayer } from "@/lib/textLayers";
import { addTextLayer, MIN_LETTER_SIZE, MIN_NAME_TAG_LAYERS, NAME_TAG_GAP, removeTextLayer, textLetterSize, type NameTagStack } from "@/lib/nameTag";
import { FONT_MANAGER_OPTION, requestFontManager } from "@/lib/fontManagerEvents";
import { customFontList, textFontLabel } from "@/lib/textFonts";
import { MIN_SLOT_END_RATIO, normalizeSlotEndRatio, taperedSlotOutline } from "@/lib/slotGeometry";
import { loftMeasures, loftShapePatch, loftTiltLimit, maxLoftWall, MAX_LOFT_SIDES, MAX_LOFT_TWIST, MIN_LOFT_SIDES, MIN_LOFT_SIZE, normalizeLoftOutline, type LoftMeasures } from "@/lib/loftGeometry";
import { MAX_KNURL_ANGLE, MIN_KNURL_ANGLE, MIN_KNURL_COUNT, MIN_KNURL_DEPTH, knurlSettings, maxKnurlChamfer, maxKnurlCount, maxKnurlDepth, maxRoundKnurlDepth, normalizeKnurlAngle, normalizeKnurlChamfer, normalizeKnurlCount, normalizeKnurlDepth, normalizeKnurlPattern } from "@/lib/knurlGeometry";
import { MAX_HINGE_CLEARANCE, MAX_HINGE_KNUCKLES, MIN_HINGE_CLEARANCE, MIN_HINGE_KNUCKLES, hingePlan, minimumHingeDepth, normalizeHingeClearance, normalizeHingeKnuckles, normalizeHingeLeafThickness, normalizeHingePinDiameter } from "@/lib/hingeGeometry";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { isNonSolidShapeKind, resizedShapeSize, shapeDepth, shapeHasTaper, shapeOverallFootprintDimensions, shapeSupportsTaper, shapeTaperDimensions, shapeWidth } from "@/lib/workplaneShapes";
import { normalizeSketchRevolveSettings } from "@/lib/sketchRevolve";
import { roundSideCount } from "@/lib/roundSideCount";
import { normalizePyramidTop } from "@/lib/pyramidGeometry";
import {
  MAX_SPRING_QUALITY,
  MIN_SPRING_QUALITY,
  normalizeSpringQuality,
  normalizeSpringHand,
  normalizeSpringTurns,
  normalizeSpringWire,
  springSettings,
  springTurnLimits,
  springWireLimits,
} from "@/lib/springGeometry";
import { regularPolygonAspect } from "@/lib/regularPolygonFootprint";
import { DEFAULT_TAPER_DIMENSION_MAX, MAX_HIGH_RESOLUTION_SIDES, MAX_HIGH_RESOLUTION_STEPS, customSnapGridLabel, shapeDimensionLimit, snapGridOptions } from "@/lib/workplaneSettings";
import type { BentTubeInnerProfile, BentTubeProfile, CustomSnapGrid, GearType, GridSize, MeasurementAccuracy, ShapeCustomization, SketchProfile, SketchStroke, SketchStrokeAlign, SketchStrokeJoin, ThreadHead, ThreadProfile, ThreadRole, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { selectWholeValue } from "@/lib/numberField";
import { formulaMatchesValue, formulaToRemember, withFieldFormula, type FieldFormulas } from "@/lib/fieldFormulas";
import { useRecentColors } from "@/lib/recentColors";
import { canToggleGroupColors, groupShowsPartColors } from "@/lib/groupColors";
import { shapePivotFromWorld, shapePivotWorld } from "@/lib/rotationPivot";
import { signedDegrees } from "@/lib/geometryRotation";

/**
 * Docked at the right edge, full height. Moved away, it floats: no longer
 * pinned to the right and bottom. Dropped back at the top right, it docks.
 */
const INSPECTOR_PANEL: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto" },
  dockedAt: (area, panel) => ({ left: area.width - panel.width, top: 0 }),
};

const MIN_SHAPE_SIZE = 0.01;
const SOLID_COLORS = [
  "#d41721",
  "#ff4b4b",
  "#ff7a1a",
  "#d97813",
  "#f6a21a",
  "#f2cf10",
  "#f7e65a",
  "#a8d642",
  "#33983d",
  "#1fb66d",
  "#18b99a",
  "#0098c7",
  "#49c7ef",
  "#3b82f6",
  "#294c93",
  "#5b5ce2",
  "#6e2786",
  "#9b3bd2",
  "#c9009a",
  "#f062b6",
  "#8a5a2b",
  "#b98254",
  "#f2caa0",
  "#ffffff",
  "#cfd8df",
  "#8a98a6",
  "#4b5563",
  "#111111",
];
const TEXT_FONT_OPTIONS = ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", "Stencil"];
/** `label` traegt den Katalogschluessel, nicht den fertigen Text. */
const GEAR_TYPE_OPTIONS: Array<{ value: GearType; label: MessageKey }> = [
  { value: "spur", label: "gear.spur" },
  { value: "helical", label: "gear.helical" },
  { value: "bevel", label: "gear.bevel" },
  { value: "internal", label: "gear.internal" },
  { value: "rack", label: "gear.rack" },
];
const BENT_TUBE_PROFILE_OPTIONS: Array<{ value: BentTubeProfile; label: MessageKey }> = [
  { value: "round", label: "bentTube.profileRound" },
  { value: "square", label: "bentTube.profileSquare" },
  { value: "hexagon", label: "bentTube.profileHexagon" },
  { value: "octagon", label: "bentTube.profileOctagon" },
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
const THREAD_PROFILE_OPTIONS: Array<{ value: ThreadProfile; label: MessageKey }> = [
  { value: "v", label: "thread.profileV" },
  { value: "trapezoidal", label: "thread.profileTrapezoidal" },
  { value: "round", label: "thread.profileRound" },
  { value: "whitworth", label: "thread.profileWhitworth" },
];

type RangePropertyConfig = {
  type?: "range";
  /** Bleibt englisch und unveraendert: Einheiten und Filter haengen daran. */
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Zusaetzlich zur Sperre des ganzen Objekts, etwa bei automatischen Werten. */
  disabled?: boolean;
  onChange: (value: number) => void;
};

type TogglePropertyConfig = {
  type: "toggle";
  id: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

type TextPropertyConfig = {
  type: "text";
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

type SelectPropertyOption = {
  value: string;
  label: string;
  /** Ueberschrift, unter der der Eintrag im aufgeklappten Feld steht. */
  group?: string;
};

type SelectPropertyConfig = {
  type: "select";
  id: string;
  label: string;
  value: string;
  options: SelectPropertyOption[];
  /** Eine Zeile unter dem Feld, die die getroffene Wahl erklaert. */
  hint?: string;
  onChange: (value: string) => void;
};

type ShapePropertyConfig = RangePropertyConfig | TextPropertyConfig | SelectPropertyConfig | TogglePropertyConfig;
export type ShapeInspectorUpdateOptions = { resizeAxis?: "width" | "depth" | "height" };
type ShapeInspectorUpdate = (patch: Partial<WorkplaneShape>, options?: ShapeInspectorUpdateOptions) => void;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** A measure in a sentence: at most two decimals, none when it is whole (24 mm, module 1.5). */
function plainNumber(value: number) {
  return String(Math.round(value * 100) / 100);
}

function formatPropertyNumber(value: number, accuracy: MeasurementAccuracy, step: number) {
  if (step >= 1) return String(Math.round(value));
  return formatMeasurementNumber(value, accuracy, step);
}

const RELATIVE_SIZE_PROPERTY_IDS = new Set(["width", "height", "length", "diameter", "starOuterSize"]);
const ROTATION_PROPERTY_IDS = new Set(["rotateX", "rotateY", "rotateZ"]);

function propertyUsesLengthUnit(key: string) {
  return ["textLineWidth", "letterSize", "positionX", "positionY", "positionZ", "pivotX", "pivotY", "pivotZ", "radius", "length", "width", "height", "bevel", "topRadius", "baseRadius", "thickness", "toothSize", "toothWidth", "gearBacklash", "centerHole", "slotSmallEnd", "slotCentreDistance", "sketchLineWidth", "topLength", "topWidth", "bottomLength", "bottomWidth", "diameter", "pitch", "clearance", "boltClearance", "threadLength", "headHeight", "chamfer", "headChamfer", "wire", "starOuterSize", "starInnerSize", "starOuterFillet", "starInnerFillet", "heartTipFillet", "crescentThickness", "crescentTipFillet", "honeycombCellSize", "honeycombWallThickness", "honeycombFrameWidth", "cornerFillet", "topBottomFillet", "bentTubeSize", "bentTubeWall", "bentTubeSegmentLength", "bentTubeBendRadius", "dovetailNeckWidth", "dovetailClearance", "hingePinDiameter", "hingeLeafThickness", "hingeClearance", "screwHoleShaft", "screwHoleHeadDepth", "knurlDepth", "knurlChamfer", "loftBottomWidth", "loftBottomDepth", "loftTopWidth", "loftTopDepth", "loftBottomCorner", "loftTopCorner", "loftOffsetX", "loftOffsetZ", "loftWall"].includes(key);
}

/**
 * Der Schalter und der Regler fuer die Seitenzahl runder Koerper. Ohne eigene
 * Angabe folgt sie der Groesse; der Schalter haelt sie fest, indem er die
 * gerade wirksame Zahl eintraegt.
 */
function roundSideProperties(
  shape: WorkplaneShape,
  width: number,
  depth: number,
  onUpdate: ShapeInspectorUpdate,
): ShapePropertyConfig[] {
  const followsSize = shape.sides === undefined;
  const effectiveSides = roundSideCount(shape.sides, width, depth);
  return [
    {
      type: "toggle",
      id: "sidesFollowSize",
      label: t("prop.sidesFollowSize"),
      value: followsSize,
      onChange: (follows) => onUpdate({ sides: follows ? undefined : effectiveSides }),
    },
    {
      id: "sides",
      label: t("prop.sides"),
      value: effectiveSides,
      min: 3,
      max: MAX_HIGH_RESOLUTION_SIDES,
      step: 1,
      disabled: followsSize,
      onChange: (sides) => onUpdate({ sides: Math.round(sides) }),
    },
  ];
}

function getShapePropertiesWithAppLimits(shape: WorkplaneShape, onUpdate: ShapeInspectorUpdate, textWidthMax = 260): ShapePropertyConfig[] {
  const baseWidth = shapeWidth(shape);
  const baseDepth = shapeDepth(shape);
  const footprint = shapeOverallFootprintDimensions(shape);
  const width = footprint.width;
  const depth = footprint.depth;
  const taper = shapeTaperDimensions(shape);
  const widthPatch = (value: number): Partial<WorkplaneShape> => {
    if (!shapeHasTaper(shape)) {
      return { width: value, size: resizedShapeSize(value, baseDepth) };
    }
    const scale = value / Math.max(MIN_SHAPE_SIZE, width);
    const nextBaseWidth = Math.max(MIN_SHAPE_SIZE, baseWidth * scale);
    return {
      width: nextBaseWidth,
      size: resizedShapeSize(nextBaseWidth, baseDepth),
      taperTopWidth: Math.max(MIN_SHAPE_SIZE, taper.topWidth * scale),
      taperBottomWidth: Math.max(MIN_SHAPE_SIZE, taper.bottomWidth * scale),
    };
  };
  const depthPatch = (value: number): Partial<WorkplaneShape> => {
    if (!shapeHasTaper(shape)) {
      return { depth: value, size: resizedShapeSize(baseWidth, value) };
    }
    const scale = value / Math.max(MIN_SHAPE_SIZE, depth);
    const nextBaseDepth = Math.max(MIN_SHAPE_SIZE, baseDepth * scale);
    return {
      depth: nextBaseDepth,
      size: resizedShapeSize(baseWidth, nextBaseDepth),
      taperTopDepth: Math.max(MIN_SHAPE_SIZE, taper.topDepth * scale),
      taperBottomDepth: Math.max(MIN_SHAPE_SIZE, taper.bottomDepth * scale),
    };
  };
  const setWidth = (value: number) => onUpdate(widthPatch(value), { resizeAxis: "width" });
  const setDepth = (value: number) => onUpdate(depthPatch(value), { resizeAxis: "depth" });
  const setConeWidth = (value: number) => {
    const patch = widthPatch(value);
    patch.baseRadius = Math.max(MIN_SHAPE_SIZE, (patch.width ?? baseWidth) / 2);
    onUpdate(patch, { resizeAxis: "width" });
  };
  const setCylinderDiameter = (value: number) => {
    const patch = widthPatch(value);
    patch.depth = patch.width ?? value;
    onUpdate(patch, { resizeAxis: "width" });
  };
  const setBaseRadius = (value: number) => {
    const diameter = value * 2;
    onUpdate({ baseRadius: value, width: diameter, size: resizedShapeSize(diameter, baseDepth) }, { resizeAxis: "width" });
  };
  const setHeight = (height: number) => onUpdate({ height }, { resizeAxis: "height" });

  if (shape.sketchOperation === "revolve" || shape.sketchRevolve) {
    const settings = normalizeSketchRevolveSettings(shape.sketchRevolve);
    const updateRevolve = (patch: Partial<typeof settings>) => onUpdate({ sketchRevolve: normalizeSketchRevolveSettings({ ...settings, ...patch }) });
    return [
      { id: "startAngle", label: t("prop.startAngle"), value: settings.startAngle, min: 0, max: 359, step: 1, onChange: (startAngle) => updateRevolve({ startAngle }) },
      { id: "sweep", label: t("prop.sweep"), value: settings.sweepAngle, min: -360, max: 360, step: 1, onChange: (sweepAngle) => updateRevolve({ sweepAngle }) },
      // An exact revolved body is round at any size; the side count only shapes the mesh of an older one.
      ...(shape.cadBrep ? [] : [{ id: "sides", label: t("prop.sides"), value: settings.sides, min: 3, max: MAX_HIGH_RESOLUTION_SIDES, step: 1, onChange: (sides: number) => updateRevolve({ sides }) }]),
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.sketchProfile) {
    return [
      ...sketchFillProperties(shape.sketchProfile, onUpdate),
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "box") {
    return [
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "cylinder") {
    return [
      ...roundSideProperties(shape, width, depth, onUpdate),
      { id: "diameter", label: t("prop.diameter"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setCylinderDiameter },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "star") {
    const starPoints = shape.starPoints ?? DEFAULT_STAR_POINTS;
    const starInnerSize = shape.starInnerSize ?? DEFAULT_STAR_INNER_SIZE;
    const starOuterFillet = shape.starOuterFillet ?? DEFAULT_STAR_OUTER_FILLET;
    const starInnerFillet = shape.starInnerFillet ?? DEFAULT_STAR_INNER_FILLET;
    const starQuality = shape.starQuality ?? DEFAULT_STAR_QUALITY;
    const maxLimits = starMaxFilletRadii(width, starInnerSize, starPoints);
    const outerFilletMax = Math.max(1, Math.min(40, Math.ceil(maxLimits.maxOuterRadius * 10) / 10));
    const innerFilletMax = Math.max(1, Math.min(40, Math.ceil(maxLimits.maxInnerRadius * 10) / 10));
    const setStarOuterSize = (value: number) => {
      onUpdate({ width: value, depth: value, size: value }, { resizeAxis: "width" });
    };
    return [
      {
        id: "starPoints",
        label: t("prop.starPoints"),
        value: starPoints,
        min: 3,
        max: 32,
        step: 1,
        onChange: (value) => onUpdate({ starPoints: Math.round(value) }),
      },
      {
        id: "starOuterSize",
        label: t("prop.starOuterSize"),
        value: width,
        min: Math.max(MIN_SHAPE_SIZE, starInnerSize + 0.1),
        max: 160,
        onChange: setStarOuterSize,
      },
      {
        id: "starInnerSize",
        label: t("prop.starInnerSize"),
        value: starInnerSize,
        min: 0.1,
        max: Math.max(0.1, width - 0.1),
        step: 0.1,
        onChange: (value) => onUpdate({ starInnerSize: value }),
      },
      {
        id: "starOuterFillet",
        label: t("prop.starOuterFillet"),
        value: starOuterFillet,
        min: 0,
        max: outerFilletMax,
        step: 0.05,
        onChange: (value) => onUpdate({ starOuterFillet: value }),
      },
      {
        id: "starInnerFillet",
        label: t("prop.starInnerFillet"),
        value: starInnerFillet,
        min: 0,
        max: innerFilletMax,
        step: 0.05,
        onChange: (value) => onUpdate({ starInnerFillet: value }),
      },
      {
        id: "starQuality",
        label: t("prop.quality"),
        value: starQuality,
        min: MIN_STAR_QUALITY,
        max: MAX_STAR_QUALITY,
        step: 2,
        onChange: (value) => onUpdate({ starQuality: normalizeStarQuality(value) }),
      },
      {
        id: "height",
        label: t("prop.height"),
        value: shape.height,
        min: MIN_SHAPE_SIZE,
        max: 160,
        onChange: setHeight,
      },
    ];
  }

  if (shape.kind === "heart") {
    const heartTipFillet = shape.heartTipFillet ?? DEFAULT_HEART_TIP_FILLET;
    const heartQuality = shape.heartQuality ?? DEFAULT_HEART_QUALITY;
    return [
      {
        id: "heartTipFillet",
        label: t("prop.heartTipFillet"),
        value: heartTipFillet,
        min: 0,
        max: 20,
        step: 0.1,
        onChange: (value) => onUpdate({ heartTipFillet: normalizeHeartTipFillet(value) }),
      },
      {
        id: "heartQuality",
        label: t("prop.quality"),
        value: heartQuality,
        min: MIN_HEART_QUALITY,
        max: MAX_HEART_QUALITY,
        step: 2,
        onChange: (value) => onUpdate({ heartQuality: normalizeHeartQuality(value) }),
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "crescent") {
    const crescentThickness = shape.crescentThickness ?? DEFAULT_CRESCENT_THICKNESS;
    const crescentTipFillet = shape.crescentTipFillet ?? DEFAULT_CRESCENT_TIP_FILLET;
    const crescentQuality = shape.crescentQuality ?? DEFAULT_CRESCENT_QUALITY;
    const maxThickness = Math.max(2, width * 0.85);
    return [
      {
        id: "crescentThickness",
        label: t("prop.crescentThickness"),
        value: crescentThickness,
        min: 1,
        max: maxThickness,
        step: 0.1,
        onChange: (value) => onUpdate({ crescentThickness: normalizeCrescentThickness(value, width) }),
      },
      {
        id: "crescentTipFillet",
        label: t("prop.crescentTipFillet"),
        value: crescentTipFillet,
        min: 0,
        max: 8,
        step: 0.05,
        onChange: (value) => onUpdate({ crescentTipFillet: normalizeCrescentTipFillet(value) }),
      },
      {
        id: "crescentQuality",
        label: t("prop.quality"),
        value: crescentQuality,
        min: MIN_CRESCENT_QUALITY,
        max: MAX_CRESCENT_QUALITY,
        step: 2,
        onChange: (value) => onUpdate({ crescentQuality: normalizeCrescentQuality(value) }),
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "honeycomb") {
    const honeycombCellSize = shape.honeycombCellSize ?? DEFAULT_HONEYCOMB_CELL_SIZE;
    const honeycombWallThickness = shape.honeycombWallThickness ?? DEFAULT_HONEYCOMB_WALL_THICKNESS;
    const honeycombFrameWidth = shape.honeycombFrameWidth ?? DEFAULT_HONEYCOMB_FRAME_WIDTH;
    return [
      {
        id: "honeycombCellSize",
        label: t("prop.honeycombCellSize"),
        value: honeycombCellSize,
        min: 3,
        max: 25,
        step: 0.5,
        onChange: (value) => onUpdate({ honeycombCellSize: normalizeHoneycombCellSize(value) }),
      },
      {
        id: "honeycombWallThickness",
        label: t("prop.honeycombWallThickness"),
        value: honeycombWallThickness,
        min: 0.8,
        max: 5,
        step: 0.1,
        onChange: (value) => onUpdate({ honeycombWallThickness: normalizeHoneycombWallThickness(value) }),
      },
      {
        id: "honeycombFrameWidth",
        label: t("prop.honeycombFrameWidth"),
        value: honeycombFrameWidth,
        min: 0,
        max: 15,
        step: 0.5,
        onChange: (value) => onUpdate({ honeycombFrameWidth: normalizeHoneycombFrameWidth(value) }),
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 200, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 200, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "bentTube") {
    const fields = normalizedBentTubeFields(shape);
    const wallLimits = bentTubeWallLimits(fields.bentTubeProfile, fields.bentTubeInnerProfile, fields.bentTubeSize, fields.bentTubeQuality);
    const update = (changes: Partial<WorkplaneShape>) => onUpdate(bentTubeParameterPatch(shape, changes));
    const profileOptions = BENT_TUBE_PROFILE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }));
    const properties: ShapePropertyConfig[] = [
      {
        type: "select",
        id: "bentTubeProfile",
        label: t("prop.bentTubeProfile"),
        value: fields.bentTubeProfile,
        options: profileOptions,
        onChange: (value) => update({ bentTubeProfile: value as BentTubeProfile }),
      },
      {
        type: "select",
        id: "bentTubeInnerProfile",
        label: t("prop.bentTubeInnerProfile"),
        value: fields.bentTubeInnerProfile,
        options: [{ value: "none", label: t("bentTube.innerNone") }, ...profileOptions],
        onChange: (value) => update({ bentTubeInnerProfile: value as BentTubeInnerProfile }),
      },
      {
        id: "bentTubeSize",
        label: t("prop.bentTubeSize"),
        value: fields.bentTubeSize,
        min: MIN_BENT_TUBE_SIZE,
        max: 100,
        step: 0.5,
        onChange: (value) => update({ bentTubeSize: value }),
      },
    ];
    if (fields.bentTubeInnerProfile !== "none") {
      properties.push({
        id: "bentTubeWall",
        label: t("prop.bentTubeWall"),
        value: fields.bentTubeWall,
        min: wallLimits.min,
        max: wallLimits.max,
        step: 0.1,
        onChange: (value) => update({ bentTubeWall: value }),
      });
    }
    properties.push({
      id: "bentTubeQuality",
      label: t("prop.quality"),
      value: fields.bentTubeQuality,
      min: MIN_BENT_TUBE_QUALITY,
      max: MAX_BENT_TUBE_QUALITY,
      step: 4,
      onChange: (value) => update({ bentTubeQuality: value }),
    });
    return properties;
  }

  if (shape.kind === "roundedBox") {
    const cornerFillet = shape.cornerFillet ?? DEFAULT_ROUNDED_BOX_CORNER_FILLET;
    const topBottomFillet = shape.topBottomFillet ?? DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET;
    const roundedBoxQuality = shape.roundedBoxQuality ?? DEFAULT_ROUNDED_BOX_QUALITY;
    const maxCornerFillet = Math.max(1, Math.min(width, depth) / 2);
    const maxTopBottomFillet = Math.max(1, shape.height / 2);

    return [
      {
        id: "cornerFillet",
        label: t("prop.cornerFillet"),
        value: cornerFillet,
        min: 0,
        max: maxCornerFillet,
        step: 0.1,
        onChange: (value) => onUpdate({ cornerFillet: normalizeCornerFillet(value, Math.min(width, depth) / 2) }),
      },
      {
        id: "topBottomFillet",
        label: t("prop.topBottomFillet"),
        value: topBottomFillet,
        min: 0,
        max: maxTopBottomFillet,
        step: 0.1,
        onChange: (value) => onUpdate({ topBottomFillet: normalizeTopBottomFillet(value, shape.height / 2) }),
      },
      {
        id: "roundedBoxQuality",
        label: t("prop.quality"),
        value: roundedBoxQuality,
        min: MIN_ROUNDED_BOX_QUALITY,
        max: MAX_ROUNDED_BOX_QUALITY,
        step: 1,
        onChange: (value) => onUpdate({ roundedBoxQuality: normalizeRoundedBoxQuality(value) }),
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 200, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 200, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "counterbore" || shape.kind === "countersink") {
    const shaft = normalizeScrewHoleShaft(shape.screwHoleShaft, width);
    const shaftProperty: ShapePropertyConfig = {
      id: "screwHoleShaft",
      label: t("prop.screwHoleShaft"),
      value: shaft,
      min: 0.1,
      max: Math.max(0.2, width * 0.95),
      step: 0.1,
      onChange: (value) => onUpdate({ screwHoleShaft: normalizeScrewHoleShaft(value, width) }),
    };
    return [
      { id: "width", label: t("prop.screwHoleHead"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setCylinderDiameter },
      shaftProperty,
      shape.kind === "counterbore"
        ? {
            id: "screwHoleHeadDepth",
            label: t("prop.screwHoleHeadDepth"),
            value: normalizeScrewHoleHeadDepth(shape.screwHoleHeadDepth, shape.height),
            min: 0.1,
            max: Math.max(0.3, shape.height - 0.2),
            step: 0.1,
            onChange: (value) => onUpdate({ screwHoleHeadDepth: normalizeScrewHoleHeadDepth(value, shape.height) }),
          }
        : {
            id: "screwHoleAngle",
            label: t("prop.screwHoleAngle"),
            value: normalizeScrewHoleAngle(shape.screwHoleAngle),
            min: MIN_SCREW_HOLE_ANGLE,
            max: MAX_SCREW_HOLE_ANGLE,
            step: 1,
            onChange: (value) => onUpdate({ screwHoleAngle: normalizeScrewHoleAngle(value) }),
          },
      { id: "height", label: t("prop.screwHoleLength"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      ...roundSideProperties(shape, width, depth, onUpdate),
    ];
  }

  if (shape.kind === "teardrop") {
    // Changing the diameter keeps the tip angle, so the point stays where the printer needs it.
    const tipAngle = teardropTipAngle(width, shape.height);
    const setDiameter = (value: number) => {
      const patch = widthPatch(value);
      patch.height = teardropHeightForTipAngle(patch.width ?? value, Math.min(tipAngle, MAX_TEARDROP_TIP_ANGLE));
      onUpdate(patch, { resizeAxis: "width" });
    };
    return [
      { id: "width", label: t("prop.teardropDiameter"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setDiameter },
      { id: "length", label: t("prop.teardropLength"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      {
        id: "teardropTipAngle",
        label: t("prop.teardropTipAngle"),
        value: Math.round(Math.min(tipAngle, MAX_TEARDROP_TIP_ANGLE) * 10) / 10,
        min: MIN_TEARDROP_TIP_ANGLE,
        max: MAX_TEARDROP_TIP_ANGLE,
        step: 1,
        onChange: (value) => onUpdate({ height: teardropHeightForTipAngle(width, normalizeTeardropTipAngle(value)) }, { resizeAxis: "height" }),
      },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      ...roundSideProperties(shape, width, width, onUpdate),
    ];
  }

  if (shape.kind === "knurl") {
    const knurl = knurlSettings({ ...shape, width });
    const properties: ShapePropertyConfig[] = [
      {
        type: "select",
        id: "knurlPattern",
        label: t("prop.knurlPattern"),
        value: knurl.pattern,
        options: [{ value: "straight", label: t("knurl.straight") }, { value: "diamond", label: t("knurl.diamond") }, { value: "round", label: t("knurl.round") }],
        hint: t(knurl.pattern === "diamond" ? "knurl.diamondHint" : knurl.pattern === "round" ? "knurl.roundHint" : "knurl.straightHint"),
        onChange: (value) => onUpdate({ knurlPattern: normalizeKnurlPattern(value) }),
      },
      { id: "diameter", label: t("prop.diameter"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setCylinderDiameter },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      { id: "knurlCount", label: t("prop.knurlCount"), value: knurl.count, min: MIN_KNURL_COUNT, max: maxKnurlCount(width), step: 1, onChange: (value) => onUpdate({ knurlCount: normalizeKnurlCount(value, width) }) },
      {
        id: "knurlDepth",
        label: t("prop.knurlDepth"),
        value: knurl.depth,
        min: MIN_KNURL_DEPTH,
        // Round grooves stay below half a pitch, or the ridges would bulge (#201).
        max: knurl.pattern === "round" ? Math.min(maxKnurlDepth(width), maxRoundKnurlDepth(width, knurl.count)) : maxKnurlDepth(width),
        step: 0.05,
        onChange: (value) => onUpdate({ knurlDepth: normalizeKnurlDepth(value, width) }),
      },
      { id: "knurlChamfer", label: t("prop.knurlChamfer"), value: knurl.chamfer, min: 0, max: Math.max(0.05, maxKnurlChamfer(width, shape.height)), step: 0.05, onChange: (value) => onUpdate({ knurlChamfer: normalizeKnurlChamfer(value, width, shape.height) }) },
    ];
    if (knurl.pattern === "diamond") {
      properties.push({ id: "knurlAngle", label: t("prop.knurlAngle"), value: knurl.angle, min: MIN_KNURL_ANGLE, max: MAX_KNURL_ANGLE, step: 1, onChange: (value) => onUpdate({ knurlAngle: normalizeKnurlAngle(value) }) });
    }
    return properties;
  }

  if (shape.kind === "hinge") {
    const plan = hingePlan({ ...shape, depth });
    return [
      { id: "width", label: t("prop.hingeLength"), value: width, min: MIN_SHAPE_SIZE, max: 300, onChange: setWidth },
      { id: "length", label: t("prop.hingeOpenWidth"), value: depth, min: minimumHingeDepth(shape.height, plan.leaf, plan.clearance), max: 300, onChange: setDepth },
      { id: "height", label: t("prop.hingeKnuckleDiameter"), value: shape.height, min: 2, max: 60, onChange: setHeight },
      {
        id: "hingeKnuckles",
        label: t("prop.hingeKnuckles"),
        value: plan.knuckles,
        min: MIN_HINGE_KNUCKLES,
        max: MAX_HINGE_KNUCKLES,
        step: 2,
        onChange: (value) => onUpdate({ hingeKnuckles: normalizeHingeKnuckles(value, width, plan.clearance) }),
      },
      {
        id: "hingePinDiameter",
        label: t("prop.hingePinDiameter"),
        value: plan.pinRadius * 2,
        min: 0.2,
        max: Math.max(0.4, shape.height - 2 * (plan.clearance + 0.4)),
        step: 0.1,
        onChange: (value) => {
          const pin = normalizeHingePinDiameter(value, shape.height, plan.clearance);
          onUpdate({ hingePinDiameter: pin, hingeLeafThickness: normalizeHingeLeafThickness(plan.leaf, shape.height, pin, plan.clearance) });
        },
      },
      {
        id: "hingeLeafThickness",
        label: t("prop.hingeLeafThickness"),
        value: plan.leaf,
        min: 0.4,
        max: Math.max(0.5, plan.radius - plan.boreRadius),
        step: 0.1,
        onChange: (value) => onUpdate({ hingeLeafThickness: normalizeHingeLeafThickness(value, shape.height, plan.pinRadius * 2, plan.clearance) }),
      },
      {
        id: "hingeClearance",
        label: t("prop.hingeClearance"),
        value: plan.clearance,
        min: MIN_HINGE_CLEARANCE,
        max: MAX_HINGE_CLEARANCE,
        step: 0.05,
        onChange: (value) => {
          const clearance = normalizeHingeClearance(value);
          const pin = normalizeHingePinDiameter(plan.pinRadius * 2, shape.height, clearance);
          onUpdate({ hingeClearance: clearance, hingePinDiameter: pin, hingeLeafThickness: normalizeHingeLeafThickness(plan.leaf, shape.height, pin, clearance) });
        },
      },
      ...roundSideProperties(shape, shape.height, shape.height, onUpdate),
    ];
  }

  if (shape.kind === "loft") {
    // Every value as the body shows it; a change keeps the bottom where it stands (#188).
    const m = loftMeasures(shape);
    const change = (next: Partial<LoftMeasures>) => onUpdate(loftShapePatch(shape, next));
    const outlines = [
      { value: "round", label: t("loft.round") },
      { value: "rectangle", label: t("loft.rectangle") },
      { value: "polygon", label: t("loft.polygon") },
    ];
    const end = (bottom: boolean): ShapePropertyConfig[] => {
      const outline = bottom ? m.bottomOutline : m.topOutline;
      const endWidth = bottom ? m.bottomWidth : m.topWidth;
      const endDepth = bottom ? m.bottomDepth : m.topDepth;
      const name = bottom ? "Bottom" : "Top";
      const properties: ShapePropertyConfig[] = [
        {
          type: "select",
          id: `loft${name}Outline`,
          label: t(bottom ? "prop.loftBottomOutline" : "prop.loftTopOutline"),
          value: outline,
          options: outlines,
          onChange: (value) => change(bottom ? { bottomOutline: normalizeLoftOutline(value) } : { topOutline: normalizeLoftOutline(value) }),
        },
        { id: `loft${name}Width`, label: t(bottom ? "prop.loftBottomWidth" : "prop.loftTopWidth"), value: endWidth, min: MIN_LOFT_SIZE, max: 300, onChange: (value) => change(bottom ? { bottomWidth: value } : { topWidth: value }) },
        { id: `loft${name}Depth`, label: t(bottom ? "prop.loftBottomDepth" : "prop.loftTopDepth"), value: endDepth, min: MIN_LOFT_SIZE, max: 300, onChange: (value) => change(bottom ? { bottomDepth: value } : { topDepth: value }) },
      ];
      if (outline === "rectangle") {
        properties.push({
          id: `loft${name}Corner`,
          label: t(bottom ? "prop.loftBottomCorner" : "prop.loftTopCorner"),
          value: bottom ? m.bottomCorner : m.topCorner,
          min: 0,
          max: Math.max(0.1, Math.min(endWidth, endDepth) / 2),
          step: 0.1,
          onChange: (value) => change(bottom ? { bottomCorner: value } : { topCorner: value }),
        });
      }
      if (outline === "polygon") {
        properties.push({
          id: `loft${name}Sides`,
          label: t(bottom ? "prop.loftBottomSides" : "prop.loftTopSides"),
          value: bottom ? m.bottomSides : m.topSides,
          min: MIN_LOFT_SIDES,
          max: MAX_LOFT_SIDES,
          step: 1,
          onChange: (value) => change(bottom ? { bottomSides: value } : { topSides: value }),
        });
      }
      return properties;
    };
    return [
      ...end(true),
      ...end(false),
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 300, onChange: setHeight },
      { id: "loftOffsetX", label: t("prop.loftOffsetX"), value: m.offsetX, min: -150, max: 150, step: 0.5, onChange: (value) => change({ offsetX: value }) },
      { id: "loftOffsetZ", label: t("prop.loftOffsetZ"), value: m.offsetZ, min: -150, max: 150, step: 0.5, onChange: (value) => change({ offsetZ: value }) },
      { id: "loftWall", label: t("prop.loftWall"), value: m.wall, min: 0, max: Math.max(0.1, maxLoftWall(m)), step: 0.1, onChange: (value) => change({ wall: value }) },
      // The sections turn and tilt evenly on the way up (#205); a tilt keeps the top above the plate.
      { id: "loftTwist", label: t("prop.loftTwist"), value: m.twist, min: -MAX_LOFT_TWIST, max: MAX_LOFT_TWIST, step: 5, onChange: (value) => change({ twist: value }) },
      { id: "loftTiltX", label: t("prop.loftTiltX"), value: m.tiltX, min: -loftTiltLimit(shape, "x"), max: loftTiltLimit(shape, "x"), step: 1, onChange: (value) => change({ tiltX: value }) },
      { id: "loftTiltZ", label: t("prop.loftTiltZ"), value: m.tiltZ, min: -loftTiltLimit(shape, "z"), max: loftTiltLimit(shape, "z"), step: 1, onChange: (value) => change({ tiltZ: value }) },
    ];
  }

  if (shape.kind === "dovetail") {
    const neck = normalizeDovetailNeckWidth(shape.dovetailNeckWidth, width);
    return [
      { id: "width", label: t("prop.dovetailWideEnd"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      {
        id: "dovetailNeckWidth",
        label: t("prop.dovetailNeckWidth"),
        value: neck,
        min: 0.1,
        max: Math.max(0.2, width * 0.95),
        step: 0.1,
        onChange: (value) => onUpdate({ dovetailNeckWidth: normalizeDovetailNeckWidth(value, width) }),
      },
      { id: "length", label: t("prop.dovetailLength"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      {
        id: "dovetailClearance",
        label: t("prop.dovetailClearance"),
        value: normalizeDovetailClearance(shape.dovetailClearance),
        min: 0,
        max: MAX_DOVETAIL_CLEARANCE,
        step: 0.05,
        onChange: (value) => onUpdate({ dovetailClearance: normalizeDovetailClearance(value) }),
      },
    ];
  }

  if (shape.kind === "slot") {
    // A smaller second end (#206): typed as its diameter, kept as a share of the large one, so
    // the handles scale both ends together. The centre distance sets the long side.
    const alongX = width >= depth;
    const large = alongX ? depth : width;
    const long = alongX ? width : depth;
    const tapered = taperedSlotOutline(width, depth, shape.slotEndRatio);
    const small = tapered ? tapered.r * 2 : large;
    const centreDistance = long - large / 2 - small / 2;
    const setLong = (value: number) => (alongX ? setWidth(value) : setDepth(value));
    return [
      ...roundSideProperties(shape, Math.min(width, depth), Math.min(width, depth), onUpdate),
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      {
        id: "slotSmallEnd",
        label: t("prop.slotSmallEnd"),
        value: small,
        min: Math.max(0.1, large * MIN_SLOT_END_RATIO),
        max: large,
        step: 0.1,
        onChange: (value) => {
          // The large end and the centre distance stay; the long side follows the small end.
          const ratio = normalizeSlotEndRatio(value / Math.max(0.01, large));
          const nextLong = Math.max(large, centreDistance + large / 2 + (large * ratio) / 2);
          onUpdate(alongX
            ? { slotEndRatio: ratio, width: nextLong, size: resizedShapeSize(nextLong, depth) }
            : { slotEndRatio: ratio, depth: nextLong, size: resizedShapeSize(width, nextLong) });
        },
      },
      {
        id: "slotCentreDistance",
        label: t("prop.slotCentreDistance"),
        value: Math.max(0, centreDistance),
        min: Math.max(0, large / 2 - small / 2 + 0.01),
        max: 160,
        step: 0.1,
        onChange: (value) => setLong(value + large / 2 + small / 2),
      },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "ellipse") {
    return [
      ...roundSideProperties(shape, width, depth, onUpdate),
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "ruler") {
    // Nur die Laenge ist einstellbar - Kreuzbreite und Dicke des Lineals stehen fest.
    return [
      { id: "width", label: t("prop.length"), value: width, min: 30, max: 500, onChange: setWidth },
    ];
  }

  if (shape.kind === "sphere") {
    return [
      { id: "steps", label: t("prop.steps"), value: shape.steps ?? 24, min: 6, max: MAX_HIGH_RESOLUTION_STEPS, step: 1, onChange: (steps) => onUpdate({ steps: Math.round(steps) }) },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "halfSphere") {
    return [
      { id: "steps", label: t("prop.steps"), value: shape.steps ?? 32, min: 6, max: MAX_HIGH_RESOLUTION_STEPS, step: 1, onChange: (steps) => onUpdate({ steps: Math.round(steps) }) },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "cone") {
    return [
      { id: "topRadius", label: t("prop.topRadius"), value: shape.topRadius ?? 0, min: 0, max: 40, onChange: (topRadius) => onUpdate({ topRadius }) },
      { id: "baseRadius", label: t("prop.baseRadius"), value: shape.baseRadius ?? baseWidth / 2, min: MIN_SHAPE_SIZE, max: 80, onChange: setBaseRadius },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setConeWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      ...roundSideProperties(shape, width, depth, onUpdate),
    ];
  }

  if (shape.kind === "polygon") {
    return [
      {
        id: "sides",
        label: t("prop.sides"),
        value: shape.sides ?? 6,
        min: 3,
        max: 24,
        step: 1,
        onChange: (value) => {
          // Ein Fuenfkant hat ein anderes Verhaeltnis von Breite zu Tiefe als
          // ein Sechskant. Zieht man es nicht mit, wird aus dem gleichseitigen
          // Vieleck beim Umschalten ein gestauchtes.
          const nextSides = Math.round(value);
          const current = regularPolygonAspect(shape.sides ?? 6);
          const next = regularPolygonAspect(nextSides);
          const nextWidth = Math.max(MIN_SHAPE_SIZE, (width / current.width) * next.width);
          const nextDepth = Math.max(MIN_SHAPE_SIZE, (depth / current.depth) * next.depth);
          onUpdate({ sides: nextSides, width: nextWidth, depth: nextDepth, size: resizedShapeSize(nextWidth, nextDepth) });
        },
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "pyramid") {
    // Null oben heisst Spitze. Alles darueber schneidet sie ab - das ist
    // dasselbe, was die Verjuengung bei den uebrigen Koerpern tut, nur kann
    // sie es hier nicht: die Spitze liegt auf der Achse, und ein Vielfaches
    // von null bleibt null.
    return [
      { id: "sides", label: t("prop.sides"), value: shape.sides ?? 4, min: 3, max: 24, step: 1, onChange: (sides) => onUpdate({ sides: Math.round(sides) }) },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      {
        id: "topLength",
        label: t("prop.topLength"),
        value: normalizePyramidTop(shape.topDepth, depth),
        min: 0,
        max: 160,
        onChange: (topDepth) => onUpdate({ topDepth: normalizePyramidTop(topDepth, depth) }),
      },
      {
        id: "topWidth",
        label: t("prop.topWidth"),
        value: normalizePyramidTop(shape.topWidth, width),
        min: 0,
        max: 160,
        onChange: (topWidth) => onUpdate({ topWidth: normalizePyramidTop(topWidth, width) }),
      },
    ];
  }

  if (shape.kind === "roundRoof") {
    return [
      { id: "sides", label: t("prop.sides"), value: shape.sides ?? 64, min: 4, max: MAX_HIGH_RESOLUTION_SIDES, step: 1, onChange: (sides) => onUpdate({ sides: Math.round(sides) }) },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "tube" || shape.kind === "ring") {
    return [
      ...roundSideProperties(shape, width, depth, onUpdate),
      { id: "thickness", label: t("prop.thickness"), value: shape.bevel ?? 4, min: 0.5, max: 20, onChange: (bevel) => onUpdate({ bevel }) },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "spring") {
    const across = Math.max(width, depth);
    const settings = springSettings(shape, across, shape.height);
    const wireLimits = springWireLimits(across, shape.height);
    const turnLimits = springTurnLimits(across, shape.height, settings.wire);
    /*
     * Draht und Windungen haengen an den Massen: eine flachere Feder traegt
     * weniger Windungen, eine duennere weniger Draht. Wer an den Massen zieht,
     * bekommt sie deshalb gleich mit in die neuen Grenzen gerueckt, statt
     * einen Koerper zu sehen, der sich selbst durchdringt.
     */
    const fit = (nextWidth: number, nextDepth: number, nextHeight: number) => {
      const reach = Math.max(nextWidth, nextDepth);
      const wire = normalizeSpringWire(settings.wire, reach, nextHeight);
      return { springWire: wire, springTurns: normalizeSpringTurns(settings.turns, reach, nextHeight, wire) };
    };
    return [
      {
        id: "turns",
        label: t("prop.turns"),
        value: settings.turns,
        min: turnLimits.min,
        max: turnLimits.max,
        step: 1,
        onChange: (turns) => onUpdate({ springTurns: normalizeSpringTurns(turns, across, shape.height, settings.wire) }),
      },
      {
        id: "wire",
        label: t("prop.wire"),
        value: settings.wire,
        min: wireLimits.min,
        max: wireLimits.max,
        step: 0.1,
        onChange: (value) => {
          const wire = normalizeSpringWire(value, across, shape.height);
          onUpdate({ springWire: wire, springTurns: normalizeSpringTurns(settings.turns, across, shape.height, wire) });
        },
      },
      {
        type: "select",
        id: "springHand",
        label: t("prop.springHand"),
        value: settings.hand,
        options: [{ value: "right", label: t("spring.right") }, { value: "left", label: t("spring.left") }],
        onChange: (hand) => onUpdate({ springHand: normalizeSpringHand(hand) }),
      },
      {
        id: "quality",
        label: t("prop.quality"),
        value: settings.quality,
        min: MIN_SPRING_QUALITY,
        max: MAX_SPRING_QUALITY,
        step: 4,
        onChange: (quality) => onUpdate({ springQuality: normalizeSpringQuality(quality) }),
      },
      {
        id: "length",
        label: t("prop.length"),
        value: depth,
        min: MIN_SHAPE_SIZE,
        max: 160,
        onChange: (value) => onUpdate({ depth: value, size: resizedShapeSize(width, value), ...fit(width, value, shape.height) }, { resizeAxis: "depth" }),
      },
      {
        id: "width",
        label: t("prop.width"),
        value: width,
        min: MIN_SHAPE_SIZE,
        max: 160,
        onChange: (value) => onUpdate({ width: value, size: resizedShapeSize(value, depth), ...fit(value, depth, shape.height) }, { resizeAxis: "width" }),
      },
      {
        id: "height",
        label: t("prop.height"),
        value: shape.height,
        min: MIN_SHAPE_SIZE,
        max: 160,
        onChange: (value) => onUpdate({ height: value, ...fit(width, depth, value) }, { resizeAxis: "height" }),
      },
    ];
  }

  if (shape.kind === "thread") {
    const settings = threadSettings(shape);
    const standard = threadSizeFor(settings.diameter, settings.pitch);
    const standardSeries = standard ? threadSeriesFor(standard) : null;
    const pitchLimits = threadPitchLimits(settings.diameter);
    const headLimits = threadHeadHeightLimits(settings);
    const chamferLimits = threadChamferLimits(settings);
    const headChamferLimits = threadHeadChamferLimits(settings);
    // Zollgewinde werden in Gaengen je Zoll gedacht, nicht in Millimetern.
    const inchPitch = threadUsesInchPitch(settings.diameter);
    const sizeOptions = [
      ...THREAD_SIZE_GROUPS.flatMap((group) => group.sizes.map((size) => ({
        value: size.id,
        label: size.id,
        group: t(THREAD_SERIES_TEXT[group.series].group),
      }))),
      { value: "custom", label: t("thread.customSize") },
    ];
    // Die Hoehe des Koerpers bleibt Kopf plus Gewinde; abgefragt wird aber das
    // Gewinde, weil ein Mass, das den Kopf mitzaehlt, niemandem etwas sagt.
    const threadLength = Math.max(MIN_SHAPE_SIZE, shape.height - settings.headHeight);
    const headFollowsStandard = Math.abs(settings.headHeight - defaultThreadHeadHeight(settings)) < 1e-6;
    /**
     * Breite und Tiefe stehen nicht mehr zur Wahl - sie folgen dem Durchmesser
     * und der Rolle. Wer am Durchmesser dreht, bekommt einen runden Koerper in
     * der richtigen Groesse, und der Kopf waechst mit, solange er auf seinem
     * Normmass steht.
     */
    const applyThread = (patch: Partial<ThreadSettings>, nextLength?: number, resetHeight = false) => {
      const next: ThreadSettings = { ...settings, ...patch };
      next.diameter = normalizeThreadDiameter(next.diameter);
      next.pitch = normalizeThreadPitch(next.pitch, next.diameter);
      next.clearance = normalizeThreadClearance(next.clearance);
      next.boltClearance = normalizeThreadBoltClearance(next.boltClearance);
      next.quality = normalizeThreadQuality(next.quality);
      next.chamfer = normalizeThreadChamfer(next.chamfer, { role: next.role, diameter: next.diameter, pitch: next.pitch, profile: next.profile });
      const headBase = { role: next.role, head: next.head, diameter: next.diameter, pitch: next.pitch };
      const keepHeadHeight = patch.headHeight !== undefined || !headFollowsStandard;
      next.headHeight = normalizeThreadHeadHeight(
        keepHeadHeight ? next.headHeight : defaultThreadHeadHeight(headBase),
        headBase,
      );
      // Die Kopffase haengt am Kopf: wer den Kopf flacher zieht oder auf
      // Senkkopf umschaltet, darf keine Fase behalten, die es dort nicht gibt.
      next.headChamfer = normalizeThreadHeadChamfer(next.headChamfer, { ...headBase, headHeight: next.headHeight, profile: next.profile });
      const footprint = threadNaturalFootprint(next);
      const update: Partial<WorkplaneShape> = {
        threadRole: next.role,
        threadHead: next.head,
        threadHand: next.hand,
        threadProfile: next.profile,
        threadDiameter: next.diameter,
        threadPitch: next.pitch,
        threadClearance: next.clearance,
        threadBoltClearance: next.boltClearance,
        threadQuality: next.quality,
        threadHeadHeight: next.headHeight,
        threadChamfer: next.chamfer,
        threadHeadChamfer: next.headChamfer,
        width: footprint.width,
        depth: footprint.depth,
        size: resizedShapeSize(footprint.width, footprint.depth),
        height: resetHeight
          ? threadNaturalHeight(next)
          : Math.max(MIN_SHAPE_SIZE, (nextLength ?? threadLength) + next.headHeight),
      };
      // Ein Gewindeloch ist zum Abziehen da, alles andere ist Material.
      if (next.role === "bore") update.hole = true;
      else if (settings.role === "bore") update.hole = false;
      onUpdate(update);
    };
    const properties: ShapePropertyConfig[] = [
      {
        type: "select",
        id: "threadRole",
        label: t("inspector.threadRole"),
        value: settings.role,
        options: THREAD_ROLE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })),
        onChange: (role) => applyThread({ role: normalizeThreadRole(role) }, undefined, true),
      },
    ];
    if (settings.role === "screw") {
      properties.push({
        type: "select",
        id: "threadHead",
        label: t("inspector.threadHead"),
        value: settings.head,
        options: THREAD_HEAD_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })),
        onChange: (head) => applyThread({ head: normalizeThreadHead(head) }),
      });
    }
    properties.push(
      {
        type: "select",
        id: "threadSize",
        label: t("prop.threadSize"),
        value: standard ? standard.id : "custom",
        options: sizeOptions,
        hint: standardSeries ? t(THREAD_SERIES_TEXT[standardSeries].hint) : undefined,
        onChange: (value) => {
          const chosen = threadSizeById(value);
          // Eine G-Groesse bringt ihr Whitworth-Profil mit, eine M-, UNC- oder
          // UNF-Groesse das Spitzgewinde; Trapez und Rund bleiben stehen.
          if (chosen) applyThread({ diameter: chosen.diameter, pitch: chosen.pitch, profile: threadProfileForSize(chosen, settings.profile) });
        },
      },
      {
        id: "diameter",
        label: t("prop.diameter"),
        value: settings.diameter,
        min: MIN_THREAD_DIAMETER,
        max: MAX_THREAD_DIAMETER,
        step: 0.1,
        onChange: (diameter) => applyThread({ diameter }),
      },
      {
        id: "threadLength",
        // Eine Mutter hat keine Gewindelaenge, sie hat eine Hoehe.
        label: settings.role === "nut" ? t("prop.height") : t("prop.length"),
        value: threadLength,
        min: MIN_SHAPE_SIZE,
        max: 160,
        onChange: (length) => applyThread({}, length),
      },
    );
    if (settings.role === "screw") {
      properties.push({
        id: "headHeight",
        label: t("prop.headHeight"),
        value: settings.headHeight,
        min: headLimits.min,
        max: headLimits.max,
        step: 0.1,
        onChange: (headHeight) => applyThread({ headHeight }),
      });
    }
    /*
     * Die Aussenfase gibt es am Schraubenkopf und an der Mutter: beide haben
     * eine scharfe Aussenkante an beiden Stirnflaechen, und beide sind in
     * Wirklichkeit dort gefast. Der Senkkopf ist schon ein Kegel - dort gibt
     * es nichts zu brechen, und die Grenze sagt das mit einem Hoechstwert von
     * null.
     */
    if (headChamferLimits.max > 0) {
      properties.push({
        id: "headChamfer",
        label: t(settings.role === "nut" ? "prop.rimChamfer" : "prop.headChamfer"),
        value: settings.headChamfer,
        min: headChamferLimits.min,
        max: headChamferLimits.max,
        step: 0.05,
        onChange: (headChamfer) => applyThread({ headChamfer }),
      });
    }
    properties.push(
      inchPitch
        ? {
          // Eine eigene Kennung: unter "pitch" galt die Gangzahl als Laenge,
          // trug "mm" und wurde in einem Zoll-Arbeitsbereich umgerechnet.
          id: "threadsPerInch",
          label: t("prop.threadsPerInch"),
          value: pitchToThreadsPerInch(settings.pitch),
          min: Math.max(4, Math.ceil(pitchToThreadsPerInch(pitchLimits.max))),
          max: Math.min(80, Math.floor(pitchToThreadsPerInch(pitchLimits.min))),
          step: 1,
          onChange: (perInch) => applyThread({ pitch: threadsPerInchToPitch(Math.round(perInch)) }),
        }
        : {
          id: "pitch",
          label: t("prop.pitch"),
          value: settings.pitch,
          min: pitchLimits.min,
          max: pitchLimits.max,
          step: 0.05,
          onChange: (pitch) => applyThread({ pitch }),
        },
      {
        type: "select",
        id: "threadHand",
        label: t("prop.threadHand"),
        value: settings.hand,
        options: [{ value: "right", label: t("thread.right") }, { value: "left", label: t("thread.left") }],
        onChange: (hand) => applyThread({ hand: normalizeThreadHand(hand) }),
      },
      {
        type: "select",
        id: "threadProfile",
        label: t("prop.threadProfile"),
        value: settings.profile,
        options: THREAD_PROFILE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })),
        onChange: (profile) => applyThread({ profile: normalizeThreadProfile(profile) }),
      },
    );
    if (settings.role === "bore" || settings.role === "nut") {
      properties.push({
        id: "clearance",
        label: t("prop.clearance"),
        value: settings.clearance,
        min: MIN_THREAD_CLEARANCE,
        max: MAX_THREAD_CLEARANCE,
        step: 0.05,
        onChange: (clearance) => applyThread({ clearance }),
      });
    } else {
      // Stange und Schraube: das Spiel macht den Bolzen duenner, fuer eine
      // Mutter aus Metall, die selbst keins hat.
      properties.push({
        id: "boltClearance",
        label: t("prop.clearance"),
        value: settings.boltClearance,
        min: MIN_THREAD_BOLT_CLEARANCE,
        max: MAX_THREAD_BOLT_CLEARANCE,
        step: 0.05,
        onChange: (boltClearance) => applyThread({ boltClearance }),
      });
    }
    properties.push({
      id: "chamfer",
      label: t("prop.chamfer"),
      value: settings.chamfer,
      min: chamferLimits.min,
      max: chamferLimits.max,
      step: 0.05,
      onChange: (chamfer) => applyThread({ chamfer }),
    });
    properties.push({
      id: "quality",
      label: t("prop.quality"),
      value: settings.quality,
      min: MIN_THREAD_QUALITY,
      max: MAX_THREAD_QUALITY,
      step: 6,
      onChange: (quality) => applyThread({ quality }),
    });
    return properties;
  }

  if (shape.kind === "gear") {
    const gearType = normalizeGearType(shape.gearType);
    // A ring gear and a rack (#201) have no straight teeth; "simple" counts as involute there.
    const modular = gearTypeIsModular(gearType);
    const gearProfile = gearToothProfile(shape);
    // Involute and round teeth are set by module (#201); the pressure angle is the involute's own.
    const involute = gearProfile !== "simple";
    const teeth = shape.teeth ?? DEFAULT_GEAR_TEETH;
    const module = gearModuleOf({ ...shape, width, depth });
    // A gear set by module stays round: its size is module x (teeth + 2) both ways, round teeth module x (teeth + 1.2);
    // a ring gear adds its rim, a rack is teeth x pitch long and keeps its depth.
    const setInvoluteSize = (nextModule: number, nextTeeth = teeth, patch: Partial<WorkplaneShape> = {}) => {
      const next = gearSizeForModule(nextModule, { ...shape, ...patch, width, depth }, nextTeeth);
      const profile = { ...shape, ...patch, teeth: nextTeeth };
      onUpdate({
        ...patch,
        teeth: nextTeeth,
        width: next.width,
        depth: next.depth,
        size: Math.max(next.width, next.depth),
        centerHoleSize: normalizeGearCenterHoleSize(shape.centerHoleSize, next.width, next.depth, shape.toothSize, profile),
      }, { resizeAxis: "width" });
    };
    const setGearWidth = (value: number) => {
      if (gearType === "rack") return setInvoluteSize(rackModule(value, teeth));
      if (involute) return setInvoluteSize(gearModuleOf({ ...shape, width: value, depth: value }));
      const toothSize = normalizeGearToothSize(shape.toothSize, value, depth);
      const toothWidth = normalizeGearToothWidth(shape.toothWidth, value, depth, shape.teeth);
      const centerHoleSize = normalizeGearCenterHoleSize(shape.centerHoleSize, value, depth, toothSize);
      onUpdate({ width: value, size: resizedShapeSize(value, depth), toothSize, toothWidth, centerHoleSize }, { resizeAxis: "width" });
    };
    const setGearDepth = (value: number) => {
      // A rack's depth is its bar: free, as long as the teeth and a little bar fit in.
      if (gearType === "rack") {
        const nextDepth = Math.max(rackMinDepth(module, gearProfile), value);
        return onUpdate({ depth: nextDepth, size: Math.max(width, nextDepth) }, { resizeAxis: "depth" });
      }
      if (involute) return setInvoluteSize(gearModuleOf({ ...shape, width: value, depth: value }));
      const toothSize = normalizeGearToothSize(shape.toothSize, width, value);
      const toothWidth = normalizeGearToothWidth(shape.toothWidth, width, value, shape.teeth);
      const centerHoleSize = normalizeGearCenterHoleSize(shape.centerHoleSize, width, value, toothSize);
      onUpdate({ depth: value, size: resizedShapeSize(width, value), toothSize, toothWidth, centerHoleSize }, { resizeAxis: "depth" });
    };
    const toothPitch = gearToothPitch(width, depth, teeth);
    const toothSize = normalizeGearToothSize(shape.toothSize ?? DEFAULT_GEAR_TOOTH_SIZE, width, depth);
    const centerHoleLimits = gearCenterHoleLimits(width, depth, toothSize, shape);
    const pitchDiameter = module * teeth;
    const properties: ShapePropertyConfig[] = [
      {
        type: "select",
        id: "gearProfile",
        label: t("prop.gearProfile"),
        value: gearProfile,
        options: [
          { value: "involute", label: t("gear.profileInvolute") },
          { value: "round", label: t("gear.profileRound") },
          ...(modular ? [] : [{ value: "simple", label: t("gear.profileSimple") }]),
        ],
        hint: gearType === "rack"
          ? t(gearProfile === "round" ? "gear.rackRoundHint" : "gear.rackHint", { pitchLength: plainNumber(Math.PI * module), module: plainNumber(module), offset: plainNumber(gearAddendum(gearProfile) * module) })
          : gearType === "internal"
            ? t(gearProfile === "round" ? "gear.internalRoundHint" : "gear.internalHint", { pitch: plainNumber(pitchDiameter), module: plainNumber(module) })
            : gearProfile === "involute"
              ? t("gear.involuteHint", { pitch: plainNumber(pitchDiameter), module: plainNumber(module) })
              : gearProfile === "round"
                ? t("gear.roundHint", { pitch: plainNumber(pitchDiameter), module: plainNumber(module) })
                : t("gear.simpleHint"),
        onChange: (value) => {
          if (value === "involute" || value === "round") {
            // Between involute and round the module stays; from simple teeth the size stays as
            // near as a whole tenth of a module allows.
            const nextModule = involute ? module : Math.max(0.1, Math.round(involuteGearModule(width, depth, teeth, value) * 10) / 10);
            const next = gearSizeForModule(nextModule, { ...shape, gearProfile: value, width, depth }, teeth);
            onUpdate({
              gearProfile: value,
              gearPressureAngle: normalizeGearPressureAngle(shape.gearPressureAngle),
              gearBacklash: shape.gearBacklash ?? DEFAULT_GEAR_BACKLASH,
              width: next.width,
              depth: next.depth,
              size: Math.max(next.width, next.depth),
              centerHoleSize: normalizeGearCenterHoleSize(shape.centerHoleSize, next.width, next.depth, shape.toothSize, { teeth, gearProfile: value }),
            });
          } else {
            onUpdate({ gearProfile: "simple", centerHoleSize: normalizeGearCenterHoleSize(shape.centerHoleSize, width, depth, toothSize) });
          }
        },
      },
      {
        id: "teeth",
      label: t("prop.teeth"),
        value: teeth,
        min: 6,
        max: 64,
        step: 1,
        onChange: (value) => {
          const nextTeeth = Math.round(value);
          if (involute) return setInvoluteSize(module, nextTeeth);
          onUpdate({
            teeth: nextTeeth,
            toothWidth: normalizeGearToothWidth(shape.toothWidth, width, depth, nextTeeth),
          });
        },
      },
    ];
    if (involute) {
      properties.push(
        {
          id: "gearModule",
          label: t("prop.gearModule"),
          value: module,
          min: 0.3,
          max: 10,
          step: 0.05,
          onChange: (nextModule) => setInvoluteSize(nextModule),
        },
        ...(gearProfile === "involute" ? [{
          id: "gearPressureAngle",
          label: t("prop.gearPressureAngle"),
          value: normalizeGearPressureAngle(shape.gearPressureAngle),
          min: MIN_GEAR_PRESSURE_ANGLE,
          max: MAX_GEAR_PRESSURE_ANGLE,
          step: 0.5,
          onChange: (gearPressureAngle: number) => onUpdate({ gearPressureAngle }),
        }] : []),
        {
          id: "gearBacklash",
          label: t("prop.gearBacklash"),
          value: normalizeGearBacklash(shape.gearBacklash, module),
          min: 0,
          max: Math.min(MAX_GEAR_BACKLASH, module * 0.5),
          step: 0.05,
          onChange: (gearBacklash) => onUpdate({ gearBacklash }),
        },
      );
      // The ring gear's rim grows its outside; the module stays.
      if (gearType === "internal") properties.push({
        id: "gearRim",
        label: t("prop.gearRim"),
        value: normalizeGearRim(shape.gearRim),
        min: MIN_GEAR_RIM,
        max: MAX_GEAR_RIM,
        step: 0.1,
        onChange: (gearRim) => setInvoluteSize(module, teeth, { gearRim }),
      });
    }
    if (!involute) properties.push(
      {
        id: "toothSize",
      label: t("prop.toothSize"),
        value: toothSize,
        min: 0.2,
        max: Math.max(0.2, Math.min(width, depth) * 0.22),
        step: 0.1,
        onChange: (nextToothSize) => onUpdate({
          toothSize: nextToothSize,
          centerHoleSize: normalizeGearCenterHoleSize(shape.centerHoleSize, width, depth, nextToothSize),
        }),
      },
      {
        id: "toothWidth",
      label: t("prop.toothWidth"),
        value: normalizeGearToothWidth(shape.toothWidth, width, depth, teeth),
        min: toothPitch * 0.12,
        max: toothPitch * 0.82,
        step: 0.1,
        onChange: (toothWidth) => onUpdate({ toothWidth }),
      },
    );
    if (normalizeGearType(shape.gearType) === "helical") {
      properties.push({
        id: "helixAngle",
      label: t("prop.helixAngle"),
        value: normalizeGearHelixAngle(shape.helixAngle ?? DEFAULT_GEAR_HELIX_ANGLE),
        min: MIN_GEAR_HELIX_ANGLE,
        max: MAX_GEAR_HELIX_ANGLE,
        step: 1,
        onChange: (helixAngle) => onUpdate({ helixAngle }),
      });
      properties.push({
        id: "quality",
      label: t("prop.quality"),
        value: normalizeGearHelixQuality(shape.helixQuality ?? DEFAULT_GEAR_HELIX_QUALITY),
        min: MIN_GEAR_HELIX_QUALITY,
        max: MAX_GEAR_HELIX_QUALITY,
        step: 1,
        onChange: (helixQuality) => onUpdate({ helixQuality: Math.round(helixQuality) }),
      });
    }
    // A ring gear is a bore itself, a rack has none.
    if (!modular) properties.push({
      id: "centerHole",
      label: t("prop.centerHole"),
      value: normalizeGearCenterHoleSize(shape.centerHoleSize, width, depth, toothSize, shape),
      min: centerHoleLimits.min,
      max: centerHoleLimits.max,
      step: 0.1,
      onChange: (centerHoleSize) => onUpdate({ centerHoleSize }),
    });
    properties.push(
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setGearDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setGearWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    );
    return properties;
  }

  if (shape.kind === "text") {
    const isCurved = Boolean(shape.textCurved);
    const properties: ShapePropertyConfig[] = [
      {
        type: "text",
        id: "text",
        label: t("prop.text"),
        value: shape.text ?? "TEXT",
        onChange: (text) => {
          const nextText = text.slice(0, 24) || " ";
          const nextWidth = clamp(Math.max(Math.min(46, textWidthMax), nextText.length * 19), MIN_SHAPE_SIZE, textWidthMax);
          onUpdate({ text: nextText, width: nextWidth, size: nextWidth });
        },
      },
      textFontProperty(shape, onUpdate),
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 40, onChange: setHeight },
      ...textFillProperties(shape, onUpdate),
      // A fill mode or the silhouette draws the letters flat; bevel and segments belong to the filled letters.
      ...(textHasFill(shape) ? [] : [
        { id: "bevel", label: t("prop.bevel"), value: shape.bevel ?? 0, min: 0, max: 8, onChange: (bevel: number) => onUpdate({ bevel }) },
        { id: "segments", label: t("prop.segments"), value: shape.segments ?? 0, min: 0, max: 24, step: 1, onChange: (segments: number) => onUpdate({ segments: Math.round(segments) }) },
      ] satisfies ShapePropertyConfig[]),
      {
        type: "toggle",
        id: "textCurved",
        label: t("prop.textCurved"),
        value: isCurved,
        // Radius, letter size and the box follow in curvedTextPatch.
        onChange: (textCurved) => onUpdate({ textCurved }),
      },
    ];
    if (isCurved) {
      properties.push(
        {
          id: "textRadius",
          label: t("prop.textRadius"),
          value: shape.textRadius ?? 30,
          min: 5,
          max: 500,
          step: 1,
          onChange: (textRadius) => onUpdate({ textRadius }),
        },
        {
          id: "textSize",
          label: t("prop.textSize"),
          value: shape.textSize ?? 10,
          min: 0.5,
          max: 200,
          step: 0.5,
          onChange: (textSize) => onUpdate({ textSize }),
        },
        {
          type: "toggle",
          id: "textInward",
          label: t("prop.textInward"),
          value: Boolean(shape.textInward),
          onChange: (textInward) => onUpdate({ textInward }),
        },
        {
          type: "toggle",
          id: "textFlipped",
          label: t("prop.textFlipped"),
          value: Boolean(shape.textFlipped),
          onChange: (textFlipped) => onUpdate({ textFlipped }),
        },
      );
    }
    return properties;
  }

  return [
    { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
    { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
    { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
  ];
}

/**
 * How a text is filled (#215), as Tinkercad lists it: one list - filled, outline, outer line,
 * inner line - and, for a line, its width and corners right under it. The silhouette and "Wider"
 * (the filled letters grown by the line width, its corners beside it) are rarer and sit under
 * "More" (TEXT_FILL_MORE_IDS). The box follows the fill (textFillPatch), the letters stay as
 * they are.
 */
const TEXT_FILL_MORE_IDS = new Set(["textWiderCorners", "textSilhouette", "textWider"]);
const TEXT_FILL_IN_VIEW_IDS = new Set(["textFill", "textLineWidth", "textCorners"]);

function textFillProperties(shape: WorkplaneShape, onUpdate: ShapeInspectorUpdate): ShapePropertyConfig[] {
  const stroke = normalizeSketchStroke(shape.textStroke);
  const setStroke = (textStroke: SketchStroke | undefined) => onUpdate({ textStroke });
  const wider = stroke?.align === "grow";
  const fill: ShapePropertyConfig = {
    type: "select",
    id: "textFill",
    label: t("prop.textFill"),
    value: textFillChoice(stroke),
    options: TEXT_FILL_CHOICES.map(({ choice }) => ({ value: choice, label: t(`prop.textFill.${choice}`) })),
    hint: wider ? t("prop.sketchFill.growHint") : (stroke || shape.textSilhouette) && (shape.bevel ?? 0) > 0 ? t("prop.textFillHint") : undefined,
    onChange: (value) => setStroke(textStrokeForChoice(value as TextFillChoice, stroke)),
  };
  const lineWidth: ShapePropertyConfig[] = stroke ? [{
    id: "textLineWidth",
    label: t(wider ? "textLayers.grow" : "prop.sketchLineWidth"),
    value: stroke.width,
    min: MIN_SKETCH_STROKE_WIDTH,
    max: 50,
    step: 0.1,
    onChange: (width) => setStroke({ ...stroke, width: Math.min(MAX_SKETCH_STROKE_WIDTH, Math.max(MIN_SKETCH_STROKE_WIDTH, width)) }),
  }] : [];
  const corners: ShapePropertyConfig[] = stroke ? [{
    type: "select",
    // A line's corners stand under the list; "Wider"'s go with its switch under "More".
    id: textLineSettingsInView(stroke) ? "textCorners" : "textWiderCorners",
    label: t("sketch.strokeJoin"),
    value: stroke.join,
    options: SKETCH_STROKE_JOINS.map((join) => ({ value: join, label: t(`sketch.strokeJoin.${join}`) })),
    onChange: (join) => setStroke({ ...stroke, join: join as SketchStrokeJoin }),
  }] : [];
  return [
    fill,
    ...lineWidth,
    ...(wider ? [] : corners),
    {
      type: "toggle",
      id: "textSilhouette",
      label: t("prop.sketchSilhouette"),
      value: Boolean(shape.textSilhouette),
      onChange: (value) => onUpdate({ textSilhouette: value || undefined }),
    },
    {
      type: "toggle",
      id: "textWider",
      label: t("prop.textWider"),
      value: wider,
      onChange: (value) => setStroke(textStrokeWider(value, stroke)),
    },
    ...(wider ? corners : []),
  ];
}

/**
 * How an extruded sketch body is filled, without opening the sketch (#197, as Tinkercad's SVG
 * fill modes): the area, a stroke outside, inside or centred on its lines with a width and
 * corners, and the silhouette that leaves its holes out. The editor builds the body again.
 */
function sketchFillProperties(profile: SketchProfile, onUpdate: ShapeInspectorUpdate): ShapePropertyConfig[] {
  const stroke = normalizeSketchStroke(profile.stroke);
  const update = (patch: Partial<SketchProfile>) => {
    const next: SketchProfile = { ...profile, ...patch };
    if (!next.stroke) delete next.stroke;
    if (!next.silhouette) delete next.silhouette;
    onUpdate({ sketchProfile: next });
  };
  const fill: ShapePropertyConfig = {
    type: "select",
    id: "sketchFill",
    label: t("prop.sketchFill"),
    value: stroke ? stroke.align : "area",
    options: [
      { value: "area", label: t("prop.sketchFill.area") },
      { value: "outside", label: t("prop.sketchFill.outside") },
      { value: "inside", label: t("prop.sketchFill.inside") },
      { value: "center", label: t("prop.sketchFill.center") },
      { value: "grow", label: t("prop.sketchFill.grow") },
    ],
    hint: stroke?.align === "grow" ? t("prop.sketchFill.growHint") : undefined,
    onChange: (value) => update({
      stroke: value === "area" ? undefined : { ...(stroke ?? DEFAULT_SKETCH_STROKE), align: value as SketchStrokeAlign },
    }),
  };
  const silhouette: ShapePropertyConfig = {
    type: "toggle",
    id: "sketchSilhouette",
    label: t("prop.sketchSilhouette"),
    value: Boolean(profile.silhouette),
    onChange: (value) => update({ silhouette: value || undefined }),
  };
  if (!stroke) return [fill, silhouette];
  return [
    fill,
    {
      id: "sketchLineWidth",
      label: t("prop.sketchLineWidth"),
      value: stroke.width,
      min: MIN_SKETCH_STROKE_WIDTH,
      max: 50,
      step: 0.1,
      onChange: (width) => update({ stroke: { ...stroke, width: Math.min(MAX_SKETCH_STROKE_WIDTH, Math.max(MIN_SKETCH_STROKE_WIDTH, width)) } }),
    },
    {
      type: "select",
      id: "sketchCorners",
      label: t("sketch.strokeJoin"),
      value: stroke.join,
      options: SKETCH_STROKE_JOINS.map((join) => ({ value: join, label: t(`sketch.strokeJoin.${join}`) })),
      onChange: (join) => update({ stroke: { ...stroke, join: join as SketchStrokeJoin } }),
    },
    silhouette,
  ];
}

/**
 * The text's font: the built-in ones, then the fonts of one's own this browser keeps or the open
 * design brought along, and "Your own fonts …" to add one. A font the design names but nobody
 * has here shows as missing; its text is drawn in Multilanguage meanwhile.
 */
function textFontProperty(shape: WorkplaneShape, onUpdate: ShapeInspectorUpdate): ShapePropertyConfig {
  const current = shape.font ?? "Multilanguage";
  const builtIn = t("font.builtInGroup");
  const own = t("font.customGroup");
  const options: SelectPropertyOption[] = [
    ...TEXT_FONT_OPTIONS.map((value) => ({ value, label: value, group: builtIn })),
    ...customFontList().map((font) => ({ value: font.id, label: font.name, group: own })),
  ];
  if (!options.some((option) => option.value === current)) options.push({ value: current, label: textFontLabel(current) ?? t("font.missing"), group: own });
  options.push({ value: FONT_MANAGER_OPTION, label: t("font.manage"), group: own });
  return {
    type: "select",
    id: "font",
    label: t("prop.font"),
    value: current,
    options,
    onChange: (font) => {
      if (font === FONT_MANAGER_OPTION) requestFontManager();
      else onUpdate({ font });
    },
  };
}

function getShapeProperties(shape: WorkplaneShape, onUpdate: ShapeInspectorUpdate, workspace: WorkplaneWorkspaceSettings): ShapePropertyConfig[] {
  const customLimit = workspace.shapeCustomizations[shape.kind]?.maxDimension;
  const properties = getShapePropertiesWithAppLimits(shape, onUpdate, customLimit ?? 260);
  if (customLimit === undefined) return properties;
  return properties.map((property) => {
    if (property.type === "text" || property.type === "select") return property;
    if (["length", "width", "height", "threadLength"].includes(property.id)) return { ...property, max: customLimit };
    if (["topRadius", "baseRadius"].includes(property.id)) return { ...property, max: customLimit / 2 };
    return property;
  });
}

export function ShapeInspector({
  shape,
  snap,
  snapOpen,
  workspace,
  onUpdate: onUpdateShape,
  onSnapChange,
  onSnapOpenChange,
  onObjectSnapChange,
  onEditSketch,
  onOpenGroup,
  canSeparateParts = false,
  onSeparateParts,
  onWrapAroundCylinder,
  onLayerText,
  onTextTags,
  textLayerStack: nameTagStack,
  onInteractionActiveChange,
  onSnapGridAwayChange,
  proportionLock = false,
  onProportionLockChange,
  onBentTubeSegmentChange,
  onShapeDefaultsChange,
}: {
  shape: WorkplaneShape;
  snap: GridSize;
  snapOpen: boolean;
  workspace: WorkplaneWorkspaceSettings;
  onUpdate: ShapeInspectorUpdate;
  onSnapChange: Dispatch<SetStateAction<GridSize>>;
  onSnapOpenChange: Dispatch<SetStateAction<boolean>>;
  onObjectSnapChange?: (enabled: boolean) => void;
  onEditSketch?: () => void;
  /** Opens a group so its parts can be changed one by one. */
  onOpenGroup?: () => void;
  canSeparateParts?: boolean;
  onSeparateParts?: () => void;
  /** Wraps this body around a cylinder of the given diameter (#106). */
  onWrapAroundCylinder?: (diameter: number, inward: boolean) => void;
  /** Splits a text into layers, or builds a layered text again with new words, font or layers (#215). */
  onLayerText?: (patch: TextLayerPatch) => void;
  /** One tag like this text or stack per name, laid out in rows (#215). */
  onTextTags?: (names: string[], gap: number) => void;
  /** The selected name tag's words, font and layers, read from its layers as they stand (#215). */
  textLayerStack?: NameTagStack | null;
  onInteractionActiveChange?: (active: boolean) => void;
  /** The snap control lives in the expanded panel; collapsed, the workplane shows its own. */
  /** Called with true while the inspector does not carry the snap grid control (collapsed, or floating), so the workplane shows it. */
  onSnapGridAwayChange?: (away: boolean) => void;
  /** With the lock on, changing one of width, depth and height scales the other two by the same factor. */
  proportionLock?: boolean;
  onProportionLockChange?: (locked: boolean) => void;
  /** The segment the bent tube's settings are about, or null when none is shown; the workplane lights it up on the tube. */
  onBentTubeSegmentChange?: (shapeId: string, segment: number | null) => void;
  /** Saves the shape's values as the defaults of its kind, or removes them (null): the same "Shape defaults" the settings hold. */
  onShapeDefaultsChange?: (kind: WorkplaneShape["kind"], entry: ShapeCustomization | null) => void;
}) {
  useLanguage();
  const solidColor = shape.color;
  // Picking one colour for a group means one colour for all of it, as in Tinkercad.
  const singleColorPatch: Partial<WorkplaneShape> = canToggleGroupColors(shape) ? { multicolor: false } : {};
  const locked = Boolean(shape.locked);
  // A calculation typed into a field (#180) is noted just before the field's change and rides
  // along in that one change, so undo takes value and formula back together. A note nobody
  // picks up is dropped again right after.
  const pendingFormulaRef = useRef<{ id: string; text: string | null } | null>(null);
  const noteFormula = (id: string, text: string | null | undefined) => {
    pendingFormulaRef.current = text === undefined ? null : { id, text };
  };
  const onUpdate: ShapeInspectorUpdate = (patch, options) => {
    const pending = pendingFormulaRef.current;
    pendingFormulaRef.current = null;
    onUpdateShape(pending ? { ...patch, formulas: withFieldFormula(shape.formulas, pending.id, pending.text) } : patch, options);
  };
  const properties = getShapeProperties(shape, onUpdate, workspace);
  // What each value would be on a shape of this kind made new, with the saved defaults: the
  // small arrow next to a changed value takes it back there.
  const propertyDefaults = useMemo(() => shapePropertyDefaults(shape.kind, workspace), [shape.kind, workspace]);
  const savedDefaults = workspace.shapeCustomizations[shape.kind];
  const defaultsToSave = shapeDefaultsFromShape(shape, workspace.shapeCustomizations);
  const sameDefaults = JSON.stringify(defaultsToSave ?? null) === JSON.stringify(savedDefaults && Object.keys(savedDefaults).length > 0 ? savedDefaults : null);
  const gearType = shape.kind === "gear" ? normalizeGearType(shape.gearType) : null;
  const isThread = shape.kind === "thread";
  /*
   * Wo die Verjuengung nichts ausrichtet, steht auch keine Karte dafuer. Welche
   * Arten das sind, steht in `shapeSupportsTaper` - dieselbe Antwort bekommt
   * die MCP-Bruecke, damit nicht eine Stelle anbietet, was die andere wegwirft.
   */
  const shapeIgnoresTaper = !shapeSupportsTaper(shape.kind);
  const threadRoleProperty = isThread ? findSelectProperty(properties, "threadRole") : null;
  const threadHeadProperty = isThread ? findSelectProperty(properties, "threadHead") : null;
  const primaryProperties = shape.kind === "gear"
    ? properties.filter((property) => ["centerHole", "length", "width", "height"].includes(property.id))
    : isThread
      ? properties.filter((property) => ["threadSize", "diameter", "threadLength", "headHeight", "headChamfer"].includes(property.id))
      : properties.filter((property) => shape.kind !== "text" || !TEXT_FILL_MORE_IDS.has(property.id));
  // A text's fill (#215): the list and the line width in view, the rest under "More" right below them.
  const textFillMore = shape.kind === "text" ? properties.filter((property) => TEXT_FILL_MORE_IDS.has(property.id)) : [];
  const textFillEnd = primaryProperties.reduce((end, property, index) => (TEXT_FILL_IN_VIEW_IDS.has(property.id) ? index + 1 : end), 0);
  const threadProperties = isThread
    ? properties.filter((property) => ["pitch", "threadsPerInch", "threadHand", "threadProfile", "clearance", "boltClearance", "chamfer", "quality"].includes(property.id))
    : [];
  const gearTeethProperties = shape.kind === "gear"
    ? properties.filter((property) => ["gearProfile", "teeth", "gearModule", "gearPressureAngle", "gearBacklash", "gearRim", "toothSize", "toothWidth"].includes(property.id))
    : [];
  const gearHelixProperties = shape.kind === "gear"
    ? properties.filter((property) => ["helixAngle", "quality"].includes(property.id))
    : [];
  const taper = shapeTaperDimensions(shape);
  const taperDimensionMax = shapeDimensionLimit(workspace, shape.kind, DEFAULT_TAPER_DIMENSION_MAX);
  const taperProperties: ShapePropertyConfig[] = shapeIgnoresTaper ? [] : [
    {
      id: "topLength",
      label: t("prop.topLength"),
      value: taper.topDepth,
      min: MIN_SHAPE_SIZE,
      max: taperDimensionMax,
      onChange: (taperTopDepth) => onUpdate({ taperTopDepth, taperTopWidth: taper.topWidth, taperTopScale: undefined }),
    },
    {
      id: "topWidth",
      label: t("prop.topWidth"),
      value: taper.topWidth,
      min: MIN_SHAPE_SIZE,
      max: taperDimensionMax,
      onChange: (taperTopWidth) => onUpdate({ taperTopWidth, taperTopDepth: taper.topDepth, taperTopScale: undefined }),
    },
    {
      id: "bottomLength",
      label: t("prop.bottomLength"),
      value: taper.bottomDepth,
      min: MIN_SHAPE_SIZE,
      max: taperDimensionMax,
      onChange: (taperBottomDepth) => onUpdate({ taperBottomDepth, taperBottomWidth: taper.bottomWidth, taperBottomScale: undefined }),
    },
    {
      id: "bottomWidth",
      label: t("prop.bottomWidth"),
      value: taper.bottomWidth,
      min: MIN_SHAPE_SIZE,
      max: taperDimensionMax,
      onChange: (taperBottomWidth) => onUpdate({ taperBottomWidth, taperBottomDepth: taper.bottomDepth, taperBottomScale: undefined }),
    },
  ];
  /*
   * Twist and lean take the same shapes taper does - shapeIgnoresTaper
   * already answers that question, so this reuses it rather than asking
   * shapeSupportsExtrudeDeform a second time for the same shape.
   */
  const twistProperties: ShapePropertyConfig[] = shapeIgnoresTaper ? [] : [
    {
      id: "extrudeTwist",
      label: t("prop.twist"),
      value: shape.extrudeTwist ?? 0,
      min: -720,
      max: 720,
      step: 1,
      onChange: (extrudeTwist) => onUpdate({ extrudeTwist }),
    },
    {
      id: "extrudeTopOffsetX",
      label: t("prop.widthOffset"),
      value: shape.extrudeTopOffsetX ?? 0,
      min: -80,
      max: 80,
      step: 0.5,
      onChange: (extrudeTopOffsetX) => onUpdate({ extrudeTopOffsetX }),
    },
    {
      id: "extrudeTopOffsetZ",
      label: t("prop.lengthOffset"),
      value: shape.extrudeTopOffsetZ ?? 0,
      min: -80,
      max: 80,
      step: 0.5,
      onChange: (extrudeTopOffsetZ) => onUpdate({ extrudeTopOffsetZ }),
    },
  ];
  /*
   * Wo der Koerper steht, zum Eintippen: X und Y auf der Platte (die Mitte
   * seines Rahmens, mit denselben Vorzeichen wie die Masse auf der
   * Arbeitsflaeche), Z als Hoehe seiner Unterkante. Die Regler reichen so weit
   * wie das Ziehen, eine Plattengroesse ueber jeden Rand.
   */
  const reachX = workspace.width * 1.5;
  const reachY = workspace.depth * 1.5;
  const positionProperties: ShapePropertyConfig[] = [
    { id: "positionX", label: t("prop.positionX"), value: shape.x, min: -reachX, max: reachX, step: 0.5, onChange: (x) => onUpdate({ x }) },
    // Y counts towards the back, right-handed (#182); inside, z runs towards the viewer.
    { id: "positionY", label: t("prop.positionY"), value: displayY(shape.z), min: -reachY, max: reachY, step: 0.5, onChange: (y) => onUpdate({ z: insideZ(y) }) },
    { id: "positionZ", label: t("prop.positionZ"), value: shape.elevation ?? 0, min: -180, max: 220, step: 0.5, onChange: (elevation) => onUpdate({ elevation }) },
  ];
  // The body's turn about X, Y and Z, as it is drawn. A new angle turns it
  // about its centre, or about its own pivot if it has one.
  const turnTo = (patch: Pick<Partial<WorkplaneShape>, "rotation" | "rotationX" | "rotationZ">) => {
    const before = shapePivotWorld(shape);
    const turned = { ...shape, ...patch };
    const after = shapePivotWorld(turned);
    if (!before || !after) {
      onUpdate(patch);
      return;
    }
    onUpdate({
      ...patch,
      x: shape.x + before.x - after.x,
      z: shape.z + before.z - after.z,
      elevation: (shape.elevation ?? 0) + before.y - after.y,
    });
  };
  const rotationProperties: ShapePropertyConfig[] = [
    { id: "rotateX", label: t("prop.rotateX"), value: signedDegrees(shape.rotationX ?? 0), min: -180, max: 180, step: 1, onChange: (rotationX) => turnTo({ rotationX }) },
    // Named like the position: Y runs across the plate (depth), Z is up.
    { id: "rotateY", label: t("prop.rotateY"), value: signedDegrees(displayYTurn(shape.rotationZ ?? 0)), min: -180, max: 180, step: 1, onChange: (yTurn) => turnTo({ rotationZ: insideZTurn(yTurn) }) },
    { id: "rotateZ", label: t("prop.rotateZ"), value: signedDegrees(shape.rotation ?? 0), min: -180, max: 180, step: 1, onChange: (rotation) => turnTo({ rotation }) },
  ];
  // The pivot this body carries, in the same coordinates as its position.
  const pivot = shapePivotWorld(shape);
  const movePivot = (change: Partial<{ x: number; y: number; z: number }>) => {
    if (pivot) onUpdate({ rotationPivot: shapePivotFromWorld(shape, { ...pivot, ...change }) });
  };
  const pivotProperties: ShapePropertyConfig[] = pivot
    ? [
      { id: "pivotX", label: t("prop.pivotX"), value: pivot.x, min: -reachX, max: reachX, step: 0.5, onChange: (x) => movePivot({ x }) },
      { id: "pivotY", label: t("prop.pivotY"), value: displayY(pivot.z), min: -reachY, max: reachY, step: 0.5, onChange: (y) => movePivot({ z: insideZ(y) }) },
      { id: "pivotZ", label: t("prop.pivotZ"), value: pivot.y, min: -180, max: 220, step: 0.5, onChange: (y) => movePivot({ y }) },
    ]
    : [];
  const isSketchRevolve = shape.sketchOperation === "revolve" || Boolean(shape.sketchRevolve);
  // Docked at the right edge until its title bar is dragged; then it floats where it was dropped.
  const movable = useMovablePanel<HTMLElement>("layerling.editor.inspectorPosition", INSPECTOR_PANEL);
  const inspectorRef = movable.panelRef;
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [textFillMoreOpen, setTextFillMoreOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [taperOpen, setTaperOpen] = useState(false);
  const [twistOpen, setTwistOpen] = useState(false);
  const [gearTeethOpen, setGearTeethOpen] = useState(true);
  const [threadOpen, setThreadOpen] = useState(true);
  const [gearHelixOpen, setGearHelixOpen] = useState(true);
  const [colorOpen, setColorOpen] = useState(false);
  const { colors: recentColors, remember: rememberColor } = useRecentColors(SOLID_COLORS);
  const [minimized, setMinimized] = useState(false);
  // Renaming here works like the pencil in the object list.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const commitName = () => {
    const name = nameDraft === null ? undefined : renamedShapeName(shape, nameDraft);
    if (name !== undefined) onUpdate({ name });
    setNameDraft(null);
  };

  useEffect(() => () => onInteractionActiveChange?.(false), [onInteractionActiveChange]);
  // The snap grid control belongs to the inspector only while it is docked and open.
  const snapGridAway = minimized || movable.moved;
  useEffect(() => {
    onSnapGridAwayChange?.(snapGridAway);
    return () => onSnapGridAwayChange?.(false);
  }, [snapGridAway, onSnapGridAwayChange]);
  useLayoutEffect(() => {
    inspectorRef.current?.scrollTo({ top: 0, left: 0 });
  }, [isSketchRevolve, shape.id]);
  useEffect(() => setNameDraft(null), [shape.id]);
  const editingName = nameDraft !== null;
  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  return (
    <aside
      ref={inspectorRef}
      className={`shape-inspector ${isSketchRevolve ? "sketch-revolve-inspector" : ""} ${shape.kind === "gear" ? "gear-inspector" : ""} ${minimized ? "minimized" : ""} ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      aria-label={t("inspector.settingsFor", { name: displayShapeName(shape) })}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="shape-inspector-header movable" title={t("inspector.moveHint")} {...movable.handleProps}>
        <button
          className="inspector-header-icon"
          aria-label={minimized ? t("inspector.expand") : t("inspector.minimize")}
          aria-expanded={!minimized}
          onClick={() => setMinimized((current) => !current)}
        >
          {minimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <div className="inspector-name">
          {nameDraft !== null ? (
            <input
              ref={nameInputRef}
              className="inspector-name-input"
              value={nameDraft}
              aria-label={t("outliner.rename")}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitName();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setNameDraft(null);
                }
              }}
            />
          ) : (
            <>
              {/* One long word ("Schwalbenschwanz") cannot wrap; it gets a smaller size instead. */}
              <strong className={displayShapeName(shape).split(/\s+/).some((word) => word.length > 11) ? "long-word" : undefined}>{displayShapeName(shape)}</strong>
              <button className="inspector-rename-button" title={t("outliner.rename")} aria-label={t("outliner.rename")} onClick={() => setNameDraft(displayShapeName(shape))}>
                <Pencil size={14} />
              </button>
            </>
          )}
        </div>
        <div className="inspector-header-actions">
          <GuideHelpLink chapter={guideChapterForShape(shape)} section={guideSectionForShape(shape)} className="inspector-help-link" />
          <button className={locked ? "inspector-header-icon active" : "inspector-header-icon"} aria-label={locked ? t("outliner.unlock") : t("outliner.lock")} onClick={() => onUpdate({ locked: !locked })}>
            {locked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
          <button className={shape.hidden ? "inspector-header-icon active" : "inspector-header-icon"} aria-label={shape.hidden ? t("outliner.show") : t("outliner.hide")} onClick={() => onUpdate({ hidden: !shape.hidden })}>
            {shape.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {!minimized ? (
        <>
      {/* A name tag (#215): its card first and open; for a plain text the way there first. */}
      {nameTagStack && onLayerText && onTextTags ? (
        <NameTagCard
          key={`name-tag-${shape.id}`}
          shapeId={shape.id}
          stack={nameTagStack}
          workspace={workspace}
          disabled={locked}
          onLayerText={onLayerText}
          onTextTags={onTextTags}
          onInteractionActiveChange={onInteractionActiveChange}
        />
      ) : null}
      {shape.kind === "text" && onLayerText ? <MakeLayersButton disabled={locked} onLayerText={onLayerText} /> : null}
      {shape.groupOperation === "bundle" ? (
        <p className="inspector-bundle-note">{t(nameTagStack ? "nameTag.bundleNote" : "inspector.bundleNote")}</p>
      ) : !isNonSolidShapeKind(shape.kind) ? (
      <div className="shape-state-card" role="group" aria-label={t("inspector.shapeMode")}>
        <button
          className={!shape.hole ? "active solid-choice" : "solid-choice"}
          onClick={() => {
            const wasHole = Boolean(shape.hole);
            onUpdate({ hole: false, color: solidColor });
            setColorOpen((open) => (wasHole ? false : !open));
          }}
          disabled={locked}
          aria-pressed={!shape.hole}
          aria-expanded={colorOpen}
        >
          <span className="large-solid-swatch" style={{ "--swatch": solidColor } as CSSProperties} />
          <span>{t("inspector.solid")}</span>
        </button>
        <button
          className={shape.hole ? "active hole-choice" : "hole-choice"}
          onClick={() => {
            onUpdate({ hole: true });
            setColorOpen(false);
          }}
          disabled={locked}
          aria-pressed={shape.hole}
        >
          <span className="large-hole-swatch" />
          <span>{t("inspector.hole")}</span>
        </button>
        {/* Stays in place for a hole, only greyed out, so the card does not jump. */}
        <ToggleProperty
          label={t("inspector.transparent")}
          value={Boolean(shape.transparent) && !shape.hole}
          disabled={locked || Boolean(shape.hole)}
          onChange={(transparent) => onUpdate({ transparent: transparent || undefined })}
        />
        {canToggleGroupColors(shape) ? (
          <ToggleProperty
            label={t("inspector.multicolor")}
            value={groupShowsPartColors(shape)}
            disabled={locked}
            onChange={(multicolor) => onUpdate({ multicolor })}
          />
        ) : null}
      </div>
      ) : null}

      {colorOpen ? (
        <div className="color-card" aria-label={t("inspector.shapeColor")}>
          <div className="color-card-header">
            <span>{t("inspector.color")}</span>
            <span className="color-value">{solidColor.toUpperCase()}</span>
          </div>
          <div className="color-grid">
            {SOLID_COLORS.map((color) => (
              <button
                key={color}
                className={solidColor.toLowerCase() === color.toLowerCase() && !shape.hole ? "selected" : ""}
                type="button"
                style={{ "--shape-swatch": color } as CSSProperties}
                title={color.toUpperCase()}
                aria-label={t("aria.setColor", { color })}
                disabled={locked}
                onClick={() => {
                  onUpdate({ color, hole: false, ...singleColorPatch });
                  setColorOpen(false);
                }}
              />
            ))}
            <label className={locked ? "custom-color disabled" : "custom-color"} title={t("inspector.customColor")}>
              <CustomColorInput
                color={solidColor}
                disabled={locked}
                onCommit={(color) => {
                  onUpdate({ color, hole: false, ...singleColorPatch });
                  rememberColor(color);
                }}
                onInteractionActiveChange={onInteractionActiveChange}
              />
              <span>{t("inspector.custom")}</span>
            </label>
          </div>
          {recentColors.length > 0 ? (
            <div className="color-recent">
              <span className="color-recent-label">{t("inspector.recentColors")}</span>
              <div className="color-grid">
                {recentColors.map((color) => (
                  <button
                    key={color}
                    className={solidColor.toLowerCase() === color && !shape.hole ? "selected" : ""}
                    type="button"
                    style={{ "--shape-swatch": color } as CSSProperties}
                    title={color.toUpperCase()}
                    aria-label={t("aria.setColor", { color })}
                    disabled={locked}
                    onClick={() => {
                      onUpdate({ color, hole: false, ...singleColorPatch });
                      rememberColor(color);
                      setColorOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {shape.sketchProfile && onEditSketch ? (
        <button className="edit-sketch-button" type="button" disabled={locked} onClick={onEditSketch}>
          {t("inspector.editSketch")}
        </button>
      ) : null}

      {onOpenGroup ? (
        <button className="inspector-action-button" type="button" disabled={locked} onClick={onOpenGroup}>
          {t(shape.groupOperation === "bundle" ? "group.editBundle" : "group.edit")}
        </button>
      ) : null}

      {canSeparateParts && onSeparateParts ? (
        <button className="inspector-action-button" type="button" disabled={locked} onClick={onSeparateParts}>
          <Split size={17} strokeWidth={2.5} />
          <span>{t("inspector.separateParts")}</span>
        </button>
      ) : null}

      {onWrapAroundCylinder ? (
        <CylinderWrapCard
          key={shape.id}
          shape={shape}
          workspace={workspace}
          disabled={locked}
          onWrap={onWrapAroundCylinder}
          onInteractionActiveChange={onInteractionActiveChange}
        />
      ) : null}

      {onTextTags && shape.kind === "text" ? (
        <NameListCard key={`names-${shape.id}`} shapeId={shape.id} disabled={locked} onTextTags={onTextTags} onInteractionActiveChange={onInteractionActiveChange} />
      ) : null}

      <div className={`property-card ${propertiesOpen ? "" : "collapsed"}`}>
        <button
          className="property-card-header"
          type="button"
          aria-expanded={propertiesOpen}
          aria-controls={`properties-${shape.id}`}
          onClick={() => setPropertiesOpen((open) => !open)}
        >
          <span>{t("inspector.properties")}</span>
          <ChevronUp className={propertiesOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
        </button>
        {propertiesOpen ? (
          <div className="property-list" id={`properties-${shape.id}`}>
            {gearType ? (
              <GearTypeSelector
                value={gearType}
                disabled={locked}
                onChange={(nextType) => {
                  // The module stays across the types (#201): a ring gear adds its rim round the same
                  // teeth, a rack lays them out straight with a 3 mm bar, a gear is module x (teeth + 2) again.
                  const profile = gearToothProfile({ gearType: nextType, gearProfile: shape.gearProfile });
                  if (!gearUsesModule(profile)) return onUpdate({ gearType: nextType });
                  const module = gearModuleOf(shape);
                  const rim = normalizeGearRim(shape.gearRim ?? DEFAULT_GEAR_RIM);
                  const next = gearSizeForModule(module, { ...shape, gearType: nextType, gearProfile: profile, gearRim: rim, depth: nextType === "rack" ? rackToothHeight(module, profile) + DEFAULT_GEAR_RIM : shape.depth }, shape.teeth);
                  onUpdate({
                    gearType: nextType,
                    gearProfile: profile,
                    gearPressureAngle: normalizeGearPressureAngle(shape.gearPressureAngle),
                    gearBacklash: shape.gearBacklash ?? DEFAULT_GEAR_BACKLASH,
                    gearRim: nextType === "internal" ? rim : shape.gearRim,
                    width: next.width,
                    depth: next.depth,
                    size: Math.max(next.width, next.depth),
                  });
                }}
              />
            ) : null}
            {threadRoleProperty ? (
              <IconOptionSelector
                label={t("inspector.threadRole")}
                columns={2}
                value={threadRoleProperty.value}
                disabled={locked}
                options={THREAD_ROLE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: t(option.label),
                  preview: <ThreadRolePreview role={option.value} />,
                }))}
                onChange={threadRoleProperty.onChange}
              />
            ) : null}
            {threadHeadProperty ? (
              <IconOptionSelector
                label={t("inspector.threadHead")}
                columns={3}
                value={threadHeadProperty.value}
                disabled={locked}
                options={THREAD_HEAD_OPTIONS.map((option) => ({
                  value: option.value,
                  label: t(option.label),
                  preview: <ThreadHeadPreview head={option.value} />,
                }))}
                onChange={threadHeadProperty.onChange}
              />
            ) : null}
            {onProportionLockChange && primaryProperties.some((property) => property.id === "height") && primaryProperties.some((property) => ["width", "length", "diameter"].includes(property.id)) ? (
              <ToggleProperty
                label={t("inspector.keepProportions")}
                value={proportionLock}
                disabled={locked}
                onChange={onProportionLockChange}
              />
            ) : null}
            {textFillMore.length ? (
              <>
                <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={primaryProperties.slice(0, textFillEnd)} defaults={propertyDefaults?.main} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
                {/* A text's rarer fill settings (#215) fold away under "More". */}
                <button className="name-tag-more" type="button" aria-expanded={textFillMoreOpen} onClick={() => setTextFillMoreOpen((open) => !open)}>
                  <ChevronDown className={textFillMoreOpen ? "open" : ""} size={15} strokeWidth={2.6} />
                  <span>{t(textFillMoreOpen ? "inspector.less" : "inspector.more")}</span>
                </button>
                {textFillMoreOpen ? (
                  <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={textFillMore} defaults={propertyDefaults?.main} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
                ) : null}
                <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={primaryProperties.slice(textFillEnd)} defaults={propertyDefaults?.main} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
              </>
            ) : (
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={primaryProperties} defaults={propertyDefaults?.main} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            )}
            {onShapeDefaultsChange && propertyDefaults ? (
              <div className="property-defaults-actions">
                <button type="button" disabled={locked || sameDefaults} title={t("inspector.saveDefaultsHint")} onClick={() => onShapeDefaultsChange(shape.kind, defaultsToSave)}>
                  {t("inspector.saveDefaults")}
                </button>
                <button type="button" disabled={!savedDefaults || Object.keys(savedDefaults).length === 0} title={t("inspector.resetDefaultsHint")} onClick={() => onShapeDefaultsChange(shape.kind, null)}>
                  {t("inspector.resetDefaults")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={`property-card ${positionOpen ? "" : "collapsed"}`}>
        <button
          className="property-card-header"
          type="button"
          aria-expanded={positionOpen}
          aria-controls={`position-${shape.id}`}
          onClick={() => setPositionOpen((open) => !open)}
        >
          <span>{t("inspector.position")}</span>
          <ChevronUp className={positionOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
        </button>
        {positionOpen ? (
          <div className="property-list" id={`position-${shape.id}`}>
            <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={positionProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            {pivot ? (
              <>
                <div className="property-subheading">
                  <span>{t("inspector.pivot")}</span>
                  <button type="button" className="property-subheading-action" disabled={locked} onClick={() => onUpdate({ rotationPivot: undefined })}>
                    {t("inspector.pivotRemove")}
                  </button>
                </div>
                <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={pivotProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={`property-card ${rotationOpen ? "" : "collapsed"}`}>
        <button
          className="property-card-header"
          type="button"
          aria-expanded={rotationOpen}
          aria-controls={`rotation-${shape.id}`}
          onClick={() => setRotationOpen((open) => !open)}
        >
          <span>{t("inspector.rotation")}</span>
          <ChevronUp className={rotationOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
        </button>
        {rotationOpen ? (
          <div className="property-list" id={`rotation-${shape.id}`}>
            <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={rotationProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
          </div>
        ) : null}
      </div>
      {shape.kind === "bentTube" ? (
        <BentTubeSegmentsCard
          shape={shape}
          workspace={workspace}
          locked={locked}
          onUpdate={onUpdate}
          onInteractionActiveChange={onInteractionActiveChange}
          onSegmentChange={onBentTubeSegmentChange}
        />
      ) : null}
      {!shapeIgnoresTaper ? (
        <div className={`property-card ${taperOpen ? "" : "collapsed"}`}>
          <button
            className="property-card-header"
            type="button"
            aria-expanded={taperOpen}
            aria-controls={`taper-${shape.id}`}
            onClick={() => setTaperOpen((open) => !open)}
          >
            <span>{t("inspector.taper")}</span>
            <ChevronUp className={taperOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {taperOpen ? (
            <div className="property-list" id={`taper-${shape.id}`}>
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={taperProperties} defaults={propertyDefaults?.taper} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      {!shapeIgnoresTaper ? (
        <div className={`property-card ${twistOpen ? "" : "collapsed"}`}>
          <button
            className="property-card-header"
            type="button"
            aria-expanded={twistOpen}
            aria-controls={`twist-${shape.id}`}
            onClick={() => setTwistOpen((open) => !open)}
          >
            <span>{t("inspector.twist")}</span>
            <ChevronUp className={twistOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {twistOpen ? (
            <div className="property-list" id={`twist-${shape.id}`}>
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={twistProperties} defaults={propertyDefaults?.twist} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      {isThread ? (
        <div className={`property-card ${threadOpen ? "" : "collapsed"}`}>
          <button
            className="property-card-header"
            type="button"
            aria-expanded={threadOpen}
            aria-controls={`thread-${shape.id}`}
            onClick={() => setThreadOpen((open) => !open)}
          >
            <span>{t("inspector.thread")}</span>
            <ChevronUp className={threadOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {threadOpen ? (
            <div className="property-list" id={`thread-${shape.id}`}>
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={threadProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      {shape.kind === "gear" ? (
        <div className={`property-card ${gearTeethOpen ? "" : "collapsed"}`}>
          <button
            className="property-card-header"
            type="button"
            aria-expanded={gearTeethOpen}
            aria-controls={`gear-teeth-${shape.id}`}
            onClick={() => setGearTeethOpen((open) => !open)}
          >
            <span>{t("inspector.teeth")}</span>
            <ChevronUp className={gearTeethOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {gearTeethOpen ? (
            <div className="property-list" id={`gear-teeth-${shape.id}`}>
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={gearTeethProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      {gearType === "helical" ? (
        <div className={`property-card ${gearHelixOpen ? "" : "collapsed"}`}>
          <button
            className="property-card-header"
            type="button"
            aria-expanded={gearHelixOpen}
            aria-controls={`gear-helix-${shape.id}`}
            onClick={() => setGearHelixOpen((open) => !open)}
          >
            <span>{t("inspector.helix")}</span>
            <ChevronUp className={gearHelixOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {gearHelixOpen ? (
            <div className="property-list" id={`gear-helix-${shape.id}`}>
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={gearHelixProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      {!movable.moved ? (
        <div className="inspector-snap-dock">
          <SnapGridControl units={workspace.units} customGrids={workspace.customSnapGrids} snap={snap} snapOpen={snapOpen} onSnapChange={onSnapChange} onSnapOpenChange={onSnapOpenChange} objectSnap={workspace.objectSnap} onObjectSnapChange={onObjectSnapChange} />
        </div>
      ) : null}
        </>
      ) : null}
    </aside>
  );
}

/**
 * The chain of segments of a bent tube. One segment is edited at a time; the
 * sliders are the same range rows as everywhere else, so a drag shows a live
 * preview and ends in a single undo step.
 */
export type TextLayerPatch = { text?: string; font?: string; letterSize?: number; layers?: TextLayer[] };

/**
 * A plain text's way to a name tag (#215), first in its settings so a beginner finds it: one
 * click splits it into the default layers.
 */
function MakeLayersButton({ disabled, onLayerText }: { disabled: boolean; onLayerText: (patch: TextLayerPatch) => void }) {
  return (
    <div className="name-tag-start">
      <button className="inspector-action-button name-tag-start-button" type="button" disabled={disabled} onClick={() => onLayerText({ layers: [...DEFAULT_TEXT_LAYERS] })}>
        <Layers size={17} strokeWidth={2.5} />
        <span>{t("nameTag.makeLayers")}</span>
      </button>
      <p className="name-tag-hint">
        {t("nameTag.makeLayersHint")}
        <GuideHelpLink chapter="text" section="textLayers" className="inspector-help-link" />
      </p>
    </div>
  );
}

/**
 * A measure in a narrow table cell (#215): a text field read as the other measure fields are, in
 * the chosen unit, set on Enter or on leaving it; the arrow keys step it by a tenth at once.
 */
function CompactMeasureField({ label, value, min, max, workspace, disabled, onChange, onInteractionActiveChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  workspace: WorkplaneWorkspaceSettings;
  disabled?: boolean;
  onChange: (value: number) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const holdInteraction = useInteractionHold(onInteractionActiveChange);
  const step = displayStepFromMillimeters(0.1, workspace);
  const shown = formatPropertyNumber(millimetersToDisplay(value, workspace), workspace.accuracy, step);
  const [draft, setDraft] = useState<string | null>(null);
  const set = (display: number) => onChange(clamp(displayToMillimeters(display, workspace), min, max));
  const commit = () => {
    holdInteraction(false);
    if (draft === null) return;
    setDraft(null);
    const parsed = parseMeasurementInput(draft);
    if (draft !== shown && Number.isFinite(parsed)) set(parsed);
  };
  return (
    <input
      className="name-tag-measure"
      type="text"
      inputMode="decimal"
      aria-label={label}
      title={label}
      value={draft ?? shown}
      disabled={disabled}
      onFocus={(event) => {
        holdInteraction(true);
        setDraft(shown);
        selectWholeValue(event.currentTarget);
      }}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraft(shown);
          event.currentTarget.blur();
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const next = millimetersToDisplay(value, workspace) + (event.key === "ArrowUp" ? step : -step);
          set(next);
          setDraft(formatPropertyNumber(millimetersToDisplay(clamp(displayToMillimeters(next, workspace), min, max), workspace), workspace.accuracy, step));
        }
      }}
    />
  );
}

/**
 * The name list (#215): one name per line, up to 100, and the button that makes a tag of each,
 * NAME_TAG_GAP apart - no gap to set, one field less.
 */
function NameListFields({ disabled, onTextTags, onInteractionActiveChange }: {
  disabled: boolean;
  onTextTags: (names: string[], gap: number) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [names, setNames] = useState("");
  const nameList = namesFromList(names);
  return (
    <>
      <label className="text-layers-names">
        <span>{t("textLayers.names")}</span>
        <textarea
          value={names}
          rows={4}
          placeholder={t("textLayers.namesPlaceholder")}
          disabled={disabled}
          onChange={(event) => setNames(event.currentTarget.value)}
          onFocus={() => onInteractionActiveChange?.(true)}
          onBlur={() => onInteractionActiveChange?.(false)}
        />
        <small>{t("textLayers.namesHint")}</small>
      </label>
      <button className="inspector-action-button" type="button" disabled={disabled || nameList.length === 0} onClick={() => onTextTags(nameList, NAME_TAG_GAP)}>
        <Tags size={17} strokeWidth={2.5} />
        <span>{nameList.length === 0 ? t("nameTag.makeTagsNone") : nameList.length === 1 ? t("nameTag.makeTagsOne") : t("nameTag.makeTags", { count: nameList.length })}</span>
      </button>
    </>
  );
}

/** A plain text keeps the name list (#215): a tag of the text per name, folded away below. */
function NameListCard({ shapeId, disabled, onTextTags, onInteractionActiveChange }: {
  shapeId: string;
  disabled: boolean;
  onTextTags: (names: string[], gap: number) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`property-card ${open ? "" : "collapsed"}`}>
      <button className="property-card-header" type="button" aria-expanded={open} aria-controls={`name-list-${shapeId}`} onClick={() => setOpen((current) => !current)}>
        <span>{t("textLayers.names")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <div className="property-list text-layers-body" id={`name-list-${shapeId}`}>
          <NameListFields disabled={disabled} onTextTags={onTextTags} onInteractionActiveChange={onInteractionActiveChange} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The name tag (#215): a layered text's card, open and first. Words, font and letter size; every
 * layer in a row of its own - colour, how much wider than the letters, height, without holes -
 * with "+" and "–"; the name list. Every change builds the stack again.
 */
function NameTagCard({
  shapeId,
  stack,
  workspace,
  disabled,
  onLayerText,
  onTextTags,
  onInteractionActiveChange,
}: {
  shapeId: string;
  stack: NameTagStack;
  workspace: WorkplaneWorkspaceSettings;
  disabled: boolean;
  onLayerText: (patch: TextLayerPatch) => void;
  onTextTags: (names: string[], gap: number) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const { source, layers } = stack;
  const unit = lengthDisplayUnit(workspace).label;
  const writeLayers = (next: TextLayer[]) => onLayerText({ layers: next });
  const changeLayer = (index: number, changes: Partial<TextLayer>) => writeLayers(layers.map((entry, position) => (position === index ? { ...entry, ...changes } : entry)));
  const layerName = (index: number) => (index === 0 ? t("nameTag.letters") : t("textLayers.layer", { number: index + 1 }));
  const properties: ShapePropertyConfig[] = [
    { type: "text", id: "nameTagText", label: t("prop.text"), value: source.text ?? "TEXT", onChange: (text) => onLayerText({ text: text.slice(0, 24) || " " }) },
    textFontProperty(source, (patch) => { if (typeof patch.font === "string") onLayerText({ font: patch.font }); }),
    { id: "letterSize", label: t("nameTag.letterSize"), value: textLetterSize(source), min: MIN_LETTER_SIZE, max: 60, step: 0.5, onChange: (letterSize) => onLayerText({ letterSize }) },
  ];

  return (
    <div className={`property-card name-tag-card ${open ? "" : "collapsed"}`}>
      <button className="property-card-header" type="button" aria-expanded={open} aria-controls={`name-tag-${shapeId}`} onClick={() => setOpen((current) => !current)}>
        <span>{t("nameTag.title")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <p className="name-tag-hint">
          {t("nameTag.cardHint")}
          <GuideHelpLink chapter="text" section="textLayers" className="inspector-help-link" />
        </p>
      ) : null}
      {open ? (
        <div className="property-list text-layers-body name-tag-body" id={`name-tag-${shapeId}`}>
          <ShapePropertyRows properties={properties} workspace={workspace} disabled={disabled} onInteractionActiveChange={onInteractionActiveChange} />
          <div className="name-tag-layers-heading">
            <span>{t("nameTag.layers")}</span>
            <span className="name-tag-stepper">
              <button type="button" aria-label={t("nameTag.removeLayer")} title={t("nameTag.removeLayer")} disabled={disabled || layers.length <= MIN_NAME_TAG_LAYERS} onClick={() => writeLayers(removeTextLayer(layers))}>
                <Minus size={16} strokeWidth={2.8} />
              </button>
              <output aria-label={t("nameTag.layers")}>{layers.length}</output>
              <button type="button" aria-label={t("nameTag.addLayer")} title={t("nameTag.addLayer")} disabled={disabled || layers.length >= MAX_TEXT_LAYERS} onClick={() => writeLayers(addTextLayer(layers))}>
                <Plus size={16} strokeWidth={2.8} />
              </button>
            </span>
          </div>
          <div className="name-tag-layers" role="table" aria-label={t("nameTag.layers")}>
            <div className="name-tag-layer name-tag-layer-head" role="row">
              <span role="columnheader">{t("nameTag.color")}</span>
              <span role="columnheader">{t("nameTag.wider", { unit })}</span>
              <span role="columnheader">{t("nameTag.height", { unit })}</span>
              <span role="columnheader">{t("nameTag.noHoles")}</span>
            </div>
            {layers.map((layer, index) => (
              <div className="name-tag-layer" role="row" key={index} data-layer={index + 1}>
                <label className="name-tag-swatch" role="cell" style={{ "--swatch": layer.color } as CSSProperties} title={`${layerName(index)}: ${t("nameTag.color")}`}>
                  <CustomColorInput color={layer.color} disabled={disabled} onCommit={(color) => changeLayer(index, { color })} onInteractionActiveChange={onInteractionActiveChange} />
                </label>
                <span role="cell">
                  {index === 0 ? (
                    <span className="name-tag-letters">{t("nameTag.letters")}</span>
                  ) : (
                    <CompactMeasureField label={`${layerName(index)}: ${t("nameTag.wider", { unit })}`} value={layer.grow} min={0} max={MAX_TEXT_LAYER_GROW} workspace={workspace} disabled={disabled} onChange={(grow) => changeLayer(index, { grow })} onInteractionActiveChange={onInteractionActiveChange} />
                  )}
                </span>
                <span role="cell">
                  <CompactMeasureField label={`${layerName(index)}: ${t("nameTag.height", { unit })}`} value={layer.height} min={MIN_TEXT_LAYER_HEIGHT} max={40} workspace={workspace} disabled={disabled} onChange={(height) => changeLayer(index, { height })} onInteractionActiveChange={onInteractionActiveChange} />
                </span>
                <span role="cell" className="name-tag-check">
                  <input type="checkbox" aria-label={`${layerName(index)}: ${t("nameTag.noHoles")}`} checked={Boolean(layer.silhouette)} disabled={disabled} onChange={(event) => changeLayer(index, { silhouette: event.currentTarget.checked || undefined })} />
                </span>
              </div>
            ))}
          </div>
          <NameListFields disabled={disabled} onTextTags={onTextTags} onInteractionActiveChange={onInteractionActiveChange} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Wrapping a flat body around a cylinder (#106): the diameter of the wall,
 * outward or into the wall, and the button. Folded away until asked for, as
 * it is a step one takes once rather than a setting one tunes.
 */
function CylinderWrapCard({
  shape,
  workspace,
  disabled,
  onWrap,
  onInteractionActiveChange,
}: {
  shape: WorkplaneShape;
  workspace: WorkplaneWorkspaceSettings;
  disabled: boolean;
  onWrap: (diameter: number, inward: boolean) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  // A diameter the body just goes once around reads as the natural start; most
  // people then type the diameter of their cup or tube.
  const [diameter, setDiameter] = useState(() => Math.max(10, Math.round(shapeWidth(shape) / Math.PI * 1.25)));
  const [inward, setInward] = useState(false);
  return (
    <div className={`property-card ${open ? "" : "collapsed"}`}>
      <button
        className="property-card-header"
        type="button"
        aria-expanded={open}
        aria-controls={`cylinder-wrap-${shape.id}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{t("inspector.wrapCylinder")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <div className="property-list cylinder-wrap-body" id={`cylinder-wrap-${shape.id}`}>
          <RangeProperty
            id="diameter"
            label={t("inspector.wrapDiameter")}
            value={diameter}
            min={1}
            max={400}
            step={1}
            workspace={workspace}
            disabled={disabled}
            onChange={setDiameter}
            onInteractionActiveChange={onInteractionActiveChange}
          />
          <ToggleProperty label={t("inspector.wrapInward")} value={inward} disabled={disabled} onChange={setInward} />
          <p className="cylinder-wrap-hint">
            {t(inward ? "inspector.wrapInwardHint" : "inspector.wrapHint")}
            <GuideHelpLink section="wrapCylinder" className="inspector-help-link" />
          </p>
          <button className="inspector-action-button" type="button" disabled={disabled} onClick={() => onWrap(diameter, inward)}>
            <Cylinder size={17} strokeWidth={2.5} />
            <span>{t("inspector.wrapApply")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BentTubeSegmentsCard({
  shape,
  workspace,
  locked,
  onUpdate,
  onInteractionActiveChange,
  onSegmentChange,
}: {
  shape: WorkplaneShape;
  workspace: WorkplaneWorkspaceSettings;
  locked: boolean;
  onUpdate: ShapeInspectorUpdate;
  onInteractionActiveChange?: (active: boolean) => void;
  onSegmentChange?: (shapeId: string, segment: number | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState(0);
  const fields = normalizedBentTubeFields(shape);
  const segments = fields.bentTubeSegments;
  const index = Math.min(selected, segments.length - 1);
  const segment = segments[index];
  const minRadius = minBentTubeBendRadius(fields.bentTubeProfile, fields.bentTubeSize, fields.bentTubeQuality);
  const selfIntersectionKey = JSON.stringify([fields.bentTubeProfile, fields.bentTubeSize, fields.bentTubeQuality, segments]);
  const selfIntersects = useMemo(() => {
    const [bentTubeProfile, bentTubeSize, bentTubeQuality, bentTubeSegments] = JSON.parse(selfIntersectionKey);
    return bentTubeSelfIntersects({ bentTubeProfile, bentTubeSize, bentTubeQuality, bentTubeSegments });
  }, [selfIntersectionKey]);

  useEffect(() => setSelected(0), [shape.id]);

  // While the card is open, the chosen segment is lit up on the tube itself.
  const shapeId = shape.id;
  useEffect(() => {
    onSegmentChange?.(shapeId, open ? index : null);
    return () => onSegmentChange?.(shapeId, null);
  }, [index, onSegmentChange, open, shapeId]);

  const writeSegments = (next: typeof segments) => onUpdate(bentTubeParameterPatch(shape, { bentTubeSegments: next }));
  const changeSegment = (changes: Partial<(typeof segments)[number]>) => {
    writeSegments(segments.map((entry, position) => (position === index ? { ...entry, ...changes } : entry)));
  };
  const properties: ShapePropertyConfig[] = [
    {
      type: "select",
      id: "bentTubeSegment",
      label: t("prop.bentTubeSegment"),
      value: String(index),
      options: segments.map((_entry, position) => ({ value: String(position), label: t("bentTube.segmentNumber", { number: position + 1 }) })),
      onChange: (value) => setSelected(Number(value)),
    },
    {
      id: "bentTubeSegmentLength",
      label: t("prop.bentTubeSegmentLength"),
      value: segment.length,
      min: 0,
      max: 200,
      step: 0.5,
      onChange: (value) => changeSegment({ length: value }),
    },
    {
      id: "bentTubeBendAngle",
      label: t("prop.bentTubeBendAngle"),
      value: segment.bendAngle,
      min: -MAX_BENT_TUBE_BEND_ANGLE,
      max: MAX_BENT_TUBE_BEND_ANGLE,
      step: 1,
      onChange: (value) => changeSegment({ bendAngle: value }),
    },
    {
      id: "bentTubeBendRadius",
      label: t("prop.bentTubeBendRadius"),
      value: segment.bendRadius,
      min: minRadius,
      max: Math.max(100, minRadius + 50),
      step: 0.5,
      onChange: (value) => changeSegment({ bendRadius: value }),
    },
    {
      id: "bentTubeRoll",
      label: t("prop.bentTubeRoll"),
      value: segment.roll,
      min: -MAX_BENT_TUBE_ROLL,
      max: MAX_BENT_TUBE_ROLL,
      step: 1,
      onChange: (value) => changeSegment({ roll: value }),
    },
  ];

  return (
    <div className={`property-card ${open ? "" : "collapsed"}`}>
      <button
        className="property-card-header"
        type="button"
        aria-expanded={open}
        aria-controls={`bent-tube-segments-${shape.id}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{t("inspector.bentTubeSegments")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <div className="property-list" id={`bent-tube-segments-${shape.id}`}>
          <ShapePropertyRows properties={properties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
          <div className="bent-tube-segment-actions">
            <button
              className="inspector-action-button"
              type="button"
              disabled={locked || segments.length >= MAX_BENT_TUBE_SEGMENTS}
              onClick={() => {
                const added = { length: 20, bendAngle: 0, bendRadius: segment.bendRadius, roll: 0 };
                writeSegments([...segments.slice(0, index + 1), added, ...segments.slice(index + 1)]);
                setSelected(index + 1);
              }}
            >
              {t("bentTube.addSegment")}
            </button>
            <button
              className="inspector-action-button"
              type="button"
              disabled={locked || segments.length <= 1}
              onClick={() => {
                writeSegments(segments.filter((_entry, position) => position !== index));
                setSelected(Math.max(0, index - 1));
              }}
            >
              {t("bentTube.removeSegment")}
            </button>
          </div>
          {selfIntersects ? <p className="bent-tube-warning" role="status">{t("bentTube.selfIntersects")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

type PropertyDefaultValues = ReadonlyMap<string, number | string | boolean>;

/**
 * The values a shape of this kind has when it is made new, with the defaults saved in the
 * settings, by property id. The main list, the taper card and the twist card each have
 * their own, as some ids (a pyramid's top width) mean different things in them. Null for
 * a shape that is not made from the toolbar: a sketch, a mesh, a group.
 */
function shapePropertyDefaults(kind: WorkplaneShape["kind"], workspace: WorkplaneWorkspaceSettings) {
  const asset = shapeDefaultsAsset(kind);
  if (!asset) return null;
  try {
    const fresh = makeShapeFromAsset(asset, undefined, workspace.shapeCustomizations[kind]);
    const main = new Map<string, number | string | boolean>();
    getShapeProperties(fresh, () => undefined, workspace).forEach((property) => {
      if (property.type !== "text") main.set(property.id, property.value);
    });
    const taperSize = shapeTaperDimensions(fresh);
    const taper = new Map<string, number | string | boolean>([
      ["topLength", taperSize.topDepth],
      ["topWidth", taperSize.topWidth],
      ["bottomLength", taperSize.bottomDepth],
      ["bottomWidth", taperSize.bottomWidth],
    ]);
    const twist = new Map<string, number | string | boolean>([["extrudeTwist", 0], ["extrudeTopOffsetX", 0], ["extrudeTopOffsetZ", 0]]);
    return { main, taper, twist };
  } catch {
    return null;
  }
}

/** Values a reset arrow does not belong to: they are not settings of the shape's look. */
const NO_RESET_PROPERTY_IDS = new Set(["color", "name"]);

function ShapePropertyRows({
  properties,
  defaults,
  workspace,
  disabled,
  formulas,
  onFormula,
  onInteractionActiveChange,
}: {
  properties: ShapePropertyConfig[];
  /** What each value was when the shape was new; a value that differs gets a reset arrow. */
  defaults?: PropertyDefaultValues | null;
  workspace: WorkplaneWorkspaceSettings;
  disabled?: boolean;
  /** The calculations the body's fields remember (#180), and where a field reports the one it was just set from. */
  formulas?: FieldFormulas;
  onFormula?: (id: string, text: string | null | undefined) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  return properties.map((property) => {
    if (property.type === "text") {
      return <TextProperty {...property} key={property.id} disabled={disabled} onInteractionActiveChange={onInteractionActiveChange} />;
    }
    const fallback = disabled || NO_RESET_PROPERTY_IDS.has(property.id) ? undefined : defaults?.get(property.id);
    if (property.type === "select") {
      const onReset = typeof fallback === "string" && fallback !== property.value ? () => property.onChange(fallback) : undefined;
      return <SelectProperty {...property} key={property.id} disabled={disabled} onReset={onReset} />;
    }
    if (property.type === "toggle") {
      const onReset = typeof fallback === "boolean" && fallback !== property.value ? () => property.onChange(fallback) : undefined;
      return <ToggleProperty {...property} key={property.id} disabled={disabled} onReset={onReset} />;
    }
    const differs = typeof fallback === "number" && Math.abs(fallback - property.value) > Math.max(1e-6, (property.step ?? 0.01) / 10);
    const onReset = differs ? () => property.onChange(fallback as number) : undefined;
    return <RangeProperty {...property} key={property.id} workspace={workspace} disabled={disabled || property.disabled} onReset={onReset} formula={formulas?.[property.id]} onFormula={onFormula ? (text) => onFormula(property.id, text) : undefined} onInteractionActiveChange={onInteractionActiveChange} />;
  });
}

/** The small arrow next to a value that differs from its default. */
function PropertyResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="property-reset"
      title={t("inspector.resetProperty")}
      aria-label={t("inspector.resetProperty")}
      // Inside a label: neither focus nor the label's own click should reach the slider.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <RotateCcw size={12} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}

export function SnapGridControl({
  units,
  customGrids,
  snap,
  snapOpen,
  onSnapChange,
  onSnapOpenChange,
  objectSnap,
  onObjectSnapChange,
}: {
  units: string;
  /** The user's own snap measures, listed after the fixed steps. */
  customGrids?: CustomSnapGrid[];
  snap: GridSize;
  snapOpen: boolean;
  onSnapChange: Dispatch<SetStateAction<GridSize>>;
  onSnapOpenChange: Dispatch<SetStateAction<boolean>>;
  /** Only the 3D editor passes these: snapping to other shapes, switched in the same menu. */
  objectSnap?: boolean;
  onObjectSnapChange?: (enabled: boolean) => void;
}) {
  const label = (size: GridSize) => customSnapGridLabel(size, customGrids) ?? measurementOptionLabel(size);
  return (
    <div className="snap-row">
      <span>{t("inspector.snapGrid")}</span>
      <button className="snap-select" onClick={() => onSnapOpenChange((value) => !value)}>
        <span className="snap-select-label">{label(snap)}</span>
        <ChevronDown size={12} fill="currentColor" />
      </button>
      {snapOpen ? (
        <div className="snap-menu">
          {snapGridOptions(units, customGrids).map((size) => (
            <button
              key={size}
              className={size === snap ? "selected" : ""}
              onClick={() => {
                onSnapChange(size);
                onSnapOpenChange(false);
              }}
            >
              {label(size)}
            </button>
          ))}
          {onObjectSnapChange ? (
            <label className="snap-object-toggle" title={t("inspector.objectSnapHint")}>
              <input type="checkbox" checked={Boolean(objectSnap)} onChange={(event) => onObjectSnapChange(event.target.checked)} />
              <span>{t("inspector.objectSnap")}</span>
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Haelt das Speichern an, solange ein Feld bedient wird, und gibt es auch dann
 * wieder frei, wenn das Feld verschwindet, waehrend es noch den Fokus hat.
 * Chrome meldet dann kein `blur` - die Sperre blieb stehen, und jede weitere
 * Aenderung wurde nur vorgemerkt, nie gespeichert (Diskussion #87).
 */
function useInteractionHold(onInteractionActiveChange?: (active: boolean) => void) {
  const heldRef = useRef(false);
  const callbackRef = useRef(onInteractionActiveChange);
  callbackRef.current = onInteractionActiveChange;
  useEffect(() => () => {
    if (!heldRef.current) return;
    heldRef.current = false;
    callbackRef.current?.(false);
  }, []);
  return useCallback((active: boolean) => {
    heldRef.current = active;
    callbackRef.current?.(active);
  }, []);
}

/**
 * Das Feld fuer eine eigene Farbe. Es bleibt dasselbe Element, wenn sich die
 * Farbe aendert - frueher wurde es dabei ausgetauscht, waehrend es noch den
 * Fokus hatte, und eine zweite eigene Farbe kam gar nicht mehr an.
 */
function CustomColorInput({ color, disabled, onCommit, onInteractionActiveChange }: {
  color: string;
  disabled?: boolean;
  onCommit: (color: string) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const holdInteraction = useInteractionHold(onInteractionActiveChange);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  useEffect(() => {
    const input = inputRef.current;
    if (input && input.value.toLowerCase() !== color.toLowerCase()) input.value = color;
  }, [color]);
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    // React's color-input onChange follows the native input event and fires for
    // every movement in the picker. Commit only the native change event, which
    // fires after the user finishes choosing, so dragging stays responsive.
    const commit = () => commitRef.current(input.value);
    input.addEventListener("change", commit);
    return () => input.removeEventListener("change", commit);
  }, []);
  return (
    <input
      ref={inputRef}
      type="color"
      defaultValue={color}
      disabled={disabled}
      onFocus={() => holdInteraction(true)}
      onBlur={() => holdInteraction(false)}
    />
  );
}

function RangeProperty({
  id,
  label,
  value,
  min,
  max,
  step = 0.01,
  workspace,
  disabled,
  onChange,
  onReset,
  formula,
  onFormula,
  onInteractionActiveChange,
}: RangePropertyConfig & { workspace: WorkplaneWorkspaceSettings; disabled?: boolean; onReset?: () => void; formula?: string; onFormula?: (text: string | null | undefined) => void; onInteractionActiveChange?: (active: boolean) => void }) {
  const holdInteraction = useInteractionHold(onInteractionActiveChange);
  const allowsAboveSliderMax = ["length", "width", "height", "starOuterSize", "starInnerSize", "crescentThickness", "honeycombCellSize", "honeycombWallThickness", "honeycombFrameWidth", "bentTubeSize", "bentTubeBendRadius"].includes(id) || id.endsWith("Length") || id.endsWith("Width");
  const isLength = propertyUsesLengthUnit(id);
  const accuracy = workspace.accuracy;
  const actualValue = Math.max(min, Number.isFinite(value) ? value : min);
  const controlValue = isLength ? millimetersToDisplay(actualValue, workspace) : actualValue;
  const controlMin = isLength ? millimetersToDisplay(min, workspace) : min;
  const controlMax = isLength ? millimetersToDisplay(max, workspace) : max;
  const controlStep = isLength ? displayStepFromMillimeters(step, workspace) : step;
  const sliderValue = clamp(controlValue, controlMin, controlMax);
  const position = ((sliderValue - controlMin) / Math.max(Number.EPSILON, controlMax - controlMin)) * 100;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatPropertyNumber(controlValue, accuracy, controlStep));
  const unit = isLength ? lengthDisplayUnit(workspace).label : ROTATION_PROPERTY_IDS.has(id) ? "°" : null;
  // Inches read as fractions (1⅝), like Tinkercad; the slider and typed decimals stay exact.
  const formatShown = (shown: number) => (unit === "in" && showsInchFractions(workspace) ? formatFractionalInches(shown) : formatPropertyNumber(shown, accuracy, controlStep));
  const toModelValue = (nextValue: number) => isLength ? displayToMillimeters(nextValue, workspace) : nextValue;
  // The calculation the field was last set from comes back when it is entered (#180), as long as
  // the value still equals it; a value changed by a handle or the slider shows the number again.
  const shownFormula = formulaMatchesValue(formula, controlValue) ? formula : undefined;
  const openingDraft = () => shownFormula ?? formatShown(controlValue);
  const openedWithRef = useRef<string | null>(null);
  const commitDraft = () => {
    // Leaving the field untouched keeps the exact value, not its rounded reading - and its formula.
    if (draft === (openedWithRef.current ?? formatShown(controlValue))) {
      setEditing(false);
      holdInteraction(false);
      return;
    }
    const next = RELATIVE_SIZE_PROPERTY_IDS.has(id)
      ? resolveMeasurementInput(draft, controlValue)
      : parseMeasurementInput(draft);
    const finiteNext = Number.isFinite(next) ? next : controlValue;
    const nextModelValue = toModelValue(finiteNext);
    // The formula rides along with the value it set, in the same change; a plain number clears it.
    onFormula?.(Number.isFinite(next) ? formulaToRemember(draft) : null);
    onChange(allowsAboveSliderMax ? Math.max(min, nextModelValue) : clamp(nextModelValue, min, max));
    onFormula?.(undefined);
    setEditing(false);
    holdInteraction(false);
  };
  const handleSliderChange = (nextValue: number) => {
    const next = clamp(Number.isFinite(nextValue) ? nextValue : controlMin, controlMin, controlMax);
    onChange(clamp(toModelValue(next), min, max));
    setDraft(formatShown(next));
  };
  return (
    <label className="range-property" style={{ "--slider-pos": `${position}%` } as CSSProperties}>
      <span className="range-property-header">
        <span className="range-property-name">{label}{onReset ? <PropertyResetButton onClick={onReset} /> : null}</span>
        <span className="range-value-control">
          <input
            type="text"
            value={editing ? draft : formatShown(controlValue)}
            disabled={disabled}
            inputMode={unit === "in" ? "text" : "decimal"}
            title={shownFormula ? `= ${shownFormula}` : undefined}
            data-formula={shownFormula ? "" : undefined}
            onFocus={(event) => {
              holdInteraction(true);
              const opening = openingDraft();
              openedWithRef.current = opening;
              setDraft(opening);
              setEditing(true);
              selectWholeValue(event.currentTarget);
            }}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                setDraft(openingDraft());
                setEditing(false);
              }
            }}
          />
          {unit ? <span className={`range-value-unit${unit === "°" ? " degree" : ""}`}>{unit}</span> : null}
        </span>
      </span>
      <div className="range-control">
        <input
          type="range"
          min={controlMin}
          max={controlMax}
          step={controlStep}
          value={sliderValue}
          disabled={disabled}
          onFocus={() => holdInteraction(true)}
          onBlur={() => holdInteraction(false)}
          onPointerDown={() => holdInteraction(true)}
          onPointerUp={() => holdInteraction(false)}
          onPointerCancel={() => holdInteraction(false)}
          onChange={(event) => handleSliderChange(Number(event.currentTarget.value))}
        />
      </div>
    </label>
  );
}

function TextProperty({ label, value, disabled, onChange, onInteractionActiveChange }: Omit<TextPropertyConfig, "id"> & { id?: string } & { disabled?: boolean; onInteractionActiveChange?: (active: boolean) => void }) {
  const holdInteraction = useInteractionHold(onInteractionActiveChange);
  return (
    <label className="text-property">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        maxLength={24}
        spellCheck={false}
        onFocus={() => holdInteraction(true)}
        onBlur={() => holdInteraction(false)}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function SelectProperty({ label, value, options, hint, disabled, onChange, onReset }: Omit<SelectPropertyConfig, "id"> & { id?: string } & { disabled?: boolean; onReset?: () => void }) {
  // Aufeinanderfolgende Eintraege mit derselben Ueberschrift werden zu einem
  // Block; ohne Ueberschrift stehen sie fuer sich.
  const blocks: Array<{ group?: string; items: SelectPropertyOption[] }> = [];
  options.forEach((option) => {
    const last = blocks[blocks.length - 1];
    if (last && last.group === option.group) last.items.push(option);
    else blocks.push({ group: option.group, items: [option] });
  });
  return (
    <label className="select-property">
      <span>{label}{onReset ? <PropertyResetButton onClick={onReset} /> : null}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value)}>
        {blocks.map((block) => (
          block.group ? (
            <optgroup key={block.group} label={block.group}>
              {block.items.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </optgroup>
          ) : (
            <Fragment key={block.items[0].value}>
              {block.items.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Fragment>
          )
        ))}
      </select>
      {hint ? <small className="select-property-hint">{hint}</small> : null}
    </label>
  );
}

function ToggleProperty({ label, value, disabled, onChange, onReset }: Omit<TogglePropertyConfig, "id" | "type"> & { disabled?: boolean; onReset?: () => void }) {
  return (
    <label className="check-property">
      <input type="checkbox" checked={value} disabled={disabled} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>{label}{onReset ? <PropertyResetButton onClick={onReset} /> : null}</span>
    </label>
  );
}

/** Holt eine Auswahl aus der Merkmalsliste heraus, um sie woanders zu zeichnen. */
function findSelectProperty(properties: ShapePropertyConfig[], id: string) {
  const found = properties.find((property) => property.id === id);
  return found && found.type === "select" ? found : null;
}

/**
 * Dieselbe Kachelreihe wie bei der Zahnradart, nur mit gezeichneten Bildchen
 * statt Rasterdateien - so bleiben sie bei jeder Groesse scharf und nehmen die
 * Farbe des Themas an.
 */
function IconOptionSelector({
  label,
  options,
  value,
  columns,
  disabled,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string; preview: ReactNode }>;
  value: string;
  columns: 2 | 3;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="gear-type-property" role="group" aria-label={label}>
      <span>{label}</span>
      <div className={columns === 2 ? "gear-type-options icon-options two-up" : "gear-type-options icon-options"}>
        {options.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? "selected" : ""}
            type="button"
            disabled={disabled}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.preview}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Seitenansichten: Schraube und Stange stehen, Mutter und Loch liegen aufgeschnitten.
 * Ein Rechtsgewinde steigt nach rechts an ("/"), auch in Gewindeloch und Mutter, damit
 * alle Symbole dieselbe Richtung zeigen.
 */
function ThreadRolePreview({ role }: { role: ThreadRole }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (role === "screw") {
    return (
      <svg {...common}>
        <path d="M5 22v-5h14v5z" />
        <path d="M9.5 17V2h5v15" />
        <path d="M9.5 6.1l5-1.1M9.5 9.6l5-1.1M9.5 13.1l5-1.1" />
        <path d="M10.5 22v-5h3v5z" />
      </svg>
    );
  }
  if (role === "nut") {
    return (
      <svg {...common}>
        <path d="M12 2.2l8.5 4.9v9.8L12 21.8 3.5 16.9V7.1z" />
        <circle cx="12" cy="12" r="4.3" />
        <path d="M7.7 11.4l8.6-1M7.7 14.6l8.6-1" />
      </svg>
    );
  }
  if (role === "bore") {
    return (
      <svg {...common}>
        <path d="M3 3h18v18H3z" />
        <path d="M9 3v18M15 3v18" />
        <path d="M9 7.6l6-1.1M9 11.6l6-1.1M9 15.6l6-1.1M9 19.6l6-1.1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 2h8v20H8z" />
      <path d="M8 6.4l8-1.4M8 10.4l8-1.4M8 14.4l8-1.4M8 18.4l8-1.4" />
    </svg>
  );
}

/** Der Kopf sitzt unten, weil die Schraube so auf der Ebene steht. */
function ThreadHeadPreview({ head }: { head: ThreadHead }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (head === "countersunk") {
    return (
      <svg {...common}>
        <path d="M4 22l5-6h6l5 6z" />
        <path d="M9 16V3h6v13" />
        <path d="M9 7.1l6-1.1M9 11.1l6-1.1" />
        <path d="M10 22v-2.6h4V22z" />
      </svg>
    );
  }
  if (head === "hex") {
    return (
      <svg {...common}>
        <path d="M4 22v-6h16v6z" />
        <path d="M8 16v6M16 16v6" />
        <path d="M9 16V3h6v13" />
        <path d="M9 7.1l6-1.1M9 11.1l6-1.1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5.5 22v-6h13v6z" />
      <path d="M9 16V3h6v13" />
      <path d="M9 7.1l6-1.1M9 11.1l6-1.1" />
      <path d="M10.5 22v-3h3v3z" />
    </svg>
  );
}

function GearTypePreview({ type }: { type: GearType }) {
  return <img src={`assets/editor/gear-types/${type}.png`} alt="" aria-hidden="true" />;
}

function GearTypeSelector({ value, disabled, onChange }: { value: GearType; disabled?: boolean; onChange: (value: GearType) => void }) {
  return (
    <div className="gear-type-property" role="group" aria-label={t("inspector.gearType")}>
      <span>{t("inspector.gearType")}</span>
      <div className="gear-type-options">
        {GEAR_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? "selected" : ""}
            type="button"
            disabled={disabled}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            <GearTypePreview type={option.value} />
            <span>{t(option.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The properties panel for several parts at once (#183), as in Tinkercad: how many are
 * selected, solid or hole and a colour for all of them, and locking. Sizes stay with a single
 * body, the handles and Scale by percent. Locked parts are left as they are.
 */
export function SelectionInspector({
  shapes,
  onSetHole,
  onSetColor,
  onToggleLocked,
  onInteractionActiveChange,
}: {
  shapes: readonly WorkplaneShape[];
  onSetHole: (hole: boolean) => void;
  onSetColor: (color: string) => void;
  onToggleLocked: () => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  useLanguage();
  const movable = useMovablePanel<HTMLElement>("layerling.editor.inspectorPosition", INSPECTOR_PANEL);
  const [colorOpen, setColorOpen] = useState(false);
  const { colors: recentColors, remember: rememberColor } = useRecentColors(SOLID_COLORS);
  const solidKinds = shapes.filter((shape) => !isNonSolidShapeKind(shape.kind));
  const allLocked = shapes.length > 0 && shapes.every((shape) => shape.locked);
  const allHoles = solidKinds.length > 0 && solidKinds.every((shape) => shape.hole);
  const noHoles = solidKinds.every((shape) => !shape.hole);
  const solids = solidKinds.filter((shape) => !shape.hole);
  const sharedColor = solids.length > 0 && solids.every((shape) => shape.color.toLowerCase() === solids[0].color.toLowerCase()) ? solids[0].color : null;
  const swatch = sharedColor ?? solids[0]?.color ?? SOLID_COLORS[0];
  // Two involute gears: where they mesh (#201).
  const gearPair = shapes.length === 2 ? involuteGearPair(shapes[0], shapes[1]) : null;
  const pick = (color: string) => {
    onSetColor(color);
    rememberColor(color);
    setColorOpen(false);
  };
  return (
    <aside
      ref={movable.panelRef}
      className={`shape-inspector selection-inspector ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      aria-label={t("inspector.selectionTitle", { count: shapes.length })}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="shape-inspector-header movable" title={t("inspector.moveHint")} {...movable.handleProps}>
        <div className="inspector-name">
          <strong>{t("inspector.selectionTitle", { count: shapes.length })}</strong>
        </div>
        <div className="inspector-header-actions">
          <GuideHelpLink section="selectionProperties" className="inspector-help-link" />
          <button className={allLocked ? "inspector-header-icon active" : "inspector-header-icon"} aria-label={allLocked ? t("outliner.unlock") : t("outliner.lock")} onClick={onToggleLocked}>
            {allLocked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
        </div>
      </div>
      {solidKinds.length > 0 ? (
        <div className="shape-state-card" role="group" aria-label={t("inspector.shapeMode")}>
          <button
            className={noHoles ? "active solid-choice" : "solid-choice"}
            onClick={() => {
              if (noHoles) setColorOpen((open) => !open);
              else onSetHole(false);
            }}
            disabled={allLocked}
            aria-pressed={noHoles}
            aria-expanded={colorOpen}
          >
            <span className="large-solid-swatch" style={{ "--swatch": swatch } as CSSProperties} />
            <span>{t("inspector.solid")}</span>
          </button>
          <button
            className={allHoles ? "active hole-choice" : "hole-choice"}
            onClick={() => {
              onSetHole(true);
              setColorOpen(false);
            }}
            disabled={allLocked}
            aria-pressed={allHoles}
          >
            <span className="large-hole-swatch" />
            <span>{t("inspector.hole")}</span>
          </button>
          {!noHoles && !allHoles ? <p className="selection-mixed-note">{t("inspector.selectionMixed")}</p> : null}
        </div>
      ) : null}
      {colorOpen ? (
        <div className="color-card" aria-label={t("inspector.shapeColor")}>
          <div className="color-card-header">
            <span>{t("inspector.color")}</span>
            <span className="color-value">{sharedColor ? sharedColor.toUpperCase() : t("inspector.selectionMixedColors")}</span>
          </div>
          <div className="color-grid">
            {SOLID_COLORS.map((color) => (
              <button
                key={color}
                className={sharedColor?.toLowerCase() === color.toLowerCase() ? "selected" : ""}
                type="button"
                style={{ "--shape-swatch": color } as CSSProperties}
                title={color.toUpperCase()}
                aria-label={t("aria.setColor", { color })}
                disabled={allLocked}
                onClick={() => pick(color)}
              />
            ))}
            <label className={allLocked ? "custom-color disabled" : "custom-color"} title={t("inspector.customColor")}>
              <CustomColorInput color={swatch} disabled={allLocked} onCommit={pick} onInteractionActiveChange={onInteractionActiveChange} />
              <span>{t("inspector.custom")}</span>
            </label>
          </div>
          {recentColors.length > 0 ? (
            <div className="color-recent">
              <span className="color-recent-label">{t("inspector.recentColors")}</span>
              <div className="color-grid">
                {recentColors.map((color) => (
                  <button
                    key={color}
                    className={sharedColor?.toLowerCase() === color ? "selected" : ""}
                    type="button"
                    style={{ "--shape-swatch": color } as CSSProperties}
                    title={color.toUpperCase()}
                    aria-label={t("aria.setColor", { color })}
                    disabled={allLocked}
                    onClick={() => pick(color)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {gearPair ? (
        <p className="selection-gear-pair" role="status">
          {gearPair.distance === null
            ? t("inspector.gearPairMismatch", { a: plainNumber(gearPair.modules[0]), b: plainNumber(gearPair.modules[1]) })
            : t(gearPair.internal ? "inspector.gearPairInternal" : "inspector.gearPair", { distance: plainNumber(gearPair.distance), current: plainNumber(gearPair.current) })}
        </p>
      ) : null}
      <p className="selection-inspector-hint">{t("inspector.selectionHint")}</p>
    </aside>
  );
}
