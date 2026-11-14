import { historyStateAt, type EditorHistoryEntry, type ResolvedHistoryState } from "@/lib/editorHistory";
import { historyStatePartsTree } from "@/lib/historyRestore";
import { historyFreedBytes, historyStepSizes } from "@/lib/historyStepSizes";
import { describeHistoryStep, historyStepsAround, type HistoryStepDescription, type OpenGroupCount } from "@/lib/historyStepDescription";
import { historyStepTextIn } from "@/lib/historyStepText";
import type { WorkplaneShape } from "@/types/layerling";

/** What the History commands of the MCP bridge need from the editor. */
export type HistoryViewMcpContext = {
  entries: () => EditorHistoryEntry[];
  /** The state the design is at. */
  current: () => number;
  /** The state the History view shows, or null while it is closed. */
  showing: () => ResolvedHistoryState | null;
  openView: () => void;
  closeView: () => void;
  showState: (index: number) => void;
  /** Whether a drag or another action is still under way. */
  busy: () => boolean;
  /** Deletes the whole history; returns how many steps went. */
  clearHistory: () => number;
  /** Deletes single states (never the current one); returns how many went. */
  deleteSteps: (indices: readonly number[]) => number;
  bringBack: (index: number, ids: readonly string[]) => WorkplaneShape[];
  openGroups: OpenGroupCount;
  summary: (shape: WorkplaneShape) => unknown;
};

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** A step in English, as AI tools read it whatever language the editor shows. */
function stepText(step: HistoryStepDescription | null) {
  return step ? historyStepTextIn("en", step) : null;
}

/** What undo and redo would take back or bring again from the design's own state (#1023). */
function undoRedoSteps(context: HistoryViewMcpContext) {
  const steps = historyStepsAround(context.entries(), context.current(), context.openGroups);
  return { undoStep: stepText(steps.last), redoStep: stepText(steps.next) };
}

/** Every state with the step that led to it, as the History view's list shows them (#1023); only when asked, since each compares two states. */
function stepList(context: HistoryViewMcpContext, params: Record<string, unknown>) {
  if (params.steps !== true) return {};
  const entries = context.entries();
  // What deleting each state alone would free, counted as the stored design keeps it (a shared mesh once).
  const sizes = historyStepSizes(entries);
  return {
    historyBytes: sizes.total,
    steps: entries.map((entry, index) => ({ index, step: stepText(describeHistoryStep(entries[index - 1], entry, context.openGroups)), freesBytes: sizes.own[index] })),
  };
}

/**
 * Runs `clear_history`, `delete_history_steps`, `set_history_view` and `restore_from_history`.
 * Returns undefined for any other action, which the editor runs itself.
 */
export function historyViewMcpCommand(action: string, params: Record<string, unknown>, context: HistoryViewMcpContext): unknown {
  if (action === "clear_history") {
    if (params.confirm !== true) throw new Error("clear_history deletes every undo step for good; pass confirm: true to do it");
    const removed = context.clearHistory();
    return { cleared: true, removedSteps: removed, states: context.entries().length };
  }

  if (action === "delete_history_steps") {
    const entries = context.entries();
    const raw = Array.isArray(params.steps) ? params.steps : [];
    const steps = raw.filter((value): value is number => typeof value === "number" && Number.isInteger(value));
    if (steps.length === 0) throw new Error("Give the indexes of the states to delete in `steps` (layerling_set_history_view with steps: true lists them)");
    const outside = steps.filter((index) => index < 0 || index >= entries.length);
    if (outside.length) throw new Error(`There is no state ${outside.join(", ")}; the history has states 0 to ${entries.length - 1}`);
    if (steps.includes(context.current())) throw new Error(`State ${context.current()} is the one the design stands at and cannot be deleted`);
    if (params.confirm !== true) throw new Error("delete_history_steps removes these states for good; pass confirm: true to do it");
    if (context.busy()) throw new Error("Finish the current action before deleting history steps");
    const freesBytes = historyFreedBytes(entries, steps);
    const removed = context.deleteSteps(steps);
    return { removedSteps: removed, freedBytes: freesBytes, states: context.entries().length, current: context.current() };
  }

  if (action === "set_history_view") {
    const entries = context.entries();
    const showing = context.showing();
    if (params.open === false) {
      if (showing) context.closeView();
      return { open: false, states: entries.length, current: context.current(), ...undoRedoSteps(context), ...stepList(context, params) };
    }
    if (params.open === undefined && params.index === undefined) {
      return showing
        ? { open: true, index: showing.index, states: entries.length, current: context.current(), recordedAt: showing.entry.at ?? null, shapeCount: showing.shapes.length, ...undoRedoSteps(context), ...stepList(context, params) }
        : { open: false, states: entries.length, current: context.current(), ...undoRedoSteps(context), ...stepList(context, params) };
    }
    if (entries.length <= 1) throw new Error("There is no earlier state to look at yet");
    if (!showing) {
      if (context.busy()) throw new Error("Finish the current action before opening the history view");
      context.openView();
    }
    const requested = params.index === undefined ? context.current() : Math.round(finiteNumber(params.index, context.current()));
    const state = historyStateAt(entries, requested);
    if (!state) throw new Error("There is no earlier state to look at yet");
    context.showState(state.index);
    const steps = historyStepsAround(entries, state.index, context.openGroups);
    return {
      open: true,
      index: state.index,
      states: entries.length,
      current: context.current(),
      recordedAt: state.entry.at ?? null,
      lastStep: stepText(steps.last),
      nextStep: stepText(steps.next),
      ...undoRedoSteps(context),
      ...stepList(context, params),
      shapeCount: state.shapes.length,
      objects: state.shapes.map((shape) => ({ id: shape.id, name: shape.name, kind: shape.kind, x: shape.x, z: shape.z, width: shape.width, depth: shape.depth, height: shape.height, hidden: Boolean(shape.hidden), ...historyStatePartsTree(shape) })),
    };
  }

  if (action === "restore_from_history") {
    const entries = context.entries();
    if (params.index === undefined) throw new Error("Give the index of the state to bring objects back from (layerling_set_history_view lists the states)");
    const index = Math.round(finiteNumber(params.index, -1));
    if (index < 0 || index >= entries.length) throw new Error(`There is no state ${index}; the history has states 0 to ${entries.length - 1}`);
    const ids = Array.isArray(params.ids) ? params.ids.filter((id): id is string => typeof id === "string") : [];
    if (ids.length === 0) throw new Error("Give the ids of the objects to bring back, as layerling_set_history_view lists them for that state");
    if (context.busy()) throw new Error("Finish the current action before bringing objects back");
    const copies = context.bringBack(index, ids);
    if (copies.length === 0) throw new Error(`State ${index} holds none of these objects: ${ids.join(", ")}`);
    return { broughtBack: copies.map(context.summary), states: context.entries().length, current: context.current() };
  }

  return undefined;
}
