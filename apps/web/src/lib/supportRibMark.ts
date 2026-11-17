import { localIdBase } from "@/lib/localIds";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * How a support rib (Discussion #1385) knows its part: it keeps the id the part had before any grouping (localIdBase),
 * so it still knows it once the two are bundled, or taken apart again. The rib's bridges reach into that part on purpose
 * and its back and bridges are meant to be thin, so the clearance and print checks leave them out (Ingo, 07.11.2026:
 * both checks warned about the bridges). Apart from lib/supportRib, which the checks would otherwise import in a circle.
 */

/** The mark a rib built for the part `partId` carries. */
export const supportRibMark = (partId: string): Pick<WorkplaneShape, "supportRibFor"> => ({ supportRibFor: localIdBase(partId) });

/** Whether one of the two is a support rib built for the other. */
export function supportRibHolds(a: Pick<WorkplaneShape, "id" | "supportRibFor">, b: Pick<WorkplaneShape, "id" | "supportRibFor">) {
  return Boolean((a.supportRibFor && a.supportRibFor === localIdBase(b.id)) || (b.supportRibFor && b.supportRibFor === localIdBase(a.id)));
}

/** Whether a body is a support rib, as the tool marks it. */
export function isSupportRib(shape: Pick<WorkplaneShape, "supportRibFor">) {
  return Boolean(shape.supportRibFor);
}
