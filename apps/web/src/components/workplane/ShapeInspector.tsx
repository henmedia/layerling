"use client";

import { ChevronDown, ChevronUp, LockKeyhole, LockKeyholeOpen, Split } from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ToolbarHideSelectedIcon } from "@/components/icons";
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
} from "@/lib/gearGeometry";
import {
  MAX_THREAD_CLEARANCE,
  MAX_THREAD_DIAMETER,
  MAX_THREAD_QUALITY,
  MIN_THREAD_CLEARANCE,
  MIN_THREAD_DIAMETER,
  MIN_THREAD_QUALITY,
  THREAD_SIZE_GROUPS,
  defaultThreadHeadHeight,
  normalizeThreadChamfer,
  normalizeThreadClearance,
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
  normalizeStarFillet,
  normalizeStarInnerSize,
  normalizeStarPoints,
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
import { displayStepFromMillimeters, displayToMillimeters, formatMeasurementNumber, lengthDisplayUnit, measurementOptionLabel, millimetersToDisplay, parseMeasurementInput } from "@/lib/measurementUnits";
import { t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { isNonSolidShapeKind, resizedShapeSize, shapeDepth, shapeHasTaper, shapeOverallFootprintDimensions, shapeSupportsTaper, shapeTaperDimensions, shapeWidth } from "@/lib/workplaneShapes";
import { normalizeSketchRevolveSettings } from "@/lib/sketchRevolve";
import { roundSideCount } from "@/lib/roundSideCount";
import { normalizePyramidTop } from "@/lib/pyramidGeometry";
import {
  MAX_SPRING_QUALITY,
  MIN_SPRING_QUALITY,
  normalizeSpringQuality,
  normalizeSpringTurns,
  normalizeSpringWire,
  springSettings,
  springTurnLimits,
  springWireLimits,
} from "@/lib/springGeometry";
import { regularPolygonAspect } from "@/lib/regularPolygonFootprint";
import { DEFAULT_TAPER_DIMENSION_MAX, MAX_HIGH_RESOLUTION_SIDES, shapeDimensionLimit } from "@/lib/workplaneSettings";
import type { GearType, GridSize, MeasurementAccuracy, ThreadHead, ThreadProfile, ThreadRole, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { selectWholeValue } from "@/lib/numberField";

const GRID_SIZES: GridSize[] = ["Off", "0.1 mm", "0.25 mm", "0.5 mm", "1.0 mm", "2.0 mm", "5.0 mm", "Brick"];
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
  onChange: (value: string) => void;
};

type ShapePropertyConfig = RangePropertyConfig | TextPropertyConfig | SelectPropertyConfig | TogglePropertyConfig;
export type ShapeInspectorUpdateOptions = { resizeAxis?: "width" | "depth" | "height" };
type ShapeInspectorUpdate = (patch: Partial<WorkplaneShape>, options?: ShapeInspectorUpdateOptions) => void;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatPropertyNumber(value: number, accuracy: MeasurementAccuracy, step: number) {
  if (step >= 1) return String(Math.round(value));
  return formatMeasurementNumber(value, accuracy, step);
}

function propertyUsesLengthUnit(key: string) {
  return ["radius", "length", "width", "height", "bevel", "topRadius", "baseRadius", "thickness", "toothSize", "toothWidth", "centerHole", "topLength", "topWidth", "bottomLength", "bottomWidth", "diameter", "pitch", "clearance", "threadLength", "headHeight", "chamfer", "headChamfer", "wire", "starOuterSize", "starInnerSize", "starOuterFillet", "starInnerFillet", "heartTipFillet", "crescentThickness", "crescentTipFillet", "honeycombCellSize", "honeycombWallThickness", "honeycombFrameWidth", "cornerFillet", "topBottomFillet"].includes(key);
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
      { id: "sides", label: t("prop.sides"), value: settings.sides, min: 3, max: MAX_HIGH_RESOLUTION_SIDES, step: 1, onChange: (sides) => updateRevolve({ sides }) },
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

  if (shape.kind === "slot") {
    return [
      ...roundSideProperties(shape, Math.min(width, depth), Math.min(width, depth), onUpdate),
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
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
      { id: "steps", label: t("prop.steps"), value: shape.steps ?? 24, min: 6, max: 64, step: 1, onChange: (steps) => onUpdate({ steps: Math.round(steps) }) },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "halfSphere") {
    return [
      { id: "steps", label: t("prop.steps"), value: shape.steps ?? 32, min: 6, max: 64, step: 1, onChange: (steps) => onUpdate({ steps: Math.round(steps) }) },
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
        group: group.series === "metric" ? t("thread.systemMetric") : group.series,
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
        onChange: (value) => {
          const chosen = THREAD_SIZE_GROUPS.flatMap((group) => group.sizes).find((size) => size.id === value);
          if (chosen) applyThread({ diameter: chosen.diameter, pitch: chosen.pitch });
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
          id: "pitch",
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
    const setGearWidth = (value: number) => {
      const toothSize = normalizeGearToothSize(shape.toothSize, value, depth);
      const toothWidth = normalizeGearToothWidth(shape.toothWidth, value, depth, shape.teeth);
      const centerHoleSize = normalizeGearCenterHoleSize(shape.centerHoleSize, value, depth, toothSize);
      onUpdate({ width: value, size: resizedShapeSize(value, depth), toothSize, toothWidth, centerHoleSize }, { resizeAxis: "width" });
    };
    const setGearDepth = (value: number) => {
      const toothSize = normalizeGearToothSize(shape.toothSize, width, value);
      const toothWidth = normalizeGearToothWidth(shape.toothWidth, width, value, shape.teeth);
      const centerHoleSize = normalizeGearCenterHoleSize(shape.centerHoleSize, width, value, toothSize);
      onUpdate({ depth: value, size: resizedShapeSize(width, value), toothSize, toothWidth, centerHoleSize }, { resizeAxis: "depth" });
    };
    const teeth = shape.teeth ?? DEFAULT_GEAR_TEETH;
    const toothPitch = gearToothPitch(width, depth, teeth);
    const toothSize = normalizeGearToothSize(shape.toothSize ?? DEFAULT_GEAR_TOOTH_SIZE, width, depth);
    const centerHoleLimits = gearCenterHoleLimits(width, depth, toothSize);
    const properties: ShapePropertyConfig[] = [
      {
        id: "teeth",
      label: t("prop.teeth"),
        value: teeth,
        min: 6,
        max: 64,
        step: 1,
        onChange: (value) => {
          const nextTeeth = Math.round(value);
          onUpdate({
            teeth: nextTeeth,
            toothWidth: normalizeGearToothWidth(shape.toothWidth, width, depth, nextTeeth),
          });
        },
      },
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
    ];
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
    properties.push(
      {
        id: "centerHole",
      label: t("prop.centerHole"),
        value: normalizeGearCenterHoleSize(shape.centerHoleSize, width, depth, toothSize),
        min: centerHoleLimits.min,
        max: centerHoleLimits.max,
        step: 0.1,
        onChange: (centerHoleSize) => onUpdate({ centerHoleSize }),
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setGearDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setGearWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    );
    return properties;
  }

  if (shape.kind === "text") {
    return [
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
      { type: "select", id: "font", label: t("prop.font"), value: shape.font ?? "Multilanguage", options: TEXT_FONT_OPTIONS.map((value) => ({ value, label: value })), onChange: (font) => onUpdate({ font }) },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 40, onChange: setHeight },
      { id: "bevel", label: t("prop.bevel"), value: shape.bevel ?? 0, min: 0, max: 8, onChange: (bevel) => onUpdate({ bevel }) },
      { id: "segments", label: t("prop.segments"), value: shape.segments ?? 0, min: 0, max: 24, step: 1, onChange: (segments) => onUpdate({ segments: Math.round(segments) }) },
    ];
  }

  return [
    { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
    { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
    { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
  ];
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
  onUpdate,
  onSnapChange,
  onSnapOpenChange,
  onSweepBend,
  onEditSketch,
  canSeparateParts = false,
  onSeparateParts,
  onInteractionActiveChange,
}: {
  shape: WorkplaneShape;
  snap: GridSize;
  snapOpen: boolean;
  workspace: WorkplaneWorkspaceSettings;
  onUpdate: ShapeInspectorUpdate;
  onSnapChange: Dispatch<SetStateAction<GridSize>>;
  onSnapOpenChange: Dispatch<SetStateAction<boolean>>;
  /** Dedicated callback for the Bend panel - see WorkplaneViewport's onSweepBendShape for why this is kept apart from onUpdate. */
  onSweepBend?: (points: { x: number; y: number; z: number }[]) => void;
  onEditSketch?: () => void;
  canSeparateParts?: boolean;
  onSeparateParts?: () => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  useLanguage();
  const solidColor = shape.color;
  const locked = Boolean(shape.locked);
  const properties = getShapeProperties(shape, onUpdate, workspace);
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
      : properties;
  const threadProperties = isThread
    ? properties.filter((property) => ["pitch", "threadHand", "threadProfile", "clearance", "chamfer", "quality"].includes(property.id))
    : [];
  const gearTeethProperties = shape.kind === "gear"
    ? properties.filter((property) => ["teeth", "toothSize", "toothWidth"].includes(property.id))
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
  const isSketchRevolve = shape.sketchOperation === "revolve" || Boolean(shape.sketchRevolve);
  const inspectorRef = useRef<HTMLElement>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [taperOpen, setTaperOpen] = useState(false);
  const [twistOpen, setTwistOpen] = useState(false);
  const canAddSweepSegment = Boolean(onSweepBend) && (shape.kind === "cylinder" || (shape.kind === "mesh" && Boolean(shape.extrudeSweepPath?.length)));
  const [bendOpen, setBendOpen] = useState(true);
  const [sweepLength, setSweepLength] = useState(0);
  const [sweepBendAngle, setSweepBendAngle] = useState(0);
  const [sweepBendRoll, setSweepBendRoll] = useState(0);
  const sweepLengthRef = useRef(0);
  const sweepBendAngleRef = useRef(0);
  const sweepBendRollRef = useRef(0);
  const sweepBasePathRef = useRef<{ x: number; y: number; z: number }[] | null>(null);
  const [gearTeethOpen, setGearTeethOpen] = useState(true);
  const [threadOpen, setThreadOpen] = useState(true);
  const [gearHelixOpen, setGearHelixOpen] = useState(true);
  const [colorOpen, setColorOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const customColorInputRef = useRef<HTMLInputElement>(null);

  /*
   * "Turtle" style: bend angle and roll are relative to the tube's current
   * heading, not an absolute world direction, so "90°" always means a clean
   * right-angle turn from wherever it is currently pointing. No debounce is
   * needed here - the sweep preview queue on the other end of onSweepBend
   * already keeps at most one bend computation in flight and at most one
   * waiting, so every slider move can call it directly.
   */
  const scheduleLiveSweepUpdate = (length: number, bendAngleDeg: number, bendRollDeg: number) => {
    if (!onSweepBend) return;
    if (!sweepBasePathRef.current) {
      sweepBasePathRef.current = shape.extrudeSweepPath?.length ? shape.extrudeSweepPath : [{ x: 0, y: 0, z: 0 }];
    }
    const basePath = sweepBasePathRef.current;
    if (!basePath || length <= 0) return;
    const last = basePath[basePath.length - 1];
    // A fresh cylinder has only its base point committed yet - its own
    // vertical axis is the natural "currently facing" direction. Once a
    // real segment exists, derive the heading from the last two points.
    const forward = basePath.length >= 2
      ? (() => {
          const prev = basePath[basePath.length - 2];
          const raw = { x: last.x - prev.x, y: last.y - prev.y, z: last.z - prev.z };
          const len = Math.hypot(raw.x, raw.y, raw.z) || 1;
          return { x: raw.x / len, y: raw.y / len, z: raw.z / len };
        })()
      : { x: 0, y: 1, z: 0 };
    const referenceUp = Math.abs(forward.y) > 0.98 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
    const rightRaw = {
      x: forward.y * referenceUp.z - forward.z * referenceUp.y,
      y: forward.z * referenceUp.x - forward.x * referenceUp.z,
      z: forward.x * referenceUp.y - forward.y * referenceUp.x,
    };
    const rightLen = Math.hypot(rightRaw.x, rightRaw.y, rightRaw.z) || 1;
    const right = { x: rightRaw.x / rightLen, y: rightRaw.y / rightLen, z: rightRaw.z / rightLen };
    const up = {
      x: right.y * forward.z - right.z * forward.y,
      y: right.z * forward.x - right.x * forward.z,
      z: right.x * forward.y - right.y * forward.x,
    };
    const theta = (bendAngleDeg * Math.PI) / 180;
    const phi = (bendRollDeg * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const bendDir = { x: up.x * cosPhi + right.x * sinPhi, y: up.y * cosPhi + right.y * sinPhi, z: up.z * cosPhi + right.z * sinPhi };
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const newForward = {
      x: forward.x * cosTheta + bendDir.x * sinTheta,
      y: forward.y * cosTheta + bendDir.y * sinTheta,
      z: forward.z * cosTheta + bendDir.z * sinTheta,
    };
    const pendingPoint = { x: last.x + newForward.x * length, y: last.y + newForward.y * length, z: last.z + newForward.z * length };
    onSweepBend([...basePath, pendingPoint]);
  };

  useEffect(() => () => onInteractionActiveChange?.(false), [onInteractionActiveChange]);
  useEffect(() => {
    const input = customColorInputRef.current;
    if (!colorOpen || !input) {
      return;
    }

    // React's color-input onChange follows the native input event and fires for
    // every movement in the picker. Commit only the native change event, which
    // fires after the user finishes choosing, so dragging stays responsive.
    const commitCustomColor = () => {
      onUpdate({ color: input.value, hole: false });
    };
    input.addEventListener("change", commitCustomColor);
    return () => input.removeEventListener("change", commitCustomColor);
  }, [colorOpen, onUpdate]);
  useLayoutEffect(() => {
    inspectorRef.current?.scrollTo({ top: 0, left: 0 });
    sweepBasePathRef.current = null;
    setSweepLength(0);
    setSweepBendAngle(0);
    setSweepBendRoll(0);
  }, [isSketchRevolve, shape.id]);

  return (
    <aside ref={inspectorRef} className={`shape-inspector ${isSketchRevolve ? "sketch-revolve-inspector" : ""} ${shape.kind === "gear" ? "gear-inspector" : ""} ${minimized ? "minimized" : ""}`} aria-label={`${shape.name} shape settings`} onPointerDown={(event) => event.stopPropagation()}>
      <div className="shape-inspector-header">
        <button
          className="inspector-header-icon"
          aria-label={minimized ? "Expand shape settings" : "Minimize shape settings"}
          aria-expanded={!minimized}
          onClick={() => setMinimized((current) => !current)}
        >
          {minimized ? <ChevronDown size={26} strokeWidth={2.8} /> : <ChevronUp size={26} strokeWidth={2.8} />}
        </button>
        <strong>{shape.name}</strong>
        <div className="inspector-header-actions">
          <button className={locked ? "inspector-header-icon active" : "inspector-header-icon"} aria-label={locked ? "Unlock shape" : "Lock shape"} onClick={() => onUpdate({ locked: !locked })}>
            {locked ? <LockKeyhole size={31} strokeWidth={2.4} /> : <LockKeyholeOpen size={31} strokeWidth={2.4} />}
          </button>
          <button className={shape.hidden ? "inspector-header-icon active" : "inspector-header-icon"} aria-label={shape.hidden ? "Show shape" : "Hide shape"} onClick={() => onUpdate({ hidden: !shape.hidden })}>
            <ToolbarHideSelectedIcon />
          </button>
        </div>
      </div>

      {!minimized ? (
        <>
      {!isNonSolidShapeKind(shape.kind) ? (
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
                  onUpdate({ color, hole: false });
                  setColorOpen(false);
                }}
              />
            ))}
            <label className={locked ? "custom-color disabled" : "custom-color"} title={t("inspector.customColor")}>
              <input
                key={`${shape.id}-${solidColor}`}
                ref={customColorInputRef}
                type="color"
                defaultValue={solidColor}
                disabled={locked}
                onFocus={() => onInteractionActiveChange?.(true)}
                onBlur={() => onInteractionActiveChange?.(false)}
              />
              <span>{t("inspector.custom")}</span>
            </label>
          </div>
        </div>
      ) : null}

      {shape.sketchProfile && onEditSketch ? (
        <button className="edit-sketch-button" type="button" disabled={locked} onClick={onEditSketch}>
          Edit sketch
        </button>
      ) : null}

      {canSeparateParts && onSeparateParts ? (
        <button className="inspector-action-button" type="button" disabled={locked} onClick={onSeparateParts}>
          <Split size={17} strokeWidth={2.5} />
          <span>{t("inspector.separateParts")}</span>
        </button>
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
                onChange={(gearType) => onUpdate({ gearType })}
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
            <ShapePropertyRows properties={primaryProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
          </div>
        ) : null}
      </div>
      {canAddSweepSegment ? (
        <div className={`property-card ${bendOpen ? "" : "collapsed"}`}>
          <button
            className="property-card-header"
            type="button"
            aria-expanded={bendOpen}
            aria-controls={`bend-${shape.id}`}
            onClick={() => setBendOpen((open) => !open)}
          >
            <span>{t("inspector.bend")}</span>
            <ChevronUp className={bendOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {bendOpen ? (
            <div className="property-list" id={`bend-${shape.id}`}>
              <ShapePropertyRows
                properties={[
                  {
                    id: "sweepLength", label: t("prop.segmentLength"), value: sweepLength, min: 0, max: 160, step: 0.5,
                    onChange: (value: number) => { sweepLengthRef.current = value; setSweepLength(value); scheduleLiveSweepUpdate(value, sweepBendAngleRef.current, sweepBendRollRef.current); },
                  },
                  {
                    id: "sweepBendAngle", label: t("prop.bendAngle"), value: sweepBendAngle, min: 0, max: 179, step: 1,
                    onChange: (value: number) => { sweepBendAngleRef.current = value; setSweepBendAngle(value); scheduleLiveSweepUpdate(sweepLengthRef.current, value, sweepBendRollRef.current); },
                  },
                  {
                    id: "sweepBendRoll", label: t("prop.bendRoll"), value: sweepBendRoll, min: -180, max: 180, step: 1,
                    onChange: (value: number) => { sweepBendRollRef.current = value; setSweepBendRoll(value); scheduleLiveSweepUpdate(sweepLengthRef.current, sweepBendAngleRef.current, value); },
                  },
                ]}
                workspace={workspace}
                disabled={locked}
                onInteractionActiveChange={onInteractionActiveChange}
              />
            </div>
          ) : null}
          <button
            className="inspector-action-button"
            type="button"
            disabled={locked || sweepLength <= 0}
            onClick={() => {
              sweepBasePathRef.current = null;
              sweepLengthRef.current = 0;
              sweepBendAngleRef.current = 0;
              sweepBendRollRef.current = 0;
              setSweepLength(0);
              setSweepBendAngle(0);
              setSweepBendRoll(0);
            }}
          >
            <span>{t("action.lockInBend")}</span>
          </button>
        </div>
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
              <ShapePropertyRows properties={taperProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
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
              <ShapePropertyRows properties={twistProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
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
              <ShapePropertyRows properties={threadProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
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
              <ShapePropertyRows properties={gearTeethProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
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
              <ShapePropertyRows properties={gearHelixProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="inspector-snap-dock">
        <SnapGridControl snap={snap} snapOpen={snapOpen} onSnapChange={onSnapChange} onSnapOpenChange={onSnapOpenChange} />
      </div>
        </>
      ) : null}
    </aside>
  );
}

function ShapePropertyRows({
  properties,
  workspace,
  disabled,
  onInteractionActiveChange,
}: {
  properties: ShapePropertyConfig[];
  workspace: WorkplaneWorkspaceSettings;
  disabled?: boolean;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  return properties.map((property) => {
    if (property.type === "text") {
      return <TextProperty {...property} key={property.id} disabled={disabled} onInteractionActiveChange={onInteractionActiveChange} />;
    }
    if (property.type === "select") {
      return <SelectProperty {...property} key={property.id} disabled={disabled} />;
    }
    if (property.type === "toggle") {
      return <ToggleProperty {...property} key={property.id} disabled={disabled} />;
    }
    return <RangeProperty {...property} key={property.id} workspace={workspace} disabled={disabled || property.disabled} onInteractionActiveChange={onInteractionActiveChange} />;
  });
}

export function SnapGridControl({
  snap,
  snapOpen,
  onSnapChange,
  onSnapOpenChange,
}: {
  snap: GridSize;
  snapOpen: boolean;
  onSnapChange: Dispatch<SetStateAction<GridSize>>;
  onSnapOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div className="snap-row">
      <span>{t("inspector.snapGrid")}</span>
      <button className="snap-select" onClick={() => onSnapOpenChange((value) => !value)}>
        {measurementOptionLabel(snap)}
        <ChevronDown size={12} fill="currentColor" />
      </button>
      {snapOpen ? (
        <div className="snap-menu">
          {GRID_SIZES.map((size) => (
            <button
              key={size}
              className={size === snap ? "selected" : ""}
              onClick={() => {
                onSnapChange(size);
                onSnapOpenChange(false);
              }}
            >
              {measurementOptionLabel(size)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
  onInteractionActiveChange,
}: RangePropertyConfig & { workspace: WorkplaneWorkspaceSettings; disabled?: boolean; onInteractionActiveChange?: (active: boolean) => void }) {
  const allowsAboveSliderMax = ["length", "width", "height", "starOuterSize", "starInnerSize", "crescentThickness", "honeycombCellSize", "honeycombWallThickness", "honeycombFrameWidth"].includes(id) || id.endsWith("Length") || id.endsWith("Width");
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
  const unit = isLength ? lengthDisplayUnit(workspace).label : null;
  const toModelValue = (nextValue: number) => isLength ? displayToMillimeters(nextValue, workspace) : nextValue;
  const commitDraft = () => {
    const next = parseMeasurementInput(draft);
    const finiteNext = Number.isFinite(next) ? next : controlValue;
    const nextModelValue = toModelValue(finiteNext);
    onChange(allowsAboveSliderMax ? Math.max(min, nextModelValue) : clamp(nextModelValue, min, max));
    setEditing(false);
    onInteractionActiveChange?.(false);
  };
  const handleSliderChange = (nextValue: number) => {
    const next = clamp(Number.isFinite(nextValue) ? nextValue : controlMin, controlMin, controlMax);
    onChange(clamp(toModelValue(next), min, max));
    setDraft(formatPropertyNumber(next, accuracy, controlStep));
  };
  return (
    <label className="range-property" style={{ "--slider-pos": `${position}%` } as CSSProperties}>
      <span className="range-property-header">
        <span className="range-property-name">{label}</span>
        <span className="range-value-control">
          <input
            type="text"
            value={editing ? draft : formatPropertyNumber(controlValue, accuracy, controlStep)}
            disabled={disabled}
            inputMode="decimal"
            onFocus={(event) => {
              onInteractionActiveChange?.(true);
              setDraft(formatPropertyNumber(controlValue, accuracy, controlStep));
              setEditing(true);
              selectWholeValue(event.currentTarget);
            }}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                setDraft(formatPropertyNumber(controlValue, accuracy, controlStep));
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
          onFocus={() => onInteractionActiveChange?.(true)}
          onBlur={() => onInteractionActiveChange?.(false)}
          onPointerDown={() => onInteractionActiveChange?.(true)}
          onPointerUp={() => onInteractionActiveChange?.(false)}
          onPointerCancel={() => onInteractionActiveChange?.(false)}
          onChange={(event) => handleSliderChange(Number(event.currentTarget.value))}
        />
      </div>
    </label>
  );
}

function TextProperty({ label, value, disabled, onChange, onInteractionActiveChange }: Omit<TextPropertyConfig, "id"> & { id?: string } & { disabled?: boolean; onInteractionActiveChange?: (active: boolean) => void }) {
  return (
    <label className="text-property">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        maxLength={24}
        spellCheck={false}
        onFocus={() => onInteractionActiveChange?.(true)}
        onBlur={() => onInteractionActiveChange?.(false)}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function SelectProperty({ label, value, options, disabled, onChange }: Omit<SelectPropertyConfig, "id"> & { id?: string } & { disabled?: boolean }) {
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
      <span>{label}</span>
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
    </label>
  );
}

function ToggleProperty({ label, value, disabled, onChange }: Omit<TogglePropertyConfig, "id" | "type"> & { disabled?: boolean }) {
  return (
    <label className="check-property">
      <input type="checkbox" checked={value} disabled={disabled} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>{label}</span>
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

/** Seitenansichten: Schraube und Stange stehen, Mutter und Loch liegen aufgeschnitten. */
function ThreadRolePreview({ role }: { role: ThreadRole }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (role === "screw") {
    return (
      <svg {...common}>
        <path d="M5 22v-5h14v5z" />
        <path d="M9.5 17V2h5v15" />
        <path d="M9.5 5l5 1.1M9.5 8.5l5 1.1M9.5 12l5 1.1" />
        <path d="M10.5 22v-5h3v5z" />
      </svg>
    );
  }
  if (role === "nut") {
    return (
      <svg {...common}>
        <path d="M12 2.2l8.5 4.9v9.8L12 21.8 3.5 16.9V7.1z" />
        <circle cx="12" cy="12" r="4.3" />
        <path d="M7.7 10.4l8.6 1M7.7 13.6l8.6 1" />
      </svg>
    );
  }
  if (role === "bore") {
    return (
      <svg {...common}>
        <path d="M3 3h18v18H3z" />
        <path d="M9 3v18M15 3v18" />
        <path d="M9 6.5l6 1.1M9 10.5l6 1.1M9 14.5l6 1.1M9 18.5l6 1.1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 2h8v20H8z" />
      <path d="M8 5l8 1.4M8 9l8 1.4M8 13l8 1.4M8 17l8 1.4" />
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
        <path d="M9 6l6 1.1M9 10l6 1.1" />
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
        <path d="M9 6l6 1.1M9 10l6 1.1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5.5 22v-6h13v6z" />
      <path d="M9 16V3h6v13" />
      <path d="M9 6l6 1.1M9 10l6 1.1" />
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
