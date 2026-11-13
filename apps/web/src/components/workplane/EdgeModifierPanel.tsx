"use client";

import { getEditorProfile } from "@/lib/editorProfile";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, LoaderCircle, Minus, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { displayStepFromMillimeters, displayToMillimeters, formatMeasurementNumber, lengthDisplayUnit, millimetersToDisplay, parseMeasurementInput } from "@/lib/measurementUnits";
import type { CadModifierKind, CadModifierQuality } from "@/lib/cadModifierTypes";
import { CAD_MODIFIER_MAX_SHARP_ANGLE, cadModifierUserErrorMessage, edgeModifierSelectionStatus } from "@/lib/cadModifierRuntime";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { EdgeTreatmentFeature, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { selectWholeValue } from "@/lib/numberField";
import { useWheelField } from "@/lib/useWheelField";
import { wheelBaseStep, wheelNextValue } from "@/lib/wheelValueStep";

const MIN_EDGE_MODIFIER_AMOUNT = 0.001;
const EDGE_MODIFIER_AMOUNT_STEP = 0.001;
/** The slider of the distance or radius moves in tenths of a millimetre and goes to 10 mm; larger values are typed. */
const EDGE_MODIFIER_SLIDER_STEP = 0.1;
const EDGE_MODIFIER_SLIDER_MAX = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatSliderValue(value: number, accuracy: WorkplaneWorkspaceSettings["accuracy"], step: number, decimals?: number) {
  // A field that keeps decimals shows them only where the value has them: 102.5, but 120 (#817).
  if (decimals !== undefined) return String(Math.round(value * 10 ** decimals) / 10 ** decimals);
  if (step >= 1) return String(Math.round(value));
  return formatMeasurementNumber(value, accuracy, step);
}

export type EdgeHistoryOption = {
  id: string;
  label: string;
  kind: EdgeTreatmentFeature["kind"];
  amount: number;
  /** Only for a variable fillet (#687): the radius at the edge's end. */
  endAmount?: number;
  /** Only for a concave fillet (#1160). */
  concave?: boolean;
  edgeCount: number;
  /** Only for a deletion of faces. */
  faceCount?: number;
  targetName: string;
  removesNewerCount: number;
  /** Opens the tool again with the value and edges it had. */
  editable: boolean;
};

/** Der gespeicherte Text ist englisch - fuer die Tafel wird er neu gesetzt. */
function edgeHistoryLabel(option: EdgeHistoryOption) {
  const size = option.endAmount !== undefined
    ? `${Number(option.amount.toFixed(2))}–${Number(option.endAmount.toFixed(2))}`
    : String(Number(option.amount.toFixed(2)));
  if (option.kind === "shell") return t("edge.revertShell", { size });
  if (option.kind === "offset") return t("edge.revertOffset", { size });
  if (option.kind === "surfaceTexture") return t("edge.revertSurfaceTexture", { size });
  if (option.kind === "deleteFace") {
    return option.faceCount === 1 ? t("edge.revertDeleteFaceOne") : t("edge.revertDeleteFaceMany", { count: option.faceCount ?? 0 });
  }
  if (option.kind === "fillet" && option.concave) {
    return option.edgeCount === 1 ? t("edge.revertConcaveOne", { size }) : t("edge.revertConcaveMany", { size, count: option.edgeCount });
  }
  if (option.edgeCount === 1) {
    return t(option.kind === "fillet" ? "edge.revertFilletOne" : option.kind === "chamfillet" ? "edge.revertChamfilletOne" : "edge.revertChamferOne", { size });
  }
  return t(option.kind === "fillet" ? "edge.revertFilletMany" : option.kind === "chamfillet" ? "edge.revertChamfilletMany" : "edge.revertChamferMany", { size, count: option.edgeCount });
}

/**
 * The treatments a body already has - fillets, chamfers, hollowing, deleted faces - with "Revert" for each and
 * "Edit" where the tool can be opened again with the same values (#227). The fillet and chamfer
 * tool, the hollow tool and Delete face show the same list (#237).
 */
/**
 * Whether the list was open when it was last left. Taking a feature back opens the tool again on the restored body, which
 * builds the panel anew, and a list that shut itself after every click made taking back several in a row a chore (#517).
 */
let historyListWasOpen = false;

export function EdgeFeatureHistory({
  appliedFeatureCount,
  reversibleFeatureCount,
  historyOptions,
  onRemoveFeature,
  onEditFeature,
}: {
  appliedFeatureCount: number;
  reversibleFeatureCount: number;
  historyOptions: EdgeHistoryOption[];
  onRemoveFeature: (id: string) => void;
  onEditFeature?: (id: string) => void;
}) {
  const [historyOpen, setHistoryOpenState] = useState(historyListWasOpen);
  const setHistoryOpen = (update: (open: boolean) => boolean) => {
    setHistoryOpenState((open) => {
      const next = update(open);
      historyListWasOpen = next;
      return next;
    });
  };
  if (appliedFeatureCount === 0) return null;
  return (
    <div className="edge-modifier-history-actions">
      <button
        className="edge-modifier-history-toggle"
        type="button"
        aria-expanded={historyOpen}
        disabled={reversibleFeatureCount === 0}
        onClick={() => setHistoryOpen((open) => !open)}
      >
        {historyOpen ? <Minus size={15} /> : <Plus size={15} />}
        <span>{t("edge.featureHistory")}</span>
      </button>
      {reversibleFeatureCount === 0 ? <span>{t("edge.noStoredHistory")}</span> : null}
      {historyOpen && historyOptions.length > 0 ? (
        <div className="edge-modifier-history-list">
          <p className="edge-modifier-history-hint">{t("edge.revertHint")}</p>
          {historyOptions.map((option) => (
            <div className="edge-modifier-history-row" key={option.id}>
              <button className="edge-modifier-history-item" type="button" onClick={() => onRemoveFeature(option.id)}>
                <RotateCcw size={14} />
                <span>
                  <strong>{`${t("edge.revertAction")}: ${edgeHistoryLabel(option)}`}</strong>
                  <small>{option.targetName}</small>
                  {option.removesNewerCount > 0 ? (
                    <small className="edge-modifier-history-warning">{t("edge.alsoRemovesNewer", { count: option.removesNewerCount })}</small>
                  ) : null}
                </span>
              </button>
              {option.editable && onEditFeature ? (
                <button className="edge-modifier-history-edit" type="button" title={t("edge.editHint")} onClick={() => onEditFeature(option.id)}>
                  <Pencil size={14} />
                  <span>{t("edge.editAction")}</span>
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EdgeModifierSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  workspace,
  length = false,
  disabled = false,
  coarse,
  autoFocus = false,
  decimals,
  onEnter,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  workspace: WorkplaneWorkspaceSettings;
  length?: boolean;
  disabled?: boolean;
  /**
   * The slider moves in these larger steps and goes only as far as `max`, in millimetres for a length, while the field
   * still takes the exact value and anything up to the full range: a slider of 3,000 steps gives crooked values (forum, DrJones).
   */
  coarse?: { step: number; max: number };
  /** The field takes the focus when it appears, so a tool opened from the keyboard can be typed into at once (#760). */
  autoFocus?: boolean;
  /** The field keeps and shows up to this many decimals while the slider moves in `step`; without it a step of 1 shows whole numbers. */
  decimals?: number;
  /** Enter takes the typed value and then calls this with it, for a window that applies on Enter (#760). */
  onEnter?: (value: number) => void;
  onChange: (value: number) => void;
}) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Math.max(safeMin, Number.isFinite(max) ? max : safeMin);
  const actualValue = Number.isFinite(value) ? value : safeMin;
  const controlValue = length ? millimetersToDisplay(actualValue, workspace) : actualValue;
  const controlMin = length ? millimetersToDisplay(safeMin, workspace) : safeMin;
  const controlMax = length ? millimetersToDisplay(safeMax, workspace) : safeMax;
  const controlStep = length ? displayStepFromMillimeters(step, workspace) : step;
  // The slider's own range: counted from 0 in coarse steps, so its values are whole steps (0.1, 0.2 ...), not 0.001 + n * 0.1.
  const rangeMin = coarse ? 0 : controlMin;
  const rangeMax = coarse ? Math.max(controlMin, Math.min(controlMax, length ? millimetersToDisplay(coarse.max, workspace) : coarse.max)) : controlMax;
  const rangeStep = coarse ? (length ? displayStepFromMillimeters(coarse.step, workspace) : coarse.step) : controlStep;
  const sliderValue = clamp(controlValue, rangeMin, rangeMax);
  const position = ((sliderValue - rangeMin) / Math.max(Number.EPSILON, rangeMax - rangeMin)) * 100;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatSliderValue(controlValue, workspace.accuracy, controlStep, decimals));
  const unitLabel = length ? lengthDisplayUnit(workspace).label : unit;

  useEffect(() => {
    if (!editing) {
      setDraft(formatSliderValue(controlValue, workspace.accuracy, controlStep, decimals));
    }
  }, [controlStep, controlValue, editing, workspace.accuracy]);

  const toModelValue = (nextValue: number) => length ? displayToMillimeters(nextValue, workspace) : nextValue;

  // The mouse wheel in the clicked field (#536). What the wheel wrote stays as it is when the field is left, so
  // the rounded reading does not replace the exact value.
  const numberInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) numberInputRef.current?.focus();
  }, [autoFocus]);
  const wheelShownRef = useRef<string | null>(null);
  useWheelField(numberInputRef, editing && !disabled, ({ direction, keys }) => {
    const parsed = parseMeasurementInput(draft);
    const current = Number.isFinite(parsed) ? parsed : controlValue;
    const next = clamp(wheelNextValue(current, direction, wheelBaseStep(controlMin, controlMax, controlStep, length && unitLabel === "in"), keys), controlMin, controlMax);
    const shown = formatSliderValue(next, workspace.accuracy, controlStep, decimals);
    wheelShownRef.current = shown;
    setDraft(shown);
    onChange(clamp(toModelValue(next), safeMin, safeMax));
  });

  const commitDraft = () => {
    if (wheelShownRef.current !== null && draft === wheelShownRef.current) {
      wheelShownRef.current = null;
      setEditing(false);
      return;
    }
    wheelShownRef.current = null;
    const next = parseMeasurementInput(draft);
    const finiteNext = Number.isFinite(next) ? next : controlValue;
    const committed = clamp(toModelValue(finiteNext), safeMin, safeMax);
    // Leaving the field without a change is no change: reporting it threw the preview
    // away and nothing computed a new one, so Apply spun for good (#204).
    if (Math.abs(committed - actualValue) > 1e-9) onChange(committed);
    setEditing(false);
  };

  const handleSliderChange = (nextValue: number) => {
    const next = clamp(Number.isFinite(nextValue) ? nextValue : controlMin, controlMin, controlMax);
    onChange(clamp(toModelValue(next), safeMin, safeMax));
    setDraft(formatSliderValue(next, workspace.accuracy, controlStep, decimals));
  };

  return (
    <label className="edge-modifier-field edge-modifier-slider range-property" style={{ "--slider-pos": `${position}%` } as CSSProperties}>
      <span className="range-property-header">
        <span className="range-property-name">{label}</span>
        <span className="range-value-control">
          <input
            ref={numberInputRef}
            type="text"
            value={editing ? draft : formatSliderValue(controlValue, workspace.accuracy, controlStep, decimals)}
            inputMode="decimal"
            disabled={disabled}
            onFocus={(event) => {
              wheelShownRef.current = null;
              setDraft(formatSliderValue(controlValue, workspace.accuracy, controlStep, decimals));
              setEditing(true);
              selectWholeValue(event.currentTarget);
            }}
            onChange={(event) => {
              wheelShownRef.current = null;
              setDraft(event.currentTarget.value);
            }}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                // What the field holds now, as commitDraft will take it (a wheel step is already in the value).
                const typed = parseMeasurementInput(draft);
                const entered = wheelShownRef.current !== null && draft === wheelShownRef.current || !Number.isFinite(typed)
                  ? actualValue
                  : clamp(toModelValue(typed), safeMin, safeMax);
                event.currentTarget.blur();
                onEnter?.(entered);
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setDraft(formatSliderValue(controlValue, workspace.accuracy, controlStep, decimals));
                setEditing(false);
              }
            }}
          />
          {unitLabel ? <span className={`range-value-unit${unitLabel === "°" ? " degree" : ""}`}>{unitLabel}</span> : null}
        </span>
      </span>
      <div className="range-control">
        <input
          type="range"
          min={rangeMin}
          max={rangeMax}
          step={rangeStep}
          value={sliderValue}
          disabled={disabled}
          onChange={(event) => handleSliderChange(Number(event.currentTarget.value))}
        />
      </div>
    </label>
  );
}

export function EdgeModifierPanel({
  kind,
  amount,
  maxAmount,
  chamferAngle,
  quality,
  sharpAngle,
  workspace,
  tangentChain,
  onlyVisibleEdges,
  impliedEdgeCount = 0,
  preserveEdgeSize,
  targetName,
  groupedCount,
  appliedFeatureCount,
  reversibleFeatureCount,
  historyOptions,
  selectedCount,
  availableCount,
  busy,
  prepared,
  error,
  sizeRefused = false,
  searchingLargest = false,
  onFindLargest,
  onAmountChange,
  endAmount = null,
  concave = false,
  onConcaveChange,
  onEndAmountChange,
  onSwapEnds,
  onChamferAngleChange,
  onKindChange,
  onQualityChange,
  onSharpAngleChange,
  onTangentChainChange,
  onOnlyVisibleEdgesChange,
  onPreserveEdgeSizeChange,
  onSelectAll,
  onSelectTop,
  onSelectBottom,
  onSelectVertical,
  onSelectHorizontal,
  activeQuickSelection = [],
  onClear,
  onRemoveFeature,
  onEditFeature,
  onApply,
  onCancel,
}: {
  kind: CadModifierKind;
  amount: number;
  maxAmount: number;
  chamferAngle: number;
  quality: CadModifierQuality;
  sharpAngle: number;
  workspace: WorkplaneWorkspaceSettings;
  tangentChain: boolean;
  /** Hide the edges the body covers from this view instead of drawing them through it. */
  onlyVisibleEdges: boolean;
  /** Edges the kernel will treat as well, because they run on smoothly from a picked one (#161). */
  impliedEdgeCount?: number;
  preserveEdgeSize: boolean;
  targetName: string;
  groupedCount: number;
  appliedFeatureCount: number;
  reversibleFeatureCount: number;
  historyOptions: EdgeHistoryOption[];
  selectedCount: number;
  availableCount: number;
  busy: boolean;
  prepared: boolean;
  error: string | null;
  /** The error stands because the size was refused: offer the search for the largest size that fits (#1635). */
  sizeRefused?: boolean;
  searchingLargest?: boolean;
  onFindLargest?: () => void;
  onAmountChange: (value: number) => void;
  /** A fillet whose radius changes along its one edge (#687): the radius at the edge's end, null for one radius. */
  endAmount?: number | null;
  /** null switches the variable radius off; NaN switches it on at a starting value. */
  onEndAmountChange?: (value: number | null) => void;
  /** A fillet that scoops the edge out instead of rounding it (#1160). */
  concave?: boolean;
  onConcaveChange?: (value: boolean) => void;
  onSwapEnds?: () => void;
  onChamferAngleChange: (value: number) => void;
  onKindChange?: (kind: "chamfer" | "chamfillet") => void;
  onQualityChange: (value: CadModifierQuality) => void;
  onSharpAngleChange: (value: number) => void;
  onTangentChainChange: (value: boolean) => void;
  onOnlyVisibleEdgesChange: (value: boolean) => void;
  onPreserveEdgeSizeChange: (value: boolean) => void;
  onSelectAll: () => void;
  /** Picks only the edges along the very top, e.g. the rim of a cookie cutter (#154). */
  /** The quick buttons: a click picks their edges, Shift, Ctrl or Cmd with the click adds them to the ones picked (#538). */
  onSelectTop?: (add: boolean) => void;
  onSelectBottom?: (add: boolean) => void;
  onSelectVertical?: (add: boolean) => void;
  onSelectHorizontal?: (add: boolean) => void;
  /** Which of the quick buttons made the edges picked now, to light it up (#517). */
  activeQuickSelection?: ReadonlyArray<"all" | "top" | "bottom" | "vertical" | "horizontal">;
  onClear: () => void;
  onRemoveFeature: (id: string) => void;
  /** Takes a treatment back and opens the tool again with its value and edges (#227). */
  onEditFeature?: (id: string) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const onlyVisibleEdgesOption = kind === "fillet" ? getEditorProfile()?.tools.fillet?.options?.onlyVisibleEdges : undefined;
  useLanguage();
  const title = kind === "fillet" ? t("edge.filletTitle") : kind === "chamfillet" ? t("edge.chamfilletTitle") : t("edge.chamferTitle");
  const amountMin = Math.min(MIN_EDGE_MODIFIER_AMOUNT, Math.max(Number.EPSILON, maxAmount));
  const amountMax = Math.max(amountMin, maxAmount);
  const variable = kind === "fillet" && endAmount !== null;
  // On a short screen the panel scrolls, and the error sits at its foot under
  // the buttons: bring the whole bottom into view whenever a message appears.
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = errorRef.current?.closest<HTMLElement>(".edge-modifier-panel");
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [error]);
  return (
    <MovableToolPanel className="edge-modifier-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{edgeModifierSelectionStatus(prepared, selectedCount, availableCount)}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="edgeTreatment" />
          <button type="button" aria-label={kind === "fillet" ? t("edge.cancelFillet") : t("edge.cancelChamfer")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className={`edge-modifier-target ${groupedCount > 0 ? "grouped" : ""}`}>
        <strong>{targetName}</strong>
        <span>
          {groupedCount > 0 ? t("edge.groupedObjects", { count: groupedCount }) : t("edge.singleObject")}
          {appliedFeatureCount === 0
            ? ""
            : appliedFeatureCount === 1
              ? t("edge.existingFeatureOne")
              : t("edge.existingFeatureMany", { count: appliedFeatureCount })}
        </span>
      </div>

      <div className="edge-modifier-selection-help">
        {!prepared ? t("edge.loading") : busy ? t("edge.previewBusy") : t("edge.selectionHelp")}
      </div>

      <div className="edge-modifier-quick-actions" title={t("edge.quickAddHint")}>
        <button type="button" className={activeQuickSelection.includes("all") ? "active" : ""} aria-pressed={activeQuickSelection.includes("all")} disabled={!prepared} onClick={onSelectAll}>{t("edge.allSharpEdges")}</button>
        {onSelectTop ? <button type="button" className={activeQuickSelection.includes("top") ? "active" : ""} aria-pressed={activeQuickSelection.includes("top")} disabled={!prepared} title={t("edge.topEdgesHint")} onClick={(event) => onSelectTop(event.shiftKey || event.ctrlKey || event.metaKey)}>{t("edge.topEdges")}</button> : null}
        {onSelectBottom ? <button type="button" className={activeQuickSelection.includes("bottom") ? "active" : ""} aria-pressed={activeQuickSelection.includes("bottom")} disabled={!prepared} title={t("edge.bottomEdgesHint")} onClick={(event) => onSelectBottom(event.shiftKey || event.ctrlKey || event.metaKey)}>{t("edge.bottomEdges")}</button> : null}
        {onSelectVertical ? <button type="button" className={activeQuickSelection.includes("vertical") ? "active" : ""} aria-pressed={activeQuickSelection.includes("vertical")} disabled={!prepared} title={t("edge.verticalEdgesHint")} onClick={(event) => onSelectVertical(event.shiftKey || event.ctrlKey || event.metaKey)}>{t("edge.verticalEdges")}</button> : null}
        {onSelectHorizontal ? <button type="button" className={activeQuickSelection.includes("horizontal") ? "active" : ""} aria-pressed={activeQuickSelection.includes("horizontal")} disabled={!prepared} title={t("edge.horizontalEdgesHint")} onClick={(event) => onSelectHorizontal(event.shiftKey || event.ctrlKey || event.metaKey)}>{t("edge.horizontalEdges")}</button> : null}
        <button type="button" disabled={!prepared} onClick={onClear}>{t("edge.clear")}</button>
      </div>

      <EdgeFeatureHistory
        appliedFeatureCount={appliedFeatureCount}
        reversibleFeatureCount={reversibleFeatureCount}
        historyOptions={historyOptions}
        onRemoveFeature={onRemoveFeature}
        onEditFeature={onEditFeature}
      />

      {(kind === "chamfer" || kind === "chamfillet") && onKindChange ? (
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("edge.chamferTitle")}>
          <div className="shell-opening-options">
            <button
              type="button"
              role="radio"
              aria-checked={kind === "chamfer"}
              className={kind === "chamfer" ? "active" : ""}
              disabled={!prepared}
              onClick={() => onKindChange("chamfer")}
            >
              {t("editor.tool.chamfer")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={kind === "chamfillet"}
              className={kind === "chamfillet" ? "active" : ""}
              disabled={!prepared}
              title={t("edge.chamfilletHint")}
              onClick={() => onKindChange("chamfillet")}
            >
              {t("edge.chamfillet")}
            </button>
          </div>
          {kind === "chamfillet" ? <span className="shell-openings-summary">{t("edge.chamfilletHint")}</span> : null}
        </div>
      ) : null}

      {kind === "fillet" && onConcaveChange ? (
        <label className="edge-modifier-check" title={t("edge.concaveHint")}>
          <input type="checkbox" checked={concave} disabled={!prepared} onChange={(event) => onConcaveChange(event.currentTarget.checked)} />
          <span>{t("edge.concave")}</span>
        </label>
      ) : null}

      {kind === "fillet" && onEndAmountChange && !concave ? (
        <label className="edge-modifier-check" title={t("edge.variableRadiusHint")}>
          <input type="checkbox" checked={variable} disabled={!prepared} onChange={(event) => onEndAmountChange(event.currentTarget.checked ? Number.NaN : null)} />
          <span>{t("edge.variableRadius")}</span>
        </label>
      ) : null}

      <EdgeModifierSlider
        label={kind === "fillet" ? t(variable ? "edge.radiusStart" : "edge.radius") : t("edge.distance")}
        value={amount}
        min={amountMin}
        max={amountMax}
        step={EDGE_MODIFIER_AMOUNT_STEP}
        coarse={{ step: lengthDisplayUnit(workspace).label === "in" ? 25.4 / 64 : EDGE_MODIFIER_SLIDER_STEP, max: EDGE_MODIFIER_SLIDER_MAX }}
        workspace={workspace}
        length
        disabled={!prepared || searchingLargest}
        onChange={onAmountChange}
      />

      {variable && onEndAmountChange ? (
        <>
          <EdgeModifierSlider
            label={t("edge.radiusEnd")}
            value={endAmount ?? amount}
            min={amountMin}
            max={amountMax}
            step={EDGE_MODIFIER_AMOUNT_STEP}
            coarse={{ step: lengthDisplayUnit(workspace).label === "in" ? 25.4 / 64 : EDGE_MODIFIER_SLIDER_STEP, max: EDGE_MODIFIER_SLIDER_MAX }}
            workspace={workspace}
            length
            disabled={!prepared}
            onChange={onEndAmountChange}
          />
          <div className="edge-modifier-quick-actions">
            <button type="button" disabled={!prepared || !onSwapEnds} title={t("edge.swapEndsHint")} onClick={onSwapEnds}>{t("edge.swapEnds")}</button>
          </div>
          {selectedCount > 1 ? <p className="edge-modifier-note" role="note">{t("edge.variableOneEdge")}</p> : null}
        </>
      ) : null}

      {kind === "chamfer" || kind === "chamfillet" ? <EdgeModifierSlider label={t("edge.angle")} value={chamferAngle} min={kind === "chamfillet" ? 15 : 5} max={kind === "chamfillet" ? 75 : 85} step={1} unit="°" workspace={workspace} disabled={!prepared} onChange={onChamferAngleChange} /> : null}

      <EdgeModifierSlider label={t("edge.sharpThreshold")} value={sharpAngle} min={1} max={CAD_MODIFIER_MAX_SHARP_ANGLE} step={1} unit="°" workspace={workspace} disabled={!prepared} onChange={onSharpAngleChange} />

      {onlyVisibleEdgesOption?.visible !== false ? (
        <label className="edge-modifier-check" title={t("edge.onlyVisibleEdgesHint")}>
          <input type="checkbox" checked={onlyVisibleEdges} disabled={!prepared || onlyVisibleEdgesOption?.locked} onChange={(event) => onOnlyVisibleEdgesChange(event.currentTarget.checked)} />
          <span>{t("edge.onlyVisibleEdges")}</span>
        </label>
      ) : null}

      <label className="edge-modifier-check" title={t("edge.tangentChainsHint")}>
        <input type="checkbox" checked={tangentChain} disabled={!prepared} onChange={(event) => onTangentChainChange(event.currentTarget.checked)} />
        <span>{t("edge.tangentChains")}</span>
      </label>
      {impliedEdgeCount > 0 ? (
        // The kernel always carries a chamfer or fillet on along edges that continue smoothly;
        // the switch above only decides what a click picks, so say what will happen (#161).
        <p className="edge-modifier-note" role="note">
          {t(impliedEdgeCount === 1 ? "edge.tangentImpliedOne" : "edge.tangentImpliedMany", { count: impliedEdgeCount })}
        </p>
      ) : null}

      <label className="edge-modifier-check">
        <input type="checkbox" checked={preserveEdgeSize} disabled={!prepared} onChange={(event) => onPreserveEdgeSizeChange(event.currentTarget.checked)} />
        <span>{t("edge.keepSize")}</span>
      </label>

      <label className="edge-modifier-field">
        <span>{t("edge.previewQuality")}</span>
        <select value={quality} disabled={!prepared} onChange={(event) => onQualityChange(event.currentTarget.value as CadModifierQuality)}>
          <option value="draft">{t("edge.draft")}</option>
          <option value="standard">{t("edge.standard")}</option>
          <option value="fine">{t("edge.fine")}</option>
        </select>
      </label>

      {error ? <div ref={errorRef} className="edge-modifier-error" role="alert">{cadModifierUserErrorMessage(error)}</div> : null}
      {(error && sizeRefused || searchingLargest) && onFindLargest ? (
        <div className="edge-modifier-quick-actions">
          <button type="button" disabled={!prepared || searchingLargest} title={t("edge.findLargestHint")} onClick={onFindLargest}>
            {searchingLargest ? <LoaderCircle className="edge-modifier-spinner" size={15} /> : null}
            {t(searchingLargest ? "edge.findLargestBusy" : "edge.findLargest")}
          </button>
        </div>
      ) : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t(selectedCount === 0 && !busy ? "edge.done" : "common.cancel")}</button>
        <button type="button" className="primary" disabled={!prepared || busy || searchingLargest || selectedCount === 0 || Boolean(error)} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {t("edge.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
