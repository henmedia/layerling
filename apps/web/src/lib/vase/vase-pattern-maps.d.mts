// Types for vase-pattern-maps.mjs: the vase's pattern tiles and leaf outlines made from pictures (generated).

export type VasePatternMap = { size: number; aspect: number; data: string };
export type VaseLeafMap = { size: number; base: number; tip: number; half: number; data: string };
export const PATTERN_MAPS: Readonly<Record<string, VasePatternMap>>;
export const LEAF_MAPS: Readonly<Record<string, VaseLeafMap>>;
