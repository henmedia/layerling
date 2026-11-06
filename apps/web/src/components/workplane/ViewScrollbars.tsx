"use client";

import { useEffect, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import type * as THREE from "three";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { pivotBoxCorners, scrollAxisMetrics, scrollDistance, scrollViewAlong, viewScrollFrame, type ScrollAxisMetrics } from "@/lib/viewScroll";

/**
 * Scrollbars along the right and bottom edge of the 3D view (Discussion #1241), switched in the view bar. Dragging
 * a thumb slides the view smoothly, the arrows at the ends step it a little (held, they keep going), a click on the
 * track pages it. They only slide - nothing turns - and they work while a part is selected, where the arrow keys move
 * the part. What they scroll through and how is in `lib/viewScroll.ts`.
 */

type Axis = "x" | "y";

/** An arrow's step, as a part of what the view shows: small, for fine work close up. */
const ARROW_STEP = 0.02;
/** A click on the track pages by most of the view, as a scrollbar does. */
const PAGE_STEP = 0.8;
/** A held arrow waits this long, then repeats this often. */
const REPEAT_DELAY_MS = 350;
const REPEAT_EVERY_MS = 30;

type Drag = { axis: Axis; pointerId: number; startPx: number; trackPx: number; metrics: ScrollAxisMetrics; window: number; moved: number; direction: THREE.Vector3 };

export function ViewScrollbars({ threeRef }: { threeRef: MutableRefObject<ThreeState | null> }) {
  useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const thumbX = useRef<HTMLDivElement>(null);
  const thumbY = useRef<HTMLDivElement>(null);
  const trackX = useRef<HTMLDivElement>(null);
  const trackY = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const repeat = useRef<{ timer: number | null; interval: number | null }>({ timer: null, interval: null });

  /** The view as it is now: its screen axes, what it shows, and each bar's reading. */
  const read = () => {
    const state = threeRef.current;
    if (!state?.pivotLimits) return null;
    const canvas = state.renderer.domElement;
    const aspect = canvas.clientWidth > 0 && canvas.clientHeight > 0 ? canvas.clientWidth / canvas.clientHeight : 1;
    const frame = viewScrollFrame(state, aspect);
    const corners = pivotBoxCorners(state.pivotLimits);
    const pivot = state.controls.target;
    return {
      state,
      frame,
      x: scrollAxisMetrics(corners, frame.right, pivot, frame.width),
      // Down the screen is up the bar: the track's top is the top of the world as seen.
      y: scrollAxisMetrics(corners, frame.up.clone().negate(), pivot, frame.height),
    };
  };

  // The properties panel lies over the right of the view: a bar whose strip it covers ends at its left edge, and reaches
  // the edge when it is closed, minimised or moved out of the way. Measured when the view, the panel or its place
  // change, not every frame (that laid out the page 60 times a second while nothing moved).
  useEffect(() => {
    const box = root.current;
    const stage = box?.parentElement;
    if (!box || !stage || typeof ResizeObserver === "undefined" || typeof MutationObserver === "undefined") return;
    let last = "";
    const measure = () => {
      const panel = stage.querySelector<HTMLElement>(":scope > .shape-inspector");
      const stageRect = stage.getBoundingClientRect();
      const panelRect = panel?.getBoundingClientRect();
      const shown = panelRect && panelRect.width > 0 ? panelRect : undefined;
      // Minimised, the panel is only its header: the upright bar starts below it, the bottom one passes under it.
      const minimized = panel?.classList.contains("minimized") ?? false;
      const clear = shown ? Math.max(0, Math.round(stageRect.right - shown.left)) : 0;
      // A bar's strip along its edge: its own width and the gap around it.
      const strip = parseFloat(getComputedStyle(box).getPropertyValue("--view-scrollbar-size")) + 8;
      const inYStrip = !!shown && shown.right > stageRect.right - strip;
      const yRight = inYStrip && !minimized ? clear : 0;
      const yTop = inYStrip && minimized ? Math.round(shown.bottom - stageRect.top) + 4 : 4;
      const xRight = shown && !minimized && shown.bottom > stageRect.bottom - strip ? clear : 0;
      const next = `${yRight} ${yTop} ${xRight}`;
      if (next === last) return;
      last = next;
      box.style.setProperty("--view-scrollbar-right", `${yRight}px`);
      // A view cube in a right corner keeps beside the upright bar (viewScrollbars.css).
      stage.style.setProperty("--view-scrollbar-right", `${yRight}px`);
      box.style.setProperty("--view-scrollbar-top", `${yTop}px`);
      box.style.setProperty("--view-scrollbar-x-right", `${xRight}px`);
    };
    const sizes = new ResizeObserver(measure);
    // A panel dragged away from the edge moves by its style, minimised by its class: neither changes a size.
    const panelPlace = new MutationObserver(measure);
    let watched: HTMLElement | null = null;
    const watchPanel = () => {
      const panel = stage.querySelector<HTMLElement>(":scope > .shape-inspector");
      if (panel !== watched) {
        if (watched) sizes.unobserve(watched);
        panelPlace.disconnect();
        watched = panel;
        if (panel) {
          sizes.observe(panel);
          panelPlace.observe(panel, { attributes: true, attributeFilter: ["style", "class"] });
        }
      }
      measure();
    };
    const panelComesAndGoes = new MutationObserver(watchPanel);
    sizes.observe(stage);
    panelComesAndGoes.observe(stage, { childList: true });
    watchPanel();
    return () => {
      stage.style.removeProperty("--view-scrollbar-right");
      sizes.disconnect();
      panelPlace.disconnect();
      panelComesAndGoes.disconnect();
    };
  }, []);

  // The thumbs follow the view every frame it changes, written straight to their style (no render per frame). A frame in
  // which camera, pivot, zoom, limits and canvas are as they were is skipped before anything is worked out or allocated.
  useEffect(() => {
    let frameId = 0;
    let last = "";
    const seen = new Float64Array(22).fill(Number.NaN);
    let seenLimits: ThreeState["pivotLimits"] | null = null;
    let changed = false;
    const put = (index: number, value: number) => {
      if (seen[index] === value) return;
      seen[index] = value;
      changed = true;
    };
    const viewChanged = (state: ThreeState) => {
      changed = state.pivotLimits !== seenLimits;
      seenLimits = state.pivotLimits;
      const { camera, controls } = state;
      const canvas = state.renderer.domElement;
      put(0, camera.position.x);
      put(1, camera.position.y);
      put(2, camera.position.z);
      put(3, camera.quaternion.x);
      put(4, camera.quaternion.y);
      put(5, camera.quaternion.z);
      put(6, camera.quaternion.w);
      put(7, camera.zoom);
      put(8, "fov" in camera ? camera.fov : 0);
      put(9, "top" in camera ? camera.top : 0);
      put(10, "bottom" in camera ? camera.bottom : 0);
      put(11, controls.target.x);
      put(12, controls.target.y);
      put(13, controls.target.z);
      put(14, canvas.clientWidth);
      put(15, canvas.clientHeight);
      put(16, state.pivotLimits?.halfWidth ?? 0);
      put(17, state.pivotLimits?.halfDepth ?? 0);
      put(18, state.pivotLimits?.minY ?? 0);
      put(19, state.pivotLimits?.maxY ?? 0);
      return changed;
    };
    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const state = threeRef.current;
      if (!state?.pivotLimits || !viewChanged(state)) return;
      const now = read();
      if (!now) return;
      const key = `${now.x.start.toFixed(4)},${now.x.size.toFixed(4)},${now.y.start.toFixed(4)},${now.y.size.toFixed(4)}`;
      if (key === last) return;
      last = key;
      for (const [thumb, metrics] of [[thumbX.current, now.x], [thumbY.current, now.y]] as const) {
        if (!thumb) continue;
        thumb.style.setProperty("--scroll-start", String(metrics.start));
        thumb.style.setProperty("--scroll-size", String(metrics.size));
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const stopRepeat = () => {
    if (repeat.current.timer !== null) window.clearTimeout(repeat.current.timer);
    if (repeat.current.interval !== null) window.clearInterval(repeat.current.interval);
    repeat.current = { timer: null, interval: null };
  };
  useEffect(() => stopRepeat, []);

  /** Slides the view along a bar by a part of what it shows: positive goes right, or down. */
  const step = (axis: Axis, fraction: number) => {
    const now = read();
    if (!now) return;
    const direction = axis === "x" ? now.frame.right : now.frame.up.clone().negate();
    const size = axis === "x" ? now.frame.width : now.frame.height;
    now.state.cameraTurn = null;
    scrollViewAlong(now.state, direction, fraction * size);
    now.state.needsRender = true;
  };

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
    const now = read();
    const track = (axis === "x" ? trackX : trackY).current;
    if (!now || !track) return;
    const rect = track.getBoundingClientRect();
    const trackPx = axis === "x" ? rect.width : rect.height;
    const at = ((axis === "x" ? event.clientX - rect.left : event.clientY - rect.top) / Math.max(trackPx, 1));
    const metrics = now[axis];
    const onThumb = at >= metrics.start && at <= metrics.start + metrics.size;
    if (!onThumb) {
      step(axis, at < metrics.start ? -PAGE_STEP : PAGE_STEP);
      return;
    }
    // A drag holds on to the track as it was, so the thumb stays under the pointer while the view moves.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = {
      axis,
      pointerId: event.pointerId,
      startPx: axis === "x" ? event.clientX : event.clientY,
      trackPx,
      metrics,
      window: axis === "x" ? now.frame.width : now.frame.height,
      moved: 0,
      direction: axis === "x" ? now.frame.right.clone() : now.frame.up.clone().negate(),
    };
    track.classList.add("dragging");
  };

  const onTrackMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    const state = threeRef.current;
    if (!current || current.pointerId !== event.pointerId || !state) return;
    const px = (current.axis === "x" ? event.clientX : event.clientY) - current.startPx;
    const wanted = scrollDistance(current.metrics, current.window, px / Math.max(current.trackPx, 1));
    state.cameraTurn = null;
    scrollViewAlong(state, current.direction, wanted - current.moved);
    current.moved = wanted;
    state.needsRender = true;
  };

  const onTrackUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    (event.currentTarget as HTMLElement).classList.remove("dragging");
  };

  // The wheel over a bar scrolls along it, as on a page; it does not zoom there.
  const onWheel = (axis: Axis) => (event: ReactWheelEvent) => {
    event.stopPropagation();
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (delta) step(axis, Math.sign(delta) * ARROW_STEP * 3);
  };

  const bar = (axis: Axis) => {
    const horizontal = axis === "x";
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
          ref={horizontal ? trackX : trackY}
          className="view-scrollbar-track"
          role="scrollbar"
          aria-orientation={horizontal ? "horizontal" : "vertical"}
          aria-label={t(horizontal ? "viewScroll.horizontal" : "viewScroll.vertical")}
          onPointerDown={onTrackDown(axis)}
          onPointerMove={onTrackMove}
          onPointerUp={onTrackUp}
          onPointerCancel={onTrackUp}
        >
          <div ref={horizontal ? thumbX : thumbY} className="view-scrollbar-thumb" />
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
    <div ref={root} className="view-scrollbars">
      {bar("x")}
      {bar("y")}
    </div>
  );
}
