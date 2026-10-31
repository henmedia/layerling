import type { WorkplaneShape } from "@/types/layerling";

/** The words a shape is found by: its shown name and its kind label, both in the interface language. */
export type ObjectListLabels = (shape: WorkplaneShape) => string[];

/** The search text as it is matched: trimmed and lower-case; empty means no search. */
export function normalizeObjectListQuery(text: string): string {
  return text.trim().toLowerCase();
}

/** True when the shape itself matches - its labels or its internal kind contain the query. */
export function shapeMatchesSearch(shape: WorkplaneShape, query: string, labels: ObjectListLabels): boolean {
  if (!query) return true;
  return [...labels(shape), shape.kind].some((word) => word.toLowerCase().includes(query));
}

/** True when a part at any depth inside the group matches; never for an empty query. */
export function hasMatchingPart(shape: WorkplaneShape, query: string, labels: ObjectListLabels): boolean {
  if (!query) return false;
  return (shape.groupedShapes ?? []).some(
    (child) => shapeMatchesSearch(child, query, labels) || hasMatchingPart(child, query, labels),
  );
}

/** Whether a shape stays in the list: it matches, or it is a group with a match somewhere inside. */
export function showInObjectList(shape: WorkplaneShape, query: string, labels: ObjectListLabels): boolean {
  return shapeMatchesSearch(shape, query, labels) || hasMatchingPart(shape, query, labels);
}

/** "added" is the design's own order, the newest last; "name" sorts the named shapes A to Z (#1046). */
export type ObjectListOrder = "added" | "name";

export function isObjectListOrder(value: unknown): value is ObjectListOrder {
  return value === "added" || value === "name";
}

/**
 * The shapes in the order the list shows them. With "name" the shapes somebody named come first, A to Z with
 * numbers counted as numbers ("Part 2" before "Part 10"), and the ones that still carry the editor's name stay
 * below in the order they were added, the newest last. Equal names keep their order. Only the list is sorted,
 * never the design.
 */
export function sortObjectList<T>(
  shapes: readonly T[],
  order: ObjectListOrder,
  hasOwnName: (shape: T) => boolean,
  name: (shape: T) => string,
  locale?: string,
): T[] {
  if (order === "added") return [...shapes];
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const named = shapes.filter(hasOwnName);
  const unnamed = shapes.filter((shape) => !hasOwnName(shape));
  return [...named.sort((a, b) => collator.compare(name(a), name(b))), ...unnamed];
}
