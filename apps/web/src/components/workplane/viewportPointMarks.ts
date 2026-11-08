import * as THREE from "three";
import type { ThreeState } from "./ViewportOverlays";
import { RENDER_LAYER_PREVIEWS } from "./viewportShapeObjects";

/**
 * A point shown while "Point to point" picks (Discussion #1491): the one the
 * pointer would take, and the two already clicked - the one that moves and
 * the one it moves to.
 */
export type PointMark = { x: number; y: number; z: number; role: "hover" | "source" | "target" };

const MARK_COLORS: Record<PointMark["role"], string> = {
  hover: "#e0347c",
  source: "#f08c00",
  target: "#2f9e44",
};
const MARK_SIZE_PX = 14;

const layers = new WeakMap<ThreeState, THREE.Group>();
const dotTextures = new Map<string, THREE.Texture>();

/** A round dot in its colour with a white ring, so a mark reads on any colour of body behind it. */
function markTexture(color: string) {
  const known = dotTextures.get(color);
  if (known) return known;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(32, 32, 30, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = color;
    context.beginPath();
    context.arc(32, 32, 21, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  dotTextures.set(color, texture);
  return texture;
}

/**
 * Draws the marks as dots of a fixed size on the screen, in front of every
 * body, so a corner at the back still shows where it is. An empty list clears them.
 */
export function syncPointMarks(state: ThreeState | null, marks: readonly PointMark[]) {
  if (!state) return;
  let layer = layers.get(state);
  if (!layer) {
    if (marks.length === 0) return;
    layer = new THREE.Group();
    layer.name = "PointMarks";
    layer.layers.set(RENDER_LAYER_PREVIEWS);
    layer.renderOrder = 1000;
    layers.set(state, layer);
    state.scene.add(layer);
  }
  const key = marks.map((mark) => `${mark.role}:${mark.x.toFixed(4)},${mark.y.toFixed(4)},${mark.z.toFixed(4)}`).join("|");
  if (layer.userData.key === key) return;
  layer.userData.key = key;
  layer.children.slice().forEach((child) => {
    layer.remove(child);
    const points = child as THREE.Points;
    points.geometry.dispose();
    (points.material as THREE.Material).dispose();
  });
  marks.forEach((mark) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([mark.x, mark.y, mark.z], 3));
    const material = new THREE.PointsMaterial({
      size: MARK_SIZE_PX,
      sizeAttenuation: false,
      map: markTexture(MARK_COLORS[mark.role]),
      alphaTest: 0.5,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.layers.set(RENDER_LAYER_PREVIEWS);
    points.renderOrder = 1000;
    points.frustumCulled = false;
    layer.add(points);
  });
  layer.visible = marks.length > 0;
  state.needsRender = true;
}
