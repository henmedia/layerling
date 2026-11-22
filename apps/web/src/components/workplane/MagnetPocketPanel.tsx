"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { numberLocale, t } from "@/lib/i18n";
import {
  CUSTOM_MAGNET_SIZE,
  MAGNET_POCKET_SIZES,
  magnetPocketMeasures,
  magnetPocketSummary,
  magnetSizeFromId,
  magnetSizeId,
  magnetSizeName,
  normalizeMagnetPocketSpec,
  type MagnetPocketSpec,
} from "@/lib/magnetPocket";
import type { ThreadInsertResult } from "@/lib/threadInsert";
import type { ThreadInsertFace } from "@/lib/threadInsertGeometry";
import { useLanguage } from "@/lib/useLanguage";

type Coordinates = { x: number; y: number };

/** The part that meets the picked spot, for the same pocket facing it (magnetPocketGeometry.ts). */
export type MagnetPartnerState =
  | { state: "none" }
  | { state: "looking" }
  | { state: "missing" }
  | { state: "unreadable"; name: string }
  | { state: "found"; shapeId: string; name: string; face: ThreadInsertFace; fingerprint: string };

/**
 * "Magnet pocket": the magnet's size, the spot picked on the part, whether the part has the wall and the depth for the
 * pocket, and whether the part that meets it there gets the same pocket facing it. The ring on the part is green where
 * the pocket may be made, red where not, as the thread insert's.
 */
export function MagnetPocketPanel({
  targetName,
  spec,
  both,
  partner,
  partnerResult,
  result,
  ready,
  busy,
  coordinates,
  centerAvailable,
  onSpec,
  onBoth,
  onCoordinates,
  onCenter,
  onRepick,
  onApply,
  onCancel,
}: {
  targetName: string;
  spec: MagnetPocketSpec;
  /** The same pocket in the part that meets the spot. */
  both: boolean;
  partner: MagnetPartnerState;
  /** What the partner offers at its spot; null without one. */
  partnerResult: ThreadInsertResult | null;
  /** What the part offers at the picked spot; null before a spot is picked. */
  result: ThreadInsertResult | null;
  ready: boolean;
  busy: boolean;
  coordinates: Coordinates | null;
  centerAvailable: boolean;
  onSpec: (spec: MagnetPocketSpec) => void;
  onBoth: (both: boolean) => void;
  onCoordinates: (x: number, y: number) => void;
  onCenter: () => void;
  onRepick: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("magnetPocket.title");
  const millimetres = (value: number) => (Math.round(value * 100) / 100).toLocaleString(numberLocale());
  const [xText, setXText] = useState("");
  const [yText, setYText] = useState("");
  const [diameterText, setDiameterText] = useState(millimetres(spec.diameter));
  const [heightText, setHeightText] = useState(millimetres(spec.height));
  const [gapText, setGapText] = useState(millimetres(spec.gap));
  useEffect(() => setXText(coordinates ? millimetres(coordinates.x) : ""), [coordinates?.x]);
  useEffect(() => setYText(coordinates ? millimetres(coordinates.y) : ""), [coordinates?.y]);
  useEffect(() => setDiameterText(millimetres(spec.diameter)), [spec.diameter]);
  useEffect(() => setHeightText(millimetres(spec.height)), [spec.height]);
  useEffect(() => setGapText(millimetres(spec.gap)), [spec.gap]);
  const changeCoordinate = (axis: "x" | "y", text: string) => {
    if (axis === "x") setXText(text);
    else setYText(text);
    if (!coordinates || busy || text.trim() === "") return;
    const value = Number(text.replace(",", "."));
    if (Number.isFinite(value)) onCoordinates(axis === "x" ? value : coordinates.x, axis === "y" ? value : coordinates.y);
  };
  /** A typed measure is taken when it is a number, held within its limits. */
  const changeMeasure = (field: "diameter" | "height" | "gap", text: string, setText: (text: string) => void) => {
    setText(text);
    const value = Number(text.replace(",", "."));
    if (text.trim() !== "" && Number.isFinite(value)) onSpec(normalizeMagnetPocketSpec({ ...spec, [field]: value }));
  };

  const status = !ready
    ? t("magnetPocket.step.pick")
    : !result || result.invalid
      ? t("threadInsert.invalidMeasure")
      : result.allowed
        ? t("threadInsert.allowed", { wall: millimetres(result.wall), depth: millimetres(result.materialDepth) })
        : null;
  const problems = ready && result && !result.invalid && !result.allowed ? (
    <>
      {result.wallShort ? (
        <span role="alert">
          {t("magnetPocket.wallShort", { wall: millimetres(Math.max(0, result.wall)), required: millimetres(result.requiredWall), minimum: millimetres(Math.round(result.minimumOuterDiameter * 10 + 1) / 10) })}
        </span>
      ) : null}
      {result.depthShort ? (
        <span role="alert">{t("magnetPocket.depthShort", { depth: millimetres(result.materialDepth), required: millimetres(result.requiredDepth) })}</span>
      ) : null}
    </>
  ) : null;
  const partnerLine = !both || !ready
    ? null
    : partner.state === "looking"
      ? t("magnetPocket.partner.looking")
      : partner.state === "missing" || partner.state === "none"
        ? t("magnetPocket.partner.missing")
        : partner.state === "unreadable"
          ? t("magnetPocket.partner.unreadable", { name: partner.name })
          : partnerResult?.allowed
            ? t("magnetPocket.partner.found", { name: partner.name })
            : t("magnetPocket.partner.blocked", { name: partner.name });
  const allowed = Boolean(ready && result?.allowed);
  const sizeId = magnetSizeId(spec);

  return (
    <MovableToolPanel className="edge-modifier-panel thread-insert-panel magnet-pocket-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("magnetPocket.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="magnetPocket" />
          <button type="button" aria-label={t("magnetPocket.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        {status ? <span role="status">{status}</span> : null}
        {problems}
      </div>

      <label className="edge-modifier-field">
        <span>{t("magnetPocket.size")}</span>
        <select
          value={sizeId}
          disabled={busy}
          onChange={(event) => {
            const size = magnetSizeFromId(event.target.value);
            if (size) onSpec({ ...spec, diameter: size.diameter, height: size.height });
          }}
        >
          {MAGNET_POCKET_SIZES.map((size) => (
            <option key={`${size.diameter}x${size.height}`} value={`${size.diameter}x${size.height}`}>{t("magnetPocket.sizeOption", { size: magnetSizeName(size) })}</option>
          ))}
          <option value={CUSTOM_MAGNET_SIZE}>{t("magnetPocket.custom")}</option>
        </select>
      </label>
      <div className="edge-modifier-field">
        <div className="shell-opening-options">
          <label>
            <span>{t("magnetPocket.diameter")}</span>
            <input type="text" inputMode="decimal" aria-label={t("magnetPocket.diameter")} value={diameterText} disabled={busy} onChange={(event) => changeMeasure("diameter", event.target.value, setDiameterText)} />
          </label>
          <label>
            <span>{t("magnetPocket.height")}</span>
            <input type="text" inputMode="decimal" aria-label={t("magnetPocket.height")} value={heightText} disabled={busy} onChange={(event) => changeMeasure("height", event.target.value, setHeightText)} />
          </label>
        </div>
      </div>
      <label className="edge-modifier-field">
        <span>{t("magnetPocket.gap")}</span>
        <input type="text" inputMode="decimal" value={gapText} disabled={busy} onChange={(event) => changeMeasure("gap", event.target.value, setGapText)} />
      </label>
      <label className="edge-modifier-check" title={t("magnetPocket.wellHint")}>
        <input type="checkbox" checked={spec.well} disabled={busy} onChange={(event) => onSpec({ ...spec, well: event.currentTarget.checked })} />
        <span>{t("magnetPocket.well")}</span>
      </label>
      <div className="edge-modifier-target">
        <span>{magnetPocketSummary(magnetPocketMeasures(spec))}</span>
      </div>
      <label className="edge-modifier-check" title={t("magnetPocket.bothHint")}>
        <input type="checkbox" checked={both} disabled={busy} onChange={(event) => onBoth(event.currentTarget.checked)} />
        <span>{t("magnetPocket.both")}</span>
      </label>
      {partnerLine ? <div className="edge-modifier-target"><span role="status">{partnerLine}</span></div> : null}

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
          <div className="edge-modifier-field shell-openings">
            <div className="shell-opening-options">
              <button type="button" disabled={!centerAvailable || busy} onClick={onCenter}>{t("threadInsert.center")}</button>
            </div>
            <span>{centerAvailable ? t("threadInsert.centerHint") : t("threadInsert.centerNone")}</span>
          </div>
          <div className="edge-modifier-field"><span>{t("magnetPocket.dragHint")}</span></div>
        </>
      ) : null}
      <div className="edge-modifier-field"><span>{t("magnetPocket.polarityHint")}</span></div>

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={ready ? onRepick : onCancel}>
          {ready ? t("threadInsert.repick") : t("common.cancel")}
        </button>
        <button type="button" className="primary" disabled={!allowed || busy} onClick={onApply}>
          <Check size={17} />
          {t("magnetPocket.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
