"use client";

import { displayY, displayYTurn, insideZ, insideZTurn } from "@/lib/displayAxes";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { guideChapterForShape, guideSectionForShape } from "@/lib/guideLinks";
import { useInspectorCard } from "@/lib/inspectorCards";
import { ChevronDown, ChevronUp, Cylinder, Eraser, Eye, EyeOff, FolderOpen, Grid3x3, ImageUp, Layers, Link2, Lock, Minus, MousePointerClick, Pencil, Plus, RefreshCw, RotateCcw, Ruler, Split, Tags, Unlock, Waves } from "lucide-react";
import { createPortal } from "react-dom";
import { Fragment, createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  DEFAULT_GEAR_HELIX_ANGLE,
  DEFAULT_GEAR_HELIX_QUALITY,
  DEFAULT_GEAR_TEETH,
  DEFAULT_GEAR_TOOTH_SIZE,
  MAX_GEAR_HELIX_ANGLE,
  MAX_GEAR_HELIX_QUALITY,
  MIN_GEAR_HELIX_ANGLE,
  MIN_GEAR_HELIX_QUALITY,
  gearCenterHoleLimits,
  normalizeGearHelixAngle,
  normalizeGearHelixQuality,
  normalizeGearCenterHoleSize,
  normalizeGearToothSize,
  normalizeGearToothWidth,
  normalizeGearType,
  gearTypeHasHelix,
  gearToothPitch,
  DEFAULT_GEAR_BACKLASH,
  involuteGearModule,
  involuteGearPair,
  gearPairFitPatches,
  MAX_GEAR_BACKLASH,
  MAX_GEAR_PRESSURE_ANGLE,
  MIN_GEAR_PRESSURE_ANGLE,
  normalizeGearBacklash,
  normalizeGearPressureAngle,
  DEFAULT_GEAR_RIM,
  MAX_GEAR_RIM,
  MIN_GEAR_RIM,
  gearAddendum,
  gearModuleOf,
  gearSizeForModule,
  gearToothProfile,
  gearTypeIsModular,
  gearUsesModule,
  MAX_GEAR_TEETH,
  MIN_GEAR_TEETH,
  normalizeGearRim,
  rackMinDepth,
  rackModule,
  rackToothHeight,
} from "@/lib/gearGeometry";
import {
  MAX_THREAD_CLEARANCE,
  MAX_THREAD_DIAMETER,
  MAX_THREAD_QUALITY,
  MIN_THREAD_CLEARANCE,
  MIN_THREAD_DIAMETER,
  MIN_THREAD_QUALITY,
  THREAD_SIZE_GROUPS,
  THREAD_SERIES_TEXT,
  threadSeriesFor,
  defaultThreadHeadHeight,
  normalizeThreadChamfer,
  normalizeThreadClearance,
  normalizeThreadBoltClearance,
  normalizeThreadAxialClearance,
  normalizeThreadDepth,
  normalizeThreadFlankAngle,
  threadDepthLimits,
  MIN_THREAD_FLANK_ANGLE,
  MAX_THREAD_FLANK_ANGLE,
  threadAxialClearanceLimit,
  MIN_THREAD_BOLT_CLEARANCE,
  MAX_THREAD_BOLT_CLEARANCE,
  normalizeThreadDiameter,
  normalizeThreadHand,
  normalizeThreadHead,
  normalizeThreadHeadChamfer,
  normalizeThreadHeadHeight,
  normalizeThreadPitch,
  normalizeThreadProfile,
  normalizeThreadQuality,
  normalizeThreadRole,
  threadNaturalFootprint,
  pitchToThreadsPerInch,
  threadChamferLimits,
  threadHeadChamferLimits,
  threadHeadHeightLimits,
  threadNaturalHeight,
  threadPitchLimits,
  threadSettings,
  threadSizeFor,
  threadSizeById,
  threadProfileForSize,
  threadUsesInchPitch,
  threadsPerInchToPitch,
  type ThreadSettings,
} from "@/lib/threadGeometry";
import {
  DEFAULT_STAR_INNER_SIZE,
  DEFAULT_STAR_INNER_FILLET,
  DEFAULT_STAR_OUTER_FILLET,
  DEFAULT_STAR_POINTS,
  DEFAULT_STAR_QUALITY,
  MIN_STAR_QUALITY,
  MAX_STAR_QUALITY,
  normalizeStarQuality,
  starMaxFilletRadii,
} from "@/lib/starGeometry";
import {
  DEFAULT_HEART_TIP_FILLET,
  DEFAULT_HEART_QUALITY,
  MIN_HEART_QUALITY,
  MAX_HEART_QUALITY,
  normalizeHeartTipFillet,
  normalizeHeartQuality,
} from "@/lib/heartGeometry";
import {
  DEFAULT_CRESCENT_THICKNESS,
  DEFAULT_CRESCENT_TIP_FILLET,
  DEFAULT_CRESCENT_QUALITY,
  MIN_CRESCENT_QUALITY,
  MAX_CRESCENT_QUALITY,
  normalizeCrescentThickness,
  normalizeCrescentTipFillet,
  normalizeCrescentQuality,
} from "@/lib/crescentGeometry";
import {
  DEFAULT_HONEYCOMB_CELL_SIZE,
  DEFAULT_HONEYCOMB_WALL_THICKNESS,
  DEFAULT_HONEYCOMB_FRAME_WIDTH,
  normalizeHoneycombCellSize,
  normalizeHoneycombWallThickness,
  normalizeHoneycombFrameWidth,
} from "@/lib/honeycombGeometry";
import {
  DEFAULT_ROUNDED_BOX_CORNER_FILLET,
  DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET,
  DEFAULT_ROUNDED_BOX_QUALITY,
  MIN_ROUNDED_BOX_QUALITY,
  MAX_ROUNDED_BOX_QUALITY,
  normalizeCornerFillet,
  normalizeTopBottomFillet,
  normalizeRoundedBoxQuality,
} from "@/lib/roundedBoxGeometry";
import {
  MAX_BENT_TUBE_BEND_ANGLE,
  MAX_BENT_TUBE_QUALITY,
  MAX_BENT_TUBE_ROLL,
  MAX_BENT_TUBE_SEGMENTS,
  MIN_BENT_TUBE_QUALITY,
  MIN_BENT_TUBE_SIZE,
  bentTubeParameterPatch,
  bentTubeSelfIntersects,
  bentTubeWallLimits,
  minBentTubeBendRadius,
  normalizedBentTubeFields,
} from "@/lib/bentTubeGeometry";
import { displayStepFromMillimeters, formatFractionalInches, showsInchFractions, displayToMillimeters, formatMeasurementNumber, lengthDisplayUnit, measurementOptionLabel, millimetersToDisplay, parseMeasurementInput, resolveMeasurementInput } from "@/lib/measurementUnits";
import { t, type MessageKey } from "@/lib/i18n";
import { localizedError } from "@/lib/userErrors";
import { displayShapeName, makeShapeFromAsset, renamedShapeName } from "@/lib/shapeCatalog";
import { cylinderToEllipsePatch } from "@/lib/cylinderToEllipse";
import { normalizeSurfaceTexture, SURFACE_TEXTURE_AXES, SURFACE_TEXTURE_CAP_EDGES, SURFACE_TEXTURE_CAP_STYLES, SURFACE_TEXTURE_CARBON_WEAVES, SURFACE_TEXTURE_BARK_TYPES, SURFACE_TEXTURE_BRICK_BONDS, SURFACE_TEXTURE_CRACK_STARTS, SURFACE_TEXTURE_CRACK_STYLES, SURFACE_TEXTURE_DEFAULTS, SURFACE_TEXTURE_DETAILS, SURFACE_TEXTURE_DIRECTIONS, SURFACE_TEXTURE_IMAGES, SURFACE_TEXTURE_LIMITS, SURFACE_TEXTURE_MASK_MODES, SURFACE_TEXTURE_PATTERNS, SURFACE_TEXTURE_PROFILES, SURFACE_TEXTURE_PROJECTIONS, SURFACE_TEXTURE_STARTERS, SURFACE_TEXTURE_TILINGS, SURFACE_TEXTURE_WOOD_CUTS, SURFACE_TEXTURE_WOOD_TYPES, surfaceTextureImageTile, type SurfaceTextureFace, type SurfaceTextureMaskMode, type SurfaceTexturePattern, type SurfaceTextureSettings } from "@/lib/surfaceTexture";
import { SURFACE_TEXTURE_OWN_IMAGE_SIZE, surfaceTextureOwnImage } from "@/lib/surfaceTextureImages";
import { BARK_STARTS, WOOD_RINGS } from "@/lib/surfaceTextureWood";
import { offersSurfaceTextureMask, SURFACE_TEXTURE_LABELS, surfacePatternLabel, surfaceTextureEntry } from "@/lib/surfaceTextureShape";
import { LIMITS as VASE_LIMITS, MATERIALS as VASE_MATERIALS, type VaseChoiceKey, type VaseNumberKey } from "@/lib/vase/vase-geometry.mjs";
import { normalizeVaseSettings, type VaseSettings } from "@/lib/vaseSettings";
import { vaseShapePatchOffThread } from "@/lib/vaseShape";
import { VaseDrawingWindow } from "@/components/workplane/VaseDrawingWindow";
import { VasePrintReport } from "@/components/workplane/VasePrintReport";
import { shapeDefaultsAsset, shapeDefaultsFromShape } from "@/lib/shapeDefaults";
import { MAX_SCREW_HOLE_ANGLE, MIN_SCREW_HOLE_ANGLE, normalizeScrewHoleAngle, normalizeScrewHoleHeadDepth, normalizeScrewHoleShaft } from "@/lib/screwHoleGeometry";
import { MAX_TEARDROP_TIP_ANGLE, MIN_TEARDROP_TIP_ANGLE, normalizeTeardropTipAngle, teardropHeightForTipAngle, teardropTipAngle } from "@/lib/teardropGeometry";
import { MAX_DOVETAIL_CLEARANCE, normalizeDovetailClearance, normalizeDovetailNeckWidth } from "@/lib/dovetailGeometry";
import { DEFAULT_SKETCH_STROKE, MAX_SKETCH_STROKE_WIDTH, MIN_SKETCH_STROKE_EDGE, MIN_SKETCH_STROKE_WIDTH, normalizeSketchStroke, SKETCH_STROKE_JOINS } from "@/lib/sketchStroke";
import { MAX_TEXT_EDGE, MIN_TEXT_EDGE, normalizeTextEdge } from "@/lib/textEdge";
import { wheelBaseStep, wheelNextValue, wheelTurn } from "@/lib/wheelValueStep";
import { textHasFill } from "@/lib/textFill";
import { TEXT_FILL_CHOICES, textFillChoice, textLineSettingsInView, textStrokeForChoice, textStrokeWider, type TextFillChoice } from "@/lib/textFillChoice";
import { MAX_TEXT_LAYERS, MAX_TEXT_LAYER_GROW, MIN_TEXT_LAYER_HEIGHT, nameTagKeyringAlongLimit, namesFromList, type NameTagKeyring, type TextLayer } from "@/lib/textLayers";
import { iconKeyringAlongLimit } from "@/lib/sketchKeyring";
import { DEFAULT_KEYRING_DIAMETER, MAX_TEXT_SPACING, MIN_KEYRING_DIAMETER, MIN_TEXT_SPACING, TEXT_KEYRING_SIDES } from "@/lib/textGeometry";
import { addTextLayer, MIN_LETTER_SIZE, MIN_NAME_TAG_LAYERS, NAME_TAG_GAP, NAME_TAG_LAYERS, NAME_TAG_LETTER_SIZE, removeTextLayer, textBaselineKeepShift, textLetterSize, textLetterSizePatch, textSpacingPatch, type NameTagStack } from "@/lib/nameTag";
import { FONT_MANAGER_OPTION, requestFontManager } from "@/lib/fontManagerEvents";
import { FontPicker } from "@/components/workplane/FontPicker";
import { QR_BYTE_CAPACITY, qrByteLength, qrTextFits, type QrCodeSettings } from "@/lib/qrCode";
import { ICON_TAG_LAYERS, iconTagFitCount, MAX_ICON_TAG_WIDTH, MAX_ICON_TAGS, MIN_ICON_TAG_WIDTH, normalizeIconTagCount, type IconLayerStack } from "@/lib/iconTag";
import { PICTURE_FILE_ACCEPT } from "@/lib/pictureIcon";
import { customFontList, textFontLabel } from "@/lib/textFonts";
import { SURFACE_TEXT_FONTS } from "@/lib/surfaceTextOutline";
import { MIN_SLOT_END_RATIO, normalizeSlotEndRatio, taperedSlotOutline } from "@/lib/slotGeometry";
import { loftMeasures, loftShapePatch, loftTiltLimit, maxLoftWall, MAX_LOFT_SEGMENTS, MAX_LOFT_SIDES, MAX_LOFT_TWIST, MIN_LOFT_SEGMENTS, MIN_LOFT_SIDES, MIN_LOFT_SIZE, normalizeLoftOutline, type LoftMeasures } from "@/lib/loftGeometry";
import { MAX_KNURL_ANGLE, MIN_KNURL_ANGLE, MIN_KNURL_COUNT, MIN_KNURL_DEPTH, knurlSettings, maxKnurlChamfer, maxKnurlCount, maxKnurlDepth, maxRoundKnurlDepth, normalizeKnurlAngle, normalizeKnurlChamfer, normalizeKnurlCount, normalizeKnurlDepth, normalizeKnurlPattern } from "@/lib/knurlGeometry";
import {
  DEFAULT_GRIDFINITY_LABEL_CORNER,
  GRIDFINITY_BASEPLATE_RADIUS,
  GRIDFINITY_BIN_RADIUS,
  GRIDFINITY_LABEL_WALL_KEYS,
  GRIDFINITY_OPEN_WALL_KEYS,
  GRIDFINITY_PADDING_KEYS,
  GRIDFINITY_SCOOP_WALL_KEYS,
  MAX_GRIDFINITY_DIVIDER_THICKNESS,
  MAX_GRIDFINITY_DRAWER,
  MAX_GRIDFINITY_HEIGHT_UNITS,
  MAX_GRIDFINITY_LIP_CHAMFER,
  MAX_GRIDFINITY_PADDING,
  MAX_GRIDFINITY_TRAY_HEIGHT,
  MAX_GRIDFINITY_TRAY_SIZE,
  MIN_GRIDFINITY_COMPARTMENT_LABEL_LENGTH,
  MIN_GRIDFINITY_COMPARTMENT_LABEL_MM,
  MIN_GRIDFINITY_DIVIDER_THICKNESS,
  MIN_GRIDFINITY_DRAWER,
  MIN_GRIDFINITY_LABEL_WIDTH,
  MIN_GRIDFINITY_SCOOP_RADIUS,
  MIN_GRIDFINITY_TRAY_HEIGHT,
  MIN_GRIDFINITY_TRAY_SIZE,
  MIN_GRIDFINITY_UNITS,
  MIN_GRIDFINITY_WALL_THICKNESS,
  type GridfinityAxis,
  type GridfinityWall,
  gridfinityCompartmentCount,
  gridfinityCompartmentCountPatch,
  gridfinityCompartmentLabel,
  gridfinityCompartmentLabelLeftOut,
  gridfinityCompartmentLabelMaxWidth,
  gridfinityCompartmentMax,
  gridfinityCompartments,
  gridfinityBinCornerFits,
  gridfinityBinCornerRadius,
  gridfinityCornerRadius,
  gridfinityDividerFits,
  gridfinityDividerLimits,
  gridfinityDividerPositionPatch,
  gridfinityDividerPositions,
  gridfinityDividerThickness,
  gridfinityDrawerPatch,
  gridfinityDrawerSize,
  gridfinityFloorFits,
  gridfinityFloorHeight,
  gridfinityFloorMaxHeight,
  gridfinityFloorMinHeight,
  gridfinityLabelCornerSize,
  gridfinityLabelFits,
  gridfinityLabelLength,
  gridfinityLabelLimits,
  gridfinityLabelMaxCornerSize,
  gridfinityLabelMaxWidth,
  gridfinityLabelWidth,
  gridfinityLipChamfer,
  gridfinityMaxUnits,
  gridfinityOpenFits,
  gridfinityOpening,
  gridfinityOpeningCornerSize,
  gridfinityOpeningFits,
  gridfinityOpeningLimits,
  gridfinityOpeningMaxCornerSize,
  gridfinityOpeningPatch,
  gridfinityPaddingPatch,
  gridfinityPlan,
  gridfinityScoopFits,
  gridfinityScoopMaxRadius,
  gridfinityScoopRadius,
  gridfinityScoopsLeftOut,
  gridfinityShapePatch,
  gridfinityWallFits,
  gridfinityWallMaxThickness,
  gridfinityWallSolid,
  gridfinityWallThickness,
  normalizeGridfinityType,
} from "@/lib/gridfinityGeometry";
import { hingeLargestConeSize, hingeLargestCornerRadius, MAX_HINGE_ANGLE, MAX_HINGE_CLEARANCE, MAX_HINGE_KNUCKLES, MAX_HINGE_SCREW_DIAMETER, MAX_HINGE_SCREW_HOLES, MIN_HINGE_CLEARANCE, MIN_HINGE_KNUCKLES, MIN_HINGE_SCREW_DIAMETER, hingePlan, minimumHingeDepth, normalizeHingeAngle, normalizeHingeClearance, normalizeHingeKnuckles, normalizeHingeKnuckleWidth, normalizeHingeLeafThickness, normalizeHingePinDiameter, normalizeHingeScrewDiameter, normalizeHingeScrewHoles } from "@/lib/hingeGeometry";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { meshAabb } from "@/lib/editorMeshCore";
import { isNonSolidShape, resizedShapeSize, shapeDepth, shapeHasTaper, shapeOverallFootprintDimensions, shapeSupportsTaper, shapeTaperDimensions, shapeWidth } from "@/lib/workplaneShapes";
import { MAX_SKETCH_REVOLVE_TURNS, normalizeSketchRevolveSettings } from "@/lib/sketchRevolve";
import { roundSideCount } from "@/lib/roundSideCount";
import { torusTessellation } from "@/lib/torusTessellation";
import { TORUS_MAX_TUBE_RATIO, TORUS_MIN_TUBE_RATIO, torusTubeRatio, torusTubeThickness } from "@/lib/torusShape";
import { normalizePyramidTop } from "@/lib/pyramidGeometry";
import {
  MAX_SPRING_QUALITY,
  MIN_SPRING_QUALITY,
  normalizeSpringQuality,
  normalizeSpringHand,
  normalizeSpringTurns,
  normalizeSpringWire,
  springSettings,
  springTurnLimits,
  springWireLimits,
} from "@/lib/springGeometry";
import { regularPolygonAspect } from "@/lib/regularPolygonFootprint";
import { DEFAULT_TAPER_DIMENSION_MAX, MAX_HIGH_RESOLUTION_SIDES, MAX_HIGH_RESOLUTION_STEPS, POSITION_TYPED_LIMIT, RULER_MAX_LENGTH, customSnapGridLabel, positionReach, shapeDimensionLimit, snapGridOptions, snapGridStep } from "@/lib/workplaneSettings";
import { printerPresetById } from "@/lib/printBed";
import type { BentTubeInnerProfile, BentTubeProfile, CustomSnapGrid, GearType, GridfinityCompartmentLabel, GridfinityType, GridSize, MeasurementAccuracy, ShapeCustomization, SketchProfile, SketchStroke, SketchStrokeAlign, SketchStrokeJoin, ThreadHead, ThreadProfile, ThreadRole, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { selectWholeValue } from "@/lib/numberField";
import { formulaMatchesValue, formulaToRemember, withFieldFormula, type FieldFormulas } from "@/lib/fieldFormulas";
import { useKeptColors, useRecentColors } from "@/lib/recentColors";
import { ColorKeepRows } from "@/components/workplane/ColorKeepRows";
import { canToggleGroupColors, groupShowsPartColors } from "@/lib/groupColors";
import { shapePivotFromWorld, shapePivotWorld } from "@/lib/rotationPivot";
import { signedDegrees } from "@/lib/geometryRotation";
import { orientedMeasures, withOrientedMeasures } from "@/lib/orientedMeasures";
import { tubeAfterInner, tubeAfterOuter, tubeInnerDiameter } from "@/lib/tubeDiameters";

/**
 * Docked at the right edge, full height. Moved away, it floats: no longer
 * pinned to the right and bottom. Dropped back at the top right, it docks.
 */
const INSPECTOR_PANEL: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto" },
  dockedAt: (area, panel) => ({ left: area.width - panel.width, top: 0 }),
};

const MIN_SHAPE_SIZE = 0.01;
const SOLID_COLORS = [
  "#d41721",
  "#ff4b4b",
  "#ff7a1a",
  "#d97813",
  "#f6a21a",
  "#f2cf10",
  "#f7e65a",
  "#a8d642",
  "#33983d",
  "#1fb66d",
  "#18b99a",
  "#0098c7",
  "#49c7ef",
  "#3b82f6",
  "#294c93",
  "#5b5ce2",
  "#6e2786",
  "#9b3bd2",
  "#c9009a",
  "#f062b6",
  "#8a5a2b",
  "#b98254",
  "#f2caa0",
  "#ffffff",
  "#cfd8df",
  "#8a98a6",
  "#4b5563",
  "#111111",
];
const TEXT_FONT_OPTIONS = ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", "Stencil", "Japanese"];
/** `label` traegt den Katalogschluessel, nicht den fertigen Text. */
const GEAR_TYPE_OPTIONS: Array<{ value: GearType; label: MessageKey }> = [
  { value: "spur", label: "gear.spur" },
  { value: "helical", label: "gear.helical" },
  { value: "herringbone", label: "gear.herringbone" },
  { value: "bevel", label: "gear.bevel" },
  { value: "internal", label: "gear.internal" },
  { value: "rack", label: "gear.rack" },
];
/** The vase's choices, by the core's names for them. */
const VASE_CHOICES: Partial<Record<VaseChoiceKey, Record<string, MessageKey>>> = {
  profile: { flasche: "vase.profileBottle", bauchig: "vase.profileBellied", schale: "vase.profileBowl", fass: "vase.profileBarrel", zylinder: "vase.profileCylinder", trichter: "vase.profileFunnel", gezeichnet: "vase.profileDrawn" },
  section: { kreis: "vase.sectionCircle", vieleck: "vase.sectionPolygon", welle: "vase.sectionWave", gezeichnet: "vase.sectionDrawn" },
  sectionWaveStyle: { weich: "vase.waveSoft", spitz: "vase.wavePointed", bogen: "vase.waveArches", lamellen: "vase.waveFins" },
  body: { voll: "vase.bodySolid", hohl: "vase.bodyHollow" },
  innerShape: { folgt: "vase.innerFollows", rund: "vase.innerRound" },
  effect: { keine: "vase.effectNone", rillen: "vase.effectGrooves", streifen: "vase.effectStripes", voronoi: "vase.effectVoronoi", lowpoly: "vase.effectFacets" },
  ribShape: { rund: "vase.grooveRound", v: "vase.groovePointed", flach: "vase.grooveFlat" },
  stripeStyle: { einfach: "vase.stripesOneWay", doppelt: "vase.stripesCrossed" },
  quality: { entwurf: "vase.qualityDraft", standard: "vase.qualityStandard", fein: "vase.qualityFine" },
  section2: { keiner: "vase.section2None", kreis: "vase.sectionCircle", vieleck: "vase.sectionPolygon", welle: "vase.sectionWave", gezeichnet: "vase.sectionDrawn" },
  drawSymmetry: { halb: "vase.symHalf", viertel: "vase.symQuarter", windmuehle: "vase.symWindmill", frei: "vase.symFree" },
  twistMode: { gleichmaessig: "vase.twistEven", kurve: "vase.twistCurve" },
  section2WaveStyle: { weich: "vase.waveSoft", spitz: "vase.wavePointed", bogen: "vase.waveArches", lamellen: "vase.waveFins" },
  twistAlong: { hoehe: "vase.twistAlongHeight", kontur: "vase.twistAlongContour" },
  cutout: { keine: "vase.cutoutNone", voronoi: "vase.effectVoronoi", waben: "vase.cutoutHoneycomb", rauten: "vase.cutoutDiamonds", kreise: "vase.cutoutCircles" },
  cutoutEdge: { anschneiden: "vase.cutoutCut", ganz: "vase.cutoutWhole" },
  reinforce: { keine: "vase.reinforceNone", rippen: "vase.reinforceRibs", doppelwand: "vase.reinforceDouble" },
  lamp: { keine: "vase.lampNone", haengend: "vase.lampHanging", stehend: "vase.lampStanding", puck: "vase.lampPuck" },
  lampSocket: { e27: "vase.socketE27", e14: "vase.socketE14", eigen: "vase.socketCustom" },
  legMode: { keine: "vase.legsNone", stecken: "vase.legsPlugIn", angeformt: "vase.legsMoulded", staender: "vase.legsStand" },
  legShape: { kegel: "vase.legCone", zylinder: "vase.legCylinder", kantig: "vase.legSquare" },
  saucerMode: { keine: "vase.saucerNone", schale: "vase.saucerBowl", versteckt: "vase.saucerHidden" },
  insertMode: { keine: "vase.insertNone", pflanze: "vase.insertPlant", bewaesserung: "vase.insertWatering", stecker: "vase.insertFrog", roehrchen: "vase.insertTube" },
  lidMode: { keiner: "vase.lidNone", stuelp: "vase.lidSlip", schnapp: "vase.lidSnap", schraube: "vase.lidScrew" },
};
const BENT_TUBE_PROFILE_OPTIONS: Array<{ value: BentTubeProfile; label: MessageKey }> = [
  { value: "round", label: "bentTube.profileRound" },
  { value: "square", label: "bentTube.profileSquare" },
  { value: "hexagon", label: "bentTube.profileHexagon" },
  { value: "octagon", label: "bentTube.profileOctagon" },
];
const THREAD_ROLE_OPTIONS: Array<{ value: ThreadRole; label: MessageKey }> = [
  { value: "rod", label: "thread.rod" },
  { value: "screw", label: "thread.screw" },
  { value: "nut", label: "thread.nut" },
  { value: "bore", label: "thread.bore" },
];
const THREAD_HEAD_OPTIONS: Array<{ value: ThreadHead; label: MessageKey }> = [
  { value: "cylinder", label: "thread.headCylinder" },
  { value: "countersunk", label: "thread.headCountersunk" },
  { value: "hex", label: "thread.headHex" },
];
const THREAD_PROFILE_OPTIONS: Array<{ value: ThreadProfile; label: MessageKey }> = [
  { value: "v", label: "thread.profileV" },
  { value: "trapezoidal", label: "thread.profileTrapezoidal" },
  { value: "round", label: "thread.profileRound" },
  { value: "whitworth", label: "thread.profileWhitworth" },
  { value: "custom", label: "thread.profileCustom" },
];

type RangePropertyConfig = {
  type?: "range";
  /** Bleibt englisch und unveraendert: Einheiten und Filter haengen daran. */
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Zusaetzlich zur Sperre des ganzen Objekts, etwa bei automatischen Werten. */
  disabled?: boolean;
  /** A line under the row saying what the value measures (#215). */
  hint?: string;
  onChange: (value: number) => void;
};

type TogglePropertyConfig = {
  type: "toggle";
  id: string;
  label: string;
  value: boolean;
  /** Switches next to each other with the same layout, such as a bin's four open sides (#455), are drawn together in it. */
  layout?: "sides";
  /** Its place in that layout, named rather than counted: the row takes the class check-property-{area}. */
  area?: GridfinityWall;
  onChange: (value: boolean) => void;
};

type TextPropertyConfig = {
  type: "text";
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

type SelectPropertyOption = {
  value: string;
  label: string;
  /** Ueberschrift, unter der der Eintrag im aufgeklappten Feld steht. */
  group?: string;
};

type SelectPropertyConfig = {
  type: "select";
  id: string;
  label: string;
  value: string;
  options: SelectPropertyOption[];
  /** Eine Zeile unter dem Feld, die die getroffene Wahl erklaert. */
  hint?: string;
  /** The words a font picker draws every font with: set, the entries are fonts and the field is a picker, not a plain select. */
  fontSample?: string;
  onChange: (value: string) => void;
};

type ShapePropertyConfig = RangePropertyConfig | TextPropertyConfig | SelectPropertyConfig | TogglePropertyConfig;
export type ShapeInspectorUpdateOptions = { resizeAxis?: "width" | "depth" | "height" };
type ShapeInspectorUpdate = (patch: Partial<WorkplaneShape>, options?: ShapeInspectorUpdateOptions) => void;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** A measure in a sentence: at most two decimals, none when it is whole (24 mm, module 1.5). */
function plainNumber(value: number) {
  return String(Math.round(value * 100) / 100);
}

function formatPropertyNumber(value: number, accuracy: MeasurementAccuracy, step: number) {
  if (step >= 1) return String(Math.round(value));
  return formatMeasurementNumber(value, accuracy, step);
}

const RELATIVE_SIZE_PROPERTY_IDS = new Set(["width", "height", "length", "diameter", "starOuterSize"]);
const ROTATION_PROPERTY_IDS = new Set(["rotateX", "rotateY", "rotateZ"]);
/** How long after the last turn of the wheel a field is kept under the pointer. */
const WHEEL_ANCHOR_MS = 600;

/** The nearest box around an element that scrolls up and down. */
function scrollingAncestor(element: HTMLElement): HTMLElement | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const overflow = getComputedStyle(parent).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return null;
}

function propertyUsesLengthUnit(key: string) {
  return ["textLineWidth", "textEdgeSize", "letterSize", "iconWidth", "keyringDiameter", "keyringAlong", "positionX", "positionY", "positionZ", "pivotX", "pivotY", "pivotZ", "radius", "length", "width", "height", "bevel", "topRadius", "baseRadius", "thickness", "outerDiameter", "innerDiameter", "textRadius", "extrudeTopOffsetX", "extrudeTopOffsetZ", "toothSize", "toothWidth", "gearBacklash", "centerHole", "slotSmallEnd", "slotCentreDistance", "torusTube", "sketchLineWidth", "sketchCuttingEdge", "topLength", "topWidth", "bottomLength", "bottomWidth", "diameter", "pitch", "clearance", "axialClearance", "boltClearance", "threadDepth", "threadCoreDiameter", "threadLength", "headHeight", "chamfer", "chamferBottom", "headChamfer", "wire", "starOuterSize", "starInnerSize", "starOuterFillet", "starInnerFillet", "heartTipFillet", "crescentThickness", "crescentTipFillet", "honeycombCellSize", "honeycombWallThickness", "honeycombFrameWidth", "cornerFillet", "topBottomFillet", "bentTubeSize", "bentTubeWall", "bentTubeSegmentLength", "bentTubeBendRadius", "dovetailNeckWidth", "dovetailClearance", "hingePinDiameter", "hingeLeafThickness", "hingeClearance", "hingeCornerRadius", "hingeScrewDiameter", "hingeScrewSpacing", "hingeScrewAcross", "screwHoleShaft", "screwHoleHeadDepth", "knurlDepth", "knurlChamfer", "loftBottomWidth", "loftBottomDepth", "loftTopWidth", "loftTopDepth", "loftBottomCorner", "loftTopCorner", "loftOffsetX", "loftOffsetZ", "loftWall", "gridfinityLabelBackLength", "gridfinityLabelBackOffset", "gridfinityLabelBackWidth", "gridfinityLabelCornerSize", "gridfinityLabelFrontLength", "gridfinityLabelFrontOffset", "gridfinityLabelFrontWidth", "gridfinityLabelLeftLength", "gridfinityLabelLeftOffset", "gridfinityLabelLeftWidth", "gridfinityLabelRightLength", "gridfinityLabelRightOffset", "gridfinityLabelRightWidth", "gridfinityScoopRadius", "gridfinityFloorHeight", "gridfinityLipChamfer", "gridfinityWallThickness", "gridfinityDrawerWidth", "gridfinityDrawerDepth", "gridfinityPaddingBack", "gridfinityPaddingFront", "gridfinityPaddingLeft", "gridfinityPaddingRight", "gridfinityCornerRadius", "gridfinityBinCornerRadius", "gridfinityDividerThickness", "gridfinityDividerPositionX", "gridfinityDividerPositionZ", "gridfinityCompartmentLabelWidth", "gridfinityOpeningCornerSize", "gridfinityOpeningDepthBack", "gridfinityOpeningDepthFront", "gridfinityOpeningDepthLeft", "gridfinityOpeningDepthRight", "gridfinityOpeningWidthBack", "gridfinityOpeningWidthFront", "gridfinityOpeningWidthLeft", "gridfinityOpeningWidthRight", "gridfinityOpeningDistanceBack", "gridfinityOpeningDistanceFront", "gridfinityOpeningDistanceLeft", "gridfinityOpeningDistanceRight", "surfaceSpacing", "surfaceDepth", "surfaceFade", "surfaceCrackWidth", "surfaceCrackRecess", "surfaceTextSize", "surfaceCarbonCross", "surfaceBrickHeight", "surfaceBrickJoint", "surfaceRingWidth", "vase.wall", "vase.bottom", "vase.ribDepth", "vase.stripeDepth", "vase.voronoiCell", "vase.voronoiGap", "vase.voronoiDepth", "vase.waveAmplitude", "vaseFloor.drainDiameter", "vaseFloor.floorSlope", "vaseFloor.footHeight", "vaseFloor.rubberFootDiameter", "vaseFloor.rubberFootDepth", "vaseFloor.cutoutSize", "vaseFloor.cutoutWeb", "vaseFloor.lampHole", "vaseFloor.puckDiameter", "vaseFloor.lampNotch", "vaseFloor.lampNotchHeight", "vaseFloor.reinforceDepth", "vaseFloor.slitWidth", "vaseFloor.lineWidth", "vasePrint.lineWidth", "vaseParts.legHeight", "vaseParts.legDiameter", "vaseParts.saucerHeight", "vaseParts.saucerGap", "vaseParts.saucerWall", "vaseParts.insertWall", "vaseParts.insertStandoff", "vaseParts.reservoirHeight", "vaseParts.frogHole", "vaseParts.tubeDiameter", "vaseParts.lidClearance", "vaseParts.lidThickness", "vaseParts.lidDepth", "vaseParts.threadPitch", "vaseParts.fitClearance"].includes(key);
}

/**
 * Der Schalter und der Regler fuer die Seitenzahl runder Koerper. Ohne eigene
 * Angabe folgt sie der Groesse; der Schalter haelt sie fest, indem er die
 * gerade wirksame Zahl eintraegt.
 */
function roundSideProperties(
  shape: WorkplaneShape,
  width: number,
  depth: number,
  onUpdate: ShapeInspectorUpdate,
): ShapePropertyConfig[] {
  const followsSize = shape.sides === undefined;
  const effectiveSides = roundSideCount(shape.sides, width, depth);
  return [
    {
      type: "toggle",
      id: "sidesFollowSize",
      label: t("prop.sidesFollowSize"),
      value: followsSize,
      onChange: (follows) => onUpdate({ sides: follows ? undefined : effectiveSides }),
    },
    {
      id: "sides",
      label: t("prop.sides"),
      value: effectiveSides,
      min: 3,
      max: MAX_HIGH_RESOLUTION_SIDES,
      step: 1,
      disabled: followsSize,
      onChange: (sides) => onUpdate({ sides: Math.round(sides) }),
    },
  ];
}

/**
 * Der Torus hat zwei Zahlen: Seiten rund um den Ring, Stufen rund um den Wulst. Beide folgen
 * zusammen der Groesse, bis der Schalter sie festhaelt (#272).
 */
function torusSideProperties(
  shape: WorkplaneShape,
  width: number,
  depth: number,
  onUpdate: ShapeInspectorUpdate,
): ShapePropertyConfig[] {
  const followsSize = shape.sides === undefined && shape.steps === undefined;
  const effective = torusTessellation(shape, width, depth, shape.height);
  return [
    {
      type: "toggle",
      id: "sidesFollowSize",
      label: t("prop.sidesFollowSize"),
      value: followsSize,
      onChange: (follows) => onUpdate(follows ? { sides: undefined, steps: undefined } : { sides: effective.ringSides, steps: effective.tubeSteps }),
    },
    {
      id: "sides",
      label: t("prop.torusSides"),
      value: effective.ringSides,
      min: 12,
      max: MAX_HIGH_RESOLUTION_SIDES,
      step: 1,
      disabled: followsSize,
      onChange: (sides) => onUpdate({ sides: Math.round(sides), steps: shape.steps ?? effective.tubeSteps }),
    },
    {
      id: "steps",
      label: t("prop.torusSteps"),
      value: effective.tubeSteps,
      min: 6,
      max: MAX_HIGH_RESOLUTION_STEPS,
      step: 1,
      disabled: followsSize,
      onChange: (steps) => onUpdate({ steps: Math.round(steps), sides: shape.sides ?? effective.ringSides }),
    },
  ];
}

function getShapePropertiesWithAppLimits(shape: WorkplaneShape, onUpdate: ShapeInspectorUpdate, textWidthMax = 260): ShapePropertyConfig[] {
  const baseWidth = shapeWidth(shape);
  const baseDepth = shapeDepth(shape);
  const footprint = shapeOverallFootprintDimensions(shape);
  const width = footprint.width;
  const depth = footprint.depth;
  const taper = shapeTaperDimensions(shape);
  const widthPatch = (value: number): Partial<WorkplaneShape> => {
    if (!shapeHasTaper(shape)) {
      return { width: value, size: resizedShapeSize(value, baseDepth) };
    }
    const scale = value / Math.max(MIN_SHAPE_SIZE, width);
    const nextBaseWidth = Math.max(MIN_SHAPE_SIZE, baseWidth * scale);
    return {
      width: nextBaseWidth,
      size: resizedShapeSize(nextBaseWidth, baseDepth),
      taperTopWidth: Math.max(MIN_SHAPE_SIZE, taper.topWidth * scale),
      taperBottomWidth: Math.max(MIN_SHAPE_SIZE, taper.bottomWidth * scale),
    };
  };
  const depthPatch = (value: number): Partial<WorkplaneShape> => {
    if (!shapeHasTaper(shape)) {
      return { depth: value, size: resizedShapeSize(baseWidth, value) };
    }
    const scale = value / Math.max(MIN_SHAPE_SIZE, depth);
    const nextBaseDepth = Math.max(MIN_SHAPE_SIZE, baseDepth * scale);
    return {
      depth: nextBaseDepth,
      size: resizedShapeSize(baseWidth, nextBaseDepth),
      taperTopDepth: Math.max(MIN_SHAPE_SIZE, taper.topDepth * scale),
      taperBottomDepth: Math.max(MIN_SHAPE_SIZE, taper.bottomDepth * scale),
    };
  };
  const setWidth = (value: number) => onUpdate(widthPatch(value), { resizeAxis: "width" });
  const setDepth = (value: number) => onUpdate(depthPatch(value), { resizeAxis: "depth" });
  const setConeWidth = (value: number) => {
    const patch = widthPatch(value);
    patch.baseRadius = Math.max(MIN_SHAPE_SIZE, (patch.width ?? baseWidth) / 2);
    onUpdate(patch, { resizeAxis: "width" });
  };
  const setCylinderDiameter = (value: number) => {
    const patch = widthPatch(value);
    patch.depth = patch.width ?? value;
    onUpdate(patch, { resizeAxis: "width" });
  };
  const setBaseRadius = (value: number) => {
    const diameter = value * 2;
    onUpdate({ baseRadius: value, width: diameter, size: resizedShapeSize(diameter, baseDepth) }, { resizeAxis: "width" });
  };
  const setHeight = (height: number) => onUpdate({ height }, { resizeAxis: "height" });

  if (shape.sketchOperation === "revolve" || shape.sketchRevolve) {
    const settings = normalizeSketchRevolveSettings(shape.sketchRevolve);
    const updateRevolve = (patch: Partial<typeof settings>) => onUpdate({ sketchRevolve: normalizeSketchRevolveSettings({ ...settings, ...patch }) });
    return [
      { id: "startAngle", label: t("prop.startAngle"), value: settings.startAngle, min: 0, max: 359, step: 1, onChange: (startAngle) => updateRevolve({ startAngle }) },
      // With a pitch the profile winds up as one strand; the sweep is then counted in turns
      // (negative winds left-handed), and a pitch of 0 turns it back into rings.
      ...(settings.pitch
        ? [{ id: "turns", label: t("prop.turns"), value: settings.sweepAngle / 360, min: -MAX_SKETCH_REVOLVE_TURNS, max: MAX_SKETCH_REVOLVE_TURNS, step: 0.25, onChange: (turns: number) => updateRevolve({ sweepAngle: turns * 360 }) }]
        : [{ id: "sweep", label: t("prop.sweep"), value: settings.sweepAngle, min: -360, max: 360, step: 1, onChange: (sweepAngle: number) => updateRevolve({ sweepAngle }) }]),
      { id: "pitch", label: t("prop.pitch"), value: settings.pitch ?? 0, min: 0, max: 100, step: 0.05, onChange: (pitch: number) => updateRevolve({ pitch, sweepAngle: pitch > 0 ? settings.sweepAngle : Math.max(-360, Math.min(360, settings.sweepAngle)) }) },
      // An exact revolved body is round at any size; the side count only shapes the mesh of an older one.
      ...(shape.cadBrep ? [] : [{ id: "sides", label: t("prop.sides"), value: settings.sides, min: 3, max: MAX_HIGH_RESOLUTION_SIDES, step: 1, onChange: (sides: number) => updateRevolve({ sides }) }]),
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.sketchProfile) {
    return [
      ...sketchFillProperties(shape.sketchProfile, onUpdate),
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "box") {
    return [
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "cylinder") {
    return [
      ...roundSideProperties(shape, width, depth, onUpdate),
      { id: "diameter", label: t("prop.diameter"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setCylinderDiameter },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "star") {
    const starPoints = shape.starPoints ?? DEFAULT_STAR_POINTS;
    const starInnerSize = shape.starInnerSize ?? DEFAULT_STAR_INNER_SIZE;
    const starOuterFillet = shape.starOuterFillet ?? DEFAULT_STAR_OUTER_FILLET;
    const starInnerFillet = shape.starInnerFillet ?? DEFAULT_STAR_INNER_FILLET;
    const starQuality = shape.starQuality ?? DEFAULT_STAR_QUALITY;
    const maxLimits = starMaxFilletRadii(width, starInnerSize, starPoints);
    const outerFilletMax = Math.max(1, Math.min(40, Math.ceil(maxLimits.maxOuterRadius * 10) / 10));
    const innerFilletMax = Math.max(1, Math.min(40, Math.ceil(maxLimits.maxInnerRadius * 10) / 10));
    const setStarOuterSize = (value: number) => {
      onUpdate({ width: value, depth: value, size: value }, { resizeAxis: "width" });
    };
    return [
      {
        id: "starPoints",
        label: t("prop.starPoints"),
        value: starPoints,
        min: 3,
        max: 32,
        step: 1,
        onChange: (value) => onUpdate({ starPoints: Math.round(value) }),
      },
      {
        id: "starOuterSize",
        label: t("prop.starOuterSize"),
        value: width,
        min: Math.max(MIN_SHAPE_SIZE, starInnerSize + 0.1),
        max: 160,
        onChange: setStarOuterSize,
      },
      {
        id: "starInnerSize",
        label: t("prop.starInnerSize"),
        value: starInnerSize,
        min: 0.1,
        max: Math.max(0.1, width - 0.1),
        step: 0.1,
        onChange: (value) => onUpdate({ starInnerSize: value }),
      },
      {
        id: "starOuterFillet",
        label: t("prop.starOuterFillet"),
        value: starOuterFillet,
        min: 0,
        max: outerFilletMax,
        step: 0.05,
        onChange: (value) => onUpdate({ starOuterFillet: value }),
      },
      {
        id: "starInnerFillet",
        label: t("prop.starInnerFillet"),
        value: starInnerFillet,
        min: 0,
        max: innerFilletMax,
        step: 0.05,
        onChange: (value) => onUpdate({ starInnerFillet: value }),
      },
      {
        id: "starQuality",
        label: t("prop.quality"),
        value: starQuality,
        min: MIN_STAR_QUALITY,
        max: MAX_STAR_QUALITY,
        step: 2,
        onChange: (value) => onUpdate({ starQuality: normalizeStarQuality(value) }),
      },
      {
        id: "height",
        label: t("prop.height"),
        value: shape.height,
        min: MIN_SHAPE_SIZE,
        max: 160,
        onChange: setHeight,
      },
    ];
  }

  if (shape.kind === "heart") {
    const heartTipFillet = shape.heartTipFillet ?? DEFAULT_HEART_TIP_FILLET;
    const heartQuality = shape.heartQuality ?? DEFAULT_HEART_QUALITY;
    return [
      {
        id: "heartTipFillet",
        label: t("prop.heartTipFillet"),
        value: heartTipFillet,
        min: 0,
        max: 20,
        step: 0.1,
        onChange: (value) => onUpdate({ heartTipFillet: normalizeHeartTipFillet(value) }),
      },
      {
        id: "heartQuality",
        label: t("prop.quality"),
        value: heartQuality,
        min: MIN_HEART_QUALITY,
        max: MAX_HEART_QUALITY,
        step: 2,
        onChange: (value) => onUpdate({ heartQuality: normalizeHeartQuality(value) }),
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "crescent") {
    const crescentThickness = shape.crescentThickness ?? DEFAULT_CRESCENT_THICKNESS;
    const crescentTipFillet = shape.crescentTipFillet ?? DEFAULT_CRESCENT_TIP_FILLET;
    const crescentQuality = shape.crescentQuality ?? DEFAULT_CRESCENT_QUALITY;
    const maxThickness = Math.max(2, width * 0.85);
    return [
      {
        id: "crescentThickness",
        label: t("prop.crescentThickness"),
        value: crescentThickness,
        min: 1,
        max: maxThickness,
        step: 0.1,
        onChange: (value) => onUpdate({ crescentThickness: normalizeCrescentThickness(value, width) }),
      },
      {
        id: "crescentTipFillet",
        label: t("prop.crescentTipFillet"),
        value: crescentTipFillet,
        min: 0,
        max: 8,
        step: 0.05,
        onChange: (value) => onUpdate({ crescentTipFillet: normalizeCrescentTipFillet(value) }),
      },
      {
        id: "crescentQuality",
        label: t("prop.quality"),
        value: crescentQuality,
        min: MIN_CRESCENT_QUALITY,
        max: MAX_CRESCENT_QUALITY,
        step: 2,
        onChange: (value) => onUpdate({ crescentQuality: normalizeCrescentQuality(value) }),
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "honeycomb") {
    const honeycombCellSize = shape.honeycombCellSize ?? DEFAULT_HONEYCOMB_CELL_SIZE;
    const honeycombWallThickness = shape.honeycombWallThickness ?? DEFAULT_HONEYCOMB_WALL_THICKNESS;
    const honeycombFrameWidth = shape.honeycombFrameWidth ?? DEFAULT_HONEYCOMB_FRAME_WIDTH;
    return [
      {
        id: "honeycombCellSize",
        label: t("prop.honeycombCellSize"),
        value: honeycombCellSize,
        min: 3,
        max: 25,
        step: 0.5,
        onChange: (value) => onUpdate({ honeycombCellSize: normalizeHoneycombCellSize(value) }),
      },
      {
        id: "honeycombWallThickness",
        label: t("prop.honeycombWallThickness"),
        value: honeycombWallThickness,
        min: 0.8,
        max: 5,
        step: 0.1,
        onChange: (value) => onUpdate({ honeycombWallThickness: normalizeHoneycombWallThickness(value) }),
      },
      {
        id: "honeycombFrameWidth",
        label: t("prop.honeycombFrameWidth"),
        value: honeycombFrameWidth,
        min: 0,
        max: 15,
        step: 0.5,
        onChange: (value) => onUpdate({ honeycombFrameWidth: normalizeHoneycombFrameWidth(value) }),
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 200, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 200, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "bentTube") {
    const fields = normalizedBentTubeFields(shape);
    const wallLimits = bentTubeWallLimits(fields.bentTubeProfile, fields.bentTubeInnerProfile, fields.bentTubeSize, fields.bentTubeQuality);
    const update = (changes: Partial<WorkplaneShape>) => onUpdate(bentTubeParameterPatch(shape, changes));
    const profileOptions = BENT_TUBE_PROFILE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }));
    const properties: ShapePropertyConfig[] = [
      {
        type: "select",
        id: "bentTubeProfile",
        label: t("prop.bentTubeProfile"),
        value: fields.bentTubeProfile,
        options: profileOptions,
        onChange: (value) => update({ bentTubeProfile: value as BentTubeProfile }),
      },
      {
        type: "select",
        id: "bentTubeInnerProfile",
        label: t("prop.bentTubeInnerProfile"),
        value: fields.bentTubeInnerProfile,
        options: [{ value: "none", label: t("bentTube.innerNone") }, ...profileOptions],
        onChange: (value) => update({ bentTubeInnerProfile: value as BentTubeInnerProfile }),
      },
      {
        id: "bentTubeSize",
        label: t("prop.bentTubeSize"),
        value: fields.bentTubeSize,
        min: MIN_BENT_TUBE_SIZE,
        max: 100,
        step: 0.5,
        onChange: (value) => update({ bentTubeSize: value }),
      },
    ];
    if (fields.bentTubeInnerProfile !== "none") {
      properties.push({
        id: "bentTubeWall",
        label: t("prop.bentTubeWall"),
        value: fields.bentTubeWall,
        min: wallLimits.min,
        max: wallLimits.max,
        step: 0.1,
        onChange: (value) => update({ bentTubeWall: value }),
      });
    }
    if (fields.bentTubeInnerProfile !== "none") {
      properties.push({ type: "toggle" as const, id: "tubeBoreHole", label: t("prop.tubeBoreHole"), value: shape.tubeBoreHole === true, onChange: (value: boolean) => onUpdate({ tubeBoreHole: value || undefined }) });
    }
    properties.push({
      id: "bentTubeQuality",
      label: t("prop.quality"),
      value: fields.bentTubeQuality,
      min: MIN_BENT_TUBE_QUALITY,
      max: MAX_BENT_TUBE_QUALITY,
      step: 4,
      onChange: (value) => update({ bentTubeQuality: value }),
    });
    return properties;
  }

  if (shape.kind === "roundedBox") {
    const cornerFillet = shape.cornerFillet ?? DEFAULT_ROUNDED_BOX_CORNER_FILLET;
    const topBottomFillet = shape.topBottomFillet ?? DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET;
    const roundedBoxQuality = shape.roundedBoxQuality ?? DEFAULT_ROUNDED_BOX_QUALITY;
    const maxCornerFillet = Math.max(1, Math.min(width, depth) / 2);
    const maxTopBottomFillet = Math.max(1, shape.height / 2);

    return [
      {
        id: "cornerFillet",
        label: t("prop.cornerFillet"),
        value: cornerFillet,
        min: 0,
        max: maxCornerFillet,
        step: 0.05,
        onChange: (value) => onUpdate({ cornerFillet: normalizeCornerFillet(value, Math.min(width, depth) / 2) }),
      },
      {
        id: "topBottomFillet",
        label: t("prop.topBottomFillet"),
        value: topBottomFillet,
        min: 0,
        max: maxTopBottomFillet,
        step: 0.05,
        onChange: (value) => onUpdate({ topBottomFillet: normalizeTopBottomFillet(value, shape.height / 2) }),
      },
      {
        id: "roundedBoxQuality",
        label: t("prop.quality"),
        value: roundedBoxQuality,
        min: MIN_ROUNDED_BOX_QUALITY,
        max: MAX_ROUNDED_BOX_QUALITY,
        step: 1,
        onChange: (value) => onUpdate({ roundedBoxQuality: normalizeRoundedBoxQuality(value) }),
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 200, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 200, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "counterbore" || shape.kind === "countersink" || shape.kind === "doubleCountersink") {
    const shaft = normalizeScrewHoleShaft(shape.screwHoleShaft, width);
    const shaftProperty: ShapePropertyConfig = {
      id: "screwHoleShaft",
      label: t("prop.screwHoleShaft"),
      value: shaft,
      min: 0.1,
      max: Math.max(0.2, width * 0.95),
      step: 0.1,
      onChange: (value) => onUpdate({ screwHoleShaft: normalizeScrewHoleShaft(value, width) }),
    };
    return [
      { id: "width", label: t("prop.screwHoleHead"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setCylinderDiameter },
      shaftProperty,
      shape.kind === "counterbore"
        ? {
            id: "screwHoleHeadDepth",
            label: t("prop.screwHoleHeadDepth"),
            value: normalizeScrewHoleHeadDepth(shape.screwHoleHeadDepth, shape.height),
            min: 0.1,
            max: Math.max(0.3, shape.height - 0.2),
            step: 0.1,
            onChange: (value) => onUpdate({ screwHoleHeadDepth: normalizeScrewHoleHeadDepth(value, shape.height) }),
          }
        : {
            id: "screwHoleAngle",
            label: t("prop.screwHoleAngle"),
            value: normalizeScrewHoleAngle(shape.screwHoleAngle),
            min: MIN_SCREW_HOLE_ANGLE,
            max: MAX_SCREW_HOLE_ANGLE,
            step: 1,
            onChange: (value) => onUpdate({ screwHoleAngle: normalizeScrewHoleAngle(value) }),
          },
      { id: "height", label: t("prop.screwHoleLength"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      // One entry in the library for both: the double countersink is the countersink chamfered on both faces (#621).
      ...(shape.kind === "counterbore"
        ? []
        : [{ type: "toggle" as const, id: "screwHoleBothSides", label: t("prop.screwHoleBothSides"), value: shape.kind === "doubleCountersink", onChange: (value: boolean) => onUpdate({ kind: value ? "doubleCountersink" : "countersink" }) }]),
      ...roundSideProperties(shape, width, depth, onUpdate),
    ];
  }

  if (shape.kind === "teardrop") {
    // Changing the diameter keeps the tip angle, so the point stays where the printer needs it.
    const tipAngle = teardropTipAngle(width, shape.height);
    const setDiameter = (value: number) => {
      const patch = widthPatch(value);
      patch.height = teardropHeightForTipAngle(patch.width ?? value, Math.min(tipAngle, MAX_TEARDROP_TIP_ANGLE));
      onUpdate(patch, { resizeAxis: "width" });
    };
    return [
      { id: "width", label: t("prop.teardropDiameter"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setDiameter },
      { id: "length", label: t("prop.teardropLength"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      {
        id: "teardropTipAngle",
        label: t("prop.teardropTipAngle"),
        value: Math.round(Math.min(tipAngle, MAX_TEARDROP_TIP_ANGLE) * 10) / 10,
        min: MIN_TEARDROP_TIP_ANGLE,
        max: MAX_TEARDROP_TIP_ANGLE,
        step: 1,
        onChange: (value) => onUpdate({ height: teardropHeightForTipAngle(width, normalizeTeardropTipAngle(value)) }, { resizeAxis: "height" }),
      },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      ...roundSideProperties(shape, width, width, onUpdate),
    ];
  }

  if (shape.kind === "vase") {
    const vase = normalizeVaseSettings(shape.vase);
    // A new choice can change the outline (a hexagon is narrower across its flats): the frame follows it.
    // The body is built on a worker, and the change comes once it is there.
    const setVase = (patch: Partial<VaseSettings>) => vaseShapePatchOffThread({ id: shape.id, width, depth, height: shape.height }, normalizeVaseSettings({ ...vase, ...patch }), (vasePatch) => onUpdate(vasePatch));
    const limits = (key: VaseNumberKey): [number, number] => VASE_LIMITS[key] ?? [0, 100];
    const range = (key: VaseNumberKey, label: MessageKey, step: number, hint?: MessageKey): ShapePropertyConfig => {
      const [min, max] = limits(key);
      return { id: `vase.${key}`, label: t(label), value: vase[key], min, max, step, hint: hint ? t(hint) : undefined, onChange: (value) => setVase({ [key]: value }) };
    };
    const percent = (key: VaseNumberKey, label: MessageKey): ShapePropertyConfig => {
      const [min, max] = limits(key);
      return { id: `vase.${key}`, label: t(label), value: Math.round(vase[key] * 100), min: min * 100, max: max * 100, step: 1, onChange: (value) => setVase({ [key]: value / 100 }) };
    };
    const choice = (key: VaseChoiceKey, label: MessageKey, hint?: MessageKey): ShapePropertyConfig => ({
      type: "select",
      id: `vase.${key}`,
      label: t(label),
      value: vase[key],
      options: Object.entries(VASE_CHOICES[key] ?? {}).map(([value, option]) => ({ value, label: t(option) })),
      hint: hint ? t(hint) : undefined,
      onChange: (value) => setVase({ [key]: value }),
    });
    const size = Math.max(width, depth);
    const properties: ShapePropertyConfig[] = [
      {
        id: "diameter",
        label: t("prop.vaseDiameter"),
        value: size,
        min: MIN_SHAPE_SIZE,
        max: 300,
        // Both sides together, so an outline that is not round keeps its proportions.
        onChange: (value) => onUpdate({ width: (width * value) / size, depth: (depth * value) / size, size: value }, { resizeAxis: "width" }),
      },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 400, onChange: setHeight },
      choice("profile", "prop.vaseProfile"),
      choice("section", "prop.vaseSection"),
    ];
    if (vase.section === "vieleck") properties.push(range("polySides", "prop.vaseSides", 1), percent("polyRound", "prop.vaseCornerRound"));
    if (vase.section === "welle") properties.push(range("sectionWaves", "prop.vaseWaves", 1), percent("sectionWaveAmp", "prop.vaseWaveDepth"), choice("sectionWaveStyle", "prop.vaseWaveStyle"));
    properties.push(choice("section2", "prop.vaseSection2", "vase.section2Hint"));
    if (vase.section2 === "vieleck") properties.push(range("section2Sides", "prop.vaseSides2", 1), percent("section2Round", "prop.vaseCornerRound2"));
    if (vase.section2 === "welle") properties.push(range("section2Waves", "prop.vaseWaves2", 1), percent("section2WaveAmp", "prop.vaseWaveDepth2"), choice("section2WaveStyle", "prop.vaseWaveStyle2"));
    if (vase.section2 !== "keiner") properties.push(range("section2From", "prop.vaseSection2From", 1), range("section2To", "prop.vaseSection2To", 1));
    // A drawn cross-section: the symmetry that makes the whole outline of the part drawn (card Draw).
    if (vase.section === "gezeichnet" || vase.section2 === "gezeichnet") {
      properties.push(choice("drawSymmetry", "prop.vaseDrawSymmetry", "vase.drawSymmetryHint"));
      if (vase.drawSymmetry === "windmuehle") properties.push(range("drawRepeat", "prop.vaseDrawRepeat", 1));
    }
    // A twist as a curve is drawn (card Draw); evenly, it comes from these sliders.
    properties.push(choice("twistMode", "prop.vaseTwistMode"));
    if (vase.twistMode !== "kurve") {
      properties.push(range("twist", "prop.vaseTwist", 1), range("swayAngle", "prop.vaseSway", 1, "vase.swayHint"));
      if (vase.swayAngle > 0) properties.push(range("swayCount", "prop.vaseSwayCount", 1));
    }
    if (vase.twistMode === "kurve" || vase.twist !== 0 || vase.swayAngle > 0) properties.push(choice("twistAlong", "prop.vaseTwistAlong"));
    properties.push(choice("body", "prop.vaseBody", vase.body === "voll" ? "vase.bodySolidHint" : "vase.bodyHollowHint"));
    if (vase.body === "hohl") properties.push(range("wall", "prop.vaseWall", 0.1), range("bottom", "prop.vaseBottom", 0.1, "vase.bottomHint"), choice("innerShape", "prop.vaseInner"));
    properties.push(choice("effect", "prop.vaseEffect", "vase.effectHint"));
    if (vase.effect === "rillen") {
      properties.push(range("ribCount", "prop.vaseGrooveCount", 1), range("ribDepth", "prop.vaseGrooveDepth", 0.1), percent("grooveWidth", "prop.vaseGrooveWidth"), choice("ribShape", "prop.vaseGrooveShape"), range("waveAmplitude", "prop.vaseGrooveWave", 0.5));
      if (vase.waveAmplitude > 0) properties.push(range("waveCount", "prop.vaseGrooveWaves", 1));
    }
    if (vase.effect === "streifen") properties.push(range("stripeCount", "prop.vaseStripeCount", 1), range("stripeDepth", "prop.vaseStripeDepth", 0.1), percent("stripeWidth", "prop.vaseStripeWidth"), range("stripeTurn", "prop.vaseStripeTurn", 1), choice("stripeStyle", "prop.vaseStripeStyle"));
    if (vase.effect === "voronoi") properties.push(range("voronoiCell", "prop.vaseCellSize", 0.5), range("voronoiGap", "prop.vaseCellGap", 0.1), range("voronoiDepth", "prop.vaseCellDepth", 0.1), range("voronoiSeed", "prop.vaseSeed", 1));
    if (vase.effect === "lowpoly") properties.push(range("lowpolyAround", "prop.vaseFacetsAround", 1), range("lowpolyRows", "prop.vaseFacetRows", 1), percent("lowpolyJitter", "prop.vaseFacetJitter"), range("lowpolySeed", "prop.vaseSeed", 1));
    if (vase.effect !== "keine" && vase.effect !== "lowpoly") properties.push(range("zoneFrom", "prop.vaseZoneFrom", 1), range("zoneTo", "prop.vaseZoneTo", 1));
    properties.push(choice("quality", "prop.vaseQuality", "vase.qualityHint"));
    // Bottom and wall, on a card of their own (ids "vaseFloor."): what the core builds into the body besides its form.
    const floor = (config: ShapePropertyConfig): ShapePropertyConfig => ({ ...config, id: config.id.replace(/^vase\./, "vaseFloor.") });
    const hollow = vase.body === "hohl";
    properties.push(floor({
      type: "toggle",
      id: "vase.watertight",
      label: t("prop.vaseWatertight"),
      value: vase.watertight === "ja",
      onChange: (value) => setVase({ watertight: value ? "ja" : "nein" }),
    }));
    // Without a bottom (0 mm and no lamp) there are no drain holes and no foot.
    const open = hollow && vase.lamp === "keine" && vase.bottom === 0;
    if (hollow && !open) {
      properties.push(floor(range("drainHoles", "prop.vaseDrainHoles", 1, "vase.floorHint")));
      if (vase.drainHoles > 0) properties.push(floor(range("drainDiameter", "prop.vaseDrainDiameter", 0.5)), floor(range("floorSlope", "prop.vaseFloorSlope", 0.1)));
      if (vase.lamp !== "puck") properties.push(floor(range("footHeight", "prop.vaseFootHeight", 1)));
    }
    properties.push(floor(range("rubberFeet", "prop.vaseRubberFeet", 1)));
    if (vase.rubberFeet > 0) properties.push(floor(range("rubberFootDiameter", "prop.vaseRubberFootDiameter", 0.5)), floor(range("rubberFootDepth", "prop.vaseRubberFootDepth", 0.1)));
    if (hollow) {
      properties.push(floor(choice("cutout", "prop.vaseCutout", "vase.cutoutHint")));
      if (vase.cutout !== "keine") {
        properties.push(
          floor(range("cutoutSize", "prop.vaseCutoutSize", 0.5)),
          floor(range("cutoutWeb", "prop.vaseCutoutWeb", 0.5)),
          floor(range("cutoutFrom", "prop.vaseCutoutFrom", 1)),
          floor(range("cutoutTo", "prop.vaseCutoutTo", 1)),
          floor(range("cutoutAspect", "prop.vaseCutoutAspect", 0.05)),
          floor(choice("cutoutEdge", "prop.vaseCutoutEdge")),
        );
        if (vase.cutout === "voronoi") properties.push(floor(range("cutoutSeed", "prop.vaseSeed", 1)));
      }
      properties.push(floor(choice("lamp", "prop.vaseLamp", "vase.lampHint")));
      if (vase.lamp === "haengend" || vase.lamp === "stehend") {
        properties.push(floor(choice("lampSocket", "prop.vaseLampSocket")));
        if (vase.lampSocket === "eigen") properties.push(floor(range("lampHole", "prop.vaseLampHole", 0.5)));
      }
      if (vase.lamp === "puck") properties.push(floor(range("puckDiameter", "prop.vasePuckDiameter", 1)));
      if (vase.lamp === "stehend" || vase.lamp === "puck") {
        properties.push(floor(range("lampNotch", "prop.vaseLampNotch", 0.5)));
        if (vase.lampNotch > 0) properties.push(floor(range("lampNotchHeight", "prop.vaseLampNotchHeight", 0.5)));
      }
    } else {
      properties.push(floor(choice("reinforce", "prop.vaseReinforce", "vase.reinforceHint")));
      if (vase.reinforce !== "keine") {
        properties.push(
          floor(range("reinforceCount", "prop.vaseReinforceCount", 1)),
          floor(range("reinforceDepth", vase.reinforce === "rippen" ? "prop.vaseRibReach" : "prop.vaseWallGap", 0.5)),
          floor(range("slitWidth", "prop.vaseSlitWidth", 0.01)),
          floor(range("lineWidth", "prop.vaseLineWidth", 0.01)),
        );
      }
    }
    // Accessories, on a card of their own (ids "vaseParts."): the legs' sockets, a lid's groove or thread go into the body.
    const part = (config: ShapePropertyConfig): ShapePropertyConfig => ({ ...config, id: config.id.replace(/^vase\./, "vaseParts.") });
    const yesNo = (key: VaseChoiceKey, label: MessageKey): ShapePropertyConfig => part({
      type: "toggle",
      id: `vase.${key}`,
      label: t(label),
      value: vase[key] === "ja",
      onChange: (value) => setVase({ [key]: value ? "ja" : "nein" }),
    });
    properties.push(part(choice("legMode", "prop.vaseLegs")));
    if (vase.legMode !== "keine") {
      properties.push(part(range("legCount", "prop.vaseLegCount", 1)), part(range("legHeight", "prop.vaseLegHeight", 1)), part(range("legDiameter", "prop.vaseLegDiameter", 0.5)), part(choice("legShape", "prop.vaseLegShape")), part(range("legSplay", "prop.vaseLegSplay", 1)));
      if (vase.legMode !== "staender") properties.push(part(percent("legInset", "prop.vaseLegInset")));
    }
    properties.push(part(choice("saucerMode", "prop.vaseSaucer")));
    if (vase.saucerMode === "schale") {
      properties.push(part(range("saucerHeight", "prop.vaseSaucerHeight", 1)), part(range("saucerGap", "prop.vaseSaucerGap", 0.5)), part(range("saucerWall", "prop.vaseSaucerWall", 0.1)), yesNo("saucerRibs", "prop.vaseSaucerRibs"), yesNo("saucerSpout", "prop.vaseSaucerSpout"), yesNo("saucerGrip", "prop.vaseSaucerGrip"));
    }
    if (hollow) {
      properties.push(part(choice("insertMode", "prop.vaseInsert")));
      if (vase.insertMode === "pflanze" || vase.insertMode === "bewaesserung") properties.push(part(range("insertWall", "prop.vaseInsertWall", 0.1)), part(range("insertStandoff", "prop.vaseInsertStandoff", 0.5)));
      if (vase.insertMode === "bewaesserung") properties.push(part(range("reservoirHeight", "prop.vaseReservoirHeight", 1)));
      if (vase.insertMode === "stecker") properties.push(part(range("frogHole", "prop.vaseFrogHole", 0.5)));
      if (vase.insertMode === "roehrchen") properties.push(part(range("tubeDiameter", "prop.vaseTubeDiameter", 0.5)));
    }
    properties.push(part(choice("lidMode", "prop.vaseLid", "vase.lidHint")));
    if (vase.lidMode !== "keiner") {
      properties.push(part(range("lidClearance", "prop.vaseLidClearance", 0.05)), part(range("lidThickness", "prop.vaseLidThickness", 0.1)), part(range("lidDepth", "prop.vaseLidDepth", 0.5)));
      if (vase.lidMode === "schraube") properties.push(part(range("threadPitch", "prop.vaseThreadPitch", 0.1)));
      properties.push(yesNo("lidGrip", "prop.vaseLidGrip"));
    }
    properties.push(part(range("fitClearance", "prop.vaseFitClearance", 0.05, "vase.fitHint")));
    // Printing (ids "vasePrint."): the material weighs it, the line width counts in the slicer's vase mode.
    properties.push({
      type: "select",
      id: "vasePrint.material",
      label: t("prop.vaseMaterial"),
      value: vase.material,
      options: Object.entries(VASE_MATERIALS).map(([value, material]) => ({ value, label: material.label })),
      onChange: (value) => setVase({ material: value }),
    });
    if (vase.body === "voll" && vase.reinforce === "keine") properties.push({ ...range("lineWidth", "prop.vaseLineWidth", 0.01), id: "vasePrint.lineWidth" });
    return properties;
  }

  if (shape.kind === "knurl") {
    const knurl = knurlSettings({ ...shape, width });
    const properties: ShapePropertyConfig[] = [
      {
        type: "select",
        id: "knurlPattern",
        label: t("prop.knurlPattern"),
        value: knurl.pattern,
        options: [{ value: "straight", label: t("knurl.straight") }, { value: "diamond", label: t("knurl.diamond") }, { value: "round", label: t("knurl.round") }],
        hint: t(knurl.pattern === "diamond" ? "knurl.diamondHint" : knurl.pattern === "round" ? "knurl.roundHint" : "knurl.straightHint"),
        onChange: (value) => onUpdate({ knurlPattern: normalizeKnurlPattern(value) }),
      },
      { id: "diameter", label: t("prop.diameter"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setCylinderDiameter },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      { id: "knurlCount", label: t("prop.knurlCount"), value: knurl.count, min: MIN_KNURL_COUNT, max: maxKnurlCount(width), step: 1, onChange: (value) => onUpdate({ knurlCount: normalizeKnurlCount(value, width) }) },
      {
        id: "knurlDepth",
        label: t("prop.knurlDepth"),
        value: knurl.depth,
        min: MIN_KNURL_DEPTH,
        // Round grooves stay below half a pitch, or the ridges would bulge (#201).
        max: knurl.pattern === "round" ? Math.min(maxKnurlDepth(width), maxRoundKnurlDepth(width, knurl.count)) : maxKnurlDepth(width),
        step: 0.05,
        onChange: (value) => onUpdate({ knurlDepth: normalizeKnurlDepth(value, width) }),
      },
      { id: "knurlChamfer", label: t("prop.knurlChamfer"), value: knurl.chamfer, min: 0, max: Math.max(0.05, maxKnurlChamfer(width, shape.height)), step: 0.05, onChange: (value) => onUpdate({ knurlChamfer: normalizeKnurlChamfer(value, width, shape.height) }) },
    ];
    if (knurl.pattern === "diamond") {
      properties.push({ id: "knurlAngle", label: t("prop.knurlAngle"), value: knurl.angle, min: MIN_KNURL_ANGLE, max: MAX_KNURL_ANGLE, step: 1, onChange: (value) => onUpdate({ knurlAngle: normalizeKnurlAngle(value) }) });
    }
    return properties;
  }

  if (shape.kind === "gridfinity") {
    const plan = gridfinityPlan({ ...shape, depth });
    // The size is whole grid units; every change writes the box they make; a tray's is free in mm.
    const apply = (next: Parameters<typeof gridfinityShapePatch>[1]) => {
      const patch = gridfinityShapePatch({ ...shape, depth }, next);
      onUpdate({ ...patch, size: resizedShapeSize(patch.width, patch.depth) });
    };
    const properties: ShapePropertyConfig[] = [
      {
        type: "select",
        id: "gridfinityType",
        label: t("prop.gridfinityType"),
        value: plan.type,
        options: [{ value: "bin", label: t("gridfinity.bin") }, { value: "baseplate", label: t("gridfinity.baseplate") }, { value: "tray", label: t("gridfinity.tray") }],
        hint: t(plan.type === "bin" ? "gridfinity.binHint" : plan.type === "baseplate" ? "gridfinity.baseplateHint" : "gridfinity.trayHint"),
        onChange: (value) => apply({ type: normalizeGridfinityType(value) }),
      },
    ];
    if (plan.type === "bin") {
      properties.push({ type: "toggle", id: "gridfinityHalfGrid", label: t("prop.gridfinityHalfGrid"), value: plan.halfGrid, onChange: (value) => apply({ halfGrid: value }) });
    }
    if (plan.type === "tray") {
      // A tray (#837) has no grid: its size is free in mm, as a box's.
      properties.push(
        { id: "length", label: t("prop.length"), value: plan.size.depth, min: MIN_GRIDFINITY_TRAY_SIZE, max: MAX_GRIDFINITY_TRAY_SIZE, onChange: setDepth },
        { id: "width", label: t("prop.width"), value: plan.size.width, min: MIN_GRIDFINITY_TRAY_SIZE, max: MAX_GRIDFINITY_TRAY_SIZE, onChange: setWidth },
        { id: "height", label: t("prop.height"), value: plan.size.height, min: MIN_GRIDFINITY_TRAY_HEIGHT, max: MAX_GRIDFINITY_TRAY_HEIGHT, onChange: setHeight },
      );
    } else {
      const maxUnits = gridfinityMaxUnits(shape);
      properties.push(
        { id: "gridfinityUnitsX", label: t("prop.gridfinityUnitsX"), value: plan.count.x, min: MIN_GRIDFINITY_UNITS, max: maxUnits, step: 1, hint: plan.halfGrid ? t("gridfinity.halfGridHint") : undefined, onChange: (value) => apply({ x: Math.round(value) }) },
        { id: "gridfinityUnitsZ", label: t("prop.gridfinityUnitsZ"), value: plan.count.z, min: MIN_GRIDFINITY_UNITS, max: maxUnits, step: 1, onChange: (value) => apply({ z: Math.round(value) }) },
      );
    }
    if (plan.type === "baseplate") {
      // The drawer it fills (#455): typing a drawer's inside size works out the units and the paddings of that axis.
      const drawer = gridfinityDrawerSize({ ...shape, depth });
      const fit = (axis: "x" | "z", value: number) => {
        const patch = gridfinityDrawerPatch({ ...shape, depth }, axis, value);
        onUpdate({ ...patch, size: resizedShapeSize(patch.width, patch.depth) });
      };
      properties.push(
        { id: "gridfinityDrawerWidth", label: t("prop.gridfinityDrawerWidth"), value: drawer.width, min: MIN_GRIDFINITY_DRAWER, max: MAX_GRIDFINITY_DRAWER, step: 0.1, hint: t("gridfinity.drawerHint"), onChange: (value) => fit("x", value) },
        { id: "gridfinityDrawerDepth", label: t("prop.gridfinityDrawerDepth"), value: drawer.depth, min: MIN_GRIDFINITY_DRAWER, max: MAX_GRIDFINITY_DRAWER, step: 0.1, onChange: (value) => fit("z", value) },
      );
      // Padding (#455): a solid border on each side, so the plate fills a drawer that is not whole units; the units stay as they are.
      const walls = [
        { wall: "back", label: "prop.gridfinityPaddingBack" },
        { wall: "front", label: "prop.gridfinityPaddingFront" },
        { wall: "left", label: "prop.gridfinityPaddingLeft" },
        { wall: "right", label: "prop.gridfinityPaddingRight" },
      ] as const;
      walls.forEach(({ wall, label }, k) => {
        const key = GRIDFINITY_PADDING_KEYS[wall];
        const update = (value: number) => {
          const patch = gridfinityPaddingPatch({ ...shape, depth }, { [wall]: value });
          onUpdate({ ...patch, size: resizedShapeSize(patch.width, patch.depth) });
        };
        properties.push({ id: key, label: t(label), value: plan.padding[wall], min: 0, max: MAX_GRIDFINITY_PADDING, step: 0.1, hint: k === 0 ? t("gridfinity.paddingHint") : undefined, onChange: update });
      });
      // The outer corners (#856): rounded less, down to square, for a drawer's square corners; the sockets keep theirs.
      properties.push({ id: "gridfinityCornerRadius", label: t("prop.gridfinityCornerRadius"), value: gridfinityCornerRadius({ ...shape, depth }), min: 0, max: GRIDFINITY_BASEPLATE_RADIUS, step: 0.1, hint: t("gridfinity.cornerRadiusHint"), onChange: (value) => onUpdate({ gridfinityCornerRadius: clamp(value, 0, GRIDFINITY_BASEPLATE_RADIUS) }) });
    }
    if (plan.type === "bin") {
      properties.push(
        { id: "gridfinityUnitsY", label: t("prop.gridfinityUnitsY"), value: plan.count.y, min: MIN_GRIDFINITY_UNITS, max: MAX_GRIDFINITY_HEIGHT_UNITS, step: 1, onChange: (value) => apply({ y: Math.round(value) }) },
        { type: "toggle", id: "gridfinityLip", label: t("prop.gridfinityLip"), value: plan.lip, onChange: (value) => apply({ lip: value }) },
        // The edge tool's chamfer on the lip's top, built in (#780).
        ...(plan.lip ? [{ id: "gridfinityLipChamfer", label: t("prop.gridfinityLipChamfer"), value: gridfinityLipChamfer({ ...shape, depth }), min: 0, max: MAX_GRIDFINITY_LIP_CHAMFER, step: 0.05, hint: t("gridfinity.lipChamferHint"), onChange: (value: number) => onUpdate({ gridfinityLipChamfer: clamp(value, 0, MAX_GRIDFINITY_LIP_CHAMFER) }) }] : []),
        { type: "toggle", id: "gridfinityMagnets", label: t("prop.gridfinityMagnets"), value: plan.magnets, onChange: (value) => onUpdate({ gridfinityMagnets: value }) },
      );
      // The outer corners above the feet (#856), down to square; no row where open sides leave every corner square.
      if (gridfinityBinCornerFits({ ...shape, depth })) {
        properties.push({ id: "gridfinityBinCornerRadius", label: t("prop.gridfinityCornerRadius"), value: gridfinityBinCornerRadius({ ...shape, depth }), min: 0, max: GRIDFINITY_BIN_RADIUS, step: 0.1, hint: t("gridfinity.binCornerRadiusHint"), onChange: (value) => onUpdate({ gridfinityBinCornerRadius: clamp(value, 0, GRIDFINITY_BIN_RADIUS) }) });
      }
    }
    const fields = { ...shape, depth };
    if (gridfinityWallFits(fields)) {
      // Wall thickness (#455): from 0.8 mm up to where the walls meet, where the bin is solid.
      const maxWall = gridfinityWallMaxThickness(fields);
      properties.push({ id: "gridfinityWallThickness", label: t("prop.gridfinityWallThickness"), value: gridfinityWallThickness(fields), min: MIN_GRIDFINITY_WALL_THICKNESS, max: maxWall, step: 0.05, hint: t("gridfinity.wallThicknessHint"), onChange: (value) => onUpdate({ gridfinityWallThickness: clamp(value, MIN_GRIDFINITY_WALL_THICKNESS, maxWall) }) });
    }
    if (gridfinityFloorFits(fields) && !gridfinityWallSolid(fields)) {
      // The floor (#455): raised, it leaves a bin blank to cut shapes into; it decides what room the shelves and scoops have.
      const maxFloor = gridfinityFloorMaxHeight(fields);
      const minFloor = gridfinityFloorMinHeight(fields);
      properties.push({ id: "gridfinityFloorHeight", label: t("prop.gridfinityFloorHeight"), value: gridfinityFloorHeight(fields), min: minFloor, max: maxFloor, step: 0.05, hint: t("gridfinity.floorHeightHint"), onChange: (value) => onUpdate({ gridfinityFloorHeight: clamp(value, minFloor, maxFloor) }) });
    }
    const { switched } = plan;
    if (gridfinityOpenFits(fields)) {
      // Open sides (#682): a switch for each side, drawn as a cross seen from above; a side switched open has no shelf or scoop (#455).
      // In the order they are seen, the back on top and the front at the bottom, so Tab goes through them in that order.
      const walls = [
        { wall: "back", label: "prop.gridfinityOpenBack" },
        { wall: "left", label: "prop.gridfinityOpenLeft" },
        { wall: "right", label: "prop.gridfinityOpenRight" },
        { wall: "front", label: "prop.gridfinityOpenFront" },
      ] as const;
      walls.forEach(({ wall, label }) => {
        const key = GRIDFINITY_OPEN_WALL_KEYS[wall];
        properties.push({ type: "toggle", id: key, label: t(label), value: shape[key] === true, layout: "sides", area: wall, onChange: (value) => onUpdate({ [key]: value }) });
      });
      // How far each side switched open is opened (#455): its depth from the lip's top, its width, and where along the side it sits.
      // The rows of each side keep the panel's order, as the padding, shelf and scoop rows do.
      (["back", "front", "left", "right"] as const).filter((wall) => gridfinityOpeningFits(fields, wall)).forEach((wall, k) => {
        const keys = GRIDFINITY_OPENING_KEYS[wall];
        const opening = gridfinityOpening(fields, wall);
        const limits = gridfinityOpeningLimits(fields, wall);
        const update = (changes: Parameters<typeof gridfinityOpeningPatch>[2]) => onUpdate(gridfinityOpeningPatch(fields, wall, changes));
        const places = GRIDFINITY_LABEL_ALIGN_OPTIONS[wall === "back" || wall === "front" ? "across" : "deep"];
        properties.push(
          { id: keys.depth, label: t(keys.depthLabel), value: opening.depth, min: limits.depth.min, max: limits.depth.max, step: 0.5, hint: k === 0 ? t("gridfinity.openingHint") : undefined, onChange: (value) => update({ depth: clamp(value, limits.depth.min, limits.depth.max) }) },
          { id: keys.width, label: t(keys.widthLabel), value: opening.width, min: limits.width.min, max: limits.width.max, step: 0.5, onChange: (value) => update({ width: clamp(value, limits.width.min, limits.width.max) }) },
          { type: "select", id: keys.position, label: t(keys.positionLabel), value: opening.align, options: places.map((option) => ({ value: option.value, label: t(option.label) })), onChange: (value) => update({ align: places.find((option) => option.value === value)?.value ?? "middle" }) },
        );
        if (opening.align !== "middle" && limits.distance > 0) {
          properties.push({ id: keys.distance, label: t(keys.distanceLabel), value: opening.distance, min: 0, max: limits.distance, step: 0.5, onChange: (value) => update({ distance: clamp(value, 0, limits.distance) }) });
        }
      });
      // The notches' corners seen from outside the wall, one setting for every side opened partly, as the shelves share theirs.
      if (plan.notches.length > 0) {
        properties.push(
          {
            type: "select",
            id: "gridfinityOpeningCorner",
            label: t("prop.gridfinityOpeningCorner"),
            value: shape.gridfinityOpeningCorner ?? DEFAULT_GRIDFINITY_LABEL_CORNER,
            options: [{ value: "round", label: t("gridfinity.labelRound") }, { value: "chamfer", label: t("gridfinity.labelChamfer") }],
            onChange: (value) => onUpdate({ gridfinityOpeningCorner: value === "chamfer" ? "chamfer" : "round" }),
          },
          { id: "gridfinityOpeningCornerSize", label: t("prop.gridfinityOpeningCornerSize"), value: gridfinityOpeningCornerSize(fields), min: 0, max: gridfinityOpeningMaxCornerSize(fields), step: 0.5, hint: t("gridfinity.openingCornerHint"), onChange: (value) => onUpdate({ gridfinityOpeningCornerSize: value }) },
        );
      }
    }
    const compartments = gridfinityCompartments(fields);
    if (gridfinityLabelFits(fields)) {
      // Label shelves (#455): each wall's switch with its own width, length and position under it, then the corners they share.
      // A bin with dividers has a label in each compartment instead (#554), set in the compartments card; the corners stay here.
      const walls = [
        { wall: "back", label: "prop.gridfinityLabelBack" },
        { wall: "front", label: "prop.gridfinityLabelFront" },
        { wall: "left", label: "prop.gridfinityLabelLeft" },
        { wall: "right", label: "prop.gridfinityLabelRight" },
      ] as const;
      walls.forEach(({ wall, label }) => {
        if (compartments || switched[wall]) return;
        const keys = GRIDFINITY_LABEL_WALL_KEYS[wall];
        const { on } = keys;
        properties.push({ type: "toggle", id: on, label: t(label), value: shape[on] === true, onChange: (value) => onUpdate({ [on]: value }) });
        if (shape[on] !== true) return;
        const maxWidth = gridfinityLabelMaxWidth(fields, wall);
        const limits = gridfinityLabelLimits(fields, wall);
        // What the geometry builds: 0 for wall to wall, else at least the shortest shelf. A typed length is kept within the wall,
        // a typed width within the bin across it.
        const length = gridfinityLabelLength(fields, wall);
        properties.push(
          { id: keys.width, label: t("prop.gridfinityLabelWidth"), value: gridfinityLabelWidth(fields, wall), min: MIN_GRIDFINITY_LABEL_WIDTH, max: Math.max(MIN_GRIDFINITY_LABEL_WIDTH, maxWidth), step: 0.5, onChange: (value) => onUpdate({ [keys.width]: clamp(value, MIN_GRIDFINITY_LABEL_WIDTH, limits.across) }) },
          { id: keys.length, label: t("prop.gridfinityLabelLength"), value: Math.min(length, limits.length), min: 0, max: limits.length, step: 1, hint: t("gridfinity.labelLengthHint"), onChange: (value) => onUpdate({ [keys.length]: clamp(value, 0, limits.length) }) },
        );
        if (limits.offset > 0) {
          properties.push({ id: keys.offset, label: t("prop.gridfinityLabelOffset"), value: clamp(shape[keys.offset] ?? 0, -limits.offset, limits.offset), min: -limits.offset, max: limits.offset, step: 1, onChange: (value) => onUpdate({ [keys.offset]: value }) });
        }
      });
      const shelves = compartments
        ? compartments.cells.some((cell) => gridfinityCompartmentLabel(fields, cell.column, cell.row))
        : walls.some(({ wall }) => shape[GRIDFINITY_LABEL_WALL_KEYS[wall].on] === true && !switched[wall]);
      if (shelves) {
        properties.push(
          {
            type: "select",
            id: "gridfinityLabelCorner",
            label: t("prop.gridfinityLabelCorner"),
            value: shape.gridfinityLabelCorner ?? DEFAULT_GRIDFINITY_LABEL_CORNER,
            options: [{ value: "round", label: t("gridfinity.labelRound") }, { value: "chamfer", label: t("gridfinity.labelChamfer") }],
            onChange: (value) => onUpdate({ gridfinityLabelCorner: value === "chamfer" ? "chamfer" : "round" }),
          },
          { id: "gridfinityLabelCornerSize", label: t("prop.gridfinityLabelCornerSize"), value: gridfinityLabelCornerSize(fields), min: 0, max: gridfinityLabelMaxCornerSize(plan), step: 0.5, onChange: (value) => onUpdate({ gridfinityLabelCornerSize: value }) },
        );
      }
    }
    if (gridfinityScoopFits(fields)) {
      // Finger scoops (#455): a switch for each wall, then the radius they share.
      const walls = [
        { wall: "back", label: "prop.gridfinityScoopBack" },
        { wall: "front", label: "prop.gridfinityScoopFront" },
        { wall: "left", label: "prop.gridfinityScoopLeft" },
        { wall: "right", label: "prop.gridfinityScoopRight" },
      ] as const;
      walls.forEach(({ wall, label }) => {
        if (switched[wall]) return;
        const key = GRIDFINITY_SCOOP_WALL_KEYS[wall];
        properties.push({ type: "toggle", id: key, label: t(label), value: shape[key] === true, onChange: (value) => onUpdate({ [key]: value }) });
      });
      if (walls.some(({ wall }) => shape[GRIDFINITY_SCOOP_WALL_KEYS[wall]] === true && !switched[wall])) {
        const max = Math.max(MIN_GRIDFINITY_SCOOP_RADIUS, gridfinityScoopMaxRadius(fields));
        properties.push({ id: "gridfinityScoopRadius", label: t("prop.gridfinityScoopRadius"), value: gridfinityScoopRadius(fields), min: MIN_GRIDFINITY_SCOOP_RADIUS, max, step: 0.5, hint: gridfinityScoopsLeftOut(fields) ? t("gridfinity.scoopsLeftOutHint") : undefined, onChange: (value) => onUpdate({ gridfinityScoopRadius: clamp(value, MIN_GRIDFINITY_SCOOP_RADIUS, max) }) });
      }
    }
    return properties;
  }

  if (shape.kind === "hinge") {
    const plan = hingePlan({ ...shape, depth });
    return [
      { id: "width", label: t("prop.hingeLength"), value: width, min: MIN_SHAPE_SIZE, max: 300, onChange: setWidth },
      { id: "length", label: t("prop.hingeOpenWidth"), value: depth, min: minimumHingeDepth(shape.height, plan.leaf, plan.clearance), max: 300, onChange: setDepth },
      { id: "height", label: t("prop.hingeKnuckleDiameter"), value: shape.height, min: 2, max: 60, onChange: setHeight },
      {
        type: "select",
        id: "hingeStyle",
        label: t("prop.hingeStyle"),
        value: plan.style,
        options: [{ value: "pin", label: t("hinge.stylePin") }, { value: "pinless", label: t("prop.hingePinless") }, { value: "cone", label: t("hinge.styleCone") }],
        hint: plan.style === "cone" ? t("hinge.styleConeHint") : undefined,
        // The old "without pin" switch is part of this choice now (#907).
        onChange: (value) => onUpdate({ hingeStyle: value === "cone" || value === "pinless" ? value : undefined, hingePinless: undefined }),
      },
      ...(plan.style === "cone" ? [{
        id: "hingeConeSize",
        label: t("prop.hingeConeSize"),
        value: plan.coneRadius * 2,
        min: 0.6,
        max: Math.max(0.6, hingeLargestConeSize(plan.knuckleLength, shape.height, plan.clearance)),
        step: 0.1,
        hint: t("prop.hingeConeSizeHint"),
        onChange: (value: number) => onUpdate({ hingeConeSize: value }),
      }] : []),
      {
        id: "hingeKnuckles",
        label: t("prop.hingeKnuckles"),
        value: plan.knuckles,
        min: MIN_HINGE_KNUCKLES,
        max: MAX_HINGE_KNUCKLES,
        step: 2,
        // Typing a count takes the width away: the two ways of saying how many do not mix (#907).
        onChange: (value) => onUpdate({ hingeKnuckles: normalizeHingeKnuckles(value, width, plan.clearance), hingeKnuckleWidth: undefined }),
      },
      {
        id: "hingeKnuckleWidth",
        label: t("prop.hingeKnuckleWidth"),
        value: shape.hingeKnuckleWidth ?? 0,
        min: 0,
        max: 100,
        step: 0.5,
        hint: t("prop.hingeKnuckleWidthHint"),
        onChange: (value) => onUpdate({ hingeKnuckleWidth: normalizeHingeKnuckleWidth(value) }),
      },
      // The cone hinge has no pin: its cones take the pin's place.
      ...(plan.style === "cone" ? [] : [{
        id: "hingePinDiameter",
        label: t("prop.hingePinDiameter"),
        value: plan.pinRadius * 2,
        min: 0.2,
        max: Math.max(0.4, shape.height - 2 * (plan.clearance + 0.4)),
        step: 0.1,
        onChange: (value: number) => {
          const pin = normalizeHingePinDiameter(value, shape.height, plan.clearance);
          onUpdate({ hingePinDiameter: pin, hingeLeafThickness: normalizeHingeLeafThickness(plan.leaf, shape.height, pin, plan.clearance, plan.style) });
        },
      }]),
      {
        id: "hingeLeafThickness",
        label: t("prop.hingeLeafThickness"),
        value: plan.leaf,
        min: 0.4,
        max: plan.style === "cone" ? shape.height : Math.max(0.5, plan.radius - plan.boreRadius),
        step: 0.1,
        onChange: (value) => onUpdate({ hingeLeafThickness: normalizeHingeLeafThickness(value, shape.height, plan.pinRadius * 2, plan.clearance, plan.style) }),
      },
      {
        type: "select",
        id: "hingeLeafStyle",
        label: t("prop.hingeLeafStyle"),
        value: plan.fingers ? "fingers" : "plate",
        options: [{ value: "plate", label: t("hinge.leafPlate") }, { value: "fingers", label: t("hinge.leafFingers") }],
        hint: plan.fingers ? t("hinge.leafFingersHint") : undefined,
        onChange: (value) => onUpdate({ hingeLeafStyle: value === "fingers" ? "fingers" : undefined }),
      },
      {
        id: "hingeCornerRadius",
        label: t("prop.hingeCornerRadius"),
        value: plan.cornerRadius,
        min: 0,
        max: Math.max(0.5, hingeLargestCornerRadius(plan.fingers ? plan.knuckleLength : width, depth, plan.leafStart)),
        step: 0.5,
        onChange: (value) => onUpdate({ hingeCornerRadius: value > 0 ? value : undefined }),
      },
      // Fingers are too narrow for a row of screws: they are joined to the model instead.
      ...(plan.fingers ? [] : [{
        id: "hingeScrewHoles",
        label: t("prop.hingeScrewHoles"),
        value: normalizeHingeScrewHoles(shape.hingeScrewHoles),
        min: 0,
        max: MAX_HINGE_SCREW_HOLES,
        step: 1,
        // Asked for and fitting are two things: say so when the leaf takes fewer.
        hint: normalizeHingeScrewHoles(shape.hingeScrewHoles) > plan.screwXs.length ? t("prop.hingeScrewHolesFewer", { count: plan.screwXs.length }) : t("prop.hingeScrewHolesHint"),
        onChange: (value: number) => onUpdate({ hingeScrewHoles: normalizeHingeScrewHoles(value) || undefined }),
      }]),
      ...(!plan.fingers && normalizeHingeScrewHoles(shape.hingeScrewHoles) > 0 ? [
        {
          id: "hingeScrewDiameter",
          label: t("prop.hingeScrewDiameter"),
          value: plan.screwRadius * 2,
          min: MIN_HINGE_SCREW_DIAMETER,
          max: MAX_HINGE_SCREW_DIAMETER,
          step: 0.1,
          onChange: (value: number) => onUpdate({ hingeScrewDiameter: normalizeHingeScrewDiameter(value) }),
        },
        {
          type: "select" as const,
          id: "hingeScrewCountersink",
          label: t("prop.hingeScrewHead"),
          value: shape.hingeScrewCountersink === false ? "straight" : "countersunk",
          options: [{ value: "countersunk", label: t("hinge.screwCountersunk") }, { value: "straight", label: t("hinge.screwStraight") }],
          hint: shape.hingeScrewCountersink === false ? undefined : t("hinge.screwCountersunkHint"),
          onChange: (value: string) => onUpdate({ hingeScrewCountersink: value === "straight" ? false : undefined }),
        },
        {
          id: "hingeScrewSpacing",
          label: t("prop.hingeScrewSpacing"),
          value: shape.hingeScrewSpacing ?? 0,
          min: 0,
          max: Math.max(1, width),
          step: 0.5,
          hint: t("prop.hingeScrewSpacingHint"),
          onChange: (value: number) => onUpdate({ hingeScrewSpacing: value > 0 ? value : undefined }),
        },
        {
          id: "hingeScrewAcross",
          label: t("prop.hingeScrewAcross"),
          value: shape.hingeScrewAcross ?? 0,
          min: 0,
          max: Math.max(1, depth),
          step: 0.5,
          hint: t("prop.hingeScrewAcrossHint"),
          onChange: (value: number) => onUpdate({ hingeScrewAcross: value > 0 ? value : undefined }),
        },
      ] : []),
      { id: "hingeAngle", label: t("prop.hingeAngle"), value: plan.angle, min: 0, max: MAX_HINGE_ANGLE, step: 1, onChange: (value) => onUpdate({ hingeAngle: normalizeHingeAngle(value) }) },
      {
        id: "hingeClearance",
        label: t("prop.hingeClearance"),
        value: plan.clearance,
        min: MIN_HINGE_CLEARANCE,
        max: MAX_HINGE_CLEARANCE,
        step: 0.05,
        onChange: (value) => {
          const clearance = normalizeHingeClearance(value);
          const pin = normalizeHingePinDiameter(plan.pinRadius * 2, shape.height, clearance);
          onUpdate({ hingeClearance: clearance, hingePinDiameter: pin, hingeLeafThickness: normalizeHingeLeafThickness(plan.leaf, shape.height, pin, clearance, plan.style) });
        },
      },
      ...roundSideProperties(shape, shape.height, shape.height, onUpdate),
    ];
  }

  if (shape.kind === "loft") {
    // Every value as the body shows it; a change keeps the bottom where it stands (#188).
    const m = loftMeasures(shape);
    const change = (next: Partial<LoftMeasures>) => onUpdate(loftShapePatch(shape, next));
    const outlines = [
      { value: "round", label: t("loft.round") },
      { value: "rectangle", label: t("loft.rectangle") },
      { value: "polygon", label: t("loft.polygon") },
    ];
    const end = (bottom: boolean): ShapePropertyConfig[] => {
      const outline = bottom ? m.bottomOutline : m.topOutline;
      const endWidth = bottom ? m.bottomWidth : m.topWidth;
      const endDepth = bottom ? m.bottomDepth : m.topDepth;
      const name = bottom ? "Bottom" : "Top";
      const properties: ShapePropertyConfig[] = [
        {
          type: "select",
          id: `loft${name}Outline`,
          label: t(bottom ? "prop.loftBottomOutline" : "prop.loftTopOutline"),
          value: outline,
          options: outlines,
          onChange: (value) => change(bottom ? { bottomOutline: normalizeLoftOutline(value) } : { topOutline: normalizeLoftOutline(value) }),
        },
        { id: `loft${name}Width`, label: t(bottom ? "prop.loftBottomWidth" : "prop.loftTopWidth"), value: endWidth, min: MIN_LOFT_SIZE, max: 300, onChange: (value) => change(bottom ? { bottomWidth: value } : { topWidth: value }) },
        { id: `loft${name}Depth`, label: t(bottom ? "prop.loftBottomDepth" : "prop.loftTopDepth"), value: endDepth, min: MIN_LOFT_SIZE, max: 300, onChange: (value) => change(bottom ? { bottomDepth: value } : { topDepth: value }) },
      ];
      if (outline === "rectangle") {
        properties.push({
          id: `loft${name}Corner`,
          label: t(bottom ? "prop.loftBottomCorner" : "prop.loftTopCorner"),
          value: bottom ? m.bottomCorner : m.topCorner,
          min: 0,
          max: Math.max(0.1, Math.min(endWidth, endDepth) / 2),
          step: 0.1,
          onChange: (value) => change(bottom ? { bottomCorner: value } : { topCorner: value }),
        });
      }
      if (outline === "polygon") {
        properties.push({
          id: `loft${name}Sides`,
          label: t(bottom ? "prop.loftBottomSides" : "prop.loftTopSides"),
          value: bottom ? m.bottomSides : m.topSides,
          min: MIN_LOFT_SIDES,
          max: MAX_LOFT_SIDES,
          step: 1,
          onChange: (value) => change(bottom ? { bottomSides: value } : { topSides: value }),
        });
      }
      return properties;
    };
    return [
      ...end(true),
      ...end(false),
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 300, onChange: setHeight },
      { id: "loftOffsetX", label: t("prop.loftOffsetX"), value: m.offsetX, min: -150, max: 150, step: 0.5, onChange: (value) => change({ offsetX: value }) },
      { id: "loftOffsetZ", label: t("prop.loftOffsetZ"), value: m.offsetZ, min: -150, max: 150, step: 0.5, onChange: (value) => change({ offsetZ: value }) },
      { id: "loftWall", label: t("prop.loftWall"), value: m.wall, min: 0, max: Math.max(0.1, maxLoftWall(m)), step: 0.1, onChange: (value) => change({ wall: value }) },
      // The sections turn and tilt evenly on the way up (#205); a tilt keeps the top above the plate.
      { id: "loftTwist", label: t("prop.loftTwist"), value: m.twist, min: -MAX_LOFT_TWIST, max: MAX_LOFT_TWIST, step: 5, onChange: (value) => change({ twist: value }) },
      // The S-curve between the two ends (#271): a hose adapter that flares smoothly, shown as a percentage.
      { id: "loftSmooth", label: t("prop.loftSmooth"), value: Math.round(m.smooth * 100), min: 0, max: 100, step: 5, hint: t("loft.smoothHint"), onChange: (value) => change({ smooth: Math.min(100, Math.max(0, value)) / 100 }) },
      // How finely a circle or a rounded corner is drawn in the view and in the exports (#755); a polygon has its own sides.
      ...(m.bottomOutline === "round" || m.topOutline === "round" || m.bottomCorner > 0 || m.topCorner > 0
        ? [{ id: "loftSegments", label: t("prop.loftSegments"), value: m.segments, min: MIN_LOFT_SEGMENTS, max: MAX_LOFT_SEGMENTS, step: 1, hint: t("loft.segmentsHint"), onChange: (value: number) => change({ segments: value }) }]
        : []),
      { id: "loftTiltX", label: t("prop.loftTiltX"), value: m.tiltX, min: -loftTiltLimit(shape, "x"), max: loftTiltLimit(shape, "x"), step: 1, onChange: (value) => change({ tiltX: value }) },
      { id: "loftTiltZ", label: t("prop.loftTiltZ"), value: m.tiltZ, min: -loftTiltLimit(shape, "z"), max: loftTiltLimit(shape, "z"), step: 1, onChange: (value) => change({ tiltZ: value }) },
    ];
  }

  if (shape.kind === "dovetail") {
    const neck = normalizeDovetailNeckWidth(shape.dovetailNeckWidth, width);
    return [
      { id: "width", label: t("prop.dovetailWideEnd"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      {
        id: "dovetailNeckWidth",
        label: t("prop.dovetailNeckWidth"),
        value: neck,
        min: 0.1,
        max: Math.max(0.2, width * 0.95),
        step: 0.1,
        onChange: (value) => onUpdate({ dovetailNeckWidth: normalizeDovetailNeckWidth(value, width) }),
      },
      { id: "length", label: t("prop.dovetailLength"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      {
        id: "dovetailClearance",
        label: t("prop.dovetailClearance"),
        value: normalizeDovetailClearance(shape.dovetailClearance),
        min: 0,
        max: MAX_DOVETAIL_CLEARANCE,
        step: 0.05,
        onChange: (value) => onUpdate({ dovetailClearance: normalizeDovetailClearance(value) }),
      },
    ];
  }

  if (shape.kind === "slot") {
    // A smaller second end (#206): typed as its diameter, kept as a share of the large one, so
    // the handles scale both ends together. The centre distance sets the long side.
    const alongX = width >= depth;
    const large = alongX ? depth : width;
    const long = alongX ? width : depth;
    const tapered = taperedSlotOutline(width, depth, shape.slotEndRatio);
    const small = tapered ? tapered.r * 2 : large;
    const centreDistance = long - large / 2 - small / 2;
    const setLong = (value: number) => (alongX ? setWidth(value) : setDepth(value));
    return [
      ...roundSideProperties(shape, Math.min(width, depth), Math.min(width, depth), onUpdate),
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      {
        id: "slotSmallEnd",
        label: t("prop.slotSmallEnd"),
        value: small,
        min: Math.max(0.1, large * MIN_SLOT_END_RATIO),
        max: large,
        step: 0.1,
        onChange: (value) => {
          // The large end and the centre distance stay; the long side follows the small end.
          const ratio = normalizeSlotEndRatio(value / Math.max(0.01, large));
          const nextLong = Math.max(large, centreDistance + large / 2 + (large * ratio) / 2);
          onUpdate(alongX
            ? { slotEndRatio: ratio, width: nextLong, size: resizedShapeSize(nextLong, depth) }
            : { slotEndRatio: ratio, depth: nextLong, size: resizedShapeSize(width, nextLong) });
        },
      },
      {
        id: "slotCentreDistance",
        label: t("prop.slotCentreDistance"),
        value: Math.max(0, centreDistance),
        min: Math.max(0, large / 2 - small / 2 + 0.01),
        max: 160,
        step: 0.1,
        onChange: (value) => setLong(value + large / 2 + small / 2),
      },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "ellipse") {
    return [
      ...roundSideProperties(shape, width, depth, onUpdate),
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "ruler") {
    // Nur die Laenge ist einstellbar - Kreuzbreite und Dicke des Lineals stehen fest.
    return [
      { id: "width", label: t("prop.length"), value: width, min: 30, max: RULER_MAX_LENGTH, onChange: setWidth },
    ];
  }

  if (shape.kind === "sphere") {
    return [
      { id: "steps", label: t("prop.steps"), value: shape.steps ?? 24, min: 6, max: MAX_HIGH_RESOLUTION_STEPS, step: 1, onChange: (steps) => onUpdate({ steps: Math.round(steps) }) },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "torus") {
    return [
      ...torusSideProperties(shape, width, depth, onUpdate),
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      {
        // Typed in mm, kept as a share of the outer size, so the handles scale the tube along (#981).
        id: "torusTube",
        label: t("prop.torusTube"),
        value: torusTubeThickness(width, depth, torusTubeRatio(shape)),
        min: 0.1,
        max: Math.min(width, depth) * TORUS_MAX_TUBE_RATIO,
        step: 0.1,
        onChange: (value) => onUpdate({
          torusTubeRatio: Math.min(TORUS_MAX_TUBE_RATIO, Math.max(TORUS_MIN_TUBE_RATIO, value / Math.max(0.01, Math.min(width, depth)))),
        }),
      },
    ];
  }

  if (shape.kind === "halfSphere" || shape.kind === "paraboloid") {
    return [
      { id: "steps", label: t("prop.steps"), value: shape.steps ?? 32, min: 6, max: MAX_HIGH_RESOLUTION_STEPS, step: 1, onChange: (steps) => onUpdate({ steps: Math.round(steps) }) },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "cone") {
    return [
      { id: "topRadius", label: t("prop.topRadius"), value: shape.topRadius ?? 0, min: 0, max: 40, onChange: (topRadius) => onUpdate({ topRadius }) },
      { id: "baseRadius", label: t("prop.baseRadius"), value: shape.baseRadius ?? baseWidth / 2, min: MIN_SHAPE_SIZE, max: 80, onChange: setBaseRadius },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setConeWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      ...roundSideProperties(shape, width, depth, onUpdate),
    ];
  }

  if (shape.kind === "polygon") {
    return [
      {
        id: "sides",
        label: t("prop.sides"),
        value: shape.sides ?? 6,
        min: 3,
        max: 24,
        step: 1,
        onChange: (value) => {
          // Ein Fuenfkant hat ein anderes Verhaeltnis von Breite zu Tiefe als
          // ein Sechskant. Zieht man es nicht mit, wird aus dem gleichseitigen
          // Vieleck beim Umschalten ein gestauchtes.
          const nextSides = Math.round(value);
          const current = regularPolygonAspect(shape.sides ?? 6);
          const next = regularPolygonAspect(nextSides);
          const nextWidth = Math.max(MIN_SHAPE_SIZE, (width / current.width) * next.width);
          const nextDepth = Math.max(MIN_SHAPE_SIZE, (depth / current.depth) * next.depth);
          onUpdate({ sides: nextSides, width: nextWidth, depth: nextDepth, size: resizedShapeSize(nextWidth, nextDepth) });
        },
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "pyramid") {
    // Null oben heisst Spitze. Alles darueber schneidet sie ab - das ist
    // dasselbe, was die Verjuengung bei den uebrigen Koerpern tut, nur kann
    // sie es hier nicht: die Spitze liegt auf der Achse, und ein Vielfaches
    // von null bleibt null.
    return [
      { id: "sides", label: t("prop.sides"), value: shape.sides ?? 4, min: 3, max: 24, step: 1, onChange: (sides) => onUpdate({ sides: Math.round(sides) }) },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      {
        id: "topLength",
        label: t("prop.topLength"),
        value: normalizePyramidTop(shape.topDepth, depth),
        min: 0,
        max: 160,
        onChange: (topDepth) => onUpdate({ topDepth: normalizePyramidTop(topDepth, depth) }),
      },
      {
        id: "topWidth",
        label: t("prop.topWidth"),
        value: normalizePyramidTop(shape.topWidth, width),
        min: 0,
        max: 160,
        onChange: (topWidth) => onUpdate({ topWidth: normalizePyramidTop(topWidth, width) }),
      },
    ];
  }

  if (shape.kind === "roundRoof") {
    return [
      { id: "sides", label: t("prop.sides"), value: shape.sides ?? 64, min: 4, max: MAX_HIGH_RESOLUTION_SIDES, step: 1, onChange: (sides) => onUpdate({ sides: Math.round(sides) }) },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    ];
  }

  if (shape.kind === "tube" || shape.kind === "ring") {
    // The bore as a size of its own (#384), for a bushing on a shaft of a known size. It is the wall
    // seen from the other side: width minus twice the wall, so typing it sets the wall from the width.
    const wall = shape.bevel ?? 4;
    const wallLimit = Math.max(0.5, Math.min(width, depth) / 2 - 0.1);
    if (Math.abs(width - depth) < 0.01) {
      // A round tube has one outer diameter, and outer, inner and wall follow one another whatever is typed
      // first (see tubeDiameters.ts); the two sides Length and Width only come back for an oval one.
      const inner = tubeInnerDiameter(width, wall);
      return [
        ...roundSideProperties(shape, width, depth, onUpdate),
        {
          id: "outerDiameter",
          label: t("prop.outerDiameter"),
          value: width,
          min: MIN_SHAPE_SIZE,
          max: 160,
          onChange: (outer) => {
            const next = tubeAfterOuter(outer, inner);
            onUpdate({ ...widthPatch(next.outer), depth: next.outer, size: resizedShapeSize(next.outer, next.outer), bevel: next.wall }, { resizeAxis: "width" });
          },
        },
        {
          id: "innerDiameter",
          label: t("prop.innerDiameter"),
          value: inner,
          min: 0.2,
          max: Math.max(0.2, width - 1),
          onChange: (typed) => {
            const next = tubeAfterInner(typed, width, wall);
            onUpdate({ ...widthPatch(next.outer), depth: next.outer, size: resizedShapeSize(next.outer, next.outer), bevel: next.wall }, { resizeAxis: "width" });
          },
        },
        { id: "thickness", label: t("prop.thickness"), value: wall, min: 0.5, max: 20, onChange: (bevel) => onUpdate({ bevel: clamp(bevel, 0.5, wallLimit) }) },
        { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
        { type: "toggle" as const, id: "tubeBoreHole", label: t("prop.tubeBoreHole"), value: shape.tubeBoreHole === true, onChange: (value: boolean) => onUpdate({ tubeBoreHole: value || undefined }) },
      ];
    }
    return [
      ...roundSideProperties(shape, width, depth, onUpdate),
      { id: "thickness", label: t("prop.thickness"), value: wall, min: 0.5, max: 20, onChange: (bevel) => onUpdate({ bevel }) },
      {
        id: "innerDiameter",
        label: t("prop.innerDiameter"),
        value: Math.max(0.2, width - 2 * Math.min(wall, wallLimit)),
        min: 0.2,
        max: Math.max(0.2, width - 1),
        onChange: (inner) => onUpdate({ bevel: clamp((width - inner) / 2, 0.5, wallLimit) }),
      },
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
      { type: "toggle" as const, id: "tubeBoreHole", label: t("prop.tubeBoreHole"), value: shape.tubeBoreHole === true, onChange: (value: boolean) => onUpdate({ tubeBoreHole: value || undefined }) },
    ];
  }

  if (shape.kind === "spring") {
    const across = Math.max(width, depth);
    const settings = springSettings(shape, across, shape.height);
    const wireLimits = springWireLimits(across, shape.height);
    const turnLimits = springTurnLimits(across, shape.height, settings.wire);
    /*
     * Draht und Windungen haengen an den Massen: eine flachere Feder traegt
     * weniger Windungen, eine duennere weniger Draht. Wer an den Massen zieht,
     * bekommt sie deshalb gleich mit in die neuen Grenzen gerueckt, statt
     * einen Koerper zu sehen, der sich selbst durchdringt.
     */
    const fit = (nextWidth: number, nextDepth: number, nextHeight: number) => {
      const reach = Math.max(nextWidth, nextDepth);
      const wire = normalizeSpringWire(settings.wire, reach, nextHeight);
      return { springWire: wire, springTurns: normalizeSpringTurns(settings.turns, reach, nextHeight, wire) };
    };
    return [
      {
        id: "turns",
        label: t("prop.turns"),
        value: settings.turns,
        min: turnLimits.min,
        max: turnLimits.max,
        step: 1,
        onChange: (turns) => onUpdate({ springTurns: normalizeSpringTurns(turns, across, shape.height, settings.wire) }),
      },
      {
        id: "wire",
        label: t("prop.wire"),
        value: settings.wire,
        min: wireLimits.min,
        max: wireLimits.max,
        step: 0.1,
        onChange: (value) => {
          const wire = normalizeSpringWire(value, across, shape.height);
          onUpdate({ springWire: wire, springTurns: normalizeSpringTurns(settings.turns, across, shape.height, wire) });
        },
      },
      {
        type: "select",
        id: "springHand",
        label: t("prop.springHand"),
        value: settings.hand,
        options: [{ value: "right", label: t("spring.right") }, { value: "left", label: t("spring.left") }],
        onChange: (hand) => onUpdate({ springHand: normalizeSpringHand(hand) }),
      },
      {
        id: "quality",
        label: t("prop.quality"),
        value: settings.quality,
        min: MIN_SPRING_QUALITY,
        max: MAX_SPRING_QUALITY,
        step: 4,
        onChange: (quality) => onUpdate({ springQuality: normalizeSpringQuality(quality) }),
      },
      {
        id: "length",
        label: t("prop.length"),
        value: depth,
        min: MIN_SHAPE_SIZE,
        max: 160,
        onChange: (value) => onUpdate({ depth: value, size: resizedShapeSize(width, value), ...fit(width, value, shape.height) }, { resizeAxis: "depth" }),
      },
      {
        id: "width",
        label: t("prop.width"),
        value: width,
        min: MIN_SHAPE_SIZE,
        max: 160,
        onChange: (value) => onUpdate({ width: value, size: resizedShapeSize(value, depth), ...fit(value, depth, shape.height) }, { resizeAxis: "width" }),
      },
      {
        id: "height",
        label: t("prop.height"),
        value: shape.height,
        min: MIN_SHAPE_SIZE,
        max: 160,
        onChange: (value) => onUpdate({ height: value, ...fit(width, depth, value) }, { resizeAxis: "height" }),
      },
    ];
  }

  if (shape.kind === "thread") {
    const settings = threadSettings(shape);
    const standard = threadSizeFor(settings.diameter, settings.pitch);
    const standardSeries = standard ? threadSeriesFor(standard) : null;
    const pitchLimits = threadPitchLimits(settings.diameter);
    const headLimits = threadHeadHeightLimits(settings);
    const chamferLimits = threadChamferLimits(settings);
    const headChamferLimits = threadHeadChamferLimits(settings);
    // Zollgewinde werden in Gaengen je Zoll gedacht, nicht in Millimetern.
    const inchPitch = threadUsesInchPitch(settings.diameter);
    const sizeOptions = [
      ...THREAD_SIZE_GROUPS.flatMap((group) => group.sizes.map((size) => ({
        value: size.id,
        label: size.id,
        group: t(THREAD_SERIES_TEXT[group.series].group),
      }))),
      { value: "custom", label: t("thread.customSize") },
    ];
    // Die Hoehe des Koerpers bleibt Kopf plus Gewinde; abgefragt wird aber das
    // Gewinde, weil ein Mass, das den Kopf mitzaehlt, niemandem etwas sagt.
    const threadLength = Math.max(MIN_SHAPE_SIZE, shape.height - settings.headHeight);
    const headFollowsStandard = Math.abs(settings.headHeight - defaultThreadHeadHeight(settings)) < 1e-6;
    /**
     * Breite und Tiefe stehen nicht mehr zur Wahl - sie folgen dem Durchmesser
     * und der Rolle. Wer am Durchmesser dreht, bekommt einen runden Koerper in
     * der richtigen Groesse, und der Kopf waechst mit, solange er auf seinem
     * Normmass steht.
     */
    const applyThread = (patch: Partial<ThreadSettings>, nextLength?: number, resetHeight = false) => {
      const next: ThreadSettings = { ...settings, ...patch };
      next.diameter = normalizeThreadDiameter(next.diameter);
      next.pitch = normalizeThreadPitch(next.pitch, next.diameter);
      next.clearance = normalizeThreadClearance(next.clearance);
      next.boltClearance = normalizeThreadBoltClearance(next.boltClearance);
      next.axialClearance = normalizeThreadAxialClearance(next.axialClearance, next.pitch);
      // The own profile keeps its proportions when the pitch changes: the depth goes with it, unless it is set in the same step.
      if (patch.pitch !== undefined && patch.depth === undefined && settings.profile === "custom") next.depth = settings.depth * (next.pitch / settings.pitch);
      next.flankAngle = normalizeThreadFlankAngle(next.flankAngle);
      next.depth = normalizeThreadDepth(next.depth, next.pitch, next.diameter, next.flankAngle);
      next.quality = normalizeThreadQuality(next.quality);
      next.chamfer = normalizeThreadChamfer(next.chamfer, { role: next.role, diameter: next.diameter, pitch: next.pitch, profile: next.profile });
      next.chamferLow = normalizeThreadChamfer(next.chamferLow, { role: next.role, diameter: next.diameter, pitch: next.pitch, profile: next.profile });
      const headBase = { role: next.role, head: next.head, diameter: next.diameter, pitch: next.pitch };
      const keepHeadHeight = patch.headHeight !== undefined || !headFollowsStandard;
      next.headHeight = normalizeThreadHeadHeight(
        keepHeadHeight ? next.headHeight : defaultThreadHeadHeight(headBase),
        headBase,
      );
      // Die Kopffase haengt am Kopf: wer den Kopf flacher zieht oder auf
      // Senkkopf umschaltet, darf keine Fase behalten, die es dort nicht gibt.
      next.headChamfer = normalizeThreadHeadChamfer(next.headChamfer, { ...headBase, headHeight: next.headHeight, chamferLow: next.chamferLow, profile: next.profile });
      const footprint = threadNaturalFootprint(next);
      const update: Partial<WorkplaneShape> = {
        threadRole: next.role,
        threadHead: next.head,
        threadHand: next.hand,
        threadProfile: next.profile,
        threadDiameter: next.diameter,
        threadPitch: next.pitch,
        threadClearance: next.clearance,
        threadBoltClearance: next.boltClearance,
        threadAxialClearance: next.axialClearance,
        // Only an own profile has them; a shape that had set them keeps them while another profile is chosen.
        threadDepth: next.profile === "custom" ? next.depth : shape.threadDepth,
        threadFlankAngle: next.profile === "custom" ? next.flankAngle : shape.threadFlankAngle,
        threadQuality: next.quality,
        threadHeadHeight: next.headHeight,
        threadChamfer: next.chamfer,
        threadChamferBottom: next.chamferLow,
        threadHeadChamfer: next.headChamfer,
        width: footprint.width,
        depth: footprint.depth,
        size: resizedShapeSize(footprint.width, footprint.depth),
        height: resetHeight
          ? threadNaturalHeight(next)
          : Math.max(MIN_SHAPE_SIZE, (nextLength ?? threadLength) + next.headHeight),
      };
      // Ein Gewindeloch ist zum Abziehen da, alles andere ist Material.
      if (next.role === "bore") update.hole = true;
      else if (settings.role === "bore") update.hole = false;
      onUpdate(update);
    };
    const properties: ShapePropertyConfig[] = [
      {
        type: "select",
        id: "threadRole",
        label: t("inspector.threadRole"),
        value: settings.role,
        options: THREAD_ROLE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })),
        // A rod and a tapped hole are both a thread of any length: switching between them keeps
        // the length. A nut and a screw have their standard measure.
        onChange: (role) => {
          const nextRole = normalizeThreadRole(role);
          const freeLength = (value: ThreadRole) => value === "rod" || value === "bore";
          applyThread({ role: nextRole }, undefined, !(freeLength(settings.role) && freeLength(nextRole)));
        },
      },
    ];
    if (settings.role === "screw") {
      properties.push({
        type: "select",
        id: "threadHead",
        label: t("inspector.threadHead"),
        value: settings.head,
        options: THREAD_HEAD_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })),
        onChange: (head) => applyThread({ head: normalizeThreadHead(head) }),
      });
    }
    properties.push(
      {
        type: "select",
        id: "threadSize",
        label: t("prop.threadSize"),
        value: standard ? standard.id : "custom",
        options: sizeOptions,
        hint: standardSeries ? t(THREAD_SERIES_TEXT[standardSeries].hint) : undefined,
        onChange: (value) => {
          const chosen = threadSizeById(value);
          // Eine G-Groesse bringt ihr Whitworth-Profil mit, eine M-, UNC- oder
          // UNF-Groesse das Spitzgewinde; Trapez und Rund bleiben stehen.
          if (chosen) applyThread({ diameter: chosen.diameter, pitch: chosen.pitch, profile: threadProfileForSize(chosen, settings.profile) });
        },
      },
      {
        id: "diameter",
        label: t("prop.diameter"),
        value: settings.diameter,
        min: MIN_THREAD_DIAMETER,
        max: MAX_THREAD_DIAMETER,
        step: 0.1,
        onChange: (diameter) => applyThread({ diameter }),
      },
      {
        id: "threadLength",
        // Eine Mutter hat keine Gewindelaenge, sie hat eine Hoehe.
        label: settings.role === "nut" ? t("prop.height") : t("prop.length"),
        value: threadLength,
        min: MIN_SHAPE_SIZE,
        max: 160,
        onChange: (length) => applyThread({}, length),
      },
    );
    if (settings.role === "screw") {
      properties.push({
        id: "headHeight",
        label: t("prop.headHeight"),
        value: settings.headHeight,
        min: headLimits.min,
        max: headLimits.max,
        step: 0.1,
        onChange: (headHeight) => applyThread({ headHeight }),
      });
    }
    /*
     * Die Aussenfase gibt es am Schraubenkopf und an der Mutter: beide haben
     * eine scharfe Aussenkante an beiden Stirnflaechen, und beide sind in
     * Wirklichkeit dort gefast. Der Senkkopf ist schon ein Kegel - dort gibt
     * es nichts zu brechen, und die Grenze sagt das mit einem Hoechstwert von
     * null.
     */
    if (headChamferLimits.max > 0) {
      properties.push({
        id: "headChamfer",
        label: t(settings.role === "nut" ? "prop.rimChamfer" : "prop.headChamfer"),
        value: settings.headChamfer,
        min: headChamferLimits.min,
        max: headChamferLimits.max,
        step: 0.05,
        onChange: (headChamfer) => applyThread({ headChamfer }),
      });
    }
    properties.push(
      inchPitch
        ? {
          // Eine eigene Kennung: unter "pitch" galt die Gangzahl als Laenge,
          // trug "mm" und wurde in einem Zoll-Arbeitsbereich umgerechnet.
          id: "threadsPerInch",
          label: t("prop.threadsPerInch"),
          value: pitchToThreadsPerInch(settings.pitch),
          min: Math.max(4, Math.ceil(pitchToThreadsPerInch(pitchLimits.max))),
          max: Math.min(80, Math.floor(pitchToThreadsPerInch(pitchLimits.min))),
          step: 1,
          onChange: (perInch) => applyThread({ pitch: threadsPerInchToPitch(Math.round(perInch)) }),
        }
        : {
          id: "pitch",
          label: t("prop.pitch"),
          value: settings.pitch,
          min: pitchLimits.min,
          max: pitchLimits.max,
          step: 0.05,
          onChange: (pitch) => applyThread({ pitch }),
        },
      {
        type: "select",
        id: "threadHand",
        label: t("prop.threadHand"),
        value: settings.hand,
        options: [{ value: "right", label: t("thread.right") }, { value: "left", label: t("thread.left") }],
        onChange: (hand) => applyThread({ hand: normalizeThreadHand(hand) }),
      },
      {
        type: "select",
        id: "threadProfile",
        label: t("prop.threadProfile"),
        value: settings.profile,
        options: THREAD_PROFILE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })),
        onChange: (profile) => applyThread({ profile: normalizeThreadProfile(profile) }),
      },
    );
    if (settings.profile === "custom") {
      const depthLimits = threadDepthLimits(settings.pitch, settings.diameter, settings.flankAngle);
      // Depth and core diameter are one measure said two ways: core = diameter - 2 x depth.
      properties.push(
        {
          id: "threadFlankAngle",
          label: t("prop.threadFlankAngle"),
          value: settings.flankAngle,
          min: MIN_THREAD_FLANK_ANGLE,
          max: MAX_THREAD_FLANK_ANGLE,
          step: 1,
          hint: t("thread.flankAngleHint"),
          onChange: (flankAngle) => applyThread({ flankAngle }),
        },
        {
          id: "threadDepth",
          label: t("prop.threadDepth"),
          value: settings.depth,
          min: depthLimits.min,
          max: depthLimits.max,
          step: 0.05,
          onChange: (depth) => applyThread({ depth }),
        },
        {
          id: "threadCoreDiameter",
          label: t("prop.threadCoreDiameter"),
          value: settings.diameter - 2 * settings.depth,
          min: settings.diameter - 2 * depthLimits.max,
          max: settings.diameter - 2 * depthLimits.min,
          step: 0.05,
          onChange: (core) => applyThread({ depth: (settings.diameter - core) / 2 }),
        },
      );
    }
    if (settings.role === "bore" || settings.role === "nut") {
      properties.push({
        id: "clearance",
        label: t("prop.clearance"),
        value: settings.clearance,
        min: MIN_THREAD_CLEARANCE,
        max: MAX_THREAD_CLEARANCE,
        step: 0.05,
        hint: t("thread.clearanceHint"),
        onChange: (clearance) => applyThread({ clearance }),
      });
      // The play along the axis (#256): the tooth of the part gets thinner, the diameter stays.
      properties.push({
        id: "axialClearance",
        label: t("prop.axialClearance"),
        value: settings.axialClearance,
        min: 0,
        max: threadAxialClearanceLimit(settings.pitch),
        step: 0.05,
        hint: t("thread.axialClearanceHint"),
        onChange: (axialClearance) => applyThread({ axialClearance }),
      });
    } else {
      // Stange und Schraube: das Spiel macht den Bolzen duenner, fuer eine
      // Mutter aus Metall, die selbst keins hat.
      properties.push({
        id: "boltClearance",
        label: t("prop.clearance"),
        value: settings.boltClearance,
        min: MIN_THREAD_BOLT_CLEARANCE,
        max: MAX_THREAD_BOLT_CLEARANCE,
        step: 0.05,
        hint: t("thread.boltClearanceHint"),
        onChange: (boltClearance) => applyThread({ boltClearance }),
      });
    }
    // A screw has a chamfer at its tip only. Every other thread has two ends, each with a chamfer of its own.
    properties.push({
      id: "chamfer",
      label: settings.role === "screw" ? t("prop.chamfer") : t("prop.threadChamferTop"),
      value: settings.chamfer,
      min: chamferLimits.min,
      max: chamferLimits.max,
      step: 0.05,
      onChange: (chamfer) => applyThread({ chamfer }),
    });
    if (settings.role !== "screw") {
      properties.push({
        id: "chamferBottom",
        label: t("prop.threadChamferBottom"),
        value: settings.chamferLow,
        min: chamferLimits.min,
        max: chamferLimits.max,
        step: 0.05,
        onChange: (chamferLow) => applyThread({ chamferLow }),
      });
    }
    properties.push({
      id: "quality",
      label: t("prop.quality"),
      value: settings.quality,
      min: MIN_THREAD_QUALITY,
      max: MAX_THREAD_QUALITY,
      step: 6,
      onChange: (quality) => applyThread({ quality }),
    });
    return properties;
  }

  if (shape.kind === "gear") {
    const gearType = normalizeGearType(shape.gearType);
    // A ring gear and a rack (#201) have no straight teeth; "simple" counts as involute there.
    const modular = gearTypeIsModular(gearType);
    const gearProfile = gearToothProfile(shape);
    // Involute and round teeth are set by module (#201); the pressure angle is the involute's own.
    const involute = gearProfile !== "simple";
    const teeth = shape.teeth ?? DEFAULT_GEAR_TEETH;
    const module = gearModuleOf({ ...shape, width, depth });
    // A gear set by module stays round: its size is module x (teeth + 2) both ways, round teeth module x (teeth + 1.2);
    // a ring gear adds its rim, a rack is teeth x pitch long and keeps its depth.
    const setInvoluteSize = (nextModule: number, nextTeeth = teeth, patch: Partial<WorkplaneShape> = {}) => {
      const next = gearSizeForModule(nextModule, { ...shape, ...patch, width, depth }, nextTeeth);
      const profile = { ...shape, ...patch, teeth: nextTeeth };
      onUpdate({
        ...patch,
        teeth: nextTeeth,
        width: next.width,
        depth: next.depth,
        size: Math.max(next.width, next.depth),
        centerHoleSize: normalizeGearCenterHoleSize(shape.centerHoleSize, next.width, next.depth, shape.toothSize, profile),
      }, { resizeAxis: "width" });
    };
    const setGearWidth = (value: number) => {
      if (gearType === "rack") return setInvoluteSize(rackModule(value, teeth));
      if (involute) return setInvoluteSize(gearModuleOf({ ...shape, width: value, depth: value }));
      const toothSize = normalizeGearToothSize(shape.toothSize, value, depth);
      const toothWidth = normalizeGearToothWidth(shape.toothWidth, value, depth, shape.teeth);
      const centerHoleSize = normalizeGearCenterHoleSize(shape.centerHoleSize, value, depth, toothSize);
      onUpdate({ width: value, size: resizedShapeSize(value, depth), toothSize, toothWidth, centerHoleSize }, { resizeAxis: "width" });
    };
    const setGearDepth = (value: number) => {
      // A rack's depth is its bar: free, as long as the teeth and a little bar fit in.
      if (gearType === "rack") {
        const nextDepth = Math.max(rackMinDepth(module, gearProfile), value);
        return onUpdate({ depth: nextDepth, size: Math.max(width, nextDepth) }, { resizeAxis: "depth" });
      }
      if (involute) return setInvoluteSize(gearModuleOf({ ...shape, width: value, depth: value }));
      const toothSize = normalizeGearToothSize(shape.toothSize, width, value);
      const toothWidth = normalizeGearToothWidth(shape.toothWidth, width, value, shape.teeth);
      const centerHoleSize = normalizeGearCenterHoleSize(shape.centerHoleSize, width, value, toothSize);
      onUpdate({ depth: value, size: resizedShapeSize(width, value), toothSize, toothWidth, centerHoleSize }, { resizeAxis: "depth" });
    };
    const toothPitch = gearToothPitch(width, depth, teeth);
    const toothSize = normalizeGearToothSize(shape.toothSize ?? DEFAULT_GEAR_TOOTH_SIZE, width, depth);
    const centerHoleLimits = gearCenterHoleLimits(width, depth, toothSize, shape);
    const pitchDiameter = module * teeth;
    const properties: ShapePropertyConfig[] = [
      {
        type: "select",
        id: "gearProfile",
        label: t("prop.gearProfile"),
        value: gearProfile,
        options: [
          { value: "involute", label: t("gear.profileInvolute") },
          { value: "round", label: t("gear.profileRound") },
          ...(modular ? [] : [{ value: "simple", label: t("gear.profileSimple") }]),
        ],
        hint: gearType === "rack"
          ? t(gearProfile === "round" ? "gear.rackRoundHint" : "gear.rackHint", { pitchLength: plainNumber(Math.PI * module), module: plainNumber(module), offset: plainNumber(gearAddendum(gearProfile) * module) })
          : gearType === "internal"
            ? t(gearProfile === "round" ? "gear.internalRoundHint" : "gear.internalHint", { pitch: plainNumber(pitchDiameter), module: plainNumber(module) })
            : gearProfile === "involute"
              ? t("gear.involuteHint", { pitch: plainNumber(pitchDiameter), module: plainNumber(module) })
              : gearProfile === "round"
                ? t("gear.roundHint", { pitch: plainNumber(pitchDiameter), module: plainNumber(module) })
                : t("gear.simpleHint"),
        onChange: (value) => {
          if (value === "involute" || value === "round") {
            // Between involute and round the module stays; from simple teeth the size stays as
            // near as a whole tenth of a module allows.
            const nextModule = involute ? module : Math.max(0.1, Math.round(involuteGearModule(width, depth, teeth, value) * 10) / 10);
            const next = gearSizeForModule(nextModule, { ...shape, gearProfile: value, width, depth }, teeth);
            onUpdate({
              gearProfile: value,
              gearPressureAngle: normalizeGearPressureAngle(shape.gearPressureAngle),
              gearBacklash: shape.gearBacklash ?? DEFAULT_GEAR_BACKLASH,
              width: next.width,
              depth: next.depth,
              size: Math.max(next.width, next.depth),
              centerHoleSize: normalizeGearCenterHoleSize(shape.centerHoleSize, next.width, next.depth, shape.toothSize, { teeth, gearProfile: value }),
            });
          } else {
            onUpdate({ gearProfile: "simple", centerHoleSize: normalizeGearCenterHoleSize(shape.centerHoleSize, width, depth, toothSize) });
          }
        },
      },
      {
        id: "teeth",
      label: t("prop.teeth"),
        value: teeth,
        min: MIN_GEAR_TEETH,
        max: MAX_GEAR_TEETH,
        step: 1,
        onChange: (value) => {
          const nextTeeth = Math.round(value);
          if (involute) return setInvoluteSize(module, nextTeeth);
          onUpdate({
            teeth: nextTeeth,
            toothWidth: normalizeGearToothWidth(shape.toothWidth, width, depth, nextTeeth),
          });
        },
      },
    ];
    if (involute) {
      properties.push(
        {
          id: "gearModule",
          label: t("prop.gearModule"),
          value: module,
          min: 0.3,
          max: 10,
          step: 0.05,
          onChange: (nextModule) => setInvoluteSize(nextModule),
        },
        ...(gearProfile === "involute" ? [{
          id: "gearPressureAngle",
          label: t("prop.gearPressureAngle"),
          value: normalizeGearPressureAngle(shape.gearPressureAngle),
          min: MIN_GEAR_PRESSURE_ANGLE,
          max: MAX_GEAR_PRESSURE_ANGLE,
          step: 0.5,
          onChange: (gearPressureAngle: number) => onUpdate({ gearPressureAngle }),
        }] : []),
        {
          id: "gearBacklash",
          label: t("prop.gearBacklash"),
          value: normalizeGearBacklash(shape.gearBacklash, module),
          min: 0,
          max: Math.min(MAX_GEAR_BACKLASH, module * 0.5),
          step: 0.05,
          onChange: (gearBacklash) => onUpdate({ gearBacklash }),
        },
      );
      // The ring gear's rim grows its outside; the module stays.
      if (gearType === "internal") properties.push({
        id: "gearRim",
        label: t("prop.gearRim"),
        value: normalizeGearRim(shape.gearRim),
        min: MIN_GEAR_RIM,
        max: MAX_GEAR_RIM,
        step: 0.1,
        onChange: (gearRim) => setInvoluteSize(module, teeth, { gearRim }),
      });
    }
    if (!involute) properties.push(
      {
        id: "toothSize",
      label: t("prop.toothSize"),
        value: toothSize,
        min: 0.2,
        max: Math.max(0.2, Math.min(width, depth) * 0.22),
        step: 0.1,
        onChange: (nextToothSize) => onUpdate({
          toothSize: nextToothSize,
          centerHoleSize: normalizeGearCenterHoleSize(shape.centerHoleSize, width, depth, nextToothSize),
        }),
      },
      {
        id: "toothWidth",
      label: t("prop.toothWidth"),
        value: normalizeGearToothWidth(shape.toothWidth, width, depth, teeth),
        min: toothPitch * 0.12,
        max: toothPitch * 0.82,
        step: 0.1,
        onChange: (toothWidth) => onUpdate({ toothWidth }),
      },
    );
    if (gearTypeHasHelix(shape.gearType)) {
      properties.push({
        id: "helixAngle",
      label: t("prop.helixAngle"),
        value: normalizeGearHelixAngle(shape.helixAngle ?? DEFAULT_GEAR_HELIX_ANGLE),
        min: MIN_GEAR_HELIX_ANGLE,
        max: MAX_GEAR_HELIX_ANGLE,
        step: 1,
        onChange: (helixAngle) => onUpdate({ helixAngle }),
      });
      properties.push({
        id: "quality",
      label: t("prop.quality"),
        value: normalizeGearHelixQuality(shape.helixQuality ?? DEFAULT_GEAR_HELIX_QUALITY),
        min: MIN_GEAR_HELIX_QUALITY,
        max: MAX_GEAR_HELIX_QUALITY,
        step: 1,
        onChange: (helixQuality) => onUpdate({ helixQuality: Math.round(helixQuality) }),
      });
    }
    // A ring gear is a bore itself, a rack has none.
    if (!modular) properties.push({
      id: "centerHole",
      label: t("prop.centerHole"),
      value: normalizeGearCenterHoleSize(shape.centerHoleSize, width, depth, toothSize, shape),
      min: centerHoleLimits.min,
      max: centerHoleLimits.max,
      step: 0.1,
      onChange: (centerHoleSize) => onUpdate({ centerHoleSize }),
    });
    properties.push(
      { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setGearDepth },
      { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setGearWidth },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
    );
    return properties;
  }

  if (shape.kind === "text") {
    const isCurved = Boolean(shape.textCurved);
    const properties: ShapePropertyConfig[] = [
      {
        type: "text",
        id: "text",
        label: t("prop.text"),
        value: shape.text ?? "TEXT",
        onChange: (text) => {
          const nextText = text.slice(0, 24) || " ";
          // Other words keep the letter size and the box follows the letters (#871): only the width was
          // changed before, and the letters were stretched to fill the old depth.
          const sized = textLetterSizePatch({ ...shape, text: nextText } as WorkplaneShape, textLetterSize(shape));
          if (typeof sized.width === "number" && sized.width > textWidthMax) {
            onUpdate({ text: nextText, width: textWidthMax, size: textWidthMax });
            return;
          }
          // The baseline stays where it was (#871), so a tail reaches below the line instead of the letters sitting on the bottom of the box.
          const shift = textBaselineKeepShift(shape, { ...shape, text: nextText, ...sized } as WorkplaneShape);
          onUpdate({ text: nextText, ...sized, ...(shift ? { x: shape.x + shift.x, z: shape.z + shift.z } : {}) });
        },
      },
      textFontProperty(shape, onUpdate),
      // The letter size (#215): how big the letters are seen from above, as on a name tag; Height is the thickness.
      { id: "letterSize", label: t("nameTag.letterSize"), value: textLetterSize(shape), min: MIN_LETTER_SIZE, max: 60, step: 0.5, hint: t("nameTag.letterSizeHint"), onChange: (size) => onUpdate(textLetterSizePatch(shape, size)) },
      { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 40, hint: t("prop.textHeightHint"), onChange: setHeight },
      ...textFillProperties(shape, onUpdate),
      // The top edge of the letters (#499), as on a name tag; a rounded or chamfered edge takes the place of the bevel.
      ...textEdgeProperties(shape, onUpdate),
      // A fill mode or the silhouette draws the letters flat; bevel and segments belong to the filled letters.
      ...(textHasFill(shape) || shape.textEdge ? [] : [
        { id: "bevel", label: t("prop.bevel"), value: shape.bevel ?? 0, min: 0, max: 8, onChange: (bevel: number) => onUpdate({ bevel }) },
        { id: "segments", label: t("prop.segments"), value: shape.segments ?? 0, min: 0, max: 24, step: 1, onChange: (segments: number) => onUpdate({ segments: Math.round(segments) }) },
      ] satisfies ShapePropertyConfig[]),
      // The space between the letters (#594), in per cent of the letter size; the letters keep their size and the box follows.
      {
        id: "textSpacing",
        label: t("prop.textSpacing"),
        value: shape.textSpacing ?? 0,
        min: MIN_TEXT_SPACING,
        max: MAX_TEXT_SPACING,
        step: 1,
        hint: t("prop.textSpacingHint"),
        onChange: (spacing: number) => onUpdate(textSpacingPatch(shape, spacing)),
      },
      // The letters stacked top to bottom (#981). Straight: the box turns upright and the letters keep their size. Curved: the
      // column runs along the circle at its left side, the letters standing upright; the box follows in curvedTextPatch.
      {
        type: "toggle",
        id: "textVertical",
        label: t("prop.textVertical"),
        value: Boolean(shape.textVertical),
        onChange: (vertical: boolean) => {
          if (isCurved) {
            onUpdate({ textVertical: vertical || undefined });
            return;
          }
          const next = { ...shape, textVertical: vertical || undefined } as WorkplaneShape;
          onUpdate({ textVertical: vertical || undefined, ...(shape.textStretch ? {} : textLetterSizePatch(next, textLetterSize(shape))) });
        },
      } satisfies ShapePropertyConfig,
      // Straight text (#382): the letters keep their proportions in the box, or are stretched to fill it.
      ...(isCurved ? [] : [{
        type: "toggle",
        id: "textStretch",
        label: t("prop.textStretch"),
        value: Boolean(shape.textStretch),
        onChange: (textStretch: boolean) => onUpdate({ textStretch: textStretch || undefined }),
      } satisfies ShapePropertyConfig]),
      {
        type: "toggle",
        id: "textCurved",
        label: t("prop.textCurved"),
        value: isCurved,
        // Radius, letter size and the box follow in curvedTextPatch.
        onChange: (textCurved) => onUpdate({ textCurved }),
      },
    ];
    if (isCurved) {
      properties.push(
        {
          id: "textRadius",
          label: t("prop.textRadius"),
          value: shape.textRadius ?? 30,
          min: 5,
          max: 500,
          step: 1,
          onChange: (textRadius) => onUpdate({ textRadius }),
        },
        {
          type: "toggle",
          id: "textInward",
          // A column of upright letters (#981) runs along the circle's left side, or its right side with this on.
          label: shape.textVertical ? t("prop.textInwardColumn") : t("prop.textInward"),
          value: Boolean(shape.textInward),
          onChange: (textInward) => onUpdate({ textInward }),
        },
        // Upside down turns a line of letters round; a column of upright letters has no such thing.
        ...(shape.textVertical ? [] : [{
          type: "toggle",
          id: "textFlipped",
          label: t("prop.textFlipped"),
          value: Boolean(shape.textFlipped),
          onChange: (textFlipped: boolean) => onUpdate({ textFlipped }),
        } satisfies ShapePropertyConfig]),
      );
    }
    return properties;
  }

  return [
    { id: "length", label: t("prop.length"), value: depth, min: MIN_SHAPE_SIZE, max: 160, onChange: setDepth },
    { id: "width", label: t("prop.width"), value: width, min: MIN_SHAPE_SIZE, max: 160, onChange: setWidth },
    { id: "height", label: t("prop.height"), value: shape.height, min: MIN_SHAPE_SIZE, max: 160, onChange: setHeight },
  ];
}

/**
 * How a text is filled (#215), as similar tools list it: one list - filled, outline, outer line,
 * inner line - and, for a line, its width and corners right under it. The silhouette and "Wider"
 * (the filled letters grown by the line width, its corners beside it) are rarer and sit under
 * "More" (TEXT_FILL_MORE_IDS). The box follows the fill (textFillPatch), the letters stay as
 * they are.
 */
const TEXT_FILL_MORE_IDS = new Set(["textWiderCorners", "textSilhouette", "textWider"]);
const TEXT_FILL_IN_VIEW_IDS = new Set(["textFill", "textLineWidth", "textCorners"]);

/** The letters' top edge, round or chamfered, and how large (#499): the setting the name tag has for its top layer. */
function textEdgeProperties(shape: WorkplaneShape, onUpdate: ShapeInspectorUpdate): ShapePropertyConfig[] {
  const edge = normalizeTextEdge(shape.textEdge);
  return [
    {
      type: "select",
      id: "textEdge",
      label: t("nameTag.letterEdge"),
      value: edge?.kind ?? "none",
      options: (["none", "round", "chamfer"] as const).map((value) => ({ value, label: t(`nameTag.edge.${value}`) })),
      onChange: (value) => onUpdate({ textEdge: value === "round" || value === "chamfer" ? { kind: value, size: edge?.size ?? Math.min(0.4, shape.height) } : undefined }),
    },
    ...(edge ? [{
      id: "textEdgeSize",
      label: t("nameTag.letterEdgeSize"),
      value: edge.size,
      min: MIN_TEXT_EDGE,
      max: Math.max(MIN_TEXT_EDGE, Math.min(MAX_TEXT_EDGE, shape.height)),
      step: 0.05,
      onChange: (size: number) => onUpdate({ textEdge: { kind: edge.kind, size } }),
    } satisfies ShapePropertyConfig] : []),
  ];
}

function textFillProperties(shape: WorkplaneShape, onUpdate: ShapeInspectorUpdate): ShapePropertyConfig[] {
  const stroke = normalizeSketchStroke(shape.textStroke);
  const setStroke = (textStroke: SketchStroke | undefined) => onUpdate({ textStroke });
  const wider = stroke?.align === "grow";
  const fill: ShapePropertyConfig = {
    type: "select",
    id: "textFill",
    label: t("prop.textFill"),
    value: textFillChoice(stroke),
    options: TEXT_FILL_CHOICES.map(({ choice }) => ({ value: choice, label: t(`prop.textFill.${choice}`) })),
    hint: wider ? t("prop.sketchFill.growHint") : (stroke || shape.textSilhouette) && (shape.bevel ?? 0) > 0 ? t("prop.textFillHint") : undefined,
    onChange: (value) => setStroke(textStrokeForChoice(value as TextFillChoice, stroke)),
  };
  const lineWidth: ShapePropertyConfig[] = stroke ? [{
    id: "textLineWidth",
    label: t(wider ? "textLayers.grow" : "prop.sketchLineWidth"),
    value: stroke.width,
    min: MIN_SKETCH_STROKE_WIDTH,
    max: 50,
    step: 0.1,
    onChange: (width) => setStroke({ ...stroke, width: Math.min(MAX_SKETCH_STROKE_WIDTH, Math.max(MIN_SKETCH_STROKE_WIDTH, width)) }),
  }] : [];
  const corners: ShapePropertyConfig[] = stroke ? [{
    type: "select",
    // A line's corners stand under the list; "Wider"'s go with its switch under "More".
    id: textLineSettingsInView(stroke) ? "textCorners" : "textWiderCorners",
    label: t("sketch.strokeJoin"),
    value: stroke.join,
    options: SKETCH_STROKE_JOINS.map((join) => ({ value: join, label: t(`sketch.strokeJoin.${join}`) })),
    onChange: (join) => setStroke({ ...stroke, join: join as SketchStrokeJoin }),
  }] : [];
  return [
    fill,
    ...lineWidth,
    ...(wider ? [] : corners),
    {
      type: "toggle",
      id: "textSilhouette",
      label: t("prop.sketchSilhouette"),
      value: Boolean(shape.textSilhouette),
      onChange: (value) => onUpdate({ textSilhouette: value || undefined }),
    },
    {
      type: "toggle",
      id: "textWider",
      label: t("prop.textWider"),
      value: wider,
      onChange: (value) => setStroke(textStrokeWider(value, stroke)),
    },
    ...(wider ? corners : []),
  ];
}

/**
 * How an extruded sketch body is filled, without opening the sketch (#197, as the usual SVG
 * fill modes): the area, a stroke outside, inside or centred on its lines with a width and
 * corners, and the silhouette that leaves its holes out. The editor builds the body again.
 */
function sketchFillProperties(profile: SketchProfile, onUpdate: ShapeInspectorUpdate): ShapePropertyConfig[] {
  const stroke = normalizeSketchStroke(profile.stroke);
  const update = (patch: Partial<SketchProfile>) => {
    const next: SketchProfile = { ...profile, ...patch };
    if (!next.stroke) delete next.stroke;
    if (!next.silhouette) delete next.silhouette;
    onUpdate({ sketchProfile: next });
  };
  const fill: ShapePropertyConfig = {
    type: "select",
    id: "sketchFill",
    label: t("prop.sketchFill"),
    value: stroke ? stroke.align : "area",
    options: [
      { value: "area", label: t("prop.sketchFill.area") },
      { value: "outside", label: t("prop.sketchFill.outside") },
      { value: "inside", label: t("prop.sketchFill.inside") },
      { value: "center", label: t("prop.sketchFill.center") },
      { value: "grow", label: t("prop.sketchFill.grow") },
      { value: "shrink", label: t("prop.sketchFill.shrink") },
    ],
    hint: stroke?.align === "grow" ? t("prop.sketchFill.growHint") : stroke?.align === "shrink" ? t("prop.sketchFill.shrinkHint") : undefined,
    onChange: (value) => update({
      stroke: value === "area" ? undefined : { ...(stroke ?? DEFAULT_SKETCH_STROKE), align: value as SketchStrokeAlign },
    }),
  };
  const silhouette: ShapePropertyConfig = {
    type: "toggle",
    id: "sketchSilhouette",
    label: t("prop.sketchSilhouette"),
    value: Boolean(profile.silhouette),
    onChange: (value) => update({ silhouette: value || undefined }),
  };
  if (!stroke) return [fill, silhouette];
  return [
    fill,
    {
      id: "sketchLineWidth",
      label: t("prop.sketchLineWidth"),
      value: stroke.width,
      min: MIN_SKETCH_STROKE_WIDTH,
      max: 50,
      step: 0.1,
      onChange: (width) => update({ stroke: { ...stroke, width: Math.min(MAX_SKETCH_STROKE_WIDTH, Math.max(MIN_SKETCH_STROKE_WIDTH, width)) } }),
    },
    // A wall's top run in to a cutting edge (#982); a wider or narrower area has no wall to sharpen.
    ...(stroke.align === "grow" || stroke.align === "shrink" ? [] : [{
      id: "sketchCuttingEdge",
      label: t("prop.sketchCuttingEdge"),
      value: stroke.edge ?? 0,
      min: 0,
      max: Math.max(0, stroke.width - 0.05),
      step: 0.1,
      hint: t("prop.sketchCuttingEdgeHint"),
      onChange: (edge: number) => {
        const { edge: _edge, ...rest } = stroke;
        update({ stroke: edge >= MIN_SKETCH_STROKE_EDGE && edge < stroke.width ? { ...rest, edge } : rest });
      },
    } satisfies ShapePropertyConfig]),
    {
      type: "select",
      id: "sketchCorners",
      label: t("sketch.strokeJoin"),
      value: stroke.join,
      options: SKETCH_STROKE_JOINS.map((join) => ({ value: join, label: t(`sketch.strokeJoin.${join}`) })),
      onChange: (join) => update({ stroke: { ...stroke, join: join as SketchStrokeJoin } }),
    },
    silhouette,
  ];
}

/**
 * The text's font: the built-in ones, then the fonts of one's own this browser keeps or the open
 * design brought along, and "Your own fonts …" to add one. A font the design names but nobody
 * has here shows as missing; its text is drawn in Multilanguage meanwhile.
 */
function textFontProperty(shape: WorkplaneShape, onUpdate: ShapeInspectorUpdate): ShapePropertyConfig {
  const current = shape.font ?? "Multilanguage";
  // The words of the text itself, so the list shows how they will look.
  const sample = typeof shape.text === "string" ? shape.text : "";
  const builtIn = t("font.builtInGroup");
  const own = t("font.customGroup");
  const options: SelectPropertyOption[] = [
    ...TEXT_FONT_OPTIONS.map((value) => ({ value, label: value, group: builtIn })),
    ...customFontList().map((font) => ({ value: font.id, label: font.name, group: own })),
  ];
  if (!options.some((option) => option.value === current)) options.push({ value: current, label: textFontLabel(current) ?? t("font.missing"), group: own });
  options.push({ value: FONT_MANAGER_OPTION, label: t("font.manage"), group: own });
  return {
    type: "select",
    id: "font",
    label: t("prop.font"),
    value: current,
    options,
    fontSample: sample,
    onChange: (font) => {
      if (font === FONT_MANAGER_OPTION) requestFontManager();
      else onUpdate({ font });
    },
  };
}

/** The fonts a text stuck on a surface can take: the built-in ones, then the fonts of one's own this browser keeps. */
function surfaceTextFontOptions(current: string): SelectPropertyOption[] {
  const builtIn = t("font.builtInGroup");
  const own = t("font.customGroup");
  const options: SelectPropertyOption[] = [
    ...SURFACE_TEXT_FONTS.map((value) => ({ value, label: value, group: builtIn })),
    ...customFontList().map((font) => ({ value: font.id, label: font.name, group: own })),
  ];
  if (!options.some((option) => option.value === current)) options.push({ value: current, label: textFontLabel(current) ?? t("font.missing"), group: own });
  return options;
}

function getShapeProperties(shape: WorkplaneShape, onUpdate: ShapeInspectorUpdate, workspace: WorkplaneWorkspaceSettings): ShapePropertyConfig[] {
  const customLimit = workspace.shapeCustomizations[shape.kind]?.maxDimension;
  // A body turned by right angles names its measures by the way they run now (#230).
  const oriented = orientedMeasures(shape);
  const own = getShapePropertiesWithAppLimits(shape, onUpdate, customLimit ?? 260);
  const properties = withOrientedMeasures(own, oriented, { width: t("prop.width"), height: t("prop.height"), length: t("prop.length") });
  if (customLimit === undefined) return properties;
  return properties.map((property) => {
    if (property.type === "text" || property.type === "select") return property;
    if (["length", "width", "height", "threadLength"].includes(property.id)) return { ...property, max: customLimit };
    if (["topRadius", "baseRadius"].includes(property.id)) return { ...property, max: customLimit / 2 };
    return property;
  });
}

/**
 * The snap step in mm (0 when the grid is off). A length slider dragged with the mouse snaps to it, so a
 * height comes out in whole millimetres instead of 0.81 steps of one pixel; typing and the arrow keys stay exact.
 */
const SliderSnapContext = createContext(0);

export function ShapeInspector({
  shape,
  snap,
  snapOpen,
  workspace,
  onUpdate: onUpdateShape,
  onSnapChange,
  onSnapOpenChange,
  onUnitsChange,
  onObjectSnapChange,
  onEditSketch,
  onOpenGroup,
  canSeparateParts = false,
  onSeparateParts,
  onWrapAroundCylinder,
  onSurfaceTexture,
  onRemoveSurfaceTexture,
  surfaceTextureOpen,
  onSurfaceTextureOpenChange,
  surfaceFacePicking,
  surfacePickedFaces,
  onSurfaceFacePick,
  onVaseAccessories,
  onLayerText,
  onTextTags,
  onFixKeyringTab,
  textLayerStack: nameTagStack,
  iconTag,
  qrCode,
  referenceImage,
  onInteractionActiveChange,
  onSnapGridAwayChange,
  proportionLock = false,
  onProportionLockChange,
  onBentTubeSegmentChange,
  onShapeDefaultsChange,
}: {
  shape: WorkplaneShape;
  snap: GridSize;
  snapOpen: boolean;
  workspace: WorkplaneWorkspaceSettings;
  onUpdate: ShapeInspectorUpdate;
  onSnapChange: Dispatch<SetStateAction<GridSize>>;
  onSnapOpenChange: Dispatch<SetStateAction<boolean>>;
  onUnitsChange?: (units: string) => void;
  onObjectSnapChange?: (enabled: boolean) => void;
  onEditSketch?: () => void;
  /** Opens a group so its parts can be changed one by one. */
  onOpenGroup?: () => void;
  canSeparateParts?: boolean;
  onSeparateParts?: () => void;
  /** Wraps this body around a cylinder of the given diameter (#106). */
  onWrapAroundCylinder?: (diameter: number, inward: boolean) => void;
  /** Lays a surface texture onto this body; resolves when it is on (or could not be made). */
  onSurfaceTexture?: (settings: SurfaceTextureSettings) => Promise<void> | void;
  onRemoveSurfaceTexture?: () => void;
  /** Whether the surface texture card is open, when the editor holds it (the toolbar opens it too). */
  surfaceTextureOpen?: boolean;
  onSurfaceTextureOpenChange?: (open: boolean) => void;
  /** Whether faces of this body are being picked for its texture with clicks in the view, and the faces picked so far. */
  surfaceFacePicking?: boolean;
  surfacePickedFaces?: SurfaceTextureFace[] | null;
  /** Starts picking faces from these (null: stops), on the faces as the given edge angle bounds them. */
  onSurfaceFacePick?: (faces: SurfaceTextureFace[] | null, edgeAngle: number) => void;
  /** Lays this vase's accessories out beside it, ready to print. */
  onVaseAccessories?: () => void;
  /** Splits a text into layers, or builds a layered text again with new words, font or layers (#215). */
  onLayerText?: (patch: TextLayerPatch) => void;
  /** One tag like this text or stack per name, laid out in rows (#215). */
  onTextTags?: (names: string[], gap: number) => void;
  /** Fixes a key ring tab of its own to the nearest tag in one click, where it was put (#598). */
  onFixKeyringTab?: () => void;
  /** The selected name tag's words, font and layers, read from its layers as they stand (#215). */
  textLayerStack?: NameTagStack | null;
  /** The icon tag card's wiring, for a sketch body or an icon tag; null for anything else. */
  iconTag?: IconTagControls | null;
  /** The QR code card's wiring (#553), for a QR code; null for anything else. */
  qrCode?: QrCodeControls | null;
  /** The reference image card's wiring (#680), for a reference image; null for anything else. */
  referenceImage?: ReferenceImageControls | null;
  onInteractionActiveChange?: (active: boolean) => void;
  /** The snap control lives in the expanded panel; collapsed, the workplane shows its own. */
  /** Called with true while the inspector does not carry the snap grid control (collapsed, or floating), so the workplane shows it. */
  onSnapGridAwayChange?: (away: boolean) => void;
  /** With the lock on, changing one of width, depth and height scales the other two by the same factor. */
  proportionLock?: boolean;
  onProportionLockChange?: (locked: boolean) => void;
  /** The segment the bent tube's settings are about, or null when none is shown; the workplane lights it up on the tube. */
  onBentTubeSegmentChange?: (shapeId: string, segment: number | null) => void;
  /** Saves the shape's values as the defaults of its kind, or removes them (null): the same "Shape defaults" the settings hold. */
  onShapeDefaultsChange?: (kind: WorkplaneShape["kind"], entry: ShapeCustomization | null) => void;
}) {
  useLanguage();
  const solidColor = shape.color;
  // Picking one colour for a group means one colour for all of it, as in similar tools.
  const singleColorPatch: Partial<WorkplaneShape> = canToggleGroupColors(shape) ? { multicolor: false } : {};
  const locked = Boolean(shape.locked);
  // A calculation typed into a field (#180) is noted just before the field's change and rides
  // along in that one change, so undo takes value and formula back together. A note nobody
  // picks up is dropped again right after.
  const pendingFormulaRef = useRef<{ id: string; text: string | null } | null>(null);
  const noteFormula = (id: string, text: string | null | undefined) => {
    pendingFormulaRef.current = text === undefined ? null : { id, text };
  };
  const onUpdate: ShapeInspectorUpdate = (patch, options) => {
    const pending = pendingFormulaRef.current;
    pendingFormulaRef.current = null;
    onUpdateShape(pending ? { ...patch, formulas: withFieldFormula(shape.formulas, pending.id, pending.text) } : patch, options);
  };
  const properties = getShapeProperties(shape, onUpdate, workspace);
  const tiltedMeasures = orientedMeasures(shape).kind === "tilted";
  // What each value would be on a shape of this kind made new, with the saved defaults: the
  // small arrow next to a changed value takes it back there.
  const propertyDefaults = useMemo(() => shapePropertyDefaults(shape.kind, workspace, shape.kind === "gridfinity" ? normalizeGridfinityType(shape.gridfinityType) : undefined), [shape.kind, workspace, shape.gridfinityType]);
  const savedDefaults = workspace.shapeCustomizations[shape.kind];
  const defaultsToSave = shapeDefaultsFromShape(shape, workspace.shapeCustomizations);
  const sameDefaults = JSON.stringify(defaultsToSave ?? null) === JSON.stringify(savedDefaults && Object.keys(savedDefaults).length > 0 ? savedDefaults : null);
  const gearType = shape.kind === "gear" ? normalizeGearType(shape.gearType) : null;
  const isThread = shape.kind === "thread";
  /*
   * Wo die Verjuengung nichts ausrichtet, steht auch keine Karte dafuer. Welche
   * Arten das sind, steht in `shapeSupportsTaper` - dieselbe Antwort bekommt
   * die MCP-Bruecke, damit nicht eine Stelle anbietet, was die andere wegwirft.
   */
  const shapeIgnoresTaper = !shapeSupportsTaper(shape.kind);
  // A name tag only gets distorted by taper, twist and lean: its cards stay away (#225). A plain text keeps them (#238).
  const showTaperCards = !shapeIgnoresTaper && !shape.layeredText;
  const threadRoleProperty = isThread ? findSelectProperty(properties, "threadRole") : null;
  const threadHeadProperty = isThread ? findSelectProperty(properties, "threadHead") : null;
  // A vase: its measures here, its form and pattern and its bottom and wall on cards of their own.
  const vaseFormProperties = shape.kind === "vase" ? properties.filter((property) => property.id.startsWith("vase.")) : [];
  const vaseFloorProperties = shape.kind === "vase" ? properties.filter((property) => property.id.startsWith("vaseFloor.")) : [];
  const vasePrintProperties = shape.kind === "vase" ? properties.filter((property) => property.id.startsWith("vasePrint.")) : [];
  const vasePartProperties = shape.kind === "vase" ? properties.filter((property) => property.id.startsWith("vaseParts.")) : [];
  const primaryProperties = shape.kind === "vase"
    ? properties.filter((property) => !property.id.startsWith("vase"))
    : shape.kind === "gear"
    ? properties.filter((property) => ["centerHole", "length", "width", "height"].includes(property.id))
    : isThread
      ? properties.filter((property) => ["threadSize", "diameter", "threadLength", "headHeight", "headChamfer"].includes(property.id))
      : properties.filter((property) => shape.kind !== "text" || !TEXT_FILL_MORE_IDS.has(property.id));
  // A text's fill (#215): the list and the line width in view, the rest under "More" right below them.
  const textFillMore = shape.kind === "text" ? properties.filter((property) => TEXT_FILL_MORE_IDS.has(property.id)) : [];
  const textFillEnd = primaryProperties.reduce((end, property, index) => (TEXT_FILL_IN_VIEW_IDS.has(property.id) ? index + 1 : end), 0);
  const threadProperties = isThread
    ? properties.filter((property) => ["pitch", "threadsPerInch", "threadHand", "threadProfile", "threadFlankAngle", "threadDepth", "threadCoreDiameter", "clearance", "axialClearance", "boltClearance", "chamfer", "chamferBottom", "quality"].includes(property.id))
    : [];
  const gearTeethProperties = shape.kind === "gear"
    ? properties.filter((property) => ["gearProfile", "teeth", "gearModule", "gearPressureAngle", "gearBacklash", "gearRim", "toothSize", "toothWidth"].includes(property.id))
    : [];
  const gearHelixProperties = shape.kind === "gear"
    ? properties.filter((property) => ["helixAngle", "quality"].includes(property.id))
    : [];
  const taper = shapeTaperDimensions(shape);
  const taperDimensionMax = shapeDimensionLimit(workspace, shape.kind, DEFAULT_TAPER_DIMENSION_MAX);
  const taperProperties: ShapePropertyConfig[] = shapeIgnoresTaper ? [] : [
    {
      id: "topLength",
      label: t("prop.topLength"),
      value: taper.topDepth,
      min: MIN_SHAPE_SIZE,
      max: taperDimensionMax,
      onChange: (taperTopDepth) => onUpdate({ taperTopDepth, taperTopWidth: taper.topWidth, taperTopScale: undefined }),
    },
    {
      id: "topWidth",
      label: t("prop.topWidth"),
      value: taper.topWidth,
      min: MIN_SHAPE_SIZE,
      max: taperDimensionMax,
      onChange: (taperTopWidth) => onUpdate({ taperTopWidth, taperTopDepth: taper.topDepth, taperTopScale: undefined }),
    },
    {
      id: "bottomLength",
      label: t("prop.bottomLength"),
      value: taper.bottomDepth,
      min: MIN_SHAPE_SIZE,
      max: taperDimensionMax,
      onChange: (taperBottomDepth) => onUpdate({ taperBottomDepth, taperBottomWidth: taper.bottomWidth, taperBottomScale: undefined }),
    },
    {
      id: "bottomWidth",
      label: t("prop.bottomWidth"),
      value: taper.bottomWidth,
      min: MIN_SHAPE_SIZE,
      max: taperDimensionMax,
      onChange: (taperBottomWidth) => onUpdate({ taperBottomWidth, taperBottomDepth: taper.bottomDepth, taperBottomScale: undefined }),
    },
  ];
  /*
   * Twist and lean take the same shapes taper does - shapeIgnoresTaper
   * already answers that question, so this reuses it rather than asking
   * shapeSupportsExtrudeDeform a second time for the same shape.
   */
  const twistProperties: ShapePropertyConfig[] = shapeIgnoresTaper ? [] : [
    {
      id: "extrudeTwist",
      label: t("prop.twist"),
      value: shape.extrudeTwist ?? 0,
      min: -720,
      max: 720,
      step: 1,
      onChange: (extrudeTwist) => onUpdate({ extrudeTwist }),
    },
    {
      id: "extrudeTopOffsetX",
      label: t("prop.widthOffset"),
      value: shape.extrudeTopOffsetX ?? 0,
      min: -80,
      max: 80,
      step: 0.5,
      onChange: (extrudeTopOffsetX) => onUpdate({ extrudeTopOffsetX }),
    },
    {
      id: "extrudeTopOffsetZ",
      label: t("prop.lengthOffset"),
      value: shape.extrudeTopOffsetZ ?? 0,
      min: -80,
      max: 80,
      step: 0.5,
      onChange: (extrudeTopOffsetZ) => onUpdate({ extrudeTopOffsetZ }),
    },
  ];
  /*
   * Wo der Koerper steht, zum Eintippen: X und Y auf der Platte (die Mitte
   * seines Rahmens, mit denselben Vorzeichen wie die Masse auf der
   * Arbeitsflaeche), Z als Hoehe seiner Unterkante. Die Regler reichen so weit
   * wie das Ziehen, eine Plattengroesse ueber jeden Rand.
   */
  const reachX = workspace.width * 1.5;
  const reachY = workspace.depth * 1.5;
  // Up, the slider reaches as far as the plate does and the printer is high; any number can be typed (#425).
  const reachZ = positionReach(workspace, printerPresetById(workspace.printer)?.height);
  const positionProperties: RangePropertyConfig[] = [
    { id: "positionX", label: t("prop.positionX"), value: shape.x, min: -reachX, max: reachX, step: 0.5, onChange: (x) => onUpdate({ x }) },
    // Y counts towards the back, right-handed (#182); inside, z runs towards the viewer.
    { id: "positionY", label: t("prop.positionY"), value: displayY(shape.z), min: -reachY, max: reachY, step: 0.5, onChange: (y) => onUpdate({ z: insideZ(y) }) },
    { id: "positionZ", label: t("prop.positionZ"), value: shape.elevation ?? 0, min: -Math.max(180, reachZ), max: reachZ, step: 0.5, onChange: (elevation) => onUpdate({ elevation }) },
  ];
  // The body's turn about X, Y and Z, as it is drawn. A new angle turns it
  // about its centre, or about its own pivot if it has one.
  const turnTo = (patch: Pick<Partial<WorkplaneShape>, "rotation" | "rotationX" | "rotationZ">) => {
    const before = shapePivotWorld(shape);
    const turned = { ...shape, ...patch };
    const after = shapePivotWorld(turned);
    if (!before || !after) {
      onUpdate(patch);
      return;
    }
    onUpdate({
      ...patch,
      x: shape.x + before.x - after.x,
      z: shape.z + before.z - after.z,
      elevation: (shape.elevation ?? 0) + before.y - after.y,
    });
  };
  const rotationProperties: ShapePropertyConfig[] = [
    { id: "rotateX", label: t("prop.rotateX"), value: signedDegrees(shape.rotationX ?? 0), min: -180, max: 180, step: 1, onChange: (rotationX) => turnTo({ rotationX }) },
    // Named like the position: Y runs across the plate (depth), Z is up.
    { id: "rotateY", label: t("prop.rotateY"), value: signedDegrees(displayYTurn(shape.rotationZ ?? 0)), min: -180, max: 180, step: 1, onChange: (yTurn) => turnTo({ rotationZ: insideZTurn(yTurn) }) },
    { id: "rotateZ", label: t("prop.rotateZ"), value: signedDegrees(shape.rotation ?? 0), min: -180, max: 180, step: 1, onChange: (rotation) => turnTo({ rotation }) },
  ];
  // The pivot this body carries, in the same coordinates as its position.
  const pivot = shapePivotWorld(shape);
  const movePivot = (change: Partial<{ x: number; y: number; z: number }>) => {
    if (pivot) onUpdate({ rotationPivot: shapePivotFromWorld(shape, { ...pivot, ...change }) });
  };
  const pivotProperties: ShapePropertyConfig[] = pivot
    ? [
      { id: "pivotX", label: t("prop.pivotX"), value: pivot.x, min: -reachX, max: reachX, step: 0.5, onChange: (x) => movePivot({ x }) },
      { id: "pivotY", label: t("prop.pivotY"), value: displayY(pivot.z), min: -reachY, max: reachY, step: 0.5, onChange: (y) => movePivot({ z: insideZ(y) }) },
      { id: "pivotZ", label: t("prop.pivotZ"), value: pivot.y, min: -Math.max(180, reachZ), max: reachZ, step: 0.5, onChange: (y) => movePivot({ y }) },
    ]
    : [];
  const isSketchRevolve = shape.sketchOperation === "revolve" || Boolean(shape.sketchRevolve);
  // Docked at the right edge until its title bar is dragged; then it floats where it was dropped.
  const movable = useMovablePanel<HTMLElement>("layerling.editor.inspectorPosition", INSPECTOR_PANEL);
  const inspectorRef = movable.panelRef;
  const [propertiesOpen, setPropertiesOpen] = useInspectorCard("properties", true);
  const [textFillMoreOpen, setTextFillMoreOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useInspectorCard("position", false);
  // Where X and Y measure from (#973): the middle of the body, or its left and front edges, as the angle ruler's
  // corner does. Z is its bottom either way. Kept in this browser with the cards.
  const [positionAtEdge, setPositionAtEdge] = useInspectorCard("positionAtEdge", false);
  const edges = positionAtEdge && positionOpen ? meshAabb(shape) : null;
  const shownPositionProperties = edges
    ? positionProperties.map((property): RangePropertyConfig => {
        if (property.id === "positionX") {
          const offset = shape.x - edges.minX;
          return { ...property, label: t("prop.positionXEdge"), value: edges.minX, onChange: (x) => onUpdate({ x: x + offset }) };
        }
        if (property.id === "positionY") {
          // Y runs towards the back, so the front edge is the smaller Y.
          const front = Math.min(displayY(edges.minZ), displayY(edges.maxZ));
          const offset = displayY(shape.z) - front;
          return { ...property, label: t("prop.positionYEdge"), value: front, onChange: (y) => onUpdate({ z: insideZ(y + offset) }) };
        }
        return property;
      })
    : positionProperties;
  const [rotationOpen, setRotationOpen] = useInspectorCard("rotation", false);
  const [taperOpen, setTaperOpen] = useInspectorCard("taper", false);
  const [twistOpen, setTwistOpen] = useInspectorCard("twist", false);
  const [gearTeethOpen, setGearTeethOpen] = useInspectorCard("gearTeeth", true);
  const [vaseFormOpen, setVaseFormOpen] = useInspectorCard("vaseForm", true);
  const [vaseFloorOpen, setVaseFloorOpen] = useInspectorCard("vaseFloor", false);
  const [vasePartsOpen, setVasePartsOpen] = useInspectorCard("vaseParts", false);
  const [vasePrintOpen, setVasePrintOpen] = useInspectorCard("vasePrint", false);
  // The window to draw the vase in; another body selected closes it.
  const [vaseDrawOpen, setVaseDrawOpen] = useState(false);
  useEffect(() => setVaseDrawOpen(false), [shape.id]);
  const [threadOpen, setThreadOpen] = useInspectorCard("thread", true);
  const [gearHelixOpen, setGearHelixOpen] = useInspectorCard("gearHelix", true);
  const [colorOpen, setColorOpen] = useState(false);
  const { colors: recentColors, remember: rememberColor } = useRecentColors(SOLID_COLORS);
  const { colors: keptColors, toggle: toggleKeptColor } = useKeptColors();
  const [minimized, setMinimized] = useState(false);
  // The surface texture card opened from the toolbar is shown, not left in a folded panel.
  useEffect(() => {
    if (surfaceTextureOpen) setMinimized(false);
  }, [surfaceTextureOpen]);
  // Renaming here works like the pencil in the object list.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const commitName = () => {
    const name = nameDraft === null ? undefined : renamedShapeName(shape, nameDraft);
    if (name !== undefined) onUpdate({ name });
    setNameDraft(null);
  };

  useEffect(() => () => onInteractionActiveChange?.(false), [onInteractionActiveChange]);
  // The snap grid control belongs to the inspector only while it is docked and open.
  const snapGridAway = minimized || movable.moved;
  useEffect(() => {
    onSnapGridAwayChange?.(snapGridAway);
    return () => onSnapGridAwayChange?.(false);
  }, [snapGridAway, onSnapGridAwayChange]);
  useLayoutEffect(() => {
    inspectorRef.current?.scrollTo({ top: 0, left: 0 });
  }, [isSketchRevolve, shape.id]);
  useEffect(() => setNameDraft(null), [shape.id]);
  const editingName = nameDraft !== null;
  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  return (
    <SliderSnapContext.Provider value={snapGridStep(snap)}>
    <aside
      ref={inspectorRef}
      className={`shape-inspector ${isSketchRevolve ? "sketch-revolve-inspector" : ""} ${shape.kind === "gear" ? "gear-inspector" : ""} ${minimized ? "minimized" : ""} ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      aria-label={t("inspector.settingsFor", { name: displayShapeName(shape) })}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="shape-inspector-header movable" title={t("inspector.moveHint")} {...movable.handleProps}>
        <button
          className="inspector-header-icon"
          aria-label={minimized ? t("inspector.expand") : t("inspector.minimize")}
          aria-expanded={!minimized}
          onClick={() => setMinimized((current) => !current)}
        >
          {minimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <div className="inspector-name">
          {nameDraft !== null ? (
            <input
              ref={nameInputRef}
              className="inspector-name-input"
              value={nameDraft}
              aria-label={t("outliner.rename")}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitName();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setNameDraft(null);
                }
              }}
            />
          ) : (
            <>
              {/* One long word ("Schwalbenschwanz") cannot wrap; it gets a smaller size instead. */}
              <strong className={displayShapeName(shape).split(/\s+/).some((word) => word.length > 11) ? "long-word" : undefined}>{displayShapeName(shape)}</strong>
              <button className="inspector-rename-button" title={t("outliner.rename")} aria-label={t("outliner.rename")} onClick={() => setNameDraft(displayShapeName(shape))}>
                <Pencil size={14} />
              </button>
            </>
          )}
        </div>
        <div className="inspector-header-actions">
          <GuideHelpLink chapter={guideChapterForShape(shape)} section={guideSectionForShape(shape)} className="inspector-help-link" />
          <button className={locked ? "inspector-header-icon active" : "inspector-header-icon"} aria-label={locked ? t("outliner.unlock") : t("outliner.lock")} aria-keyshortcuts="Control+L" title={t("camera.shortcut", { label: locked ? t("outliner.unlock") : t("outliner.lock"), keys: "Ctrl+L" })} onClick={() => onUpdate({ locked: !locked })}>
            {locked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
          <button className={shape.hidden ? "inspector-header-icon active" : "inspector-header-icon"} aria-label={shape.hidden ? t("outliner.show") : t("outliner.hide")} aria-keyshortcuts="Control+H" title={t("camera.shortcut", { label: shape.hidden ? t("outliner.show") : t("outliner.hide"), keys: "Ctrl+H" })} onClick={() => onUpdate({ hidden: !shape.hidden })}>
            {shape.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {!minimized ? (
        <>
      {/* A name tag (#215): its card first and open; for a plain text the way there first. */}
      {nameTagStack && onLayerText && onTextTags ? (
        <NameTagCard
          key={`name-tag-${shape.id}`}
          shapeId={shape.id}
          stack={nameTagStack}
          workspace={workspace}
          disabled={locked}
          onLayerText={onLayerText}
          onTextTags={onTextTags}
          onInteractionActiveChange={onInteractionActiveChange}
        />
      ) : null}
      {shape.keyringTab && onFixKeyringTab ? <KeyringTabFixButton disabled={locked} onFix={onFixKeyringTab} /> : null}
      {shape.kind === "text" && onLayerText ? <MakeLayersButton disabled={locked} onLayerText={onLayerText} /> : null}
      {qrCode ? <QrCodeCard key={`qr-code-${shape.id}`} shapeId={shape.id} controls={qrCode} disabled={locked} /> : null}
      {referenceImage ? <ReferenceImageCard key={`reference-image-${shape.id}`} shapeId={shape.id} controls={referenceImage} workspace={workspace} locked={locked} onInteractionActiveChange={onInteractionActiveChange} /> : null}
      {iconTag?.isTag ? (
        <IconTagCard key={`icon-tag-${shape.id}`} shapeId={shape.id} controls={iconTag} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
      ) : iconTag ? (
        <MakeIconLayersButton disabled={locked} onLayer={iconTag.onLayer} />
      ) : null}
      {shape.groupOperation === "bundle" || !isNonSolidShape(shape) ? (
      <div className="shape-state-card" role="group" aria-label={t("inspector.shapeMode")}>
        <button
          className={!shape.hole ? "active solid-choice" : "solid-choice"}
          onClick={() => {
            const wasHole = Boolean(shape.hole);
            // Sending the colour too would paint it onto every part of a group or bundle and lose their own colours.
            onUpdate(shape.groupedShapes?.length ? { hole: false } : { hole: false, color: solidColor });
            setColorOpen((open) => (wasHole ? false : !open));
          }}
          disabled={locked}
          aria-pressed={!shape.hole}
          aria-expanded={colorOpen}
        >
          <span className="large-solid-swatch" style={{ "--swatch": solidColor } as CSSProperties} />
          <span>{t("inspector.solid")} <span className="key-hint">(S)</span></span>
        </button>
        <button
          className={shape.hole ? "active hole-choice" : "hole-choice"}
          onClick={() => {
            onUpdate({ hole: true });
            setColorOpen(false);
          }}
          disabled={locked}
          aria-pressed={shape.hole}
        >
          <span className="large-hole-swatch" />
          <span>{t("inspector.hole")} <span className="key-hint">(H)</span></span>
        </button>
        {/* Stays in place for a hole, only greyed out, so the card does not jump. */}
        <ToggleProperty
          label={`${t("inspector.transparent")} (T)`}
          value={Boolean(shape.transparent) && !shape.hole}
          disabled={locked || Boolean(shape.hole)}
          onChange={(transparent) => onUpdate({ transparent: transparent || undefined })}
        />
        {canToggleGroupColors(shape) ? (
          <ToggleProperty
            label={`${t("inspector.multicolor")} (Shift+M)`}
            value={groupShowsPartColors(shape)}
            disabled={locked}
            onChange={(multicolor) => onUpdate({ multicolor })}
          />
        ) : null}
      </div>
      ) : null}

      {colorOpen ? (
        <div className="color-card" aria-label={t("inspector.shapeColor")} data-help-section-all="colorCard">
          <div className="color-card-header">
            <span>{t("inspector.color")}</span>
            <span className="color-value">{solidColor.toUpperCase()}</span>
          </div>
          <div className="color-grid">
            {SOLID_COLORS.map((color) => (
              <button
                key={color}
                className={solidColor.toLowerCase() === color.toLowerCase() && !shape.hole ? "selected" : ""}
                type="button"
                style={{ "--shape-swatch": color } as CSSProperties}
                title={color.toUpperCase()}
                aria-label={t("aria.setColor", { color })}
                disabled={locked}
                onClick={() => {
                  onUpdate({ color, hole: false, ...singleColorPatch });
                  setColorOpen(false);
                }}
              />
            ))}
            <label className={locked ? "custom-color disabled" : "custom-color"} title={t("inspector.customColor")}>
              <CustomColorInput
                color={solidColor}
                disabled={locked}
                onCommit={(color) => {
                  onUpdate({ color, hole: false, ...singleColorPatch });
                  rememberColor(color);
                }}
                onInteractionActiveChange={onInteractionActiveChange}
              />
              <span>{t("inspector.custom")}</span>
            </label>
          </div>
          <ColorKeepRows
            recent={recentColors}
            kept={keptColors}
            current={shape.hole ? null : solidColor}
            palette={SOLID_COLORS}
            disabled={locked}
            isSelected={(color) => solidColor.toLowerCase() === color && !shape.hole}
            onPick={(color) => {
              onUpdate({ color, hole: false, ...singleColorPatch });
              if (!keptColors.includes(color)) rememberColor(color);
              setColorOpen(false);
            }}
            onToggleKeep={toggleKeptColor}
          />
        </div>
      ) : null}

      {shape.kind === "vase" ? (
        <button className="edit-sketch-button" type="button" disabled={locked} aria-pressed={vaseDrawOpen} onClick={() => setVaseDrawOpen((open) => !open)}>
          <Pencil size={17} strokeWidth={2.5} />
          <span>{t("inspector.vaseDraw")}</span>
        </button>
      ) : null}
      {shape.kind === "vase" && vaseDrawOpen ? (
        <VaseDrawingWindow shape={shape} disabled={locked} onUpdate={onUpdate} onInteractionActiveChange={onInteractionActiveChange} onClose={() => setVaseDrawOpen(false)} />
      ) : null}

      {shape.sketchProfile && onEditSketch ? (
        <button className="edit-sketch-button" type="button" disabled={locked} onClick={onEditSketch}>
          {t("inspector.editSketch")}
        </button>
      ) : null}

      {onOpenGroup ? (
        <button className="inspector-action-button" type="button" disabled={locked} onClick={onOpenGroup}>
          {t(shape.groupOperation === "bundle" ? "group.editBundle" : "group.edit")} (E)
        </button>
      ) : null}

      {canSeparateParts && onSeparateParts ? (
        <button className="inspector-action-button" type="button" disabled={locked} onClick={onSeparateParts}>
          <Split size={17} strokeWidth={2.5} />
          <span>{t("inspector.separateParts")}</span>
        </button>
      ) : null}

      {shape.groupOperation === "bundle" ? (
        <p className="inspector-bundle-note">{t(nameTagStack || iconTag?.isTag ? "nameTag.bundleNote" : "inspector.bundleNote")}</p>
      ) : null}

      {onWrapAroundCylinder ? (
        <CylinderWrapCard
          key={shape.id}
          shape={shape}
          workspace={workspace}
          disabled={locked}
          onWrap={onWrapAroundCylinder}
          onInteractionActiveChange={onInteractionActiveChange}
        />
      ) : null}

      {onSurfaceTexture ? (
        <SurfaceTextureCard
          key={`surface-${shape.id}`}
          shape={shape}
          workspace={workspace}
          disabled={locked}
          onApply={onSurfaceTexture}
          onRemove={onRemoveSurfaceTexture}
          open={surfaceTextureOpen}
          onOpenChange={onSurfaceTextureOpenChange}
          onInteractionActiveChange={onInteractionActiveChange}
          facePicking={surfaceFacePicking}
          pickedFaces={surfacePickedFaces}
          onFacePick={onSurfaceFacePick}
        />
      ) : null}

      {offersSurfaceTextureMask(shape) ? (
        <div className="property-card">
          <div className="property-list cylinder-wrap-body">
            <SelectProperty
              type="select"
              label={t("inspector.surfaceMask")}
              value={shape.surfaceTextureMask ?? "none"}
              options={(["none", ...SURFACE_TEXTURE_MASK_MODES] as const).map((value) => ({ value, label: t(SURFACE_TEXTURE_LABELS.mask[value]) }))}
              disabled={locked}
              // A mask is a helper one looks through: it turns transparent on the way.
              onChange={(value) => onUpdate(value === "none" ? { surfaceTextureMask: undefined } : { surfaceTextureMask: value as SurfaceTextureMaskMode, transparent: true })}
            />
            {shape.surfaceTextureMask ? (
              <p className="cylinder-wrap-hint">
                {t("inspector.surfaceMaskHint")}
                <GuideHelpLink section="surfaceTexture" className="inspector-help-link" />
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {onTextTags && shape.kind === "text" ? (
        <NameListCard key={`names-${shape.id}`} shapeId={shape.id} disabled={locked} onTextTags={onTextTags} onInteractionActiveChange={onInteractionActiveChange} />
      ) : null}

      {cylinderToEllipsePatch(shape) ? (
        <button
          className="inspector-action-button"
          type="button"
          disabled={locked}
          title={t("inspector.makeEllipseHint")}
          onClick={() => {
            const patch = cylinderToEllipsePatch(shape);
            if (patch) onUpdate(patch);
          }}
        >
          <span>{t("inspector.makeEllipse")}</span>
        </button>
      ) : null}

      {/* Every part of a plain shape's properties leads to the guide's section about them; the special shapes keep the answers of their own (#424). */}
      <div className={`property-card ${propertiesOpen ? "" : "collapsed"}`} data-help-section-all={guideSectionForShape(shape) === "shapeSettings" ? "shapeSettings" : undefined}>
        <button
          className="property-card-header"
          type="button"
          aria-expanded={propertiesOpen}
          aria-controls={`properties-${shape.id}`}
          onClick={() => setPropertiesOpen((open) => !open)}
        >
          <span>{t("inspector.properties")}</span>
          <ChevronUp className={propertiesOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
        </button>
        {propertiesOpen ? (
          <div className="property-list" id={`properties-${shape.id}`}>
            {gearType ? (
              <GearTypeSelector
                value={gearType}
                disabled={locked}
                onChange={(nextType) => {
                  // The module stays across the types (#201): a ring gear adds its rim round the same
                  // teeth, a rack lays them out straight with a 3 mm bar, a gear is module x (teeth + 2) again.
                  const profile = gearToothProfile({ gearType: nextType, gearProfile: shape.gearProfile });
                  if (!gearUsesModule(profile)) return onUpdate({ gearType: nextType });
                  const module = gearModuleOf(shape);
                  const rim = normalizeGearRim(shape.gearRim ?? DEFAULT_GEAR_RIM);
                  const next = gearSizeForModule(module, { ...shape, gearType: nextType, gearProfile: profile, gearRim: rim, depth: nextType === "rack" ? rackToothHeight(module, profile) + DEFAULT_GEAR_RIM : shape.depth }, shape.teeth);
                  onUpdate({
                    gearType: nextType,
                    gearProfile: profile,
                    gearPressureAngle: normalizeGearPressureAngle(shape.gearPressureAngle),
                    gearBacklash: shape.gearBacklash ?? DEFAULT_GEAR_BACKLASH,
                    gearRim: nextType === "internal" ? rim : shape.gearRim,
                    width: next.width,
                    depth: next.depth,
                    size: Math.max(next.width, next.depth),
                  });
                }}
              />
            ) : null}
            {threadRoleProperty ? (
              <IconOptionSelector
                label={t("inspector.threadRole")}
                columns={2}
                value={threadRoleProperty.value}
                disabled={locked}
                options={THREAD_ROLE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: t(option.label),
                  preview: <ThreadRolePreview role={option.value} />,
                }))}
                onChange={threadRoleProperty.onChange}
              />
            ) : null}
            {threadHeadProperty ? (
              <IconOptionSelector
                label={t("inspector.threadHead")}
                columns={3}
                value={threadHeadProperty.value}
                disabled={locked}
                options={THREAD_HEAD_OPTIONS.map((option) => ({
                  value: option.value,
                  label: t(option.label),
                  preview: <ThreadHeadPreview head={option.value} />,
                }))}
                onChange={threadHeadProperty.onChange}
              />
            ) : null}
            {onProportionLockChange && primaryProperties.some((property) => property.id === "height") && primaryProperties.some((property) => ["width", "length", "diameter", "outerDiameter"].includes(property.id)) ? (
              <ToggleProperty
                label={t("inspector.keepProportions")}
                value={proportionLock}
                disabled={locked}
                onChange={onProportionLockChange}
              />
            ) : null}
            {textFillMore.length ? (
              <>
                <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={primaryProperties.slice(0, textFillEnd)} defaults={propertyDefaults?.main} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
                {/* A text's rarer fill settings (#215) fold away under "More". */}
                <button className="name-tag-more" type="button" aria-expanded={textFillMoreOpen} onClick={() => setTextFillMoreOpen((open) => !open)}>
                  <ChevronDown className={textFillMoreOpen ? "open" : ""} size={15} strokeWidth={2.6} />
                  <span>{t(textFillMoreOpen ? "inspector.less" : "inspector.more")}</span>
                </button>
                {textFillMoreOpen ? (
                  <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={textFillMore} defaults={propertyDefaults?.main} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
                ) : null}
                <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={primaryProperties.slice(textFillEnd)} defaults={propertyDefaults?.main} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
              </>
            ) : (
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={primaryProperties} defaults={propertyDefaults?.main} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            )}
            {tiltedMeasures && primaryProperties.some((property) => ["width", "length", "height"].includes(property.id)) ? (
              <p className="cylinder-wrap-hint">{t("prop.tiltedMeasures")}</p>
            ) : null}
            {onShapeDefaultsChange && propertyDefaults ? (
              <div className="property-defaults-actions">
                <button type="button" disabled={locked || sameDefaults} title={t("inspector.saveDefaultsHint")} onClick={() => onShapeDefaultsChange(shape.kind, defaultsToSave)}>
                  {t("inspector.saveDefaults")}
                </button>
                <button type="button" disabled={!savedDefaults || Object.keys(savedDefaults).length === 0} title={t("inspector.resetDefaultsHint")} onClick={() => onShapeDefaultsChange(shape.kind, null)}>
                  {t("inspector.resetDefaults")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {shape.kind === "gridfinity" ? (
        <GridfinityCompartmentsCard shape={shape} workspace={workspace} locked={locked} defaults={propertyDefaults?.compartments} onUpdate={onUpdate} onInteractionActiveChange={onInteractionActiveChange} />
      ) : null}
      <div className={`property-card ${positionOpen ? "" : "collapsed"}`}>
        <button
          className="property-card-header"
          type="button"
          aria-expanded={positionOpen}
          aria-controls={`position-${shape.id}`}
          onClick={() => setPositionOpen((open) => !open)}
        >
          <span>{t("inspector.position")}</span>
          <ChevronUp className={positionOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
        </button>
        {positionOpen ? (
          <div className="property-list" id={`position-${shape.id}`}>
            <div className="name-tag-sides position-from" role="radiogroup" aria-label={t("inspector.positionFrom")}>
              <span>{t("inspector.positionFrom")}</span>
              {([false, true] as const).map((atEdge) => (
                <button key={String(atEdge)} type="button" role="radio" aria-checked={positionAtEdge === atEdge} className={positionAtEdge === atEdge ? "active" : ""} onClick={() => setPositionAtEdge(atEdge)}>
                  {t(atEdge ? "inspector.positionEdge" : "inspector.positionCentre")}
                </button>
              ))}
            </div>
            {/* A formula is written for the middle; at the edges the fields take plain numbers. */}
            <ShapePropertyRows formulas={edges ? undefined : shape.formulas} onFormula={edges ? undefined : noteFormula} properties={shownPositionProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            {pivot ? (
              <>
                <div className="property-subheading">
                  <span>{t("inspector.pivot")}</span>
                  <button type="button" className="property-subheading-action" disabled={locked} onClick={() => onUpdate({ rotationPivot: undefined })}>
                    {t("inspector.pivotRemove")}
                  </button>
                </div>
                <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={pivotProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={`property-card ${rotationOpen ? "" : "collapsed"}`} data-help-section-all="rotating">
        <button
          className="property-card-header"
          type="button"
          aria-expanded={rotationOpen}
          aria-controls={`rotation-${shape.id}`}
          onClick={() => setRotationOpen((open) => !open)}
        >
          <span>{t("inspector.rotation")}</span>
          <ChevronUp className={rotationOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
        </button>
        {rotationOpen ? (
          <div className="property-list" id={`rotation-${shape.id}`}>
            <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={rotationProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
          </div>
        ) : null}
      </div>
      {shape.kind === "bentTube" ? (
        <BentTubeSegmentsCard
          shape={shape}
          workspace={workspace}
          locked={locked}
          onUpdate={onUpdate}
          onInteractionActiveChange={onInteractionActiveChange}
          onSegmentChange={onBentTubeSegmentChange}
        />
      ) : null}
      {showTaperCards ? (
        <div className={`property-card ${taperOpen ? "" : "collapsed"}`} data-help-section-all="shapeSettings">
          <button
            className="property-card-header"
            type="button"
            aria-expanded={taperOpen}
            aria-controls={`taper-${shape.id}`}
            onClick={() => setTaperOpen((open) => !open)}
          >
            <span>{t("inspector.taper")}</span>
            <ChevronUp className={taperOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {taperOpen ? (
            <div className="property-list" id={`taper-${shape.id}`}>
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={taperProperties} defaults={propertyDefaults?.taper} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      {showTaperCards ? (
        <div className={`property-card ${twistOpen ? "" : "collapsed"}`} data-help-section-all="shapeSettings">
          <button
            className="property-card-header"
            type="button"
            aria-expanded={twistOpen}
            aria-controls={`twist-${shape.id}`}
            onClick={() => setTwistOpen((open) => !open)}
          >
            <span>{t("inspector.twist")}</span>
            <ChevronUp className={twistOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {twistOpen ? (
            <div className="property-list" id={`twist-${shape.id}`}>
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={twistProperties} defaults={propertyDefaults?.twist} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      {isThread ? (
        <div className={`property-card ${threadOpen ? "" : "collapsed"}`}>
          <button
            className="property-card-header"
            type="button"
            aria-expanded={threadOpen}
            aria-controls={`thread-${shape.id}`}
            onClick={() => setThreadOpen((open) => !open)}
          >
            <span>{t("inspector.thread")}</span>
            <ChevronUp className={threadOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {threadOpen ? (
            <div className="property-list" id={`thread-${shape.id}`}>
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={threadProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      {shape.kind === "vase" ? (
        <>
          <div className={`property-card ${vaseFormOpen ? "" : "collapsed"}`}>
            <button className="property-card-header" type="button" aria-expanded={vaseFormOpen} aria-controls={`vase-form-${shape.id}`} onClick={() => setVaseFormOpen((open) => !open)}>
              <span>{t("inspector.vaseForm")}</span>
              <ChevronUp className={vaseFormOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
            </button>
            {vaseFormOpen ? (
              <div className="property-list" id={`vase-form-${shape.id}`}>
                <ShapePropertyRows properties={vaseFormProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
              </div>
            ) : null}
          </div>
          <div className={`property-card ${vaseFloorOpen ? "" : "collapsed"}`}>
            <button className="property-card-header" type="button" aria-expanded={vaseFloorOpen} aria-controls={`vase-floor-${shape.id}`} onClick={() => setVaseFloorOpen((open) => !open)}>
              <span>{t("inspector.vaseFloor")}</span>
              <ChevronUp className={vaseFloorOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
            </button>
            {vaseFloorOpen ? (
              <div className="property-list" id={`vase-floor-${shape.id}`}>
                <ShapePropertyRows properties={vaseFloorProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
              </div>
            ) : null}
          </div>
          <div className={`property-card ${vasePartsOpen ? "" : "collapsed"}`}>
            <button className="property-card-header" type="button" aria-expanded={vasePartsOpen} aria-controls={`vase-parts-${shape.id}`} onClick={() => setVasePartsOpen((open) => !open)}>
              <span>{t("inspector.vaseParts")}</span>
              <ChevronUp className={vasePartsOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
            </button>
            {vasePartsOpen ? (
              <div className="property-list" id={`vase-parts-${shape.id}`}>
                <ShapePropertyRows properties={vasePartProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
                {onVaseAccessories ? (
                  <>
                    <p className="cylinder-wrap-hint">{t("inspector.vasePartsHint")}</p>
                    <button className="inspector-action-button" type="button" disabled={locked} onClick={onVaseAccessories}>
                      <Plus size={17} strokeWidth={2.5} />
                      <span>{t("inspector.vasePartsMake")}</span>
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className={`property-card ${vasePrintOpen ? "" : "collapsed"}`}>
            <button className="property-card-header" type="button" aria-expanded={vasePrintOpen} aria-controls={`vase-print-${shape.id}`} onClick={() => setVasePrintOpen((open) => !open)}>
              <span>{t("inspector.vasePrint")}</span>
              <ChevronUp className={vasePrintOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
            </button>
            {vasePrintOpen ? (
              <div className="property-list" id={`vase-print-${shape.id}`}>
                <ShapePropertyRows properties={vasePrintProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
                <VasePrintReport shape={shape} />
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      {shape.kind === "gear" ? (
        <div className={`property-card ${gearTeethOpen ? "" : "collapsed"}`}>
          <button
            className="property-card-header"
            type="button"
            aria-expanded={gearTeethOpen}
            aria-controls={`gear-teeth-${shape.id}`}
            onClick={() => setGearTeethOpen((open) => !open)}
          >
            <span>{t("inspector.teeth")}</span>
            <ChevronUp className={gearTeethOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {gearTeethOpen ? (
            <div className="property-list" id={`gear-teeth-${shape.id}`}>
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={gearTeethProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      {gearTypeHasHelix(gearType ?? undefined) ? (
        <div className={`property-card ${gearHelixOpen ? "" : "collapsed"}`}>
          <button
            className="property-card-header"
            type="button"
            aria-expanded={gearHelixOpen}
            aria-controls={`gear-helix-${shape.id}`}
            onClick={() => setGearHelixOpen((open) => !open)}
          >
            <span>{t("inspector.helix")}</span>
            <ChevronUp className={gearHelixOpen ? "" : "collapsed"} size={25} strokeWidth={2.8} />
          </button>
          {gearHelixOpen ? (
            <div className="property-list" id={`gear-helix-${shape.id}`}>
              <ShapePropertyRows formulas={shape.formulas} onFormula={noteFormula} properties={gearHelixProperties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
            </div>
          ) : null}
        </div>
      ) : null}
      {!movable.moved ? (
        <div className="inspector-snap-dock">
          <SnapGridControl units={workspace.units} onUnitsChange={onUnitsChange} customGrids={workspace.customSnapGrids} snap={snap} snapOpen={snapOpen} onSnapChange={onSnapChange} onSnapOpenChange={onSnapOpenChange} objectSnap={workspace.objectSnap} onObjectSnapChange={onObjectSnapChange} />
        </div>
      ) : null}
        </>
      ) : null}
    </aside>
    </SliderSnapContext.Provider>
  );
}

/**
 * The chain of segments of a bent tube. One segment is edited at a time; the
 * sliders are the same range rows as everywhere else, so a drag shows a live
 * preview and ends in a single undo step.
 */
export type TextLayerPatch = { text?: string; font?: string; letterSize?: number; /** Letters stacked top to bottom (#981). */ vertical?: boolean; layers?: TextLayer[]; keyring?: NameTagKeyring | null; /** "Free" (#598): the hole comes off the tag and a key ring tab of its own is put beside it. */ keyringTab?: boolean };

/**
 * A key ring tab of its own (#598): once it is in place, one click fixes it to the nearest tag
 * where it is, so the hole goes through the tag's layers and the ear stays with the tag.
 */
function KeyringTabFixButton({ disabled, onFix }: { disabled: boolean; onFix: () => void }) {
  return (
    <div className="name-tag-start">
      <button className="inspector-action-button name-tag-start-button" type="button" disabled={disabled} onClick={onFix}>
        <Link2 size={17} strokeWidth={2.5} />
        <span>{t("nameTag.keyringTabFix")}</span>
      </button>
      <p className="name-tag-hint">{t("nameTag.keyringTabFixHint")}</p>
    </div>
  );
}

/**
 * A plain text's way to a name tag (#215), first in its settings so a beginner finds it: one
 * click splits it into a name tag's layers, at a name tag's letter size - as the library's Name tag.
 */
function MakeLayersButton({ disabled, onLayerText }: { disabled: boolean; onLayerText: (patch: TextLayerPatch) => void }) {
  return (
    <div className="name-tag-start">
      <button className="inspector-action-button name-tag-start-button" type="button" disabled={disabled} onClick={() => onLayerText({ layers: [...NAME_TAG_LAYERS], letterSize: NAME_TAG_LETTER_SIZE })}>
        <Layers size={17} strokeWidth={2.5} />
        <span>{t("nameTag.makeLayers")}</span>
      </button>
      <p className="name-tag-hint">
        {t("nameTag.makeLayersHint")}
        <GuideHelpLink chapter="text" section="textLayers" className="inspector-help-link" />
      </p>
    </div>
  );
}

/**
 * A measure in a narrow table cell (#215): a text field read as the other measure fields are, in
 * the chosen unit, set on Enter or on leaving it; the arrow keys step it by a tenth at once.
 */
function CompactMeasureField({ label, value, min, max, workspace, disabled, onChange, onInteractionActiveChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  workspace: WorkplaneWorkspaceSettings;
  disabled?: boolean;
  onChange: (value: number) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const holdInteraction = useInteractionHold(onInteractionActiveChange);
  const step = displayStepFromMillimeters(0.1, workspace);
  const shown = formatPropertyNumber(millimetersToDisplay(value, workspace), workspace.accuracy, step);
  const [draft, setDraft] = useState<string | null>(null);
  const set = (display: number) => onChange(clamp(displayToMillimeters(display, workspace), min, max));
  const commit = () => {
    holdInteraction(false);
    if (draft === null) return;
    setDraft(null);
    const parsed = parseMeasurementInput(draft);
    if (draft !== shown && Number.isFinite(parsed)) set(parsed);
  };
  return (
    <input
      className="name-tag-measure"
      type="text"
      inputMode="decimal"
      aria-label={label}
      title={label}
      value={draft ?? shown}
      disabled={disabled}
      onFocus={(event) => {
        holdInteraction(true);
        setDraft(shown);
        selectWholeValue(event.currentTarget);
      }}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraft(shown);
          event.currentTarget.blur();
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const next = millimetersToDisplay(value, workspace) + (event.key === "ArrowUp" ? step : -step);
          set(next);
          setDraft(formatPropertyNumber(millimetersToDisplay(clamp(displayToMillimeters(next, workspace), min, max), workspace), workspace.accuracy, step));
        }
      }}
    />
  );
}

/**
 * The name list (#215): one name per line, up to 100, and the button that makes a tag of each,
 * NAME_TAG_GAP apart - no gap to set, one field less.
 */
function NameListFields({ disabled, onTextTags, onInteractionActiveChange }: {
  disabled: boolean;
  onTextTags: (names: string[], gap: number) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [names, setNames] = useState("");
  const nameList = namesFromList(names);
  return (
    <>
      <label className="text-layers-names">
        <span>{t("textLayers.names")}</span>
        <textarea
          value={names}
          rows={4}
          placeholder={t("textLayers.namesPlaceholder")}
          disabled={disabled}
          onChange={(event) => setNames(event.currentTarget.value)}
          onFocus={() => onInteractionActiveChange?.(true)}
          onBlur={() => onInteractionActiveChange?.(false)}
        />
        <small>{t("textLayers.namesHint")}</small>
      </label>
      <button className="inspector-action-button" type="button" disabled={disabled || nameList.length === 0} onClick={() => onTextTags(nameList, NAME_TAG_GAP)}>
        <Tags size={17} strokeWidth={2.5} />
        <span>{nameList.length === 0 ? t("nameTag.makeTagsNone") : nameList.length === 1 ? t("nameTag.makeTagsOne") : t("nameTag.makeTags", { count: nameList.length })}</span>
      </button>
    </>
  );
}

/** A plain text keeps the name list (#215): a tag of the text per name, folded away below. */
function NameListCard({ shapeId, disabled, onTextTags, onInteractionActiveChange }: {
  shapeId: string;
  disabled: boolean;
  onTextTags: (names: string[], gap: number) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`property-card ${open ? "" : "collapsed"}`}>
      <button className="property-card-header" type="button" aria-expanded={open} aria-controls={`name-list-${shapeId}`} onClick={() => setOpen((current) => !current)}>
        <span>{t("textLayers.names")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <div className="property-list text-layers-body" id={`name-list-${shapeId}`}>
          <NameListFields disabled={disabled} onTextTags={onTextTags} onInteractionActiveChange={onInteractionActiveChange} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The rows of a layered tag (#215), a name tag's or an icon tag's: one per layer from the top down -
 * colour, how much wider than the top, its corners, height, without holes - with "+" and "–".
 * The top row is the letters or the icon themselves and has no width or corners of its own.
 */
function LayerRows({ layers, firstLabel, workspace, disabled, onChange, onInteractionActiveChange }: {
  layers: TextLayer[];
  firstLabel: string;
  workspace: WorkplaneWorkspaceSettings;
  disabled: boolean;
  onChange: (layers: TextLayer[]) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const unit = lengthDisplayUnit(workspace).label;
  const writeLayers = onChange;
  const changeLayer = (index: number, changes: Partial<TextLayer>) => writeLayers(layers.map((entry, position) => (position === index ? { ...entry, ...changes } : entry)));
  const layerName = (index: number) => (index === 0 ? firstLabel : t("textLayers.layer", { number: index + 1 }));
  return (
    <>
      <div className="name-tag-layers-heading">
        <span>{t("nameTag.layers")}</span>
        <span className="name-tag-stepper">
          <button type="button" aria-label={t("nameTag.removeLayer")} title={t("nameTag.removeLayer")} disabled={disabled || layers.length <= MIN_NAME_TAG_LAYERS} onClick={() => writeLayers(removeTextLayer(layers))}>
            <Minus size={16} strokeWidth={2.8} />
          </button>
          <output aria-label={t("nameTag.layers")}>{layers.length}</output>
          <button type="button" aria-label={t("nameTag.addLayer")} title={t("nameTag.addLayer")} disabled={disabled || layers.length >= MAX_TEXT_LAYERS} onClick={() => writeLayers(addTextLayer(layers))}>
            <Plus size={16} strokeWidth={2.8} />
          </button>
        </span>
      </div>
      <div className="name-tag-layers" role="table" aria-label={t("nameTag.layers")}>
        <div className="name-tag-layer name-tag-layer-head" role="row">
          <span role="columnheader">{t("nameTag.color")}</span>
          <span role="columnheader">{t("nameTag.wider", { unit })}</span>
          <span role="columnheader">{t("nameTag.corners")}</span>
          <span role="columnheader">{t("nameTag.height", { unit })}</span>
          <span role="columnheader">{t("nameTag.noHoles")}</span>
        </div>
        {layers.map((layer, index) => (
          <div className="name-tag-layer" role="row" key={index} data-layer={index + 1}>
            <label className="name-tag-swatch" role="cell" style={{ "--swatch": layer.color } as CSSProperties} title={`${layerName(index)}: ${t("nameTag.color")}`}>
              <CustomColorInput color={layer.color} disabled={disabled} onCommit={(color) => changeLayer(index, { color })} onInteractionActiveChange={onInteractionActiveChange} />
            </label>
            <span role="cell">
              {index === 0 ? (
                <span className="name-tag-letters">{firstLabel}</span>
              ) : (
                <CompactMeasureField label={`${layerName(index)}: ${t("nameTag.wider", { unit })}`} value={layer.grow} min={0} max={MAX_TEXT_LAYER_GROW} workspace={workspace} disabled={disabled} onChange={(grow) => changeLayer(index, { grow })} onInteractionActiveChange={onInteractionActiveChange} />
              )}
            </span>
            <span role="cell">
              {/* How the wider outline goes round the corners of the letters; the letters themselves have none. */}
              {index === 0 ? null : (
                <select
                  className="name-tag-corner"
                  aria-label={`${layerName(index)}: ${t("nameTag.corners")}`}
                  title={`${layerName(index)}: ${t("nameTag.corners")}`}
                  value={layer.join ?? "round"}
                  disabled={disabled}
                  onChange={(event) => {
                    const join = event.currentTarget.value;
                    changeLayer(index, { join: join === "bevel" || join === "miter" ? join : undefined });
                  }}
                >
                  {(["round", "bevel", "miter"] as const).map((join) => (
                    <option key={join} value={join}>{t(`nameTag.corner.${join}`)}</option>
                  ))}
                </select>
              )}
            </span>
            <span role="cell">
              <CompactMeasureField label={`${layerName(index)}: ${t("nameTag.height", { unit })}`} value={layer.height} min={MIN_TEXT_LAYER_HEIGHT} max={40} workspace={workspace} disabled={disabled} onChange={(height) => changeLayer(index, { height })} onInteractionActiveChange={onInteractionActiveChange} />
            </span>
            <span role="cell" className="name-tag-check">
              <input type="checkbox" aria-label={`${layerName(index)}: ${t("nameTag.noHoles")}`} checked={Boolean(layer.silhouette)} disabled={disabled} onChange={(event) => changeLayer(index, { silhouette: event.currentTarget.checked || undefined })} />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * The name tag (#215): a layered text's card, open and first. Words, font and letter size; every
 * layer in a row of its own - colour, how much wider than the letters, height, without holes -
 * with "+" and "–" and, for a wider layer, its corners; the key ring hole; the name list. Every
 * change builds the stack again.
 */
function NameTagCard({
  shapeId,
  stack,
  workspace,
  disabled,
  onLayerText,
  onTextTags,
  onInteractionActiveChange,
}: {
  shapeId: string;
  stack: NameTagStack;
  workspace: WorkplaneWorkspaceSettings;
  disabled: boolean;
  onLayerText: (patch: TextLayerPatch) => void;
  onTextTags: (names: string[], gap: number) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const { source, layers, keyring } = stack;
  const writeLayers = (next: TextLayer[]) => onLayerText({ layers: next });
  const changeLayer = (index: number, changes: Partial<TextLayer>) => writeLayers(layers.map((entry, position) => (position === index ? { ...entry, ...changes } : entry)));
  const properties: ShapePropertyConfig[] = [
    { type: "text", id: "nameTagText", label: t("prop.text"), value: source.text ?? "TEXT", onChange: (text) => onLayerText({ text: text.slice(0, 24) || " " }) },
    textFontProperty(source, (patch) => { if (typeof patch.font === "string") onLayerText({ font: patch.font }); }),
    { id: "letterSize", label: t("nameTag.letterSize"), value: textLetterSize(source), min: MIN_LETTER_SIZE, max: 60, step: 0.5, hint: t("nameTag.letterSizeHint"), onChange: (letterSize) => onLayerText({ letterSize }) },
    ...(source.textCurved ? [] : [{ type: "toggle", id: "nameTagVertical", label: t("prop.textVertical"), value: Boolean(source.textVertical), onChange: (vertical: boolean) => onLayerText({ vertical }) } satisfies ShapePropertyConfig]),
  ];

  return (
    <div className={`property-card name-tag-card ${open ? "" : "collapsed"}`}>
      <button className="property-card-header" type="button" aria-expanded={open} aria-controls={`name-tag-${shapeId}`} onClick={() => setOpen((current) => !current)}>
        <span>{t("nameTag.title")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <p className="name-tag-hint">
          {t("nameTag.cardHint")}
          <GuideHelpLink chapter="text" section="textLayers" className="inspector-help-link" />
        </p>
      ) : null}
      {open ? (
        <div className="property-list text-layers-body name-tag-body" id={`name-tag-${shapeId}`}>
          <ShapePropertyRows properties={properties} workspace={workspace} disabled={disabled} onInteractionActiveChange={onInteractionActiveChange} />
          <LayerRows layers={layers} firstLabel={t("nameTag.letters")} workspace={workspace} disabled={disabled} onChange={writeLayers} onInteractionActiveChange={onInteractionActiveChange} />
          {/* The top edge of the letters (#225): a printed tag's letters on top are finished, not cut square. */}
          <div className="name-tag-sides name-tag-edge" role="radiogroup" aria-label={t("nameTag.letterEdge")}>
            <span>{t("nameTag.letterEdge")}</span>
            {(["none", "round", "chamfer"] as const).map((kind) => {
              const active = (layers[0]?.edge?.kind ?? "none") === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={active ? "active" : ""}
                  disabled={disabled || !layers.length}
                  onClick={() => changeLayer(0, { edge: kind === "none" ? undefined : { kind, size: layers[0]?.edge?.size ?? Math.min(0.4, layers[0].height) } })}
                >
                  {t(`nameTag.edge.${kind}`)}
                </button>
              );
            })}
          </div>
          {layers[0]?.edge ? (
            <RangeProperty
              id="letterEdgeSize"
              label={t("nameTag.letterEdgeSize")}
              value={layers[0].edge.size}
              min={MIN_TEXT_EDGE}
              max={Math.max(MIN_TEXT_EDGE, Math.min(MAX_TEXT_EDGE, layers[0].height))}
              step={0.05}
              workspace={workspace}
              disabled={disabled}
              onChange={(size) => changeLayer(0, { edge: { kind: layers[0].edge!.kind, size } })}
              onInteractionActiveChange={onInteractionActiveChange}
            />
          ) : null}
          <ToggleProperty
            label={t("nameTag.keyring")}
            value={Boolean(keyring)}
            disabled={disabled || Boolean(source.textCurved)}
            onChange={(on) => onLayerText({ keyring: on ? { side: "left", diameter: DEFAULT_KEYRING_DIAMETER } : null })}
          />
          {keyring ? (
            <>
              <RangeProperty id="keyringDiameter" label={t("nameTag.keyringDiameter")} value={keyring.diameter} min={MIN_KEYRING_DIAMETER} max={10} step={0.05} workspace={workspace} disabled={disabled} onChange={(diameter) => onLayerText({ keyring: { ...keyring, diameter } })} onInteractionActiveChange={onInteractionActiveChange} />
              <div className="name-tag-sides" role="radiogroup" aria-label={t("nameTag.keyringSide")}>
                <span>{t("nameTag.keyringSide")}</span>
                {TEXT_KEYRING_SIDES.map((side) => (
                  <button key={side} type="button" role="radio" aria-checked={!keyring.free && keyring.side === side} className={!keyring.free && keyring.side === side ? "active" : ""} disabled={disabled} onClick={() => onLayerText({ keyring: { side, diameter: keyring.diameter } })}>
                    {t(`nameTag.side.${side}`)}
                  </button>
                ))}
                <button type="button" role="radio" aria-checked={Boolean(keyring.free)} className={keyring.free ? "active" : ""} title={t("nameTag.side.freeHint")} disabled={disabled} onClick={() => onLayerText({ keyringTab: true })}>
                  {t("nameTag.side.free")}
                </button>
              </div>
              {/* A hole fixed freely (#598) stands where it was put, not on a side. */}
              {!keyring.free ? <KeyringAlongProperty keyring={keyring} limit={nameTagKeyringAlongLimit(source, layers, keyring)} workspace={workspace} disabled={disabled} onChange={(next) => onLayerText({ keyring: next })} onInteractionActiveChange={onInteractionActiveChange} /> : null}
            </>
          ) : null}
          <NameListFields disabled={disabled} onTextTags={onTextTags} onInteractionActiveChange={onInteractionActiveChange} />
        </div>
      ) : null}
    </div>
  );
}

/** What the icon tag card changes: the icon's width and the layers; the rest stays as it is. */
export type IconLayerPatch = { width?: number; layers?: TextLayer[]; keyring?: NameTagKeyring | null; /** "Free" (#598): the hole comes off the tag and a key ring tab of its own is put beside it. */ keyringTab?: boolean };

/**
 * The icon tag card's wiring: the stack as it stands, the build, the copies on the plate, and
 * the plate's size for "As many as fit". `isTag` is false for a plain sketch body, which gets
 * the way to an icon tag instead of the card.
 */
export type IconTagControls = {
  stack: IconLayerStack;
  isTag: boolean;
  plate: { width: number; depth: number };
  /** How much of the plate one tag takes, seen from above, as it stands. */
  footprint: { width: number; depth: number };
  onLayer: (patch: IconLayerPatch) => void;
  onCopies: (count: number) => void;
  /** Puts another SVG's icon on the tag, keeping its layers and width. */
  onReplaceSvg: (file: File) => Promise<void>;
};

/** The QR code card's wiring (#553): the settings the code was made with, and making it again with a new text. */
export type QrCodeControls = {
  settings: QrCodeSettings;
  onRegenerate: (text: string) => Promise<void>;
};

/**
 * The QR code card, open and first: the code's text, and "Make again" to build the code anew with
 * it - where it stands, as wide as it is now. The other choices stay as they were made.
 */
function QrCodeCard({ shapeId, controls, disabled }: { shapeId: string; controls: QrCodeControls; disabled: boolean }) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState(controls.settings.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setText(controls.settings.text), [controls.settings.text]);
  const fits = qrTextFits(text, controls.settings.errorCorrection);
  const capacity = QR_BYTE_CAPACITY[controls.settings.errorCorrection];
  const ready = Boolean(text) && fits && text !== controls.settings.text && !busy && !disabled;
  const regenerate = () => {
    if (!ready) return;
    setBusy(true);
    setError("");
    controls.onRegenerate(text)
      .catch((reason) => setError(reason instanceof Error ? localizedError(reason.message) : String(reason)))
      .finally(() => setBusy(false));
  };
  return (
    <div className={`property-card name-tag-card qr-code-card ${open ? "" : "collapsed"}`}>
      <button className="property-card-header" type="button" aria-expanded={open} aria-controls={`qr-code-${shapeId}`} onClick={() => setOpen((current) => !current)}>
        <span>{t("qrCode.title")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <p className="name-tag-hint">
          {t("qrCode.cardHint")}
          <GuideHelpLink chapter="text" section="qrCode" className="inspector-help-link" />
        </p>
      ) : null}
      {open ? (
        <div className="property-list name-tag-body" id={`qr-code-${shapeId}`}>
          <label className="qr-code-text">
            <span>{t("qrCode.text")}</span>
            <textarea
              rows={3}
              value={text}
              disabled={disabled || busy}
              aria-invalid={!fits}
              data-testid="qr-code-card-text"
              onChange={(event) => setText(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  regenerate();
                }
              }}
            />
            <small className={fits ? "" : "qr-code-warning"}>
              {fits ? t("qrCode.count", { used: qrByteLength(text), max: capacity }) : t("qrCode.tooLong", { used: qrByteLength(text), max: capacity })}
            </small>
          </label>
          <button className="inspector-action-button" type="button" disabled={!ready} onClick={regenerate}>
            <RefreshCw size={17} strokeWidth={2.5} />
            <span>{busy ? t("qrCode.building") : t("qrCode.regenerate")}</span>
          </button>
          {error ? <p className="name-tag-hint icon-tag-card-error" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Where calibrating a reference image stands (#680): waiting for the first or second click, or for the real distance. */
export type ReferenceImageCalibration = { step: "first" | "second" } | { step: "distance"; measured: number };

export type ReferenceImageControls = {
  /** How see-through the picture is, in per cent: 0 solid, 90 barely there. */
  seeThrough: number;
  onSeeThrough: (percent: number) => void;
  calibration: ReferenceImageCalibration | null;
  onCalibrate: () => void;
  onCalibrateDistance: (distance: number) => void;
  onCancelCalibration: () => void;
};

/**
 * The reference image card (#680), open and first: how see-through the picture is, and calibrating it
 * as in the sketch - two clicks on the picture and the real distance between them. Lock in the header
 * keeps it put and lets clicks through to the plate.
 */
function ReferenceImageCard({ shapeId, controls, workspace, locked, onInteractionActiveChange }: {
  shapeId: string;
  controls: ReferenceImageControls;
  workspace: WorkplaneWorkspaceSettings;
  locked: boolean;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const { calibration } = controls;
  const [distance, setDistance] = useState("");
  useEffect(() => {
    if (calibration?.step === "distance") setDistance(String(Math.round(calibration.measured * 100) / 100));
  }, [calibration]);
  const parsed = Number(distance.replace(",", "."));
  const ready = Number.isFinite(parsed) && parsed > 0;
  const apply = () => {
    if (ready) controls.onCalibrateDistance(parsed);
  };
  return (
    <div className={`property-card name-tag-card reference-image-card ${open ? "" : "collapsed"}`}>
      <button className="property-card-header" type="button" aria-expanded={open} aria-controls={`reference-image-${shapeId}`} onClick={() => setOpen((current) => !current)}>
        <span>{t("referenceImage.title")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <p className="name-tag-hint">
          {t(locked ? "referenceImage.lockedHint" : "referenceImage.cardHint")}
          <GuideHelpLink chapter="measuring" section="referenceImage" className="inspector-help-link" />
        </p>
      ) : null}
      {open ? (
        <div className="property-list name-tag-body" id={`reference-image-${shapeId}`}>
          <RangeProperty
            id="imageSeeThrough"
            label={t("referenceImage.seeThrough")}
            value={controls.seeThrough}
            min={0}
            max={90}
            step={1}
            workspace={workspace}
            disabled={locked}
            onChange={(value) => controls.onSeeThrough(Math.round(Math.min(90, Math.max(0, value))))}
            onInteractionActiveChange={onInteractionActiveChange}
          />
          {!calibration ? (
            <button className="inspector-action-button" type="button" disabled={locked} onClick={controls.onCalibrate}>
              <Ruler size={17} strokeWidth={2.5} />
              <span>{t("referenceImage.calibrate")}</span>
            </button>
          ) : calibration.step !== "distance" ? (
            <>
              <p className="name-tag-hint" role="status">{t(calibration.step === "first" ? "referenceImage.clickFirst" : "referenceImage.clickSecond")}</p>
              <button className="inspector-action-button" type="button" onClick={controls.onCancelCalibration}>
                <span>{t("common.cancel")}</span>
              </button>
            </>
          ) : (
            <>
              <p className="name-tag-hint" role="status">{t("referenceImage.measured", { mm: Math.round(calibration.measured * 100) / 100 })}</p>
              <label className="reference-image-distance">
                <span>{t("referenceImage.distance")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={distance}
                  autoFocus
                  aria-invalid={!ready}
                  data-testid="reference-image-distance"
                  onChange={(event) => setDistance(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      apply();
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      controls.onCancelCalibration();
                    }
                  }}
                />
              </label>
              <div className="reference-image-actions">
                <button className="inspector-action-button" type="button" disabled={!ready} onClick={apply}>
                  <Ruler size={17} strokeWidth={2.5} />
                  <span>{t("referenceImage.apply")}</span>
                </button>
                <button className="inspector-action-button" type="button" onClick={controls.onCancelCalibration}>
                  <span>{t("common.cancel")}</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** A sketch body's way to an icon tag, first in its settings: one click splits it into the start layers. */
function MakeIconLayersButton({ disabled, onLayer }: { disabled: boolean; onLayer: (patch: IconLayerPatch) => void }) {
  return (
    <div className="name-tag-start">
      <button className="inspector-action-button name-tag-start-button" type="button" disabled={disabled} onClick={() => onLayer({ layers: [...ICON_TAG_LAYERS] })}>
        <Layers size={17} strokeWidth={2.5} />
        <span>{t("nameTag.makeLayers")}</span>
      </button>
      <p className="name-tag-hint">
        {t("iconTag.makeLayersHint")}
        <GuideHelpLink chapter="text" section="iconTag" className="inspector-help-link" />
      </p>
    </div>
  );
}

/**
 * The icon tag card, open and first: the icon's width, the layers as the name tag has them, and
 * how many tags of it - typed in, or as many as fit on the plate - laid out on the plate's middle.
 */
/**
 * Where along its side the key ring tab sits (#671), in mm off the middle: up on the left and
 * right, to the right on top. The slider stays within the side, so the tab never leaves it.
 */
function KeyringAlongProperty({ keyring, limit, workspace, disabled, onChange, onInteractionActiveChange }: {
  keyring: NameTagKeyring;
  limit: number;
  workspace: WorkplaneWorkspaceSettings;
  disabled: boolean;
  onChange: (keyring: NameTagKeyring) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const reach = Math.max(0, Math.floor(limit * 10) / 10);
  const value = Math.min(reach, Math.max(-reach, keyring.along ?? 0));
  const change = (along: number) => {
    const { along: _along, ...rest } = keyring;
    const shift = Math.round(Math.min(reach, Math.max(-reach, along)) * 1000) / 1000;
    onChange(shift ? { ...rest, along: shift } : rest);
  };
  return (
    <RangeProperty
      id="keyringAlong"
      label={t("nameTag.keyringAlong")}
      hint={t(keyring.side === "top" ? "nameTag.keyringAlongHintTop" : "nameTag.keyringAlongHint")}
      value={value}
      min={-reach}
      max={reach}
      step={0.1}
      workspace={workspace}
      disabled={disabled || reach <= 0}
      onChange={change}
      onReset={value !== 0 ? () => change(0) : undefined}
      onInteractionActiveChange={onInteractionActiveChange}
    />
  );
}

function IconTagCard({ shapeId, controls, workspace, disabled, onInteractionActiveChange }: {
  shapeId: string;
  controls: IconTagControls;
  workspace: WorkplaneWorkspaceSettings;
  disabled: boolean;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const [count, setCount] = useState(1);
  const [fitNote, setFitNote] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [replaceError, setReplaceError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { stack, plate, onLayer, onCopies, onReplaceSvg } = controls;
  const replace = (file: File) => {
    setReplacing(true);
    setReplaceError("");
    onReplaceSvg(file)
      .catch((reason) => setReplaceError(reason instanceof Error ? localizedError(reason.message) : String(reason)))
      .finally(() => setReplacing(false));
  };
  const properties: ShapePropertyConfig[] = [
    { id: "iconWidth", label: t("iconTag.iconWidth"), value: stack.width, min: MIN_ICON_TAG_WIDTH, max: MAX_ICON_TAG_WIDTH, step: 0.5, hint: t("iconTag.iconWidthHint"), onChange: (width) => onLayer({ width }) },
    { id: "iconTagCount", label: t("iconTag.count"), value: count, min: 1, max: MAX_ICON_TAGS, step: 1, hint: t("iconTag.countHint"), onChange: (value) => { setFitNote(false); setCount(normalizeIconTagCount(value)); } },
  ];
  const fill = () => {
    const fits = iconTagFitCount(controls.footprint, plate);
    setFitNote(fits === 0);
    setCount(normalizeIconTagCount(Math.max(1, fits)));
  };
  return (
    <div className={`property-card name-tag-card icon-tag-card ${open ? "" : "collapsed"}`}>
      <button className="property-card-header" type="button" aria-expanded={open} aria-controls={`icon-tag-${shapeId}`} onClick={() => setOpen((current) => !current)}>
        <span>{t("iconTag.title")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <p className="name-tag-hint">
          {t("iconTag.cardHint")}
          <GuideHelpLink chapter="text" section="iconTag" className="inspector-help-link" />
        </p>
      ) : null}
      {open ? (
        <div className="property-list text-layers-body name-tag-body" id={`icon-tag-${shapeId}`}>
          <input
            ref={fileRef}
            type="file"
            accept={`.svg,image/svg+xml,${PICTURE_FILE_ACCEPT}`}
            hidden
            data-testid="icon-tag-replace-file"
            onChange={(event) => {
              const chosen = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (chosen) replace(chosen);
            }}
          />
          <button className="inspector-action-button" type="button" disabled={disabled || replacing} onClick={() => fileRef.current?.click()}>
            <FolderOpen size={17} strokeWidth={2.5} />
            <span>{replacing ? t("iconTag.building") : t("iconTag.replace")}</span>
          </button>
          {replaceError ? <p className="name-tag-hint icon-tag-card-error" role="alert">{replaceError}</p> : null}
          <ShapePropertyRows properties={properties.slice(0, 1)} workspace={workspace} disabled={disabled} onInteractionActiveChange={onInteractionActiveChange} />
          <LayerRows layers={stack.layers} firstLabel={t("iconTag.icon")} workspace={workspace} disabled={disabled} onChange={(layers) => onLayer({ layers })} onInteractionActiveChange={onInteractionActiveChange} />
          {/* The key ring hole as on the name tag (#391): its size and its side; the ear is on the bottom layer. */}
          <ToggleProperty
            label={t("nameTag.keyring")}
            value={Boolean(stack.keyring)}
            disabled={disabled}
            onChange={(on) => onLayer({ keyring: on ? { side: "left", diameter: DEFAULT_KEYRING_DIAMETER } : null })}
          />
          {stack.keyring ? (
            <>
              <RangeProperty id="keyringDiameter" label={t("nameTag.keyringDiameter")} value={stack.keyring.diameter} min={MIN_KEYRING_DIAMETER} max={10} step={0.05} workspace={workspace} disabled={disabled} onChange={(diameter) => onLayer({ keyring: { ...stack.keyring!, diameter } })} onInteractionActiveChange={onInteractionActiveChange} />
              <div className="name-tag-sides" role="radiogroup" aria-label={t("nameTag.keyringSide")}>
                <span>{t("nameTag.keyringSide")}</span>
                {TEXT_KEYRING_SIDES.map((side) => (
                  <button key={side} type="button" role="radio" aria-checked={!stack.keyring!.free && stack.keyring!.side === side} className={!stack.keyring!.free && stack.keyring!.side === side ? "active" : ""} disabled={disabled} onClick={() => onLayer({ keyring: { side, diameter: stack.keyring!.diameter } })}>
                    {t(`nameTag.side.${side}`)}
                  </button>
                ))}
                <button type="button" role="radio" aria-checked={Boolean(stack.keyring!.free)} className={stack.keyring!.free ? "active" : ""} title={t("nameTag.side.freeHint")} disabled={disabled} onClick={() => onLayer({ keyringTab: true })}>
                  {t("nameTag.side.free")}
                </button>
              </div>
              {!stack.keyring.free ? <KeyringAlongProperty
                keyring={stack.keyring}
                limit={iconKeyringAlongLimit(stack.source, stack.keyring.side, stack.keyring.diameter, stack.layers[stack.layers.length - 1]?.grow ?? 0, stack.width)}
                workspace={workspace}
                disabled={disabled}
                onChange={(next) => onLayer({ keyring: next })}
                onInteractionActiveChange={onInteractionActiveChange}
              /> : null}
            </>
          ) : null}
          <ShapePropertyRows properties={properties.slice(1)} workspace={workspace} disabled={disabled} onInteractionActiveChange={onInteractionActiveChange} />
          <button className="inspector-action-button" type="button" disabled={disabled} onClick={fill}>
            <Grid3x3 size={17} strokeWidth={2.5} />
            <span>{t("iconTag.fill")}</span>
          </button>
          {fitNote ? <p className="name-tag-hint" role="status">{t("iconTag.fitsNone")}</p> : null}
          <button className="inspector-action-button" type="button" disabled={disabled || count < 2} onClick={() => onCopies(count)}>
            <Tags size={17} strokeWidth={2.5} />
            <span>{t("iconTag.makeTags", { count })}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Wrapping a flat body around a cylinder (#106): the diameter of the wall,
 * outward or into the wall, and the button. Folded away until asked for, as
 * it is a step one takes once rather than a setting one tunes.
 */
function CylinderWrapCard({
  shape,
  workspace,
  disabled,
  onWrap,
  onInteractionActiveChange,
}: {
  shape: WorkplaneShape;
  workspace: WorkplaneWorkspaceSettings;
  disabled: boolean;
  onWrap: (diameter: number, inward: boolean) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  // A diameter the body just goes once around reads as the natural start; most
  // people then type the diameter of their cup or tube.
  const [diameter, setDiameter] = useState(() => Math.max(10, Math.round(shapeWidth(shape) / Math.PI * 1.25)));
  const [inward, setInward] = useState(false);
  return (
    <div className={`property-card ${open ? "" : "collapsed"}`}>
      <button
        className="property-card-header"
        type="button"
        aria-expanded={open}
        aria-controls={`cylinder-wrap-${shape.id}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{t("inspector.wrapCylinder")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <div className="property-list cylinder-wrap-body" id={`cylinder-wrap-${shape.id}`}>
          <RangeProperty
            id="diameter"
            label={t("inspector.wrapDiameter")}
            value={diameter}
            min={1}
            max={400}
            // Tenths of a millimetre: a cup is 63.5 across, not 63 or 64 (#274).
            step={0.1}
            workspace={workspace}
            disabled={disabled}
            onChange={setDiameter}
            onInteractionActiveChange={onInteractionActiveChange}
          />
          <ToggleProperty label={t("inspector.wrapInward")} value={inward} disabled={disabled} onChange={setInward} />
          <p className="cylinder-wrap-hint">
            {t(inward ? "inspector.wrapInwardHint" : "inspector.wrapHint")}
            <GuideHelpLink section="wrapCylinder" className="inspector-help-link" />
          </p>
          <button className="inspector-action-button" type="button" disabled={disabled} onClick={() => onWrap(diameter, inward)}>
            <Cylinder size={17} strokeWidth={2.5} />
            <span>{t("inspector.wrapApply")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** The shapes a bump can take, the half ball first. */
const BUMP_SHAPES = ["dome", "pointed", "round", "flat"] as const;

/** What the spacing and the width are called where they mean something else than a groove's. */
const SURFACE_SPACING_LABEL: Partial<Record<SurfaceTexturePattern, MessageKey>> = {
  cells: "inspector.surfaceSpacingCells",
  bricks: "inspector.surfaceSpacingBricks",
  knit: "inspector.surfaceSpacingKnit",
  rope: "inspector.surfaceSpacingRope",
  weave: "inspector.surfaceSpacingWeave",
  carbon: "inspector.surfaceSpacingCarbon",
  bark: "inspector.surfaceSpacingBark",
  grain: "inspector.surfaceSpacingGrain",
  image: "inspector.surfaceSpacingImage",
};
const SURFACE_COVERAGE_LABEL: Partial<Record<SurfaceTexturePattern, MessageKey>> = {
  cells: "inspector.surfaceCoverageCells",
  knit: "inspector.surfaceCoverageKnit",
  rope: "inspector.surfaceCoverageRope",
  weave: "inspector.surfaceCoverageWeave",
  carbon: "inspector.surfaceCoverageCarbon",
};

/**
 * The settings when another pattern is chosen. A pattern with values of its own to start from (cells, knitting, rope,
 * weave, grain, an image) gets them, and leaving one gives the next the plain defaults back, so a knitted stitch's 5 mm
 * do not become knurling's spacing. Bumps start as half balls: the V the grooves have by default would make them cones.
 */
function surfaceSettingsForPattern(current: SurfaceTextureSettings, pattern: SurfaceTexturePattern): Partial<SurfaceTextureSettings> {
  const leaving = current.pattern === "bumps" ? null : SURFACE_TEXTURE_STARTERS[current.pattern];
  // A bark brings its own size and depth: leaving it gives them back too.
  const leavingKeys = [...Object.keys(leaving ?? {}), ...(current.pattern === "bark" ? ["spacing", "depth"] : [])];
  const reset = Object.fromEntries(leavingKeys.map((key) => [key, SURFACE_TEXTURE_DEFAULTS[key as keyof SurfaceTextureSettings]]));
  const starter = pattern === "bumps" ? (current.profile === "pointed" ? { profile: "dome" as const } : {}) : SURFACE_TEXTURE_STARTERS[pattern] ?? {};
  const tile = pattern === "image" ? { spacing: surfaceTextureImageTile(current.image), tileHeight: 0 } : {};
  const own = pattern === "bark" ? { spacing: BARK_STARTS[current.barkType].spacing, depth: BARK_STARTS[current.barkType].depth } : pattern === "wood" ? { ringWidth: WOOD_RINGS[current.woodType] } : {};
  return { ...reset, ...starter, ...tile, ...own, pattern };
}

/** A picture file as one's own image for the texture: drawn small (SURFACE_TEXTURE_OWN_IMAGE_SIZE) and turned grey. */
async function surfaceImageFromFile(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const picture = new Image();
    picture.src = url;
    await picture.decode();
    // A drawing without a size of its own (an SVG) is drawn as large as one's image may be.
    const width = picture.naturalWidth || SURFACE_TEXTURE_OWN_IMAGE_SIZE, height = picture.naturalHeight || SURFACE_TEXTURE_OWN_IMAGE_SIZE;
    const scale = Math.min(1, SURFACE_TEXTURE_OWN_IMAGE_SIZE / Math.max(width, height));
    const w = Math.max(2, Math.round(width * scale)), h = Math.max(2, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.drawImage(picture, 0, 0, w, h);
    return surfaceTextureOwnImage(context.getImageData(0, 0, w, h).data, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * A surface texture on this body: the pattern, where it goes, and the button. Folded away until
 * asked for, like wrapping: a step one takes, and undo takes it back. The card keeps its
 * settings through that undo, so the next try starts from the last one.
 */
export function SurfaceTextureCard({
  shape,
  workspace,
  disabled,
  onApply,
  onRemove,
  open: openProp,
  onOpenChange,
  onInteractionActiveChange,
  facePicking = false,
  pickedFaces = null,
  onFacePick,
}: {
  shape: WorkplaneShape;
  workspace: WorkplaneWorkspaceSettings;
  disabled: boolean;
  onApply: (settings: SurfaceTextureSettings) => Promise<void> | void;
  /** Takes the texture off; given while the body keeps what was under it. */
  onRemove?: () => void;
  /** Open or closed as the editor holds it, so the button under "Modify" shows and changes the same; else the card's own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onInteractionActiveChange?: (active: boolean) => void;
  /** Faces picked with clicks in the view (the editor holds the clicks): while picking, they are the card's faces. */
  facePicking?: boolean;
  pickedFaces?: SurfaceTextureFace[] | null;
  onFacePick?: (faces: SurfaceTextureFace[] | null, edgeAngle: number) => void;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const setOpen = (next: boolean) => (onOpenChange ? onOpenChange(next) : setOwnOpen(next));
  // Opened while it is on screen (from the toolbar, the panel scrolled elsewhere), the card comes into view.
  const cardRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) cardRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    wasOpen.current = open;
  }, [open]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(() => normalizeSurfaceTexture(shape.surfaceTexture ?? {}));
  const set = (patch: Partial<SurfaceTextureSettings>) => setSettings((current) => normalizeSurfaceTexture({ ...current, ...patch }));
  const applied = shape.surfaceTexture;
  // A texture made or changed elsewhere (by an assistant, by redo, in a project opened again) shows its own settings;
  // one taken off leaves the card as it was, to apply again.
  const appliedKey = applied
    ? JSON.stringify({ ...applied, masks: applied.masks.length, textOutline: applied.textOutline.length, imageOwn: applied.imageOwn ? applied.imageOwn.data.length : 0 })
    : "";
  const [shownKey, setShownKey] = useState(appliedKey);
  if (appliedKey !== shownKey) {
    setShownKey(appliedKey);
    if (applied) setSettings(normalizeSurfaceTexture(applied));
  }
  // Each click in the view comes back as the faces picked so far.
  useEffect(() => {
    if (pickedFaces) setSettings((current) => normalizeSurfaceTexture({ ...current, faces: pickedFaces }));
  }, [pickedFaces]);
  // A texture that keeps the body under it shows its settings to change; one that does not only says what it is.
  const changeable = Boolean(applied && onRemove && surfaceTextureEntry(shape));
  const options = <T extends string>(values: readonly T[], label: (value: T) => string) => values.map((value) => ({ value, label: label(value) }));
  const range = (id: string, label: string, value: number, [min, max]: [number, number], step: number, onChange: (value: number) => void) => (
    <RangeProperty
      id={id}
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      workspace={workspace}
      disabled={disabled || busy}
      onChange={onChange}
      onInteractionActiveChange={onInteractionActiveChange}
    />
  );
  const striped = settings.pattern === "grooves" || settings.pattern === "knurl";
  const cracks = settings.pattern === "cracks";
  // Carbon: a weave, and the crossing bands' width in mm.
  const carbon = settings.pattern === "carbon";
  // Bricks: a bond, a course's height and the joint's width in mm instead of a share of the spacing.
  const bricks = settings.pattern === "bricks";
  // Bark and wood: a tree and a wood of their own, and the annual rings on a log's ends.
  const bark = settings.pattern === "bark";
  const wood = settings.pattern === "wood";
  const endRings = settings.topFree === 0 && settings.bottomFree === 0;
  // Grooves, rope and knitting can lie on a top in rings (see SurfaceTextureSettings.capStyle).
  const ringPattern = settings.pattern === "grooves" || settings.pattern === "rope" || settings.pattern === "knit";
  // Running over or folding over a rim only goes with those: for the others such a choice shows as automatic.
  const capEdgeShown = !ringPattern && (settings.capEdge === "over" || settings.capEdge === "fold") ? "auto" : settings.capEdge;
  // Grain lies in space: no projection, no axis. An image's grey values are its profile and width.
  const grain = settings.pattern === "grain";
  const image = settings.pattern === "image";
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState("");
  const loadImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imageOwn = await surfaceImageFromFile(file);
      setImageError("");
      set({ image: "own", imageOwn, tileHeight: 0 });
    } catch (error) {
      setImageError(t("status.surfaceImageFailed", { error: error instanceof Error ? error.message : String(error) }));
    }
  };
  // A text goes where it is put: what stays smooth for a pattern all over does not hold it back, so those fields go.
  const text = settings.pattern === "text";
  const picked = settings.faces.length > 0;
  const percent = (id: string, label: string, value: number, onChange: (value: number) => void) => range(id, label, Math.round(value * 100), [0, 100], 1, (share) => onChange(share / 100));
  const apply = async () => {
    // The faces picked so far are in the settings already; picking ends with the texture made.
    if (facePicking) onFacePick?.(null, settings.edgeAngle);
    setBusy(true);
    try {
      await onApply(settings);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`property-card ${open ? "" : "collapsed"}`} ref={cardRef}>
      <button
        className="property-card-header"
        type="button"
        aria-expanded={open}
        aria-controls={`surface-texture-${shape.id}`}
        onClick={() => setOpen(!open)}
      >
        <span>{t("inspector.surfaceTexture")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <div className="property-list cylinder-wrap-body" id={`surface-texture-${shape.id}`}>
          {applied && !changeable ? (
            <p className="cylinder-wrap-hint">
              {t("inspector.surfaceApplied", { pattern: surfacePatternLabel(applied.pattern) })}
              <GuideHelpLink section="surfaceTexture" className="inspector-help-link" />
            </p>
          ) : (
            <>
              <SelectProperty
                type="select"
                label={t("inspector.surfacePattern")}
                value={settings.pattern}
                options={options(SURFACE_TEXTURE_PATTERNS, (value) => t(SURFACE_TEXTURE_LABELS.pattern[value]))}
                disabled={disabled || busy}
                onChange={(value) => set(surfaceSettingsForPattern(settings, value as SurfaceTexturePattern))}
              />
              {cracks ? (
                <>
                  <SelectProperty
                    type="select"
                    label={t("inspector.surfaceCrackStyle")}
                    value={settings.crackStyle}
                    options={options(SURFACE_TEXTURE_CRACK_STYLES, (value) => t(SURFACE_TEXTURE_LABELS.crackStyle[value]))}
                    disabled={disabled || busy}
                    onChange={(value) => set({ crackStyle: value as SurfaceTextureSettings["crackStyle"] })}
                  />
                  <SelectProperty
                    type="select"
                    label={t("inspector.surfaceCrackStart")}
                    value={settings.crackStart}
                    options={options(SURFACE_TEXTURE_CRACK_STARTS, (value) => t(SURFACE_TEXTURE_LABELS.crackStart[value]))}
                    disabled={disabled || busy}
                    onChange={(value) => set({ crackStart: value as SurfaceTextureSettings["crackStart"] })}
                  />
                  {range("surfaceCrackCount", t("inspector.surfaceCrackCount"), settings.crackCount, [1, SURFACE_TEXTURE_LIMITS.crackCount[1]], 1, (crackCount) => set({ crackCount }))}
                  {range("surfaceCrackLength", t("inspector.surfaceCrackLength"), settings.crackLength, [SURFACE_TEXTURE_LIMITS.crackLength[0], 150], 1, (crackLength) => set({ crackLength }))}
                  {range("surfaceCrackWidth", t("inspector.surfaceCrackWidth"), settings.crackWidth, SURFACE_TEXTURE_LIMITS.crackWidth, 0.1, (crackWidth) => set({ crackWidth }))}
                </>
              ) : text ? (
                <>
                  <TextProperty type="text" label={t("inspector.surfaceTextContent")} value={settings.textContent} maxLength={200} disabled={disabled || busy} onChange={(textContent) => set({ textContent })} />
                  <SelectProperty
                    type="select"
                    label={t("prop.font")}
                    value={settings.textFont}
                    options={surfaceTextFontOptions(settings.textFont)}
                    disabled={disabled || busy}
                    onChange={(textFont) => set({ textFont })}
                  />
                  <ToggleProperty label={t("prop.textVertical")} value={settings.textVertical} disabled={disabled || busy} onChange={(textVertical) => set({ textVertical })} />
                  {range("surfaceTextSize", t("inspector.surfaceTextSize"), settings.textSize, [SURFACE_TEXTURE_LIMITS.textSize[0], 60], 0.5, (textSize) => set({ textSize }))}
                  {range("surfaceTextAround", t("inspector.surfaceTextAround"), settings.textAround, SURFACE_TEXTURE_LIMITS.textAround, 1, (textAround) => set({ textAround }))}
                  {range("surfaceTextHeight", t("inspector.surfaceTextHeight"), settings.textHeight, SURFACE_TEXTURE_LIMITS.textHeight, 1, (textHeight) => set({ textHeight }))}
                  {range("surfaceTextTurn", t("inspector.surfaceTextTurn"), settings.textTurn, SURFACE_TEXTURE_LIMITS.textTurn, 1, (textTurn) => set({ textTurn }))}
                  <p className="cylinder-wrap-hint">{t("inspector.surfaceTextHint")}</p>
                </>
              ) : (
                <>
                  {image ? (
                    <>
                      <SelectProperty
                        type="select"
                        label={t("inspector.surfaceImage")}
                        value={settings.image}
                        // One's own image is there to choose again once it is loaded.
                        options={options(
                          SURFACE_TEXTURE_IMAGES.filter((value) => value !== "own" || settings.imageOwn),
                          (value) => t(SURFACE_TEXTURE_LABELS.image[value]),
                        )}
                        disabled={disabled || busy}
                        onChange={(value) => {
                          const next = value as SurfaceTextureSettings["image"];
                          set({ image: next, spacing: surfaceTextureImageTile(next), tileHeight: 0 });
                        }}
                      />
                      <input
                        ref={imageInput}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => {
                          void loadImage(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      <button className="inspector-action-button" type="button" disabled={disabled || busy} onClick={() => imageInput.current?.click()}>
                        <ImageUp size={17} strokeWidth={2.5} />
                        <span>{t("inspector.surfaceImageLoad")}</span>
                      </button>
                      {imageError ? <p className="cylinder-wrap-hint">{imageError}</p> : null}
                    </>
                  ) : null}
                  {carbon ? (
                    <SelectProperty
                      type="select"
                      label={t("inspector.surfaceCarbonWeave")}
                      value={settings.carbonWeave}
                      options={options(SURFACE_TEXTURE_CARBON_WEAVES, (value) => t(SURFACE_TEXTURE_LABELS.carbonWeave[value]))}
                      hint={t(SURFACE_TEXTURE_LABELS.carbonWeaveHint[settings.carbonWeave])}
                      disabled={disabled || busy}
                      onChange={(value) => set({ carbonWeave: value as SurfaceTextureSettings["carbonWeave"] })}
                    />
                  ) : null}
                  {bricks ? (
                    <SelectProperty
                      type="select"
                      label={t("inspector.surfaceBrickBond")}
                      value={settings.brickBond}
                      options={options(SURFACE_TEXTURE_BRICK_BONDS, (value) => t(SURFACE_TEXTURE_LABELS.brickBond[value]))}
                      hint={t(SURFACE_TEXTURE_LABELS.brickBondHint[settings.brickBond])}
                      disabled={disabled || busy}
                      onChange={(value) => set({ brickBond: value as SurfaceTextureSettings["brickBond"] })}
                    />
                  ) : null}
                  {bark ? (
                    <SelectProperty
                      type="select"
                      label={t("inspector.surfaceBarkType")}
                      value={settings.barkType}
                      options={options(SURFACE_TEXTURE_BARK_TYPES, (value) => t(SURFACE_TEXTURE_LABELS.barkType[value]))}
                      hint={t(SURFACE_TEXTURE_LABELS.barkTypeHint[settings.barkType])}
                      disabled={disabled || busy}
                      onChange={(value) => {
                        const barkType = value as SurfaceTextureSettings["barkType"];
                        set({ barkType, spacing: BARK_STARTS[barkType].spacing, depth: BARK_STARTS[barkType].depth });
                      }}
                    />
                  ) : null}
                  {wood ? (
                    <>
                      <SelectProperty
                        type="select"
                        label={t("inspector.surfaceWoodType")}
                        value={settings.woodType}
                        options={options(SURFACE_TEXTURE_WOOD_TYPES, (value) => t(SURFACE_TEXTURE_LABELS.woodType[value]))}
                        disabled={disabled || busy}
                        onChange={(value) => {
                          const woodType = value as SurfaceTextureSettings["woodType"];
                          set({ woodType, ringWidth: WOOD_RINGS[woodType] });
                        }}
                      />
                      <SelectProperty
                        type="select"
                        label={t("inspector.surfaceWoodCut")}
                        value={settings.woodCut}
                        options={options(SURFACE_TEXTURE_WOOD_CUTS, (value) => t(SURFACE_TEXTURE_LABELS.woodCut[value]))}
                        hint={t(SURFACE_TEXTURE_LABELS.woodCutHint[settings.woodCut])}
                        disabled={disabled || busy}
                        onChange={(value) => set({ woodCut: value as SurfaceTextureSettings["woodCut"] })}
                      />
                    </>
                  ) : (
                    range(
                      "surfaceSpacing",
                      t(SURFACE_SPACING_LABEL[settings.pattern] ?? "inspector.surfaceSpacing"),
                      settings.spacing,
                      [SURFACE_TEXTURE_LIMITS.spacing[0], image ? SURFACE_TEXTURE_LIMITS.spacing[1] : 50],
                      0.1,
                      (spacing) => set({ spacing }),
                    )
                  )}
                  {bark || wood ? (
                    <>
                      <ToggleProperty
                        label={t("inspector.surfaceEndRings")}
                        value={endRings}
                        disabled={disabled || busy}
                        onChange={(on) => set({ topFree: on ? 0 : SURFACE_TEXTURE_DEFAULTS.topFree, bottomFree: on ? 0 : SURFACE_TEXTURE_DEFAULTS.bottomFree })}
                      />
                      {wood || endRings ? range("surfaceRingWidth", t("inspector.surfaceRingWidth"), settings.ringWidth, [SURFACE_TEXTURE_LIMITS.ringWidth[0], 10], 0.1, (ringWidth) => set({ ringWidth })) : null}
                    </>
                  ) : null}
                  {image ? (
                    <>
                      {range("surfaceTileHeight", t("inspector.surfaceTileHeight"), settings.tileHeight, SURFACE_TEXTURE_LIMITS.tileHeight, 0.5, (tileHeight) => set({ tileHeight }))}
                      <SelectProperty
                        type="select"
                        label={t("inspector.surfaceImageTiling")}
                        value={settings.imageTiling}
                        options={options(SURFACE_TEXTURE_TILINGS, (value) => t(SURFACE_TEXTURE_LABELS.tiling[value]))}
                        disabled={disabled || busy}
                        onChange={(value) => set({ imageTiling: value as SurfaceTextureSettings["imageTiling"] })}
                      />
                      <ToggleProperty label={t("inspector.surfaceImageInvert")} value={settings.imageInvert} disabled={disabled || busy} onChange={(imageInvert) => set({ imageInvert })} />
                      <p className="cylinder-wrap-hint">{t("inspector.surfaceImageHint")}</p>
                    </>
                  ) : null}
                  {carbon ? (
                    <>
                      {range("surfaceCarbonCross", t("inspector.surfaceCarbonCross"), settings.carbonCross, [SURFACE_TEXTURE_LIMITS.carbonCross[0], 10], 0.1, (carbonCross) => set({ carbonCross }))}
                      <p className="cylinder-wrap-hint">{t("inspector.surfaceCarbonHint")}</p>
                    </>
                  ) : null}
                  {bricks ? (
                    <>
                      {range("surfaceBrickHeight", t("inspector.surfaceBrickHeight"), settings.brickHeight, [SURFACE_TEXTURE_LIMITS.brickHeight[0], 30], 0.1, (brickHeight) => set({ brickHeight }))}
                      {range("surfaceBrickJoint", t("inspector.surfaceBrickJoint"), settings.brickJoint, [SURFACE_TEXTURE_LIMITS.brickJoint[0], 5], 0.05, (brickJoint) => set({ brickJoint }))}
                      <p className="cylinder-wrap-hint">{t("inspector.surfaceBrickHint")}</p>
                    </>
                  ) : null}
                  {settings.pattern === "cells" || grain ? (
                    <>
                      {range("surfaceSeed", t("inspector.surfaceSeed"), settings.seed, [1, 999], 1, (seed) => set({ seed }))}
                      <p className="cylinder-wrap-hint">{t("inspector.surfaceSeedHint")}</p>
                    </>
                  ) : null}
                </>
              )}
              {settings.pattern === "bumps" ? (
                <SelectProperty
                  type="select"
                  label={t("inspector.surfaceBumpShape")}
                  value={settings.profile}
                  options={options(BUMP_SHAPES, (value) => t(SURFACE_TEXTURE_LABELS.bumpShape[value]))}
                  disabled={disabled || busy}
                  onChange={(value) => set({ profile: value as SurfaceTextureSettings["profile"] })}
                />
              ) : null}
              {range("surfaceDepth", t("inspector.surfaceDepth"), settings.depth, SURFACE_TEXTURE_LIMITS.depth, 0.05, (depth) => set({ depth }))}
              <SelectProperty
                type="select"
                label={t("inspector.surfaceDirection")}
                value={settings.direction}
                options={options(SURFACE_TEXTURE_DIRECTIONS, (value) => t(SURFACE_TEXTURE_LABELS.direction[value]))}
                disabled={disabled || busy}
                onChange={(value) => set({ direction: value as SurfaceTextureSettings["direction"] })}
              />
              {cracks ? (
                <>
                  {/* The gold: a part of its own in the notch, for a second filament. */}
                  <ToggleProperty label={t("inspector.surfaceCrackGold")} value={settings.crackGold} disabled={disabled || busy} onChange={(crackGold) => set({ crackGold, ...(crackGold ? { direction: "inward" as const } : {}) })} />
                  {settings.crackGold ? range("surfaceCrackRecess", t("inspector.surfaceCrackRecess"), settings.crackRecess, SURFACE_TEXTURE_LIMITS.crackRecess, 0.05, (crackRecess) => set({ crackRecess })) : null}
                  {settings.crackGold ? <p className="cylinder-wrap-hint">{t("inspector.surfaceCrackGoldHint")}</p> : null}
                </>
              ) : text ? null : grain ? (
                <p className="cylinder-wrap-hint">{t("inspector.surfaceGrainHint")}</p>
              ) : wood ? (
                <p className="cylinder-wrap-hint">{t("inspector.surfaceWoodHint")}</p>
              ) : (
                <SelectProperty
                  type="select"
                  label={t("inspector.surfaceProjection")}
                  value={settings.projection}
                  options={options(SURFACE_TEXTURE_PROJECTIONS, (value) => t(SURFACE_TEXTURE_LABELS.projection[value]))}
                  hint={t(SURFACE_TEXTURE_LABELS.projectionHint[settings.projection])}
                  disabled={disabled || busy}
                  onChange={(value) => set({ projection: value as SurfaceTextureSettings["projection"] })}
                />
              )}
              {/* A board's pith runs along its longest side: only a log asks for its axis. */}
              {!grain && !(wood && settings.woodCut !== "log") && (cracks || text || wood || settings.projection !== "allRound") ? (
                <SelectProperty
                  type="select"
                  label={t("inspector.surfaceAxis")}
                  value={settings.axis}
                  options={options(SURFACE_TEXTURE_AXES, (value) => value.toUpperCase())}
                  disabled={disabled || busy}
                  onChange={(value) => set({ axis: value as SurfaceTextureSettings["axis"] })}
                />
              ) : null}
              {/* Where it goes: every face, or only the faces clicked in the view (a text goes where it is put). */}
              {text || !onFacePick ? null : (
                <>
                  <p className="cylinder-wrap-hint">{picked ? t("inspector.surfaceFacesSome", { count: settings.faces.length }) : t("inspector.surfaceFacesAll")}</p>
                  <button
                    className={`inspector-action-button ${facePicking ? "active" : ""}`}
                    type="button"
                    aria-pressed={facePicking}
                    disabled={disabled || busy}
                    onClick={() => onFacePick(facePicking ? null : settings.faces, settings.edgeAngle)}
                  >
                    <MousePointerClick size={17} strokeWidth={2.5} />
                    <span>{t(facePicking ? "inspector.surfaceFacesDone" : "inspector.surfaceFacesPick")}</span>
                  </button>
                  {picked ? (
                    <button
                      className="inspector-action-button"
                      type="button"
                      disabled={disabled || busy}
                      onClick={() => {
                        set({ faces: [] });
                        if (facePicking) onFacePick([], settings.edgeAngle);
                      }}
                    >
                      <RotateCcw size={17} strokeWidth={2.5} />
                      <span>{t("inspector.surfaceFacesClear")}</span>
                    </button>
                  ) : null}
                  {facePicking ? <p className="cylinder-wrap-hint">{t("inspector.surfaceFacesPickHint")}</p> : null}
                </>
              )}
              <button className="name-tag-more" type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((current) => !current)}>
                <ChevronDown className={moreOpen ? "open" : ""} size={15} strokeWidth={2.6} />
                <span>{t(moreOpen ? "inspector.less" : "inspector.more")}</span>
              </button>
              {moreOpen ? (
                <>
                  {cracks ? (
                    <>
                      {percent("surfaceCrackBranch", t("inspector.surfaceCrackBranch"), settings.crackBranch, (crackBranch) => set({ crackBranch }))}
                      {percent("surfaceCrackJag", t("inspector.surfaceCrackJag"), settings.crackJag, (crackJag) => set({ crackJag }))}
                      {percent("surfaceCrackRough", t("inspector.surfaceCrackRough"), settings.crackRough, (crackRough) => set({ crackRough }))}
                      {range("surfaceCrackSeed", t("inspector.surfaceCrackSeed"), settings.crackSeed, [0, 999], 1, (crackSeed) => set({ crackSeed }))}
                      <p className="cylinder-wrap-hint">{t("inspector.surfaceCrackSeedHint")}</p>
                    </>
                  ) : bark || wood ? (
                    <>
                      {wood ? range("surfaceWoodKnots", t("inspector.surfaceWoodKnots"), settings.woodKnots, SURFACE_TEXTURE_LIMITS.woodKnots, 1, (woodKnots) => set({ woodKnots })) : null}
                      {wood ? percent("surfaceWoodWobble", t("inspector.surfaceWoodWobble"), settings.woodWobble, (woodWobble) => set({ woodWobble })) : null}
                      {range("surfaceSeed", t("inspector.surfaceSeed"), settings.seed, [1, 999], 1, (seed) => set({ seed }))}
                      <p className="cylinder-wrap-hint">{t(wood ? "inspector.surfaceWoodSeedHint" : "inspector.surfaceBarkSeedHint")}</p>
                    </>
                  ) : text || grain ? null : image ? (
                    <>
                      {range("surfaceImageTurn", t("inspector.surfaceImageTurn"), settings.imageTurn, SURFACE_TEXTURE_LIMITS.imageTurn, 1, (imageTurn) => set({ imageTurn }))}
                      {range("surfaceImageBlur", t("inspector.surfaceImageBlur"), settings.imageBlur, SURFACE_TEXTURE_LIMITS.imageBlur, 1, (imageBlur) => set({ imageBlur }))}
                    </>
                  ) : bricks ? (
                    <>
                      {percent("surfaceBrickVary", t("inspector.surfaceBrickVary"), settings.brickVary, (brickVary) => set({ brickVary }))}
                      {settings.brickVary > 0 ? (
                        <>
                          {range("surfaceSeed", t("inspector.surfaceSeed"), settings.seed, [1, 999], 1, (seed) => set({ seed }))}
                          <p className="cylinder-wrap-hint">{t("inspector.surfaceBrickVaryHint")}</p>
                        </>
                      ) : null}
                    </>
                  ) : (
                    range(
                      "surfaceCoverage",
                      t(SURFACE_COVERAGE_LABEL[settings.pattern] ?? "inspector.surfaceCoverage"),
                      Math.round(settings.width * 100),
                      [SURFACE_TEXTURE_LIMITS.width[0] * 100, 100],
                      1,
                      (share) => set({ width: share / 100 }),
                    )
                  )}
                  {text ? null : (
                    <>
                      {settings.pattern === "bumps" || grain || image || bark || wood ? null : (
                        <SelectProperty
                          type="select"
                          label={t("inspector.surfaceProfile")}
                          value={settings.profile}
                          options={options(SURFACE_TEXTURE_PROFILES, (value) => t(SURFACE_TEXTURE_LABELS.profile[value]))}
                          disabled={disabled || busy}
                          onChange={(value) => set({ profile: value as SurfaceTextureSettings["profile"] })}
                        />
                      )}
                      {striped ? range("surfaceAngle", t("inspector.surfaceAngle"), settings.angle, SURFACE_TEXTURE_LIMITS.angle, 1, (angle) => set({ angle })) : null}
                      {/* Top and bottom: grooves, rope and knitting in rows or rings, and the pattern's direction there. */}
                      {ringPattern && settings.projection !== "allRound" && settings.projection !== "flat" ? (
                        <>
                          <SelectProperty
                            type="select"
                            label={t("inspector.surfaceCapStyle")}
                            value={settings.capStyle}
                            options={options(SURFACE_TEXTURE_CAP_STYLES, (value) => t(SURFACE_TEXTURE_LABELS.capStyle[value]))}
                            hint={t("inspector.surfaceCapStyleHint")}
                            disabled={disabled || busy}
                            onChange={(value) => set({ capStyle: value as SurfaceTextureSettings["capStyle"] })}
                          />
                        </>
                      ) : null}
                      {/* Where the side meets a patterned top or bottom: sharp, the side's rows running over (ring patterns), a border. */}
                      {settings.projection !== "allRound" && settings.projection !== "flat" && !grain && !cracks && !wood && settings.pattern !== "text" ? (
                        <>
                          <SelectProperty
                            type="select"
                            label={t("inspector.surfaceCapEdge")}
                            value={capEdgeShown}
                            options={options(SURFACE_TEXTURE_CAP_EDGES.filter((value) => ringPattern || (value !== "over" && value !== "fold")), (value) => t(SURFACE_TEXTURE_LABELS.capEdge[value]))}
                            disabled={disabled || busy}
                            onChange={(value) => set({ capEdge: value as SurfaceTextureSettings["capEdge"] })}
                          />
                          {/* What the chosen edge does, one line under the whole row: the long label leaves the hint column too narrow. */}
                          <p className="cylinder-wrap-hint">{t(SURFACE_TEXTURE_LABELS.capEdgeHint[capEdgeShown])}</p>
                        </>
                      ) : null}
                      {grain || cracks || bricks || wood || bark ? null : (
                        <>
                          {range("surfaceFaceTurn", t("inspector.surfaceFaceTurn"), settings.faceTurn, SURFACE_TEXTURE_LIMITS.faceTurn, 1, (faceTurn) => set({ faceTurn }))}
                          <p className="cylinder-wrap-hint">{t("inspector.surfaceFaceTurnHint")}</p>
                        </>
                      )}
                      {/* Picked faces say where it goes: walls, top, bottom and the height band then do not count. */}
                      {picked ? null : (
                        <>
                          <ToggleProperty label={t("inspector.surfaceOutside")} value={settings.outside} disabled={disabled || busy} onChange={(outside) => set({ outside })} />
                          <ToggleProperty label={t("inspector.surfaceInside")} value={settings.inside} disabled={disabled || busy} onChange={(inside) => set({ inside })} />
                          {range("surfaceBottomFree", t("inspector.surfaceBottomFree"), settings.bottomFree, SURFACE_TEXTURE_LIMITS.bottomFree, 1, (bottomFree) => set({ bottomFree }))}
                          {range("surfaceTopFree", t("inspector.surfaceTopFree"), settings.topFree, SURFACE_TEXTURE_LIMITS.topFree, 1, (topFree) => set({ topFree }))}
                          {range("surfaceZoneFrom", t("inspector.surfaceZoneFrom"), settings.zoneFrom, SURFACE_TEXTURE_LIMITS.zoneFrom, 1, (zoneFrom) => set({ zoneFrom }))}
                          {range("surfaceZoneTo", t("inspector.surfaceZoneTo"), settings.zoneTo, SURFACE_TEXTURE_LIMITS.zoneTo, 1, (zoneTo) => set({ zoneTo }))}
                        </>
                      )}
                      <ToggleProperty label={t("inspector.surfaceKeepEdges")} value={settings.keepEdges} disabled={disabled || busy} onChange={(keepEdges) => set({ keepEdges })} />
                    </>
                  )}
                  {range("surfaceFade", t("inspector.surfaceFade"), settings.fade, SURFACE_TEXTURE_LIMITS.fade, 0.1, (fade) => set({ fade }))}
                  <p className="cylinder-wrap-hint">{t("inspector.surfaceFadeHint")}</p>
                  <SelectProperty
                    type="select"
                    label={t("inspector.surfaceDetail")}
                    value={settings.detail}
                    options={options(SURFACE_TEXTURE_DETAILS, (value) => t(SURFACE_TEXTURE_LABELS.detail[value]))}
                    disabled={disabled || busy}
                    onChange={(value) => set({ detail: value as SurfaceTextureSettings["detail"] })}
                  />
                  <p className="cylinder-wrap-hint">{t("inspector.surfaceMaskTip")}</p>
                </>
              ) : null}
              <p className="cylinder-wrap-hint">
                {applied ? t("inspector.surfaceChangeHint", { pattern: surfacePatternLabel(applied.pattern) }) : t("inspector.surfaceHint")}
                <GuideHelpLink section="surfaceTexture" className="inspector-help-link" />
              </p>
              <button className="inspector-action-button" type="button" disabled={disabled || busy} onClick={apply}>
                <Waves size={17} strokeWidth={2.5} />
                <span>{t(busy ? "inspector.surfaceWorking" : applied ? "inspector.surfaceChange" : "inspector.surfaceApply")}</span>
              </button>
              {applied ? (
                <button className="inspector-action-button" type="button" disabled={disabled || busy} onClick={onRemove}>
                  <Eraser size={17} strokeWidth={2.5} />
                  <span>{t("inspector.surfaceRemove")}</span>
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BentTubeSegmentsCard({
  shape,
  workspace,
  locked,
  onUpdate,
  onInteractionActiveChange,
  onSegmentChange,
}: {
  shape: WorkplaneShape;
  workspace: WorkplaneWorkspaceSettings;
  locked: boolean;
  onUpdate: ShapeInspectorUpdate;
  onInteractionActiveChange?: (active: boolean) => void;
  onSegmentChange?: (shapeId: string, segment: number | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState(0);
  const fields = normalizedBentTubeFields(shape);
  const segments = fields.bentTubeSegments;
  const index = Math.min(selected, segments.length - 1);
  const segment = segments[index];
  const minRadius = minBentTubeBendRadius(fields.bentTubeProfile, fields.bentTubeSize, fields.bentTubeQuality);
  const selfIntersectionKey = JSON.stringify([fields.bentTubeProfile, fields.bentTubeSize, fields.bentTubeQuality, segments]);
  const selfIntersects = useMemo(() => {
    const [bentTubeProfile, bentTubeSize, bentTubeQuality, bentTubeSegments] = JSON.parse(selfIntersectionKey);
    return bentTubeSelfIntersects({ bentTubeProfile, bentTubeSize, bentTubeQuality, bentTubeSegments });
  }, [selfIntersectionKey]);

  useEffect(() => setSelected(0), [shape.id]);

  // While the card is open, the chosen segment is lit up on the tube itself.
  const shapeId = shape.id;
  useEffect(() => {
    onSegmentChange?.(shapeId, open ? index : null);
    return () => onSegmentChange?.(shapeId, null);
  }, [index, onSegmentChange, open, shapeId]);

  const writeSegments = (next: typeof segments) => onUpdate(bentTubeParameterPatch(shape, { bentTubeSegments: next }));
  const changeSegment = (changes: Partial<(typeof segments)[number]>) => {
    writeSegments(segments.map((entry, position) => (position === index ? { ...entry, ...changes } : entry)));
  };
  const properties: ShapePropertyConfig[] = [
    {
      type: "select",
      id: "bentTubeSegment",
      label: t("prop.bentTubeSegment"),
      value: String(index),
      options: segments.map((_entry, position) => ({ value: String(position), label: t("bentTube.segmentNumber", { number: position + 1 }) })),
      onChange: (value) => setSelected(Number(value)),
    },
    {
      id: "bentTubeSegmentLength",
      label: t("prop.bentTubeSegmentLength"),
      value: segment.length,
      min: 0,
      max: 200,
      step: 0.5,
      onChange: (value) => changeSegment({ length: value }),
    },
    {
      id: "bentTubeBendAngle",
      label: t("prop.bentTubeBendAngle"),
      value: segment.bendAngle,
      min: -MAX_BENT_TUBE_BEND_ANGLE,
      max: MAX_BENT_TUBE_BEND_ANGLE,
      step: 1,
      onChange: (value) => changeSegment({ bendAngle: value }),
    },
    {
      id: "bentTubeBendRadius",
      label: t("prop.bentTubeBendRadius"),
      value: segment.bendRadius,
      min: minRadius,
      max: Math.max(100, minRadius + 50),
      step: 0.5,
      onChange: (value) => changeSegment({ bendRadius: value }),
    },
    {
      id: "bentTubeRoll",
      label: t("prop.bentTubeRoll"),
      value: segment.roll,
      min: -MAX_BENT_TUBE_ROLL,
      max: MAX_BENT_TUBE_ROLL,
      step: 1,
      onChange: (value) => changeSegment({ roll: value }),
    },
  ];

  return (
    <div className={`property-card ${open ? "" : "collapsed"}`}>
      <button
        className="property-card-header"
        type="button"
        aria-expanded={open}
        aria-controls={`bent-tube-segments-${shape.id}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{t("inspector.bentTubeSegments")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <div className="property-list" id={`bent-tube-segments-${shape.id}`}>
          <ShapePropertyRows properties={properties} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
          <div className="bent-tube-segment-actions">
            <button
              className="inspector-action-button"
              type="button"
              disabled={locked || segments.length >= MAX_BENT_TUBE_SEGMENTS}
              onClick={() => {
                const added = { length: 20, bendAngle: 0, bendRadius: segment.bendRadius, roll: 0 };
                writeSegments([...segments.slice(0, index + 1), added, ...segments.slice(index + 1)]);
                setSelected(index + 1);
              }}
            >
              {t("bentTube.addSegment")}
            </button>
            <button
              className="inspector-action-button"
              type="button"
              disabled={locked || segments.length <= 1}
              onClick={() => {
                writeSegments(segments.filter((_entry, position) => position !== index));
                setSelected(Math.max(0, index - 1));
              }}
            >
              {t("bentTube.removeSegment")}
            </button>
          </div>
          {selfIntersects ? <p className="bent-tube-warning" role="status">{t("bentTube.selfIntersects")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Where a compartment label sits along its side: towards -x on a back or front side, towards the back on a left or right one. */
const GRIDFINITY_LABEL_ALIGN_OPTIONS: Record<"across" | "deep", Array<{ value: NonNullable<GridfinityCompartmentLabel["align"]>; label: MessageKey }>> = {
  across: [{ value: "start", label: "gridfinity.alignLeft" }, { value: "middle", label: "gridfinity.alignMiddle" }, { value: "end", label: "gridfinity.alignRight" }],
  deep: [{ value: "start", label: "gridfinity.alignBack" }, { value: "middle", label: "gridfinity.alignMiddle" }, { value: "end", label: "gridfinity.alignFront" }],
};
/** A side's opening rows (#455): their ids and their names. */
const GRIDFINITY_OPENING_KEYS: Record<GridfinityWall, { depth: string; width: string; position: string; distance: string; depthLabel: MessageKey; widthLabel: MessageKey; positionLabel: MessageKey; distanceLabel: MessageKey }> = {
  back: { depth: "gridfinityOpeningDepthBack", width: "gridfinityOpeningWidthBack", position: "gridfinityOpeningPositionBack", distance: "gridfinityOpeningDistanceBack", depthLabel: "prop.gridfinityOpeningDepthBack", widthLabel: "prop.gridfinityOpeningWidthBack", positionLabel: "prop.gridfinityOpeningPositionBack", distanceLabel: "prop.gridfinityOpeningDistanceBack" },
  front: { depth: "gridfinityOpeningDepthFront", width: "gridfinityOpeningWidthFront", position: "gridfinityOpeningPositionFront", distance: "gridfinityOpeningDistanceFront", depthLabel: "prop.gridfinityOpeningDepthFront", widthLabel: "prop.gridfinityOpeningWidthFront", positionLabel: "prop.gridfinityOpeningPositionFront", distanceLabel: "prop.gridfinityOpeningDistanceFront" },
  left: { depth: "gridfinityOpeningDepthLeft", width: "gridfinityOpeningWidthLeft", position: "gridfinityOpeningPositionLeft", distance: "gridfinityOpeningDistanceLeft", depthLabel: "prop.gridfinityOpeningDepthLeft", widthLabel: "prop.gridfinityOpeningWidthLeft", positionLabel: "prop.gridfinityOpeningPositionLeft", distanceLabel: "prop.gridfinityOpeningDistanceLeft" },
  right: { depth: "gridfinityOpeningDepthRight", width: "gridfinityOpeningWidthRight", position: "gridfinityOpeningPositionRight", distance: "gridfinityOpeningDistanceRight", depthLabel: "prop.gridfinityOpeningDepthRight", widthLabel: "prop.gridfinityOpeningWidthRight", positionLabel: "prop.gridfinityOpeningPositionRight", distanceLabel: "prop.gridfinityOpeningDistanceRight" },
};
/** Why a compartment's label shelf is left out (#455): its side open in full, or switched open with a partial opening. */
const COMPARTMENT_LABEL_LEFT_OUT_HINTS: Record<"open" | "switched", MessageKey> = { open: "gridfinity.compartmentLabelOpenHint", switched: "gridfinity.compartmentLabelSwitchedHint" };
const GRIDFINITY_LABEL_SIDE_OPTIONS: Array<{ value: GridfinityWall; label: MessageKey }> = [
  { value: "back", label: "gridfinity.labelSideBack" },
  { value: "front", label: "gridfinity.labelSideFront" },
  { value: "left", label: "gridfinity.labelSideLeft" },
  { value: "right", label: "gridfinity.labelSideRight" },
];

/**
 * A Gridfinity bin's compartments (#554): how many each way and how thick the dividers are, then a menu that picks one
 * divider each way and its slider that moves it, and menus for the row and the column that pick the compartment whose
 * label the rows under them set. Shown on every bin with room for dividers, so a bin of one compartment can be divided here.
 */
function GridfinityCompartmentsCard({
  shape,
  workspace,
  locked,
  defaults,
  onUpdate,
  onInteractionActiveChange,
}: {
  shape: WorkplaneShape;
  workspace: WorkplaneWorkspaceSettings;
  locked: boolean;
  /** What the counts and the thickness are on a bin made new, for the reset arrows beside them. */
  defaults?: PropertyDefaultValues | null;
  onUpdate: ShapeInspectorUpdate;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useInspectorCard("gridfinityCompartments", true);
  const [chosen, setChosen] = useState({ x: 0, z: 0, row: 0, column: 0 });

  useEffect(() => setChosen({ x: 0, z: 0, row: 0, column: 0 }), [shape.id]);

  const fields = { ...shape, depth: shapeOverallFootprintDimensions(shape).depth };
  if (!gridfinityDividerFits(fields)) return null;
  const compartments = gridfinityCompartments(fields);
  const choose = (changes: Partial<typeof chosen>) => setChosen((current) => ({ ...current, ...changes }));
  const counts = { x: gridfinityCompartmentCount(fields, "x"), z: gridfinityCompartmentCount(fields, "z") };
  const countRow = (axis: GridfinityAxis, id: string, label: MessageKey, hint?: string): ShapePropertyConfig => {
    const max = gridfinityCompartmentMax(fields, axis);
    return { id, label: t(label), value: counts[axis], min: 1, max, step: 1, hint, onChange: (value) => onUpdate(gridfinityCompartmentCountPatch(axis, clamp(Math.round(value), 1, max))) };
  };
  const properties: ShapePropertyConfig[] = [
    countRow("x", "gridfinityCompartmentsX", "prop.gridfinityCompartmentsX"),
    countRow("z", "gridfinityCompartmentsZ", "prop.gridfinityCompartmentsZ", t(normalizeGridfinityType(fields.gridfinityType) === "tray" ? "gridfinity.compartmentsTrayHint" : "gridfinity.compartmentsHint")),
  ];
  if (compartments) {
    properties.push({ id: "gridfinityDividerThickness", label: t("prop.gridfinityDividerThickness"), value: gridfinityDividerThickness(fields), min: MIN_GRIDFINITY_DIVIDER_THICKNESS, max: MAX_GRIDFINITY_DIVIDER_THICKNESS, step: 0.1, onChange: (value) => onUpdate({ gridfinityDividerThickness: clamp(value, MIN_GRIDFINITY_DIVIDER_THICKNESS, MAX_GRIDFINITY_DIVIDER_THICKNESS) }) });
  }

  // One menu and one slider each way, whichever divider the menu picks; moving it writes that way's whole list.
  ([["x", "gridfinityDividerX", "prop.gridfinityDividerAcross", "gridfinity.fromLeft"], ["z", "gridfinityDividerZ", "prop.gridfinityDividerDeep", "gridfinity.fromBack"]] as const).forEach(([axis, id, label, numbered]) => {
    const positions = gridfinityDividerPositions(fields, axis);
    if (positions.length === 0) return;
    const index = Math.min(chosen[axis], positions.length - 1);
    const limits = gridfinityDividerLimits(fields, axis, index);
    if (!limits) return;
    properties.push(
      {
        type: "select",
        id,
        label: t(label),
        value: String(index),
        options: positions.map((_position, position) => ({ value: String(position), label: t(numbered, { number: position + 1 }) })),
        onChange: (value) => choose({ [axis]: Number(value) }),
      },
      {
        id: axis === "x" ? "gridfinityDividerPositionX" : "gridfinityDividerPositionZ",
        label: t("prop.gridfinityDividerPosition"),
        value: clamp(positions[index], limits.min, limits.max),
        min: limits.min,
        max: limits.max,
        step: 0.1,
        hint: t("gridfinity.dividerPositionHint"),
        onChange: (value) => onUpdate(gridfinityDividerPositionPatch(fields, axis, index, value)),
      },
    );
  });

  if (compartments && gridfinityLabelFits(fields)) {
    const rows = counts.z;
    const columns = counts.x;
    const row = Math.min(chosen.row, rows - 1);
    const column = Math.min(chosen.column, columns - 1);
    const cell = compartments.cells.find((entry) => entry.row === row && entry.column === column);
    const numbered = (count: number, key: MessageKey) => Array.from({ length: count }, (_entry, position) => ({ value: String(position), label: t(key, { number: position + 1 }) }));
    if (rows > 1) properties.push({ type: "select", id: "gridfinityCompartmentRow", label: t("prop.gridfinityCompartmentRow"), value: String(row), options: numbered(rows, "gridfinity.fromBack"), onChange: (value) => choose({ row: Number(value) }) });
    if (columns > 1) properties.push({ type: "select", id: "gridfinityCompartmentColumn", label: t("prop.gridfinityCompartmentColumn"), value: String(column), options: numbered(columns, "gridfinity.fromLeft"), onChange: (value) => choose({ column: Number(value) }) });
    if (cell) {
      const labels = shape.gridfinityCompartmentLabels ?? [];
      const stored = labels.find((entry) => entry.column === column && entry.row === row);
      // Every other compartment's label stays as it is, also those of compartments a smaller count leaves out for now.
      const writeLabel = (next: GridfinityCompartmentLabel | null) => {
        const rest = labels.filter((entry) => entry.column !== column || entry.row !== row);
        const all = (next ? [...rest, next] : rest).sort((a, b) => a.row - b.row || a.column - b.column);
        onUpdate({ gridfinityCompartmentLabels: all.length > 0 ? all : undefined });
      };
      // A side is offered when a label 4 mm wide still leaves 6 mm open, and the side already set always is.
      const leftOut = stored ? gridfinityCompartmentLabelLeftOut(cell, stored.side) : null;
      const sides = GRIDFINITY_LABEL_SIDE_OPTIONS.filter(({ value }) => value === stored?.side || gridfinityCompartmentLabelMaxWidth(fields, cell, value) >= MIN_GRIDFINITY_LABEL_WIDTH);
      properties.push({
        type: "select",
        id: "gridfinityCompartmentLabel",
        label: t("prop.gridfinityCompartmentLabel"),
        value: stored?.side ?? "none",
        options: [{ value: "none", label: t("gridfinity.labelNone") }, ...sides.map(({ value, label }) => ({ value, label: t(label) }))],
        hint: leftOut ? t(COMPARTMENT_LABEL_LEFT_OUT_HINTS[leftOut]) : undefined,
        onChange: (value) => {
          const side = GRIDFINITY_LABEL_SIDE_OPTIONS.find((option) => option.value === value)?.value;
          writeLabel(side ? { ...stored, column, row, side } : null);
        },
      });
      const built = gridfinityCompartmentLabel(fields, column, row);
      if (stored && built) {
        const maxWidth = gridfinityCompartmentLabelMaxWidth(fields, cell, built.side);
        const change = (changes: Partial<GridfinityCompartmentLabel>) => {
          const next: GridfinityCompartmentLabel = { ...stored, ...changes };
          // 100 % and the middle are what a label has unset, so they are written as unset.
          if (next.length === undefined || next.length >= 100) delete next.length;
          if (next.align === "middle") delete next.align;
          writeLabel(next);
        };
        // A shelf that comes out shorter than 4 mm is left out, which the row says rather than leave it unexplained.
        const tooShort = built.length < 100 && (built.length / 100) * 2 * (built.side === "back" || built.side === "front" ? cell.hx : cell.hz) < MIN_GRIDFINITY_COMPARTMENT_LABEL_MM;
        properties.push({ id: "gridfinityCompartmentLabelLength", label: t("prop.gridfinityCompartmentLabelLength"), value: built.length, min: MIN_GRIDFINITY_COMPARTMENT_LABEL_LENGTH, max: 100, step: 1, hint: t(tooShort ? "gridfinity.compartmentLabelTooShortHint" : "gridfinity.compartmentLabelLengthHint"), onChange: (value) => change({ length: clamp(value, MIN_GRIDFINITY_COMPARTMENT_LABEL_LENGTH, 100) }) });
        if (built.length < 100) {
          const options = GRIDFINITY_LABEL_ALIGN_OPTIONS[built.side === "back" || built.side === "front" ? "across" : "deep"];
          properties.push({
            type: "select",
            id: "gridfinityCompartmentLabelAlign",
            label: t("prop.gridfinityLabelOffset"),
            value: built.align,
            options: options.map(({ value, label }) => ({ value, label: t(label) })),
            onChange: (value) => change({ align: options.find((option) => option.value === value)?.value ?? "middle" }),
          });
        }
        properties.push({ id: "gridfinityCompartmentLabelWidth", label: t("prop.gridfinityLabelWidth"), value: built.width, min: MIN_GRIDFINITY_LABEL_WIDTH, max: Math.max(MIN_GRIDFINITY_LABEL_WIDTH, maxWidth), step: 0.5, onChange: (value) => change({ width: clamp(value, MIN_GRIDFINITY_LABEL_WIDTH, maxWidth) }) });
      }
    }
  }

  return (
    <div className={`property-card ${open ? "" : "collapsed"}`}>
      <button
        className="property-card-header"
        type="button"
        aria-expanded={open}
        aria-controls={`gridfinity-compartments-${shape.id}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{t("inspector.gridfinityCompartments")}</span>
        <ChevronUp className={open ? "" : "collapsed"} size={25} strokeWidth={2.8} />
      </button>
      {open ? (
        <div className="property-list" id={`gridfinity-compartments-${shape.id}`}>
          <ShapePropertyRows properties={properties} defaults={defaults} workspace={workspace} disabled={locked} onInteractionActiveChange={onInteractionActiveChange} />
        </div>
      ) : null}
    </div>
  );
}

type PropertyDefaultValues = ReadonlyMap<string, number | string | boolean>;

/**
 * The values a shape of this kind has when it is made new, with the defaults saved in the
 * settings, by property id. The main list, the taper card, the twist card and a Gridfinity
 * bin's compartments card each have their own, as some ids (a pyramid's top width) mean
 * different things in them. Null for a shape that is not made from the toolbar: a sketch,
 * a mesh, a group.
 */
function shapePropertyDefaults(kind: WorkplaneShape["kind"], workspace: WorkplaneWorkspaceSettings, gridfinityType?: GridfinityType) {
  const asset = shapeDefaultsAsset(kind);
  if (!asset) return null;
  try {
    // A tray (#837) is held to a tray made new, its floor starting at 1.2 mm, and a bin or baseplate to its own type
    // where the defaults make a tray.
    const saved = workspace.shapeCustomizations[kind];
    const tray = gridfinityType === "tray" || (gridfinityType !== undefined && normalizeGridfinityType(saved?.gridfinityType) === "tray");
    const fresh = makeShapeFromAsset(asset, undefined, tray ? { ...saved, gridfinityType } : saved);
    const main = new Map<string, number | string | boolean>();
    getShapeProperties(fresh, () => undefined, workspace).forEach((property) => {
      if (property.type !== "text") main.set(property.id, property.value);
    });
    const taperSize = shapeTaperDimensions(fresh);
    const taper = new Map<string, number | string | boolean>([
      ["topLength", taperSize.topDepth],
      ["topWidth", taperSize.topWidth],
      ["bottomLength", taperSize.bottomDepth],
      ["bottomWidth", taperSize.bottomWidth],
    ]);
    const twist = new Map<string, number | string | boolean>([["extrudeTwist", 0], ["extrudeTopOffsetX", 0], ["extrudeTopOffsetZ", 0]]);
    // A Gridfinity bin's compartments card (#554): the counts and the dividers' thickness, not the labels of one bin.
    let compartments: Map<string, number | string | boolean> | null = null;
    if (fresh.kind === "gridfinity") {
      const fields = { ...fresh, depth: shapeOverallFootprintDimensions(fresh).depth };
      compartments = new Map<string, number | string | boolean>([["gridfinityCompartmentsX", gridfinityCompartmentCount(fields, "x")], ["gridfinityCompartmentsZ", gridfinityCompartmentCount(fields, "z")], ["gridfinityDividerThickness", gridfinityDividerThickness(fields)]]);
    }
    return { main, taper, twist, compartments };
  } catch {
    return null;
  }
}

/** Values a reset arrow does not belong to: they are not settings of the shape's look. */
const NO_RESET_PROPERTY_IDS = new Set(["color", "name"]);

function ShapePropertyRows({
  properties,
  defaults,
  workspace,
  disabled,
  formulas,
  onFormula,
  onInteractionActiveChange,
}: {
  properties: ShapePropertyConfig[];
  /** What each value was when the shape was new; a value that differs gets a reset arrow. */
  defaults?: PropertyDefaultValues | null;
  workspace: WorkplaneWorkspaceSettings;
  disabled?: boolean;
  /** The calculations the body's fields remember (#180), and where a field reports the one it was just set from. */
  formulas?: FieldFormulas;
  onFormula?: (id: string, text: string | null | undefined) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const rows = properties.map((property) => {
    if (property.type === "text") {
      return <TextProperty {...property} key={property.id} disabled={disabled} onInteractionActiveChange={onInteractionActiveChange} />;
    }
    const fallback = disabled || NO_RESET_PROPERTY_IDS.has(property.id) ? undefined : defaults?.get(property.id);
    if (property.type === "select") {
      const onReset = typeof fallback === "string" && fallback !== property.value ? () => property.onChange(fallback) : undefined;
      return <SelectProperty {...property} key={property.id} disabled={disabled} onReset={onReset} />;
    }
    if (property.type === "toggle") {
      const onReset = typeof fallback === "boolean" && fallback !== property.value ? () => property.onChange(fallback) : undefined;
      return <ToggleProperty {...property} key={property.id} disabled={disabled} onReset={onReset} />;
    }
    const differs = typeof fallback === "number" && Math.abs(fallback - property.value) > Math.max(1e-6, (property.step ?? 0.01) / 10);
    const onReset = differs ? () => property.onChange(fallback as number) : undefined;
    // A double click on the slider goes back to the default, also when the first click of it has just moved the value.
    const onDefault = typeof fallback === "number" ? () => property.onChange(fallback) : undefined;
    return <RangeProperty {...property} key={property.id} workspace={workspace} disabled={disabled || property.disabled} onReset={onReset} onDefault={onDefault} formula={formulas?.[property.id]} onFormula={onFormula ? (text) => onFormula(property.id, text) : undefined} onInteractionActiveChange={onInteractionActiveChange} />;
  });
  // Toggles with a layout are pushed together, back to back, and drawn in one box of it.
  const layoutOf = (property: ShapePropertyConfig | undefined) => (property?.type === "toggle" ? property.layout : undefined);
  return rows.flatMap((row, index) => {
    const layout = layoutOf(properties[index]);
    if (!layout) return [row];
    if (layoutOf(properties[index - 1]) === layout) return [];
    let end = index;
    while (layoutOf(properties[end + 1]) === layout) end += 1;
    return [<div className={`property-layout-${layout}`} key={`layout-${properties[index].id}`}>{rows.slice(index, end + 1)}</div>];
  });
}

/** The small arrow next to a value that differs from its default. */
function PropertyResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="property-reset"
      // Out of the Tab order: Tab goes from one value to the next (#300).
      tabIndex={-1}
      title={t("inspector.resetProperty")}
      aria-label={t("inspector.resetProperty")}
      // Inside a label: neither focus nor the label's own click should reach the slider.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <RotateCcw size={12} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}

export function SnapGridControl({
  units,
  customGrids,
  snap,
  snapOpen,
  onSnapChange,
  onSnapOpenChange,
  objectSnap,
  onObjectSnapChange,
  onUnitsChange,
}: {
  units: string;
  /** Switches between millimetres and inches without the settings window (#422). */
  onUnitsChange?: (units: string) => void;
  /** The user's own snap measures, listed after the fixed steps. */
  customGrids?: CustomSnapGrid[];
  snap: GridSize;
  snapOpen: boolean;
  onSnapChange: Dispatch<SetStateAction<GridSize>>;
  onSnapOpenChange: Dispatch<SetStateAction<boolean>>;
  /** Only the 3D editor passes these: snapping to other shapes, switched in the same menu. */
  objectSnap?: boolean;
  onObjectSnapChange?: (enabled: boolean) => void;
}) {
  const label = (size: GridSize) => customSnapGridLabel(size, customGrids) ?? measurementOptionLabel(size);
  // The menu goes onto the page itself: the corner of the 3D view lies under the toolbar and its pinned Shapes
  // panel, so no z-index within it could bring the menu over them (#616, still behind it after 1.93.0).
  const selectRef = useRef<HTMLButtonElement>(null);
  const [menuPlace, setMenuPlace] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!snapOpen) {
      setMenuPlace(null);
      return;
    }
    const place = () => {
      const row = selectRef.current?.parentElement?.getBoundingClientRect();
      if (!row) return;
      setMenuPlace({
        position: "fixed",
        right: Math.max(4, window.innerWidth - row.right),
        bottom: window.innerHeight - row.top + 4,
        maxHeight: Math.max(120, row.top - 12),
        zIndex: 75,
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [snapOpen]);
  return (
    <div className="snap-row">
      <span>{t("inspector.snapGrid")}</span>
      <button ref={selectRef} className="snap-select" data-help={t("inspector.snapGrid")} onClick={() => onSnapOpenChange((value) => !value)}>
        <span className="snap-select-label">{label(snap)}</span>
        <ChevronDown size={12} fill="currentColor" />
      </button>
      {onUnitsChange ? (
        <span className="snap-units" role="group" aria-label={t("inspector.unitsSwitch")} title={t("inspector.unitsSwitch")}>
          <button type="button" data-help={t("inspector.unitsSwitch")} aria-pressed={units === "Metric (Default)"} onClick={() => onUnitsChange("Metric (Default)")}>mm</button>
          <button type="button" data-help={t("inspector.unitsSwitch")} aria-pressed={units === "Imperial"} onClick={() => onUnitsChange("Imperial")}>in</button>
        </span>
      ) : null}
      {snapOpen && menuPlace ? createPortal(
        <div className="snap-menu" style={menuPlace}>
          {snapGridOptions(units, customGrids).map((size) => (
            <button
              key={size}
              className={size === snap ? "selected" : ""}
              onClick={() => {
                onSnapChange(size);
                onSnapOpenChange(false);
              }}
            >
              {label(size)}
            </button>
          ))}
          {onObjectSnapChange ? (
            <label className="snap-object-toggle" title={t("inspector.objectSnapHint")}>
              <input type="checkbox" checked={Boolean(objectSnap)} onChange={(event) => onObjectSnapChange(event.target.checked)} />
              <span>{t("inspector.objectSnap")}</span>
            </label>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

/**
 * Haelt das Speichern an, solange ein Feld bedient wird, und gibt es auch dann
 * wieder frei, wenn das Feld verschwindet, waehrend es noch den Fokus hat.
 * Chrome meldet dann kein `blur` - die Sperre blieb stehen, und jede weitere
 * Aenderung wurde nur vorgemerkt, nie gespeichert (Diskussion #87).
 */
function useInteractionHold(onInteractionActiveChange?: (active: boolean) => void) {
  const heldRef = useRef(false);
  const callbackRef = useRef(onInteractionActiveChange);
  callbackRef.current = onInteractionActiveChange;
  useEffect(() => () => {
    if (!heldRef.current) return;
    heldRef.current = false;
    callbackRef.current?.(false);
  }, []);
  return useCallback((active: boolean) => {
    heldRef.current = active;
    callbackRef.current?.(active);
  }, []);
}

/**
 * Das Feld fuer eine eigene Farbe. Es bleibt dasselbe Element, wenn sich die
 * Farbe aendert - frueher wurde es dabei ausgetauscht, waehrend es noch den
 * Fokus hatte, und eine zweite eigene Farbe kam gar nicht mehr an.
 */
function CustomColorInput({ color, disabled, onCommit, onInteractionActiveChange }: {
  color: string;
  disabled?: boolean;
  onCommit: (color: string) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const holdInteraction = useInteractionHold(onInteractionActiveChange);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  useEffect(() => {
    const input = inputRef.current;
    if (input && input.value.toLowerCase() !== color.toLowerCase()) input.value = color;
  }, [color]);
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    // React's color-input onChange follows the native input event and fires for
    // every movement in the picker. Commit only the native change event, which
    // fires after the user finishes choosing, so dragging stays responsive.
    const commit = () => commitRef.current(input.value);
    input.addEventListener("change", commit);
    return () => input.removeEventListener("change", commit);
  }, []);
  return (
    <input
      ref={inputRef}
      type="color"
      defaultValue={color}
      disabled={disabled}
      onFocus={() => holdInteraction(true)}
      onBlur={() => holdInteraction(false)}
    />
  );
}

function RangeProperty({
  id,
  label,
  value,
  min,
  max,
  step = 0.01,
  hint,
  workspace,
  disabled,
  onChange,
  onReset,
  onDefault,
  formula,
  onFormula,
  onInteractionActiveChange,
}: RangePropertyConfig & { workspace: WorkplaneWorkspaceSettings; disabled?: boolean; onReset?: () => void; onDefault?: () => void; formula?: string; onFormula?: (text: string | null | undefined) => void; onInteractionActiveChange?: (active: boolean) => void }) {
  const holdInteraction = useInteractionHold(onInteractionActiveChange);
  const snapStepMm = useContext(SliderSnapContext);
  const draggingSliderRef = useRef(false);
  // Firefox sends one last value after the pointer is up, so a drag ends a moment later than the pointer does.
  const sliderReleaseTimerRef = useRef<number | undefined>(undefined);
  const endSliderDrag = () => {
    window.clearTimeout(sliderReleaseTimerRef.current);
    sliderReleaseTimerRef.current = window.setTimeout(() => { draggingSliderRef.current = false; }, 120);
  };
  const allowsAboveSliderMax = ["length", "width", "height", "outerDiameter", "innerDiameter", "starOuterSize", "starInnerSize", "crescentThickness", "honeycombCellSize", "honeycombWallThickness", "honeycombFrameWidth", "bentTubeSize", "bentTubeBendRadius"].includes(id) || id.endsWith("Length") || id.endsWith("Width");
  const isLength = propertyUsesLengthUnit(id);
  const accuracy = workspace.accuracy;
  // A position can be typed beyond the slider, on both sides (#425).
  const freePosition = id === "positionX" || id === "positionY" || id === "positionZ" || id === "pivotX" || id === "pivotY" || id === "pivotZ";
  const actualValue = freePosition && Number.isFinite(value) ? value : Math.max(min, Number.isFinite(value) ? value : min);
  const controlValue = isLength ? millimetersToDisplay(actualValue, workspace) : actualValue;
  const controlMin = isLength ? millimetersToDisplay(min, workspace) : min;
  const controlMax = isLength ? millimetersToDisplay(max, workspace) : max;
  const controlStep = isLength ? displayStepFromMillimeters(step, workspace) : step;
  const sliderValue = clamp(controlValue, controlMin, controlMax);
  const position = ((sliderValue - controlMin) / Math.max(Number.EPSILON, controlMax - controlMin)) * 100;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ROTATION_PROPERTY_IDS.has(id) ? String(Number(controlValue.toFixed(2))) : formatPropertyNumber(controlValue, accuracy, controlStep));
  const unit = isLength ? lengthDisplayUnit(workspace).label : ROTATION_PROPERTY_IDS.has(id) ? "°" : null;
  // Inches read as fractions (1⅝), like similar tools; the slider and typed decimals stay exact.
  // An angle keeps two decimals (11.25 stays 11.25, #552); the other whole-step fields show whole numbers.
  const formatShown = (shown: number) => (unit === "in" && showsInchFractions(workspace)
    ? formatFractionalInches(shown)
    : ROTATION_PROPERTY_IDS.has(id) ? String(Number(shown.toFixed(2))) : formatPropertyNumber(shown, accuracy, controlStep));
  const toModelValue = (nextValue: number) => isLength ? displayToMillimeters(nextValue, workspace) : nextValue;
  // The calculation the field was last set from comes back when it is entered (#180), as long as
  // the value still equals it; a value changed by a handle or the slider shows the number again.
  const shownFormula = formulaMatchesValue(formula, controlValue) ? formula : undefined;
  const openingDraft = () => shownFormula ?? formatShown(controlValue);
  const openedWithRef = useRef<string | null>(null);
  const commitDraft = () => {
    // Leaving the field untouched keeps the exact value, not its rounded reading - and its formula.
    if (draft === (openedWithRef.current ?? formatShown(controlValue))) {
      setEditing(false);
      holdInteraction(false);
      return;
    }
    const next = RELATIVE_SIZE_PROPERTY_IDS.has(id)
      ? resolveMeasurementInput(draft, controlValue)
      : parseMeasurementInput(draft);
    const finiteNext = Number.isFinite(next) ? next : controlValue;
    const nextModelValue = toModelValue(finiteNext);
    // The formula rides along with the value it set, in the same change; a plain number clears it.
    onFormula?.(Number.isFinite(next) ? formulaToRemember(draft) : null);
    onChange(freePosition ? clamp(nextModelValue, -POSITION_TYPED_LIMIT, POSITION_TYPED_LIMIT) : allowsAboveSliderMax ? Math.max(min, nextModelValue) : clamp(nextModelValue, min, max));
    onFormula?.(undefined);
    setEditing(false);
    holdInteraction(false);
  };
  // The mouse wheel in a field that has the focus changes its value (#226). Only a field that was clicked, so the
  // panel still scrolls under a pointer that merely passes over one. A listener of its own, as the browser treats a wheel
  // listener of React as one that may not stop the scroll.
  const numberInputRef = useRef<HTMLInputElement>(null);
  const keepSelectedRef = useRef(false);
  const wheelHandlerRef = useRef<((event: WheelEvent) => void) | null>(null);
  // Up and Down in the focused field do the same as the wheel: one step, Shift a larger one, Alt a finer one (#749, MartinShake).
  // In a size or position field Shift steps by the snap grid; with the grid off it stays ten steps.
  const stepFieldValue = (direction: 1 | -1, modifiers: { shift: boolean; ctrl: boolean; alt: boolean }) => {
    const base = wheelBaseStep(controlMin, controlMax, controlStep, unit === "in");
    const parsed = parseMeasurementInput(draft);
    const current = Number.isFinite(parsed) ? parsed : controlValue;
    const shiftStep = isLength && snapStepMm > 0 ? millimetersToDisplay(snapStepMm, workspace) : undefined;
    const turned = wheelNextValue(current, direction, base, modifiers, shiftStep);
    // The wheel stops at the field's lower limit, also for the figure shown: it went on below it, into negative sizes, which the body
    // then kept at the limit and the field showed again as 0.01 only when it was left (#576, prmod3d).
    const next = freePosition ? turned : Math.max(turned, controlMin);
    const nextModelValue = toModelValue(next);
    onChange(freePosition ? clamp(nextModelValue, -POSITION_TYPED_LIMIT, POSITION_TYPED_LIMIT) : allowsAboveSliderMax ? Math.max(min, nextModelValue) : clamp(nextModelValue, min, max));
    const shown = formatShown(freePosition || allowsAboveSliderMax ? next : clamp(next, controlMin, controlMax));
    // What is shown is the new starting point, so leaving the field keeps the exact value and does not read it again.
    openedWithRef.current = shown;
    setDraft(shown);
    // The whole value stays selected, so that typing after the wheel replaces it, as after the click (#226).
    // Every render until a key is typed puts the selection back, as the field's value is written again.
    keepSelectedRef.current = true;
  };
  wheelHandlerRef.current = (event: WheelEvent) => {
    const input = numberInputRef.current;
    const turn = wheelTurn(event);
    if (!input || disabled || !editing || document.activeElement !== input || turn === 0) return;
    event.preventDefault();
    const starting = wheelAnchorRef.current === null;
    if (starting) wheelAnchorRef.current = { top: input.getBoundingClientRect().top, until: 0 };
    wheelAnchorRef.current!.until = performance.now() + WHEEL_ANCHOR_MS;
    stepFieldValue(turn < 0 ? 1 : -1, { shift: event.shiftKey, ctrl: event.ctrlKey, alt: event.altKey });
    if (starting) holdFieldUnderPointer();
  };
  // A hint above the field can come or go with the value the wheel sets - "The body stands tilted" appears as soon as
  // a rotation leaves 0 - and push the field away from under the pointer, so the next turn of the wheel scrolled the
  // panel instead (forum, StonXX). While the wheel turns, the panel scrolls along by as much as the field moved.
  const wheelAnchorRef = useRef<{ top: number; until: number } | null>(null);
  const keepFieldInPlace = () => {
    const input = numberInputRef.current;
    const anchor = wheelAnchorRef.current;
    if (!input || !anchor) return;
    const moved = input.getBoundingClientRect().top - anchor.top;
    if (Math.abs(moved) >= 1) scrollingAncestor(input)?.scrollBy({ top: moved, behavior: "instant" });
  };
  const holdFieldUnderPointer = () => {
    // Where the panel cannot scroll far enough the field still moves: until the wheel rests, its turns stay with the
    // field wherever the pointer ended up, rather than zooming the view or scrolling the panel.
    const forward = (event: WheelEvent) => {
      const input = numberInputRef.current;
      if (!input || event.target === input || document.activeElement !== input) return;
      event.stopPropagation();
      wheelHandlerRef.current?.(event);
    };
    window.addEventListener("wheel", forward, { capture: true, passive: false });
    // The shape changes in the editor, which can paint the hint a frame or two later than this field's own render.
    const follow = () => {
      keepFieldInPlace();
      if (wheelAnchorRef.current && performance.now() < wheelAnchorRef.current.until) {
        requestAnimationFrame(follow);
        return;
      }
      wheelAnchorRef.current = null;
      window.removeEventListener("wheel", forward, true);
    };
    requestAnimationFrame(follow);
  };
  useLayoutEffect(() => {
    const input = numberInputRef.current;
    if (keepSelectedRef.current && input && document.activeElement === input) selectWholeValue(input);
    keepFieldInPlace();
  });
  useEffect(() => {
    const input = numberInputRef.current;
    if (!input) return;
    const onWheel = (event: WheelEvent) => wheelHandlerRef.current?.(event);
    input.addEventListener("wheel", onWheel, { passive: false });
    return () => input.removeEventListener("wheel", onWheel);
  }, []);
  const handleSliderChange = (nextValue: number) => {
    let next = clamp(Number.isFinite(nextValue) ? nextValue : controlMin, controlMin, controlMax);
    // Dragged with the mouse on a long slider: onto the snap grid (not for a short one, which the grid would only make coarse).
    if (draggingSliderRef.current && isLength && snapStepMm > 0 && max - min >= snapStepMm * 20) {
      const snappedMm = Math.round(toModelValue(next) / snapStepMm) * snapStepMm;
      next = clamp(millimetersToDisplay(clamp(snappedMm, min, max), workspace), controlMin, controlMax);
    }
    onChange(clamp(toModelValue(next), min, max));
    setDraft(formatShown(next));
  };
  const row = (
    <label className="range-property" style={{ "--slider-pos": `${position}%` } as CSSProperties}>
      <span className="range-property-header">
        <span className="range-property-name">{label}{onReset ? <PropertyResetButton onClick={onReset} /> : null}</span>
        <span className="range-value-control">
          <input
            ref={numberInputRef}
            type="text"
            value={editing ? draft : formatShown(controlValue)}
            disabled={disabled}
            // The decimal pad of an iPhone or iPad has no minus key (#686): a field that takes negative values asks for the keyboard with signs.
            inputMode={unit === "in" || freePosition || controlMin < 0 ? "text" : "decimal"}
            title={shownFormula ? `= ${shownFormula}` : undefined}
            data-formula={shownFormula ? "" : undefined}
            onFocus={(event) => {
              holdInteraction(true);
              const opening = openingDraft();
              openedWithRef.current = opening;
              setDraft(opening);
              setEditing(true);
              selectWholeValue(event.currentTarget);
            }}
            onChange={(event) => {
              keepSelectedRef.current = false;
              setDraft(event.currentTarget.value);
            }}
            onBlur={() => {
              keepSelectedRef.current = false;
              commitDraft();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                setDraft(openingDraft());
                setEditing(false);
              } else if ((event.key === "ArrowUp" || event.key === "ArrowDown") && !disabled && editing && !event.metaKey) {
                event.preventDefault();
                stepFieldValue(event.key === "ArrowUp" ? 1 : -1, { shift: event.shiftKey, ctrl: event.ctrlKey, alt: event.altKey });
              }
            }}
          />
          {unit ? <span className={`range-value-unit${unit === "°" ? " degree" : ""}`}>{unit}</span> : null}
        </span>
      </span>
      <div className="range-control">
        <input
          type="range"
          // Out of the Tab order: the number field above is the keyboard's way in, and Tab goes on to the next value (#300).
          tabIndex={-1}
          min={controlMin}
          max={controlMax}
          step={controlStep}
          value={sliderValue}
          disabled={disabled}
          onFocus={() => holdInteraction(true)}
          onBlur={() => holdInteraction(false)}
          onPointerDown={() => {
            window.clearTimeout(sliderReleaseTimerRef.current);
            draggingSliderRef.current = true;
            holdInteraction(true);
          }}
          onPointerUp={() => {
            endSliderDrag();
            holdInteraction(false);
          }}
          onPointerCancel={() => {
            endSliderDrag();
            holdInteraction(false);
          }}
          onChange={(event) => handleSliderChange(Number(event.currentTarget.value))}
          onDoubleClick={() => onDefault?.()}
        />
      </div>
    </label>
  );
  // Outside the label, so a click on the words does not jump into the field.
  return hint ? <>{row}<p className="property-hint">{hint}</p></> : row;
}

/**
 * A text of a shape. The field owns what is typed: `onChange` commits through the editor, for a
 * name tag after an await, and a controlled field set back to the shape's older text meanwhile
 * broke an IME in the middle of a word - "ishi" came out as "いｓい", unconvertible. So the
 * field is uncontrolled: the shape's text is written into it only while it is not being edited,
 * and a word being composed (Japanese, Chinese, Korean) is committed once, when it is done.
 */
function TextProperty({ label, value, disabled, maxLength = 24, onChange, onInteractionActiveChange }: Omit<TextPropertyConfig, "id"> & { id?: string } & { disabled?: boolean; maxLength?: number; onInteractionActiveChange?: (active: boolean) => void }) {
  const holdInteraction = useInteractionHold(onInteractionActiveChange);
  const field = useRef<HTMLInputElement>(null);
  const editing = useRef(false);
  const composing = useRef(false);
  useEffect(() => {
    if (field.current && !editing.current && field.current.value !== value) field.current.value = value;
  }, [value]);
  return (
    <label className="text-property">
      <span>{label}</span>
      <input
        ref={field}
        type="text"
        defaultValue={value}
        disabled={disabled}
        maxLength={maxLength}
        spellCheck={false}
        onFocus={() => {
          editing.current = true;
          holdInteraction(true);
        }}
        onBlur={(event) => {
          editing.current = false;
          composing.current = false;
          holdInteraction(false);
          // What the shape kept of the text (trimmed, cut to length), now that the editing is over.
          if (event.currentTarget.value !== value) event.currentTarget.value = value;
        }}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          onChange(event.currentTarget.value);
        }}
        onChange={(event) => {
          if (!composing.current) onChange(event.currentTarget.value);
        }}
      />
    </label>
  );
}

function SelectProperty({ label, value, options, hint, fontSample, disabled, onChange, onReset }: Omit<SelectPropertyConfig, "id"> & { id?: string } & { disabled?: boolean; onReset?: () => void }) {
  if (fontSample !== undefined) return <FontPicker label={label} value={value} options={options} sample={fontSample} disabled={disabled} onChange={onChange} />;
  // Aufeinanderfolgende Eintraege mit derselben Ueberschrift werden zu einem
  // Block; ohne Ueberschrift stehen sie fuer sich.
  const blocks: Array<{ group?: string; items: SelectPropertyOption[] }> = [];
  options.forEach((option) => {
    const last = blocks[blocks.length - 1];
    if (last && last.group === option.group) last.items.push(option);
    else blocks.push({ group: option.group, items: [option] });
  });
  return (
    <label className="select-property">
      <span>{label}{onReset ? <PropertyResetButton onClick={onReset} /> : null}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value)}>
        {blocks.map((block) => (
          block.group ? (
            <optgroup key={block.group} label={block.group}>
              {block.items.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </optgroup>
          ) : (
            <Fragment key={block.items[0].value}>
              {block.items.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Fragment>
          )
        ))}
      </select>
      {hint ? <small className="select-property-hint">{hint}</small> : null}
    </label>
  );
}

function ToggleProperty({ label, value, area, disabled, onChange, onReset }: Omit<TogglePropertyConfig, "id" | "type"> & { disabled?: boolean; onReset?: () => void }) {
  return (
    <label className={area ? `check-property check-property-${area}` : "check-property"}>
      <input type="checkbox" checked={value} disabled={disabled} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>{label}{onReset ? <PropertyResetButton onClick={onReset} /> : null}</span>
    </label>
  );
}

/** Holt eine Auswahl aus der Merkmalsliste heraus, um sie woanders zu zeichnen. */
function findSelectProperty(properties: ShapePropertyConfig[], id: string) {
  const found = properties.find((property) => property.id === id);
  return found && found.type === "select" ? found : null;
}

/**
 * Dieselbe Kachelreihe wie bei der Zahnradart, nur mit gezeichneten Bildchen
 * statt Rasterdateien - so bleiben sie bei jeder Groesse scharf und nehmen die
 * Farbe des Themas an.
 */
function IconOptionSelector({
  label,
  options,
  value,
  columns,
  disabled,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string; preview: ReactNode }>;
  value: string;
  columns: 2 | 3;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="gear-type-property" role="group" aria-label={label}>
      <span>{label}</span>
      <div className={columns === 2 ? "gear-type-options icon-options two-up" : "gear-type-options icon-options"}>
        {options.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? "selected" : ""}
            type="button"
            disabled={disabled}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.preview}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Seitenansichten: Schraube und Stange stehen, Mutter und Loch liegen aufgeschnitten.
 * Ein Rechtsgewinde steigt nach rechts an ("/"), auch in Gewindeloch und Mutter, damit
 * alle Symbole dieselbe Richtung zeigen.
 */
function ThreadRolePreview({ role }: { role: ThreadRole }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (role === "screw") {
    return (
      <svg {...common}>
        <path d="M5 22v-5h14v5z" />
        <path d="M9.5 17V2h5v15" />
        <path d="M9.5 6.1l5-1.1M9.5 9.6l5-1.1M9.5 13.1l5-1.1" />
        <path d="M10.5 22v-5h3v5z" />
      </svg>
    );
  }
  if (role === "nut") {
    return (
      <svg {...common}>
        <path d="M12 2.2l8.5 4.9v9.8L12 21.8 3.5 16.9V7.1z" />
        <circle cx="12" cy="12" r="4.3" />
        <path d="M7.7 11.4l8.6-1M7.7 14.6l8.6-1" />
      </svg>
    );
  }
  if (role === "bore") {
    return (
      <svg {...common}>
        <path d="M3 3h18v18H3z" />
        <path d="M9 3v18M15 3v18" />
        <path d="M9 7.6l6-1.1M9 11.6l6-1.1M9 15.6l6-1.1M9 19.6l6-1.1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 2h8v20H8z" />
      <path d="M8 6.4l8-1.4M8 10.4l8-1.4M8 14.4l8-1.4M8 18.4l8-1.4" />
    </svg>
  );
}

/** Der Kopf sitzt unten, weil die Schraube so auf der Ebene steht. */
function ThreadHeadPreview({ head }: { head: ThreadHead }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (head === "countersunk") {
    return (
      <svg {...common}>
        <path d="M4 22l5-6h6l5 6z" />
        <path d="M9 16V3h6v13" />
        <path d="M9 7.1l6-1.1M9 11.1l6-1.1" />
        <path d="M10 22v-2.6h4V22z" />
      </svg>
    );
  }
  if (head === "hex") {
    return (
      <svg {...common}>
        <path d="M4 22v-6h16v6z" />
        <path d="M8 16v6M16 16v6" />
        <path d="M9 16V3h6v13" />
        <path d="M9 7.1l6-1.1M9 11.1l6-1.1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5.5 22v-6h13v6z" />
      <path d="M9 16V3h6v13" />
      <path d="M9 7.1l6-1.1M9 11.1l6-1.1" />
      <path d="M10.5 22v-3h3v3z" />
    </svg>
  );
}

function GearTypePreview({ type }: { type: GearType }) {
  return <img src={`assets/editor/gear-types/${type}.png`} alt="" aria-hidden="true" />;
}

function GearTypeSelector({ value, disabled, onChange }: { value: GearType; disabled?: boolean; onChange: (value: GearType) => void }) {
  return (
    <div className="gear-type-property" role="group" aria-label={t("inspector.gearType")}>
      <span>{t("inspector.gearType")}</span>
      <div className="gear-type-options">
        {GEAR_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? "selected" : ""}
            type="button"
            disabled={disabled}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            <GearTypePreview type={option.value} />
            <span>{t(option.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The properties panel for several parts at once (#183), as in similar tools: how many are
 * selected, solid or hole and a colour for all of them, and locking. Sizes stay with a single
 * body, the handles and Scale by percent. One locked part holds the whole selection: the
 * panel then only offers unlocking.
 */
export function SelectionInspector({
  shapes,
  onSetHole,
  onSetColor,
  onUpdateShapes,
  onToggleLocked,
  onToggleHidden,
  onInteractionActiveChange,
  workspace,
  snap,
  snapOpen,
  onSnapChange,
  onSnapOpenChange,
  onUnitsChange,
  onObjectSnapChange,
  onSnapDockedChange,
}: {
  shapes: readonly WorkplaneShape[];
  onSetHole: (hole: boolean) => void;
  onSetColor: (color: string) => void;
  /** Changes to several of the selected parts in one step: "Fit module" for two gears (#645). */
  onUpdateShapes?: (changes: readonly { id: string; patch: Partial<WorkplaneShape> }[], message?: string) => void;
  onToggleLocked: () => void;
  /** Hides the selected parts, or shows them again when all of them are hidden (#491); the button of a single part's panel. */
  onToggleHidden?: () => void;
  onInteractionActiveChange?: (active: boolean) => void;
  /** The snap grid sits at the foot of this panel too, so it stays reachable with several parts selected (#601). */
  workspace: WorkplaneWorkspaceSettings;
  snap: GridSize;
  snapOpen: boolean;
  onSnapChange: Dispatch<SetStateAction<GridSize>>;
  onSnapOpenChange: Dispatch<SetStateAction<boolean>>;
  onUnitsChange?: (units: string) => void;
  onObjectSnapChange?: (enabled: boolean) => void;
  /** True while the snap grid is shown in this panel, so the free-standing control steps aside. */
  onSnapDockedChange?: (docked: boolean) => void;
}) {
  useLanguage();
  const movable = useMovablePanel<HTMLElement>("layerling.editor.inspectorPosition", INSPECTOR_PANEL);
  useEffect(() => {
    onSnapDockedChange?.(!movable.moved);
    return () => onSnapDockedChange?.(false);
  }, [movable.moved, onSnapDockedChange]);
  const allHidden = shapes.length > 0 && shapes.every((shape) => shape.hidden);
  const [colorOpen, setColorOpen] = useState(false);
  const { colors: recentColors, remember: rememberColor } = useRecentColors(SOLID_COLORS);
  const { colors: keptColors, toggle: toggleKeptColor } = useKeptColors();
  const solidKinds = shapes.filter((shape) => !isNonSolidShape(shape));
  const allLocked = shapes.length > 0 && shapes.every((shape) => shape.locked);
  const anyLocked = shapes.some((shape) => shape.locked);
  const allHoles = solidKinds.length > 0 && solidKinds.every((shape) => shape.hole);
  const noHoles = solidKinds.every((shape) => !shape.hole);
  const solids = solidKinds.filter((shape) => !shape.hole);
  const sharedColor = solids.length > 0 && solids.every((shape) => shape.color.toLowerCase() === solids[0].color.toLowerCase()) ? solids[0].color : null;
  const swatch = sharedColor ?? solids[0]?.color ?? SOLID_COLORS[0];
  // Two involute gears: where they mesh (#201).
  const gearPair = shapes.length === 2 ? involuteGearPair(shapes[0], shapes[1]) : null;
  // The module that would let them mesh where they stand (#645), unless they mesh there already.
  const fitModule = gearPair?.fitModule && (gearPair.distance === null || Math.abs(gearPair.distance - gearPair.current) > 0.005) ? gearPair.fitModule : null;
  const fitGearPair = () => {
    if (!fitModule || !onUpdateShapes) return;
    onUpdateShapes(gearPairFitPatches(shapes[0], shapes[1], fitModule), t("status.gearPairFitted", { module: plainNumber(fitModule) }));
  };
  const pick = (color: string) => {
    onSetColor(color);
    rememberColor(color);
    setColorOpen(false);
  };
  return (
    <aside
      ref={movable.panelRef}
      className={`shape-inspector selection-inspector ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      aria-label={t("inspector.selectionTitle", { count: shapes.length })}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="shape-inspector-header movable" title={t("inspector.moveHint")} {...movable.handleProps}>
        <div className="inspector-name">
          <strong>{t("inspector.selectionTitle", { count: shapes.length })}</strong>
        </div>
        <div className="inspector-header-actions">
          <GuideHelpLink section="selectionProperties" className="inspector-help-link" />
          <button className={allLocked ? "inspector-header-icon active" : "inspector-header-icon"} aria-label={allLocked ? t("outliner.unlock") : t("outliner.lock")} aria-keyshortcuts="Control+L" title={t("camera.shortcut", { label: allLocked ? t("outliner.unlock") : t("outliner.lock"), keys: "Ctrl+L" })} onClick={onToggleLocked}>
            {allLocked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
          {onToggleHidden ? (
            <button className={allHidden ? "inspector-header-icon active" : "inspector-header-icon"} aria-label={allHidden ? t("outliner.show") : t("outliner.hide")} aria-keyshortcuts="Control+H" title={t("camera.shortcut", { label: allHidden ? t("outliner.show") : t("outliner.hide"), keys: "Ctrl+H" })} onClick={onToggleHidden}>
              {allHidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          ) : null}
        </div>
      </div>
      {solidKinds.length > 0 ? (
        <div className="shape-state-card" role="group" aria-label={t("inspector.shapeMode")}>
          <button
            className={noHoles ? "active solid-choice" : "solid-choice"}
            onClick={() => {
              if (noHoles) setColorOpen((open) => !open);
              else onSetHole(false);
            }}
            disabled={anyLocked}
            aria-pressed={noHoles}
            aria-expanded={colorOpen}
          >
            <span className="large-solid-swatch" style={{ "--swatch": swatch } as CSSProperties} />
            <span>{t("inspector.solid")} <span className="key-hint">(S)</span></span>
          </button>
          <button
            className={allHoles ? "active hole-choice" : "hole-choice"}
            onClick={() => {
              onSetHole(true);
              setColorOpen(false);
            }}
            disabled={anyLocked}
            aria-pressed={allHoles}
          >
            <span className="large-hole-swatch" />
            <span>{t("inspector.hole")} <span className="key-hint">(H)</span></span>
          </button>
          {!noHoles && !allHoles ? <p className="selection-mixed-note">{t("inspector.selectionMixed")}</p> : null}
          {onUpdateShapes && solids.length > 0 ? (
            <ToggleProperty
              label={`${t("inspector.transparent")} (T)`}
              value={solids.every((shape) => Boolean(shape.transparent))}
              disabled={anyLocked}
              onChange={(transparent) => onUpdateShapes(
                solids.map((shape) => ({ id: shape.id, patch: { transparent: transparent || undefined } })),
                transparent ? t("status.selectionTransparent") : t("status.selectionOpaque"),
              )}
            />
          ) : null}
        </div>
      ) : null}
      {colorOpen ? (
        <div className="color-card" aria-label={t("inspector.shapeColor")} data-help-section-all="colorCard">
          <div className="color-card-header">
            <span>{t("inspector.color")}</span>
            <span className="color-value">{sharedColor ? sharedColor.toUpperCase() : t("inspector.selectionMixedColors")}</span>
          </div>
          <div className="color-grid">
            {SOLID_COLORS.map((color) => (
              <button
                key={color}
                className={sharedColor?.toLowerCase() === color.toLowerCase() ? "selected" : ""}
                type="button"
                style={{ "--shape-swatch": color } as CSSProperties}
                title={color.toUpperCase()}
                aria-label={t("aria.setColor", { color })}
                disabled={anyLocked}
                onClick={() => pick(color)}
              />
            ))}
            <label className={anyLocked ? "custom-color disabled" : "custom-color"} title={t("inspector.customColor")}>
              <CustomColorInput color={swatch} disabled={anyLocked} onCommit={pick} onInteractionActiveChange={onInteractionActiveChange} />
              <span>{t("inspector.custom")}</span>
            </label>
          </div>
          <ColorKeepRows
            recent={recentColors}
            kept={keptColors}
            current={sharedColor}
            palette={SOLID_COLORS}
            disabled={anyLocked}
            isSelected={(color) => sharedColor?.toLowerCase() === color}
            onPick={pick}
            onToggleKeep={toggleKeptColor}
          />
        </div>
      ) : null}
      {gearPair ? (
        <p className="selection-gear-pair" role="status">
          {gearPair.distance === null
            ? t("inspector.gearPairMismatch", { a: plainNumber(gearPair.modules[0]), b: plainNumber(gearPair.modules[1]) })
            : t(gearPair.internal ? "inspector.gearPairInternal" : "inspector.gearPair", { distance: plainNumber(gearPair.distance), current: plainNumber(gearPair.current) })}
          {fitModule ? <> {t("inspector.gearPairFit", { module: plainNumber(fitModule) })}</> : null}
        </p>
      ) : null}
      {fitModule && onUpdateShapes ? (
        <button type="button" className="inspector-action-button selection-gear-fit" disabled={anyLocked} title={t("inspector.gearPairFitHint")} onClick={fitGearPair}>
          {t("inspector.gearPairFitApply")}
        </button>
      ) : null}
      <p className="selection-inspector-hint">{t("inspector.selectionHint")}</p>
      {!movable.moved ? (
        <div className="inspector-snap-dock">
          <SnapGridControl units={workspace.units} onUnitsChange={onUnitsChange} customGrids={workspace.customSnapGrids} snap={snap} snapOpen={snapOpen} onSnapChange={onSnapChange} onSnapOpenChange={onSnapOpenChange} objectSnap={workspace.objectSnap} onObjectSnapChange={onObjectSnapChange} />
        </div>
      ) : null}
    </aside>
  );
}
