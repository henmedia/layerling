"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, LoaderCircle, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { numberLocale, t } from "@/lib/i18n";
import { formatClearanceLength } from "@/components/workplane/ClearancePanel";
import { findingKindName, findingRemedy, findingValueText } from "@/components/workplane/findingText";
import { formatPrintCheckArea } from "@/components/workplane/PrintCheckPanel";
import { formatEstimateNumber } from "@/lib/editorBooleans";
import {
  MOLD_BOX_SHAPES, MOLD_CAST_MATERIAL_DATA, MOLD_CAST_MATERIALS, MOLD_DIE_MODES, MOLD_DIRECTIONS, MOLD_KINDS, MOLD_LIMITS, MOLD_MATERIALS, MOLD_MIN_STRONG_WALL, MOLD_ML_PER_US_FL_OZ,
  MOLD_OPENING_KINDS, MOLD_OUTERS, MOLD_OUTPUTS, MOLD_PIECES, MOLD_POURS, moldDieClearance, moldMixNames, moldWarningText,
  type MoldAnalysis, type MoldDirection, type MoldFigures, type MoldOpeningKind, type MoldOptions,
} from "@/lib/moldTool";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

type Limited = keyof typeof MOLD_LIMITS;

/** The directions a mold of two cases or a core mold's sleeve can part in: no free one. */
const STRAIGHT_DIRECTIONS: readonly MoldDirection[] = ["auto", "z", "x", "y"];
const SIDEWAYS_DIRECTIONS: readonly MoldDirection[] = ["auto", "x", "y"];

/**
 * The mold and die tool: a two-part mold to cast in, a pour box for silicone, a silicone skin mold with its shell, a
 * core mold for a vessel, two cases to pour a mold's halves in, an open tray mold, or a punch and die for sheet, made
 * from the selected master and laid out beside it as they print. What each kind needs is shown for it.
 */
export function MoldPanel({
  targetName,
  settings,
  workspace,
  busy,
  error,
  analysis = null,
  figures = null,
  analysing = false,
  regenerateOf = null,
  openingKind = "sprue",
  onOpeningKind,
  onChange,
  onApply,
  onCancel,
}: {
  targetName: string;
  settings: MoldOptions;
  workspace: WorkplaneWorkspaceSettings;
  busy: boolean;
  error: string | null;
  /** The live check of a two-part mold, while its settings change; null before the first. */
  analysis?: MoldAnalysis | null;
  /** What the pour comes to, for every kind but the die: the volume, the mix and what there is to warn of. */
  figures?: MoldFigures | null;
  analysing?: boolean;
  /** The master's name when the panel was opened from a part of an earlier mold, to make it again. */
  regenerateOf?: string | null;
  /** With "Set the openings myself": what a click on the master in the view sets, a sprue or a vent. */
  openingKind?: MoldOpeningKind;
  onOpeningKind?: (kind: MoldOpeningKind) => void;
  onChange: (patch: Partial<MoldOptions>) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("editor.tool.mold");
  const kind = settings.kind;
  const slider = (key: Limited, step: number, label = t(`mold.${key}`), unit?: string, plain?: { max: number }) => (
    <EdgeModifierSlider
      label={label}
      value={settings[key]}
      min={MOLD_LIMITS[key][0]}
      max={MOLD_LIMITS[key][1]}
      step={step}
      workspace={workspace}
      length={!unit && !plain}
      unit={unit}
      coarse={plain ? { step, max: plain.max } : undefined}
      disabled={busy}
      onChange={(value) => onChange({ [key]: value } as Partial<MoldOptions>)}
    />
  );
  const radio = <K extends "kind" | "dieMode" | "direction" | "castMaterial" | "outer" | "output" | "pieces" | "pour" | "boxShape" | "moldMaterial">(key: K, options: readonly MoldOptions[K][], label: (option: MoldOptions[K]) => string, extra?: (option: MoldOptions[K]) => string | null) => (
    <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t(`mold.${key}`)}>
      <span>{t(`mold.${key}`)}</span>
      <div className="shell-opening-options">
        {options.map((option) => {
          const more = extra?.(option);
          return (
            <button
              key={String(option)}
              type="button"
              role="radio"
              aria-checked={settings[key] === option}
              className={settings[key] === option ? "active" : ""}
              disabled={busy}
              onClick={() => onChange({ [key]: option } as Partial<MoldOptions>)}
            >
              {label(option)}{more ? <small className="mold-option-figure"> {more}</small> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
  const ratingOf = (axis: string) => analysis?.ratings.find((rating) => rating.axis === axis);
  const percent = (value: number) => formatEstimateNumber(value, value < 10 ? 1 : 0);
  const best = analysis ? analysis.ratings.filter((rating) => rating.axis !== "free").sort((a, b) => a.undercutMm2 - b.undercutMm2 || b.partingArea - a.partingArea)[0] : null;
  const length = (mm: number) => formatClearanceLength(mm, workspace);
  const vents = analysis?.highPoints.filter((point) => !point.sprue) ?? [];
  const check = (key: "keys" | "sprue" | "vents" | "ears" | "prySlots" | "pins" | "screws" | "bands" | "wick" | "seal" | "shellSplit" | "drain", disabled = false, label = t(`mold.${key}`)) => (
    <label className="edge-modifier-field offset-copy">
      <input type="checkbox" checked={settings[key] && !disabled} disabled={busy || disabled} onChange={(event) => onChange({ [key]: event.target.checked } as Partial<MoldOptions>)} />
      <span>{label}</span>
    </label>
  );
  const hint = (text: string) => <span className="shell-openings-summary">{text}</span>;
  const four = settings.pieces === "four";
  // Poured through the seam the openings lie in it, and in four parts too: the user's own run the way the mold opens.
  const seam = !four && settings.pour === "seam";
  const own = settings.ownOpenings && !four && !seam;
  const directionRadio = (options: readonly MoldDirection[]) => (<>
    {radio("direction", options, (option) => t(option === "auto" ? "mold.direction.auto" : `mold.direction.${option}`), (option) => {
      const rating = option === "auto" ? best : ratingOf(option);
      return rating ? t("mold.directionValue", { percent: percent(rating.undercutPercent) }) : null;
    })}
  </>);
  const mix = figures?.mix ?? null;
  // What the check above already lists as a finding, or the panel says beside its setting, is not said twice.
  const listed = kind === "twoPart" || kind === "halves" ? ["undercut", "airTrap", "thinWall", "noSprue", "openingMissed"] : ["thinWall"];
  const shownWarnings = (figures?.warnings ?? []).filter((warning) => !listed.includes(warning));
  const grams = (value: number) => formatEstimateNumber(value, 0);
  const clearance = moldDieClearance(settings.dieMode, settings.material).toLocaleString(numberLocale());
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel offset-panel mold-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("mold.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="mold" />
          <button type="button" aria-label={t("mold.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span>{t("mold.help")}</span>
      </div>

      <>
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("mold.kind")}>
          <span>{t("mold.kind")}</span>
          <div className="shell-opening-options">
            {MOLD_KINDS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={kind === option}
                className={kind === option ? "active" : ""}
                disabled={busy}
                onClick={() => onChange({ kind: option })}
              >
                {t(`mold.kind.${option}`)}
              </button>
            ))}
          </div>
          <span className="shell-openings-summary">{t(`mold.kindHint.${kind}`)}</span>
        </div>

        {kind === "twoPart" ? (<>
          {radio("castMaterial", MOLD_CAST_MATERIALS, (option) => t(`mold.castMaterial.${option}`))}
          <span className="shell-openings-summary">{t("mold.castMaterialHint")}</span>
          {radio("pieces", MOLD_PIECES, (option) => t(`mold.pieces.${option}`))}
          {four ? hint(t("mold.piecesHint.four")) : null}
          {directionRadio(MOLD_DIRECTIONS)}
          {best ? <span className="shell-openings-summary">{t("mold.directionHint", { direction: t(`mold.direction.${best.axis}`) })}</span> : null}
          {settings.direction === "free" ? (<>
            {slider("openTilt", 1, t("mold.openTilt"), "°")}
            {slider("openTurn", 1, t("mold.openTurn"), "°")}
            <span className="shell-openings-summary">{t("mold.openHint")}</span>
          </>) : null}
          {four ? null : (<>
          <label className="edge-modifier-field offset-copy">
            <input type="checkbox" checked={settings.autoParting} disabled={busy} onChange={(event) => onChange({ autoParting: event.target.checked })} />
            <span>{t("mold.autoParting")}</span>
          </label>
          {settings.autoParting ? <span className="shell-openings-summary">{t("mold.autoPartingHint")}</span> : (<>
            {slider("parting", 1, t("mold.parting"), "%")}
            <span className="shell-openings-summary">{t("mold.partingHint")}</span>
          </>)}
          {radio("pour", MOLD_POURS, (option) => t(`mold.pour.${option}`))}
          {hint(t(`mold.pourHint.${settings.pour}`))}
          {radio("outer", MOLD_OUTERS, (option) => t(`mold.outer.${option}`))}
          <span className="shell-openings-summary">{t(`mold.outerHint.${settings.outer}`)}</span>
          </>)}
          {slider("wall", 0.5)}
          {settings.wall < MOLD_MIN_STRONG_WALL ? <span className="shell-openings-summary">{t("mold.warning.thinWall")}</span> : null}
          {check("keys")}
          {four ? null : check("seal")}
          {four || seam ? null : (
          <label className="edge-modifier-field offset-copy">
            <input type="checkbox" checked={settings.ownOpenings} disabled={busy} onChange={(event) => onChange({ ownOpenings: event.target.checked })} />
            <span>{t("mold.ownOpenings")}</span>
          </label>
          )}
          {own ? (<>
            {/* The user sets the openings (Discussion #1806): the kind a click in the view sets, and the list of those set. */}
            <span className="shell-openings-summary">{t("mold.ownOpeningsHint")}</span>
            <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("mold.openings.kind")}>
              <span>{t("mold.openings.kind")}</span>
              <div className="shell-opening-options">
                {MOLD_OPENING_KINDS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={openingKind === option}
                    className={openingKind === option ? "active" : ""}
                    disabled={busy}
                    onClick={() => onOpeningKind?.(option)}
                  >
                    {t(`mold.openings.${option}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="edge-modifier-field mold-vents mold-openings" role="group" aria-label={t("mold.openings.title")}>
              <span>{t("mold.openings.title")}</span>
              {settings.openings.length ? (
                <ul>
                  {settings.openings.map((opening, index) => (
                    <li key={index} data-kind={opening.kind}>
                      <span>
                        {t(`mold.openings.${opening.kind}`)} · {formatEstimateNumber(opening.x, 1)} / {formatEstimateNumber(opening.y, 1)} mm
                        {analysis?.missedOpenings?.includes(index) ? <small> ({t("mold.openings.missed")})</small> : null}
                      </span>
                      <button type="button" aria-label={t("mold.openings.remove")} title={t("mold.openings.remove")} disabled={busy} onClick={() => onChange({ openings: settings.openings.filter((_, other) => other !== index) })}>
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <small>{t("mold.openings.none")}</small>}
              <div className="shell-opening-options">
                <button type="button" disabled={busy || !analysis?.suggested.length} onClick={() => onChange({ openings: (analysis?.suggested ?? []).map((opening) => ({ ...opening })) })}>{t("mold.openings.suggested")}</button>
                <button type="button" disabled={busy || !settings.openings.length} onClick={() => onChange({ openings: [] })}>{t("mold.openings.removeAll")}</button>
              </div>
            </div>
            {settings.openings.some((opening) => opening.kind === "sprue") ? null : <span className="shell-openings-summary">{t("mold.warning.noSprue")}</span>}
          </>) : (<>
          {check("sprue")}
          {check("vents", !settings.sprue)}
          </>)}
          {!own && settings.sprue && settings.vents && analysis ? (
            <div className="edge-modifier-field mold-vents" role="group" aria-label={t("mold.vents.title")}>
              <span>{t("mold.vents.title")}</span>
              {vents.length ? vents.map((point, index) => (
                <label key={index} className="offset-copy">
                  <input
                    type="checkbox"
                    checked={!settings.ventsOff.includes(index)}
                    disabled={busy}
                    onChange={(event) => onChange({ ventsOff: event.target.checked ? settings.ventsOff.filter((value) => value !== index) : [...settings.ventsOff, index] })}
                  />
                  <span>{t("mold.vents.item", { number: index + 1 })}</span>
                </label>
              )) : <small>{t("mold.vents.none")}</small>}
            </div>
          ) : null}
          {check("wick", !own && !settings.sprue)}
          {settings.wick ? hint(t("mold.wickHint")) : null}
          {four ? null : (<>
          {check("prySlots")}
          {check("ears")}
          {check("screws")}
          </>)}
          {settings.outer === "block" || four ? check("bands") : null}
          {slider("shrinkage", 0.05, t("mold.shrinkage"), "%")}
          <span className="shell-openings-summary">{t("mold.shrinkageHint")}</span>
          {radio("output", MOLD_OUTPUTS, (option) => t(`mold.output.${option}`))}
          <span className="shell-openings-summary">{t(`mold.outputHint.${settings.output}`)}</span>
        </>) : null}

        {kind === "box" ? (<>
          {radio("boxShape", MOLD_BOX_SHAPES, (option) => t(`mold.boxShape.${option}`))}
          {settings.boxShape === "contour" ? hint(t("mold.boxShapeHint.contour")) : null}
          {slider("gap", 0.5)}
          <span className="shell-openings-summary">{t("mold.gapHint")}</span>
          {slider("above", 0.5)}
          {slider("wall", 0.5, t("mold.frameWall"))}
          {slider("floor", 0.5, t("mold.basePlate"))}
        </>) : null}

        {kind === "skin" ? (<>
          {slider("gap", 0.5, t("mold.skinGap"))}
          {slider("wall", 0.5, t("mold.shellWall"))}
          {settings.wall < MOLD_MIN_STRONG_WALL ? hint(t("mold.warning.thinWall")) : null}
          {slider("floor", 0.5, t("mold.basePlate"))}
          {check("shellSplit")}
          {hint(t("mold.shellSplitHint.skin"))}
          {check("vents")}
        </>) : null}

        {kind === "core" ? (<>
          {radio("castMaterial", MOLD_CAST_MATERIALS, (option) => t(`mold.castMaterial.${option}`))}
          {check("shellSplit")}
          {hint(t("mold.shellSplitHint.core"))}
          {settings.shellSplit ? radio("direction", SIDEWAYS_DIRECTIONS, (option) => t(option === "auto" ? "mold.direction.auto" : `mold.direction.${option}`)) : null}
          {slider("wall", 0.5)}
          {settings.wall < MOLD_MIN_STRONG_WALL ? hint(t("mold.warning.thinWall")) : null}
          {slider("floor", 0.5, t("mold.basePlate"))}
          {check("keys")}
          {check("bands")}
          {check("drain")}
          {settings.drain ? slider("drainDiameter", 0.5) : null}
          {slider("shrinkage", 0.05, t("mold.shrinkage"), "%")}
          <span className="shell-openings-summary">{t("mold.shrinkageHint")}</span>
        </>) : null}

        {kind === "halves" ? (<>
          {radio("moldMaterial", MOLD_MATERIALS, (option) => t(`mold.moldMaterial.${option}`))}
          {hint(t(`mold.moldMaterialHint.${settings.moldMaterial}`))}
          {directionRadio(STRAIGHT_DIRECTIONS)}
          <label className="edge-modifier-field offset-copy">
            <input type="checkbox" checked={settings.autoParting} disabled={busy} onChange={(event) => onChange({ autoParting: event.target.checked })} />
            <span>{t("mold.autoParting")}</span>
          </label>
          {settings.autoParting ? hint(t("mold.autoPartingHint")) : (<>
            {slider("parting", 1, t("mold.parting"), "%")}
            {hint(t("mold.partingHint"))}
          </>)}
          {slider("gap", 0.5, t("mold.around"))}
          {slider("wall", 0.5, t("mold.frameWall"))}
          {slider("floor", 0.5, t("mold.casePlate"))}
          {check("keys", false, t("mold.natches"))}
          {check("sprue", false, t("mold.spare"))}
          {settings.sprue ? slider("sprueDiameter", 0.5) : null}
          {radio("castMaterial", MOLD_CAST_MATERIALS, (option) => t(`mold.castMaterial.${option}`))}
          {slider("shrinkage", 0.05, t("mold.shrinkage"), "%")}
          <span className="shell-openings-summary">{t("mold.shrinkageHint")}</span>
        </>) : null}

        {kind === "tray" ? (<>
          {slider("wall", 0.5)}
          {settings.wall < MOLD_MIN_STRONG_WALL ? <span className="shell-openings-summary">{t("mold.warning.thinWall")}</span> : null}
          {slider("floor", 0.5)}
        </>) : null}

        {kind === "die" ? (<>
          <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("mold.dieMode")}>
            <span>{t("mold.dieMode")}</span>
            <div className="shell-opening-options">
              {MOLD_DIE_MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={settings.dieMode === option}
                  className={settings.dieMode === option ? "active" : ""}
                  disabled={busy}
                  onClick={() => onChange({ dieMode: option })}
                >
                  {t(`mold.dieMode.${option}`)}
                </button>
              ))}
            </div>
          </div>
          {slider("material", 0.1)}
          <span className="shell-openings-summary">{t(settings.dieMode === "cut" ? "mold.clearanceCut" : "mold.clearanceForm", { mm: clearance })}</span>
          {settings.dieMode === "relief" ? <span className="shell-openings-summary">{t("mold.reliefHint")}</span> : slider("depth", 0.5)}
          {slider("base", 0.5)}
          {check("pins")}
        </>) : null}

        {kind === "twoPart" || kind === "tray" || kind === "core" ? <span className="shell-openings-summary">{t("mold.heatHint")}</span> : null}
        {kind === "box" ? <span className="shell-openings-summary">{t("mold.siliconeHint")}</span> : null}
        {kind === "skin" ? hint(t("mold.skinHint")) : null}
        {kind === "core" ? hint(t("mold.coreHint")) : null}
        {kind === "halves" ? hint(t("mold.halvesHint")) : null}
      </>

      {kind === "twoPart" ? (
        <details className="edge-modifier-field">
          <summary>{t("mold.advancedTwoPart")}</summary>
          {settings.keys ? (<>{slider("keySize", 0.5)}{slider("keyFit", 0.05)}</>) : null}
          {own || settings.sprue ? slider("sprueDiameter", 0.5) : null}
          {own || (settings.sprue && settings.vents) ? slider("ventDiameter", 0.5) : null}
          {settings.wick ? slider("wickDiameter", 0.1) : null}
          {settings.ears && !four ? slider("boltDiameter", 0.1) : null}
          {settings.screws && !four ? slider("screwDiameter", 0.1) : null}
          {settings.sprue && !own && !four && !seam ? (<>{slider("sprueShiftX", 0.5)}{slider("sprueShiftY", 0.5)}</>) : null}
          {MOLD_CAST_MATERIAL_DATA[settings.castMaterial].rigid ? slider("draftLimit", 0.5, t("mold.draftLimit"), "°") : null}
          {slider("density", 0.05, t("mold.density"), "g/cm³")}
        </details>
      ) : null}
      {kind === "skin" ? (
        <details className="edge-modifier-field">
          <summary>{t("mold.advancedTwoPart")}</summary>
          {slider("sprueDiameter", 0.5)}
          {settings.vents ? slider("ventDiameter", 0.5) : null}
          {settings.shellSplit ? slider("screwDiameter", 0.1) : null}
        </details>
      ) : null}
      {kind === "core" || kind === "halves" ? (
        <details className="edge-modifier-field">
          <summary>{t("mold.advancedTwoPart")}</summary>
          {settings.keys ? (<>{slider("keySize", 0.5)}{slider("keyFit", 0.05)}</>) : null}
          {kind === "core" ? slider("density", 0.05, t("mold.density"), "g/cm³") : null}
        </details>
      ) : null}
      {kind === "die" ? (
        <details className="edge-modifier-field">
          <summary>{t("mold.advancedDie")}</summary>
          {settings.dieMode === "form" ? (<>{slider("rounding", 0.1)}<span className="shell-openings-summary">{t("mold.roundingHint")}</span></>) : null}
          {settings.pins ? (<>{slider("pinDiameter", 0.5)}{slider("pinFit", 0.05)}</>) : null}
        </details>
      ) : null}

      {kind === "twoPart" || kind === "halves" ? (
        <div className="edge-modifier-field tool-plain-section">
          <strong>{t("mold.analysis")}</strong>
          {analysing && !analysis ? <span className="shell-openings-summary" role="status"><LoaderCircle className="edge-modifier-spinner" size={15} />{t("mold.analysis.running")}</span> : null}
          {analysis ? (
            <div className={`mold-analysis${analysing ? " stale" : ""}`} aria-live="polite">
              <p>{t("mold.analysis.outer", { x: formatEstimateNumber(analysis.outer[0], 1), y: formatEstimateNumber(analysis.outer[1], 1), z: length(analysis.outer[2]) })}</p>
              {kind === "twoPart" ? <p>{t("mold.analysis.volume", { ml: formatEstimateNumber(analysis.volume, 1), oz: formatEstimateNumber(analysis.volume / MOLD_ML_PER_US_FL_OZ, 2) })} · {t("mold.analysis.weight", { g: formatEstimateNumber(analysis.weightG, 0) })}</p> : null}
              <p>{analysis.rating.undercutMm2 >= 5
                ? t("mold.analysis.undercut", { area: formatPrintCheckArea(analysis.rating.undercutMm2), percent: percent(analysis.rating.undercutPercent) })
                : t("mold.analysis.noUndercut")}</p>
              {analysis.fourParts ? <p>{t("mold.analysis.fourParts", { percent: percent(analysis.fourParts.undercutPercent), direction: t(`mold.direction.${analysis.fourParts.axis}`) })}</p> : null}
              {kind === "twoPart" && !analysis.findings.some((finding) => finding.kind === "airTrap") && (own ? settings.openings.some((opening) => opening.kind === "sprue") : settings.sprue) ? <p>{t("mold.analysis.airOk")}</p> : null}
              {analysis.findings.length ? (
                <ul className="layer-check-list" aria-label={t("mold.analysis")}>
                  {analysis.findings.map((finding) => (
                    <li key={finding.id} className={`layer-check-row ${finding.level}`} data-kind={finding.kind}>
                      <span className="layer-check-row-text">
                        <strong>{[findingKindName(finding), findingValueText(finding, workspace)].filter(Boolean).join(" ")}{finding.areaMm2 > 0 ? `, ${formatPrintCheckArea(finding.areaMm2)}` : ""}</strong>
                        <span className="layer-check-row-level">{t(`finding.level.${finding.level}`)}</span>
                        <span className="layer-check-remedy">{findingRemedy(finding, workspace)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <span className="shell-openings-summary">{t("mold.analysis.preview")}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {kind !== "die" ? (
        <div className="edge-modifier-field tool-plain-section mold-mix">
          <strong>{t("mold.mix")}</strong>
          {analysing && !figures ? <span className="shell-openings-summary" role="status"><LoaderCircle className="edge-modifier-spinner" size={15} />{t("mold.analysis.running")}</span> : null}
          {figures ? (
            <div className={`mold-analysis${analysing ? " stale" : ""}`} aria-live="polite">
              {kind !== "twoPart" && kind !== "halves" && figures.outer ? <p>{t("mold.analysis.outer", { x: formatEstimateNumber(figures.outer[0], 1), y: formatEstimateNumber(figures.outer[1], 1), z: length(figures.outer[2]) })}</p> : null}
              <p>{t("mold.analysis.poured", { ml: formatEstimateNumber(figures.volume, 1), oz: formatEstimateNumber(figures.volume / MOLD_ML_PER_US_FL_OZ, 2) })}</p>
              {figures.saved !== undefined && figures.saved >= 1 ? <p>{t("mold.analysis.saved", { ml: formatEstimateNumber(figures.saved, 0), percent: formatEstimateNumber((figures.saved / (figures.saved + figures.volume)) * 100, 0) })}</p> : null}
              {mix ? (
                <p>{mix.bG > 0.5
                  ? t("mold.analysis.mix", { g: grams(mix.totalG), percent: formatEstimateNumber(mix.allowance, 0), a: grams(mix.aG), b: grams(mix.bG), nameA: moldMixNames(mix.material)[0], nameB: moldMixNames(mix.material)[1] })
                  : t("mold.analysis.mixOne", { g: grams(mix.totalG), percent: formatEstimateNumber(mix.allowance, 0) })}</p>
              ) : null}
              {mix && mix.cost !== null ? <p>{t("mold.analysis.cost", { cost: formatEstimateNumber(mix.cost, 2) })}</p> : null}
              {shownWarnings.length ? (
                <ul className="layer-check-list" aria-label={t("mold.mix")}>
                  {shownWarnings.map((warning) => (
                    <li key={warning} className="layer-check-row hint" data-kind={warning}>
                      <span className="layer-check-row-text"><span className="layer-check-remedy">{moldWarningText(warning, 0, figures.rimCut)}</span></span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <details>
            <summary>{t("mold.mixDetails")}</summary>
            {slider("allowance", 1, t("mold.allowance"), "%")}
            {slider("mixA", 1, t("mold.mixA"), undefined, { max: 200 })}
            {slider("mixB", 1, t("mold.mixB"), undefined, { max: 200 })}
            {slider("price", 0.5, t("mold.price"), undefined, { max: 100 })}
            {kind === "tray" ? slider("density", 0.05, t("mold.density"), "g/cm³") : null}
            {hint(t("mold.mixHint"))}
          </details>
        </div>
      ) : null}
      {regenerateOf ? <span className="shell-openings-summary">{t("mold.regenerateHint", { name: regenerateOf })}</span> : null}
      {error ? <div className="edge-modifier-error" role="alert">{error}</div> : busy ? <span className="shell-openings-summary" role="status"><LoaderCircle className="edge-modifier-spinner" size={15} />{t("mold.working")}</span> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={busy} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {busy ? t("mold.working") : regenerateOf ? t("mold.regenerate") : t("mold.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
