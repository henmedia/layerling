"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { numberLocale, t } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages.en";
import { useLanguage } from "@/lib/useLanguage";
import { resolveSupportRib, supportRibHeight, type SupportRibFace, type SupportRibPlan, type SupportRibSettings } from "@/lib/supportRib";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

/**
 * "Support rib" (Discussion #1385): once the lower face of a tilted part is picked, the rib under it shows while the
 * numbers change, and "Create" adds it beside the part, bundled with it unless switched off. Nozzle and layers come
 * first, as the rib's measures follow from them; the rest waits under "More settings".
 */
export function SupportRibPanel({
  targetName,
  step,
  settings,
  workspace,
  face,
  plan,
  problem,
  busy,
  onChange,
  onRepick,
  onApply,
  onCancel,
}: {
  targetName: string;
  step: "pick" | "ready";
  settings: SupportRibSettings;
  workspace: WorkplaneWorkspaceSettings;
  face: SupportRibFace | null;
  /** The rib as the preview built it, or null while it builds. */
  plan: SupportRibPlan | null;
  /** Why no rib stands there, as a message key. */
  problem: string | null;
  busy: boolean;
  onChange: (patch: Partial<SupportRibSettings>) => void;
  onRepick: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("supportRib.title");
  const ready = step === "ready";
  const measures = resolveSupportRib(settings);
  const millimetres = (value: number) => (Math.round(value * 100) / 100).toLocaleString(numberLocale());
  const status = !ready
    ? t("supportRib.step.pick")
    : problem
      ? t(problem as MessageKey)
      : plan
        ? t("supportRib.ready", { height: millimetres(plan.height), count: plan.bridges.length, spacing: millimetres(Math.max(1, Math.round(settings.bridgeSpacing / settings.layerHeight)) * settings.layerHeight) })
        : t("supportRib.building");
  const maxHeight = face ? Math.max(1, Math.floor(face.high * 2) / 2) : 100;
  const slider = (key: keyof SupportRibSettings, label: string, value: number, min: number, max: number, step: number, hint?: string) => (
    <div title={hint}>
      <EdgeModifierSlider label={label} value={value} min={min} max={max} step={step} workspace={workspace} length onChange={(next) => onChange({ [key]: next } as Partial<SupportRibSettings>)} />
    </div>
  );

  return (
    <MovableToolPanel className="edge-modifier-panel support-rib-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("supportRib.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="supportRib" />
          <button type="button" aria-label={t("supportRib.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span role="status">{status}</span>
      </div>

      {slider("nozzle", t("supportRib.nozzle"), settings.nozzle, 0.1, 1.2, 0.05)}
      {slider("layerHeight", t("supportRib.layerHeight"), settings.layerHeight, 0.04, 0.6, 0.02)}
      {slider("firstLayer", t("supportRib.firstLayer"), settings.firstLayer, 0.04, 1, 0.02)}
      {slider("height", t("supportRib.height"), face ? supportRibHeight(face, settings) : settings.height ?? 10, 1, maxHeight, 0.5)}
      {slider("bridgeSpacing", t("supportRib.bridgeSpacing"), settings.bridgeSpacing, settings.layerHeight, 20, settings.layerHeight)}

      <details className="edge-modifier-field">
        <summary>{t("supportRib.more")}</summary>
        {slider("thickness", t("supportRib.thickness"), measures.thickness, 0.2, 5, 0.05, t("supportRib.derivedHint"))}
        {slider("gap", t("supportRib.gap"), measures.gap, 0.05, 2, 0.05, t("supportRib.derivedHint"))}
        {slider("bridgeWidth", t("supportRib.bridgeWidth"), measures.bridgeWidth, 0.1, 2, 0.05, t("supportRib.derivedHint"))}
        {slider("footThickness", t("supportRib.footThickness"), measures.footThickness, 0.1, 3, 0.05, t("supportRib.derivedHint"))}
        {slider("footWidth", t("supportRib.footWidth"), settings.footWidth, 1, 40, 0.5)}
        {slider("filletRadius", t("supportRib.filletRadius"), settings.filletRadius, 0, 5, 0.1)}
        {slider("topRadius", t("supportRib.topRadius"), settings.topRadius, 0, 5, 0.1)}
      </details>

      <label className="edge-modifier-check" title={t("supportRib.bundleHint")}>
        <input type="checkbox" checked={settings.bundle} onChange={(event) => onChange({ bundle: event.currentTarget.checked })} />
        <span>{t("supportRib.bundle")}</span>
      </label>

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={ready ? onRepick : onCancel}>
          {ready ? t("supportRib.repick") : t("common.cancel")}
        </button>
        <button type="button" className="primary" disabled={!ready || !plan || Boolean(problem) || busy} onClick={onApply}>
          <Check size={17} />
          {t("supportRib.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
