import { searchCommands } from "@/lib/commandSearch";

/**
 * The custom shapes whose name matches a search in the shapes window (#1537), best match first, with the same rules as
 * the library's own search and the command search: every word of the query must be found, in any order, accents aside.
 */
export function searchCustomShapes<T extends { name: string }>(shapes: readonly T[], query: string): T[] {
  return searchCommands(shapes.map((shape) => ({ shape, label: shape.name, group: "", keywords: [] as string[] })), query).map((entry) => entry.shape);
}

/** How the custom shapes of a list are put in order: as saved (oldest first, as the store gives them) or by name. */
export type CustomShapeOrder = "saved" | "name";

export function orderCustomShapes<T extends { name: string }>(shapes: readonly T[], order: CustomShapeOrder): T[] {
  if (order === "saved") return [...shapes];
  return [...shapes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}
