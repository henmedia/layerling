import * as THREE from "three";
import type { ThreeState } from "./ViewportOverlays";
import { RENDER_LAYER_PREVIEWS } from "./viewportShapeObjects";

/**
 * A face "Align faces" picked (Discussion #2136): the one of the part that moves and the one it moves to. They stay
 * lit until the tool applies or closes, so it is plain which two faces Align will bring together. The colours are
 * those of the points "Point to point" marks.
 */
export type FaceMark = { vertices: Float32Array; role: "source" | "target" };

const FACE_COLORS: Record<FaceMark["role"], string> = {
  source: "#f08c00",
  target: "#2f9e44",
};

const layers = new WeakMap<ThreeState, THREE.Group>();

/** Draws the marked faces over the bodies they lie on. An empty list clears them. */
export function syncFaceMarks(state: ThreeState | null, marks: readonly FaceMark[]) {
  if (!state) return;
  let layer = layers.get(state);
  if (!layer) {
    if (marks.length === 0) return;
    layer = new THREE.Group();
    layer.name = "FaceMarks";
    layer.layers.set(RENDER_LAYER_PREVIEWS);
    layers.set(state, layer);
    state.scene.add(layer);
  }
  const known = layer.userData.marks as readonly FaceMark[] | undefined;
  if (known && known.length === marks.length && known.every((mark, slot) => mark.vertices === marks[slot].vertices && mark.role === marks[slot].role)) return;
  layer.userData.marks = marks.slice();
  layer.children.slice().forEach((child) => {
    layer.remove(child);
    const mesh = child as THREE.Mesh;
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
  marks.forEach((mark) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(mark.vertices, 3));
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: FACE_COLORS[mark.role],
        transparent: true,
        // Clearly its own colour on a body of any colour: at 0.6 green on red read as olive.
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
    );
    mesh.layers.set(RENDER_LAYER_PREVIEWS);
    mesh.renderOrder = 955;
    mesh.raycast = () => undefined;
    layer.add(mesh);
  });
  layer.visible = marks.length > 0;
  state.needsRender = true;
}

/** The face the hover layer lights right now, as its own copy of the triangles in world space. */
export function litFaceVertices(state: ThreeState | null): Float32Array | null {
  const highlight = state?.layFlatHoverLayer?.visible ? state.layFlatHoverLayer.children[0] as THREE.Mesh | undefined : undefined;
  const position = highlight?.geometry.getAttribute("position");
  return position ? new Float32Array(position.array as ArrayLike<number>) : null;
}
