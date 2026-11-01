"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  fitCameraDepthRange,
  frameBounds,
  resetCamera,
  selectionBounds,
  setCameraToViewFace,
  stepCameraTurn,
  syncViewCube,
  toggleCameraProjection,
  updateCameraViewport,
  zoomCameraBy,
  type CameraRig,
} from "@/components/workplane/cameraRig";
import { saveViewInSlot, showViewInSlot } from "@/components/workplane/cameraViews";
import { disposeCutPreviewResources, renderFrame } from "@/components/workplane/renderFrame";
import { SecondViewCameraBar } from "@/components/workplane/SecondViewCameraBar";
import { ViewCube } from "@/components/workplane/ViewCube";
import { RENDER_LAYER_HELPERS, type ThreeState } from "@/components/workplane/ViewportOverlays";
import { leftButtonCameraAction } from "@/lib/cameraMouseButtons";
import { t } from "@/lib/i18n";
import { placementOf, readSecondViewPlacement, secondViewSupported, secondViewWindowFeatures, writeSecondViewPlacement } from "@/lib/secondViewPlacement";
import { orbitViewBy, panViewBy, viewArrowStep } from "@/lib/viewArrowKeys";
import { savedViewForKey } from "@/lib/designView";
import { viewFaceForKey } from "@/lib/viewCubeDrag";
import { ZOOM_STEP_IN, ZOOM_STEP_OUT } from "@/lib/workplaneSettings";
import { timedCameraDamping } from "@/lib/cameraInertia";

/**
 * A second view of the design in a window of its own: the same scene, seen through a camera of
 * its own. The window holds no copy of the design; it draws the 3D view's scene with its own
 * renderer, so whatever changes there shows here on the next frame. In the window the mouse and
 * the view keys turn its camera only; the design is edited in the main window.
 */

const WINDOW_NAME = "layerling-second-view";
/** The window's own page (public/view.html), so its address bar names it instead of showing about:blank. */
const VIEW_PAGE = "/view.html";

/** The OrbitControls settings the second view takes over from the 3D view's camera. */
const SHARED_CONTROL_SETTINGS = [
  "enableDamping",
  "rotateSpeed",
  "zoomSpeed",
  "panSpeed",
  "screenSpacePanning",
  "zoomToCursor",
  "minDistance",
  "maxDistance",
  "minPolarAngle",
  "maxPolarAngle",
  "minZoom",
  "maxZoom",
] as const;

function localStorageOrNull() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Opens the window where it was last; called straight from the click, or the browser blocks it as a popup. */
export function openSecondViewWindow(): Window | null {
  // Opened without an address first: a window kept from before (the editor was reloaded) already
  // on its page is taken as it is, where opening the page again would reload it under the view.
  // A new one, still empty, goes to the page.
  const popup = window.open("", WINDOW_NAME, secondViewWindowFeatures(readSecondViewPlacement(localStorageOrNull())));
  try {
    if (popup && popup.location.pathname !== VIEW_PAGE) popup.location.replace(VIEW_PAGE);
  } catch {
    // The window went to another site, whose address cannot be read: send it back by name.
    window.open(VIEW_PAGE, WINDOW_NAME);
  }
  return popup;
}

/** Whether the window shows its own page, loaded far enough to be filled. */
function viewPageReady(popup: Window) {
  try {
    return popup.location.pathname === VIEW_PAGE && popup.document.readyState !== "loading";
  } catch {
    return false;
  }
}

/** Whether to offer the second view at all: not on a phone or a tablet. False until mounted, as the served page. */
export function useSecondViewSupported() {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(pointer: coarse)");
    // Chrome and Edge say outright whether they run on a phone or a tablet; the others are judged by their name.
    const userAgentData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
    const apply = () => setSupported(secondViewSupported({
      coarsePointer: media.matches,
      platform: navigator.platform ?? "",
      maxTouchPoints: navigator.maxTouchPoints ?? 0,
      userAgent: navigator.userAgent ?? "",
      mobile: userAgentData?.mobile,
    }));
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return supported;
}

type SecondViewWindowProps = {
  popup: Window;
  /** The 3D view whose scene the window draws. */
  threeRef: RefObject<ThreeState | null>;
  /** The design, whose four saved views (7, 8, 9, 0) this window shares with the 3D view. */
  projectId: string | null | undefined;
  /** The main window's selection, which F frames here too. */
  getSelectedIds: () => readonly string[];
  /** The window was closed by the user, or went away with a reload. */
  onClosed: () => void;
};

export function SecondViewWindow({ popup, threeRef, projectId, getSelectedIds, onClosed }: SecondViewWindowProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cubeRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<CameraRig | null>(null);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const getSelectedIdsRef = useRef(getSelectedIds);
  getSelectedIdsRef.current = getSelectedIds;
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;
  // A message of this window's own (a view saved, an empty key): the editor's may be hidden behind it.
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef(0);
  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2500);
  }, []);
  useEffect(() => () => window.clearTimeout(noticeTimerRef.current), []);
  const getRig = useCallback(() => rigRef.current, []);
  const closeTimerRef = useRef(0);
  const [orthographic, setOrthographic] = useState(false);
  // Shown or hidden in each window on its own: the plate is the 3D view's, so while this view draws
  // it takes this window's choice, and the 3D view's own after.
  const [workplaneHidden, setWorkplaneHidden] = useState(false);
  const workplaneHiddenRef = useRef(workplaneHidden);
  workplaneHiddenRef.current = workplaneHidden;

  /** Moves this window's camera, then turns the cube along and asks for a frame. */
  const moveCamera = useCallback((move: (rig: CameraRig) => void) => {
    const rig = rigRef.current;
    if (!rig) return;
    move(rig);
    setOrthographic(rig.camera instanceof THREE.OrthographicCamera);
    syncViewCube(rig, cubeRef.current);
    rig.needsRender = true;
  }, []);

  /** Frames the main window's selection; false when nothing is selected there. */
  const focusSelection = useCallback((rig: CameraRig) => {
    const state = threeRef.current;
    const bounds = state ? selectionBounds(state, getSelectedIdsRef.current()) : null;
    if (bounds) frameBounds(rig, bounds);
    return Boolean(bounds);
  }, [threeRef]);

  const toggleWorkplane = useCallback(() => {
    setWorkplaneHidden((hidden) => !hidden);
    if (rigRef.current) rigRef.current.needsRender = true;
  }, []);

  // The window's page: the editor's styles and theme, and a place for the view.
  useEffect(() => {
    // React's development mode takes an effect down and sets it up again at once: the window stays.
    window.clearTimeout(closeTimerRef.current);
    let takeDown = () => {};
    const setUp = () => {
      const doc = popup.document;
      // The page's own text goes, and so does the view of a window kept from before (the editor was reloaded).
      doc.head.replaceChildren();
      doc.body.replaceChildren();
      // Only now: the title is an element in the head, and clearing the head took it away.
      doc.title = t("secondView.title");
      const copyStyle = (node: Node) => {
        if (!(node instanceof HTMLStyleElement) && !(node instanceof HTMLLinkElement && node.rel === "stylesheet")) return;
        const copy = node.cloneNode(true) as HTMLElement;
        // Copied with the full address, as the editor's page resolved it.
        if (node instanceof HTMLLinkElement) copy.setAttribute("href", node.href);
        doc.head.appendChild(copy);
      };
      document.head.childNodes.forEach(copyStyle);
      const copyTheme = () => {
        const source = document.documentElement;
        const target = doc.documentElement;
        // An attribute taken away counts too: Medium is the toolbar size without one.
        for (const { name } of Array.from(target.attributes)) {
          if (!source.hasAttribute(name)) target.removeAttribute(name);
        }
        for (const { name, value } of Array.from(source.attributes)) {
          target.setAttribute(name, value);
        }
      };
      copyTheme();
      // Styles that arrive later (a part of the page loaded on demand) and a theme switch follow along.
      const styleObserver = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach(copyStyle)));
      styleObserver.observe(document.head, { childList: true });
      const themeObserver = new MutationObserver(copyTheme);
      themeObserver.observe(document.documentElement, { attributes: true });

      const root = doc.createElement("div");
      root.className = "second-view-root";
      doc.body.appendChild(root);
      setContainer(root);

      // Its place and size are kept for next time: when it is resized, and before it closes.
      const remember = () => {
        if (!popup.closed) writeSecondViewPlacement(localStorageOrNull(), placementOf(popup));
      };
      const closed = () => {
        remember();
        onClosedRef.current();
      };
      const closeWithEditor = () => {
        remember();
        popup.close();
      };
      popup.addEventListener("pagehide", closed);
      popup.addEventListener("resize", remember);
      window.addEventListener("pagehide", closeWithEditor);
      takeDown = () => {
        styleObserver.disconnect();
        themeObserver.disconnect();
        popup.removeEventListener("pagehide", closed);
        popup.removeEventListener("resize", remember);
        window.removeEventListener("pagehide", closeWithEditor);
      };
    };
    // A new window is still on its way to its page; the view is built once that has loaded.
    const waitTimer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(waitTimer);
        onClosedRef.current();
      } else if (viewPageReady(popup)) {
        window.clearInterval(waitTimer);
        setUp();
      }
    }, 30);
    return () => {
      window.clearInterval(waitTimer);
      takeDown();
      setContainer(null);
      closeTimerRef.current = window.setTimeout(() => {
        if (!popup.closed) writeSecondViewPlacement(localStorageOrNull(), placementOf(popup));
        popup.close();
      });
    };
  }, [popup]);

  // The camera, its controls and the frame loop, once the view's place is on the page.
  useEffect(() => {
    const host = hostRef.current;
    const main = threeRef.current;
    if (!container || !host || !main) return;

    const canvas = popup.document.createElement("canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false, stencil: true });
    renderer.localClippingEnabled = true;
    renderer.outputColorSpace = main.renderer.outputColorSpace;
    renderer.shadowMap.type = main.renderer.shadowMap.type;
    host.appendChild(canvas);

    // It opens looking where the 3D view looks.
    const camera = main.camera.clone();
    const controls = new OrbitControls(camera, canvas);
    const settings = controls as unknown as Record<string, unknown>;
    SHARED_CONTROL_SETTINGS.forEach((name) => {
      settings[name] = main.controls[name];
    });
    controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    controls.target.copy(main.controls.target);
    controls.update();
    const rig: CameraRig = { renderer, camera, controls, needsRender: true, focusReach: null };
    rigRef.current = rig;
    setOrthographic(camera instanceof THREE.OrthographicCamera);

    const requestRender = () => {
      rig.needsRender = true;
    };
    // The same buttons as in the 3D view: right turns, middle pans, Ctrl or Cmd with the left button moves (#654).
    const configureMouseButtons = (event: PointerEvent) => {
      controls.mouseButtons.LEFT = leftButtonCameraAction(event);
    };
    const resetMouseButtons = () => {
      controls.mouseButtons.LEFT = null;
    };
    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height);
      updateCameraViewport(rig.camera, width, height);
      rig.needsRender = true;
    };
    // The view keys of the 3D view; there is nothing to move here, so the arrows always turn the view.
    const handleKeyDown = (event: KeyboardEvent) => {
      const arrow = viewArrowStep(event);
      if (arrow) {
        event.preventDefault();
        moveCamera((view) => {
          if (arrow.pan) panViewBy(view, ...arrow.pan);
          else orbitViewBy(view, ...arrow.orbit);
        });
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // 7, 8, 9 and 0 bring back the design's saved views, Shift with them saves this window's view there.
      const savedView = savedViewForKey(event.key, event.code, event.shiftKey);
      if (savedView) {
        event.preventDefault();
        if (savedView.save) showNotice(saveViewInSlot(projectIdRef.current, rig, savedView.slot));
        else moveCamera((view) => {
          const empty = showViewInSlot(projectIdRef.current, view, savedView.slot);
          if (empty) showNotice(empty);
        });
        return;
      }
      const face = viewFaceForKey(event.key, event.code, event.shiftKey);
      const key = event.key.toLowerCase();
      let move: ((view: CameraRig) => void) | null = null;
      if (face) {
        move = (view) => {
          setCameraToViewFace(view, face);
          // With Shift, frame the selection from the new side, as in the 3D view.
          if (event.shiftKey) focusSelection(view);
        };
      } else if (key === "f" && event.shiftKey) move = focusSelection;
      else if (key === "f") move = (view) => {
        if (!focusSelection(view)) resetCamera(view);
      };
      else if (event.key === "Home") move = resetCamera;
      else if (key === "o") move = toggleCameraProjection;
      else if (event.key === "+" || event.key === "=") move = (view) => zoomCameraBy(view, ZOOM_STEP_IN);
      else if (event.key === "-" || event.key === "_") move = (view) => zoomCameraBy(view, ZOOM_STEP_OUT);
      if (!move) return;
      event.preventDefault();
      moveCamera(move);
    };

    controls.addEventListener("change", requestRender);
    // Any camera input (drag, wheel, touch) takes over from a view cube turn that is still running.
    const cancelCameraTurn = () => { rig.cameraTurn = null; };
    controls.addEventListener("start", cancelCameraTurn);
    canvas.addEventListener("pointerdown", configureMouseButtons, { capture: true });
    canvas.addEventListener("pointerup", resetMouseButtons);
    canvas.addEventListener("pointercancel", resetMouseButtons);
    canvas.addEventListener("contextmenu", preventContextMenu);
    // A window just opened may not have its size yet: the view follows its box, not the resize event.
    // The window's own observer, as the box is on its page.
    const resizeObserver = new (popup as Window & typeof globalThis).ResizeObserver(resize);
    resizeObserver.observe(host);
    popup.addEventListener("keydown", handleKeyDown);
    resize();

    // A frame is drawn when this camera moved, or when the 3D view drew one: that is when the scene changed.
    let lastMainFrame = -1;
    let frameId = 0;
    let lastFrameAt = performance.now();
    const animate = () => {
      frameId = popup.requestAnimationFrame(animate);
      const state = threeRef.current;
      if (!state) return;
      const now = performance.now();
      const turning = stepCameraTurn(rig, now);
      controls.dampingFactor = timedCameraDamping(now - lastFrameAt);
      lastFrameAt = now;
      const moved = controls.update();
      const mainFrame = state.renderer.info.render.frame;
      if (!turning && !moved && !rig.needsRender && mainFrame === lastMainFrame) return;
      lastMainFrame = mainFrame;
      rig.needsRender = false;
      renderer.shadowMap.enabled = state.renderer.shadowMap.enabled;
      if (renderer.getPixelRatio() !== state.renderer.getPixelRatio()) renderer.setPixelRatio(state.renderer.getPixelRatio());
      // The handles and guides stand where the 3D view's camera needs them; this view shows the design.
      rig.camera.layers.mask = state.camera.layers.mask & ~(1 << RENDER_LAYER_HELPERS);
      fitCameraDepthRange(rig.camera, controls.target);
      rig.camera.updateMatrixWorld();
      syncViewCube(rig, cubeRef.current);
      const plateVisible = state.workplaneLayer.visible;
      state.workplaneLayer.visible = !workplaneHiddenRef.current;
      try {
        renderFrame({ renderer, scene: state.scene, camera: rig.camera, shapeRecords: state.shapeRecords, sectionPlane: state.sectionPlane });
      } finally {
        state.workplaneLayer.visible = plateVisible;
      }
    };
    frameId = popup.requestAnimationFrame(animate);

    return () => {
      popup.cancelAnimationFrame(frameId);
      controls.removeEventListener("change", requestRender);
      controls.removeEventListener("start", cancelCameraTurn);
      canvas.removeEventListener("pointerdown", configureMouseButtons, { capture: true });
      canvas.removeEventListener("pointerup", resetMouseButtons);
      canvas.removeEventListener("pointercancel", resetMouseButtons);
      canvas.removeEventListener("contextmenu", preventContextMenu);
      resizeObserver.disconnect();
      popup.removeEventListener("keydown", handleKeyDown);
      controls.dispose();
      disposeCutPreviewResources(renderer);
      renderer.dispose();
      canvas.remove();
      rigRef.current = null;
    };
  }, [container, focusSelection, moveCamera, popup, showNotice, threeRef]);

  if (!container) return null;
  return createPortal(
    <main className="second-view-stage">
      <div className="second-view-canvas" ref={hostRef} />
      <ViewCube getRig={getRig} cubeRef={cubeRef} />
      {notice ? <p className="editor-status second-view-notice" role="status">{notice}</p> : null}
      <SecondViewCameraBar
        orthographic={orthographic}
        workplaneHidden={workplaneHidden}
        onHome={() => moveCamera(resetCamera)}
        // As F does: with nothing selected the whole scene (#1082).
        onFocusSelection={() => moveCamera((view) => {
          if (!focusSelection(view)) resetCamera(view);
        })}
        onZoomIn={() => moveCamera((rig) => zoomCameraBy(rig, ZOOM_STEP_IN))}
        onZoomOut={() => moveCamera((rig) => zoomCameraBy(rig, ZOOM_STEP_OUT))}
        onToggleProjection={() => moveCamera(toggleCameraProjection)}
        onToggleWorkplane={toggleWorkplane}
      />
    </main>,
    container,
  );
}
