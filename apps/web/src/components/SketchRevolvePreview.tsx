"use client";

import { Scan } from "lucide-react";
import { useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { wheelZoomDelta } from "@/lib/wheelZoom";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";

/** The window moves by its title, like the object list and the settings: it floats from its corner, dropped near it it docks again. */
const PREVIEW_PANEL: MovablePanelOptions = { floatingStyle: { right: "auto" } };

export function SketchRevolvePreview({ positions }: { positions: number[] | null }) {
  useLanguage();
  const movable = useMovablePanel<HTMLElement>("layerling.sketch.revolvePreviewPosition", PREVIEW_PANEL);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The viewing angle the person turned the preview to, so redrawing the sketch keeps it.
  const savedView = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  // Set while a shape is shown: puts the camera back to the first view of that shape.
  const resetView = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !positions?.length) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 5000);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({ color: "#8ccf79", roughness: 0.68, metalness: 0.02, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    scene.add(new THREE.HemisphereLight("#ffffff", "#b7cadd", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 3.2);
    key.position.set(-3, 5, 4);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.DirectionalLight("#b9ddff", 1.2);
    fill.position.set(4, 2, -3);
    scene.add(fill);

    const bounds = geometry.boundingBox ?? new THREE.Box3().setFromObject(mesh);
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(1, geometry.boundingSphere?.radius ?? 1);
    camera.position.set(center.x + radius * 1.8, center.y + radius * 1.2, center.z + radius * 2.1);
    camera.near = Math.max(0.01, radius / 100);
    camera.far = radius * 20;
    const startPosition = camera.position.clone();
    const startTarget = center.clone();
    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(center);
    // Left and right drag both turn the shape; the wheel button drags it sideways or up and down (as in Tinkercad).
    controls.enablePan = true;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    controls.minDistance = radius * 0.8;
    controls.maxDistance = radius * 8;
    if (savedView.current) {
      camera.position.copy(savedView.current.position);
      controls.target.copy(savedView.current.target);
    }
    // A wheel counted in lines or pages (Firefox, Windows with "scroll one screen at a time") zooms like any other, as in the main view.
    let lastWheelAt = Number.NEGATIVE_INFINITY;
    let wheelDeltaOverride: number | null = null;
    const zoomControls = controls as unknown as { _getZoomScale: (delta: number) => number };
    const orbitZoomScale = zoomControls._getZoomScale.bind(controls);
    zoomControls._getZoomScale = (delta: number) => orbitZoomScale(wheelDeltaOverride ?? delta);
    const countWheel = (event: WheelEvent) => {
      wheelDeltaOverride = wheelZoomDelta(event, event.timeStamp - lastWheelAt);
      lastWheelAt = event.timeStamp;
    };
    const endWheel = () => {
      wheelDeltaOverride = null;
    };
    canvas.addEventListener("wheel", countWheel, { passive: true, capture: true });
    canvas.addEventListener("wheel", endWheel, { passive: true });
    controls.update();
    camera.updateProjectionMatrix();

    const render = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    render();
    controls.addEventListener("change", render);
    resetView.current = () => {
      savedView.current = null;
      camera.position.copy(startPosition);
      controls.target.copy(startTarget);
      controls.update();
      render();
    };
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => {
      resetView.current = null;
      savedView.current = { position: camera.position.clone(), target: controls.target.clone() };
      canvas.removeEventListener("wheel", countWheel, { capture: true });
      canvas.removeEventListener("wheel", endWheel);
      controls.dispose();
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [positions]);

  return (
    <aside
      ref={movable.panelRef}
      className={`sketch-revolve-preview ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      aria-label={t("sketch.revolvePreview")}
    >
      <div className="sketch-revolve-preview-title movable" title={t("panel.moveHint")} {...movable.handleProps}>
        {t("sketch.revolvePreviewTitle")}
        <GuideHelpLink section="sketchToBody" iconSize={15} />
      </div>
      {positions?.length ? (
        <>
          <canvas ref={canvasRef} onDoubleClick={() => resetView.current?.()} />
          <button type="button" className="sketch-revolve-preview-reset" title={t("sketch.revolvePreviewReset")} aria-label={t("sketch.revolvePreviewReset")} onClick={() => resetView.current?.()}>
            <Scan size={16} />
          </button>
        </>
      ) : <div className="sketch-revolve-preview-empty">{t("sketch.revolvePreviewEmpty")}</div>}
    </aside>
  );
}
