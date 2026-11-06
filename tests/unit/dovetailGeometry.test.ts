import { describe, expect, it } from "vitest";
import { createDovetailGeometry, dovetailContourPoints, dovetailFlankAngle, maxDovetailNeckWidth, normalizeDovetailClearance, normalizeDovetailNeckWidth } from "@/lib/dovetailGeometry";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";

type P = { x: number; y: number };
const distanceToLine = (p: P, a: P, b: P) => Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y);

describe("dovetail", () => {
  it("fills its frame exactly as a body: wide end in front, neck at the back", () => {
    const [backLeft, backRight, frontRight, frontLeft] = dovetailContourPoints(30, 20, 15, 0);
    expect(frontRight.x - frontLeft.x).toBeCloseTo(30);
    expect(backRight.x - backLeft.x).toBeCloseTo(15);
    expect(frontLeft.y - backLeft.y).toBeCloseTo(20);
    expect(backLeft.y).toBeCloseTo(-10);
  });

  it("as a socket keeps exactly the clearance from every side of the tail", () => {
    const tail = dovetailContourPoints(30, 20, 15, 0);
    const socket = dovetailContourPoints(30, 20, 15, 0.2);
    for (let side = 0; side < 4; side += 1) {
      const a = tail[side];
      const b = tail[(side + 1) % 4];
      const c = socket[side];
      const d = socket[(side + 1) % 4];
      // The socket's side runs parallel to the tail's, 0.2 mm out.
      expect(distanceToLine(c, a, b)).toBeCloseTo(0.2, 6);
      expect(distanceToLine(d, a, b)).toBeCloseTo(0.2, 6);
    }
  });

  it("keeps the neck narrower than the wide end and the clearance within reason", () => {
    expect(normalizeDovetailNeckWidth(undefined, 30)).toBeCloseTo(15);
    expect(normalizeDovetailNeckWidth(40, 30)).toBeCloseTo(29.9);
    // #1360: a long, gently tapering tail - 146 wide, 145 at the neck - keeps its neck; 0.1 mm narrower is the limit.
    expect(normalizeDovetailNeckWidth(145, 146)).toBeCloseTo(145);
    expect(normalizeDovetailNeckWidth(146, 146)).toBeCloseTo(145.9);
    expect(maxDovetailNeckWidth(146)).toBeCloseTo(145.9);
    expect(maxDovetailNeckWidth(0.15)).toBeCloseTo(0.075);
    expect(dovetailFlankAngle(146, 24, 145)).toBeCloseTo(1.19, 1);
    expect(normalizeDovetailNeckWidth(-5, 30)).toBeCloseTo(0.1);
    expect(normalizeDovetailClearance(undefined)).toBe(0.2);
    expect(normalizeDovetailClearance(5)).toBe(2);
    expect(dovetailFlankAngle(30, 20, 15)).toBeCloseTo(20.56, 1);
  });

  it("builds a closed body", () => {
    const geometry = createDovetailGeometry({ width: 30, depth: 20, height: 10, dovetailNeckWidth: 15 });
    const position = geometry.getAttribute("position");
    const key = (i: number) => [position.getX(i), position.getY(i), position.getZ(i)].map((v) => v.toFixed(4)).join(",");
    const edges = new Map<string, number>();
    for (let i = 0; i < position.count; i += 3) {
      for (let k = 0; k < 3; k += 1) {
        const a = key(i + k);
        const b = key(i + ((k + 1) % 3));
        const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every((count) => count === 2)).toBe(true);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.max.y).toBeCloseTo(10);
  });

  it("is in the shape list and goes to the edge tool as an exact body", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "dovetail");
    expect(asset).toBeDefined();
    const shape = makeShapeFromAsset(asset!);
    expect(shape.dovetailNeckWidth).toBeCloseTo(15);
    expect(shape.dovetailClearance).toBe(0.2);
    const profile = cadModifierProfileForShape({ ...shape, x: 0, z: 0, elevation: 0 });
    expect(profile?.loops[0].segments).toHaveLength(4);
  });
});
