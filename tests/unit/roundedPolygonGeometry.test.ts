import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createPrismGeometry } from "@/lib/prismGeometry";
import { createRoundedPolygonGeometry, maxPolygonCornerRadius, polygonCornerDragPatch, polygonCorners, roundedPolygonOutline } from "@/lib/roundedPolygonGeometry";
import { polygonProfileLoops } from "@/lib/cadProfileExtrusion";

/** Welds the positions and checks every edge is shared by exactly two triangles, once each way. */
function closedness(geometry: THREE.BufferGeometry) {
  const pos = geometry.getAttribute("position");
  const key = (i: number) => `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
  const index = geometry.getIndex();
  const count = index ? index.count : pos.count;
  const at = (i: number) => (index ? index.getX(i) : i);
  const edges = new Map<string, number>();
  let volume = 0;
  for (let t = 0; t < count; t += 3) {
    const ids = [at(t), at(t + 1), at(t + 2)];
    const keys = ids.map(key);
    for (let k = 0; k < 3; k += 1) {
      const a = keys[k];
      const b = keys[(k + 1) % 3];
      edges.set(`${a}|${b}`, (edges.get(`${a}|${b}`) ?? 0) + 1);
    }
    const [p, q, r] = ids.map((i) => new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    volume += p.dot(q.clone().cross(r)) / 6;
  }
  let open = 0;
  edges.forEach((n, edge) => {
    const [a, b] = edge.split("|");
    if (n !== 1 || edges.get(`${b}|${a}`) !== 1) open += 1;
  });
  return { open, volume };
}

describe("polygon with rounded corners", () => {
  it.each([3, 4, 5, 6, 8])("a %i-sided polygon stays closed with its corners rounded", (sides) => {
    const max = maxPolygonCornerRadius(30, 30, sides);
    for (const radius of [0.5, max / 2, max]) {
      const { open, volume } = closedness(createRoundedPolygonGeometry(30, 5, 30, sides, radius));
      expect(open).toBe(0);
      expect(volume).toBeGreaterThan(0);
    }
  });

  it("has its corners where the plain polygon has them", () => {
    const prism = createPrismGeometry(30, 5, 26, 6);
    const pos = prism.getAttribute("position");
    const prismCorners = new Set<string>();
    for (let i = 0; i < pos.count; i += 1) if (Math.abs(pos.getY(i) - 5) < 1e-4 && Math.hypot(pos.getX(i), pos.getZ(i)) > 1) prismCorners.add(`${pos.getX(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`);
    polygonCorners(30, 26, 6).forEach((corner) => expect(prismCorners.has(`${corner.x.toFixed(3)},${corner.y.toFixed(3)}`)).toBe(true));
  });

  it("rounds a triangle's corners less than the area it had and keeps the radius inside what fits", () => {
    // An equilateral triangle: as wide as its side, as deep as its height.
    const width = 30;
    const depth = (30 * Math.sqrt(3)) / 2;
    const sharp = closedness(createRoundedPolygonGeometry(width, 5, depth, 3, 0)).volume;
    const round = closedness(createRoundedPolygonGeometry(width, 5, depth, 3, 3)).volume;
    expect(round).toBeLessThan(sharp);
    // Each corner of an equilateral triangle loses (tan 60° - π/3) r² of area.
    expect(sharp - round).toBeCloseTo(3 * (Math.tan(Math.PI / 3) - Math.PI / 3) * 9 * 5, 0);
    expect(roundedPolygonOutline(30, 30, 3, 1000).length).toBeGreaterThan(3);
  });

  it("gives the exact outline true arcs and the corner dot a radius that follows the pull", () => {
    const loop = polygonProfileLoops(30, 30, 6, 2)[0];
    expect(loop.segments.filter((segment) => segment.kind === "arc")).toHaveLength(6);
    const grown = polygonCornerDragPatch({ kind: "polygon", width: 30, depth: 30, size: 30, sides: 6, cornerFillet: 1 }, 1);
    expect(grown.cornerFillet).toBeGreaterThan(1);
    const shrunk = polygonCornerDragPatch({ kind: "polygon", width: 30, depth: 30, size: 30, sides: 6, cornerFillet: 1 }, -10);
    expect(shrunk.cornerFillet).toBe(0);
  });
});
