"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check, LoaderCircle, Minus, Plus, RotateCcw, X } from "lucide-react";
import { displayStepFromMillimeters, displayToMillimeters, formatMeasurementNumber, lengthDisplayUnit, millimetersToDisplay, parseMeasurementInput } from "@/lib/measurementUnits";
import type { CadModifierKind, CadModifierQuality } from "@/lib/cadModifierTypes";
import { CAD_MODIFIER_MAX_SHARP_ANGLE, cadModifierUserErrorMessage, edgeModifierSelectionStatus } from "@/lib/cadModifierRuntime";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";
import { selectWholeValue } from "@/lib/numberField";

const MIN_EDGE_MODIFIER_AMOUNT = 0.001;
const EDGE_MODIFIER_AMOUNT_STEP = 0.001;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatSliderValue(value: number, accuracy: WorkplaneWorkspaceSettings["accuracy"], step: number) {
  if (step >= 1) return String(Math.round(value));
  return formatMeasurementNumber(value, accuracy, step);
}

type EdgeHistoryOption = {
  id: string;
  label: string;
  kind: CadModifierKind;
  amount: number;
  edgeCount: number;
  targetName: string;
  removesNewerCount: number;
};

/** Der gespeicherte Text ist englisch - fuer die Tafel wird er neu gesetzt. */
function edgeHistoryLabel(option: EdgeHistoryOption) {
  const size = String(Number(option.amount.toFixed(2)));
  if (option.edgeCount === 1) {
    return t(option.kind === "fillet" ? "edge.revertFilletOne" : "edge.revertChamferOne", { size });
  }
  return t(option.kind === "fillet" ? "edge.revertFilletMany" : "edge.revertChamferMany", { size, count: option.edgeCount });
}

function EdgeModifierSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  workspace,
  length = false,
  disabled = false,
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
  onChange: (value: number) => void;
}) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Math.max(safeMin, Number.isFinite(max) ? max : safeMin);
  const actualValue = Number.isFinite(value) ? value : safeMin;
  const controlValue = length ? millimetersToDisplay(actualValue, workspace) : actualValue;
  const controlMin = length ? millimetersToDisplay(safeMin, workspace) : safeMin;
  const controlMax = length ? millimetersToDisplay(safeMax, workspace) : safeMax;
  const controlStep = length ? displayStepFromMillimeters(step, workspace) : step;
  const sliderValue = clamp(controlValue, controlMin, controlMax);
  const position = ((sliderValue - controlMin) / Math.max(Number.EPSILON, controlMax - controlMin)) * 100;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatSliderValue(controlValue, workspace.accuracy, controlStep));
  const unitLabel = length ? lengthDisplayUnit(workspace).label : unit;

  useEffect(() => {
    if (!editing) {
      setDraft(formatSliderValue(controlValue, workspace.accuracy, controlStep));
    }
  }, [controlStep, controlValue, editing, workspace.accuracy]);

  const toModelValue = (nextValue: number) => length ? displayToMillimeters(nextValue, workspace) : nextValue;

  const commitDraft = () => {
    const next = parseMeasurementInput(draft);
    const finiteNext = Number.isFinite(next) ? next : controlValue;
    onChange(clamp(toModelValue(finiteNext), safeMin, safeMax));
    setEditing(false);
  };

  const handleSliderChange = (nextValue: number) => {
    const next = clamp(Number.isFinite(nextValue) ? nextValue : controlMin, controlMin, controlMax);
    onChange(clamp(toModelValue(next), safeMin, safeMax));
    setDraft(formatSliderValue(next, workspace.accuracy, controlStep));
  };

  return (
    <label className="edge-modifier-field edge-modifier-slider range-property" style={{ "--slider-pos": `${position}%` } as CSSProperties}>
      <span className="range-property-header">
        <span className="range-property-name">{label}</span>
        <span className="range-value-control">
          <input
            type="text"
            value={editing ? draft : formatSliderValue(controlValue, workspace.accuracy, controlStep)}
            inputMode="decimal"
            disabled={disabled}
            onFocus={(event) => {
              setDraft(formatSliderValue(controlValue, workspace.accuracy, controlStep));
              setEditing(true);
              selectWholeValue(event.currentTarget);
            }}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setDraft(formatSliderValue(controlValue, workspace.accuracy, controlStep));
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
          min={controlMin}
          max={controlMax}
          step={controlStep}
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
  onAmountChange,
  onChamferAngleChange,
  onQualityChange,
  onSharpAngleChange,
  onTangentChainChange,
  onPreserveEdgeSizeChange,
  onSelectAll,
  onClear,
  onRemoveFeature,
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
  onAmountChange: (value: number) => void;
  onChamferAngleChange: (value: number) => void;
  onQualityChange: (value: CadModifierQuality) => void;
  onSharpAngleChange: (value: number) => void;
  onTangentChainChange: (value: boolean) => void;
  onPreserveEdgeSizeChange: (value: boolean) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onRemoveFeature: (id: string) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const [historyOpen, setHistoryOpen] = useState(false);
  const title = kind === "fillet" ? t("edge.filletTitle") : t("edge.chamferTitle");
  const amountMin = Math.min(MIN_EDGE_MODIFIER_AMOUNT, Math.max(Number.EPSILON, maxAmount));
  const amountMax = Math.max(amountMin, maxAmount);
  return (
    <aside className="edge-modifier-panel" aria-label={title}>
      <div className="edge-modifier-header">
        <div>
          <strong>{title}</strong>
          <span>{edgeModifierSelectionStatus(prepared, selectedCount, availableCount)}</span>
        </div>
        <button type="button" aria-label={kind === "fillet" ? t("edge.cancelFillet") : t("edge.cancelChamfer")} onClick={onCancel}><X size={20} /></button>
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

      <div className="edge-modifier-quick-actions">
        <button type="button" disabled={!prepared} onClick={onSelectAll}>{t("edge.allSharpEdges")}</button>
        <button type="button" disabled={!prepared} onClick={onClear}>{t("edge.clear")}</button>
      </div>

      {appliedFeatureCount > 0 ? (
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
                <button className="edge-modifier-history-item" type="button" key={option.id} onClick={() => onRemoveFeature(option.id)}>
                  <RotateCcw size={14} />
                  <span>
                    <strong>{`${t("edge.revertAction")}: ${edgeHistoryLabel(option)}`}</strong>
                    <small>{option.targetName}</small>
                    {option.removesNewerCount > 0 ? (
                      <small className="edge-modifier-history-warning">{t("edge.alsoRemovesNewer", { count: option.removesNewerCount })}</small>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <EdgeModifierSlider
        label={kind === "fillet" ? t("edge.radius") : t("edge.distance")}
        value={amount}
        min={amountMin}
        max={amountMax}
        step={EDGE_MODIFIER_AMOUNT_STEP}
        workspace={workspace}
        length
        disabled={!prepared}
        onChange={onAmountChange}
      />

      {kind === "chamfer" ? <EdgeModifierSlider label={t("edge.angle")} value={chamferAngle} min={5} max={85} step={1} unit="°" workspace={workspace} disabled={!prepared} onChange={onChamferAngleChange} /> : null}

      <EdgeModifierSlider label={t("edge.sharpThreshold")} value={sharpAngle} min={1} max={CAD_MODIFIER_MAX_SHARP_ANGLE} step={1} unit="°" workspace={workspace} disabled={!prepared} onChange={onSharpAngleChange} />

      <label className="edge-modifier-check">
        <input type="checkbox" checked={tangentChain} disabled={!prepared} onChange={(event) => onTangentChainChange(event.currentTarget.checked)} />
        <span>{t("edge.tangentChains")}</span>
      </label>

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

      {error ? <div className="edge-modifier-error" role="alert">{cadModifierUserErrorMessage(error)}</div> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={!prepared || busy || selectedCount === 0 || Boolean(error)} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {t("edge.apply")}
        </button>
      </div>
    </aside>
  );
}
