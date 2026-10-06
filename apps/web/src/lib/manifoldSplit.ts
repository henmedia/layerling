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
