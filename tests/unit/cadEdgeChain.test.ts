import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { tangentCadEdgeChain } from "@/lib/cadEdgeChain";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";

function edge(id: number, points: number[]): CadModifierEdge {
  return { id, points, display: true, selectable: true, angle: 90, boundary: false, manifold: true };
}

/**
 * The search as it was before the grid (one pass over all edges for every edge reached, one search
 * per start): the new one has to find exactly the same edges.
 */
function oldChain(edges: CadModifierEdge[], startId: number, allowedIds: Set<number>) {
  const end = (candidate: CadModifierEdge, which: "start" | "end") => {
    const offset = which === "start" ? 0 : candidate.points.length - 3;
    return new THREE.Vector3(candidate.points[offset], candidate.points[offset + 1], candidate.points[offset + 2]);
  };
  const tangentAt = (candidate: CadModifierEdge, point: THREE.Vector3) => {
    const start = end(candidate, "start");
    const last = end(candidate, "end");
    if (point.distanceToSquared(start) <= point.distanceToSquared(last)) return new THREE.Vector3(candidate.points[3], candidate.points[4], candidate.points[5]).sub(start).normalize();
    const offset = Math.max(0, candidate.points.length - 6);
    return new THREE.Vector3(candidate.points[offset], candidate.points[offset + 1], candidate.points[offset + 2]).sub(last).normalize();
  };
  const box = new THREE.Box3();
  edges.forEach((candidate) => {
    for (let index = 0; index + 2 < candidate.points.length; index += 3) box.expandByPoint(new THREE.Vector3(candidate.points[index], candidate.points[index + 1], candidate.points[index + 2]));
  });
  const tolerance = Math.max(1e-6, Math.min(0.01, box.getSize(new THREE.Vector3()).length() * 1e-5));
  const byId = new Map(edges.map((candidate) => [candidate.id, candidate]));
  const selected = new Set([startId]);
  const queue = [startId];
  while (queue.length) {
    const current = byId.get(queue.shift()!)!;
    const ends = [end(current, "start"), end(current, "end")];
    edges.forEach((candidate) => {
      if (selected.has(candidate.id) || !allowedIds.has(candidate.id)) return;
      const others = [end(candidate, "start"), end(candidate, "end")];
      const shared = ends.find((point) => others.some((other) => point.distanceTo(other) <= tolerance));
      if (!shared) return;
      const deviation = (Math.acos(Math.min(1, Math.abs(tangentAt(current, shared).dot(tangentAt(candidate, shared))))) * 180) / Math.PI;
      if (deviation <= 16) {
        selected.add(candidate.id);
        queue.push(candidate.id);
      }
    });
  }
  return [...selected];
}

/** A 64-sided rim at two heights joined by vertical seams, and a rounded rectangle of lines and arcs. */
function sampleEdges() {
  const edges: CadModifierEdge[] = [];
  let id = 0;
  const sides = 64;
  for (const y of [0, 30]) {
    for (let side = 0; side < sides; side += 1) {
      const a = (side / sides) * Math.PI * 2;
      const b = ((side + 1) / sides) * Math.PI * 2;
      edges.push(edge(id++, [20 * Math.cos(a), y, 20 * Math.sin(a), 20 * Math.cos(b), y, 20 * Math.sin(b)]));
    }
  }
  for (let side = 0; side < sides; side += 8) {
    const a = (side / sides) * Math.PI * 2;
    edges.push(edge(id++, [20 * Math.cos(a), 0, 20 * Math.sin(a), 20 * Math.cos(a), 30, 20 * Math.sin(a)]));
  }
  // Rounded rectangle 40 x 20 with corner radius 5 at y = 50, its arcs as polylines.
  const corners: Array<[number, number, number]> = [[15, 5, 0], [-15, 5, Math.PI / 2], [-15, -5, Math.PI], [15, -5, Math.PI * 1.5]];
  corners.forEach(([cx, cz, from], index) => {
    const arc: number[] = [];
    for (let step = 0; step <= 6; step += 1) {
      const angle = from + (step / 6) * (Math.PI / 2);
      arc.push(cx + 5 * Math.cos(angle), 50, cz + 5 * Math.sin(angle));
    }
    edges.push(edge(id++, arc));
    const [nx, nz, next] = corners[(index + 1) % 4];
    edges.push(edge(id++, [arc[arc.length - 3], 50, arc[arc.length - 1], nx + 5 * Math.cos(next), 50, nz + 5 * Math.sin(next)]));
  });
  return edges;
}

describe("tangent chains of CAD edges", () => {
  it("finds the same edges as the search over every edge, from every start", () => {
    const edges = sampleEdges();
    const allowed = new Set(edges.filter((candidate) => candidate.id % 7 !== 3).map((candidate) => candidate.id));
    for (const start of edges) {
      expect(tangentCadEdgeChain(edges, start.id, allowed).sort((a, b) => a - b)).toEqual(oldChain(edges, start.id, allowed).sort((a, b) => a - b));
    }
  });

  it("joins the chains of several starts in one pass", () => {
    const edges = sampleEdges();
    const allowed = new Set(edges.map((candidate) => candidate.id));
    const starts = [0, 64, edges.length - 1];
    const union = new Set(starts.flatMap((start) => oldChain(edges, start, allowed)));
    expect(new Set(tangentCadEdgeChain(edges, starts, allowed))).toEqual(union);
    // The rim runs all the way round, the seams stop it from climbing; the rounded rectangle is one chain.
    expect(oldChain(edges, 0, allowed).length).toBe(64);
    expect(oldChain(edges, edges.length - 1, allowed).length).toBe(8);
  });
});
