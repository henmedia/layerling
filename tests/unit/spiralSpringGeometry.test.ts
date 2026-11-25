import { describe, expect, it } from "vitest";
import { createFlatSpringGeometry, flatSpringProfileLoops, flatSpringSettings } from "@/lib/flatSpringGeometry";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { profileLoopBounds, validateCadProfile } from "@/lib/cadProfileSolid";
import {
  spiralSpringDepth,
  spiralSpringDimensions,
  spiralSpringGap,
  spiralSpringInnerLimits,
  spiralSpringSettings,
  spiralSpringTurnLimits,
  spiralSpringWireLimits,
} from "@/lib/spiralSpringGeometry";
import type { CadModifierProfileLoop } from "@/lib/cadModifierTypes";
import type { FlatSpringEnds, WorkplaneShape } from "@/types/layerling";

const ENDS: FlatSpringEnds[] = ["eye", "tab", "none"];
type Point = { x: number; z: number };

function sampled(loop: CadModifierProfileLoop, steps = 24): Point[] {
  const points: Point[] = [{ x: loop.x, z: loop.z }];
  loop.segments.forEach((segment) => {
    if (segment.kind === "arc") {
      for (let step = 1; step <= steps; step += 1) {
        const angle = segment.start + ((segment.end - segment.start) * step) / steps;
        points.push({ x: segment.cx + segment.rx * Math.cos(angle), z: segment.cz + segment.rz * Math.sin(angle) });
      }
    } else points.push({ x: segment.x, z: segment.z });
  });
  return points;
}

/** Every segment starts where the one before ended, the loop closes, and no two edges cross. */
function expectClean(loop: CadModifierProfileLoop) {
  let at: Point = loop;
  loop.segments.forEach((segment) => {
    if (segment.kind === "arc") {
      expect(segment.cx + segment.rx * Math.cos(segment.start)).toBeCloseTo(at.x, 6);
      expect(segment.cz + segment.rz * Math.sin(segment.start)).toBeCloseTo(at.z, 6);
      expect(segment.cx + segment.rx * Math.cos(segment.end)).toBeCloseTo(segment.x, 6);
    }
    at = segment;
  });
  expect(at.x).toBeCloseTo(loop.x, 6);
  expect(at.z).toBeCloseTo(loop.z, 6);
  const points = sampled(loop);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  let crossings = 0;
  for (let i = 0; i + 1 < points.length; i += 1) {
    for (let j = i + 2; j + 1 < points.length; j += 1) {
      const [a, b, c, d] = [points[i], points[i + 1], points[j], points[j + 1]];
      const [d1, d2, d3, d4] = [cross(c, d, a), cross(c, d, b), cross(a, b, c), cross(a, b, d)];
      if (((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9))) crossings += 1;
    }
  }
  expect(crossings).toBe(0);
}

describe("spiral spring (Discussion #412)", () => {
  for (const springEnds of ENDS) {
    it(`with ${springEnds} ends is one clean outline that fills its box`, () => {
      for (const springHand of ["right", "left"] as const) {
        const fields = { springEnds, springHand };
        const box = spiralSpringDimensions(fields);
        const loops = flatSpringProfileLoops({ ...box, ...fields, springPattern: "spiral" });
        expect(loops.length).toBe(springEnds === "eye" ? 3 : 1);
        validateCadProfile({ kind: "extrusion", loops, height: 5 });
        loops.forEach(expectClean);
        const [minX, minZ, maxX, maxZ] = profileLoopBounds(loops[0]);
        expect([minX, minZ, maxX, maxZ].map((value) => Math.round(value * 100) / 100)).toEqual([-box.width / 2, -box.depth / 2, box.width / 2, box.depth / 2].map((value) => Math.round(value * 100) / 100));
      }
    });

    it(`with ${springEnds} ends stays clean at every limit`, () => {
      for (const width of [8, 20, 50, 160]) {
        const wires = spiralSpringWireLimits(width, springEnds);
        for (const wire of [wires.min, (wires.min + wires.max) / 2, wires.max]) {
          const most = spiralSpringTurnLimits(width, wire, springEnds).max;
          for (const turns of [1, Math.ceil(most / 2), most]) {
            const inner = spiralSpringInnerLimits(width, wire, turns, springEnds);
            for (const value of [inner.min, inner.max]) {
              const fields = { springEnds, springWire: wire, springTurns: turns, springInner: value };
              expect(spiralSpringGap(fields, width)).toBeGreaterThan(wire * 0.33 - 1e-6);
              const loops = flatSpringProfileLoops({ width, depth: spiralSpringDepth(fields, width), height: 2, ...fields, springPattern: "spiral" });
              loops.forEach(expectClean);
            }
          }
        }
      }
    });
  }

  it("keeps its settings within what fits", () => {
    const fitted = spiralSpringSettings({ springWire: 3, springTurns: 40, springInner: 400 }, 50);
    expect(fitted.turns).toBeLessThan(40);
    expect(fitted.inner).toBeLessThan(50);
    expect(flatSpringSettings({ springPattern: "spiral", springWire: 1.2, springTurns: 5, springInner: 8 }, 50, 50)).toMatchObject({ pattern: "spiral", wire: 1.2, turns: 5, inner: 8 });
  });

  it("shows as a closed mesh as tall as the spring and has an exact profile", () => {
    const box = spiralSpringDimensions();
    const geometry = createFlatSpringGeometry({ ...box, springPattern: "spiral" });
    expect(geometry.boundingBox!.max.y).toBeCloseTo(box.height, 5);
    expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBeGreaterThan(box.width * 0.98);
    const shape = { id: "s", name: "Spring", kind: "spring", color: "#18b99a", x: 0, z: 0, size: 50, ...box, rotation: 0, springForm: "flat", springPattern: "spiral" } as WorkplaneShape;
    expect(cadModifierProfileForShape(shape)).not.toBeNull();
  });
});
