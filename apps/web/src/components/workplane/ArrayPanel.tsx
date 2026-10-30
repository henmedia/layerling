"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { ARRAY_MAX_COUNT, ARRAY_MIN_COUNT, arrayGroupsCopies, type ArrayMode, type ArraySettings } from "@/lib/shapeArray";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

const ARRAY_MODES: readonly ArrayMode[] = ["row", "circle"];
/** Spread the row over a body along X or Y, or not (null). */
const FIT_OPTIONS = [null, "x", "y"] as const;
const MAX_SPACING = 300;
const MAX_SPIRAL_STEP = 100;
/** The row steps along all three axes at once; each has its own spacing. */
const ROW_AXES = [
  { key: "spacingX", label: "array.spacingX" },
  { key: "spacingY", label: "array.spacingY" },
  { key: "spacingZ", label: "array.spacingZ" },
] as const;

/**
 * Repeating the selection n times in a row or around a circle. The copies
 * show on the workplane while the numbers change and only land in the design
 * with "Create".
 */
export function ArrayPanel({
  targetName,
  settings,
  workspace,
  pivotSet,
  fitBody,
  fitGap,
  fitGapMax,
  onFitGap,
  onChange,
  onApply,
  onCancel,
}: {
  targetName: string;
  /** With a fit to a body already worked out into the spacings. */
  settings: ArraySettings;
  workspace: WorkplaneWorkspaceSettings;
  /** A rotation pivot is set - the circle centre was taken from it. */
  pivotSet: boolean;
  /** The body the row can be spread over (#1037): the one chosen, or else the one under the pieces; none, no choice. */
  fitBody: { id: string; name: string } | null;
  /** The pieces' gap to the body's nearer end along the chosen axis, while the row is spread over it. */
  fitGap: number | null;
  fitGapMax: number;
  /** Moves the originals so their gap to the nearer end is this. */
  onFitGap: (gap: number) => void;
  onChange: (patch: Partial<ArraySettings>) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("array.title");
  const halfPlate = Math.max(workspace.width, workspace.depth) / 2;
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel array-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("array.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="pattern" />
          <button type="button" aria-label={t("array.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span>{t(settings.mode === "row" ? "array.helpRow" : pivotSet ? "array.helpCirclePivot" : "array.helpCircle")}</span>
      </div>

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("array.mode")}>
        <span>{t("array.mode")}</span>
        <div className="shell-opening-options">
          {ARRAY_MODES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={settings.mode === option}
              className={settings.mode === option ? "active" : ""}
              onClick={() => onChange({ mode: option })}
            >
              {t(`array.mode.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <label className="edge-modifier-check">
        <input type="checkbox" checked={arrayGroupsCopies(settings)} onChange={(event) => onChange({ groupCopies: event.currentTarget.checked })} />
        <span>{t("array.groupCopies")}</span>
      </label>

      <EdgeModifierSlider
        label={t("array.count")}
        value={settings.count}
        min={ARRAY_MIN_COUNT}
        max={ARRAY_MAX_COUNT}
        step={1}
        workspace={workspace}
        onChange={(value) => onChange({ count: Math.round(value) })}
      />

      {settings.mode === "row" ? (
        <>
          <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("array.fit")}>
            <span>{t("array.fit")}</span>
            <div className="shell-opening-options">
              {FIT_OPTIONS.map((option) => {
                const active = (settings.fit?.axis ?? null) === option;
                return (
                  <button
                    key={option ?? "off"}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={active ? "active" : ""}
                    disabled={option !== null && !fitBody}
                    // Back to spacings, the row keeps the ones it was spread with.
                    onClick={() => onChange(option && fitBody
                      ? { fit: { axis: option, bodyId: fitBody.id } }
                      : { fit: null, spacingX: settings.spacingX, spacingY: settings.spacingY, spacingZ: settings.spacingZ })}
                  >
                    {t(option ? `array.fit.${option}` : "array.fit.off")}
                  </button>
                );
              })}
            </div>
          </div>
          {settings.fit && fitBody && fitGap !== null ? (
            <>
              <span className="shell-openings-summary">{t("array.fitHint", { name: fitBody.name })}</span>
              <EdgeModifierSlider
                label={t("array.fitGap")}
                value={Math.round(fitGap * 100) / 100}
                min={0}
                max={Math.max(1, Math.floor(fitGapMax))}
                step={0.5}
                workspace={workspace}
                length
                onChange={onFitGap}
              />
            </>
          ) : fitBody ? null : (
            <span className="shell-openings-summary">{t("array.fitNone")}</span>
          )}
          {ROW_AXES.map(({ key, label }) => (
            <EdgeModifierSlider
              key={key}
              label={t(label)}
              value={settings[key]}
              min={-MAX_SPACING}
              max={MAX_SPACING}
              step={0.5}
              workspace={workspace}
              length
              // Spread over a body, the spacing follows the count and the gap.
              disabled={Boolean(settings.fit && fitBody)}
              onChange={(value) => onChange({ [key]: value })}
            />
          ))}
        </>
      ) : (
        <>
          <EdgeModifierSlider
            label={t("array.angle")}
            value={settings.angle}
            min={-360}
            max={360}
            step={1}
            unit="°"
            workspace={workspace}
            onChange={(value) => onChange({ angle: value })}
          />
          <EdgeModifierSlider
            label={t("array.rise")}
            value={settings.rise}
            min={-MAX_SPIRAL_STEP}
            max={MAX_SPIRAL_STEP}
            step={0.5}
            workspace={workspace}
            length
            onChange={(value) => onChange({ rise: value })}
          />
          <EdgeModifierSlider
            label={t("array.radiusChange")}
            value={settings.radiusChange}
            min={-MAX_SPIRAL_STEP}
            max={MAX_SPIRAL_STEP}
            step={0.5}
            workspace={workspace}
            length
            onChange={(value) => onChange({ radiusChange: value })}
          />
          <EdgeModifierSlider
            label={t("array.centerX")}
            value={settings.centerX}
            min={-halfPlate}
            max={halfPlate}
            step={0.5}
            workspace={workspace}
            length
            onChange={(value) => onChange({ centerX: value })}
          />
          <EdgeModifierSlider
            label={t("array.centerY")}
            value={settings.centerY}
            min={-halfPlate}
            max={halfPlate}
            step={0.5}
            workspace={workspace}
            length
            onChange={(value) => onChange({ centerY: value })}
          />
          <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("array.rotateCopies")}>
            <span>{t("array.rotateCopies")}</span>
            <div className="shell-opening-options">
              {[true, false].map((option) => (
                <button
                  key={String(option)}
                  type="button"
                  role="radio"
                  aria-checked={settings.rotateCopies === option}
                  className={settings.rotateCopies === option ? "active" : ""}
                  onClick={() => onChange({ rotateCopies: option })}
                >
                  {t(option ? "array.rotateCopies.yes" : "array.rotateCopies.no")}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" onClick={onApply}>
          <Check size={17} />
          {t("array.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
