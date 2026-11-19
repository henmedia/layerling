"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, X } from "lucide-react";
import { useRef } from "react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { numberLocale, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import {
  HOLE_PATTERN_MANY_HOLES,
  HOLE_PATTERN_MAX_HOLES,
  HOLE_PATTERN_MAX_MARGIN,
  HOLE_PATTERN_MAX_PERIMETER_COUNT,
  HOLE_PATTERN_MAX_SIZE,
  HOLE_PATTERN_MAX_HOLE_ANGLE,
  HOLE_PATTERN_MAX_HOLE_TILT,
  HOLE_PATTERN_MAX_SPACING,
  HOLE_PATTERN_MIN_SIZE,
  HOLE_PATTERN_MIN_PERIMETER_COUNT,
  HOLE_PATTERN_MIN_WALL,
  MAX_CORNER_COUNT,
  MIN_CORNER_COUNT,
  MIN_ROUND_COUNT,
  normalizeCornerCount,
  normalizeRackUnits,
  RACK_HOLE_SPACING,
  RACK_PANEL_WIDTH,
  RACK_SLOT_LENGTH,
  RACK_SLOT_WIDTH,
  RACK_STANDARD_PANELS,
  holeHasHead,
  holeTiltApplies,
  holeHeadDepth,
  holeHeadSize,
  holePatternHasRowSpacing,
  holePatternMinRowSpacing,
  holePatternMinSpacing,
  holePatternRowSpacing,
  holePatternWall,
  withoutHoleTilt,
  type HoleArrangement,
  type HoleForm,
  type HolePatternSettings,
  type HoleType,
  type RackFit,
} from "@/lib/holePattern";
import { holePatternScrewPatch, holePatternScrewSize, holePatternScrewSizes } from "@/lib/holePatternShapes";
import type { ScrewHoleSize } from "@/lib/screwHoleSizes";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

const HOLE_FORMS: readonly HoleForm[] = ["round", "square", "rectangle", "hexagon", "slot", "custom"];
const ARRANGEMENTS: readonly HoleArrangement[] = ["grid", "staggered", "perimeter"];
const HOLE_TYPES: readonly HoleType[] = ["plain", "counterbore", "countersink"];

/**
 * "Hole pattern": once a flat face of the body is picked, the holes that fit it
 * show as ghosts while the numbers change, and "Create" groups them with the
 * body. The holes stay ordinary hole shapes.
 */
export function HolePatternPanel({
  targetName,
  step,
  settings,
  workspace,
  thickness,
  holeCount,
  tooMany,
  ring,
  roundFace,
  rack,
  wall,
  customChoices,
  customIsHole,
  busy,
  onChange,
  onRepick,
  onApply,
  onCancel,
}: {
  targetName: string;
  step: "pick" | "ready";
  settings: HolePatternSettings;
  workspace: WorkplaneWorkspaceSettings;
  /** How thick the body is behind the picked face; the depth slider runs up to it. */
  thickness: number;
  holeCount: number;
  tooMany: boolean;
  /** Holes round the edge (#1232): the length of the line they go round on, and whether they sit on its corners. */
  ring?: { length: number; onCorners: boolean };
  /** Mounting holes on a round face (a round box's lid): they go evenly round a circle, any number from three. */
  roundFace?: boolean;
  /** 19" rack holes: how the slots came out on the picked face, or why there are none. */
  rack?: RackFit;
  /** A round wall picked (#1393): its diameter, and round a closed one how many holes a row holds at what step. */
  wall?: { diameter: number; closed: boolean; columns?: number; spacing?: number };
  /** Own shape (#1235): the other objects of the scene that can be repeated, and whether the chosen one is a hole. */
  customChoices: { id: string; name: string }[];
  customIsHole: boolean;
  busy: boolean;
  onChange: (patch: Partial<HolePatternSettings>) => void;
  onRepick: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("holePattern.title");
  const ready = step === "ready";
  const twoSizes = settings.form === "rectangle" || settings.form === "slot";
  const head = holeHasHead(settings) ? settings.holeType as "counterbore" | "countersink" : null;
  const perimeter = settings.arrangement === "perimeter";
  // Mounting holes (four in the corners) are their own part of the tool, apart from the patterns for vents and grilles.
  const mounting = settings.arrangement === "corners" && !wall;
  // Mounting holes for a 19" rack: the standard slots, so the size, head and distance do not apply.
  const forRack = mounting && Boolean(settings.rack);
  const screws = mounting && !forRack;
  const lastPatternRef = useRef<HoleArrangement>(settings.arrangement === "corners" ? "staggered" : settings.arrangement);
  if (settings.arrangement !== "corners") lastPatternRef.current = settings.arrangement;
  const byCount = perimeter && settings.perimeterBy === "count";
  const screwSize = holePatternScrewSize(settings);
  const custom = settings.form === "custom";
  const customMissing = custom && customChoices.length === 0;
  const pieces = custom && !customIsHole;
  const sizeLabel = head
    ? t("prop.screwHoleShaft")
    : settings.form === "round"
    ? t("holePattern.size.diameter")
    : settings.form === "square"
      ? t("holePattern.size.side")
      : settings.form === "hexagon"
        ? t("holePattern.size.corners")
        : t("holePattern.size.width");
  const status = customMissing
    ? t("holePattern.customNone")
    : !ready
    ? t("holePattern.step.pick")
    : tooMany
      ? t("holePattern.tooMany", { limit: settings.allowMany ? HOLE_PATTERN_MANY_HOLES : HOLE_PATTERN_MAX_HOLES })
      : holeCount === 0
        ? t("holePattern.none")
        : pieces
          ? t(holeCount === 1 ? "holePattern.countPieces.one" : "holePattern.countPieces.many", { count: holeCount })
          : t(holeCount === 1 ? "holePattern.count.one" : "holePattern.count.many", { count: holeCount });
  const maxDepth = Math.max(1, Math.ceil(thickness * 2) / 2);
  // Round a wall the holes go in rows round it; a ring along the edge is a flat face's arrangement.
  // The wall between holes is measured square to them; round a wall they stand straight for now.
  const spaced = wall ? withoutHoleTilt(settings) : settings;
  const arrangements = wall ? ARRANGEMENTS.filter((option) => option !== "perimeter") : ARRANGEMENTS;
  const pattern = !mounting;
  const millimetres = (value: number) => (Math.round(value * 10) / 10).toLocaleString(numberLocale());
  const wallNote = wall
    ? wall.closed && wall.columns
      ? t("holePattern.roundWallClosed", { diameter: millimetres(wall.diameter), columns: wall.columns, spacing: millimetres(wall.spacing ?? settings.spacing) })
      : t("holePattern.roundWallPart", { diameter: millimetres(wall.diameter) })
    : null;
  const millimetres2 = (value: number) => (Math.round(value * 10000) / 10000).toLocaleString(numberLocale(), { maximumFractionDigits: 4 });
  // What the rack's slots came to on this face, or why there are none, in a line under the choice.
  const rackSlots = t("holePattern.rack.slots", { length: millimetres2(RACK_SLOT_LENGTH), width: millimetres2(RACK_SLOT_WIDTH), across: millimetres2(RACK_HOLE_SPACING) });
  // Why a rack's slots do not fit this face, said in the status line instead of the general "no hole fits".
  const rackMiss = forRack && ready && rack && !rack.ok
    ? rack.reason === "narrow"
          ? t("holePattern.rack.narrow", { width: millimetres2(rack.width), panel: millimetres2(RACK_PANEL_WIDTH) })
          : rack.units && rack.standardHeight !== undefined
            ? t("holePattern.rack.lowStandard", { units: rack.units, height: millimetres2(rack.standardHeight), own: millimetres2(rack.height) })
            : t("holePattern.rack.low", { height: millimetres2(rack.height) })
    : null;
  const rackNote = !forRack
    ? ""
    : !ready || !rack || !rack.ok
      ? rackSlots
      : [
            rackSlots,
            t("holePattern.rack.placed", { spacing: millimetres2(rack.spacing), edge: millimetres2(rack.edge) }),
            rack.units ? "" : t("holePattern.rack.space", { units: rack.space }),
            rack.units && rack.standardHeight !== undefined && Math.abs(rack.height - rack.standardHeight) > 0.05
              ? t("holePattern.rack.notStandard", { units: rack.units, height: millimetres2(rack.standardHeight), panel: millimetres2(RACK_PANEL_WIDTH), own: millimetres2(rack.height) })
              : "",
          ].filter(Boolean).join(" ");

  return (
    <MovableToolPanel className="edge-modifier-panel hole-pattern-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("holePattern.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="holePattern" />
          <button type="button" aria-label={t("holePattern.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span role="status">{rackMiss ?? status}</span>
        {ready && wallNote ? <span>{wallNote}</span> : null}
      </div>

      {/* Two jobs, kept apart: a pattern of holes (vents, grilles) or four mounting holes in the corners, for screws. */}
      {wall ? null : (
        <div className="edge-modifier-field shell-openings hole-pattern-modes" role="tablist" aria-label={t("holePattern.title")}>
          <div className="shell-opening-options">
            {([false, true] as const).map((forMounting) => (
              <button
                key={String(forMounting)}
                type="button"
                role="tab"
                aria-selected={mounting === forMounting}
                className={mounting === forMounting ? "active" : ""}
                onClick={() => {
                  if (mounting === forMounting) return;
                  onChange(forMounting ? { arrangement: "corners", form: "round" } : { arrangement: lastPatternRef.current });
                }}
              >
                {t(forMounting ? "holePattern.mode.mounting" : "holePattern.mode.pattern")}
              </button>
            ))}
          </div>
        </div>
      )}
      {mounting ? (
        <div className="hole-pattern-mounting-title">
          <strong>{t("holePattern.mode.mounting")}</strong>
          <span>{t("holePattern.mounting.hint")}</span>
        </div>
      ) : null}

      {/* What the holes are for: screws of a lid or board, or the rails of a 19" rack. */}
      {mounting ? (
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("holePattern.mounting.for")}>
          <span>{t("holePattern.mounting.for")}</span>
          <div className="shell-opening-options">
            {([false, true] as const).map((option) => (
              <button
                key={String(option)}
                type="button"
                role="radio"
                aria-checked={forRack === option}
                className={forRack === option ? "active" : ""}
                onClick={() => onChange({ rack: option })}
              >
                {t(option ? "holePattern.rack.option" : "holePattern.rack.screws")}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {forRack ? (
        <label className="edge-modifier-field">
          <span>{t("holePattern.rack.size")}</span>
          <select value={normalizeRackUnits(settings.rackUnits)} onChange={(event) => onChange({ rackUnits: Number(event.target.value) })}>
            <option value={0}>{t("holePattern.rack.fit")}</option>
            {RACK_STANDARD_PANELS.map((panel) => (
              <option key={panel.units} value={panel.units}>{t("holePattern.rack.standard", { units: panel.units, height: millimetres2(panel.height) })}</option>
            ))}
          </select>
        </label>
      ) : null}
      {forRack ? <p className="hole-pattern-mounting-note">{rackNote}</p> : null}

      {pattern ? <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("holePattern.form")}>
        <span>{t("holePattern.form")}</span>
        <div className="shell-opening-options hole-pattern-forms">
          {HOLE_FORMS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={settings.form === option}
              className={settings.form === option ? "active" : ""}
              onClick={() => onChange({ form: option })}
            >
              {t(`holePattern.form.${option}`)}
            </button>
          ))}
        </div>
      </div> : null}

      {/* Own shape (#1235): a shape of the scene repeated in place of a hole; its width and depth are its room. */}
      {custom && !customMissing ? (
        <label className="edge-modifier-field">
          <span>{t("holePattern.customShape")}</span>
          <select value={settings.customId ?? ""} onChange={(event) => onChange({ customId: event.target.value })}>
            {customChoices.map((choice) => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
          </select>
        </label>
      ) : null}

      {/* A rack's slots are the standard size: none of the hole's own numbers apply. */}
      {forRack ? null : (<>
      {/* A round hole can take a screw's head (#1232). */}
      {settings.form === "round" ? (
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("holePattern.holeType")}>
          <span>{t("holePattern.holeType")}</span>
          <div className="shell-opening-options">
            {HOLE_TYPES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={(settings.holeType ?? "plain") === option}
                className={(settings.holeType ?? "plain") === option ? "active" : ""}
                onClick={() => onChange({ holeType: option })}
              >
                {t(option === "plain" ? "holePattern.holeType.plain" : `shape.${option}`)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {head ? (
        <label className="edge-modifier-field">
          <span>{t("prop.screwHoleSize")}</span>
          <select
            value={screwSize ?? ""}
            title={t(head === "counterbore" ? "prop.screwHoleSizeCounterboreHint" : "prop.screwHoleSizeCountersinkHint")}
            onChange={(event) => {
              if (event.target.value) onChange(holePatternScrewPatch(head, event.target.value as ScrewHoleSize));
            }}
          >
            <option value="">{t("holePattern.screwSize.own")}</option>
            {holePatternScrewSizes(head).map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      ) : null}

      {custom ? null : <EdgeModifierSlider
        label={sizeLabel}
        value={settings.size}
        min={HOLE_PATTERN_MIN_SIZE}
        max={HOLE_PATTERN_MAX_SIZE / 2}
        step={0.5}
        workspace={workspace}
        length
        onChange={(value) => onChange({ size: value })}
      />}
      {head ? (
        <EdgeModifierSlider
          label={t("prop.screwHoleHead")}
          value={holeHeadSize(settings)}
          min={HOLE_PATTERN_MIN_SIZE}
          max={HOLE_PATTERN_MAX_SIZE / 2}
          step={0.1}
          workspace={workspace}
          length
          onChange={(value) => onChange({ headSize: value })}
        />
      ) : null}
      {head === "counterbore" ? (
        <EdgeModifierSlider
          label={t("prop.screwHoleHeadDepth")}
          value={holeHeadDepth(settings)}
          min={0.2}
          max={Math.max(1, thickness)}
          step={0.1}
          workspace={workspace}
          length
          onChange={(value) => onChange({ headDepth: value })}
        />
      ) : null}
      {twoSizes ? (
        <EdgeModifierSlider
          label={t("holePattern.size.height")}
          value={settings.height}
          min={HOLE_PATTERN_MIN_SIZE}
          max={HOLE_PATTERN_MAX_SIZE / 2}
          step={0.5}
          workspace={workspace}
          length
          onChange={(value) => onChange({ height: value })}
        />
      ) : null}
      {/* A rectangle or slot can lie at any angle in the face, counter-clockwise as seen looking at it; 0 lays its width along x. */}
      {twoSizes ? (
        <EdgeModifierSlider
          label={t("holePattern.holeAngle")}
          value={settings.holeAngle ?? 0}
          min={-HOLE_PATTERN_MAX_HOLE_ANGLE}
          max={HOLE_PATTERN_MAX_HOLE_ANGLE}
          step={1}
          decimals={1}
          unit="°"
          workspace={workspace}
          onChange={(value) => onChange({ holeAngle: value })}
        />
      ) : null}
      {/* Every hole sloping through the wall about the face's x, for vents that shed rain: positive puts the inner end
          higher on a standing face. Flat faces only for now; screws with a head go in straight, an own shape stands as it is. */}
      {!wall && holeTiltApplies(settings) ? (
        <EdgeModifierSlider
          label={t("holePattern.holeTilt")}
          value={settings.holeTilt ?? 0}
          min={-HOLE_PATTERN_MAX_HOLE_TILT}
          max={HOLE_PATTERN_MAX_HOLE_TILT}
          step={1}
          decimals={1}
          unit="°"
          workspace={workspace}
          onChange={(value) => onChange({ holeTilt: value })}
        />
      ) : null}
      </>)}
      {byCount || mounting ? null : (
        <EdgeModifierSlider
          label={t("holePattern.spacing")}
          value={settings.spacing}
          min={HOLE_PATTERN_MIN_SIZE}
          max={HOLE_PATTERN_MAX_SPACING / 2}
          step={0.5}
          workspace={workspace}
          length
          onChange={(value) => onChange({ spacing: value })}
        />
      )}
      {/* A rectangle or slot spaces its rows on its own (#975): narrow holes close in the row, the rows clear of each other. */}
      {holePatternHasRowSpacing(settings.form) && !perimeter && pattern ? (
        <EdgeModifierSlider
          label={t("holePattern.rowSpacing")}
          value={holePatternRowSpacing(settings)}
          min={HOLE_PATTERN_MIN_SIZE}
          max={HOLE_PATTERN_MAX_SPACING / 2}
          step={0.5}
          workspace={workspace}
          length
          onChange={(value) => onChange({ rowSpacing: value })}
        />
      ) : null}
      {/* The same as the spacing, said as the wall left between two holes (#239): set one and the other follows. */}
      {byCount || mounting ? null : <EdgeModifierSlider
        label={t("holePattern.wall")}
        value={Math.max(HOLE_PATTERN_MIN_WALL, holePatternWall(spaced))}
        min={HOLE_PATTERN_MIN_WALL}
        max={HOLE_PATTERN_MAX_SPACING / 2}
        step={0.1}
        workspace={workspace}
        length
        onChange={(value) => {
          const spacing = holePatternMinSpacing(spaced, value);
          onChange(holePatternHasRowSpacing(settings.form)
            ? { spacing, rowSpacing: holePatternMinRowSpacing({ ...spaced, spacing }, value) }
            : { spacing });
        }}
      />}

      {pattern ? <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("holePattern.arrangement")}>
        <span>{t("holePattern.arrangement")}</span>
        <div className="shell-opening-options">
          {arrangements.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={settings.arrangement === option}
              className={settings.arrangement === option ? "active" : ""}
              onClick={() => onChange({ arrangement: option })}
            >
              {t(`holePattern.arrangement.${option}`)}
            </button>
          ))}
        </div>
      </div> : null}

      {/* Round the edge (#1232): by spacing or by number, a hole on every corner, or from a start point along the edge. */}
      {perimeter && !wall ? (
        <>
          <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("holePattern.perimeterBy")}>
            <span>{t("holePattern.perimeterBy")}</span>
            <div className="shell-opening-options">
              {(["spacing", "count"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={(settings.perimeterBy ?? "spacing") === option}
                  className={(settings.perimeterBy ?? "spacing") === option ? "active" : ""}
                  onClick={() => onChange({ perimeterBy: option })}
                >
                  {t(`holePattern.perimeterBy.${option}`)}
                </button>
              ))}
            </div>
          </div>
          {byCount ? (
            <EdgeModifierSlider
              label={t("holePattern.perimeterCount")}
              value={settings.perimeterCount ?? 8}
              min={HOLE_PATTERN_MIN_PERIMETER_COUNT}
              max={Math.min(HOLE_PATTERN_MAX_PERIMETER_COUNT, 60)}
              step={1}
              workspace={workspace}
              onChange={(value) => onChange({ perimeterCount: Math.round(value) })}
            />
          ) : null}
          <label className="edge-modifier-check">
            <input
              type="checkbox"
              checked={settings.perimeterCorners !== false}
              onChange={(event) => onChange({ perimeterCorners: event.target.checked })}
            />
            <span>{t("holePattern.perimeterCorners")}</span>
          </label>
          {/* Holes on the corners stay there; a ring without them can be turned along the edge. */}
          {ring && !ring.onCorners ? (
            <EdgeModifierSlider
              label={t("holePattern.perimeterStart")}
              value={Math.min(settings.perimeterStart ?? 0, Math.max(1, ring.length))}
              min={0}
              max={Math.max(1, Math.round(ring.length * 10) / 10)}
              step={0.5}
              workspace={workspace}
              length
              onChange={(value) => onChange({ perimeterStart: value })}
            />
          ) : null}
        </>
      ) : null}

      {forRack ? null : <EdgeModifierSlider
        label={t(mounting ? "holePattern.mounting.distance" : "holePattern.margin")}
        value={settings.margin}
        min={0}
        max={HOLE_PATTERN_MAX_MARGIN / 2}
        step={mounting ? 0.1 : 0.5}
        workspace={workspace}
        length
        onChange={(value) => onChange({ margin: value })}
      />}
      {/* Under the distance it belongs to: whether it counts to the holes' edge or to their middles. */}
      {screws ? (
        <label className="edge-modifier-check">
          <input type="checkbox" checked={Boolean(settings.cornerToCenter)} onChange={(event) => onChange({ cornerToCenter: event.target.checked })} />
          <span>{t("holePattern.mounting.toCenter")}</span>
        </label>
      ) : null}
      {/* More screws for a watertight lid: on a rectangle in pairs along the sides, round a circle any number. */}
      {screws ? (
        <EdgeModifierSlider
          label={t("holePattern.mounting.count")}
          value={normalizeCornerCount(settings.cornerCount, Boolean(roundFace))}
          min={roundFace ? MIN_ROUND_COUNT : MIN_CORNER_COUNT}
          max={MAX_CORNER_COUNT}
          step={roundFace ? 1 : 2}
          workspace={workspace}
          onChange={(value) => onChange({ cornerCount: normalizeCornerCount(value, Boolean(roundFace)) })}
        />
      ) : null}
      {screws ? <p className="hole-pattern-mounting-note">{t(roundFace ? "holePattern.mounting.roundNote" : "holePattern.mounting.countNote")}</p> : null}

      {custom ? null : <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("holePattern.depth")}>
        <span>{t("holePattern.depth")}</span>
        <div className="shell-opening-options">
          {[true, false].map((through) => (
            <button
              key={String(through)}
              type="button"
              role="radio"
              aria-checked={(settings.depth === null) === through}
              className={(settings.depth === null) === through ? "active" : ""}
              onClick={() => onChange({ depth: through ? null : Math.min(maxDepth, Math.max(1, Math.round(thickness / 2 * 2) / 2)) })}
            >
              {t(through ? (wall ? "holePattern.depth.throughWall" : "holePattern.depth.through") : "holePattern.depth.custom")}
            </button>
          ))}
        </div>
      </div>}
      {settings.depth !== null && !custom ? (
        <EdgeModifierSlider
          label={t("holePattern.depthValue")}
          value={settings.depth}
          min={0.5}
          max={Math.max(maxDepth, settings.depth)}
          step={0.5}
          workspace={workspace}
          length
          onChange={(value) => onChange({ depth: value })}
        />
      ) : null}

      {ready && tooMany && !settings.allowMany ? (
        <div className="edge-modifier-field">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              // A clear warning first: far more holes make the cuts slow and the page can freeze (#941).
              if (window.confirm(t("holePattern.allowManyAsk", { limit: HOLE_PATTERN_MAX_HOLES, many: HOLE_PATTERN_MANY_HOLES }))) onChange({ allowMany: true });
            }}
          >
            {t("holePattern.allowMany")}
          </button>
        </div>
      ) : null}

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={ready ? onRepick : onCancel}>
          {ready ? t("holePattern.repick") : t("common.cancel")}
        </button>
        <button type="button" className="primary" disabled={!ready || holeCount === 0 || tooMany || busy || customMissing} onClick={onApply}>
          <Check size={17} />
          {t("holePattern.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
