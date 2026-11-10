/** How far the pointer goes before a pressed shape or handle starts to act, in screen pixels - as the marquee (#150). */
export const DRAG_START_PIXELS = 5;

/**
 * Whether the pointer has travelled far enough from where it went down for a drag to begin. Below that a press is a
 * click, and a slightly shaky hand changes nothing: not where a part stands (#150), nor its size, height, turn or the
 * place an arrow slides it to.
 */
export function dragHasStarted(startX: number, startY: number, x: number, y: number, threshold = DRAG_START_PIXELS) {
  return Math.hypot(x - startX, y - startY) >= threshold;
}
