"use client";

import { sectionPointFromFrame, sectionPointToFrame, type SectionPlaneSettings } from "@/lib/sectionView";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { cameraButtonsFor, leftButtonCameraAction } from "@/lib/cameraMouseButtons";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { type AppThemePalette, type ResolvedAppTheme } from "@/lib/appTheme";
import type { ModelSplitPlane } from "@/lib/modelSplit";
import { planeCrossingSegments } from "@/lib/splitCutLine";
import { pinchWheelDelta, wheelZoomDelta } from "@/lib/wheelZoom";
import { CAMERA_FOV, CAMERA_MAX_DISTANCE, CAMERA_MIN_DISTANCE, CAMERA_TARGET, updateCameraViewport } from "@/components/workplane/cameraRig";
import { horizontalPlacementWorkplane, placementWorkplaneIsBase, placementWorkplaneLiesOnBase, placementWorkplaneQuaternion, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { printerPresetById } from "@/lib/printBed";
import { DEFAULT_WORKPLANE_WORKSPACE, effectiveViewSettings, viewPixelRatio, orbitControlsZoomSpeed } from "@/lib/workplaneSettings";
import { workplaneGridBandWidths, AXIS_ARROW_COLORS, axisArrowLayout, fillLightPosition, keyLightPosition, sceneLightLevels, shadowBlurRadius, softSceneLightLevels, workplaneGridLayout, workplaneGridLines, workplaneGridPalette, workplaneLabelLayout, workplaneThemePalette, WORKPLANE_LABEL_ASPECT, WORKPLANE_LINE_ELEVATION, type WorkplaneGridLayout } from "@/lib/workplaneGrid";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";
import { pivotKeptAhead, ZOOM_PIVOT_REACH_MM } from "@/lib/zoomPivot";
import { RENDER_LAYER_SHAPES } from "@/components/workplane/viewportPicking";
import { RENDER_LAYER_HELPERS, type ShapeRenderRecord, type ThreeState, setObjectRenderLayer, freezeStaticObjectMatrices, disposeChildren, disposeObject } from "@/components/workplane/ViewportOverlays";
import { RENDER_LAYER_MODIFIERS, RENDER_LAYER_PREVIEWS, clamp, WORKPLANE_LABEL_FONT_STACK } from "./viewportShapeObjects";

export const WORKPLANE_WIDTH = 200;
export const WORKPLANE_DEPTH = 140;
export const DEFAULT_WORKSPACE = DEFAULT_WORKPLANE_WORKSPACE;
/** How many pieces the rim of a round plate is drawn with: smooth at any zoom a plate is looked at. */
const ROUND_PLATE_SEGMENTS = 192;

/**
 * The normal view zooms towards its pivot and stops at the closest distance
 * to it - so with the pivot in the middle of the plate it could not come
 * close to a part at the edge, nor to one behind the pivot, while the flat
 * view, which only enlarges, went anywhere. Before a zoom-in, the pivot moves
 * along the line of sight - forward or back - to the depth of the body under
 * the pointer (the middle of the screen for the buttons), or of the plate
 * when no body is there. The picture stays put, and the zoom can go on right
 * up to what is under the pointer, as close as the flat view enlarges.
 *
 * Where the pivot would lie outside what the camera clamp allows - the plate
 * is a hit for a ray close to the horizon thousands of millimetres out - it
 * stays put: the clamp pulls it back and carries the camera along, and the
 * picture jumps far out (the forum, 14.10.2026).
 */
export function movePivotToDepthUnder(state: ThreeState, ndcX: number, ndcY: number) {
  if (!(state.camera instanceof THREE.PerspectiveCamera)) return;
  state.pointer.set(ndcX, ndcY);
  state.raycaster.setFromCamera(state.pointer, state.camera);
  const layers = state.raycaster.layers.mask;
  state.raycaster.layers.set(RENDER_LAYER_SHAPES);
  const hit = state.raycaster.intersectObjects(state.shapeLayer.children, true).find((entry) => (
    entry.object instanceof THREE.Mesh && entry.object.visible && !(state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001)
  ));
  state.raycaster.layers.mask = layers;
  const point = hit?.point ?? state.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  const forward = state.camera.getWorldDirection(new THREE.Vector3());
  // Nothing to zoom towards under the pointer (the sky, a spot past the plate): the pivot stays ahead of the camera.
  const keepAhead = () => {
    const limits = state.pivotLimits;
    const ahead = pivotKeptAhead(state.camera.position, state.controls.target, forward, ZOOM_PIVOT_REACH_MM, limits ? { halfWidth: limits.halfWidth, halfDepth: limits.halfDepth, minY: limits.minY, maxY: limits.maxY } : null);
    if (ahead) state.controls.target.copy(ahead);
  };
  if (!point) { keepAhead(); return; }
  const depth = point.clone().sub(state.camera.position).dot(forward);
  if (!(depth > 0) || depth > CAMERA_MAX_DISTANCE) { keepAhead(); return; }
  const target = state.camera.position.clone().addScaledVector(forward, depth);
  const limits = state.pivotLimits;
  if (limits && (Math.abs(target.x) > limits.halfWidth || Math.abs(target.z) > limits.halfDepth || target.y < limits.minY || target.y > limits.maxY)) { keepAhead(); return; }
  state.controls.target.copy(target);
}
export const RENDER_LAYER_WORKPLANE = 0;

export type WorkspaceSettings = WorkplaneWorkspaceSettings;

export function createThreeScene(host: HTMLDivElement): ThreeState {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false, stencil: true });
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = DEFAULT_WORKSPACE.showShadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f8fbfc");

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 6000);
  camera.layers.enable(RENDER_LAYER_SHAPES);
  camera.layers.enable(RENDER_LAYER_HELPERS);
  camera.layers.enable(RENDER_LAYER_MODIFIERS);
  camera.layers.enable(RENDER_LAYER_PREVIEWS);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.58;
  controls.zoomSpeed = orbitControlsZoomSpeed(DEFAULT_WORKPLANE_WORKSPACE.zoomSpeed);
  controls.panSpeed = 0.65;
  controls.screenSpacePanning = true;
  controls.zoomToCursor = true;
  controls.mouseButtons = {
    LEFT: null,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  controls.minDistance = CAMERA_MIN_DISTANCE;
  controls.maxDistance = CAMERA_MAX_DISTANCE;
  // Allow the documented OrbitControls pole limits so Top and Bottom views can
  // settle on the vertical axis instead of being held roughly 3.4 degrees off it.
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.target.copy(CAMERA_TARGET);

  const ambient = new THREE.HemisphereLight("#ffffff", "#d6edf5", 2.1);
  scene.add(ambient);

  const key = new THREE.DirectionalLight("#ffffff", 3.1);
  key.position.set(70, 130, 75);
  key.castShadow = true;
  key.shadow.camera.left = -130;
  key.shadow.camera.right = 130;
  key.shadow.camera.top = 130;
  key.shadow.camera.bottom = -130;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00008;
  key.shadow.normalBias = 0.045;
  scene.add(key);

  const fill = new THREE.DirectionalLight("#c8f4ff", 1.2);
  fill.position.set(-95, 45, -60);
  scene.add(fill);

  // The light of "Soft light" (#812): it sits in the camera and shines where the camera looks, so it turns
  // with the view. Off (0) unless the setting is on.
  const head = new THREE.DirectionalLight("#ffffff", 0);
  head.position.set(0, 0, 0);
  head.target.position.set(0, 0, -1);
  camera.add(head);
  camera.add(head.target);
  scene.add(camera);

  const workplaneLayer = new THREE.Group();
  workplaneLayer.name = "Workplane";
  workplaneLayer.layers.set(RENDER_LAYER_WORKPLANE);
  const workplanePreviewLayer = new THREE.Group();
  workplanePreviewLayer.name = "WorkplanePreview";
  workplanePreviewLayer.layers.set(RENDER_LAYER_PREVIEWS);
  workplanePreviewLayer.visible = false;
  const shapeLayer = new THREE.Group();
  shapeLayer.name = "Shapes";
  shapeLayer.layers.set(RENDER_LAYER_SHAPES);
  const helperLayer = new THREE.Group();
  helperLayer.name = "SelectionHelpers";
  helperLayer.layers.set(RENDER_LAYER_HELPERS);
  const splitLayer = new THREE.Group();
  splitLayer.name = "SplitPlane";
  splitLayer.layers.set(RENDER_LAYER_PREVIEWS);
  const transformGuideLayer = new THREE.Group();
  transformGuideLayer.name = "TransformGuides";
  transformGuideLayer.layers.set(RENDER_LAYER_HELPERS);
  const moveDimensionLayer = new THREE.Group();
  moveDimensionLayer.name = "MoveDimensions";
  moveDimensionLayer.layers.set(RENDER_LAYER_HELPERS);
  const originDimensionLayer = new THREE.Group();
  originDimensionLayer.name = "OriginDimensions";
  originDimensionLayer.layers.set(RENDER_LAYER_HELPERS);
  const cornerRulerLayer = new THREE.Group();
  cornerRulerLayer.name = "CornerRuler";
  cornerRulerLayer.layers.set(RENDER_LAYER_HELPERS);
  const modifierLayer = new THREE.Group();
  modifierLayer.name = "EdgeModifier";
  modifierLayer.layers.set(RENDER_LAYER_MODIFIERS);
  scene.add(workplaneLayer, workplanePreviewLayer, shapeLayer, helperLayer, splitLayer, transformGuideLayer, moveDimensionLayer, originDimensionLayer, cornerRulerLayer, modifierLayer);

  const raycaster = new THREE.Raycaster();
  raycaster.params.Line = { threshold: 1.15 };
  (raycaster as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height);
    updateCameraViewport(state.camera, width, height);
    [state.transformGuideLayer, state.moveDimensionLayer, state.originDimensionLayer, state.cornerRulerLayer, state.modifierLayer].forEach((layer) => {
      layer.traverse((child) => {
        const material = (child as THREE.Mesh).material;
        const materials = Array.isArray(material) ? material : material ? [material] : [];
        materials.forEach((candidate) => {
          if (candidate instanceof LineMaterial) {
            candidate.resolution.set(width, height);
          }
        });
      });
    });
    state.needsRender = true;
  };

  const state: ThreeState = {
    renderer,
    scene,
    camera,
    controls,
    workplaneLayer,
    workplanePreviewLayer,
    shapeLayer,
    helperLayer,
    splitLayer,
    transformGuideLayer,
    moveDimensionLayer,
    originDimensionLayer,
    cornerRulerLayer,
    modifierLayer,
    shapeRecords: new Map<string, ShapeRenderRecord>(),
    officialShapeLayerActive: false,
    raycaster,
    pointer,
    dragPlane,
    animationId: 0,
    needsRender: true,
    wasCameraMoving: false,
    lastOverlaySync: 0,
    lastViewCubeSync: 0,
    rotationHandleSides: null,
    sectionPlane: null,
    sectionPlaneHelper: null,
    sectionCapGroup: null,
    lights: { ambient, key, fill, head },
    disposeInteractionListeners: () => {},
    resize,
  };
  const requestRender = () => {
    state.needsRender = true;
  };
  /*
   * Pointers that steer the camera right now. A mouse button let go outside
   * the window never sends its pointerup on a Mac, and the controls went on
   * panning or turning with the next move, the plate "hanging" on the mouse
   * until another middle click (forum). So a move without that button held,
   * or the window losing focus, ends the drag as the missing pointerup would.
   */
  const cameraPointers = new Map<number, PointerEvent>();
  const endCameraDrag = (pointerId: number) => {
    const started = cameraPointers.get(pointerId);
    cameraPointers.delete(pointerId);
    const PointerEventConstructor = renderer.domElement.ownerDocument.defaultView?.PointerEvent;
    if (!started || !PointerEventConstructor) return;
    renderer.domElement.dispatchEvent(new PointerEventConstructor("pointerup", {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: started.pointerType,
      isPrimary: started.isPrimary,
      button: started.button,
      buttons: 0,
      clientX: started.clientX,
      clientY: started.clientY,
    }));
  };
  const releaseLostCameraDrags = (event: PointerEvent) => {
    cameraPointers.forEach((started, pointerId) => {
      // `buttons` bit for the button that started it: left 1, right 2, middle 4.
      const bit = started.button === 1 ? 4 : started.button === 2 ? 2 : 1;
      if (event.pointerId === pointerId && (event.buttons & bit) === 0) endCameraDrag(pointerId);
    });
  };
  const releaseAllCameraDrags = () => {
    [...cameraPointers.keys()].forEach(endCameraDrag);
  };
  const configureLayerlingMouseButtons = (event: PointerEvent) => {
    // A pen (graphics tablet) steers the camera like a mouse: its barrel button is button 2.
    if (event.pointerType !== "touch" && (event.button === 1 || event.button === 2 || (event.button === 0 && (event.ctrlKey || event.metaKey)))) {
      cameraPointers.set(event.pointerId, event);
    }
    // Ctrl or Cmd with the left button moves the view (#654), see leftButtonCameraAction.
    controls.mouseButtons.LEFT = leftButtonCameraAction(event);
    Object.assign(controls.mouseButtons, cameraButtonsFor(state.mouseScheme));
  };
  const resetLayerlingMouseButtons = (event?: PointerEvent) => {
    if (event) cameraPointers.delete(event.pointerId);
    controls.mouseButtons.LEFT = null;
    Object.assign(controls.mouseButtons, cameraButtonsFor(state.mouseScheme));
  };
  /*
   * A left drag on empty space turns the view in the slicer scheme (#1013). The view only knows the press hit nothing
   * after OrbitControls has seen it with the left button switched off, so the turn is started here by hand: on the
   * pointer the controls already follow, or as a fresh press when they were off at the time.
   */
  type OrbitInternals = { _isTrackingPointer: (event: PointerEvent) => boolean; _onPointerDown: (event: PointerEvent) => void; _onMouseDown: (event: PointerEvent) => void };
  const turnWithLeftButton = (event: PointerEvent) => {
    const orbit = controls as unknown as OrbitInternals;
    cameraPointers.set(event.pointerId, event);
    controls.enabled = true;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    if (orbit._isTrackingPointer(event)) orbit._onMouseDown(event);
    else orbit._onPointerDown(event);
  };
  state.turnWithLeftButton = turnWithLeftButton;
  const preventContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };
  /**
   * Safaris eigene Zwei-Finger-Geste abwenden.
   *
   * Seit iOS 10 laesst Safari das Aufziehen der Seite zu, was auch immer im
   * Viewport-Kopf steht - `user-scalable=no` wird dort absichtlich uebergangen.
   * Bleibt nur, `gesturestart` und seine Geschwister abzulehnen; sonst nimmt
   * der Browser das Spreizen fuer sich und bricht die Zeigerereignisse ab,
   * bevor die Kamera sie sieht. Auf allem ausser Safari gibt es diese
   * Ereignisse gar nicht.
   */
  // Safari on a Mac sends no wheel steps for a pinch on the trackpad, only gestures with a scale; each change of it
  // is passed on as the Ctrl wheel step that other browsers send, so the pinch zooms as the wheel does.
  let gestureScale = 1;
  const preventSafariGesture = (event: Event) => {
    if (event.cancelable) event.preventDefault();
    if (event.type === "gesturestart") {
      gestureScale = 1;
      return;
    }
    if (event.type !== "gesturechange") return;
    const gesture = event as Event & { scale?: number; clientX?: number; clientY?: number };
    const ratio = typeof gesture.scale === "number" && gesture.scale > 0 ? gesture.scale / gestureScale : NaN;
    if (typeof gesture.scale === "number" && gesture.scale > 0) gestureScale = gesture.scale;
    const deltaY = pinchWheelDelta(ratio, controls.zoomSpeed);
    if (deltaY === null) return;
    renderer.domElement.dispatchEvent(new WheelEvent("wheel", {
      deltaY,
      deltaMode: 0,
      ctrlKey: true,
      clientX: gesture.clientX ?? renderer.domElement.getBoundingClientRect().left + renderer.domElement.clientWidth / 2,
      clientY: gesture.clientY ?? renderer.domElement.getBoundingClientRect().top + renderer.domElement.clientHeight / 2,
      bubbles: true,
      cancelable: true,
    }));
  };
  const SAFARI_GESTURES = ["gesturestart", "gesturechange", "gestureend"] as const;
  const pullPivotToSurface = (event: WheelEvent) => {
    if (event.deltaY >= 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    movePivotToDepthUnder(state, ((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  };
  // A mouse notch counts as one whatever number the browser sends for it (#331): the step that stands
  // alone is looked at before OrbitControls reads it and dropped again after.
  let lastWheelAt = Number.NEGATIVE_INFINITY;
  let wheelDeltaOverride: number | null = null;
  const zoomControls = controls as unknown as { _getZoomScale: (delta: number) => number };
  const orbitZoomScale = zoomControls._getZoomScale.bind(controls);
  zoomControls._getZoomScale = (delta: number) => orbitZoomScale(wheelDeltaOverride ?? delta);
  const countWheelNotch = (event: WheelEvent) => {
    wheelDeltaOverride = wheelZoomDelta(event, event.timeStamp - lastWheelAt);
    lastWheelAt = event.timeStamp;
  };
  const endWheelNotch = () => {
    wheelDeltaOverride = null;
  };
  controls.addEventListener("change", requestRender);
  // Any camera input (drag, wheel, touch) takes over from a view cube turn that is still running.
  const cancelCameraTurn = () => {
    state.cameraTurn = null;
  };
  controls.addEventListener("start", cancelCameraTurn);
  SAFARI_GESTURES.forEach((name) => renderer.domElement.addEventListener(name, preventSafariGesture));
  renderer.domElement.addEventListener("pointerdown", configureLayerlingMouseButtons, { capture: true });
  renderer.domElement.addEventListener("pointerup", resetLayerlingMouseButtons);
  renderer.domElement.addEventListener("pointercancel", resetLayerlingMouseButtons);
  renderer.domElement.addEventListener("contextmenu", preventContextMenu);
  renderer.domElement.addEventListener("wheel", requestRender, { passive: true });
  renderer.domElement.addEventListener("wheel", pullPivotToSurface, { passive: true, capture: true });
  renderer.domElement.addEventListener("wheel", countWheelNotch, { passive: true, capture: true });
  renderer.domElement.addEventListener("wheel", endWheelNotch, { passive: true });
  renderer.domElement.addEventListener("pointerdown", requestRender);
  const ownWindow = renderer.domElement.ownerDocument.defaultView;
  ownWindow?.addEventListener("pointermove", releaseLostCameraDrags, { capture: true });
  ownWindow?.addEventListener("blur", releaseAllCameraDrags);
  state.disposeInteractionListeners = () => {
    ownWindow?.removeEventListener("pointermove", releaseLostCameraDrags, { capture: true });
    ownWindow?.removeEventListener("blur", releaseAllCameraDrags);
    renderer.domElement.removeEventListener("wheel", pullPivotToSurface, { capture: true });
    renderer.domElement.removeEventListener("wheel", countWheelNotch, { capture: true });
    renderer.domElement.removeEventListener("wheel", endWheelNotch);
    controls.removeEventListener("change", requestRender);
    controls.removeEventListener("start", cancelCameraTurn);
    renderer.domElement.removeEventListener("pointerdown", configureLayerlingMouseButtons, { capture: true });
    renderer.domElement.removeEventListener("pointerup", resetLayerlingMouseButtons);
    renderer.domElement.removeEventListener("pointercancel", resetLayerlingMouseButtons);
    renderer.domElement.removeEventListener("contextmenu", preventContextMenu);
    renderer.domElement.removeEventListener("wheel", requestRender);
    renderer.domElement.removeEventListener("pointerdown", requestRender);
    SAFARI_GESTURES.forEach((name) => renderer.domElement.removeEventListener(name, preventSafariGesture));
  };
  rebuildWorkplane(state, DEFAULT_WORKSPACE);
  return state;
}

export function rebuildWorkplane(
  state: ThreeState | null,
  workspace: WorkspaceSettings,
  theme: ResolvedAppTheme = "light",
  placementWorkplane: PlacementWorkplane = horizontalPlacementWorkplane(),
  projectName = "",
) {
  if (!state) {
    return;
  }

  const palette = workplaneThemePalette(theme, workspace.background, workspace.gridColor, state.palette, workspace.surfaceColor);
  disposeChildren(state.workplaneLayer);
  state.scene.background = new THREE.Color(palette.sceneBackground);
  // Fast mode turns shadows, edge lines and camera inertia off together, and draws fewer pixels.
  const view = effectiveViewSettings(workspace);
  state.renderer.shadowMap.enabled = view.showShadows;
  state.controls.enableDamping = view.cameraInertia;
  const pixelRatio = viewPixelRatio(workspace, window.devicePixelRatio);
  if (state.renderer.getPixelRatio() !== pixelRatio) state.renderer.setPixelRatio(pixelRatio);
  const lightLevels = workspace.softLighting ? softSceneLightLevels(workspace.shadeContrast) : sceneLightLevels(workspace.shadeContrast);
  state.lights.ambient.intensity = lightLevels.ambient;
  state.lights.key.intensity = lightLevels.key;
  state.lights.fill.intensity = lightLevels.fill;
  state.lights.head.intensity = lightLevels.head;
  state.lights.key.shadow.intensity = workspace.shadowStrength / 100;
  state.lights.key.shadow.radius = shadowBlurRadius(workspace.shadowSoftness);
  const keyPosition = keyLightPosition(workspace.lightAzimuth, workspace.lightElevation);
  state.lights.key.position.set(keyPosition.x, keyPosition.y, keyPosition.z);
  // The fill light stays opposite the main light, so the side facing away is not left black.
  const fillPosition = fillLightPosition(workspace.lightAzimuth);
  state.lights.fill.position.set(fillPosition.x, fillPosition.y, fillPosition.z);
  state.needsRender = true;
  state.controls.zoomSpeed = orbitControlsZoomSpeed(workspace.zoomSpeed);
  state.mouseScheme = workspace.mouseScheme;
  Object.assign(state.controls.mouseButtons, cameraButtonsFor(workspace.mouseScheme));

  const activeIsBase = placementWorkplaneIsBase(placementWorkplane);
  // A workplane lying on the plate shares its plane, so the plate drops its grid (#178).
  const plateOutlineOnly = !activeIsBase && placementWorkplaneLiesOnBase(placementWorkplane);
  // A delta printer's plate is round (#1024): the plate itself, not a workplane laid on a face.
  const roundPlate = printerPresetById(workspace.printer)?.round === true && workspace.width === workspace.depth;
  const addPlane = (workplane: PlacementWorkplane, muted: boolean, showMarker: boolean, outlineOnly = false, round = false) => {
    const group = new THREE.Group();
    group.name = muted ? "ReferenceWorkplane" : "ActiveWorkplane";
    // The name and the printer, and the axis arrows, sit in the corners of the square inside a round plate.
    const cornerWidth = round ? workspace.width * Math.SQRT1_2 : workspace.width;
    const cornerDepth = round ? workspace.depth * Math.SQRT1_2 : workspace.depth;
    const surface = new THREE.Mesh(
      round ? new THREE.CircleGeometry(workspace.width / 2, ROUND_PLATE_SEGMENTS) : new THREE.PlaneGeometry(workspace.width, workspace.depth),
      new THREE.MeshStandardMaterial({
        color: muted
          ? theme === "dark" ? "#59646b" : "#b8c0c5"
          : palette.surface.color,
        transparent: true,
        opacity: muted ? (theme === "dark" ? 0.17 : 0.22) : palette.surface.opacity,
        roughness: 0.92,
        side: THREE.DoubleSide,
        // A face-on orthographic view interpolates this large coplanar quad
        // slightly in front of the grid, so part of the grid fails the depth
        // test. Sixteen depth units holds the plate behind those lines.
        polygonOffset: true,
        polygonOffsetFactor: 1,
        // Under a workplane on the same level, the plate stays behind its surface too.
        polygonOffsetUnits: outlineOnly ? 48 : 16,
      }),
    );
    surface.name = muted ? "WorkplaneBaseReference" : "WorkplaneBase";
    // The plate is see-through too, and three.js draws those by the distance of their centres. A body
    // standing behind the plate's centre was then drawn first and the plate laid over it, so it
    // faded to a ghost, depending on the view. The plate always goes first.
    surface.renderOrder = -10;
    surface.rotation.x = -Math.PI / 2;
    surface.receiveShadow = view.showShadows && !muted;
    group.add(surface);

    const lineColor = muted ? theme === "dark" ? "#76828a" : "#99a3aa" : workspace.gridColor;
    const majorLineColor = muted ? "" : workspace.gridMajorColor;
    if (outlineOnly) {
      group.add(createGridLines(
        workspace.width,
        workspace.depth,
        workplaneGridLayout(workspace),
        theme,
        lineColor,
        state.palette,
        true,
        majorLineColor,
        workspace.gridLinesGrow !== false,
        round,
      ));
    } else if (workspace.showGrid) {
      group.add(createGridLines(
        workspace.width,
        workspace.depth,
        workplaneGridLayout(workspace),
        theme,
        lineColor,
        state.palette,
        false,
        majorLineColor,
        workspace.gridLinesGrow !== false,
        round,
      ));
      const labelPalette = workplaneGridPalette(theme, lineColor, state.palette).major;
      // The design's name in the near left corner, so a screenshot of the scene
      // says what it shows - unless it was switched off as a distraction (#192).
      const label = workspace.showPlateLabels === false ? null : createWorkplaneLabel(
        cornerWidth,
        cornerDepth,
        labelPalette.color,
        muted ? labelPalette.opacity * 0.5 : labelPalette.opacity,
        projectName,
        "",
        { outline: muted ? undefined : palette.surface.color },
      );
      if (label) {
        group.add(label);
      }
      // Only on the real plate, and hidden together with the design name.
      const printer = muted || workspace.showPlateLabels === false ? null : printerPresetById(workspace.printer);
      if (printer) {
        const printerLabel = createWorkplaneLabel(
          cornerWidth,
          cornerDepth,
          labelPalette.color,
          labelPalette.opacity,
          `${printer.vendor} ${printer.model}`,
          printer.round ? `Ø ${printer.width} × ${printer.height} mm` : `${printer.width} × ${printer.depth} × ${printer.height} mm`,
          { align: "right", outline: palette.surface.color },
        );
        if (printerLabel) {
          printerLabel.name = "WorkplanePrinterLabel";
          group.add(printerLabel);
        }
      }
    }
    if (!muted && workspace.showAxes) {
      group.add(createAxisArrows(cornerWidth, cornerDepth));
    }
    if (showMarker) {
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: theme === "dark" ? "#d7f4ff" : "#17405c",
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4, 12), markerMaterial);
      stem.position.y = 2.2;
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.35, 3.2, 18), markerMaterial);
      arrow.position.y = 5.7;
      const marker = new THREE.Group();
      marker.name = "WorkplaneNormal";
      marker.add(stem, arrow);
      group.add(marker);
    }
    group.position.set(workplane.origin.x, workplane.origin.y, workplane.origin.z);
    group.quaternion.copy(placementWorkplaneQuaternion(workplane));
    state.workplaneLayer.add(group);
  };

  addPlane(horizontalPlacementWorkplane(), !activeIsBase, false, plateOutlineOnly, roundPlate);
  if (!activeIsBase) {
    addPlane(placementWorkplane, false, true);
  }
  state.workplaneLayer.position.set(0, 0, 0);
  state.workplaneLayer.quaternion.identity();
  setObjectRenderLayer(state.workplaneLayer, RENDER_LAYER_WORKPLANE);
  freezeStaticObjectMatrices(state.workplaneLayer);
}

export function syncWorkplaneHoverPreview(
  state: ThreeState | null,
  workplane: PlacementWorkplane | null,
  workspace: WorkspaceSettings,
  theme: ResolvedAppTheme,
) {
  if (!state) return;
  let layer = state.workplanePreviewLayer;
  if (!layer) {
    layer = new THREE.Group();
    layer.name = "WorkplanePreview";
    layer.layers.set(RENDER_LAYER_PREVIEWS);
    layer.visible = false;
    state.workplanePreviewLayer = layer;
    state.scene.add(layer);
  }
  if (!workplane) {
    layer.visible = false;
    state.needsRender = true;
    return;
  }

  const previewSize = clamp(workspace.gridBlockSize * 6, 18, 42);
  const signature = `${theme}:${workspace.gridBlockSize}:${previewSize}`;
  if (layer.userData.previewSignature !== signature) {
    disposeChildren(layer);
    layer.userData.previewSignature = signature;
    const color = theme === "dark" ? "#69d9ff" : "#079bc6";
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(previewSize, previewSize),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    patch.rotation.x = -Math.PI / 2;
    patch.renderOrder = 950;
    layer.add(patch);

    const outlineMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const half = previewSize / 2;
    const outlinePoints = [
      -half, WORKPLANE_LINE_ELEVATION, -half, half, WORKPLANE_LINE_ELEVATION, -half,
      half, WORKPLANE_LINE_ELEVATION, -half, half, WORKPLANE_LINE_ELEVATION, half,
      half, WORKPLANE_LINE_ELEVATION, half, -half, WORKPLANE_LINE_ELEVATION, half,
      -half, WORKPLANE_LINE_ELEVATION, half, -half, WORKPLANE_LINE_ELEVATION, -half,
    ];
    const outlineGeometry = new THREE.BufferGeometry();
    outlineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(outlinePoints, 3));
    const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
    outline.renderOrder = 951;
    layer.add(outline);

    const markerMaterial = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.95,
    });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.4, 12), markerMaterial);
    stem.position.y = 1.9;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.6, 16), markerMaterial);
    arrow.position.y = 4.7;
    const marker = new THREE.Group();
    marker.add(stem, arrow);
    marker.renderOrder = 952;
    layer.add(marker);
  }

  const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
  layer.position.set(
    workplane.origin.x + normal.x * 0.04,
    workplane.origin.y + normal.y * 0.04,
    workplane.origin.z + normal.z * 0.04,
  );
  layer.quaternion.copy(placementWorkplaneQuaternion(workplane));
  layer.visible = true;
  setObjectRenderLayer(layer, RENDER_LAYER_PREVIEWS);
  layer.updateMatrixWorld(true);
  state.needsRender = true;
}

export const WORKPLANE_LABEL_TEXTURE_WIDTH = 1024;

/**
 * Flat label along the near edge of a workplane: the design's name on the
 * left, the chosen printer on the right.
 *
 * Drawn into a canvas rather than built from glyph geometry: it is a single
 * static string that never needs to be a solid, and a texture costs one quad.
 */
/**
 * Arrows for X, Y and Z at the plate's front left corner, in the frame of the workplane they sit
 * on: X to the right, Y towards the front (as the Y field counts), Z up. They are flat-coloured,
 * never take a click, and the letters stay readable from every side.
 */
export function createAxisArrows(width: number, depth: number) {
  const layout = axisArrowLayout(width, depth);
  const group = new THREE.Group();
  group.name = "WorkplaneAxisArrows";
  group.position.set(layout.x, 0.06, layout.z);
  const headLength = Math.min(layout.length * 0.3, 5);
  const shaftRadius = Math.max(0.3, layout.length * 0.022);
  const headRadius = shaftRadius * 3;
  const axes = [
    { letter: "X", color: AXIS_ARROW_COLORS.x, direction: new THREE.Vector3(1, 0, 0) },
    // Y counts towards the back, right-handed (#182): inside, that is minus z.
    { letter: "Y", color: AXIS_ARROW_COLORS.y, direction: new THREE.Vector3(0, 0, -1) },
    { letter: "Z", color: AXIS_ARROW_COLORS.z, direction: new THREE.Vector3(0, 1, 0) },
  ];
  axes.forEach(({ letter, color, direction }) => {
    const arrow = new THREE.Group();
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const material = new THREE.MeshBasicMaterial({ color });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftRadius, shaftRadius, layout.length - headLength, 14), material);
    shaft.position.y = (layout.length - headLength) / 2;
    const head = new THREE.Mesh(new THREE.ConeGeometry(headRadius, headLength, 20), material);
    head.position.y = layout.length - headLength / 2;
    arrow.add(shaft, head);
    group.add(arrow);

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context) {
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `700 46px ${WORKPLANE_LABEL_FONT_STACK}`;
      context.lineJoin = "round";
      context.lineWidth = 8;
      context.strokeStyle = "rgba(255, 255, 255, 0.92)";
      context.strokeText(letter, 32, 34);
      context.fillStyle = color;
      context.fillText(letter, 32, 34);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      // Hidden behind a body like the arrow itself; it showed through every part in front of it.
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
      const size = Math.max(4, layout.length * 0.3);
      sprite.scale.set(size, size, 1);
      sprite.position.copy(direction.clone().multiplyScalar(layout.length + size * 0.65));
      sprite.renderOrder = 5;
      group.add(sprite);
    }
  });
  // The arrows are a picture, not a body: nothing under the pointer may stop at them.
  group.traverse((object) => {
    object.raycast = () => undefined;
  });
  return group;
}

export function createWorkplaneLabel(
  width: number,
  depth: number,
  color: string,
  opacity: number,
  title: string,
  subtitle = "",
  { align = "left", outline }: { align?: "left" | "right"; outline?: string } = {},
) {
  const layout = workplaneLabelLayout(width, depth);
  if (!title.trim() || layout.width <= 0 || layout.height <= 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = WORKPLANE_LABEL_TEXTURE_WIDTH;
  canvas.height = Math.round(WORKPLANE_LABEL_TEXTURE_WIDTH / WORKPLANE_LABEL_ASPECT);
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  // Set against the left edge and low in the texture, so the caption keeps to
  // the corner of the plane instead of floating in the middle of empty texture.
  context.textAlign = align;
  const textInset = canvas.width * 0.015;
  const textLeft = align === "right" ? canvas.width - textInset : textInset;
  const textWidth = canvas.width - textInset * 2;
  // A rim in the colour of the plate keeps the grid lines away from the
  // letters, so the caption stays readable where it crosses them.
  context.lineJoin = "round";
  const drawText = (text: string, weight: number, size: number, y: number, alpha = 1) => {
    context.font = `${weight} ${size}px ${WORKPLANE_LABEL_FONT_STACK}`;
    // A long name gets smaller rather than squeezed.
    const measured = context.measureText(text).width;
    if (measured > textWidth) {
      size = Math.floor((size * textWidth) / measured);
      context.font = `${weight} ${size}px ${WORKPLANE_LABEL_FONT_STACK}`;
    }
    if (outline) {
      context.strokeStyle = outline;
      context.lineWidth = size * 0.22;
      context.strokeText(text, textLeft, y, textWidth);
    }
    context.globalAlpha = alpha;
    context.fillText(text, textLeft, y, textWidth);
    context.globalAlpha = 1;
  };
  const caption = subtitle.trim();
  // Every name sits on the same baseline near the bottom, so the design name
  // and the printer line up along the front edge.
  context.textBaseline = "alphabetic";
  const baseline = canvas.height * 0.8;
  if (caption) {
    // Two lines: the detail small on top, the name underneath.
    drawText(caption, 500, Math.round(canvas.height * 0.26), canvas.height * 0.3, 0.78);
    drawText(title, 600, Math.round(canvas.height * 0.46), baseline);
  } else {
    drawText(title.trim(), 700, Math.round(canvas.height * 0.68), baseline);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(layout.width, layout.height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      // Sits on the plane it belongs to, but must never hide a model standing
      // on that plane, so it writes no depth and still tests against it.
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  label.name = "WorkplaneLabel";
  // Lies flat, reading along +x with its top towards the far edge, which is
  // upright from the default camera, and tucked into the near left corner.
  label.rotation.x = -Math.PI / 2;
  // The printer sits in the near right corner, mirrored from the design name.
  label.position.set(align === "right" ? -layout.lateralOffset : layout.lateralOffset, WORKPLANE_LINE_ELEVATION + 0.01, layout.depthOffset);
  label.renderOrder = 2;
  return label;
}

export function createGridLines(
  width = WORKPLANE_WIDTH,
  depth = WORKPLANE_DEPTH,
  layout: WorkplaneGridLayout = workplaneGridLayout(DEFAULT_WORKSPACE),
  theme: ResolvedAppTheme = "light",
  gridColor = DEFAULT_WORKSPACE.gridColor,
  paletteName: AppThemePalette = "default",
  outlineOnly = false,
  majorColor = "",
  linesGrow = true,
  round = false,
) {
  const group = new THREE.Group();
  // On a round plate (#1024) each line runs from rim to rim: half its length either side of the middle.
  const radius = width / 2;
  const across = (coordinate: number, half: number) => (round ? Math.sqrt(Math.max(0, radius * radius - coordinate * coordinate)) : half);
  const palette = workplaneThemePalette(theme, DEFAULT_WORKSPACE.background, gridColor, paletteName, undefined, majorColor).grid;
  const minor = new THREE.LineBasicMaterial({ ...palette.minor, transparent: true, depthWrite: false });
  const major = new THREE.LineBasicMaterial({ ...palette.major, transparent: true, depthWrite: false });
  const axis = new THREE.LineBasicMaterial({ ...palette.axis, transparent: true, depthWrite: false });
  const minorPoints: number[] = [];
  const majorPoints: number[] = [];
  const axisPoints: number[] = [];
  const borderPoints: number[] = [];
  const pushLine = (points: number[], from: [number, number, number], to: [number, number, number]) => {
    points.push(...from, ...to);
  };
  const pointsFor = (kind: "axis" | "major" | "minor") => (kind === "axis" ? axisPoints : kind === "major" ? majorPoints : minorPoints);
  // Every fine and darker line also gets a band on the plate, growing as you zoom in (#143).
  const minorBands: Array<[number, number, number, number]> = [];
  const majorBands: Array<[number, number, number, number]> = [];
  const bandsFor = (kind: "axis" | "major" | "minor") => (kind === "major" ? majorBands : kind === "minor" ? minorBands : null);
  for (const { coordinate: centeredX, kind } of outlineOnly ? [] : workplaneGridLines(width, layout)) {
    const half = across(centeredX, depth / 2);
    if (half <= 0) continue;
    pushLine(pointsFor(kind), [centeredX, WORKPLANE_LINE_ELEVATION, -half], [centeredX, WORKPLANE_LINE_ELEVATION, half]);
    bandsFor(kind)?.push([centeredX, -half, centeredX, half]);
  }

  for (const { coordinate: centeredZ, kind } of outlineOnly ? [] : workplaneGridLines(depth, layout)) {
    const half = across(centeredZ, width / 2);
    if (half <= 0) continue;
    pushLine(pointsFor(kind), [-half, WORKPLANE_LINE_ELEVATION, centeredZ], [half, WORKPLANE_LINE_ELEVATION, centeredZ]);
    bandsFor(kind)?.push([-half, centeredZ, half, centeredZ]);
  }

  const border = new THREE.LineBasicMaterial({ ...palette.border, transparent: true, depthWrite: false });
  // The rim of a round plate as many short pieces, at `inset` inside it.
  const rim = (inset: number) => Array.from({ length: ROUND_PLATE_SEGMENTS }, (_, index): [number, number, number, number] => {
    const from = (index / ROUND_PLATE_SEGMENTS) * Math.PI * 2;
    const to = ((index + 1) / ROUND_PLATE_SEGMENTS) * Math.PI * 2;
    const r = radius - inset;
    return [Math.cos(from) * r, Math.sin(from) * r, Math.cos(to) * r, Math.sin(to) * r];
  });
  if (round) {
    for (const [x1, z1, x2, z2] of rim(0)) pushLine(borderPoints, [x1, WORKPLANE_LINE_ELEVATION, z1], [x2, WORKPLANE_LINE_ELEVATION, z2]);
  } else {
    pushLine(borderPoints, [-width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2], [width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2]);
    pushLine(borderPoints, [width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2], [width / 2, WORKPLANE_LINE_ELEVATION, depth / 2]);
    pushLine(borderPoints, [width / 2, WORKPLANE_LINE_ELEVATION, depth / 2], [-width / 2, WORKPLANE_LINE_ELEVATION, depth / 2]);
    pushLine(borderPoints, [-width / 2, WORKPLANE_LINE_ELEVATION, depth / 2], [-width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2]);
  }

  group.add(linesFromPoints(minorPoints, minor));
  group.add(linesFromPoints(majorPoints, major));
  group.add(linesFromPoints(axisPoints, axis));
  group.add(linesFromPoints(borderPoints, border));
  // Switched off (#240), every line stays one pixel wide whatever the zoom, as in the sketch.
  if (!linesGrow) return group;
  const gridBands = workplaneGridBandWidths(layout.step);
  // The darker lines first, so they stay whole where a fine line crosses them.
  if (majorBands.length) group.add(bandsFromSegments(majorBands, gridBands.major, palette.major, { order: 1 }));
  if (minorBands.length) group.add(bandsFromSegments(minorBands, gridBands.minor, palette.minor, { order: 1.5 }));

  // A line is one pixel wide whatever the zoom, so the centre cross and the border also get
  // a narrow band on the plate: stronger, and growing as you zoom in, as in similar tools (#143).
  const axisBand = THREE.MathUtils.clamp(Math.min(width, depth) * 0.0012, 0.15, 1);
  const borderBand = axisBand * 2;
  const axisBands: Array<[number, number, number, number]> = outlineOnly ? [] : [
    [0, -depth / 2, 0, depth / 2],
    [-width / 2, 0, width / 2, 0],
  ];
  group.add(bandsFromSegments(axisBands, axisBand, palette.axis));
  // The border band lies inside the plate, so the plate keeps its size.
  const inset = borderBand / 2;
  group.add(bandsFromSegments(round ? rim(inset) : [
    [-width / 2, -depth / 2 + inset, width / 2, -depth / 2 + inset],
    [-width / 2, depth / 2 - inset, width / 2, depth / 2 - inset],
    [-width / 2 + inset, -depth / 2, -width / 2 + inset, depth / 2],
    [width / 2 - inset, -depth / 2, width / 2 - inset, depth / 2],
  ], borderBand, palette.border));

  return group;
}

/** Flat bands of a width in millimetres along segments (x1, z1, x2, z2) on the plate. */
/**
 * `crossings`: where bands cross, each pixel is drawn once instead of the see-through colour
 * twice, which would leave a darker dot at every crossing of the grid. The band writes depth and
 * the next one at the same depth gives way; `order` decides which kind is drawn first and so
 * wins at a crossing.
 */
export function bandsFromSegments(segments: Array<[number, number, number, number]>, bandWidth: number, look: { color: string; opacity: number }, crossings?: { order: number }) {
  const positions: number[] = [];
  for (const [x1, z1, x2, z2] of segments) {
    const length = Math.hypot(x2 - x1, z2 - z1) || 1;
    const nx = (-(z2 - z1) / length) * (bandWidth / 2);
    const nz = ((x2 - x1) / length) * (bandWidth / 2);
    const y = WORKPLANE_LINE_ELEVATION;
    positions.push(
      x1 - nx, y, z1 - nz, x2 - nx, y, z2 - nz, x2 + nx, y, z2 + nz,
      x1 - nx, y, z1 - nz, x2 + nx, y, z2 + nz, x1 + nx, y, z1 + nz,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const bands = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: look.color,
    opacity: look.opacity,
    transparent: true,
    depthWrite: Boolean(crossings),
    depthFunc: crossings ? THREE.LessDepth : THREE.LessEqualDepth,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }));
  bands.renderOrder = crossings?.order ?? 1;
  return bands;
}

export function linesFromPoints(points: number[], material: THREE.LineBasicMaterial) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 1;
  return lines;
}

export function updateSectionPlaneHelper(
  state: ThreeState,
  settings: SectionPlaneSettings,
  workspace: WorkspaceSettings,
) {
  if (!settings.enabled || !settings.showPlane) {
    if (state.sectionPlaneHelper) {
      state.scene.remove(state.sectionPlaneHelper);
      disposeObject(state.sectionPlaneHelper);
      state.sectionPlaneHelper = null;
      state.needsRender = true;
    }
    return;
  }

  const bounds = new THREE.Box3();
  state.shapeRecords.forEach((record) => {
    if (!record.shape.hidden) bounds.expandByObject(record.object);
  });

  const center = bounds.isEmpty()
    ? new THREE.Vector3(0, 20, 0)
    : bounds.getCenter(new THREE.Vector3());
  const size = bounds.isEmpty()
    ? new THREE.Vector3(workspace.width, 40, workspace.depth)
    : bounds.getSize(new THREE.Vector3());

  const spanX = Math.max(size.x * 1.3, workspace.width * 0.85, 80);
  const spanY = Math.max(size.y * 1.3, 50);
  const spanZ = Math.max(size.z * 1.3, workspace.depth * 0.85, 80);

  let helper = state.sectionPlaneHelper;
  if (!helper) {
    helper = new THREE.Group();
    helper.name = "SectionPlaneHelper";

    const quadGeom = new THREE.PlaneGeometry(1, 1);
    const quadMat = new THREE.MeshBasicMaterial({
      color: "#00b4d8",
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const quad = new THREE.Mesh(quadGeom, quadMat);
    quad.name = "SectionPlaneQuad";
    // Always after the see-through bodies, so its tint does not change with the view.
    quad.renderOrder = 2;

    const borderGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, -0.5, 0),
      new THREE.Vector3(0.5, -0.5, 0),
      new THREE.Vector3(0.5, 0.5, 0),
      new THREE.Vector3(-0.5, 0.5, 0),
    ]);
    const borderMat = new THREE.LineBasicMaterial({
      color: "#00b4d8",
      transparent: true,
      opacity: 0.85,
      linewidth: 1.5,
      depthWrite: false,
    });
    const border = new THREE.LineLoop(borderGeom, borderMat);
    border.renderOrder = 3;
    border.name = "SectionPlaneBorder";

    helper.add(quad);
    helper.add(border);
    setObjectRenderLayer(helper, RENDER_LAYER_HELPERS);
    state.scene.add(helper);
    state.sectionPlaneHelper = helper;
  }

  const quad = helper.getObjectByName("SectionPlaneQuad") as THREE.Mesh;
  const border = helper.getObjectByName("SectionPlaneBorder") as THREE.LineLoop;

  const frame = settings.frame ?? null;
  if (frame) {
    // A turned plane (#644): laid out in the frame as below, then turned into it. The design's box does not
    // say how far it reaches across a turned plane, so the square spans its diagonal.
    const [cx, cy, cz] = sectionPointToFrame([center.x, center.y, center.z], frame);
    const span = Math.max(size.length() * 1.15, 80);
    const local = settings.axis === "x" ? [settings.offset, cy, cz] : settings.axis === "y" ? [cx, settings.offset, cz] : [cx, cy, settings.offset];
    const [px, py, pz] = sectionPointFromFrame(local as [number, number, number], frame);
    helper.position.set(px, py, pz);
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(frame.xAxis.x, frame.xAxis.y, frame.xAxis.z),
      new THREE.Vector3(frame.yAxis.x, frame.yAxis.y, frame.yAxis.z),
      new THREE.Vector3(frame.zAxis.x, frame.zAxis.y, frame.zAxis.z),
    );
    const turn = new THREE.Euler(...(settings.axis === "x" ? [0, Math.PI / 2, 0] : settings.axis === "y" ? [-Math.PI / 2, 0, 0] : [0, 0, 0]) as [number, number, number]);
    helper.quaternion.setFromRotationMatrix(basis).multiply(new THREE.Quaternion().setFromEuler(turn));
    quad.scale.set(span, span, 1);
    border.scale.set(span, span, 1);
  } else if (settings.axis === "x") {
    helper.position.set(settings.offset, center.y, center.z);
    helper.rotation.set(0, Math.PI / 2, 0);
    quad.scale.set(spanZ, spanY, 1);
    border.scale.set(spanZ, spanY, 1);
  } else if (settings.axis === "y") {
    helper.position.set(center.x, settings.offset, center.z);
    helper.rotation.set(-Math.PI / 2, 0, 0);
    quad.scale.set(spanX, spanZ, 1);
    border.scale.set(spanX, spanZ, 1);
  } else {
    helper.position.set(center.x, center.y, settings.offset);
    helper.rotation.set(0, 0, 0);
    quad.scale.set(spanX, spanY, 1);
    border.scale.set(spanX, spanY, 1);
  }

  state.needsRender = true;
}

/**
 * The line where the plane meets the bodies it will split, as pairs of points in world space (#615): the way a slicer
 * draws it, so the cut can be seen on the body and not only guessed from a translucent plane.
 */
export function splitCutOutlinePoints(state: ThreeState, plane: ModelSplitPlane, ids: readonly string[]): number[] {
  if (!ids.length) return [];
  const wanted = new Set(ids);
  const meshes: THREE.Mesh[] = [];
  state.shapeLayer.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible || child.userData.cutPreview) return;
    if (typeof child.userData.shapeId === "string" && wanted.has(child.userData.shapeId)) meshes.push(child);
  });
  return planeCrossingSegments(meshes, plane.origin, plane.normal);
}

export function syncSplitPlane(state: ThreeState | null, plane: ModelSplitPlane | null, handleActive = false, selectedIds: readonly string[] = []) {
  if (!state) return;
  disposeChildren(state.splitLayer);
  if (!plane) {
    state.splitLayer.visible = false;
    state.needsRender = true;
    return;
  }

  const size = Math.max(10, plane.size);
  const root = new THREE.Group();
  root.position.set(...plane.origin);
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...plane.normal).normalize());

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      color: "#d07313",
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    }),
  );
  surface.renderOrder = 900;
  root.add(surface);

  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(surface.geometry),
    new THREE.LineBasicMaterial({ color: "#b35f07", transparent: true, opacity: 0.95, depthTest: false }),
  );
  border.renderOrder = 901;
  root.add(border);

  const crossGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-size / 2, 0, 0), new THREE.Vector3(size / 2, 0, 0),
    new THREE.Vector3(0, -size / 2, 0), new THREE.Vector3(0, size / 2, 0),
  ]);
  const cross = new THREE.LineSegments(
    crossGeometry,
    new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8, depthTest: false }),
  );
  cross.renderOrder = 902;
  root.add(cross);

  const normalLength = Math.max(8, size * 0.18);
  const headLength = Math.max(2.5, normalLength * 0.18);
  const normalGuide = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -normalLength / 2),
    normalLength,
    handleActive ? 0xff9a2e : 0xb35f07,
    headLength,
    Math.max(1.5, normalLength * 0.1),
  );
  [normalGuide.line.material, normalGuide.cone.material].forEach((material) => {
    (Array.isArray(material) ? material : [material]).forEach((entry) => {
      entry.depthTest = false;
    });
  });
  normalGuide.renderOrder = 903;
  root.add(normalGuide);

  // The cone alone is a small target; this invisible ball around it takes the
  // pointer for dragging the plane along its normal.
  const handleHit = new THREE.Mesh(
    new THREE.SphereGeometry(headLength, 12, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  handleHit.position.set(0, 0, normalLength / 2 - headLength / 2);
  handleHit.userData.splitPlaneHandle = true;
  root.add(handleHit);

  root.traverse((child) => child.layers.set(RENDER_LAYER_PREVIEWS));
  state.splitLayer.add(root);

  const outlinePoints = splitCutOutlinePoints(state, plane, selectedIds);
  if (outlinePoints.length) {
    const outlineGeometry = new THREE.BufferGeometry();
    outlineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(outlinePoints, 3));
    const outline = new THREE.LineSegments(outlineGeometry, new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 1, depthTest: false }));
    outline.name = "SplitCutLine";
    outline.renderOrder = 905;
    outline.layers.set(RENDER_LAYER_PREVIEWS);
    state.splitLayer.add(outline);
  }
  state.splitLayer.visible = true;
  state.needsRender = true;
}
