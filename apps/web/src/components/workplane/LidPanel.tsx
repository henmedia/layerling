"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, LoaderCircle, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import {
  LID_FITS,
  LID_MAGNET_SIZES,
  LID_TYPES,
  MAX_LID_DEPTH,
  MAX_LID_GAP,
  MAX_LID_THICKNESS,
  MAX_LID_WALL,
  MAX_MAGNET_DIAMETER,
  MAX_MAGNET_GAP,
  MAX_MAGNET_HEIGHT,
  MIN_LID_DEPTH,
  MIN_LID_THICKNESS,
  MIN_LID_WALL,
  MIN_MAGNET_DIAMETER,
  MIN_MAGNET_HEIGHT,
  lidThicknessForMagnets,
  type LidOptions,
} from "@/lib/lidTool";
import { numberLocale, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

/**
 * A lid for a body open at the top (#1009): pushed into the opening, put over the outside, gripping the wall from both
 * sides (#1062) or laid flat on it. It comes out as a body of its own beside the one it closes, ready to print. With
 * magnets, it holds by four round magnets in the corners, in pockets in the body's rim and in the lid.
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
  // A magnet needs its pocket and a skin above it in the plate: a thinner plate is made thick enough for it.
  const withMagnet = (patch: Partial<LidOptions>) => {
    const next = { ...settings, ...patch };
    const thickness = lidThicknessForMagnets(next);
    onChange(next.magnets && settings.thickness < thickness ? { ...patch, thickness } : patch);
  };
  const millimetres = (value: number) => value.toLocaleString(numberLocale());
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
          label={t(settings.type === "cap" ? "lid.depthCap" : settings.type === "both" ? "lid.depthBoth" : "lid.depth")}
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
          label={t(settings.type === "cap" ? "lid.wallCap" : settings.type === "both" ? "lid.wallBoth" : "lid.wall")}
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

      <label className="edge-modifier-field offset-copy">
        <input type="checkbox" checked={settings.magnets} disabled={busy} onChange={(event) => withMagnet({ magnets: event.target.checked })} />
        <span>{t("lid.magnets")}</span>
      </label>
      {settings.magnets ? (<>
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.magnetSize")}>
          <span>{t("lid.magnetSize")}</span>
          <div className="shell-opening-options">
            {LID_MAGNET_SIZES.map(({ diameter, height }) => {
              const active = Math.abs(settings.magnetDiameter - diameter) < 1e-9 && Math.abs(settings.magnetHeight - height) < 1e-9;
              return (
                <button
                  key={`${diameter}x${height}`}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={active ? "active" : ""}
                  disabled={busy}
                  onClick={() => withMagnet({ magnetDiameter: diameter, magnetHeight: height })}
                >
                  {t("lid.magnetSizeOption", { diameter: millimetres(diameter), height: millimetres(height) })}
                </button>
              );
            })}
          </div>
        </div>
        <EdgeModifierSlider
          label={t("lid.magnetDiameter")}
          value={settings.magnetDiameter}
          min={MIN_MAGNET_DIAMETER}
          max={MAX_MAGNET_DIAMETER}
          step={0.5}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => withMagnet({ magnetDiameter: value })}
        />
        <EdgeModifierSlider
          label={t("lid.magnetHeight")}
          value={settings.magnetHeight}
          min={MIN_MAGNET_HEIGHT}
          max={MAX_MAGNET_HEIGHT}
          step={0.5}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => withMagnet({ magnetHeight: value })}
        />
        <EdgeModifierSlider
          label={t("lid.magnetGap")}
          value={settings.magnetGap}
          min={0}
          max={MAX_MAGNET_GAP}
          step={0.05}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ magnetGap: value })}
        />
        <span className="shell-openings-summary">{t("lid.magnetsHint")}</span>
      </>) : null}

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
