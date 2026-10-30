"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { numberLocale, t, type MessageKey } from "@/lib/i18n";
import { importModelFiles } from "@/lib/modelImport";
import { edgePath, snapToEdge } from "@/lib/pictureEdgePath";
import { preparePicture, type PreparedPicture } from "@/lib/pictureTrace";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import type { VaseSettings } from "@/lib/vase/vase-geometry.mjs";
import { profileEditor, sectionEditor, twistEditor, type VaseDrawingBoard, type VaseDrawingOptions, type VaseEdgeLasso } from "@/lib/vase/vase-editors.mjs";
import { vaseNote } from "@/lib/vaseNotes";
import { vaseDrawingPatch, vaseDrawingSettings } from "@/lib/vaseShape";
import { resizedImportedMeshPositions } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

type DrawingMode = "profile" | "section" | "twist";

const MODES: Array<{ mode: DrawingMode; label: MessageKey }> = [
  { mode: "profile", label: "vaseDraw.tabProfile" },
  { mode: "section", label: "vaseDraw.tabSection" },
  { mode: "twist", label: "vaseDraw.tabTwist" },
];

/**
 * A mesh file read the way the import window reads it, as triangles in the vase tool's frame
 * (z up): the drawing board takes a model vase's body form off it.
 */
async function readMeshTriangles(name: string, bytes: Uint8Array) {
  const result = await importModelFiles([new File([bytes as BlobPart], name)]);
  if (!result?.shapes.length) throw new Error(result?.failures[0]?.reason ?? t("status.importUnsupported"));
  const soup: number[] = [];
  for (const shape of result.shapes) {
    const positions = resizedImportedMeshPositions(shape);
    const lift = shape.elevation ?? 0;
    // The editor's y is up; the vase tool's z is.
    for (let i = 0; i + 2 < positions.length; i += 3) soup.push(positions[i] + shape.x, -(positions[i + 2] + shape.z), positions[i + 1] + lift);
  }
  return soup;
}

/** Trace's magnetic lasso in the vase drawing: the sketch's way along a picture's edges (pictureEdgePath), on the photo. */
const EDGE_LASSO: VaseEdgeLasso = {
  prepare: (pixels) => preparePicture(pixels),
  snap: (photo, [x, y]) => {
    const spot = snapToEdge(photo as PreparedPicture, { x, y });
    return [spot.x, spot.y];
  },
  path: (photo, [fromX, fromY], [toX, toY]) => edgePath(photo as PreparedPicture, { x: fromX, y: fromY }, { x: toX, y: toY }).map((point): [number, number] => [point.x, point.y]),
};

/** Where the window stands in the editor area, remembered in this browser. */
const WINDOW: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto" },
  area: (panel) => panel.ownerDocument.querySelector<HTMLElement>(".workplane-stage"),
};

/**
 * The vase tool's drawing boards in a window of their own over the editor: the vase's body form from the side, its
 * cross-section from above and its twist up the height, in real millimetres, as large as the window. It moves by its
 * title bar and grows from its corner; the vase in the view follows every change. A drag is one step of undo; while
 * it lasts the vase is shown roughly (draft quality), at its end in full. Keys pressed in the window stay in it - an
 * arrow moves a point, Delete removes one, not the vase - except shortcuts with Ctrl or Cmd (undo).
 */
export function VaseDrawingWindow({
  shape,
  disabled,
  onUpdate,
  onInteractionActiveChange,
  onClose,
}: {
  shape: WorkplaneShape;
  disabled: boolean;
  onUpdate: (patch: Partial<WorkplaneShape>) => void;
  onInteractionActiveChange?: (active: boolean) => void;
  onClose: () => void;
}) {
  useLanguage();
  const [mode, setMode] = useState<DrawingMode>("profile");
  const movable = useMovablePanel<HTMLElement>("layerling.editor.vaseDrawingPosition", WINDOW);
  const { panelRef } = movable;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.focus({ preventScroll: true });
    // Stopped on the window itself, before the editor's own shortcuts on the page hear them.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      event.stopPropagation();
      if (event.key === "Escape") closeRef.current();
    };
    panel.addEventListener("keydown", onKeyDown);
    return () => {
      panel.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [panelRef]);

  const title = t("inspector.vaseDraw");
  return createPortal(
    <aside
      ref={movable.panelRef}
      className={`edge-modifier-panel vase-drawing-window ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
    >
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{shape.name}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="vase" />
          <button type="button" aria-label={t("inspector.vaseDrawClose")} title={t("inspector.vaseDrawClose")} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="vase-drawing vase-drawing-window-body">
        <div className="vase-drawing-tabs" role="group" aria-label={title}>
          {MODES.map((entry) => (
            <button key={entry.mode} type="button" aria-pressed={mode === entry.mode} onClick={() => setMode(entry.mode)}>
              {t(entry.label)}
            </button>
          ))}
        </div>
        <p className="cylinder-wrap-hint">{t("inspector.vaseDrawHint")}</p>
        <VaseDrawingHost key={mode} mode={mode} shape={shape} disabled={disabled} onUpdate={onUpdate} onInteractionActiveChange={onInteractionActiveChange} />
      </div>
    </aside>,
    document.body,
  );
}

function VaseDrawingHost({
  mode,
  shape,
  disabled,
  onUpdate,
  onInteractionActiveChange,
}: {
  mode: DrawingMode;
  shape: WorkplaneShape;
  disabled: boolean;
  onUpdate: (patch: Partial<WorkplaneShape>) => void;
  onInteractionActiveChange?: (active: boolean) => void;
}) {
  const language = useLanguage();
  const hostRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<VaseDrawingBoard | null>(null);
  const shapeRef = useRef(shape);
  shapeRef.current = shape;
  const callbacks = useRef({ onUpdate, onInteractionActiveChange });
  callbacks.current = { onUpdate, onInteractionActiveChange };
  // What the board draws: the vase's settings in real millimetres, ahead of the shape while a drag runs.
  const drawingRef = useRef<VaseSettings | null>(null);
  const dragRef = useRef<{ quality: string } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let frame = 0;
    const send = (draft: boolean) => {
      frame = 0;
      const drawing = drawingRef.current;
      if (!drawing) return;
      const quality = dragRef.current?.quality ?? drawing.quality;
      callbacks.current.onUpdate(vaseDrawingPatch(shapeRef.current, { ...drawing, quality: draft ? "entwurf" : quality }));
    };
    const options: VaseDrawingOptions = {
      get: () => drawingRef.current ?? (drawingRef.current = vaseDrawingSettings(shapeRef.current)),
      set: (patch, setOptions) => {
        const current = options.get();
        const draft = Boolean(setOptions?.draft);
        if (draft && !dragRef.current) {
          dragRef.current = { quality: current.quality };
          callbacks.current.onInteractionActiveChange?.(true);
        }
        drawingRef.current = { ...current, ...patch };
        boardRef.current?.render();
        if (draft) {
          // One update per frame while dragging; the board itself follows every move.
          if (!frame) frame = requestAnimationFrame(() => send(true));
          return;
        }
        if (frame) cancelAnimationFrame(frame);
        send(false);
        if (dragRef.current) {
          dragRef.current = null;
          callbacks.current.onInteractionActiveChange?.(false);
        }
      },
      tr: (key, params) => t(key as MessageKey, params),
      note: vaseNote,
      locale: numberLocale(),
      readMesh: readMeshTriangles,
      edgeLasso: EDGE_LASSO,
    };
    const board = mode === "profile" ? profileEditor(options) : mode === "section" ? sectionEditor(options) : twistEditor(options);
    boardRef.current = board;
    host.replaceChildren(board.el);
    const fitFrame = requestAnimationFrame(() => board.fit());
    return () => {
      cancelAnimationFrame(fitFrame);
      if (frame) cancelAnimationFrame(frame);
      if (dragRef.current) {
        dragRef.current = null;
        callbacks.current.onInteractionActiveChange?.(false);
      }
      boardRef.current = null;
      host.replaceChildren();
    };
  }, [mode, language]);

  // A change from elsewhere (a field, undo, an assistant): the board draws the vase as it is now.
  useEffect(() => {
    if (dragRef.current) return;
    drawingRef.current = vaseDrawingSettings(shape);
    boardRef.current?.render();
  }, [shape]);

  return <div ref={hostRef} className="vase-drawing-host" inert={disabled ? true : undefined} />;
}
