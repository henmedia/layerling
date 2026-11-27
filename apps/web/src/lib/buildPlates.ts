import { bedOverhangs, shapeBedFootprint, type BedOverhang } from "@/lib/printBed";
import { isNonSolidShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { MAX_BUILD_PLATES, MAX_PLATE_NAME_LENGTH, normalizePlateNames, normalizePlatesPerRow } from "@/lib/buildPlateNames";

export { MAX_BUILD_PLATES, normalizePlateNames };

/*
 * Several build plates in one design (Discussion #456). The plates lie side by side along X, each as large
 * as the workplane, with a gap between them: plate 1 stays where the one plate always was, centred on the
 * origin, and the next ones follow to the right, all in one row or, with `platesPerRow`, in rows of that many,
 * each row in front of the one before (Discussion #2073). A body belongs to the plate under the middle of its
 * footprint, so nothing in a body says which plate it is on: the bodies keep their world positions, a
 * design from before stays one plate, and an older layerling opens a design with plates and shows the
 * bodies side by side. The plates themselves are only their names, kept with the design's workplane.
 */

/** The gap between two plates, in millimetres. */
export const PLATE_GAP = 20;
/** How far apart "Arrange on plates" sets the bodies and keeps them from the plate's edge. */
export const PLATE_PACK_MARGIN = 5;

export type PlateWorkspace = Pick<WorkplaneWorkspaceSettings, "width" | "depth"> & { plates?: readonly string[]; platesPerRow?: number };

export function plateCount(workspace: PlateWorkspace): number {
  return Math.max(1, Math.min(MAX_BUILD_PLATES, workspace.plates?.length ?? 1));
}

/** A plate's own name, or "" when it has none (the editor then shows "Plate 2"). */
export function plateName(workspace: PlateWorkspace, index: number): string {
  return workspace.plates?.[index] ?? "";
}

/**
 * What the first plate says in its near left corner: the design's name - and once the plate has a name of its
 * own (Discussion #1860) "Plate 1: Lid" as the further plates say theirs, with the design's name in small above
 * it; before, the first plate said the design's name only.
 */
export function firstPlateCornerLabel(workspace: PlateWorkspace, projectName: string, plateLabel: (index: number) => string): { title: string; subtitle: string } {
  if (!plateName(workspace, 0)) return { title: projectName, subtitle: "" };
  return { title: plateLabel(0), subtitle: projectName.trim() };
}

/** From the middle of one plate to the middle of the next. */
export function platePitch(workspace: PlateWorkspace): number {
  return workspace.width + PLATE_GAP;
}

/** From the middle of one row of plates to the middle of the next. */
export function plateRowPitch(workspace: PlateWorkspace): number {
  return workspace.depth + PLATE_GAP;
}

/** How many plates stand in a row: as many as the design can hold unless it names a number. */
export function platesPerRow(workspace: PlateWorkspace): number {
  return normalizePlatesPerRow(workspace.platesPerRow) ?? MAX_BUILD_PLATES;
}

/** The middle of plate `index` (0 is the first) on X. */
export function plateCenterX(workspace: PlateWorkspace, index: number): number {
  return (index % platesPerRow(workspace)) * platePitch(workspace);
}

/** The middle of plate `index` on Z: 0 in the first row, each further row in front of it (larger Z). */
export function plateCenterZ(workspace: PlateWorkspace, index: number): number {
  return Math.floor(index / platesPerRow(workspace)) * plateRowPitch(workspace);
}

/** The Z of every row of plates, the first row's 0 among them. */
export function plateRowsZ(workspace: PlateWorkspace): number[] {
  const rows = Math.ceil(plateCount(workspace) / platesPerRow(workspace));
  return Array.from({ length: rows }, (_, row) => row * plateRowPitch(workspace));
}

/** The plate under a point: the nearest one, also from the gap or from beyond the last. */
export function plateIndexAt(workspace: PlateWorkspace, x: number, z = 0): number {
  const count = plateCount(workspace);
  if (count <= 1) return 0;
  const perRow = platesPerRow(workspace);
  const lastRow = Math.ceil(count / perRow) - 1;
  const row = Math.max(0, Math.min(lastRow, Math.round(z / plateRowPitch(workspace))));
  const column = Math.max(0, Math.min(perRow - 1, Math.round(x / platePitch(workspace))));
  const index = row * perRow + column;
  if (index < count) return index;
  // Beside the last plate of a row that is not full, or of the only one: the nearest of all plates.
  let nearest = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let plate = 0; plate < count; plate += 1) {
    const distance = Math.hypot(x - plateCenterX(workspace, plate), z - plateCenterZ(workspace, plate));
    if (distance < best - 1e-9) {
      best = distance;
      nearest = plate;
    }
  }
  return nearest;
}

/** The plate a body stands on: the one under the middle of its footprint. */
export function plateOfShape(workspace: PlateWorkspace, shape: WorkplaneShape): number {
  if (plateCount(workspace) <= 1) return 0;
  const footprint = shapeBedFootprint(shape);
  return plateIndexAt(workspace, (footprint.minX + footprint.maxX) / 2, (footprint.minZ + footprint.maxZ) / 2);
}

/** How far a body's plate lies from the first one, on X: what the inspector takes off its X. */
export function plateOffsetOfShape(workspace: PlateWorkspace, shape: WorkplaneShape): number {
  return plateCenterX(workspace, plateOfShape(workspace, shape));
}

/** The same on Z: 0 for a body on a plate of the first row. */
export function plateOffsetZOfShape(workspace: PlateWorkspace, shape: WorkplaneShape): number {
  return plateCenterZ(workspace, plateOfShape(workspace, shape));
}

/** The bodies of plate `index`, moved onto the first plate's spot: what a file of that plate alone holds. */
export function shapesOnPlateFrame(workspace: PlateWorkspace, shapes: readonly WorkplaneShape[], index: number): WorkplaneShape[] {
  return shapesOnPlate(workspace, shapes, index).map((shape) => shapeMovedBetweenPlates(workspace, shape, index, 0));
}

export function shapesOnPlate(workspace: PlateWorkspace, shapes: readonly WorkplaneShape[], index: number): WorkplaneShape[] {
  return shapes.filter((shape) => plateOfShape(workspace, shape) === index);
}

/** How far all plates reach on X, from the first one's left edge to the last one's right edge. */
export function platesExtentX(workspace: PlateWorkspace): { minX: number; maxX: number } {
  const half = workspace.width / 2;
  return { minX: -half, maxX: (Math.min(plateCount(workspace), platesPerRow(workspace)) - 1) * platePitch(workspace) + half };
}

/** How far all plates reach on Z, from the first row's back edge to the last row's front edge. */
export function platesExtentZ(workspace: PlateWorkspace): { minZ: number; maxZ: number } {
  const half = workspace.depth / 2;
  return { minZ: -half, maxZ: plateCenterZ(workspace, plateCount(workspace) - 1) + half };
}

/** What the plates `from` to `to` cover together, on X and Z. */
export function platesBounds(workspace: PlateWorkspace, from: number, to: number) {
  const bounds = { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minZ: Number.POSITIVE_INFINITY, maxZ: Number.NEGATIVE_INFINITY };
  for (let index = from; index <= to; index += 1) {
    const x = plateCenterX(workspace, index);
    const z = plateCenterZ(workspace, index);
    bounds.minX = Math.min(bounds.minX, x - workspace.width / 2);
    bounds.maxX = Math.max(bounds.maxX, x + workspace.width / 2);
    bounds.minZ = Math.min(bounds.minZ, z - workspace.depth / 2);
    bounds.maxZ = Math.max(bounds.maxZ, z + workspace.depth / 2);
  }
  return bounds;
}

/** A body moved by `dx` and `dz`; the parts of a group sit relative to it and move along. */
export function shapeMovedBy(shape: WorkplaneShape, dx: number, dz: number): WorkplaneShape {
  const clean = (value: number) => (Math.abs(value) < 1e-9 ? 0 : Math.round(value * 1e6) / 1e6);
  return {
    ...shape,
    ...(Math.abs(dx) < 1e-9 ? {} : { x: clean(shape.x + dx) }),
    ...(Math.abs(dz) < 1e-9 ? {} : { z: clean(shape.z + dz) }),
  };
}

/**
 * Copied bodies moved from the plate they stand on - the one under the middle of all of them - to the same spot on
 * the first plate. That is how a copy goes onto the clipboard, so pasting can put it on the plate you are on, in this
 * design or another one (Discussion #2124), as an import does (#1514).
 */
export function shapesOntoFirstPlate(workspace: PlateWorkspace, shapes: WorkplaneShape[]): WorkplaneShape[] {
  if (plateCount(workspace) <= 1 || shapes.length === 0) return shapes;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const shape of shapes) {
    const footprint = shapeBedFootprint(shape);
    minX = Math.min(minX, footprint.minX);
    maxX = Math.max(maxX, footprint.maxX);
    minZ = Math.min(minZ, footprint.minZ);
    maxZ = Math.max(maxZ, footprint.maxZ);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) return shapes;
  const index = plateIndexAt(workspace, (minX + maxX) / 2, (minZ + maxZ) / 2);
  if (index <= 0) return shapes;
  const dx = plateCenterX(workspace, index);
  const dz = plateCenterZ(workspace, index);
  return shapes.map((shape) => shapeMovedBy(shape, -dx, -dz));
}

/** A body moved from plate `from` to the same spot on plate `to`, the plates of `after` when they are laid out anew. */
function shapeMovedBetweenPlates(workspace: PlateWorkspace, shape: WorkplaneShape, from: number, to: number, after = workspace): WorkplaneShape {
  const dx = plateCenterX(after, to) - plateCenterX(workspace, from);
  const dz = plateCenterZ(after, to) - plateCenterZ(workspace, from);
  return Math.abs(dx) < 1e-9 && Math.abs(dz) < 1e-9 ? shape : shapeMovedBy(shape, dx, dz);
}

/**
 * The bodies that do not fit their plate, each measured against the plate it stands on: past its edges, or
 * taller than the build height counted from the lowest body on the same plate, as a slicer sets each plate
 * down on its own. The overhangs name the bodies as they are, not moved.
 */
export function plateOverhangs(
  shapes: readonly WorkplaneShape[],
  workspace: PlateWorkspace,
  printer: { width: number; depth: number; height?: number; round?: boolean },
): BedOverhang[] {
  const count = plateCount(workspace);
  if (count <= 1) return bedOverhangs(shapes, printer.width, printer.depth, printer.height, printer.round);
  const byPlate = new Map<number, WorkplaneShape[]>();
  for (const shape of shapes) {
    const index = plateOfShape(workspace, shape);
    byPlate.set(index, [...(byPlate.get(index) ?? []), shape]);
  }
  const result: BedOverhang[] = [];
  for (const [index, onPlate] of [...byPlate.entries()].sort((a, b) => a[0] - b[0])) {
    const originals = new Map(onPlate.map((shape) => [shape.id, shape]));
    const moved = onPlate.map((shape) => shapeMovedBetweenPlates(workspace, shape, index, 0));
    for (const overhang of bedOverhangs(moved, printer.width, printer.depth, printer.height, printer.round)) {
      result.push({ ...overhang, shape: originals.get(overhang.shape.id) ?? overhang.shape });
    }
  }
  return result;
}

/** One more plate at the end, or null when the design holds as many as it can. */
export function platesWithAdded(workspace: PlateWorkspace, name = ""): string[] | null {
  const count = plateCount(workspace);
  if (count >= MAX_BUILD_PLATES) return null;
  const names = Array.from({ length: count }, (_, index) => plateName(workspace, index));
  return [...names, name.trim().slice(0, MAX_PLATE_NAME_LENGTH)];
}

export function platesRenamed(workspace: PlateWorkspace, index: number, name: string): string[] {
  const names = Array.from({ length: plateCount(workspace) }, (_, i) => plateName(workspace, i));
  if (index >= 0 && index < names.length) names[index] = name.trim().slice(0, MAX_PLATE_NAME_LENGTH);
  return names;
}

/** A plate's place in the row after the plates were reordered: `order[newIndex] = oldIndex`. */
function reorderedShapes(workspace: PlateWorkspace, shapes: readonly WorkplaneShape[], order: readonly number[]): WorkplaneShape[] {
  const newIndexOf = new Map(order.map((oldIndex, newIndex) => [oldIndex, newIndex]));
  return shapes.map((shape) => {
    const from = plateOfShape(workspace, shape);
    const to = newIndexOf.get(from);
    return to === undefined ? shape : shapeMovedBetweenPlates(workspace, shape, from, to);
  });
}

/** Plate `from` moved to the place of plate `to`, its bodies with it; the plates between move up one. */
export function platesMoved(workspace: PlateWorkspace, shapes: readonly WorkplaneShape[], from: number, to: number) {
  const count = plateCount(workspace);
  const order = Array.from({ length: count }, (_, index) => index);
  if (from < 0 || from >= count || to < 0 || to >= count || from === to) return { plates: [...(workspace.plates ?? [""])], shapes: [...shapes] };
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  const names = order.map((oldIndex) => plateName(workspace, oldIndex));
  return { plates: names, shapes: reorderedShapes(workspace, shapes, order) };
}

/**
 * The design without plate `index`. Its bodies either go onto the first remaining plate at the same spot
 * (`"move"`) or are removed (`"delete"`); the plates after it move up one, with their bodies. The first plate
 * can go as well while there are others: the next one then lies at the origin.
 */
export function platesRemoved(workspace: PlateWorkspace, shapes: readonly WorkplaneShape[], index: number, bodies: "move" | "delete") {
  const count = plateCount(workspace);
  if (count <= 1 || index < 0 || index >= count) return { plates: workspace.plates ? [...workspace.plates] : undefined, shapes: [...shapes], removedIds: [] as string[] };
  const names = Array.from({ length: count }, (_, i) => plateName(workspace, i)).filter((_, i) => i !== index);
  const target = index === 0 ? 1 : 0;
  const removedIds: string[] = [];
  const kept: WorkplaneShape[] = [];
  for (const shape of shapes) {
    const from = plateOfShape(workspace, shape);
    if (from === index) {
      if (bodies === "delete") {
        removedIds.push(shape.id);
        continue;
      }
      // The first remaining plate: plate 1, or plate 2 when plate 1 itself goes; it then lies at the origin.
      const newIndex = target > index ? target - 1 : target;
      kept.push(shapeMovedBetweenPlates(workspace, shape, from, newIndex));
      continue;
    }
    const newIndex = from > index ? from - 1 : from;
    kept.push(shapeMovedBetweenPlates(workspace, shape, from, newIndex));
  }
  return { plates: normalizePlateNames(names), shapes: kept, removedIds };
}

/** The bodies `ids` put onto plate `target` at the same spot on it. */
export function shapesMovedToPlate(workspace: PlateWorkspace, shapes: readonly WorkplaneShape[], ids: ReadonlySet<string>, target: number): WorkplaneShape[] {
  const index = Math.max(0, Math.min(plateCount(workspace) - 1, target));
  return shapes.map((shape) => {
    if (!ids.has(shape.id)) return shape;
    return shapeMovedBetweenPlates(workspace, shape, plateOfShape(workspace, shape), index);
  });
}

/** Whether the plates the design has lie where they did: the same size and the same rows. */
export function platesLieAlike(before: PlateWorkspace, after: PlateWorkspace): boolean {
  return Array.from({ length: plateCount(before) }, (_, index) => index)
    .every((index) => plateCenterX(before, index) === plateCenterX(after, index) && plateCenterZ(before, index) === plateCenterZ(after, index));
}

/**
 * When the plates change size (another printer) or stand in other rows, the middles of the plates move: the
 * bodies on the plates after the first move with theirs, so each keeps its spot on its own plate.
 */
export function shapesAfterPlateResize(before: PlateWorkspace, after: PlateWorkspace, shapes: readonly WorkplaneShape[]): WorkplaneShape[] {
  if (plateCount(before) <= 1 || platesLieAlike(before, after)) return [...shapes];
  return shapes.map((shape) => {
    const index = plateOfShape(before, shape);
    return index === 0 ? shape : shapeMovedBetweenPlates(before, shape, index, index, after);
  });
}

export type PlatePacking = {
  /** The bodies set down, each moved so its footprint lies where it was packed. */
  shapes: WorkplaneShape[];
  /** How many plates the design needs afterwards: at least as many as it had. */
  plateCount: number;
  /** Bodies that did not fit: larger than a plate, or past the last plate the design can hold. They stay where they were. */
  leftOver: string[];
};

/**
 * "Arrange on plates": the bodies `ids` laid out row by row from the plates' back left corner, the largest
 * first, PLATE_PACK_MARGIN apart and from the edges, onto the plates in turn and onto new ones while the
 * design can hold more. A round plate packs into the square inside its circle. The bodies keep their
 * turn and height; only where they stand on the plate changes.
 */
export function packOntoPlates(
  workspace: PlateWorkspace,
  shapes: readonly WorkplaneShape[],
  ids: ReadonlySet<string>,
  options: { round?: boolean; margin?: number } = {},
): PlatePacking {
  const margin = options.margin ?? PLATE_PACK_MARGIN;
  const usableWidth = options.round ? workspace.width * Math.SQRT1_2 : workspace.width;
  const usableDepth = options.round ? workspace.width * Math.SQRT1_2 : workspace.depth;
  const chosen = shapes.filter((shape) => ids.has(shape.id) && !isNonSolidShape(shape));
  const sized = chosen.map((shape) => {
    const footprint = shapeBedFootprint(shape);
    return { shape, footprint, width: footprint.maxX - footprint.minX, depth: footprint.maxZ - footprint.minZ };
  });
  // Deepest first, then widest: rows fill evenly and a long part does not end up alone on a plate.
  sized.sort((a, b) => b.depth - a.depth || b.width - a.width || a.shape.id.localeCompare(b.shape.id));
  const placed = new Map<string, { dx: number; dz: number }>();
  const leftOver: string[] = [];
  let plate = 0;
  let cursorX = margin;
  let rowTop = margin;
  let rowDepth = 0;
  let usedPlates = plateCount(workspace);
  for (const item of sized) {
    if (item.width > usableWidth - 2 * margin + 1e-6 || item.depth > usableDepth - 2 * margin + 1e-6) {
      leftOver.push(item.shape.id);
      continue;
    }
    if (cursorX + item.width > usableWidth - margin + 1e-6) {
      cursorX = margin;
      rowTop += rowDepth + margin;
      rowDepth = 0;
    }
    if (rowTop + item.depth > usableDepth - margin + 1e-6) {
      plate += 1;
      cursorX = margin;
      rowTop = margin;
      rowDepth = 0;
    }
    if (plate >= MAX_BUILD_PLATES) {
      leftOver.push(item.shape.id);
      continue;
    }
    // From the plate's back left corner (smallest X and Z), in the frame of plate `plate`.
    const left = plateCenterX(workspace, plate) - usableWidth / 2 + cursorX;
    const back = plateCenterZ(workspace, plate) - usableDepth / 2 + rowTop;
    placed.set(item.shape.id, { dx: left - item.footprint.minX, dz: back - item.footprint.minZ });
    cursorX += item.width + margin;
    rowDepth = Math.max(rowDepth, item.depth);
    usedPlates = Math.max(usedPlates, plate + 1);
  }
  const clean = (value: number) => (Math.abs(value) < 1e-9 ? 0 : Math.round(value * 1e6) / 1e6);
  return {
    shapes: shapes.map((shape) => {
      const move = placed.get(shape.id);
      return move ? { ...shape, x: clean(shape.x + move.dx), z: clean(shape.z + move.dz) } : shape;
    }),
    plateCount: Math.min(MAX_BUILD_PLATES, usedPlates),
    leftOver,
  };
}

