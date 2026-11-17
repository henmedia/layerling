"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { numberLocale, t } from "@/lib/i18n";
import { CUSTOM_THREAD_INSERT, THREAD_INSERT_SIZES, type ThreadInsertResult, type ThreadInsertSpec } from "@/lib/threadInsert";
import { useLanguage } from "@/lib/useLanguage";

type Coordinates = { x: number; y: number };

/**
 * "Thread insert" (PR #1828 by @markopo1982): the size of a heat-set insert, the spot picked on the part, and whether
 * the part has the wall and the depth for it. The ring on the part is green where the hole may be made, red where not.
 */
export function ThreadInsertPanel({
  targetName,
  preset,
  customDiameter,
  customLength,
  spec,
  result,
  ready,
  busy,
  coordinates,
  centerAvailable,
  onPreset,
  onCustomDiameter,
  onCustomLength,
  onCoordinates,
  onCenter,
  onRepick,
  onApply,
  onCancel,
}: {
  targetName: string;
  preset: string;
  customDiameter: string;
  customLength: string;
  /** The size as chosen; null while the typed numbers are not usable. */
  spec: ThreadInsertSpec | null;
  /** What the part offers at the picked spot; null before a spot is picked. */
  result: ThreadInsertResult | null;
  ready: boolean;
  busy: boolean;
  /** Where the spot is, in mm from the lower left corner of a flat face's extent; null on a round wall. */
  coordinates: Coordinates | null;
  centerAvailable: boolean;
  onPreset: (preset: string) => void;
  onCustomDiameter: (value: string) => void;
  onCustomLength: (value: string) => void;
  onCoordinates: (x: number, y: number) => void;
  onCenter: () => void;
  onRepick: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("threadInsert.title");
  const millimetres = (value: number) => (Math.round(value * 100) / 100).toLocaleString(numberLocale());
  const [xText, setXText] = useState("");
  const [yText, setYText] = useState("");
  useEffect(() => setXText(coordinates ? millimetres(coordinates.x) : ""), [coordinates?.x]);
  useEffect(() => setYText(coordinates ? millimetres(coordinates.y) : ""), [coordinates?.y]);
  const changeCoordinate = (axis: "x" | "y", text: string) => {
    if (axis === "x") setXText(text);
    else setYText(text);
    if (!coordinates || busy || text.trim() === "") return;
    const value = Number(text.replace(",", "."));
    if (Number.isFinite(value)) onCoordinates(axis === "x" ? value : coordinates.x, axis === "y" ? value : coordinates.y);
  };

  const status = !spec
    ? t("threadInsert.invalidSize")
    : !ready
      ? t("threadInsert.step.pick")
      : !result || result.invalid
        ? t("threadInsert.invalidMeasure")
        : result.allowed
          ? t("threadInsert.allowed", { wall: millimetres(result.wall), depth: millimetres(result.materialDepth) })
          : null;
  const problems = ready && result && !result.invalid && !result.allowed ? (
    <>
      {result.wallShort ? (
        <span role="alert">
          {t("threadInsert.wallShort", { wall: millimetres(Math.max(0, result.wall)), required: millimetres(result.requiredWall), minimum: millimetres(Math.round(result.minimumOuterDiameter * 10 + 1) / 10) })}
        </span>
      ) : null}
      {result.depthShort ? (
        <span role="alert">{t("threadInsert.depthShort", { depth: millimetres(result.materialDepth), required: millimetres(result.requiredDepth) })}</span>
      ) : null}
    </>
  ) : null;
  const allowed = Boolean(ready && result?.allowed && spec);

  return (
    <MovableToolPanel className="edge-modifier-panel thread-insert-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("threadInsert.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="threadInsert" />
          <button type="button" aria-label={t("threadInsert.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        {status ? <span role="status">{status}</span> : null}
        {problems}
      </div>

      <label className="edge-modifier-field">
        <span>{t("threadInsert.size")}</span>
        <select value={preset} disabled={busy} onChange={(event) => onPreset(event.target.value)}>
          {THREAD_INSERT_SIZES.map((size) => <option key={size.name} value={size.name}>{size.name}</option>)}
          <option value={CUSTOM_THREAD_INSERT}>{t("threadInsert.custom")}</option>
        </select>
      </label>
      {preset === CUSTOM_THREAD_INSERT ? (
        <>
          <label className="edge-modifier-field">
            <span>{t("threadInsert.customDiameter")}</span>
            <input type="text" inputMode="decimal" value={customDiameter} disabled={busy} onChange={(event) => onCustomDiameter(event.target.value)} />
          </label>
          <label className="edge-modifier-field">
            <span>{t("threadInsert.customLength")}</span>
            <input type="text" inputMode="decimal" value={customLength} disabled={busy} onChange={(event) => onCustomLength(event.target.value)} />
          </label>
        </>
      ) : null}
      {spec ? (
        <div className="edge-modifier-target">
          <span>{t("threadInsert.summary", { diameter: millimetres(spec.d3), depth: millimetres(spec.L), wall: millimetres(spec.W) })}</span>
        </div>
      ) : null}

      {ready ? (
        <>
          {coordinates ? (
            <div className="edge-modifier-field">
              <span>{t("threadInsert.position")}</span>
              <div className="shell-opening-options">
                <label>
                  <span>X (mm)</span>
                  <input type="text" inputMode="decimal" aria-label={t("threadInsert.positionX")} value={xText} disabled={busy} onChange={(event) => changeCoordinate("x", event.target.value)} />
                </label>
                <label>
                  <span>Y (mm)</span>
                  <input type="text" inputMode="decimal" aria-label={t("threadInsert.positionY")} value={yText} disabled={busy} onChange={(event) => changeCoordinate("y", event.target.value)} />
                </label>
              </div>
              <span>{t("threadInsert.positionHint")}</span>
            </div>
          ) : null}
          <div className="edge-modifier-field">
            <button type="button" className="secondary" disabled={!centerAvailable || busy} onClick={onCenter}>{t("threadInsert.center")}</button>
            <span>{centerAvailable ? t("threadInsert.centerHint") : t("threadInsert.centerNone")}</span>
          </div>
          <div className="edge-modifier-field"><span>{t("threadInsert.dragHint")}</span></div>
        </>
      ) : null}

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={ready ? onRepick : onCancel}>
          {ready ? t("threadInsert.repick") : t("common.cancel")}
        </button>
        <button type="button" className="primary" disabled={!allowed || busy} onClick={onApply}>
          <Check size={17} />
          {t("threadInsert.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
