import type { WorkplaneShape } from "@/types/layerling";

/**
 * Was OBJ und 3MF beim farbigen Import teilen: aus den Dreiecken einer Farbe
 * wird je ein Koerper, und alle bleiben zueinander, wo sie in der Datei
 * standen (Discussion #79).
 */

/** Ein Teil der Datei: die Dreiecke einer Farbe. */
export type ColoredPart = {
  /** "#rrggbb", oder offen, wenn die Datei sie nicht verraet. */
  color?: string;
  /** Wie die Datei den Teil nennt (Material, Objekt) - fuer den Namen. */
  label?: string;
  positions: number[];
  normals?: number[];
};

/** Farben fuer Teile, deren Farbe die Datei nicht nennt - gut unterscheidbar. */
export const FALLBACK_PART_COLORS = ["#0098c7", "#e8590c", "#2f9e44", "#ae3ec9", "#f2c200", "#495057", "#d6336c", "#1c7ed6"];

/** "#rgb", "#rrggbb" oder "#rrggbbaa" als "#rrggbb"; alles andere ist keine Farbe. */
export function normalizeHexColor(value: string | null | undefined) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec((value ?? "").trim());
  if (!match) return undefined;
  const hex = match[1].toLowerCase();
  if (hex.length === 3) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  return `#${hex.slice(0, 6)}`;
}

function bounds(positions: readonly number[]) {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (let index = 0; index < positions.length; index += 3) {
    minX = Math.min(minX, positions[index]);
    maxX = Math.max(maxX, positions[index]);
    minY = Math.min(minY, positions[index + 1]);
    minZ = Math.min(minZ, positions[index + 2]);
    maxZ = Math.max(maxZ, positions[index + 2]);
  }
  return { centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2, minY };
}

/**
 * Ein Koerper je Teil, in der Lage zueinander wie in der Datei. `build` macht
 * aus Dreiecken einen Koerper, wie es der Import des Formats ohnehin tut; er
 * steht dort, wo ein einzelner Import stuende, und wird um den Versatz des
 * Teils gegen die ganze Datei verschoben. Die Teile tragen ihr Netz selbst
 * ("json"): eine .lyl baut sie nicht aus der ganzen Datei nach.
 */
export function placeColoredParts(
  baseName: string,
  parts: readonly ColoredPart[],
  build: (positions: number[], normals: number[] | undefined) => WorkplaneShape,
  placement: { keepPosition?: boolean } = {},
): WorkplaneShape[] {
  const file = bounds(parts.flatMap((part) => part.positions));
  let fallback = 0;
  return parts.map((part, index): WorkplaneShape => {
    const shape = build(part.positions, part.normals);
    const own = bounds(part.positions);
    // Kept where the file puts it (Issue #1939), every part stands at its own place in the file's frame.
    const position = placement.keepPosition
      ? { x: own.centerX, z: own.centerZ, elevation: own.minY }
      : { x: shape.x + own.centerX - file.centerX, z: shape.z + own.centerZ - file.centerZ, elevation: own.minY - file.minY };
    return {
      ...shape,
      name: `${baseName} ${part.label || index + 1}`,
      color: part.color ?? FALLBACK_PART_COLORS[fallback++ % FALLBACK_PART_COLORS.length],
      ...position,
      importedMesh: { ...shape.importedMesh!, sourceFormat: "json" },
    };
  });
}
