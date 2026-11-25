// Types for vase-collisions.mjs: whether the vase and its accessories run into one another when put together.

export type CollisionBody = { id: string; vertices: ArrayLike<number>; indices: ArrayLike<number> };

/** A closed mesh as a solid: how many times its surface wraps a point (0 outside), and its box. */
export function meshSolid(vertices: ArrayLike<number>, indices: ArrayLike<number>): { winding: (x: number, y: number, z: number) => number; box: number[] };

/** The pairs of bodies that overlap by more than a play of 0.2 mm, with how deep at least (0.2, 0.5, 1, 2 or 4 mm). */
export function assemblyCollisions(bodies: CollisionBody[]): Array<{ a: string; b: string; depth: number }>;
