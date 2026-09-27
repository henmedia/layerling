import { t, type MessageKey } from "@/lib/i18n";
import type { MeasurementAccuracy, WorkplaneWorkspaceSettings } from "@/types/layerling";

const MILLIMETERS_PER_INCH = 25.4;
const MILLIMETERS_PER_FOOT = 304.8;
const MILLIMETERS_PER_STUD = 8;

type WorkspaceScaleOption = {
  label: string;
  displayLabel: string;
  millimetersPerDisplayUnit: number;
};

const METRIC_SCALE_OPTIONS: WorkspaceScaleOption[] = [
  { label: "1:1 (millimeters)", displayLabel: "mm", millimetersPerDisplayUnit: 1 },
  { label: "1:10 (centimeters)", displayLabel: "cm", millimetersPerDisplayUnit: 10 },
  { label: "1:1000 (meters)", displayLabel: "m", millimetersPerDisplayUnit: 1000 },
];

const IMPERIAL_SCALE_OPTIONS: WorkspaceScaleOption[] = [
  { label: "1:1 (inches)", displayLabel: "in", millimetersPerDisplayUnit: MILLIMETERS_PER_INCH },
  { label: "1:1 (feet)", displayLabel: "ft", millimetersPerDisplayUnit: MILLIMETERS_PER_FOOT },
];

const BRICK_SCALE_OPTIONS: WorkspaceScaleOption[] = [
  { label: "1:1 (studs)", displayLabel: "stud", millimetersPerDisplayUnit: MILLIMETERS_PER_STUD },
];

export const WORKSPACE_UNIT_OPTIONS = ["Metric (Default)", "Imperial", "Bricks"] as const;

export type LengthDisplayUnit = {
  label: string;
  millimetersPerUnit: number;
};

function scaleEntriesForUnits(units: string) {
  if (units === "Imperial") return IMPERIAL_SCALE_OPTIONS;
  if (units === "Bricks") return BRICK_SCALE_OPTIONS;
  return METRIC_SCALE_OPTIONS;
}

export function scaleOptionsForUnits(units: string) {
  return scaleEntriesForUnits(units).map((option) => option.label);
}

export function defaultScaleForUnits(units: string) {
  return scaleEntriesForUnits(units)[0].label;
}

export function normalizeScaleForUnits(units: string, scale: string) {
  const options = scaleEntriesForUnits(units);
  const normalizedScale = units !== "Imperial" && units !== "Bricks" && scale === "1:100 (meters)" ? "1:1000 (meters)" : scale;
  return options.some((option) => option.label === normalizedScale) ? normalizedScale : options[0].label;
}

function scaleEntryForWorkspace(workspace: Pick<WorkplaneWorkspaceSettings, "units" | "scale">) {
  const options = scaleEntriesForUnits(workspace.units);
  const normalizedScale = normalizeScaleForUnits(workspace.units, workspace.scale);
  return options.find((option) => option.label === normalizedScale) ?? options[0];
}

export function lengthDisplayUnit(workspace: Pick<WorkplaneWorkspaceSettings, "units" | "scale">): LengthDisplayUnit {
  const scale = scaleEntryForWorkspace(workspace);
  return { label: scale.displayLabel, millimetersPerUnit: scale.millimetersPerDisplayUnit };
}

export function millimetersToDisplay(value: number, workspace: Pick<WorkplaneWorkspaceSettings, "units" | "scale">) {
  return value / lengthDisplayUnit(workspace).millimetersPerUnit;
}

export function displayToMillimeters(value: number, workspace: Pick<WorkplaneWorkspaceSettings, "units" | "scale">) {
  return value * lengthDisplayUnit(workspace).millimetersPerUnit;
}

export function displayStepFromMillimeters(step: number, workspace: Pick<WorkplaneWorkspaceSettings, "units" | "scale">) {
  return step / lengthDisplayUnit(workspace).millimetersPerUnit;
}

export function parseMeasurementInput(value: string | number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  const compact = value.trim().replace(/[\s\u00a0]/g, "");
  if (!compact) return Number.NaN;

  const commaIndex = compact.lastIndexOf(",");
  const dotIndex = compact.lastIndexOf(".");
  let normalized = compact;
  if (commaIndex >= 0 && dotIndex >= 0) {
    normalized = commaIndex > dotIndex
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "");
  } else if (commaIndex >= 0) {
    normalized = compact.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * A trailing percent scales the field's current value. `50%` of 200 is 100.
 * Anything else is an absolute measurement in the field's own units.
 */
export function resolveMeasurementInput(raw: string | number, current: number) {
  if (typeof raw !== "string") return parseMeasurementInput(raw);
  const compact = raw.trim().replace(/[\s\u00a0]/g, "");
  if (!compact.endsWith("%")) return parseMeasurementInput(raw);
  const percent = parseMeasurementInput(compact.slice(0, -1));
  if (!Number.isFinite(percent) || !Number.isFinite(current)) return Number.NaN;
  return current * (percent / 100);
}

export function formatMeasurementNumber(value: number, accuracy: MeasurementAccuracy, _step?: number) {
  let decimals = accuracy;
  while (decimals < 6 && value !== 0 && Math.abs(value) < 0.5 * 10 ** -decimals) {
    decimals += 1;
  }
  const zeroThreshold = 0.5 * 10 ** -decimals;
  return (Math.abs(value) < zeroThreshold ? 0 : value).toFixed(decimals);
}

/**
 * Unit and scale names are stored in the project and compared by value, so the
 * English wording stays put. These map a stored value to what a person reads.
 */
const OPTION_LABEL_KEYS: Record<string, MessageKey> = {
  "Metric (Default)": "units.metric",
  Imperial: "units.imperial",
  Bricks: "units.bricks",
  "1:1 (millimeters)": "scale.millimeters",
  "1:10 (centimeters)": "scale.centimeters",
  "1:1000 (meters)": "scale.meters",
  "1:1 (inches)": "scale.inches",
  "1:1 (feet)": "scale.feet",
  "1:1 (studs)": "scale.studs",
  Off: "grid.off",
  Brick: "grid.brick",
};

export function measurementOptionLabel(option: string): string {
  const key = OPTION_LABEL_KEYS[option];
  return key ? t(key) : option;
}
