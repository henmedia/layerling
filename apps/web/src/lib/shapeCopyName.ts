import { duplicateName, type DuplicateNamePatterns } from "@/lib/duplicateName";
import { t } from "@/lib/i18n";
import { hasOwnShapeName } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";

/** The two patterns of a copy's name, in the language of the interface. */
export function copyNamePatterns(): DuplicateNamePatterns {
  return { copy: t("dashboard.copyOf"), numbered: t("dashboard.copyOfNumbered") };
}

/** Every name in the design, groups and their parts included: the names a copy must not take. */
export function shapeNamesIn(shapes: readonly WorkplaneShape[]): string[] {
  return shapes.flatMap((shape) => [shape.name ?? "", ...shapeNamesIn(shape.groupedShapes ?? [])]);
}

/**
 * The copy of a shape with a name somebody gave it ("Holder") is called "Holder (copy)", then "Holder (copy 2)"
 * (#1213), the way copies of designs are named. A shape that only has the name the editor handed out ("Box")
 * keeps it. `taken` gets the new name added, so several copies in one go all differ.
 *
 * With `onlyIfTaken` a copy keeps its name while nobody else in the design carries it, which is what pasting
 * after Cut wants: the original is gone, so the name is free again.
 */
export function withCopyName(
  copy: WorkplaneShape,
  taken: string[],
  patterns: DuplicateNamePatterns,
  onlyIfTaken = false,
): WorkplaneShape {
  if (!hasOwnShapeName(copy)) return copy;
  const name = copy.name.trim();
  if (onlyIfTaken && !taken.some((other) => other.trim().toLowerCase() === name.toLowerCase())) {
    taken.push(name);
    return copy;
  }
  const named = duplicateName(name, taken, patterns);
  taken.push(named);
  return { ...copy, name: named };
}
