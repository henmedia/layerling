import type { CrossSection, ManifoldToplevel, Mat4 } from "manifold-3d";
import type { ClearanceBox, ClearanceVec3 } from "@/lib/clearanceCheck";
import { clearanceSourceShapes } from "@/lib/clearanceCheck";
import { disposeManifold, shapeToManifoldSolid } from "@/lib/editorBooleans";
import { getManifoldRuntime } from "@/lib/editorMeshCore";
import { sortFindings, type Finding, type FindingKind, type FindingLevel, type FindingRegion, type FindingUnit } from "@/lib/findings";
import type { ManifoldSolid } from "@/lib/manifoldSplit";
import { OVERHANG_PLATE_TOLERANCE } from "@/lib/overhangLimits";
import { printCheckOpenMeshes } from "@/lib/printCheck";
import { displayShapeName } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The layer check (Druckanalyse): the bodies cut into the layers a printer lays down, and every layer compared with the
 * one below it, in one go. What it finds comes back as a list of findings (lib/findings.ts), each layer's cross-section
 * as figures and outlines for the layer view. It only reads: the design does not change.
 *
 * First the whole: does a part reach into the plate (layers below the plate are not counted), float above it, is a mesh
 * open, is it larger than the printer. Then layer by layer, each at its middle height:
 *
 * - unsupported: a place that begins with nothing under it, or reaches flat out from what is under it on one side only
 *   (the arms of a T): a problem, the printer lays it into the air;
 * - overhang: a place that reaches out further than the overhang angle lets it (45 degrees from the vertical, a hint;
 *   from 60, a problem), the angle measured from how far it reaches out over one layer's height;
 * - bridge: a flat place held on two sides or all round (a ceiling): a hint when its span is over 10 mm;
 * - thin wall: a place narrower than two lines of the nozzle, which the slicer drops or prints as one weak line;
 * - small island: a separate place under 2 mm² that goes on for at least 2 mm of height, a thin pin that wobbles;
 * - adhesion: a first layer too small for the part's height, which can come loose.
 *
 * Places under 0.05 mm² are not rated (a tip, a top layer, the slivers rounding leaves). The same thing found on layer
 * after layer at the same place makes one finding. Everything is measured with Manifold's cross-sections, z up.
 */

export type LayerCheckOptions = {
  /** The layer height, mm. */
  layerHeight: number;
  /** The nozzle, mm: a wall needs two lines of it. */
  nozzle: number;
  /** Overhangs steeper than this (degrees from the vertical) are a hint ... */
  overhangHint: number;
  /** ... and steeper than this a problem. */
  overhangProblem: number;
  /** A bridge spanning more than this, mm, is a hint. */
  bridgeSpan: number;
  /** A wall thinner than this, mm, is a hint; 0 takes two lines of the nozzle. */
  minWall: number;
  /** A separate place smaller than this, mm², is a small island. */
  smallIsland: number;
  /** Places smaller than this, mm², are not rated. */
  minArea: number;
  /** The printer's build volume, mm (width, depth, height); null when no printer is chosen. */
  buildVolume: [number, number, number] | null;
};

export const LAYER_CHECK_DEFAULTS: LayerCheckOptions = {
  layerHeight: 0.2, nozzle: 0.4, overhangHint: 45, overhangProblem: 60, bridgeSpan: 10, minWall: 0, smallIsland: 2, minArea: 0.05, buildVolume: null,
};

export const LAYER_CHECK_LIMITS = {
  layerHeight: [0.04, 1], nozzle: [0.1, 2], overhangHint: [30, 75], overhangProblem: [35, 85], bridgeSpan: [1, 100], minWall: [0, 10], smallIsland: [0.1, 50], minArea: [0.001, 5],
} as const;

/** At most this many layers are cut: a tall part at a fine layer height is cut at a coarser one, and the result says so. */
export const LAYER_CHECK_MAX_LAYERS = 4000;
/** A finding keeps the outline of at most this many of its layers, spread over it, to paint it. */
const REGION_LAYERS = 120;
/** A small island must go on this high (mm) before it counts: the tip of a cone is no wobbly pin. */
const SMALL_ISLAND_MIN_HEIGHT = 2;
/** Below this footprint (mm²) for each mm of height a part may come loose, as the print check says (lib/printCheck.ts). */
const ADHESION_MM2_PER_MM = 0.5;
/** A first layer smaller than this (mm²) holds a part badly whatever its height. */
const ADHESION_MIN_MM2 = 10;
/** A place reaching out this steeply or more (degrees from the vertical) counts as flat: a bridge or unsupported. */
const FLAT_DEGREES = 80;
/** A flat place held on this much of its rim or more is a bridge (a ceiling), not a ledge. */
const BRIDGE_RIM_SHARE = 0.45;
/** A thin wall is at least this many times as long as it is thick: a small round top is no wall. */
const THIN_WALL_ASPECT = 4;

const SCENE_TO_UP: Mat4 = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];

function clampNumber(value: unknown, [min, max]: readonly [number, number], fallback: number) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function normalizeLayerCheckOptions(given: Partial<Record<keyof LayerCheckOptions, unknown>> = {}): LayerCheckOptions {
  const pick = (key: keyof typeof LAYER_CHECK_LIMITS) => clampNumber(given[key], LAYER_CHECK_LIMITS[key], LAYER_CHECK_DEFAULTS[key]);
  const overhangHint = pick("overhangHint");
  const volume = Array.isArray(given.buildVolume) && given.buildVolume.length === 3 && given.buildVolume.every((value) => typeof value === "number" && value > 0)
    ? (given.buildVolume as [number, number, number]) : null;
  return {
    layerHeight: pick("layerHeight"),
    nozzle: pick("nozzle"),
    overhangHint,
    overhangProblem: Math.max(overhangHint, pick("overhangProblem")),
    bridgeSpan: pick("bridgeSpan"),
    minWall: pick("minWall"),
    smallIsland: pick("smallIsland"),
    minArea: pick("minArea"),
    buildVolume: volume,
  };
}

/** The thinnest wall that prints well: the one asked for, or two lines of the nozzle. */
export function layerCheckMinimumWall(options: Pick<LayerCheckOptions, "minWall" | "nozzle">) {
  return options.minWall > 0 ? options.minWall : 2 * options.nozzle;
}

/** One layer as the layer view shows it. */
export type LayerInfo = {
  /** Counted from 1. */
  number: number;
  bottom: number;
  top: number;
  areaMm2: number;
  islands: number;
};

export type LayerCheckResult = {
  layerHeight: number;
  /** The layer height asked for was coarsened so no more than LAYER_CHECK_MAX_LAYERS were cut. */
  coarsened: boolean;
  layers: LayerInfo[];
  /** Each layer's cross-section as polygons (kernel frame, x and the scene's -z), flat, for the cut face of the layer view. */
  outlines: number[][][];
  findings: Finding[];
  /** The checked bodies' box in the scene's frame. */
  box: ClearanceBox | null;
  minimumWallMm: number;
  /** Objects that are no closed body the kernel can read: not cut into layers. */
  unchecked: Array<{ id: string; name: string }>;
  /** How long the cutting took, ms (for the report; not shown). */
  millis: number;
  triangles: number;
};

export type LayerCheckHooks = {
  /** Called now and then with how far it got, 0 to 1. */
  progress?: (fraction: number) => void;
  /** Asked now and then; true stops the check (it throws a LayerCheckStopped). */
  stopped?: () => boolean;
};

export class LayerCheckStopped extends Error {
  constructor() {
    super("stopped");
    this.name = "LayerCheckStopped";
  }
}

/** Who each part of the design is, to name the part a finding lies on: its box in the scene's frame. */
export type LayerCheckOwner = { id: string; name: string; box: ClearanceBox };

type Raw = {
  kind: FindingKind;
  level: FindingLevel;
  layer: number;
  area: number;
  value: number;
  unit: FindingUnit;
  rect: [number, number, number, number];
  polygons: number[][];
  centroid: [number, number];
  /** Which island of its layer the place lies on: places of one kind on one island are one place (the two arms of a T). */
  group: number;
};

type Run = Omit<Raw, "layer" | "polygons" | "centroid"> & {
  from: number;
  to: number;
  regions: FindingRegion[];
  /** The centroid of the largest layer, weighted. */
  sum: [number, number, number];
};

/** How a value of a kind is kept when layers join: the steepest angle and the widest span, the thinnest wall, the smallest island. */
const KEEP_LOWEST = new Set<FindingKind>(["thinWall", "smallIsland"]);

function flatten(section: CrossSection): number[][] {
  return section.toPolygons().map((polygon) => {
    const flat: number[] = [];
    for (const point of polygon) flat.push(point[0], point[1]);
    return flat;
  });
}

function perimeterOf(polygons: number[][]) {
  let length = 0;
  for (const flat of polygons) {
    for (let index = 0; index < flat.length; index += 2) {
      const next = (index + 2) % flat.length;
      length += Math.hypot(flat[next] - flat[index], flat[next + 1] - flat[index + 1]);
    }
  }
  return length;
}

function centroidOf(polygons: number[][]): [number, number] {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (const flat of polygons) {
    for (let index = 0; index < flat.length; index += 2) {
      const next = (index + 2) % flat.length;
      const cross = flat[index] * flat[next + 1] - flat[next] * flat[index + 1];
      area += cross;
      cx += (flat[index] + flat[next]) * cross;
      cy += (flat[index + 1] + flat[next + 1]) * cross;
    }
  }
  if (Math.abs(area) < 1e-12) {
    const first = polygons[0] ?? [0, 0];
    return [first[0], first[1]];
  }
  return [cx / (3 * area), cy / (3 * area)];
}

function rectsTouch(a: Raw["rect"], b: Raw["rect"], margin: number) {
  return a[0] - margin <= b[2] && b[0] - margin <= a[2] && a[1] - margin <= b[3] && b[1] - margin <= a[3];
}

/**
 * The layer check of one solid in the scene's frame (y up, the plate at y = 0). `owners` name the part a finding lies on;
 * `extra` are findings made before (open meshes), put in the same list.
 */
export function checkLayersOfSolid(
  runtime: ManifoldToplevel,
  body: ManifoldSolid,
  given: Partial<LayerCheckOptions>,
  owners: readonly LayerCheckOwner[] = [],
  hooks: LayerCheckHooks = {},
  extra: Finding[] = [],
): LayerCheckResult {
  const started = Date.now();
  const options = normalizeLayerCheckOptions(given);
  const minimumWall = layerCheckMinimumWall(options);
  const result: LayerCheckResult = {
    layerHeight: options.layerHeight, coarsened: false, layers: [], outlines: [], findings: [], box: null, minimumWallMm: minimumWall, unchecked: [], millis: 0,
    triangles: body.numTri(),
  };
  const created: { delete?: () => void }[] = [];
  const keep = <T extends { delete?: () => void }>(value: T): T => {
    created.push(value);
    return value;
  };
  let findingNumber = 0;
  const findings: Finding[] = [...extra];
  const ownerOf = (point: ClearanceVec3) => {
    const inside = owners.filter(({ box }) => point.every((value, axis) => value >= box.min[axis] - 0.5 && value <= box.max[axis] + 0.5));
    const pool = inside.length ? inside : owners;
    if (!pool.length) return null;
    const size = ({ box }: LayerCheckOwner) => (box.max[0] - box.min[0]) * (box.max[1] - box.min[1]) * (box.max[2] - box.min[2]);
    const distance = ({ box }: LayerCheckOwner) => Math.hypot(...point.map((value, axis) => Math.max(box.min[axis] - value, 0, value - box.max[axis])));
    return [...pool].sort((a, b) => distance(a) - distance(b) || size(a) - size(b))[0];
  };
  const add = (finding: Omit<Finding, "id" | "partIds" | "partName"> & { partIds?: string[]; partName?: string }) => {
    const owner = finding.partIds ? null : ownerOf(finding.point);
    findings.push({ ...finding, id: `finding-${++findingNumber}`, partIds: finding.partIds ?? (owner ? [owner.id] : []), partName: finding.partName ?? owner?.name ?? "" });
  };
  try {
    const up = keep(body.transform(SCENE_TO_UP));
    if (up.isEmpty()) {
      result.findings = sortFindings(findings);
      return result;
    }
    const bounds = up.boundingBox();
    const [x0, y0, z0] = bounds.min;
    const [x1, y1, z1] = bounds.max;
    // Back to the scene's frame: x, z up is y, the kernel's y is the scene's -z.
    const scenePoint = (x: number, y: number, z: number): ClearanceVec3 => [x, z, -y];
    const sceneBox = (rect: Raw["rect"], low: number, high: number): ClearanceBox => ({ min: [rect[0], low, -rect[3]], max: [rect[2], high, -rect[1]] });
    result.box = { min: [x0, z0, -y1], max: [x1, z1, -y0] };

    // The whole first.
    if (z0 < -OVERHANG_PLATE_TOLERANCE) {
      for (const piece of up.decompose().map(keep)) {
        const box = piece.boundingBox();
        if (box.min[2] >= -OVERHANG_PLATE_TOLERANCE) continue;
        const cut = keep(piece.slice(0));
        add({
          kind: "inBed", level: "problem", areaMm2: cut.area(), value: -box.min[2], unit: "mm",
          point: scenePoint((box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, 0),
          box: { min: [box.min[0], box.min[2], -box.max[1]], max: [box.max[0], 0, -box.min[1]] }, action: "dropToPlate",
        });
      }
    } else if (z0 > OVERHANG_PLATE_TOLERANCE) {
      add({ kind: "floatsAbove", level: "problem", areaMm2: 0, value: z0, unit: "mm", point: scenePoint((x0 + x1) / 2, (y0 + y1) / 2, z0), box: result.box, action: "dropToPlate" });
    }
    if (options.buildVolume) {
      const [width, depth, height] = options.buildVolume;
      const size = [x1 - x0, y1 - y0, z1 - Math.max(0, z0)];
      // Turned a quarter on the plate it may still fit.
      const fits = size[2] <= height + 1e-6 && ((size[0] <= width + 1e-6 && size[1] <= depth + 1e-6) || (size[0] <= depth + 1e-6 && size[1] <= width + 1e-6));
      if (!fits) {
        add({
          kind: "tooLarge", level: "problem", areaMm2: 0, value: Math.max(size[0] / width, size[1] / depth, size[2] / height) * 100, unit: "percent",
          point: scenePoint((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), box: result.box,
        });
      }
    }

    // The layers: from the plate (never below it) to the top.
    const top = z1;
    let layerHeight = options.layerHeight;
    if (top / layerHeight > LAYER_CHECK_MAX_LAYERS) {
      layerHeight = Math.ceil((top / LAYER_CHECK_MAX_LAYERS) * 100) / 100;
      result.coarsened = true;
    }
    result.layerHeight = layerHeight;
    const count = top > 0 ? Math.ceil(top / layerHeight - 1e-9) : 0;
    const hintReach = layerHeight * Math.tan(((options.overhangHint + 0.5) * Math.PI) / 180);
    const flatReach = layerHeight * Math.tan((FLAT_DEGREES * Math.PI) / 180);
    const erode = (minimumWall / 2) * 0.98;
    const lowest = Math.max(0, z0);
    const lowestLayer = Math.floor(lowest / layerHeight + 1e-9);
    const floats = z0 > OVERHANG_PLATE_TOLERANCE;

    let previous: CrossSection | null = null;
    let previousArea = 0;
    const open: Run[] = [];
    const closed: Run[] = [];
    const stride = Math.max(1, Math.floor(count / REGION_LAYERS));
    const close = (run: Run) => {
      closed.push(run);
    };
    const report = (raw: Raw) => {
      const sameLayer = open.find((candidate) => candidate.kind === raw.kind && candidate.to === raw.layer && candidate.group === raw.group);
      const region: FindingRegion = { layer: raw.layer, z: (raw.layer - 0.5) * layerHeight, polygons: raw.polygons };
      if (sameLayer) {
        // Another place of the same kind on the same island in this layer: the same finding, its outline added.
        sameLayer.area += raw.area;
        sameLayer.value = KEEP_LOWEST.has(raw.kind) ? Math.min(sameLayer.value, raw.value) : Math.max(sameLayer.value, raw.value);
        if (raw.level === "problem") sameLayer.level = "problem";
        sameLayer.rect = [Math.min(sameLayer.rect[0], raw.rect[0]), Math.min(sameLayer.rect[1], raw.rect[1]), Math.max(sameLayer.rect[2], raw.rect[2]), Math.max(sameLayer.rect[3], raw.rect[3])];
        sameLayer.sum[0] += raw.centroid[0] * raw.area;
        sameLayer.sum[1] += raw.centroid[1] * raw.area;
        sameLayer.sum[2] += region.z * raw.area;
        const last = sameLayer.regions[sameLayer.regions.length - 1];
        if (last?.layer === raw.layer) last.polygons.push(...raw.polygons);
        return;
      }
      const run = open.find((candidate) => candidate.kind === raw.kind && candidate.to === raw.layer - 1 && rectsTouch(candidate.rect, raw.rect, 1));
      if (!run) {
        open.push({
          kind: raw.kind, level: raw.level, area: raw.area, value: raw.value, unit: raw.unit, rect: [...raw.rect], from: raw.layer, to: raw.layer, group: raw.group,
          regions: [region], sum: [raw.centroid[0] * raw.area, raw.centroid[1] * raw.area, region.z * raw.area],
        });
        return;
      }
      run.to = raw.layer;
      run.group = raw.group;
      run.area += raw.area;
      run.value = KEEP_LOWEST.has(raw.kind) ? Math.min(run.value, raw.value) : Math.max(run.value, raw.value);
      if (raw.level === "problem") run.level = "problem";
      run.rect = [Math.min(run.rect[0], raw.rect[0]), Math.min(run.rect[1], raw.rect[1]), Math.max(run.rect[2], raw.rect[2]), Math.max(run.rect[3], raw.rect[3])];
      run.sum[0] += raw.centroid[0] * raw.area;
      run.sum[1] += raw.centroid[1] * raw.area;
      run.sum[2] += region.z * raw.area;
      if ((raw.layer - run.from) % stride === 0 || run.regions.length < 4) run.regions.push(region);
    };
    let islandsHere: CrossSection[] = [];
    const rawOf = (kind: FindingKind, level: FindingLevel, layer: number, section: CrossSection, area: number, value: number, unit: FindingUnit): Raw => {
      const polygons = flatten(section);
      const b = section.bounds();
      const group = islandsHere.length > 1 ? islandsHere.findIndex((island) => keep(island.intersect(section)).area() > area * 0.5) : 0;
      return { kind, level, layer, area, value, unit, rect: [b.min[0], b.min[1], b.max[0], b.max[1]], polygons, centroid: centroidOf(polygons), group };
    };

    for (let index = 0; index < count; index += 1) {
      if (index % 8 === 0) {
        if (hooks.stopped?.()) throw new LayerCheckStopped();
        hooks.progress?.(index / Math.max(1, count));
      }
      const layer = index + 1;
      const middle = Math.min(top - 1e-4, (index + 0.5) * layerHeight);
      const section = keep(up.slice(middle));
      const area = section.area();
      const islands = area > 0 ? section.decompose().map(keep) : [];
      islandsHere = islands;
      result.layers.push({ number: layer, bottom: index * layerHeight, top: Math.min(top, layer * layerHeight), areaMm2: area, islands: islands.length });
      result.outlines.push(area > 0 ? flatten(keep(section.simplify(0.01))) : []);

      if (area >= options.minArea) {
        // What holds this layer up: the plate for the first, else the layer below.
        const onPlate = index === 0 || (index === lowestLayer && !floats);
        if (!onPlate) {
          const below: CrossSection | null = previous && previousArea > 0 ? previous : null;
          const reach = below ? keep(below.offset(hintReach, "Round", 2, 32)) : null;
          const loose = reach ? keep(section.subtract(reach)) : section;
          if (loose.area() >= options.minArea) {
            for (const place of loose.decompose().map(keep)) {
              const placeArea = place.area();
              if (placeArea < options.minArea) continue;
              // How far it reaches out from what is under it: grown until the place is covered.
              let d = hintReach;
              let touching = false;
              if (below) {
                const b = place.bounds();
                let hi = hintReach + Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1]) + 1;
                let lo = hintReach;
                for (let step = 0; step < 10; step += 1) {
                  const mid = (lo + hi) / 2;
                  const rest = keep(place.subtract(keep(below.offset(mid, "Round", 2, 32))));
                  if (rest.area() > 1e-4) lo = mid;
                  else hi = mid;
                }
                d = hi;
                const rim = keep(keep(place.offset(0.05, "Round", 2, 16)).subtract(place));
                touching = keep(rim.intersect(reach!)).area() > 1e-5;
              }
              // The lowest layer of a floating part: the floating finding says it already.
              if (!below && index === lowestLayer) continue;
              const angle = Math.min(90, (Math.atan2(d, layerHeight) * 180) / Math.PI);
              if (!below || !touching) {
                report(rawOf("unsupported", "problem", layer, place, placeArea, 90, "deg"));
                continue;
              }
              if (d >= flatReach) {
                // Flat: held on two sides or round its rim is a bridge, else a ledge in the air.
                const rim = keep(keep(place.offset(0.05, "Round", 2, 16)).subtract(place));
                const held = keep(rim.intersect(reach!));
                const contacts = held.decompose().map(keep).filter((piece) => piece.area() > 1e-5).length;
                const share = held.area() / Math.max(1e-9, rim.area());
                if (contacts >= 2 || share >= BRIDGE_RIM_SHARE) {
                  const span = 2 * d;
                  if (span > options.bridgeSpan) report(rawOf("bridge", "hint", layer, place, placeArea, span, "mm"));
                  continue;
                }
                report(rawOf("unsupported", "problem", layer, place, placeArea, angle, "deg"));
                continue;
              }
              report(rawOf("overhang", angle > options.overhangProblem ? "problem" : "hint", layer, place, placeArea, angle, "deg"));
            }
          }
        }

        // Thin walls: what an opening by half the minimum wall takes away.
        // Grown back a hair further, so the round steps of the offset leave no sliver along a straight side.
        const opened = keep(keep(section.offset(-erode, "Round", 2, 32)).offset(erode + 0.02, "Round", 2, 32));
        const thin = keep(section.subtract(opened));
        if (thin.area() >= options.minArea) {
          for (const place of thin.decompose().map(keep)) {
            const placeArea = place.area();
            if (placeArea < options.minArea) continue;
            const polygons = flatten(place);
            const perimeter = perimeterOf(polygons);
            const thickness = (2 * placeArea) / Math.max(1e-9, perimeter);
            const length = perimeter / 2 - thickness;
            if (thickness >= minimumWall || length < THIN_WALL_ASPECT * thickness || length < 1) continue;
            report(rawOf("thinWall", "hint", layer, place, placeArea, thickness, "mm"));
          }
        }

        // Small islands.
        if (islands.length) {
          for (const island of islands) {
            const islandArea = island.area();
            if (islandArea >= options.minArea && islandArea < options.smallIsland) report(rawOf("smallIsland", "hint", layer, island, islandArea, islandArea, "mm2"));
          }
        }
      }

      // Runs not carried on by this layer are done.
      for (let run = open.length - 1; run >= 0; run -= 1) {
        if (open[run].to < layer) {
          close(open[run]);
          open.splice(run, 1);
        }
      }
      previous = section;
      previousArea = area;
      // Free what this layer made, and the layer below, except this cut: the next layer compares with it.
      for (const value of new Set(created)) if (value !== section && value !== up) value.delete?.();
      created.length = 0;
      created.push(up, section);
    }
    closed.push(...open);
    hooks.progress?.(1);

    // Adhesion: the first layer of what stands on the plate, for its height.
    const first = result.layers[lowestLayer];
    if (first && !floats && first.areaMm2 > 0) {
      const height = top - lowest;
      const ratio = first.areaMm2 / Math.max(1e-9, height);
      if (first.areaMm2 < ADHESION_MIN_MM2 || ratio < ADHESION_MM2_PER_MM) {
        const outline = result.outlines[lowestLayer];
        const [cx, cy] = centroidOf(outline);
        add({
          kind: "adhesion", level: "hint", layerFrom: lowestLayer + 1, layerTo: lowestLayer + 1, zFrom: first.bottom, zTo: first.top, areaMm2: first.areaMm2,
          value: ratio, unit: "ratio", point: scenePoint(cx, cy, first.bottom), box: { min: [x0, first.bottom, -y1], max: [x1, first.top, -y0] },
          regions: [{ layer: first.number, z: (first.bottom + first.top) / 2, polygons: outline }], action: "layFlat",
        });
      }
    }

    for (const run of closed) {
      const zFrom = (run.from - 1) * layerHeight;
      const zTo = Math.min(top, run.to * layerHeight);
      if (run.kind === "smallIsland" && zTo - zFrom < SMALL_ISLAND_MIN_HEIGHT - 1e-6) continue;
      const weight = Math.max(1e-9, run.area);
      const point = scenePoint(run.sum[0] / weight, run.sum[1] / weight, run.sum[2] / weight);
      const action = run.kind === "overhang" ? "layFlat" : run.kind === "unsupported" || run.kind === "bridge" ? "supportRib" : undefined;
      add({
        kind: run.kind, level: run.level, layerFrom: run.from, layerTo: run.to, zFrom, zTo, areaMm2: run.area, value: run.value, unit: run.unit,
        point, box: sceneBox(run.rect, zFrom, zTo), regions: run.regions, ...(action ? { action } : {}),
      });
    }
    result.findings = sortFindings(findings);
    return result;
  } finally {
    for (const value of new Set(created)) {
      try {
        value.delete?.();
      } catch {
        // Freed already.
      }
    }
    result.millis = Date.now() - started;
  }
}

/** The bodies among `source` (visible, no holes or rulers), checked layer by layer; the design does not change. */
export async function checkLayers(source: readonly WorkplaneShape[], given: Partial<LayerCheckOptions> = {}, hooks: LayerCheckHooks = {}): Promise<LayerCheckResult> {
  const options = normalizeLayerCheckOptions(given);
  const shapes = clearanceSourceShapes(source);
  const empty: LayerCheckResult = {
    layerHeight: options.layerHeight, coarsened: false, layers: [], outlines: [], findings: [], box: null, minimumWallMm: layerCheckMinimumWall(options), unchecked: [], millis: 0, triangles: 0,
  };
  // Open meshes: a finding each, and the check goes on with what the kernel can close.
  const extra: Finding[] = printCheckOpenMeshes(shapes).map((mesh, index) => ({
    id: `open-${index + 1}`, kind: "openMesh", level: "problem", areaMm2: 0, value: mesh.openEdges + mesh.nonManifoldEdges, point: [
      (mesh.box.min[0] + mesh.box.max[0]) / 2, (mesh.box.min[1] + mesh.box.max[1]) / 2, (mesh.box.min[2] + mesh.box.max[2]) / 2,
    ], box: mesh.box, partIds: [mesh.id], partName: mesh.name,
  }));
  if (!shapes.length) return { ...empty, findings: extra };
  const runtime = await getManifoldRuntime();
  const created: ManifoldSolid[] = [];
  try {
    const solids: ManifoldSolid[] = [];
    const owners: LayerCheckOwner[] = [];
    const unchecked: Array<{ id: string; name: string }> = [];
    for (const shape of shapes) {
      let solid: ManifoldSolid | null = null;
      try {
        solid = shapeToManifoldSolid(runtime, shape, created);
      } catch {
        solid = null;
      }
      if (solid) created.push(solid);
      if (!solid || solid.status() !== "NoError" || solid.numTri() === 0) {
        unchecked.push({ id: shape.id, name: displayShapeName(shape) });
        continue;
      }
      const box = solid.boundingBox();
      owners.push({ id: shape.id, name: displayShapeName(shape), box: { min: [box.min[0], box.min[1], box.min[2]], max: [box.max[0], box.max[1], box.max[2]] } });
      solids.push(solid);
    }
    for (const missing of unchecked) {
      if (extra.some((finding) => finding.partIds.includes(missing.id))) continue;
      extra.push({ id: `unchecked-${missing.id}`, kind: "openMesh", level: "problem", areaMm2: 0, point: [0, 0, 0], box: { min: [0, 0, 0], max: [0, 0, 0] }, partIds: [missing.id], partName: missing.name });
    }
    if (!solids.length) return { ...empty, findings: extra, unchecked };
    let whole = solids.length === 1 ? solids[0] : runtime.Manifold.union(solids);
    if (whole !== solids[0]) created.push(whole);
    if (whole.status() !== "NoError") {
      whole = runtime.Manifold.compose(solids);
      created.push(whole);
    }
    const result = checkLayersOfSolid(runtime, whole, options, owners, hooks, extra);
    result.unchecked = unchecked;
    return result;
  } finally {
    for (const solid of new Set(created)) {
      try {
        disposeManifold(solid);
      } catch {
        // Freed already.
      }
    }
  }
}

/** The layer a height lies in, counted from 1 (the first for anything below the plate). */
export function layerAtHeight(result: Pick<LayerCheckResult, "layerHeight" | "layers">, height: number) {
  if (!result.layers.length) return 0;
  return Math.min(result.layers.length, Math.max(1, Math.floor(height / result.layerHeight) + 1));
}
