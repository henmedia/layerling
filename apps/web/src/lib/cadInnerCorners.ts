import type { OcctKernel, ShapeHandle, Vec3 } from "occt-wasm";
import { cadHasSolidBody } from "@/lib/cadSolidBody";
import { isKernelMemoryFault } from "@/lib/kernelFault";

/*
 * A fillet or chamfer along edges that meet at a sharp inner corner: the top of a cloud of fused discs, where two
 * circles meet in a point. The rolling ball has no room in the notch, at any size, and the kernel refuses the whole
 * selection. Rounded there first, even a little, the corner is no notch any more and the edges go through.
 *
 * So, when the picked edges fail on their own: the inner corners at their ends are taken along at the same size, and
 * failing that, rounded first at a half and then a quarter of the size, before the picked edges, found again on the
 * rounded body, are treated as asked. Only edges the solid wraps round by more than half a turn count as inner
 * corners: an outer corner is the user's to round or keep sharp.
 *
 * Forced past a corner, the kernel can answer with a body whose faces run through each other and still call it valid,
 * or crash. So nothing is tried where an edge is shorter than the size (a sliver of a disc that barely shows between
 * two others), and a result only counts when its mesh is closed.
 */

/** The share of a small circle round the edge's middle that lies inside the solid: about 0.25 for a box edge, 0.75 for a notch. */
function wrapShare(cad: OcctKernel, solid: ShapeHandle, edge: ShapeHandle, probe: number) {
  const range = cad.curveParameters(edge);
  const middle = (range.first + range.last) / 2;
  const at = cad.curvePointAtParam(edge, middle);
  const tangent = unit(cad.curveTangent(edge, middle));
  if (!tangent) return 0;
  // Two directions across the edge.
  const helper: Vec3 = Math.abs(tangent.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const u = unit(cross(tangent, helper))!;
  const v = cross(tangent, u);
  const samples = 16;
  let inside = 0;
  for (let index = 0; index < samples; index += 1) {
    const angle = (index + 0.5) / samples * 2 * Math.PI;
    const point = {
      x: at.x + probe * (Math.cos(angle) * u.x + Math.sin(angle) * v.x),
      y: at.y + probe * (Math.cos(angle) * u.y + Math.sin(angle) * v.y),
      z: at.z + probe * (Math.cos(angle) * u.z + Math.sin(angle) * v.z),
    };
    if (cad.containsPoint(solid, point, probe * 1e-3)) inside += 1;
  }
  return inside / samples;
}

/** The inner corners among these edges: the solid fills clearly more than half the turn round them. */
export function innerCornerEdges(cad: OcctKernel, solid: ShapeHandle, edges: ShapeHandle[], amount: number) {
  const probe = Math.max(0.002, Math.min(0.05, amount * 0.05));
  return edges.filter((edge) => {
    try {
      return wrapShare(cad, solid, edge, probe) > 0.6;
    } catch {
      return false;
    }
  });
}

/**
 * The edges of `body` that lie along the picked ones (each picked edge cut shorter by the rounded corners) and the short
 * edges joining two of them (the round corner's own edge in the picked edges' face), found by distance.
 */
export function edgesAlong(cad: OcctKernel, body: ShapeHandle, picked: ShapeHandle[], connectorLength: number, tolerance = 1e-3) {
  const distanceToPicked = (point: Vec3) => Math.min(...picked.map((edge) => {
    try {
      return distance(cad.projectPointOnEdge(edge, point).point, point);
    } catch (error) {
      if (isKernelMemoryFault(error)) throw error;
      return Infinity;
    }
  }));
  const edges = cad.getSubShapes(body, "edge");
  const along: ShapeHandle[] = [];
  const rest: { edge: ShapeHandle; start: Vec3; end: Vec3; length: number }[] = [];
  for (const edge of edges) {
    const range = cad.curveParameters(edge);
    const samples = [0, 0.25, 0.5, 0.75, 1].map((share) => cad.curvePointAtParam(edge, range.first + (range.last - range.first) * share));
    if (samples.every((point) => distanceToPicked(point) <= tolerance)) along.push(edge);
    else rest.push({ edge, start: samples[0], end: samples[4], length: cad.curveLength(edge) });
  }
  const ends = along.flatMap((edge) => {
    const range = cad.curveParameters(edge);
    return [cad.curvePointAtParam(edge, range.first), cad.curvePointAtParam(edge, range.last)];
  });
  const touches = (point: Vec3) => ends.some((end) => distance(end, point) <= tolerance);
  const connectors = rest.filter((entry) => entry.length <= connectorLength && touches(entry.start) && touches(entry.end)).map((entry) => entry.edge);
  return [...along, ...connectors];
}

export type InnerCornerResult = { component: ShapeHandle; cornerAmount: number };

/**
 * The picked edges treated after the inner corners: first all at once at the size asked, then the corners at a half and
 * a quarter of it before the picked edges. Null when none of it gives a body, or the time is up.
 */
export function treatAfterInnerCorners(
  cad: OcctKernel,
  solid: ShapeHandle,
  picked: ShapeHandle[],
  corners: ShapeHandle[],
  amount: number,
  treat: (body: ShapeHandle, edges: ShapeHandle[], size: number) => ShapeHandle,
  deadline: number,
  isFatal: (error: unknown) => boolean,
): InnerCornerResult | null {
  const attempt = (make: () => ShapeHandle) => {
    try {
      const body = make();
      // A forced fillet can come out "valid" with its faces running through each other: a closed mesh shows it is not.
      if (cadHasSolidBody(cad, body) && meshIsClosed(cad, body)) return body;
      release(cad, [body]);
    } catch (error) {
      if (isFatal(error)) throw error;
    }
    return null;
  };
  const together = attempt(() => treat(solid, [...picked, ...corners], amount));
  if (together) return { component: together, cornerAmount: amount };
  for (const share of [0.5, 0.25]) {
    if (performance.now() > deadline) return null;
    const cornerAmount = amount * share;
    const rounded = attempt(() => treat(solid, corners, cornerAmount));
    if (!rounded) continue;
    const again = edgesAlong(cad, rounded, picked, cornerAmount * Math.PI * 2);
    const finished = again.length ? attempt(() => treat(rounded, again, amount)) : null;
    release(cad, [rounded, ...again]);
    if (finished) return { component: finished, cornerAmount };
  }
  return null;
}

/**
 * Whether the body's coarse mesh is closed: every edge between two triangles, matched by its corners' places. The
 * kernel meshes the faces of a sound body along shared edges, so a body whose faces cross each other shows open or
 * tripled edges here where its topology looks fine.
 */
export function meshIsClosed(cad: OcctKernel, body: ShapeHandle) {
  const mesh = cad.tessellate(body, { linearDeflection: 0.1, angularDeflection: 0.5 });
  const { positions, indices } = mesh;
  const key = (index: number) => `${positions[index * 3].toFixed(4)},${positions[index * 3 + 1].toFixed(4)},${positions[index * 3 + 2].toFixed(4)}`;
  const uses = new Map<string, number>();
  for (let triangle = 0; triangle < indices.length; triangle += 3) {
    const corners = [key(indices[triangle]), key(indices[triangle + 1]), key(indices[triangle + 2])];
    if (corners[0] === corners[1] || corners[1] === corners[2] || corners[0] === corners[2]) continue;
    for (let side = 0; side < 3; side += 1) {
      const edge = [corners[side], corners[(side + 1) % 3]].sort().join("|");
      uses.set(edge, (uses.get(edge) ?? 0) + 1);
    }
  }
  for (const count of uses.values()) if (count !== 2) return false;
  return uses.size > 0;
}

function release(cad: OcctKernel, handles: ShapeHandle[]) {
  for (const handle of handles) {
    try {
      cad.release(handle);
    } catch {
      // Gone already.
    }
  }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function unit(a: Vec3): Vec3 | null {
  const length = Math.hypot(a.x, a.y, a.z);
  return length > 1e-12 ? { x: a.x / length, y: a.y / length, z: a.z / length } : null;
}

function distance(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
