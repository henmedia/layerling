import { describe, expect, it } from "vitest";
import {
  CONNECTOR_END_PLAY,
  CONNECTOR_WALL,
  MAX_CONNECTOR_CLEARANCE,
  MAX_CONNECTOR_COUNT,
  SPLIT_CONNECTOR_DEFAULTS,
  autoConnectorCount,
  connectorEdgeMargin,
  connectorHoleRadius,
  dowelLength,
  normalizeSplitConnectorOptions,
  placeConnectorsOnPiece,
  placeSplitConnectors,
  plugHeight,
  sectionArea,
  splitConnectorDefaults,
  splitFramePoint,
  splitPlaneFrame,
  type SectionRing,
} from "@/lib/splitConnectors";
import { modelSplitPlane } from "@/lib/modelSplit";

/*
 * Where Split's connectors go on the cut face (Discussion #832), worked out on outlines given in the plane's frame: a
 * single box, two separate pieces, a ring round a hole, a piece too small for one and a tilted plane. Every connector
 * keeps its diameter and a wall from every edge and twice that from the others, and the same cut always gives the same.
 */

type Point = readonly [number, number];

/** A rectangle, counter-clockwise, `width` by `height` about (cx, cy). */
const rectangle = (width: number, height: number, cx = 0, cy = 0): SectionRing => [
  [cx - width / 2, cy - height / 2], [cx + width / 2, cy - height / 2], [cx + width / 2, cy + height / 2], [cx - width / 2, cy + height / 2],
];

/** A circle of `sides` corners, counter-clockwise, or clockwise for a hole. */
const circle = (radius: number, sides = 96, clockwise = false): SectionRing => Array.from({ length: sides }, (_, index) => {
  const angle = ((clockwise ? -index : index) / sides) * Math.PI * 2;
  return [radius * Math.cos(angle), radius * Math.sin(angle)] as const;
});

function distanceToEdges(rings: readonly SectionRing[], [x, y]: Point) {
  let nearest = Number.POSITIVE_INFINITY;
  for (const ring of rings) {
    ring.forEach(([ax, ay], index) => {
      const [bx, by] = ring[(index + 1) % ring.length];
      const dx = bx - ax;
      const dy = by - ay;
      const along = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      nearest = Math.min(nearest, Math.hypot(ax + along * dx - x, ay + along * dy - y));
    });
  }
  return nearest;
}

/** Every connector its diameter and a wall from every edge, and twice that from every other connector. */
function expectRoomAround(rings: readonly SectionRing[], points: readonly Point[], diameter = 5) {
  const margin = connectorEdgeMargin(diameter);
  for (const point of points) expect(distanceToEdges(rings, point)).toBeGreaterThanOrEqual(margin - 1e-3);
  points.forEach((point, index) => points.slice(index + 1).forEach((other) => {
    expect(Math.hypot(point[0] - other[0], point[1] - other[1])).toBeGreaterThanOrEqual(2 * margin - 1e-3);
  }));
}

describe("the connectors' settings", () => {
  it("start from none, 5 mm pins 6 mm deep and the built-in clearance", () => {
    expect(SPLIT_CONNECTOR_DEFAULTS).toEqual({ kind: "none", count: 0, diameter: 5, depth: 6, clearance: 0.2 });
    expect(splitConnectorDefaults(null)).toEqual(SPLIT_CONNECTOR_DEFAULTS);
  });

  it("hold every value within its field and keep the rest", () => {
    expect(normalizeSplitConnectorOptions({ kind: "Dowels", count: 40, diameter: 0.5, depth: 99, clearance: -1 })).toEqual({
      kind: "dowels", count: MAX_CONNECTOR_COUNT, diameter: 2, depth: 30, clearance: 0,
    });
    expect(normalizeSplitConnectorOptions({ kind: "screws", count: 2.6, diameter: "6,5", clearance: 0.9 })).toEqual({
      kind: "none", count: 3, diameter: 6.5, depth: 6, clearance: MAX_CONNECTOR_CLEARANCE,
    });
    const start = { ...SPLIT_CONNECTOR_DEFAULTS, kind: "plugs" as const, clearance: 0.15 };
    expect(normalizeSplitConnectorOptions({ depth: 8 }, start)).toEqual({ ...start, depth: 8 });
  });

  it("make a dowel shorter than both holes and a peg shorter than its hole, by the end play", () => {
    const options = { ...SPLIT_CONNECTOR_DEFAULTS, depth: 6 };
    expect(dowelLength(options)).toBeCloseTo(12 - 2 * CONNECTOR_END_PLAY, 9);
    expect(dowelLength(options) / 2).toBeLessThan(options.depth);
    expect(plugHeight(options)).toBeCloseTo(6 - CONNECTOR_END_PLAY, 9);
    expect(connectorHoleRadius({ diameter: 5, clearance: 0.2 })).toBeCloseTo(2.7, 9);
    expect(connectorEdgeMargin(5)).toBeCloseTo(5 + CONNECTOR_WALL, 9);
  });

  it("give a cut face at least two when left to its size, more on a larger one, at most eight", () => {
    expect(autoConnectorCount(40 * 40, 5)).toBe(2);
    expect(autoConnectorCount(100 * 100, 5)).toBe(4);
    expect(autoConnectorCount(1000 * 1000, 5)).toBe(8);
    expect(autoConnectorCount(0, 5)).toBe(0);
  });
});

describe("where connectors go on one box", () => {
  it("puts two in the middles of the halves of a long cut face", () => {
    const rings = [rectangle(60, 30)];
    const points = placeConnectorsOnPiece(rings, { diameter: 5, count: 0 });
    expect(points).toHaveLength(2);
    expect(points[0][0]).toBeCloseTo(-15, 1);
    expect(points[1][0]).toBeCloseTo(15, 1);
    points.forEach(([, y]) => expect(y).toBeCloseTo(0, 1));
    expectRoomAround(rings, points);
  });

  it("puts four in the quarters of a large square, and as many as asked", () => {
    const rings = [rectangle(100, 100)];
    const points = placeConnectorsOnPiece(rings, { diameter: 5, count: 0 });
    expect(points).toHaveLength(4);
    points.forEach(([x, y]) => {
      expect(Math.abs(x)).toBeCloseTo(25, 1);
      expect(Math.abs(y)).toBeCloseTo(25, 1);
    });
    expect(placeConnectorsOnPiece(rings, { diameter: 5, count: 1 })).toEqual([[0, 0]]);
    const nine = placeConnectorsOnPiece(rings, { diameter: 5, count: 9 });
    expect(nine).toHaveLength(9);
    expectRoomAround(rings, nine);
  });

  it("gives fewer than asked where there is less room, spread out for that many", () => {
    const rings = [rectangle(40, 40)];
    const points = placeConnectorsOnPiece(rings, { diameter: 5, count: MAX_CONNECTOR_COUNT });
    expect(points.length).toBeGreaterThan(1);
    expect(points.length).toBeLessThan(MAX_CONNECTOR_COUNT);
    expectRoomAround(rings, points);
  });

  it("gives one to a cut face with room for only one, in its middle", () => {
    expect(placeConnectorsOnPiece([rectangle(20, 20)], { diameter: 5, count: 0 })).toEqual([[0, 0]]);
    // The middle of a round face is the only spot, a hair inside its margin: the grid alone could miss it.
    const round = [circle(connectorEdgeMargin(5) + 0.05, 192)];
    expect(placeConnectorsOnPiece(round, { diameter: 5, count: 0 })).toEqual([[0, 0]]);
  });

  it("works the same out every time", () => {
    const rings = [rectangle(73, 41, 3, -2)];
    expect(placeConnectorsOnPiece(rings, { diameter: 4, count: 5 })).toEqual(placeConnectorsOnPiece(rings, { diameter: 4, count: 5 }));
  });
});

describe("pieces of a cut face", () => {
  it("gives two separate pieces their own, whatever order they come in", () => {
    const left = [rectangle(40, 30, -50, 0)];
    const right = [rectangle(40, 30, 50, 0)];
    const placed = placeSplitConnectors([right, left], { diameter: 5, count: 0 });
    expect(placed.faces).toBe(2);
    expect(placed.tooSmall).toBe(0);
    expect(placed.points).toHaveLength(4);
    expect(placed.points.filter(([x]) => x < 0)).toHaveLength(2);
    expect(placed.points.filter(([x]) => x > 0)).toHaveLength(2);
    expect(placeSplitConnectors([left, right], { diameter: 5, count: 0 })).toEqual(placed);
    expectRoomAround([...left, ...right], placed.points);
  });

  it("keeps out of the hole in the middle of a ring, a margin from both its edges", () => {
    const rings = [circle(30), circle(15, 96, true)];
    expect(sectionArea(rings)).toBeCloseTo(Math.PI * (900 - 225), -1);
    const points = placeConnectorsOnPiece(rings, { diameter: 5, count: 0 });
    expect(points).toHaveLength(2);
    points.forEach(([x, y]) => {
      const radius = Math.hypot(x, y);
      expect(radius).toBeGreaterThanOrEqual(15 + connectorEdgeMargin(5) - 1e-3);
      expect(radius).toBeLessThanOrEqual(30 - connectorEdgeMargin(5) + 1e-3);
    });
    // Opposite each other, as far apart as the ring allows.
    expect(Math.hypot(points[0][0] + points[1][0], points[0][1] + points[1][1])).toBeLessThan(3);
    // Four go round it, a quarter turn apart.
    const four = placeConnectorsOnPiece(rings, { diameter: 5, count: 4 });
    expect(four).toHaveLength(4);
    expectRoomAround(rings, four);
  });

  it("gives a piece too small for one none, and counts it", () => {
    const thin = [rectangle(30, 12, 0, 40)];
    const tooSmallRing = [circle(20), circle(15, 96, true)];
    expect(placeConnectorsOnPiece(thin, { diameter: 5, count: 0 })).toEqual([]);
    expect(placeConnectorsOnPiece(tooSmallRing, { diameter: 5, count: 3 })).toEqual([]);
    const placed = placeSplitConnectors([thin, [rectangle(60, 30)]], { diameter: 5, count: 0 });
    expect(placed).toMatchObject({ faces: 2, tooSmall: 1 });
    expect(placed.points).toHaveLength(2);
    expect(placed.points.every(([, y]) => Math.abs(y) < 15)).toBe(true);
    // A smaller diameter fits where the larger did not.
    expect(placeConnectorsOnPiece(thin, { diameter: 3, count: 0 }).length).toBeGreaterThan(0);
    expect(placeSplitConnectors([thin], { diameter: 5, count: 0 })).toEqual({ points: [], faces: 1, tooSmall: 1 });
  });
});

describe("a tilted plane", () => {
  it("has a right-handed frame across it, of whole axes when it is square to them", () => {
    expect(splitPlaneFrame([0, 1, 0])).toEqual({ u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] });
    expect(splitPlaneFrame([1, 0, 0])).toEqual({ u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0] });
    const tilted = modelSplitPlane([[-30, -30, -30], [30, 30, 30]], "y", 0, [30, 20])!;
    const { u, v, n } = splitPlaneFrame(tilted.normal);
    const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(u, u)).toBeCloseTo(1, 12);
    expect(dot(v, v)).toBeCloseTo(1, 12);
    expect(dot(u, v)).toBeCloseTo(0, 12);
    expect(dot(u, n)).toBeCloseTo(0, 12);
    // u × v is the normal.
    expect([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]].map((value, index) => value - n[index]).every((value) => Math.abs(value) < 1e-12)).toBe(true);
  });

  it("places the connectors on the slanted section and back on the plane in the world", () => {
    // A 60 mm cube cut at 30 degrees through its middle: the section is 60 by 60 / cos 30 mm.
    const tilted = modelSplitPlane([[-30, -30, -30], [30, 30, 30]], "y", 0, [30, 0])!;
    const frame = splitPlaneFrame(tilted.normal);
    const long = 60 / Math.cos(Math.PI / 6);
    // The frame's u runs along x here, v down the slope.
    expect(frame.u).toEqual([1, 0, 0]);
    const rings = [rectangle(60, long)];
    const points = placeConnectorsOnPiece(rings, { diameter: 5, count: 0 });
    expect(points).toHaveLength(2);
    // Along the long way, down the slope.
    expect(Math.abs(points[0][0] - points[1][0])).toBeLessThan(1);
    expect(Math.abs(points[0][1] - points[1][1])).toBeGreaterThan(30);
    for (const point of points) {
      const world = splitFramePoint(frame, point, tilted.position);
      expect(world[0] * tilted.normal[0] + world[1] * tilted.normal[1] + world[2] * tilted.normal[2]).toBeCloseTo(tilted.position, 9);
      expect(world[0] * frame.u[0] + world[1] * frame.u[1] + world[2] * frame.u[2]).toBeCloseTo(point[0], 9);
      expect(world[0] * frame.v[0] + world[1] * frame.v[1] + world[2] * frame.v[2]).toBeCloseTo(point[1], 9);
      // Inside the cube.
      world.forEach((value) => expect(Math.abs(value)).toBeLessThan(30));
    }
  });
});
