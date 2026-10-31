/**
 * Where a floating panel sits inside the editor area, when someone has moved
 * it. The panel may go anywhere in that area, but never so far that its title
 * bar - the only place to grab it again - leaves the area.
 */
export type PanelPosition = { left: number; top: number };

/** How much of the panel's top edge stays inside the area, so its title bar can still be grabbed. */
export const PANEL_GRAB_HEIGHT = 48;

export function clampPanelPosition(
  position: PanelPosition,
  panel: { width: number; height?: number },
  area: { width: number; height: number },
): PanelPosition {
  const maxLeft = Math.max(0, area.width - panel.width);
  const maxTop = Math.max(0, area.height - (panel.height ?? PANEL_GRAB_HEIGHT));
  return {
    left: Math.round(Math.min(Math.max(0, position.left), maxLeft)),
    top: Math.round(Math.min(Math.max(0, position.top), maxTop)),
  };
}

/** How close to its docked spot a panel has to be dropped to snap back into it. */
export const PANEL_DOCK_DISTANCE = 32;

/** Whether a panel dropped at `position` goes back into its dock at `docked`. */
export function isNearDock(position: PanelPosition, docked: PanelPosition, distance = PANEL_DOCK_DISTANCE): boolean {
  return Math.hypot(position.left - docked.left, position.top - docked.top) <= distance;
}

/** A stored position, or null when there is none or it is not a usable one. */
export function parsePanelPosition(stored: string | null): PanelPosition | null {
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<PanelPosition> | null;
    if (!value || !Number.isFinite(value.left) || !Number.isFinite(value.top)) return null;
    return { left: value.left as number, top: value.top as number };
  } catch {
    return null;
  }
}
