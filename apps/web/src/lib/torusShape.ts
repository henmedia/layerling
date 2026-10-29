import type { WorkplaneShape } from "@/types/layerling";

/**
 * Der Wulst eines Torus, von oben gesehen, als Anteil am Aussenmass (#981).
 * Frueher war die Hoehe zugleich die Wulstdicke: Ein Torus von 10 mm, auf 5 mm
 * Hoehe gestellt, bekam einen Wulst von 5 mm, und das Loch schloss sich. Jetzt
 * staucht oder streckt die Hoehe den Wulst nur noch, und das Loch bleibt.
 *
 * Gespeichert ist ein Anteil, keine Millimeter, damit Ziehen an den Griffen,
 * Skalieren und jedes Breitenfeld den Wulst mitnehmen, wie bei jeder anderen
 * Form. Bei 0,5 ist das Loch gerade zu.
 */
export const TORUS_MAX_TUBE_RATIO = 0.5;
export const TORUS_MIN_TUBE_RATIO = 0.01;

/** Ohne eigenen Wert war der Wulst so dick wie die Form hoch - so sieht ein alter Entwurf unveraendert aus. */
export function torusTubeRatio(shape: Pick<WorkplaneShape, "width" | "depth" | "height" | "torusTubeRatio"> & { size?: number }) {
  if (typeof shape.torusTubeRatio === "number" && Number.isFinite(shape.torusTubeRatio) && shape.torusTubeRatio > 0) {
    return shape.torusTubeRatio;
  }
  const outer = Math.min(shape.width ?? shape.size ?? 0, shape.depth ?? shape.size ?? 0);
  return outer > 0 && shape.height > 0 ? shape.height / outer : 0.2;
}

/** Wulstdicke in Millimetern, wie der Inspektor sie zeigt. */
export function torusTubeThickness(width: number, depth: number, ratio: number) {
  return ratio * Math.min(width, depth);
}

/**
 * Die Masse, aus denen der Torus gezeichnet wird: ein runder Wulst mit
 * `tubeRadius` um den Ring `majorRadius`, danach waagerecht auf Breite und
 * Tiefe und senkrecht mit `verticalScale` auf die Hoehe gebracht.
 */
export function torusRadii(width: number, depth: number, height: number, ratio: number) {
  const tubeRadius = Math.max(0.1, torusTubeThickness(width, depth, ratio) / 2);
  const majorRadius = Math.max(0.2, Math.min(width, depth) / 2 - tubeRadius);
  return {
    tubeRadius,
    majorRadius,
    outerDiameter: (majorRadius + tubeRadius) * 2,
    verticalScale: height / (tubeRadius * 2),
  };
}
