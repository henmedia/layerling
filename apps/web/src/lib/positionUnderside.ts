import { meshAabb } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * How far the body's lowest point lies below its `elevation`, the underside it has before it is turned.
 * Turned about X or Y, a body turns about its middle: a cylinder 15 mm long lying on its side has its
 * elevation at -5 while it lies on the plate (Discussion #1303). The field Z shows the height of its
 * underside, so it adds this offset to the elevation and takes it off again when a height is typed.
 * A body that is not tilted, or turned only about Z, keeps its underside: the offset is 0.
 */
export function undersideOffset(shape: WorkplaneShape): number {
  if (!(shape.rotationX ?? 0) && !(shape.rotationZ ?? 0)) return 0;
  const lowest = meshAabb(shape).minY;
  if (!Number.isFinite(lowest)) return 0;
  return lowest - (shape.elevation ?? 0);
}
