"use client";

import { Check, LoaderCircle, MousePointerClick, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWheelField } from "@/lib/useWheelField";
import { wheelBaseStep, wheelNextValue } from "@/lib/wheelValueStep";
import { displayStepFromMillimeters, displayToMillimeters, formatMeasurementNumber, lengthDisplayUnit, millimetersToDisplay, parseMeasurementInput } from "@/lib/measurementUnits";
import { SPLIT_AXIS_DISPLAY_ORDER, splitAxisLabel, splitRotationAxes, type SplitRotation } from "@/lib/modelSplit";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { t } from "@/lib/i18n";
import { fromPrinterPlay } from "@/lib/printerPlay";
import {
  MAX_CONNECTOR_CLEARANCE,
  MAX_CONNECTOR_COUNT,
  MAX_CONNECTOR_DEPTH,
  MAX_CONNECTOR_DIAMETER,
  MIN_CONNECTOR_DEPTH,
  MIN_CONNECTOR_DIAMETER,
  SPLIT_CONNECTOR_KINDS,
  type SplitConnectorOptions,
  type SplitConnectorTally,
} from "@/lib/splitConnectors";
import { useLanguage } from "@/lib/useLanguage";
import { usePrinterPlay } from "@/lib/usePrinterPlay";
import { selectWholeValue } from "@/lib/numberField";
import type { AlignAxis, WorkplaneWorkspaceSettings } from "@/types/layerling";

export type SplitWorkplaneDirection = "parallel" | "acrossX" | "acrossY";

const SPLIT_WORKPLANE_DIRECTIONS = [
  { direction: "parallel", label: "split.workplaneParallel", hint: "split.workplaneParallelHint" },
  { direction: "acrossX", label: "split.workplaneAcrossX", hint: "split.workplaneAcrossXHint" },
  { direction: "acrossY", label: "split.workplaneAcrossY", hint: "split.workplaneAcrossYHint" },
] as const satisfies ReadonlyArray<{ direction: SplitWorkplaneDirection; label: string; hint: string }>;

/**
 * Where the connectors would go, as the editor last worked it out for the plane and settings shown (Discussion #832):
 * nothing yet, being worked out, or what fits, with the middles the view marks on the plane.
 */
export type SplitConnectorPreviewState =
  | { state: "idle" }
  | { state: "working" }
  | { state: "done"; tally: SplitConnectorTally; holes: number; points: Array<[number, number, number]> };

/** What the panel says under the connectors' settings: how many fit and on how many cut faces, and why some got none. */
export function splitConnectorSummary(preview: SplitConnectorPreviewState): string[] {
  if (preview.state === "working") return [t("split.connectorsFinding")];
  if (preview.state !== "done") return [];
  const { tally, holes } = preview;
  const lines: string[] = [];
  if (tally.faces > 0 && tally.placed === 0) {
    lines.push(t("split.connectorsNoRoom"));
  } else if (tally.placed > 0) {
    lines.push(tally.faces === 1 ? t("split.connectorsFitOne", { count: tally.placed }) : t("split.connectorsFitMany", { count: tally.placed, faces: tally.faces }));
    if (tally.tooSmall === 1) lines.push(t("split.connectorsTooSmallOne"));
    else if (tally.tooSmall > 1) lines.push(t("split.connectorsTooSmallMany", { count: tally.tooSmall }));
  }
  if (tally.tooThin > 0) lines.push(t("split.connectorsTooThin", { count: tally.tooThin }));
  if (holes > 0) lines.push(t("split.connectorsHoles"));
  return lines;
}

export function SplitPanel({
  axis,
  rotation,
  position,
  min,
  max,
  targetCount,
  workspace,
  busy,
  error,
  picking,
  connectors,
  connectorPreview,
  onPickToggle,
  onAxisChange,
  onAlignToWorkplane,
  onRotationChange,
  onPositionChange,
  onConnectorsChange,
  onApply,
  onCancel,
}: {
  axis: AlignAxis;
  rotation: SplitRotation;
  position: number;
  min: number;
  max: number;
  targetCount: number;
  workspace: WorkplaneWorkspaceSettings;
  busy: boolean;
  error: string | null;
  /** The next click on a face moves the plane there. */
  picking: boolean;
  /** Dowels or plugs that line the halves up again, or none (Discussion #832). */
  connectors: SplitConnectorOptions;
  connectorPreview: SplitConnectorPreviewState;
  onPickToggle: () => void;
  onAxisChange: (axis: AlignAxis) => void;
  /** Lays the plane on the workplane, or square to it along its X or Y (#644). */
  onAlignToWorkplane: (direction: SplitWorkplaneDirection) => void;
  onRotationChange: (index: 0 | 1, rotation: number) => void;
  onPositionChange: (position: number) => void;
  onConnectorsChange: (patch: Partial<SplitConnectorOptions>) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  // The clearance says when it is still what the printer's play gave it (printerPlay.ts).
  const printerPlay = usePrinterPlay();
  // A cut across Y counts towards the back like the position fields (#182); inside it runs along z.
  const sign = axis === "z" ? -1 : 1;
  const displayPosition = millimetersToDisplay(sign * position, workspace) || 0;
  const displayMin = millimetersToDisplay(sign > 0 ? min : -max, workspace);
  const displayMax = millimetersToDisplay(sign > 0 ? max : -min, workspace);
  const displayStep = displayStepFromMillimeters(0.1, workspace);
  const unit = lengthDisplayUnit(workspace).label;
  const formattedPosition = formatMeasurementNumber(displayPosition, workspace.accuracy, displayStep);
  const rotationAxes = splitRotationAxes(axis);
  const [positionEditing, setPositionEditing] = useState(false);
  const [positionDraft, setPositionDraft] = useState(formattedPosition);
  const applyDisplayPosition = (value: number) => {
    if (Number.isFinite(value)) onPositionChange(sign * displayToMillimeters(value, workspace));
  };
  useEffect(() => {
    if (!positionEditing) setPositionDraft(formattedPosition);
  }, [formattedPosition, positionEditing]);
  // The mouse wheel in the clicked field (#536); what it wrote stays as it is when the field is left.
  const positionInputRef = useRef<HTMLInputElement>(null);
  const positionWheelShownRef = useRef<string | null>(null);
  useWheelField(positionInputRef, positionEditing && !busy, ({ direction, keys }) => {
    const parsed = parseMeasurementInput(positionDraft);
    const current = Number.isFinite(parsed) ? parsed : displayPosition;
    const next = Math.min(displayMax, Math.max(displayMin, wheelNextValue(current, direction, wheelBaseStep(displayMin, displayMax, displayStep, unit === "in"), keys)));
    const shown = formatMeasurementNumber(next, workspace.accuracy, displayStep);
    positionWheelShownRef.current = shown;
    setPositionDraft(shown);
    applyDisplayPosition(next);
  });
  const commitPositionDraft = () => {
    if (positionWheelShownRef.current !== null && positionDraft === positionWheelShownRef.current) {
      positionWheelShownRef.current = null;
      setPositionEditing(false);
      return;
    }
    positionWheelShownRef.current = null;
    const value = parseMeasurementInput(positionDraft);
    if (Number.isFinite(value)) applyDisplayPosition(value);
    setPositionEditing(false);
  };

  return (
    <MovableToolPanel className="split-panel" ariaLabel={t("split.title")} focusOnOpen>
      {(handleProps) => (<>
      <div className="split-panel-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong id="split-panel-title">{t("split.title")}</strong>
          <span>{t("split.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="splitting" />
          <button type="button" aria-label={t("split.cancelAria")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="split-panel-target">
        <strong>{targetCount === 1 ? t("split.targetOne") : t("split.targetMany", { count: targetCount })}</strong>
        <span>{t("split.targetHint")}</span>
      </div>

      <fieldset className="split-axis-control" disabled={busy}>
        <legend>{t("split.orientation")}</legend>
        <div>
          {SPLIT_AXIS_DISPLAY_ORDER.map((candidate) => (
            <button
              type="button"
              className={axis === candidate ? "active" : ""}
              aria-pressed={axis === candidate}
              key={candidate}
              onClick={() => onAxisChange(candidate)}
            >
              {splitAxisLabel(candidate)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="split-axis-control split-workplane-control" disabled={busy}>
        <legend>{t("split.workplane")}</legend>
        <div>
          {SPLIT_WORKPLANE_DIRECTIONS.map(({ direction, label, hint }) => (
            <button type="button" key={direction} title={t(hint)} onClick={() => onAlignToWorkplane(direction)}>
              {t(label)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="split-position-control">
        <span>
          <strong>{t("split.position")}</strong>
          <span className="split-position-value">
            <input
              ref={positionInputRef}
              type="text"
              inputMode="decimal"
              value={positionEditing ? positionDraft : formattedPosition}
              aria-label={t("split.positionAria")}
              aria-describedby="split-position-unit"
              disabled={busy}
              onFocus={(event) => {
                positionWheelShownRef.current = null;
                setPositionDraft(formattedPosition);
                setPositionEditing(true);
                selectWholeValue(event.currentTarget);
              }}
              onChange={(event) => {
                positionWheelShownRef.current = null;
                setPositionDraft(event.currentTarget.value);
              }}
              onBlur={commitPositionDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.blur();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setPositionDraft(formattedPosition);
                  setPositionEditing(false);
                }
              }}
            />
            <small id="split-position-unit">{unit}</small>
            <button
              type="button"
              className={`split-position-pick ${picking ? "active" : ""}`}
              aria-pressed={picking}
              aria-label={t("split.pickFace")}
              title={t("split.pickFaceHint")}
              disabled={busy}
              onClick={onPickToggle}
            >
              <MousePointerClick size={17} />
            </button>
          </span>
        </span>
        <input
          type="range"
          min={displayMin}
          max={displayMax}
          step={displayStep}
          value={displayPosition}
          aria-label={t("split.positionSliderAria")}
          aria-valuetext={t("split.positionValue", { value: formattedPosition, unit })}
          disabled={busy}
          onChange={(event) => applyDisplayPosition(event.currentTarget.valueAsNumber)}
        />
      </div>

      {rotationAxes.map((rotationAxis, index) => (
        <SplitRotationControl
          key={rotationAxis}
          axisLabel={splitAxisLabel(rotationAxis)}
          // A tilt about Y turns the right-handed way (#182): minus the inside turn about z.
          rotation={rotationAxis === "z" ? -rotation[index] || 0 : rotation[index]}
          busy={busy}
          onChange={(value) => onRotationChange(index as 0 | 1, rotationAxis === "z" ? -value || 0 : value)}
        />
      ))}

      <fieldset className="split-axis-control split-connector-control" disabled={busy}>
        <legend>{t("split.connectors")}</legend>
        <div>
          {SPLIT_CONNECTOR_KINDS.map((kind) => (
            <button
              type="button"
              className={connectors.kind === kind ? "active" : ""}
              aria-pressed={connectors.kind === kind}
              key={kind}
              title={t(`split.connectors.${kind}Hint`)}
              onClick={() => onConnectorsChange({ kind })}
            >
              {t(`split.connectors.${kind}`)}
            </button>
          ))}
        </div>
      </fieldset>
      {connectors.kind === "none" ? null : (<>
        <p className="split-panel-help">{t(`split.connectors.${connectors.kind}Hint`)}</p>
        <EdgeModifierSlider
          label={t("split.connectorCount")}
          value={connectors.count}
          min={0}
          max={MAX_CONNECTOR_COUNT}
          step={1}
          decimals={0}
          workspace={workspace}
          disabled={busy}
          onChange={(value) => onConnectorsChange({ count: value })}
        />
        <EdgeModifierSlider
          label={t("split.connectorDiameter")}
          value={connectors.diameter}
          min={MIN_CONNECTOR_DIAMETER}
          max={MAX_CONNECTOR_DIAMETER}
          step={0.5}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onConnectorsChange({ diameter: value })}
        />
        <EdgeModifierSlider
          label={t("split.connectorDepth")}
          value={connectors.depth}
          min={MIN_CONNECTOR_DEPTH}
          max={MAX_CONNECTOR_DEPTH}
          step={0.5}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onConnectorsChange({ depth: value })}
        />
        <EdgeModifierSlider
          label={t("split.connectorClearance")}
          value={connectors.clearance}
          min={0}
          max={MAX_CONNECTOR_CLEARANCE}
          step={0.05}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onConnectorsChange({ clearance: value })}
        />
        {fromPrinterPlay("split.connectorClearance", connectors.clearance, printerPlay) ? <span className="shell-openings-summary">{t("printerPlay.fromFitTest")}</span> : null}
        <div className="split-connector-summary" role="status">
          {splitConnectorSummary(connectorPreview).map((line) => <span key={line}>{line}</span>)}
        </div>
      </>)}

      <p className="split-panel-help">{t("split.help")}</p>
      {error ? <div className="split-panel-error" role="alert">{error}</div> : null}

      <div className="split-panel-footer">
        <button type="button" className="secondary" disabled={busy} onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={busy || max - min <= 0.0001} onClick={onApply}>
          {busy ? <LoaderCircle className="split-panel-spinner" size={17} /> : <Check size={17} />}
          {busy ? t("split.applying") : t("split.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}

function SplitRotationControl({
  axisLabel,
  rotation,
  busy,
  onChange,
}: {
  axisLabel: "X" | "Y" | "Z";
  rotation: number;
  busy: boolean;
  onChange: (rotation: number) => void;
}) {
  const formatted = String(Number(rotation.toFixed(2)));
  const unitId = `split-rotation-${axisLabel.toLowerCase()}-unit`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatted);
  useEffect(() => {
    if (!editing) setDraft(formatted);
  }, [formatted, editing]);
  // The mouse wheel in the clicked field (#536): a degree a notch, ten with Shift, a tenth with Ctrl.
  const inputRef = useRef<HTMLInputElement>(null);
  const wheelShownRef = useRef<string | null>(null);
  useWheelField(inputRef, editing && !busy, ({ direction, keys }) => {
    const parsed = parseMeasurementInput(draft);
    const next = Math.min(180, Math.max(-180, wheelNextValue(Number.isFinite(parsed) ? parsed : rotation, direction, 1, keys)));
    const shown = String(Number(next.toFixed(2)));
    wheelShownRef.current = shown;
    setDraft(shown);
    onChange(next);
  });
  const commitDraft = () => {
    if (wheelShownRef.current !== null && draft === wheelShownRef.current) {
      wheelShownRef.current = null;
      setEditing(false);
      return;
    }
    wheelShownRef.current = null;
    const value = parseMeasurementInput(draft);
    if (Number.isFinite(value)) onChange(value);
    setEditing(false);
  };

  return (
    <div className="split-position-control split-rotation-control">
      <span>
        <strong>{t("split.rotation", { axis: axisLabel })}</strong>
        <span className="split-position-value">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={editing ? draft : formatted}
            aria-label={t("split.rotationAria", { axis: axisLabel })}
            aria-describedby={unitId}
            disabled={busy}
            onFocus={(event) => {
              wheelShownRef.current = null;
              setDraft(formatted);
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
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setDraft(formatted);
                setEditing(false);
              }
            }}
          />
          <small id={unitId}>{t("split.degrees")}</small>
        </span>
      </span>
      <input
        type="range"
        min={-180}
        max={180}
        step={1}
        value={rotation}
        aria-label={t("split.rotationSliderAria", { axis: axisLabel })}
        aria-valuetext={t("split.rotationValue", { value: formatted, axis: axisLabel })}
        disabled={busy}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}
