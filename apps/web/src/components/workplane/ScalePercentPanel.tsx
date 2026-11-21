"use client";

import { Check, X } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { t } from "@/lib/i18n";
import { formatLengthMm, formatMeasurementNumber, lengthDisplayUnit } from "@/lib/measurementUnits";
import { MODEL_SCALE_PRESETS, MODEL_SCALE_RATIO_MAX, MODEL_SCALE_RATIO_MIN, modelScalePercent, modelScalePercentInRange, type ModelScaleAxis } from "@/lib/modelScale";
import { isUnchangedPercent, SCALE_PERCENT_MAX, SCALE_PERCENT_MIN, type ScaleByPercentMode } from "@/lib/scaleByPercent";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

export type ScalePercentSettings = {
  percent: number;
  mode: ScaleByPercentMode;
  /** "percent": the percentage as typed. "scale": a model scale such as 1:87 works it out (forum, 3DVadda). */
  by: "percent" | "scale";
  /** The 87 of 1:87. */
  ratio: number;
  /** Whether the original's real size is given; without it the model counts as built at full size. */
  useRealSize: boolean;
  /** The original's real size along `axis`, in millimetres. */
  realSize: number;
  axis: ModelScaleAxis;
};

export const DEFAULT_SCALE_PERCENT_SETTINGS: ScalePercentSettings = {
  percent: 100,
  mode: "together",
  by: "percent",
  ratio: 87,
  useRealSize: false,
  realSize: 10_000,
  axis: "height",
};

type SelectionSize = { width: number; depth: number; height: number };

const MODES: readonly ScaleByPercentMode[] = ["together", "each"];
const BY: readonly ScalePercentSettings["by"][] = ["percent", "scale"];
const AXES: readonly ModelScaleAxis[] = ["height", "length"];

/** The percentage the window applies: the typed one, or the one a model scale works out. */
export function scalePercentToApply(settings: ScalePercentSettings, selectionSize: SelectionSize) {
  if (settings.by === "percent") return settings.percent;
  return modelScalePercent(settings.ratio, settings.useRealSize ? settings.realSize : null, selectionSize, settings.axis);
}

/** The original's size is typed in metres, or in feet with imperial units: nobody measures a tree in millimetres. */
function realSizeUnit(workspace: WorkplaneWorkspaceSettings) {
  return workspace.units === "Imperial" ? { label: "ft", millimetres: 304.8 } : { label: "m", millimetres: 1000 };
}

/** 87, 22.5: no trailing zeros. */
function formatRatio(ratio: number) {
  return String(Math.round(ratio * 100) / 100);
}

/**
 * Scaling the selection by a percentage, the same in every direction (#179). Several parts grow
 * together, as one, or each where it stands. Nothing changes until "Scale".
 */
export function ScalePercentPanel({
  targetName,
  count,
  selectionSize,
  settings,
  workspace,
  error,
  onChange,
  onApply,
  onCancel,
}: {
  targetName: string;
  count: number;
  /** The size of the box the selection takes up, in millimetres. */
  selectionSize: SelectionSize;
  settings: ScalePercentSettings;
  workspace: WorkplaneWorkspaceSettings;
  /** Why the last try did not go through, already in words. */
  error: string | null;
  onChange: (patch: Partial<ScalePercentSettings>) => void;
  /** With a percentage when Enter in the field applies it, before the state holds the typed value. */
  onApply: (percent?: number) => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("scalePercent.title");
  const percentToApply = scalePercentToApply(settings, selectionSize);
  const canApply = modelScalePercentInRange(percentToApply) && !isUnchangedPercent(percentToApply);
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel scale-percent-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("scalePercent.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="scaleByPercent" />
          <button type="button" aria-label={t("common.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        {settings.by === "percent" ? <span>{t("scalePercent.help")}</span> : null}
      </div>

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("scalePercent.by")}>
        <div className="shell-opening-options">
          {BY.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={settings.by === option}
              className={settings.by === option ? "active" : ""}
              title={t(`scalePercent.by.${option}Hint`)}
              onClick={() => onChange({ by: option })}
            >
              {t(`scalePercent.by.${option}`)}
            </button>
          ))}
        </div>
      </div>

      {settings.by === "percent" ? (
        <EdgeModifierSlider
          label={t("scalePercent.percent")}
          value={settings.percent}
          min={SCALE_PERCENT_MIN}
          max={SCALE_PERCENT_MAX}
          step={1}
          coarse={{ step: 1, max: 500 }}
          decimals={2}
          unit="%"
          workspace={workspace}
          autoFocus
          onEnter={(value) => { if (!isUnchangedPercent(value)) onApply(value); }}
          onChange={(value) => onChange({ percent: value })}
        />
      ) : (
        <ModelScaleFields settings={settings} selectionSize={selectionSize} workspace={workspace} onChange={onChange} onApply={onApply} />
      )}

      {count > 1 ? (
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("scalePercent.mode")}>
          <span>{t("scalePercent.mode")}</span>
          <div className="shell-opening-options">
            {MODES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={settings.mode === option}
                className={settings.mode === option ? "active" : ""}
                title={t(`scalePercent.mode.${option}Hint`)}
                onClick={() => onChange({ mode: option })}
              >
                {t(`scalePercent.mode.${option}`)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="edge-modifier-error" role="alert">{error}</p> : null}

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={!canApply} onClick={() => onApply(percentToApply)}>
          <Check size={17} />
          {t("scalePercent.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}

/** The model scale: the gauges, a scale of one's own, and the original's real size if the model is not at full size. */
function ModelScaleFields({
  settings,
  selectionSize,
  workspace,
  onChange,
  onApply,
}: {
  settings: ScalePercentSettings;
  selectionSize: SelectionSize;
  workspace: WorkplaneWorkspaceSettings;
  onChange: (patch: Partial<ScalePercentSettings>) => void;
  onApply: (percent?: number) => void;
}) {
  const real = realSizeUnit(workspace);
  const percent = scalePercentToApply(settings, selectionSize);
  const inRange = modelScalePercentInRange(percent);
  const unit = lengthDisplayUnit(workspace).label;
  const scaled = (value: number) => formatLengthMm(value * percent / 100, workspace.accuracy);
  // Enter in a field applies at once, with the value just typed (#760).
  const applyWith = (patch: Partial<ScalePercentSettings>) => {
    const next = scalePercentToApply({ ...settings, ...patch }, selectionSize);
    if (modelScalePercentInRange(next) && !isUnchangedPercent(next)) onApply(next);
  };
  return (
    <>
      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("scalePercent.scalePresets")}>
        <span>{t("scalePercent.scalePresets")}</span>
        <div className="shell-opening-options model-scale-presets">
          {MODEL_SCALE_PRESETS.map((preset) => {
            const active = Math.abs(settings.ratio - preset.ratio) < 1e-9;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={active ? "active" : ""}
                onClick={() => onChange({ ratio: preset.ratio })}
              >
                {preset.label} 1:{formatRatio(preset.ratio)}
              </button>
            );
          })}
        </div>
      </div>

      <EdgeModifierSlider
        label={t("scalePercent.ratio")}
        value={settings.ratio}
        min={MODEL_SCALE_RATIO_MIN}
        max={MODEL_SCALE_RATIO_MAX}
        step={1}
        coarse={{ step: 1, max: 250 }}
        decimals={2}
        workspace={workspace}
        autoFocus
        onEnter={(value) => applyWith({ ratio: value })}
        onChange={(value) => onChange({ ratio: value })}
      />

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("scalePercent.original")}>
        <span>{t("scalePercent.original")}</span>
        <div className="shell-opening-options">
          {[false, true].map((useRealSize) => (
            <button
              key={String(useRealSize)}
              type="button"
              role="radio"
              aria-checked={settings.useRealSize === useRealSize}
              className={settings.useRealSize === useRealSize ? "active" : ""}
              title={t(useRealSize ? "scalePercent.original.realSizeHint" : "scalePercent.original.fullSizeHint")}
              onClick={() => onChange({ useRealSize })}
            >
              {t(useRealSize ? "scalePercent.original.realSize" : "scalePercent.original.fullSize")}
            </button>
          ))}
        </div>
      </div>

      {settings.useRealSize ? (
        <>
          <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("scalePercent.axis")}>
            <span>{t("scalePercent.axis")}</span>
            <div className="shell-opening-options">
              {AXES.map((axis) => (
                <button
                  key={axis}
                  type="button"
                  role="radio"
                  aria-checked={settings.axis === axis}
                  className={settings.axis === axis ? "active" : ""}
                  title={t(`scalePercent.axis.${axis}Hint`)}
                  onClick={() => onChange({ axis })}
                >
                  {t(`scalePercent.axis.${axis}`)}
                </button>
              ))}
            </div>
          </div>
          <EdgeModifierSlider
            label={t("scalePercent.realSize")}
            value={settings.realSize / real.millimetres}
            min={0.001}
            max={100_000}
            step={0.5}
            coarse={{ step: 0.5, max: 50 }}
            decimals={3}
            unit={real.label}
            workspace={workspace}
            onEnter={(value) => applyWith({ realSize: value * real.millimetres })}
            onChange={(value) => onChange({ realSize: value * real.millimetres })}
          />
        </>
      ) : null}

      <p className="model-scale-result" aria-live="polite">
        {inRange
          ? t("scalePercent.scaleResult", {
            width: scaled(selectionSize.width),
            depth: scaled(selectionSize.depth),
            height: scaled(selectionSize.height),
            unit,
            percent: formatMeasurementNumber(percent, 2),
          })
          : t("scalePercent.errorPercent")}
      </p>
    </>
  );
}
