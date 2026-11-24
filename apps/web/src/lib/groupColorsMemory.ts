import type { WorkplaneShape } from "@/types/layerling";
import { canToggleGroupColors } from "@/lib/groupColors";

/*
 * The last choice made with the "Multicolor" switch or Shift+M on a group: while it is on, groups made
 * with Group start in their parts' colours (#1989). It belongs to this browser, not to a design. Off is
 * the same as no choice: a group starts as it always did.
 */

const STORAGE_KEY = "layerling.newGroupsMulticolor";
let visitChoice: boolean | null = null;

/** A plain group: a bundle has a start of its own, and a hull or loft has no such switch. */
function isPlainGroup(shape: WorkplaneShape) {
  return canToggleGroupColors(shape) && (shape.groupOperation ?? "group") === "group";
}

export function readNewGroupsMulticolor(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return visitChoice ?? false;
  }
}

/** Remembers the choice made for these shapes; bundles among them say nothing about new groups. */
export function rememberGroupMulticolor(shapes: readonly WorkplaneShape[], multicolor: boolean) {
  if (!shapes.some(isPlainGroup)) return;
  visitChoice = multicolor;
  try {
    if (multicolor) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The choice still holds for this visit.
  }
}

/** A group just made with Group, in its parts' colours where that is the remembered choice. */
export function withRememberedMulticolor(group: WorkplaneShape): WorkplaneShape {
  return isPlainGroup(group) && readNewGroupsMulticolor() ? { ...group, multicolor: true } : group;
}
