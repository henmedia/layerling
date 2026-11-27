import { projectDrawingMeshes, type DrawingMesh, type DrawingPoint, type DrawingPoint3 } from "@/lib/drawingProjection";

export type SvgProjectionPolygon = ReadonlyArray<readonly [number, number]>;

export type SvgProjectionLayer = {
  name: string;
  color: string;
  polygons: ReadonlyArray<SvgProjectionPolygon>;
};

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function svgNumber(value: number) {
  const rounded = Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(6));
  return String(rounded);
}

function safeFillColor(value: string) {
  return /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^<>]+\))$/i.test(value.trim()) ? value.trim() : "#0098c7";
}

export function toSvgProjection(layers: ReadonlyArray<SvgProjectionLayer>, title = "Layerling design") {
  const cleanLayers = layers.flatMap((layer) => {
    const polygons = layer.polygons.filter(
      (polygon) => polygon.length >= 3 && polygon.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)),
    );
    return polygons.length ? [{ ...layer, polygons }] : [];
  });
  let pointCount = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  cleanLayers.forEach((layer) => layer.polygons.forEach((polygon) => polygon.forEach(([x, y]) => {
    pointCount += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  })));
  if (!pointCount) throw new Error("SVG projection contains no readable contours");

  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) throw new Error("SVG projection does not enclose a visible area");

  const body = cleanLayers.map((layer) => {
    const pathData = layer.polygons
      .map((polygon) => polygon.map(([x, y], index) => `${index === 0 ? "M" : "L"}${svgNumber(x)} ${svgNumber(y)}`).join(" ") + " Z")
      .join(" ");
    return `  <path data-name="${xmlEscape(layer.name)}" d="${pathData}" fill="${safeFillColor(layer.color)}" fill-rule="evenodd"/>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${svgNumber(width)}mm" height="${svgNumber(height)}mm" viewBox="${svgNumber(minX)} ${svgNumber(minY)} ${svgNumber(width)} ${svgNumber(height)}">`,
    `  <title>${xmlEscape(title)}</title>`,
    "  <desc>Top-view vector projection exported by Layerling</desc>",
    ...body,
    "</svg>",
  ].join("\n");
}

export type SvgEdgeBody = { name: string; color: string; mesh: DrawingMesh };

/** Looking down with the front at the bottom of the page, as the top view and the 2D drawing show it. */
const TOP_VIEW: DrawingPoint3 = [90, 0, 0];

type SvgPolyline = { points: DrawingPoint[]; closed: boolean };

/**
 * The drawing projection splits an edge where its visibility changes, so the same line can come
 * whole and in pieces, as the top and the bottom rim of a bore do, and two bodies' ends of one line
 * can lie a hair apart - and the top and the bottom rim of a bore cut through a rounded top are
 * cut into triangles each their own way, so they run up to a few thousandths of a millimetre apart.
 * Points closer than `tolerance` become one, every segment is split where another one ends on it,
 * and each piece is kept once, so the pieces meet end to end.
 */
function overlapFreeSegments(segments: ReadonlyArray<readonly [DrawingPoint, DrawingPoint]>, tolerance = 5e-3) {
  const cellSize = 1;
  const cells = new Map<string, DrawingPoint[]>();
  const cellsAround = (x: number, y: number, reach: number) => {
    const found: DrawingPoint[] = [];
    for (let cx = Math.floor((x - reach) / cellSize); cx <= Math.floor((x + reach) / cellSize); cx += 1) {
      for (let cy = Math.floor((y - reach) / cellSize); cy <= Math.floor((y + reach) / cellSize); cy += 1) {
        found.push(...(cells.get(`${cx},${cy}`) ?? []));
      }
    }
    return found;
  };
  const canonical = (point: DrawingPoint): DrawingPoint => {
    const near = cellsAround(point[0], point[1], tolerance).find((other) => Math.hypot(other[0] - point[0], other[1] - point[1]) <= tolerance);
    if (near) return near;
    const at = `${Math.floor(point[0] / cellSize)},${Math.floor(point[1] / cellSize)}`;
    cells.set(at, [...(cells.get(at) ?? []), point]);
    return point;
  };
  const snapped = segments.map(([a, b]) => [canonical(a), canonical(b)] as const).filter(([a, b]) => a !== b);
  const ids = new Map<DrawingPoint, number>();
  const id = (point: DrawingPoint) => ids.get(point) ?? ids.set(point, ids.size).get(point)!;
  const pieces = new Map<string, readonly [DrawingPoint, DrawingPoint]>();
  for (const [a, b] of snapped) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSq = dx * dx + dy * dy;
    const between = cellsAround((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.sqrt(lengthSq) / 2 + tolerance)
      .filter((point) => point !== a && point !== b)
      .map((point) => ({
        point,
        t: ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq,
        off: Math.abs((point[0] - a[0]) * dy - (point[1] - a[1]) * dx) / Math.sqrt(lengthSq),
      }))
      .filter(({ t, off }) => t > 0 && t < 1 && off <= tolerance)
      .sort((first, second) => first.t - second.t);
    const chain = [a, ...between.map(({ point }) => point), b];
    for (let index = 0; index + 1 < chain.length; index += 1) {
      const from = chain[index]!;
      const to = chain[index + 1]!;
      const key = [id(from), id(to)].sort((first, second) => first - second).join(":");
      if (!pieces.has(key)) pieces.set(key, [from, to]);
    }
  }
  return [...pieces.values()];
}

/** Millimetres: loose ends this close are joined, and loose bits this short are left out - far below a laser's kerf. */
const LOOSE_END_REACH = 0.02;

/**
 * Joins the loose ends that lie closer than `reach` to each other, the nearest first. Where a body's outline
 * turns sharply, or two bodies' walls stand one on the other, the projection can give a few thousandths of a
 * millimetre of the line to the neighbour only; without the join the outline stays open, and a laser program
 * cannot fill it.
 */
function joinedLooseEnds(segments: ReadonlyArray<readonly [DrawingPoint, DrawingPoint]>, reach = LOOSE_END_REACH) {
  const degree = new Map<DrawingPoint, number>();
  segments.forEach(([a, b]) => [a, b].forEach((point) => degree.set(point, (degree.get(point) ?? 0) + 1)));
  const ends = [...degree].filter(([, count]) => count === 1).map(([point]) => point);
  const pairs = ends.flatMap((a, index) => ends.slice(index + 1).map((b) => ({ a, b, gap: Math.hypot(b[0] - a[0], b[1] - a[1]) })))
    .filter(({ gap }) => gap <= reach)
    .sort((first, second) => first.gap - second.gap);
  const joined = new Set<DrawingPoint>();
  const bridges: Array<readonly [DrawingPoint, DrawingPoint]> = [];
  for (const { a, b } of pairs) {
    if (joined.has(a) || joined.has(b)) continue;
    joined.add(a);
    joined.add(b);
    bridges.push([a, b]);
  }
  return [...segments, ...bridges];
}

type GraphEdge = readonly [number, number];

/** Edges that lie on no loop: taking one away splits its part of the drawing in two. */
function bridgeEdges(nodeCount: number, edges: readonly GraphEdge[]) {
  const around: Array<Array<{ to: number; edge: number }>> = Array.from({ length: nodeCount }, () => []);
  edges.forEach(([a, b], edge) => {
    around[a]!.push({ to: b, edge });
    around[b]!.push({ to: a, edge });
  });
  const order = new Array<number>(nodeCount).fill(-1);
  const low = new Array<number>(nodeCount).fill(0);
  const found = new Set<number>();
  let counter = 0;
  for (let root = 0; root < nodeCount; root += 1) {
    if (order[root] !== -1) continue;
    order[root] = low[root] = counter++;
    const stack: Array<{ node: number; via: number; next: number }> = [{ node: root, via: -1, next: 0 }];
    while (stack.length) {
      const frame = stack[stack.length - 1]!;
      const steps = around[frame.node]!;
      if (frame.next < steps.length) {
        const { to, edge } = steps[frame.next++]!;
        if (edge === frame.via) continue;
        if (order[to] === -1) {
          order[to] = low[to] = counter++;
          stack.push({ node: to, via: edge, next: 0 });
        } else {
          low[frame.node] = Math.min(low[frame.node]!, order[to]!);
        }
        continue;
      }
      stack.pop();
      const parent = stack[stack.length - 1];
      if (!parent) continue;
      low[parent.node] = Math.min(low[parent.node]!, low[frame.node]!);
      if (low[frame.node]! > order[parent.node]!) found.add(frame.via);
    }
  }
  return found;
}

/**
 * The areas the edges close in: every face of the drawing with a positive area, walked with the face on the
 * left, and how many of them each edge borders - one on the outline of an area, two between two of them.
 */
function enclosedFaces(points: readonly DrawingPoint[], edges: readonly GraphEdge[]) {
  const around = new Map<number, number[]>();
  const edgeOf = new Map<string, number>();
  edges.forEach(([a, b], index) => {
    around.set(a, [...(around.get(a) ?? []), b]);
    around.set(b, [...(around.get(b) ?? []), a]);
    edgeOf.set(`${a}:${b}`, index);
    edgeOf.set(`${b}:${a}`, index);
  });
  around.forEach((neighbours, node) => {
    const [x, y] = points[node]!;
    const angle = (other: number) => Math.atan2(points[other]![1] - y, points[other]![0] - x);
    neighbours.sort((first, second) => angle(first) - angle(second));
  });
  const walked = new Set<string>();
  const faces: number[][] = [];
  const uses = new Array<number>(edges.length).fill(0);
  for (const [a, b] of edges) {
    for (const [start, end] of [[a, b], [b, a]] as const) {
      if (walked.has(`${start}:${end}`)) continue;
      const loop: number[] = [];
      const loopEdges: number[] = [];
      let from = start;
      let to = end;
      while (!walked.has(`${from}:${to}`)) {
        walked.add(`${from}:${to}`);
        loop.push(from);
        loopEdges.push(edgeOf.get(`${from}:${to}`)!);
        const neighbours = around.get(to)!;
        const next = neighbours[(neighbours.indexOf(from) - 1 + neighbours.length) % neighbours.length]!;
        from = to;
        to = next;
      }
      let area = 0;
      loop.forEach((node, index) => {
        const [x0, y0] = points[node]!;
        const [x1, y1] = points[loop[(index + 1) % loop.length]!]!;
        area += x0 * y1 - x1 * y0;
      });
      if (area / 2 <= 1e-9) continue;
      faces.push(loop);
      loopEdges.forEach((edge) => { uses[edge] += 1; });
    }
  }
  return { faces, uses };
}

/**
 * What one body shows from above as lines for a laser or plotter: the outline of every area it shows,
 * closed, so the area can be filled; a crease between two of its own areas once, as a line inside; and
 * edges that close nothing as open lines - but not a stub of a few thousandths of a millimetre, the end of a
 * neighbour's line that stood a hair off this body's.
 */
function bodyLines(segments: ReadonlyArray<readonly [DrawingPoint, DrawingPoint]>): SvgPolyline[] {
  const points: DrawingPoint[] = [];
  const ids = new Map<DrawingPoint, number>();
  const id = (point: DrawingPoint) => {
    let found = ids.get(point);
    if (found === undefined) {
      found = points.length;
      ids.set(point, found);
      points.push(point);
    }
    return found;
  };
  const edges = joinedLooseEnds(overlapFreeSegments(segments)).map(([a, b]): GraphEdge => [id(a), id(b)]);
  const loose = bridgeEdges(points.length, edges);
  const closing = edges.filter((_, index) => !loose.has(index));
  const { uses } = enclosedFaces(points, closing);
  const outline = closing.filter((_, index) => uses[index] === 1);
  const inside = [...closing.filter((_, index) => uses[index] !== 1), ...edges.filter((_, index) => loose.has(index))];
  const loops = enclosedFaces(points, outline).faces.map((face): SvgPolyline => ({ points: face.map((node) => points[node]!), closed: true }));
  const lines = chainSegments(inside.map(([a, b]) => [points[a]!, points[b]!] as const))
    .filter((line) => line.closed || line.points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point[0] - line.points[index]![0], point[1] - line.points[index]![1]), 0) >= LOOSE_END_REACH);
  return [...loops, ...lines];
}

/** Drops the points a line passes straight through: the pieces a split left behind. */
function withoutStraightPoints(line: SvgPolyline): SvgPolyline {
  const points = line.points;
  const kept = points.filter((point, index) => {
    if (!line.closed && (index === 0 || index === points.length - 1)) return true;
    const before = points[(index - 1 + points.length) % points.length]!;
    const after = points[(index + 1) % points.length]!;
    const span = Math.hypot(after[0] - before[0], after[1] - before[1]);
    const off = span > 0 ? Math.abs((point[0] - before[0]) * (after[1] - before[1]) - (point[1] - before[1]) * (after[0] - before[0])) / span : 0;
    return off > 1e-6;
  });
  return { ...line, points: kept };
}

/** Joins segments that meet end to end into lines, and into closed loops where they come round. */
function chainSegments(segments: ReadonlyArray<readonly [DrawingPoint, DrawingPoint]>): SvgPolyline[] {
  const key = ([x, y]: DrawingPoint) => `${Math.round(x * 10000)},${Math.round(y * 10000)}`;
  const around = new Map<string, { at: DrawingPoint; steps: Array<{ segment: number; to: DrawingPoint }> }>();
  const link = (from: DrawingPoint, to: DrawingPoint, segment: number) => {
    const node = around.get(key(from)) ?? { at: from, steps: [] };
    node.steps.push({ segment, to });
    around.set(key(from), node);
  };
  segments.forEach(([a, b], segment) => {
    link(a, b, segment);
    link(b, a, segment);
  });
  const used = new Set<number>();
  const result: SvgPolyline[] = [];
  const walk = (start: DrawingPoint) => {
    for (const first of around.get(key(start))?.steps ?? []) {
      if (used.has(first.segment)) continue;
      used.add(first.segment);
      const points = [start, first.to];
      let at = first.to;
      while (key(at) !== key(start) && around.get(key(at))?.steps.length === 2) {
        const onward = around.get(key(at))!.steps.find((step) => !used.has(step.segment));
        if (!onward) break;
        used.add(onward.segment);
        points.push(onward.to);
        at = onward.to;
      }
      const closed = points.length > 3 && key(at) === key(start);
      result.push({ points: closed ? points.slice(0, -1) : points, closed });
    }
  };
  // Ends and forks first, so a line runs from one to the next; what is left goes round in loops.
  around.forEach((node) => {
    if (node.steps.length !== 2) walk(node.at);
  });
  around.forEach((node) => walk(node.at));
  return result;
}

/**
 * The top view as a drawing shows it: the edges one can see from above, each body's in its own
 * colour as an unfilled line - holes, pockets, engraved text and parts standing on others included,
 * where a silhouette would only show the outline. In millimetres at 1:1, the plate's x and z as in
 * the silhouette export. Throws where the drawing projection does (too many triangles or edges).
 */
export function toSvgTopEdges(bodies: ReadonlyArray<SvgEdgeBody>, title = "Layerling design") {
  const projection = projectDrawingMeshes(bodies.map((body) => body.mesh), TOP_VIEW, true);
  const [centerX, centerY] = projection.center;
  // Back from the drawing's centred coordinates to the plate's: x stays, the page's y is the plate's z.
  const onPlate = ([x, y]: DrawingPoint): DrawingPoint => [x + centerX, y - centerY];
  const segments = bodies.map(() => [] as Array<readonly [DrawingPoint, DrawingPoint]>);
  // A line goes to every body seen beside it, so where two bodies meet each gets the line and stays closed.
  projection.lines.forEach((line) => {
    if (line.hidden) return;
    const sides: Array<number | null> = line.sides ?? [];
    const beside = [...new Set(sides.filter((side): side is number => side !== null))];
    const owners = beside.length ? beside : line.source !== undefined ? [line.source] : [];
    owners.forEach((owner) => segments[owner]?.push([onPlate(line.a), onPlate(line.b)]));
  });
  const drawn = bodies
    .map((body, index) => ({ body, lines: bodyLines(segments[index]!).map(withoutStraightPoints) }))
    .filter(({ lines }) => lines.length > 0);
  const points = drawn.flatMap(({ lines }) => lines.flatMap((line) => line.points));
  if (!points.length) throw new Error("SVG top view contains no visible edges");
  const minX = Math.min(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const width = Math.max(...points.map(([x]) => x)) - minX;
  const height = Math.max(...points.map(([, y]) => y)) - minY;
  if (width <= 0 || height <= 0) throw new Error("SVG projection does not enclose a visible area");

  const body = drawn.map(({ body: { name, color }, lines }) => {
    const pathData = lines
      .map((line) => line.points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${svgNumber(x)} ${svgNumber(y)}`).join(" ") + (line.closed ? " Z" : ""))
      .join(" ");
    // Even-odd, as the silhouette export: a laser program that fills an area (xTool's Engrave) leaves out
    // what lies inside it - another body standing on it, a bore - where nonzero, the SVG default, fills it.
    return `  <path data-name="${xmlEscape(name)}" d="${pathData}" fill="none" fill-rule="evenodd" stroke="${safeFillColor(color)}" stroke-width="0.1" stroke-linejoin="round" stroke-linecap="round"/>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${svgNumber(width)}mm" height="${svgNumber(height)}mm" viewBox="${svgNumber(minX)} ${svgNumber(minY)} ${svgNumber(width)} ${svgNumber(height)}">`,
    `  <title>${xmlEscape(title)}</title>`,
    "  <desc>Top view of the visible edges exported by Layerling</desc>",
    ...body,
    "</svg>",
  ].join("\n");
}

/**
 * What a picture of the current view shows: the edges one sees, those and the hidden ones dashed, only the outline,
 * or every triangle edge one sees, the mesh the bodies are printed from (Discussion #2103).
 */
export type SvgViewLines = "edges" | "hidden" | "outline" | "mesh";

/**
 * The design as the view looks at it, as lines (Discussion #2103): a picture for an illustration, a manual or a pen
 * plotter rather than something to cut. Seen square from the camera's direction, without perspective, at 1:1 in
 * millimetres, each body's lines in its colour. `camera` is the view's quaternion (x, y, z, w). "edges" draws the
 * edges one can see, "hidden" adds the ones behind as thin dashed lines, "outline" only the lines with nothing of the
 * design on one side of them: the outer contour and what one sees through openings, "mesh" every triangle edge one
 * can see, thinner. Throws where the drawing projection does (too many triangles or edges).
 */
export function toSvgViewEdges(bodies: ReadonlyArray<SvgEdgeBody>, camera: [number, number, number, number], lines: SvgViewLines = "edges", title = "Layerling design") {
  const projection = projectDrawingMeshes(bodies.map((body) => body.mesh), { camera }, lines === "outline", lines === "mesh");
  const seen = bodies.map(() => [] as Array<readonly [DrawingPoint, DrawingPoint]>);
  const behind = bodies.map(() => [] as Array<readonly [DrawingPoint, DrawingPoint]>);
  projection.lines.forEach((line) => {
    if (line.source === undefined) return;
    if (line.hidden) {
      if (lines === "hidden") behind[line.source]?.push([line.a, line.b]);
      return;
    }
    if (lines === "outline" && !(line.sides ?? [0, 0]).some((side) => side === null)) return;
    seen[line.source]?.push([line.a, line.b]);
  });
  const chained = (segments: ReadonlyArray<readonly [DrawingPoint, DrawingPoint]>) => chainSegments(segments).map(withoutStraightPoints);
  const drawn = bodies
    .map((body, index) => ({ body, seen: chained(seen[index]!), behind: chained(behind[index]!) }))
    .filter((entry) => entry.seen.length > 0 || entry.behind.length > 0);
  const points = drawn.flatMap((entry) => [...entry.seen, ...entry.behind].flatMap((line) => line.points));
  if (!points.length) throw new Error("SVG view contains no visible edges");
  const margin = 2;
  const minX = Math.min(...points.map(([x]) => x)) - margin;
  const minY = Math.min(...points.map(([, y]) => y)) - margin;
  const width = Math.max(...points.map(([x]) => x)) - minX + margin;
  const height = Math.max(...points.map(([, y]) => y)) - minY + margin;
  const pathData = (polylines: SvgPolyline[]) => polylines
    .map((line) => line.points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${svgNumber(x)} ${svgNumber(y)}`).join(" ") + (line.closed ? " Z" : ""))
    .join(" ");
  // Hidden lines first, so the ones in sight lie over them.
  const paths = [
    ...drawn.filter((entry) => entry.behind.length).map(({ body, behind: polylines }) =>
      `  <path data-name="${xmlEscape(body.name)}" data-hidden="true" d="${pathData(polylines)}" fill="none" stroke="${safeFillColor(body.color)}" stroke-width="0.13" stroke-dasharray="1.5 0.8" stroke-linejoin="round" stroke-linecap="round"/>`),
    ...drawn.filter((entry) => entry.seen.length).map(({ body, seen: polylines }) =>
      `  <path data-name="${xmlEscape(body.name)}" d="${pathData(polylines)}" fill="none" stroke="${safeFillColor(body.color)}" stroke-width="${lines === "mesh" ? "0.1" : "0.25"}" stroke-linejoin="round" stroke-linecap="round"/>`),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${svgNumber(width)}mm" height="${svgNumber(height)}mm" viewBox="${svgNumber(minX)} ${svgNumber(minY)} ${svgNumber(width)} ${svgNumber(height)}">`,
    `  <title>${xmlEscape(title)}</title>`,
    `  <desc>The current view as lines (${lines}), exported by Layerling</desc>`,
    ...paths,
    "</svg>",
  ].join("\n");
}
