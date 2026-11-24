import type { OcctKernel, ShapeHandle } from "occt-wasm";
import { tangentCadEdgeChain } from "@/lib/cadEdgeChain";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";

/*
 * A chamfer or fillet runs on along every edge that continues smoothly, whichever of them was picked. The kernel builds
 * it from the edge named first, though, and on some bodies it gets round the chain from one edge and not from another
 * (Issue #1980: the rim of a hole made of two arcs, refused from one arc at every size and done from the other). So a
 * refused treatment is tried once more from the other edges of the same chain. The body is the one the pick asks for:
 * an edge nobody picked may only lead when the treatment it starts takes the picked edges with it.
 */

const MAX_STARTS_PER_CHAIN = 8;

type Entry = { id: number; edge: ShapeHandle };

/** The smooth chains the picked edges belong to: the picked ones of each, and the others it runs on along. */
export function pickedEdgeChains(edges: CadModifierEdge[], pickedIds: readonly number[]) {
  const picked = new Set(pickedIds);
  const done = new Set<number>();
  const chains: { picked: number[]; others: number[] }[] = [];
  for (const id of pickedIds) {
    const start = edges[id];
    if (done.has(id) || !start) continue;
    const owner = start.owner ?? 0;
    const own = edges.filter((edge) => (edge.owner ?? 0) === owner && edge.points.length >= 6);
    const chain = tangentCadEdgeChain(own, id, new Set(own.filter((edge) => edge.selectable).map((edge) => edge.id)));
    chain.forEach((member) => done.add(member));
    chains.push({ picked: pickedIds.filter((member) => chain.includes(member)), others: chain.filter((member) => !picked.has(member)) });
  }
  return chains;
}

/** Whether an edge of `result` still runs through the middle of `edge`: then the treatment has not taken it along. */
function edgeIsLeft(cad: OcctKernel, result: ShapeHandle, edge: ShapeHandle, amount: number) {
  const { first, last } = cad.curveParameters(edge);
  const middle = cad.curvePointAtParam(edge, (first + last) / 2);
  const reach = amount * 1e-2;
  const vertex = cad.makeVertex(middle.x, middle.y, middle.z);
  const edges = cad.getSubShapes(result, "edge");
  try {
    return edges.some((candidate) => {
      const box = cad.getBoundingBox(candidate);
      if (middle.x < box.xmin - reach || middle.x > box.xmax + reach) return false;
      if (middle.y < box.ymin - reach || middle.y > box.ymax + reach) return false;
      if (middle.z < box.zmin - reach || middle.z > box.zmax + reach) return false;
      return cad.distanceBetween(vertex, candidate) < reach;
    });
  } finally {
    edges.forEach((handle) => cad.release(handle));
    cad.release(vertex);
  }
}

/**
 * The refused treatment of `entries`, begun from other edges of their chains. `treat` is the treatment itself and
 * `hasBody` says whether what came back is a solid; an error `isFatal` names goes on up. Null when no start gets round.
 */
export function treatFromOtherChainEdge(
  cad: OcctKernel,
  edgeInfos: CadModifierEdge[],
  handles: ShapeHandle[],
  entries: Entry[],
  amount: number,
  treat: (edges: ShapeHandle[]) => ShapeHandle,
  hasBody: (body: ShapeHandle) => boolean,
  isFatal: (error: unknown) => boolean,
  deadline: number,
): { component: ShapeHandle; edges: ShapeHandle[] } | null {
  const attempt = (edges: ShapeHandle[]) => {
    try {
      const body = treat(edges);
      if (hasBody(body)) return body;
      cad.release(body);
    } catch (error) {
      if (isFatal(error)) throw error;
    }
    return null;
  };
  const picked = new Map(entries.map((entry) => [entry.id, entry.edge]));
  const treated = (edges: ShapeHandle[]) => [...new Set([...edges, ...picked.values()])];
  const chains = pickedEdgeChains(edgeInfos, [...picked.keys()]);
  // Nothing to begin from but what was refused already.
  if (chains.every((chain) => chain.picked.length + chain.others.length < 2)) return null;
  const start: ShapeHandle[] = [];
  let changed = false;
  for (const chain of chains) {
    let chosen: ShapeHandle[] | null = null;
    for (const id of [...chain.picked, ...chain.others].slice(0, MAX_STARTS_PER_CHAIN)) {
      if (performance.now() > deadline) return null;
      const isPicked = picked.has(id);
      // A single picked edge, or a single chain in the order it was picked, is the refused treatment itself.
      if (chains.length === 1 && id === chain.picked[0]) continue;
      const lead = isPicked ? picked.get(id) : handles[id];
      if (lead === undefined) continue;
      const edges = isPicked ? [lead, ...chain.picked.filter((other) => other !== id).map((other) => picked.get(other)!)] : [lead];
      const body = attempt(edges);
      if (body === null) continue;
      let fits = false;
      try {
        fits = isPicked || !chain.picked.some((other) => edgeIsLeft(cad, body, picked.get(other)!, amount));
      } finally {
        if (!fits || chains.length > 1) cad.release(body);
      }
      if (!fits) continue;
      if (chains.length === 1) return { component: body, edges: treated(edges) };
      chosen = edges;
      if (id !== chain.picked[0]) changed = true;
      break;
    }
    // This chain is refused from every start, so the whole is.
    if (!chosen) return null;
    start.push(...chosen);
  }
  if (!changed || performance.now() > deadline) return null;
  const component = attempt(start);
  return component === null ? null : { component, edges: treated(start) };
}
