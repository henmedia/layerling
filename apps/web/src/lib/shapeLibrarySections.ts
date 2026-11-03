/**
 * The shape library in sections (#1170): each shape in one section, a search over the names and the words Layerling
 * knows for them in every language, and the shapes put in last. Plain functions, no React, so they can be tested on
 * their own; the panel is `ShapeLibraryList`.
 */
import { SHAPE_KEYWORDS } from "@/lib/commandKeywords";
import { searchCommands } from "@/lib/commandSearch";
import type { MessageKey } from "@/lib/messages.en";

export type ShapeLibrarySectionId =
  | "basic"
  | "vessels"
  | "holes"
  | "connections"
  | "mechanics"
  | "systems"
  | "lettering"
  | "decorative"
  | "helpers"
  | "other";

/**
 * The sections and their shapes, in the order they are listed. A shape belongs to one section only; words that would
 * put it into another one too (a tube is also a washer) are search words, not a second place. A shape of the library
 * that no section names lands in "other", at the end, so a new shape is never missing from the library.
 */
export const SHAPE_LIBRARY_SECTIONS: readonly { id: Exclude<ShapeLibrarySectionId, "other">; shapes: readonly string[] }[] = [
  { id: "basic", shapes: ["box", "roundedBox", "cylinder", "slot", "ellipse", "polygon", "wedge", "sphere", "cone", "curvedCone", "pyramid", "round-roof", "half-sphere", "paraboloid", "torus"] },
  { id: "vessels", shapes: ["loft", "tube", "bentTube", "vase"] },
  { id: "holes", shapes: ["counterbore", "countersink", "teardrop", "port"] },
  { id: "connections", shapes: ["thread", "finishingWasher", "hinge", "dovetail"] },
  { id: "mechanics", shapes: ["spring", "gear", "hirth"] },
  { id: "systems", shapes: ["gridfinity", "sbcBoard"] },
  { id: "lettering", shapes: ["text", "nameTag", "iconTag", "qrCode"] },
  { id: "decorative", shapes: ["star", "heart", "crescent", "knurl"] },
  { id: "helpers", shapes: ["ruler"] },
];

export const SHAPE_LIBRARY_SECTION_LABELS: Record<ShapeLibrarySectionId, MessageKey> = {
  basic: "library.section.basic",
  vessels: "library.section.vessels",
  holes: "library.section.holes",
  connections: "library.section.connections",
  mechanics: "library.section.mechanics",
  systems: "library.section.systems",
  lettering: "library.section.lettering",
  decorative: "library.section.decorative",
  helpers: "library.section.helpers",
  other: "library.section.other",
};

export type LibraryShape = { id: string; name: string };
export type ShapeLibrarySection<T extends LibraryShape> = { id: ShapeLibrarySectionId; shapes: T[] };

/** The shapes in their sections, in the sections' order; sections without a shape are left out. */
export function shapeLibrarySections<T extends LibraryShape>(shapes: readonly T[]): ShapeLibrarySection<T>[] {
  const byId = new Map(shapes.map((shape) => [shape.id, shape]));
  const placed = new Set<string>();
  const sections: ShapeLibrarySection<T>[] = [];
  for (const section of SHAPE_LIBRARY_SECTIONS) {
    const found = section.shapes.flatMap((id) => {
      const shape = byId.get(id);
      if (!shape || placed.has(id)) return [];
      placed.add(id);
      return [shape];
    });
    if (found.length > 0) sections.push({ id: section.id, shapes: found });
  }
  const rest = shapes.filter((shape) => !placed.has(shape.id));
  if (rest.length > 0) sections.push({ id: "other", shapes: rest });
  return sections;
}

/** A section while searching: the shapes that match, and how many it holds in all. */
export type ShapeLibraryMatch<T extends LibraryShape> = ShapeLibrarySection<T> & { total: number };

/**
 * The sections with the shapes that match the search, in the library's order; sections without a match are left out.
 * A shape is found by its name in the current language (`label`), its English name, its id and the words of the command
 * search (Ctrl+K: "USB" finds the port opening, "pipe" the cylinder and the tube). Not by the name of its section: "Rohr"
 * would bring the vase along with the tubes, only because its German section is called "Gefäße, Rohre & Übergänge".
 */
export function searchShapeLibrary<T extends LibraryShape>(
  sections: readonly ShapeLibrarySection<T>[],
  query: string,
  label: (shape: T) => string,
): ShapeLibraryMatch<T>[] {
  const entries = sections.flatMap((section) => section.shapes.map((shape) => ({
    shape,
    label: label(shape),
    group: "",
    keywords: [shape.id, shape.name, ...(SHAPE_KEYWORDS[shape.id] ?? [])],
  })));
  const found = new Set(searchCommands(entries, query).map((entry) => entry.shape.id));
  return sections
    .map((section) => ({ id: section.id, shapes: section.shapes.filter((shape) => found.has(shape.id)), total: section.shapes.length }))
    .filter((section) => section.shapes.length > 0);
}

/** How many shapes "Recently used" shows: one row of the library. */
export const RECENT_SHAPE_LIMIT = 4;
export const RECENT_SHAPES_STORAGE_KEY = "layerling.editor.recentShapes";
/** Sent on the window when a shape was put in, so an open (pinned) library shows it at once. */
export const RECENT_SHAPES_EVENT = "layerling:recent-shapes";

/** The recently used shapes after `id` was put in: newest first, each once, at most RECENT_SHAPE_LIMIT. */
export function rememberRecentShape(recent: readonly string[], id: string, limit = RECENT_SHAPE_LIMIT): string[] {
  return [id, ...recent.filter((entry) => entry !== id)].slice(0, limit);
}

/** The recently used shapes kept in the browser; none when there are none or the storage is blocked. */
export function readRecentShapes(): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_SHAPES_STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string").slice(0, RECENT_SHAPE_LIMIT) : [];
  } catch {
    return [];
  }
}

/** Keeps a shape put in from the library as the most recent one, and tells an open library. */
export function storeRecentShape(id: string) {
  if (typeof window === "undefined") return;
  const next = rememberRecentShape(readRecentShapes(), id);
  try {
    window.localStorage.setItem(RECENT_SHAPES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Blocked storage: the open library still shows it until it closes.
  }
  window.dispatchEvent(new CustomEvent<string[]>(RECENT_SHAPES_EVENT, { detail: next }));
}

export const CLOSED_SECTIONS_STORAGE_KEY = "layerling.editor.shapeSectionsClosed";

/** The sections folded by hand; all are open the first time. */
export function readClosedSections(): ShapeLibrarySectionId[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CLOSED_SECTIONS_STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(stored) ? stored.filter((id): id is ShapeLibrarySectionId => typeof id === "string" && id in SHAPE_LIBRARY_SECTION_LABELS) : [];
  } catch {
    return [];
  }
}

export function storeClosedSections(closed: readonly ShapeLibrarySectionId[]) {
  try {
    window.localStorage.setItem(CLOSED_SECTIONS_STORAGE_KEY, JSON.stringify(closed));
  } catch {
    // Blocked storage: the sections stay as they are until the library closes.
  }
}
