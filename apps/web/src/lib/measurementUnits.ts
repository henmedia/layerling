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

const VULGAR_FRACTIONS: Record<string, number> = { "½": 1 / 2, "¼": 1 / 4, "¾": 3 / 4, "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8 };
const VULGAR_BY_EIGHTHS: Record<number, string> = { 1: "⅛", 2: "¼", 3: "⅜", 4: "½", 5: "⅝", 6: "¾", 7: "⅞" };

/**
 * Reads an inch fraction as typed or as the labels print it: "5/8", "1 5/8",
 * "1-5/8", "1⅝". Returns null for anything else so decimals take their usual path.
 */
function parseFractionInput(value: string) {
  const text = value.trim().replace(/ /g, " ");
  const vulgar = /^(-?)(?:(\d+)[\s-]*)?([½¼¾⅛⅜⅝⅞])$/.exec(text);
  if (vulgar) return (vulgar[1] ? -1 : 1) * (Number(vulgar[2] ?? 0) + VULGAR_FRACTIONS[vulgar[3]]);
  const plain = /^(-?)(?:(\d+)[\s-]+)?(\d+)\/(\d+)$/.exec(text);
  if (!plain || Number(plain[4]) === 0) return null;
  return (plain[1] ? -1 : 1) * (Number(plain[2] ?? 0) + Number(plain[3]) / Number(plain[4]));
}

/**
 * Inches as a mixed number the way Tinkercad prints them: 1.625 becomes "1⅝",
 * 0.1875 "3/16". The value is rounded to the nearest 1/64 in, so this is a
 * display format; typed decimals keep their exact value underneath.
 */
export function formatFractionalInches(inches: number) {
  const sixtyFourths = Math.round(Math.abs(inches) * 64);
  const sign = inches < 0 && sixtyFourths > 0 ? "-" : "";
  const whole = Math.floor(sixtyFourths / 64);
  let numerator = sixtyFourths % 64;
  if (numerator === 0) return `${sign}${whole}`;
  let denominator = 64;
  while (numerator % 2 === 0) {
    numerator /= 2;
    denominator /= 2;
  }
  if (denominator === 8 || denominator === 4 || denominator === 2) {
    return `${sign}${whole || ""}${VULGAR_BY_EIGHTHS[(numerator * 8) / denominator]}`;
  }
  return `${sign}${whole ? `${whole} ` : ""}${numerator}/${denominator}`;
}

/**
 * A little arithmetic in a measure field (#180): `15*3`, `120-2*4`, `(40+2)/2`, with `x`, `\u00d7`
 * and `\u00f7` too. A decimal comma counts like a point. Read by hand - no eval - and NaN for
 * anything that is not a plain sum of numbers.
 */
export function evaluateArithmetic(text: string) {
  const source = text.replace(/[\s\u00a0]/g, "").replace(/,/g, ".").replace(/[\u00d7xX]/g, "*").replace(/\u00f7/g, "/").replace(/[\u2212\u2013]/g, "-");
  let index = 0;
  const peek = () => source[index];
  const number = (): number => {
    const match = /^(\d+\.?\d*|\.\d+)/.exec(source.slice(index));
    if (!match) return Number.NaN;
    index += match[0].length;
    return Number(match[0]);
  };
  const factor = (): number => {
    if (peek() === "-") {
      index += 1;
      return -factor();
    }
    if (peek() === "+") {
      index += 1;
      return factor();
    }
    if (peek() === "(") {
      index += 1;
      const value = sum();
      if (peek() !== ")") return Number.NaN;
      index += 1;
      return value;
    }
    return number();
  };
  const product = (): number => {
    let value = factor();
    while (peek() === "*" || peek() === "/") {
      const operator = source[index];
      index += 1;
      const right = factor();
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const operator = source[index];
      index += 1;
      const right = product();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  if (!source) return Number.NaN;
  const result = sum();
  return index === source.length && Number.isFinite(result) ? result : Number.NaN;
}

/** Whether a field's text is a calculation rather than one number (a leading minus does not count). */
function looksLikeArithmetic(compact: string) {
  return /[*\u00d7\u00f7()+xX]/.test(compact) || /.[-\u2212\u2013/]/.test(compact);
}

/** Whether typed text is a calculation worth remembering (#180): arithmetic that works out, not a plain number, fraction or percentage. */
export function isArithmeticInput(text: string) {
  const compact = text.trim().replace(/[\s\u00a0]/g, "");
  if (!compact || compact.endsWith("%") || parseFractionInput(compact) !== null || !looksLikeArithmetic(compact)) return false;
  return Number.isFinite(evaluateArithmetic(compact));
}

export function parseMeasurementInput(value: string | number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  const fraction = parseFractionInput(value);
  if (fraction !== null) return fraction;
  const compact = value.trim().replace(/[\s\u00a0]/g, "");
  if (!compact) return Number.NaN;
  if (looksLikeArithmetic(compact)) return evaluateArithmetic(compact);

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

// Unit that the labels on the workplane are shown and typed in. The overlay
// code is spread over plain functions, so the current setting lives here
// instead of being passed through every one of them; the editor updates it
// whenever the workspace settings change.
let lengthUnit: Pick<WorkplaneWorkspaceSettings, "units" | "scale"> & { inchFormat?: WorkplaneWorkspaceSettings["inchFormat"] } = { units: "Metric (Default)", scale: "1:1 (millimeters)" };

export function setLengthUnit(workspace: Pick<WorkplaneWorkspaceSettings, "units" | "scale"> & { inchFormat?: WorkplaneWorkspaceSettings["inchFormat"] }) {
  lengthUnit = { units: workspace.units, scale: workspace.scale, inchFormat: workspace.inchFormat };
}

/** Whether inches read as fractions: the default, unless the workspace asks for decimals. */
export function showsInchFractions(workspace: { inchFormat?: WorkplaneWorkspaceSettings["inchFormat"] }) {
  return workspace.inchFormat !== "decimal";
}

/** Millimetres printed in the workspace unit; inches as fractions (1⅝) like Tinkercad, or as decimals. */
export function formatLengthMm(value: number, accuracy: number) {
  const zeroThreshold = 0.5 * 10 ** -accuracy;
  const shown = millimetersToDisplay(value, lengthUnit);
  const normalized = Math.abs(shown) < zeroThreshold ? 0 : shown;
  if (lengthDisplayUnit(lengthUnit).label === "in" && showsInchFractions(lengthUnit)) return formatFractionalInches(normalized);
  return normalized.toFixed(accuracy);
}

/** What the user types is in the workspace unit; the result is millimetres. */
export function parseLengthMm(raw: string | number) {
  return displayToMillimeters(parseMeasurementInput(raw), lengthUnit);
}

/** A trailing percent scales the current value (millimetres), anything else is a distance. */
export function resolveLengthMm(raw: string | number, currentMm: number) {
  if (typeof raw === "string" && raw.trim().endsWith("%")) return resolveMeasurementInput(raw, currentMm);
  return parseLengthMm(raw);
}
