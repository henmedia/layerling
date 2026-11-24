// Types for vase-patterns.mjs: the vase's relief pattern families and leaves.

export const PATTERNS: Readonly<Record<string, string>>;
export const LEAF_SHAPES: Readonly<Record<string, string>>;
export const LEAF_LAYOUTS: Readonly<Record<string, string>>;
export const DEFAULT_LEAF_POINTS: ReadonlyArray<readonly [number, number]>;
export function isReliefPattern(effect: string): boolean;
export function isPicturePattern(effect: string): boolean;
export function isPictureLeaf(shape: string): boolean;
export function normalizeLeafPoints(list: unknown): number[][] | null;
/** Heights 0..1 of a family on an unrolled cylinder, `columns` x `rows`, row 0 at the bottom. */
export function patternPreview(p: Record<string, unknown>, columns?: number, rows?: number, cellsAcross?: number | null): Float32Array;
/** The height 0..1 of a family at (cu, cv) in cells, `around` cells round the vase. */
export function patternHeight(p: Record<string, unknown>, cu: number, cv: number, around: number): number;
/** A function of the height alone that remembers its last answer (a wall is built a row at a time). */
export function perHeight(f: (z: number) => number): (z: number) => number;
/** One leaf's height 0..1 at (t, xn), or -1 outside it. */
export function leafHeight(shape: string, t: number, xn: number, curve: number, withVeins: boolean, points: ReadonlyArray<ReadonlyArray<number>> | null, halfWidthInLengths?: number): number;
