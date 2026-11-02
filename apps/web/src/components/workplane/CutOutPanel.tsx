"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { ArrowLeftRight, Check, LoaderCircle, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { cadModifierUserErrorMessage } from "@/lib/cadModifierRuntime";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

export const MAX_CUT_OUT_CLEARANCE = 10;
const CUT_OUT_STEP = 0.05;

/**
 * Cut out (#927): two solids, one of them a part that has to fit into the other (a shaft in a collar, a
 * bolt in a case). A copy of the part, grown by the clearance, is cut out of the other body; the part stays.
 */
export function CutOutPanel({
  partName,
  hostName,
  clearance,
  workspace,
  busy,
  error,
  onClearanceChange,
  onSwap,
  onApply,
  onCancel,
}: {
  partName: string;
  hostName: string;
  clearance: number;
  workspace: WorkplaneWorkspaceSettings;
  busy: boolean;
  error: string | null;
  onClearanceChange: (value: number) => void;
  onSwap: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("cutOut.title");
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel offset-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("cutOut.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="cutOut" />
          <button type="button" aria-label={t("cutOut.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{partName} → {hostName}</strong>
        <span>{t("cutOut.help")}</span>
      </div>

      <div className="edge-modifier-field tool-roles">
        <span>{t("cutOut.part")}: <strong>{partName}</strong></span>
        <span>{t("cutOut.host")}: <strong>{hostName}</strong></span>
        <button type="button" className="secondary" disabled={busy} onClick={onSwap}>
          <ArrowLeftRight size={16} /> {t("cutOut.swap")}
        </button>
      </div>

      <EdgeModifierSlider
        label={t("cutOut.clearance")}
        value={clearance}
        min={0}
        max={MAX_CUT_OUT_CLEARANCE}
        step={CUT_OUT_STEP}
        workspace={workspace}
        length
        disabled={busy}
        onChange={onClearanceChange}
      />
      <span className="shell-openings-summary">{t("cutOut.clearanceHint")}</span>

      {error ? <div className="edge-modifier-error" role="alert">{cadModifierUserErrorMessage(error)}</div> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={busy} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {busy ? t("cutOut.working") : t("cutOut.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
