export type RegularPolygonFootprintScale = {
  x: number;
  z: number;
  offsetX: number;
  offsetZ: number;
};

export type RegularPolygonBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

function regularPolygonBounds(sides: number, angleOffset = 0): RegularPolygonBounds {
  const count = Math.max(3, Math.round(sides));
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + angleOffset;
    const x = Math.sin(angle);
    const z = Math.cos(angle);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  return { minX, maxX, minZ, maxZ };
}

/**
 * The turn of a Polygon that shows a flat side to the front instead of a corner (Discussion #1787): half a side
 * step. An octagon then touches its frame with four flat sides, so length and width measure from flat to flat,
 * not from corner to corner; a hexagon swaps which of the two is which.
 */
export function polygonFlatAngle(sides: number | undefined, flat: boolean | undefined) {
  return flat ? Math.PI / Math.max(3, Math.round(sides ?? 6)) : 0;
}

/**
 * Wie breit und wie tief ein Vieleck mit Umkreis 1 misst. Ein Sechskant ist
 * ueber die Ecken breiter als ueber die Flaechen, ein Fuenfkant ganz anders -
 * wer die Seitenzahl aendert und trotzdem ein regelmaessiges Vieleck behalten
 * will, muss Breite und Tiefe in diesem Verhaeltnis mitziehen.
 */
export function regularPolygonAspect(sides: number, angleOffset = 0) {
  const bounds = regularPolygonBounds(sides, angleOffset);
  return { width: bounds.maxX - bounds.minX, depth: bounds.maxZ - bounds.minZ };
}

export function regularPolygonFootprintScale(
  width: number,
  depth: number,
  sides: number,
  angleOffset = 0,
): RegularPolygonFootprintScale {
  const { minX, maxX, minZ, maxZ } = regularPolygonBounds(sides, angleOffset);
  const x = Math.max(0.001, width) / Math.max(0.001, maxX - minX);
  const z = Math.max(0.001, depth) / Math.max(0.001, maxZ - minZ);
  return {
    x,
    z,
    offsetX: -((minX + maxX) / 2) * x,
    offsetZ: -((minZ + maxZ) / 2) * z,
  };
}
