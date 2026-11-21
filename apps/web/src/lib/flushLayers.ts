import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import type { FlushLayer, SketchStrokeJoin } from "@/types/layerling";

/**
 * Name tags and icon tags laid in flush (#215): instead of each colour standing on the one below, all layers end on one
 * flat top. The bottom layer keeps its height and carries the tag; every layer above it is `depth` high and lies in a
 * pocket of the layer under it, the shape of that layer's own outline. Seen from above the tag looks as it does stacked -
 * the letters, round them the rim, round that the plate - but the face is flat, which prints face down on the plate.
 */

/** The shallowest a layer can be set in, in mm: one print layer of 0.2 mm. */
export const MIN_FLUSH_DEPTH = 0.2;
/** The deepest, in mm. */
export const MAX_FLUSH_DEPTH = 5;
/**
 * How deep a tag is set in to begin with, in mm: four print layers of 0.2 mm. Most PLA no longer shows a dark colour
 * through a light one there (about 0.9 mm is where the difference stops being visible); a more translucent filament
 * (PETG, some whites) needs more, which the slider gives.
 */
export const DEFAULT_FLUSH_DEPTH = 0.8;
/** How much of the bottom layer stays under the pocket at least, in mm: one print layer, so the tag stays one piece. */
export const MIN_FLUSH_FLOOR = 0.2;

const round = (value: number) => Math.round(value * 1000) / 1000;

/** How deep the layers are set in on a bottom layer this high: the depth asked for, kept within its limits and a floor under it. */
export function flushDepthFor(depth: number, bottomHeight: number) {
  const wanted = Number.isFinite(depth) ? depth : DEFAULT_FLUSH_DEPTH;
  const most = Math.max(MIN_FLUSH_DEPTH, Math.min(MAX_FLUSH_DEPTH, bottomHeight - MIN_FLUSH_FLOOR));
  return round(Math.min(most, Math.max(MIN_FLUSH_DEPTH, wanted)));
}

const JOINS: readonly SketchStrokeJoin[] = ["miter", "round", "bevel"];

/** A layer's flush setting as a .lyl file or the AI bridge gives it, or undefined when it is not one. */
export function normalizeFlushLayer(value: unknown): FlushLayer | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const depth = Number(candidate.depth);
  const height = Number(candidate.height);
  if (!Number.isFinite(depth) || depth <= 0 || !Number.isFinite(height) || height <= 0) return undefined;
  let pocket: FlushLayer["pocket"];
  if (candidate.pocket !== undefined) {
    if (!candidate.pocket || typeof candidate.pocket !== "object" || Array.isArray(candidate.pocket)) return undefined;
    const raw = candidate.pocket as Record<string, unknown>;
    const grow = Number(raw.grow);
    if (!Number.isFinite(grow) || grow < 0) return undefined;
    if (raw.join !== undefined && !JOINS.includes(raw.join as SketchStrokeJoin)) return undefined;
    if (raw.silhouette !== undefined && typeof raw.silhouette !== "boolean") return undefined;
    pocket = {
      grow: round(grow),
      ...(raw.join && raw.join !== "round" ? { join: raw.join as SketchStrokeJoin } : {}),
      ...(raw.silhouette ? { silhouette: true } : {}),
    };
  }
  return { depth: round(depth), height: round(height), ...(pocket ? { pocket } : {}) };
}

/**
 * A layer with its pocket as one closed body, from the 2D kernel: `region` extruded `height` high, with `pocket` taken out of
 * its top `depth` deep. A pocket as deep as the layer is high leaves the outline round it, worked out flat. Positions with y
 * up (x, height, the region's second axis), ready for a mesh; null when nothing is left.
 */
export function flushLayerSolid(runtime: ManifoldToplevel, region: CrossSection, pocket: CrossSection, height: number, depth: number): { positions: Float32Array; indices: Uint32Array } | null {
  const made: Array<{ delete(): void }> = [];
  const keep = <T extends { delete(): void }>(item: T) => {
    made.push(item);
    return item;
  };
  try {
    const safeHeight = Math.max(1e-3, height);
    let solid;
    if (depth >= safeHeight - 1e-6) {
      // Set in all the way: the layer is the ring round the one above it, extruded as a whole.
      const ring = keep(keep(region.subtract(pocket)).simplify(1e-6));
      if (ring.isEmpty() || ring.area() <= 1e-9) return null;
      solid = keep(ring.extrude(safeHeight));
    } else {
      // The pocket reaches a little above the top, so no face of it lies on the top's own plane.
      const body = keep(region.extrude(safeHeight));
      const cut = keep(keep(pocket.extrude(depth + 0.01)).translate([0, 0, safeHeight - depth]));
      solid = keep(body.subtract(cut));
    }
    if (solid.status() !== "NoError" || solid.isEmpty() || solid.numTri() < 1) return null;
    const mesh = solid.getMesh();
    const count = mesh.vertProperties.length / mesh.numProp;
    const positions = new Float32Array(count * 3);
    // The section lies in x and its second axis, the extrusion runs along z: y up is (x, extrusion, second axis).
    for (let vertex = 0; vertex < count; vertex += 1) {
      positions[vertex * 3] = mesh.vertProperties[vertex * mesh.numProp];
      positions[vertex * 3 + 1] = mesh.vertProperties[vertex * mesh.numProp + 2];
      positions[vertex * 3 + 2] = mesh.vertProperties[vertex * mesh.numProp + 1];
    }
    // Swapping two axes mirrors the mesh, so each triangle turns the other way round to keep facing out.
    const indices = new Uint32Array(mesh.triVerts.length);
    for (let index = 0; index < mesh.triVerts.length; index += 3) {
      indices[index] = mesh.triVerts[index];
      indices[index + 1] = mesh.triVerts[index + 2];
      indices[index + 2] = mesh.triVerts[index + 1];
    }
    return indices.length ? { positions, indices } : null;
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}
