import { pictureShapePart } from "@/lib/pictureIcon";
import { fieldRings, ringArea, shapeField, shrinkRaster, softened, type RasterPart, type RasterPixels } from "@/lib/rasterTrace";

/*
 * Trace (Nachzeichnen): a picture - a silhouette, a logo, a word - becomes outlines a person goes on
 * working with, in the sketch and in the vase drawing. Where the import's tracer (rasterTrace) writes
 * many short straight pieces, this one sets few points: a corner point where the outline turns sharply,
 * and between the corners smooth points with handles, as one would draw them by hand. How many points
 * there are, which turn counts as a corner, where dark turns light, how small a speck is left out and
 * whether holes stay are the settings, as in the trace tools of laser programs. Instead of the dark or
 * the light part, the shape can be the object: all that stands out from the picture's background, the
 * colour at its edge - a toy photographed on white comes out as one outline, whatever its colours.
 * Areas clicked in the picture (a window) are outlined too, as patches of like colour; every hole and
 * area has a key, so it can be left out or drawn as a construction line instead of cut. Regions drawn by
 * hand - corners clicked round a shadow under a toy, or a line the magnetic lasso laid along an edge -
 * are cut away from the shape or taken into it, whatever their colour, before the outline is found;
 * with the part "lasso" they alone are the shape.
 *
 * The steps: the outline where the picture crosses the threshold (rasterTrace's marching squares, on
 * the picture softened a little, so a hard pixel edge gives a smooth line); the outline walked in even
 * steps; a corner where the line turns by more than the corner angle within a few pixels while the
 * line on either side runs on straight (a tight curve turns as much, but spread over its length);
 * between the corners Bezier curves fitted to the line (least squares, split where they stray, after
 * Schneider's "Algorithm for Automatically Fitting Digitized Curves", Graphics Gems, 1990), as
 * loosely as the number of points allows.
 */

export type TracePoint = { x: number; y: number };
/** A point of a traced outline, in the picture's pixels (0 at its left and top edge, y down). */
export type TraceNode = TracePoint & {
  /** A corner: the outline changes direction here. Otherwise the handles lie on one line through the point. */
  corner: boolean;
  /** The handle of the side arriving here, when that side is curved. */
  handleIn?: TracePoint;
  /** The handle of the side leaving here, when that side is curved. */
  handleOut?: TracePoint;
};
/** Where an outline comes from: the shape's own edge, a hole in it, an area clicked in the picture, or a region cut away inside the shape. */
export type TraceSource = "outline" | "hole" | "area" | "cut";
/**
 * A closed outline: each point joins the next, the last the first; a side is curved when both of its ends
 * have the handle facing it. `key` names it while the settings change (a hole by where it lies), `line`
 * marks one to draw as a construction line rather than cut.
 */
export type TraceRing = { nodes: TraceNode[]; hole: boolean; key: string; source: TraceSource; line?: boolean };

/**
 * What becomes the shape: the dark part, the light part, the object - all that stands out from the
 * background, the colour at the picture's edge - or only the regions taken in by hand (the lasso).
 */
export type TracePart = RasterPart | "object" | "lasso";
/** An area clicked in the picture: the patch of like colour round the spot, given in the picture's own pixels. */
export type TraceArea = { id: string; x: number; y: number };
/**
 * A region drawn by hand: a closed polygon in the picture's own pixels, cut away from the shape (Cut
 * away) or, with `add`, taken into it, whatever its colour. `lasso` marks one the magnetic lasso drew.
 */
export type TraceRegion = { id: string; points: TracePoint[]; add?: boolean; lasso?: boolean };

export type PictureTraceSettings = {
  /** The dark part (a black shape on white), the light one, or the object before its background. */
  part: TracePart;
  /** Where dark turns light, 0 to 1; for the object, how far a colour must lie from the background's (a share of the largest distance). */
  threshold: number;
  /** At most this many points in all the outlines together; the corners always stay. */
  points: number;
  /** A turn sharper than this many degrees is a corner; 180 makes none. */
  cornerAngle: number;
  /** An outline round less than this many square pixels of the picture is a speck and left out. */
  speck: number;
  /** Holes (the middle of an A or an O) stay; without them only the outermost outlines are traced. */
  holes: boolean;
  /** Areas clicked in the picture, each outlined as a hole. */
  areas?: TraceArea[];
  /** How far a colour may lie from the clicked one and still belong to its area, 0 to 1. */
  areaTolerance?: number;
  /** The keys of holes and areas left out. */
  removed?: string[];
  /** The keys of holes and areas drawn as construction lines instead of cut. */
  lines?: string[];
  /** Regions drawn by hand, cut away from the shape or taken into it before its outline is found. */
  regions?: TraceRegion[];
};

export type PictureTrace = {
  rings: TraceRing[];
  /** Clicked areas that were not taken: they reach the picture's edge (the background) or lie outside it. */
  rejected?: string[];
  /** Some outlines lay so close that loosely fitted they would have crossed: they got more points than asked for. */
  refined?: boolean;
  /** How many points all the outlines have together. */
  points: number;
  /** How many of them are corners. */
  corners: number;
};

/** The range the number of points can be set in for some settings, and the number that follows the picture closely. */
export type PictureTraceRange = { fewest: number; most: number; suggested: number };

/** How far a colour may lie from the clicked one to start, as a share of the largest distance. */
export const DEFAULT_TRACE_AREA_TOLERANCE = 0.12;
/** The largest colour distance, from black to white. */
const MAX_COLOUR_DISTANCE = Math.sqrt(3) * 255;

/** Corner angles that can be set, in degrees; at the largest there are no corners. */
export const MIN_TRACE_CORNER_ANGLE = 10;
export const MAX_TRACE_CORNER_ANGLE = 180;
export const DEFAULT_TRACE_CORNER_ANGLE = 45;

/** How far the fitted line may stray from the picture's outline, in pixels of the traced picture: from close to loose. */
const FINEST_TOLERANCE = 0.3;
const LOOSEST_TOLERANCE = 48;
/** The tolerance the suggested number of points comes from: close to the picture, without following its pixels. */
const SUGGESTED_TOLERANCE = 1.2;
/** How many pixels on either side of a point the corner search looks. */
const CORNER_REACH = 3;
/** A corner turns at least this share of its turn within CORNER_REACH; a curve spreads its turn evenly. */
const CORNER_SHARPNESS = 0.7;
/** A sketch outline needs three sides to count as closed. */
const MIN_RING_SIDES = 3;

type Cubic = { from: TracePoint; c1: TracePoint; c2: TracePoint; to: TracePoint };
/** A piece of an outline: straight when it has no handles. */
type Piece = { from: TracePoint; to: TracePoint; c1?: TracePoint; c2?: TracePoint; cornerAtStart: boolean };
/** One outline of the picture, walked in even steps, with what does not change with the number of points. */
type Contour = { samples: TracePoint[]; area: number; depth: number; key: string; source: TraceSource; centre: TracePoint };

const sub = (a: TracePoint, b: TracePoint): TracePoint => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: TracePoint, b: TracePoint): TracePoint => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: TracePoint, factor: number): TracePoint => ({ x: a.x * factor, y: a.y * factor });
const dot = (a: TracePoint, b: TracePoint) => a.x * b.x + a.y * b.y;
const length = (a: TracePoint) => Math.hypot(a.x, a.y);
const distance = (a: TracePoint, b: TracePoint) => Math.hypot(a.x - b.x, a.y - b.y);
function unit(a: TracePoint): TracePoint {
  const size = length(a);
  return size > 1e-12 ? { x: a.x / size, y: a.y / size } : { x: 1, y: 0 };
}

/** The angle between two directions, 0 to 180 degrees. */
function turnDegrees(a: TracePoint, b: TracePoint) {
  const sizes = length(a) * length(b);
  if (sizes < 1e-12) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot(a, b) / sizes))) * 180) / Math.PI;
}

/** A closed line walked in steps of `step`, starting at its first point. */
function resampled(ring: readonly TracePoint[], step: number): TracePoint[] {
  const out: TracePoint[] = [{ ...ring[0] }];
  let carried = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    const side = distance(a, b);
    let along = step - carried;
    while (along < side) {
      const t = along / side;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      along += step;
    }
    carried = side - (along - step);
  }
  // The last step would land on the start again.
  if (out.length > 1 && distance(out[out.length - 1], out[0]) < step * 0.5) out.pop();
  return out;
}

function perimeter(ring: readonly TracePoint[]) {
  let sum = 0;
  for (let index = 0; index < ring.length; index += 1) sum += distance(ring[index], ring[(index + 1) % ring.length]);
  return sum;
}

/** Whether a point lies inside a closed line (even-odd). */
function inside(point: TracePoint, ring: readonly TracePoint[]) {
  let hit = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const a = ring[index];
    const b = ring[previous];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/**
 * The darkness (or lightness) where the picture's two parts meet: the threshold that splits its pixels
 * best into two groups (Otsu), then the middle between the two groups, so a picture of pure black and
 * white is cut half way, where its edges lie.
 */
function splitLightness(pixels: RasterPixels) {
  const histogram = new Float64Array(256);
  const { data } = pixels;
  for (let index = 0; index < data.length; index += 4) {
    const opacity = data[index + 3] / 255;
    if (opacity < 0.5) continue;
    const lightness = (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
    histogram[Math.min(255, Math.round(lightness * 255))] += 1;
  }
  let total = 0;
  let sum = 0;
  histogram.forEach((count, level) => {
    total += count;
    sum += count * level;
  });
  if (total === 0) return 0.5;
  let below = 0;
  let belowSum = 0;
  let best = -1;
  let split = 127;
  for (let level = 0; level < 255; level += 1) {
    below += histogram[level];
    belowSum += histogram[level] * level;
    const above = total - below;
    if (below === 0 || above === 0) continue;
    const meanBelow = belowSum / below;
    const meanAbove = (sum - belowSum) / above;
    const spread = below * above * (meanBelow - meanAbove) ** 2;
    if (spread > best) {
      best = spread;
      split = (meanBelow + meanAbove) / 2;
    }
  }
  return Math.min(0.9, Math.max(0.1, split / 255));
}

/** A picture made ready to trace: shrunk to the tracer's size, its outlines kept for each part and threshold tried. */
export type PreparedPicture = {
  /** The picture's own size, in pixels: the traced points are given in these. */
  width: number;
  height: number;
  /** The picture as it is traced, and how many of its own pixels one of these is. */
  pixels: RasterPixels;
  scaleX: number;
  scaleY: number;
  fields: Partial<Record<RasterPart, Float32Array>>;
  contours: Map<string, Contour[]>;
  /** The background's colour (the colour at the picture's edge) and each pixel's distance from it, 0 to 1, once asked for. */
  background?: { colour: [number, number, number]; distance: Float32Array };
  areas: Map<string, Contour | null>;
  /** How much of each pixel the regions drawn by hand take in and cut away, 0 to 1, for the regions last asked for. */
  regionCover?: { key: string; add: Float32Array | null; cut: Float32Array | null };
  /** How strong an edge each pixel lies on, 0 to 1, once asked for (the magnetic lasso). */
  edges?: Float32Array;
};

/** Gets a picture ready for tracing it several times over, as its settings change. */
export function preparePicture(source: RasterPixels): PreparedPicture {
  const pixels = shrinkRaster(source);
  return {
    width: source.width,
    height: source.height,
    pixels,
    scaleX: source.width / pixels.width,
    scaleY: source.height / pixels.height,
    fields: {},
    contours: new Map(),
    areas: new Map(),
  };
}

/**
 * The settings a picture is traced with to start: a colourful picture on an even background (a photo
 * of a toy on white) as the object, without holes; else the part that is not its background, with its
 * holes, cut where its two parts meet. Specks of a few pixels left out, corners from 45 degrees, no
 * areas or regions yet. The number of points follows the picture closely.
 */
export function defaultTraceSettings(picture: PreparedPicture): PictureTraceSettings {
  const object = isColourful(picture.pixels) && hasEvenBorder(picture.pixels);
  const base = {
    part: object ? "object" as const : pictureShapePart(picture.pixels),
    threshold: defaultThreshold(picture, object ? "object" : "dark"),
    cornerAngle: DEFAULT_TRACE_CORNER_ANGLE,
    speck: defaultSpeck(picture),
    holes: !object,
    areas: [],
    areaTolerance: DEFAULT_TRACE_AREA_TOLERANCE,
    removed: [],
    lines: [],
    regions: [],
  };
  return { ...base, points: traceRange(picture, base).suggested };
}

/** The threshold a part starts with: where the picture's dark and light split, or, for the object, as defaultObjectThreshold. */
export function defaultThreshold(picture: PreparedPicture, part: TracePart) {
  if (part === "lasso") return 0.5;
  return part === "object" ? defaultObjectThreshold(picture) : Math.round(splitLightness(picture.pixels) * 100) / 100;
}

/** The threshold the object starts with when it is chosen: half way to where the picture's colours split from the background's, a little off it at least. */
export function defaultObjectThreshold(picture: PreparedPicture) {
  const { distance } = backgroundOf(picture);
  const histogram = new Float64Array(256);
  distance.forEach((value) => { histogram[Math.min(255, Math.round(value * 255))] += 1; });
  let total = 0;
  let sum = 0;
  histogram.forEach((count, level) => {
    total += count;
    sum += count * level;
  });
  let below = 0;
  let belowSum = 0;
  let best = -1;
  let split = 64;
  for (let level = 0; level < 255; level += 1) {
    below += histogram[level];
    belowSum += histogram[level] * level;
    const above = total - below;
    if (below === 0 || above === 0) continue;
    const spread = below * above * (belowSum / below - (sum - belowSum) / above) ** 2;
    if (spread > best) {
      best = spread;
      split = level;
    }
  }
  return Math.round(Math.min(0.3, Math.max(0.05, split / 255 / 2)) * 100) / 100;
}

/** Whether a picture has colour in it: more than a few of its pixels clearly coloured, not grey. */
function isColourful(pixels: RasterPixels) {
  const { data } = pixels;
  let coloured = 0;
  let counted = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 128) continue;
    counted += 1;
    if (Math.max(data[index], data[index + 1], data[index + 2]) - Math.min(data[index], data[index + 1], data[index + 2]) > 60) coloured += 1;
  }
  return counted > 0 && coloured / counted > 0.04;
}

/** The pixels along the picture's edge, by index. */
function borderPixels(width: number, height: number) {
  const edge: number[] = [];
  for (let x = 0; x < width; x += 1) {
    edge.push(x);
    if (height > 1) edge.push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    edge.push(y * width);
    if (width > 1) edge.push(y * width + width - 1);
  }
  return edge;
}

const median = (values: number[]) => {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 255;
};

/** Whether the picture's edge is mostly of one colour, a background to tell an object from. */
function hasEvenBorder(pixels: RasterPixels) {
  const { colour } = backgroundColour(pixels);
  const edge = borderPixels(pixels.width, pixels.height);
  const even = edge.filter((index) => colourDistance(pixels.data, index, colour) < 0.1).length;
  return edge.length > 0 && even / edge.length > 0.6;
}

/** How far a pixel's colour lies from a colour, 0 to 1; a see-through pixel lies on the background. */
function colourDistance(data: RasterPixels["data"], index: number, colour: readonly number[]) {
  const offset = index * 4;
  const opacity = data[offset + 3] / 255;
  const apart = Math.hypot(data[offset] - colour[0], data[offset + 1] - colour[1], data[offset + 2] - colour[2]) / MAX_COLOUR_DISTANCE;
  return apart * opacity;
}

/** The background's colour: the middle of the colours along the picture's edge, channel by channel. */
function backgroundColour(pixels: RasterPixels): { colour: [number, number, number] } {
  const edge = borderPixels(pixels.width, pixels.height).filter((index) => pixels.data[index * 4 + 3] >= 128);
  const channel = (offset: number) => median(edge.map((index) => pixels.data[index * 4 + offset]));
  return { colour: [channel(0), channel(1), channel(2)] };
}

/** The background of a prepared picture and every pixel's distance from it, worked out once. */
function backgroundOf(picture: PreparedPicture) {
  if (picture.background) return picture.background;
  const { width, height, data } = picture.pixels;
  const { colour } = backgroundColour(picture.pixels);
  const distance = new Float32Array(width * height);
  for (let index = 0; index < width * height; index += 1) distance[index] = colourDistance(data, index, colour);
  picture.background = { colour, distance };
  return picture.background;
}

/**
 * The object's fields, on the padded grid the outline is found on: the background is what is close to
 * the background's colour and joined to the picture's edge (filled from it); all else is the object,
 * a white patch inside it too. The second field finds the holes: the patches close to the background's
 * colour that the object encloses, high where they are, so its empty border is no hole. Both are cut
 * at a half: a distance is scaled so the threshold is a half and twice it the whole, which puts a hard
 * edge's line where the edge is rather than a pixel out.
 */
function objectFields(picture: PreparedPicture, threshold: number, cover: Float32Array | null, added: Float32Array | null = null) {
  const { width, height } = picture.pixels;
  const { distance: plain } = backgroundOf(picture);
  // What is taken in by hand is the object; what is cut away lies on the background, so the background fills into it from the edge.
  const distance = cover || added
    ? plain.map((value, index) => Math.max(value, added ? added[index] * 2 * threshold : 0) * (cover ? 1 - cover[index] : 1))
    : plain;
  const outside = new Uint8Array(width * height);
  const stack: number[] = [];
  for (const index of borderPixels(width, height)) {
    if (!outside[index] && distance[index] < threshold) {
      outside[index] = 1;
      stack.push(index);
    }
  }
  while (stack.length) {
    const index = stack.pop()!;
    const x = index % width;
    const y = (index - x) / width;
    for (const next of [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1]) {
      if (next >= 0 && !outside[next] && distance[next] < threshold) {
        outside[next] = 1;
        stack.push(next);
      }
    }
  }
  const gridWidth = width + 2;
  const object = new Float32Array(gridWidth * (height + 2));
  const holes = new Float32Array(gridWidth * (height + 2));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const value = Math.min(1, distance[index] / (2 * threshold));
      const cell = (y + 1) * gridWidth + x + 1;
      // A cut inside the object takes it away there too, a hole whatever the holes are.
      const kept = cover ? 1 - cover[index] : 1;
      object[cell] = (outside[index] || distance[index] >= threshold ? value : 1) * kept;
      holes[cell] = outside[index] ? 0 : (1 - value) * kept;
    }
  }
  return { object: softened(object, gridWidth, height + 2), holes: softened(holes, gridWidth, height + 2) };
}

/** Specks left out to start: a few pixels of the traced picture, or a hundred-thousandth of its area. */
export function defaultSpeck(picture: PreparedPicture) {
  const { width, height } = picture.pixels;
  return Math.max(4, width * height * 2e-5) * picture.scaleX * picture.scaleY;
}

/**
 * Closed lines as contours, walked in even steps: how deeply each lies inside the others decides what it
 * is (`source`), and its key names it by where it lies, so a hole keeps its key while the threshold moves
 * it a little. `offset` is added to the depth (the object's holes lie in it).
 */
function contoursFromRings(rings: TracePoint[][], sourceAt: (depth: number) => TraceSource, offset = 0): Contour[] {
  const areas = rings.map((ring) => ringArea(ring));
  const boxes = rings.map((ring) => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    ring.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    return { minX, minY, maxX, maxY };
  });
  const keys = new Set<string>();
  return rings.map((ring, index): Contour => {
    // How many larger outlines this one lies in: even for an outline, odd for a hole.
    const probe = ring[0];
    let depth = 0;
    rings.forEach((other, otherIndex) => {
      if (otherIndex === index || areas[otherIndex] <= areas[index]) return;
      const box = boxes[otherIndex];
      if (probe.x < box.minX || probe.x > box.maxX || probe.y < box.minY || probe.y > box.maxY) return;
      if (inside(probe, other)) depth += 1;
    });
    const box = boxes[index];
    const centre = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
    const source = sourceAt(depth);
    let key = `${source === "hole" ? "h" : "o"}:${Math.round(centre.x / 6)}:${Math.round(centre.y / 6)}`;
    for (let count = 2; keys.has(key); count += 1) key = `${key.split("#")[0]}#${count}`;
    keys.add(key);
    // Steps of a pixel, but at least 16 round a small outline.
    const step = Math.min(1, perimeter(ring) / 16);
    return { samples: resampled(ring, step), area: areas[index], depth: depth + offset, key, source, centre };
  });
}

/**
 * How much of each pixel a closed polygon covers, 0 to 1, added into `cover` (the larger of the two):
 * four rows of samples a pixel, each filled even-odd between the polygon's crossings, the ends of a span
 * by the share of the pixel they reach.
 */
function coverPolygon(polygon: readonly TracePoint[], width: number, height: number, cover: Float32Array) {
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.y))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...polygon.map((point) => point.y))));
  const row = new Float32Array(width);
  for (let y = minY; y <= maxY; y += 1) {
    row.fill(0);
    let touched = false;
    for (let sample = 0; sample < 4; sample += 1) {
      const sy = y + (sample + 0.5) / 4;
      const crossings: number[] = [];
      for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
        const a = polygon[previous];
        const b = polygon[index];
        if ((a.y > sy) !== (b.y > sy)) crossings.push(a.x + ((sy - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
      crossings.sort((p, q) => p - q);
      for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
        const from = Math.max(0, crossings[pair]);
        const to = Math.min(width, crossings[pair + 1]);
        for (let x = Math.floor(from); x < to && x < width; x += 1) {
          const share = Math.min(x + 1, to) - Math.max(x, from);
          if (share > 0) {
            row[x] += share / 4;
            touched = true;
          }
        }
      }
    }
    if (!touched) continue;
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (row[x] > cover[index]) cover[index] = Math.min(1, row[x]);
    }
  }
}

/**
 * How much of each pixel of the traced picture the regions drawn by hand take in (`add`) and cut away,
 * 0 to 1, or null where there are none; kept for the regions last asked for.
 */
function regionCover(picture: PreparedPicture, regions: readonly TraceRegion[]) {
  const usable = regions.filter((region) => region.points.length >= 3);
  const key = JSON.stringify(usable.map((region) => [region.add ? 1 : 0, region.points.map((point) => [Math.round(point.x * 10), Math.round(point.y * 10)])]));
  if (picture.regionCover?.key === key) return picture.regionCover;
  const { width, height } = picture.pixels;
  let add: Float32Array | null = null;
  let cut: Float32Array | null = null;
  for (const region of usable) {
    const polygon = region.points.map((point) => ({ x: point.x / picture.scaleX, y: point.y / picture.scaleY }));
    const into = region.add ? (add ??= new Float32Array(width * height)) : (cut ??= new Float32Array(width * height));
    coverPolygon(polygon, width, height, into);
  }
  picture.regionCover = { key, add, cut };
  return picture.regionCover;
}

/** Whether a contour is a cut's: a hole in the shape whose middle a region cut away takes. */
function madeByCut(contour: Contour, cover: Float32Array | null, picture: PreparedPicture) {
  if (!cover || contour.depth % 2 === 0) return false;
  const x = Math.floor(contour.centre.x);
  const y = Math.floor(contour.centre.y);
  return x >= 0 && y >= 0 && x < picture.pixels.width && y < picture.pixels.height && cover[y * picture.pixels.width + x] > 0.5;
}

/**
 * The outlines for a part and a threshold, with the regions drawn by hand taken in and cut away; for the
 * object, its outlines and, apart, its holes. A hole a cut makes inside the shape is the cut's, not one
 * of the picture's holes. With the part "lasso", the regions taken in are the shape.
 */
function contoursFor(picture: PreparedPicture, part: TracePart, threshold: number, regions: readonly TraceRegion[] = []): { outlines: Contour[]; holes: Contour[] } {
  const level = part === "lasso" ? 0.5 : Math.min(0.98, Math.max(0.02, threshold));
  const covers = regionCover(picture, regions);
  const cover = covers.cut;
  const key = `${part}:${level.toFixed(3)}:${covers.key}`;
  const known = picture.contours.get(key);
  const knownHoles = picture.contours.get(`${key}:holes`);
  if (known && knownHoles) return { outlines: known, holes: knownHoles };
  const { width, height } = picture.pixels;
  let outlines: Contour[];
  let holes: Contour[] = [];
  const asCut = (contour: Contour): Contour => (madeByCut(contour, cover, picture) ? { ...contour, source: "cut", key: `c:${contour.key.slice(2)}` } : contour);
  if (part === "object") {
    const fields = objectFields(picture, level, cover, covers.add);
    // Only a cut makes a hole in the object's own field.
    outlines = contoursFromRings(fieldRings(fields.object, width + 2, height + 2, 0.5).filter((ring) => ring.length >= 3), (depth) => (depth % 2 === 1 ? "cut" : "outline"))
      .map((contour) => (contour.source === "cut" ? { ...contour, key: `c:${contour.key.slice(2)}` } : contour));
    // The holes' own lines: an outline round a patch of background, or (inside it) round an island of the object again.
    holes = contoursFromRings(fieldRings(fields.holes, width + 2, height + 2, 0.5).filter((ring) => ring.length >= 3), (depth) => (depth % 2 === 0 ? "hole" : "outline"), 1);
  } else {
    // The lasso's shape is what it took in, and nothing of the picture's own.
    const plain = part === "lasso" ? new Float32Array((width + 2) * (height + 2)) : picture.fields[part] ?? (picture.fields[part] = shapeField(picture.pixels, part));
    const taken = covers.add ? addedField(plain, covers.add, width, height, level) : plain;
    const field = cover ? cutField(taken, cover, width, height) : taken;
    const all = contoursFromRings(fieldRings(field, width + 2, height + 2, level).filter((ring) => ring.length >= 3), (depth) => (depth % 2 === 1 ? "hole" : "outline")).map(asCut);
    outlines = all.filter((contour) => contour.depth === 0 || contour.source === "cut");
    holes = all.filter((contour) => contour.depth > 0 && contour.source !== "cut");
  }
  picture.contours.set(key, outlines);
  picture.contours.set(`${key}:holes`, holes);
  return { outlines, holes };
}

/** A padded field with what the regions taken in cover, taken in: scaled so a pixel half covered lies at the level, which puts the line on the region's edge. */
function addedField(field: Float32Array, cover: Float32Array, width: number, height: number, level: number) {
  const out = new Float32Array(field);
  const gridWidth = width + 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = (y + 1) * gridWidth + x + 1;
      out[cell] = Math.max(out[cell], cover[y * width + x] * 2 * level);
    }
  }
  return out;
}

/** A padded field with what the cuts take, taken away. */
function cutField(field: Float32Array, cover: Float32Array, width: number, height: number) {
  const out = new Float32Array(field);
  const gridWidth = width + 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) out[(y + 1) * gridWidth + x + 1] *= 1 - cover[y * width + x];
  }
  return out;
}

/**
 * A clicked area as a contour: the patch of pixels round the spot whose colour lies within `tolerance`
 * of the spot's (its 3 x 3 pixels' middle), joined side by side, its outer line only - a window with a
 * dot of other colour in it is the whole window. Null when the patch reaches the picture's edge: that is
 * the background, not an area of the object.
 */
function areaContour(picture: PreparedPicture, area: TraceArea, tolerance: number): Contour | null {
  const cacheKey = `${area.id}:${area.x}:${area.y}:${tolerance.toFixed(3)}`;
  if (picture.areas.has(cacheKey)) return picture.areas.get(cacheKey)!;
  const { width, height, data } = picture.pixels;
  const seedX = Math.floor(area.x / picture.scaleX);
  const seedY = Math.floor(area.y / picture.scaleY);
  let contour: Contour | null = null;
  if (seedX >= 0 && seedY >= 0 && seedX < width && seedY < height) {
    const colour = [0, 0, 0];
    let counted = 0;
    for (let y = Math.max(0, seedY - 1); y <= Math.min(height - 1, seedY + 1); y += 1) {
      for (let x = Math.max(0, seedX - 1); x <= Math.min(width - 1, seedX + 1); x += 1) {
        const offset = (y * width + x) * 4;
        colour[0] += data[offset];
        colour[1] += data[offset + 1];
        colour[2] += data[offset + 2];
        counted += 1;
      }
    }
    for (let channel = 0; channel < 3; channel += 1) colour[channel] /= counted;
    const inArea = new Uint8Array(width * height);
    const stack = [seedY * width + seedX];
    inArea[stack[0]] = 1;
    let atEdge = false;
    while (stack.length) {
      const index = stack.pop()!;
      const x = index % width;
      const y = (index - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) atEdge = true;
      for (const next of [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1]) {
        if (next >= 0 && !inArea[next] && data[next * 4 + 3] >= 128 && colourDistance(data, next, colour) <= tolerance) {
          inArea[next] = 1;
          stack.push(next);
        }
      }
    }
    if (!atEdge) {
      const gridWidth = width + 2;
      const field = new Float32Array(gridWidth * (height + 2));
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) if (inArea[y * width + x]) field[(y + 1) * gridWidth + x + 1] = 1;
      }
      const rings = fieldRings(softened(field, gridWidth, height + 2), gridWidth, height + 2, 0.5).filter((ring) => ring.length >= 3);
      const outer = contoursFromRings(rings, () => "area").filter((entry) => entry.depth === 0).sort((a, b) => b.area - a.area)[0];
      if (outer) contour = { ...outer, depth: 1, key: `a:${area.id}`, source: "area" };
    }
  }
  picture.areas.set(cacheKey, contour);
  return contour;
}

/**
 * The outlines the settings keep: no specks; holes only with holes on; the clicked areas, each in place
 * of a hole that is the same patch; nothing that was taken out of the list. An island in a hole goes
 * with its hole: out of the list with it, a construction line with it. Also which keys are drawn as
 * lines, and which areas were not taken.
 */
function keptContours(picture: PreparedPicture, settings: Omit<PictureTraceSettings, "points">) {
  const speck = settings.speck / (picture.scaleX * picture.scaleY);
  const removed = new Set(settings.removed ?? []);
  const { outlines, holes } = contoursFor(picture, settings.part, settings.threshold, settings.regions ?? []);
  const rejected: string[] = [];
  const areas: Contour[] = [];
  for (const area of settings.areas ?? []) {
    const contour = areaContour(picture, area, settings.areaTolerance ?? DEFAULT_TRACE_AREA_TOLERANCE);
    if (contour) areas.push(contour);
    else rejected.push(area.id);
  }
  const big = (contour: Contour) => contour.samples.length >= 3 && contour.area >= speck;
  // A hole that is the patch an area was clicked in gives way to the area: the two would cancel out.
  const sameAsArea = (hole: Contour) => areas.some((area) => Math.abs(area.area - hole.area) <= 0.3 * Math.max(area.area, hole.area) && inside(hole.centre, area.samples));
  const candidates = [
    ...outlines.filter(big),
    ...(settings.holes ? holes.filter((hole) => big(hole) && !sameAsArea(hole)) : []),
    ...areas,
  ];
  const lines = new Set(settings.lines ?? []);
  // An island's hole: the smallest one a level up that it lies in.
  const holeOf = (island: Contour) => candidates
    .filter((hole) => hole.source !== "outline" && hole.depth === island.depth - 1 && hole.area > island.area && inside(island.centre, hole.samples))
    .sort((a, b) => a.area - b.area)[0];
  const kept: Contour[] = [];
  for (const contour of candidates) {
    if (removed.has(contour.key)) continue;
    if (contour.source === "outline" && contour.depth >= 2) {
      const hole = holeOf(contour);
      if (hole && removed.has(hole.key)) continue;
      if (hole && lines.has(hole.key)) lines.add(contour.key);
    }
    kept.push(contour);
  }
  return { contours: kept, rejected, lines };
}

/**
 * Where an outline has corners: the indexes of its steps where it turns by more than `angle` degrees
 * within CORNER_REACH pixels, and turns there rather than along a tight curve - the line on either
 * side runs on straight, so twice as far out it has turned hardly more.
 */
function cornerIndexes(samples: readonly TracePoint[], angle: number): number[] {
  const count = samples.length;
  if (angle >= MAX_TRACE_CORNER_ANGLE) return [];
  const spacing = perimeter(samples) / count;
  const reach = Math.max(2, Math.round(CORNER_REACH / Math.max(1e-6, spacing)));
  if (reach * 4 >= count) return [];
  const at = (index: number) => samples[((index % count) + count) % count];
  const turn = (index: number, span: number) => turnDegrees(sub(at(index), at(index - span)), sub(at(index + span), at(index)));
  const near = samples.map((_, index) => turn(index, reach));
  const candidates: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const wide = turn(index, 2 * reach);
    if (wide < angle || near[index] < CORNER_SHARPNESS * wide) continue;
    // The sharpest step of the corner only, the first of equals.
    let sharpest = true;
    for (let offset = -reach; offset <= reach && sharpest; offset += 1) {
      if (offset === 0) continue;
      const other = near[((index + offset) % count + count) % count];
      if (other > near[index] || (other === near[index] && offset < 0)) sharpest = false;
    }
    if (sharpest) candidates.push(index);
  }
  return candidates;
}

/**
 * Where a corner's point goes: where the two straight sides meet, as long as that is near the step -
 * the outline rounds every corner off by a pixel, the picture's corner is sharp.
 */
function cornerPoint(samples: readonly TracePoint[], index: number): TracePoint {
  const count = samples.length;
  const reach = Math.max(2, Math.round(CORNER_REACH / Math.max(1e-6, perimeter(samples) / count)));
  const at = (offset: number) => samples[(((index + offset) % count) + count) % count];
  const a1 = at(-2 * reach);
  const a2 = at(-reach);
  const b1 = at(reach);
  const b2 = at(2 * reach);
  const da = sub(a2, a1);
  const db = sub(b2, b1);
  const cross = da.x * db.y - da.y * db.x;
  if (Math.abs(cross) < 1e-9) return { ...at(0) };
  const t = ((b1.x - a1.x) * db.y - (b1.y - a1.y) * db.x) / cross;
  const meet = add(a1, scale(da, t));
  return distance(meet, at(0)) <= reach ? meet : { ...at(0) };
}

/** The Bernstein weights of a cubic at u. */
function weights(u: number): [number, number, number, number] {
  const v = 1 - u;
  return [v * v * v, 3 * u * v * v, 3 * u * u * v, u * u * u];
}

function pointOn(curve: Cubic, u: number): TracePoint {
  const [w0, w1, w2, w3] = weights(u);
  return {
    x: curve.from.x * w0 + curve.c1.x * w1 + curve.c2.x * w2 + curve.to.x * w3,
    y: curve.from.y * w0 + curve.c1.y * w1 + curve.c2.y * w2 + curve.to.y * w3,
  };
}

/** How far along its run each point lies, 0 to 1, by the length of the line up to it. */
function chordParameters(points: readonly TracePoint[]) {
  const along = [0];
  for (let index = 1; index < points.length; index += 1) along.push(along[index - 1] + distance(points[index], points[index - 1]));
  const total = along[along.length - 1] || 1;
  return along.map((value) => value / total);
}

/**
 * The cubic from the run's first point to its last, leaving along `startDirection` and arriving
 * against `endDirection` (both pointing into the run), whose handles are as long as fits the points
 * best (least squares); a third of the way when that gives nothing sensible.
 */
function fittedCubic(points: readonly TracePoint[], parameters: readonly number[], startDirection: TracePoint, endDirection: TracePoint): Cubic {
  const from = points[0];
  const to = points[points.length - 1];
  let c00 = 0;
  let c01 = 0;
  let c11 = 0;
  let x0 = 0;
  let x1 = 0;
  points.forEach((point, index) => {
    const [w0, w1, w2, w3] = weights(parameters[index]);
    const a1 = scale(startDirection, w1);
    const a2 = scale(endDirection, w2);
    c00 += dot(a1, a1);
    c01 += dot(a1, a2);
    c11 += dot(a2, a2);
    const rest = sub(point, add(scale(from, w0 + w1), scale(to, w2 + w3)));
    x0 += dot(a1, rest);
    x1 += dot(a2, rest);
  });
  const chord = distance(from, to);
  let run = 0;
  for (let index = 1; index < points.length; index += 1) run += distance(points[index], points[index - 1]);
  const longest = Math.max(chord * 2, run);
  const determinant = c00 * c11 - c01 * c01;
  let first = determinant !== 0 ? (x0 * c11 - x1 * c01) / determinant : 0;
  let second = determinant !== 0 ? (c00 * x1 - c01 * x0) / determinant : 0;
  // A handle that points backwards, has no length or reaches past the whole run would loop: a third each way instead.
  if (!(first > chord * 1e-3) || !(second > chord * 1e-3) || first > longest || second > longest) {
    first = chord / 3;
    second = chord / 3;
  }
  return { from, c1: add(from, scale(startDirection, first)), c2: add(to, scale(endDirection, second)), to };
}

/** The farthest any point lies from the curve (squared), and which point that is. */
function farthestPoint(points: readonly TracePoint[], parameters: readonly number[], curve: Cubic) {
  let worst = 0;
  let at = Math.floor(points.length / 2);
  for (let index = 1; index < points.length - 1; index += 1) {
    const gap = sub(pointOn(curve, parameters[index]), points[index]);
    const squared = dot(gap, gap);
    if (squared > worst) {
      worst = squared;
      at = index;
    }
  }
  return { worst, at };
}

/** The parameters moved to where the curve comes nearest each point (one Newton step). */
function improvedParameters(points: readonly TracePoint[], parameters: readonly number[], curve: Cubic) {
  const { from, c1, c2, to } = curve;
  const d1 = [scale(sub(c1, from), 3), scale(sub(c2, c1), 3), scale(sub(to, c2), 3)];
  const d2 = [scale(sub(d1[1], d1[0]), 2), scale(sub(d1[2], d1[1]), 2)];
  return parameters.map((u, index) => {
    const v = 1 - u;
    const onCurve = pointOn(curve, u);
    const first = add(add(scale(d1[0], v * v), scale(d1[1], 2 * u * v)), scale(d1[2], u * u));
    const second = add(scale(d2[0], v), scale(d2[1], u));
    const gap = sub(onCurve, points[index]);
    const denominator = dot(first, first) + dot(gap, second);
    if (Math.abs(denominator) < 1e-12) return u;
    return Math.min(1, Math.max(0, u - dot(gap, first) / denominator));
  });
}

/** Whether every point of the run lies within `tolerance` of the straight line from its first point to its last. */
function runsStraight(points: readonly TracePoint[], tolerance: number) {
  const from = points[0];
  const to = points[points.length - 1];
  const direction = sub(to, from);
  const size = length(direction);
  if (size < 1e-9) return false;
  return points.every((point) => Math.abs(direction.x * (point.y - from.y) - direction.y * (point.x - from.x)) / size <= tolerance);
}

/** The direction a run leaves its point `index` in, looking a few steps ahead (or back, with a negative `toward`). */
function runDirection(points: readonly TracePoint[], index: number, toward: 1 | -1) {
  const reach = Math.max(1, Math.min(CORNER_REACH, Math.floor((points.length - 1) / 3)));
  const other = points[Math.min(points.length - 1, Math.max(0, index + toward * reach))];
  return unit(sub(other, points[index]));
}

/**
 * Curves through a run of points from one end to the other, each within `tolerance` of them: one
 * cubic if it fits, else split where it strays most, the two halves meeting smoothly there.
 */
function fittedCurves(points: readonly TracePoint[], startDirection: TracePoint, endDirection: TracePoint, tolerance: number, out: Cubic[]) {
  if (points.length <= 2) {
    const third = distance(points[0], points[points.length - 1]) / 3;
    out.push({
      from: points[0],
      c1: add(points[0], scale(startDirection, third)),
      c2: add(points[points.length - 1], scale(endDirection, third)),
      to: points[points.length - 1],
    });
    return;
  }
  const start = points[0];
  let farthest = 0;
  points.forEach((point, index) => {
    if (distance(point, start) > distance(points[farthest], start)) farthest = index;
  });
  if (distance(start, points[points.length - 1]) < 0.02 * distance(points[farthest], start) && farthest > 0 && farthest < points.length - 1) {
    // A run that comes back to where it started (an outline without corners, or with one) is first cut at its far end.
    const reach = Math.min(2, farthest, points.length - 1 - farthest);
    const across = unit(sub(points[farthest + reach], points[farthest - reach]));
    fittedCurves(points.slice(0, farthest + 1), startDirection, scale(across, -1), tolerance, out);
    fittedCurves(points.slice(farthest), across, endDirection, tolerance, out);
    return;
  }
  let parameters = chordParameters(points);
  let curve = fittedCubic(points, parameters, startDirection, endDirection);
  let { worst, at } = farthestPoint(points, parameters, curve);
  const allowed = tolerance * tolerance;
  // Nearly there: the points sit at the wrong places along the curve more than the curve is wrong.
  for (let round = 0; round < 4 && worst > allowed && worst < allowed * 16; round += 1) {
    parameters = improvedParameters(points, parameters, curve);
    curve = fittedCubic(points, parameters, startDirection, endDirection);
    ({ worst, at } = farthestPoint(points, parameters, curve));
  }
  if (worst <= allowed) {
    out.push(curve);
    return;
  }
  const split = Math.min(points.length - 2, Math.max(1, at));
  const reach = Math.min(2, split, points.length - 1 - split);
  const across = unit(sub(points[split + reach], points[split - reach]));
  fittedCurves(points.slice(0, split + 1), startDirection, scale(across, -1), tolerance, out);
  fittedCurves(points.slice(split), across, endDirection, tolerance, out);
}

/** A cubic halved at its middle (de Casteljau): two cubics meeting smoothly. */
function halved(curve: Cubic): [Cubic, Cubic] {
  const mid = (a: TracePoint, b: TracePoint) => scale(add(a, b), 0.5);
  const ab = mid(curve.from, curve.c1);
  const bc = mid(curve.c1, curve.c2);
  const cd = mid(curve.c2, curve.to);
  const abc = mid(ab, bc);
  const bcd = mid(bc, cd);
  const middle = mid(abc, bcd);
  return [{ from: curve.from, c1: ab, c2: abc, to: middle }, { from: middle, c1: bcd, c2: cd, to: curve.to }];
}

/** The pieces of one outline at a tolerance: straight between two corners where it runs straight, else curved. */
function ringPieces(samples: readonly TracePoint[], corners: readonly number[], tolerance: number): Piece[] {
  const count = samples.length;
  const pieces: Piece[] = [];
  if (!corners.length) {
    // No corner: one smooth loop, from its first step all the way round, meeting itself smoothly.
    const loop = [...samples, samples[0]];
    const across = unit(sub(samples[2 % count], samples[(count - 2) % count]));
    const curves: Cubic[] = [];
    fittedCurves(loop, across, scale(across, -1), tolerance, curves);
    curves.forEach((curve) => pieces.push({ ...curve, cornerAtStart: false }));
  } else {
    const points = corners.map((index) => cornerPoint(samples, index));
    corners.forEach((start, order) => {
      const end = corners[(order + 1) % corners.length];
      const steps = (end - start + count) % count || count;
      const run = Array.from({ length: steps + 1 }, (_, offset) => samples[(start + offset) % count]);
      run[0] = points[order];
      run[run.length - 1] = points[(order + 1) % corners.length];
      if (runsStraight(run, tolerance)) {
        pieces.push({ from: run[0], to: run[run.length - 1], cornerAtStart: true });
        return;
      }
      const curves: Cubic[] = [];
      fittedCurves(run, runDirection(run, 0, 1), runDirection(run, run.length - 1, -1), tolerance, curves);
      curves.forEach((curve, index) => pieces.push({ ...curve, cornerAtStart: index === 0 }));
    });
  }
  // Fewer than three sides do not close an outline in the sketch: halve the longest until there are three.
  while (pieces.length < MIN_RING_SIDES) {
    let longest = 0;
    pieces.forEach((piece, index) => {
      if (distance(piece.from, piece.to) > distance(pieces[longest].from, pieces[longest].to)) longest = index;
    });
    const piece = pieces[longest];
    if (piece.c1 && piece.c2) {
      const [a, b] = halved({ from: piece.from, c1: piece.c1, c2: piece.c2, to: piece.to });
      pieces.splice(longest, 1, { ...a, cornerAtStart: piece.cornerAtStart }, { ...b, cornerAtStart: false });
    } else {
      const middle = scale(add(piece.from, piece.to), 0.5);
      pieces.splice(longest, 1, { from: piece.from, to: middle, cornerAtStart: piece.cornerAtStart }, { from: middle, to: piece.to, cornerAtStart: false });
    }
  }
  return pieces;
}

/** The pieces as points with handles, in the picture's own pixels. */
function ringNodes(pieces: readonly Piece[], picture: PreparedPicture): TraceNode[] {
  const own = (point: TracePoint): TracePoint => ({ x: point.x * picture.scaleX, y: point.y * picture.scaleY });
  return pieces.map((piece, index) => {
    const before = pieces[(index - 1 + pieces.length) % pieces.length];
    const node: TraceNode = { ...own(piece.from), corner: piece.cornerAtStart };
    if (before.c2) node.handleIn = own(before.c2);
    if (piece.c1) node.handleOut = own(piece.c1);
    return node;
  });
}

type Fit = { rings: Array<{ pieces: Piece[]; hole: boolean; key: string; source: TraceSource }>; points: number; corners: number; tolerance: number; refined?: boolean };

function fitAll(contours: readonly Contour[], corners: readonly number[][], tolerance: number): Fit {
  let points = 0;
  let cornerCount = 0;
  const rings = contours.map((contour, index) => {
    const pieces = ringPieces(contour.samples, corners[index], tolerance);
    points += pieces.length;
    cornerCount += pieces.filter((piece) => piece.cornerAtStart).length;
    return { pieces, hole: contour.depth % 2 === 1, key: contour.key, source: contour.source };
  });
  return { rings, points, corners: cornerCount, tolerance };
}

/** A piece as a line of short straight steps: 8 along a curve. */
function pieceSteps(piece: Piece, out: TracePoint[]) {
  if (!piece.c1 || !piece.c2) {
    out.push(piece.from);
    return;
  }
  const curve = { from: piece.from, c1: piece.c1, c2: piece.c2, to: piece.to };
  for (let step = 0; step < 8; step += 1) out.push(pointOn(curve, step / 8));
}

/**
 * Which outlines cross another or themselves, by their index. Fitted loosely, two outlines a pixel or
 * two apart (the two edges of a drawn line) can cross, and crossing outlines make no body. The steps
 * are sorted into cells of a grid so only near ones are compared.
 */
function crossingRings(rings: readonly Piece[][]): Set<number> {
  type Step = { ring: number; index: number; count: number; a: TracePoint; b: TracePoint };
  const steps: Step[] = [];
  rings.forEach((pieces, ring) => {
    const line: TracePoint[] = [];
    pieces.forEach((piece) => pieceSteps(piece, line));
    line.forEach((a, index) => steps.push({ ring, index, count: line.length, a, b: line[(index + 1) % line.length] }));
  });
  const cell = 6;
  const grid = new Map<string, number[]>();
  steps.forEach((step, index) => {
    const x0 = Math.floor(Math.min(step.a.x, step.b.x) / cell);
    const x1 = Math.floor(Math.max(step.a.x, step.b.x) / cell);
    const y0 = Math.floor(Math.min(step.a.y, step.b.y) / cell);
    const y1 = Math.floor(Math.max(step.a.y, step.b.y) / cell);
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        const key = `${x}:${y}`;
        const list = grid.get(key);
        if (list) list.push(index);
        else grid.set(key, [index]);
      }
    }
  });
  const side = (p: TracePoint, q: TracePoint, r: TracePoint) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const crossing = new Set<number>();
  for (const list of grid.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const first = steps[list[i]];
        const second = steps[list[j]];
        if (crossing.has(first.ring) && crossing.has(second.ring)) continue;
        // Neighbouring steps of one outline meet at their end, which is no crossing.
        if (first.ring === second.ring) {
          const apart = Math.abs(first.index - second.index);
          if (apart <= 1 || apart === first.count - 1) continue;
        }
        if (side(first.a, first.b, second.a) * side(first.a, first.b, second.b) < 0 && side(second.a, second.b, first.a) * side(second.a, second.b, first.b) < 0) {
          crossing.add(first.ring);
          crossing.add(second.ring);
        }
      }
    }
  }
  return crossing;
}

/** The fit with no outline crossing another or itself: each that does is fitted again more closely, down to the closest fit. */
function withoutCrossings(fit: Fit, contours: readonly Contour[], corners: readonly number[][]): Fit {
  const tolerances = fit.rings.map(() => fit.tolerance);
  const rings = fit.rings.map((ring) => ({ ...ring }));
  let refined = false;
  for (let round = 0; round < 10; round += 1) {
    const crossing = crossingRings(rings.map((ring) => ring.pieces));
    let changed = false;
    crossing.forEach((index) => {
      if (tolerances[index] <= FINEST_TOLERANCE) return;
      tolerances[index] = Math.max(FINEST_TOLERANCE, tolerances[index] / 2);
      rings[index].pieces = ringPieces(contours[index].samples, corners[index], tolerances[index]);
      changed = true;
      refined = true;
    });
    if (!changed) break;
  }
  let points = 0;
  let cornerCount = 0;
  rings.forEach((ring) => {
    points += ring.pieces.length;
    cornerCount += ring.pieces.filter((piece) => piece.cornerAtStart).length;
  });
  return { rings, points, corners: cornerCount, tolerance: fit.tolerance, ...(refined ? { refined } : {}) };
}

/** The outlines a set of settings keeps, with their corners, and the areas not taken. */
function keptWithCorners(picture: PreparedPicture, settings: Omit<PictureTraceSettings, "points">) {
  const { contours, rejected, lines } = keptContours(picture, settings);
  return { contours, rejected, lines, corners: contours.map((contour) => cornerIndexes(contour.samples, settings.cornerAngle)) };
}

/** How many points the outlines can have with these settings: fewest at the loosest fit, most at the closest. */
export function traceRange(picture: PreparedPicture, settings: Omit<PictureTraceSettings, "points">): PictureTraceRange {
  const { contours, corners } = keptWithCorners(picture, settings);
  if (!contours.length) return { fewest: 0, most: 0, suggested: 0 };
  const fewest = fitAll(contours, corners, LOOSEST_TOLERANCE).points;
  const most = Math.max(fewest, fitAll(contours, corners, FINEST_TOLERANCE).points);
  const suggested = Math.min(most, Math.max(fewest, fitAll(contours, corners, SUGGESTED_TOLERANCE).points));
  return { fewest, most, suggested };
}

/**
 * The picture traced with the settings: the outlines as close to the picture as the number of points
 * allows - the closest fit that has no more points than asked for, or the loosest one if even that has
 * more (the corners always stay). No outlines when the settings leave nothing.
 */
export function tracePicture(picture: PreparedPicture, settings: PictureTraceSettings): PictureTrace {
  const { contours, corners, rejected, lines } = keptWithCorners(picture, settings);
  if (!contours.length) return { rings: [], points: 0, corners: 0, ...(rejected.length ? { rejected } : {}) };
  let best = fitAll(contours, corners, FINEST_TOLERANCE);
  if (best.points > settings.points) {
    let close = Math.log(FINEST_TOLERANCE);
    let loose = Math.log(LOOSEST_TOLERANCE);
    best = fitAll(contours, corners, LOOSEST_TOLERANCE);
    if (best.points <= settings.points) {
      // The closest fit within the number of points: halve the gap between too many and few enough.
      for (let round = 0; round < 12; round += 1) {
        const middle = (close + loose) / 2;
        const fit = fitAll(contours, corners, Math.exp(middle));
        if (fit.points <= settings.points) {
          best = fit;
          loose = middle;
        } else close = middle;
      }
    }
  }
  // No outline may cross another: where loose curves would, those outlines are fitted more closely.
  best = withoutCrossings(best, contours, corners);
  return {
    rings: best.rings.map((ring) => ({
      nodes: ringNodes(ring.pieces, picture),
      hole: ring.hole,
      key: ring.key,
      source: ring.source,
      ...(lines.has(ring.key) ? { line: true } : {}),
    })),
    points: best.points,
    corners: best.corners,
    ...(rejected.length ? { rejected } : {}),
    ...(best.refined ? { refined: true } : {}),
  };
}

const svgNumber = (value: number) => String(Math.round(value * 1000) / 1000);

/** A traced picture as an SVG path's data, in the picture's pixels: M, L and C, each outline closed. */
export function tracePathData(trace: Pick<PictureTrace, "rings">) {
  return trace.rings.map(({ nodes }) => {
    const parts = [`M${svgNumber(nodes[0].x)} ${svgNumber(nodes[0].y)}`];
    nodes.forEach((node, index) => {
      const next = nodes[(index + 1) % nodes.length];
      if (node.handleOut && next.handleIn) {
        parts.push(`C${svgNumber(node.handleOut.x)} ${svgNumber(node.handleOut.y)} ${svgNumber(next.handleIn.x)} ${svgNumber(next.handleIn.y)} ${svgNumber(next.x)} ${svgNumber(next.y)}`);
      } else if (index < nodes.length - 1) parts.push(`L${svgNumber(next.x)} ${svgNumber(next.y)}`);
    });
    return `${parts.join("")}Z`;
  }).join("");
}

/** A traced picture as an SVG file of the picture's size, the outlines filled even-odd, as a drawing program writes one. */
export function traceSvg(trace: Pick<PictureTrace, "rings">, picture: Pick<PreparedPicture, "width" | "height">) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${picture.width}" height="${picture.height}" viewBox="0 0 ${picture.width} ${picture.height}"><path fill="#000000" fill-rule="evenodd" d="${tracePathData(trace)}"/></svg>`;
}
