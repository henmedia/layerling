"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { ShapeMenuPanel } from "@/components/workplane/ShapeMenuPanel";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Check, CircleHelp, Cookie, Percent, Circle as CircleIcon, Eye, EyeOff, Hexagon as HexagonIcon, ListTree, Pencil, Pentagon as PentagonIcon, Rotate3d, Route as RouteIcon, Search, Square as SquareIcon, Star as StarIcon, Triangle as TriangleIcon, Worm, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useWheelField } from "@/lib/useWheelField";
import { wheelNextValue } from "@/lib/wheelValueStep";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useSimpleMode } from "@/lib/useSimpleMode";
import { simpleModeKeepsShape, simpleModeKeepsTool } from "@/lib/simpleMode";
import { normalizePolygonSides, normalizeStarInnerPercent, SKETCH_POLYGON_MAX_SIDES, SKETCH_POLYGON_MIN_SIDES, SKETCH_STAR_MAX_INNER_PERCENT, SKETCH_STAR_MIN_INNER_PERCENT } from "@/lib/sketchPrimitives";
import { SketchBoltCircleIcon, SketchEllipseIcon, SketchHalfCircleIcon, SketchPieSliceIcon, ToolbarAlignIcon, ToolbarAttachmentsIcon, ToolbarCenterOnWorkplaneIcon, ToolbarChamferIcon, ToolbarCaretDownIcon, ToolbarCopyIcon, ToolbarDuplicateIcon, ToolbarDropToWorkplaneIcon, ToolbarBundleIcon, ToolbarGroupIcon, ToolbarGuideIcon, ToolbarHideSelectedIcon, ToolbarHomeIcon, ToolbarImportIcon, ToolbarIntersectionIcon, ToolbarIntersectPreviewIcon, ToolbarHullIcon, ToolbarLoftSketchesIcon, ToolbarKeyboardIcon, ToolbarFilletIcon, ToolbarHistoryIcon, ToolbarHollowIcon, ToolbarOffsetIcon, ToolbarCutOutIcon, ToolbarDeleteFaceIcon, ToolbarSimplifyIcon, ToolbarSurfaceTextureIcon, ToolbarMirrorIcon, ToolbarRotationPivotIcon, ToolbarPatternIcon, ToolbarHolePatternIcon, ToolbarFaceToolIcon, ToolbarConstructionLineIcon, ToolbarMiddleLineIcon, ToolbarLayFlatIcon, ToolbarMateFacesIcon, ToolbarNoteIcon, ToolbarSplitIcon, ToolbarPasteIcon, ToolbarRedoIcon, ToolbarSnapGridIcon, ToolbarSettingsIcon, ToolbarShapeAddIcon, ToolbarTrashIcon, ToolbarUngroupIcon, ToolbarUndoIcon, ToolbarVectorExportIcon } from "../icons";
import { type SketchPrimitive, type SketchTool } from "../SketchWorkspace";
import { CommandPalette, type PaletteCommand } from "./CommandPalette";
import { COMMAND_KEYWORDS, COMMAND_SHORTCUTS, SHAPE_KEYWORDS } from "@/lib/commandKeywords";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { libraryShapeAssets, shapeAssetColor, shapeAssetLabel, shapeAssetMenuLabel } from "@/lib/shapeCatalog";
import { NoteToolButton } from "@/components/workplane/NoteToolButton";
import type { CadModifierKind } from "@/lib/cadModifierTypes";
import type { ShapeAsset, SketchOperation, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { TopPanel } from "./TopActionPanel";


/** Die Befehle der Suche, die im Verlaufsblick wach bleiben: sie aendern nichts am Entwurf. */
export const HISTORY_VIEW_COMMANDS = new Set(["history", "export", "guide", "shortcuts"]);
export type ToolbarMode = "geometry" | "sketch";

export const sketchReferenceIcons = {
  line: "sketch-tool-line.png",
  arc: "sketch-tool-arc.png",
  bezier: "sketch-tool-bezier-curve.png",
  smooth: "sketch-tool-smooth-curve.png",
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
  select: sketchPaletteIcon("select"),
  image: sketchPaletteIcon("image"),
  refine: sketchPaletteIcon("refine"),
  erase: sketchPaletteIcon("erase"),
};

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
  canLoftSketches,
  canRedo,
  canUngroup,
  canUndo,
  canHistoryView,
  historyViewActive,
  onHistoryView,
  hasClipboard,
  hasSelection,
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
  onAlign,
  onChamfer,
  onCopy,
  onDelete,
  onDuplicate,
  onCenterOnWorkplane,
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
  canFaceTool,
  onGroup,
  onBundle,
  onIntersect,
  onHull,
  onCookieCutter,
  onFlexi,
  onLoftSketches,
  onIntersectPreview,
  intersectPreviewActive,
  onFillet,
  onHollow,
  hollowActive,
  onOffset,
  offsetActive,
  onCutOut,
  canCutOut,
  cutOutActive,
  onDeleteFace,
  deleteFaceActive,
  canSimplify,
  onSimplify,
  simplifyActive,
  canSurfaceTexture,
  onSurfaceTextureTool,
  surfaceTextureActive,
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
  onToggleHidden,
  onUngroup,
  onUndo,
  onTopPanel,
  onAddShape,
  onShortcuts,
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
  shapeCustomizations,
  objects,
  onSelectObject,
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
  canLoftSketches: boolean;
  canRedo: boolean;
  canUngroup: boolean;
  canUndo: boolean;
  canHistoryView: boolean;
  historyViewActive: boolean;
  onHistoryView: () => void;
  hasClipboard: boolean;
  hasSelection: boolean;
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
  onAlign: () => void;
  onChamfer: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCenterOnWorkplane: () => void;
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
  canFaceTool: boolean;
  onGroup: () => void;
  onBundle: () => void;
  onIntersect: () => void;
  onHull: () => void;
  onCookieCutter: () => void;
  onFlexi: () => void;
  onLoftSketches: () => void;
  onIntersectPreview: () => void;
  intersectPreviewActive: boolean;
  onFillet: () => void;
  onHollow: () => void;
  hollowActive: boolean;
  onOffset: () => void;
  offsetActive: boolean;
  onCutOut: () => void;
  canCutOut: boolean;
  cutOutActive: boolean;
  onDeleteFace: () => void;
  deleteFaceActive: boolean;
  canSimplify: boolean;
  onSimplify: () => void;
  simplifyActive: boolean;
  /** One body selected that can take a surface texture. */
  canSurfaceTexture: boolean;
  /** Opens or closes the selected body's surface texture card. */
  onSurfaceTextureTool: () => void;
  surfaceTextureActive: boolean;
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
  onToggleHidden: () => void;
  onUngroup: () => void;
  onUndo: () => void;
  onTopPanel: (panel: TopPanel) => void;
  onAddShape: (shape: ShapeAsset) => void;
  onShortcuts: () => void;
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
  renderMyShapes?: (close: () => void) => ReactNode;
  /** The shape defaults, so each library entry can show the colour it will be added in. */
  shapeCustomizations: WorkplaneWorkspaceSettings["shapeCustomizations"];
  /** The bodies of the design, so the command search can find them by name. */
  objects: ReadonlyArray<{ id: string; name: string; kind: string; hidden: boolean }>;
  onSelectObject: (id: string) => void;
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
      const title = parseFloat(styles.getPropertyValue("--editor-toolbar-title-height")) || 44;
      const minimum = parseFloat(styles.getPropertyValue("--editor-toolbar-tools-height")) || 76;
      const tools = content.offsetHeight;
      // A hidden editor measures nothing; it keeps the one-row height.
      root.style.setProperty("--editor-toolbar-height", `${Math.round(title + Math.max(minimum, tools))}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(content);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--editor-toolbar-height");
    };
  }, []);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibilityMenuPosition, setVisibilityMenuPosition] = useState({ top: 0, left: 0 });
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const visibilityMenuRef = useRef<HTMLDivElement>(null);
  const touchShapeStartRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const suppressNextShapeClickRef = useRef(false);
  const cancelProjectNameEditRef = useRef(false);
  const projectNameFieldRef = useRef<HTMLLabelElement>(null);
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const [projectNameDraft, setProjectNameDraft] = useState(projectName);
  useEffect(() => {
    setProjectNameDraft(projectName);
  }, [projectName]);
  useEffect(() => {
    const finishProjectNameEdit = (event: PointerEvent) => {
      const input = projectNameInputRef.current;
      if (input && document.activeElement === input && !projectNameFieldRef.current?.contains(event.target as Node)) {
        input.blur();
      }
    };
    document.addEventListener("pointerdown", finishProjectNameEdit, true);
    return () => document.removeEventListener("pointerdown", finishProjectNameEdit, true);
  }, []);
  const commitProjectName = (value: string) => {
    const nextName = value.trim().slice(0, 80);
    if (!nextName) {
      setProjectNameDraft(projectName);
      return;
    }
    setProjectNameDraft(nextName);
    if (nextName !== projectName) onProjectNameChange?.(nextName);
  };
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
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      openPaletteRef.current();
    };
    window.addEventListener("keydown", openOnShortcut);
    return () => window.removeEventListener("keydown", openOnShortcut);
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
  const inSimpleMode = <T extends { id: string }>(tools: T[]) => (simpleMode ? tools.filter((tool) => simpleModeKeepsTool(tool.id)) : tools);
  const shownShapeAssets = simpleMode ? libraryShapeAssets.filter((shape) => simpleModeKeepsShape(shape.id)) : libraryShapeAssets;
  const leftTools = [
    { id: "copy", label: t("editor.tool.copy"), icon: ToolbarCopyIcon, action: onCopy, enabled: hasSelection },
    { id: "paste", label: t("editor.tool.paste"), icon: ToolbarPasteIcon, action: onPaste, enabled: hasClipboard },
    { id: "duplicate", label: t("editor.tool.duplicate"), icon: ToolbarDuplicateIcon, action: onDuplicate, enabled: hasSelection },
    { id: "delete", label: t("editor.tool.delete"), icon: ToolbarTrashIcon, action: onDelete, enabled: canModifySelection },
    { id: "undo", label: t("editor.tool.undo"), icon: ToolbarUndoIcon, action: onUndo, enabled: canUndo },
    { id: "redo", label: t("editor.tool.redo"), icon: ToolbarRedoIcon, action: onRedo, enabled: canRedo },
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
    },
  ];
  const combineTools = [
    { id: "group", label: t("editor.tool.group"), icon: ToolbarGroupIcon, action: onGroup, enabled: canGroup },
    { id: "bundle", label: t("editor.tool.bundle"), icon: ToolbarBundleIcon, action: onBundle, enabled: canGroup },
    { id: "ungroup", label: t("editor.tool.ungroup"), icon: ToolbarUngroupIcon, action: onUngroup, enabled: canUngroup },
    { id: "intersect", label: t("editor.tool.intersect"), icon: ToolbarIntersectionIcon, action: onIntersect, enabled: canIntersect || intersectPreviewActive },
    { id: "cutOut", label: t("editor.tool.cutOut"), icon: ToolbarCutOutIcon, action: onCutOut, enabled: canCutOut || cutOutActive, active: cutOutActive },
    { id: "hull", label: t("editor.tool.hull"), icon: ToolbarHullIcon, action: onHull, enabled: canHull },
    { id: "loftSketches", label: t("editor.tool.loftSketches"), icon: ToolbarLoftSketchesIcon, action: onLoftSketches, enabled: canLoftSketches },
    { id: "intersect-preview", label: t("editor.tool.intersectPreview"), icon: ToolbarIntersectPreviewIcon, action: onIntersectPreview, enabled: canIntersect || intersectPreviewActive, active: intersectPreviewActive },
  ];
  const modifyTools = [
    { id: "mirror", label: t("editor.tool.mirror"), icon: ToolbarMirrorIcon, action: onMirror, enabled: canModifySelection, active: mirrorMode },
    { id: "pivot", label: t("editor.tool.rotationPivot"), icon: ToolbarRotationPivotIcon, action: onRotationPivot, enabled: canModifySelection, active: rotationPivotActive },
    { id: "array", label: t("editor.tool.array"), icon: ToolbarPatternIcon, action: onArray, enabled: canModifySelection, active: arrayActive },
    { id: "holePattern", label: t("holePattern.title"), icon: ToolbarHolePatternIcon, action: onHolePattern, enabled: canHolePattern, active: holePatternActive },
    { id: "faceTool", label: t("faceTool.title"), icon: ToolbarFaceToolIcon, action: onFaceTool, enabled: canFaceTool, active: faceToolActive },
    { id: "split", label: t("editor.tool.split"), icon: ToolbarSplitIcon, action: onSplit, enabled: splitMode || canSplit, active: splitMode },
    { id: "flexi", label: t("editor.tool.flexi"), icon: Worm, action: onFlexi, enabled: canFlexi || flexiActive, active: flexiActive },
    { id: "cookieCutter", label: t("editor.tool.cookieCutter"), icon: Cookie, action: onCookieCutter, enabled: canCookieCutter },
    { id: "chamfer", label: t("editor.tool.chamfer"), icon: ToolbarChamferIcon, action: onChamfer, enabled: canEdgeModify, active: edgeModifierKind === "chamfer" || edgeModifierKind === "chamfillet" },
    { id: "fillet", label: t("editor.tool.fillet"), icon: ToolbarFilletIcon, action: onFillet, enabled: canEdgeModify, active: edgeModifierKind === "fillet" },
    { id: "hollow", label: t("editor.tool.hollow"), icon: ToolbarHollowIcon, action: onHollow, enabled: canEdgeModify, active: hollowActive },
    { id: "offset", label: t("editor.tool.offset"), icon: ToolbarOffsetIcon, action: onOffset, enabled: canEdgeModify, active: offsetActive },
    { id: "deleteFace", label: t("editor.tool.deleteFace"), icon: ToolbarDeleteFaceIcon, action: onDeleteFace, enabled: canEdgeModify, active: deleteFaceActive },
    { id: "simplify", label: t("editor.tool.simplify"), icon: ToolbarSimplifyIcon, action: onSimplify, enabled: canSimplify, active: simplifyActive },
    { id: "surfaceTexture", label: t("inspector.surfaceTexture"), icon: ToolbarSurfaceTextureIcon, action: onSurfaceTextureTool, enabled: canSurfaceTexture, active: surfaceTextureActive },
  ];
  const arrangeTools = [
    { id: "align", label: t("editor.tool.align"), icon: ToolbarAlignIcon, action: onAlign, enabled: canAlign, active: alignMode },
    { id: "snap", label: t("editor.tool.snapToGrid"), icon: ToolbarSnapGridIcon, action: onSnap, enabled: canModifySelection },
    { id: "drop", label: t("editor.tool.dropToWorkplane"), icon: ToolbarDropToWorkplaneIcon, action: onDropToWorkplane, enabled: canModifySelection },
    { id: "layFlat", label: t("editor.tool.layFlat"), icon: ToolbarLayFlatIcon, action: onLayFlat, enabled: canModifySelection, active: layFlatActive },
    { id: "mateFaces", label: t("editor.tool.mateFaces"), icon: ToolbarMateFacesIcon, action: onMateFaces, enabled: canModifySelection, active: mateFacesActive },
    { id: "center", label: t("editor.tool.centerOnWorkplane"), icon: ToolbarCenterOnWorkplaneIcon, action: onCenterOnWorkplane, enabled: canModifySelection },
  ];
  const sketchClipboardTools = [
    { id: "sketch-copy", label: t("editor.tool.copy"), icon: ToolbarCopyIcon, action: onSketchCopy, enabled: sketchHasSelection },
    { id: "sketch-paste", label: t("editor.tool.paste"), icon: ToolbarPasteIcon, action: onSketchPaste, enabled: sketchHasClipboard },
    { id: "sketch-duplicate", label: t("editor.tool.duplicate"), icon: ToolbarDuplicateIcon, action: onSketchDuplicate, enabled: sketchHasSelection },
    { id: "sketch-delete", label: t("editor.tool.delete"), icon: ToolbarTrashIcon, action: onSketchDelete, enabled: sketchHasSelection },
  ];
  const renderToolButton = (tool: (typeof leftTools)[number] | (typeof visibilityTools)[number] | (typeof combineTools)[number] | (typeof modifyTools)[number] | (typeof arrangeTools)[number]) => {
    const { id, icon: Icon, action, label } = tool;
    // Im Verlaufsblick schlaeft jedes Werkzeug ausser dem, das ihn beendet -
    // wirklich, nicht nur im Aussehen: eine Auswahl aus der Zeit davor darf
    // kein Loeschen freischalten, waehrend die Flaeche etwas anderes zeigt.
    const enabled = tool.enabled && (!historyViewActive || id === "history");
    const active = "active" in tool && Boolean(tool.active);
    // Switched off by aria-disabled, not by the disabled attribute: a disabled button gets no pointer events,
    // so Chrome and Edge never showed its tooltip, and what a greyed-out icon was for could not be found out
    // by hovering it (a donor's mail, 29.10.2026).
    return (
      <button
        className={`toolbar-icon ${enabled ? "" : "disabled"} ${active ? "active" : ""}`}
        key={id}
        data-layerling-tool={id}
        aria-label={label}
        title={COMMAND_SHORTCUTS[id] ? `${label} (${COMMAND_SHORTCUTS[id]})` : label}
        onClick={enabled ? action : undefined}
        aria-disabled={enabled ? undefined : true}
      >
        <Icon />
      </button>
    );
  };

  // Everything the toolbar and its menus can do, as entries of the command
  // search. Built from the same lists as the buttons, so a new tool shows up in
  // both without a second place to remember; only built while the search is open.
  const buildPaletteCommands = (): PaletteCommand[] => buildAllPaletteCommands().map((command) =>
    historyViewActive && !HISTORY_VIEW_COMMANDS.has(command.id) ? { ...command, enabled: false } : command,
  );
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
        plain("note", t("editor.tool.note"), t("editor.group.manage"), true, onNoteTool, { icon: ToolbarNoteIcon, active: noteMode }),
        plain("notes", t("visibility.notes"), t("editor.group.manage"), true, onToggleNotes, { icon: notesVisible ? Eye : EyeOff, active: notesVisible }),
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
    const manageGroup = t("editor.group.manage");
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
      ...visibilityTools.map((tool) => fromTool(tool, visibilityGroup)),
      plain(
        "show-hidden",
        hiddenShapeCount === 0 ? t("visibility.nothingHidden") : t("visibility.showAllHidden", { count: hiddenShapeCount }),
        visibilityGroup,
        hiddenShapeCount > 0,
        onShowHidden,
        { icon: Eye },
      ),
      plain("notes", t("visibility.notes"), visibilityGroup, noteCount > 0, onToggleNotes, { icon: notesVisible ? Eye : EyeOff, active: notesVisible }),
      plain("overhangs", t("visibility.overhangs", { angle: overhangAngle }), visibilityGroup, true, onToggleOverhangs, { icon: AlertTriangle, active: overhangsVisible }),
      ...combineTools.map((tool) => fromTool(tool, t("editor.group.combine"))),
      ...modifyTools.map((tool) => fromTool(tool, t("editor.group.modify"))),
      plain("carry", t("contextMenu.carry"), t("editor.group.arrange"), canModifySelection, onCarryOntoFace, { icon: ArrowDownToLine }),
      plain("scalePercent", t("scalePercent.title"), t("editor.group.modify"), canModifySelection, onScalePercent, { icon: Percent, active: scalePercentActive }),
      ...arrangeTools.map((tool) => fromTool(tool, t("editor.group.arrange"))),
      plain("note", t("editor.tool.note"), manageGroup, true, onNoteTool, { icon: ToolbarNoteIcon, active: noteMode }),
      plain("import", t("editor.import"), manageGroup, true, () => onTopPanel("import"), { icon: ToolbarImportIcon }),
      plain("export", t("editor.export"), manageGroup, true, () => onTopPanel("export"), { icon: ToolbarVectorExportIcon }),
      plain("attachments", t("editor.attachments"), manageGroup, true, () => onTopPanel("attachments"), { icon: ToolbarAttachmentsIcon, keywords: ["attachment", "file", "notes", "instructions", "readme", "anhang", "datei"] }),
      plain("settings", t("editor.workspaceSettings"), manageGroup, true, () => window.dispatchEvent(new Event("layerling:open-workspace-settings")), { icon: ToolbarSettingsIcon }),
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

  return (
    <div className="secondary-toolbar">
      {paletteOpen ? <CommandPalette commands={buildPaletteCommands()} onClose={() => setPaletteOpen(false)} /> : null}
      <div ref={toolbarContentRef} className={`toolbar-mode-content ${toolbarMode}`}>
        {toolbarMode === "geometry" ? (
          <>
      {onHome ? (
        <div className="tool-group editor-nav-group">
          <div className="toolbar-section toolbar-home-section" data-group="home">
            <div className="toolbar-section-label">{t("editor.group.home")}</div>
            <div className="toolbar-section-tools">
              <button className="toolbar-icon editor-home-control" aria-label={t("editor.homeDashboard")} title={t("editor.homeDashboard")} onClick={onHome}>
                <ToolbarHomeIcon />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="tool-group left">
        <div className="toolbar-section" data-group="clipboard" inert={historyViewActive}>
          <div className="toolbar-section-label">{t("editor.group.clipboard")}</div>
          <div className="toolbar-section-tools">{leftTools.slice(0, 4).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section" data-group="history">
          <div className="toolbar-section-label">{t("editor.group.history")}</div>
          <div className="toolbar-section-tools">{inSimpleMode(leftTools.slice(4)).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section toolbar-shapes-section" data-group="shapes" ref={shapesMenuRef} inert={historyViewActive}>
          <div className="toolbar-section-label">{t("editor.group.shapes")}</div>
          <div className="toolbar-section-tools">
            <button
              className={`shape-menu-trigger ${shapesOpen ? "active" : ""}`}
              aria-label={t("editor.addShape")}
              aria-expanded={shapesOpen}
              onClick={() => {
                setVisibilityOpen(false);
                setShapesOpen((value) => !value);
              }}
            >
              <ToolbarShapeAddIcon />
            </button>
          </div>
          {shapesOpen ? (
            <ShapeMenuPanel
              title={t("shape.basicShapes")}
              helpSection="addShape"
              pinned={shapesPinned}
              onTogglePinned={toggleShapesPinned}
              resizable
            >
              <div className="shape-menu-body">
              {renderMyShapes && !simpleMode ? (
                <>
                  {renderMyShapes(closeShapesAfterPick)}
                  <div className="shape-menu-subtitle">{t("myShapes.basicShapes")}</div>
                </>
              ) : null}
              <div className="shape-menu-list">
                {shownShapeAssets.map((shape) => (
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
                ))}
              </div>
              </div>
            </ShapeMenuPanel>
          ) : null}
        </div>
      </div>
      <div className="toolbar-spacer" />
      <div className="tool-group right" inert={historyViewActive}>
        {simpleMode ? null : (
        <div className="toolbar-section compact toolbar-visibility-section" data-group="visibility" ref={visibilityMenuRef}>
          <div className="toolbar-section-label">{t("editor.group.visibility")}</div>
          <div className="toolbar-section-tools">
            {visibilityTools.map(renderToolButton)}
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
        <div className="toolbar-section" data-group="combine">
          <div className="toolbar-section-label">{t("editor.group.combine")}</div>
          <div className="toolbar-section-tools">{inSimpleMode(combineTools).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section" data-group="modify">
          <div className="toolbar-section-label">{t("editor.group.modify")}</div>
          <div className="toolbar-section-tools">{inSimpleMode(modifyTools).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section" data-group="arrange">
          <div className="toolbar-section-label">{t("editor.group.arrange")}</div>
          <div className="toolbar-section-tools">{inSimpleMode(arrangeTools).map(renderToolButton)}</div>
        </div>
      </div>
      <div className="toolbar-section toolbar-actions-section" data-group="manage">
        <div className="toolbar-section-label">{t("editor.group.manage")}</div>
        <div className="action-buttons">
          {simpleMode ? null : <NoteToolButton active={noteMode} shortcut={COMMAND_SHORTCUTS.note} onClick={onNoteTool} disabled={historyViewActive} />}
          {simpleMode ? null : <button className="action-icon-button" aria-label={t("editor.import")} title={`${t("editor.import")} (${COMMAND_SHORTCUTS.import})`} onClick={() => onTopPanel("import")} disabled={historyViewActive}>
            <ToolbarImportIcon />
          </button>}
          <button className="action-icon-button" aria-label={t("editor.export")} title={`${t("editor.export")} (${COMMAND_SHORTCUTS.export})`} onClick={() => onTopPanel("export")}>
            <ToolbarVectorExportIcon />
          </button>
          {/* The dot says there is something attached without opening the panel, as the badge on the visibility button says there is something hidden. */}
          <button
            className={`action-icon-button ${attachmentCount > 0 ? "has-attachments" : ""}`}
            aria-label={attachmentsLabel}
            title={attachmentsLabel}
            onClick={() => onTopPanel("attachments")}
          >
            <ToolbarAttachmentsIcon />
            {attachmentCount > 0 ? <span className="attachments-indicator" aria-hidden="true" /> : null}
          </button>
          <button className="action-icon-button" aria-label={t("editor.workspaceSettings")} title={t("editor.workspaceSettings")} onClick={() => window.dispatchEvent(new Event("layerling:open-workspace-settings"))}>
            <ToolbarSettingsIcon />
          </button>
        </div>
      </div>
      {simpleMode ? null : <div className="toolbar-section toolbar-actions-section" data-group="help">
        <div className="toolbar-section-label">{t("editor.group.help")}</div>
        <div className="action-buttons">
          <button className="action-icon-button" aria-label={t("palette.open")} title={t("palette.open")} aria-haspopup="dialog" data-layerling-tool="command-search" onClick={openPalette}>
            <Search className="toolbar-search-icon" aria-hidden="true" />
          </button>
          <button className="action-icon-button" aria-label={t("editor.guide")} title={t("editor.guide")} onClick={onGuide}>
            <ToolbarGuideIcon />
          </button>
          <button className="action-icon-button" aria-label={t("editor.keyboardShortcuts")} title={t("editor.keyboardShortcuts")} onClick={onShortcuts}>
            <ToolbarKeyboardIcon />
          </button>
          <button className={`action-icon-button ${interactiveHelpActive ? "active" : ""}`} type="button" aria-label={t("interactiveHelp.title")} title={`${t("interactiveHelp.title")} (${COMMAND_SHORTCUTS["interactive-help"]})`} aria-pressed={interactiveHelpActive} data-layerling-tool="interactive-help" data-help-exempt onClick={onInteractiveHelp}>
            <CircleHelp className="toolbar-search-icon" aria-hidden="true" />
          </button>
        </div>
      </div>}
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
                    <button className={`toolbar-icon sketch-tool-icon sketch-construction-toggle ${sketchConstruction ? "active" : ""}`} type="button" aria-pressed={Boolean(sketchConstruction)} aria-label={t("sketch.construction")} title={t("sketch.constructionHint")} onClick={onSketchConstruction}>
                      <ToolbarConstructionLineIcon />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon sketch-from-middle-toggle ${sketchFromMiddle ? "active" : ""}`} type="button" aria-pressed={Boolean(sketchFromMiddle)} aria-label={t("sketch.fromMiddle")} title={t("sketch.fromMiddleHint")} onClick={onSketchFromMiddle}>
                      <ToolbarMiddleLineIcon />
                    </button>
                  </div>
                </div>
                <div className="toolbar-section toolbar-shapes-section sketch-shapes-section" data-group="shapes" ref={shapesMenuRef}>
                  <div className="toolbar-section-label">{t("sketch.group.shapes")}</div>
                  <div className="toolbar-section-tools">
                    <button
                      className={`shape-menu-trigger ${shapesOpen ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.addShape")}
                      aria-haspopup="menu"
                      aria-expanded={shapesOpen}
                      onClick={() => {
                        setVisibilityOpen(false);
                        setShapesOpen((open) => !open);
                      }}
                    >
                      <ToolbarShapeAddIcon />
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
                <div className="toolbar-section sketch-clipboard-section" data-group="clipboard">
                  <div className="toolbar-section-label">{t("editor.group.clipboard")}</div>
                  <div className="toolbar-section-tools">{sketchClipboardTools.map(renderToolButton)}</div>
                </div>
                <div className="toolbar-section sketch-history-section" data-group="history">
                  <div className="toolbar-section-label">{t("editor.group.history")}</div>
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
            {/* Notes go on a sketch as in 3D: they are the sketch body's. */}
            {simpleMode || !sketchActive ? null : <div className="toolbar-section toolbar-actions-section" data-group="manage">
              <div className="toolbar-section-label">{t("editor.group.manage")}</div>
              <div className="action-buttons"><NoteToolButton active={noteMode} shortcut={COMMAND_SHORTCUTS.note} onClick={onNoteTool} /></div>
            </div>}
            {/* Sketch mode has its own keys; the help opens from here too. */}
            {simpleMode ? null : <div className="toolbar-section toolbar-actions-section" data-group="help">
              <div className="toolbar-section-label">{t("editor.group.help")}</div>
              <div className="action-buttons">
                <button className="action-icon-button" aria-label={t("palette.open")} title={t("palette.open")} aria-haspopup="dialog" data-layerling-tool="command-search" onClick={openPalette}>
                  <Search className="toolbar-search-icon" aria-hidden="true" />
                </button>
                <button className="action-icon-button" aria-label={t("editor.guide")} title={t("editor.guide")} onClick={onGuide}>
                  <ToolbarGuideIcon />
                </button>
                <button className="action-icon-button" aria-label={t("editor.keyboardShortcuts")} title={t("editor.keyboardShortcuts")} onClick={onShortcuts}>
                  <ToolbarKeyboardIcon />
                </button>
                <button className={`action-icon-button ${interactiveHelpActive ? "active" : ""}`} type="button" aria-label={t("interactiveHelp.title")} title={`${t("interactiveHelp.title")} (${COMMAND_SHORTCUTS["interactive-help"]})`} aria-pressed={interactiveHelpActive} data-layerling-tool="interactive-help" data-help-exempt onClick={onInteractiveHelp}>
                  <CircleHelp className="toolbar-search-icon" aria-hidden="true" />
                </button>
              </div>
            </div>}
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
          <label ref={projectNameFieldRef} className="toolbar-project-name-field" title={t("editor.renameProject")}>
            <input
              ref={projectNameInputRef}
              aria-label={t("confirm.projectName")}
              value={projectNameDraft}
              maxLength={80}
              spellCheck={false}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              onBlur={(event) => {
                if (cancelProjectNameEditRef.current) {
                  cancelProjectNameEditRef.current = false;
                  setProjectNameDraft(projectName);
                  return;
                }
                commitProjectName(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  cancelProjectNameEditRef.current = true;
                  event.currentTarget.blur();
                }
              }}
            />
            <Pencil size={13} strokeWidth={2.4} aria-hidden="true" />
          </label>
        </div>
        <div className="toolbar-title-row-actions">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
      </div>
    </div>
  );
}
