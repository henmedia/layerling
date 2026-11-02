// Types for vase-geometry.mjs: the vase core, kept the same as in the stand-alone vase tool
// so both build the same body. Only what the editor uses is declared here.

export type VaseNumberKey =
  | "height" | "diameter" | "ribCount" | "ribDepth" | "grooveWidth" | "twist" | "swayAngle" | "swayCount"
  | "sectionZoneFrom" | "sectionZoneTo" | "sectionZoneFade"
  | "section2Sides" | "section2Round" | "section2Waves" | "section2WaveAmp" | "section2From" | "section2To"
  | "waveAmplitude" | "waveCount" | "zoneFrom" | "zoneTo" | "zoneFade" | "wall" | "bottom"
  | "drainHoles" | "drainDiameter" | "floorSlope" | "footHeight" | "rubberFeet" | "rubberFootDiameter" | "rubberFootDepth"
  | "legCount" | "legHeight" | "legDiameter" | "legSplay" | "legInset" | "fitClearance"
  | "saucerGap" | "saucerHeight" | "saucerWall" | "insertWall" | "insertStandoff" | "reservoirHeight" | "tubeDiameter" | "frogHole"
  | "lidClearance" | "lidThickness" | "lidDepth" | "threadPitch" | "lidHeight"
  | "cutoutSize" | "cutoutWeb" | "cutoutFrom" | "cutoutTo" | "cutoutAspect" | "cutoutSeed"
  | "lampHole" | "puckDiameter" | "lampNotch" | "lampNotchHeight"
  | "reinforceCount" | "reinforceDepth" | "slitWidth" | "lineWidth"
  | "polySides" | "polyRound" | "sectionWaves" | "sectionWaveAmp" | "sectionFinWidth" | "drawRepeat"
  | "stripeTurn" | "stripeCount" | "stripeWidth" | "stripeDepth"
  | "voronoiCell" | "voronoiGap" | "voronoiDepth" | "voronoiSeed"
  | "lowpolyAround" | "lowpolyRows" | "lowpolyJitter" | "lowpolySeed";

export type VaseChoiceKey =
  | "profile" | "ribShape" | "twistMode" | "twistAlong" | "material" | "sectionOutside"
  | "section2" | "section2WaveStyle" | "body" | "innerShape"
  | "legMode" | "legShape" | "saucerMode" | "saucerRibs" | "saucerSpout" | "saucerGrip" | "insertMode"
  | "lidMode" | "lidGrip" | "lidKnob" | "quality" | "cutout" | "cutoutEdge" | "watertight" | "lamp" | "lampSocket" | "reinforce"
  | "section" | "sectionWaveStyle" | "drawSymmetry" | "effect" | "stripeStyle";

/** A point of a drawn cross-section in the unit circle: a corner, or round with an optional handle (tx, ty; ix, iy before it). */
export type VaseDrawPoint = { x: number; y: number; corner: boolean; tx?: number; ty?: number; ix?: number; iy?: number };

export type VaseSettings = Record<VaseNumberKey, number> & Record<VaseChoiceKey, string> & {
  /** Drawn body (profile "gezeichnet"): [height 0..1, radius 0..1, kind?, slope?]. */
  profilePoints: number[][] | null;
  /** Drawn cross-section (section "gezeichnet"). */
  drawPoints: VaseDrawPoint[] | null;
  /** Twist as a curve (twistMode "kurve"): [height 0..1, angle in degrees, kind?, slope?]. */
  twistPoints: number[][] | null;
};

export const DEFAULTS: Readonly<VaseSettings>;
export const LIMITS: Readonly<Partial<Record<VaseNumberKey, [number, number]>>>;
export const PROFILES: Readonly<Record<string, { label: string; points: number[][] }>>;
export const SECTIONS: Readonly<Record<string, string>>;
export const SECTIONS2: Readonly<Record<string, string>>;
export const WAVE_STYLES: Readonly<Record<string, string>>;
export const RIB_SHAPES: Readonly<Record<string, string>>;
export const EFFECTS: Readonly<Record<string, string>>;
export const INNER_SHAPES: Readonly<Record<string, string>>;
export const SECTION_OUTSIDE: Readonly<Record<string, string>>;
export const TWIST_MODES: Readonly<Record<string, string>>;
export const TWIST_ALONG: Readonly<Record<string, string>>;
export const QUALITY_LABELS: Readonly<Record<string, string>>;
export const SYMMETRIES: Readonly<Record<string, string>>;
export const CUTOUTS: Readonly<Record<string, string>>;
export const CUTOUT_EDGES: Readonly<Record<string, string>>;
export const REINFORCE: Readonly<Record<string, string>>;
export const LAMPS: Readonly<Record<string, string>>;
export const LAMP_SOCKETS: Readonly<Record<string, string>>;
/** The bottom in the slicer's vase mode, in mm. */
export const VASE_MODE_BOTTOM: number;
export const MATERIALS: Readonly<Record<string, { label: string; density: number }>>;
export const WATERTIGHT_MIN: number;

/** Completes and limits settings; unknown fields fall away. */
export function normalizeParams(input?: unknown): VaseSettings;

export type VaseMesh = {
  params: VaseSettings;
  /** Nine numbers per triangle, millimetres, z up, the vase standing on z = 0 around the z axis. */
  positions: Float32Array;
  triangleCount: number;
  indices: Uint32Array;
  vertices: Float64Array;
  size: { width: number; depth: number; height: number };
  flat: boolean;
  section: { starShaped: boolean; valid: boolean };
  notes: string[];
  /** With a teapot lid: the whole vase's box, lid included (the body itself ends lower, at the cut). */
  extent: { min: number[]; max: number[] } | null;
};

export function buildVase(input?: unknown): VaseMesh;
export function vaseChecks(input?: unknown): string[];
export function describeVase(input?: unknown): { name: string; slug: string };
export function printVolume(input: unknown, positions: Float32Array): { mm3: number; mode: string };
export function printWeight(mm3: number, material?: string): { grams: number; meters: number; material: string };
