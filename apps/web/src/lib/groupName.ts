import { hasOwnShapeName } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The name a new group or bundle starts with (Discussion #1854). When exactly one of the parts
 * carries a name somebody gave it, the group takes that name, so "Lid" grouped with a hole and a
 * plain box stays "Lid" in the object list. With no such part, or with several, it keeps the name
 * the editor hands out (`fallback`, "Group" or "Bundle"): there is no telling whose name it
 * should be. A hole only counts while no solid is among the parts, as a body is not called after
 * what was cut out of it. The parts keep their own names inside the group either way.
 */
export function nameForNewGroup(parts: readonly WorkplaneShape[], fallback: string): string {
  const solids = parts.filter((part) => !part.hole);
  const named = (solids.length > 0 ? solids : parts).filter(hasOwnShapeName);
  return named.length === 1 ? named[0].name.trim() : fallback;
}
