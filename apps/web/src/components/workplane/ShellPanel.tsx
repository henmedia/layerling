"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, LoaderCircle, X } from "lucide-react";
import { EdgeFeatureHistory, EdgeModifierSlider, type EdgeHistoryOption } from "@/components/workplane/EdgeModifierPanel";
import { cadModifierUserErrorMessage } from "@/lib/cadModifierRuntime";
import { numberLocale, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { SHELL_STACK_GRIP_AT_MAX, SHELL_STACK_GRIP_HEIGHT_MAX, SHELL_STACK_GRIP_HEIGHT_MIN, SHELL_STACK_GRIP_SIDES, DEFAULT_SHELL_STACK_GRIP, DEFAULT_SHELL_STACK_GRIP_DEPTH, DEFAULT_SHELL_STACK_HEIGHT, SHELL_STACK_GRIP_DEPTH_MAX, SHELL_STACK_GRIP_DEPTH_MIN, SHELL_STACK_GRIP_MAX, SHELL_STACK_GRIP_MIN, SHELL_STACK_MAX_HEIGHT, SHELL_STACK_MIN_HEIGHT, SHELL_STACK_MIN_WALL, type ShellStackFoot } from "@/lib/shellStackLimits";
import { MAX_SHELL_DIVIDERS, MAX_SHELL_DIVIDER_THICKNESS, MIN_SHELL_DIVIDER_HEIGHT, MIN_SHELL_DIVIDER_THICKNESS, SHELL_DIVIDER_THICKNESS, type ShellDividers } from "@/lib/shellGridLimits";
import { DEFAULT_SHELL_SHELF_WIDTH, SHELL_SHELF_MAX_HEIGHT, SHELL_SHELF_MAX_WIDTH, SHELL_SHELF_MIN_HEIGHT, SHELL_SHELF_MIN_WIDTH } from "@/lib/shellShelfLimits";
import { MIN_SHELL_WALL, SHELL_SIDES, shellOpeningsFor, shellOpenSides } from "@/lib/shellLimits";
import type { ShellEdges, ShellOpenings, WorkplaneWorkspaceSettings } from "@/types/layerling";

const SHELL_EDGES: readonly ShellEdges[] = ["round", "sharp"];
const MIN_WALL = MIN_SHELL_WALL;
const WALL_STEP = 0.1;

/** The panel's error in words; a wall that is too thick on a box with rounded top and bottom edges says why (#401). */
function shellErrorMessage(error: string, roundedEdgesHint?: boolean) {
  const message = cadModifierUserErrorMessage(error);
  if (roundedEdgesHint && message === t("shell.errorTooThick")) return `${message} ${t("shell.errorRoundedEdges")}`;
  return message;
}

/**
 * Hollowing a body: one wall thickness and which side stays open. The walls
 * grow inward, so the outside of the body does not move.
 */
export function ShellPanel({
  targetName,
  thickness,
  maxThickness,
  openings,
  edges,
  stack,
  stackOffered,
  stackFoot = null,
  onStackFootChange,
  gridCells,
  gridFit,
  gridMax,
  gridColumns,
  gridRows,
  dividers,
  dividerFullHeight = 0,
  shelf,
  shelfHeight,
  shelfOffered,
  workspace,
  busy,
  error,
  roundedEdgesHint,
  appliedFeatureCount,
  reversibleFeatureCount,
  historyOptions,
  onRemoveFeature,
  onEditFeature,
  onThicknessChange,
  onOpeningsChange,
  onEdgesChange,
  onStackChange,
  onStackLid,
  onGridChange,
  onGridSize,
  onDividersChange,
  onShelfChange,
  onShelfHeightChange,
  onApply,
  onCancel,
}: {
  targetName: string;
  thickness: number;
  maxThickness: number;
  openings: ShellOpenings;
  edges: ShellEdges;
  /** The height in mm of the collar and the groove that let one box stand on the next; 0 for none. */
  stack: number;
  /** Stacking is offered only with the top as the one open side. */
  stackOffered: boolean;
  /** The foot hollow or solid, and the grip recess at the front. */
  stackFoot?: ShellStackFoot | null;
  onStackFootChange?: (value: ShellStackFoot | null) => void;
  /** A Gridfinity baseplate in the floor with this many cells at most (0 for none), the walls fitted to the grid, and how many cells the inside holds at most. */
  gridCells: number;
  gridFit: boolean;
  gridMax: number;
  /** The cells across and along the inside holds, or as asked for: the body is made exactly that large when it is applied. */
  gridColumns: number;
  gridRows: number;
  /** Dividers across (x) and along (z) the inside; null for none. */
  dividers: ShellDividers | null;
  /** About how high the dividers stand at full height, over the floor, in mm: the most the height slider offers. */
  dividerFullHeight?: number;
  /** The width in mm of the ledge round the inside of the wall for a plate to rest on; 0 for none (#1663). */
  shelf: number;
  /** How high in mm the top of the ledge lies above the inside of the floor. */
  shelfHeight: number;
  /** The ledge is offered only with the top as the one open side. */
  shelfOffered: boolean;
  workspace: WorkplaneWorkspaceSettings;
  busy: boolean;
  error: string | null;
  /** A rounded box with rounded top and bottom edges: a wall that is too thick has that as its reason (#401). */
  roundedEdgesHint?: boolean;
  /** The treatments the body already has, to revert or edit (#237). */
  appliedFeatureCount: number;
  reversibleFeatureCount: number;
  historyOptions: EdgeHistoryOption[];
  onRemoveFeature: (id: string) => void;
  onEditFeature?: (id: string) => void;
  onThicknessChange: (value: number) => void;
  onOpeningsChange: (value: ShellOpenings) => void;
  onEdgesChange: (value: ShellEdges) => void;
  onStackChange: (value: number) => void;
  /** Makes a flat stacking lid with the same foot beside the box. */
  onStackLid?: () => void;
  onGridChange: (cells: number, fit: boolean) => void;
  onGridSize: (columns: number, rows: number) => void;
  onDividersChange: (value: ShellDividers | null) => void;
  onShelfChange: (value: number) => void;
  onShelfHeightChange: (value: number) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const openSides = shellOpenSides(openings);
  const title = t("shell.title");
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("shell.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="hollowing" />
          <button type="button" aria-label={t("shell.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span>{t("shell.help")}</span>
      </div>

      <EdgeFeatureHistory
        appliedFeatureCount={appliedFeatureCount}
        reversibleFeatureCount={reversibleFeatureCount}
        historyOptions={historyOptions}
        onRemoveFeature={onRemoveFeature}
        onEditFeature={onEditFeature}
      />

      <>
        <EdgeModifierSlider
          label={t("shell.wall")}
          value={thickness}
          min={MIN_WALL}
          max={Math.max(MIN_WALL, maxThickness)}
          step={WALL_STEP}
          workspace={workspace}
          length
          disabled={busy}
          onChange={onThicknessChange}
        />

        <div className="edge-modifier-field shell-openings" role="group" aria-label={t("shell.openings")}>
          <span>{t("shell.openings")}</span>
          {/* Any set of sides; none at all seals the cavity. */}
          <div className="shell-opening-options shell-side-options">
            {SHELL_SIDES.map((side) => {
              const open = openSides.includes(side);
              return (
                <button
                  key={side}
                  type="button"
                  aria-pressed={open}
                  className={open ? "active" : ""}
                  disabled={busy}
                  onClick={() => onOpeningsChange(shellOpeningsFor(open ? openSides.filter((other) => other !== side) : [...openSides, side]))}
                >
                  {t(`shell.side.${side}`)}
                </button>
              );
            })}
          </div>
          {/* No side open, in one click: the cavity sealed inside (#658). */}
          <div className="shell-opening-options shell-closed-option">
            <button
              type="button"
              aria-pressed={openSides.length === 0}
              className={openSides.length === 0 ? "active" : ""}
              disabled={busy}
              onClick={() => onOpeningsChange(shellOpeningsFor([]))}
            >
              {t("shell.side.closed")}
            </button>
          </div>
          <span className="shell-openings-summary">{openSides.length === 0 ? t("shell.sidesNone") : t("shell.sidesHint")}</span>
        </div>
      </>

      {stackOffered ? (<>
        <div className="edge-modifier-field shell-openings shell-grid" role="group" aria-label={t("shell.grid")}>
          <span>{t("shell.grid")}</span>
          <div className="shell-opening-options">
            <button
              type="button"
              aria-pressed={gridCells > 0}
              className={gridCells > 0 ? "active" : ""}
              disabled={busy || gridMax < 1}
              onClick={() => onGridChange(gridCells > 0 ? 0 : Math.max(1, gridMax), gridFit)}
            >
              {t("shell.grid")}
            </button>
          </div>
          {gridCells > 0 ? (<>
            <EdgeModifierSlider
              label={t("shell.gridCells")}
              value={Math.min(gridCells, Math.max(1, gridMax))}
              min={1}
              max={Math.max(1, gridMax)}
              step={1}
              workspace={workspace}
              decimals={0}
              disabled={busy}
              onChange={(value) => onGridChange(Math.round(value), gridFit)}
            />
            <EdgeModifierSlider
              label={t("shell.gridColumns")}
              value={Math.max(1, gridColumns)}
              min={1}
              max={12}
              step={1}
              workspace={workspace}
              decimals={0}
              disabled={busy}
              onChange={(value) => onGridSize(Math.round(value), Math.max(1, gridRows))}
            />
            <EdgeModifierSlider
              label={t("shell.gridRows")}
              value={Math.max(1, gridRows)}
              min={1}
              max={12}
              step={1}
              workspace={workspace}
              decimals={0}
              disabled={busy}
              onChange={(value) => onGridSize(Math.max(1, gridColumns), Math.round(value))}
            />
            <span className="shell-openings-summary">{t("shell.gridSizeHint")}</span>
            <label className="edge-modifier-field offset-copy">
              <input type="checkbox" checked={gridFit} disabled={busy} onChange={(event) => onGridChange(gridCells, event.target.checked)} />
              <span>{t("shell.gridFit")}</span>
            </label>
          </>) : null}
          <span className="shell-openings-summary">{gridMax < 1 ? t("shell.gridNoCell") : t("shell.gridHint")}</span>
        </div>

        <div className="edge-modifier-field shell-openings shell-dividers" role="group" aria-label={t("shell.dividers")}>
          <span>{t("shell.dividers")}</span>
          <div className="shell-opening-options">
            <button
              type="button"
              aria-pressed={dividers !== null && gridCells === 0}
              className={dividers !== null && gridCells === 0 ? "active" : ""}
              // The bins fill a Gridfinity floor's cells with 0.5 mm between them: no room for a divider anywhere.
              disabled={busy || gridCells > 0}
              onClick={() => onDividersChange(dividers ? null : { x: 1, z: 1 })}
            >
              {t("shell.dividers")}
            </button>
          </div>
          {dividers && gridCells === 0 ? (<>
            <EdgeModifierSlider
              label={t("shell.dividersAcross")}
              value={dividers.x}
              min={0}
              max={MAX_SHELL_DIVIDERS}
              step={1}
              workspace={workspace}
              decimals={0}
              disabled={busy}
              onChange={(value) => onDividersChange({ ...dividers, x: Math.round(value) })}
            />
            <EdgeModifierSlider
              label={t("shell.dividersAlong")}
              value={dividers.z}
              min={0}
              max={MAX_SHELL_DIVIDERS}
              step={1}
              workspace={workspace}
              decimals={0}
              disabled={busy}
              onChange={(value) => onDividersChange({ ...dividers, z: Math.round(value) })}
            />
            <EdgeModifierSlider
              label={t("prop.gridfinityDividerThickness")}
              value={dividers.thickness ?? SHELL_DIVIDER_THICKNESS}
              min={MIN_SHELL_DIVIDER_THICKNESS}
              max={MAX_SHELL_DIVIDER_THICKNESS}
              step={0.1}
              workspace={workspace}
              length
              disabled={busy}
              onChange={(value) => onDividersChange({ ...dividers, thickness: value })}
            />
            {dividerFullHeight > MIN_SHELL_DIVIDER_HEIGHT ? (<>
              <EdgeModifierSlider
                label={t("prop.gridfinityDividerHeight")}
                value={Math.min(dividers.height ?? dividerFullHeight, dividerFullHeight)}
                min={MIN_SHELL_DIVIDER_HEIGHT}
                max={dividerFullHeight}
                step={0.5}
                workspace={workspace}
                length
                disabled={busy}
                // Up at the full height it is the full height again, so it follows the box when the box changes.
                onChange={(value) => {
                  const { height: _height, ...rest } = dividers;
                  onDividersChange(value >= dividerFullHeight - 0.1 ? rest : { ...rest, height: value });
                }}
              />
              {(() => {
                // Quick heights as a share of the full height (floor to rim), and the height set as a share of it.
                // Stored in mm like the Gridfinity compartments' divider height; "flush" is the full height, up to the rim.
                const height = Math.min(dividers.height ?? dividerFullHeight, dividerFullHeight);
                const flush = dividers.height === undefined || height >= dividerFullHeight - 0.1;
                const percent = Math.round((height / dividerFullHeight) * 100);
                const at = (share: number) => Math.max(MIN_SHELL_DIVIDER_HEIGHT, Math.round(dividerFullHeight * share * 10) / 10);
                const { height: _height, ...rest } = dividers;
                return (<>
                  <div className="shell-opening-options shell-divider-quick" role="group" aria-label={t("shell.dividerHeightQuick")}>
                    {[0.25, 0.5, 0.75].map((share) => {
                      const value = at(share);
                      const pressed = !flush && Math.abs(height - value) < 0.05;
                      return (
                        <button key={share} type="button" aria-pressed={pressed} className={pressed ? "active" : ""} disabled={busy} onClick={() => onDividersChange({ ...rest, height: value })}>
                          {`${share * 100} %`}
                        </button>
                      );
                    })}
                    <button type="button" aria-pressed={flush} className={flush ? "active" : ""} disabled={busy} onClick={() => onDividersChange(rest)}>
                      {t("shell.dividerHeightFlush")}
                    </button>
                  </div>
                  <span className="shell-openings-summary">{flush ? t(shelf > 0 ? "shell.dividersUnderShelf" : "shell.dividerHeightFlushHint") : t("shell.dividerHeightPercent", { mm: height.toLocaleString(numberLocale()), percent })}</span>
                </>);
              })()}
              <span className="shell-openings-summary">{t("shell.dividerHeightHint")}</span>
            </>) : null}
          </>) : null}
          <span className="shell-openings-summary">{t(gridCells > 0 ? "shell.dividersNoGrid" : "shell.dividersHint")}</span>
        </div>
      </>) : null}

      {stackOffered ? (
        <div className="edge-modifier-field shell-openings shell-stack" role="group" aria-label={t("shell.stack")}>
          <span>{t("shell.stack")}</span>
          <div className="shell-opening-options">
            <button
              type="button"
              aria-pressed={stack > 0}
              className={stack > 0 ? "active" : ""}
              disabled={busy}
              onClick={() => onStackChange(stack > 0 ? 0 : DEFAULT_SHELL_STACK_HEIGHT)}
            >
              {t("shell.stack")}
            </button>
          </div>
          {stack > 0 ? (
            <EdgeModifierSlider
              label={t("shell.stackHeight")}
              value={stack}
              min={SHELL_STACK_MIN_HEIGHT}
              max={SHELL_STACK_MAX_HEIGHT}
              step={WALL_STEP}
              workspace={workspace}
              length
              disabled={busy}
              onChange={onStackChange}
            />
          ) : null}
          {stack > 0 && onStackFootChange ? (<>
            {/* The foot hollow: the floor on the plate, less filament; a Gridfinity floor needs it solid. */}
            <label className="edge-modifier-field offset-copy">
              <input
                type="checkbox"
                checked={stackFoot?.hollow === true && gridCells === 0}
                disabled={busy || gridCells > 0}
                onChange={(event) => onStackFootChange({ ...(stackFoot ?? {}), hollow: event.target.checked })}
              />
              <span>{t("shell.stackHollow")}</span>
            </label>
            <span className="shell-openings-summary">{t(gridCells > 0 ? "shell.stackHollowGrid" : "shell.stackHollowHint")}</span>
            {/* A grip at the front of the bottom, to lift the box off the one below. */}
            <label className="edge-modifier-field offset-copy">
              <input
                type="checkbox"
                checked={(stackFoot?.grip ?? 0) > 0}
                disabled={busy}
                onChange={(event) => onStackFootChange({ ...(stackFoot ?? {}), grip: event.target.checked ? DEFAULT_SHELL_STACK_GRIP : 0, gripDepth: stackFoot?.gripDepth ?? DEFAULT_SHELL_STACK_GRIP_DEPTH })}
              />
              <span>{t("shell.stackGrip")}</span>
            </label>
            {(stackFoot?.grip ?? 0) > 0 ? (<>
              <EdgeModifierSlider
                label={t("shell.stackGripWidth")}
                value={stackFoot?.grip ?? DEFAULT_SHELL_STACK_GRIP}
                min={SHELL_STACK_GRIP_MIN}
                max={SHELL_STACK_GRIP_MAX}
                step={1}
                workspace={workspace}
                length
                disabled={busy}
                onChange={(value) => onStackFootChange({ ...(stackFoot ?? {}), grip: value })}
              />
              <EdgeModifierSlider
                label={t("shell.stackGripDepth")}
                value={stackFoot?.gripDepth ?? DEFAULT_SHELL_STACK_GRIP_DEPTH}
                min={SHELL_STACK_GRIP_DEPTH_MIN}
                max={SHELL_STACK_GRIP_DEPTH_MAX}
                step={0.5}
                workspace={workspace}
                length
                disabled={busy}
                onChange={(value) => onStackFootChange({ ...(stackFoot ?? {}), gripDepth: value })}
              />
              <EdgeModifierSlider
                label={t("shell.stackGripHeight")}
                value={stackFoot?.gripHeight ?? stack + (stackFoot?.gripDepth ?? DEFAULT_SHELL_STACK_GRIP_DEPTH) + 1}
                min={SHELL_STACK_GRIP_HEIGHT_MIN}
                max={SHELL_STACK_GRIP_HEIGHT_MAX}
                step={0.5}
                workspace={workspace}
                length
                disabled={busy}
                onChange={(value) => onStackFootChange({ ...(stackFoot ?? {}), gripHeight: value })}
              />
              {/* Where it sits up the side: 0 % at the bottom (to lift the box off the one below), 100 % just under the rim. */}
              <EdgeModifierSlider
                label={t("shell.stackGripAt")}
                value={stackFoot?.gripAt ?? 0}
                min={0}
                max={SHELL_STACK_GRIP_AT_MAX}
                step={5}
                unit="%"
                decimals={0}
                workspace={workspace}
                disabled={busy}
                onChange={(value) => onStackFootChange({ ...(stackFoot ?? {}), gripAt: value })}
              />
              <span className="shell-openings-summary">{t("shell.stackGripAtHint")}</span>
              {/* The sides it goes on, one or several; at least one stays. */}
              <div className="edge-modifier-field shell-openings" role="group" aria-label={t("shell.stackGripSides")}>
                <span>{t("shell.stackGripSides")}</span>
                <div className="shell-opening-options">
                  {SHELL_STACK_GRIP_SIDES.map((side) => {
                    const sides = stackFoot?.gripSides?.length ? stackFoot.gripSides : ["front"];
                    const on = sides.includes(side);
                    return (
                      <button
                        key={side}
                        type="button"
                        aria-pressed={on}
                        className={on ? "active" : ""}
                        disabled={busy || (on && sides.length === 1)}
                        onClick={() => onStackFootChange({ ...(stackFoot ?? {}), gripSides: SHELL_STACK_GRIP_SIDES.filter((candidate) => candidate === side ? !on : sides.includes(candidate)) })}
                      >
                        {t(`shell.side.${side}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <span className="shell-openings-summary">{t("shell.stackGripHint")}</span>
            </>) : null}
          </>) : null}
          {stack > 0 && onStackLid ? (
            <div className="shell-opening-options">
              <button type="button" disabled={busy} onClick={onStackLid}>{t("shell.stackLid")}</button>
            </div>
          ) : null}
          {stack > 0 && onStackLid ? <span className="shell-openings-summary">{t("shell.stackLidHint")}</span> : null}
          <span className="shell-openings-summary">{thickness < SHELL_STACK_MIN_WALL && stack > 0 ? t("shell.stackWallThin", { min: SHELL_STACK_MIN_WALL }) : t("shell.stackHint")}</span>
        </div>
      ) : null}

      {shelfOffered ? (
        <div className="edge-modifier-field shell-openings shell-shelf" role="group" aria-label={t("shell.shelf")}>
          <span>{t("shell.shelf")}</span>
          <div className="shell-opening-options">
            <button
              type="button"
              aria-pressed={shelf > 0}
              className={shelf > 0 ? "active" : ""}
              disabled={busy}
              onClick={() => onShelfChange(shelf > 0 ? 0 : DEFAULT_SHELL_SHELF_WIDTH)}
            >
              {t("shell.shelf")}
            </button>
          </div>
          {shelf > 0 ? (
            <>
              <EdgeModifierSlider
                label={t("shell.shelfWidth")}
                value={shelf}
                min={SHELL_SHELF_MIN_WIDTH}
                max={SHELL_SHELF_MAX_WIDTH}
                step={WALL_STEP}
                workspace={workspace}
                length
                disabled={busy}
                onChange={onShelfChange}
              />
              <EdgeModifierSlider
                label={t("shell.shelfHeight")}
                value={shelfHeight}
                min={SHELL_SHELF_MIN_HEIGHT}
                max={SHELL_SHELF_MAX_HEIGHT}
                step={WALL_STEP}
                workspace={workspace}
                length
                disabled={busy}
                onChange={onShelfHeightChange}
              />
            </>
          ) : null}
          <span className="shell-openings-summary">{t("shell.shelfHint")}</span>
        </div>
      ) : null}

      <details className="edge-modifier-field">
          <summary>{t("shell.edges")}</summary>
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("shell.edges")}>
          <span>{t("shell.edges")}</span>
          <div className="shell-opening-options">
            {SHELL_EDGES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={edges === option}
                className={edges === option ? "active" : ""}
                disabled={busy}
                onClick={() => onEdgesChange(option)}
              >
                {t(`shell.edges.${option}`)}
              </button>
            ))}
          </div>
          <span className="shell-openings-summary">{t("shell.edgesHint")}</span>
        </div>
      </details>

      {error ? <div className="edge-modifier-error" role="alert">{shellErrorMessage(error, roundedEdgesHint)}</div> : busy ? <span className="shell-openings-summary" role="status"><LoaderCircle className="edge-modifier-spinner" size={15} />{t("shell.working")}</span> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={busy} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {busy ? t("shell.working") : t("shell.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
