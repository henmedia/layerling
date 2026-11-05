import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";
import {
  createPulleyGeometry,
  GT2_GROOVE_DEPTH,
  MAX_PULLEY_TEETH,
  MIN_PULLEY_TEETH,
  pulleyArcPoint,
  pulleyFootprint,
  pulleyFromSize,
  pulleyMeasures,
  pulleyOutsideDiameter,
  pulleySizedPatch,
  pulleyToothArcs,
} from "@/lib/pulleyGeometry";

type Geometry = ReturnType<typeof createPulleyGeometry>;

function triangles(geometry: Geometry) {
  const position = geometry.getAttribute("position");
  const result: Array<[number, number, number][]> = [];
  for (let index = 0; index < position.count; index += 3) {
    result.push([0, 1, 2].map((offset) => [position.getX(index + offset), position.getY(index + offset), position.getZ(index + offset)] as [number, number, number]));
  }
  return result;
}

function signedVolume(geometry: Geometry) {
  return triangles(geometry).reduce((total, [a, b, c]) => total + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
}

/** Every edge, welded to 1e-5 mm, belongs to exactly two triangles, once each way. */
function isClosed(geometry: Geometry) {
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

describe("GT2 pulley geometry (Discussion #1319)", () => {
  it("has the GT2 outside diameter: the pitch circle less twice 0.254 mm", () => {
    expect(pulleyOutsideDiameter(20)).toBeCloseTo(12.224, 3);
    expect(pulleyOutsideDiameter(16)).toBeCloseTo(9.678, 3);
    expect(pulleyOutsideDiameter(60)).toBeCloseTo(37.689, 3);
  });

  it("joins every arc of the outline smoothly to the next, and keeps a land between the grooves", () => {
    for (const teeth of [MIN_PULLEY_TEETH, 20, 36, MAX_PULLEY_TEETH]) {
      const measures = pulleyMeasures({ teeth });
      const arcs = pulleyToothArcs(measures);
      expect(arcs).toHaveLength(teeth * 6);
      arcs.forEach((arc, index) => {
        const next = arcs[(index + 1) % arcs.length];
        const end = pulleyArcPoint(arc, arc.end);
        const start = pulleyArcPoint(next, next.start);
        expect(Math.hypot(end.x - start.x, end.z - start.z)).toBeLessThan(1e-9);
        // The same direction on both sides of the joint: the tangents are parallel and point the same way.
        const turn = (a: typeof arc, angle: number) => {
          const sign = Math.sign(a.end - a.start);
          return { x: -Math.sin(angle) * sign, z: Math.cos(angle) * sign };
        };
        const t1 = turn(arc, arc.end);
        const t2 = turn(next, next.start);
        expect(t1.x * t2.x + t1.z * t2.z).toBeGreaterThan(1 - 1e-9);
      });
      // Every sixth arc is the land on the outside circle; it must not run backwards.
      for (let index = 5; index < arcs.length; index += 6) {
        expect(arcs[index].radius).toBeCloseTo(measures.outsideRadius, 12);
        expect(arcs[index].end - arcs[index].start).toBeGreaterThan(0);
      }
    }
  });

  it("cuts each groove 0.75 mm deep, its tip 0.555 mm round", () => {
    const measures = pulleyMeasures({ teeth: 20 });
    const points = pulleyToothArcs(measures).flatMap((arc) => Array.from({ length: 9 }, (_, step) => pulleyArcPoint(arc, arc.start + ((arc.end - arc.start) * step) / 8)));
    const radii = points.map((point) => Math.hypot(point.x, point.z));
    expect(Math.max(...radii)).toBeCloseTo(measures.outsideRadius, 9);
    expect(Math.min(...radii)).toBeCloseTo(measures.outsideRadius - GT2_GROOVE_DEPTH, 6);
  });

  it("stacks flange, teeth, flange and hub, and sizes the box from them", () => {
    const shape = { teeth: 20, pulleyBeltWidth: 7, pulleyFlange: 1, pulleyFlangeRise: 1.5, pulleyHubHeight: 6, pulleyHubDiameter: 12, centerHoleSize: 5 };
    const footprint = pulleyFootprint(shape);
    expect(footprint.height).toBeCloseTo(15, 9);
    expect(footprint.width).toBeCloseTo(12.224 + 3, 3);
    const points = triangles(createPulleyGeometry(shape)).flat();
    expect(Math.min(...points.map((p) => p[1]))).toBeCloseTo(0, 6);
    expect(Math.max(...points.map((p) => p[1]))).toBeCloseTo(15, 5);
    expect(Math.max(...points.map((p) => Math.hypot(p[0], p[2])))).toBeCloseTo(footprint.width / 2, 5);
  });

  it("is closed and faces outwards with and without flanges, hub and bore", () => {
    const cases = [
      { teeth: 20 },
      { teeth: 20, pulleyFlange: 0 },
      { teeth: 20, pulleyHubHeight: 0 },
      { teeth: 20, pulleyFlange: 0, pulleyHubHeight: 0, centerHoleSize: 0 },
      { teeth: 16, pulleyHubDiameter: 50 },
      { teeth: 60, centerHoleSize: 8 },
    ];
    for (const shape of cases) {
      const geometry = createPulleyGeometry(shape);
      expect(isClosed(geometry)).toBe(true);
      expect(signedVolume(geometry)).toBeGreaterThan(0);
    }
  });

  it("holds about the volume of its discs and its band, less the bore", () => {
    const shape = { teeth: 30, pulleyBeltWidth: 7, pulleyFlange: 1, pulleyFlangeRise: 1.5, pulleyHubHeight: 6, pulleyHubDiameter: 14, centerHoleSize: 6 };
    const m = pulleyMeasures(shape);
    const disc = (r: number, h: number) => Math.PI * r * r * h;
    // The band lies between its root and outside circles; the grooves take a bit under half the ring.
    const low = 2 * disc(m.flangeRadius, 1) + disc(m.hubRadius, 6) + disc(m.rootRadius, 7) - disc(m.boreRadius, m.height);
    const high = 2 * disc(m.flangeRadius, 1) + disc(m.hubRadius, 6) + disc(m.outsideRadius, 7) - disc(m.boreRadius, m.height);
    const volume = signedVolume(createPulleyGeometry(shape));
    expect(volume).toBeGreaterThan(low);
    expect(volume).toBeLessThan(high);
  });

  it("keeps the bore inside the teeth and the hub, and the hub inside the flange", () => {
    const m = pulleyMeasures({ teeth: 12, centerHoleSize: 40, pulleyHubDiameter: 80 });
    expect(m.hubRadius).toBeCloseTo(m.flangeRadius, 9);
    expect(m.boreRadius).toBeLessThan(m.rootRadius);
    const bare = pulleyMeasures({ teeth: 12, pulleyFlange: 0, pulleyHubDiameter: 80 });
    expect(bare.hubRadius).toBeLessThan(bare.rootRadius);
  });

  it("turns a dragged width into teeth and a dragged height into the belt width", () => {
    const shape = { teeth: 20, pulleyBeltWidth: 7, pulleyFlange: 1, pulleyFlangeRise: 1.5, pulleyHubHeight: 6 };
    const wider = pulleyFromSize(shape, { width: pulleyFootprint({ ...shape, teeth: 40 }).width + 0.2 });
    expect(wider.teeth).toBe(40);
    expect(wider.pulleyBeltWidth).toBe(7);
    const taller = pulleyFromSize(shape, { height: 20 });
    expect(taller.teeth).toBe(20);
    expect(taller.pulleyBeltWidth).toBeCloseTo(12, 9);
    expect(pulleyFromSize(shape, { width: 1 }).teeth).toBe(MIN_PULLEY_TEETH);
  });

  it("comes from the library with the box its measures give, and keeps it whatever size is asked", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "pulley");
    expect(asset).toBeDefined();
    const shape = canonicalizeShape(makeShapeFromAsset(asset!));
    expect(shape).toMatchObject({ teeth: 20, pulleyBeltWidth: 7, pulleyFlange: 1, pulleyHubHeight: 6, centerHoleSize: 5 });
    expect(shape).toMatchObject(pulleyFootprint(shape));
    // Asked for 40 mm across, it takes the teeth that come nearest.
    const wide = canonicalizeShape(makeShapeFromAsset(asset!, undefined, { width: 40 }));
    expect(Math.abs(wide.width - 40)).toBeLessThan(0.7);
    expect(wide.teeth).toBeGreaterThan(20);
  });

  it("turns a dragged or typed size into teeth and belt width, and leaves other shapes alone", () => {
    const shape = canonicalizeShape(makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === "pulley")!));
    const patch = pulleySizedPatch(shape, { width: 30, depth: 30 });
    expect(patch.teeth).toBe(Math.round((Math.PI * (30 - 3 + 0.508)) / 2));
    expect(patch.width).toBeCloseTo(pulleyFootprint({ ...shape, teeth: patch.teeth }).width, 9);
    expect(pulleySizedPatch(shape, { height: 25 }).pulleyBeltWidth).toBeCloseTo(17, 9);
    const box = { ...shape, kind: "box" } as WorkplaneShape;
    expect(pulleySizedPatch(box, { width: 30 })).toEqual({ width: 30 });
  });

  it("keeps its measures in saved defaults, AI commands and a saved design file", async () => {
    const defaults = normalizeShapeCustomizations({ pulley: { teeth: 3, pulleyBeltWidth: 500, pulleyFlange: 0, pulleyHubHeight: 4, pulleyHubDiameter: 10 } }).pulley ?? {};
    expect(defaults).toMatchObject({ teeth: MIN_PULLEY_TEETH, pulleyBeltWidth: 100, pulleyFlange: 0, pulleyHubHeight: 4, pulleyHubDiameter: 10 });
    const base = { name: "GT2 Pulley", kind: "pulley", color: "#8a96a3", x: 0, z: 0, elevation: 0, size: 1, width: 1, depth: 1, height: 1, rotation: 0 };
    const shapes = [
      canonicalizeShape({ ...base, id: "a", teeth: 36, pulleyBeltWidth: 11, pulleyFlange: 0, pulleyHubHeight: 0, centerHoleSize: 8 } as WorkplaneShape),
      canonicalizeShape({ ...base, id: "b", x: 40, teeth: 16, pulleyFlangeRise: 2.5, pulleyHubHeight: 8, pulleyHubDiameter: 13 } as WorkplaneShape),
    ];
    const exported = await exportLylProject({
      projectId: "pulley", projectName: "Pulley", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = await importLylProject(exported);
    const byId = new Map(restored.shapes.map((entry) => [entry.id, entry]));
    expect(byId.get("a")).toMatchObject({ teeth: 36, pulleyBeltWidth: 11, pulleyFlange: 0, pulleyHubHeight: 0, centerHoleSize: 8, height: 11 });
    expect(byId.get("b")).toMatchObject({ teeth: 16, pulleyFlangeRise: 2.5, pulleyHubHeight: 8, pulleyHubDiameter: 13 });
  });
});