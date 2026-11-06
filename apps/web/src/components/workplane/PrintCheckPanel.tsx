"use client";

import { AlertTriangle, CircleCheck, CircleSlash, Eye, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { formatClearanceLength } from "@/components/workplane/ClearancePanel";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import type { ClearanceBox } from "@/lib/clearanceCheck";
import { formatEstimateNumber } from "@/lib/editorBooleans";
import { formatTriangleCount } from "@/lib/editorMeshCore";
import { t } from "@/lib/i18n";
import { overhangFiguresText } from "@/lib/overhangFigures";
import {
  PRINT_CHECK_CONTACT_MM2_PER_MM,
  PRINT_CHECK_FOOTPRINT_HEIGHT_MM,
  PRINT_CHECK_MIN_THIN_AREA_MM2,
  PRINT_CHECK_NOZZLES,
  PRINT_CHECK_TOUCH_MM,
  normalizePrintCheckOptions,
  printCheckFloating,
  printCheckMinimumWall,
  printCheckSmallContacts,
  printCheckWarnings,
  type PrintCheckResult,
} from "@/lib/printCheck";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

export type PrintCheckSettings = { nozzle: number };

/** The five lines of the panel, in their order. */
export const PRINT_CHECK_LINES = ["thin", "floating", "contact", "overhang", "openMesh"] as const;
export type PrintCheckLine = (typeof PRINT_CHECK_LINES)[number];

/** The open panel: its nozzle, the last result, what it was found for (to see when the design changed) and the line shown. */
export type PrintCheckToolState = {
  settings: PrintCheckSettings;
  result: PrintCheckResult | null;
  running: boolean;
  error: string | null;
  /** The objects as they were checked, by id; null before the first result. */
  checked: ReadonlyMap<string, unknown> | null;
  /** The selection the panel was opened for, or null for every visible object; Check again checks the same. */
  scopeIds: readonly string[] | null;
  active: PrintCheckLine | null;
  /** What the camera frames for the line shown. */
  focus: ClearanceBox | null;
  /** Counts the clicks on Show: each one brings the camera to the place. */
  request: number;
};

/**
 * One line of the result: its title, what was found and where ("detail"), and what that means for the print. "ok"
 * lines say in their detail that nothing was found; "unchecked" says why the check could not be made.
 */
export type PrintCheckRow = {
  line: PrintCheckLine;
  state: "ok" | "warning" | "unchecked";
  title: string;
  detail: string;
  meaning: string | null;
};

/** At most this many parts are named in a line; the rest are counted. */
const NAMED_PARTS = 3;

/** An area as the panel writes it: mm² up to 100, cm² above. */
export function formatPrintCheckArea(mm2: number) {
  if (mm2 < 100) return `${formatEstimateNumber(mm2, mm2 < 10 ? 2 : 1)} mm²`;
  return `${formatEstimateNumber(mm2 / 100, mm2 < 1000 ? 2 : 1)} cm²`;
}

function namedList(items: string[]) {
  if (items.length <= NAMED_PARTS) return items.join(", ");
  return `${items.slice(0, NAMED_PARTS).join(", ")} ${t("printCheck.more", { count: items.length - NAMED_PARTS })}`;
}

/** The result as the lines of the panel: thin walls, floating parts, small contact, overhangs and open meshes. */
export function printCheckRows(result: PrintCheckResult, workspace: Pick<WorkplaneWorkspaceSettings, "units" | "scale">): PrintCheckRow[] {
  const length = (mm: number) => formatClearanceLength(mm, workspace);
  const wall = length(result.minimumWallMm);
  const rows: PrintCheckRow[] = [];

  const thin = result.thinWalls;
  const thinnest = thin?.places[0];
  rows.push(!thin
    ? { line: "thin", state: "unchecked", title: t("printCheck.thin.title"), detail: t("printCheck.thin.tooMany", { triangles: formatTriangleCount(result.wallTriangles) }), meaning: null }
    : thinnest
      ? {
        line: "thin",
        state: "warning",
        title: t("printCheck.thin.title"),
        detail: t("printCheck.thin.found", { thickness: length(thinnest.thinnestMm), name: thinnest.name, area: formatPrintCheckArea(thin.places.reduce((sum, place) => sum + place.areaMm2, 0)), wall }),
        meaning: t("printCheck.thin.meaning"),
      }
      : { line: "thin", state: "ok", title: t("printCheck.thin.title"), detail: t("printCheck.thin.ok", { wall }), meaning: null });

  const floating = printCheckFloating(result);
  rows.push(floating.length
    ? {
      line: "floating",
      state: "warning",
      title: t("printCheck.floating.title"),
      detail: namedList(floating.map((piece) => t("printCheck.floating.item", { name: piece.name, height: length(Math.max(0, piece.box.min[1])) }))),
      meaning: t("printCheck.floating.meaning"),
    }
    : { line: "floating", state: "ok", title: t("printCheck.floating.title"), detail: t("printCheck.floating.ok"), meaning: null });

  const contact = printCheckSmallContacts(result);
  rows.push(contact.length
    ? {
      line: "contact",
      state: "warning",
      title: t("printCheck.contact.title"),
      detail: namedList(contact.map((piece) => t("printCheck.contact.item", { name: piece.name, area: formatPrintCheckArea(piece.footprintMm2 ?? 0), height: length(piece.heightMm) }))),
      meaning: t("printCheck.contact.meaning"),
    }
    : { line: "contact", state: "ok", title: t("printCheck.contact.title"), detail: t("printCheck.contact.ok"), meaning: null });

  // The same line "Show overhangs" writes under the view.
  rows.push({
    line: "overhang",
    state: result.overhang.areaMm2 > 0 ? "warning" : "ok",
    title: t("printCheck.overhang.title"),
    detail: overhangFiguresText(result.overhang),
    meaning: result.overhang.areaMm2 > 0 ? t("printCheck.overhang.meaning", { angle: result.overhang.angle }) : null,
  });

  rows.push(result.openMeshes.length
    ? {
      line: "openMesh",
      state: "warning",
      title: t("printCheck.openMesh.title"),
      detail: namedList(result.openMeshes.map((mesh) => t("printCheck.openMesh.item", { name: mesh.name, open: mesh.openEdges, shared: mesh.nonManifoldEdges }))),
      meaning: t("printCheck.openMesh.meaning"),
    }
    : { line: "openMesh", state: "ok", title: t("printCheck.openMesh.title"), detail: t("printCheck.openMesh.ok"), meaning: null });
  return rows;
}

/**
 * The objects Show selects for a line: the parts in the air, those on too little of the plate, the open meshes. The
 * thin walls are painted already, and the overhangs hatched; their objects stay as they are selected.
 */
export function printCheckLineIds(result: PrintCheckResult, line: PrintCheckLine): string[] {
  const ids = line === "floating"
    ? printCheckFloating(result).flatMap((piece) => piece.ids)
    : line === "contact"
      ? printCheckSmallContacts(result).flatMap((piece) => piece.ids)
      : line === "openMesh"
        ? result.openMeshes.map((mesh) => mesh.id)
        : [];
  return [...new Set(ids)];
}

/** What the camera frames for a line: the boxes of what it found, together; null for the overhangs and an ok line. */
export function printCheckLineFocus(result: PrintCheckResult, line: PrintCheckLine): ClearanceBox | null {
  const boxes = line === "thin"
    ? (result.thinWalls?.places ?? []).map((place) => place.box)
    : line === "floating"
      ? printCheckFloating(result).map((piece) => piece.box)
      : line === "contact"
        ? printCheckSmallContacts(result).map((piece) => piece.box)
        : line === "openMesh"
          ? result.openMeshes.map((mesh) => mesh.box)
          : [];
  if (!boxes.length) return null;
  return {
    min: [0, 1, 2].map((axis) => Math.min(...boxes.map((box) => box.min[axis]))) as ClearanceBox["min"],
    max: [0, 1, 2].map((axis) => Math.max(...boxes.map((box) => box.max[axis]))) as ClearanceBox["max"],
  };
}

const ROW_ICON = { ok: CircleCheck, warning: AlertTriangle, unchecked: CircleSlash } as const;

/** The nozzle: the usual sizes as buttons, and a field for any other, taken on Enter or when the field is left. */
function NozzleChoice({ nozzle, disabled, workspace, onChange }: { nozzle: number; disabled: boolean; workspace: WorkplaneWorkspaceSettings; onChange: (nozzle: number) => void }) {
  const format = (value: number) => formatEstimateNumber(value, 2);
  const [draft, setDraft] = useState(format(nozzle));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setDraft(format(nozzle));
  }, [editing, nozzle]);
  const take = () => {
    setEditing(false);
    const typed = Number(draft.trim().replace(",", "."));
    if (!Number.isFinite(typed) || typed <= 0) {
      setDraft(format(nozzle));
      return;
    }
    const next = normalizePrintCheckOptions({ nozzle: typed }).nozzle;
    setDraft(format(next));
    if (Math.abs(next - nozzle) > 1e-9) onChange(next);
  };
  return (
    <div className="edge-modifier-field shell-openings print-check-nozzle" role="group" aria-label={t("printCheck.nozzle")}>
      <span>{t("printCheck.nozzle")}</span>
      <div className="shell-opening-options print-check-nozzles">
        {PRINT_CHECK_NOZZLES.map((size) => (
          <button key={size} type="button" aria-pressed={Math.abs(nozzle - size) < 1e-9} className={Math.abs(nozzle - size) < 1e-9 ? "active" : ""} disabled={disabled} onClick={() => onChange(size)}>
            {format(size)}
          </button>
        ))}
        <label className="print-check-nozzle-field">
          <input
            type="text"
            inputMode="decimal"
            aria-label={t("printCheck.nozzleField")}
            value={draft}
            disabled={disabled}
            onFocus={() => setEditing(true)}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={take}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                take();
              }
            }}
          />
          <span aria-hidden="true">mm</span>
        </label>
      </div>
      <small className="print-check-nozzle-hint">{t("printCheck.nozzleHint", { wall: formatClearanceLength(printCheckMinimumWall(nozzle), workspace) })}</small>
    </div>
  );
}

/**
 * The print check (Druck prüfen): what would go wrong when the bodies are printed as they stand. It only reads;
 * closing it leaves the design as it was. Each line that found something has a Show button: the thin walls are painted
 * red on the bodies all the while, Show brings the camera there; the parts in the air, on too little of the plate or
 * with an open mesh are selected; the overhangs switch "Show overhangs" on.
 */
export function PrintCheckPanel({
  scope,
  settings,
  workspace,
  result,
  running,
  stale,
  error,
  active,
  overhangsShown,
  onChange,
  onCheck,
  onShow,
  onClose,
}: {
  /** What is checked, in words: the selection or every visible body. */
  scope: string;
  settings: PrintCheckSettings;
  workspace: WorkplaneWorkspaceSettings;
  result: PrintCheckResult | null;
  running: boolean;
  /** The design changed since the result was found. */
  stale: boolean;
  error: string | null;
  active: PrintCheckLine | null;
  /** "Show overhangs" is on: the overhang line's Show has nothing more to switch on. */
  overhangsShown: boolean;
  onChange: (patch: Partial<PrintCheckSettings>) => void;
  onCheck: () => void;
  onShow: (line: PrintCheckLine) => void;
  onClose: () => void;
}) {
  useLanguage();
  const title = t("printCheck.title");
  const rows = result ? printCheckRows(result, workspace) : [];
  const warnings = result ? printCheckWarnings(result) : 0;
  const summary = !result ? null : warnings === 0 ? t("printCheck.allClear") : t("printCheck.warnings", { count: warnings, total: PRINT_CHECK_LINES.length });
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel clearance-panel print-check-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("printCheck.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="printCheck" />
          <button type="button" aria-label={t("printCheck.close")} onClick={onClose}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{scope}</strong>
        <span>{t("printCheck.help")}</span>
      </div>

      <NozzleChoice nozzle={settings.nozzle} disabled={running} workspace={workspace} onChange={(nozzle) => onChange({ nozzle })} />

      {error ? <p className="edge-modifier-error" role="alert">{error}</p> : null}

      <div className="clearance-status" role="status" aria-live="polite">
        {running ? (
          <span><LoaderCircle className="edge-modifier-spinner" size={16} aria-hidden="true" />{t("printCheck.running")}</span>
        ) : stale ? (
          <button type="button" className="clearance-stale" onClick={onCheck}><RefreshCw size={15} aria-hidden="true" />{t("printCheck.stale")}</button>
        ) : summary ? (
          <span>{summary}</span>
        ) : null}
      </div>

      {rows.length ? (
        <ul className={`clearance-list print-check-list${stale ? " stale" : ""}`} aria-label={t("printCheck.listLabel")}>
          {rows.map((row) => {
            const Icon = ROW_ICON[row.state];
            const shown = row.line === "overhang" ? overhangsShown : active === row.line;
            return (
              <li key={row.line} className={`print-check-row ${row.state}${active === row.line ? " active" : ""}`} data-line={row.line}>
                <Icon size={16} aria-hidden="true" />
                <span className="clearance-row-text">
                  <strong>{row.title}</strong>
                  <span>{row.detail}</span>
                  {row.meaning ? <span className="print-check-meaning">{row.meaning}</span> : null}
                </span>
                {row.state === "warning" ? (
                  <button
                    type="button"
                    className="print-check-show"
                    aria-pressed={shown}
                    aria-label={`${t("printCheck.show")}: ${row.title}`}
                    disabled={stale || running}
                    onClick={() => onShow(row.line)}
                  >
                    <Eye size={14} aria-hidden="true" />
                    {t("printCheck.show")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {result ? (
        <p className="clearance-hint">
          {t("printCheck.hint", {
            area: formatPrintCheckArea(PRINT_CHECK_MIN_THIN_AREA_MM2),
            touch: formatClearanceLength(PRINT_CHECK_TOUCH_MM, workspace),
            ratio: formatEstimateNumber(PRINT_CHECK_CONTACT_MM2_PER_MM, 1),
            height: formatClearanceLength(PRINT_CHECK_FOOTPRINT_HEIGHT_MM, workspace),
          })}
          {result.unchecked.length ? ` ${t("printCheck.unchecked", { names: namedList(result.unchecked.map((entry) => entry.name)) })}` : ""}
          {result.joined ? "" : ` ${t("printCheck.notJoined")}`}
        </p>
      ) : null}

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onClose}>{t("printCheck.close")}</button>
        <button type="button" className="primary" disabled={running} onClick={onCheck}>
          <RefreshCw size={17} aria-hidden="true" />
          {result ? t("printCheck.checkAgain") : t("printCheck.check")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
