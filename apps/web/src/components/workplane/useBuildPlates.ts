"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { t } from "@/lib/i18n";
import {
  packOntoPlates,
  plateCenterX,
  plateCount,
  plateName,
  plateOfShape,
  platesMoved,
  platesRemoved,
  platesRenamed,
  platesWithAdded,
  shapesMovedToPlate,
} from "@/lib/buildPlates";
import { normalizePlateNames, MAX_BUILD_PLATES } from "@/lib/buildPlateNames";
import { placementWorkplaneIsBase, type PlacementPoint, type PlacementWorkplane } from "@/lib/placementWorkplane";
import type { BedOverhang } from "@/lib/printBed";
import type { GridSize, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import type { PlateBarPlate } from "@/components/workplane/PlateBar";

/** "Plate 2", or "Plate 2: Lid" for a plate with a name of its own. */
export function plateDisplayLabel(workspace: Pick<WorkplaneWorkspaceSettings, "width" | "depth" | "plates">, index: number) {
  const name = plateName(workspace, index);
  return name ? t("plates.named", { number: index + 1, name }) : t("plates.plate", { number: index + 1 });
}

/**
 * The editor's side of the build plates (Discussion #456): which plate is active, the bar's chips and what
 * its buttons do. The plates are names kept in the design's workplane settings; moving bodies between them
 * is an ordinary change of the scene and goes into the history.
 */
export function useBuildPlates({
  workspace,
  workspaceRef,
  snapGridRef,
  shapes,
  shapesRef,
  selectedIdsRef,
  selectedCount,
  overhangs,
  roundPlate,
  commitShapes,
  updateWorkspace,
  setNotice,
}: {
  workspace: WorkplaneWorkspaceSettings;
  workspaceRef: MutableRefObject<WorkplaneWorkspaceSettings>;
  snapGridRef: MutableRefObject<GridSize>;
  shapes: readonly WorkplaneShape[];
  shapesRef: MutableRefObject<WorkplaneShape[]>;
  selectedIdsRef: MutableRefObject<string[]>;
  selectedCount: number;
  overhangs: readonly BedOverhang[];
  roundPlate: boolean;
  commitShapes: (next: WorkplaneShape[], selection?: string | string[] | null, message?: string) => void;
  updateWorkspace: (settings: { workspace: WorkplaneWorkspaceSettings; snap: GridSize }) => void;
  setNotice: (message: string, warn?: boolean) => void;
}) {
  const count = plateCount(workspace);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [wanted, setWanted] = useState(false);
  const [hidden, setHidden] = useState(false);
  /** What the export window writes while the design has several plates: all of them, one file per plate, or one plate. */
  const [exportPlate, setExportPlate] = useState<"all" | "each" | number>("all");
  useEffect(() => {
    if (typeof exportPlate === "number" && exportPlate >= count) setExportPlate("all");
  }, [count, exportPlate]);
  // A plate removed under the active one: the last remaining one is active.
  useEffect(() => {
    if (active >= count) {
      activeRef.current = count - 1;
      setActive(count - 1);
    }
  }, [active, count]);
  const barOpen = !hidden && (count > 1 || wanted);

  const plates: PlateBarPlate[] = useMemo(() => {
    const bodies = Array.from({ length: count }, () => 0);
    const outside = Array.from({ length: count }, () => 0);
    for (const shape of shapes) bodies[plateOfShape(workspace, shape)] += 1;
    for (const overhang of overhangs) outside[plateOfShape(workspace, overhang.shape)] += 1;
    return Array.from({ length: count }, (_, index) => ({
      label: plateDisplayLabel(workspace, index),
      name: plateName(workspace, index),
      bodies: bodies[index],
      overhangs: outside[index],
    }));
  }, [count, overhangs, shapes, workspace]);

  const writePlates = useCallback((names: string[] | undefined) => {
    updateWorkspace({ workspace: { ...workspaceRef.current, plates: normalizePlateNames(names) }, snap: snapGridRef.current });
  }, [snapGridRef, updateWorkspace, workspaceRef]);

  const frame = useCallback((from: number, to = from) => {
    // The view is rebuilt with the new plates first, then looks at them.
    window.setTimeout(() => window.layerlingFramePlates?.(from, to), 0);
  }, []);

  const select = useCallback((index: number) => {
    activeRef.current = index;
    setActive(index);
    frame(index);
  }, [frame]);

  const add = useCallback(() => {
    const names = platesWithAdded(workspaceRef.current);
    if (!names) {
      setNotice(t("plates.full", { max: MAX_BUILD_PLATES }), true);
      return null;
    }
    writePlates(names);
    const index = names.length - 1;
    activeRef.current = index;
    setActive(index);
    setWanted(true);
    setHidden(false);
    frame(index);
    setNotice(t("status.plateAdded", { plate: plateDisplayLabel({ ...workspaceRef.current, plates: names }, index) }));
    return index;
  }, [frame, setNotice, workspaceRef, writePlates]);

  const rename = useCallback((index: number, name: string) => {
    writePlates(platesRenamed(workspaceRef.current, index, name));
  }, [workspaceRef, writePlates]);

  const move = useCallback((index: number, to: number) => {
    const result = platesMoved(workspaceRef.current, shapesRef.current, index, to);
    writePlates(result.plates);
    commitShapes(result.shapes, selectedIdsRef.current, t("status.plateMoved", { plate: plateDisplayLabel(workspaceRef.current, index), number: to + 1 }));
    activeRef.current = to;
    setActive(to);
    frame(to);
  }, [commitShapes, frame, selectedIdsRef, shapesRef, workspaceRef, writePlates]);

  const remove = useCallback((index: number) => {
    const before = workspaceRef.current;
    if (plateCount(before) <= 1) return;
    const label = plateDisplayLabel(before, index);
    const onIt = shapesRef.current.filter((shape) => plateOfShape(before, shape) === index).length;
    const result = platesRemoved(before, shapesRef.current, index, "move");
    writePlates(result.plates);
    commitShapes(result.shapes, selectedIdsRef.current, onIt > 0
      ? t("status.plateRemovedMoved", { plate: label, count: onIt, target: plateDisplayLabel({ ...before, plates: result.plates }, 0) })
      : t("status.plateRemoved", { plate: label }));
    const next = Math.max(0, Math.min(index, plateCount({ ...before, plates: result.plates }) - 1));
    activeRef.current = next;
    setActive(next);
  }, [commitShapes, selectedIdsRef, shapesRef, workspaceRef, writePlates]);

  /** The selection onto plate `target`, at the same spot on it; -1 puts it on a new plate. */
  const moveSelectionToPlate = useCallback((target: number, only?: readonly string[]): number | null => {
    const ids = new Set(only ?? selectedIdsRef.current);
    if (!ids.size) return null;
    let workspaceNow = workspaceRef.current;
    let index = target;
    if (target < 0) {
      const names = platesWithAdded(workspaceNow);
      if (!names) {
        setNotice(t("plates.full", { max: MAX_BUILD_PLATES }), true);
        return null;
      }
      workspaceNow = { ...workspaceNow, plates: names };
      writePlates(names);
      index = names.length - 1;
      setWanted(true);
      setHidden(false);
    }
    const next = shapesMovedToPlate(workspaceNow, shapesRef.current, ids, index);
    commitShapes(next, [...ids], t("status.movedToPlate", { count: ids.size, plate: plateDisplayLabel(workspaceNow, index) }));
    activeRef.current = index;
    setActive(index);
    frame(index);
    return index;
  }, [commitShapes, frame, selectedIdsRef, setNotice, shapesRef, workspaceRef, writePlates]);

  /** "Arrange on plates": the selection, or every body, row by row onto the plates, adding plates as needed. */
  const arrange = useCallback((only?: readonly string[]) => {
    const workspaceNow = workspaceRef.current;
    const selection = only ? [...only] : selectedIdsRef.current;
    const ids = new Set(selection.length ? selection : shapesRef.current.map((shape) => shape.id));
    const packed = packOntoPlates(workspaceNow, shapesRef.current, ids, { round: roundPlate });
    const moved = ids.size - packed.leftOver.length;
    if (moved <= 0) {
      setNotice(t("status.platesArrangeNothing"), true);
      return { arranged: 0, plates: plateCount(workspaceNow), leftOver: packed.leftOver };
    }
    const names = Array.from({ length: packed.plateCount }, (_, index) => plateName(workspaceNow, index));
    if (packed.plateCount !== plateCount(workspaceNow)) writePlates(names);
    const leftOver = packed.leftOver.length ? ` ${t("status.platesArrangedLeftOver", { count: packed.leftOver.length })}` : "";
    commitShapes(packed.shapes, selection, t("status.platesArranged", { count: moved, plates: packed.plateCount }) + leftOver);
    setWanted(true);
    setHidden(false);
    frame(0, packed.plateCount - 1);
    return { arranged: moved, plates: packed.plateCount, leftOver: packed.leftOver };
  }, [commitShapes, frame, roundPlate, selectedIdsRef, setNotice, shapesRef, workspaceRef, writePlates]);

  const toggleBar = useCallback(() => {
    if (barOpen) {
      setHidden(true);
      setWanted(false);
    } else {
      setHidden(false);
      setWanted(true);
    }
  }, [barOpen]);

  /** Where a shape put in without a spot lands: the middle of the active plate, when the workplane is the plate. */
  const newShapeOrigin = useCallback((workplane: PlacementWorkplane): PlacementPoint => {
    if (!placementWorkplaneIsBase(workplane)) return workplane.origin;
    const index = Math.min(activeRef.current, plateCount(workspaceRef.current) - 1);
    return index > 0 ? { ...workplane.origin, x: workplane.origin.x + plateCenterX(workspaceRef.current, index) } : workplane.origin;
  }, [workspaceRef]);

  return {
    count,
    exportPlate: count > 1 ? exportPlate : "all" as const,
    setExportPlate,
    active,
    plates,
    barOpen,
    selectedCount,
    select,
    add,
    rename,
    move,
    remove,
    moveSelectionToPlate,
    arrange,
    toggleBar,
    closeBar: () => {
      setHidden(true);
      setWanted(false);
    },
    showAll: () => frame(0, count - 1),
    newShapeOrigin,
  };
}
