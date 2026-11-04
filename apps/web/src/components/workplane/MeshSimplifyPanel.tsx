"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { leftButtonCameraAction } from "@/lib/cameraMouseButtons";
import { AlertTriangle, Check, LoaderCircle, X } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { numberLocale, t } from "@/lib/i18n";
import { simplifyTrianglePositionsOffThread } from "@/lib/geometryWorker";
import type { SimplifiedMesh } from "@/lib/meshSimplify";
import { displayShapeName } from "@/lib/shapeCatalog";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

type CompareState = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  sides: [THREE.Group, THREE.Group];
  solid: THREE.MeshStandardMaterial;
  wire: THREE.MeshBasicMaterial;
  needsRender: boolean;
};

const MIN_KEEP_PERCENT = 1;
const MAX_KEEP_PERCENT = 99;
const KEEP_EDGES_KEY = "layerling.editor.simplifyKeepEdges";

/** "Keep edges and holes" is on until it is switched off once; then it stays off for the next mesh too. */
function storedKeepEdges() {
  try {
    return window.localStorage.getItem(KEEP_EDGES_KEY) !== "false";
  } catch {
    return true;
  }
}

// Docked, the panel stretches between the toolbar, the inspector and the
// bottom bar; moved, it floats at the size it had and lets the window's lower
// edge clip it like the other tool panels.
const COMPARE_PANEL: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto" },
  area: (panel) => panel.ownerDocument.querySelector<HTMLElement>(".workplane-stage"),
};

function setSideGeometry(side: THREE.Group, positions: ArrayLike<number> | null) {
  side.children.forEach((child) => {
    if (child instanceof THREE.Mesh) child.geometry.dispose();
  });
  const geometry = new THREE.BufferGeometry();
  if (positions) geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  side.children.forEach((child) => {
    if (child instanceof THREE.Mesh) child.geometry = geometry;
  });
  return geometry;
}

/**
 * Fewer triangles for an imported mesh, judged before it is taken.
 *
 * The panel lies over the workplane and shows the mesh as it is next to what
 * the chosen target would leave of it. Both halves are drawn by one renderer
 * with one camera, each into its own half of the canvas - so turning or
 * zooming one turns and zooms the other, with nothing to keep in step. The
 * triangles are shaded flat and can be outlined, because the facets are
 * exactly what there is to compare. Nothing changes until "Simplify".
 *
 * The mouse works as on the workplane: the right button turns, the middle one
 * (or Ctrl/Cmd with the left) moves, the wheel zooms.
 */
export function MeshSimplifyPanel({
  shape,
  onApply,
  onCancel,
}: {
  shape: WorkplaneShape;
  /** Takes the simplified triangle soup, in the frame of the shape's mesh, and whether its edges were kept. */
  onApply: (positions: number[], keepEdges: boolean) => void;
  onCancel: () => void;
}) {
  useLanguage();
  const mesh = shape.importedMesh;
  const positions = mesh?.positions;
  const sourceTriangles = Math.floor((positions?.length ?? 0) / 9);
  const minTarget = Math.max(4, Math.ceil(sourceTriangles * MIN_KEEP_PERCENT / 100));
  const maxTarget = Math.max(minTarget, Math.floor(sourceTriangles * MAX_KEEP_PERCENT / 100));
  const clampTarget = (value: number) => Math.min(maxTarget, Math.max(minTarget, Math.round(value)));

  const stageRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<CompareState | null>(null);
  const movable = useMovablePanel<HTMLDivElement>("layerling.editor.meshComparePosition", COMPARE_PANEL);
  // The size the stylesheet gives the docked panel; a floating panel keeps it.
  const [dockedSize, setDockedSize] = useState<{ width: number; height: number } | null>(null);
  const [target, setTarget] = useState(() => clampTarget(sourceTriangles / 2));
  const [targetDraft, setTargetDraft] = useState<string | null>(null);
  const [percentDraft, setPercentDraft] = useState<string | null>(null);
  const [result, setResult] = useState<SimplifiedMesh | null>(null);
  const [busy, setBusy] = useState(true);
  const [showTriangles, setShowTriangles] = useState(true);
  const [keepEdges, setKeepEdges] = useState(storedKeepEdges);
  // The panel leaves the settings panel free, so the body's name and size stay in view.
  const [rightInset, setRightInset] = useState(16);
  const percent = sourceTriangles > 0 ? target / sourceTriangles * 100 : 0;

  // A mesh that changed under the panel (applied, undone) starts over at half of what it has now.
  useEffect(() => {
    setTarget(clampTarget(sourceTriangles / 2));
    setResult(null);
    // clampTarget only depends on sourceTriangles.
  }, [positions, sourceTriangles]);

  useEffect(() => {
    if (!positions) return;
    let stale = false;
    // A value that is no longer wanted is called off in the worker too (lib/geometryWorker.ts).
    const controller = new AbortController();
    setBusy(true);
    // The slider reports every step of a drag; only where it rests is worked out.
    const timer = window.setTimeout(() => {
      simplifyTrianglePositionsOffThread(positions, target, controller.signal, { keepEdges })
        .then((next) => {
          if (stale) return;
          setResult(next);
          setBusy(false);
        })
        .catch(() => {
          if (stale) return;
          setResult(null);
          setBusy(false);
        });
    }, 180);
    return () => {
      stale = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [keepEdges, positions, target]);

  useEffect(() => {
    const measure = () => {
      const inspector = document.querySelector(".shape-inspector")?.getBoundingClientRect();
      setRightInset(inspector && inspector.width > 0 ? Math.max(16, window.innerWidth - inspector.left + 12) : 16);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const panel = movable.panelRef.current;
    if (!panel || movable.moved) return;
    const observer = new ResizeObserver(() => {
      if (panel.offsetWidth > 0 && panel.offsetHeight > 0) setDockedSize({ width: panel.offsetWidth, height: panel.offsetHeight });
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [movable.moved, movable.panelRef]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // The canvas is made here, not by React: a context given up below cannot be
    // used again, and a remount (React's development double run among them)
    // must not inherit a canvas whose context is lost.
    const canvas = document.createElement("canvas");
    stage.prepend(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setScissorTest(true);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10000);
    // The light travels with the camera, so no side of the body is ever in the dark.
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(0.4, 0.7, 1);
    camera.add(light);
    scene.add(camera, new THREE.AmbientLight(0xffffff, 0.9));

    const solid = new THREE.MeshStandardMaterial({
      flatShading: true,
      side: THREE.DoubleSide,
      roughness: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const wire = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.16 });
    const side = () => {
      const group = new THREE.Group();
      const empty = new THREE.BufferGeometry();
      group.add(new THREE.Mesh(empty, solid), new THREE.Mesh(empty, wire));
      scene.add(group);
      return group;
    };
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = false;
    // The same buttons as on the workplane, so a hand used to the editor needs no second habit here.
    controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    const onPointerDown = (event: PointerEvent) => {
      controls.mouseButtons.LEFT = leftButtonCameraAction(event);
    };
    canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
    const state: CompareState = { renderer, scene, camera, controls, sides: [side(), side()], solid, wire, needsRender: true };
    stateRef.current = state;
    controls.addEventListener("change", () => { state.needsRender = true; });

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 2 || height < 2) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / 2 / height;
      camera.updateProjectionMatrix();
      state.needsRender = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let frame = 0;
    const draw = () => {
      frame = window.requestAnimationFrame(draw);
      if (!state.needsRender) return;
      state.needsRender = false;
      const height = canvas.clientHeight;
      const half = canvas.clientWidth / 2;
      state.sides.forEach((_group, index) => {
        state.sides[0].visible = index === 0;
        state.sides[1].visible = index === 1;
        renderer.setViewport(index * half, 0, half, height);
        renderer.setScissor(index * half, 0, half, height);
        renderer.render(scene, camera);
      });
    };
    draw();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown, { capture: true });
      controls.dispose();
      state.sides.forEach((group) => setSideGeometry(group, null).dispose());
      solid.dispose();
      wire.dispose();
      renderer.dispose();
      // Browsers keep only a handful of WebGL contexts; giving this one up
      // right away means opening the panel again and again never runs out.
      renderer.forceContextLoss();
      canvas.remove();
      stateRef.current = null;
    };
  }, []);

  const scale = useMemo<[number, number, number]>(() => mesh ? [
    shapeWidth(shape) / Math.max(0.001, mesh.baseWidth),
    shape.height / Math.max(0.001, mesh.baseHeight),
    shapeDepth(shape) / Math.max(0.001, mesh.baseDepth),
  ] : [1, 1, 1], [mesh, shape.width, shape.depth, shape.height, shape.size]);

  // The mesh as it is: also what the camera is set up for, once per mesh.
  useEffect(() => {
    const state = stateRef.current;
    if (!state || !positions) return;
    const geometry = setSideGeometry(state.sides[0], positions);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox ?? new THREE.Box3();
    const stretch = new THREE.Vector3(...scale);
    const center = box.getCenter(new THREE.Vector3()).multiply(stretch);
    const radius = Math.max(0.5, box.getSize(new THREE.Vector3()).multiply(stretch).length() / 2);
    state.sides.forEach((group) => {
      group.scale.copy(stretch);
      group.position.copy(center).negate();
    });
    const verticalFov = THREE.MathUtils.degToRad(state.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * state.camera.aspect);
    const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.05;
    state.camera.position.set(0.55, 0.5, 0.67).normalize().multiplyScalar(distance);
    state.camera.near = distance / 200;
    state.camera.far = distance * 20;
    state.camera.updateProjectionMatrix();
    state.controls.target.set(0, 0, 0);
    state.controls.update();
    state.needsRender = true;
  }, [positions, scale]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    setSideGeometry(state.sides[1], result?.positions ?? null);
    state.needsRender = true;
  }, [result]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.solid.color.set(shape.color);
    state.wire.visible = showTriangles;
    state.needsRender = true;
  }, [shape.color, showTriangles]);

  const locale = numberLocale();
  const count = (triangles: number) => triangles.toLocaleString(locale);
  const reduces = Boolean(result && result.triangleCount < sourceTriangles);
  // A cut or merge keeps its parts for "Edit group"; the simplified mesh cannot, and should say so beforehand.
  const dissolvesGroup = Boolean(shape.groupedShapes?.length);
  const commitTargetDraft = () => {
    const parsed = Number(targetDraft);
    if (targetDraft !== null && Number.isFinite(parsed)) setTarget(clampTarget(parsed));
    setTargetDraft(null);
  };
  const commitPercentDraft = () => {
    const parsed = Number(percentDraft?.replace(",", "."));
    if (percentDraft !== null && Number.isFinite(parsed)) setTarget(clampTarget(sourceTriangles * parsed / 100));
    setPercentDraft(null);
  };
  const blurOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    // Escape belongs to the field while one is being typed into.
    event.stopPropagation();
  };

  return (
    <div
      ref={movable.panelRef}
      className={`mesh-compare ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      role="dialog"
      aria-label={t("simplify.title")}
      data-help-panel={t("simplify.title")}
      style={movable.moved ? { ...movable.style, width: dockedSize?.width, height: dockedSize?.height } : { right: rightInset }}
    >
      <div className="mesh-compare-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
        <div>
          <strong>{t("simplify.title")}</strong>
          <span>{displayShapeName(shape)}</span>
        </div>
        <label className="mesh-compare-check" onPointerDown={(event) => event.stopPropagation()}>
          <input type="checkbox" checked={showTriangles} onChange={(event) => setShowTriangles(event.currentTarget.checked)} />
          <span>{t("simplify.showTriangles")}</span>
        </label>
        <GuideHelpLink section="simplifyMesh" />
        <button type="button" className="mesh-compare-close" aria-label={t("common.cancel")} title={t("common.cancel")} onClick={onCancel}>
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>
      <div className="mesh-compare-stage" ref={stageRef}>
        <span className="mesh-compare-label before">{t("simplify.before", { count: count(sourceTriangles) })}</span>
        <span className={`mesh-compare-label after ${busy ? "busy" : ""}`}>
          {result ? t("simplify.after", { count: count(result.triangleCount) }) : t("simplify.working")}
        </span>
        <span className="mesh-compare-divider" aria-hidden="true" />
        <span className="mesh-compare-hint">{t("simplify.hint")}</span>
      </div>
      <div className="mesh-compare-footer">
        {dissolvesGroup ? (
          <p className="mesh-compare-warning" role="status">
            <AlertTriangle size={17} strokeWidth={2.4} aria-hidden="true" />
            <span>{t("simplify.groupNote")}</span>
          </p>
        ) : null}
        <label className="mesh-compare-check keep-edges" title={t("simplify.keepEdgesHint")}>
          <input
            type="checkbox"
            checked={keepEdges}
            onChange={(event) => {
              const next = event.currentTarget.checked;
              setKeepEdges(next);
              try {
                window.localStorage.setItem(KEEP_EDGES_KEY, String(next));
              } catch {
                // A browser that keeps nothing still simplifies; the box starts ticked next time.
              }
            }}
          />
          <span>{t("simplify.keepEdges")}</span>
        </label>
        <label className="mesh-compare-slider">
          <span>{t("simplify.keep")}</span>
          <input
            type="range"
            min={MIN_KEEP_PERCENT}
            max={MAX_KEEP_PERCENT}
            step={1}
            value={Math.round(percent)}
            aria-valuetext={`${Math.round(percent)} %`}
            onChange={(event) => setTarget(clampTarget(sourceTriangles * Number(event.currentTarget.value) / 100))}
          />
        </label>
        <label className="mesh-compare-field percent">
          <input
            type="text"
            inputMode="decimal"
            aria-label={t("simplify.keepPercent")}
            value={percentDraft ?? String(Math.round(percent * 10) / 10)}
            onChange={(event) => setPercentDraft(event.currentTarget.value)}
            onBlur={commitPercentDraft}
            onKeyDown={blurOnEnter}
          />
          <span>%</span>
        </label>
        <label className="mesh-compare-field triangles">
          <input
            type="text"
            inputMode="numeric"
            aria-label={t("simplify.targetTriangles")}
            value={targetDraft ?? String(target)}
            onChange={(event) => setTargetDraft(event.currentTarget.value)}
            onBlur={commitTargetDraft}
            onKeyDown={blurOnEnter}
          />
          <span>{t("simplify.triangles")}</span>
        </label>
        <div className="mesh-compare-actions">
          <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
          <button type="button" className="primary" disabled={busy || !result || !reduces || Boolean(shape.locked)} onClick={() => result && onApply(result.positions, keepEdges)}>
            {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
            {t("simplify.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
