import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import {
  createHirthGeometry,
  hirthCrestAngle,
  hirthFlankAngle,
  hirthGentleFlankAngle,
  hirthMeasures,
  hirthRightAngleToothHeight,
  hirthRootAngle,
  hirthSplit,
  hirthSurfaceY,
  normalizeHirthToothHeight,
} from "@/lib/hirthGeometry";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
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

  it("starts with right-angled teeth and lets the roots reach the bottom at the rim (Discussion #1320)", () => {
    const toothHeight = hirthRightAngleToothHeight(40, 40, 24);
    expect(toothHeight).toBeCloseTo(2.6, 6);
    expect(hirthFlankAngle(40, 40, 24, Math.PI * 20 / 24)).toBeCloseTo(90, 6);
    expect(normalizeHirthToothHeight(undefined, 40, 40, 10, 24)).toBeCloseTo(2.6, 6);
    expect(normalizeHirthToothHeight(2.9, 40, 40, 3, 24)).toBeCloseTo(2.9, 6);
    expect(normalizeHirthToothHeight(3.5, 40, 40, 3, 24)).toBeCloseTo(3, 6);
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

describe("Hirth joint with saw teeth (Discussion #1320)", () => {
  const saw = { teeth: 24, toothSize: 2.6, centerHoleSize: 10, hirthSteepFlank: 90 };

  it("puts each root right under its crest for a 90 degree flank, half a tooth on for symmetric teeth", () => {
    expect(hirthSplit(40, 40, 24, 2.6)).toBe(0.5);
    expect(hirthSplit(40, 40, 24, 2.6, 90)).toBe(0);
    expect(hirthSplit(40, 40, 24, 2.6, 90, true)).toBe(1);
    // A 60 degree flank runs 2.6 / tan 60 at the rim, of a tooth 2 pi 20 / 24 long.
    expect(hirthSplit(40, 40, 24, 2.6, 60)).toBeCloseTo(2.6 / Math.tan(Math.PI / 3) / ((2 * Math.PI * 20) / 24), 9);
    // A steep flank that would take more than half a tooth gives symmetric teeth.
    expect(hirthSplit(40, 40, 24, 5, 45)).toBe(0.5);
    // The gentle flank takes the whole tooth beside a step.
    expect(hirthGentleFlankAngle(40, 40, 24, 2.6, 0)).toBeCloseTo((Math.atan2(2.6, (2 * Math.PI * 20) / 24) * 180) / Math.PI, 9);
  });

  it("is closed and faces outwards, with a step or a steep flank, either way round, with a bore and without, and with the roots at the bottom", () => {
    for (const hirthSteepFlank of [90, 70, 45]) {
      for (const hirthReverse of [false, true]) {
        for (const centerHoleSize of [10, 0]) {
          for (const [height, toothSize] of [[10, 2.6], [3, 3]]) {
            const geometry = createHirthGeometry(40, height, 40, { ...saw, hirthSteepFlank, hirthReverse, centerHoleSize, toothSize });
            expect(isClosed(geometry), `${hirthSteepFlank} ${hirthReverse} ${centerHoleSize} ${height}`).toBe(true);
            expect(signedVolume(geometry)).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("holds the same volume as symmetric teeth: half the space between crests and roots", () => {
    const measures = hirthMeasures({ ...saw, height: 10 }, 40, 40);
    const expected = Math.PI * (20 * 20 - 5 * 5) * measures.apexY;
    for (const hirthReverse of [false, true]) {
      expect(signedVolume(createHirthGeometry(40, 10, 40, { ...saw, hirthReverse }))).toBeCloseTo(expected, -1);
    }
  });

  it("has a step from crest to root, rising the whole tooth to the next crest, or falling that way when reversed", () => {
    for (const hirthReverse of [false, true]) {
      const measures = hirthMeasures({ ...saw, hirthReverse, height: 10 }, 40, 40);
      const step = (2 * Math.PI) / 24;
      const crest = hirthCrestAngle(24, 3, measures.split);
      const at = (angle: number) => hirthSurfaceY(measures, 20 * Math.cos(angle), 20 * Math.sin(angle));
      // The step stands at the crest: the top rises slowly up to it and drops there, or (reversed) climbs there and falls slowly.
      expect(at(crest - 1e-6)).toBeCloseTo(hirthReverse ? 7.4 : 10, 3);
      expect(at(crest + 1e-6)).toBeCloseTo(hirthReverse ? 10 : 7.4, 3);
      expect(at(crest + step / 2)).toBeCloseTo(8.7, 3);
    }
  });

  it("keeps the steep flank between 45 and 90 degrees in saved defaults and AI commands, and 0 as symmetric teeth", () => {
    const hirth = (source: Record<string, unknown>) => normalizeShapeCustomizations({ hirth: source }).hirth ?? {};
    expect(hirth({ hirthSteepFlank: 30 }).hirthSteepFlank).toBe(45);
    expect(hirth({ hirthSteepFlank: 120 }).hirthSteepFlank).toBe(90);
    expect(hirth({ hirthSteepFlank: 75, hirthReverse: true })).toMatchObject({ hirthSteepFlank: 75, hirthReverse: true });
    expect(hirth({ hirthSteepFlank: 0 }).hirthSteepFlank).toBe(0);
    expect(hirthSplit(40, 40, 24, 2.6, 0)).toBe(0.5);
  });

  it("keeps its saw teeth through a saved design file", async () => {
    const base = { name: "Hirth Joint", kind: "hirth", color: "#7d8f9e", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 40, height: 3, rotation: 0, teeth: 24, toothSize: 3, centerHoleSize: 10 };
    const shapes = [
      canonicalizeShape({ ...base, id: "saw", hirthSteepFlank: 90 } as WorkplaneShape),
      canonicalizeShape({ ...base, id: "back", x: 50, hirthSteepFlank: 70, hirthReverse: true } as WorkplaneShape),
    ];
    const exported = await exportLylProject({
      projectId: "hirth", projectName: "Hirth", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = await importLylProject(exported);
    const byId = new Map(restored.shapes.map((shape) => [shape.id, shape]));
    expect(byId.get("saw")).toMatchObject({ hirthSteepFlank: 90, toothSize: 3, height: 3 });
    expect(byId.get("back")).toMatchObject({ hirthSteepFlank: 70, hirthReverse: true });
  });

  it("locks into itself turned over front to back, any steep flank, either way round", () => {
    for (const teeth of [6, 23, 24, 60]) {
      for (const hirthSteepFlank of [90, 75, 60]) {
        for (const hirthReverse of [false, true]) {
          const measures = hirthMeasures({ teeth, hirthSteepFlank, hirthReverse, height: 8 }, 30, 30);
          for (let step = 0; step < 200; step += 1) {
            const angle = (step / 200) * 2 * Math.PI + 0.0013;
            const radius = 3 + (step % 12);
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            expect(hirthSurfaceY(measures, x, z) + hirthSurfaceY(measures, x, -z)).toBeCloseTo(2 * measures.apexY, 6);
          }
        }
      }
    }
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
