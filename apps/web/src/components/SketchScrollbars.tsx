"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { capturePointer } from "@/lib/pointerCapture";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { scrollDistance, scrollRangeMetrics, wheelScrollFraction, type ScrollAxisMetrics } from "@/lib/viewScroll";

/**
 * The 3D view's scrollbars in the sketch (Discussion #2135): one down the right edge, one along the bottom, for
 * whoever has no middle mouse button to slide the sketch with. They look and answer as in the 3D view
 * (`workplane/ViewScrollbars.tsx`, `app/viewScrollbars.css`): dragging a thumb slides the sketch, an arrow steps it a
 * little and keeps going while held, a click on the track pages it, the wheel over a bar scrolls along it. What they
 * scroll through is the board, the plate grown to hold the sketch, as far as the view's centre may go anyway.
 */

type Axis = "x" | "z";

const ARROW_STEP = 0.02;
const PAGE_STEP = 0.8;
const REPEAT_DELAY_MS = 350;
const REPEAT_EVERY_MS = 30;

type Drag = { axis: Axis; pointerId: number; startPx: number; trackPx: number; metrics: ScrollAxisMetrics; window: number; moved: number };

export type SketchScrollbarsProps = {
  /** The middle of the view, in the sketch's millimetres. */
  pan: { x: number; z: number };
  /** The board the view's middle may move on, centred on the origin. */
  board: { width: number; depth: number };
  /** How much of the sketch the view shows across and down. */
  shown: { width: number; depth: number };
  /** The view's size on the screen, for the wheel. */
  viewPx: { width: number; height: number };
  /** Slides the view by this much; the workspace keeps it on the board. */
  onSlide: (dx: number, dz: number) => void;
};

export function SketchScrollbars({ pan, board, shown, viewPx, onSlide }: SketchScrollbarsProps) {
  useLanguage();
  const trackX = useRef<HTMLDivElement>(null);
  const trackZ = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const repeat = useRef<{ timer: number | null; interval: number | null }>({ timer: null, interval: null });
  // A held arrow repeats from a timer: it reads the view as it is then, not as it was at the press.
  const latest = useRef({ shown, onSlide });
  latest.current = { shown, onSlide };

  const metrics = {
    x: scrollRangeMetrics(-board.width / 2, board.width / 2, pan.x, shown.width),
    z: scrollRangeMetrics(-board.depth / 2, board.depth / 2, pan.z, shown.depth),
  };

  const stopRepeat = () => {
    if (repeat.current.timer !== null) window.clearTimeout(repeat.current.timer);
    if (repeat.current.interval !== null) window.clearInterval(repeat.current.interval);
    repeat.current = { timer: null, interval: null };
  };
  useEffect(() => stopRepeat, []);

  const slide = (axis: Axis, distance: number) => {
    if (!Number.isFinite(distance) || distance === 0) return;
    if (axis === "x") latest.current.onSlide(distance, 0);
    else latest.current.onSlide(0, distance);
  };

  /** Slides the view along a bar by a part of what it shows: positive goes right, or down. */
  const step = (axis: Axis, fraction: number) => slide(axis, fraction * (axis === "x" ? latest.current.shown.width : latest.current.shown.depth));

  const startArrow = (axis: Axis, sign: 1 | -1) => (event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    stopRepeat();
    step(axis, sign * ARROW_STEP);
    repeat.current.timer = window.setTimeout(() => {
      repeat.current.interval = window.setInterval(() => step(axis, sign * ARROW_STEP), REPEAT_EVERY_MS);
    }, REPEAT_DELAY_MS);
  };

  const onTrackDown = (axis: Axis) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const track = (axis === "x" ? trackX : trackZ).current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const trackPx = axis === "x" ? rect.width : rect.height;
    const at = (axis === "x" ? event.clientX - rect.left : event.clientY - rect.top) / Math.max(trackPx, 1);
    const now = metrics[axis];
    if (at < now.start || at > now.start + now.size) {
      step(axis, at < now.start ? -PAGE_STEP : PAGE_STEP);
      return;
    }
    // A drag holds on to the track as it was, so the thumb stays under the pointer while the view moves.
    capturePointer(event.currentTarget, event.pointerId);
    drag.current = { axis, pointerId: event.pointerId, startPx: axis === "x" ? event.clientX : event.clientY, trackPx, metrics: now, window: axis === "x" ? shown.width : shown.depth, moved: 0 };
    track.classList.add("dragging");
  };

  const onTrackMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const px = (current.axis === "x" ? event.clientX : event.clientY) - current.startPx;
    const wanted = scrollDistance(current.metrics, current.window, px / Math.max(current.trackPx, 1));
    slide(current.axis, wanted - current.moved);
    current.moved = wanted;
  };

  // Also when the bar lost the pointer without a release (the window lost focus, say), so a later move cannot pick the drag up again.
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.classList.remove("dragging");
  };

  // The wheel over a bar scrolls along it as far as it turned, as on a page; it does not zoom there.
  const onWheel = (axis: Axis) => (event: ReactWheelEvent) => {
    event.stopPropagation();
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (delta) step(axis, wheelScrollFraction(delta, event.deltaMode, axis === "x" ? viewPx.width : viewPx.height));
  };

  const bar = (axis: Axis) => {
    const horizontal = axis === "x";
    const now = metrics[axis];
    return (
      <div className={`view-scrollbar view-scrollbar-${horizontal ? "x" : "y"}`} onWheel={onWheel(axis)} onContextMenu={(event) => event.preventDefault()}>
        <button
          type="button"
          className="view-scrollbar-arrow"
          aria-label={t(horizontal ? "viewScroll.left" : "viewScroll.up")}
          title={t(horizontal ? "viewScroll.left" : "viewScroll.up")}
          onPointerDown={startArrow(axis, -1)}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
        >
          {horizontal ? <ChevronLeft aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
        </button>
        <div
          ref={horizontal ? trackX : trackZ}
          className="view-scrollbar-track"
          role="scrollbar"
          aria-orientation={horizontal ? "horizontal" : "vertical"}
          aria-label={t(horizontal ? "viewScroll.horizontal" : "viewScroll.vertical")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((now.start / Math.max(1 - now.size, 1e-9)) * 100)}
          onPointerDown={onTrackDown(axis)}
          onPointerMove={onTrackMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        >
          <div className="view-scrollbar-thumb" style={{ "--scroll-start": now.start, "--scroll-size": now.size } as CSSProperties} />
        </div>
        <button
          type="button"
          className="view-scrollbar-arrow"
          aria-label={t(horizontal ? "viewScroll.right" : "viewScroll.down")}
          title={t(horizontal ? "viewScroll.right" : "viewScroll.down")}
          onPointerDown={startArrow(axis, 1)}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
        >
          {horizontal ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
      </div>
    );
  };

  return (
    <div className="view-scrollbars sketch-scrollbars">
      {bar("x")}
      {bar("z")}
    </div>
  );
}
