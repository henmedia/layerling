/**
 * The measurements of the tape measure a design keeps (#881): the points and the lines between them, and whether they are
 * shown. Kept like the framing square - per design, beside it in the browser and in a `.lyl` file -, never in the undo
 * history. A point fixed to a body stays on that body (by the body's id and a place measured against its box), so the
 * measurement follows the body when it moves or is resized; a point in free space keeps its place.
 */
export type SavedTapeAttachment = {
  shapeId: string;
  normalized: [number, number, number];
  kind?: "vertex" | "edge" | "surface";
  topologyKey?: string;
};

export type SavedTapeEdge = {
  key: string;
  shapeId: string;
  normalizedPoints: Array<[number, number, number]>;
  topologyKey?: string;
};

export type SavedTapePoint = {
  id: string;
  x: number;
  y: number;
  z: number;
  attachment?: SavedTapeAttachment;
};

export type SavedTapeSegment = {
  id: string;
  startId: string;
  endId: string;
  edge?: SavedTapeEdge;
};

export type SavedTape = {
  points: SavedTapePoint[];
  segments: SavedTapeSegment[];
  /** The measurements are kept but not shown. */
  hidden?: boolean;
};

const TAPE_STORAGE_PREFIX = "layerling.tapeMeasurements.";
const MAX_POINTS = 2000;
const KINDS = ["vertex", "edge", "surface"] as const;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function triple(value: unknown): [number, number, number] | null {
  return Array.isArray(value) && value.length === 3 && value.every(finite) ? [value[0], value[1], value[2]] : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 200 ? value : null;
}

function normalizeAttachment(value: unknown): SavedTapeAttachment | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entry = value as Record<string, unknown>;
  const shapeId = text(entry.shapeId);
  const normalized = triple(entry.normalized);
  if (!shapeId || !normalized) return undefined;
  const kind = KINDS.find((candidate) => candidate === entry.kind);
  const topologyKey = text(entry.topologyKey);
  return { shapeId, normalized, ...(kind ? { kind } : {}), ...(topologyKey ? { topologyKey } : {}) };
}

function normalizeEdge(value: unknown): SavedTapeEdge | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entry = value as Record<string, unknown>;
  const key = text(entry.key);
  const shapeId = text(entry.shapeId);
  if (!key || !shapeId || !Array.isArray(entry.normalizedPoints) || entry.normalizedPoints.length < 2 || entry.normalizedPoints.length > 4000) return undefined;
  const normalizedPoints = entry.normalizedPoints.map(triple);
  if (normalizedPoints.some((point) => !point)) return undefined;
  const topologyKey = text(entry.topologyKey);
  return { key, shapeId, normalizedPoints: normalizedPoints as Array<[number, number, number]>, ...(topologyKey ? { topologyKey } : {}) };
}

function normalizePoint(value: unknown): SavedTapePoint | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const id = text(entry.id);
  if (!id || !finite(entry.x) || !finite(entry.y) || !finite(entry.z)) return null;
  const attachment = normalizeAttachment(entry.attachment);
  return { id, x: entry.x, y: entry.y, z: entry.z, ...(attachment ? { attachment } : {}) };
}

/** The measurements read from storage or a file, or null when there are none. */
export function normalizeSavedTape(value: unknown): SavedTape | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (!Array.isArray(entry.points) || !Array.isArray(entry.segments)) return null;
  const points = new Map<string, SavedTapePoint>();
  for (const candidate of entry.points.slice(0, MAX_POINTS)) {
    const point = normalizePoint(candidate);
    if (point && !points.has(point.id)) points.set(point.id, point);
  }
  const segments: SavedTapeSegment[] = [];
  const seen = new Set<string>();
  for (const candidate of entry.segments.slice(0, MAX_POINTS)) {
    if (!candidate || typeof candidate !== "object") continue;
    const segment = candidate as Record<string, unknown>;
    const id = text(segment.id);
    const startId = text(segment.startId);
    const endId = text(segment.endId);
    if (!id || !startId || !endId || seen.has(id) || !points.has(startId) || !points.has(endId)) continue;
    seen.add(id);
    const edge = normalizeEdge(segment.edge);
    segments.push({ id, startId, endId, ...(edge ? { edge } : {}) });
  }
  if (!segments.length) return null;
  // A point no measurement uses is a measurement that was never finished.
  const used = new Set(segments.flatMap((segment) => [segment.startId, segment.endId]));
  return {
    points: [...points.values()].filter((point) => used.has(point.id)),
    segments,
    ...(entry.hidden === true ? { hidden: true } : {}),
  };
}

/** What is kept of the tape measure's model: its points and lines, without what belongs to a measurement under way. */
export function savedTape(model: { points: readonly SavedTapePoint[]; segments: readonly SavedTapeSegment[]; hidden?: boolean }): SavedTape | null {
  return normalizeSavedTape({ points: model.points, segments: model.segments, hidden: model.hidden });
}

/**
 * The highest number in the ids of these points and lines (`tape-point-7`, `tape-segment-12`), so new ones count on
 * from there: measurements come back from the design or the editor's memory with their ids, and a counter that started
 * at 0 again gave a new point the id of a kept one.
 */
export function highestTapeIdNumber(model: { points: readonly { id: string }[]; segments: readonly { id: string }[] }) {
  return [...model.points, ...model.segments].reduce((highest, entry) => {
    const number = Number(/-(\d+)$/.exec(entry.id)?.[1]);
    return Number.isSafeInteger(number) ? Math.max(highest, number) : highest;
  }, 0);
}

export function readTape(projectId: string | null | undefined): SavedTape | null {
  if (!projectId) return null;
  try {
    const stored = window.localStorage.getItem(TAPE_STORAGE_PREFIX + projectId);
    return stored ? normalizeSavedTape(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

export function writeTape(projectId: string | null | undefined, tape: SavedTape | null) {
  if (!projectId) return;
  try {
    const kept = normalizeSavedTape(tape);
    if (kept) window.localStorage.setItem(TAPE_STORAGE_PREFIX + projectId, JSON.stringify(kept));
    else window.localStorage.removeItem(TAPE_STORAGE_PREFIX + projectId);
  } catch {
    // Without storage the measurements last until the design is left.
  }
}
