import { isArithmeticInput, parseMeasurementInput } from "@/lib/measurementUnits";

/**
 * A calculation typed into a number field stays with the body (#180): "(140+2)/2" under
 * `width`. Entering the field shows the formula again instead of the number, so it can be
 * changed in place - as long as the value still equals it. No variables, no solver: a value
 * changed any other way (a handle dragged, the body scaled, other units) simply shows the
 * number again, and the formula is dropped the next time the field is set.
 */
export type FieldFormulas = Record<string, string>;

/** The longest text a field remembers; anything longer is a value, not a formula to come back to. */
export const MAX_FIELD_FORMULA_LENGTH = 80;

/** The text to remember for a field set from `text`: the calculation, or nothing for a plain number or a percentage. */
export function formulaToRemember(text: string): string | null {
  const trimmed = text.trim();
  return trimmed.length <= MAX_FIELD_FORMULA_LENGTH && isArithmeticInput(trimmed) ? trimmed : null;
}

/** Whether a remembered formula still gives the field's value (in the field's own units), so it is worth showing again. */
export function formulaMatchesValue(formula: string | undefined, value: number) {
  if (!formula) return false;
  const result = parseMeasurementInput(formula);
  return Number.isFinite(result) && Math.abs(result - value) <= 1e-6 * Math.max(1, Math.abs(value));
}

/** The body's formulas with one field's set or cleared; undefined once none is left, so a body without formulas stays as it was. */
export function withFieldFormula(formulas: FieldFormulas | undefined, id: string, text: string | null): FieldFormulas | undefined {
  const next: FieldFormulas = { ...(formulas ?? {}) };
  if (text) next[id] = text;
  else delete next[id];
  return Object.keys(next).length ? next : undefined;
}

/** Whether two bodies remember the same formulas. */
export function fieldFormulasEqual(a: FieldFormulas | undefined, b: FieldFormulas | undefined) {
  if (a === b) return true;
  const keysA = Object.keys(a ?? {});
  const keysB = Object.keys(b ?? {});
  return keysA.length === keysB.length && keysA.every((key) => a?.[key] === b?.[key]);
}

/**
 * The inspector field each dimension box on the work area stands for, so a calculation typed
 * into a box (#180) comes back in the same field of the Properties panel and the other way round.
 */
export const DIMENSION_FORMULA_FIELDS = { width: "width", depth: "length", height: "height", elevation: "positionZ" } as const;

/** Whether a remembered formula still gives `valueMm`, read in the editor's current unit. */
export function formulaMatchesMillimeters(formula: string | undefined, valueMm: number, parse: (text: string) => number) {
  if (!formula) return false;
  const result = parse(formula);
  return Number.isFinite(result) && Math.abs(result - valueMm) <= 1e-6 * Math.max(1, Math.abs(valueMm));
}
