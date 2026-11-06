import * as THREE from "three";
import { RENDER_LAYER_HELPERS, setObjectRenderLayer, type ThreeState } from "@/components/workplane/ViewportOverlays";
import type { ClearanceBox } from "@/lib/clearanceCheck";

/**
 * What the print check shows in the view: its thin walls painted red over the bodies, for as long as its result is
 * fresh, and the place the camera goes to when a line's Show is clicked. `request` counts those clicks: each one brings
 * the camera there, also when the same line is clicked again.
 */
export type PrintCheckView = {
  /** The thin places as triangles in the scene's frame (nine numbers each), or null for none. */
  thin: readonly number[] | null;
  focus: ClearanceBox | null;
  request: number;
};

/**
 * Red with a fine light grid laid across it: the grid shows the paint on a red body too, and it is not the overhangs'
 * stripes (which run one way only), so the two can be shown at the same time and still be told apart.
 */
const THIN_WALL_COLOR = "#e5484d";
const THIN_WALL_GRID_COLOR = "vec3( 1.0, 0.93, 0.9 )";
/** The grid's spacing and line width in pixels of the canvas. */
const THIN_WALL_GRID_PX = 16;
const THIN_WALL_GRID_LINE_PX = 2;

function thinWallMaterial() {
  const material = new THREE.MeshLambertMaterial({
    color: THIN_WALL_COLOR,
    emissive: new THREE.Color(THIN_WALL_COLOR).multiplyScalar(0.35),
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
float thinWallA = mod( gl_FragCoord.x + gl_FragCoord.y, ${THIN_WALL_GRID_PX.toFixed(1)} );
float thinWallB = mod( gl_FragCoord.x - gl_FragCoord.y + 4096.0, ${THIN_WALL_GRID_PX.toFixed(1)} );
if ( thinWallA < ${THIN_WALL_GRID_LINE_PX.toFixed(1)} || thinWallB < ${THIN_WALL_GRID_LINE_PX.toFixed(1)} ) diffuseColor.rgb = ${THIN_WALL_GRID_COLOR};`,
    );
  };
  material.customProgramCacheKey = () => "layerling-thin-walls";
  return material;
}

const overlays = new WeakMap<ThreeState, THREE.Mesh>();

/**
 * Paints the thin places on the bodies, replacing what was painted before; null takes it away. The triangles lie on
 * the bodies' own surfaces, so they are drawn pulled towards the camera (polygon offset) to win the depth test, and the
 * bodies in front of them still hide them. A section view cuts them as it cuts the bodies (see clipThinWallOverlay).
 */
export function syncThinWallOverlay(state: ThreeState, positions: readonly number[] | null) {
  const previous = overlays.get(state);
  if (previous) {
    state.scene.remove(previous);
    previous.geometry.dispose();
    (previous.material as THREE.Material).dispose();
    overlays.delete(state);
  }
  if (positions && positions.length >= 9) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(Array.from(positions), 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, thinWallMaterial());
    mesh.name = "PrintCheckThinWalls";
    mesh.renderOrder = 1003;
    mesh.matrixAutoUpdate = false;
    setObjectRenderLayer(mesh, RENDER_LAYER_HELPERS);
    state.scene.add(mesh);
    overlays.set(state, mesh);
    clipThinWallOverlay(state);
  }
  state.needsRender = true;
}

/** The section view's plane, given to the paint as well: it changes only its numbers while it moves, so this is cheap each frame. */
export function clipThinWallOverlay(state: ThreeState) {
  const mesh = overlays.get(state);
  if (!mesh) return;
  const material = mesh.material as THREE.Material;
  const plane = state.sectionPlane ?? null;
  if ((material.clippingPlanes?.[0] ?? null) === plane) return;
  const toggled = Boolean(material.clippingPlanes?.length) !== Boolean(plane);
  material.clippingPlanes = plane ? [plane] : null;
  if (toggled) material.needsUpdate = true;
}
