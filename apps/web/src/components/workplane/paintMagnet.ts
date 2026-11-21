import * as THREE from "three";
import { findShapeObject, type ThreeState } from "@/components/workplane/ViewportOverlays";
import { edgePath, edgeStrength, snapToEdge } from "@/lib/pictureEdgePath";
import { smoothOutline } from "@/lib/outlineSmooth";
import type { PreparedPicture, TracePoint } from "@/lib/pictureTrace";

/*
 * The paint tool's magnetic lasso: the sketch's magnetic lasso (pictureEdgePath.ts), laid on a picture of the
 * body being painted as the view shows it. Its edges are where the body's surface turns (its normals drawn as
 * colours), where its outline meets what lies behind it, and the borders of its paint; and, taken over a few
 * pixels at a time, where a gently curved surface bends most - the rim of an eye socket on a sculpted face, the
 * crest of a cheek - which a sharp edge would outshine. The clicks are snapped onto them and the line between two
 * clicks runs along them. Closed, the line is an ordinary lasso of the view.
 */

/** The picture of the view is made at most this many pixels across, so a path between two clicks stays quick. */
const MAGNET_PICTURE_SIDE = 1000;
/** The bends of the surface are looked for on a picture this many times smaller: a gentle bend shows over a few pixels. */
const BEND_SHRINK = 3;
/** The bends count this much against a sharp edge, an outline or a border of paint, which win where they meet. */
const BEND_WEIGHT = 0.85;
/** A bend this sharp (the normal's change across three pixels of the smaller picture, 0 to about 4) counts at the least as full. */
const BEND_FLOOR = 0.08;
/** A click finds an edge this many pixels of the view away: a pen or a finger on a body seen small lands less exactly than the sketch's mouse. */
const MAGNET_SNAP_REACH = 12;

/** What the lasso works on: the picture of the body and its edges, in pixels of the view (0 at its left and top). */
export type PaintMagnetPicture = PreparedPicture;

/** The lasso being laid: the clicks, snapped, and the line from each to the next (the first click's line is just itself). */
export type PaintMagnetDraft = {
  picture: PaintMagnetPicture;
  anchors: TracePoint[];
  segments: TracePoint[][];
};

function renderPixels(state: ThreeState, scene: THREE.Scene, width: number, height: number) {
  const { renderer, camera } = state;
  const target = new THREE.WebGLRenderTarget(width, height, { depthBuffer: true });
  const previousTarget = renderer.getRenderTarget();
  const previousColor = renderer.getClearColor(new THREE.Color());
  const previousAlpha = renderer.getClearAlpha();
  const previousLayers = camera.layers.mask;
  const data = new Uint8Array(width * height * 4);
  try {
    camera.layers.enableAll();
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, data);
  } finally {
    camera.layers.mask = previousLayers;
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousColor, previousAlpha);
    target.dispose();
  }
  // The rows come bottom first; the picture has its top row first.
  const flipped = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) flipped.set(data.subarray((height - 1 - row) * width * 4, (height - row) * width * 4), row * width * 4);
  return flipped;
}

/**
 * How sharply the surface bends at each pixel of a picture of its normals, 0 to 1: the normal's steepest change
 * there (Sobel on its sideways and upward parts), where the body covers all the pixels round it - its outline is
 * no bend - as a share of a strong bend of this body (few pixels bend more), so a softly modelled body has bends too.
 */
function bendStrength(pixels: { width: number; height: number; data: Uint8ClampedArray }) {
  const { width, height, data } = pixels;
  const covered = (index: number) => data[index * 4 + 3] === 255;
  const out = new Float32Array(width * height);
  const values: number[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      let all = true;
      for (let dy = -1; dy <= 1 && all; dy += 1) for (let dx = -1; dx <= 1 && all; dx += 1) all = covered(index + dy * width + dx);
      if (!all) continue;
      let most = 0;
      for (const channel of [0, 1]) {
        const v = (dx: number, dy: number) => data[(index + dy * width + dx) * 4 + channel] / 255;
        const across = v(1, -1) + 2 * v(1, 0) + v(1, 1) - v(-1, -1) - 2 * v(-1, 0) - v(-1, 1);
        const along = v(-1, 1) + 2 * v(0, 1) + v(1, 1) - v(-1, -1) - 2 * v(0, -1) - v(1, -1);
        most = Math.max(most, Math.hypot(across, along));
      }
      out[index] = most;
      if (most > 0) values.push(most);
    }
  }
  values.sort((a, b) => a - b);
  const full = Math.max(BEND_FLOOR, values.length ? values[Math.floor(values.length * 0.97)] : 0);
  for (let index = 0; index < out.length; index += 1) out[index] = Math.min(1, out[index] / full);
  return out;
}

/** A small picture's values on the larger grid, `width` by `height`, between its pixels' middles. */
function enlarged(values: Float32Array, small: { width: number; height: number }, width: number, height: number) {
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.max(0, Math.min(small.height - 1, ((y + 0.5) * small.height) / height - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(small.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < width; x += 1) {
      const sx = Math.max(0, Math.min(small.width - 1, ((x + 0.5) * small.width) / width - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(small.width - 1, x0 + 1);
      const fx = sx - x0;
      const top = values[y0 * small.width + x0] * (1 - fx) + values[y0 * small.width + x1] * fx;
      const bottom = values[y1 * small.width + x0] * (1 - fx) + values[y1 * small.width + x1] * fx;
      out[y * width + x] = top * (1 - fy) + bottom * fy;
    }
  }
  return out;
}

function picture(width: number, height: number, pixels: { width: number; height: number; data: Uint8ClampedArray }): PaintMagnetPicture {
  return { width, height, pixels, scaleX: width / pixels.width, scaleY: height / pixels.height, fields: {}, contours: new Map(), areas: new Map() };
}

/**
 * The picture the lasso clings to, for the body `shapeId` as the view shows it now; null when the body is not in
 * the view. It is drawn twice, off the screen: once with the surface's normals as colours (where the surface
 * turns, and its outline) and once in its colours flat (the borders of its paint), and each pixel takes the
 * stronger of the two edges.
 */
export function paintMagnetPicture(state: ThreeState, shapeId: string): PaintMagnetPicture | null {
  const object = findShapeObject(state, shapeId);
  const rect = state.renderer.domElement.getBoundingClientRect();
  if (!object || rect.width < 2 || rect.height < 2) return null;
  object.updateWorldMatrix(true, true);
  const meshes: THREE.Mesh[] = [];
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.visible && mesh.userData.shapeId === shapeId && mesh.geometry?.getAttribute("position")) meshes.push(mesh);
  });
  if (!meshes.length) return null;
  const shrink = Math.max(1, Math.max(rect.width, rect.height) / MAGNET_PICTURE_SIDE);
  const width = Math.max(2, Math.round(rect.width / shrink));
  const height = Math.max(2, Math.round(rect.height / shrink));
  const made: Array<{ dispose(): void }> = [];
  const draw = (material: (mesh: THREE.Mesh) => THREE.Material | THREE.Material[], size = { width, height }) => {
    const scene = new THREE.Scene();
    meshes.forEach((mesh) => {
      const proxy = new THREE.Mesh(mesh.geometry, material(mesh));
      proxy.matrixAutoUpdate = false;
      proxy.matrix.copy(mesh.matrixWorld);
      proxy.matrixWorld.copy(mesh.matrixWorld);
      proxy.layers.enableAll();
      scene.add(proxy);
    });
    scene.matrixWorldAutoUpdate = false;
    return renderPixels(state, scene, size.width, size.height);
  };
  try {
    const normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    made.push(normalMaterial);
    const turns = picture(rect.width, rect.height, { width, height, data: draw(() => normalMaterial) });
    const flatMaterials = new Map<string, THREE.MeshBasicMaterial>();
    const flat = (source: THREE.Material) => {
      const color = (source as THREE.MeshStandardMaterial).color;
      const key = color ? color.getHexString() : "none";
      let material = flatMaterials.get(key);
      if (!material) {
        material = new THREE.MeshBasicMaterial({ color: color ? color.clone() : 0xffffff, side: THREE.DoubleSide });
        made.push(material);
        flatMaterials.set(key, material);
      }
      return material;
    };
    const colours = picture(rect.width, rect.height, {
      width,
      height,
      data: draw((mesh) => (Array.isArray(mesh.material) ? mesh.material.map(flat) : flat(mesh.material))),
    });
    const small = { width: Math.max(3, Math.round(width / BEND_SHRINK)), height: Math.max(3, Math.round(height / BEND_SHRINK)) };
    const bends = enlarged(bendStrength({ ...small, data: draw(() => normalMaterial, small) }), small, width, height);
    const a = edgeStrength(turns);
    const b = edgeStrength(colours);
    const edges = new Float32Array(a.length);
    for (let index = 0; index < a.length; index += 1) edges[index] = Math.max(a[index], b[index], bends[index] * BEND_WEIGHT);
    turns.edges = edges;
    return turns;
  } catch {
    return null;
  } finally {
    made.forEach((entry) => entry.dispose());
  }
}

/** A click added to the lasso: snapped onto an edge near it, and the line to it from the click before along the edges. */
export function addMagnetAnchor(draft: PaintMagnetDraft, spot: TracePoint): PaintMagnetDraft {
  const anchor = snapToEdge(draft.picture, spot, Math.max(1, Math.round(MAGNET_SNAP_REACH / draft.picture.scaleX)));
  const last = draft.anchors[draft.anchors.length - 1];
  const segment = last ? edgePath(draft.picture, last, anchor).slice(1) : [anchor];
  return { ...draft, anchors: [...draft.anchors, anchor], segments: [...draft.segments, segment] };
}

/** The lasso without its last click. */
export function dropMagnetAnchor(draft: PaintMagnetDraft): PaintMagnetDraft {
  return { ...draft, anchors: draft.anchors.slice(0, -1), segments: draft.segments.slice(0, -1) };
}

/** The line laid so far, smoothed by `smooth` (0 to 100) as it will be laid, and from the last click to `to` (the pointer) along the edges. */
export function magnetLine(draft: PaintMagnetDraft, to?: TracePoint | null, smooth = 0): { laid: TracePoint[]; ahead: TracePoint[] } {
  const flat = draft.segments.flat();
  const laid = smooth && flat.length > 2 ? smoothOutline(flat.map((point) => [point.x, point.y]), smooth, false).map(([x, y]) => ({ x, y })) : flat;
  const last = draft.anchors[draft.anchors.length - 1];
  return { laid, ahead: last && to ? [last, ...edgePath(draft.picture, last, to).slice(1)] : [] };
}

/** The closed outline: the line laid and the way back along the edges from the last click to the first, smoothed by `smooth` (0 to 100). */
export function closeMagnet(draft: PaintMagnetDraft, smooth = 0): Array<[number, number]> | null {
  if (draft.anchors.length < 3) return null;
  const back = edgePath(draft.picture, draft.anchors[draft.anchors.length - 1], draft.anchors[0]).slice(1, -1);
  const outline = [...draft.segments.flat(), ...back].map((point): [number, number] => [point.x, point.y]);
  return smooth ? smoothOutline(outline, smooth, true) : outline;
}
