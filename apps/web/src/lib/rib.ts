import * as THREE from "three";
import { addPrismAlongX, arcPoints, IndexedMesh, type ProfilePoint } from "@/lib/enclosureMesh";

/*
 * The rib: a thin wall that stiffens a floor or a wall, or a gusset that braces a wall against the floor. Straight,
 * it runs along x (width its length), as high as the shape and as thick as its depth; its top flat, round (a half
 * circle across it) or chamfered (45 degrees at both edges, a third of the thickness). As a gusset it is a right
 * triangle seen from the side: the upright leg against a wall at the back of x, the foot along the floor, both ends
 * cut off short so they print and do not end in a feather; width the foot, height the leg, depth the thickness.
 *
 * A rib is printed best about as thick as the wall it stiffens or a little thinner, a few times as high as thick, a
 * multiple of the line width (two lines of 0.4 mm: 0.8 mm; four: 1.6 mm). Several in a row come from Pattern.
 */

export type RibStyle = "straight" | "gusset";
export type RibTop = "flat" | "round" | "chamfer";

export function normalizeRibStyle(value: unknown): RibStyle {
  return value === "gusset" ? "gusset" : "straight";
}

export function normalizeRibTop(value: unknown): RibTop {
  return value === "round" || value === "chamfer" ? value : "flat";
}

export type RibFields = {
  width: number;
  depth?: number;
  height: number;
  ribStyle?: RibStyle;
  ribTop?: RibTop;
};

/** How short a gusset's ends are cut: at most 0.6 mm, never more than a tenth of its legs. */
function gussetEnd(width: number, height: number) {
  return Math.min(0.6, width / 10, height / 10);
}

/** The straight rib's cross-section (u = z, v = y), counter-clockwise from the floor's back corner. */
export function ribProfile(thickness: number, height: number, top: RibTop): ProfilePoint[] {
  const half = thickness / 2;
  if (top === "round" && height > half + 0.1) {
    return [{ u: -half, v: 0 }, { u: half, v: 0 }, ...arcPoints({ u: 0, v: height - half }, half, 0, Math.PI, 12)];
  }
  if (top === "chamfer" && height > thickness / 3 + 0.1) {
    const c = thickness / 3;
    return [{ u: -half, v: 0 }, { u: half, v: 0 }, { u: half, v: height - c }, { u: half - c, v: height }, { u: -half + c, v: height }, { u: -half, v: height - c }];
  }
  return [{ u: -half, v: 0 }, { u: half, v: 0 }, { u: half, v: height }, { u: -half, v: height }];
}

export function ribMesh(shape: RibFields) {
  const style = normalizeRibStyle(shape.ribStyle);
  const width = Math.max(0.2, shape.width);
  const height = Math.max(0.2, shape.height);
  const thickness = Math.max(0.2, shape.depth ?? shape.width);
  const mesh = new IndexedMesh();
  if (style === "gusset") {
    // Seen from the side along z: the leg up the wall at x = -width/2, the foot along the floor. Pushed along x in the
    // builder, so the outline is drawn in (z, y) and turned: here u is x.
    const e = gussetEnd(width, height);
    const outline: ProfilePoint[] = [
      { u: -width / 2, v: 0 },
      { u: width / 2, v: 0 },
      { u: width / 2, v: e },
      { u: -width / 2 + e, v: height },
      { u: -width / 2, v: height },
    ];
    addPrismAlongX(mesh, outline, thickness);
    // The builder pushes along x: turn the result so the outline lies in x-y and the thickness runs along z.
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i], z = mesh.positions[i + 2];
      mesh.positions[i] = z;
      mesh.positions[i + 2] = -x;
    }
    return mesh;
  }
  addPrismAlongX(mesh, ribProfile(thickness, height, normalizeRibTop(shape.ribTop)), width);
  return mesh;
}

export function createRibGeometry(shape: RibFields): THREE.BufferGeometry {
  return ribMesh(shape).geometry(30);
}
