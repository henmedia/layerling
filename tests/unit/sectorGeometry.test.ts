import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildSectorOutline, createSectorGeometry, maxSectorEndRadius, normalizeSectorEndRadius, normalizeSectorInnerDiameter } from "@/lib/sectorGeometry";

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

describe("sector shape", () => {
  const cases: Array<[string, number, number, number, number]> = [
    // name, angle, inner diameter, end radius, expected volume at diameter 40, height 5
    ["full disc", 360, 0, 0, Math.PI * 20 * 20 * 5],
    ["full ring", 360, 20, 0, Math.PI * (20 * 20 - 10 * 10) * 5],
    ["quarter pie", 90, 0, 0, (Math.PI * 20 * 20 * 5) / 4],
    ["half ring", 180, 20, 0, (Math.PI * (20 * 20 - 10 * 10) * 5) / 2],
    ["ring segment, ends half round", 120, 20, 5, 0],
    ["pie, rounded corners", 200, 0, 3, 0],
  ];
  it.each(cases)("%s is closed and faces outward", (_name, angle, inner, end, expected) => {
    const geometry = createSectorGeometry({ width: 40, depth: 40, height: 5, sectorAngle: angle, sectorInnerDiameter: inner, sectorEndRadius: end });
    const { open, volume } = closedness(geometry);
    expect(open).toBe(0);
    expect(volume).toBeGreaterThan(0);
    if (expected > 0) expect(volume).toBeCloseTo(expected, -1);
  });

  it("rounds the ends of a ring segment into half circles at the largest end radius", () => {
    // Wall 5 mm: the ends become half circles of 2.5 mm, so the piece is a curved slot.
    const max = maxSectorEndRadius(40, 30, 90);
    expect(max).toBeCloseTo(2.5, 2);
    const geometry = createSectorGeometry({ width: 40, depth: 40, height: 5, sectorAngle: 90, sectorInnerDiameter: 30, sectorEndRadius: max });
    const { open, volume } = closedness(geometry);
    expect(open).toBe(0);
    // Middle arc of the slot (radius 17.5, a quarter turn) times the wall, minus the corners rounded off.
    const sharp = (Math.PI * (20 * 20 - 15 * 15) * 5) / 4;
    expect(volume).toBeLessThan(sharp);
    expect(volume).toBeGreaterThan(sharp - 2 * 2.5 * 2.5 * 5);
  });

  it("starts at twelve o'clock and runs clockwise seen from above", () => {
    const { outer } = buildSectorOutline(40, 0, 90, 0);
    // The quarter lies between twelve and three o'clock: right of the middle and towards the back (negative y).
    outer.forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(-1e-6);
      expect(p.y).toBeLessThanOrEqual(1e-6);
    });
  });

  it("keeps the bore and the ends' rounding inside what fits", () => {
    expect(normalizeSectorInnerDiameter(100, 40)).toBeCloseTo(39.8, 5);
    expect(normalizeSectorEndRadius(50, 40, 20, 120)).toBeLessThanOrEqual(5);
    expect(maxSectorEndRadius(40, 0, 360)).toBe(0);
  });
});
