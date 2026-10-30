"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, LoaderCircle, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { LID_FITS, LID_TYPES, MAX_LID_DEPTH, MAX_LID_GAP, MAX_LID_THICKNESS, MAX_LID_WALL, MIN_LID_DEPTH, MIN_LID_THICKNESS, MIN_LID_WALL, type LidOptions } from "@/lib/lidTool";
import { numberLocale, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

/**
 * A lid for a body open at the top (#1009): pushed into the opening, put over the outside or laid flat on it. It comes
 * out as a body of its own beside the one it closes, ready to print.
 */
export function LidPanel({
  targetName,
  settings,
  workspace,
  busy,
  error,
  onChange,
  onApply,
  onCancel,
}: {
  targetName: string;
  settings: LidOptions;
  workspace: WorkplaneWorkspaceSettings;
  busy: boolean;
  error: string | null;
  onChange: (patch: Partial<LidOptions>) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("lid.title");
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel offset-panel lid-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("lid.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="lid" />
          <button type="button" aria-label={t("lid.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span>{t("lid.help")}</span>
      </div>

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.type")}>
        <span>{t("lid.type")}</span>
        <div className="shell-opening-options">
          {LID_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={settings.type === option}
              className={settings.type === option ? "active" : ""}
              title={t(`lid.type.${option}Hint`)}
              disabled={busy}
              onClick={() => onChange({ type: option })}
            >
              {t(`lid.type.${option}`)}
            </button>
          ))}
        </div>
      </div>
      <span className="shell-openings-summary">{t(`lid.type.${settings.type}Hint`)}</span>

      <EdgeModifierSlider
        label={t("lid.thickness")}
        value={settings.thickness}
        min={MIN_LID_THICKNESS}
        max={MAX_LID_THICKNESS}
        step={0.2}
        workspace={workspace}
        length
        disabled={busy}
        onChange={(value) => onChange({ thickness: value })}
      />

      {settings.type === "flat" ? null : (<>
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.fit")}>
          <span>{t("lid.fit")}</span>
          <div className="shell-opening-options">
            {LID_FITS.map((fit, index) => (
              <button
                key={fit}
                type="button"
                role="radio"
                aria-checked={Math.abs(settings.gap - fit) < 1e-9}
                className={Math.abs(settings.gap - fit) < 1e-9 ? "active" : ""}
                disabled={busy}
                onClick={() => onChange({ gap: fit })}
              >
                {t((["lid.fit.tight", "lid.fit.normal", "lid.fit.loose"] as const)[index], { gap: fit.toLocaleString(numberLocale()) })}
              </button>
            ))}
          </div>
        </div>
        <EdgeModifierSlider
          label={t("lid.gap")}
          value={settings.gap}
          min={0}
          max={MAX_LID_GAP}
          step={0.05}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ gap: value })}
        />
        <EdgeModifierSlider
          label={settings.type === "cap" ? t("lid.depthCap") : t("lid.depth")}
          value={settings.depth}
          min={MIN_LID_DEPTH}
          max={MAX_LID_DEPTH}
          step={0.5}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ depth: value })}
        />
        <EdgeModifierSlider
          label={settings.type === "cap" ? t("lid.wallCap") : t("lid.wall")}
          value={settings.wall}
          min={MIN_LID_WALL}
          max={MAX_LID_WALL}
          step={0.2}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ wall: value })}
        />
      </>)}

      {error ? <div className="edge-modifier-error" role="alert">{error}</div> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={busy} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {busy ? t("lid.working") : t("lid.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
