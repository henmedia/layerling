"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import {
  HOLE_PATTERN_MANY_HOLES,
  HOLE_PATTERN_MAX_HOLES,
  HOLE_PATTERN_MAX_MARGIN,
  HOLE_PATTERN_MAX_SIZE,
  HOLE_PATTERN_MAX_SPACING,
  HOLE_PATTERN_MIN_SIZE,
  HOLE_PATTERN_MIN_WALL,
  holePatternHasRowSpacing,
  holePatternMinRowSpacing,
  holePatternMinSpacing,
  holePatternRowSpacing,
  holePatternWall,
  type HoleArrangement,
  type HoleForm,
  type HolePatternSettings,
} from "@/lib/holePattern";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

const HOLE_FORMS: readonly HoleForm[] = ["round", "square", "rectangle", "hexagon", "slot"];
const ARRANGEMENTS: readonly HoleArrangement[] = ["grid", "staggered"];

/**
 * "Hole pattern": once a flat face of the body is picked, the holes that fit it
 * show as ghosts while the numbers change, and "Create" groups them with the
 * body. The holes stay ordinary hole shapes.
 */
export function HolePatternPanel({
  targetName,
  step,
  settings,
  workspace,
  thickness,
  holeCount,
  tooMany,
  busy,
  onChange,
  onRepick,
  onApply,
  onCancel,
}: {
  targetName: string;
  step: "pick" | "ready";
  settings: HolePatternSettings;
  workspace: WorkplaneWorkspaceSettings;
  /** How thick the body is behind the picked face; the depth slider runs up to it. */
  thickness: number;
  holeCount: number;
  tooMany: boolean;
  busy: boolean;
  onChange: (patch: Partial<HolePatternSettings>) => void;
  onRepick: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("holePattern.title");
  const ready = step === "ready";
  const twoSizes = settings.form === "rectangle" || settings.form === "slot";
  const sizeLabel = settings.form === "round"
    ? t("holePattern.size.diameter")
    : settings.form === "square"
      ? t("holePattern.size.side")
      : settings.form === "hexagon"
        ? t("holePattern.size.corners")
        : t("holePattern.size.width");
  const status = !ready
    ? t("holePattern.step.pick")
    : tooMany
      ? t("holePattern.tooMany", { limit: settings.allowMany ? HOLE_PATTERN_MANY_HOLES : HOLE_PATTERN_MAX_HOLES })
      : holeCount === 0
        ? t("holePattern.none")
        : t(holeCount === 1 ? "holePattern.count.one" : "holePattern.count.many", { count: holeCount });
  const maxDepth = Math.max(1, Math.ceil(thickness * 2) / 2);

  return (
    <MovableToolPanel className="edge-modifier-panel hole-pattern-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("holePattern.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="holePattern" />
          <button type="button" aria-label={t("holePattern.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span role="status">{status}</span>
      </div>

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("holePattern.form")}>
        <span>{t("holePattern.form")}</span>
        <div className="shell-opening-options hole-pattern-forms">
          {HOLE_FORMS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={settings.form === option}
              className={settings.form === option ? "active" : ""}
              onClick={() => onChange({ form: option })}
            >
              {t(`holePattern.form.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <EdgeModifierSlider
        label={sizeLabel}
        value={settings.size}
        min={HOLE_PATTERN_MIN_SIZE}
        max={HOLE_PATTERN_MAX_SIZE / 2}
        step={0.5}
        workspace={workspace}
        length
        onChange={(value) => onChange({ size: value })}
      />
      {twoSizes ? (
        <EdgeModifierSlider
          label={t("holePattern.size.height")}
          value={settings.height}
          min={HOLE_PATTERN_MIN_SIZE}
          max={HOLE_PATTERN_MAX_SIZE / 2}
          step={0.5}
          workspace={workspace}
          length
          onChange={(value) => onChange({ height: value })}
        />
      ) : null}
      <EdgeModifierSlider
        label={t("holePattern.spacing")}
        value={settings.spacing}
        min={HOLE_PATTERN_MIN_SIZE}
        max={HOLE_PATTERN_MAX_SPACING / 2}
        step={0.5}
        workspace={workspace}
        length
        onChange={(value) => onChange({ spacing: value })}
      />
      {/* A rectangle or slot spaces its rows on its own (#975): narrow holes close in the row, the rows clear of each other. */}
      {holePatternHasRowSpacing(settings.form) ? (
        <EdgeModifierSlider
          label={t("holePattern.rowSpacing")}
          value={holePatternRowSpacing(settings)}
          min={HOLE_PATTERN_MIN_SIZE}
          max={HOLE_PATTERN_MAX_SPACING / 2}
          step={0.5}
          workspace={workspace}
          length
          onChange={(value) => onChange({ rowSpacing: value })}
        />
      ) : null}
      {/* The same as the spacing, said as the wall left between two holes (#239): set one and the other follows. */}
      <EdgeModifierSlider
        label={t("holePattern.wall")}
        value={Math.max(HOLE_PATTERN_MIN_WALL, holePatternWall(settings))}
        min={HOLE_PATTERN_MIN_WALL}
        max={HOLE_PATTERN_MAX_SPACING / 2}
        step={0.1}
        workspace={workspace}
        length
        onChange={(value) => {
          const spacing = holePatternMinSpacing(settings, value);
          onChange(holePatternHasRowSpacing(settings.form)
            ? { spacing, rowSpacing: holePatternMinRowSpacing({ ...settings, spacing }, value) }
            : { spacing });
        }}
      />

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("holePattern.arrangement")}>
        <span>{t("holePattern.arrangement")}</span>
        <div className="shell-opening-options">
          {ARRANGEMENTS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={settings.arrangement === option}
              className={settings.arrangement === option ? "active" : ""}
              onClick={() => onChange({ arrangement: option })}
            >
              {t(`holePattern.arrangement.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <EdgeModifierSlider
        label={t("holePattern.margin")}
        value={settings.margin}
        min={0}
        max={HOLE_PATTERN_MAX_MARGIN / 2}
        step={0.5}
        workspace={workspace}
        length
        onChange={(value) => onChange({ margin: value })}
      />

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("holePattern.depth")}>
        <span>{t("holePattern.depth")}</span>
        <div className="shell-opening-options">
          {[true, false].map((through) => (
            <button
              key={String(through)}
              type="button"
              role="radio"
              aria-checked={(settings.depth === null) === through}
              className={(settings.depth === null) === through ? "active" : ""}
              onClick={() => onChange({ depth: through ? null : Math.min(maxDepth, Math.max(1, Math.round(thickness / 2 * 2) / 2)) })}
            >
              {t(through ? "holePattern.depth.through" : "holePattern.depth.custom")}
            </button>
          ))}
        </div>
      </div>
      {settings.depth !== null ? (
        <EdgeModifierSlider
          label={t("holePattern.depthValue")}
          value={settings.depth}
          min={0.5}
          max={Math.max(maxDepth, settings.depth)}
          step={0.5}
          workspace={workspace}
          length
          onChange={(value) => onChange({ depth: value })}
        />
      ) : null}

      {ready && tooMany && !settings.allowMany ? (
        <div className="edge-modifier-field">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              // A clear warning first: far more holes make the cuts slow and the page can freeze (#941).
              if (window.confirm(t("holePattern.allowManyAsk", { limit: HOLE_PATTERN_MAX_HOLES, many: HOLE_PATTERN_MANY_HOLES }))) onChange({ allowMany: true });
            }}
          >
            {t("holePattern.allowMany")}
          </button>
        </div>
      ) : null}

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={ready ? onRepick : onCancel}>
          {ready ? t("holePattern.repick") : t("common.cancel")}
        </button>
        <button type="button" className="primary" disabled={!ready || holeCount === 0 || tooMany || busy} onClick={onApply}>
          <Check size={17} />
          {t("holePattern.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
