import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createFlatSpringGeometry,
  flatSpringProfileLoops,
  flatSpringSettings,
  flatSpringTurnLimits,
  flatSpringWireLimits,
} from "@/lib/flatSpringGeometry";
import { createSpringGeometry } from "@/lib/springGeometry";
import { cadModifierProfileForShape, cadModifierSpringForShape } from "@/lib/cadProfileExtrusion";
import { profileArea, profileLoopBounds, validateCadProfile } from "@/lib/cadProfileSolid";
import type { CadModifierProfileLoop } from "@/lib/cadModifierTypes";
import type { FlatSpringEnds, FlatSpringPattern, WorkplaneShape } from "@/types/layerling";

const PATTERNS: FlatSpringPattern[] = ["round", "zigzag", "square"];
const ENDS: FlatSpringEnds[] = ["eye", "tab", "none"];

type Point = { x: number; z: number };

/** The loop as a fine polygon. */
function sampled(loop: CadModifierProfileLoop): Point[] {
  const points: Point[] = [{ x: loop.x, z: loop.z }];
  loop.segments.forEach((segment) => {
    if (segment.kind === "arc") {
      for (let step = 1; step <= 48; step += 1) {
        const angle = segment.start + ((segment.end - segment.start) * step) / 48;
        points.push({ x: segment.cx + segment.rx * Math.cos(angle), z: segment.cz + segment.rz * Math.sin(angle) });
      }
    } else {
      points.push({ x: segment.x, z: segment.z });
    }
  });
  return points;
}

/** Whether two edges of the polygon cross anywhere but at shared corners. */
function selfCrosses(points: Point[]) {
  const edges = points.slice(0, -1).map((point, index) => [point, points[index + 1]] as const);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 2; j < edges.length; j += 1) {
      if (i === 0 && j === edges.length - 1) continue;
      const [a, b] = edges[i];
      const [c, d] = edges[j];
      const d1 = cross(c, d, a);
      const d2 = cross(c, d, b);
      const d3 = cross(a, b, c);
      const d4 = cross(a, b, d);
      if (((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9))) return true;
    }
  }
  return false;
}

function flatShape(fields: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "flat", name: "Spring", kind: "spring", color: "#18b99a", x: 0, z: 0, size: 60, width: 60, depth: 16, height: 4,
    rotation: 0, springForm: "flat", springTurns: 4, springWire: 2, ...fields,
  } as WorkplaneShape;
}

describe("flat spring (#1076)", () => {
  for (const pattern of PATTERNS) {
    for (const ends of ENDS) {
      it(`${pattern} with ${ends} ends fills its box with one clean outline`, () => {
        const loops = flatSpringProfileLoops({ width: 60, depth: 16, height: 4, springTurns: 4, springWire: 2, springPattern: pattern, springEnds: ends });
        expect(loops.length).toBe(ends === "eye" ? 3 : 1);
        validateCadProfile({ kind: "extrusion", loops, height: 4 });
        const [minX, minZ, maxX, maxZ] = profileLoopBounds(loops[0]);
        expect(minX).toBeCloseTo(-30, 4);
        expect(maxX).toBeCloseTo(30, 4);
        expect(minZ).toBeCloseTo(-8, 3);
        expect(maxZ).toBeCloseTo(8, 3);
        expect(selfCrosses(sampled(loops[0]))).toBe(false);
      });
    }
  }

  it("draws the mesh as the outline pushed up, with the same area", () => {
    for (const pattern of PATTERNS) {
      const options = { width: 60, depth: 16, height: 4, springTurns: 5, springWire: 2, springPattern: pattern, springEnds: "eye" as const, springQuality: 96 };
      const geometry = createFlatSpringGeometry(options);
      const box = geometry.boundingBox!;
      expect(box.min.y).toBeCloseTo(0, 5);
      expect(box.max.y).toBeCloseTo(4, 5);
      expect(box.max.x - box.min.x).toBeCloseTo(60, 2);
      expect(box.max.z - box.min.z).toBeCloseTo(16, 1);
      const position = geometry.getAttribute("position");
      let volume = 0;
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c = new THREE.Vector3();
      for (let index = 0; index < position.count; index += 3) {
        a.fromBufferAttribute(position, index);
        b.fromBufferAttribute(position, index + 1);
        c.fromBufferAttribute(position, index + 2);
        volume += a.dot(b.clone().cross(c)) / 6;
      }
      const area = profileArea({ kind: "extrusion", loops: flatSpringProfileLoops(options), height: 4 });
      // Outward faces give a positive volume; the chords cut a little off the arcs.
      expect(volume).toBeGreaterThan(0);
      expect(volume / (area * 4)).toBeGreaterThan(0.995);
      expect(volume / (area * 4)).toBeLessThan(1.001);
    }
  });

  it("goes through the coil's builder when the form is flat", () => {
    const geometry = createSpringGeometry({ width: 60, depth: 16, height: 4, springForm: "flat" });
    expect(geometry.boundingBox!.max.y).toBeCloseTo(4, 5);
    expect(geometry.boundingBox!.max.x).toBeCloseTo(30, 1);
  });

  it("keeps the band and the turns within what fits", () => {
    const wire = flatSpringWireLimits(60, 16, "round", "eye");
    expect(wire.max).toBeLessThanOrEqual(16 / 3);
    expect(wire.max).toBeGreaterThan(2);
    const turns = flatSpringTurnLimits(60, 16, 2, "round", "eye");
    expect(turns.max).toBeGreaterThan(4);
    const settings = flatSpringSettings({ springTurns: 999, springWire: 99 }, 60, 16);
    expect(settings.wire).toBeCloseTo(wire.max, 5);
    expect(flatSpringProfileLoops({ width: 60, depth: 16, height: 4, springTurns: settings.turns, springWire: settings.wire }).length).toBe(3);
    // A short strip still gets a body, with as few turns as it needs.
    const short = flatSpringSettings({ springTurns: 20 }, 15, 6);
    expect(short.turns).toBeGreaterThanOrEqual(1);
    validateCadProfile({ kind: "extrusion", loops: flatSpringProfileLoops({ width: 15, depth: 6, height: 2, springTurns: short.turns, springWire: short.wire }), height: 2 });
  });

  it("becomes an exact extruded profile, and the coil stays with springSolid", () => {
    const profile = cadModifierProfileForShape(flatShape());
    expect(profile?.kind).toBe("extrusion");
    expect(profile?.height).toBe(4);
    expect(cadModifierSpringForShape(flatShape())).toBeNull();
    const coil = flatShape({ springForm: undefined, width: 20, depth: 20, height: 30, springWire: 3 });
    expect(cadModifierProfileForShape(coil)).toBeNull();
    expect(cadModifierSpringForShape(coil)).not.toBeNull();
  });
});
