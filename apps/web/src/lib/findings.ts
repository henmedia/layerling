import type { ClearanceBox, ClearanceVec3 } from "@/lib/clearanceCheck";

/*
 * Findings (Befunde): one thing an analysis found that may go wrong, in a form every analysis shares, so the layer check
 * (lib/layerCheck.ts) and the mold tool (lib/moldTool.ts) can show theirs in the same list, sorted and filtered alike.
 *
 * A finding says what kind of thing it is, how bad (a hint or a problem), where (the layers and heights it spans, its
 * middle, its box and, per layer, the outline of the place), how much (the area and one measured value, an angle, a span
 * or a thickness) and on which part. The words for it and for its remedy come from the catalogue by its kind, so the
 * model holds no text. Kinds are open: an analysis may add its own (the mold tool adds undercut, airTrap and draft).
 */

export type FindingLevel = "hint" | "problem";

/** The kinds the layer check and the mold tool report; another analysis may add its own names. */
export type FindingKind =
  | "inBed" | "floatsAbove" | "openMesh" | "tooLarge"
  | "unsupported" | "overhang" | "bridge" | "thinWall" | "smallIsland" | "adhesion"
  | "undercut" | "airTrap" | "draft";

/** What the measured value is: an angle from the vertical, a length, an area, a share or a ratio. */
export type FindingUnit = "deg" | "mm" | "mm2" | "percent" | "ratio";

/**
 * The outline of the place on one layer, seen from above in the kernel's frame (x across, y = the scene's -z): closed
 * polygons as flat lists of points (x0, y0, x1, y1, ...), at the layer's middle height `z` (the scene's y).
 */
export type FindingRegion = { layer: number; z: number; polygons: number[][] };

/** A tool of the editor that helps against a finding: the finding's parts are selected and the tool opened. */
export type FindingAction = "dropToPlate" | "layFlat" | "supportRib" | "openMold";

export type Finding = {
  /** Unique within its result. */
  id: string;
  kind: FindingKind;
  level: FindingLevel;
  /** The first and the last layer, counted from 1 (layer checks only). */
  layerFrom?: number;
  layerTo?: number;
  /** The bottom of the first layer and the top of the last, mm above the plate. */
  zFrom?: number;
  zTo?: number;
  /** The area of the place, mm²; 0 where an area makes no sense (a part in the plate). */
  areaMm2: number;
  /** The one figure that tells how bad: the steepest overhang, the widest span, the thinnest wall... */
  value?: number;
  unit?: FindingUnit;
  /** Where it is, in the scene's frame (mm, y up). */
  point: ClearanceVec3;
  box: ClearanceBox;
  /** The place layer by layer, to paint it in the layer view; left out where there is no layer. */
  regions?: FindingRegion[];
  /** The objects of the design it concerns, and their names. */
  partIds: string[];
  partName: string;
  action?: FindingAction;
};

const LEVEL_ORDER: Record<FindingLevel, number> = { problem: 0, hint: 1 };

/** Problems first, then from low to high, then the larger place first. */
export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]
    || (a.zFrom ?? a.box.min[1]) - (b.zFrom ?? b.box.min[1])
    || b.areaMm2 - a.areaMm2);
}

export type FindingFilter = { kinds?: readonly FindingKind[] | null; partId?: string | null };

/** The findings of the kinds and the part asked for; null or empty asks for all. */
export function filterFindings(findings: readonly Finding[], filter: FindingFilter): Finding[] {
  return findings.filter((finding) => (!filter.kinds?.length || filter.kinds.includes(finding.kind)) && (!filter.partId || finding.partIds.includes(filter.partId)));
}

/** How many problems and how many hints. */
export function countFindings(findings: readonly Finding[]) {
  let problems = 0;
  let hints = 0;
  for (const finding of findings) {
    if (finding.level === "problem") problems += 1;
    else hints += 1;
  }
  return { problems, hints };
}

/** The finding after (or before, `step` -1) the one with `id` in `findings`, going round; the first when none is given. */
export function stepFinding(findings: readonly Finding[], id: string | null, step: 1 | -1): Finding | null {
  if (!findings.length) return null;
  const index = id ? findings.findIndex((finding) => finding.id === id) : -1;
  if (index < 0) return step > 0 ? findings[0] : findings[findings.length - 1];
  return findings[(index + step + findings.length) % findings.length];
}

/** A box round points; an empty one for none. */
export function boxAround(points: readonly ClearanceVec3[]): ClearanceBox {
  const box: ClearanceBox = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const point of points) {
    for (let axis = 0; axis < 3; axis += 1) {
      box.min[axis] = Math.min(box.min[axis], point[axis]);
      box.max[axis] = Math.max(box.max[axis], point[axis]);
    }
  }
  return box;
}
