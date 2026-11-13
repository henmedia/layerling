"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { FocusModeBar } from "@/components/workplane/FocusModeBar";
import { ProjectNameField } from "@/components/workplane/ProjectNameField";
import { FOCUS_MODE_CHANGE_EVENT, FOCUS_MODE_SHORTCUT } from "@/lib/focusMode";
import { ShapeMenuPanel } from "@/components/workplane/ShapeMenuPanel";
import { ShapeLibraryList } from "@/components/workplane/ShapeLibraryList";
import { AlertTriangle, ArchiveRestore, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Check, CircleHelp, Percent, Circle as CircleIcon, Eye, EyeOff, Hexagon as HexagonIcon, ListTree, Maximize2, Minimize2, Pentagon as PentagonIcon, Pin, PinOff, Rotate3d, Route as RouteIcon, ScanEye, Search, Sparkles, Square as SquareIcon, Star as StarIcon, Triangle as TriangleIcon, X } from "lucide-react";
import { OPEN_FILE_BACKUPS_EVENT } from "@/lib/fileBackups";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { useWheelField } from "@/lib/useWheelField";
import { wheelNextValue } from "@/lib/wheelValueStep";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useSimpleMode } from "@/lib/useSimpleMode";
import { simpleModeKeepsShape, simpleModeKeepsTool } from "@/lib/simpleMode";
import { getEditorProfile, profileToolVisible } from "@/lib/editorProfile";
import { ribbonGroupShown, setRibbonLayout, shownInRibbon, useRibbonHidden } from "@/lib/ribbonHidden";
import { ribbonSectionOrders, useRibbonOrder } from "@/lib/ribbonOrder";
import { ribbonToolOrderFor, sortByRibbonToolOrder, useRibbonToolOrder } from "@/lib/ribbonToolOrder";
import { ribbonCollapsePriority, ribbonFoldOf, useRibbonFold } from "@/lib/ribbonFold";
import { normalizePolygonSides, normalizeStarInnerPercent, SKETCH_POLYGON_MAX_SIDES, SKETCH_POLYGON_MIN_SIDES, SKETCH_STAR_MAX_INNER_PERCENT, SKETCH_STAR_MIN_INNER_PERCENT } from "@/lib/sketchPrimitives";
import { SketchBoltCircleIcon, SketchEllipseIcon, SketchHalfCircleIcon, SketchPieSliceIcon, ToolbarAlignIcon, ToolbarAttachmentsIcon, ToolbarBuildPlatesIcon, ToolbarCenterOnWorkplaneIcon, ToolbarChamferIcon, ToolbarCaretDownIcon, ToolbarCookieCutterIcon, ToolbarFlexiIcon, ToolbarLidIcon,
  ToolbarCableChannelIcon, ToolbarCopyIcon, ToolbarDuplicateIcon, ToolbarDropToWorkplaneIcon, ToolbarBundleIcon, ToolbarGroupIcon, ToolbarGuideIcon, ToolbarHideSelectedIcon, ToolbarHomeIcon, ToolbarImportIcon, ToolbarIntersectionIcon,ToolbarClearanceIcon, ToolbarPrintCheckIcon, ToolbarHullIcon, ToolbarLoftSketchesIcon, ToolbarKeyboardIcon, ToolbarFilletIcon, ToolbarHistoryIcon, ToolbarHollowIcon, ToolbarOffsetIcon, ToolbarCutOutIcon, ToolbarPunchIcon, ToolbarDeleteFaceIcon, ToolbarSimplifyIcon, ToolbarMakeExactIcon, ToolbarSurfaceTextureIcon, ToolbarPaintIcon, ToolbarMirrorIcon, ToolbarRotationPivotIcon, ToolbarPatternIcon, ToolbarHolePatternIcon, ToolbarFaceToolIcon, ToolbarSupportRibIcon, ToolbarStencilBridgeIcon, ToolbarConstructionLineIcon, ToolbarMiddleLineIcon, ToolbarLayFlatIcon, ToolbarMateFacesIcon, ToolbarNoteIcon, ToolbarSplitIcon, ToolbarPasteIcon, ToolbarRedoIcon, ToolbarSnapGridIcon, ToolbarSettingsIcon, ToolbarShapeAddIcon, ToolbarTrashIcon, ToolbarUngroupIcon, ToolbarUndoIcon, ToolbarVectorExportIcon } from "../icons";
import { type SketchPrimitive, type SketchTool } from "../SketchWorkspace";
import { CommandPalette, type PaletteCommand } from "./CommandPalette";
import { customShapeCommands } from "@/lib/customShapeCommands";
import { COMMAND_KEYWORDS, COMMAND_SHORTCUTS, SHAPE_KEYWORDS } from "@/lib/commandKeywords";
import { readCustomShortcuts, runCustomShortcutKey, setCustomShortcutCommandSource } from "@/lib/customShortcuts";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { libraryShapeAssets, shapeAssetColor, shapeAssetLabel, shapeAssetMenuLabel, type ToolbarShapeAsset } from "@/lib/shapeCatalog";
import type { CadModifierKind } from "@/lib/cadModifierTypes";
import type { ShapeAsset, SketchOperation, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { TopPanel } from "./TopActionPanel";
import { useToolbarCollapse } from "./useToolbarCollapse";
import { createHoverOpener, type HoverOpener } from "@/lib/hoverOpen";


/** Die Befehle der Suche, die im Verlaufsblick wach bleiben: sie aendern nichts am Entwurf. */
export const HISTORY_VIEW_COMMANDS = new Set(["history", "export", "guide", "shortcuts"]);
export type ToolbarMode = "geometry" | "sketch";

export const sketchReferenceIcons = {
  line: "sketch-tool-line.png",
  arc: "sketch-tool-arc.png",
  bezier: "sketch-tool-bezier-curve.png",
  smooth: "sketch-tool-smooth-curve.png",
  freehand: "sketch-tool-freehand.png",
  select: "sketch-tool-select.png",
  image: "sketch-tool-add-image.png",
  refine: "sketch-tool-add-or-remove-points.png",
  erase: "sketch-tool-erase.png",
  measure: "sketch-tool-measure.png",
  sketchTo3d: "sketch-tool-sketch-to-3d.png",
  editSketchTo3d: "sketch-tool-edit-sketch-to-3d.png",
} as const;

export type SketchReferenceIconName = keyof typeof sketchReferenceIcons;

export function SketchReferenceIcon({ name }: { name: SketchReferenceIconName }) {
  return (
    <img
      aria-hidden="true"
      className="sketch-reference-icon"
      data-sketch-icon={name}
      draggable={false}
      src={`/assets/editor/${sketchReferenceIcons[name]}`}
      alt=""
    />
  );
}

export type SketchShapeOptions = { sides: number; innerPercent: number };

/** A number in the sketch shapes menu: typed freely, tidied to its limits when it is left. */
export function SketchShapeNumberField({ label, value, min, max, suffix, normalize, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  normalize: (value: unknown) => number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const next = normalize(draft.replace(",", "."));
    setDraft(String(next));
    onChange(next);
  };
  // The mouse wheel in the clicked field (#536): whole numbers, so one notch is one, Shift ten.
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  useWheelField(inputRef, focused, ({ direction, keys }) => {
    const typed = Number(draft.replace(",", "."));
    const next = normalize(wheelNextValue(Number.isFinite(typed) ? typed : value, direction, 1, { shift: keys.shift }));
    setDraft(String(next));
    onChange(next);
  });
  return (
    <label>
      <span>{label}</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        aria-label={label}
        title={`${min} - ${max}`}
        value={draft}
        onFocus={(event) => { setFocused(true); event.currentTarget.select(); }}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={() => { setFocused(false); commit(); }}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
      />
      {suffix ? <span className="unit">{suffix}</span> : null}
    </label>
  );
}

export const sketchShapeMenuItems = [
  { primitive: "rectangle", label: "sketch.rectangle", icon: SquareIcon },
  { primitive: "circle", label: "sketch.circle", icon: CircleIcon },
  { primitive: "ellipse", label: "sketch.ellipse", icon: SketchEllipseIcon },
  { primitive: "halfCircle", label: "sketch.halfCircle", icon: SketchHalfCircleIcon },
  { primitive: "pieSlice", label: "sketch.pieSlice", icon: SketchPieSliceIcon },
  { primitive: "triangle", label: "sketch.triangle", icon: TriangleIcon },
  { primitive: "hexagon", label: "sketch.hexagon", icon: HexagonIcon },
  { primitive: "polygon", label: "sketch.polygon", icon: PentagonIcon },
  { primitive: "star", label: "sketch.star", icon: StarIcon },
  { primitive: "boltCircle", label: "sketch.boltCircle", icon: SketchBoltCircleIcon },
] satisfies Array<{ primitive: SketchPrimitive; label: MessageKey; icon: ComponentType<SVGProps<SVGSVGElement>> }>;

export type SketchIconName = Parameters<typeof SketchReferenceIcon>[0]["name"];

/** A sketch tool's picture as a component of its own, for the command search. */
export function sketchPaletteIcon(name: SketchIconName) {
  return function SketchPaletteIcon() {
    return <SketchReferenceIcon name={name} />;
  };
}

export const SKETCH_PALETTE_ICONS = {
  line: sketchPaletteIcon("line"),
  arc: sketchPaletteIcon("arc"),
  bezier: sketchPaletteIcon("bezier"),
  smooth: sketchPaletteIcon("smooth"),
  freehand: sketchPaletteIcon("freehand"),
  select: sketchPaletteIcon("select"),
  image: sketchPaletteIcon("image"),
  refine: sketchPaletteIcon("refine"),
  erase: sketchPaletteIcon("erase"),
};

/**
 * The four groups the tools that change a body stand in, in the order of their tools: once the named sections of one
 * group, "Modify" (Stefan 31.10.2026), groups of their own since Discussion #1551, so each moves, folds and can be taken
 * out by itself. Each with its section of the tools, its group in the ribbon, its name, the icon of its folded button
 * and its place in the folding order (lower folds first; Edges & walls, the one used most, last).
 */
export const MODIFY_SECTIONS = [
  ["pattern", "mirrorPattern", "editor.section.mirrorPattern", 9],
  ["shape", "splitShape", "editor.section.splitShape", 8],
  ["edges", "edgesWalls", "editor.section.edgesWalls", 10],
  ["surface", "surface", "editor.section.surface", 7],
] as const satisfies readonly (readonly [string, string, MessageKey, number])[];
type ModifySection = (typeof MODIFY_SECTIONS)[number][0];
const MODIFY_SECTION_ICONS: Record<ModifySection, ComponentType> = {
  pattern: ToolbarMirrorIcon,
  shape: ToolbarSplitIcon,
  edges: ToolbarFilletIcon,
  surface: ToolbarSurfaceTextureIcon,
};
const modifySectionLabel = (section: string) => MODIFY_SECTIONS.find(([key]) => key === section)?.[2] ?? "editor.group.modify";

/** What a greyed-out tool waits for; its tooltip says so. */
export type ToolNeed =
  | "selection" | "body" | "oneBody" | "oneSolid" | "solid" | "twoBodies" | "twoObjects" | "twoSolids"
  | "intersect" | "group" | "visibleBodies" | "mesh" | "exactMesh" | "loft";
const need = (key: ToolNeed) => key;
const needText = (key: ToolNeed) => (key === "loft" ? t("status.loftNeedsSketches") : t(`editor.needs.${key}` as const));

/** What of a tool's need the selection has, whether locked or not. */
export type SelectionFacts = {
  count: number;
  locked: boolean;
  /** Something selected is a group, or was one before its edges were treated. */
  hasGroup: boolean;
  /** One imported mesh with enough triangles to simplify. */
  isMesh: boolean;
  /** Two sketch or SVG bodies a loft can join. */
  loftable: boolean;
};

/** Whether the selection has all a tool needs but being unlocked, so that the lock is what stops it. */
function onlyLockMissing(key: ToolNeed, facts: SelectionFacts) {
  switch (key) {
    case "oneBody": case "oneSolid": case "exactMesh": return facts.count === 1;
    case "mesh": return facts.isMesh;
    case "twoBodies": case "twoObjects": case "intersect": return facts.count >= 2;
    case "twoSolids": return facts.count === 2;
    case "loft": return facts.loftable;
    case "group": return facts.hasGroup;
    default: return facts.count >= 1;
  }
}

/**
 * Why a greyed-out tool sleeps, for its tooltip ("Select one body"), as the sketch's corner tools say it,
 * so it need not be guessed why nothing happens (31.10.2026). The lock is named only where it is all that
 * is missing; one locked box does not make Group say "unlock it". Null for a tool that is on, or one with nothing to name.
 */
export function missingForTool(tool: { id: string; enabled: boolean; needs?: ToolNeed }, historyViewActive: boolean, facts: SelectionFacts) {
  if (tool.enabled) return null;
  if (historyViewActive && tool.id !== "history") return t("editor.needs.historyView");
  if (!tool.needs) return null;
  return facts.locked && onlyLockMissing(tool.needs, facts) ? t("editor.needs.locked") : needText(tool.needs);
}

/**
 * Where the Shapes panel hangs below its button, in window pixels: the stylesheet puts it the tool row's height
 * below the top of its section, and on a narrow window under the whole bar, 10 px from the left edge (#1283).
 */
function pinnedShapesPanelHome(section: HTMLElement) {
  if (window.matchMedia("(max-width: 1240px)").matches) {
    return { left: 10, top: section.closest(".secondary-toolbar")?.getBoundingClientRect().bottom ?? 0 };
  }
  const rect = section.getBoundingClientRect();
  const tools = Number.parseFloat(getComputedStyle(section).getPropertyValue("--editor-toolbar-tools-height")) || rect.height;
  return { left: rect.left, top: rect.top + tools };
}

export function SecondaryToolbar({
  toolbarMode,
  projectName,
  onProjectNameChange,
  onToolbarModeChange,
  outlinerOpen,
  onToggleOutliner,
  alignMode,
  canAlign,
  canModifySelection,
  canEdgeModify,
  edgeModifierKind,
  canGroup,
  canIntersect,
  canHull,
  canCookieCutter,
  canFlexi,
  flexiActive,
  canLid,
  lidActive,
  canCableChannel,
  cableChannelActive,
  canLoftSketches,
  canRedo,
  canUngroup,
  canUndo,
  undoHint,
  redoHint,
  onUndoRedoHover,
  canHistoryView,
  historyViewActive,
  onHistoryView,
  hasClipboard,
  hasSelection,
  selectionFacts,
  hiddenShapeCount,
  selectionHidden,
  mirrorMode,
  canSplit,
  splitMode,
  sketchActive,
  sketchOperation,
  sketchTool,
  sketchCanUndo,
  sketchCanRedo,
  sketchHasSelection,
  sketchHasClipboard,
  canEditSketch,
  canFilletSketchPoint,
  sketchCornerDialog,
  onSketchCornerDialog,
  sketchConstruction,
  onSketchConstruction,
  sketchFromMiddle,
  onSketchFromMiddle,
  sketchStrokeActive,
  onSketchStroke,
  onStartSketch,
  onEditSketch,
  onSketchTool,
  onSketchPrimitive,
  sketchShapeOptions,
  onSketchShapeOptions,
  onSketchImage,
  onSketchCopy,
  onSketchPaste,
  onSketchDuplicate,
  onSketchDelete,
  onSketchUndo,
  onSketchRedo,
  onSketchFinish,
  onSketchCancel,
  onHome,
  focusMode = false,
  onFocusModeChange,
  onAlign,
  onChamfer,
  onCopy,
  onDelete,
  onDuplicate,
  onCenterOnWorkplane,
  onBuildPlates,
  buildPlatesActive,
  onDropToWorkplane,
  onLayFlat,
  layFlatActive,
  onMateFaces,
  mateFacesActive,
  onHolePattern,
  holePatternActive,
  canHolePattern,
  onFaceTool,
  faceToolActive,
  onSupportRib,
  supportRibActive,
  onStencilBridges,
  stencilBridgesActive,
  canStencilBridges,
  canFaceTool,
  onGroup,
  onBundle,
  onIntersect,
  onHull,
  onCookieCutter,
  onFlexi,
  onLid,
  onCableChannel,
  onLoftSketches,
  intersectPreviewActive,
  onClearanceCheck,
  clearanceActive,
  canCheckClearance,
  onPrintCheck,
  printCheckActive,
  onFillet,
  onHollow,
  hollowActive,
  onOffset,
  offsetActive,
  onCutOut,
  canCutOut,
  cutOutActive,
  onPunch,
  punchActive,
  onDeleteFace,
  deleteFaceActive,
  canSimplify,
  onSimplify,
  simplifyActive,
  canMakeExact,
  onMakeExact,
  makeExactBusy,
  canSurfaceTexture,
  onSurfaceTextureTool,
  surfaceTextureActive,
  canPaint,
  onPaint,
  paintActive,
  onMirror,
  onRotationPivot,
  rotationPivotActive,
  onArray,
  arrayActive,
  onScalePercent,
  onCarryOntoFace,
  scalePercentActive,
  onSplit,
  onPaste,
  onRedo,
  onSnap,
  onShowHidden,
  onHideOthers,
  onInvertSelection,
  onToggleHidden,
  onUngroup,
  onUndo,
  onTopPanel,
  onAddShape,
  onShortcuts,
  onWhatsNew,
  onInteractiveHelp,
  interactiveHelpActive,
  onGuide,
  noteMode,
  notesVisible,
  noteCount,
  attachmentCount,
  onNoteTool,
  onToggleNotes,
  overhangsVisible,
  overhangAngle,
  onToggleOverhangs,
  renderMyShapes,
  countMyShapeMatches,
  shapeCustomizations,
  objects,
  onSelectObject,
  customShapeEntries,
  onInsertCustomShape,
  onNotice,
  splitActive,
}: {
  toolbarMode: ToolbarMode;
  projectName: string;
  onProjectNameChange?: (name: string) => void;
  onToolbarModeChange: (mode: ToolbarMode) => void;
  outlinerOpen: boolean;
  onToggleOutliner: () => void;
  alignMode: boolean;
  canAlign: boolean;
  /** Something is selected and none of it is locked: the Modify and Arrange tools may act on it. */
  canModifySelection: boolean;
  canEdgeModify: boolean;
  edgeModifierKind: CadModifierKind | null;
  canGroup: boolean;
  canIntersect: boolean;
  canHull: boolean;
  canCookieCutter: boolean;
  canFlexi: boolean;
  flexiActive: boolean;
  canLid: boolean;
  lidActive: boolean;
  /** The cable channel (one solid selected) and whether its panel is open. */
  canCableChannel: boolean;
  cableChannelActive: boolean;
  canLoftSketches: boolean;
  canRedo: boolean;
  canUngroup: boolean;
  canUndo: boolean;
  /** What undo would take back, with its measure ("Rounded the edges of Box (5 mm)"), named on its button (#1023). */
  undoHint?: string | null;
  /** What redo would bring again. */
  redoHint?: string | null;
  /** The pointer or the focus came onto undo or redo: time to work out their hints. */
  onUndoRedoHover?: () => void;
  canHistoryView: boolean;
  historyViewActive: boolean;
  onHistoryView: () => void;
  hasClipboard: boolean;
  hasSelection: boolean;
  /** What the selection is, for the tooltip of a greyed-out tool to say what is missing. */
  selectionFacts: SelectionFacts;
  hiddenShapeCount: number;
  selectionHidden: boolean;
  mirrorMode: boolean;
  canSplit: boolean;
  splitMode: boolean;
  sketchActive: boolean;
  sketchOperation: SketchOperation;
  sketchTool: SketchTool;
  sketchCanUndo: boolean;
  sketchCanRedo: boolean;
  sketchHasSelection: boolean;
  sketchHasClipboard: boolean;
  canEditSketch: boolean;
  canFilletSketchPoint?: boolean;
  sketchCornerDialog?: "fillet" | "chamfer" | null;
  onSketchCornerDialog?: (dialog: "fillet" | "chamfer" | null) => void;
  sketchConstruction?: boolean;
  onSketchConstruction?: () => void;
  sketchFromMiddle?: boolean;
  onSketchFromMiddle?: () => void;
  sketchStrokeActive?: boolean;
  onSketchStroke?: () => void;
  onStartSketch: (operation: SketchOperation) => void;
  onEditSketch: () => void;
  onSketchTool: (tool: SketchTool) => void;
  onSketchPrimitive: (primitive: SketchPrimitive) => void;
  sketchShapeOptions: SketchShapeOptions;
  onSketchShapeOptions: (options: SketchShapeOptions) => void;
  onSketchImage: () => void;
  onSketchCopy: () => void;
  onSketchPaste: () => void;
  onSketchDuplicate: () => void;
  onSketchDelete: () => void;
  onSketchUndo: () => void;
  onSketchRedo: () => void;
  onSketchFinish: () => void;
  onSketchCancel: () => void;
  onHome?: () => void;
  /** Focus mode (Discussion #1554): the title row gives way to a small bar over the view. */
  focusMode?: boolean;
  onFocusModeChange?: (on: boolean) => void;
  onAlign: () => void;
  onChamfer: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCenterOnWorkplane: () => void;
  /** Shows or hides the bar of build plates (Discussion #456). */
  onBuildPlates?: () => void;
  buildPlatesActive?: boolean;
  onDropToWorkplane: () => void;
  onLayFlat: () => void;
  layFlatActive: boolean;
  onMateFaces: () => void;
  mateFacesActive: boolean;
  onHolePattern: () => void;
  holePatternActive: boolean;
  canHolePattern: boolean;
  onFaceTool: () => void;
  faceToolActive: boolean;
  /** "Support rib" (#1385): a rib under the lower face of a tilted part. */
  onSupportRib: () => void;
  supportRibActive: boolean;
  /** "Stencil bridges" (#1438): bridges for the parts of a plate with text cut through that would fall out. */
  onStencilBridges: () => void;
  stencilBridgesActive: boolean;
  canStencilBridges: boolean;
  canFaceTool: boolean;
  onGroup: () => void;
  onBundle: () => void;
  onIntersect: () => void;
  onHull: () => void;
  onCookieCutter: () => void;
  onFlexi: () => void;
  onLid: () => void;
  onCableChannel: () => void;
  onLoftSketches: () => void;
  /** Intersection shows the common part first and applies it on the second click (#372). */
  intersectPreviewActive: boolean;
  /** The clearance check (Spiel prüfen): opens its panel, or closes it. */
  onClearanceCheck: () => void;
  clearanceActive: boolean;
  /** A visible body to check: the selection's, or the design's when nothing is selected. */
  canCheckClearance: boolean;
  /** The print check (Druck prüfen): opens its panel, or closes it. It checks the same bodies, so canCheckClearance enables it too. */
  onPrintCheck: () => void;
  printCheckActive: boolean;
  onFillet: () => void;
  onHollow: () => void;
  hollowActive: boolean;
  onOffset: () => void;
  offsetActive: boolean;
  onCutOut: () => void;
  canCutOut: boolean;
  cutOutActive: boolean;
  /** Punch (#703): the first body's outline through the second; enabled like Cut out, for two solids. */
  onPunch: () => void;
  punchActive: boolean;
  onDeleteFace: () => void;
  deleteFaceActive: boolean;
  canSimplify: boolean;
  onSimplify: () => void;
  simplifyActive: boolean;
  /** Make exact: a mesh body rebuilt as an exact solid. Busy while the kernel works on it. */
  canMakeExact: boolean;
  onMakeExact: () => void;
  makeExactBusy: boolean;
  /** One body selected that can take a surface texture. */
  canSurfaceTexture: boolean;
  /** Opens or closes the selected body's surface texture card. */
  onSurfaceTextureTool: () => void;
  surfaceTextureActive: boolean;
  /** One solid body selected that can be painted (paint.ts). */
  canPaint: boolean;
  /** Opens or closes the paint tool for the selected body. */
  onPaint: () => void;
  paintActive: boolean;
  onMirror: () => void;
  onRotationPivot: () => void;
  rotationPivotActive: boolean;
  onArray: () => void;
  arrayActive: boolean;
  onScalePercent: () => void;
  onCarryOntoFace: () => void;
  scalePercentActive: boolean;
  onSplit: () => void;
  onPaste: () => void;
  onRedo: () => void;
  onSnap: () => void;
  onShowHidden: () => void;
  /** Hide everything but the selection, and select what is not selected (Discussion #1472). */
  onHideOthers: () => void;
  onInvertSelection: () => void;
  onToggleHidden: () => void;
  onUngroup: () => void;
  onUndo: () => void;
  onTopPanel: (panel: TopPanel) => void;
  onAddShape: (shape: ShapeAsset) => void;
  onShortcuts: () => void;
  /** Opens the list of updates over the design (#1530); without it the button and the command are left out. */
  onWhatsNew?: () => void;
  onInteractiveHelp: () => void;
  interactiveHelpActive: boolean;
  onGuide: () => void;
  noteMode: boolean;
  notesVisible: boolean;
  noteCount: number;
  /** How many files are kept with the design; the clip shows a dot while there are any (#820). */
  attachmentCount: number;
  onNoteTool: () => void;
  onToggleNotes: () => void;
  overhangsVisible: boolean;
  overhangAngle: number;
  onToggleOverhangs: () => void;
  /** Custom shapes above the library; gets the way to close the menu. */
  renderMyShapes?: (close: () => void, query?: string) => ReactNode;
  /** How many custom shapes match a search in the shapes window (#1537). */
  countMyShapeMatches?: (query: string) => number;
  /** The shape defaults, so each library entry can show the colour it will be added in. */
  shapeCustomizations: WorkplaneWorkspaceSettings["shapeCustomizations"];
  /** The bodies of the design, so the command search can find them by name. */
  objects: ReadonlyArray<{ id: string; name: string; kind: string; hidden: boolean }>;
  onSelectObject: (id: string) => void;
  /** The shapes the person saved (Custom shapes), found by name in the command search like the library's. */
  customShapeEntries?: Array<{ id: string; name: string; thumbnail: string }>;
  onInsertCustomShape?: (id: string) => void;
  /** Shows a line in the status bar - here: that a command on a key of your own cannot run right now. */
  onNotice?: (text: string) => void;
  /** While a body is being split the editor keeps every key; keys of your own wait too. */
  splitActive?: boolean;
}) {
  const [shapesOpen, setShapesOpen] = useState(false);
  // The name of the clip button: with the number of files once there are some, so a screen reader hears what the dot shows.
  const attachmentsLabel = attachmentCount > 0 ? t("editor.attachmentsCount", { count: attachmentCount }) : t("editor.attachments");
  // The Shapes panel kept open while shapes are placed one after the other (#433); remembered in this browser.
  const [geometryShapesPinned, setGeometryShapesPinned] = useState(false);
  // The sketch's panel has its own pin, its own place and its own size (#577).
  const [sketchShapesPinned, setSketchShapesPinned] = useState(false);
  const shapesPinned = toolbarMode === "sketch" ? sketchShapesPinned : geometryShapesPinned;
  const shapesPinnedRef = useRef(false);
  shapesPinnedRef.current = shapesPinned;
  useEffect(() => {
    try {
      const pinned = window.localStorage.getItem("layerling.editor.shapeMenuPinned") === "true";
      setGeometryShapesPinned(pinned);
      setSketchShapesPinned(window.localStorage.getItem("layerling.sketch.shapeMenuPinned") === "true");
      // A pinned panel is there again at the next start, not only its pin (forum, prmod3d).
      if (pinned) setShapesOpen(true);
    } catch {
      // Blocked storage: the panel closes after each shape, as it always did.
    }
  }, []);
  const toggleShapesPinned = () => {
    const next = !shapesPinnedRef.current;
    const sketch = toolbarMode === "sketch";
    (sketch ? setSketchShapesPinned : setGeometryShapesPinned)(next);
    try {
      window.localStorage.setItem(sketch ? "layerling.sketch.shapeMenuPinned" : "layerling.editor.shapeMenuPinned", String(next));
    } catch {
      // The pin still works for this visit.
    }
  };
  // Resting the mouse on the chevron tab under the Shapes button opens the panel, as it opens a folded group (#1722).
  const shapesOpenRef = useRef(false);
  shapesOpenRef.current = shapesOpen;
  const shapesHoverRef = useRef<HoverOpener | null>(null);
  if (!shapesHoverRef.current) {
    shapesHoverRef.current = createHoverOpener({
      isOpen: () => shapesOpenRef.current,
      isPinned: () => shapesPinnedRef.current,
      open: () => {
        setVisibilityOpen(false);
        setShapesOpen(true);
      },
      close: () => setShapesOpen(false),
    });
  }
  const shapesHover = shapesHoverRef.current;
  useEffect(() => () => shapesHover.dispose(), [shapesHover]);
  // Closed some other way or pinned: the mouse leaving no longer closes it.
  useEffect(() => {
    if (!shapesOpen || shapesPinned) shapesHover.settle();
  }, [shapesOpen, shapesPinned, shapesHover]);
  /** The pointer handlers of the shapes section: the tab opens, leaving the button and panel closes what the mouse opened. */
  const shapesHoverProps = {
    onPointerEnter: (event: ReactPointerEvent) => shapesHover.enter(event.pointerType),
    onPointerLeave: (event: ReactPointerEvent) => shapesHover.leave(event.pointerType),
    // Working in the panel (a search typed, a tab chosen) keeps it, as a click on the button does.
    onPointerDown: (event: ReactPointerEvent) => {
      if (event.target instanceof Element && !event.target.closest(".shape-menu-trigger")) shapesHover.settle();
    },
  };
  const shapesTab = (
    <span className="shape-menu-tab" aria-hidden="true" onPointerEnter={(event) => shapesHover.enterTab(event.pointerType)} />
  );
  const toggleShapesFromButton = () => {
    if (!shapesHover.click()) return;
    setVisibilityOpen(false);
    setShapesOpen((open) => !open);
  };
  /** Picking a shape closes the panel, unless it is pinned open. */
  const closeShapesAfterPick = () => {
    if (!shapesPinnedRef.current) setShapesOpen(false);
  };
  // On a narrow window the tools wrap onto more rows. Their real height goes
  // into --editor-toolbar-height, which the workplane, the status and the menus
  // below the bar are placed by.
  const toolbarContentRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const content = toolbarContentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const apply = () => {
      const styles = getComputedStyle(root);
      // Focus mode sets the title row to 0, which is a height and no missing value (#1554).
      const titleValue = parseFloat(styles.getPropertyValue("--editor-toolbar-title-height"));
      const title = Number.isFinite(titleValue) ? titleValue : 44;
      const minimum = parseFloat(styles.getPropertyValue("--editor-toolbar-tools-height")) || 76;
      const tools = content.offsetHeight;
      // A hidden editor measures nothing; it keeps the one-row height.
      root.style.setProperty("--editor-toolbar-height", `${Math.round(title + Math.max(minimum, tools))}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(content);
    // The title row comes and goes with focus mode, and the tools keep their size meanwhile.
    window.addEventListener(FOCUS_MODE_CHANGE_EVENT, apply);
    return () => {
      observer.disconnect();
      window.removeEventListener(FOCUS_MODE_CHANGE_EVENT, apply);
      root.style.removeProperty("--editor-toolbar-height");
    };
  }, []);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibilityMenuPosition, setVisibilityMenuPosition] = useState({ top: 0, left: 0 });
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  // A pinned Shapes panel stays open beside the work, so it lies under the inspector, not over it (#1283). The
  // toolbar's layer is above the inspector's; the pinned panel moves out of it into the workplane, where the
  // inspector is, and stands where it hung below its button.
  const [pinnedShapesHome, setPinnedShapesHome] = useState<{ stage: HTMLElement; left: number; top: number } | null>(null);
  const shapesUnderInspector = shapesOpen && geometryShapesPinned && toolbarMode !== "sketch";
  useLayoutEffect(() => {
    if (!shapesUnderInspector) {
      setPinnedShapesHome(null);
      return;
    }
    const measure = () => {
      const section = shapesMenuRef.current;
      const stage = section?.closest(".layerling-editor")?.querySelector<HTMLElement>(".workplane-stage") ?? null;
      if (!section || !stage) {
        setPinnedShapesHome(null);
        return;
      }
      const home = pinnedShapesPanelHome(section);
      setPinnedShapesHome((current) => current && current.stage === stage && current.left === home.left && current.top === home.top ? current : { stage, ...home });
    };
    measure();
    window.addEventListener("resize", measure);
    const toolbar = shapesMenuRef.current?.closest(".secondary-toolbar");
    const observer = typeof ResizeObserver === "undefined" || !toolbar ? null : new ResizeObserver(measure);
    if (toolbar) observer?.observe(toolbar);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [shapesUnderInspector]);
  /** The Shapes panel where it hangs from the toolbar, or, pinned, in the workplane at the same spot. */
  const inPinnedShapesHome = (panel: ReactNode) => pinnedShapesHome
    ? createPortal(
        <div
          className="shape-menu-home"
          inert={historyViewActive}
          style={{ "--shape-menu-home-left": `${pinnedShapesHome.left}px`, "--shape-menu-home-top": `${pinnedShapesHome.top}px` } as CSSProperties}
        >
          {panel}
        </div>,
        pinnedShapesHome.stage,
      )
    : panel;
  const visibilityMenuRef = useRef<HTMLDivElement>(null);
  const touchShapeStartRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const suppressNextShapeClickRef = useRef(false);
  const selectToolbarMode = (mode: "geometry" | "sketch") => {
    setShapesOpen(false);
    setVisibilityOpen(false);
    onTopPanel(null);
    onToolbarModeChange(mode);
  };
  const addShapeFromMenu = (shape: ShapeAsset) => {
    onAddShape({ ...shape, name: shapeAssetLabel(shape) });
    closeShapesAfterPick();
  };
  const addSketchShapeFromMenu = (primitive: SketchPrimitive) => {
    onSketchPrimitive(primitive);
    closeShapesAfterPick();
  };
  const startSketch = (operation: SketchOperation) => {
    onStartSketch(operation);
  };
  useEffect(() => {
    if (!historyViewActive) return;
    setShapesOpen(false);
    setVisibilityOpen(false);
  }, [historyViewActive]);
  const simpleMode = useSimpleMode();
  // Buttons and groups taken out of the ribbon in the settings (#1519); the command search and the keys still have them.
  const ribbonHidden = useRibbonHidden();
  // The order of the groups set in the settings (#1519, #1502): every section carries its place as a CSS order, and the two
  // wrappers of the groups lay their sections out as if they were not there (globals.css), so a group can move anywhere.
  const ribbonOrder = useRibbonOrder();
  const sectionOrder = ribbonSectionOrders(ribbonOrder);
  // The order of the buttons inside each group, set in the same place (#1519): a group's buttons are sorted by it before the
  // ribbon draws them and the settings list them.
  const toolOrder = useRibbonToolOrder();
  const ordered = <T extends { id: string }>(group: string, tools: readonly T[]) => sortByRibbonToolOrder(tools, ribbonToolOrderFor(toolOrder, group));
  // How each group folds (#1551): its place in the folding order, and whether it stays folded. The simple mode folds as it
  // always did, so a choice made for the full ribbon does not fold a group that is one or two buttons there.
  const ribbonFold = useRibbonFold();
  const foldProps = (group: string, priority: number) => {
    const fold = simpleMode ? "auto" : ribbonFoldOf(ribbonFold, group);
    return { "data-collapse": String(ribbonCollapsePriority(priority, fold)), "data-fold": fold === "always" ? "always" : undefined };
  };
  // Groups the window has no room for fold into one button that opens on hover or a tap (Stefan, 29.10.2026). The simple
  // mode keeps every tool in sight, as it always did, and so does the pin in the title row, for whoever wants it so.
  const [ribbonPinned, setRibbonPinned] = useState(false);
  useEffect(() => {
    try {
      setRibbonPinned(window.localStorage.getItem("layerling.editor.ribbonPinned") === "true");
    } catch {
      // Blocked storage: the groups fold as the window needs.
    }
  }, []);
  const toggleRibbonPinned = () => {
    const next = !ribbonPinned;
    setRibbonPinned(next);
    try {
      window.localStorage.setItem("layerling.editor.ribbonPinned", String(next));
    } catch {
      // The pin still holds for this visit.
    }
  };
  useToolbarCollapse(toolbarContentRef, !simpleMode && !ribbonPinned);
  /**
   * The one button a folded group shows under its name, with the icon of the tool it is known by; its hint says it opens.
   * Given that tool, the button is the tool itself - History's Undo undoes, as its icon says (#1148) - and only the tab
   * under it opens the group.
   */
  const collapseBox = (label: string, Icon: ComponentType, tool?: ToolbarTool) => (
    <div className="toolbar-section-tools toolbar-collapse-box">
      {tool ? (
        // The tab hangs from the button, not from the frame, so it lines up with the other groups' tabs at every
        // toolbar size (#1506).
        <span className="toolbar-collapse-anchor">
          {toolButton(tool, true)}
          <button className="toolbar-collapse-trigger toolbar-collapse-tab" type="button" aria-label={t("editor.group.foldedHint", { group: label })} title={t("editor.group.foldedHint", { group: label })} aria-expanded={false} data-collapse-trigger />
        </span>
      ) : (
        <button className="toolbar-icon toolbar-collapse-trigger" type="button" aria-label={t("editor.group.foldedHint", { group: label })} title={t("editor.group.foldedHint", { group: label })} aria-expanded={false} data-collapse-trigger>
          <Icon />
        </button>
      )}
    </div>
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = () => {
    // The command search lists everything, also what the simple mode keeps away (#695).
    if (simpleMode) return;
    setShapesOpen(false);
    setVisibilityOpen(false);
    setPaletteOpen(true);
  };
  const openPaletteRef = useRef(openPalette);
  openPaletteRef.current = openPalette;
  useEffect(() => {
    // Ctrl/Cmd+K opens the command search from anywhere in the editor, also
    // while a field has the focus - the browsers' own use of the key (a search
    // bar) is not worth keeping here.
    const openOnShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || (event.key ?? "").toLowerCase() !== "k") return;
      event.preventDefault();
      openPaletteRef.current();
    };
    window.addEventListener("keydown", openOnShortcut);
    return () => window.removeEventListener("keydown", openOnShortcut);
  }, []);
  // Keys of your own (Discussion #1399): the shortcut list puts a command of the search on a key, and the key runs it
  // here, through the same entry the search would run. The listener sits before every other one (capture on the
  // window) and stops the key when it is one of yours, so nothing else answers it as well. It keeps out of the way
  // where the editor's own keys do: in a text field, behind a window that holds the keys, behind the project overview,
  // while a body is split, and while the list waits for a key to set.
  const buildPaletteCommandsRef = useRef<() => PaletteCommand[]>(() => []);
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;
  const splitActiveRef = useRef(Boolean(splitActive));
  splitActiveRef.current = Boolean(splitActive);
  useEffect(() => {
    const runOwnKey = (event: KeyboardEvent) => {
      runCustomShortcutKey(event, () => buildPaletteCommandsRef.current(), {
        blocked: splitActiveRef.current,
        unavailable: (command) => onNoticeRef.current?.(t("customKeys.unavailable", { command: command.label })),
      });
    };
    window.addEventListener("keydown", runOwnKey, true);
    // The shortcut list reads the commands from here to offer them for a key.
    setCustomShortcutCommandSource(() => buildPaletteCommandsRef.current().filter((command) => !command.transient));
    return () => {
      window.removeEventListener("keydown", runOwnKey, true);
      setCustomShortcutCommandSource(null);
    };
  }, []);
  // Leaving the sketch closes the sketch's shape palette; at the start there is nothing to close (a pinned panel opens then).
  const sketchWasActiveRef = useRef(sketchActive);
  useEffect(() => {
    if (sketchWasActiveRef.current && !sketchActive) setShapesOpen(false);
    sketchWasActiveRef.current = sketchActive;
  }, [sketchActive]);
  useEffect(() => {
    if (!shapesOpen) return;
    // Pinned open, a click elsewhere is the click that puts the shape, and Esc cancels the placing: neither closes the panel.
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!shapesPinnedRef.current && !shapesMenuRef.current?.contains(event.target as Node)) setShapesOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !shapesPinnedRef.current) setShapesOpen(false);
    };
    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [shapesOpen]);
  useEffect(() => {
    if (!visibilityOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!visibilityMenuRef.current?.contains(event.target as Node)) setVisibilityOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisibilityOpen(false);
    };
    const closeOnViewportChange = () => setVisibilityOpen(false);
    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [visibilityOpen]);
  const toggleVisibilityMenu = () => {
    if (visibilityOpen) {
      setVisibilityOpen(false);
      return;
    }
    const triggerBounds = visibilityMenuRef.current?.getBoundingClientRect();
    if (triggerBounds) {
      const viewportGutter = 12;
      const menuWidth = Math.min(276, Math.max(0, window.innerWidth - viewportGutter * 2));
      setVisibilityMenuPosition({
        top: triggerBounds.bottom + 8,
        left: Math.max(
          viewportGutter,
          Math.min(
            triggerBounds.left + triggerBounds.width / 2 - menuWidth / 2,
            window.innerWidth - menuWidth - viewportGutter,
          ),
        ),
      });
    }
    setShapesOpen(false);
    onTopPanel(null);
    setVisibilityOpen(true);
  };
  // Die Leiste haengt an der Sprache: ohne dieses Abonnement bliebe sie stehen,
  // falls sie spaeter einmal memoisiert wird.
  useLanguage();
  // The simple mode (#695) shows the tools of a workshop only; the others stay in the lists the command search and the keys read.
  const profile = getEditorProfile();
  const availableInRibbon = (id: string) => profileToolVisible(profile, id, !simpleMode || simpleModeKeepsTool(id));
  const shownLayoutTools = <T extends { id: string }>(tools: T[]) => shownInRibbon(tools.filter(({ id }) => availableInRibbon(id)), ribbonHidden);
  const shownShapeAssets = simpleMode ? libraryShapeAssets.filter((shape) => simpleModeKeepsShape(shape.id)) : libraryShapeAssets;
  const leftTools = [
    { id: "copy", label: t("editor.tool.copy"), icon: ToolbarCopyIcon, action: onCopy, enabled: hasSelection, needs: need("selection") },
    { id: "paste", label: t("editor.tool.paste"), icon: ToolbarPasteIcon, action: onPaste, enabled: hasClipboard, hint: hasClipboard ? null : t("editor.needs.clipboard") },
    { id: "duplicate", label: t("editor.tool.duplicate"), icon: ToolbarDuplicateIcon, action: onDuplicate, enabled: hasSelection, needs: need("selection") },
    { id: "delete", label: t("editor.tool.delete"), icon: ToolbarTrashIcon, action: onDelete, enabled: canModifySelection, needs: need("selection") },
    { id: "undo", label: t("editor.tool.undo"), icon: ToolbarUndoIcon, action: onUndo, enabled: canUndo, hint: canUndo ? undoHint : null, onHover: onUndoRedoHover },
    { id: "redo", label: t("editor.tool.redo"), icon: ToolbarRedoIcon, action: onRedo, enabled: canRedo, hint: canRedo ? redoHint : null, onHover: onUndoRedoHover },
    { id: "history", label: t("editor.tool.history"), icon: ToolbarHistoryIcon, action: onHistoryView, enabled: canHistoryView, active: historyViewActive },
  ];
  const visibilityTools = [
    {
      id: "outliner",
      label: outlinerOpen ? t("editor.tool.hideOutliner") : t("editor.tool.showOutliner"),
      icon: ListTree,
      action: () => {
        setVisibilityOpen(false);
        onToggleOutliner();
      },
      enabled: true,
      active: outlinerOpen,
    },
    {
      id: "toggle-hidden",
      label: selectionHidden ? t("editor.tool.showSelected") : t("editor.tool.hideSelected"),
      icon: ToolbarHideSelectedIcon,
      action: () => {
        setVisibilityOpen(false);
        onToggleHidden();
      },
      enabled: hasSelection,
      needs: need("selection"),
    },
  ];
  const combineTools = [
    { id: "group", label: t("editor.tool.group"), icon: ToolbarGroupIcon, action: onGroup, enabled: canGroup, needs: need("twoBodies") },
    { id: "bundle", label: t("editor.tool.bundle"), icon: ToolbarBundleIcon, action: onBundle, enabled: canGroup, needs: need("twoBodies") },
    { id: "ungroup", label: t("editor.tool.ungroup"), icon: ToolbarUngroupIcon, action: onUngroup, enabled: canUngroup, needs: need("group") },
    { id: "intersect", label: t("editor.tool.intersect"), icon: ToolbarIntersectionIcon, action: onIntersect, enabled: canIntersect || intersectPreviewActive, active: intersectPreviewActive, needs: need("intersect") },
    { id: "cutOut", label: t("editor.tool.cutOut"), icon: ToolbarCutOutIcon, action: onCutOut, enabled: canCutOut || cutOutActive, active: cutOutActive, needs: need("twoSolids") },
    { id: "punch", label: t("editor.tool.punch"), icon: ToolbarPunchIcon, action: onPunch, enabled: canCutOut || punchActive, active: punchActive, needs: need("twoSolids") },
    { id: "hull", label: t("editor.tool.hull"), icon: ToolbarHullIcon, action: onHull, enabled: canHull, needs: need("twoBodies") },
    { id: "loftSketches", label: t("editor.tool.loftSketches"), icon: ToolbarLoftSketchesIcon, action: onLoftSketches, enabled: canLoftSketches, needs: need("loft") },
    { id: "clearance-check", label: t("editor.tool.clearance"), icon: ToolbarClearanceIcon, action: onClearanceCheck, enabled: canCheckClearance || clearanceActive, active: clearanceActive, needs: need("visibleBodies") },
    { id: "print-check", label: t("editor.tool.printCheck"), icon: ToolbarPrintCheckIcon, action: onPrintCheck, enabled: canCheckClearance || printCheckActive, active: printCheckActive, needs: need("visibleBodies") },
  ];
  const modifyTools = [
    { id: "mirror", section: "pattern", label: t("editor.tool.mirror"), icon: ToolbarMirrorIcon, action: onMirror, enabled: canModifySelection, active: mirrorMode, needs: need("selection") },
    { id: "pivot", section: "pattern", label: t("editor.tool.rotationPivot"), icon: ToolbarRotationPivotIcon, action: onRotationPivot, enabled: canModifySelection, active: rotationPivotActive, needs: need("selection") },
    { id: "array", section: "pattern", label: t("editor.tool.array"), icon: ToolbarPatternIcon, action: onArray, enabled: canModifySelection, active: arrayActive, needs: need("selection") },
    { id: "holePattern", section: "pattern", label: t("holePattern.title"), icon: ToolbarHolePatternIcon, action: onHolePattern, enabled: canHolePattern, active: holePatternActive, needs: need("oneSolid") },
    { id: "faceTool", section: "pattern", label: t("faceTool.title"), icon: ToolbarFaceToolIcon, action: onFaceTool, enabled: canFaceTool, active: faceToolActive, needs: need("oneSolid") },
    { id: "split", section: "shape", label: t("editor.tool.split"), icon: ToolbarSplitIcon, action: onSplit, enabled: splitMode || canSplit, active: splitMode, needs: need("visibleBodies") },
    { id: "flexi", section: "shape", label: t("editor.tool.flexi"), icon: ToolbarFlexiIcon, action: onFlexi, enabled: canFlexi || flexiActive, active: flexiActive, needs: need("solid") },
    { id: "supportRib", section: "shape", label: t("supportRib.title"), icon: ToolbarSupportRibIcon, action: onSupportRib, enabled: canFaceTool || supportRibActive, active: supportRibActive, needs: need("oneSolid") },
    { id: "stencilBridges", section: "shape", label: t("stencilBridges.title"), icon: ToolbarStencilBridgeIcon, action: onStencilBridges, enabled: canStencilBridges || stencilBridgesActive, active: stencilBridgesActive, needs: need("solid") },
    { id: "cookieCutter", section: "shape", label: t("editor.tool.cookieCutter"), icon: ToolbarCookieCutterIcon, action: onCookieCutter, enabled: canCookieCutter, needs: need("body") },
    { id: "chamfer", section: "edges", label: t("editor.tool.chamfer"), icon: ToolbarChamferIcon, action: onChamfer, enabled: canEdgeModify, active: edgeModifierKind === "chamfer" || edgeModifierKind === "chamfillet", needs: need("oneBody") },
    { id: "fillet", section: "edges", label: t("editor.tool.fillet"), icon: ToolbarFilletIcon, action: onFillet, enabled: canEdgeModify, active: edgeModifierKind === "fillet", needs: need("oneBody") },
    { id: "hollow", section: "edges", label: t("editor.tool.hollow"), icon: ToolbarHollowIcon, action: onHollow, enabled: canEdgeModify, active: hollowActive, needs: need("oneBody") },
    { id: "lid", section: "edges", label: t("editor.tool.lid"), icon: ToolbarLidIcon, action: onLid, enabled: canLid || lidActive, active: lidActive, needs: need("solid") },
    { id: "cableChannel", section: "edges", label: t("editor.tool.cableChannel"), icon: ToolbarCableChannelIcon, action: onCableChannel, enabled: canCableChannel || cableChannelActive, active: cableChannelActive, needs: need("oneSolid") },
    { id: "offset", section: "edges", label: t("editor.tool.offset"), icon: ToolbarOffsetIcon, action: onOffset, enabled: canEdgeModify, active: offsetActive, needs: need("oneBody") },
    { id: "deleteFace", section: "edges", label: t("editor.tool.deleteFace"), icon: ToolbarDeleteFaceIcon, action: onDeleteFace, enabled: canEdgeModify, active: deleteFaceActive, needs: need("oneBody") },
    { id: "simplify", section: "surface", label: t("editor.tool.simplify"), icon: ToolbarSimplifyIcon, action: onSimplify, enabled: canSimplify, active: simplifyActive, needs: need("mesh") },
    { id: "makeExact", section: "surface", label: t("editor.tool.makeExact"), icon: ToolbarMakeExactIcon, action: onMakeExact, enabled: canMakeExact && !makeExactBusy, active: makeExactBusy, needs: need("exactMesh") },
    { id: "surfaceTexture", section: "surface", label: t("inspector.surfaceTexture"), icon: ToolbarSurfaceTextureIcon, action: onSurfaceTextureTool, enabled: canSurfaceTexture, active: surfaceTextureActive, needs: need("oneBody") },
    { id: "paint", section: "surface", label: t("paint.title"), icon: ToolbarPaintIcon, action: onPaint, enabled: canPaint || paintActive, active: paintActive, needs: need("oneSolid") },
  ] satisfies readonly ({ section: ModifySection } & Record<string, unknown>)[];
  const arrangeTools = [
    { id: "align", label: t("editor.tool.align"), icon: ToolbarAlignIcon, action: onAlign, enabled: canAlign, active: alignMode, needs: need("twoObjects") },
    { id: "snap", label: t("editor.tool.snapToGrid"), icon: ToolbarSnapGridIcon, action: onSnap, enabled: canModifySelection, needs: need("selection") },
    { id: "drop", label: t("editor.tool.dropToWorkplane"), icon: ToolbarDropToWorkplaneIcon, action: onDropToWorkplane, enabled: canModifySelection, needs: need("selection") },
    { id: "layFlat", label: t("editor.tool.layFlat"), icon: ToolbarLayFlatIcon, action: onLayFlat, enabled: canModifySelection, active: layFlatActive, needs: need("selection") },
    { id: "mateFaces", label: t("editor.tool.mateFaces"), icon: ToolbarMateFacesIcon, action: onMateFaces, enabled: canModifySelection, active: mateFacesActive, needs: need("selection") },
    { id: "center", label: t("editor.tool.centerOnWorkplane"), icon: ToolbarCenterOnWorkplaneIcon, action: onCenterOnWorkplane, enabled: canModifySelection, needs: need("selection") },
    ...(onBuildPlates ? [{ id: "buildPlates", label: t("editor.tool.buildPlates"), icon: ToolbarBuildPlatesIcon, action: onBuildPlates, enabled: true, active: Boolean(buildPlatesActive) }] : []),
  ];
  const sketchClipboardTools = [
    { id: "sketch-copy", label: t("editor.tool.copy"), icon: ToolbarCopyIcon, action: onSketchCopy, enabled: sketchHasSelection, hint: sketchHasSelection ? null : t("editor.needs.sketchSelection") },
    { id: "sketch-paste", label: t("editor.tool.paste"), icon: ToolbarPasteIcon, action: onSketchPaste, enabled: sketchHasClipboard, hint: sketchHasClipboard ? null : t("editor.needs.clipboard") },
    { id: "sketch-duplicate", label: t("editor.tool.duplicate"), icon: ToolbarDuplicateIcon, action: onSketchDuplicate, enabled: sketchHasSelection, hint: sketchHasSelection ? null : t("editor.needs.sketchSelection") },
    { id: "sketch-delete", label: t("editor.tool.delete"), icon: ToolbarTrashIcon, action: onSketchDelete, enabled: sketchHasSelection, hint: sketchHasSelection ? null : t("editor.needs.sketchSelection") },
  ];
  type ToolbarTool = (typeof leftTools)[number] | (typeof visibilityTools)[number] | (typeof combineTools)[number] | (typeof modifyTools)[number] | (typeof arrangeTools)[number]
    | Pick<(typeof leftTools)[number], "id" | "label" | "icon" | "action" | "enabled">;
  const renderToolButton = (tool: ToolbarTool) => toolButton(tool, false);
  /** One shape of the library: a click puts it in, a drag drops it where it is let go, a tap does on a touch screen. */
  function shapeTile(shape: ToolbarShapeAsset) {
    return (
      <button
        className="shape-menu-item"
        key={shape.id}
        type="button"
        title={shapeAssetMenuLabel(shape).replace(/\s+/g, " ")}
        aria-label={shapeAssetMenuLabel(shape).replace(/\s+/g, " ")}
        style={{ "--shape-default-color": shapeAssetColor(shape, shapeCustomizations[shape.kind]) } as CSSProperties}
        draggable
        onClick={() => {
          if (suppressNextShapeClickRef.current) {
            suppressNextShapeClickRef.current = false;
            return;
          }
          addShapeFromMenu(shape);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") {
            touchShapeStartRef.current = { id: shape.id, x: event.clientX, y: event.clientY };
          }
        }}
        onPointerUp={(event) => {
          if (event.pointerType !== "touch") {
            return;
          }
          const start = touchShapeStartRef.current;
          touchShapeStartRef.current = null;
          if (!start || start.id !== shape.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
            return;
          }
          event.preventDefault();
          suppressNextShapeClickRef.current = true;
          window.setTimeout(() => {
            suppressNextShapeClickRef.current = false;
          }, 350);
          addShapeFromMenu(shape);
        }}
        onTouchStart={(event) => {
          const touch = event.changedTouches[0];
          if (touch) {
            touchShapeStartRef.current = { id: shape.id, x: touch.clientX, y: touch.clientY };
          }
        }}
        onTouchEnd={(event) => {
          const touch = event.changedTouches[0];
          const start = touchShapeStartRef.current;
          touchShapeStartRef.current = null;
          if (!touch || !start || start.id !== shape.id || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 8) {
            return;
          }
          event.preventDefault();
          suppressNextShapeClickRef.current = true;
          window.setTimeout(() => {
            suppressNextShapeClickRef.current = false;
          }, 350);
          addShapeFromMenu(shape);
        }}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("application/x-layerling-shape", JSON.stringify(shape));
        }}
        onDragEnd={closeShapesAfterPick}
      >
        <span
          className="shape-menu-thumb"
          style={{ "--shape-icon": `url(/${shape.menuIcon.replace(/^\/+/, "")})` } as CSSProperties}
        >
          <img src={shape.menuIcon} alt="" draggable={false} />
        </span>
        <span className={shapeAssetMenuLabel(shape).split(/\s+/).some((word) => word.length > 13) ? "long-word" : undefined}>{shapeAssetMenuLabel(shape)}</span>
      </button>
    );
  }

  /** `inFold`: the copy on a folded group's button, which leaves the tool's name for MCP and tests to the one in the group. */
  function toolButton(tool: ToolbarTool, inFold: boolean) {
    const { id, icon: Icon, action, label } = tool;
    // Im Verlaufsblick schlaeft jedes Werkzeug ausser dem, das ihn beendet -
    // wirklich, nicht nur im Aussehen: eine Auswahl aus der Zeit davor darf
    // kein Loeschen freischalten, waehrend die Flaeche etwas anderes zeigt.
    const enabled = tool.enabled && (!historyViewActive || id === "history");
    const active = "active" in tool && Boolean(tool.active);
    const missing = missingForTool({ id, enabled, needs: "needs" in tool ? tool.needs : undefined }, historyViewActive, selectionFacts);
    const hint = missing ?? ("hint" in tool && tool.hint ? tool.hint : null);
    const onHover = "onHover" in tool ? tool.onHover : undefined;
    // Switched off by aria-disabled, not by the disabled attribute: a disabled button gets no pointer events,
    // so Chrome and Edge never showed its tooltip, and what a greyed-out icon was for could not be found out
    // by hovering it (a donor's mail, 29.10.2026).
    return (
      <button
        className={`toolbar-icon ${enabled ? "" : "disabled"} ${active ? "active" : ""}`}
        key={id}
        data-layerling-tool={inFold ? undefined : id}
        data-collapse-action={inFold ? true : undefined}
        aria-label={label}
        title={`${hint ? `${label}: ${hint}` : label}${COMMAND_SHORTCUTS[id] ? ` (${COMMAND_SHORTCUTS[id]})` : ""}`}
        onPointerEnter={onHover}
        onFocus={onHover}
        onClick={enabled ? action : undefined}
        aria-disabled={enabled ? undefined : true}
      >
        <Icon />
      </button>
    );
  }

  // Everything the toolbar and its menus can do, as entries of the command
  // search. Built from the same lists as the buttons, so a new tool shows up in
  // both without a second place to remember; only built while the search is open.
  const buildPaletteCommands = (): PaletteCommand[] => {
    // A key of your own is shown where the command's usual key would be.
    const ownKeys = readCustomShortcuts();
    return buildAllPaletteCommands().map((command) => {
      const shown = ownKeys[command.id] ? { ...command, shortcut: ownKeys[command.id].combo } : command;
      return historyViewActive && !HISTORY_VIEW_COMMANDS.has(command.id) ? { ...shown, enabled: false } : shown;
    });
  };
  // Opens or closes the shapes panel, as its button does: a command of its own, so it can go on a key (#1399).
  const toggleShapesPanel = () => {
    setVisibilityOpen(false);
    setShapesOpen((open) => !open);
  };
  const buildAllPaletteCommands = (): PaletteCommand[] => {
    const fromTool = (
      tool: { id: string; label: string; icon: PaletteCommand["icon"]; action: () => void; enabled: boolean; active?: boolean },
      group: string,
    ): PaletteCommand => ({
      id: tool.id,
      label: tool.label,
      group,
      keywords: COMMAND_KEYWORDS[tool.id],
      shortcut: COMMAND_SHORTCUTS[tool.id],
      icon: tool.icon,
      enabled: tool.enabled,
      active: tool.active,
      run: () => tool.action(),
    });
    const plain = (
      id: string,
      label: string,
      group: string,
      enabled: boolean,
      run: () => void,
      extra: Partial<PaletteCommand> = {},
    ): PaletteCommand => ({ id, label, group, keywords: COMMAND_KEYWORDS[id], shortcut: COMMAND_SHORTCUTS[id], enabled, run, ...extra });
    const helpGroup = t("editor.group.help");
    const helpCommands = [
      plain("guide", t("editor.guide"), helpGroup, true, onGuide, { icon: ToolbarGuideIcon }),
      plain("shortcuts", t("editor.keyboardShortcuts"), helpGroup, true, onShortcuts, { icon: ToolbarKeyboardIcon }),
      ...(onWhatsNew ? [plain("whats-new", t("whatsNew.footerLink"), helpGroup, true, onWhatsNew, { icon: Sparkles })] : []),
      plain("interactive-help", t("interactiveHelp.title"), helpGroup, true, onInteractiveHelp, { icon: CircleHelp, active: interactiveHelpActive }),
    ];
    if (toolbarMode === "sketch") {
      const modeGroup = t("palette.group.mode");
      const modeCommand = plain("mode-geometry", t("palette.switchGeometry"), modeGroup, true, () => selectToolbarMode("geometry"));
      if (!sketchActive) {
        const createGroup = t("sketch.group.create");
        return [
          plain("sketch-extrude", t("sketch.extrude"), createGroup, true, () => startSketch("extrude")),
          plain("sketch-revolve", t("sketch.revolve"), createGroup, true, () => startSketch("revolve")),
          plain("sketch-sweep", t("sketch.sweep"), createGroup, true, () => startSketch("sweep")),
          plain("sketch-edit", t("sketch.editTo3d"), createGroup, canEditSketch, onEditSketch),
          modeCommand,
          ...helpCommands,
        ];
      }
      const drawGroup = t("sketch.group.draw");
      const selectGroup = t("sketch.group.select");
      const finishGroup = t("sketch.group.finish");
      return [
        plain("sketch-line", t("sketch.line"), drawGroup, true, () => onSketchTool("line"), { icon: SKETCH_PALETTE_ICONS.line, active: sketchTool === "line" }),
        plain("sketch-arc", t("sketch.arc"), drawGroup, true, () => onSketchTool("arc"), { icon: SKETCH_PALETTE_ICONS.arc, active: sketchTool === "arc" }),
        plain("sketch-bezier", t("sketch.bezier"), drawGroup, true, () => onSketchTool("bezier"), { icon: SKETCH_PALETTE_ICONS.bezier, active: sketchTool === "bezier" }),
        plain("sketch-smooth", t("sketch.smooth"), drawGroup, true, () => onSketchTool("smooth"), { icon: SKETCH_PALETTE_ICONS.smooth, active: sketchTool === "smooth" }),
        plain("sketch-freehand", t("sketch.freehand"), drawGroup, true, () => onSketchTool("freehand"), { icon: SKETCH_PALETTE_ICONS.freehand, active: sketchTool === "freehand" }),
        plain("note", t("editor.tool.note"), t("editor.group.visibility"), true, onNoteTool, { icon: ToolbarNoteIcon, active: noteMode }),
        plain("notes", t("visibility.notes"), t("editor.group.visibility"), true, onToggleNotes, { icon: notesVisible ? Eye : EyeOff, active: notesVisible }),
        plain("sketch-construction", t("sketch.construction"), drawGroup, true, () => onSketchConstruction?.(), { icon: ToolbarConstructionLineIcon, active: Boolean(sketchConstruction), keywords: ["construction", "guide", "helper", "hilfslinie", "hilfs", "konstruktion"] }),
        plain("sketch-from-middle", t("sketch.fromMiddle"), drawGroup, true, () => onSketchFromMiddle?.(), { icon: ToolbarMiddleLineIcon, active: Boolean(sketchFromMiddle), keywords: ["middle", "center", "centre", "mitte", "mittellinie", "symmetric", "symmetrisch"] }),
        ...sketchShapeMenuItems.map(({ primitive, label, icon }) => plain(
          `sketch-shape-${primitive}`,
          t("palette.addShape", { shape: t(label) }),
          t("sketch.group.shapes"),
          true,
          () => onSketchPrimitive(primitive),
          { icon, keywords: [primitive] },
        )),
        plain("shapes-panel", t("palette.openShapes"), t("sketch.group.shapes"), true, toggleShapesPanel, { icon: ToolbarShapeAddIcon, active: shapesOpen }),
        plain("sketch-select", t("sketch.select"), selectGroup, true, () => onSketchTool("select"), { icon: SKETCH_PALETTE_ICONS.select, active: sketchTool === "select" }),
        plain("sketch-image", t("sketch.addImage"), selectGroup, true, onSketchImage, { icon: SKETCH_PALETTE_ICONS.image }),
        plain("sketch-refine", t("sketch.refine"), selectGroup, true, () => onSketchTool("refine"), { icon: SKETCH_PALETTE_ICONS.refine, active: sketchTool === "refine" }),
        plain("sketch-chamfer", t("sketch.chamferCorner"), selectGroup, Boolean(canFilletSketchPoint), () => onSketchCornerDialog?.(sketchCornerDialog === "chamfer" ? null : "chamfer"), { icon: ToolbarChamferIcon, active: sketchCornerDialog === "chamfer" }),
        plain("sketch-fillet", t("sketch.filletCorner"), selectGroup, Boolean(canFilletSketchPoint), () => onSketchCornerDialog?.(sketchCornerDialog === "fillet" ? null : "fillet"), { icon: ToolbarFilletIcon, active: sketchCornerDialog === "fillet" }),
        plain("sketch-erase", t("sketch.erase"), selectGroup, true, () => onSketchTool("erase"), { icon: SKETCH_PALETTE_ICONS.erase, active: sketchTool === "erase" }),
        ...sketchClipboardTools.map((tool) => fromTool(tool, t("editor.group.clipboard"))),
        plain("sketch-undo", t("editor.tool.undo"), t("editor.group.history"), sketchCanUndo, onSketchUndo, { icon: ToolbarUndoIcon }),
        plain("sketch-redo", t("editor.tool.redo"), t("editor.group.history"), sketchCanRedo, onSketchRedo, { icon: ToolbarRedoIcon }),
        plain("sketch-stroke", t("sketch.strokeHint"), finishGroup, true, () => onSketchStroke?.(), { icon: SKETCH_PALETTE_ICONS.line, active: Boolean(sketchStrokeActive) }),
        plain("sketch-finish", sketchOperation === "revolve" ? t("sketch.finishRevolve") : sketchOperation === "sweep" ? t("sketch.finishSweep") : t("sketch.finishSketch"), finishGroup, true, onSketchFinish),
        plain("sketch-cancel", t("sketch.cancel"), finishGroup, true, onSketchCancel),
        modeCommand,
        ...helpCommands,
      ];
    }
    const shapesGroup = t("editor.group.shapes");
    const visibilityGroup = t("editor.group.visibility");
    const fileGroup = t("editor.group.file");
    return [
      ...leftTools.slice(0, 4).map((tool) => fromTool(tool, t("editor.group.clipboard"))),
      ...leftTools.slice(4).map((tool) => fromTool(tool, t("editor.group.history"))),
      ...libraryShapeAssets.map((shape) => plain(
        `shape-${shape.id}`,
        t("palette.addShape", { shape: shapeAssetMenuLabel(shape) }),
        shapesGroup,
        true,
        () => addShapeFromMenu(shape),
        { image: shape.menuIcon, keywords: [shape.id, shape.name, ...(SHAPE_KEYWORDS[shape.id] ?? [])] },
      )),
      ...(onInsertCustomShape ? customShapeCommands(customShapeEntries ?? [], shapesGroup, (name) => t("palette.addCustomShape", { shape: name }), onInsertCustomShape) : []),
      plain("shapes-panel", t("palette.openShapes"), shapesGroup, true, toggleShapesPanel, { icon: ToolbarShapeAddIcon, active: shapesOpen }),
      ...visibilityTools.map((tool) => fromTool(tool, visibilityGroup)),
      plain(
        "show-hidden",
        hiddenShapeCount === 0 ? t("visibility.nothingHidden") : t("visibility.showAllHidden", { count: hiddenShapeCount }),
        visibilityGroup,
        hiddenShapeCount > 0,
        onShowHidden,
        { icon: Eye },
      ),
      plain("hide-others", t("contextMenu.hideOthers"), visibilityGroup, hasSelection, onHideOthers, { icon: EyeOff }),
      plain("invert-selection", t("contextMenu.invertSelection"), t("shortcuts.group.selection"), true, onInvertSelection, { icon: ArrowLeftRight }),
      plain("notes", t("visibility.notes"), visibilityGroup, noteCount > 0, onToggleNotes, { icon: notesVisible ? Eye : EyeOff, active: notesVisible }),
      plain("overhangs", t("visibility.overhangs", { angle: overhangAngle }), visibilityGroup, true, onToggleOverhangs, { icon: AlertTriangle, active: overhangsVisible }),
      plain("look-onto-workplane", t("camera.lookOntoWorkplane"), t("shortcuts.group.view"), true, () => window.dispatchEvent(new Event("layerling:look-onto-workplane")), { icon: ScanEye }),
      ...combineTools.map((tool) => fromTool(tool, t("editor.group.combine"))),
      ...modifyTools.map((tool) => fromTool(tool, t(modifySectionLabel(tool.section)))),
      plain("carry", t("contextMenu.carry"), t("editor.group.arrange"), canModifySelection, onCarryOntoFace, { icon: ArrowDownToLine }),
      plain("scalePercent", t("scalePercent.title"), t("editor.group.modify"), canModifySelection, onScalePercent, { icon: Percent, active: scalePercentActive }),
      ...arrangeTools.map((tool) => fromTool(tool, t("editor.group.arrange"))),
      plain("note", t("editor.tool.note"), visibilityGroup, true, onNoteTool, { icon: ToolbarNoteIcon, active: noteMode }),
      plain("import", t("editor.import"), fileGroup, true, () => onTopPanel("import"), { icon: ToolbarImportIcon }),
      plain("export", t("editor.export"), fileGroup, true, () => onTopPanel("export"), { icon: ToolbarVectorExportIcon }),
      plain("file-backups", t("backups.title"), fileGroup, true, () => window.dispatchEvent(new Event(OPEN_FILE_BACKUPS_EVENT)), { icon: ArchiveRestore, keywords: ["backup", "backups", "version", "versions", "restore", "sicherung", "fassung", "wiederherstellen"] }),
      plain("attachments", t("editor.attachments"), fileGroup, true, () => onTopPanel("attachments"), { icon: ToolbarAttachmentsIcon, keywords: ["attachment", "file", "notes", "instructions", "readme", "anhang", "datei"] }),
      plain("settings", t("editor.workspaceSettings"), t("editor.group.help"), true, () => window.dispatchEvent(new Event("layerling:open-workspace-settings")), { icon: ToolbarSettingsIcon }),
      plain("focus-mode", focusMode ? t("focusMode.leave") : t("focusMode.enter"), t("shortcuts.group.view"), Boolean(onFocusModeChange), () => onFocusModeChange?.(!focusMode), { icon: focusMode ? Minimize2 : Maximize2, active: focusMode }),
      plain("mode-sketch", t("palette.switchSketch"), t("palette.group.mode"), true, () => selectToolbarMode("sketch")),
      ...helpCommands,
      ...objects.map((object) => plain(
        `object-${object.id}`,
        t("palette.selectObject", { name: object.name }),
        t("palette.group.objects"),
        true,
        () => onSelectObject(object.id),
        { keywords: [object.name, object.kind, ...(object.hidden ? ["hidden", "ausgeblendet", "versteckt"] : [])], searchOnly: true, transient: true },
      )),
    ];
  };
  buildPaletteCommandsRef.current = buildPaletteCommands;

  // The profile and the mode define the available tools. Personal ribbon settings can hide or reorder those tools.
  const clipboardTools = leftTools.slice(0, 4).filter(({ id }) => profileToolVisible(profile, id, true));
  const clipboardShown = shownInRibbon(ordered("clipboard", clipboardTools), ribbonHidden);
  const historyShown = shownLayoutTools(ordered("history", leftTools.slice(4)));
  const visibilityShown = shownInRibbon(ordered("visibility", visibilityTools), ribbonHidden);
  const combineShown = shownLayoutTools(ordered("combine", combineTools));
  // Modify's four groups (#1551), each with the tools of its section.
  const modifyGroups = MODIFY_SECTIONS.map(([section, group, labelKey, priority]) => {
    const tools = modifyTools.filter((tool) => tool.section === section);
    return { section, group, label: t(labelKey), priority, tools, shown: shownLayoutTools(ordered(group, tools)) };
  });
  const arrangeShown = shownLayoutTools(ordered("arrange", arrangeTools));
  const fileToolsShipped = [
    ...(profileToolVisible(profile, "import", !simpleMode) ? [{ id: "import", label: t("editor.import") }] : []),
    { id: "export", label: t("editor.export") },
    { id: "attachments", label: t("editor.attachments") },
  ];
  const fileTools = ordered("manage", fileToolsShipped);
  const fileShown = shownInRibbon(fileTools, ribbonHidden);
  // Shapes is a group like the others (#1550): it moves and can be taken out. Taken out, its panel still opens from the
  // command search and its key, from the spot where the group would stand.
  const shapesTools = [{ id: "shapes-panel", label: t("editor.addShape") }];
  const shapesInRibbon = ribbonGroupShown("shapes", ribbonHidden, shownInRibbon(shapesTools, ribbonHidden));
  // The File group's three buttons, in the order set for the group (#1519).
  const renderFileButton = (tool: { id: string }) => {
    if (tool.id === "import") {
      return (
        <button key="import" className="action-icon-button" aria-label={t("editor.import")} title={`${t("editor.import")} (${COMMAND_SHORTCUTS.import})`} onClick={() => onTopPanel("import")} disabled={historyViewActive}>
            <ToolbarImportIcon />
          </button>
      );
    }
    if (tool.id === "export") {
      return (
        <button key="export" className="action-icon-button" aria-label={t("editor.export")} title={`${t("editor.export")} (${COMMAND_SHORTCUTS.export})`} onClick={() => onTopPanel("export")}>
            <ToolbarVectorExportIcon />
          </button>
      );
    }
    // The dot says there is something attached without opening the panel, as the badge on the visibility button says there is something hidden.
    return (
      <button
            key="attachments"
            className={`action-icon-button ${attachmentCount > 0 ? "has-attachments" : ""}`}
            aria-label={attachmentsLabel}
            title={attachmentsLabel}
            onClick={() => onTopPanel("attachments")}
          >
            <ToolbarAttachmentsIcon />
            {attachmentCount > 0 ? <span className="attachments-indicator" aria-hidden="true" /> : null}
          </button>
    );
  };
  // The settings window lists the groups and buttons from here, named as on the buttons. Help stays: without it the
  // settings could not be found again.
  // List only tools available in the active layout, so each setting affects the ribbon.
  const pick = (tools: readonly { id: string; label: string; section?: string }[], cut = true) => tools
    .filter((tool) => !cut || availableInRibbon(tool.id))
    .map(({ id, label, section }) => ({ id, label, ...(section ? { section } : {}) }));
  // A group as the settings list it: its buttons in the order set for it, and the ids in the order the ribbon ships them.
  const layoutGroup = (group: string, label: string, tools: readonly { id: string; label: string; section?: string }[], cut = true) => ({
    group,
    label,
    shipped: pick(tools, cut).map((tool) => tool.id),
    tools: pick(ordered(group, tools), cut),
  });
  const layoutGroups = [
    layoutGroup("clipboard", t("editor.group.clipboard"), clipboardTools, false),
    layoutGroup("history", t("editor.group.history"), leftTools.slice(4)),
    layoutGroup("shapes", t("editor.group.shapes"), shapesTools, false),
    ...(simpleMode ? [] : [layoutGroup("visibility", t("editor.group.visibility"), visibilityTools, false)]),
    layoutGroup("combine", t("editor.group.combine"), combineTools),
    ...modifyGroups.map((entry) => layoutGroup(entry.group, entry.label, entry.tools)),
    layoutGroup("arrange", t("editor.group.arrange"), arrangeTools),
    layoutGroup("manage", t("editor.group.file"), fileToolsShipped, false),
  ].filter((group) => group.tools.length > 0);
  setRibbonLayout(layoutGroups.sort((one, other) => ribbonOrder.indexOf(one.group as (typeof ribbonOrder)[number]) - ribbonOrder.indexOf(other.group as (typeof ribbonOrder)[number])));

  return (
    <div className="secondary-toolbar">
      {paletteOpen ? <CommandPalette commands={buildPaletteCommands()} onClose={() => setPaletteOpen(false)} /> : null}
      <div ref={toolbarContentRef} className={`toolbar-mode-content ${toolbarMode}${ribbonPinned && !simpleMode ? " ribbon-pinned" : ""}`}>
        {toolbarMode === "geometry" ? (
          <>
      <div className="tool-group left">
        {ribbonGroupShown("clipboard", ribbonHidden, clipboardShown) ? (
        <div className="toolbar-section" data-group="clipboard" {...foldProps("clipboard", 2)} style={{ order: sectionOrder.clipboard }} inert={historyViewActive}>
          <div className="toolbar-section-label">{t("editor.group.clipboard")}</div>
          {collapseBox(t("editor.group.clipboard"), ToolbarPasteIcon)}
          <div className="toolbar-section-tools">{clipboardShown.map(renderToolButton)}</div>
        </div>
        ) : null}
        {ribbonGroupShown("history", ribbonHidden, historyShown) ? (
        <div className="toolbar-section" data-group="history" {...foldProps("history", 3)} style={{ order: sectionOrder.history }}>
          <div className="toolbar-section-label">{t("editor.group.history")}</div>
          {collapseBox(t("editor.group.history"), ToolbarUndoIcon, historyShown.find((tool) => tool.id === "undo"))}
          <div className="toolbar-section-tools">{historyShown.map(renderToolButton)}</div>
        </div>
        ) : null}
        <div className={`toolbar-section toolbar-shapes-section${shapesInRibbon ? "" : " out-of-ribbon"}`} data-group="shapes" style={{ order: sectionOrder.shapes }} ref={shapesMenuRef} inert={historyViewActive} {...shapesHoverProps}>
          {shapesInRibbon ? (
          <>
          <div className="toolbar-section-label">{t("editor.group.shapes")}</div>
          <div className="toolbar-section-tools">
            <button
              className={`shape-menu-trigger ${shapesOpen ? "active" : ""}`}
              aria-label={t("editor.addShape")}
              aria-expanded={shapesOpen}
              onClick={toggleShapesFromButton}
            >
              <ToolbarShapeAddIcon />
              {shapesTab}
            </button>
          </div>
          </>
          ) : null}
          {shapesOpen ? inPinnedShapesHome(
            <ShapeMenuPanel
              title={t("shape.basicShapes")}
              helpSection="addShape"
              className={pinnedShapesHome ? "shape-menu-under-inspector" : ""}
              pinned={shapesPinned}
              onTogglePinned={toggleShapesPinned}
              resizable
            >
              <div className="shape-menu-body">
              {simpleMode ? (
                // The simple mode keeps its short list as it was, without sections (#1170).
                <div className="shape-menu-list">{shownShapeAssets.map(shapeTile)}</div>
              ) : (
                <ShapeLibraryList
                  shapes={shownShapeAssets}
                  label={(shape) => shapeAssetMenuLabel(shape).replace(/\s+/g, " ")}
                  renderTile={shapeTile}
                  customShapes={renderMyShapes ? (query: string) => renderMyShapes(closeShapesAfterPick, query) : null}
                  countCustomMatches={countMyShapeMatches}
                />
              )}
              </div>
            </ShapeMenuPanel>,
          ) : null}
        </div>
      </div>
      <div className="toolbar-spacer" />
      <div className="tool-group right" inert={historyViewActive}>
        {simpleMode || !ribbonGroupShown("visibility", ribbonHidden) ? null : (
        <div className="toolbar-section compact toolbar-visibility-section" data-group="visibility" {...foldProps("visibility", 5)} style={{ order: sectionOrder.visibility }} ref={visibilityMenuRef}>
          <div className="toolbar-section-label">{t("editor.group.visibility")}</div>
          {collapseBox(t("editor.group.visibility"), ToolbarHideSelectedIcon)}
          <div className="toolbar-section-tools">
            {visibilityShown.map(renderToolButton)}
            <span className="visibility-trigger-wrap">
              <button
                className={`toolbar-icon visibility-menu-trigger ${visibilityOpen ? "active" : ""}`}
                type="button"
                aria-label={t("editor.visibilityOptions")}
                title={t("editor.visibilityOptions")}
                aria-haspopup="menu"
                aria-expanded={visibilityOpen}
                onClick={toggleVisibilityMenu}
              >
                <ToolbarCaretDownIcon />
              </button>
              {hiddenShapeCount > 0 ? (
                // What is hidden is seen without opening the menu; a click shows it all (#489).
                <button
                  className="visibility-hidden-badge"
                  type="button"
                  aria-label={t("visibility.showAllHidden", { count: hiddenShapeCount })}
                  title={t("visibility.showAllHidden", { count: hiddenShapeCount })}
                  onClick={onShowHidden}
                >
                  {hiddenShapeCount}
                </button>
              ) : null}
            </span>
          </div>
          {visibilityOpen ? (
            <div
              className="visibility-dropdown"
              role="menu"
              aria-label={t("editor.visibilityOptions")}
              style={visibilityMenuPosition}
            >
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitem"
                onClick={() => {
                  setVisibilityOpen(false);
                  onToggleOutliner();
                }}
              >
                <ListTree size={20} aria-hidden="true" />
                <strong>{outlinerOpen ? t("visibility.hideOutliner") : t("visibility.showOutliner")}</strong>
              </button>
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitem"
                disabled={hiddenShapeCount === 0}
                onClick={() => {
                  setVisibilityOpen(false);
                  onShowHidden();
                }}
              >
                <Eye size={20} aria-hidden="true" />
                <strong>{hiddenShapeCount === 0
                  ? t("visibility.nothingHidden")
                  : t("visibility.showAllHidden", { count: hiddenShapeCount })}</strong>
              </button>
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitem"
                disabled={!hasSelection}
                title={hasSelection ? undefined : t("editor.needs.selection")}
                onClick={() => {
                  setVisibilityOpen(false);
                  onHideOthers();
                }}
              >
                <EyeOff size={20} aria-hidden="true" />
                <strong>{t("contextMenu.hideOthers")}</strong>
              </button>
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitemcheckbox"
                aria-checked={notesVisible}
                disabled={noteCount === 0}
                onClick={() => {
                  setVisibilityOpen(false);
                  onToggleNotes();
                }}
              >
                {notesVisible ? <Eye size={20} aria-hidden="true" /> : <EyeOff size={20} aria-hidden="true" />}
                <strong>{t("visibility.notes")}{noteCount > 0 ? ` (${noteCount})` : ""}</strong>
              </button>
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitemcheckbox"
                aria-checked={overhangsVisible}
                onClick={() => {
                  setVisibilityOpen(false);
                  onToggleOverhangs();
                }}
              >
                <AlertTriangle size={20} aria-hidden="true" className={overhangsVisible ? "overhang-menu-icon active" : "overhang-menu-icon"} />
                <strong>{t("visibility.overhangs", { angle: overhangAngle })}</strong>
              </button>
              <div className="visibility-dropdown-help">
                <span>{t("visibility.eyeAgain")}</span>
                <span aria-hidden="true">·</span>
                <span><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd>{t("visibility.allShortcut")}</span>
                <GuideHelpLink section="selecting" iconSize={14} />
              </div>
            </div>
          ) : null}
        </div>
        )}
        {ribbonGroupShown("combine", ribbonHidden, combineShown) ? (
        <div className="toolbar-section" data-group="combine" {...foldProps("combine", 6)} style={{ order: sectionOrder.combine }}>
          <div className="toolbar-section-label">{t("editor.group.combine")}</div>
          {collapseBox(t("editor.group.combine"), ToolbarGroupIcon)}
          <div className="toolbar-section-tools">{combineShown.map(renderToolButton)}</div>
        </div>
        ) : null}
        {modifyGroups.map((entry) => ribbonGroupShown(entry.group, ribbonHidden, entry.shown) ? (
        <div key={entry.group} className="toolbar-section" data-group={entry.group} data-collapse={foldProps(entry.group, entry.priority)["data-collapse"]} data-fold={foldProps(entry.group, entry.priority)["data-fold"]} style={{ order: sectionOrder[entry.group] }}>
          <div className="toolbar-section-label">{entry.label}</div>
          {collapseBox(entry.label, MODIFY_SECTION_ICONS[entry.section])}
          <div className="toolbar-section-tools">{entry.shown.map(renderToolButton)}</div>
        </div>
        ) : null)}
        {ribbonGroupShown("arrange", ribbonHidden, arrangeShown) ? (
        <div className="toolbar-section" data-group="arrange" {...foldProps("arrange", 4)} style={{ order: sectionOrder.arrange }}>
          <div className="toolbar-section-label">{t("editor.group.arrange")}</div>
          {collapseBox(t("editor.group.arrange"), ToolbarAlignIcon)}
          <div className="toolbar-section-tools">{arrangeShown.map(renderToolButton)}</div>
        </div>
        ) : null}
      </div>
      {ribbonGroupShown("manage", ribbonHidden, fileShown) ? (
      <div className="toolbar-section toolbar-actions-section" data-group="manage" {...foldProps("manage", 1)} style={{ order: sectionOrder.manage }}>
        <div className="toolbar-section-label">{t("editor.group.file")}</div>
        {collapseBox(t("editor.group.file"), ToolbarVectorExportIcon)}
        <div className="action-buttons">
          {fileShown.map(renderFileButton)}
        </div>
      </div>
      ) : null}
          </>
        ) : (
          <div className="sketch-toolbar-ribbon" aria-label={t("sketch.toolbar")}>
            {sketchActive ? (
              <>
                <div className="toolbar-section sketch-create-section" data-group="draw">
                  <div className="toolbar-section-label">{t("sketch.group.draw")}</div>
                  <div className="toolbar-section-tools">
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "line" ? "active" : ""}`} type="button" aria-label={t("sketch.line")} title={t("sketch.line")} onClick={() => onSketchTool("line")}>
                      <SketchReferenceIcon name="line" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "arc" ? "active" : ""}`} type="button" aria-label={t("sketch.arc")} title={t("status.sketchTool.arc")} onClick={() => onSketchTool("arc")}>
                      <SketchReferenceIcon name="arc" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "bezier" ? "active" : ""}`} type="button" aria-label={t("sketch.bezier")} title={t("sketch.bezier")} onClick={() => onSketchTool("bezier")}>
                      <SketchReferenceIcon name="bezier" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "smooth" ? "active" : ""}`} type="button" aria-label={t("sketch.smooth")} title={t("sketch.smooth")} onClick={() => onSketchTool("smooth")}>
                      <SketchReferenceIcon name="smooth" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "freehand" ? "active" : ""}`} type="button" aria-label={t("sketch.freehand")} title={`${t("status.sketchTool.freehand")} (5)`} aria-keyshortcuts="5" onClick={() => onSketchTool("freehand")}>
                      <SketchReferenceIcon name="freehand" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon sketch-construction-toggle ${sketchConstruction ? "active" : ""}`} type="button" aria-pressed={Boolean(sketchConstruction)} aria-label={t("sketch.construction")} title={t("sketch.constructionHint")} onClick={onSketchConstruction}>
                      <ToolbarConstructionLineIcon />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon sketch-from-middle-toggle ${sketchFromMiddle ? "active" : ""}`} type="button" aria-pressed={Boolean(sketchFromMiddle)} aria-label={t("sketch.fromMiddle")} title={t("sketch.fromMiddleHint")} onClick={onSketchFromMiddle}>
                      <ToolbarMiddleLineIcon />
                    </button>
                  </div>
                </div>
                <div className="toolbar-section toolbar-shapes-section sketch-shapes-section" data-group="shapes" ref={shapesMenuRef} {...shapesHoverProps}>
                  <div className="toolbar-section-label">{t("sketch.group.shapes")}</div>
                  <div className="toolbar-section-tools">
                    <button
                      className={`shape-menu-trigger ${shapesOpen ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.addShape")}
                      aria-haspopup="menu"
                      aria-expanded={shapesOpen}
                      onClick={toggleShapesFromButton}
                    >
                      <ToolbarShapeAddIcon />
                      {shapesTab}
                    </button>
                  </div>
                  {shapesOpen ? (
                    <ShapeMenuPanel
                      className="sketch-shape-menu-dropdown"
                      role="menu"
                      ariaLabel={t("sketch.shapesMenu")}
                      title={t("sketch.shapesTitle")}
                      helpSection="sketchDrawing"
                      pinned={shapesPinned}
                      onTogglePinned={toggleShapesPinned}
                      scope="sketch"
                      resizable
                    >
                      <div className="shape-menu-list">
                        {sketchShapeMenuItems.map(({ primitive, label, icon: Icon }) => (
                          <button
                            className="shape-menu-item sketch-primitive-source"
                            key={primitive}
                            type="button"
                            role="menuitem"
                            draggable
                            title={t("sketch.addPrimitiveHint", { shape: t(label) })}
                            onClick={() => addSketchShapeFromMenu(primitive)}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "copy";
                              event.dataTransfer.setData("application/x-layerling-sketch-primitive", primitive);
                            }}
                            onDragEnd={closeShapesAfterPick}
                          >
                            <Icon className="sketch-shape-menu-icon" aria-hidden="true" />
                            <span>{t(label)}</span>
                          </button>
                        ))}
                      </div>
                      <div className="sketch-shape-options">
                        <SketchShapeNumberField
                          label={t("sketch.polygonSides")}
                          value={sketchShapeOptions.sides}
                          min={SKETCH_POLYGON_MIN_SIDES}
                          max={SKETCH_POLYGON_MAX_SIDES}
                          normalize={normalizePolygonSides}
                          onChange={(sides) => onSketchShapeOptions({ ...sketchShapeOptions, sides })}
                        />
                        <SketchShapeNumberField
                          label={t("sketch.starInner")}
                          value={sketchShapeOptions.innerPercent}
                          min={SKETCH_STAR_MIN_INNER_PERCENT}
                          max={SKETCH_STAR_MAX_INNER_PERCENT}
                          suffix="%"
                          normalize={normalizeStarInnerPercent}
                          onChange={(innerPercent) => onSketchShapeOptions({ ...sketchShapeOptions, innerPercent })}
                        />
                      </div>
                    </ShapeMenuPanel>
                  ) : null}
                </div>
                <div className="toolbar-section sketch-edit-section" data-group="select">
                  <div className="toolbar-section-label">{t("sketch.group.select")}</div>
                  <div className="toolbar-section-tools">
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "select" ? "active" : ""}`} type="button" aria-label={t("sketch.select")} title={t("sketch.select")} onClick={() => onSketchTool("select")}>
                      <SketchReferenceIcon name="select" />
                    </button>
                    <button
                      className="toolbar-icon sketch-tool-icon"
                      type="button"
                      aria-label={t("sketch.addImage")}
                      title={t("sketch.addImageReady")}
                      onClick={onSketchImage}
                    >
                      <SketchReferenceIcon name="image" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "refine" ? "active" : ""}`} type="button" aria-label={t("sketch.refine")} title={t("sketch.refine")} onClick={() => onSketchTool("refine")}>
                      <SketchReferenceIcon name="refine" />
                    </button>
                    <button
                      className={`toolbar-icon sketch-tool-icon ${canFilletSketchPoint ? "" : "disabled"} ${sketchCornerDialog === "chamfer" ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.chamferCorner")}
                      title={canFilletSketchPoint ? t("sketch.chamferCorner") : t("sketch.chamferCornerDisabled")}
                      onClick={() => {
                        if (!canFilletSketchPoint) return;
                        onSketchCornerDialog?.(sketchCornerDialog === "chamfer" ? null : "chamfer");
                      }}
                      disabled={!canFilletSketchPoint}
                    >
                      <ToolbarChamferIcon />
                    </button>
                    <button
                      className={`toolbar-icon sketch-tool-icon ${canFilletSketchPoint ? "" : "disabled"} ${sketchCornerDialog === "fillet" ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.filletCorner")}
                      title={canFilletSketchPoint ? t("sketch.filletCorner") : t("sketch.filletCornerDisabled")}
                      onClick={() => {
                        if (!canFilletSketchPoint) return;
                        onSketchCornerDialog?.(sketchCornerDialog === "fillet" ? null : "fillet");
                      }}
                      disabled={!canFilletSketchPoint}
                    >
                      <ToolbarFilletIcon />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "erase" ? "active" : ""}`} type="button" aria-label={t("sketch.erase")} title={t("sketch.erase")} onClick={() => onSketchTool("erase")}>
                      <SketchReferenceIcon name="erase" />
                    </button>
                  </div>
                </div>
                <div className="toolbar-section sketch-clipboard-section" data-group="clipboard" data-collapse="1">
                  <div className="toolbar-section-label">{t("editor.group.clipboard")}</div>
                  {collapseBox(t("editor.group.clipboard"), ToolbarPasteIcon)}
                  <div className="toolbar-section-tools">{sketchClipboardTools.map(renderToolButton)}</div>
                </div>
                <div className="toolbar-section sketch-history-section" data-group="history" data-collapse="2">
                  <div className="toolbar-section-label">{t("editor.group.history")}</div>
                  {collapseBox(t("editor.group.history"), ToolbarUndoIcon, { id: "sketch-undo", label: t("sketch.undo"), icon: ToolbarUndoIcon, action: onSketchUndo, enabled: sketchCanUndo })}
                  <div className="toolbar-section-tools">
                    <button className={`toolbar-icon ${sketchCanUndo ? "" : "disabled"}`} type="button" aria-label={t("sketch.undo")} title={`${t("status.undo")} (${COMMAND_SHORTCUTS["sketch-undo"]})`} onClick={onSketchUndo} disabled={!sketchCanUndo}>
                      <ToolbarUndoIcon />
                    </button>
                    <button className={`toolbar-icon ${sketchCanRedo ? "" : "disabled"}`} type="button" aria-label={t("sketch.redo")} title={`${t("status.redo")} (${COMMAND_SHORTCUTS["sketch-redo"]})`} onClick={onSketchRedo} disabled={!sketchCanRedo}>
                      <ToolbarRedoIcon />
                    </button>
                  </div>
                </div>
                <div className="toolbar-spacer" />
                <div className="toolbar-section sketch-finish-section" data-group="finish">
                  <div className="toolbar-section-label">{t("sketch.group.finish")}</div>
                  <div className="toolbar-section-tools">
                    <button
                      className={`sketch-command-button ${sketchStrokeActive ? "active" : ""}`}
                      type="button"
                      aria-pressed={Boolean(sketchStrokeActive)}
                      title={t("sketch.strokeHint")}
                      onClick={onSketchStroke}
                    >
                      <SketchReferenceIcon name="line" />
                      <span>{t("sketch.stroke")}</span>
                    </button>
                    <button className="sketch-command-button primary" type="button" onClick={onSketchFinish}>
                      <Check />
                      <span>{sketchOperation === "revolve" ? t("sketch.finishRevolve") : sketchOperation === "sweep" ? t("sketch.finishSweep") : t("sketch.finishSketch")}</span>
                    </button>
                    <button className="sketch-command-button cancel" type="button" onClick={onSketchCancel}>
                      <X />
                      <span>{t("sketch.cancel")}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="toolbar-section sketch-start-section" data-group="create">
                <div className="toolbar-section-label">{t("sketch.group.create")}</div>
                <div className="toolbar-section-tools">
                  <button
                    className="sketch-command-button primary"
                    type="button"
                    aria-label={t("sketch.extrude")}
                    title={`${t("sketch.extrude")} - ${t("sketch.extrudeHint")}`}
                    onClick={() => startSketch("extrude")}
                  >
                    <ArrowUpFromLine aria-hidden="true" />
                    <span>{t("sketch.extrude")}</span>
                  </button>
                  <button
                    className="sketch-command-button primary"
                    type="button"
                    aria-label={t("sketch.revolve")}
                    title={`${t("sketch.revolve")} - ${t("sketch.revolveHint")}`}
                    onClick={() => startSketch("revolve")}
                  >
                    <Rotate3d aria-hidden="true" />
                    <span>{t("sketch.revolve")}</span>
                  </button>
                  {simpleMode ? null : <button
                    className="sketch-command-button primary"
                    type="button"
                    aria-label={t("sketch.sweep")}
                    title={`${t("sketch.sweep")} - ${t("sketch.sweepHint")}`}
                    onClick={() => startSketch("sweep")}
                  >
                    <RouteIcon aria-hidden="true" />
                    <span>{t("sketch.sweep")}</span>
                  </button>}
                  <GuideHelpLink section="sketchToBody" />
                  <button className={`sketch-command-button ${canEditSketch ? "" : "disabled"}`} type="button" aria-label={t("sketch.editTo3d")} title={t("sketch.editTo3d")} onClick={onEditSketch} disabled={!canEditSketch}>
                    <SketchReferenceIcon name="editSketchTo3d" />
                    <span>{t("sketch.edit")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="toolbar-title-row">
        {/* The brand, in the same corner as on the start page. Not a link:
            leaving the editor is not something to trigger by accident. */}
        <div className="toolbar-brand">
          <img src="/assets/layerling/layerling-logo.svg" alt="Layerling" />
          <span className="toolbar-brand-text">
            <span className="toolbar-brand-name">layerling</span>
            <span className="toolbar-brand-tagline">{t("brand.tagline")}</span>
          </span>
        </div>
        {/* Back to the start page, before the tabs rather than as a group of its own in the ribbon, which needs the room
            (Stefan, 29.10.2026). An open sketch is finished or left first, as before, when the button was only in 3D. */}
        {onHome ? (
          <button
            className="toolbar-title-home editor-home-control"
            type="button"
            aria-label={t("editor.homeDashboard")}
            title={t("editor.homeDashboard")}
            disabled={toolbarMode !== "geometry"}
            onClick={onHome}
          >
            <ToolbarHomeIcon />
          </button>
        ) : null}
        <div className="toolbar-workspace-tabs" role="tablist" aria-label={t("editor.modeLabel")}>
          <button
            className={toolbarMode === "geometry" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={toolbarMode === "geometry"}
            onClick={() => selectToolbarMode("geometry")}
          >
            {t("editor.modeGeometry")}
          </button>
          <button
            className={toolbarMode === "sketch" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={toolbarMode === "sketch"}
            onClick={() => selectToolbarMode("sketch")}
            disabled={historyViewActive}
          >
            {t("editor.modeSketch")}
          </button>
        </div>
        <div className="toolbar-project-name">
          <ProjectNameField projectName={projectName} onProjectNameChange={onProjectNameChange} />
        </div>
        <div className="toolbar-title-row-actions">
          {/* Focus mode (Discussion #1554): this row and the footer make room, a small bar over the view keeps the tabs. */}
          {onFocusModeChange ? (
            <button
              className="action-icon-button toolbar-focus-mode"
              type="button"
              aria-label={t("focusMode.enter")}
              title={`${t("focusMode.enter")} (${FOCUS_MODE_SHORTCUT}) - ${t("focusMode.enterHint")}`}
              data-layerling-tool="focus-mode"
              onClick={() => onFocusModeChange(true)}
            >
              <Maximize2 size={17} aria-hidden="true" />
            </button>
          ) : null}
          {simpleMode ? null : (
            <button
              className={`toolbar-ribbon-pin ${ribbonPinned ? "active" : ""}`}
              type="button"
              aria-pressed={ribbonPinned}
              aria-label={t("editor.ribbonPin")}
              title={ribbonPinned ? t("editor.ribbonUnpin") : t("editor.ribbonPin")}
              onClick={toggleRibbonPinned}
            >
              {ribbonPinned ? <Pin size={17} aria-hidden="true" /> : <PinOff size={17} aria-hidden="true" />}
            </button>
          )}
          {/* The help is the same in 3D and in a sketch, so it sits in the title row they share, framed in its colour, and
              the ribbon keeps its room for the tools (Stefan, 29.10.2026). No name beside it: that read as a button too. */}
          {simpleMode ? null : (
            <div className="toolbar-title-help" data-group="help" role="group" aria-label={t("editor.group.help")} title={t("editor.group.help")}>
              <button className="action-icon-button" type="button" aria-label={t("palette.open")} title={t("palette.open")} aria-haspopup="dialog" data-layerling-tool="command-search" onClick={openPalette}>
                <Search className="toolbar-search-icon" aria-hidden="true" />
              </button>
              <button className="action-icon-button" type="button" aria-label={t("editor.guide")} title={t("editor.guide")} onClick={onGuide}>
                <ToolbarGuideIcon />
              </button>
              {/* What's new (#1530) beside the guide, so the list of updates can be read without leaving the design. */}
              {onWhatsNew ? (
                <button className="action-icon-button" type="button" aria-label={t("whatsNew.footerLink")} title={t("whatsNew.footerLink")} data-layerling-tool="whats-new" onClick={onWhatsNew}>
                  <Sparkles className="toolbar-search-icon" aria-hidden="true" />
                </button>
              ) : null}
              <button className="action-icon-button" type="button" aria-label={t("editor.keyboardShortcuts")} title={t("editor.keyboardShortcuts")} onClick={onShortcuts}>
                <ToolbarKeyboardIcon />
              </button>
              <button className={`action-icon-button ${interactiveHelpActive ? "active" : ""}`} type="button" aria-label={t("interactiveHelp.title")} title={`${t("interactiveHelp.title")} (${COMMAND_SHORTCUTS["interactive-help"]})`} aria-pressed={interactiveHelpActive} data-layerling-tool="interactive-help" data-help-exempt onClick={onInteractiveHelp}>
                <CircleHelp className="toolbar-search-icon" aria-hidden="true" />
              </button>
            </div>
          )}
          <ThemeSwitch />
          <LanguageSwitch />
          {/* The settings sit with the theme and the language, which are settings too, in the corner every mode shares (Stefan, 31.10.2026). */}
          <button className="action-icon-button toolbar-title-settings" type="button" aria-label={t("editor.workspaceSettings")} title={t("editor.workspaceSettings")} onClick={() => window.dispatchEvent(new Event("layerling:open-workspace-settings"))}>
            <ToolbarSettingsIcon />
          </button>
        </div>
      </div>
      {focusMode && onFocusModeChange ? (
        <FocusModeBar
          toolbarMode={toolbarMode === "sketch" ? "sketch" : "geometry"}
          sketchDisabled={historyViewActive}
          onSelectMode={selectToolbarMode}
          onHome={onHome}
          homeDisabled={toolbarMode !== "geometry"}
          onSearch={openPalette}
          onSettings={() => window.dispatchEvent(new Event("layerling:open-workspace-settings"))}
          onLeave={() => onFocusModeChange(false)}
          showSearch={!simpleMode}
          nameField={<ProjectNameField className="focus-mode-bar-name" projectName={projectName} onProjectNameChange={onProjectNameChange} />}
        />
      ) : null}
    </div>
  );
}
