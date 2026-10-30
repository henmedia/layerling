import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRACE_AREA_TOLERANCE,
  defaultTraceSettings,
  MAX_TRACE_CORNER_ANGLE,
  preparePicture,
  tracePathData,
  tracePicture,
  traceRange,
  type PictureTraceSettings,
  type TraceNode,
  type TracePoint,
} from "@/lib/pictureTrace";

/** A picture of `width` x `height` pixels, each coloured by `paint(x, y)` as [red, green, blue, alpha]. */
function picture(width: number, height: number, paint: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) data.set(paint(x, y), (y * width + x) * 4);
  }
  return { width, height, data };
}

const BLACK: [number, number, number, number] = [0, 0, 0, 255];
const WHITE: [number, number, number, number] = [255, 255, 255, 255];

/** Whether pixel centre (x, y) lies in the triangle a, b, c. */
function inTriangle(x: number, y: number, a: TracePoint, b: TracePoint, c: TracePoint) {
  const side = (p: TracePoint, q: TracePoint) => (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x);
  const s1 = side(a, b);
  const s2 = side(b, c);
  const s3 = side(c, a);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
}

/** The outline walked closely: 24 steps along every side, straight or curved. */
function outlinePoints(nodes: readonly TraceNode[]): TracePoint[] {
  const out: TracePoint[] = [];
  nodes.forEach((node, index) => {
    const next = nodes[(index + 1) % nodes.length];
    for (let step = 0; step < 24; step += 1) {
      const u = step / 24;
      const v = 1 - u;
      if (node.handleOut && next.handleIn) {
        out.push({
          x: v * v * v * node.x + 3 * u * v * v * node.handleOut.x + 3 * u * u * v * next.handleIn.x + u * u * u * next.x,
          y: v * v * v * node.y + 3 * u * v * v * node.handleOut.y + 3 * u * u * v * next.handleIn.y + u * u * u * next.y,
        });
      } else out.push({ x: node.x + (next.x - node.x) * u, y: node.y + (next.y - node.y) * u });
    }
  });
  return out;
}

function area(points: readonly TracePoint[]) {
  let sum = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    sum += point.x * next.y - next.x * point.y;
  });
  return Math.abs(sum) / 2;
}

function settingsFor(source: ReturnType<typeof picture>, patch: Partial<PictureTraceSettings> = {}) {
  const prepared = preparePicture(source);
  return { prepared, settings: { ...defaultTraceSettings(prepared), ...patch } };
}

const square = picture(80, 80, (x, y) => (x >= 20 && x < 60 && y >= 20 && y < 60 ? BLACK : WHITE));
const disk = picture(100, 100, (x, y) => (Math.hypot(x + 0.5 - 50, y + 0.5 - 50) <= 35 ? BLACK : WHITE));
const ring = picture(100, 100, (x, y) => {
  const r = Math.hypot(x + 0.5 - 50, y + 0.5 - 50);
  return r <= 40 && r >= 20 ? BLACK : WHITE;
});
// An "A" of sorts: a triangle with a triangular hole.
const outer = [{ x: 60, y: 10 }, { x: 110, y: 100 }, { x: 10, y: 100 }];
const inner = [{ x: 60, y: 45 }, { x: 80, y: 82 }, { x: 40, y: 82 }];
const letter = picture(120, 110, (x, y) =>
  inTriangle(x + 0.5, y + 0.5, outer[0], outer[1], outer[2]) && !inTriangle(x + 0.5, y + 0.5, inner[0], inner[1], inner[2]) ? BLACK : WHITE);

describe("tracing a picture into points (Trace)", () => {
  it("starts from the shape that is not the background, cut half way between black and white", () => {
    const { settings } = settingsFor(square);
    expect(settings.part).toBe("dark");
    expect(settings.threshold).toBeCloseTo(0.5, 1);
    expect(settings.holes).toBe(true);
    const light = settingsFor(picture(60, 60, (x, y) => (x >= 15 && x < 45 && y >= 15 && y < 45 ? WHITE : BLACK))).settings;
    expect(light.part).toBe("light");
  });

  it("traces a black square as four corners joined by straight sides, where the square's corners are", () => {
    const { prepared, settings } = settingsFor(square);
    const trace = tracePicture(prepared, settings);
    expect(trace.rings).toHaveLength(1);
    const { nodes, hole } = trace.rings[0];
    expect(hole).toBe(false);
    expect(nodes).toHaveLength(4);
    expect(nodes.every((node) => node.corner && !node.handleIn && !node.handleOut)).toBe(true);
    const corners = [[20, 20], [60, 20], [60, 60], [20, 60]];
    corners.forEach(([x, y]) => {
      const nearest = Math.min(...nodes.map((node) => Math.hypot(node.x - x, node.y - y)));
      expect(nearest).toBeLessThan(0.75);
    });
    expect(trace.points).toBe(4);
    expect(trace.corners).toBe(4);
  });

  it("traces a disk as one smooth loop of a few points with handles, round within a pixel", () => {
    const { prepared, settings } = settingsFor(disk);
    const trace = tracePicture(prepared, settings);
    expect(trace.rings).toHaveLength(1);
    const { nodes } = trace.rings[0];
    expect(nodes.length).toBeGreaterThanOrEqual(3);
    expect(nodes.length).toBeLessThanOrEqual(12);
    expect(nodes.every((node) => !node.corner && node.handleIn && node.handleOut)).toBe(true);
    // Smooth: each point's two handles lie on one line through it.
    nodes.forEach((node) => {
      const a = { x: node.handleIn!.x - node.x, y: node.handleIn!.y - node.y };
      const b = { x: node.handleOut!.x - node.x, y: node.handleOut!.y - node.y };
      expect((a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y))).toBeLessThan(-0.999);
    });
    outlinePoints(nodes).forEach((point) => expect(Math.abs(Math.hypot(point.x - 50, point.y - 50) - 35)).toBeLessThan(1));
  });

  it("keeps the hole of a ring, or only its outer edge without holes", () => {
    const { prepared, settings } = settingsFor(ring);
    const withHoles = tracePicture(prepared, settings);
    expect(withHoles.rings.map((entry) => entry.hole).sort()).toEqual([false, true]);
    const outerArea = area(outlinePoints(withHoles.rings.find((entry) => !entry.hole)!.nodes));
    const holeArea = area(outlinePoints(withHoles.rings.find((entry) => entry.hole)!.nodes));
    expect(outerArea).toBeCloseTo(Math.PI * 40 * 40, -2);
    expect(holeArea).toBeCloseTo(Math.PI * 20 * 20, -2);
    const silhouette = tracePicture(prepared, { ...settings, holes: false });
    expect(silhouette.rings).toHaveLength(1);
    expect(silhouette.rings[0].hole).toBe(false);
  });

  it("gives an A its pointed corners, outside and in the hole", () => {
    const { prepared, settings } = settingsFor(letter);
    const trace = tracePicture(prepared, settings);
    expect(trace.rings).toHaveLength(2);
    trace.rings.forEach((entry) => {
      expect(entry.nodes).toHaveLength(3);
      expect(entry.nodes.every((node) => node.corner)).toBe(true);
    });
    const apex = trace.rings.find((entry) => !entry.hole)!.nodes.reduce((top, node) => (node.y < top.y ? node : top));
    expect(Math.hypot(apex.x - 60, apex.y - 10)).toBeLessThan(3);
  });

  it("makes no corners at the largest corner angle: the sides turn smoothly instead", () => {
    const { prepared, settings } = settingsFor(square, { cornerAngle: MAX_TRACE_CORNER_ANGLE });
    const trace = tracePicture(prepared, settings);
    expect(trace.corners).toBe(0);
    expect(trace.rings[0].nodes.every((node) => !node.corner)).toBe(true);
  });

  it("sets no more points than asked for, closer to the picture the more it may set", () => {
    const { prepared, settings } = settingsFor(ring);
    const range = traceRange(prepared, settings);
    expect(range.fewest).toBeGreaterThanOrEqual(6);
    expect(range.most).toBeGreaterThanOrEqual(range.suggested);
    expect(range.suggested).toBeGreaterThanOrEqual(range.fewest);
    const few = tracePicture(prepared, { ...settings, points: range.fewest });
    const many = tracePicture(prepared, { ...settings, points: range.most });
    expect(few.points).toBeLessThanOrEqual(range.fewest);
    expect(many.points).toBeLessThanOrEqual(range.most);
    expect(many.points).toBeGreaterThan(few.points);
    const error = (trace: typeof few) => Math.max(...trace.rings.flatMap((entry) => outlinePoints(entry.nodes).map((point) => {
      const r = Math.hypot(point.x - 50, point.y - 50);
      return Math.min(Math.abs(r - 40), Math.abs(r - 20));
    })));
    expect(error(many)).toBeLessThan(error(few));
    // Never fewer than three sides to an outline.
    expect(tracePicture(prepared, { ...settings, points: 1 }).rings.every((entry) => entry.nodes.length >= 3)).toBe(true);
  });

  it("leaves out specks smaller than asked, and traces the light part when asked", () => {
    const dotted = picture(100, 100, (x, y) => {
      if (x >= 20 && x < 70 && y >= 20 && y < 70) return BLACK;
      if (x >= 85 && x < 88 && y >= 85 && y < 88) return BLACK;
      return WHITE;
    });
    const { prepared, settings } = settingsFor(dotted);
    expect(tracePicture(prepared, { ...settings, speck: 4 }).rings).toHaveLength(2);
    expect(tracePicture(prepared, { ...settings, speck: 30 }).rings).toHaveLength(1);
    // The light part: the white around the shapes, with the square as a hole in it.
    const light = tracePicture(prepared, { ...settings, part: "light", speck: 30 });
    expect(light.rings.some((entry) => entry.hole)).toBe(true);
  });

  it("gives the points in the picture's own pixels when it was shrunk to trace", () => {
    const large = picture(2000, 1000, (x, y) => (x >= 500 && x < 1500 && y >= 250 && y < 750 ? BLACK : WHITE));
    const { prepared, settings } = settingsFor(large);
    expect(prepared.pixels.width).toBe(1000);
    const nodes = tracePicture(prepared, settings).rings[0].nodes;
    expect(Math.min(...nodes.map((node) => node.x))).toBeCloseTo(500, -1);
    expect(Math.max(...nodes.map((node) => node.x))).toBeCloseTo(1500, -1);
    expect(Math.min(...nodes.map((node) => node.y))).toBeCloseTo(250, -1);
  });

  it("writes the outlines as SVG path data, curves as C, each outline closed", () => {
    const { prepared, settings } = settingsFor(disk);
    const data = tracePathData(tracePicture(prepared, settings));
    expect(data.startsWith("M")).toBe(true);
    expect(data).toContain("C");
    expect(data.endsWith("Z")).toBe(true);
    const squareData = tracePathData(tracePicture(...Object.values(settingsFor(square)) as [ReturnType<typeof preparePicture>, PictureTraceSettings]));
    expect(squareData.match(/L/g)).toHaveLength(3);
  });

  it("traces nothing when the settings leave nothing", () => {
    const { prepared, settings } = settingsFor(square);
    expect(tracePicture(prepared, { ...settings, speck: 1e6 })).toEqual({ rings: [], points: 0, corners: 0 });
    expect(traceRange(prepared, { ...settings, speck: 1e6 })).toEqual({ fewest: 0, most: 0, suggested: 0 });
  });

  describe("the object before its background, and areas clicked in it", () => {
    const RED: [number, number, number, number] = [210, 30, 40, 255];
    const BLUE: [number, number, number, number] = [150, 200, 240, 255];
    /** A red toy on white: a body with a white logo (a patch the colour of the background) and a pale blue window. */
    const toy = picture(140, 100, (x, y) => {
      if (x < 20 || x >= 120 || y < 20 || y >= 80) return WHITE;
      if (x >= 35 && x < 55 && y >= 35 && y < 55) return WHITE;
      if (x >= 80 && x < 105 && y >= 30 && y < 50) return BLUE;
      return RED;
    });

    it("starts a colourful picture on an even background as the object, without holes", () => {
      const { prepared, settings } = settingsFor(toy);
      expect(settings.part).toBe("object");
      expect(settings.holes).toBe(false);
      expect(settings.areas).toEqual([]);
      const trace = tracePicture(prepared, settings);
      expect(trace.rings).toHaveLength(1);
      expect(trace.rings[0]).toMatchObject({ source: "outline", hole: false });
      // The white logo is part of the object: one outline round the whole body.
      expect(area(outlinePoints(trace.rings[0].nodes))).toBeCloseTo(100 * 60, -2);
    });

    it("finds the patches of background colour inside the object as holes, each by a key of its own", () => {
      const { prepared, settings } = settingsFor(toy, { holes: true });
      const trace = tracePicture(prepared, settings);
      const holes = trace.rings.filter((ring) => ring.source === "hole");
      expect(holes).toHaveLength(1);
      expect(holes[0].hole).toBe(true);
      expect(area(outlinePoints(holes[0].nodes))).toBeCloseTo(20 * 20, -1.5);
      // Taken out of the list, it is gone; the outline stays.
      const without = tracePicture(prepared, { ...settings, removed: [holes[0].key] });
      expect(without.rings.map((ring) => ring.source)).toEqual(["outline"]);
      // The key survives a small change of the threshold.
      const moved = tracePicture(prepared, { ...settings, threshold: settings.threshold + 0.03 });
      expect(moved.rings.find((ring) => ring.source === "hole")?.key).toBe(holes[0].key);
    });

    it("outlines a clicked area as a hole, or as a construction line when it is not cut out", () => {
      const { prepared, settings } = settingsFor(toy);
      const clicked = { ...settings, areas: [{ id: "window", x: 92, y: 40 }] };
      const trace = tracePicture(prepared, clicked);
      const window = trace.rings.find((ring) => ring.source === "area");
      expect(window).toMatchObject({ key: "a:window", hole: true });
      expect(window?.line).toBeUndefined();
      expect(area(outlinePoints(window!.nodes))).toBeCloseTo(25 * 20, -1.5);
      expect(tracePicture(prepared, { ...clicked, lines: ["a:window"] }).rings.find((ring) => ring.source === "area")?.line).toBe(true);
      // A tolerance too small for the window's own colour still takes the window: its colour is even.
      expect(tracePicture(prepared, { ...clicked, areaTolerance: 0.01 }).rings.some((ring) => ring.key === "a:window")).toBe(true);
      expect(DEFAULT_TRACE_AREA_TOLERANCE).toBeGreaterThan(0);
    });

    it("refuses an area that reaches the picture's edge: that is the background", () => {
      const { prepared, settings } = settingsFor(toy);
      const trace = tracePicture(prepared, { ...settings, areas: [{ id: "wall", x: 5, y: 5 }, { id: "out", x: 500, y: 5 }] });
      expect(trace.rejected?.sort()).toEqual(["out", "wall"]);
      expect(trace.rings.some((ring) => ring.source === "area")).toBe(false);
    });

    it("takes an area in place of the hole that is the same patch, so the two do not cancel out", () => {
      const { prepared, settings } = settingsFor(toy, { holes: true });
      const trace = tracePicture(prepared, { ...settings, areas: [{ id: "logo", x: 45, y: 45 }] });
      expect(trace.rings.filter((ring) => ring.source !== "outline").map((ring) => ring.key)).toEqual(["a:logo"]);
    });

    it("lets an island in a hole go with its hole: out of the list, or a construction line with it", () => {
      // A black square with a white hole and a black dot in the hole.
      const islandPicture = picture(80, 80, (x, y) => {
        const inSquare = x >= 10 && x < 70 && y >= 10 && y < 70;
        const inHole = x >= 25 && x < 55 && y >= 25 && y < 55;
        const inDot = x >= 35 && x < 45 && y >= 35 && y < 45;
        return inSquare && (!inHole || inDot) ? BLACK : WHITE;
      });
      const { prepared, settings } = settingsFor(islandPicture);
      const trace = tracePicture(prepared, settings);
      expect(trace.rings).toHaveLength(3);
      const hole = trace.rings.find((ring) => ring.source === "hole")!;
      expect(tracePicture(prepared, { ...settings, removed: [hole.key] }).rings).toHaveLength(1);
      const lined = tracePicture(prepared, { ...settings, lines: [hole.key] });
      expect(lined.rings.filter((ring) => ring.line)).toHaveLength(2);
    });
  });

  describe("cutting a part away (Cut away)", () => {
    const GREY: [number, number, number, number] = [110, 110, 115, 255];
    /** A black block with a grey shadow below it, as dark as a part: no threshold tells them apart. */
    const shadowed = picture(120, 100, (x, y) => {
      if (x >= 20 && x < 100 && y >= 20 && y < 60) return BLACK;
      if (x >= 30 && x < 90 && y >= 60 && y < 75) return GREY;
      return WHITE;
    });

    it("takes a part away whatever its colour, the outline running along the cut", () => {
      const { prepared, settings } = settingsFor(shadowed, { part: "dark", threshold: 0.5 });
      const whole = tracePicture(prepared, settings);
      expect(area(outlinePoints(whole.rings[0].nodes))).toBeGreaterThan(80 * 40 + 60 * 10);
      const cut = tracePicture(prepared, { ...settings, cuts: [{ id: "shadow", points: [{ x: 25, y: 60 }, { x: 95, y: 60 }, { x: 95, y: 85 }, { x: 25, y: 85 }] }] });
      expect(cut.rings).toHaveLength(1);
      expect(area(outlinePoints(cut.rings[0].nodes))).toBeCloseTo(80 * 40, -2);
      expect(Math.max(...cut.rings[0].nodes.map((node) => node.y))).toBeLessThan(61);
    });

    it("cuts a hole inside the shape, kept without holes too, and works on the object", () => {
      const { prepared, settings } = settingsFor(square, { holes: false });
      const inner = [{ x: 30, y: 30 }, { x: 50, y: 30 }, { x: 50, y: 50 }, { x: 30, y: 50 }];
      const trace = tracePicture(prepared, { ...settings, cuts: [{ id: "middle", points: inner }] });
      const hole = trace.rings.find((ring) => ring.source === "cut");
      expect(hole?.hole).toBe(true);
      expect(area(outlinePoints(hole!.nodes))).toBeCloseTo(20 * 20, -1.5);
      const objectTrace = tracePicture(prepared, { ...settings, part: "object", threshold: 0.2, cuts: [{ id: "middle", points: inner }] });
      expect(objectTrace.rings.map((ring) => ring.source).sort()).toEqual(["cut", "outline"]);
      // A cut with fewer than three corners takes nothing.
      expect(tracePicture(prepared, { ...settings, cuts: [{ id: "line", points: inner.slice(0, 2) }] }).rings).toHaveLength(1);
    });
  });

  it("never gives outlines that cross: those that would are fitted more closely, and the trace says so", () => {
    // A drawn line: a frame 3 pixels wide, whose two edges lie close together, and a second frame touching it.
    const frames = picture(160, 120, (x, y) => {
      const frame = (x0: number, y0: number, x1: number, y1: number) => x >= x0 && x < x1 && y >= y0 && y < y1 && !(x >= x0 + 3 && x < x1 - 3 && y >= y0 + 3 && y < y1 - 3);
      return frame(10, 10, 90, 110) || frame(84, 30, 150, 90) ? BLACK : WHITE;
    });
    const { prepared, settings } = settingsFor(frames, { part: "dark", threshold: 0.5, holes: true, cornerAngle: MAX_TRACE_CORNER_ANGLE });
    const trace = tracePicture(prepared, { ...settings, points: 1 });
    const segments = trace.rings.flatMap((ring, ringIndex) => {
      const points = outlinePoints(ring.nodes);
      return points.map((a, index) => ({ ringIndex, index, count: points.length, a, b: points[(index + 1) % points.length] }));
    });
    const side = (p: TracePoint, q: TracePoint, r: TracePoint) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    let crossings = 0;
    for (let i = 0; i < segments.length; i += 1) {
      for (let j = i + 1; j < segments.length; j += 1) {
        const first = segments[i];
        const second = segments[j];
        if (first.ringIndex === second.ringIndex && (Math.abs(first.index - second.index) <= 1 || Math.abs(first.index - second.index) === first.count - 1)) continue;
        if (side(first.a, first.b, second.a) * side(first.a, first.b, second.b) < 0 && side(second.a, second.b, first.a) * side(second.a, second.b, first.b) < 0) crossings += 1;
      }
    }
    expect(crossings).toBe(0);
    expect(trace.refined).toBe(true);
    expect(trace.points).toBeGreaterThan(traceRange(prepared, settings).fewest);
  });
});
