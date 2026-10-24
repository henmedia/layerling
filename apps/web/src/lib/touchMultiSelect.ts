/**
 * Whether the round Select multiple button of a touch screen belongs on the plate.
 *
 * A finger that picks a body shows it; empty space and a mouse or a pen hide it again. Only a
 * finger needs the button - with a mouse, Shift is at hand.
 */
export function showsTouchMultiSelect(pointerType: string, pickedShapeId: string | null): boolean {
  return pointerType === "touch" && pickedShapeId !== null;
}
