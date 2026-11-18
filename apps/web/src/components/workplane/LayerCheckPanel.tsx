"use client";

import { AlertOctagon, AlertTriangle, Check, ChevronDown, ChevronUp, CircleCheck, Layers, LoaderCircle, Pause, Play, RefreshCw, Square, Wrench, X } from "lucide-react";
import { useEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { formatClearanceLength } from "@/components/workplane/ClearancePanel";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { findingKindName, findingLine, findingRemedy } from "@/components/workplane/findingText";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { formatPrintCheckArea } from "@/components/workplane/PrintCheckPanel";
import { formatEstimateNumber } from "@/lib/editorBooleans";
import { countFindings, filterFindings, type Finding, type FindingKind } from "@/lib/findings";
import { t } from "@/lib/i18n";
import { LAYER_CHECK_LIMITS, layerCheckMinimumWall, type LayerCheckOptions, type LayerCheckResult } from "@/lib/layerCheck";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

/** The settings the panel offers: everything of the check but the printer's volume, which comes from the workspace. */
export type LayerCheckSettings = Omit<LayerCheckOptions, "buildVolume">;
export type LayerViewMode = "upTo" | "only" | "range";
export const LAYER_VIEW_MODES: readonly LayerViewMode[] = ["upTo", "only", "range"];
/** Layers a second when playing. */
export const LAYER_VIEW_SPEEDS = [5, 10, 25, 50] as const;

export type LayerViewState = {
  open: boolean;
  /** The layer shown, counted from 1. */
  layer: number;
  mode: LayerViewMode;
  /** The lowest layer shown in "from - to". */
  from: number;
  ghost: boolean;
  playing: boolean;
  speed: number;
};

/** The open panel: its settings, the last result, what it was made for and what is shown. */
export type LayerCheckToolState = {
  settings: LayerCheckSettings;
  result: LayerCheckResult | null;
  running: boolean;
  /** How far the running check got, 0 to 1. */
  progress: number;
  stopped: boolean;
  error: string | null;
  checked: ReadonlyMap<string, unknown> | null;
  scopeIds: readonly string[] | null;
  activeId: string | null;
  /** Counts the jumps to a finding: each brings the camera there. */
  request: number;
  filterKind: FindingKind | "";
  filterPart: string;
  view: LayerViewState;
};

export const LAYER_VIEW_DEFAULTS: LayerViewState = { open: false, layer: 1, mode: "upTo", from: 1, ghost: true, playing: false, speed: 10 };

type Limited = keyof typeof LAYER_CHECK_LIMITS;

const LEVEL_ICON = { problem: AlertOctagon, hint: AlertTriangle } as const;

/**
 * The slider of the layer view, standing upright as the part does: the first layer at the bottom, a mark at the side for
 * every finding (yellow a hint, red a problem) over the layers it spans, and beside it the cross-section's area over the
 * height, drawn as a profile. Dragging the slider or clicking the profile picks a layer; clicking a mark, its finding.
 */
function LayerSlider({
  result,
  findings,
  layer,
  from,
  mode,
  activeId,
  onLayer,
  onFinding,
  onKey,
}: {
  result: LayerCheckResult;
  findings: readonly Finding[];
  layer: number;
  from: number;
  mode: LayerViewMode;
  activeId: string | null;
  onLayer: (layer: number) => void;
  onFinding: (finding: Finding) => void;
  onKey: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const count = result.layers.length;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const height = 240;
  const toY = (number: number) => height - ((number - 0.5) / Math.max(1, count)) * height;
  const fromY = (y: number) => Math.min(count, Math.max(1, Math.round(((height - y) / height) * count + 0.5)));
  const maxArea = Math.max(1e-9, ...result.layers.map((entry) => entry.areaMm2));
  const profile = useMemo(() => {
    if (!count) return "";
    const points = result.layers.map((entry) => `${(entry.areaMm2 / maxArea) * 100},${toY(entry.number)}`);
    return `M0,${height} L${points.join(" L")} L0,0 Z`;
    // toY depends on count only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.layers, maxArea, count]);
  const pick = (event: PointerEvent<HTMLElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    onLayer(fromY(((event.clientY - rect.top) / rect.height) * height));
  };
  const current = result.layers[layer - 1];
  return (
    <div className="layer-view-slider">
      <div
        ref={trackRef}
        className="layer-view-track"
        role="slider"
        tabIndex={0}
        aria-label={t("layerCheck.view.slider")}
        aria-orientation="vertical"
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={layer}
        aria-valuetext={current ? t("layerCheck.view.layer", { number: layer, count }) : undefined}
        style={{ height }}
        onKeyDown={onKey}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons & 1) pick(event);
        }}
      >
        {mode === "range" ? <span className="layer-view-range" style={{ top: toY(layer) - 1, height: Math.max(2, toY(from) - toY(layer) + 2) }} /> : null}
        <span className="layer-view-fill" style={{ top: toY(layer), height: height - toY(layer) }} />
        <span className="layer-view-thumb" style={{ top: toY(layer) - 6 }} />
      </div>
      <div className="layer-view-marks" style={{ height }}>
        {findings.filter((finding) => finding.layerFrom !== undefined).map((finding) => {
          const top = toY(finding.layerTo ?? 1) - 1.5;
          const bottom = toY(finding.layerFrom ?? 1) + 1.5;
          return (
            <button
              key={finding.id}
              type="button"
              tabIndex={-1}
              className={`layer-view-mark ${finding.level}${finding.id === activeId ? " active" : ""}`}
              style={{ top, height: Math.max(3, bottom - top) }}
              title={findingKindName(finding)}
              aria-label={findingKindName(finding)}
              onClick={() => onFinding(finding)}
            />
          );
        })}
      </div>
      <svg
        className="layer-view-chart"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        style={{ height }}
        role="img"
        aria-label={t("layerCheck.view.chart")}
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onLayer(fromY(((event.clientY - rect.top) / rect.height) * height));
        }}
      >
        <path d={profile} />
        <line x1={0} x2={100} y1={toY(layer)} y2={toY(layer)} />
      </svg>
    </div>
  );
}

/**
 * The layer check (Druckanalyse): what goes wrong when the parts are printed, found layer by layer in one go and listed
 * as findings, with the layer view to see why. It only reads; closing it leaves the design and the camera as they were.
 */
export function LayerCheckPanel({
  scope,
  state,
  workspace,
  stale,
  onChange,
  onCheck,
  onStop,
  onFinding,
  onStep,
  onAction,
  onFilter,
  onView,
  onClose,
}: {
  scope: string;
  state: LayerCheckToolState;
  workspace: WorkplaneWorkspaceSettings;
  stale: boolean;
  onChange: (patch: Partial<LayerCheckSettings>) => void;
  onCheck: () => void;
  onStop: () => void;
  onFinding: (finding: Finding) => void;
  onStep: (step: 1 | -1) => void;
  onAction: (finding: Finding) => void;
  onFilter: (patch: { filterKind?: FindingKind | ""; filterPart?: string }) => void;
  onView: (patch: Partial<LayerViewState>) => void;
  onClose: () => void;
}) {
  useLanguage();
  const { settings, result, running, view } = state;
  const title = t("layerCheck.title");
  const wall = layerCheckMinimumWall(settings);
  const all = result?.findings ?? [];
  const shown = filterFindings(all, { kinds: state.filterKind ? [state.filterKind] : null, partId: state.filterPart || null });
  const counts = countFindings(all);
  const kinds = [...new Set(all.map((finding) => finding.kind))];
  const parts = [...new Map(all.flatMap((finding) => finding.partIds.map((id) => [id, finding.partName] as const))).entries()];
  const count = result?.layers.length ?? 0;
  const layerInfo = result?.layers[view.layer - 1];
  const active = all.find((finding) => finding.id === state.activeId) ?? null;
  const length = (mm: number) => formatClearanceLength(mm, workspace);

  // Playing: a layer up at the speed chosen, until the top.
  useEffect(() => {
    if (!view.playing || !count) return;
    const timer = window.setInterval(() => {
      onView({ layer: Math.min(count, view.layer + 1), ...(view.layer + 1 >= count ? { playing: false } : {}) });
    }, 1000 / Math.max(1, view.speed));
    return () => window.clearInterval(timer);
  }, [count, onView, view.layer, view.playing, view.speed]);

  const key = (event: KeyboardEvent<HTMLElement>) => {
    if (!count) return;
    const go = (layer: number) => {
      event.preventDefault();
      event.stopPropagation();
      onView({ layer: Math.min(count, Math.max(1, layer)), playing: false });
    };
    if (event.key === "ArrowUp" || event.key === "ArrowRight") go(view.layer + 1);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") go(view.layer - 1);
    else if (event.key === "PageUp") go(view.layer + 10);
    else if (event.key === "PageDown") go(view.layer - 10);
    else if (event.key === "Home") go(1);
    else if (event.key === "End") go(count);
    else if (event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onView({ playing: !view.playing, ...(view.layer >= count ? { layer: 1 } : {}) });
    } else if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      event.stopPropagation();
      onStep(event.shiftKey ? -1 : 1);
    }
  };

  const slider = (name: Limited, step: number, unit?: string) => (
    <EdgeModifierSlider
      label={t(`layerCheck.${name}`)}
      value={settings[name]}
      min={LAYER_CHECK_LIMITS[name][0]}
      max={LAYER_CHECK_LIMITS[name][1]}
      step={step}
      workspace={workspace}
      length={!unit}
      unit={unit}
      disabled={running}
      onChange={(value) => onChange({ [name]: value } as Partial<LayerCheckSettings>)}
    />
  );

  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel clearance-panel layer-check-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("layerCheck.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="layerCheck" />
          <button type="button" aria-label={t("layerCheck.close")} onClick={onClose}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{scope}</strong>
        <span>{t("layerCheck.help")}</span>
      </div>

      <>
        {slider("layerHeight", 0.01)}
        <div className="edge-modifier-field shell-openings layer-check-presets" role="group" aria-label={t("layerCheck.layerHeight")}>
          <div className="shell-opening-options">
            {[0.1, 0.12, 0.16, 0.2, 0.28].map((height) => (
              <button key={height} type="button" aria-pressed={Math.abs(settings.layerHeight - height) < 1e-9} className={Math.abs(settings.layerHeight - height) < 1e-9 ? "active" : ""} disabled={running} onClick={() => onChange({ layerHeight: height })}>
                {formatEstimateNumber(height, 2)}
              </button>
            ))}
          </div>
        </div>
        <div className="edge-modifier-field shell-openings" role="group" aria-label={t("layerCheck.nozzle")}>
          <span>{t("layerCheck.nozzle")}</span>
          <div className="shell-opening-options">
            {[0.2, 0.4, 0.6, 0.8].map((nozzle) => (
              <button key={nozzle} type="button" aria-pressed={Math.abs(settings.nozzle - nozzle) < 1e-9} className={Math.abs(settings.nozzle - nozzle) < 1e-9 ? "active" : ""} disabled={running} onClick={() => onChange({ nozzle })}>
                {formatEstimateNumber(nozzle, 1)}
              </button>
            ))}
          </div>
        </div>
      </>
      <details className="edge-modifier-field">
          <summary>{t("layerCheck.advanced")}</summary>
        {slider("overhangHint", 1, "°")}
        {slider("overhangProblem", 1, "°")}
        {slider("bridgeSpan", 0.5)}
        {slider("minWall", 0.05)}
        <span className="shell-openings-summary">{t("layerCheck.minWallHint", { wall: length(2 * settings.nozzle) })}</span>
        {slider("smallIsland", 0.1, "mm²")}
        {slider("minArea", 0.01, "mm²")}
      </details>

      <div className="edge-modifier-field tool-plain-section">
          <strong>{t("layerCheck.listLabel")}</strong>
        {state.error ? <p className="edge-modifier-error" role="alert">{state.error}</p> : null}
        <div className="clearance-status" role="status" aria-live="polite">
          {running ? (
            <div className="layer-check-progress">
              <span className="shell-openings-summary" role="status"><LoaderCircle className="edge-modifier-spinner" size={15} />{t("layerCheck.running", { percent: Math.round(state.progress * 100) })}</span>
              <progress max={1} value={state.progress} aria-label={t("layerCheck.running", { percent: Math.round(state.progress * 100) })} />
              <button type="button" className="print-check-show" onClick={onStop}><Square size={12} aria-hidden="true" />{t("layerCheck.stop")}</button>
            </div>
          ) : state.stopped ? (
            <button type="button" className="clearance-stale" onClick={onCheck}><RefreshCw size={15} aria-hidden="true" />{t("layerCheck.stopped")}</button>
          ) : stale ? (
            <button type="button" className="clearance-stale" onClick={onCheck}><RefreshCw size={15} aria-hidden="true" />{t("layerCheck.stale")}</button>
          ) : result ? (
            <span>{all.length ? t("layerCheck.summary", { problems: counts.problems, hints: counts.hints }) : t("layerCheck.noFindings")}</span>
          ) : null}
        </div>

        {all.length > 1 ? (
          <div className="layer-check-filters">
            <label>
              <span>{t("layerCheck.filterKind")}</span>
              <select value={state.filterKind} onChange={(event) => onFilter({ filterKind: event.currentTarget.value as FindingKind | "" })}>
                <option value="">{t("layerCheck.filterAllKinds")}</option>
                {kinds.map((kind) => <option key={kind} value={kind}>{findingKindName({ kind })}</option>)}
              </select>
            </label>
            {parts.length > 1 ? (
              <label>
                <span>{t("layerCheck.filterPart")}</span>
                <select value={state.filterPart} onChange={(event) => onFilter({ filterPart: event.currentTarget.value })}>
                  <option value="">{t("layerCheck.filterAllParts")}</option>
                  {parts.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        {shown.length ? (
          <ul className={`layer-check-list${stale ? " stale" : ""}`} aria-label={t("layerCheck.listLabel")}>
            {shown.map((finding) => {
              const Icon = LEVEL_ICON[finding.level];
              return (
                <li key={finding.id} className={`layer-check-row ${finding.level}${finding.id === state.activeId ? " active" : ""}`} data-kind={finding.kind}>
                  <button type="button" className="layer-check-row-main" disabled={running} onClick={() => onFinding(finding)} aria-current={finding.id === state.activeId ? "true" : undefined}>
                    <Icon size={16} aria-hidden="true" />
                    <span className="layer-check-row-text">
                      <strong>{findingLine(finding, workspace, { wall })}</strong>
                      <span className="layer-check-row-level">{t(`finding.level.${finding.level}`)}{finding.partName ? ` · ${finding.partName}` : ""}</span>
                      <span className="layer-check-remedy">{findingRemedy(finding, workspace, { wall })}</span>
                    </span>
                  </button>
                  {finding.action ? (
                    <button type="button" className="print-check-show" disabled={running || stale} onClick={() => onAction(finding)}>
                      <Wrench size={13} aria-hidden="true" />
                      {t(`finding.action.${finding.action}`)}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : result && !running && !all.length ? (
          <p className="layer-check-clear"><CircleCheck size={16} aria-hidden="true" /> {t("layerCheck.noFindingsLong")}</p>
        ) : null}
        {result?.coarsened ? <span className="shell-openings-summary">{t("layerCheck.coarsened", { mm: formatEstimateNumber(result.layerHeight, 2) })}</span> : null}
      </div>

      {result && count ? (
        <div className="edge-modifier-field tool-plain-section">
          <strong>{t("layerCheck.view")}</strong>
          <div className="layer-view-head">
            <button type="button" className={`print-check-show${view.open ? " active" : ""}`} aria-pressed={view.open} onClick={() => onView({ open: !view.open, playing: false })}>
              <Layers size={14} aria-hidden="true" />
              {view.open ? t("layerCheck.view.close") : t("layerCheck.view.open")}
            </button>
            <div className="layer-view-steps">
              <button type="button" aria-label={t("layerCheck.view.previous")} title={`${t("layerCheck.view.previous")} (⇧N)`} disabled={!all.length} onClick={() => onStep(-1)}><ChevronDown size={16} /></button>
              <button type="button" aria-label={t("layerCheck.view.next")} title={`${t("layerCheck.view.next")} (N)`} disabled={!all.length} onClick={() => onStep(1)}><ChevronUp size={16} /></button>
            </div>
          </div>
          {view.open ? (
            <div className="layer-view" onKeyDown={key}>
              <div className="layer-view-readout" aria-live="polite">
                <strong>{t("layerCheck.view.layer", { number: view.layer, count })}</strong>
                <span>{layerInfo ? length(layerInfo.top) : ""}</span>
                <span>{layerInfo ? t("layerCheck.view.info", { islands: layerInfo.islands, area: formatPrintCheckArea(layerInfo.areaMm2) }) : ""}</span>
                {active ? <span className={`layer-view-active ${active.level}`}>{findingKindName(active)}</span> : null}
              </div>
              <LayerSlider
                result={result}
                findings={shown}
                layer={view.layer}
                from={view.from}
                mode={view.mode}
                activeId={state.activeId}
                onLayer={(layer) => onView({ layer, playing: false })}
                onFinding={onFinding}
                onKey={key}
              />
              <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("layerCheck.view.mode")}>
                <span>{t("layerCheck.view.mode")}</span>
                <div className="shell-opening-options">
                  {LAYER_VIEW_MODES.map((mode) => (
                    <button key={mode} type="button" role="radio" aria-checked={view.mode === mode} className={view.mode === mode ? "active" : ""} onClick={() => onView({ mode, ...(mode === "range" && view.from >= view.layer ? { from: Math.max(1, view.layer - 10) } : {}) })}>
                      {t(`layerCheck.view.mode.${mode}`)}
                    </button>
                  ))}
                </div>
              </div>
              {view.mode === "range" ? (
                <label className="edge-modifier-field layer-view-from">
                  <span>{t("layerCheck.view.from")}</span>
                  <input type="range" min={1} max={view.layer} value={Math.min(view.from, view.layer)} onChange={(event) => onView({ from: Number(event.currentTarget.value) })} />
                  <output>{Math.min(view.from, view.layer)}</output>
                </label>
              ) : null}
              <label className="edge-modifier-field offset-copy">
                <input type="checkbox" checked={view.ghost} onChange={(event) => onView({ ghost: event.currentTarget.checked })} />
                <span>{t("layerCheck.view.ghost")}</span>
              </label>
              <div className="layer-view-play">
                <button type="button" className="print-check-show" onClick={() => onView({ playing: !view.playing, ...(view.layer >= count ? { layer: 1 } : {}) })}>
                  {view.playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
                  {view.playing ? t("layerCheck.view.pause") : t("layerCheck.view.play")}
                </button>
                <label>
                  <span>{t("layerCheck.view.speed")}</span>
                  <select value={view.speed} onChange={(event) => onView({ speed: Number(event.currentTarget.value) })}>
                    {LAYER_VIEW_SPEEDS.map((speed) => <option key={speed} value={speed}>{t("layerCheck.view.perSecond", { count: speed })}</option>)}
                  </select>
                </label>
              </div>
              <span className="shell-openings-summary">{t("layerCheck.view.keys")}</span>
              <p className="layer-check-note">{t("layerCheck.view.notSlicer")}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {result?.unchecked.length ? <p className="clearance-hint">{t("layerCheck.unchecked", { names: result.unchecked.map((entry) => entry.name).join(", ") })}</p> : null}

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onClose}>{t("layerCheck.close")}</button>
        <button type="button" className="primary" disabled={running} onClick={onCheck}>
          {running ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {running ? t("layerCheck.runningShort") : result ? t("layerCheck.checkAgain") : t("layerCheck.check")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
