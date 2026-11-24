import { describe, expect, it } from "vitest";
import {
  DEFAULT_PATTIES,
  PATTIES_LAYOUTS,
  PATTIES_MAX_FIGURES,
  PATTIES_OUTLINES,
  PATTIES_PATTERNS,
  PATTIES_PRESETS,
  clipPattiesLoop,
  cleanPattiesLoop,
  normalizePatties,
  pattiesFan,
  pattiesFigures,
  pattiesLoopArea,
  pattiesNaturalSize,
  pattiesPatternUses,
  pattiesPlan,
  pattiesSettingsEqual,
  pattiesSettingsInput,
  pattiesSettingsProblem,
  pattiesShapePatch,
  pattiesSpoke,
  pattiesSvg,
  pattiesWarpSizes,
  type PattiesLoop,
  type PattiesPoint,
  type PattiesSettings,
} from "@/lib/pattiesPattern";

function pointToEdge(p: PattiesPoint, a: PattiesPoint, b: PattiesPoint) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** The least distance between two loops that do not cross. */
function loopDistance(first: PattiesLoop, second: PattiesLoop) {
  let least = Infinity;
  for (let i = 0; i < first.length; i += 1) {
    const a = first[i], b = first[(i + 1) % first.length];
    for (let j = 0; j < second.length; j += 1) {
      const c = second[j], d = second[(j + 1) % second.length];
      least = Math.min(least, pointToEdge(a, c, d), pointToEdge(b, c, d), pointToEdge(c, a, b), pointToEdge(d, a, b));
    }
  }
  return least;
}

/** Whether two edges cross each other properly; edges on one line do not count. */
function edgesCross(a: PattiesPoint, b: PattiesPoint, c: PattiesPoint, d: PattiesPoint) {
  const side = (p: PattiesPoint, q: PattiesPoint, r: PattiesPoint) => {
    const value = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    return Math.abs(value) < 1e-6 ? 0 : Math.sign(value);
  };
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

function box(loop: PattiesLoop) {
  return {
    minX: Math.min(...loop.map((p) => p.x)), maxX: Math.max(...loop.map((p) => p.x)),
    minY: Math.min(...loop.map((p) => p.y)), maxY: Math.max(...loop.map((p) => p.y)),
  };
}

/** The thinnest bar between two figures and between a figure and the plate's edge. */
function bars(outline: PattiesLoop, figures: PattiesLoop[], reach: number) {
  const boxes = figures.map(box);
  let between = Infinity, edge = Infinity, crossing = false;
  for (let i = 0; i < figures.length; i += 1) {
    for (let j = i + 1; j < figures.length; j += 1) {
      const a = boxes[i], b = boxes[j];
      if (a.minX - reach > b.maxX || b.minX - reach > a.maxX || a.minY - reach > b.maxY || b.minY - reach > a.maxY) continue;
      between = Math.min(between, loopDistance(figures[i], figures[j]));
      for (let m = 0; m < figures[i].length && !crossing; m += 1) {
        for (let n = 0; n < figures[j].length && !crossing; n += 1) {
          crossing = edgesCross(figures[i][m], figures[i][(m + 1) % figures[i].length], figures[j][n], figures[j][(n + 1) % figures[j].length]);
        }
      }
    }
    edge = Math.min(edge, loopDistance(figures[i], outline));
  }
  return { between, edge, crossing };
}

function settingsFor(pattern: PattiesSettings["pattern"], change: Partial<PattiesSettings> = {}): PattiesSettings {
  return normalizePatties({ ...DEFAULT_PATTIES, ...PATTIES_PRESETS[pattern], pattern, ...change });
}

describe("Patties: settings", () => {
  it("fills in what is missing and keeps every setting within its range", () => {
    expect(normalizePatties(null)).toEqual(DEFAULT_PATTIES);
    const wild = normalizePatties({ pattern: "plaid", count: 500, gap: 0.01, bulge: -900, sides: 0, roundness: 250, seamless: "yes", fanTop: -4, turn: 721 } as never);
    expect(wild.pattern).toBe(DEFAULT_PATTIES.pattern);
    expect(wild.count).toBe(60);
    expect(wild.gap).toBe(0.4);
    expect(wild.bulge).toBe(-100);
    expect(wild.sides).toBe(1);
    expect(wild.roundness).toBe(100);
    expect(wild.seamless).toBe(false);
    expect(wild.fanTop).toBe(1);
    expect(wild.turn).toBe(180);
  });

  it("counts settings that are missing as their defaults when two plates are compared", () => {
    expect(pattiesSettingsEqual(undefined, undefined)).toBe(true);
    expect(pattiesSettingsEqual(undefined, { ...DEFAULT_PATTIES })).toBe(true);
    expect(pattiesSettingsEqual({ count: 9 }, { gap: 1.2 })).toBe(true);
    expect(pattiesSettingsEqual({ count: 9 }, { count: 10 })).toBe(false);
    expect(pattiesSettingsEqual({ seamless: true }, {})).toBe(false);
  });

  it("reads settings from an object or its JSON text and nothing else", () => {
    expect(pattiesSettingsInput({ count: 4 })).toEqual({ count: 4 });
    expect(pattiesSettingsInput('{"pattern":"dots"}')).toEqual({ pattern: "dots" });
    expect(pattiesSettingsInput("dots")).toBeNull();
    expect(pattiesSettingsInput([1, 2])).toBeNull();
    expect(pattiesSettingsInput(7)).toBeNull();
  });

  it("says what is wrong with settings in a file", () => {
    expect(pattiesSettingsProblem({ ...DEFAULT_PATTIES })).toBeNull();
    expect(pattiesSettingsProblem({ count: 4 })).toBeNull();
    expect(pattiesSettingsProblem("warp")).toContain("object");
    expect(pattiesSettingsProblem({ pattern: "plaid" })).toContain(".pattern must be one of");
    expect(pattiesSettingsProblem({ count: "many" })).toBe(".count must be a number");
    expect(pattiesSettingsProblem({ seamless: 1 })).toBe(".seamless must be true or false");
  });

  it("starts every pattern from settings that give it figures, and shows only the rows a pattern reads", () => {
    for (const pattern of PATTIES_PATTERNS) {
      const plan = pattiesPlan(settingsFor(pattern), 80, 80);
      expect(plan.figures.length, pattern).toBeGreaterThan(10);
      expect(pattiesFigures(plan).share, pattern).toBeGreaterThan(0.15);
    }
    expect(pattiesPatternUses("warp", "cell")).toBe(true);
    expect(pattiesPatternUses("dots", "cell")).toBe(false);
    expect(pattiesPatternUses("cells", "seed")).toBe(true);
    expect(pattiesPatternUses("scales", "turn")).toBe(false);
  });
});

describe("Patties: the warp grid's columns", () => {
  it("fill the width exactly and are the same without a bulge", () => {
    const even = pattiesWarpSizes(8, 80, 1, 0, 0, false);
    expect(even).toHaveLength(8);
    even.forEach((size) => expect(size).toBeCloseTo(10, 9));
    const warped = pattiesWarpSizes(9, 90, 1, 60, 0, false);
    expect(warped.reduce((sum, size) => sum + size, 0)).toBeCloseTo(90, 9);
  });

  it("are widest at the focus above 0 and narrowest there below 0, and the focus moves", () => {
    const bulged = pattiesWarpSizes(9, 90, 1, 60, 0, false);
    expect(bulged[4]).toBeGreaterThan(bulged[0] * 2);
    expect(bulged[0]).toBeCloseTo(bulged[8], 9);
    const pinched = pattiesWarpSizes(9, 90, 1, -60, 0, false);
    expect(pinched[4]).toBeLessThan(pinched[0] / 2);
    const left = pattiesWarpSizes(9, 90, 1, 60, -100, false);
    expect(left[0]).toBeGreaterThan(left[8] * 2);
  });

  it("never make a column narrower than a bar and the smallest figure, and drop columns that do not fit", () => {
    const tight = pattiesWarpSizes(9, 30, 2, 100, 0, false);
    tight.forEach((size) => expect(size).toBeGreaterThanOrEqual(2.6 - 1e-9));
    expect(tight.reduce((sum, size) => sum + size, 0)).toBeCloseTo(30, 9);
    expect(pattiesWarpSizes(40, 30, 2, 0, 0, false).length).toBe(11);
    expect(pattiesWarpSizes(5, 1, 2, 0, 0, false)).toEqual([]);
  });
});

describe("Patties: cutting a figure at a line", () => {
  const square: PattiesLoop = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];

  it("keeps a loop that lies on the kept side and drops one that does not", () => {
    expect(clipPattiesLoop(square, 1, 0, 10)).toEqual([square]);
    expect(clipPattiesLoop(square, 1, 0, -1)).toEqual([]);
  });

  it("cuts a loop where the line crosses it", () => {
    const [half] = clipPattiesLoop(square, 1, 0, 1);
    expect(Math.abs(pattiesLoopArea(half))).toBeCloseTo(4, 9);
    expect(Math.max(...half.map((p) => p.x))).toBeCloseTo(1, 9);
  });

  it("gives two pieces where the cut leaves two, not one piece joined by a thread", () => {
    // A U lying on its side: the cut takes the bend away and leaves the two arms.
    const u: PattiesLoop = [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 0, y: 4 }];
    const pieces = clipPattiesLoop(u, -1, 0, -2);
    expect(pieces).toHaveLength(2);
    pieces.forEach((piece) => expect(Math.abs(pattiesLoopArea(cleanPattiesLoop(piece)))).toBeCloseTo(4, 9));
  });

  it("cleans a loop of doubled points and points on a straight run, and turns it counter-clockwise", () => {
    const messy: PattiesLoop = [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 0, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 0 }, { x: 2, y: 0 }];
    const clean = cleanPattiesLoop(messy);
    expect(clean).toHaveLength(4);
    expect(pattiesLoopArea(clean)).toBeCloseTo(16, 9);
  });
});

describe("Patties: the bars", () => {
  it("are nowhere thinner than asked for, on every outline and in every arrangement", () => {
    for (const pattern of PATTIES_PATTERNS) {
      for (const outline of PATTIES_OUTLINES) {
        for (const layout of outline === "fan" ? (["straight"] as const) : PATTIES_LAYOUTS) {
          for (const cutEdge of [false, true]) {
            const settings = settingsFor(pattern, { outline, layout, cutEdge, count: layout === "polar" ? 12 : PATTIES_PRESETS[pattern].count });
            const size = pattiesNaturalSize(settings, 80, 70);
            const plan = pattiesPlan(settings, size.width, size.depth);
            const name = `${pattern} ${outline} ${layout}${cutEdge ? " cut" : ""}`;
            if (!plan.figures.length) continue;
            const result = bars(plan.outline, plan.figures, settings.gap * 2);
            const least = pattern === "petals" ? pattiesSpoke(settings.gap) : settings.gap;
            expect(result.crossing, name).toBe(false);
            expect(result.between, name).toBeGreaterThanOrEqual(least * 0.97);
            expect(result.edge, name).toBeGreaterThanOrEqual(Math.max(settings.frame, 0.4) * 0.97);
          }
        }
      }
    }
  });

  it("keep their width from the middle to the rim when the figures run in rings", () => {
    const settings = settingsFor("dots", { outline: "round", layout: "polar", count: 24, gap: 1.5, hub: 15 });
    const plan = pattiesPlan(settings, 120, 120);
    expect(plan.figures.length).toBeGreaterThan(100);
    // The figures grow with their ring ...
    const radius = (loop: PattiesLoop) => Math.hypot(...Object.values(loop.reduce((sum, p) => ({ x: sum.x + p.x / loop.length, y: sum.y + p.y / loop.length }), { x: 0, y: 0 })));
    const size = (loop: PattiesLoop) => Math.sqrt(Math.abs(pattiesLoopArea(loop)));
    const inner = plan.figures.filter((loop) => radius(loop) < 20);
    const outer = plan.figures.filter((loop) => radius(loop) > 45);
    expect(Math.min(...outer.map(size))).toBeGreaterThan(Math.max(...inner.map(size)) * 2);
    // ... and the bars between the outer ones are not wider for it: a bar at the rim is still close to the gap.
    const rim = bars(plan.outline, outer, 4).between;
    expect(rim).toBeGreaterThanOrEqual(1.5 * 0.97);
    expect(rim).toBeLessThan(1.5 * 1.6);
  });

  it("leave half a bar at the left and right edge of a plate whose ends meet", () => {
    const framed = pattiesPlan(settingsFor("warp", { bulge: 0, gap: 2, frame: 4 }), 80, 60);
    const seamless = pattiesPlan(settingsFor("warp", { bulge: 0, gap: 2, frame: 4, seamless: true }), 80, 60);
    const left = (plan: ReturnType<typeof pattiesPlan>) => Math.min(...plan.figures.flat().map((p) => p.x)) + 40;
    const bottom = (plan: ReturnType<typeof pattiesPlan>) => Math.min(...plan.figures.flat().map((p) => p.y)) + 30;
    expect(left(framed)).toBeCloseTo(4, 6);
    expect(left(seamless)).toBeCloseTo(1, 6);
    expect(bottom(seamless)).toBeCloseTo(4, 6);
  });

  it("keeps whole figures unless they are to be cut at the edge", () => {
    const whole = pattiesPlan(settingsFor("dots", { count: 6 }), 80, 80);
    const cut = pattiesPlan(settingsFor("dots", { count: 6, cutEdge: true }), 80, 80);
    expect(cut.figures.length).toBeGreaterThan(whole.figures.length);
    const areas = whole.figures.map((loop) => Math.abs(pattiesLoopArea(loop)));
    expect(Math.max(...areas) - Math.min(...areas)).toBeLessThan(0.01);
  });

  it("leaves loose pieces no border, so they reach the edge of their box", () => {
    const plan = pattiesPlan(settingsFor("warp", { mode: "pieces", bulge: 0 }), 80, 80);
    const extent = box(plan.figures.flat());
    expect(extent.minX).toBeCloseTo(-40, 6);
    expect(extent.maxX).toBeCloseTo(40, 6);
    expect(extent.maxY).toBeCloseTo(40, 6);
  });

  it("builds nothing rather than more figures than a plate can take, and says so", () => {
    const plan = pattiesPlan(settingsFor("dots", { count: 60, gap: 0.4, frame: 0 }), 200, 200);
    expect(plan.tooMany).toBe(true);
    expect(plan.figures).toEqual([]);
    expect(pattiesFigures(plan)).toEqual({ figures: 0, share: 0, tooMany: true });
    expect(PATTIES_MAX_FIGURES).toBeGreaterThan(1000);
  });
});

describe("Patties: the patterns", () => {
  it("lays cells out the same for one seed and differently for another, and as a honeycomb without disorder", () => {
    const first = pattiesPlan(settingsFor("cells", { seed: 7 }), 80, 80);
    const again = pattiesPlan(settingsFor("cells", { seed: 7 }), 80, 80);
    const other = pattiesPlan(settingsFor("cells", { seed: 8 }), 80, 80);
    expect(again.figures).toEqual(first.figures);
    expect(other.figures).not.toEqual(first.figures);
    const comb = pattiesPlan(settingsFor("cells", { amount: 0, roundness: 0, frame: 0, count: 6 }), 80, 80);
    // In the middle of a honeycomb every cell has six corners and the same size.
    const inner = comb.figures.filter((loop) => loop.every((p) => Math.abs(p.x) < 28 && Math.abs(p.y) < 28));
    expect(inner.length).toBeGreaterThan(4);
    inner.forEach((loop) => expect(loop).toHaveLength(6));
    const areas = inner.map((loop) => Math.abs(pattiesLoopArea(loop)));
    expect(Math.max(...areas) - Math.min(...areas)).toBeLessThan(0.01);
  });

  it("makes a dot round, a polygon or a star by its settings", () => {
    const corners = (change: Partial<PattiesSettings>) => pattiesPlan(settingsFor("dots", { count: 4, ...change }), 80, 80).figures[0].length;
    expect(corners({ sides: 5, roundness: 0, amount: 0 })).toBe(5);
    expect(corners({ sides: 5, roundness: 0, amount: 50 })).toBe(10);
    expect(corners({ sides: 5, roundness: 100, amount: 0 })).toBeGreaterThan(20);
  });

  it("gives every flower its petals, with spokes half as wide as the bars between the flowers", () => {
    const settings = settingsFor("petals", { count: 3, sides: 5, gap: 2, cutEdge: false });
    const plan = pattiesPlan(settings, 90, 90);
    // Three whole flowers in each of the rows that are not shifted; of a flower half over the edge only whole petals stay.
    expect(plan.figures.length).toBeGreaterThanOrEqual(3 * 5 * 2);
    expect(pattiesSpoke(2)).toBe(1);
    expect(pattiesSpoke(0.6)).toBe(0.4);
    const least = bars(plan.outline, plan.figures, 6).between;
    expect(least).toBeGreaterThanOrEqual(1 * 0.97);
    expect(least).toBeLessThan(2);
  });

  it("cuts wave bands into pieces, each band half a piece along from the one below", () => {
    const one = pattiesPlan(settingsFor("waves", { sides: 1, rows: 4 }), 80, 80);
    const three = pattiesPlan(settingsFor("waves", { sides: 3, rows: 4 }), 80, 80);
    expect(one.figures).toHaveLength(4);
    expect(three.figures.length).toBeGreaterThan(one.figures.length * 2);
    // Round a ring a band is cut at least once: a closed ring would fall out of the plate.
    const ring = pattiesPlan(settingsFor("waves", { sides: 1, rows: 3, outline: "round", layout: "polar", count: 8 }), 80, 80);
    expect(ring.figures).toHaveLength(3);
  });
});

describe("Patties: bricks, triangles, diamonds, weave, herringbone, rays and motifs", () => {
  const centre = (loop: PattiesLoop) => loop.reduce((sum, p) => ({ x: sum.x + p.x / loop.length, y: sum.y + p.y / loop.length }), { x: 0, y: 0 });

  it("lays bricks in rows, every second row half a brick along", () => {
    const plan = pattiesPlan(settingsFor("bricks", { count: 4, rows: 4, roundness: 0, cutEdge: true }), 80, 80);
    const rows = new Map<number, number[]>();
    for (const loop of plan.figures) {
      const c = centre(loop);
      const row = Math.round(c.y);
      rows.set(row, [...(rows.get(row) ?? []), c.x]);
    }
    expect(rows.size).toBe(4);
    const [first, second] = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, xs]) => xs.sort((a, b) => a - b));
    // Four whole bricks in the first row; three whole and two halves in the shifted one.
    expect(first).toHaveLength(4);
    expect(second).toHaveLength(5);
    expect(second[1] - first[0]).toBeCloseTo((first[1] - first[0]) / 2, 6);
  });

  it("stands and hangs triangles in turn, each with three corners", () => {
    const plan = pattiesPlan(settingsFor("triangles", { count: 5, roundness: 0, cutEdge: false }), 80, 80);
    expect(plan.figures.length).toBeGreaterThan(20);
    plan.figures.forEach((loop) => expect(loop).toHaveLength(3));
    const ups = plan.figures.filter((loop) => loop.filter((p) => p.y > centre(loop).y).length === 1).length;
    expect(ups).toBeGreaterThan(5);
    expect(plan.figures.length - ups).toBeGreaterThan(5);
  });

  it("makes diamonds taller or wider by their setting", () => {
    const size = (amount: number) => {
      const loop = pattiesPlan(settingsFor("diamonds", { count: 5, amount, roundness: 0 }), 80, 80).figures[0];
      const b = box(loop);
      return (b.maxY - b.minY) / (b.maxX - b.minX);
    };
    expect(size(50)).toBeCloseTo(1, 1);
    expect(size(100)).toBeGreaterThan(1.7);
    expect(size(0)).toBeLessThan(0.6);
  });

  it("weaves fields of strips, lying and standing in turn", () => {
    const plan = pattiesPlan(settingsFor("weave", { count: 4, sides: 3, roundness: 0 }), 80, 80);
    expect(plan.figures).toHaveLength(4 * 4 * 3);
    const lying = plan.figures.filter((loop) => { const b = box(loop); return b.maxX - b.minX > b.maxY - b.minY; }).length;
    expect(lying).toBe(plan.figures.length / 2);
    expect(pattiesPlan(settingsFor("weave", { count: 4, sides: 1 }), 80, 80).figures).toHaveLength(16);
  });

  it("leans the bars of the herringbone one way in one column and the other way in the next", () => {
    const plan = pattiesPlan(settingsFor("herringbone", { count: 4, turn: 45, roundness: 0 }), 80, 80);
    const rises = (loop: PattiesLoop) => {
      const left = loop.filter((p) => p.x < centre(loop).x), right = loop.filter((p) => p.x > centre(loop).x);
      return Math.sign(right.reduce((sum, p) => sum + p.y, 0) / right.length - left.reduce((sum, p) => sum + p.y, 0) / left.length);
    };
    const byColumn = new Map<number, Set<number>>();
    for (const loop of plan.figures) {
      const column = Math.round(centre(loop).x);
      byColumn.set(column, (byColumn.get(column) ?? new Set()).add(rises(loop)));
    }
    const columns = [...byColumn.entries()].sort((a, b) => a[0] - b[0]).map(([, signs]) => [...signs]);
    expect(columns).toEqual([[1], [-1], [1], [-1]]);
  });

  it("sends rays out from the focus and cuts them into rings", () => {
    const sun = pattiesPlan(settingsFor("rays", { count: 12, rows: 1, amount: 30 }), 80, 80);
    expect(sun.figures).toHaveLength(12);
    // The middle stays closed: no ray comes nearer than the open middle.
    expect(Math.min(...sun.figures.flat().map((p) => Math.hypot(p.x, p.y)))).toBeGreaterThan(10);
    expect(pattiesPlan(settingsFor("rays", { count: 12, rows: 3, amount: 30 }), 80, 80).figures.length).toBeGreaterThan(30);
    const moved = pattiesPlan(settingsFor("rays", { count: 12, focusX: 80, focusY: -80 }), 80, 80);
    const nearest = moved.figures.flat().reduce((best, p) => (Math.hypot(p.x - 29.6, p.y + 29.6) < Math.hypot(best.x - 29.6, best.y + 29.6) ? p : best));
    expect(nearest.x).toBeGreaterThan(10);
    expect(nearest.y).toBeLessThan(-10);
    // Round a ring the rays are spokes, one for every figure round the ring.
    expect(pattiesPlan(settingsFor("rays", { count: 10, rows: 1, outline: "round", layout: "polar" }), 80, 80).figures).toHaveLength(10);
  });

  it("repeats a ready figure or one's own, turned if asked", () => {
    const hearts = pattiesPlan(settingsFor("motif", { count: 4, motif: "heart" }), 80, 80);
    const paws = pattiesPlan(settingsFor("motif", { count: 4, motif: "paw" }), 80, 80);
    expect(paws.figures.length).toBe(hearts.figures.length * 5);
    const own = pattiesPlan(settingsFor("motif", { count: 4, motif: "custom", motifLoops: [[-1, -0.2, 1, -0.2, 1, 0.2, -1, 0.2]] }), 80, 80);
    const bar = box(own.figures[0]);
    expect(bar.maxX - bar.minX).toBeGreaterThan((bar.maxY - bar.minY) * 3);
    const turnedBar = box(pattiesPlan(settingsFor("motif", { count: 4, turn: 90, motif: "custom", motifLoops: [[-1, -0.2, 1, -0.2, 1, 0.2, -1, 0.2]] }), 80, 80).figures[0]);
    expect(turnedBar.maxY - turnedBar.minY).toBeGreaterThan((turnedBar.maxX - turnedBar.minX) * 3);
    // One's own that is not there shows the heart; one's own that is there travels with the settings.
    expect(pattiesPlan(settingsFor("motif", { count: 4, motif: "custom" }), 80, 80).figures).toEqual(hearts.figures);
    expect(normalizePatties({ motif: "moon", motifLoops: [[-1, 0, 1, 0, 0, 1]] }).motifLoops).toEqual([[-1, 0, 1, 0, 0, 1]]);
    expect(pattiesSettingsEqual({ motifLoops: [[-1, 0, 1, 0, 0, 1]] }, { motifLoops: [[-1, 0, 1, 0, 0, 1]] })).toBe(true);
    expect(pattiesSettingsEqual({ motifLoops: [[-1, 0, 1, 0, 0, 1]] }, {})).toBe(false);
    expect(pattiesSettingsProblem({ motifLoops: "x" })).toBe(".motifLoops must be lists of numbers");
    expect(pattiesSettingsProblem({ motif: "dragon" })).toContain(".motif must be one of");
  });
});

describe("Patties: the fan for a vessel", () => {
  it("has arcs as long as the vessel's rims and is as wide as its side is long", () => {
    const fan = pattiesFan({ fanTop: 80, fanBottom: 60, fanSide: 90 });
    expect(fan.straight).toBe(false);
    expect(fan.wideTop).toBe(true);
    expect(fan.outer - fan.inner).toBeCloseTo(90, 9);
    expect(fan.outer * fan.angle).toBeCloseTo(Math.PI * 80, 9);
    expect(fan.inner * fan.angle).toBeCloseTo(Math.PI * 60, 9);
    const hanging = pattiesFan({ fanTop: 60, fanBottom: 80, fanSide: 90 });
    expect(hanging.wideTop).toBe(false);
    expect(hanging.width).toBeCloseTo(fan.width, 9);
  });

  it("is a rectangle for a vessel with straight sides", () => {
    const fan = pattiesFan({ fanTop: 70, fanBottom: 70, fanSide: 100 });
    expect(fan.straight).toBe(true);
    expect(fan.width).toBeCloseTo(Math.PI * 70, 9);
    expect(fan.depth).toBe(100);
    const plan = pattiesPlan(settingsFor("dots", { outline: "fan", fanTop: 70, fanBottom: 70, fanSide: 100 }), fan.width, fan.depth);
    expect(plan.outline).toHaveLength(4);
  });

  it("does not lap over itself for a vessel that is nearly flat", () => {
    const fan = pattiesFan({ fanTop: 200, fanBottom: 20, fanSide: 91 });
    expect(fan.angle).toBeLessThanOrEqual((350 / 360) * Math.PI * 2 + 1e-9);
  });

  it("gives the plate the fan's size, and fits the outline into it", () => {
    const settings = settingsFor("dots", { outline: "fan", fanTop: 80, fanBottom: 60, fanSide: 90 });
    const size = pattiesNaturalSize(settings, 10, 10);
    const plan = pattiesPlan(settings, size.width, size.depth);
    const extent = box(plan.outline);
    expect(extent.maxX - extent.minX).toBeCloseTo(size.width, 1);
    expect(extent.maxY - extent.minY).toBeCloseTo(size.depth, 1);
    expect((extent.minX + extent.maxX) / 2).toBeCloseTo(0, 6);
    expect((extent.minY + extent.maxY) / 2).toBeCloseTo(0, 1);
    // The wide rim is at the back when it is the vessel's top, at the front when it is its bottom.
    const widthAt = (loop: PattiesLoop, back: boolean) => {
      const y = back ? extent.maxY : extent.minY;
      const near = loop.filter((p) => Math.abs(p.y - y) < size.depth * 0.25);
      return Math.max(...near.map((p) => p.x)) - Math.min(...near.map((p) => p.x));
    };
    expect(widthAt(plan.outline, true)).toBeGreaterThan(widthAt(plan.outline, false));
    const hanging = pattiesPlan({ ...settings, fanTop: 60, fanBottom: 80 }, size.width, size.depth);
    expect(widthAt(hanging.outline, false)).toBeGreaterThan(widthAt(hanging.outline, true));
  });

  it("follows the vessel when one of its measures changes, and stays as pulled otherwise", () => {
    const flat = { patties: settingsFor("dots") };
    expect(pattiesShapePatch(flat, { count: 12 })).toEqual({ patties: { ...flat.patties, count: 12 } });
    const toFan = pattiesShapePatch(flat, { outline: "fan" });
    const fan = pattiesFan(toFan.patties);
    expect(toFan.width).toBeCloseTo(fan.width, 2);
    expect(toFan.depth).toBeCloseTo(fan.depth, 2);
    const pulled = { patties: toFan.patties };
    expect(pattiesShapePatch(pulled, { gap: 2 }).width).toBeUndefined();
    expect(pattiesShapePatch(pulled, { fanSide: 120 }).depth).toBeGreaterThan(toFan.depth!);
  });
});

describe("Patties: the drawing for a cutter", () => {
  it("holds the plate's edge and every figure in millimetres", () => {
    const plan = pattiesPlan(settingsFor("warp", { count: 3, rows: 2, bulge: 0, roundness: 0 }), 60, 40);
    const svg = pattiesSvg(plan);
    expect(svg).toContain('width="60mm" height="40mm" viewBox="0 0 60 40"');
    expect(svg.match(/M/g)).toHaveLength(1 + 6);
    expect(svg).toContain("M0 40L60 40L60 0L0 0Z");
  });
});
