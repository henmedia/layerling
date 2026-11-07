import { disposeManifold, exportBodiesWithLooseHoles, manifoldFromMeshData, restoreGroupedChildren } from "@/lib/editorBooleans";
import { getManifoldRuntime, type ManifoldSolid } from "@/lib/editorMeshCore";
import { createLocalId } from "@/lib/localIds";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { stencilBridges } from "@/lib/stencilBridges";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";
import type { CrossSection } from "manifold-3d";

/*
 * "Stencil bridges" for a printed stencil (Discussion #1438): a plate with text cut through it loses the middle of
 * the o, a and b. Seen from above, as the SVG export sees it, the parts that would fall out are the islands inside a
 * hole; the bridges are the ones the DXF and SVG export add for a laser (stencilBridges.ts), here made into ordinary
 * boxes, as high as set and flush with the bottom, the top or in the middle, and grouped with the plate. A box can be
 * moved, deleted or added by hand like any other; running the tool on the group again puts new bridges in place of
 * the ones it made. A text engraved but not cut through is whole seen from above, so it gets no bridge.
 */

export type StencilBridgePosition = "bottom" | "middle" | "top";

export type StencilBridgeToolSettings = {
  /** The bridge's width in mm. */
  width: number;
  /** Bridges per part, 1 to 4. */
  count: number;
  /** The bridge's height in mm; null: as high as the body. */
  height: number | null;
  /** Where a bridge lower than the body sits. */
  position: StencilBridgePosition;
};

export const STENCIL_BRIDGE_POSITIONS: readonly StencilBridgePosition[] = ["bottom", "middle", "top"];
export const STENCIL_TOOL_MIN_WIDTH = 0.5;
export const STENCIL_TOOL_MAX_WIDTH = 5;
export const STENCIL_TOOL_MAX_COUNT = 4;
export const STENCIL_TOOL_MIN_HEIGHT = 0.2;
export const DEFAULT_STENCIL_BRIDGE_TOOL: StencilBridgeToolSettings = { width: 1.5, count: 2, height: null, position: "bottom" };

const SETTINGS_KEY = "layerling.stencilBridgeTool";

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function normalizeStencilBridgeTool(raw: Partial<StencilBridgeToolSettings> | null | undefined): StencilBridgeToolSettings {
  const width = finite(raw?.width) ? raw.width : DEFAULT_STENCIL_BRIDGE_TOOL.width;
  const count = finite(raw?.count) ? Math.round(raw.count) : DEFAULT_STENCIL_BRIDGE_TOOL.count;
  const height = finite(raw?.height) && raw.height > 0 ? Math.max(STENCIL_TOOL_MIN_HEIGHT, raw.height) : null;
  const position = STENCIL_BRIDGE_POSITIONS.includes(raw?.position as StencilBridgePosition) ? raw!.position! : DEFAULT_STENCIL_BRIDGE_TOOL.position;
  return {
    width: Math.min(STENCIL_TOOL_MAX_WIDTH, Math.max(STENCIL_TOOL_MIN_WIDTH, width)),
    count: Math.min(STENCIL_TOOL_MAX_COUNT, Math.max(1, count)),
    height,
    position,
  };
}

/** The settings kept in this browser; the height is the body's own each time. */
export function readStencilBridgeToolSettings(): StencilBridgeToolSettings {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null");
    if (stored && typeof stored === "object") return normalizeStencilBridgeTool({ ...(stored as Partial<StencilBridgeToolSettings>), height: null });
  } catch {
    // Blocked or broken storage: the defaults.
  }
  return { ...DEFAULT_STENCIL_BRIDGE_TOOL };
}

export function writeStencilBridgeToolSettings(settings: StencilBridgeToolSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, height: null }));
  } catch {
    // Blocked storage: the settings hold until the page is closed.
  }
}

export function isStencilBridge(shape: Pick<WorkplaneShape, "stencilBridge">) {
  return shape.stencilBridge === true;
}

/**
 * What the bridges are made for: the selected bodies, or, for a group the tool made before, its parts without the
 * bridges it put in, so new ones take their place. `replaced` counts the bridges left out.
 */
export function stencilBridgeBase(selection: readonly WorkplaneShape[]): { base: WorkplaneShape[]; replaced: number } {
  if (selection.length === 1) {
    const [shape] = selection;
    const plainGroup = (shape.groupOperation === undefined || shape.groupOperation === "group")
      && !shape.hole
      && !shape.edgeTreatments?.length
      && !shape.cadBrep
      && !shape.surfaceTexture
      && !shape.cylinderWrap
      && !shape.vase;
    if (plainGroup && shape.groupedShapes?.some(isStencilBridge)) {
      const parts = restoreGroupedChildren(shape);
      const rest = parts.filter((part) => !isStencilBridge(part));
      if (rest.length > 0) return { base: rest, replaced: parts.length - rest.length };
    }
  }
  return { base: [...selection], replaced: 0 };
}

/** How high a bridge stands and how high it is, within the body's own height. */
export function stencilBridgeLevels(minY: number, maxY: number, settings: Pick<StencilBridgeToolSettings, "height" | "position">) {
  const full = Math.max(STENCIL_TOOL_MIN_HEIGHT, maxY - minY);
  const height = settings.height === null ? full : Math.min(full, Math.max(STENCIL_TOOL_MIN_HEIGHT, settings.height));
  const elevation = settings.position === "top" ? maxY - height : settings.position === "middle" ? minY + (full - height) / 2 : minY;
  return { elevation, height };
}

export type StencilBridgeRect = ReadonlyArray<readonly [number, number]>;

/**
 * The bridges as boxes: each rectangle from stencilBridges, in the view from above (x to the right, z to the front),
 * made a box of its length and width, turned about the vertical axis to lie along it.
 */
export function stencilBridgeBoxes(
  rects: readonly StencilBridgeRect[],
  levels: { elevation: number; height: number },
  options: { color: string; name: string; idPrefix?: string },
): WorkplaneShape[] {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "box");
  if (!asset) return [];
  return rects.flatMap((rect, index) => {
    if (rect.length !== 4) return [];
    const [a, b, , d] = rect;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const width = Math.hypot(d[0] - a[0], d[1] - a[1]);
    if (!(length > 1e-6) || !(width > 1e-6)) return [];
    const x = rect.reduce((sum, point) => sum + point[0], 0) / 4;
    const z = rect.reduce((sum, point) => sum + point[1], 0) / 4;
    // A turn about the vertical axis takes the box's own x axis to (cos, -sin) in x and z.
    const rotation = (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI;
    const made = makeShapeFromAsset({ ...asset, name: `${options.name} ${index + 1}` }, { x, z, elevation: levels.elevation }, { width: length, depth: width, height: levels.height });
    return [canonicalizeShape({
      ...made,
      id: options.idPrefix ? `${options.idPrefix}-${index}` : createLocalId("stencil-bridge"),
      name: `${options.name} ${index + 1}`,
      color: options.color,
      x,
      z,
      elevation: levels.elevation,
      width: length,
      depth: width,
      height: levels.height,
      size: Math.max(length, width),
      rotation: ((rotation % 360) + 360) % 360,
      locked: false,
      hidden: false,
      stencilBridge: true,
    } as WorkplaneShape)];
  });
}

export type StencilBridgePlan =
  | { ok: true; rects: StencilBridgeRect[]; parts: number; unheld: number; minY: number; maxY: number }
  | { ok: false; reason: "noBody" | "failed" };

/**
 * Where the bridges go: the bodies seen from above, every hole left ungrouped taken out as the export takes it, and
 * stencilBridges on that outline - the same bridges the DXF and SVG export add.
 */
export async function stencilBridgePlan(shapes: readonly WorkplaneShape[], settings: Pick<StencilBridgeToolSettings, "width" | "count">): Promise<StencilBridgePlan> {
  const { solids, meshes } = await exportBodiesWithLooseHoles(shapes);
  if (solids.length === 0) return { ok: false, reason: "noBody" };
  let minY = Infinity;
  let maxY = -Infinity;
  for (const mesh of meshes) {
    for (const vertex of mesh.vertices) {
      if (vertex[1] < minY) minY = vertex[1];
      if (vertex[1] > maxY) maxY = vertex[1];
    }
  }
  if (!(maxY > minY)) return { ok: false, reason: "noBody" };
  const runtime = await getManifoldRuntime();
  const created: unknown[] = [];
  try {
    const sections: CrossSection[] = [];
    for (const mesh of meshes) {
      let solid: ManifoldSolid;
      try {
        solid = manifoldFromMeshData(runtime, mesh);
      } catch {
        return { ok: false, reason: "failed" };
      }
      created.push(solid);
      if (solid.status() !== "NoError" || solid.numTri() < 1) return { ok: false, reason: "failed" };
      // Seen from above, as the SVG export turns it: x stays, z becomes the second coordinate.
      const topView = solid.rotate([-90, 0, 0]);
      if (topView !== solid) created.push(topView);
      const projection = topView.project();
      created.push(projection);
      sections.push(projection);
    }
    const joined = sections.length === 1 ? sections[0] : runtime.CrossSection.union(sections);
    if (joined !== sections[0]) created.push(joined);
    const loops = joined.toPolygons().map((polygon) => polygon.map(([x, y]) => [x, y] as const));
    const { rects, unheld, parts } = stencilBridges(loops, { width: settings.width, count: settings.count });
    return { ok: true, rects, parts, unheld, minY, maxY };
  } finally {
    [...new Set(created)].reverse().forEach(disposeManifold);
  }
}
