import * as THREE from "three";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";

/**
 * Der Mehrkant ist die Pyramide ohne Spitze: ein Vieleck, das ueber die Hoehe
 * gleich bleibt. Der Zylinder ist derselbe Koerper mit vielen Seiten und
 * benutzt denselben Bau - sonst haetten zwei Formen mit gleicher Seitenzahl
 * verschiedene Masse.
 *
 * Die Passung stammt aus derselben Hilfsfunktion, die schon die Pyramide in
 * ihren Rahmen setzt: ein Sechskant misst ueber die Ecken mehr als ueber die
 * Flaechen, und ohne diese Korrektur nennt das Feld einen Wert, den der
 * Koerper gar nicht hat.
 */
export function createPrismGeometry(width: number, height: number, depth: number, sides = 6, segments = 1, drillPoint = 0) {
  const count = Math.max(3, Math.round(sides));
  const footprintScale = regularPolygonFootprintScale(width, depth, count);
  const geometry = new THREE.CylinderGeometry(1, 1, height, count, Math.max(1, Math.round(segments)));
  if (drillPoint > 0) {
    // A drilled hole (Discussion #621, drillPoint.ts): the middle of the bottom cap goes down by the tip's length,
    // so the cap becomes the cone, corner for corner on the same outline. The height stays to the shoulder.
    // The corners are 32-bit floats: the bottom is found to a millionth of the height, far from the top.
    const position = geometry.getAttribute("position");
    const tolerance = Math.max(1, height) * 1e-6;
    for (let index = 0; index < position.count; index += 1) {
      const onAxis = position.getX(index) === 0 && position.getZ(index) === 0;
      if (onAxis && Math.abs(position.getY(index) + height / 2) < tolerance) position.setY(index, -height / 2 - drillPoint);
    }
    position.needsUpdate = true;
  }
  geometry.scale(footprintScale.x, 1, footprintScale.z);
  geometry.translate(footprintScale.offsetX, height / 2, footprintScale.offsetZ);
  // The tip lies below the bottom: nothing may set the body down on it.
  if (drillPoint > 0) geometry.userData.keepsItsHeight = true;
  return geometry;
}
