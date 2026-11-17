"use client";

import { Pin, PinOff } from "lucide-react";
import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { GuideSection } from "@/lib/guideLinks";
import { useMovablePanel } from "@/lib/useMovablePanel";
import { capturePointer } from "@/lib/pointerCapture";
import {
  clampShapeMenuLength,
  parseShapeMenuSize,
  SHAPE_MENU_MAX_HEIGHT,
  SHAPE_MENU_MAX_WIDTH,
  SHAPE_MENU_MIN_HEIGHT,
  SHAPE_MENU_MIN_WIDTH,
  serializeShapeMenuSize,
  shapeMenuShowsNames,
  type ShapeMenuSize,
} from "@/lib/shapeMenuSize";

const SIZE_STORAGE_KEYS = { editor: "layerling.editor.shapeMenuSize", sketch: "layerling.sketch.shapeMenuSize" };
/** Pixels a key press on a focused edge changes the size by. */
const KEY_STEP = 24;
/** Room kept between a pulled edge and the edge of the editor. */
const AREA_MARGIN = 8;

/** The edges and corners that pull the panel's size: which way its width and its height grow. */
const RESIZE_HANDLES: { id: string; x: -1 | 0 | 1; y: 0 | 1 }[] = [
  { id: "left", x: -1, y: 0 },
  { id: "right", x: 1, y: 0 },
  { id: "bottom", x: 0, y: 1 },
  { id: "bottom-left", x: -1, y: 1 },
  { id: "bottom-right", x: 1, y: 1 },
];

type ResizeDrag = {
  pointerId: number;
  x: -1 | 0 | 1;
  y: 0 | 1;
  startX: number;
  startY: number;
  /** The panel's own pixels per screen pixel factor: toolbar zoom makes them differ. */
  scale: number;
  startWidth: number;
  startHeight: number;
  startLeft: number;
  startTop: number;
  maxWidth: number;
  maxHeight: number;
};

/**
 * The panel the Shapes button opens (#433, #447). It hangs under its button as always, closes after
 * a shape is picked and when anything else is clicked, and nothing about that changed. Two things
 * were added: its title bar moves it - over the Properties panel, say, where it does not cover the
 * spot a shape is going to be put - and a pin keeps it open, to put several shapes one after the
 * other. Where it stands is kept in this browser; a double-click on the title bar puts it back under
 * its button. The same panel serves the sketch's shapes.
 *
 * With `resizable` its edges and corners pull its size (#505): the width and height are kept in this
 * browser, a double-click on an edge sets the size back, and below a width where the names no longer
 * fit the panel shows only the pictures.
 */
export function ShapeMenuPanel({
  className = "",
  role,
  ariaLabel,
  title,
  helpSection,
  pinned,
  onTogglePinned,
  resizable = false,
  scope = "editor",
  children,
}: {
  className?: string;
  role?: "menu";
  ariaLabel?: string;
  /** The words in the title bar. */
  title: string;
  /** The part of the guide the question mark in the title bar opens. */
  helpSection: GuideSection;
  pinned: boolean;
  onTogglePinned: () => void;
  /** Lets the edges pull the size. */
  resizable?: boolean;
  /** Which panel this is: the 3D editor's and the sketch's keep their own place and size (#577). */
  scope?: "editor" | "sketch";
  children: ReactNode;
}) {
  useLanguage();
  // The panel is placed within the whole editor, so it can leave the toolbar it hangs from, but its title bar stays
  // below the toolbar, where it can be grabbed (#1418). Pinned, the 3D editor's panel lies in the workplane under the
  // toolbar (#1283), so the toolbar is looked up in the editor, not among the panel's parents.
  const movable = useMovablePanel<HTMLDivElement>(scope === "sketch" ? "layerling.sketch.shapeMenuPosition" : "layerling.editor.shapeMenuPosition", {
    area: (panel) => panel.closest<HTMLElement>(".layerling-editor"),
    below: (panel) => panel.closest(".layerling-editor")?.querySelector<HTMLElement>(".secondary-toolbar") ?? null,
    fitUsualSpot: true,
  });
  const PinIcon = pinned ? PinOff : Pin;

  // The remembered size, read in the first render, not after it (#505): the panel's remembered position is
  // clamped to the window in the layout effect of the first paint, with the width the panel has then. With the
  // size read later, it was clamped with the usual, much wider width and opened shifted to the left each time.
  // The panel opens on a click, never on the server, so reading the storage here cannot differ from the server's page.
  const SIZE_STORAGE_KEY = SIZE_STORAGE_KEYS[scope];
  const [size, setSize] = useState<ShapeMenuSize>(() => {
    if (!resizable || typeof window === "undefined") return { width: null, height: null };
    try {
      return parseShapeMenuSize(window.localStorage.getItem(SIZE_STORAGE_KEY));
    } catch {
      // Blocked storage: the panel opens at its usual size.
      return { width: null, height: null };
    }
  });
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const dragRef = useRef<ResizeDrag | null>(null);

  const storeSize = useCallback((next: ShapeMenuSize) => {
    try {
      const value = serializeShapeMenuSize(next);
      if (value) window.localStorage.setItem(SIZE_STORAGE_KEY, value);
      else window.localStorage.removeItem(SIZE_STORAGE_KEY);
    } catch {
      // Private windows: the size still holds until the panel closes.
    }
  }, []);

  /** The panel's width and height in its own pixels, and how many screen pixels one of them is. */
  const measurePanel = useCallback(() => {
    const panel = movable.panelRef.current;
    if (!panel) return null;
    const rect = panel.getBoundingClientRect();
    const computed = window.getComputedStyle(panel);
    const ownWidth = Number.parseFloat(computed.width);
    const scale = Number.isFinite(ownWidth) && ownWidth > 0 && rect.width > 0 ? rect.width / ownWidth : 1;
    return { rect, scale, width: rect.width / scale, height: rect.height / scale };
  }, [movable.panelRef]);

  /** Sets the size to what an edge was pulled to; a left edge also moves the panel, so its right edge stays. */
  const applySize = useCallback((drag: ResizeDrag, deltaX: number, deltaY: number) => {
    const next: ShapeMenuSize = { ...sizeRef.current };
    if (drag.x !== 0) {
      const width = clampShapeMenuLength(drag.startWidth + (drag.x * deltaX) / drag.scale, SHAPE_MENU_MIN_WIDTH, Math.min(SHAPE_MENU_MAX_WIDTH, drag.maxWidth));
      next.width = width;
      if (drag.x < 0) {
        const grown = (width - drag.startWidth) * drag.scale;
        movable.moveTo({ left: drag.startLeft - grown, top: drag.startTop }, width * drag.scale);
      }
    }
    if (drag.y !== 0) {
      next.height = clampShapeMenuLength(drag.startHeight + deltaY / drag.scale, SHAPE_MENU_MIN_HEIGHT, Math.min(SHAPE_MENU_MAX_HEIGHT, drag.maxHeight));
    }
    setSize(next);
    sizeRef.current = next;
  }, [movable]);

  const onHandleDown = useCallback((event: PointerEvent<HTMLElement>, x: -1 | 0 | 1, y: 0 | 1) => {
    if (event.button !== 0) return;
    const measured = measurePanel();
    const position = movable.currentPosition();
    const panel = movable.panelRef.current;
    const area = panel?.closest<HTMLElement>(".layerling-editor");
    if (!measured || !position || !area) return;
    event.preventDefault();
    event.stopPropagation();
    capturePointer(event.currentTarget, event.pointerId);
    const areaWidth = area.clientWidth;
    const areaHeight = area.clientHeight;
    dragRef.current = {
      pointerId: event.pointerId,
      x,
      y,
      startX: event.clientX,
      startY: event.clientY,
      scale: measured.scale,
      startWidth: measured.width,
      startHeight: measured.height,
      startLeft: position.left,
      startTop: position.top,
      // A left edge may grow only as far as the panel's left reaches the editor's; the others up to the editor's edge.
      maxWidth: ((x < 0 ? position.left + measured.rect.width : areaWidth - position.left) - AREA_MARGIN) / measured.scale,
      maxHeight: (areaHeight - position.top - AREA_MARGIN) / measured.scale,
    };
  }, [measurePanel, movable]);

  const onHandleMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    applySize(drag, event.clientX - drag.startX, event.clientY - drag.startY);
  }, [applySize]);

  const onHandleUp = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    storeSize(sizeRef.current);
    if (drag.x < 0) movable.keepPosition();
  }, [movable, storeSize]);

  const resetSize = useCallback(() => {
    const none: ShapeMenuSize = { width: null, height: null };
    setSize(none);
    sizeRef.current = none;
    storeSize(none);
  }, [storeSize]);

  const onHandleKey = useCallback((event: KeyboardEvent<HTMLElement>, x: -1 | 0 | 1, y: 0 | 1) => {
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const arrow = arrows[event.key];
    if (!arrow) return;
    const measured = measurePanel();
    const position = movable.currentPosition();
    const area = movable.panelRef.current?.closest<HTMLElement>(".layerling-editor");
    if (!measured || !position || !area) return;
    event.preventDefault();
    // An arrow towards the panel's middle makes it smaller, away from it larger; the step is the same one a drag makes.
    const dx = x === 0 ? 0 : arrow[0] * KEY_STEP * measured.scale;
    const dy = y === 0 ? 0 : arrow[1] * KEY_STEP * measured.scale;
    if (dx === 0 && dy === 0) return;
    const drag: ResizeDrag = {
      pointerId: -1,
      x,
      y,
      startX: 0,
      startY: 0,
      scale: measured.scale,
      startWidth: measured.width,
      startHeight: measured.height,
      startLeft: position.left,
      startTop: position.top,
      maxWidth: ((x < 0 ? position.left + measured.rect.width : area.clientWidth - position.left) - AREA_MARGIN) / measured.scale,
      maxHeight: (area.clientHeight - position.top - AREA_MARGIN) / measured.scale,
    };
    applySize(drag, dx, dy);
    storeSize(sizeRef.current);
    if (x < 0) movable.keepPosition();
  }, [applySize, measurePanel, movable, storeSize]);

  const sizedWidth = resizable && size.width !== null;
  const sizedHeight = resizable && size.height !== null;
  const iconsOnly = resizable && !shapeMenuShowsNames(size.width);
  const panelClass = [
    "shape-menu-dropdown",
    className,
    movable.dragging ? "moving" : "",
    sizedWidth ? "shape-menu-sized-width" : "",
    sizedHeight ? "shape-menu-sized-height" : "",
    iconsOnly ? "shape-menu-icons-only" : "",
  ].filter(Boolean).join(" ");

  const style: CSSProperties & Record<string, string | number | undefined> = { ...movable.style };
  if (sizedWidth) {
    // Never wider than the window, in the panel's own pixels (the toolbar zoom multiplies them).
    style.width = `min(${size.width}px, calc((100vw - 20px) / var(--toolbar-scale)))`;
  }
  if (sizedHeight) {
    const placedMax = typeof movable.style?.maxHeight === "number" ? `${movable.style.maxHeight}px, ` : "";
    style.maxHeight = `min(${size.height}px, ${placedMax}calc((100vh - 20px) / var(--toolbar-scale)))`;
    style["--shape-menu-height"] = `${size.height}px`;
  }

  return (
    <div
      ref={movable.panelRef}
      className={panelClass}
      style={style}
      role={role}
      aria-label={ariaLabel}
      data-help-section-all={resizable ? "addShape" : undefined}
    >
      <div className="shape-menu-title" title={t("shapeMenu.moveHint")} {...movable.handleProps}>
        <span className="shape-menu-title-text">
          {title}
          <GuideHelpLink section={helpSection} />
        </span>
        <button
          className={`shape-menu-pin ${pinned ? "active" : ""}`}
          type="button"
          aria-pressed={pinned}
          aria-label={t("shapeMenu.keepOpen")}
          title={t(pinned ? "shapeMenu.keepOpenOn" : "shapeMenu.keepOpen")}
          onClick={onTogglePinned}
        >
          <PinIcon size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      {children}
      {resizable
        ? RESIZE_HANDLES.map((handle) => (
            <div
              key={handle.id}
              className={`shape-menu-resize shape-menu-resize-${handle.id}`}
              role="separator"
              aria-orientation={handle.x === 0 ? "horizontal" : "vertical"}
              aria-label={t("shapeMenu.resize")}
              title={t("shapeMenu.resizeHint")}
              tabIndex={0}
              onPointerDown={(event) => onHandleDown(event, handle.x, handle.y)}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
              onDoubleClick={resetSize}
              onKeyDown={(event) => onHandleKey(event, handle.x, handle.y)}
            />
          ))
        : null}
    </div>
  );
}
