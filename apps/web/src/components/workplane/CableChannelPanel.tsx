"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, LoaderCircle, MousePointerClick, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { MAX_CABLE_BEND, MAX_CABLE_DIAMETER, MAX_CABLE_WALL, MIN_CABLE_DIAMETER, MIN_CABLE_WALL, type CableChannelOptions } from "@/lib/cableChannel";
import { numberLocale, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

export type CableChannelEndName = "entry" | "exit";

/** What the search found, as the panel shows it. */
export type CableChannelPanelResult =
  | { state: "idle" }
  | { state: "working" }
  | { state: "found"; length: number; minBend: number; minWall: number; tight: boolean; thin: boolean }
  | { state: "error"; message: string };

/**
 * The cable channel (Facebook question, an LED lead through a deer): click where the cable goes in and where it comes
 * out; the panel shows what the search found, and Make channel cuts it into the body as a bent tube hole.
 */
export function CableChannelPanel({
  targetName,
  settings,
  entrySet,
  exitSet,
  picking,
  result,
  workspace,
  busy,
  error,
  onChange,
  onPick,
  onApply,
  onCancel,
}: {
  targetName: string;
  settings: CableChannelOptions;
  entrySet: boolean;
  exitSet: boolean;
  picking: CableChannelEndName | null;
  result: CableChannelPanelResult;
  workspace: WorkplaneWorkspaceSettings;
  busy: boolean;
  error: string | null;
  onChange: (patch: Partial<CableChannelOptions>) => void;
  onPick: (end: CableChannelEndName) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("cable.title");
  const millimetres = (value: number) => (Math.round(value * 10) / 10).toLocaleString(numberLocale());
  const end = (name: CableChannelEndName, set: boolean) => (
    <div className="edge-modifier-field cable-channel-end">
      <span>{t(name === "entry" ? "cable.entry" : "cable.exit")}</span>
      {picking === name ? (
        <span className="cable-channel-picking" role="status"><MousePointerClick size={16} aria-hidden="true" />{t("cable.pickNow")}</span>
      ) : (
        <button type="button" className={set ? "secondary" : ""} disabled={busy} onClick={() => onPick(name)}>
          {set ? <><Check size={15} aria-hidden="true" />{t("cable.pickAgain")}</> : t("cable.pick")}
        </button>
      )}
    </div>
  );
  const found = result.state === "found" ? result : null;
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel offset-panel cable-channel-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("cable.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="cableChannel" />
          <button type="button" aria-label={t("cable.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span>{t("cable.help")}</span>
      </div>

      {end("entry", entrySet)}
      {end("exit", exitSet)}

      <EdgeModifierSlider
        label={t("cable.diameter")}
        value={settings.diameter}
        min={MIN_CABLE_DIAMETER}
        max={MAX_CABLE_DIAMETER}
        step={0.5}
        workspace={workspace}
        length
        disabled={busy}
        onChange={(value) => onChange({ diameter: value })}
      />
      <EdgeModifierSlider
        label={t("cable.minBend")}
        value={settings.minBend}
        min={1}
        max={MAX_CABLE_BEND}
        step={1}
        workspace={workspace}
        length
        disabled={busy}
        onChange={(value) => onChange({ minBend: value })}
      />
      <EdgeModifierSlider
        label={t("cable.minWall")}
        value={settings.minWall}
        min={MIN_CABLE_WALL}
        max={MAX_CABLE_WALL}
        step={0.1}
        workspace={workspace}
        length
        disabled={busy}
        onChange={(value) => onChange({ minWall: value })}
      />
      <span className="shell-openings-summary">{t("cable.hint")}</span>

      {result.state === "working" ? (
        <span className="shell-openings-summary cable-channel-status" role="status"><LoaderCircle className="edge-modifier-spinner" size={15} />{t("cable.working")}</span>
      ) : found ? (
        <span className={`shell-openings-summary cable-channel-status${found.tight || found.thin ? " warning" : ""}`} role="status">
          {Number.isFinite(found.minBend)
            ? t("cable.found", { length: millimetres(found.length), bend: millimetres(found.minBend), wall: millimetres(found.minWall) })
            : t("cable.foundStraight", { length: millimetres(found.length), wall: millimetres(found.minWall) })}
          {found.tight ? ` ${t("cable.tight")}` : ""}
          {found.thin ? ` ${t("cable.thin")}` : ""}
        </span>
      ) : result.state === "error" ? (
        <div className="edge-modifier-error" role="alert">{result.message}</div>
      ) : null}

      {error ? <div className="edge-modifier-error" role="alert">{error}</div> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={busy || !found} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {busy ? t("cable.making") : t("cable.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
