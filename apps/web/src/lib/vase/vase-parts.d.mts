// Types for vase-parts.mjs: the vase's accessories, kept the same as in the stand-alone vase tool.

/** One accessory: a closed mesh in the vase's coordinates (millimetres, z up, axis at the origin). */
export type VasePart = {
  id: string;
  name: string;
  mesh: { vertices: Float64Array; indices: Uint32Array };
  /** Height above the lifted vase it sits at when put together. */
  z: number;
  /** Belongs to the vase's own object (legs moulded on). */
  merge: boolean;
  /** Printed upside down. */
  flip: boolean;
  info?: string;
  /** Built lying down as it is printed: put together, its point (x, v, w) is at (x, stand.y - w, v + stand.z). */
  stand?: { y: number; z: number };
};

export type VasePose = { flip: boolean; dx: number; dy: number; dz: number };

export function buildParts(input?: unknown, options?: { outward?: number }): { parts: VasePart[]; lift: number; notes: string[] };
/** A part's mesh where it sits when everything is put together, in the vase's coordinates. */
export function assembledMesh(part: VasePart): { vertices: Float64Array; indices: Uint32Array };
export function meshBox(vertices: ArrayLike<number>): { min: number[]; max: number[] };
export function placePoint(pose: VasePose, x: number, y: number, z: number): [number, number, number];
export function layoutParts(
  vaseBox: { min: number[]; max: number[] },
  parts: VasePart[],
  lift: number,
  mode: "zusammen" | "druck",
  options?: { gap?: number; rowWidth?: number },
): { vase: VasePose; parts: VasePose[] };
