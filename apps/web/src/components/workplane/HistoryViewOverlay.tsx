"use client";

import { ArchiveRestore, ChevronLeft, ChevronRight, CornerLeftUp, Download, FilePlus2, FolderOpen, ListOrdered, LoaderCircle, Pause, Play, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import type { EditorHistoryEntry } from "@/lib/editorHistory";
import type { HistoryStepDescription } from "@/lib/historyStepDescription";
import { formatHistoryBytes, historyFreedBytes, historyStepSizes, largestHistorySteps } from "@/lib/historyStepSizes";
import { historyStepText } from "@/lib/historyStepText";
import { HISTORY_PLAY_DELAYS, historyKeyTarget, historyPlayNext, historyPlayStart, historyWheelSteps, type HistoryPlayDirection, type HistoryPlaySpeed } from "@/lib/historyStepping";
import { numberLocale, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";

/**
 * Die Leiste sitzt unten in der Mitte und laesst sich an der Kopfzeile ueber die
 * Arbeitsflaeche ziehen, wenn sie etwas verdeckt; ein Doppelklick darauf holt
 * sie zurueck.
 */
const HISTORY_BAR: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto", margin: 0 },
  area: (panel) => panel.ownerDocument.querySelector<HTMLElement>(".workplane-stage"),
};

/** Whether the list of steps is open, kept for the next time the view opens (#1023). */
const STEP_LIST_STORAGE_KEY = "layerling.editor.historyViewList";

/** Has the list of steps open the next time the view opens: the note that a stored copy kept fewer steps leads there (#1728). */
export function requestHistoryStepList() {
  try {
    window.localStorage.setItem(STEP_LIST_STORAGE_KEY, "true");
  } catch {
    // The view opens without the list then.
  }
}

/** A step that frees less than this shows no size in the list, so the list stays calm. */
const STEP_SIZE_SHOWN_BYTES = 10 * 1024;

function readStepListOpen() {
  try {
    return window.localStorage.getItem(STEP_LIST_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** The speed of playing, kept for the next time the view opens (#1210). */
const PLAY_SPEED_STORAGE_KEY = "layerling.editor.historyViewSpeed";

function readPlaySpeed(): HistoryPlaySpeed {
  try {
    const stored = window.localStorage.getItem(PLAY_SPEED_STORAGE_KEY);
    if (stored === "slow" || stored === "normal" || stored === "fast") return stored;
  } catch {
    // Not read then; the normal speed.
  }
  return "normal";
}

/**
 * Wann ein Stand entstanden ist, in der Sprache der Oberflaeche. Staende aus
 * Projekten von vor dieser Angabe haben keine Zeit; dann steht hier nichts.
 */
export function formatHistoryStateTime(at: number | undefined, language: string) {
  if (typeof at !== "number" || !Number.isFinite(at)) return null;
  try {
    return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(at));
  } catch {
    return new Date(at).toLocaleString();
  }
}

/**
 * Der Zusatz, den ein Projekt oder eine Datei aus einem frueheren Stand im
 * Namen traegt: die Zeit des Standes, lesbar und ohne Zeichen, die ein
 * Dateiname nicht mag. Ohne Zeit gibt es keinen Zusatz - dann heisst die
 * Kopie wie jede andere Kopie.
 */
export function historyStateNameSuffix(at: number | undefined) {
  if (typeof at !== "number" || !Number.isFinite(at)) return null;
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}.${pad(date.getMinutes())}`;
}

/**
 * Die Leiste des Verlaufsblicks. Sie liegt unten ueber der Arbeitsflaeche, die
 * derweil den gewaehlten Stand zeigt; der Schieber geht durch alle Staende, die
 * Rueckgaengig und Wiederherstellen erreichen. Nichts hier aendert das Projekt:
 * Was man mitnehmen will, wird ein neues Projekt oder ein Export.
 */
export function HistoryViewOverlay({
  index,
  count,
  liveIndex,
  recordedAt,
  objectCount,
  lastStep,
  nextStep,
  describeStep,
  accuracy = 2,
  creating,
  canCreateProject,
  pickedCount,
  onBringBack,
  openGroups,
  canOpenGroup,
  onOpenGroup,
  onBackOut,
  onIndexChange,
  onExport,
  onCreateProject,
  onDeleteHistory,
  entries,
  onDeleteSteps,
  onClose,
}: {
  /** Der gezeigte Stand, 0 ist der aelteste. */
  index: number;
  count: number;
  /** Der Stand, an dem das Projekt wirklich steht. */
  liveIndex: number;
  recordedAt?: number;
  objectCount: number;
  /** What the left arrow would undo: the step that led to the state shown; null at the oldest state. */
  lastStep: HistoryStepDescription | null;
  /** What the right arrow would redo: the step after the state shown; null at the newest state. */
  nextStep: HistoryStepDescription | null;
  /** The step that led to the state at `index` (the start at 0), for the list of steps; read only while the list is open. */
  describeStep: (index: number) => HistoryStepDescription;
  /** Decimal places for the measures of the steps, as the workspace shows them. */
  accuracy?: number;
  creating: boolean;
  canCreateProject: boolean;
  /** How many objects of the shown state are picked to bring back. */
  pickedCount: number;
  /** Adds copies of the picked objects to the design, as they were in this state. */
  onBringBack: () => void;
  /** The names of the groups opened to look inside, outermost first. */
  openGroups: string[];
  /** Whether exactly one group is picked, which Open group opens. */
  canOpenGroup: boolean;
  /** Lays out the parts of the picked group to pick from; nothing changes. */
  onOpenGroup: () => void;
  /** Closes the innermost open group again. */
  onBackOut: () => void;
  onIndexChange: (index: number) => void;
  onExport: () => void;
  onCreateProject: () => void;
  /** Wirft den ganzen Verlauf weg; der Entwurf behaelt seinen jetzigen Stand (#246). */
  onDeleteHistory: () => void;
  /** The states of the history, to count what each takes; read only while the list is open. */
  entries: readonly EditorHistoryEntry[];
  /** Deletes single states; the one the design stands at stays. */
  onDeleteSteps: (indices: number[]) => void;
  onClose: () => void;
}) {
  const language = useLanguage();
  const movable = useMovablePanel<HTMLElement>("layerling.editor.historyViewPosition", HISTORY_BAR);
  const sliderRef = useRef<HTMLInputElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Single steps to delete, with what they free together, while the question is open.
  const [confirmingSteps, setConfirmingSteps] = useState<{ indices: number[]; bytes: number } | null>(null);
  useEffect(() => {
    sliderRef.current?.focus({ preventScroll: true });
  }, []);
  const max = Math.max(0, count - 1);
  const position = max > 0 ? `${(index / max) * 100}%` : "100%";
  const time = formatHistoryStateTime(recordedAt, language);
  const lastText = lastStep ? historyStepText(lastStep, accuracy) : t("historyView.lastStepNone");
  const nextText = nextStep ? historyStepText(nextStep, accuracy) : t("historyView.nextStepNone");
  const distance = index - liveIndex;

  // Playing the history like a film (#1210): the state shown changes by itself, one at a time,
  // forwards or backwards, until the end; any other way of changing the state stops it.
  const [playing, setPlaying] = useState<HistoryPlayDirection>(0);
  const [speed, setSpeed] = useState<HistoryPlaySpeed>(readPlaySpeed);
  const playedIndexRef = useRef<number | null>(null);
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;
  const startPlaying = (direction: -1 | 1) => {
    if (playing === direction) {
      setPlaying(0);
      return;
    }
    const start = historyPlayStart(index, max, direction);
    playedIndexRef.current = start;
    if (start !== index) onIndexChangeRef.current(start);
    setPlaying(direction);
  };
  useEffect(() => {
    if (playing === 0) return;
    if (playedIndexRef.current !== index) {
      // The slider, the keys, the wheel or the list moved it: that is the viewer taking over.
      setPlaying(0);
      return;
    }
    const target = historyPlayNext(index, max, playing);
    if (target === null) {
      setPlaying(0);
      return;
    }
    const timer = window.setTimeout(() => {
      playedIndexRef.current = target;
      onIndexChangeRef.current(target);
    }, HISTORY_PLAY_DELAYS[speed]);
    return () => window.clearTimeout(timer);
  }, [playing, index, max, speed]);
  const changeSpeed = (next: HistoryPlaySpeed) => {
    setSpeed(next);
    try {
      window.localStorage.setItem(PLAY_SPEED_STORAGE_KEY, next);
    } catch {
      // Not kept then; the speed still changes.
    }
  };

  // The steps as a list, newest at the top, to jump to any of them with one click (#1023).
  // Reading a step compares two states, so they are read only while the list is open.
  const [listOpen, setListOpen] = useState(readStepListOpen);
  const toggleList = () => {
    const next = !listOpen;
    setListOpen(next);
    try {
      window.localStorage.setItem(STEP_LIST_STORAGE_KEY, String(next));
    } catch {
      // Not kept then; the list still opens.
    }
  };
  const listTexts = useMemo(
    () => (listOpen ? Array.from({ length: count }, (_, state) => historyStepText(describeStep(state), accuracy)) : []),
    [listOpen, count, describeStep, accuracy],
  );
  // What each step would free and the whole history takes, counted like the stored design (meshes once).
  const sizes = useMemo(() => (listOpen ? historyStepSizes(entries) : null), [listOpen, entries]);
  const largest = useMemo(() => (sizes ? largestHistorySteps(sizes, liveIndex) : []), [sizes, liveIndex]);
  const sizeText = (bytes: number) => formatHistoryBytes(bytes, numberLocale(language));
  const askDeleteSteps = (indices: number[]) => {
    setConfirmingDelete(false);
    setConfirmingSteps({ indices, bytes: historyFreedBytes(entries, indices) });
  };
  // A question about steps that have moved on is no longer the one answered.
  useEffect(() => setConfirmingSteps(null), [entries]);
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>("[aria-current='step']")?.scrollIntoView({ block: "nearest" });
  }, [index, listOpen]);

  // The mouse wheel over the slider steps through the states, one per notch, up to an
  // earlier one (#688). Not a React handler: that one is passive and the page would scroll.
  const wheelAreaRef = useRef<HTMLDivElement>(null);
  const wheelStateRef = useRef({ index, max, carry: 0, onIndexChange });
  wheelStateRef.current.index = index;
  wheelStateRef.current.max = max;
  wheelStateRef.current.onIndexChange = onIndexChange;
  useEffect(() => {
    const area = wheelAreaRef.current;
    if (!area) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      const state = wheelStateRef.current;
      const { steps, carry } = historyWheelSteps(state.carry, event.deltaY, event.deltaMode);
      state.carry = carry;
      if (steps === 0) return;
      const target = Math.min(state.max, Math.max(0, state.index + steps));
      // At either end the rest is dropped, so turning back answers at once.
      if (target === state.index) {
        state.carry = 0;
        return;
      }
      state.index = target;
      state.onIndexChange(target);
    };
    area.addEventListener("wheel", onWheel, { passive: false });
    return () => area.removeEventListener("wheel", onWheel);
  }, []);
  const relation = distance === 0
    ? t("historyView.atCurrent")
    : distance < 0
      ? (distance === -1 ? t("historyView.stepsBackOne") : t("historyView.stepsBackMany", { count: -distance }))
      : (distance === 1 ? t("historyView.stepsAheadOne") : t("historyView.stepsAheadMany", { count: distance }));

  return (
    <aside
      ref={movable.panelRef}
      className={`history-view-bar ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      role="region"
      aria-label={t("historyView.title")}
      data-testid="history-view"
      onKeyDown={(event) => {
        // Der Schieber hat den Fokus, und die Tastatur des Editors ueberhoert
        // Felder - Escape muss also hier ankommen, sonst schliesst nur die Maus.
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        } else if (!event.ctrlKey && !event.metaKey && !event.altKey && historyKeyTarget(event.key, index, max, liveIndex) !== null) {
          // Page Up/Down jump ten states, Home and End to the oldest and the current one (#688).
          event.preventDefault();
          event.stopPropagation();
          const target = historyKeyTarget(event.key, index, max, liveIndex);
          if (target !== null && target !== index) onIndexChange(target);
        } else if ((event.key ?? "").toLowerCase() === "e" && !event.ctrlKey && !event.metaKey && !event.altKey && canOpenGroup) {
          // E opens the selected group, as in the design.
          event.preventDefault();
          event.stopPropagation();
          onOpenGroup();
        }
      }}
    >
      <div className="history-view-head movable" title={t("panel.moveHint")} {...movable.handleProps}>
        <div className="history-view-heading">
          <strong>{t("historyView.title")}</strong>
          <span>{t("historyView.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <button
            type="button"
            className={listOpen ? "active" : ""}
            aria-pressed={listOpen}
            aria-label={listOpen ? t("historyView.listHide") : t("historyView.listShow")}
            title={listOpen ? t("historyView.listHide") : t("historyView.listShow")}
            data-testid="history-view-list-toggle"
            onClick={toggleList}
          >
            <ListOrdered size={18} />
          </button>
          <GuideHelpLink section="historyView" />
          <button type="button" aria-label={t("historyView.close")} title={t("historyView.close")} onClick={onClose}><X size={20} /></button>
        </div>
      </div>

      {listOpen && sizes ? (
        <div className="history-view-list-head" data-testid="history-view-list-head">
          <span title={t("historyView.totalSizeHint")}>{t("historyView.totalSize", { size: sizeText(sizes.total) })}</span>
          <button
            type="button"
            className="secondary"
            disabled={largest.length === 0}
            title={largest.length === 0 ? t("historyView.deleteLargestNothing") : t("historyView.deleteLargestHint")}
            data-testid="history-view-delete-largest"
            onClick={() => askDeleteSteps(largest)}
          >
            <Trash2 size={14} aria-hidden="true" />
            {largest.length > 0 ? t("historyView.deleteLargestCount", { count: largest.length }) : t("historyView.deleteLargest")}
          </button>
        </div>
      ) : null}

      {listOpen ? (
        <ol className="history-view-list" ref={listRef} aria-label={t("historyView.list")} data-testid="history-view-list">
          {listTexts.map((text, state) => ({ text, state })).reverse().map(({ text, state }) => {
            const own = sizes?.own[state] ?? 0;
            const live = state === liveIndex;
            return (
              <li key={state}>
                <button
                  type="button"
                  className={`${state === index ? "shown" : ""} ${state > liveIndex ? "ahead" : ""}`}
                  aria-current={state === index ? "step" : undefined}
                  title={text}
                  onClick={() => onIndexChange(state)}
                >
                  <span className="history-view-list-number">{state + 1}</span>
                  <span className="history-view-list-text">{text}</span>
                  {live ? <span className="history-view-list-now">{t("historyView.listNow")}</span> : null}
                  {own >= STEP_SIZE_SHOWN_BYTES ? (
                    <span className="history-view-list-size" title={t("historyView.stepSizeHint", { size: sizeText(own) })}>{sizeText(own)}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="history-view-list-delete"
                  disabled={live || count <= 1}
                  aria-label={t("historyView.stepDelete", { number: state + 1 })}
                  title={live ? t("historyView.stepDeleteNow") : t("historyView.stepDelete", { number: state + 1 })}
                  data-testid="history-view-step-delete"
                  onClick={() => askDeleteSteps([state])}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="history-view-slider" ref={wheelAreaRef}>
        <button type="button" aria-label={t("historyView.earlier")} title={t("historyView.earlier")} disabled={index <= 0} onClick={() => onIndexChange(index - 1)}>
          <ChevronLeft size={18} />
        </button>
        <div className="range-control" style={{ "--slider-pos": position } as CSSProperties}>
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={max}
            step={1}
            value={index}
            aria-label={t("historyView.slider")}
            aria-valuetext={t("historyView.position", { index: index + 1, count })}
            onChange={(event) => onIndexChange(Number(event.currentTarget.value))}
          />
        </div>
        <button type="button" aria-label={t("historyView.later")} title={t("historyView.later")} disabled={index >= max} onClick={() => onIndexChange(index + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="history-view-play" data-testid="history-view-play">
        <button
          type="button"
          className={playing < 0 ? "active" : ""}
          aria-pressed={playing < 0}
          aria-label={playing < 0 ? t("historyView.pause") : t("historyView.playBackwards")}
          title={playing < 0 ? t("historyView.pause") : t("historyView.playBackwards")}
          data-testid="history-view-play-backwards"
          onClick={() => startPlaying(-1)}
        >
          {playing < 0 ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" style={{ transform: "scaleX(-1)" }} />}
        </button>
        <button
          type="button"
          className={playing > 0 ? "active" : ""}
          aria-pressed={playing > 0}
          aria-label={playing > 0 ? t("historyView.pause") : t("historyView.playForwards")}
          title={playing > 0 ? t("historyView.pause") : t("historyView.playForwards")}
          data-testid="history-view-play-forwards"
          onClick={() => startPlaying(1)}
        >
          {playing > 0 ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>
        <label>
          <span>{t("historyView.speed")}</span>
          <select value={speed} data-testid="history-view-speed" onChange={(event) => changeSpeed(event.currentTarget.value as HistoryPlaySpeed)}>
            <option value="slow">{t("historyView.speedSlow")}</option>
            <option value="normal">{t("historyView.speedNormal")}</option>
            <option value="fast">{t("historyView.speedFast")}</option>
          </select>
        </label>
      </div>

      <div className="history-view-steps" data-testid="history-view-steps">
        <span className={`history-view-step last ${lastStep ? "" : "none"}`} title={lastText}>
          <ChevronLeft size={14} aria-hidden="true" />
          <span className="history-view-step-label">{t("historyView.lastStep")}:</span>
          <span className="history-view-step-text" data-testid="history-view-last-step">{lastText}</span>
        </span>
        <span className={`history-view-step next ${nextStep ? "" : "none"}`} title={nextText}>
          <span className="history-view-step-label">{t("historyView.nextStep")}:</span>
          <span className="history-view-step-text" data-testid="history-view-next-step">{nextText}</span>
          <ChevronRight size={14} aria-hidden="true" />
        </span>
      </div>

      <div className="history-view-state">
        <strong>{t("historyView.position", { index: index + 1, count })}</strong>
        <span className="history-view-facts">
          {time ? <span>{time}</span> : null}
          <span>{objectCount === 1 ? t("historyView.objectsOne") : t("historyView.objectsMany", { count: objectCount })}</span>
          <span className={distance === 0 ? "current" : ""}>{relation}</span>
        </span>
      </div>

      {openGroups.length ? (
        <div className="history-view-inside" data-testid="history-view-inside">
          <FolderOpen size={16} aria-hidden="true" />
          <span>{t("historyView.inside", { path: openGroups.join(" › ") })}</span>
          <button type="button" className="secondary" title={t("historyView.backOutHint")} onClick={onBackOut}>
            <CornerLeftUp size={16} aria-hidden="true" />
            {t("historyView.backOut")}
          </button>
        </div>
      ) : null}

      {confirmingSteps ? (
        <div className="history-view-confirm" role="alertdialog" aria-labelledby="history-delete-steps-title" aria-describedby="history-delete-steps-body" data-testid="history-view-confirm-steps">
          <strong id="history-delete-steps-title">
            {confirmingSteps.indices.length === 1
              ? t("historyView.deleteStepTitle", { number: confirmingSteps.indices[0] + 1 })
              : t("historyView.deleteStepsTitle", { count: confirmingSteps.indices.length })}
          </strong>
          <p id="history-delete-steps-body">
            {t(confirmingSteps.indices.length === 1 ? "historyView.deleteStepBody" : "historyView.deleteStepsBody", { size: sizeText(confirmingSteps.bytes) })}
          </p>
          <div className="history-view-confirm-actions">
            {/* Focused, so a stray Enter keeps the steps. */}
            <button type="button" className="secondary" autoFocus onClick={() => setConfirmingSteps(null)}>{t("common.cancel")}</button>
            <button
              type="button"
              className="danger"
              data-testid="history-view-confirm-steps-delete"
              onClick={() => {
                const indices = confirmingSteps.indices;
                setConfirmingSteps(null);
                onDeleteSteps(indices);
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              {t("historyView.deleteStepsConfirm")}
            </button>
          </div>
        </div>
      ) : null}

      {confirmingDelete ? (
        <div className="history-view-confirm" role="alertdialog" aria-labelledby="history-delete-title" aria-describedby="history-delete-body">
          <strong id="history-delete-title">{t("historyView.deleteTitle")}</strong>
          <p id="history-delete-body">{t("historyView.deleteBody")}</p>
          <div className="history-view-confirm-actions">
            {/* Focused, so a stray Enter keeps the history. */}
            <button type="button" className="secondary" autoFocus onClick={() => setConfirmingDelete(false)}>{t("common.cancel")}</button>
            <button type="button" className="danger" onClick={onDeleteHistory}>
              <Trash2 size={16} aria-hidden="true" />
              {t("historyView.deleteConfirm")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="history-view-actions">
        {/* Alone at the left, away from the buttons that take something along. */}
        <button type="button" className="delete-history" disabled={confirmingDelete || count <= 1} title={count <= 1 ? t("historyView.deleteNothing") : t("historyView.deleteHint")} onClick={() => {
          setConfirmingSteps(null);
          setConfirmingDelete(true);
        }}>
          <Trash2 size={16} aria-hidden="true" />
          {t("historyView.delete")}
        </button>
        <button type="button" className="secondary" disabled={!canOpenGroup} title={canOpenGroup ? t("historyView.openGroupHint") : t("historyView.openGroupNothing")} data-testid="history-view-open-group" onClick={onOpenGroup}>
          <FolderOpen size={16} aria-hidden="true" />
          {t("historyView.openGroup")} (E)
        </button>
        <button type="button" className="secondary" disabled={pickedCount === 0} title={pickedCount === 0 ? t("historyView.bringBackNothing") : t("historyView.bringBackHint")} data-testid="history-view-bring-back" onClick={onBringBack}>
          <ArchiveRestore size={16} aria-hidden="true" />
          {pickedCount > 1 ? t("historyView.bringBackMany", { count: pickedCount }) : t("historyView.bringBack")}
        </button>
        <button type="button" className="secondary" onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          {t("historyView.export")}
        </button>
        <button type="button" className="primary" disabled={creating || !canCreateProject} title={canCreateProject ? undefined : t("status.historyProjectUnavailable")} onClick={onCreateProject}>
          {creating ? <LoaderCircle size={16} className="history-view-spinner" aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
          {t("historyView.createProject")}
        </button>
      </div>
    </aside>
  );
}
