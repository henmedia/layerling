import type { WorkplaneShape } from "@/types/layerling";

/**
 * Der Wulst eines Torus, von oben gesehen, als Anteil am Aussenmass (#981).
 * Frueher war die Hoehe zugleich die Wulstdicke: Ein Torus von 10 mm, auf 5 mm
 * Hoehe gestellt, bekam einen Wulst von 5 mm, und das Loch schloss sich. Jetzt
 * staucht oder streckt die Hoehe den Wulst nur noch, und das Loch bleibt.
 *
 * Gespeichert ist ein Anteil, keine Millimeter, damit Ziehen an den Griffen,
 * Skalieren und jedes Breitenfeld den Wulst mitnehmen, wie bei jeder anderen
 * Form. Bei 0,5 ist das Loch gerade zu; darueber ist der Wulst breiter als der
 * Ring, und statt des Lochs bleibt oben und unten eine Mulde (Spindeltorus, #2187).
 * Bei 1 ist der Ring weg und der Torus eine Kugel.
 */
export const TORUS_MAX_TUBE_RATIO = 1;
/** Ab hier ist der Wulst breiter als der Ring. */
export const TORUS_CLOSED_TUBE_RATIO = 0.5;
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
  const majorRadius = Math.max(0, Math.min(width, depth) / 2 - tubeRadius);
  return {
    tubeRadius,
    majorRadius,
    outerDiameter: (majorRadius + tubeRadius) * 2,
    verticalScale: height / (tubeRadius * 2),
  };
}

/**
 * Der Schnitt durch den Wulst, von unten ueber aussen nach oben, als Punkte (Abstand zur Achse, Hoehe):
 * ein ganzer Kreis um den Ring, oder bei einem Wulst breiter als der Ring nur der Bogen ausserhalb der
 * Achse, der dort oben und unten endet (#2187). `steps` Stufen kaemen auf den ganzen Kreis.
 */
export function torusSectionPoints(majorRadius: number, tubeRadius: number, steps: number) {
  if (majorRadius >= tubeRadius) return null;
  // Der Winkel, an dem der Kreis die Achse schneidet: cos = -R / r. Oben und unten (+-90 Grad) liegt immer ein
  // Punkt, damit der Torus genau so hoch ist, wie er sein soll.
  const end = Math.acos(Math.max(-1, Math.min(1, -majorRadius / tubeRadius)));
  const marks = [-end, -Math.PI / 2, Math.PI / 2, end];
  const angles: number[] = [-end];
  for (let span = 0; span < 3; span += 1) {
    const from = marks[span];
    const to = marks[span + 1];
    // Ohne Ring (eine Kugel) liegen die Enden schon oben und unten.
    if (to - from < 1e-12) continue;
    const count = Math.max(1, Math.ceil((steps * (to - from)) / (2 * Math.PI)));
    for (let index = 1; index <= count; index += 1) angles.push(from + ((to - from) * index) / count);
  }
  const points: Array<{ r: number; y: number }> = angles.map((angle, index) => ({
    r: index === 0 || index === angles.length - 1 ? 0 : Math.max(0, majorRadius + tubeRadius * Math.cos(angle)),
    y: tubeRadius * Math.sin(angle),
  }));
  return points;
}
