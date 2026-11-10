import type { PaletteCommand } from "@/components/workplane/CommandPalette";

/** What the command search needs of a saved custom shape. */
export type CustomShapeCommandSource = { id: string; name: string; thumbnail: string };

/**
 * The shapes a person saved (Custom shapes), as entries of the command search (Ctrl+K): typing a part of the name
 * finds the shape, Enter or a click puts it into the design like in the shapes panel. They are listed only once
 * something is typed, like the bodies of a design - there can be dozens - and are not remembered as recently used,
 * since the id belongs to the saved shape.
 */
export function customShapeCommands(
  shapes: readonly CustomShapeCommandSource[],
  group: string,
  labelFor: (name: string) => string,
  insert: (id: string) => void,
): PaletteCommand[] {
  return shapes.map((shape) => ({
    id: `custom-shape-${shape.id}`,
    label: labelFor(shape.name),
    group,
    keywords: [shape.name, "custom", "eigene", "mine", "own"],
    image: shape.thumbnail || undefined,
    enabled: true,
    searchOnly: true,
    transient: true,
    run: () => insert(shape.id),
  }));
}
