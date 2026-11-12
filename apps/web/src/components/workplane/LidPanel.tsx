"use client";

import { useState } from "react";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, LoaderCircle, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import {
  LID_FITS,
  LID_HANDLES,
  LID_HINGE_SIDES,
  LID_HINGE_STYLES,
  LID_HINGE_TYPES,
  LID_MAGNET_SIZES,
  LID_THREAD_STANDARDS,
  LID_THREAD_STANDARD_SPECS,
  LID_TYPES,
  MAX_BAYONET_AXIAL_GAP,
  MAX_BAYONET_DEPTH,
  MAX_BAYONET_DETENT,
  MAX_BAYONET_LUGS,
  MAX_BAYONET_TURN,
  MAX_CLICK_BUMP_HEIGHT,
  LID_TOP_EDGES,
  MAX_FLIP_TOP_OPENING,
  MAX_LID_TOP_EDGE,
  MIN_LID_TOP_EDGE,
  MAX_HINGE_GAP,
  MAX_HINGE_KNUCKLES,
  MAX_HINGE_PIN,
  MAX_HINGE_PIN_PLAY,
  MAX_LID_DEPTH,
  MAX_LID_GAP,
  MAX_LID_THICKNESS,
  MAX_LID_THREAD_OFFSET,
  MAX_LID_THREAD_PITCH,
  MAX_LID_THREAD_TURNS,
  MAX_LID_WALL,
  MAX_MAGNET_DIAMETER,
  MAX_MAGNET_GAP,
  MAX_MAGNET_HEIGHT,
  MAX_SLIDE_FRAME,
  MIN_BAYONET_AXIAL_GAP,
  MIN_BAYONET_DEPTH,
  MIN_BAYONET_LUGS,
  MIN_CLICK_BUMP_HEIGHT,
  MIN_FLIP_TOP_OPENING,
  MIN_HINGE_GAP,
  MIN_HINGE_PIN,
  MIN_HINGE_PIN_PLAY,
  MIN_LID_DEPTH,
  MIN_LID_THICKNESS,
  MIN_LID_THREAD_OFFSET,
  MIN_LID_THREAD_PITCH,
  MIN_LID_THREAD_TURNS,
  MIN_LID_WALL,
  MIN_MAGNET_DIAMETER,
  MIN_MAGNET_HEIGHT,
  SCREW_MIN_WALL,
  bayonetTurn,
  flipTopThickness,
  hingeKnuckleRadius,
  lidClickBumpsFit,
  lidFlipTopFits,
  lidHandleFits,
  lidNeckDiameter,
  lidNeckFit,
  lidTakesExtras,
  lidTakesMagnets,
  lidStandardThread,
  lidTetherFits,
  lidThicknessForMagnets,
  lidThread,
  lidTopEdgeFits,
  lidTopEdgeSize,
  normalizeLidOptions,
  slideFrameNeeded,
  type LidOptions,
} from "@/lib/lidTool";
import { numberLocale, t } from "@/lib/i18n";
import { fromPrinterPlay } from "@/lib/printerPlay";
import { useLanguage } from "@/lib/useLanguage";
import { usePrinterPlay } from "@/lib/usePrinterPlay";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

/**
 * A lid for a body open at the top (#1009): pushed into the opening, put over the outside, gripping the wall from both
 * sides (#1062) or laid flat on it. It comes out as a body of its own beside the one it closes, ready to print. With
 * magnets, it holds by four round magnets in the corners, in pockets in the body's rim and in the lid. With a hinge, it
 * swings open about a pin along the body's back, tight in the body's knuckles and turning in the lid's; a flush hinge can
 * have end plugs that close the pin's hole flush with the body's outside (Discussion #1387). With click bumps
 * it snaps into dimples in the body (#1234), the bumps as high as asked; a handle is a pull tab on the lid or a finger
 * notch in the body (#1230). A screw lid (Discussion #1393) is a cap with a thread inside its rim for a round body, which
 * gets the matching thread on the outside of its top; it holds by that alone. Its thread can be a standard bottle's or
 * jar's instead of its own: the cap then fits that bottle, and the body gets the neck's thread only if it is that neck,
 * which the panel says how to make. A screw-in lid (Discussion #1432) is the other way round: a plate with a threaded plug below it that screws into the same thread inside the body's opening. A bayonet lid (Discussion #1424) is a cap
 * for a round body too, with an L-shaped slot inside its rim for each of the lugs on the outside of the body's top: pushed
 * down and turned, it locks, as far as its lugs give or as far as set, up to a quarter turn. A slide-in lid (Discussion #1443) is a plate for a box that slides in through the wall picked,
 * its edges in grooves in the other three, like a pencil box's; its click bump and finger grip are its own; with a frame it sits lower, the walls round it at their full height, and goes in through a slot. A screw or bayonet lid can have a tether that keeps the cap with the body when it is off (asked in the
 * Layerling User Group on Facebook), or be a flip-top: a flap in its plate opens a round opening to pour from.
 */
export function LidPanel({
  targetName,
  settings,
  workspace,
  busy,
  error,
  onChange,
  onApply,
  onCancel,
  neck = null,
}: {
  targetName: string;
  settings: LidOptions;
  workspace: WorkplaneWorkspaceSettings;
  busy: boolean;
  error: string | null;
  onChange: (patch: Partial<LidOptions>) => void;
  onApply: () => void;
  onCancel: () => void;
  /**
   * With a standard's thread (issue #1482), the body's top as Make lid measures it (`lidTopForShapes`): undefined while
   * it is measured, null when it is not round. `fit` is the diameter "Fit the body to the neck" makes it, null for a
   * body that button cannot resize (`lidNeckFitPatch`); `fitting` while it does.
   */
  neck?: { top: { outer: number; inner: number } | null | undefined; fit: number | null; fitting: boolean; onFit: () => void } | null;
}) {
  useLanguage();
  // The gap and the pin's play say when they are still what the printer's play gave them (printerPlay.ts).
  const printerPlay = usePrinterPlay();
  const title = t("lid.title");
  // A magnet needs its pocket and a skin above it in the plate: a thinner plate is made thick enough for it.
  // Raised, it says so under the plate's thickness until that is set by hand; set thinner by hand, it says what is needed.
  const [raised, setRaised] = useState(false);
  const withMagnet = (patch: Partial<LidOptions>) => {
    const next = { ...settings, ...patch };
    const thickness = lidThicknessForMagnets(next);
    const raise = next.magnets && settings.thickness < thickness;
    if (raise) setRaised(true);
    onChange(raise ? { ...patch, thickness } : patch);
  };
  const needed = lidThicknessForMagnets(settings);
  // A slide-in lid takes no magnets: its plate lies between the walls, with no rim under it for their pockets.
  const magnetsFit = lidTakesMagnets(settings);
  const tooThin = settings.magnets && magnetsFit && settings.thickness < needed - 1e-9;
  const millimetres = (value: number) => value.toLocaleString(numberLocale());
  // A rim round the outside would hit the back wall as the lid swings open: the hinge goes with a lip or a flat lid.
  const hingeFits = LID_HINGE_TYPES.includes(settings.type);
  // Click bumps stand on a lip or a rim; a pivot lid has neither, nor an edge for a tab or a finger.
  const bumpsFit = lidClickBumpsFit(settings);
  const handleFits = lidHandleFits(settings);
  const handle = handleFits ? settings.handle : "none";
  // A screw lid holds by its thread and a bayonet lid by its lugs: the magnets, hinge, click bumps and handle stay switched
  // off, with one line saying why.
  const extras = lidTakesExtras(settings);
  const screw = settings.type === "screw";
  const screwIn = settings.type === "screwIn";
  const bayonet = settings.type === "bayonet";
  const slide = settings.type === "slide";
  const thread = lidThread(settings);
  // A standard's thread sets its own pitch and turns: their sliders give way to what the standard is and what it takes.
  const neckStandard = screw && settings.threadStandard !== "own" ? settings.threadStandard : null;
  const standard = neckStandard ? lidStandardThread(neckStandard) : null;
  // A flip-top's flap and hinge need a plate thick enough for them: thinner, it says how thick.
  const flipTopFits = lidFlipTopFits(settings);
  const flipTopNeeds = flipTopThickness(settings);
  // Whether the body's top is the standard's neck, said before the lid is made, as Make lid will find it (lidNeckFit).
  const neckTop = neckStandard && neck ? neck.top : undefined;
  const neckMiss = neckStandard && neckTop !== undefined ? lidNeckFit(neckStandard, neckTop) : null;
  // A slide-in lid's frame must leave the wall whole above the slot: thinner, it says how much is needed.
  const frameNeeds = slideFrameNeeded(settings);
  return (
    <MovableToolPanel className="edge-modifier-panel shell-panel offset-panel lid-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("lid.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="lid" />
          <button type="button" aria-label={t("lid.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span>{t("lid.help")}</span>
      </div>

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.type")}>
        <span>{t("lid.type")}</span>
        <div className="shell-opening-options">
          {LID_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={settings.type === option}
              className={settings.type === option ? "active" : ""}
              title={t(`lid.type.${option}Hint`)}
              disabled={busy}
              onClick={() => onChange({ type: option })}
            >
              {t(`lid.type.${option}`)}
            </button>
          ))}
        </div>
      </div>
      <span className="shell-openings-summary">{t(`lid.type.${settings.type}Hint`)}</span>

      {/* A screw lid's thread is its own or a standard bottle's or jar's. */}
      {screw ? (
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.threadStandard")}>
          <span>{t("lid.threadStandard")}</span>
          <div className="shell-opening-options">
            {LID_THREAD_STANDARDS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={settings.threadStandard === option}
                className={settings.threadStandard === option ? "active" : ""}
                title={option === "own" ? undefined : t(`lid.threadStandardHint.${option}`)}
                disabled={busy}
                onClick={() => onChange({ threadStandard: option })}
              >
                {option === "own" ? t("lid.threadStandard.own") : LID_THREAD_STANDARD_SPECS[option].name}
              </button>
            ))}
          </div>
          {settings.threadStandard === "own" ? null : <span className="shell-openings-summary">{t(`lid.threadStandardHint.${settings.threadStandard}`)}</span>}
        </div>
      ) : null}
      {/* The body measured against the neck, before the lid is made, and a button that resizes it to fit (issue #1482). */}
      {standard && neck ? (
        <div className="lid-neck-fit">
          <span className="shell-openings-summary" role="status">
            {neckTop === undefined
              ? t("lid.neckMeasuring")
              : neckTop === null
                ? t("lid.neckNotRound")
                : t(neckMiss ? "lid.neckSize" : "lid.neckFits", {
                  measured: millimetres(Math.round(200 * neckTop.outer) / 100), standard: standard.name,
                  from: millimetres(Math.round(standard.neckFrom * 100) / 100), to: millimetres(Math.round(standard.neckTo * 100) / 100),
                })}
          </span>
          {neckTop !== undefined && (neckTop === null || neckMiss) ? (
            neck.fit !== null ? (<>
              <button type="button" className="secondary lid-neck-fit-button" disabled={busy || neck.fitting} onClick={neck.onFit}>
                {neck.fitting ? <LoaderCircle className="edge-modifier-spinner" size={15} /> : null}
                {neck.fitting ? t("lid.neckFitting") : t("lid.neckFit")}
              </button>
              <span className="shell-openings-summary">{t("lid.neckFitHint", { diameter: millimetres(neck.fit) })}</span>
            </>) : neckTop !== null ? (
              <span className="shell-openings-summary">{t("lid.neckFitByHand", { diameter: millimetres(lidNeckDiameter(neckStandard!)) })}</span>
            ) : null
          ) : null}
        </div>
      ) : null}

      <EdgeModifierSlider
        label={t("lid.thickness")}
        value={settings.thickness}
        min={MIN_LID_THICKNESS}
        max={MAX_LID_THICKNESS}
        step={0.2}
        workspace={workspace}
        length
        disabled={busy}
        onChange={(value) => {
          setRaised(false);
          onChange({ thickness: value });
        }}
      />
      {tooThin ? (
        <span className="shell-openings-summary" role="status">{t("lid.error.magnetsThinLid", { thickness: millimetres(needed) })}</span>
      ) : settings.magnets && magnetsFit && raised ? (
        <span className="shell-openings-summary" role="status">{t("lid.magnetsThicknessRaised", { thickness: millimetres(settings.thickness) })}</span>
      ) : null}

      {settings.type === "flat" ? null : (<>
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.fit")}>
          <span>{t("lid.fit")}</span>
          <div className="shell-opening-options">
            {LID_FITS.map((fit, index) => (
              <button
                key={fit}
                type="button"
                role="radio"
                aria-checked={Math.abs(settings.gap - fit) < 1e-9}
                className={Math.abs(settings.gap - fit) < 1e-9 ? "active" : ""}
                disabled={busy}
                onClick={() => onChange({ gap: fit })}
              >
                {t((["lid.fit.tight", "lid.fit.normal", "lid.fit.loose"] as const)[index], { gap: fit.toLocaleString(numberLocale()) })}
              </button>
            ))}
          </div>
        </div>
        <EdgeModifierSlider
          label={t("lid.gap")}
          value={settings.gap}
          min={0}
          max={MAX_LID_GAP}
          step={0.05}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ gap: value })}
        />
        {fromPrinterPlay("lid.gap", settings.gap, printerPlay) ? <span className="shell-openings-summary">{t("printerPlay.fromFitTest")}</span> : null}
        {/* A screw lid's rim, and a screw-in lid's plug, reach down as far as their thread goes: the pitch times the turns. */}
        {(screw && !standard) || screwIn ? (<>
          <EdgeModifierSlider
            label={t("lid.threadPitch")}
            value={settings.threadPitch}
            min={MIN_LID_THREAD_PITCH}
            max={MAX_LID_THREAD_PITCH}
            step={0.5}
            workspace={workspace}
            length
            disabled={busy}
            onChange={(value) => onChange({ threadPitch: value })}
          />
          <EdgeModifierSlider
            label={t("lid.threadTurns")}
            value={settings.threadTurns}
            min={MIN_LID_THREAD_TURNS}
            max={MAX_LID_THREAD_TURNS}
            step={0.5}
            workspace={workspace}
            decimals={1}
            disabled={busy}
            onChange={(value) => onChange({ threadTurns: value })}
          />
          {/* How far below the rim the thread starts (Discussion #1594): the wall stays plain above it, the rim or plug reaches that much further down. */}
          <EdgeModifierSlider
            label={t("lid.threadOffset")}
            value={settings.threadOffset}
            min={MIN_LID_THREAD_OFFSET}
            max={MAX_LID_THREAD_OFFSET}
            step={0.5}
            workspace={workspace}
            length
            disabled={busy}
            onChange={(value) => onChange({ threadOffset: value })}
          />
          <span className="shell-openings-summary">{t("lid.threadOffsetHint")}</span>
        </>) : screw ? null : bayonet ? (<>
          {/* How many lugs, how far the cap's rim reaches down over them, and its room along the axis above the ledge. */}
          <EdgeModifierSlider
            label={t("lid.bayonetLugs")}
            value={settings.bayonetLugs}
            min={MIN_BAYONET_LUGS}
            max={MAX_BAYONET_LUGS}
            step={1}
            workspace={workspace}
            decimals={0}
            disabled={busy}
            onChange={(value) => onChange({ bayonetLugs: normalizeLidOptions({ bayonetLugs: value }).bayonetLugs })}
          />
          {/* How far the cap turns to lock: 0 as the lugs give, or set by hand, held to what fits round the body. */}
          <EdgeModifierSlider
            label={t("lid.bayonetTurn")}
            value={settings.bayonetTurn}
            min={0}
            max={MAX_BAYONET_TURN}
            step={5}
            unit="°"
            workspace={workspace}
            decimals={0}
            disabled={busy}
            onChange={(value) => onChange({ bayonetTurn: normalizeLidOptions({ bayonetTurn: value }).bayonetTurn })}
          />
          {settings.bayonetTurn > 0 ? <span className="shell-openings-summary">{t("lid.bayonetTurnHint")}</span> : null}
          <EdgeModifierSlider
            label={t("lid.depthCap")}
            value={settings.bayonetDepth}
            min={MIN_BAYONET_DEPTH}
            max={MAX_BAYONET_DEPTH}
            step={0.5}
            workspace={workspace}
            length
            disabled={busy}
            onChange={(value) => onChange({ bayonetDepth: value })}
          />
          <EdgeModifierSlider
            label={t("lid.bayonetAxialGap")}
            value={settings.bayonetAxialGap}
            min={MIN_BAYONET_AXIAL_GAP}
            max={MAX_BAYONET_AXIAL_GAP}
            step={0.05}
            workspace={workspace}
            length
            disabled={busy}
            onChange={(value) => onChange({ bayonetAxialGap: value })}
          />
        </>) : slide ? (<>
          {/* The wall it slides in through, as in the starting view (the view cube's Front faces you). */}
          <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.slideSide")}>
            <span>{t("lid.slideSide")}</span>
            <div className="shell-opening-options">
              {LID_HINGE_SIDES.map((side) => (
                <button
                  key={side}
                  type="button"
                  role="radio"
                  aria-checked={settings.slideSide === side}
                  className={settings.slideSide === side ? "active" : ""}
                  disabled={busy}
                  onClick={() => onChange({ slideSide: side })}
                >
                  {t(`shell.side.${side}`)}
                </button>
              ))}
            </div>
          </div>
          <span className="shell-openings-summary">{t(settings.slideFrame > 0 ? "lid.slideHintFrame" : "lid.slideHint")}</span>
          {/* How far below the rim the lid sits, framed by the walls (Discussion #1443): 0 is flush, the wall cut down. */}
          <EdgeModifierSlider
            label={t("lid.slideFrame")}
            value={settings.slideFrame}
            min={0}
            max={MAX_SLIDE_FRAME}
            step={0.2}
            workspace={workspace}
            length
            disabled={busy}
            onChange={(value) => onChange({ slideFrame: value })}
          />
          {settings.slideFrame > 0 && settings.slideFrame < frameNeeds - 1e-9 ? (
            <span className="shell-openings-summary" role="status">{t("lid.error.slideThinFrame", { frame: millimetres(frameNeeds) })}</span>
          ) : <span className="shell-openings-summary">{t("lid.slideFrameHint")}</span>}
        </>) : (
          <EdgeModifierSlider
            label={t(settings.type === "cap" ? "lid.depthCap" : settings.type === "both" ? "lid.depthBoth" : "lid.depth")}
            value={settings.depth}
            min={MIN_LID_DEPTH}
            max={MAX_LID_DEPTH}
            step={0.5}
            workspace={workspace}
            length
            disabled={busy}
            onChange={(value) => onChange({ depth: value })}
          />
        )}
        {/* A slide-in lid has neither lip nor rim: its tongues follow the walls' grooves. */}
        {slide ? null : (
          <EdgeModifierSlider
            label={t(screwIn ? "lid.wallPlug" : settings.type === "cap" || screw || bayonet ? "lid.wallCap" : settings.type === "both" ? "lid.wallBoth" : "lid.wall")}
            value={settings.wall}
            min={MIN_LID_WALL}
            max={MAX_LID_WALL}
            step={0.2}
            workspace={workspace}
            length
            disabled={busy}
            onChange={(value) => onChange({ wall: value })}
          />
        )}
        {standard ? (
          <span className="shell-openings-summary">{t("lid.screwStandardHint", {
            standard: standard.name, major: millimetres(standard.major), pitch: millimetres(standard.pitch), depth: millimetres(standard.capDepth),
            from: millimetres(Math.round(standard.neckFrom * 100) / 100), to: millimetres(Math.round(standard.neckTo * 100) / 100),
          })}</span>
        ) : screw ? (
          <span className="shell-openings-summary">{t("lid.screwHint", { depth: millimetres(Math.round(thread.depth * 100) / 100), height: millimetres(Math.round(thread.height * 10) / 10) })}</span>
        ) : null}
        {/* The plug's wall is SCREW_MIN_WALL at least, whatever the slider says. */}
        {screwIn ? (
          <span className="shell-openings-summary">
            {t("lid.screwInHint", { depth: millimetres(Math.round(thread.depth * 100) / 100), height: millimetres(Math.round(thread.height * 10) / 10), wall: millimetres(Math.max(settings.wall, SCREW_MIN_WALL)) })}
          </span>
        ) : null}
        {/* The rib behind each locked lug, which it clicks past; then how it goes on, with the turn set or its count's. */}
        {bayonet ? (<>
          <EdgeModifierSlider
            label={t("lid.bayonetDetent")}
            value={settings.bayonetDetent}
            min={0}
            max={MAX_BAYONET_DETENT}
            step={0.05}
            workspace={workspace}
            length
            disabled={busy}
            onChange={(value) => onChange({ bayonetDetent: value })}
          />
          <span className="shell-openings-summary">{t("lid.bayonetDetentHint")}</span>
          <span className="shell-openings-summary">{t("lid.bayonetHint", { count: settings.bayonetLugs, turn: millimetres(settings.bayonetTurn || bayonetTurn(settings.bayonetLugs)) })}</span>
        </>) : null}
        {/* A cap that is turned off can stay tied to the body: two rings and a strap, printed beside it. */}
        {lidTetherFits(settings) ? (<>
          <label className="edge-modifier-field offset-copy">
            <input type="checkbox" checked={settings.tether} disabled={busy} onChange={(event) => onChange({ tether: event.target.checked })} />
            <span>{t("lid.tether")}</span>
          </label>
          {settings.tether ? <span className="shell-openings-summary">{t("lid.tetherHint")}</span> : null}
        </>) : null}
        {/* A cap that stays on can open in its plate: a flap over a round opening, on a strip that bends as its hinge. */}
        {flipTopFits ? (<>
          <label className="edge-modifier-field offset-copy">
            <input type="checkbox" checked={settings.flipTop} disabled={busy} onChange={(event) => onChange({ flipTop: event.target.checked })} />
            <span>{t("lid.flipTop")}</span>
          </label>
          {settings.flipTop ? (<>
            <EdgeModifierSlider
              label={t("lid.flipTopOpening")}
              value={settings.flipTopOpening}
              min={MIN_FLIP_TOP_OPENING}
              max={MAX_FLIP_TOP_OPENING}
              step={0.5}
              workspace={workspace}
              length
              disabled={busy}
              onChange={(value) => onChange({ flipTopOpening: value })}
            />
            {settings.thickness < flipTopNeeds - 1e-9 ? (
              <span className="shell-openings-summary" role="status">{t("lid.error.flipTopThin", { thickness: millimetres(flipTopNeeds) })}</span>
            ) : null}
            <span className="shell-openings-summary">{t("lid.flipTopHint")}</span>
          </>) : null}
        </>) : null}
        {/* A cap's top rim rounded or chamfered as it is made: afterwards it is one mesh with its thread, too large for the edge tool (Discussion #1426). */}
        {lidTopEdgeFits(settings) ? (<>
          <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.topEdge")}>
            <span>{t("lid.topEdge")}</span>
            <div className="shell-opening-options">
              {LID_TOP_EDGES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={settings.topEdge === option}
                  className={settings.topEdge === option ? "active" : ""}
                  disabled={busy}
                  onClick={() => onChange({ topEdge: option })}
                >
                  {t(`lid.topEdge.${option}`)}
                </button>
              ))}
            </div>
          </div>
          {settings.topEdge !== "square" ? (<>
            <EdgeModifierSlider
              label={t("lid.topEdgeSize")}
              value={settings.topEdgeSize}
              min={MIN_LID_TOP_EDGE}
              max={MAX_LID_TOP_EDGE}
              step={0.1}
              workspace={workspace}
              length
              disabled={busy}
              onChange={(value) => onChange({ topEdgeSize: value })}
            />
            {lidTopEdgeSize(settings) < settings.topEdgeSize - 1e-9 ? (
              <span className="shell-openings-summary" role="status">{t("lid.topEdgeThin", { size: millimetres(lidTopEdgeSize(settings)) })}</span>
            ) : null}
            <span className="shell-openings-summary">{t("lid.topEdgeHint")}</span>
          </>) : null}
        </>) : null}
      </>)}

      {!extras || slide ? <span className="shell-openings-summary" role="status">{t(slide ? "lid.error.slideExtras" : bayonet ? "lid.error.bayonetExtras" : "lid.error.screwExtras")}</span> : null}
      <label className="edge-modifier-field offset-copy">
        <input type="checkbox" checked={settings.magnets && magnetsFit} disabled={busy || !magnetsFit} onChange={(event) => withMagnet({ magnets: event.target.checked })} />
        <span>{t("lid.magnets")}</span>
      </label>
      {settings.magnets && magnetsFit ? (<>
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.magnetSize")}>
          <span>{t("lid.magnetSize")}</span>
          <div className="shell-opening-options">
            {LID_MAGNET_SIZES.map(({ diameter, height }) => {
              const active = Math.abs(settings.magnetDiameter - diameter) < 1e-9 && Math.abs(settings.magnetHeight - height) < 1e-9;
              return (
                <button
                  key={`${diameter}x${height}`}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={active ? "active" : ""}
                  disabled={busy}
                  onClick={() => withMagnet({ magnetDiameter: diameter, magnetHeight: height })}
                >
                  {t("lid.magnetSizeOption", { diameter: millimetres(diameter), height: millimetres(height) })}
                </button>
              );
            })}
          </div>
        </div>
        <EdgeModifierSlider
          label={t("lid.magnetDiameter")}
          value={settings.magnetDiameter}
          min={MIN_MAGNET_DIAMETER}
          max={MAX_MAGNET_DIAMETER}
          step={0.5}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => withMagnet({ magnetDiameter: value })}
        />
        <EdgeModifierSlider
          label={t("lid.magnetHeight")}
          value={settings.magnetHeight}
          min={MIN_MAGNET_HEIGHT}
          max={MAX_MAGNET_HEIGHT}
          step={0.5}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => withMagnet({ magnetHeight: value })}
        />
        <EdgeModifierSlider
          label={t("lid.magnetGap")}
          value={settings.magnetGap}
          min={0}
          max={MAX_MAGNET_GAP}
          step={0.05}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ magnetGap: value })}
        />
        <span className="shell-openings-summary">{t("lid.magnetsHint")}</span>
      </>) : null}

      <label className="edge-modifier-field offset-copy">
        <input type="checkbox" checked={settings.hinge && hingeFits} disabled={busy || !hingeFits} onChange={(event) => onChange({ hinge: event.target.checked })} />
        <span>{t("lid.hinge")}</span>
      </label>
      {!hingeFits && extras && !slide ? <span className="shell-openings-summary">{t("lid.hingeTypeHint")}</span> : null}
      {settings.hinge && hingeFits ? (<>
        {/* Where it sits: behind the back, in the wall (the box keeps its size), or a lid that turns on two pins. */}
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.hingeStyle")}>
          <span>{t("lid.hingeStyle")}</span>
          <div className="shell-opening-options">
            {LID_HINGE_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                role="radio"
                aria-checked={settings.hingeStyle === style}
                className={settings.hingeStyle === style ? "active" : ""}
                disabled={busy}
                onClick={() => onChange({ hingeStyle: style })}
              >
                {t(`lid.hingeStyle.${style}`)}
              </button>
            ))}
          </div>
          <span className="shell-openings-summary">{t(`lid.hingeStyleHint.${settings.hingeStyle}`)}</span>
        </div>
        {/* The side it goes along, as in the starting view (the view cube's Front faces you). */}
        <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.hingeSide")}>
          <span>{t("lid.hingeSide")}</span>
          <div className="shell-opening-options">
            {LID_HINGE_SIDES.map((side) => (
              <button
                key={side}
                type="button"
                role="radio"
                aria-checked={settings.hingeSide === side}
                className={settings.hingeSide === side ? "active" : ""}
                disabled={busy}
                onClick={() => onChange({ hingeSide: side })}
              >
                {t(`shell.side.${side}`)}
              </button>
            ))}
          </div>
        </div>
        <EdgeModifierSlider
          label={t("lid.hingePin")}
          value={settings.hingePin}
          min={MIN_HINGE_PIN}
          max={MAX_HINGE_PIN}
          step={0.05}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ hingePin: value })}
        />
        <EdgeModifierSlider
          label={t("lid.hingeGap")}
          value={settings.hingeGap}
          min={MIN_HINGE_GAP}
          max={MAX_HINGE_GAP}
          step={0.05}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ hingeGap: value })}
        />
        <EdgeModifierSlider
          label={t("lid.hingePinPlay")}
          value={settings.hingePinPlay}
          min={MIN_HINGE_PIN_PLAY}
          max={MAX_HINGE_PIN_PLAY}
          step={0.05}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ hingePinPlay: value })}
        />
        {fromPrinterPlay("lid.hingePinPlay", settings.hingePinPlay, printerPlay) ? <span className="shell-openings-summary">{t("printerPlay.fromFitTest")}</span> : null}
        {/* The play is only in the lid's holes: in the body's the pin sits tight, so it does not slide out (#1220). */}
        <span className="shell-openings-summary">{t("lid.hingePinPlayHint")}</span>
        {/* A pivot lid turns on two pins and has no knuckles to count. */}
        {settings.hingeStyle === "pivot" ? null : (
          <EdgeModifierSlider
            label={t("lid.hingeKnuckles")}
            value={settings.hingeKnuckles}
            min={0}
            max={MAX_HINGE_KNUCKLES}
            step={1}
            workspace={workspace}
            decimals={0}
            disabled={busy}
            onChange={(value) => onChange({ hingeKnuckles: normalizeLidOptions({ hingeKnuckles: value }).hingeKnuckles })}
          />
        )}
        <label className="edge-modifier-field offset-copy">
          <input type="checkbox" checked={settings.hingeTeardrop} disabled={busy} onChange={(event) => onChange({ hingeTeardrop: event.target.checked })} />
          <span>{t("lid.hingeTeardrop")}</span>
        </label>
        <label className="edge-modifier-field offset-copy">
          <input type="checkbox" checked={settings.hingePrintPin} disabled={busy} onChange={(event) => onChange({ hingePrintPin: event.target.checked })} />
          <span>{t("lid.hingePrintPin")}</span>
        </label>
        {/* A flush hinge's pin hole ends in the body's outer face: a plug at each end closes it (Discussion #1387). */}
        {settings.hingeStyle === "flush" ? (<>
          <label className="edge-modifier-field offset-copy">
            <input type="checkbox" checked={settings.hingeEndPlugs} disabled={busy} onChange={(event) => onChange({ hingeEndPlugs: event.target.checked })} />
            <span>{t("lid.hingeEndPlugs")}</span>
          </label>
          {settings.hingeEndPlugs ? <span className="shell-openings-summary">{t("lid.hingeEndPlugsHint")}</span> : null}
        </>) : null}
        <span className="shell-openings-summary">{t("lid.hingeHint", { diameter: millimetres(Math.round(2 * hingeKnuckleRadius(settings) * 10) / 10) })}</span>
      </>) : null}

      <label className="edge-modifier-field offset-copy">
        <input type="checkbox" checked={settings.clickBumps && bumpsFit} disabled={busy || !bumpsFit} onChange={(event) => onChange({ clickBumps: event.target.checked })} />
        <span>{t("lid.clickBumps")}</span>
      </label>
      {/* A slide-in lid's is one bump under its end, which clicks past the wall it slides in through (cut down, or with a
          frame slotted); it says what its height is. */}
      {(settings.clickBumps || !bumpsFit) && extras ? <span className="shell-openings-summary">{t(slide ? "lid.slideBumpHint" : "lid.clickBumpsHint")}</span> : null}
      {/* How far they reach into the body's wall: a small box or a stiff lip wants less (#1220). */}
      {settings.clickBumps && bumpsFit ? (<>
        <EdgeModifierSlider
          label={t("lid.clickBumpHeight")}
          value={settings.clickBumpHeight}
          min={MIN_CLICK_BUMP_HEIGHT}
          max={MAX_CLICK_BUMP_HEIGHT}
          step={0.05}
          workspace={workspace}
          length
          disabled={busy}
          onChange={(value) => onChange({ clickBumpHeight: value })}
        />
        {slide ? null : <span className="shell-openings-summary">{t("lid.clickBumpHeightHint")}</span>}
      </>) : null}

      {/* On the side the lid opens at: the front, or opposite the hinge; a slide-in lid's on its end at the cut wall. */}
      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("lid.handle")}>
        <span>{t("lid.handle")}</span>
        <div className="shell-opening-options">
          {LID_HANDLES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={handle === option}
              className={handle === option ? "active" : ""}
              disabled={busy || (!handleFits && option !== "none")}
              onClick={() => onChange({ handle: option })}
            >
              {t(`lid.handle.${option}`)}
            </button>
          ))}
        </div>
        {!handleFits && !extras ? null : !handleFits ? (
          <span className="shell-openings-summary">{t("lid.error.handlePivot")}</span>
        ) : handle !== "none" ? (
          <span className="shell-openings-summary">{t(slide ? (handle === "tab" ? "lid.handleHint.tabSlide" : "lid.handleHint.notchSlide") : `lid.handleHint.${handle}`)}</span>
        ) : null}
      </div>

      {error ? <div className="edge-modifier-error" role="alert">{error}</div> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        {/* Not while the body is fitted to the neck: the lid would be made for it as it was. */}
        <button type="button" className="primary" disabled={busy || Boolean(neck?.fitting)} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          {busy ? t("lid.working") : t("lid.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
