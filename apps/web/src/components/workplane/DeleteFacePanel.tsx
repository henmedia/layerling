"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, LoaderCircle, X } from "lucide-react";
import { EdgeFeatureHistory, type EdgeHistoryOption } from "@/components/workplane/EdgeModifierPanel";
import { cadModifierUserErrorMessage } from "@/lib/cadModifierRuntime";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

/**
 * Deleting faces of a body (#451): the faces are clicked on the body, the
 * panel counts them, and Delete lets the faces around them close the gap.
 */
export function DeleteFacePanel({
  targetName,
  faceCount,
  thinCount,
  preparing,
  busy,
  error,
  appliedFeatureCount,
  reversibleFeatureCount,
  historyOptions,
  onRemoveFeature,
  onClear,
  onApply,
  onCancel,
}: {
  targetName: string;
  faceCount: number;
  /** Hair-thin faces that go with the picked ones (cadThinFaces). */
  thinCount: number;
  /** The worker is still reading the body's faces. */
  preparing: boolean;
  busy: boolean;
  error: string | null;
  /** The treatments the body already has, to revert. */
  appliedFeatureCount: number;
  reversibleFeatureCount: number;
  historyOptions: EdgeHistoryOption[];
  onRemoveFeature: (id: string) => void;
  onClear: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("deleteFace.title");
  const count = faceCount === 0 ? t("deleteFace.countNone") : faceCount === 1 ? t("deleteFace.countOne") : t("deleteFace.countMany", { count: faceCount });
  return (
    <MovableToolPanel className="edge-modifier-panel delete-face-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("deleteFace.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="deleteFace" />
          <button type="button" aria-label={t("deleteFace.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span>{t("deleteFace.help")}</span>
      </div>

      <div className="edge-modifier-selection-help">{preparing ? t("deleteFace.preparing") : count}</div>
      {thinCount > 0 ? <div className="edge-modifier-selection-help">{thinCount === 1 ? t("deleteFace.thinOne") : t("deleteFace.thinMany", { count: thinCount })}</div> : null}
      <div className="edge-modifier-quick-actions">
        <button type="button" disabled={busy || faceCount === 0} onClick={onClear}>{t("edge.clear")}</button>
      </div>

      <EdgeFeatureHistory
        appliedFeatureCount={appliedFeatureCount}
        reversibleFeatureCount={reversibleFeatureCount}
        historyOptions={historyOptions}
        onRemoveFeature={onRemoveFeature}
      />

      {error ? <div className="edge-modifier-error" role="alert">{cadModifierUserErrorMessage(error)}</div> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={busy || preparing || faceCount === 0} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {busy ? t("deleteFace.working") : t("deleteFace.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
