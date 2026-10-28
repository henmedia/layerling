import type { WorkplaneShape } from "@/types/layerling";
import { loadBrepWithOcct, occtKernel } from "@/lib/brepKernel";
import { normalizeHexColor, placeColoredParts, type ColoredPart } from "@/lib/coloredImport";
import { stepBodyColors } from "@/lib/stepColors";
import { importedShapeFromTriangleSoup } from "@/lib/stlImport";

/**
 * A STEP file that holds several solids, as an assembly from another CAD program does (#830): one body per solid, each
 * under the name the file gives it, all in their place to one another. The kernel reads the file into an XCAF document
 * (names, the tree of groups, the placement of each instance); a plain read, as `importedShapeFromStep` does, welds
 * everything into one body and leaves the names behind.
 */

/** More parts than this and the editor's list and the work on each part would drown; the file then comes in as one body. */
export const MAX_STEP_ASSEMBLY_PARTS = 400;

type Matrix = number[];

/** CAD Z-up to layerling Y-up: a turn by -90 degrees about X, the inverse of the exporter's +90. */
const Z_UP_TO_Y_UP: Matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];

/** `a` after `b`, both 3x4 row-major affine matrices. */
function multiply(a: Matrix, b: Matrix): Matrix {
  const result: Matrix = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const carried = column === 3 ? a[row * 4 + 3] : 0;
      result.push(a[row * 4] * b[column] + a[row * 4 + 1] * b[4 + column] + a[row * 4 + 2] * b[8 + column] + carried);
    }
  }
  return result;
}

function translation(x: number, y: number, z: number): Matrix {
  return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z];
}

function hexColor([red, green, blue]: [number, number, number]) {
  const channel = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0");
  return normalizeHexColor(`#${channel(red)}${channel(green)}${channel(blue)}`);
}

export type StepAssemblyResult = {
  shapes: WorkplaneShape[];
  /** The groups of the file's tree, by the name of the part's first group. */
  groups: number;
};

/**
 * The parts of a STEP file, or null when it holds only one (or too many, or the kernel cannot read its structure) and the
 * file should come in as one body as before.
 */
export async function importedShapesFromStepAssembly(fileName: string, buffer: ArrayBuffer): Promise<StepAssemblyResult | null> {
  await loadBrepWithOcct();
  const kernel = occtKernel();
  if (!kernel || typeof kernel.importXCAFFromSTEP !== "function") return null;
  const text = new TextDecoder().decode(buffer);
  const doc = kernel.importXCAFFromSTEP(text);
  const bodyColors = stepBodyColors(text);
  type Leaf = { name: string; group: string; shape: NonNullable<ReturnType<typeof doc.getLabelInfo>["shapeHandle"]>; matrix: Matrix; color?: string };
  const leaves: Leaf[] = [];
  const handles: Array<Leaf["shape"]> = [];
  try {
    const walk = (label: ReturnType<typeof doc.getRoots>[number], parent: Matrix, group: string) => {
      if (leaves.length > MAX_STEP_ASSEMBLY_PARTS) return;
      const info = doc.getLabelInfo(label);
      if (info.shapeHandle) handles.push(info.shapeHandle);
      const referred = info.isComponent ? doc.getReferredLabel(label) : null;
      const target = referred ?? label;
      const targetInfo = referred ? doc.getLabelInfo(target) : info;
      if (referred && targetInfo.shapeHandle) handles.push(targetInfo.shapeHandle);
      const matrix = info.isComponent ? multiply(parent, doc.getLocation(label)) : parent;
      const name = (info.name || targetInfo.name || "").trim();
      const children = doc.getChildren(target);
      if (children.length) {
        children.forEach((child) => walk(child, matrix, name || group));
        return;
      }
      if (!targetInfo.shapeHandle) return;
      const color = info.hasColor ? hexColor(info.color) : targetInfo.hasColor ? hexColor(targetInfo.color) : undefined;
      const pieces = bodiesOf(targetInfo.shapeHandle);
      // The colours the file gives the bodies themselves, which the document leaves out; one per body, in their order.
      const colors = bodyColors.get(targetInfo.name || info.name);
      const bodyColor = (index: number) =>
        colors?.length === pieces.length ? colors[index] : colors && new Set(colors).size === 1 ? colors[0] : undefined;
      pieces.forEach((shape, index) =>
        leaves.push({ name: pieces.length > 1 && name ? `${name} ${index + 1}` : name, group, shape, matrix, color: color ?? bodyColor(index) }));
    };
    // One entry of the tree can hold several bodies: several solids, or several shells where the file writes its bodies
    // as surface models (#830: 85 entries holding 390 bodies, the screws of a part under one entry). Each becomes a part.
    const bodiesOf = (shape: Leaf["shape"]): Array<Leaf["shape"]> => {
      const solids = kernel.getSubShapes(shape, "solid");
      handles.push(...solids);
      if (solids.length > 1) return solids;
      if (solids.length === 0) {
        const shells = kernel.getSubShapes(shape, "shell");
        handles.push(...shells);
        if (shells.length > 1) return shells;
      }
      return [shape];
    };
    doc.getRoots().forEach((root) => walk(root, Z_UP_TO_Y_UP, ""));
    if (leaves.length < 2 || leaves.length > MAX_STEP_ASSEMBLY_PARTS) return null;

    const parts: ColoredPart[] = [];
    const steps: string[] = [];
    for (const leaf of leaves) {
      const placed = kernel.located(leaf.shape, leaf.matrix);
      handles.push(placed);
      const mesh = kernel.tessellate(placed);
      if (mesh.triangleCount === 0) continue;
      const positions: number[] = [];
      const normals: number[] = [];
      for (let index = 0; index < mesh.indices.length; index += 1) {
        const vertex = mesh.indices[index] * 3;
        positions.push(mesh.positions[vertex], mesh.positions[vertex + 1], mesh.positions[vertex + 2]);
        normals.push(mesh.normals[vertex], mesh.normals[vertex + 1], mesh.normals[vertex + 2]);
      }
      // The exact body goes with the part, recentred as its mesh is (x and z centred, the bottom at y = 0), so a STEP
      // export hands the part back exactly.
      let minX = Infinity, maxX = -Infinity, minY = Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let index = 0; index < positions.length; index += 3) {
        minX = Math.min(minX, positions[index]); maxX = Math.max(maxX, positions[index]);
        minY = Math.min(minY, positions[index + 1]);
        minZ = Math.min(minZ, positions[index + 2]); maxZ = Math.max(maxZ, positions[index + 2]);
      }
      const centred = kernel.located(placed, translation(-(minX + maxX) / 2, -minY, -(minZ + maxZ) / 2));
      handles.push(centred);
      steps.push(kernel.exportStep(centred));
      parts.push({ label: leaf.name || undefined, color: leaf.color, positions, normals });
    }
    if (parts.length < 2) return null;
    const baseName = fileName.replace(/\.[^.]+$/, "") || "STEP";
    const shapes = placeColoredParts(baseName, parts, (positions, normals) => importedShapeFromTriangleSoup(fileName, positions, normals, "step"))
      .map((shape, index): WorkplaneShape => ({
        ...shape,
        // The name the file gives the part; a part without one is numbered after the file.
        name: parts[index].label ?? `${baseName} ${index + 1}`,
        importedMesh: { ...shape.importedMesh!, brepStep: steps[index] },
      }));
    return { shapes, groups: new Set(leaves.map((leaf) => leaf.group)).size };
  } finally {
    handles.forEach((handle) => {
      try { kernel.release(handle); } catch { /* already released with its document */ }
    });
    doc.close();
  }
}
