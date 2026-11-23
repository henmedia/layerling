import type { WorkplaneShape } from "@/types/layerling";

/**
 * What a made group knows about itself and Done in Edit Bundle must not forget (Discussion #1692):
 * a name tag (`layeredText`) or icon tag (`layeredIcon`) bundle, a QR code (`qrCode`) or an SBC board
 * (`sbcBoard`) or a fan (`fan`). Built again from its parts without these, the group lost its card in the properties
 * panel and showed only the bundle's. The cards read their layers back from the parts, so a tag whose
 * parts no longer make a stack simply shows no card, as before.
 */
export function groupMarksOf(original: WorkplaneShape): Pick<WorkplaneShape, "layeredText" | "layeredIcon" | "qrCode" | "sbcBoard" | "fan"> {
  const bundle = original.groupOperation === "bundle";
  return {
    ...(bundle && original.layeredText ? { layeredText: true } : {}),
    ...(bundle && original.layeredIcon ? { layeredIcon: true } : {}),
    ...(original.qrCode ? { qrCode: structuredClone(original.qrCode) } : {}),
    ...(original.sbcBoard ? { sbcBoard: structuredClone(original.sbcBoard) } : {}),
    ...(original.fan ? { fan: structuredClone(original.fan) } : {}),
  };
}
