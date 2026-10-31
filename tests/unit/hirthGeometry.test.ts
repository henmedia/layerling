import { describe, expect, it } from "vitest";
import {
  createHirthGeometry,
  hirthCrestAngle,
  hirthFlankAngle,
  hirthMeasures,
  hirthRightAngleToothHeight,
  hirthRootAngle,
  hirthSurfaceY,
  normalizeHirthToothHeight,
} from "@/lib/hirthGeometry";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

function triangles(geometry: ReturnType<typeof createHirthGeometry>) {
  const position = geometry.getAttribute("position");
  const result: Array<[number, number, number][]> = [];
  for (let index = 0; index < position.count; index += 3) {
    result.push([0, 1, 2].map((offset) => [position.getX(index + offset), position.getY(index + offset), position.getZ(index + offset)] as [number, number, number]));
  }
  return result;
}

function signedVolume(geometry: ReturnType<typeof createHirthGeometry>) {
  return triangles(geometry).reduce((total, [a, b, c]) => total + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
}

/** Every edge, welded to 1e-5 mm, belongs to exactly two triangles, once each way. */
function isClosed(geometry: ReturnType<typeof createHirthGeometry>) {
  const key = (p: [number, number, number]) => p.map((value) => Math.round(value * 1e5)).join(",");
  const edges = new Map<string, number>();
  for (const tri of triangles(geometry)) {
    for (let index = 0; index < 3; index += 1) {
      const a = key(tri[index]);
      const b = key(tri[(index + 1) % 3]);
      if (a === b) continue;
      edges.set(`${a}|${b}`, (edges.get(`${a}|${b}`) ?? 0) + 1);
    }
  }
  return [...edges].every(([edge, count]) => {
    const [a, b] = edge.split("|");
    return count === 1 && edges.get(`${b}|${a}`) === 1;
  });
}

describe("Hirth joint geometry (#1016)", () => {
  const shape = { teeth: 24, toothSize: 2.6, centerHoleSize: 10 };

  it("stands on y = 0, reaches the height with its crests and fills the footprint", () => {
    const points = triangles(createHirthGeometry(40, 10, 40, shape)).flat();
    expect(Math.min(...points.map((p) => p[1]))).toBeCloseTo(0, 6);
    expect(Math.max(...points.map((p) => p[1]))).toBeCloseTo(10, 5);
    expect(Math.max(...points.map((p) => p[0]))).toBeCloseTo(20, 1);
    expect(Math.max(...points.map((p) => p[2]))).toBeCloseTo(20, 1);
  });

  it("is closed and faces outwards, with a bore and without", () => {
    for (const centerHoleSize of [10, 0]) {
      const geometry = createHirthGeometry(40, 10, 40, { ...shape, centerHoleSize });
      expect(isClosed(geometry)).toBe(true);
      expect(signedVolume(geometry)).toBeGreaterThan(0);
    }
  });

  it("holds the volume of a ring of its base plus half its teeth", () => {
    // The teeth fill half the space between crests and roots at every radius.
    const measures = hirthMeasures({ ...shape, height: 10 }, 40, 40);
    const ring = Math.PI * (20 * 20 - 5 * 5);
    const expected = ring * measures.apexY;
    expect(signedVolume(createHirthGeometry(40, 10, 40, shape))).toBeCloseTo(expected, -1);
  });

  it("has its crests at the full height and its roots a tooth lower at the rim, meeting at one point on the axis", () => {
    const measures = hirthMeasures({ ...shape, height: 10 }, 40, 40);
    for (let index = 0; index < 24; index += 1) {
      const crest = hirthCrestAngle(24, index);
      const root = hirthRootAngle(24, index);
      expect(hirthSurfaceY(measures, 20 * Math.cos(crest), 20 * Math.sin(crest))).toBeCloseTo(10, 6);
      expect(hirthSurfaceY(measures, 20 * Math.cos(root), 20 * Math.sin(root))).toBeCloseTo(10 - 2.6, 6);
      expect(hirthSurfaceY(measures, 1e-6 * Math.cos(crest), 1e-6 * Math.sin(crest))).toBeCloseTo(measures.apexY, 4);
    }
  });

  it("locks into itself turned over front to back", () => {
    // Turned 180 degrees about x, (x, z) goes to (x, -z) and the top faces down: the two tops meet
    // everywhere when s(x, z) + s(x, -z) is the same all over.
    for (const teeth of [6, 23, 24, 60]) {
      const measures = hirthMeasures({ teeth, height: 8 }, 30, 30);
      for (let step = 0; step < 200; step += 1) {
        const angle = (step / 200) * 2 * Math.PI + 0.001;
        const radius = 3 + (step % 12);
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        expect(hirthSurfaceY(measures, x, z) + hirthSurfaceY(measures, x, -z)).toBeCloseTo(2 * measures.apexY, 6);
      }
    }
  });

  it("starts with right-angled teeth and keeps a base under the roots", () => {
    const toothHeight = hirthRightAngleToothHeight(40, 40, 24);
    expect(toothHeight).toBeCloseTo(2.6, 6);
    expect(hirthFlankAngle(40, 40, 24, Math.PI * 20 / 24)).toBeCloseTo(90, 6);
    expect(normalizeHirthToothHeight(undefined, 40, 40, 10, 24)).toBeCloseTo(2.6, 6);
    expect(normalizeHirthToothHeight(9.9, 40, 40, 10, 24)).toBeCloseTo(9.6, 6);
  });

  it("stretches the teeth on an oval footprint and keeps the bore round", () => {
    const points = triangles(createHirthGeometry(50, 10, 30, shape)).flat();
    expect(Math.max(...points.map((p) => p[0]))).toBeCloseTo(25, 1);
    expect(Math.max(...points.map((p) => p[2]))).toBeCloseTo(15, 1);
    const innermost = Math.min(...points.map((p) => Math.hypot(p[0], p[2])));
    expect(innermost).toBeCloseTo(5, 4);
    expect(isClosed(createHirthGeometry(50, 10, 30, shape))).toBe(true);
  });
});

describe("Hirth joint size (#1016)", () => {
  it("stays round: stretched, its teeth would no longer interlock all round", () => {
    const joint = canonicalizeShape({
      id: "h1", name: "Hirth Joint", kind: "hirth", color: "#7d8f9e", x: 0, z: 0, elevation: 0,
      size: 54, width: 54, depth: 30, height: 10, rotation: 0, teeth: 24,
    } as WorkplaneShape);
    expect(joint.width).toBe(54);
    expect(joint.depth).toBe(54);
    expect(joint.size).toBe(54);
  });
});
