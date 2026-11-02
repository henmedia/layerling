"use client";

import { AlertTriangle, CircleCheck, CircleSlash, LoaderCircle, RefreshCw, X } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import type { ClearanceMark } from "@/components/workplane/ClearanceMarkOverlay";
import { CLEARANCE_SEARCH_MM, clearancePairKey, type ClearanceBox, type ClearanceResult, type ClearanceVec3 } from "@/lib/clearanceCheck";
import { formatEstimateNumber } from "@/lib/editorBooleans";
import { t } from "@/lib/i18n";
import { lengthDisplayUnit, millimetersToDisplay } from "@/lib/measurementUnits";
import { useLanguage } from "@/lib/useLanguage";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

export type ClearanceSettings = { threshold: number; splitParts: boolean };

/** The open panel: its settings, the last result, what it was found for (to see when the design changed) and the row shown. */
export type ClearanceToolState = {
  settings: ClearanceSettings;
  result: ClearanceResult | null;
  running: boolean;
  error: string | null;
  /** The objects as they were checked, by id; null before the first result. */
  checked: ReadonlyMap<string, unknown> | null;
  /** The selection that was checked, or null for every visible object. */
  scopeIds: readonly string[] | null;
  activeRow: string | null;
  /** Counts the clicks on rows: each one brings the camera to the place. */
  request: number;
};

/** One line of the result: what kind, which two parts, and what was found. */
export type ClearanceRow = {
  key: string;
  kind: "overlap" | "touching" | "tight" | "fine" | "unchecked";
  a: string;
  b: string;
  detail: string;
};

/** A length of the result in the unit of the work area: hundredths of a millimetre, thousandths of an inch. */
export function formatClearanceLength(mm: number, workspace: Pick<WorkplaneWorkspaceSettings, "units" | "scale">) {
  const unit = lengthDisplayUnit(workspace);
  const digits = unit.label === "mm" ? 2 : 3;
  return `${formatEstimateNumber(millimetersToDisplay(mm, workspace), digits)} ${unit.label}`;
}

/** The result as the rows of the list, in its order: overlaps, touching, too tight, fine, then what was not checked. */
export function clearanceRows(result: ClearanceResult, workspace: Pick<WorkplaneWorkspaceSettings, "units" | "scale">): ClearanceRow[] {
  const names = new Map(result.parts.map((part) => [part.key, part.name]));
  const name = (key: string) => names.get(key) ?? key;
  const pair = (a: string, b: string) => ({ key: clearancePairKey(a, b), a: name(a), b: name(b) });
  const gap = (value: number, direction: "layer" | "side") => t("clearance.gap", { gap: formatClearanceLength(value, workspace), direction: t(`clearance.direction.${direction}`) });
  return [
    ...result.overlaps.map((overlap) => ({ ...pair(overlap.a, overlap.b), kind: "overlap" as const, detail: t("clearance.overlap", { volume: formatEstimateNumber(overlap.volumeMm3, overlap.volumeMm3 < 10 ? 2 : 1) }) })),
    ...result.touching.map((touch) => ({ ...pair(touch.a, touch.b), kind: "touching" as const, detail: t("clearance.touching") })),
    ...result.tight.map((entry) => ({ ...pair(entry.a, entry.b), kind: "tight" as const, detail: gap(entry.gapMm, entry.direction) })),
    ...result.fine.map((entry) => ({ ...pair(entry.a, entry.b), kind: "fine" as const, detail: gap(entry.gapMm, entry.direction) })),
    ...result.unchecked.map((entry) => ({ ...pair(entry.a, entry.b), kind: "unchecked" as const, detail: t(`clearance.unchecked.${entry.reason}`) })),
  ];
}

const middle = (a: ClearanceVec3, b: ClearanceVec3): ClearanceVec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const boxAround = (a: ClearanceVec3, b: ClearanceVec3): ClearanceBox => ({
  min: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])],
  max: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])],
});

/** Where a row of the result lies, for the view: the gap's two points, or the middle of an overlap or of a touch. */
export function clearanceMarkFor(result: ClearanceResult, key: string, workspace: Pick<WorkplaneWorkspaceSettings, "units" | "scale">, request: number): ClearanceMark | null {
  const same = (entry: { a: string; b: string }) => clearancePairKey(entry.a, entry.b) === key;
  const overlap = result.overlaps.find(same);
  if (overlap) {
    return { kind: "overlap", a: overlap.center, b: overlap.center, box: overlap.box, request, label: `${formatEstimateNumber(overlap.volumeMm3, overlap.volumeMm3 < 10 ? 2 : 1)} mm³` };
  }
  const touch = result.touching.find(same);
  if (touch) {
    // Without a point of contact (the two share a sliver too thin to count) the middle of where their boxes meet.
    const a = result.parts.find((part) => part.key === touch.a)?.box;
    const b = result.parts.find((part) => part.key === touch.b)?.box;
    const point = touch.point ?? (a && b ? middle(
      [Math.max(a.min[0], b.min[0]), Math.max(a.min[1], b.min[1]), Math.max(a.min[2], b.min[2])],
      [Math.min(a.max[0], b.max[0]), Math.min(a.max[1], b.max[1]), Math.min(a.max[2], b.max[2])],
    ) : null);
    return point ? { kind: "touching", a: point, b: point, box: boxAround(point, point), request, label: t("clearance.kind.touching") } : null;
  }
  const tight = result.tight.find(same);
  const gap = tight ?? result.fine.find(same);
  if (!gap) return null;
  return { kind: tight ? "tight" : "fine", a: gap.pointA, b: gap.pointB, box: boxAround(gap.pointA, gap.pointB), request, label: formatClearanceLength(gap.gapMm, workspace) };
}

/** The objects a row of the result names: marked in the view while the row is shown. */
export function clearanceRowIds(result: ClearanceResult, key: string): string[] {
  const ids = result.parts.filter((part) => key.split("\u0000").includes(part.key)).map((part) => part.id);
  return [...new Set(ids)];
}

const ROW_ICON = {
  overlap: AlertTriangle,
  touching: AlertTriangle,
  tight: AlertTriangle,
  fine: CircleCheck,
  unchecked: CircleSlash,
} as const;

/**
 * The clearance check (Spiel prüfen): which parts overlap, touch or come too close, measured on what would be printed.
 * It only reads; closing it leaves the design as it was. A row shows its place in the view.
 */
export function ClearancePanel({
  scope,
  settings,
  workspace,
  result,
  running,
  stale,
  error,
  activeRow,
  onChange,
  onCheck,
  onRow,
  onClose,
}: {
  /** What is checked, in words: the selection or every visible body. */
  scope: string;
  settings: ClearanceSettings;
  workspace: WorkplaneWorkspaceSettings;
  result: ClearanceResult | null;
  running: boolean;
  /** The design changed since the result was found. */
  stale: boolean;
  error: string | null;
  activeRow: string | null;
  onChange: (patch: Partial<ClearanceSettings>) => void;
  onCheck: () => void;
  onRow: (key: string) => void;
  onClose: () => void;
}) {
  useLanguage();
  const title = t("clearance.title");
  const rows = result ? clearanceRows(result, workspace) : [];
  const problems = result ? result.overlaps.length + result.touching.length + result.tight.length : 0;
  const summary = !result
    ? null
    : result.tooFew
      ? t("clearance.tooFew")
      : problems === 0 && result.unchecked.length === 0
        ? t("clearance.allClear", { count: result.parts.length })
        : ([
          ["overlap", result.overlaps.length],
          ["touching", result.touching.length],
          ["tight", result.tight.length],
          ["fine", result.fine.length],
        ] as const).filter(([, count]) => count > 0).map(([kind, count]) => t(`clearance.count.${kind}`, { count })).join(" · ");
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel clearance-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("clearance.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="clearanceCheck" />
          <button type="button" aria-label={t("clearance.close")} onClick={onClose}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{scope}</strong>
        <span>{t("clearance.help")}</span>
      </div>

      <EdgeModifierSlider
        label={t("clearance.threshold")}
        value={settings.threshold}
        min={0.05}
        max={2}
        step={0.05}
        decimals={2}
        length
        workspace={workspace}
        onChange={(value) => onChange({ threshold: value })}
      />

      <label className="edge-modifier-check">
        <input type="checkbox" checked={settings.splitParts} disabled={running} onChange={(event) => onChange({ splitParts: event.currentTarget.checked })} />
        <span>{t("clearance.splitParts")}</span>
      </label>

      {error ? <p className="edge-modifier-error" role="alert">{error}</p> : null}

      <div className="clearance-status" role="status" aria-live="polite">
        {running ? (
          <span><LoaderCircle className="edge-modifier-spinner" size={16} aria-hidden="true" />{t("clearance.running")}</span>
        ) : stale ? (
          <button type="button" className="clearance-stale" onClick={onCheck}><RefreshCw size={15} aria-hidden="true" />{t("clearance.stale")}</button>
        ) : summary ? (
          <span>{summary}</span>
        ) : null}
      </div>

      {rows.length ? (
        <ul className={`clearance-list${stale ? " stale" : ""}`} aria-label={t("clearance.listLabel")}>
          {rows.map((row) => {
            const Icon = ROW_ICON[row.kind];
            return (
              <li key={`${row.kind}-${row.key}`}>
                <button
                  type="button"
                  className={`clearance-row ${row.kind}${activeRow === row.key ? " active" : ""}`}
                  aria-pressed={activeRow === row.key}
                  disabled={row.kind === "unchecked"}
                  onClick={() => onRow(row.key)}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="clearance-row-text">
                    <strong>{row.a} ↔ {row.b}</strong>
                    <span>{t(`clearance.kind.${row.kind}`)} · {row.detail}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {result && !result.tooFew ? (
        <p className="clearance-hint">{t("clearance.hint", { search: formatClearanceLength(CLEARANCE_SEARCH_MM, workspace) })}</p>
      ) : null}

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onClose}>{t("clearance.close")}</button>
        <button type="button" className="primary" disabled={running} onClick={onCheck}>
          <RefreshCw size={17} aria-hidden="true" />
          {result ? t("clearance.checkAgain") : t("clearance.check")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
