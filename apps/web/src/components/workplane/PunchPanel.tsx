"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { ArrowLeftRight, Check, LoaderCircle, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { cadModifierUserErrorMessage } from "@/lib/cadModifierRuntime";
import { t } from "@/lib/i18n";
import { MAX_PUNCH_CLEARANCE, PUNCH_AXES } from "@/lib/punchTool";
import { sectionAxisLetter, type SectionPlaneAxis } from "@/lib/sectionView";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

const PUNCH_STEP = 0.05;

/**
 * Punch (#703): two solids, a punch and a body to punch. The punch's outline, seen along the chosen axis, is cut
 * straight through the other body, wherever the punch stands; the punch stays, to be moved and used again.
 */
export function PunchPanel({
  punchName,
  targetName,
  axis,
  clearance,
  workspace,
  busy,
  error,
  onAxisChange,
  onClearanceChange,
  onSwap,
  onApply,
  onCancel,
}: {
  punchName: string;
  targetName: string;
  axis: SectionPlaneAxis;
  clearance: number;
  workspace: WorkplaneWorkspaceSettings;
  busy: boolean;
  error: string | null;
  onAxisChange: (axis: SectionPlaneAxis) => void;
  onClearanceChange: (value: number) => void;
  onSwap: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("punch.title");
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel offset-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("punch.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="punch" />
          <button type="button" aria-label={t("punch.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{punchName} → {targetName}</strong>
        <span>{t("punch.help")}</span>
      </div>

      <div className="edge-modifier-field tool-roles">
        <span>{t("punch.punch")}: <strong>{punchName}</strong></span>
        <span>{t("punch.target")}: <strong>{targetName}</strong></span>
        <button type="button" className="secondary" disabled={busy} onClick={onSwap}>
          <ArrowLeftRight size={16} /> {t("punch.swap")}
        </button>
      </div>

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("punch.axis")}>
        <span>{t("punch.axis")}</span>
        <div className="shell-opening-options punch-axis-options">
          {PUNCH_AXES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={axis === option}
              className={axis === option ? "active" : ""}
              disabled={busy}
              onClick={() => onAxisChange(option)}
            >
              {sectionAxisLetter(option)}
            </button>
          ))}
        </div>
      </div>
      <span className="shell-openings-summary">{t("punch.axisHint")}</span>

      <EdgeModifierSlider
        label={t("punch.clearance")}
        value={clearance}
        min={0}
        max={MAX_PUNCH_CLEARANCE}
        step={PUNCH_STEP}
        workspace={workspace}
        length
        disabled={busy}
        onChange={onClearanceChange}
      />
      <span className="shell-openings-summary">{t("punch.clearanceHint")}</span>

      {error ? <div className="edge-modifier-error" role="alert">{cadModifierUserErrorMessage(error)}</div> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={busy} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {busy ? t("punch.working") : t("punch.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
