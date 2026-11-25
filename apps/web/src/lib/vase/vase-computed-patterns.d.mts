// Types for vase-computed-patterns.mjs: the vase's worked-out relief patterns (formulas instead of pictures).

export const COMPUTED_PATTERNS: Readonly<Record<string, string>>;
/** Whether a family is one of the worked-out ones. */
export function isComputedPattern(effect: string): boolean;
/** The height 0..1 of a worked-out family at (cu, cv) in cells, `around` cells round the vase. */
export function computedHeight(effect: string, cu: number, cv: number, around: number, width: number, blur?: number): number;
/** How many fine features a family has across a cell. */
export function computedDetail(effect: string, width: number): number;
