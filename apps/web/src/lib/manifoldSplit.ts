import type { ManifoldToplevel } from "manifold-3d";

export type ManifoldSolid = ReturnType<ManifoldToplevel["Manifold"]["cube"]>;

/** The same surface facing the other way: a cavity turned into the solid that fills it. */
function invertedManifold(runtime: ManifoldToplevel, source: ManifoldSolid) {
  const mesh = source.getMesh();
  const triVerts = Uint32Array.from(mesh.triVerts);
  for (let index = 0; index < triVerts.length; index += 3) {
    const second = triVerts[index + 1];
    triVerts[index + 1] = triVerts[index + 2];
    triVerts[index + 2] = second;
  }
  const inverted = new runtime.Mesh({ numProp: mesh.numProp, vertProperties: mesh.vertProperties, triVerts });
  try {
    return runtime.Manifold.ofMesh(inverted);
  } finally {
    (mesh as { delete?: () => void }).delete?.();
    (inverted as { delete?: () => void }).delete?.();
  }
}

/**
 * Merges overlapping bodies into one before a split. A closed hollow comes
 * apart into its outer skin and an inward-facing cavity; a union would fill
 * that cavity, so only the outward-facing bodies are united and the cavities
 * are cut back out afterwards.
 */
export function unionSplitManifoldComponents(runtime: ManifoldToplevel, source: ManifoldSolid) {
  const components = source.decompose();
  const bodies = components.filter((component) => component.volume() > 0);
  const cavities = components.filter((component) => component.volume() < 0);
  if (bodies.length <= 1) {
    return { solid: source, created: components };
  }

  const created: ManifoldSolid[] = [...components];
  let solid = runtime.Manifold.union(bodies);
  created.push(solid);
  if (cavities.length > 0) {
    const filled = cavities.map((cavity) => invertedManifold(runtime, cavity));
    created.push(...filled);
    const cavitySolid = filled.length === 1 ? filled[0] : runtime.Manifold.union(filled);
    created.push(cavitySolid);
    solid = solid.subtract(cavitySolid);
    created.push(solid);
  }
  return {
    solid: solid.status() === "NoError" && solid.numTri() > 0 ? solid : null,
    created,
  };
}

/** A corner this close to the plane (mm) lies on it. */
const ON_PLANE = 1e-4;
/** How far each half is cut clear of a face lying on the plane (mm), then moved back. */
const CLEAR_OF_FACE = 1e-3;

/**
 * Splits a solid by a plane. A face lying exactly on the plane - the top of a
 * lid's plate under its rim, cut at the plate's thickness (#1263) - goes to one
 * half as a sheet without thickness, and where that sheet touches the half's
 * own surface it stays joined to it: the rim comes out with a flat brim as wide
 * as the plate, which dropSplitSlivers cannot take off. So when corners lie on
 * the plane, each half is cut a hair clear of it on its own side, where no face
 * lies, and its cut face is moved back onto the plane. Elsewhere it is the
 * plain split.
 */
export function splitByPlaneClearOfFaces(solid: ManifoldSolid, normal: [number, number, number], position: number): [ManifoldSolid, ManifoldSolid] {
  const length = Math.hypot(...normal);
  const unit: [number, number, number] = [normal[0] / length, normal[1] / length, normal[2] / length];
  // As in Manifold's own splitByPlane, `position` is the distance along the normal, whatever its length.
  const offset = position;
  const height = (x: number, y: number, z: number) => unit[0] * x + unit[1] * y + unit[2] * z - offset;
  const mesh = solid.getMesh();
  let touches = false;
  try {
    for (let index = 0; index + 2 < mesh.vertProperties.length && !touches; index += mesh.numProp) {
      touches = Math.abs(height(mesh.vertProperties[index], mesh.vertProperties[index + 1], mesh.vertProperties[index + 2])) < ON_PLANE;
    }
  } finally {
    (mesh as { delete?: () => void }).delete?.();
  }
  if (!touches) return solid.splitByPlane(normal, position);

  // Each half from its own cut; the other half of that cut is not needed.
  const [positiveCut, abovePositive] = solid.splitByPlane(unit, offset + CLEAR_OF_FACE);
  const [belowNegative, negativeCut] = solid.splitByPlane(unit, offset - CLEAR_OF_FACE);
  abovePositive.delete();
  belowNegative.delete();
  const backOnto = (cut: ManifoldSolid, at: number) => {
    const moved = cut.warp((vertex) => {
      if (Math.abs(height(vertex[0], vertex[1], vertex[2]) - at) > ON_PLANE / 10) return;
      vertex[0] -= unit[0] * at;
      vertex[1] -= unit[1] * at;
      vertex[2] -= unit[2] * at;
    });
    cut.delete();
    return moved;
  };
  return [backOnto(positiveCut, CLEAR_OF_FACE), backOnto(negativeCut, -CLEAR_OF_FACE)];
}

/** Thinner than this (in mm, roughly volume over half the surface) a piece is a skin, not a body. */
const SLIVER_THICKNESS = 1e-5;

/**
 * Drops the zero-thickness skins a cut leaves behind. A plane lying exactly on
 * a face - as one laid on a picked face does - hands that face to one half as
 * a flat sheet of its own. Cavities count by their size too, so a hollowed
 * half keeps them.
 */
export function dropSplitSlivers(runtime: ManifoldToplevel, half: ManifoldSolid) {
  const components = half.decompose();
  const kept = components.filter((component) => Math.abs(component.volume()) * 2 > component.surfaceArea() * SLIVER_THICKNESS);
  if (kept.length === components.length) {
    return { solid: half, created: components };
  }
  if (kept.length === 0) {
    return { solid: null, created: components };
  }
  const solid = runtime.Manifold.compose(kept);
  return { solid, created: [...components, solid] };
}
