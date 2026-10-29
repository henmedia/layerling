"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, LoaderCircle, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { MAX_FLEXI_CLEARANCE, MAX_FLEXI_JOINTS, MAX_FLEXI_SWING, MIN_FLEXI_CLEARANCE, MIN_FLEXI_SWING } from "@/lib/flexiJoints";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

/** What the panel edits: the axis ("auto" is the body's longer side), the joints, and the knuckle's size and the end links when not left to the tool. */
export type FlexiToolSettings = {
  axis: "auto" | "x" | "z";
  joints: number;
  clearance: number;
  swing: number;
  autoSize: boolean;
  size: number;
  evenLinks: boolean;
  start: number;
  end: number;
};

const AXES: readonly FlexiToolSettings["axis"][] = ["auto", "x", "z"];

/**
 * Flexi joints (Liane's mail, 29.10.2026): a flat body cut into links along its length, with a joint printed in place
 * at every cut, so the links swing to the sides - a fish, a snake or a dragon of one's own drawing.
 */
export function FlexiPanel({
  targetName,
  settings,
  length,
  workspace,
  busy,
  error,
  onChange,
  onApply,
  onCancel,
}: {
  targetName: string;
  settings: FlexiToolSettings;
  /** The body's length along the chosen axis, in mm: as far as the first and the last joint can lie from its ends. */
  length: number;
  workspace: WorkplaneWorkspaceSettings;
  busy: boolean;
  error: string | null;
  onChange: (patch: Partial<FlexiToolSettings>) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("flexi.title");
  const endMax = Math.max(1, Math.round(length / 2));
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel offset-panel flexi-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("flexi.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="flexi" />
          <button type="button" aria-label={t("flexi.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span>{t("flexi.help")}</span>
      </div>

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("flexi.axis")}>
        <span>{t("flexi.axis")}</span>
        <div className="shell-opening-options">
          {AXES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={settings.axis === option}
              className={settings.axis === option ? "active" : ""}
              disabled={busy}
              onClick={() => onChange({ axis: option })}
            >
              {t(`flexi.axis.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <EdgeModifierSlider
        label={t("flexi.joints")}
        value={settings.joints}
        min={1}
        max={MAX_FLEXI_JOINTS}
        step={1}
        workspace={workspace}
        disabled={busy}
        onChange={(value) => onChange({ joints: Math.round(value) })}
      />

      <EdgeModifierSlider
        label={t("flexi.clearance")}
        value={settings.clearance}
        min={MIN_FLEXI_CLEARANCE}
        max={MAX_FLEXI_CLEARANCE}
        step={0.05}
        workspace={workspace}
        length
        disabled={busy}
        onChange={(value) => onChange({ clearance: value })}
      />
      <span className="shell-openings-summary">{t("flexi.clearanceHint")}</span>

      <EdgeModifierSlider
        label={t("flexi.swing")}
        value={settings.swing}
        min={MIN_FLEXI_SWING}
        max={MAX_FLEXI_SWING}
        step={1}
        unit="°"
        workspace={workspace}
        disabled={busy}
        onChange={(value) => onChange({ swing: value })}
      />

      <label className="edge-modifier-field offset-copy">
        <input type="checkbox" checked={settings.autoSize} disabled={busy} onChange={(event) => onChange({ autoSize: event.target.checked })} />
        <span>{t("flexi.autoSize")}</span>
      </label>
      {settings.autoSize ? null : (
        <EdgeModifierSlider
          label={t("flexi.size")}
          value={settings.size}
          min={4}
          max={30}
          step={0.5}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ size: value })}
        />
      )}

      <label className="edge-modifier-field offset-copy">
        <input type="checkbox" checked={settings.evenLinks} disabled={busy} onChange={(event) => onChange({ evenLinks: event.target.checked })} />
        <span>{t("flexi.evenLinks")}</span>
      </label>
      {settings.evenLinks ? null : (<>
        <EdgeModifierSlider
          label={t("flexi.start")}
          value={Math.min(settings.start, endMax)}
          min={1}
          max={endMax}
          step={0.5}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ start: value })}
        />
        <EdgeModifierSlider
          label={t("flexi.end")}
          value={Math.min(settings.end, endMax)}
          min={1}
          max={endMax}
          step={0.5}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ end: value })}
        />
      </>)}

      {error ? <div className="edge-modifier-error" role="alert">{error}</div> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={busy} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {busy ? t("flexi.working") : t("flexi.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
