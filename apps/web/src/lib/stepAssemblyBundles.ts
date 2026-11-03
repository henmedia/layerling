import type { WorkplaneShape } from "@/types/layerling";
import type { StepAssemblyLevel } from "@/lib/stepAssemblyImport";
import { groupedShape } from "@/lib/editorBooleans";
import { canonicalizeShape } from "@/lib/workplaneShapes";

/**
 * The tree of a STEP assembly as bundles (#830): each assembly of the file becomes a bundle under its name, an
 * assembly inside it a bundle inside that one, so a whole assembly hides, shows or moves at once and its parts stay
 * what they are. `tree` holds, for each part, the assemblies it sits in from the file's root down
 * (importedShapesFromStepAssembly in lib/stepAssemblyImport).
 *
 * The assembly that holds the whole file is left out, its name is the file's own; an assembly of one part is that part.
 */
export function bundledStepAssembly(shapes: WorkplaneShape[], tree: StepAssemblyLevel[][]): WorkplaneShape[] {
  const items = shapes.map((shape, index) => ({ shape, path: tree[index] ?? [] }));
  let depth = 0;
  while (items.length > 0 && items.every((item) => item.path.length > depth && item.path[depth].key === items[0].path[depth].key)) depth += 1;
  return bundleLevel(items, depth);
}

function bundleLevel(items: Array<{ shape: WorkplaneShape; path: StepAssemblyLevel[] }>, depth: number): WorkplaneShape[] {
  // In the file's order: a part where it stands, an assembly where its first part stands.
  const placed: Array<WorkplaneShape | { level: StepAssemblyLevel; members: typeof items }> = [];
  const byKey = new Map<number, { level: StepAssemblyLevel; members: typeof items }>();
  for (const item of items) {
    const level = item.path[depth];
    if (!level) {
      placed.push(item.shape);
      continue;
    }
    let assembly = byKey.get(level.key);
    if (!assembly) {
      assembly = { level, members: [] };
      byKey.set(level.key, assembly);
      placed.push(assembly);
    }
    assembly.members.push(item);
  }
  return placed.flatMap((entry) => {
    if (!("level" in entry)) return [entry];
    const inside = bundleLevel(entry.members, depth + 1);
    const group = inside.length > 1 ? groupedShape(inside) : null;
    if (!group) return inside;
    return [canonicalizeShape({ ...group, name: entry.level.name || "Bundle", groupOperation: "bundle" })];
  });
}
