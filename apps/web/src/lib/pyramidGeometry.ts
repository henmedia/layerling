import * as THREE from "three";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";

/** Unterhalb davon gilt die Deckflaeche als Spitze. */
export const MIN_PYRAMID_TOP = 0.05;

/**
 * Die vierseitige Pyramide steht auf ihren Ecken, nicht auf ihren Flaechen -
 * sonst waere ihre Grundflaeche eine Raute statt eines Rechtecks. Ein halber
 * Schritt Versatz bringt die Ecken auf die Kanten des Rahmens.
 */
function angleOffsetFor(sides: number) {
  return sides === 4 ? Math.PI / 4 : 0;
}

/** The turn of the base polygon, for whoever needs the middle of the base (alignCenter.ts). */
export const pyramidAngleOffset = angleOffsetFor;

export function normalizePyramidTop(value: number | undefined, base: number) {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(Math.max(0, value as number), Math.max(0, base * 4));
  return clamped < MIN_PYRAMID_TOP ? 0 : clamped;
}

/** Die Umrisspunkte eines Vielecks, das den Rahmen genau ausfuellt. */
function outline(sides: number, width: number, depth: number) {
  const count = Math.max(3, Math.round(sides));
  const offset = angleOffsetFor(count);
  const fit = regularPolygonFootprintScale(width, depth, count, offset);
  return Array.from({ length: count }, (_unused, index) => {
    const angle = (index / count) * Math.PI * 2 + offset;
    return [Math.sin(angle) * fit.x + fit.offsetX, Math.cos(angle) * fit.z + fit.offsetZ] as const;
  });
}

/** The corners of the base or the top, for the exact body (cadProfileExtrusion.ts). */
export const pyramidOutline = outline;

/**
 * Eine Pyramide mit Deckflaeche - ohne sie laeuft sie wie bisher in einer
 * Spitze zusammen. Oben und unten sind eigene Masse, damit ein Stumpf auch
 * dann moeglich ist, wenn Laenge und Breite sich unterschiedlich verjuengen.
 */
export function createPyramidGeometry(
  width: number,
  height: number,
  depth: number,
  sides = 4,
  topWidth = 0,
  topDepth = 0,
) {
  const count = Math.max(3, Math.round(sides));
  const base = outline(count, Math.max(0.01, width), Math.max(0.01, depth));
  const cappedTopWidth = normalizePyramidTop(topWidth, width);
  const cappedTopDepth = normalizePyramidTop(topDepth, depth);
  const pointed = cappedTopWidth <= 0 || cappedTopDepth <= 0;
  const top = pointed ? null : outline(count, cappedTopWidth, cappedTopDepth);

  const positions: number[] = [];
  const indices: number[] = [];
  const push = (x: number, y: number, z: number) => {
    const index = positions.length / 3;
    positions.push(x, y, z);
    return index;
  };

  const bottomRing = base.map(([x, z]) => push(x, 0, z));
  const topRing = top ? top.map(([x, z]) => push(x, height, z)) : null;
  const apex = topRing ? null : push(0, height, 0);

  // Die Umrisspunkte laufen wie bei den uebrigen Koerpern ueber Sinus und
  // Kosinus, also im Uhrzeigersinn von oben - danach richtet sich die
  // Reihenfolge der Dreiecke, damit sie nach aussen schauen.
  const bottomCentre = push(0, 0, 0);
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    indices.push(bottomCentre, bottomRing[next], bottomRing[index]);
  }

  if (topRing) {
    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count;
      indices.push(bottomRing[index], topRing[next], topRing[index]);
      indices.push(bottomRing[index], bottomRing[next], topRing[next]);
    }
    const topCentre = push(0, height, 0);
    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count;
      indices.push(topCentre, topRing[index], topRing[next]);
    }
  } else {
    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count;
      indices.push(bottomRing[index], bottomRing[next], apex as number);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry.toNonIndexed();
}
