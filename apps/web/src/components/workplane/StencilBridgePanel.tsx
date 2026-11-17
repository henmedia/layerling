"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import {
  STENCIL_BRIDGE_POSITIONS,
  STENCIL_TOOL_MAX_COUNT,
  STENCIL_TOOL_MAX_WIDTH,
  STENCIL_TOOL_MIN_HEIGHT,
  STENCIL_TOOL_MIN_WIDTH,
  type StencilBridgePlan,
  type StencilBridgeToolSettings,
} from "@/lib/stencilBridgeTool";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

/**
 * "Stencil bridges" (Discussion #1438): the bridges for the parts of a plate with text cut through that would fall
 * out show while the numbers change, and "Create" groups them with the plate. Width and number as in the export's
 * bridges; the height and where a lower bridge sits are for the printed stencil.
 */
export function StencilBridgePanel({
  targetName,
  settings,
  workspace,
  plan,
  bridgeCount,
  replaced,
  busy,
  onChange,
  onApply,
  onCancel,
}: {
  targetName: string;
  settings: StencilBridgeToolSettings;
  workspace: WorkplaneWorkspaceSettings;
  /** Where the bridges go, as the preview found it, or null while it looks. */
  plan: StencilBridgePlan | null;
  bridgeCount: number;
  /** Bridges the tool made before on this group, which the new ones replace. */
  replaced: number;
  busy: boolean;
  onChange: (patch: Partial<StencilBridgeToolSettings>) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("stencilBridges.title");
  const full = plan?.ok ? Math.max(STENCIL_TOOL_MIN_HEIGHT, plan.maxY - plan.minY) : 10;
  const height = settings.height === null ? full : Math.min(full, settings.height);
  const status = !plan
    ? t("stencilBridges.building")
    : !plan.ok
      ? t(`stencilBridges.reason.${plan.reason}`)
      : plan.parts === 0
        ? t("stencilBridges.reason.nothing")
        : [
            bridgeCount > 0 ? t("stencilBridges.ready", { parts: plan.parts, count: bridgeCount }) : t("stencilBridges.reason.unreachable"),
            bridgeCount > 0 && plan.unheld > 0 ? t("stencilBridges.unheld", { count: plan.unheld }) : "",
            replaced > 0 ? t("stencilBridges.replaced", { count: replaced }) : "",
          ].filter(Boolean).join(" ");
  const ready = Boolean(plan?.ok && plan.parts > 0 && bridgeCount > 0);

  return (
    <MovableToolPanel className="edge-modifier-panel stencil-bridge-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("stencilBridges.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="stencilBridges" />
          <button type="button" aria-label={t("stencilBridges.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span role="status">{status}</span>
      </div>

      <EdgeModifierSlider
        label={t("stencilBridges.width")}
        value={settings.width}
        min={STENCIL_TOOL_MIN_WIDTH}
        max={STENCIL_TOOL_MAX_WIDTH}
        step={0.1}
        workspace={workspace}
        length
        onChange={(value) => onChange({ width: value })}
      />
      <EdgeModifierSlider
        label={t("stencilBridges.count")}
        value={settings.count}
        min={1}
        max={STENCIL_TOOL_MAX_COUNT}
        step={1}
        workspace={workspace}
        decimals={0}
        onChange={(value) => onChange({ count: value })}
      />
      <EdgeModifierSlider
        label={t("stencilBridges.height")}
        value={height}
        min={Math.min(STENCIL_TOOL_MIN_HEIGHT, full)}
        max={full}
        step={0.1}
        workspace={workspace}
        length
        onChange={(value) => onChange({ height: value >= full - 1e-6 ? null : value })}
      />

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("stencilBridges.position")}>
        <span>{t("stencilBridges.position")}</span>
        <div className="shell-opening-options">
          {STENCIL_BRIDGE_POSITIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={settings.position === option}
              className={settings.position === option ? "active" : ""}
              onClick={() => onChange({ position: option })}
            >
              {t(`stencilBridges.position.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button type="button" className="primary" disabled={!ready || busy} onClick={onApply}>
          <Check size={17} />
          {t("stencilBridges.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
