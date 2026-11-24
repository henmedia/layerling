/*
 * Room for the rotate arrows (#2020): on a thin body the arrows of two axes come to stand on each other on the
 * screen, and the label with the angles stood on top of them. Both are laid out here, in screen pixels.
 */

type ScreenPoint = { x: number; y: number };

/** The least distance of two rotate arrows' middles on the screen: each can still be told apart and taken with a finger. */
export const ROTATE_ARROW_GAP = 46;
/** How far an arrow's picture reaches from its middle. */
export const ROTATE_ARROW_REACH = 28;
const ROUNDS = 6;

/** Moves arrows that stand closer than `gap` apart, each half the way along the line between them; the others stay. */
export function spreadRotateArrows<T extends ScreenPoint>(arrows: readonly T[], gap = ROTATE_ARROW_GAP): T[] {
  const spread = arrows.map((arrow) => ({ ...arrow }));
  for (let round = 0; round < ROUNDS; round += 1) {
    let moved = false;
    for (let i = 0; i < spread.length; i += 1) {
      for (let j = i + 1; j < spread.length; j += 1) {
        const a = spread[i];
        const b = spread[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (!Number.isFinite(distance) || distance >= gap - 1e-6) continue;
        // Right on each other there is no line between them: side by side then.
        const way = distance > 1e-6 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
        const half = (gap - distance) / 2;
        a.x -= way.x * half;
        a.y -= way.y * half;
        b.x += way.x * half;
        b.y += way.y * half;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return spread;
}

/** Two square 82 px catch zones (a finger's) that far apart never meet, whichever way they lie: no more room is needed. */
const ROTATE_ARROW_FULL_ROOM = 116;

/** Each arrow with the distance to its nearest neighbour; the style sheet keeps its grab area within half of that. */
export function withRotateArrowRooms<T extends ScreenPoint>(arrows: readonly T[]): Array<T & { room: number }> {
  return arrows.map((arrow, index) => ({
    ...arrow,
    room: arrows.reduce(
      (room, other, at) => (at === index ? room : Math.min(room, Math.round(Math.hypot(other.x - arrow.x, other.y - arrow.y)))),
      ROTATE_ARROW_FULL_ROOM,
    ),
  }));
}

/** The label's place below the lowest handle, centred under the selection, and below every rotate arrow it would cover. */
export function angleBadgePoint(handles: readonly ScreenPoint[], rotateArrows: readonly ScreenPoint[], halfWidth = 85, halfHeight = 12): ScreenPoint {
  const x = handles.reduce((sum, handle) => sum + handle.x, 0) / handles.length;
  let y = Math.max(...handles.map((handle) => handle.y)) + 30;
  const inColumn = rotateArrows.filter((arrow) => Math.abs(arrow.x - x) < halfWidth + ROTATE_ARROW_REACH).sort((a, b) => a.y - b.y);
  for (const arrow of inColumn) {
    const clear = arrow.y + ROTATE_ARROW_REACH + halfHeight;
    if (y < clear && y > arrow.y - ROTATE_ARROW_REACH - halfHeight) y = clear;
  }
  return { x, y };
}
