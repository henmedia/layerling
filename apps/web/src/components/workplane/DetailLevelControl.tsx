"use client";

import { SlidersVertical, X } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { DETAIL_LEVELS, detailItems, detailShows, isOwnDetail, setDetail, setDetailLevel, type DetailItem, type DetailLevel, type DetailView } from "@/lib/detailLevel";
import { markEscapeHandled } from "@/lib/escapeHandled";
import { t, type MessageKey } from "@/lib/i18n";
import { useDetailLevel } from "@/lib/useDetailLevel";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";

/** An aid that a setting or another switch can have off as well: ticking it here turns that on too. */
export type DetailSource = { on: boolean; turnOn: () => void };

const PANEL: MovablePanelOptions = {
  floatingStyle: { bottom: "auto", animation: "none" },
  area: (panel) => panel.closest<HTMLElement>(".workplane-stage, .sketch-workspace-stage"),
};

const ITEM_LABELS: Record<DetailItem, MessageKey> = {
  notes: "detail.notes",
  plateLabels: "workspace.showPlateLabels",
  referencePoints: "detail.referencePoints",
  distances: "detail.distances",
  dimensions: "detail.dimensions",
  snapGuides: "detail.snapGuides",
  axes: "workspace.showAxes",
  grid: "detail.grid",
  partEdges: "detail.partEdges",
  measurements: "detail.dimensions",
};

export function detailLevelName(view: DetailView, level: DetailLevel) {
  return t(level === 1 && view === "sketch" ? "detail.level1Sketch" : `detail.level${level}`);
}

/** The view bar's detail level: the button, and beside it the slider with a switch for every aid. */
export function DetailLevelControl({ view, sources }: { view: DetailView; sources: Partial<Record<DetailItem, DetailSource>> }) {
  const [open, setOpen] = useState(false);
  const { state } = useDetailLevel(view as "editor");
  const own = isOwnDetail(state);
  const name = own ? t("detail.own") : detailLevelName(view, state.level);
  const title = `${t("detail.title")}: ${name}`;
  return (
    <div
      className="detail-control-group"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        event.stopPropagation();
        markEscapeHandled(event.nativeEvent);
        setOpen(false);
      }}
    >
      <button
        className={open || own || state.level !== 5 ? "active" : ""}
        aria-label={title}
        title={title}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersVertical size={24} strokeWidth={2.15} aria-hidden="true" />
      </button>
      {open ? <DetailPanel view={view} sources={sources} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function DetailPanel({ view, sources, onClose }: { view: DetailView; sources: Partial<Record<DetailItem, DetailSource>>; onClose: () => void }) {
  const movable = useMovablePanel<HTMLDivElement>("layerling.editor.detailPanelPosition", PANEL);
  const { currentPosition, moveTo, moved } = movable;
  // It grows upwards from its button: with the bar moved up its title bar would lie above the work area.
  useLayoutEffect(() => {
    if (moved) return;
    const at = currentPosition();
    if (at && at.top < 0) moveTo({ left: at.left, top: 8 });
  }, [currentPosition, moveTo, moved]);
  const { state } = useDetailLevel(view as "editor");
  const name = isOwnDetail(state) ? t("detail.own") : detailLevelName(view, state.level);
  return (
    <div
      ref={movable.panelRef}
      className={`section-tool-popover detail-popover ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      role="group"
      aria-label={t("detail.title")}
    >
      <div className="section-popover-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
        <span className="section-popover-title">{t("detail.title")}</span>
        <GuideHelpLink section="detailLevel" className="section-popover-help" iconSize={17} strokeWidth={2.2} />
        <button type="button" className="section-popover-close" aria-label={t("workspace.close")} title={t("workspace.close")} onClick={onClose}>
          <X size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      <strong className="detail-level-name" aria-live="polite">{name}</strong>
      <input
        type="range"
        className="section-slider"
        min={DETAIL_LEVELS[0]}
        max={DETAIL_LEVELS[DETAIL_LEVELS.length - 1]}
        step={1}
        value={state.level}
        aria-label={t("detail.title")}
        aria-valuetext={name}
        onChange={(event) => setDetailLevel(view, Number(event.target.value) as DetailLevel)}
        // Back from a choice of one's own to the plain level, where the thumb already stands.
        onPointerUp={(event) => {
          if (Number(event.currentTarget.value) === state.level) setDetailLevel(view, state.level);
        }}
      />
      <div className="detail-items">
        {detailItems(view).map((item) => {
          const source = sources[item];
          const shown = detailShows(view, state, item) && source?.on !== false;
          return (
            <label key={item} className="section-checkbox-label">
              <input
                type="checkbox"
                checked={shown}
                onChange={(event) => {
                  if (event.target.checked && source && !source.on) source.turnOn();
                  setDetail(view, item, event.target.checked);
                }}
              />
              <span>{t(ITEM_LABELS[item])}</span>
            </label>
          );
        })}
      </div>
      <span className="detail-hint">{t("detail.hint")}</span>
    </div>
  );
}
