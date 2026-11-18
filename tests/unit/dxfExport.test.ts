import { describe, expect, it } from "vitest";
import { cleanDxfLoop, DXF_FIT_TOLERANCE, dxfEntityEnds, dxfLoopEntities, outlinesToDxf, type DxfEntity, type DxfPoint } from "@/lib/dxfExport";

function circlePoints(cx: number, cy: number, r: number, sides: number, from = 0, to = Math.PI * 2, closed = true): DxfPoint[] {
  const count = closed ? sides : sides + 1;
  return Array.from({ length: count }, (_, index) => {
    const angle = from + ((to - from) * index) / sides;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as DxfPoint;
  });
}

/** A rounded rectangle as the editor's polygons have it: each corner a quarter of a 24-sided circle. */
function roundedRectangle(width: number, height: number, r: number, perQuarter = 6): DxfPoint[] {
  const corner = (cx: number, cy: number, start: number) => circlePoints(cx, cy, r, perQuarter, start, start + Math.PI / 2, false);
  return [
    ...corner(width - r, r, -Math.PI / 2),
    ...corner(width - r, height - r, 0),
    ...corner(r, height - r, Math.PI / 2),
    ...corner(r, r, Math.PI),
  ];
}

function types(entities: DxfEntity[]) {
  return entities.map((entity) => entity.type);
}

/** How far a point lies from an entity's curve (for arcs: from the circle, inside its angles or not). */
function offEntity(point: DxfPoint, entity: DxfEntity) {
  if (entity.type === "line") {
    const [a, b] = [entity.from, entity.to];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1])) / (length * length)));
    return Math.hypot(point[0] - (a[0] + t * (b[0] - a[0])), point[1] - (a[1] + t * (b[1] - a[1])));
  }
  return Math.abs(Math.hypot(point[0] - entity.center[0], point[1] - entity.center[1]) - entity.radius);
}

/** Every entity starts where the one before ends, the last ending where the first starts. */
function expectClosedChain(entities: DxfEntity[]) {
  const ends = entities.map(dxfEntityEnds);
  ends.forEach((end, index) => {
    expect(end).not.toBeNull();
    const next = ends[(index + 1) % ends.length]!;
    // An arc runs counter-clockwise in DXF, so its ends may be swapped against the run of the outline.
    const touches = [end![0], end![1]].some((a) => [next[0], next[1]].some((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6));
    expect(touches, `entity ${index} meets entity ${(index + 1) % ends.length}`).toBe(true);
  });
}

describe("DXF for laser cutting (#774): lines, arcs and circles", () => {
  it("finds a hole's true circle in its 24 corners", () => {
    const entities = dxfLoopEntities(circlePoints(8, 8, 2.75, 24));
    expect(types(entities)).toEqual(["circle"]);
    const circle = entities[0] as Extract<DxfEntity, { type: "circle" }>;
    expect(circle.radius).toBeCloseTo(2.75, 9);
    expect(circle.center[0]).toBeCloseTo(8, 9);
    expect(circle.center[1]).toBeCloseTo(8, 9);
  });

  it("makes a rounded rectangle four lines and four arcs of the corner radius", () => {
    const entities = dxfLoopEntities(roundedRectangle(100, 60, 5));
    expect(entities.filter((entity) => entity.type === "line")).toHaveLength(4);
    const arcs = entities.filter((entity): entity is Extract<DxfEntity, { type: "arc" }> => entity.type === "arc");
    expect(arcs).toHaveLength(4);
    arcs.forEach((arc) => expect(arc.radius).toBeCloseTo(5, 9));
    expectClosedChain(entities);
  });

  it("keeps a hexagon, a square and a star as straight lines", () => {
    expect(types(dxfLoopEntities(circlePoints(0, 0, 10, 6)))).toEqual(Array(6).fill("line"));
    expect(types(dxfLoopEntities([[0, 0], [20, 0], [20, 20], [0, 20]]))).toEqual(Array(4).fill("line"));
    const star = Array.from({ length: 10 }, (_, index) => {
      const r = index % 2 ? 4 : 10;
      const angle = (index * Math.PI) / 5;
      return [r * Math.cos(angle), r * Math.sin(angle)] as DxfPoint;
    });
    expect(types(dxfLoopEntities(star))).toEqual(Array(10).fill("line"));
  });

  it("drops corners in the middle of a straight side", () => {
    expect(cleanDxfLoop([[0, 0], [10, 0], [20, 0], [20, 20], [10, 20], [0, 20], [0, 20]])).toHaveLength(4);
    expect(types(dxfLoopEntities([[0, 0], [10, 0], [20, 0], [20, 20], [0, 20]]))).toEqual(Array(4).fill("line"));
  });

  it("follows a free curve with arcs only, within the tolerance and without gaps", () => {
    // An ellipse, as a letter or an imported drawing brings it: no circle runs through it.
    const ellipse = Array.from({ length: 720 }, (_, index) => {
      const angle = (index * Math.PI * 2) / 720;
      return [30 * Math.cos(angle), 10 * Math.sin(angle)] as DxfPoint;
    });
    const entities = dxfLoopEntities(ellipse);
    expect(entities.every((entity) => entity.type === "arc")).toBe(true);
    // Far fewer pieces than the 720 corners, which is the point.
    expect(entities.length).toBeLessThan(80);
    ellipse.forEach((point) => {
      const nearest = Math.min(...entities.map((entity) => offEntity(point, entity)));
      expect(nearest).toBeLessThanOrEqual(DXF_FIT_TOLERANCE + 1e-9);
    });
    expectClosedChain(entities);
  });

  it("still finds the circle and the arcs when the corners wander a few thousandths off the curve", () => {
    // A sketch body's outline (a DXF read back, a drawn curve): many uneven corners, each a little in or out.
    const wobble = (index: number) => 0.004 * Math.sin(index * 2.7) * Math.cos(index * 1.3);
    const hole = circlePoints(0, 0, 15, 352).map(([x, y], index): DxfPoint => {
      const scale = (15 + wobble(index)) / 15;
      return [x * scale, y * scale];
    });
    const circle = dxfLoopEntities(hole);
    expect(types(circle)).toEqual(["circle"]);
    expect(Math.abs((circle[0] as Extract<DxfEntity, { type: "circle" }>).radius - 15)).toBeLessThan(0.005);
    const plate = roundedRectangle(100, 60, 5, 40).map(([x, y], index): DxfPoint => [x + wobble(index), y - wobble(index + 5)]);
    const entities = dxfLoopEntities(plate);
    expect(entities.filter((entity) => entity.type === "arc")).toHaveLength(4);
    expect(entities.filter((entity) => entity.type === "line")).toHaveLength(4);
    expectClosedChain(entities);
  });

  it("keeps a short straight side of a slot a line, between two whole half circles", () => {
    // The 19" rack slot, 10.3 x 6.8 mm, its ends drawn with 30 sides each as the editor has them: the 3.5 mm side lies
    // within 0.05 mm of a flat arc through the corners beside it, but is a straight line.
    const slot = [...circlePoints(1.75, 0, 3.4, 30, -Math.PI / 2, Math.PI / 2, false), ...circlePoints(-1.75, 0, 3.4, 30, Math.PI / 2, Math.PI * 1.5, false)];
    // Wherever the outline happens to start, as a mesh's outline starts anywhere.
    for (const start of [0, 5, 31, 40]) {
      const turned = [...slot.slice(start), ...slot.slice(0, start)];
      expect(types(dxfLoopEntities(turned)).sort()).toEqual(["arc", "arc", "line", "line"]);
    }
    const entities = dxfLoopEntities(slot);
    const lines = entities.filter((entity): entity is Extract<DxfEntity, { type: "line" }> => entity.type === "line");
    const arcs = entities.filter((entity): entity is Extract<DxfEntity, { type: "arc" }> => entity.type === "arc");
    expect(lines).toHaveLength(2);
    expect(arcs).toHaveLength(2);
    for (const line of lines) {
      expect(Math.hypot(line.to[0] - line.from[0], line.to[1] - line.from[1])).toBeCloseTo(3.5, 6);
      expect(Math.abs(line.from[1])).toBeCloseTo(3.4, 6);
      expect(Math.abs(line.to[1])).toBeCloseTo(3.4, 6);
    }
    for (const arc of arcs) {
      expect(arc.radius).toBeCloseTo(3.4, 6);
      expect((arc.endAngle - arc.startAngle + 360) % 360).toBeCloseTo(180, 6);
    }
    expectClosedChain(entities);
  });

  it("makes a slot two lines and two half circles", () => {
    const slot = [...circlePoints(62, 30, 4, 12, -Math.PI / 2, Math.PI / 2, false), ...circlePoints(38, 30, 4, 12, Math.PI / 2, Math.PI * 1.5, false)];
    const entities = dxfLoopEntities(slot);
    expect(entities.filter((entity) => entity.type === "line")).toHaveLength(2);
    expect(entities.filter((entity) => entity.type === "arc")).toHaveLength(2);
    expectClosedChain(entities);
  });
});

describe("the DXF file", () => {
  // The editor's page: x to the right, y towards the front. A plate with a hole near its front left corner.
  const plate: DxfPoint[] = [[-50, -30], [50, -30], [50, 30], [-50, 30]];
  const hole = circlePoints(-40, 20, 2.75, 24);
  const result = outlinesToDxf({ loops: [plate, hole] });
  const lines = result.dxf.split("\r\n");
  const value = (name: string) => lines[lines.indexOf(name) + 2];
  const entitySection = lines.slice(lines.indexOf("ENTITIES"), lines.indexOf("OBJECTS"));

  it("is DXF 2000 in millimetres", () => {
    expect(value("$ACADVER")).toBe("AC1015");
    expect(value("$INSUNITS")).toBe("4");
    expect(value("$MEASUREMENT")).toBe("1");
    expect(lines[lines.length - 2]).toBe("EOF");
  });

  it("holds only lines, arcs and circles, on layer 0 in colour 7", () => {
    const kinds = new Set<string>();
    entitySection.forEach((line, index) => {
      if (line === "  0" && index + 1 < entitySection.length) kinds.add(entitySection[index + 1]);
    });
    kinds.delete("ENDSEC");
    kinds.delete("SECTION");
    expect([...kinds].sort()).toEqual(["CIRCLE", "LINE"]);
    const layers = entitySection.filter((_, index) => entitySection[index - 1] === "  8");
    const colours = entitySection.filter((_, index) => entitySection[index - 1] === " 62");
    expect(new Set(layers)).toEqual(new Set(["0"]));
    expect(new Set(colours)).toEqual(new Set(["7"]));
  });

  it("gives every object its own handle, all below the seed", () => {
    const handles = lines.filter((_, index) => lines[index - 1] === "  5" && lines[index - 2] !== "$HANDSEED").map((handle) => parseInt(handle, 16));
    expect(new Set(handles).size).toBe(handles.length);
    expect(Math.max(...handles)).toBeLessThan(parseInt(value("$HANDSEED"), 16));
  });

  it("puts the front at the bottom, not mirrored, the lower left corner at 0,0", () => {
    expect(result.width).toBeCloseTo(100, 9);
    expect(result.height).toBeCloseTo(60, 9);
    const circle = result.entities.find((entity) => entity.type === "circle") as Extract<DxfEntity, { type: "circle" }>;
    // Left stays left (x 10), the front (page y 20 of -30..30) comes out low (y 10 of 0..60).
    expect(circle.center[0]).toBeCloseTo(10, 6);
    expect(circle.center[1]).toBeCloseTo(10, 6);
    expect(result.counts).toEqual({ lines: 4, arcs: 0, circles: 1 });
  });
});

describe("DXF export: sharp little corners stay corners", () => {
  it("does not bend an arc through a few hundredths of a millimetre of zigzag", () => {
    // A square with a tiny step in its top side, as where a QR code's modules meet: its corners lie on some tiny
    // circle, but an arc through them would bulge across the outline beside it.
    const loop: Array<[number, number]> = [[0, 0], [10, 0], [10, 10], [5.06, 10], [5.06, 10.04], [5.02, 10.04], [5.02, 10.08], [4.98, 10.08], [4.98, 10], [0, 10]];
    const { counts } = outlinesToDxf({ loops: [loop] });
    expect(counts.arcs).toBe(0);
    expect(counts.circles).toBe(0);
  });

  it("writes no side shorter than a thousandth of a millimetre, but keeps a QR code's 0.0078 mm steps", () => {
    // Where faces of a mesh meet, its outline from above has crumbs a ten-thousandth of a millimetre long.
    const crumbs: Array<[number, number]> = [[0, 0], [10, 0], [10, 5], [10.0001, 5.0001], [10, 10], [0, 10]];
    const lengths = (loop: Array<[number, number]>) => dxfLoopEntities(loop).map((entity) => {
      const ends = dxfEntityEnds(entity);
      return ends ? Math.hypot(ends[1][0] - ends[0][0], ends[1][1] - ends[0][1]) : Infinity;
    });
    expect(Math.min(...lengths(crumbs))).toBeGreaterThan(1e-3);
    const step: Array<[number, number]> = [[0, 0], [10, 0], [10, 5], [10.0078, 5], [10.0078, 10], [0, 10]];
    expect(lengths(step).some((length) => Math.abs(length - 0.0078) < 1e-9)).toBe(true);
  });
});
