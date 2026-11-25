import { describe, expect, it } from "vitest";
import {
  PATTIES_MIN_HEIGHT,
  createPattiesGeometry,
  pattiesBaseThickness,
  pattiesFaceTriangles,
  pattiesPlanOfShape,
  pattiesSettingsOfShape,
} from "@/lib/pattiesGeometry";
import {
  DEFAULT_PATTIES,
  PATTIES_LAYOUTS,
  PATTIES_MODES,
  PATTIES_OUTLINES,
  PATTIES_PATTERNS,
  PATTIES_PRESETS,
  normalizePatties,
  pattiesLoopArea,
  pattiesNaturalSize,
  type PattiesLoop,
  type PattiesSettings,
} from "@/lib/pattiesPattern";

type Geometry = ReturnType<typeof createPattiesGeometry>;

function corners(geometry: Geometry) {
  const position = geometry.getAttribute("position");
  return Array.from({ length: position.count }, (_, index) => [position.getX(index), position.getY(index), position.getZ(index)] as [number, number, number]);
}

function signedVolume(geometry: Geometry) {
  const points = corners(geometry);
  let total = 0;
  for (let i = 0; i < points.length; i += 3) {
    const [a, b, c] = [points[i], points[i + 1], points[i + 2]];
    total += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return total;
}

/** How many edges, welded to 1e-4 mm, do not belong to exactly two triangles, once each way. */
function openEdges(geometry: Geometry) {
  const key = (p: [number, number, number]) => p.map((value) => Math.round(value * 1e4)).join(",");
  const points = corners(geometry).map(key);
  const edges = new Map<string, number>();
  for (let i = 0; i < points.length; i += 3) {
    for (let side = 0; side < 3; side += 1) {
      const a = points[i + side], b = points[i + ((side + 1) % 3)];
      if (a === b) continue;
      edges.set(`${a}|${b}`, (edges.get(`${a}|${b}`) ?? 0) + 1);
    }
  }
  let open = 0;
  for (const [edge, count] of edges) {
    const [a, b] = edge.split("|");
    if (count !== 1 || edges.get(`${b}|${a}`) !== 1) open += 1;
  }
  return open;
}

function settingsFor(pattern: PattiesSettings["pattern"], change: Partial<PattiesSettings> = {}): PattiesSettings {
  return normalizePatties({ ...DEFAULT_PATTIES, ...PATTIES_PRESETS[pattern], pattern, ...change });
}

function area(loops: PattiesLoop[]) {
  return loops.reduce((sum, loop) => sum + Math.abs(pattiesLoopArea(loop)), 0);
}

describe("Patties: the body", () => {
  it("is closed for every pattern, built every way, on every outline", () => {
    for (const pattern of PATTIES_PATTERNS) {
      for (const outline of PATTIES_OUTLINES) {
        for (const layout of outline === "fan" ? (["straight"] as const) : PATTIES_LAYOUTS) {
          for (const mode of PATTIES_MODES) {
            const patties = settingsFor(pattern, { outline, layout, mode, cutEdge: true, count: layout === "polar" ? 12 : PATTIES_PRESETS[pattern].count });
            const size = pattiesNaturalSize(patties, 70, 60);
            const geometry = createPattiesGeometry(size.width, 2, size.depth, { patties });
            const name = `${pattern} ${outline} ${layout} ${mode}`;
            expect(openEdges(geometry), name).toBe(0);
            expect(signedVolume(geometry), name).toBeGreaterThan(0);
            geometry.dispose();
          }
        }
      }
    }
    // 120 plates: generous for machines that share their cores.
  }, 120_000);

  it("stays closed where the corners of several figures sit on one line", () => {
    // Square figures in rows and columns, and figures cut along the border: three's ear cutting leaves a point on a
    // straight run out, which opens a crack beside the wall that stands on it unless the face is repaired.
    for (const patties of [
      settingsFor("warp", { roundness: 0, bulge: 0, count: 6 }),
      settingsFor("warp", { roundness: 0, bulge: 0, count: 6, layout: "polar", cutEdge: true }),
      settingsFor("cells", { roundness: 0, amount: 0, count: 6 }),
      settingsFor("waves", { roundness: 0, amount: 0, sides: 3 }),
      settingsFor("dots", { sides: 4, roundness: 0, amount: 0, turn: 45, cutEdge: true }),
    ]) {
      for (const mode of PATTIES_MODES) {
        const geometry = createPattiesGeometry(80, 2, 80, { patties: { ...patties, mode } });
        expect(openEdges(geometry), `${patties.pattern} ${patties.layout} ${mode}`).toBe(0);
      }
    }
  });

  it("repairs a face whose triangles run over a point of another figure", () => {
    // Two square holes side by side in a square plate: their lower edges sit on one line.
    const outline: PattiesLoop = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 6 }, { x: 0, y: 6 }];
    const holes: PattiesLoop[] = [
      [{ x: 1, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 4 }, { x: 1, y: 4 }],
      [{ x: 6, y: 2 }, { x: 9, y: 2 }, { x: 9, y: 4 }, { x: 6, y: 4 }],
    ];
    const points = [outline, ...holes].flat();
    const triangles = pattiesFaceTriangles(outline, holes);
    // Every point is a corner of some triangle, and the triangles cover the plate without the holes.
    const used = new Set(triangles.flat());
    expect(used.size).toBe(points.length);
    const covered = triangles.reduce((sum, [a, b, c]) => sum + ((points[b].x - points[a].x) * (points[c].y - points[a].y) - (points[b].y - points[a].y) * (points[c].x - points[a].x)) / 2, 0);
    expect(covered).toBeCloseTo(60 - 12, 9);
    // Every edge inside the face has its partner the other way round.
    const edges = new Set(triangles.flatMap(([a, b, c]) => [`${a}>${b}`, `${b}>${c}`, `${c}>${a}`]));
    const border = new Set<string>();
    let start = 0;
    [outline, ...holes].forEach((loop, index) => {
      loop.forEach((_, i) => border.add(index === 0 ? `${start + i}>${start + ((i + 1) % loop.length)}` : `${start + ((i + 1) % loop.length)}>${start + i}`));
      start += loop.length;
    });
    for (const edge of edges) {
      const [a, b] = edge.split(">");
      expect(border.has(edge) || edges.has(`${b}>${a}`), edge).toBe(true);
    }
  });

  it("stands on y = 0 and fills its box", () => {
    const geometry = createPattiesGeometry(80, 1.6, 60, { patties: DEFAULT_PATTIES });
    const points = corners(geometry);
    expect(Math.min(...points.map((p) => p[1]))).toBeCloseTo(0, 6);
    expect(Math.max(...points.map((p) => p[1]))).toBeCloseTo(1.6, 6);
    expect(Math.min(...points.map((p) => p[0]))).toBeCloseTo(-40, 6);
    expect(Math.max(...points.map((p) => p[0]))).toBeCloseTo(40, 6);
    expect(Math.min(...points.map((p) => p[2]))).toBeCloseTo(-30, 6);
    expect(Math.max(...points.map((p) => p[2]))).toBeCloseTo(30, 6);
  });

  it("lies on the workplane as its plan is drawn: the plan's top at the back, nothing mirrored", () => {
    // One figure of one's own, an arrow-like triangle that points up on paper and leans to the right.
    const patties = settingsFor("motif", { mode: "pieces", count: 1, frame: 0, motif: "custom", motifLoops: [[-0.8, -0.6, 0.2, -0.6, 0.8, 0.9]] });
    const points = corners(createPattiesGeometry(40, 2, 40, { patties }));
    // The tip is the point furthest from the others: on paper up and to the right, on the plane back (-z) and right (+x).
    const tip = points.reduce((best, p) => (p[0] - p[2] > best[0] - best[2] ? p : best));
    expect(tip[0]).toBeGreaterThan(0);
    expect(tip[2]).toBeLessThan(0);
    const base = points.filter((p) => p[2] > 0);
    expect(Math.min(...base.map((p) => p[0]))).toBeLessThan(-5);
    // A fan whose wide rim is the vessel's top stands like a rainbow: the middle of that rim is the point furthest back.
    const fan = corners(createPattiesGeometry(246.25, 2, 106.28, { patties: settingsFor("dots", { outline: "fan", fanTop: 80, fanBottom: 60, fanSide: 90 }) }));
    const furthestBack = fan.reduce((best, p) => (p[2] < best[2] ? p : best));
    const furthestFront = fan.reduce((best, p) => (p[2] > best[2] ? p : best));
    expect(Math.abs(furthestBack[0])).toBeLessThan(5);
    expect(Math.abs(furthestFront[0])).toBeGreaterThan(80);
  });

  it("holds as much material as its way of building says", () => {
    const patties = settingsFor("dots", { base: 0.8 });
    const plan = pattiesPlanOfShape({ patties }, 80, 80);
    const plate = Math.abs(pattiesLoopArea(plan.outline));
    const figures = area(plan.figures);
    const volume = (mode: PattiesSettings["mode"]) => signedVolume(createPattiesGeometry(80, 2, 80, { patties: { ...patties, mode } }));
    // The plate of loose pieces has no border, so its figures are laid out anew.
    const pieces = area(pattiesPlanOfShape({ patties: { ...patties, mode: "pieces" } }, 80, 80).figures);
    expect(volume("stencil")).toBeCloseTo((plate - figures) * 2, 0);
    expect(volume("raised")).toBeCloseTo(plate * 0.8 + figures * 1.2, 0);
    expect(volume("sunk")).toBeCloseTo(plate * 2 - figures * 1.2, 0);
    expect(volume("pieces")).toBeCloseTo(pieces * 2, 0);
  });

  it("keeps a layer for the figures above or below the plate under them", () => {
    expect(pattiesBaseThickness({ base: 0.8 }, 2)).toBe(0.8);
    expect(pattiesBaseThickness({ base: 5 }, 2)).toBeCloseTo(1.8, 9);
    expect(pattiesBaseThickness({ base: 0.2 }, 0.4)).toBeCloseTo(0.2, 9);
    expect(PATTIES_MIN_HEIGHT).toBe(0.4);
  });

  it("is a plain plate when no figure fits", () => {
    const geometry = createPattiesGeometry(10, 2, 10, { patties: settingsFor("petals", { count: 30, gap: 4 }) });
    expect(openEdges(geometry)).toBe(0);
    expect(signedVolume(geometry)).toBeCloseTo(200, 6);
    // Loose pieces without a single piece would be nothing at all: the plate stands in for them.
    const pieces = createPattiesGeometry(10, 2, 10, { patties: settingsFor("petals", { count: 30, gap: 4, mode: "pieces" }) });
    expect(signedVolume(pieces)).toBeCloseTo(200, 6);
  });

  it("reads a shape without settings as the plate a new one starts with", () => {
    expect(pattiesSettingsOfShape(null)).toEqual(DEFAULT_PATTIES);
    expect(pattiesSettingsOfShape({ patties: { count: 4 } }).count).toBe(4);
  });

  it("builds a plate of several hundred figures in good time", () => {
    const patties = settingsFor("dots", { count: 30, gap: 0.8, frame: 1 });
    const started = performance.now();
    const geometry = createPattiesGeometry(120, 1, 120, { patties });
    const took = performance.now() - started;
    expect(pattiesPlanOfShape({ patties }, 120, 120).figures.length).toBeGreaterThan(800);
    expect(openEdges(geometry)).toBe(0);
    // Generous: the machines that run the tests share their cores. A plate that took seconds would show here.
    expect(took).toBeLessThan(6000);
  });

  it("slopes the openings through the plate and stays closed, with the same volume", () => {
    for (const mode of ["stencil", "pieces"] as const) {
      for (const pattern of ["warp", "dots", "pegboard"] as const) {
        const patties = settingsFor(pattern, { mode, frame: 3 });
        const straight = createPattiesGeometry(120, 3, 100, { patties });
        const sloped = createPattiesGeometry(120, 3, 100, { patties: { ...patties, tilt: 45 } });
        const name = `${pattern} ${mode}`;
        expect(openEdges(sloped), name).toBe(0);
        expect(signedVolume(sloped), name).toBeGreaterThan(0);
        // The body stays inside the plate's box: the openings keep away from the edge by what they lean.
        const points = corners(sloped);
        expect(Math.max(...points.map((p) => Math.abs(p[2]))), name).toBeLessThanOrEqual(50 + 1e-6);
        expect(Math.max(...points.map((p) => Math.abs(p[0]))), name).toBeLessThanOrEqual(60 + 1e-6);
        straight.dispose();
        sloped.dispose();
      }
    }
    // One square opening in a plate 4 mm thick, sloped 45 degrees: its top is 4 mm further back than its bottom.
    const patties = settingsFor("warp", { count: 1, rows: 1, bulge: 0, roundness: 0, frame: 10, tilt: 45 });
    const sloped = createPattiesGeometry(40, 4, 40, { patties });
    // Sloped or not, every layer of the plate has the same opening: the volume is the plate less the opening, times the thickness.
    expect(signedVolume(sloped)).toBeCloseTo((40 * 40 - area(pattiesPlanOfShape({ patties }, 40, 40, 4).figures)) * 4, 3);
    // The opening is 2 mm smaller front to back than in the flat drawing: half its lean at either end.
    expect(area(pattiesPlanOfShape({ patties }, 40, 40).figures) - area(pattiesPlanOfShape({ patties }, 40, 40, 4).figures)).toBeCloseTo(20 * 4, 6);
    const inner = (y: number) => corners(sloped).filter((p) => Math.abs(p[1] - y) < 1e-6 && Math.abs(p[0]) < 19 && Math.abs(p[2]) < 19).map((p) => p[2]);
    // The back of the plate is at -z.
    expect(Math.min(...inner(4))).toBeCloseTo(Math.min(...inner(0)) - 4, 5);
    expect(Math.max(...inner(4))).toBeCloseTo(Math.max(...inner(0)) - 4, 5);
    // A raised plate has no openings to slope.
    const raised = settingsFor("dots", { mode: "raised" });
    expect(corners(createPattiesGeometry(80, 3, 80, { patties: { ...raised, tilt: 45 } }))).toEqual(corners(createPattiesGeometry(80, 3, 80, { patties: raised })));
  });
});
