import { describe, expect, it } from "vitest";
import type { OcctKernel, ShapeHandle } from "occt-wasm";
import { pickedEdgeChains, treatFromOtherChainEdge } from "@/lib/cadChainStart";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";

/*
 * Issue #1980: the rim of a hole made of two arcs was refused when the one arc was picked and chamfered when the other
 * was. The kernel here is a stand-in that gets round a rim only from the starts a test allows, and takes along the
 * edges a test says it carries on to; a body is the list of the edges left in it.
 */

const STEPS = 24;

function arc(id: number, centre: number, from: number): CadModifierEdge {
  const points: number[] = [];
  for (let step = 0; step <= STEPS; step += 1) {
    const angle = from + (Math.PI * step) / STEPS;
    points.push(centre + 10 * Math.cos(angle), 10 * Math.sin(angle), 0);
  }
  return { id, owner: 0, points, display: true, selectable: true, angle: 90, boundary: false, manifold: true };
}

// Two rims of two arcs each: 0 and 1 round x = 0, 2 and 3 round x = 50.
const rims = [arc(0, 0, 0), arc(1, 0, Math.PI), arc(2, 50, 0), arc(3, 50, Math.PI)];
const handles = [100, 101, 102, 103] as unknown as ShapeHandle[];
const idOf = (handle: ShapeHandle) => (handle as unknown as number) - 100;
const middleOf = (id: number) => ({ x: rims[id].points[(STEPS / 2) * 3], y: rims[id].points[(STEPS / 2) * 3 + 1], z: 0 });

function run(pickedIds: number[], works: (leads: number[]) => boolean, carried: (id: number) => number[], deadline = Number.POSITIVE_INFINITY) {
  const bodies = new Map<number, number[]>();
  const points = new Map<number, { x: number; y: number }>();
  const tried: number[][] = [];
  const released = new Set<number>();
  let next = 1000;
  const cad = {
    curveParameters: () => ({ first: 0, last: 1 }),
    curvePointAtParam: (edge: ShapeHandle) => middleOf(idOf(edge)),
    makeVertex: (x: number, y: number) => {
      points.set((next += 1), { x, y });
      return next;
    },
    getSubShapes: (body: number) => bodies.get(body)!.map((id) => handles[id]),
    getBoundingBox: () => ({ xmin: -100, xmax: 100, ymin: -100, ymax: 100, zmin: -100, zmax: 100 }),
    distanceBetween: (vertex: number, edge: ShapeHandle) => {
      const middle = middleOf(idOf(edge));
      return Math.hypot(middle.x - points.get(vertex)!.x, middle.y - points.get(vertex)!.y);
    },
    release: (handle: number) => released.add(handle),
  } as unknown as OcctKernel;
  const treat = (edges: ShapeHandle[]) => {
    const ids = edges.map(idOf);
    tried.push(ids);
    if (!works(ids)) throw new Error("operation failed");
    const gone = new Set(ids.flatMap((id) => [id, ...carried(id)]));
    bodies.set((next += 1), [0, 1, 2, 3].filter((id) => !gone.has(id)));
    return next as unknown as ShapeHandle;
  };
  const result = treatFromOtherChainEdge(cad, rims, handles, pickedIds.map((id) => ({ id, edge: handles[id] })), 1, treat, () => true, () => false, deadline);
  const kept = [...bodies.keys()].filter((body) => !released.has(body));
  return { left: result ? bodies.get(result.component as unknown as number)! : null, edges: result?.edges.map(idOf), tried, kept };
}

const sibling = (id: number) => [id ^ 1];

describe("a refused treatment begun from another edge of the chain (#1980)", () => {
  it("finds the arcs of a rim as one chain", () => {
    expect(pickedEdgeChains(rims, [0])).toEqual([{ picked: [0], others: [1] }]);
    expect(pickedEdgeChains(rims, [1, 2, 0])).toEqual([{ picked: [1, 0], others: [] }, { picked: [2], others: [3] }]);
  });

  it("does the rim from the other arc", () => {
    const { left, edges, tried, kept } = run([0], (ids) => ids[0] === 1, sibling);
    expect(left).toEqual([2, 3]);
    expect(edges).toEqual([1, 0]);
    expect(tried).toEqual([[1]]);
    expect(kept).toHaveLength(1);
  });

  it("puts the other picked arc first when both are picked", () => {
    const { left, tried } = run([0, 1], (ids) => ids[0] === 1, sibling);
    expect(left).toEqual([2, 3]);
    expect(tried).toEqual([[1, 0]]);
  });

  it("turns only the rim that is refused", () => {
    const { left, tried, kept } = run([0, 2], (ids) => !ids.includes(0), sibling);
    expect(left).toEqual([]);
    expect(tried.at(-1)).toEqual([1, 2]);
    expect(kept).toHaveLength(1);
  });

  it("does not treat an edge nobody picked in place of the picked one", () => {
    const { left, kept } = run([0], (ids) => ids[0] === 1, () => []);
    expect(left).toBeNull();
    expect(kept).toHaveLength(0);
  });

  it("leaves the refusal standing when no start gets round, or the time is up", () => {
    expect(run([0], () => false, sibling).left).toBeNull();
    const late = run([0], (ids) => ids[0] === 1, sibling, Number.NEGATIVE_INFINITY);
    expect(late.left).toBeNull();
    expect(late.tried).toEqual([]);
  });

  it("tries nothing more when every chain works from where it was picked: then it is the combination", () => {
    const { left, tried } = run([0, 2], (ids) => ids.length === 1, sibling);
    expect(left).toBeNull();
    expect(tried).toEqual([[0], [2]]);
  });
});
