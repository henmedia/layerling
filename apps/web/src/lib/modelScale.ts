import { SCALE_PERCENT_MAX, SCALE_PERCENT_MIN } from "@/lib/scaleByPercent";

/**
 * Scaling to a model scale such as 1:87 for H0 (forum, 3DVadda): the window works out the percentage.
 * Without a real size the model counts as built at full size (1:1), so 1:87 is 100 / 87 %. With the
 * real size of the original, say a tree 16 m tall, the model is brought to 16,000 mm / 87 along that
 * side, whatever size it has now.
 */
export type ModelScalePreset = { id: string; label: string; ratio: number };

/** The usual gauges of model railways, smallest first; G is the garden railway's 1:22.5, 16mm the narrow gauge on it. */
export const MODEL_SCALE_PRESETS: readonly ModelScalePreset[] = [
  { id: "z", label: "Z", ratio: 220 },
  { id: "n", label: "N", ratio: 160 },
  { id: "tt", label: "TT", ratio: 120 },
  { id: "h0", label: "H0", ratio: 87 },
  { id: "0", label: "0", ratio: 45 },
  { id: "1", label: "1", ratio: 32 },
  { id: "g", label: "G", ratio: 22.5 },
  // 16 mm to the foot (SM32 and SM45 run on it), 1:19.05; the name is the one the modellers use (Discussion #1732).
  { id: "16mm", label: "16mm", ratio: 19.05 },
];

export const MODEL_SCALE_RATIO_MIN = 1;
export const MODEL_SCALE_RATIO_MAX = 10_000;

/** "height": the original's height. "length": its longest side across the plate, as for a locomotive. */
export type ModelScaleAxis = "height" | "length";

/** Which side of the selection the real size stands for, in millimetres. */
export function modelScaleReference(size: { width: number; depth: number; height: number }, axis: ModelScaleAxis) {
  return axis === "height" ? size.height : Math.max(size.width, size.depth);
}

/**
 * The percentage that brings the selection to 1:ratio. `realSize` is the original's size in millimetres
 * along `axis`, or null when the model already has the original's size. NaN when nothing sensible comes out.
 */
export function modelScalePercent(
  ratio: number,
  realSize: number | null,
  size: { width: number; depth: number; height: number },
  axis: ModelScaleAxis,
) {
  if (!Number.isFinite(ratio) || ratio < MODEL_SCALE_RATIO_MIN || ratio > MODEL_SCALE_RATIO_MAX) return Number.NaN;
  if (realSize === null) return 100 / ratio;
  const now = modelScaleReference(size, axis);
  if (!Number.isFinite(realSize) || realSize <= 0 || !Number.isFinite(now) || now <= 0) return Number.NaN;
  return (realSize / ratio / now) * 100;
}

/** Whether a worked-out percentage is one the scaling takes. */
export function modelScalePercentInRange(percent: number) {
  return Number.isFinite(percent) && percent >= SCALE_PERCENT_MIN && percent <= SCALE_PERCENT_MAX;
}

/** The preset a ratio belongs to, if any. */
export function modelScalePresetFor(ratio: number) {
  return MODEL_SCALE_PRESETS.find((preset) => Math.abs(preset.ratio - ratio) < 1e-9) ?? null;
}
