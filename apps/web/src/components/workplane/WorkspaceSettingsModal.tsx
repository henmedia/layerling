"use client";

import { Box as BoxIcon, ChevronDown, Grid3X3, History, Palette, RotateCcw, Ruler, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { APP_THEME_OPTIONS, type AppThemePreference } from "@/lib/appTheme";
import { gearCenterHoleLimits, gearToothPitch } from "@/lib/gearGeometry";
import { automaticSideCount } from "@/lib/roundSideCount";
import {
  DEFAULT_THREAD_CLEARANCE,
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
  DEFAULT_SPRING_WIRE,
  MAX_SPRING_QUALITY,
  MIN_SPRING_QUALITY,
  springTurnLimits,
  springWireLimits,
} from "@/lib/springGeometry";
import { t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { measurementOptionLabel, normalizeScaleForUnits, parseMeasurementInput, scaleOptionsForUnits, WORKSPACE_UNIT_OPTIONS } from "@/lib/measurementUnits";
import { shapeAssetDefaultDimensions, shapeAssetLabel, shapeAssetSpecialDefaults, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_WORKPLANE_WORKSPACE, MAX_CUSTOM_SHAPE_DIMENSION, MAX_HIGH_RESOLUTION_SIDES, MIN_CUSTOM_SHAPE_DIMENSION } from "@/lib/workplaneSettings";
import type { GearType, GridSize, ShapeCustomization, ShapeKind, ThreadHand, ThreadHead, ThreadProfile, ThreadRole, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { selectWholeValue } from "@/lib/numberField";

type WorkspaceSettings = WorkplaneWorkspaceSettings;
type WorkspaceSettingsSection = "appearance" | "measurement" | "workplane" | "shapes" | "history";

const GRID_SIZES: GridSize[] = ["Off", "0.1 mm", "0.25 mm", "0.5 mm", "1.0 mm", "2.0 mm", "5.0 mm", "Brick"];
const MIN_WORKSPACE_SIZE = 60;
const MAX_WORKSPACE_SIZE = 2000;
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
const GRID_BLOCK_PRESETS = ["1 mm", "2.5 mm", "5 mm", "10 mm", "20 mm", "50 mm", "100 mm", "Custom"] as const;
/** Nur die freie Wahl wird uebersetzt; Masse bleiben Masse. */
const THEME_LABEL_KEYS: Record<AppThemePreference, MessageKey> = {
  system: "workspace.themeSystem",
  light: "workspace.themeLight",
  dark: "workspace.themeDark",
};

function gridBlockPresetLabel(preset: string) {
  return preset === "Custom" ? t("workspace.custom") : preset;
}
const HISTORY_LIMIT_OPTIONS = [30, 50, 100, "unlimited", "custom"] as const;
const HISTORY_CUSTOM_DEFAULT = 250;
const TEXT_FONT_OPTIONS = ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", "Stencil"];
const GEAR_TYPE_OPTIONS: Array<{ value: GearType; label: string }> = [
  { value: "spur", label: "Spur gear" },
  { value: "helical", label: "Helical gear" },
  { value: "bevel", label: "Bevel gear" },
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
];

type ShapeSpecialNumberKey = "steps" | "sides" | "bevel" | "segments" | "topRadius" | "baseRadius" | "teeth" | "toothSize" | "toothWidth" | "centerHoleSize" | "helixAngle" | "helixQuality" | "threadDiameter" | "threadPitch" | "threadClearance" | "threadQuality" | "threadChamfer" | "threadHeadChamfer" | "springTurns" | "springWire" | "springQuality" | "topWidth" | "topDepth";
type ShapeSpecialField =
  | { type: "number"; key: ShapeSpecialNumberKey; label: string; defaultValue: number; min: number; max: number; step?: number; unit?: string }
  | { type: "select"; key: "font" | "gearType" | "threadRole" | "threadHead" | "threadHand" | "threadProfile"; label: string; defaultValue: string; options: Array<{ value: string; label: string }> }
  | { type: "text"; key: "text"; label: string; defaultValue: string; maxLength: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gridBlockSizeForPreset(preset: string, fallback: number) {
  if (preset === "Custom") {
    return clamp(fallback, MIN_GRID_BLOCK_SIZE, MAX_GRID_BLOCK_SIZE);
  }
  return clamp(Number.parseFloat(preset) || DEFAULT_WORKPLANE_WORKSPACE.gridBlockSize, MIN_GRID_BLOCK_SIZE, MAX_GRID_BLOCK_SIZE);
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
  if (kind === "cylinder" || kind === "ellipse") {
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
  if (kind === "sphere" || kind === "halfSphere") return [{ type: "number", key: "steps", label: t("prop.steps"), defaultValue: defaults.steps ?? 24, min: 6, max: 64, step: 1 }];
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
    const across = Math.max(dimensions.width, dimensions.depth);
    const wireLimits = springWireLimits(across, dimensions.height);
    const turnLimits = springTurnLimits(across, dimensions.height, customization.springWire ?? defaults.springWire);
    return [
      { type: "number", key: "springTurns", label: t("prop.turns"), defaultValue: defaults.springTurns ?? DEFAULT_SPRING_TURNS, min: turnLimits.min, max: turnLimits.max, step: 1 },
      { type: "number", key: "springWire", label: t("prop.wire"), defaultValue: defaults.springWire ?? DEFAULT_SPRING_WIRE, min: wireLimits.min, max: wireLimits.max, unit: "mm" },
      { type: "number", key: "springQuality", label: t("prop.quality"), defaultValue: defaults.springQuality ?? DEFAULT_SPRING_QUALITY, min: MIN_SPRING_QUALITY, max: MAX_SPRING_QUALITY, step: 4 },
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
      { type: "number", key: "threadChamfer", label: t("prop.chamfer"), defaultValue: defaults.threadChamfer ?? defaultThreadChamfer(defaults.threadPitch ?? DEFAULT_THREAD_PITCH, defaults.threadProfile ?? DEFAULT_THREAD_PROFILE, defaults.threadRole ?? DEFAULT_THREAD_ROLE), min: 0, max: 40, unit: "mm" },
      { type: "number", key: "threadQuality", label: t("prop.quality"), defaultValue: defaults.threadQuality ?? DEFAULT_THREAD_QUALITY, min: MIN_THREAD_QUALITY, max: MAX_THREAD_QUALITY, step: 6 },
    );
    return fields;
  }
  if (kind === "gear") {
    const teeth = customization.teeth ?? defaults.teeth ?? 12;
    const toothSize = customization.toothSize ?? defaults.toothSize ?? 2.5;
    const toothPitch = gearToothPitch(dimensions.width, dimensions.depth, teeth);
    const centerHoleLimits = gearCenterHoleLimits(dimensions.width, dimensions.depth, toothSize);
    const gearType = customization.gearType ?? defaults.gearType ?? "spur";
    const fields: ShapeSpecialField[] = [
      { type: "select", key: "gearType", label: t("inspector.gearType"), defaultValue: defaults.gearType ?? "spur", options: GEAR_TYPE_OPTIONS },
      { type: "number", key: "teeth", label: t("prop.teeth"), defaultValue: defaults.teeth ?? 12, min: 6, max: 64, step: 1 },
      { type: "number", key: "toothSize", label: t("prop.toothSize"), defaultValue: defaults.toothSize ?? 2.5, min: 0.2, max: Math.max(0.2, Math.min(dimensions.width, dimensions.depth) * 0.22), unit: "mm" },
      { type: "number", key: "toothWidth", label: t("prop.toothWidth"), defaultValue: defaults.toothWidth ?? toothPitch * 0.54, min: toothPitch * 0.12, max: toothPitch * 0.82, unit: "mm" },
      { type: "number", key: "centerHoleSize", label: t("prop.centerHole"), defaultValue: defaults.centerHoleSize ?? 6, min: centerHoleLimits.min, max: centerHoleLimits.max, unit: "mm" },
    ];
    if (gearType === "helical") {
      fields.push(
        { type: "number", key: "helixAngle", label: t("prop.helixAngle"), defaultValue: defaults.helixAngle ?? 22.5, min: -45, max: 45, unit: "°" },
        { type: "number", key: "helixQuality", label: t("prop.helixQuality"), defaultValue: defaults.helixQuality ?? 16, min: 4, max: 32, step: 1 },
      );
    }
    return fields;
  }
  return [];
}

export function WorkspaceSettingsModal({
  workspace,
  snap,
  themePreference,
  moveDimensionsEnabled,
  originDimensionsEnabled,
  showProjectNameInToolbar,
  onWorkspaceChange,
  onSnapChange,
  onThemePreferenceChange,
  onMoveDimensionsEnabledChange,
  onOriginDimensionsEnabledChange,
  onShowProjectNameInToolbarChange,
  onMakeDefault,
  onClose,
}: {
  workspace: WorkspaceSettings;
  snap: GridSize;
  themePreference: AppThemePreference;
  moveDimensionsEnabled: boolean;
  originDimensionsEnabled: boolean;
  showProjectNameInToolbar: boolean;
  onWorkspaceChange: (next: WorkspaceSettings) => void;
  onSnapChange: (next: GridSize) => void;
  onThemePreferenceChange?: (preference: AppThemePreference) => void;
  onMoveDimensionsEnabledChange: (enabled: boolean) => void;
  onOriginDimensionsEnabledChange: (enabled: boolean) => void;
  onShowProjectNameInToolbarChange?: (show: boolean) => void;
  onMakeDefault: () => void;
  onClose: () => void;
}) {
  const [defaultSaved, setDefaultSaved] = useState(false);
  useLanguage();
  const [activeSection, setActiveSection] = useState<WorkspaceSettingsSection>("appearance");
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
  const scaleOptions = scaleOptionsForUnits(workspace.units);
  const scaleValue = normalizeScaleForUnits(workspace.units, workspace.scale);
  const gridColor = /^#[0-9a-f]{6}$/i.test(workspace.gridColor)
    ? workspace.gridColor
    : DEFAULT_WORKPLANE_WORKSPACE.gridColor;
  const selectedShapeAsset = toolbarShapeAssets.find((asset) => asset.kind === selectedShapeKind) ?? toolbarShapeAssets[0];
  const selectedShapeAppDefaults = shapeAssetDefaultDimensions(selectedShapeKind);
  const selectedShapeCustomization = workspace.shapeCustomizations[selectedShapeKind] ?? {};
  const selectedShapeEffectiveDimensions = {
    width: selectedShapeCustomization.width ?? selectedShapeAppDefaults.width,
    depth: selectedShapeCustomization.depth ?? selectedShapeAppDefaults.depth,
    height: selectedShapeCustomization.height ?? selectedShapeAppDefaults.height,
  };
  const selectedShapeSpecialFields = specialFieldsForShape(selectedShapeKind, selectedShapeEffectiveDimensions, selectedShapeCustomization);
  // Breite und Tiefe eines Gewindes folgen dem Durchmesser; nur die Hoehe
  // laesst sich sinnvoll vorgeben. Ein Zylinder ist immer kreisrund, daher
  // nur ein Durchmesser- (= Breiten-)Feld statt Breite und Tiefe getrennt.
  const selectedShapeDimensionKeys: Array<"width" | "depth" | "height"> = selectedShapeKind === "thread"
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
    patchWorkspace({ [key]: next, sizePreset: "Custom" } as Partial<WorkspaceSettings>);
  };
  const setWorkspaceSizePreset = (sizePreset: string) => {
    const preset = WORKSPACE_SIZE_PRESETS.find((entry) => entry.label === sizePreset);
    if (!preset || sizePreset === "Custom") {
      patchWorkspace({ sizePreset: "Custom" });
      return;
    }
    patchWorkspace({ sizePreset, width: preset.width, depth: preset.depth });
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
  const setCustomHistoryLimit = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    const next = Number.isFinite(parsed) ? Math.round(clamp(parsed, 1, 5000)) : HISTORY_CUSTOM_DEFAULT;
    setCustomHistoryDraft(String(next));
    patchWorkspace({ historyLimit: next });
  };

  return (
    <div className="workspace-modal" role="dialog" aria-modal="true" aria-label={t("workspace.title")}>
      <div className="workspace-modal-card" onPointerDown={(event) => event.stopPropagation()}>
        <header className="workspace-modal-header">
          <strong>{t("workspace.title")}</strong>
          <button aria-label={t("workspace.close")} onClick={onClose}>
            <X size={18} />
          </button>
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
            <button className={activeSection === "history" ? "active" : ""} aria-current={activeSection === "history" ? "page" : undefined} onClick={() => setActiveSection("history")}>
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
                  <label className="workspace-select">
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
                  <p className="workspace-global-note">{t("workspace.themeNote")}</p>
                  <WorkspaceToggle
                    label={t("workspace.showProjectName")}
                    checked={showProjectNameInToolbar}
                    onChange={(show) => onShowProjectNameInToolbarChange?.(show)}
                  />
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
                    label={t("workspace.selectBeforeMoving")}
                    checked={workspace.selectBeforeMove}
                    onChange={(selectBeforeMove) => patchWorkspace({ selectBeforeMove })}
                  />
                  <WorkspaceToggle label={t("workspace.showShadows")} checked={workspace.showShadows} onChange={(showShadows) => patchWorkspace({ showShadows })} />
                  <WorkspaceToggle
                    label={t("workspace.cruise")}
                    checked={workspace.cruiseShapes}
                    onChange={(cruiseShapes) => patchWorkspace({ cruiseShapes })}
                  />
                  <label className="workspace-range">
                    <span>{t("workspace.zoomSpeed")}</span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={workspace.zoomSpeed}
                      onChange={(event) => patchWorkspace({ zoomSpeed: Number(event.currentTarget.value) })}
                    />
                    <small>
                      <span>{t("workspace.slow")}</span>
                      <span>{t("workspace.fast")}</span>
                    </small>
                  </label>
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
                    onChange={(units) => patchWorkspace({ units })}
                  />
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
                    options={GRID_SIZES}
                    optionLabel={measurementOptionLabel}
                    onChange={(next) => {
                      setDefaultSaved(false);
                      onSnapChange(next as GridSize);
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
                  <WorkspaceSelect
                    label={t("workspace.size")}
                    value={workspace.sizePreset}
                    options={WORKSPACE_SIZE_PRESETS.map((preset) => preset.label)}
                    onChange={setWorkspaceSizePreset}
                  />
                  <div className="workspace-dimensions">
                    <label>
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
                    <label>
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
                  <WorkspaceSelect label={t("workspace.gridBlockSize")} value={workspace.gridBlockPreset} options={GRID_BLOCK_PRESETS}
                    optionLabel={gridBlockPresetLabel} onChange={setGridBlockPreset} />
                  <GridColorControl color={gridColor} onChange={(nextGridColor) => patchWorkspace({ gridColor: nextGridColor })} />
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
                        <label key={`${selectedShapeKind}-${key}`}>
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
                                <label key={`${selectedShapeKind}-${field.key}`}>
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
                                <label key={`${selectedShapeKind}-${field.key}`}>
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
                              <label key={`${selectedShapeKind}-${field.key}`}>
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
                    <label className="workspace-shape-limit">
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
              <span>{t("workspace.footerHint")}</span>
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

function GridColorControl({ color, onChange }: { color: string; onChange: (color: string) => void }) {
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

  const commitDraftColor = () => {
    onChange(draftColorRef.current);
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
        setOpen(false);
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
        aria-label={t("workspace.gridColor")}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}
      >
        <div onPointerDownCapture={armPickerCommit}>
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
        <div className="workspace-color-presets" aria-label={t("aria.gridColorPresets")}>
          {GRID_COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              className={preset.toLowerCase() === draftColor.toLowerCase() ? "selected" : ""}
              type="button"
              aria-label={t("aria.useGridColor", { color: preset })}
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
          <label>
            <span>HEX</span>
            <HexColorInput
              color={draftColor}
              onChange={previewColor}
              onBlur={commitDraftColor}
              prefixed
              aria-label={t("aria.gridColorHex")}
            />
          </label>
          <button
            className="workspace-color-reset"
            type="button"
            title={t("aria.resetGridColor")}
            aria-label={t("aria.resetGridColor")}
            onClick={() => {
              previewColor(DEFAULT_WORKPLANE_WORKSPACE.gridColor);
              onChange(DEFAULT_WORKPLANE_WORKSPACE.gridColor);
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
      <span>{t("workspace.gridColor")}</span>
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
          type="button"
          aria-label={t("aria.gridColorValue", { color })}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            if (!open) {
              previewColor(color);
            }
            setOpen((current) => !current);
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

function WorkspaceToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="workspace-toggle">
      <span className="workspace-toggle-copy">
        <span>{label}</span>
        {description ? <small>{description}</small> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
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
    <label className="workspace-select">
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
