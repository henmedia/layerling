import { t, translate } from "@/lib/i18n";
import type { Language } from "@/lib/languages";
import type { HistoryStepDescription, HistoryStepDetail } from "@/lib/historyStepDescription";
import { currentLengthUnitLabel, formatLengthMm } from "@/lib/measurementUnits";

/*
 * A step of the history as one line (#1023): its sentence and, where it set a measure, that measure in
 * brackets - "Rounded the edges of Box (5 mm)". The undo and redo buttons, their messages and the
 * History view all read it this way.
 */

/** A decimal without the zeros a fixed accuracy pads it with: 5.00 is 5, 2.50 is 2.5; inch fractions stay. */
function trimmed(value: string) {
  return /^-?\d+\.\d+$/.test(value) ? value.replace(/\.?0+$/, "") : value;
}

/** The measure in the workspace's unit, or in millimetres with `millimetres` (for the AI tools). */
export function historyStepDetailText(detail: HistoryStepDetail, accuracy: number, millimetres = false): string {
  const length = (mm: number) => (millimetres ? trimmed(mm.toFixed(accuracy)) : trimmed(formatLengthMm(mm, accuracy)));
  const unit = millimetres ? "mm" : currentLengthUnitLabel();
  if (detail.kind === "angle") return `${trimmed(detail.degrees.toFixed(Math.min(accuracy, 2)))}°`;
  if (detail.kind === "length") return `${length(detail.mm)} ${unit}`;
  return `${detail.mm.map(length).join(" × ")} ${unit}`;
}

/** The step in the interface's language, with its measure. */
export function historyStepText(step: HistoryStepDescription, accuracy: number): string {
  const sentence = t(step.key, step.values);
  return step.detail ? `${sentence} (${historyStepDetailText(step.detail, accuracy)})` : sentence;
}

/** The step in one language with its measure in millimetres, as AI tools read it. */
export function historyStepTextIn(language: Language, step: HistoryStepDescription): string {
  const sentence = translate(language, step.key, step.values);
  return step.detail ? `${sentence} (${historyStepDetailText(step.detail, 2, true)})` : sentence;
}
