import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { ThreadHand, ThreadHead, ThreadProfile, ThreadRole } from "@/types/layerling";
import { isThreadProfile } from "@/lib/threadProfiles";
import type { MessageKey } from "@/lib/messages.en";

export const DEFAULT_THREAD_ROLE: ThreadRole = "rod";
export const DEFAULT_THREAD_HEAD: ThreadHead = "cylinder";
export const DEFAULT_THREAD_HAND: ThreadHand = "right";
export const DEFAULT_THREAD_PROFILE: ThreadProfile = "v";
export const DEFAULT_THREAD_DIAMETER = 6;
export const DEFAULT_THREAD_PITCH = 1;
/**
 * Spiel einer neuen Mutter oder eines neuen Gewindelochs (Durchmesser). Der Spalt zwischen
 * den Flanken ist nur etwa halb so gross wie das Spiel im Radius: 0,2 mm liessen bei einem
 * Spitzgewinde 0,05 mm und ein gedrucktes Paar drehte sich nicht (Video von HL ModTech, 12.10.2026).
 */
export const DEFAULT_THREAD_CLEARANCE = 0.4;
/** Was ein Gewinde ohne gespeichertes Spiel behaelt: so hat es immer geladen, es soll nicht lockerer werden. */
export const LEGACY_THREAD_CLEARANCE = 0.2;
export const DEFAULT_THREAD_QUALITY = 48;

export const MIN_THREAD_DIAMETER = 1;
export const MAX_THREAD_DIAMETER = 160;
export const MIN_THREAD_PITCH = 0.2;
export const MAX_THREAD_PITCH = 12;
export const MIN_THREAD_CLEARANCE = 0;
export const MAX_THREAD_CLEARANCE = 1.5;
/**
 * Spiel fuer Aussengewinde (Stange, Schraube): so viel duenner wird der
 * Bolzen im Durchmesser. Ein eigenes Feld mit 0 als Vorgabe, weil
 * `threadClearance` auch bei Stange und Schraube schon 0,2 mm gespeichert
 * hat, ohne dass es dort je gewirkt haette - wuerde es jetzt wirken, kaeme
 * jeder alte Bolzen duenner heraus.
 */
export const DEFAULT_THREAD_BOLT_CLEARANCE = 0;
export const MIN_THREAD_BOLT_CLEARANCE = 0;
export const MAX_THREAD_BOLT_CLEARANCE = 1;
/**
 * Spiel entlang der Achse fuer Innengewinde (Mutter, Gewindeloch), in mm (#256): so viel duenner
 * wird jeder Zahn der Mutter, der Durchmesser bleibt. Das Spiel im Durchmesser (`threadClearance`)
 * oeffnet die Flanken nur zu etwa 0,58 seines Betrags - wer eine senkrechte Luecke will, muesste
 * den Durchmesser weit aufmachen und bekaeme seitliches Schlackern. 0 als Vorgabe, damit kein
 * gespeichertes Gewinde anders herauskommt. Hoechstens ein Fuenftel der Steigung: darueber
 * bleibt vom Zahn der Mutter nichts mehr.
 */
export const DEFAULT_THREAD_AXIAL_CLEARANCE = 0;
export const MAX_THREAD_AXIAL_CLEARANCE = 1;
const MAX_AXIAL_CLEARANCE_PER_PITCH = 0.2;

/**
 * Das eigene Profil: ein symmetrisches Trapez mit ebener Kuppe und ebenem Grund gleicher Breite,
 * bestimmt durch die Gewindetiefe (Aussen- minus Kernradius, in mm) und den Flankenwinkel, den
 * Oeffnungswinkel der beiden Flanken (60 Grad beim Spitzgewinde, 30 beim Trapezgewinde). Wer
 * ohne Stuetzen drucken will, geht auf 90 Grad oder weniger: dann ist keine Flanke flacher als
 * 45 Grad zur Waagerechten. Vorgabe ist die Tiefe des Spitzgewindes bei 60 Grad.
 */
export const DEFAULT_THREAD_FLANK_ANGLE = 60;
export const MIN_THREAD_FLANK_ANGLE = 10;
export const MAX_THREAD_FLANK_ANGLE = 90;
const V_DEPTH_PER_PITCH = (5 / 8) * (Math.sqrt(3) / 2);
/** Both flanks together may take at most this much of a pitch; the rest is crest and root. */
const MAX_FLANK_SHARE_PER_PITCH = 0.9;
const MIN_DEPTH_PER_PITCH = 0.1;
const MAX_DEPTH_PER_DIAMETER = 0.4;
export const MIN_THREAD_QUALITY = 12;
export const MAX_THREAD_QUALITY = 96;

/**
 * Ein Gewinde kann viele Gaenge haben, und jeder Gang kostet so viele Reihen
 * Punkte, wie sein Profil Punkte hat - vier beim Spitzgewinde, mehr bei den
 * gerundeten. Ohne Deckel liefe ein M2 ueber 100 mm in die Hunderttausende, also
 * wird die Zahl der Spalten gesenkt, bevor die Punktzahl entgleist.
 */
const MAX_THREAD_VERTICES = 140000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

/** Wie weit Durchmesser und Steigung von der Norm abweichen duerfen und trotzdem als Normgroesse gelten. */
const SIZE_MATCH_TOLERANCE = 0.001;

/** "pipe" ist das Whitworth-Rohrgewinde G: Durchmesser in Millimetern, Steigung in Gaengen je Zoll. */
export type ThreadSystem = "metric" | "inch" | "pipe";

export type ThreadSizeSpec = {
  /** Bleibt unuebersetzt: "M6" heisst in jeder Sprache M6. */
  id: string;
  system: ThreadSystem;
  diameter: number;
  pitch: number;
  /** Das Profil, das die Norm dieser Reihe vorschreibt. */
  profile: ThreadProfile;
  /** Schluesselweite des Innensechskants. */
  socket: number;
  /** Zylinderkopf nach ISO 4762. */
  headDiameter: number;
  headHeight: number;
  /** Schluesselweite von Sechskantkopf und Mutter. */
  acrossFlats: number;
  nutHeight: number;
  /** Kopfdurchmesser des 90-Grad-Senkkopfs nach ISO 7046. */
  countersunkDiameter: number;
};

/**
 * Die metrischen Regelgewinde, mit denen man beim Drucken tatsaechlich zu tun
 * hat. Die Kopfmasse stammen aus ISO 4762, 4032 und 7046, damit eine M6 hier
 * auch zu einer gekauften M6 passt; fuer freie Durchmesser rechnet
 * `derivedSizeSpec` dieselben Verhaeltnisse nach.
 */
const METRIC_SIZES: readonly ThreadSizeSpec[] = ([
  { id: "M2", system: "metric", diameter: 2, pitch: 0.4, socket: 1.5, headDiameter: 3.8, headHeight: 2, acrossFlats: 4, nutHeight: 1.6, countersunkDiameter: 3.8 },
  { id: "M2.5", system: "metric", diameter: 2.5, pitch: 0.45, socket: 2, headDiameter: 4.5, headHeight: 2.5, acrossFlats: 5, nutHeight: 2, countersunkDiameter: 4.7 },
  { id: "M3", system: "metric", diameter: 3, pitch: 0.5, socket: 2.5, headDiameter: 5.5, headHeight: 3, acrossFlats: 5.5, nutHeight: 2.4, countersunkDiameter: 6 },
  { id: "M4", system: "metric", diameter: 4, pitch: 0.7, socket: 3, headDiameter: 7, headHeight: 4, acrossFlats: 7, nutHeight: 3.2, countersunkDiameter: 8 },
  { id: "M5", system: "metric", diameter: 5, pitch: 0.8, socket: 4, headDiameter: 8.5, headHeight: 5, acrossFlats: 8, nutHeight: 4, countersunkDiameter: 10 },
  { id: "M6", system: "metric", diameter: 6, pitch: 1, socket: 5, headDiameter: 10, headHeight: 6, acrossFlats: 10, nutHeight: 5, countersunkDiameter: 12 },
  { id: "M8", system: "metric", diameter: 8, pitch: 1.25, socket: 6, headDiameter: 13, headHeight: 8, acrossFlats: 13, nutHeight: 6.5, countersunkDiameter: 16 },
  { id: "M10", system: "metric", diameter: 10, pitch: 1.5, socket: 8, headDiameter: 16, headHeight: 10, acrossFlats: 16, nutHeight: 8, countersunkDiameter: 20 },
  { id: "M12", system: "metric", diameter: 12, pitch: 1.75, socket: 10, headDiameter: 18, headHeight: 12, acrossFlats: 18, nutHeight: 10, countersunkDiameter: 24 },
  // Up to M24, about as far as the inch sizes reach (#659). Heads ISO 4762, nuts ISO 4032.
  { id: "M14", system: "metric", diameter: 14, pitch: 2, socket: 12, headDiameter: 21, headHeight: 14, acrossFlats: 21, nutHeight: 12.8, countersunkDiameter: 28 },
  { id: "M16", system: "metric", diameter: 16, pitch: 2, socket: 14, headDiameter: 24, headHeight: 16, acrossFlats: 24, nutHeight: 14.8, countersunkDiameter: 32 },
  { id: "M18", system: "metric", diameter: 18, pitch: 2.5, socket: 14, headDiameter: 27, headHeight: 18, acrossFlats: 27, nutHeight: 15.8, countersunkDiameter: 36 },
  { id: "M20", system: "metric", diameter: 20, pitch: 2.5, socket: 17, headDiameter: 30, headHeight: 20, acrossFlats: 30, nutHeight: 18, countersunkDiameter: 40 },
  { id: "M22", system: "metric", diameter: 22, pitch: 2.5, socket: 17, headDiameter: 33, headHeight: 22, acrossFlats: 34, nutHeight: 19.4, countersunkDiameter: 44 },
  { id: "M24", system: "metric", diameter: 24, pitch: 3, socket: 19, headDiameter: 36, headHeight: 24, acrossFlats: 36, nutHeight: 21.5, countersunkDiameter: 48 },
] satisfies Omit<ThreadSizeSpec, "profile">[]).map((size) => ({ ...size, profile: "v" as const }));

const MILLIMETRES_PER_INCH = 25.4;

/**
 * Zollgewinde in Grob (UNC) und Fein (UNF). Beide haben denselben
 * Flankenwinkel und dieselben Abflachungen wie das metrische ISO-Gewinde, also
 * baut sie derselbe Geometriezweig - es aendern sich nur Durchmesser und
 * Steigung. Die Masse stehen hier in Zoll, wie in den Normen ASME B18.3 und
 * B18.2.2, und werden beim Aufbau der Liste umgerechnet.
 *
 * Eine Abweichung ist bewusst: der Senkkopf bleibt auch hier ein 90-Grad-Kegel
 * wie beim metrischen Gewinde, waehrend die Zollnorm 82 Grad vorsieht. Der
 * Kopfdurchmesser stimmt, die Hoehe faellt dadurch etwas flacher aus und laesst
 * sich von Hand nachstellen.
 */
type InchSizeRow = {
  label: string;
  diameter: number;
  coarse: number;
  fine: number;
  headDiameter: number;
  headHeight: number;
  socket: number;
  acrossFlats: number;
  nutHeight: number;
  countersunkDiameter: number;
};

const INCH_ROWS: readonly InchSizeRow[] = [
  { label: "#4", diameter: 0.112, coarse: 40, fine: 48, headDiameter: 0.183, headHeight: 0.112, socket: 0.0938, acrossFlats: 0.25, nutHeight: 0.094, countersunkDiameter: 0.225 },
  { label: "#6", diameter: 0.138, coarse: 32, fine: 40, headDiameter: 0.226, headHeight: 0.138, socket: 0.1094, acrossFlats: 0.3125, nutHeight: 0.109, countersunkDiameter: 0.279 },
  { label: "#8", diameter: 0.164, coarse: 32, fine: 36, headDiameter: 0.27, headHeight: 0.164, socket: 0.1406, acrossFlats: 0.34375, nutHeight: 0.125, countersunkDiameter: 0.332 },
  { label: "#10", diameter: 0.19, coarse: 24, fine: 32, headDiameter: 0.312, headHeight: 0.19, socket: 0.1563, acrossFlats: 0.375, nutHeight: 0.125, countersunkDiameter: 0.385 },
  { label: "1/4\"", diameter: 0.25, coarse: 20, fine: 28, headDiameter: 0.375, headHeight: 0.25, socket: 0.1875, acrossFlats: 0.4375, nutHeight: 0.219, countersunkDiameter: 0.507 },
  { label: "5/16\"", diameter: 0.3125, coarse: 18, fine: 24, headDiameter: 0.469, headHeight: 0.3125, socket: 0.25, acrossFlats: 0.5, nutHeight: 0.266, countersunkDiameter: 0.635 },
  { label: "3/8\"", diameter: 0.375, coarse: 16, fine: 24, headDiameter: 0.562, headHeight: 0.375, socket: 0.3125, acrossFlats: 0.5625, nutHeight: 0.328, countersunkDiameter: 0.762 },
  { label: "7/16\"", diameter: 0.4375, coarse: 14, fine: 20, headDiameter: 0.656, headHeight: 0.4375, socket: 0.375, acrossFlats: 0.6875, nutHeight: 0.375, countersunkDiameter: 0.812 },
  { label: "1/2\"", diameter: 0.5, coarse: 13, fine: 20, headDiameter: 0.75, headHeight: 0.5, socket: 0.375, acrossFlats: 0.75, nutHeight: 0.4375, countersunkDiameter: 0.875 },
  { label: "5/8\"", diameter: 0.625, coarse: 11, fine: 18, headDiameter: 0.938, headHeight: 0.625, socket: 0.5, acrossFlats: 0.9375, nutHeight: 0.547, countersunkDiameter: 1 },
  { label: "3/4\"", diameter: 0.75, coarse: 10, fine: 16, headDiameter: 1.125, headHeight: 0.75, socket: 0.625, acrossFlats: 1.125, nutHeight: 0.641, countersunkDiameter: 1.25 },
  { label: "1\"", diameter: 1, coarse: 8, fine: 12, headDiameter: 1.5, headHeight: 1, socket: 0.75, acrossFlats: 1.5, nutHeight: 0.859, countersunkDiameter: 1.5 },
];

function inchSpec(row: InchSizeRow, threadsPerInch: number, series: "UNC" | "UNF"): ThreadSizeSpec {
  const inches = (value: number) => value * MILLIMETRES_PER_INCH;
  return {
    id: `${row.label}-${threadsPerInch} ${series}`,
    system: "inch",
    diameter: inches(row.diameter),
    pitch: MILLIMETRES_PER_INCH / threadsPerInch,
    socket: inches(row.socket),
    headDiameter: inches(row.headDiameter),
    headHeight: inches(row.headHeight),
    acrossFlats: inches(row.acrossFlats),
    nutHeight: inches(row.nutHeight),
    countersunkDiameter: inches(row.countersunkDiameter),
    profile: "v",
  };
}

const INCH_COARSE_SIZES: readonly ThreadSizeSpec[] = INCH_ROWS.map((row) => inchSpec(row, row.coarse, "UNC"));
const INCH_FINE_SIZES: readonly ThreadSizeSpec[] = INCH_ROWS.map((row) => inchSpec(row, row.fine, "UNF"));

/**
 * Kopf- und Mutternmasse fuer einen Durchmesser, zu dem keine Norm sie
 * vorgibt: freie Durchmesser und die Rohrgewinde.
 */
function proportionalHeadSizes(diameter: number) {
  return {
    socket: diameter * 0.55,
    headDiameter: diameter * 1.6,
    headHeight: diameter,
    acrossFlats: diameter * 1.6,
    nutHeight: diameter * 0.85,
    countersunkDiameter: diameter * 2,
  };
}

/**
 * Whitworth-Rohrgewinde G (BSPP), zylindrisch, nach ISO 228-1: Fittings,
 * Wasser, Gas, Hydraulik und Pneumatik. Die Groesse ist die Nennweite des
 * Rohrs, nicht der Gewindedurchmesser - G1 misst aussen 33,249 mm. Die
 * Aussendurchmesser stehen hier in Millimetern, wie in der Tabelle der Norm;
 * die Steigung in Gaengen je Zoll.
 *
 * Aufgenommen sind die Groessen der Norm bis G4. Die Zwischengroessen 1 3/8,
 * 1 5/8 und 1 7/8 aus alten britischen Tabellen stehen nicht in ISO 228-1 und
 * fehlen deshalb. Die kegeligen Gewinde R, Rc und Rp nach ISO 7-1 sind eine
 * eigene Sache und gehoeren nicht hierher.
 *
 * ISO 228-1 legt nur das Gewinde fest. Kopf und Mutter bekommen deshalb
 * dieselben Verhaeltnisse wie ein freier Durchmesser.
 */
const PIPE_ROWS: ReadonlyArray<{ label: string; diameter: number; threadsPerInch: number }> = [
  { label: "1/16", diameter: 7.723, threadsPerInch: 28 },
  { label: "1/8", diameter: 9.728, threadsPerInch: 28 },
  { label: "1/4", diameter: 13.157, threadsPerInch: 19 },
  { label: "3/8", diameter: 16.662, threadsPerInch: 19 },
  { label: "1/2", diameter: 20.955, threadsPerInch: 14 },
  { label: "5/8", diameter: 22.911, threadsPerInch: 14 },
  { label: "3/4", diameter: 26.441, threadsPerInch: 14 },
  { label: "7/8", diameter: 30.201, threadsPerInch: 14 },
  { label: "1", diameter: 33.249, threadsPerInch: 11 },
  { label: "1 1/8", diameter: 37.897, threadsPerInch: 11 },
  { label: "1 1/4", diameter: 41.91, threadsPerInch: 11 },
  { label: "1 1/2", diameter: 47.803, threadsPerInch: 11 },
  { label: "1 3/4", diameter: 53.746, threadsPerInch: 11 },
  { label: "2", diameter: 59.614, threadsPerInch: 11 },
  { label: "2 1/4", diameter: 65.71, threadsPerInch: 11 },
  { label: "2 1/2", diameter: 75.184, threadsPerInch: 11 },
  { label: "2 3/4", diameter: 81.534, threadsPerInch: 11 },
  { label: "3", diameter: 87.884, threadsPerInch: 11 },
  { label: "3 1/2", diameter: 100.33, threadsPerInch: 11 },
  { label: "4", diameter: 113.03, threadsPerInch: 11 },
];

const PIPE_SIZES: readonly ThreadSizeSpec[] = PIPE_ROWS.map((row) => ({
  id: `G${row.label}`,
  system: "pipe",
  diameter: row.diameter,
  pitch: MILLIMETRES_PER_INCH / row.threadsPerInch,
  ...proportionalHeadSizes(row.diameter),
  profile: "whitworth",
}));

/** Die Reihen im Groessenmenue: metrisches Regelgewinde, Zoll grob und fein, Rohrgewinde G. */
export type ThreadSeries = "metric" | "UNC" | "UNF" | "G";

/**
 * Was das Groessenmenue zu jeder Reihe zeigt: eine kurze Ueberschrift ueber
 * ihren Groessen - kurz, damit das native Aufklappfeld schmal bleibt - und
 * eine Zeile unter dem Feld mit Beispielen aus dem Alltag, solange eine Groesse
 * dieser Reihe gewaehlt ist.
 */
export const THREAD_SERIES_TEXT = {
  metric: { group: "thread.group.metric", hint: "thread.hint.metric" },
  UNC: { group: "thread.group.UNC", hint: "thread.hint.UNC" },
  UNF: { group: "thread.group.UNF", hint: "thread.hint.UNF" },
  G: { group: "thread.group.G", hint: "thread.hint.G" },
} as const satisfies Record<ThreadSeries, { group: MessageKey; hint: MessageKey }>;

export const THREAD_SIZE_GROUPS: ReadonlyArray<{ series: ThreadSeries; sizes: readonly ThreadSizeSpec[] }> = [
  { series: "metric", sizes: METRIC_SIZES },
  { series: "UNC", sizes: INCH_COARSE_SIZES },
  { series: "UNF", sizes: INCH_FINE_SIZES },
  { series: "G", sizes: PIPE_SIZES },
];

export const THREAD_SIZES: readonly ThreadSizeSpec[] = THREAD_SIZE_GROUPS.flatMap((group) => group.sizes);

/** Die Schraubengewinde - alles ausser den Rohrgewinden. */
const SCREW_SIZES: readonly ThreadSizeSpec[] = [...METRIC_SIZES, ...INCH_COARSE_SIZES, ...INCH_FINE_SIZES];

function pipeSizeAt(diameter: number) {
  return PIPE_SIZES.find((size) => Math.abs(size.diameter - diameter) < SIZE_MATCH_TOLERANCE) ?? null;
}

/**
 * Ob die Steigung als Gaenge je Zoll abgefragt wird. Entschieden wird das am
 * Durchmesser, nicht an der gewaehlten Groesse: so bleibt das Feld stehen,
 * waehrend man die Gangzahl von einem Normwert wegdreht. Auch das
 * Rohrgewinde zaehlt seine Gaenge je Zoll.
 */
export function threadUsesInchPitch(diameter: number) {
  return INCH_ROWS.some((row) => Math.abs(row.diameter * MILLIMETRES_PER_INCH - diameter) < SIZE_MATCH_TOLERANCE)
    || pipeSizeAt(diameter) !== null;
}

/** Aus Millimetern Steigung werden Gaenge je Zoll - und zurueck. */
export function pitchToThreadsPerInch(pitch: number) {
  return MILLIMETRES_PER_INCH / Math.max(1e-6, pitch);
}

export function threadsPerInchToPitch(threadsPerInch: number) {
  return MILLIMETRES_PER_INCH / Math.max(0.25, threadsPerInch);
}

function derivedSizeSpec(diameter: number): ThreadSizeSpec {
  const pipe = pipeSizeAt(diameter);
  return {
    id: "",
    system: pipe ? "pipe" : threadUsesInchPitch(diameter) ? "inch" : "metric",
    diameter,
    pitch: defaultThreadPitch(diameter),
    ...proportionalHeadSizes(diameter),
    profile: pipe ? pipe.profile : DEFAULT_THREAD_PROFILE,
  };
}

/** Die Reihe, zu der eine Normgroesse gehoert. */
export function threadSeriesFor(size: ThreadSizeSpec): ThreadSeries | null {
  return THREAD_SIZE_GROUPS.find((group) => group.sizes.includes(size))?.series ?? null;
}

/** Die Normgroesse zu Durchmesser und Steigung, oder nichts bei freien Werten. */
export function threadSizeFor(diameter: number, pitch: number): ThreadSizeSpec | null {
  return THREAD_SIZES.find((size) => (
    Math.abs(size.diameter - diameter) < SIZE_MATCH_TOLERANCE && Math.abs(size.pitch - pitch) < SIZE_MATCH_TOLERANCE
  )) ?? null;
}

/** Kopf- und Mutternmasse: aus der Norm, wo der Durchmesser eine ist, sonst gerechnet. */
export function threadSizeSpec(diameter: number, pitch: number): ThreadSizeSpec {
  return threadSizeFor(diameter, pitch) ?? derivedSizeSpec(diameter);
}

/** Die Normgroesse unter ihrem Namen aus dem Menue ("M6", "1/4\"-20 UNC", "G1/2"), oder nichts. */
export function threadSizeById(id: string): ThreadSizeSpec | null {
  return THREAD_SIZES.find((size) => size.id === id) ?? null;
}

/**
 * Das Profil nach der Wahl einer Normgroesse. Die beiden Normprofile tauschen
 * sich gegeneinander aus: eine G-Groesse macht aus dem Spitzgewinde das
 * Whitworth-Profil, eine M-, UNC- oder UNF-Groesse wieder das Spitzgewinde.
 * Ein Trapez- oder Rundprofil hat jemand bewusst fuer den Druck gewaehlt -
 * das bleibt stehen.
 */
export function threadProfileForSize(size: ThreadSizeSpec, current: ThreadProfile): ThreadProfile {
  return current === "v" || current === "whitworth" ? size.profile : current;
}

/**
 * Die Regelsteigung des naechstgelegenen Normdurchmessers. Gesucht wird unter
 * den Schraubengewinden: die Rohrgewinde reichen von 7,7 bis 113 mm und liegen
 * damit mitten zwischen den Schraubengroessen, und ein freies M9 oder M13
 * bekaeme sonst die Steigung eines Rohrs. Nur wer den Durchmesser einer G-Groesse genau trifft,
 * bekommt deren Steigung.
 */
export function defaultThreadPitch(diameter: number) {
  const pipe = pipeSizeAt(diameter);
  if (pipe) return pipe.pitch;
  let nearest = SCREW_SIZES[0];
  for (const size of SCREW_SIZES) {
    if (Math.abs(size.diameter - diameter) < Math.abs(nearest.diameter - diameter)) nearest = size;
  }
  return nearest.pitch;
}

export function normalizeThreadRole(value?: string): ThreadRole {
  return value === "screw" || value === "nut" || value === "bore" ? value : DEFAULT_THREAD_ROLE;
}

export function normalizeThreadHead(value?: string): ThreadHead {
  return value === "countersunk" || value === "hex" ? value : DEFAULT_THREAD_HEAD;
}

export function normalizeThreadHand(value?: string): ThreadHand {
  return value === "left" ? "left" : DEFAULT_THREAD_HAND;
}

export function normalizeThreadProfile(value?: string): ThreadProfile {
  return isThreadProfile(value) ? value : DEFAULT_THREAD_PROFILE;
}

export function normalizeThreadDiameter(value?: number) {
  return clamp(finite(value, DEFAULT_THREAD_DIAMETER), MIN_THREAD_DIAMETER, MAX_THREAD_DIAMETER);
}

/**
 * Die Gewindetiefe waechst mit der Steigung. Waere die Steigung zu gross fuer
 * den Durchmesser, faellt der Kernquerschnitt auf null und der Koerper hat
 * keine Mitte mehr - deshalb die obere Grenze am Durchmesser.
 */
export function threadPitchLimits(diameter: number) {
  const normalizedDiameter = normalizeThreadDiameter(diameter);
  return { min: MIN_THREAD_PITCH, max: Math.min(MAX_THREAD_PITCH, normalizedDiameter * 0.75) };
}

export function normalizeThreadPitch(value: number | undefined, diameter: number) {
  const limits = threadPitchLimits(diameter);
  return clamp(finite(value, defaultThreadPitch(normalizeThreadDiameter(diameter))), limits.min, limits.max);
}

export function normalizeThreadClearance(value?: number) {
  return clamp(finite(value, LEGACY_THREAD_CLEARANCE), MIN_THREAD_CLEARANCE, MAX_THREAD_CLEARANCE);
}

export function threadAxialClearanceLimit(pitch: number) {
  return Math.min(MAX_THREAD_AXIAL_CLEARANCE, Math.max(0, pitch) * MAX_AXIAL_CLEARANCE_PER_PITCH);
}

export function normalizeThreadAxialClearance(value: number | undefined, pitch: number) {
  return clamp(finite(value, DEFAULT_THREAD_AXIAL_CLEARANCE), 0, threadAxialClearanceLimit(pitch));
}

export function normalizeThreadFlankAngle(value?: number) {
  return clamp(finite(value, DEFAULT_THREAD_FLANK_ANGLE), MIN_THREAD_FLANK_ANGLE, MAX_THREAD_FLANK_ANGLE);
}

/** The depth of the V thread at this pitch: where an own profile starts out. */
export function defaultThreadDepth(pitch: number) {
  return pitch * V_DEPTH_PER_PITCH;
}

/**
 * How deep an own profile may be: not shallower than a tenth of the pitch, not so deep that the core
 * gets thin (at most 40 % of the diameter), and not so deep that the two flanks take more of the pitch
 * than they should at this angle.
 */
export function threadDepthLimits(pitch: number, diameter: number, flankAngle: number) {
  const run = Math.tan((normalizeThreadFlankAngle(flankAngle) * Math.PI) / 360);
  const byFlank = (pitch * MAX_FLANK_SHARE_PER_PITCH) / (2 * run);
  const min = pitch * MIN_DEPTH_PER_PITCH;
  const max = Math.max(min, Math.min(byFlank, diameter * MAX_DEPTH_PER_DIAMETER));
  return { min, max };
}

export function normalizeThreadDepth(value: number | undefined, pitch: number, diameter: number, flankAngle: number) {
  const limits = threadDepthLimits(pitch, diameter, flankAngle);
  return clamp(finite(value, defaultThreadDepth(pitch)), limits.min, limits.max);
}

/**
 * The own profile as the points of one pitch (see `ThreadProfilePoint`): crest, flank down, root,
 * flank up. The flank runs `depth * tan(angle / 2)` along the axis; what is left of the pitch is
 * shared equally by crest and root.
 */
export function customThreadProfile(pitch: number, depth: number, flankAngle: number): ThreadProfileSpecification {
  const run = Math.tan((normalizeThreadFlankAngle(flankAngle) * Math.PI) / 360);
  const flank = clamp((depth * run) / pitch, 0.001, MAX_FLANK_SHARE_PER_PITCH / 2);
  const flat = (1 - 2 * flank) / 2;
  return {
    depthPerPitch: depth / pitch,
    points: [
      { u: 0, level: 1 },
      { u: flat, level: 1 },
      { u: flat + flank, level: 0 },
      { u: 2 * flat + flank, level: 0 },
    ],
  };
}

export function normalizeThreadBoltClearance(value?: number) {
  return clamp(finite(value, DEFAULT_THREAD_BOLT_CLEARANCE), MIN_THREAD_BOLT_CLEARANCE, MAX_THREAD_BOLT_CLEARANCE);
}

/**
 * Die Fase an den Enden. Bei einem Innengewinde (Mutter, Gewindeloch) reicht
 * genau die Gewindetiefe: der Kegel laeuft unter 45 Grad bis auf den Kern
 * hinunter und entgratet die Muendung, ohne mehr vom Gewinde zu opfern als
 * noetig. Ein freies Gewindeende (Stange, Schraubenspitze) braucht mehr, um
 * beim Einfaedeln in ein Gegengewinde wirklich zu fuehren statt nur die
 * Kante zu brechen - eine volle Steigung, angelehnt an genormte
 * Schraubenspitzen (z. B. ISO 4753), reicht spuerbar unter den Kern und
 * druckt sich damit auch als richtiger Kegel statt als Messerkante.
 */
export function defaultThreadChamfer(pitch: number, profile: ThreadProfile = DEFAULT_THREAD_PROFILE, role: ThreadRole = DEFAULT_THREAD_ROLE) {
  if (role === "nut" || role === "bore") return pitch * threadProfileSpec(profile).depthPerPitch;
  return pitch;
}

export function threadChamferLimits(settings: Pick<ThreadSettings, "role" | "diameter" | "pitch">) {
  if (settings.role === "nut") {
    const spec = threadSizeSpec(settings.diameter, settings.pitch);
    // Die Ansenkung darf die Schluesselflaeche nicht durchbrechen.
    const room = Math.max(0, spec.acrossFlats / 2 - settings.diameter / 2) * 0.7;
    return { min: 0, max: Math.max(0.05, Math.min(settings.pitch * 3, room)) };
  }
  return { min: 0, max: Math.max(0.05, Math.min(settings.pitch * 3, settings.diameter / 3)) };
}

export function normalizeThreadChamfer(value: number | undefined, settings: Pick<ThreadSettings, "role" | "diameter" | "pitch" | "profile">) {
  const limits = threadChamferLimits(settings);
  return clamp(finite(value, defaultThreadChamfer(settings.pitch, settings.profile, settings.role)), limits.min, limits.max);
}

/**
 * Die Spaltenzahl bleibt durch sechs teilbar, damit die Ecken von
 * Sechskantkopf, Mutter und Innensechskant auf Stuetzpunkte fallen und die
 * Flaechen dazwischen wirklich eben sind.
 */
export function normalizeThreadQuality(value?: number) {
  const rounded = Math.round(clamp(finite(value, DEFAULT_THREAD_QUALITY), MIN_THREAD_QUALITY, MAX_THREAD_QUALITY) / 6) * 6;
  return clamp(rounded, MIN_THREAD_QUALITY, MAX_THREAD_QUALITY);
}

export type ThreadShapeFields = {
  threadRole?: ThreadRole;
  threadHead?: ThreadHead;
  threadHand?: ThreadHand;
  threadProfile?: ThreadProfile;
  threadDiameter?: number;
  threadPitch?: number;
  threadClearance?: number;
  threadBoltClearance?: number;
  threadAxialClearance?: number;
  threadDepth?: number;
  threadFlankAngle?: number;
  threadQuality?: number;
  threadHeadHeight?: number;
  threadChamfer?: number;
  threadChamferBottom?: number;
  threadHeadChamfer?: number;
};

export type ThreadSettings = {
  role: ThreadRole;
  head: ThreadHead;
  hand: ThreadHand;
  profile: ThreadProfile;
  diameter: number;
  pitch: number;
  clearance: number;
  boltClearance: number;
  /** Play along the axis for a nut or tapped hole, in mm (#256). */
  axialClearance: number;
  /** Own profile only: the depth in mm and the included flank angle in degrees. */
  depth: number;
  flankAngle: number;
  quality: number;
  headHeight: number;
  chamfer: number;
  /** The chamfer at the bottom end (a screw has none there: the head sits on it). */
  chamferLow: number;
  headChamfer: number;
};

export function threadSettings(shape: ThreadShapeFields): ThreadSettings {
  const diameter = normalizeThreadDiameter(shape.threadDiameter);
  const head: HeadShape = {
    role: normalizeThreadRole(shape.threadRole),
    head: normalizeThreadHead(shape.threadHead),
    diameter,
    pitch: normalizeThreadPitch(shape.threadPitch, diameter),
  };
  const profile = normalizeThreadProfile(shape.threadProfile);
  const headHeight = normalizeThreadHeadHeight(shape.threadHeadHeight, head);
  const chamferShape = { role: head.role, diameter: head.diameter, pitch: head.pitch, profile };
  const chamfer = normalizeThreadChamfer(shape.threadChamfer, chamferShape);
  // Without a value of its own the bottom end has what the top has, as it always did.
  const chamferLow = normalizeThreadChamfer(shape.threadChamferBottom ?? shape.threadChamfer, chamferShape);
  return {
    ...head,
    hand: normalizeThreadHand(shape.threadHand),
    profile,
    clearance: normalizeThreadClearance(shape.threadClearance),
    boltClearance: normalizeThreadBoltClearance(shape.threadBoltClearance),
    axialClearance: normalizeThreadAxialClearance(shape.threadAxialClearance, head.pitch),
    depth: normalizeThreadDepth(shape.threadDepth, head.pitch, head.diameter, shape.threadFlankAngle ?? DEFAULT_THREAD_FLANK_ANGLE),
    flankAngle: normalizeThreadFlankAngle(shape.threadFlankAngle),
    quality: normalizeThreadQuality(shape.threadQuality),
    headHeight,
    chamfer,
    chamferLow,
    // Die Aussenfase kennt ihre Grenze erst, wenn Kopfhoehe und Ansenkung
    // feststehen - bei der Mutter frisst die Ansenkung von innen mit.
    headChamfer: normalizeThreadHeadChamfer(shape.threadHeadChamfer, { ...head, headHeight, chamfer, chamferLow, profile }),
  };
}

/**
 * Innengewinde (Mutter, Gewindeloch) werden um ihr Spiel weiter, Aussengewinde
 * (Stange, Schraube) um ihr eigenes Bolzenspiel duenner - fuer einen gedruckten
 * Bolzen in einer Metallmutter, die selbst kein Spiel hat.
 */
function radialAllowance(settings: Pick<ThreadSettings, "role" | "clearance" | "boltClearance">) {
  return settings.role === "bore" || settings.role === "nut" ? settings.clearance / 2 : -settings.boltClearance / 2;
}

type HeadShape = Pick<ThreadSettings, "role" | "head" | "diameter" | "pitch">;

/** Die Kopfhoehe nach Norm, gemessen von der Aufstandsflaeche bis zum Schaftbeginn. */
export function defaultThreadHeadHeight(settings: HeadShape) {
  if (settings.role !== "screw") return 0;
  const spec = threadSizeSpec(settings.diameter, settings.pitch);
  if (settings.head === "countersunk") return (spec.countersunkDiameter - settings.diameter) / 2;
  if (settings.head === "hex") return spec.headHeight * 0.7;
  return spec.headHeight;
}

export function threadHeadHeightLimits(settings: HeadShape) {
  return { min: 0.2, max: Math.max(1, settings.diameter * 3) };
}

export function normalizeThreadHeadHeight(value: number | undefined, settings: HeadShape) {
  if (settings.role !== "screw") return 0;
  const limits = threadHeadHeightLimits(settings);
  return clamp(finite(value, defaultThreadHeadHeight(settings)), limits.min, limits.max);
}

/**
 * Der Senkkopf ist ein 90-Grad-Kegel, also haengen Durchmesser und Hoehe
 * aneinander: wer den Kopf flacher zieht, macht ihn zwangslaeufig kleiner.
 * Zylinder- und Sechskantkopf behalten ihren Durchmesser.
 */
export function threadHeadDiameter(settings: Pick<ThreadSettings, "role" | "head" | "diameter" | "pitch" | "headHeight">) {
  const spec = threadSizeSpec(settings.diameter, settings.pitch);
  if (settings.head === "countersunk") return settings.diameter + settings.headHeight * 2;
  return spec.headDiameter;
}

type HeadChamferShape = Pick<ThreadSettings, "role" | "head" | "diameter" | "pitch" | "headHeight" | "profile"> & { chamfer?: number; chamferLow?: number };

/**
 * Der Kopf steht auf seinem freien Ende. `inscribed` ist der kleinste Radius
 * seines Querschnitts - beim Sechskant die Schluesselflaeche -, `circumscribed`
 * der groesste. Beide Masse brauchen die Fase und ihre Grenze.
 */
function headRingRadii(settings: Pick<ThreadSettings, "role" | "head" | "diameter" | "pitch">) {
  const spec = threadSizeSpec(settings.diameter, settings.pitch);
  // Eine Mutter ist immer sechskantig - ihre Kopfform steht auf gar nichts.
  if (settings.role === "nut" || settings.head === "hex") {
    return { inscribed: spec.acrossFlats / 2, circumscribed: spec.acrossFlats / Math.sqrt(3) };
  }
  return { inscribed: spec.headDiameter / 2, circumscribed: spec.headDiameter / 2 };
}

/**
 * Die Hoehe, in der die beiden Fasenkegel Platz finden muessen. Beim
 * Schraubenkopf ist das seine eigene Hoehe, bei der Mutter die ganze - sie
 * *ist* ihr Kopf. Genommen wird das Normmass, nicht die eingestellte Hoehe:
 * `threadSettings` kennt die Hoehe des Koerpers nicht, und ein Regler, dessen
 * Hoechstwert die Pruefung danach doch wieder einfaengt, springt zurueck.
 */
function chamferRimHeight(settings: HeadChamferShape) {
  if (settings.role === "nut") return threadSizeSpec(settings.diameter, settings.pitch).nutHeight;
  return settings.headHeight;
}

/**
 * Die Fase am Schraubenkopf ist ein Kegel um die Achse: er beginnt an der
 * Kopfflaeche als Kreis und trifft die Flanke erst weiter innen. Beim
 * Sechskant faellt dieser Schnitt an den Ecken tiefer aus als an den
 * Schluesselflaechen - genau so sieht eine gedrehte Kopffase aus.
 *
 * **Gebrochen werden beide Kopfkanten**, die freie Flaeche und der Uebergang
 * zum Schaft. Nur die untere zu brechen hatte einen offensichtlichen Haken:
 * der Koerper steht auf seinem Kopf, also sieht man von der Fase nichts, und
 * ein Regler, der nichts sichtbar tut, gilt zu Recht als kaputt.
 *
 * Der Senkkopf bekommt keine: sein Kegel ist die Fase.
 */
export function threadHeadChamferLimits(settings: HeadChamferShape) {
  const gilt = settings.role === "nut" || (settings.role === "screw" && settings.head !== "countersunk");
  if (!gilt) return { min: 0, max: 0 };
  const spec = threadSizeSpec(settings.diameter, settings.pitch);
  const { inscribed, circumscribed } = headRingRadii(settings);
  // Was stehen bleiben muss: das Loch in der Mitte - beim Kopf der
  // Innensechskant und der Kragen um den Schaft, bei der Mutter ihre
  // Bohrung samt Ansenkung - und ein Rest Flanke zwischen den beiden Kegeln.
  const socketCorner = spec.socket / Math.sqrt(3);
  const innen = settings.role === "nut"
    ? settings.diameter / 2 + Math.max(normalizeThreadChamfer(settings.chamfer, settings), normalizeThreadChamfer(settings.chamferLow ?? settings.chamfer, settings))
    : Math.max(socketCorner, settings.diameter / 2);
  const roomToBore = Math.max(0, inscribed - innen - 0.2);
  const roomToHeight = Math.max(0, chamferRimHeight(settings) * 0.35 - (circumscribed - inscribed));
  return { min: 0, max: Math.max(0, Math.min(inscribed * 0.4, roomToBore, roomToHeight)) };
}

export function normalizeThreadHeadChamfer(value: number | undefined, settings: HeadChamferShape) {
  const limits = threadHeadChamferLimits(settings);
  // Ohne Angabe bleibt der Kopf scharfkantig - ein gespeichertes Projekt darf
  // sich beim Oeffnen nicht von selbst veraendern.
  return clamp(finite(value, 0), limits.min, limits.max);
}

/** Die Hoehe, mit der ein frisch gewaehlter Gewindetyp auf die Ebene kommt. */
export function threadNaturalHeight(settings: Pick<ThreadSettings, "role" | "head" | "diameter" | "pitch" | "headHeight">) {
  if (settings.role === "nut") return threadSizeSpec(settings.diameter, settings.pitch).nutHeight;
  if (settings.role === "screw") return settings.headHeight + settings.diameter * 4;
  if (settings.role === "bore") return settings.diameter * 3;
  return settings.diameter * 5;
}

/**
 * Der Platz, den der Koerper von oben einnimmt. Ein Sechskant ist nie
 * quadratisch: ueber die Ecken misst er mehr als ueber die Schluesselflaechen,
 * und genau das muss der Auswahlrahmen zeigen.
 */
export function threadNaturalFootprint(settings: ThreadSettings) {
  const spec = threadSizeSpec(settings.diameter, settings.pitch);
  const allowance = radialAllowance(settings);
  if (settings.role === "nut") {
    return { width: spec.acrossFlats / Math.cos(Math.PI / 6), depth: spec.acrossFlats };
  }
  if (settings.role === "screw") {
    if (settings.head === "hex") {
      return { width: spec.acrossFlats / Math.cos(Math.PI / 6), depth: spec.acrossFlats };
    }
    const diameter = Math.max(settings.diameter, threadHeadDiameter(settings));
    return { width: diameter, depth: diameter };
  }
  // Beim Gewindeloch weitet die Fase das Schneidwerkzeug am Mund auf; der
  // Rahmen muss diese Ansenkung mitzaehlen, sonst steht er im Koerper.
  const flare = settings.role === "bore" ? settings.chamfer * 2 : 0;
  const diameter = settings.diameter + allowance * 2 + flare;
  return { width: diameter, depth: diameter };
}

/**
 * Jedes Profil ist eine Punktfolge ueber eine Steigung: `u` in [0,1) ist die
 * axiale Lage, `level` 1 = Aussendurchmesser (Kuppe), 0 = Kerndurchmesser
 * (Grund). Zwischen den Punkten wird linear interpoliert, nach dem letzten
 * Punkt zurueck auf den ersten bei u=1 - das gilt fuer alle Profile,
 * weil jedes bei u=0 an der Kuppe beginnt.
 */
type ThreadProfilePoint = { u: number; level: number };
type ThreadProfileSpecification = {
  /** Gewindetiefe (Aussen- minus Kernradius) als Bruchteil der Steigung. */
  depthPerPitch: number;
  points: readonly ThreadProfilePoint[];
};

/** Wie fein das Profil dort abgetastet wird, wo der Fasenkegel es beschneidet. */
const CHAMFER_SUBDIVISIONS = 4;

// Ein metrisches Spitzgewinde ist ein gleichseitiges Dreieck mit der Steigung
// als Grundlinie, oben um H/8 und unten um H/4 gekappt. Ueber eine Steigung
// verteilt sich das auf Kuppenbreite P/8, Flanke 5P/16, Grundbreite P/4,
// Flanke 5P/16 - zusammen genau P. Tiefe: 5/8 der Dreieckshoehe H = P mal
// Wurzel(3)/2.
const V_PROFILE: ThreadProfileSpecification = {
  depthPerPitch: (5 / 8) * (Math.sqrt(3) / 2),
  points: [
    { u: 0, level: 1 },
    { u: 1 / 8, level: 1 },
    { u: 7 / 16, level: 0 },
    { u: 11 / 16, level: 0 },
  ],
};

// Trapezgewinde, an DIN 103 angenaehert: 30 Grad Flankenwinkel statt 60, dafuer
// eine ebene Kuppe und ein ebener Grund statt einer Spitze - genau das macht
// die Flanke fuer den 3D-Druck brauchbar, wie im Forum angemerkt. Tiefe knapp
// unter der halben Steigung, wie beim echten Trapezgewinde.
const TRAPEZOIDAL_PROFILE: ThreadProfileSpecification = {
  depthPerPitch: 0.4815,
  points: [
    { u: 0, level: 1 },
    { u: 0.366, level: 1 },
    { u: 0.5, level: 0 },
    { u: 0.866, level: 0 },
  ],
};

// Rundgewinde, an DIN 405 angenaehert: keine Flanke und keine Kante mehr,
// sondern eine Kosinuskurve ueber die ganze Steigung - an zwoelf Punkten
// abgetastet, genau wie ein Vieleck anderswo im Code einen Kreis annaehert.
// Die Tiefe bleibt bewusst flacher als bei den beiden anderen Profilen, weil
// die Rundung selbst schon Platz braucht.
const ROUND_PROFILE_SEGMENTS = 12;
const ROUND_PROFILE: ThreadProfileSpecification = {
  depthPerPitch: 0.3,
  points: Array.from({ length: ROUND_PROFILE_SEGMENTS }, (_, index) => {
    const u = index / ROUND_PROFILE_SEGMENTS;
    return { u, level: (1 + Math.cos(2 * Math.PI * u)) / 2 };
  }),
};

/*
 * Whitworth-Profil nach ISO 228-1 (und BS 84): 55 Grad Flankenwinkel, das
 * scharfe Dreieck hat die Hoehe H = P / (2 tan 27,5 Grad) = 0,960491 P. Oben
 * und unten ist je ein Sechstel davon abgenommen, also bleibt die Tiefe
 * h = 2/3 H = 0,640327 P. Kuppe und Grund sind mit demselben Radius gerundet,
 * der tangential in die Flanken laeuft; aus der Kappung H/6 folgt
 * r = (H/6) / (1/sin 27,5 Grad - 1) = 0,137329 P. Die Zahlen werden hier aus
 * dem Winkel gerechnet, ein Test haelt sie gegen die Werte der Norm.
 *
 * Jeder der beiden Boegen (je 125 Grad) wird mit acht Sehnen abgetastet. Die
 * groesste Abweichung vom Bogen ist r (1 - cos 7,8125 Grad) = 0,0013 P, bei
 * G1 (P = 2,309 mm) also 0,003 mm. Bei vier Sehnen waere die Abweichung noch
 * klein genug, aber zwei Sehnen stiessen unter 31 Grad aneinander, ueber der
 * Knickgrenze der Normalen (20 Grad): Kuppe und Grund saehen kantig aus statt
 * rund. Acht Sehnen stossen unter 15,6 Grad aneinander.
 */
const WHITWORTH_HALF_ANGLE = (27.5 * Math.PI) / 180;
const WHITWORTH_HEIGHT_PER_PITCH = 1 / (2 * Math.tan(WHITWORTH_HALF_ANGLE));
const WHITWORTH_DEPTH_PER_PITCH = (2 / 3) * WHITWORTH_HEIGHT_PER_PITCH;
const WHITWORTH_RADIUS_PER_PITCH = (WHITWORTH_HEIGHT_PER_PITCH / 6) / (1 / Math.sin(WHITWORTH_HALF_ANGLE) - 1);
const WHITWORTH_ARC_SEGMENTS = 8;

function whitworthProfile(): ThreadProfileSpecification {
  const depth = WHITWORTH_DEPTH_PER_PITCH;
  const radius = WHITWORTH_RADIUS_PER_PITCH;
  // Der Bogen endet dort, wo seine Tangente die Flanke ist: 90 - 27,5 Grad von der Mitte.
  const arcEnd = Math.PI / 2 - WHITWORTH_HALF_ANGLE;
  const step = (2 * arcEnd) / WHITWORTH_ARC_SEGMENTS;
  const half = WHITWORTH_ARC_SEGMENTS / 2;
  // Kuppe um u = 0 (und u = 1), Grund um u = 1/2; level = Hoehe / Tiefe.
  const crest = (angle: number) => ({ u: radius * Math.sin(angle), level: (depth - radius + radius * Math.cos(angle)) / depth });
  const root = (angle: number) => ({ u: 0.5 + radius * Math.sin(angle), level: (radius - radius * Math.cos(angle)) / depth });
  const points: ThreadProfilePoint[] = [];
  for (let index = 0; index <= half; index += 1) points.push(crest(index * step));
  for (let index = -half; index <= half; index += 1) points.push(root(index * step));
  for (let index = -half; index < 0; index += 1) {
    const point = crest(index * step);
    points.push({ u: 1 + point.u, level: point.level });
  }
  return { depthPerPitch: depth, points };
}

const WHITWORTH_PROFILE = whitworthProfile();

function threadProfileSpec(profile: ThreadProfile): ThreadProfileSpecification {
  if (profile === "trapezoidal") return TRAPEZOIDAL_PROFILE;
  if (profile === "round") return ROUND_PROFILE;
  if (profile === "whitworth") return WHITWORTH_PROFILE;
  return V_PROFILE;
}

function profileLevelAt(points: readonly ThreadProfilePoint[], u: number) {
  const phase = wrapUnit(u);
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = index + 1 < points.length ? points[index + 1] : { u: 1, level: points[0].level };
    if (phase <= end.u) {
      const span = end.u - start.u;
      return span > 0 ? start.level + (end.level - start.level) * ((phase - start.u) / span) : end.level;
    }
  }
  return points[0].level;
}

/**
 * The profile with every tooth of the solid `widthUnits` wider along the axis (#256): at each
 * place the level of the highest point within half that width to either side. Crests grow into
 * flat tops, flanks move out, and a root narrower than the width fills up. Used for the body a
 * nut or tapped hole is cut with: a wider cutter leaves a thinner tooth in the part.
 *
 * The result is exact at its corners (where a flank or crest of the old profile begins or
 * ends, moved by half the width either way) and refined where two moved flanks meet.
 */
export function widenThreadProfile(points: readonly ThreadProfilePoint[], widthUnits: number): ThreadProfilePoint[] {
  const half = widthUnits / 2;
  if (!(half > 0)) return points.map((point) => ({ ...point }));
  const level = (u: number) => {
    let best = Math.max(profileLevelAt(points, u - half), profileLevelAt(points, u + half));
    for (const point of points) {
      for (const turn of [-1, 0, 1]) {
        if (Math.abs(point.u + turn - u) <= half) best = Math.max(best, point.level);
      }
    }
    return best;
  };
  const known: number[] = [0];
  for (const point of points) {
    for (const shift of [0, -half, half]) known.push(wrapUnit(point.u + shift));
  }
  const breaks = known.sort((a, b) => a - b).filter((u, index, all) => index === 0 || u - all[index - 1] > 1e-9);
  const result: ThreadProfilePoint[] = [];
  const refine = (from: ThreadProfilePoint, toU: number, toLevel: number, depth: number) => {
    const middle = (from.u + toU) / 2;
    const expected = (from.level + toLevel) / 2;
    const actual = level(middle);
    if (depth < 8 && Math.abs(actual - expected) > 1e-4 && toU - from.u > 1e-6) {
      const point = { u: middle, level: actual };
      refine(from, middle, actual, depth + 1);
      result.push(point);
      refine(point, toU, toLevel, depth + 1);
    }
  };
  breaks.forEach((u, index) => {
    const point = { u, level: level(u) };
    result.push(point);
    const next = index + 1 < breaks.length ? { u: breaks[index + 1], level: level(breaks[index + 1]) } : { u: 1, level: level(0) };
    refine(point, next.u, next.level, 0);
  });
  // Drop corners that lie on the line between their neighbours; the first point stays, a profile starts at u = 0.
  return result.filter((point, index, all) => {
    if (index === 0) return true;
    const before = all[(index + all.length - 1) % all.length];
    const after = all[(index + 1) % all.length];
    const beforeU = index === 0 ? before.u - 1 : before.u;
    const afterU = index === all.length - 1 ? after.u + 1 : after.u;
    if (afterU - beforeU <= 0) return true;
    const along = before.level + (after.level - before.level) * ((point.u - beforeU) / (afterU - beforeU));
    return Math.abs(along - point.level) > 1e-6;
  });
}

/** Tiefe und Punktfolge eines Profils, fuer Tests und Auskunft. */
export function threadProfileShape(profile: ThreadProfile): Readonly<ThreadProfileSpecification> {
  return threadProfileSpec(profile);
}

/** Die Kennzahlen des Whitworth-Profils, in Steigungen. */
export const WHITWORTH_PROFILE_CONSTANTS = {
  flankAngleDegrees: 55,
  heightPerPitch: WHITWORTH_HEIGHT_PER_PITCH,
  depthPerPitch: WHITWORTH_DEPTH_PER_PITCH,
  radiusPerPitch: WHITWORTH_RADIUS_PER_PITCH,
} as const;

function wrapUnit(value: number) {
  return ((value % 1) + 1) % 1;
}

function profileRadius(u: number, major: number, minor: number, points: readonly ThreadProfilePoint[]) {
  const phase = wrapUnit(u);
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = index + 1 < points.length ? points[index + 1] : { u: 1, level: points[0].level };
    if (phase <= end.u) {
      const span = end.u - start.u;
      const fraction = span > 0 ? (phase - start.u) / span : 0;
      const level = start.level + (end.level - start.level) * fraction;
      return minor + (major - minor) * level;
    }
  }
  return major;
}

/** Der Radius eines Sechskants unter dem Winkel, Ecken auf Vielfachen von 60 Grad. */
function hexRadius(angle: number, acrossFlats: number) {
  const apothem = acrossFlats / 2;
  const sector = Math.PI / 3;
  return apothem / Math.cos(wrapUnit(angle / sector) * sector - sector / 2);
}

type Builder = { positions: number[]; indices: number[] };

function pushVertex(builder: Builder, angle: number, radius: number, y: number) {
  const index = builder.positions.length / 3;
  builder.positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  return index;
}

function pushCenter(builder: Builder, y: number) {
  const index = builder.positions.length / 3;
  builder.positions.push(0, y, 0);
  return index;
}

/** Entartete Dreiecke entstehen dort, wo das Gewinde an den Deckel stoesst; sie fliegen hier raus. */
function triangle(builder: Builder, a: number, b: number, c: number) {
  if (a === b || b === c || a === c) return;
  builder.indices.push(a, b, c);
}

function quad(builder: Builder, a: number, b: number, c: number, d: number) {
  triangle(builder, a, b, c);
  triangle(builder, a, c, d);
}

function ring(builder: Builder, angles: readonly number[], radiusAt: (angle: number, index: number) => number, y: number) {
  return angles.map((angle, index) => pushVertex(builder, angle, radiusAt(angle, index), y));
}

/** Mantelflaeche zwischen zwei Ringen; `inward` dreht die Sichtseite nach innen. */
function wall(builder: Builder, lower: readonly number[], upper: readonly number[], inward = false) {
  for (let index = 0; index < lower.length - 1; index += 1) {
    if (inward) quad(builder, lower[index], lower[index + 1], upper[index + 1], upper[index]);
    else quad(builder, lower[index], upper[index], upper[index + 1], lower[index + 1]);
  }
}

function capFan(builder: Builder, edge: readonly number[], y: number, up: boolean) {
  const center = pushCenter(builder, y);
  for (let index = 0; index < edge.length - 1; index += 1) {
    if (up) triangle(builder, center, edge[index + 1], edge[index]);
    else triangle(builder, center, edge[index], edge[index + 1]);
  }
}

function capRing(builder: Builder, inner: readonly number[], outer: readonly number[], up: boolean) {
  for (let index = 0; index < inner.length - 1; index += 1) {
    if (up) {
      triangle(builder, inner[index], outer[index + 1], outer[index]);
      triangle(builder, inner[index], inner[index + 1], outer[index + 1]);
    } else {
      triangle(builder, inner[index], outer[index], outer[index + 1]);
      triangle(builder, inner[index], outer[index + 1], inner[index + 1]);
    }
  }
}

/**
 * Die Gewindeflaeche selbst. Jede Spalte traegt dieselbe Folge von
 * Profilpunkten, nur um den Vorschub einer Teilumdrehung in der Hoehe
 * versetzt - dadurch verbindet Reihe zu Reihe genau die Wendel, und die Naht
 * bei 360 Grad faellt wieder auf den Anfang. Was ueber die Enden hinausragt,
 * faellt auf den Randpunkt derselben Spalte zusammen; die Deckel bleiben eben.
 */
function threadWall(
  builder: Builder,
  angles: readonly number[],
  bottomY: number,
  topY: number,
  major: number,
  minor: number,
  pitch: number,
  handSign: number,
  inward: boolean,
  limitRadius: (y: number, radius: number) => number,
  subdivisions: number,
  bandHeight: number,
  profilePoints: readonly ThreadProfilePoint[],
) {
  const profileRadii = profilePoints.map((point) => minor + (major - minor) * point.level);
  const turns = (topY - bottomY) / pitch;
  const firstTurn = -2;
  const lastTurn = Math.ceil(turns) + 1;
  const columns: number[][] = [];
  const bottomEdge: number[] = [];
  const topEdge: number[] = [];

  for (let column = 0; column < angles.length; column += 1) {
    const angle = angles[column];
    const advance = handSign * (column / (angles.length - 1)) * pitch;
    const bottomRadius = limitRadius(bottomY, profileRadius(-advance / pitch, major, minor, profilePoints));
    const topRadius = limitRadius(topY, profileRadius((topY - bottomY - advance) / pitch, major, minor, profilePoints));
    const bottomVertex = pushVertex(builder, angle, bottomRadius, bottomY);
    const topVertex = pushVertex(builder, angle, topRadius, topY);
    const rows: number[] = [bottomVertex];
    for (let turn = firstTurn; turn <= lastTurn; turn += 1) {
      for (let step = 0; step < profilePoints.length; step += 1) {
        const nextIndex = step + 1;
        const uStart = profilePoints[step].u;
        const uEnd = nextIndex < profilePoints.length ? profilePoints[nextIndex].u : 1;
        const rStart = profileRadii[step];
        const rEnd = nextIndex < profilePoints.length ? profileRadii[nextIndex] : major;
        const segmentY = bottomY + advance + (turn + uStart) * pitch;
        /*
         * Feiner abgetastet wird nur dort, wo der Fasenkegel das Profil
         * beschneidet. Entschieden wird das an der Hoehe des Abschnitts, nicht
         * an der Nummer des Gangs: die Naht bei 360 Grad trifft denselben
         * Abschnitt einen Gang weiter oben, und nur ueber die Hoehe faellt
         * dort dieselbe Entscheidung. Ausserhalb des Bandes wird derselbe
         * Punkt mehrfach eingetragen, damit jede Spalte gleich viele Reihen
         * behaelt - die entarteten Dreiecke daraus fallen beim Verbinden raus.
         */
        // Gerundet, weil beide Seiten der Naht dieselbe Hoehe auf verschiedenem
        // Weg ausrechnen: Liegt sie genau auf der Bandgrenze, kippte sonst die
        // letzte Stelle die Entscheidung nur auf einer Seite - ein T-Stoss.
        const fromBottom = Math.round((segmentY - bottomY) * 1e6) / 1e6;
        const fromTop = Math.round((topY - segmentY) * 1e6) / 1e6;
        const dense = bandHeight > 0 && (fromBottom < bandHeight || fromTop < bandHeight);
        let firstOfSegment = -1;
        for (let sub = 0; sub < subdivisions; sub += 1) {
          if (!dense && sub > 0) {
            rows.push(firstOfSegment);
            continue;
          }
          const fraction = sub / subdivisions;
          const y = bottomY + advance + (turn + uStart + (uEnd - uStart) * fraction) * pitch;
          const vertex = y <= bottomY
            ? bottomVertex
            : y >= topY
              ? topVertex
              : pushVertex(builder, angle, limitRadius(y, rStart + (rEnd - rStart) * fraction), y);
          if (sub === 0) firstOfSegment = vertex;
          rows.push(vertex);
        }
      }
    }
    rows.push(topVertex);
    columns.push(rows);
    bottomEdge.push(bottomVertex);
    topEdge.push(topVertex);
  }

  for (let column = 0; column < columns.length - 1; column += 1) {
    const here = columns[column];
    const next = columns[column + 1];
    for (let row = 0; row < here.length - 1; row += 1) {
      if (inward) quad(builder, here[row], next[row], next[row + 1], here[row + 1]);
      else quad(builder, here[row], here[row + 1], next[row + 1], next[row]);
    }
  }

  return { bottomEdge, topEdge };
}

export type ThreadFootprintPatch = ThreadShapeFields & { width: number; depth: number };

/**
 * Breite und Tiefe gehoeren beim Gewinde dem Durchmesser, nicht umgekehrt. Ein
 * Zug am Anfasser im Arbeitsbereich schreibt aber direkt in Breite und Tiefe -
 * deshalb wird er hier in einen gleichmaessigen Massstab zurueckgerechnet und
 * wandert in Durchmesser, Steigung und Kopfhoehe. So bleibt das Gewinde rund,
 * ein ovales kann gar nicht erst entstehen, und der Auswahlrahmen sitzt wieder
 * genau auf dem Koerper.
 */
export function threadFootprintPatch(shape: ThreadShapeFields & { width?: number; depth?: number }): ThreadFootprintPatch {
  const settings = threadSettings(shape);
  const natural = threadNaturalFootprint(settings);
  const widthFactor = Number.isFinite(shape.width) && (shape.width as number) > 0 ? (shape.width as number) / natural.width : 1;
  const depthFactor = Number.isFinite(shape.depth) && (shape.depth as number) > 0 ? (shape.depth as number) / natural.depth : 1;
  const drift = Math.max(Math.abs(widthFactor - 1), Math.abs(depthFactor - 1));
  const scaled = drift < 1e-6 ? settings : (() => {
    const factor = Math.max(0.01, (widthFactor + depthFactor) / 2);
    const diameter = normalizeThreadDiameter(settings.diameter * factor);
    const pitch = normalizeThreadPitch(settings.pitch * factor, diameter);
    const head: HeadShape = { role: settings.role, head: settings.head, diameter, pitch };
    const headHeight = normalizeThreadHeadHeight(settings.headHeight * factor, head);
    const chamfer = normalizeThreadChamfer(settings.chamfer * factor, { role: head.role, diameter: head.diameter, pitch: head.pitch, profile: settings.profile });
    const chamferLow = normalizeThreadChamfer(settings.chamferLow * factor, { role: head.role, diameter: head.diameter, pitch: head.pitch, profile: settings.profile });
    return {
      ...settings,
      diameter,
      pitch,
      axialClearance: normalizeThreadAxialClearance(settings.axialClearance, pitch),
      depth: normalizeThreadDepth(settings.depth * factor, pitch, diameter, settings.flankAngle),
      headHeight,
      chamfer,
      chamferLow,
      headChamfer: normalizeThreadHeadChamfer(settings.headChamfer * factor, { ...head, headHeight, chamfer, chamferLow, profile: settings.profile }),
    };
  })();
  const footprint = drift < 1e-6 ? natural : threadNaturalFootprint(scaled);
  return {
    width: footprint.width,
    depth: footprint.depth,
    threadRole: scaled.role,
    threadHead: scaled.head,
    threadHand: scaled.hand,
    threadProfile: scaled.profile,
    threadDiameter: scaled.diameter,
    threadPitch: scaled.pitch,
    threadClearance: scaled.clearance,
    threadBoltClearance: scaled.boltClearance,
    threadAxialClearance: scaled.axialClearance,
    threadDepth: scaled.depth,
    threadFlankAngle: scaled.flankAngle,
    threadQuality: scaled.quality,
    threadHeadHeight: scaled.headHeight,
    threadChamfer: scaled.chamfer,
    threadChamferBottom: scaled.chamferLow,
    threadHeadChamfer: scaled.headChamfer,
  };
}

export type ThreadGeometryOptions = ThreadShapeFields & {
  width: number;
  depth: number;
  height: number;
};

/**
 * Every measure the thread body is built from, worked out once from the
 * shape: the display mesh below and the exact CAD body
 * (`cadModifierThreadForShape`, `threadSolid.ts`) both take them from here,
 * so the two cannot drift apart.
 */
export function threadBuildPlan(options: ThreadGeometryOptions) {
  const settings = threadSettings(options);
  const height = Math.max(0.05, options.height);
  const spec = threadSizeSpec(settings.diameter, settings.pitch);
  const allowance = radialAllowance(settings);
  const baseProfile = settings.profile === "custom" ? customThreadProfile(settings.pitch, settings.depth, settings.flankAngle) : threadProfileSpec(settings.profile);
  // A nut or tapped hole is cut with a body whose teeth are wider along the axis by the play (#256).
  const axialPlay = (settings.role === "bore" || settings.role === "nut") && settings.axialClearance > 1e-6;
  const profile = axialPlay
    ? { depthPerPitch: baseProfile.depthPerPitch, points: widenThreadProfile(baseProfile.points, settings.axialClearance / settings.pitch) }
    : baseProfile;
  const major = settings.diameter / 2 + allowance;
  const minor = Math.max(0.02, major - settings.pitch * profile.depthPerPitch);
  // Mit +1 steigt die Wendel, wenn der Winkel von +x nach +z waechst - um die
  // Hochachse +y ist das linksherum. Ein Rechtsgewinde laeuft also mit -1.
  const handSign = settings.hand === "left" ? 1 : -1;

  const headHeight = Math.min(height * 0.9, settings.headHeight);
  const shaftBottom = settings.role === "screw" ? headHeight : 0;
  const chamfer = Math.min(settings.chamfer, (height - shaftBottom) * 0.45);
  const chamferLow = Math.min(settings.chamferLow, (height - shaftBottom) * 0.45);
  // Am Schraubenkopf gibt es nichts zu brechen; dort sitzt der Kopf.
  const chamferBottom = settings.role !== "screw";
  // Nach innen geschnittene Gewinde bekommen die Fase andersherum: dort muss
  // der Werkzeugkoerper weiter werden, nicht schmaler.
  const inward = settings.role === "bore" || settings.role === "nut";

  /*
   * Die Aussenfase: zwei Kegel um die Achse, einer an jedem Ende. Jeder
   * beginnt an der Stirnflaeche als Kreis vom Radius `faceRadius` und geht mit
   * 45 Grad auf, bis er die Flanke trifft - beim Sechskant an den Ecken tiefer
   * als an den Schluesselflaechen, genau wie eine gedrehte Fase. Die Grenze
   * rechnet mit dem Normmass; hier steht die wirkliche Hoehe, also wird noch
   * einmal nachgeschnitten, falls jemand den Koerper flacher gezogen hat.
   */
  const rimRadii = headRingRadii(settings);
  const rimRoom = Math.max(0, height * 0.35 - (rimRadii.circumscribed - rimRadii.inscribed));
  const rimChamfer = Math.min(settings.headChamfer, rimRoom);
  // Dieselbe Fase wie an der Mutter, nur in der Hoehe des Kopfes.
  const headRoom = Math.max(0, headHeight * 0.35 - (rimRadii.circumscribed - rimRadii.inscribed));
  const headChamfer = Math.min(settings.headChamfer, headRoom);
  // Der Innensechskant sitzt in der freien Kopfflaeche. Der Sechskantkopf
  // bekommt keinen: den fasst man von aussen an.
  const socketDepth = settings.head === "hex" ? 0 : Math.min(headHeight * 0.6, settings.diameter * 0.55);
  const natural = threadNaturalFootprint(settings);
  return {
    settings,
    height,
    spec,
    profile,
    axialPlay,
    major,
    minor,
    handSign,
    headHeight,
    shaftBottom,
    chamfer,
    chamferLow,
    chamferBottom,
    inward,
    rimRadii,
    rimChamfer,
    rimBroken: rimChamfer > 0.001,
    rimFaceRadius: rimRadii.inscribed - rimChamfer,
    headChamfer,
    headBroken: headChamfer > 0.001,
    headFaceRadius: rimRadii.inscribed - headChamfer,
    headCrown: threadHeadDiameter(settings) / 2,
    socketDepth,
    hasSocket: socketDepth > 0.05,
    scaleX: Math.max(0.01, options.width) / Math.max(Number.EPSILON, natural.width),
    scaleZ: Math.max(0.01, options.depth) / Math.max(Number.EPSILON, natural.depth),
  };
}

export function createThreadGeometry(options: ThreadGeometryOptions) {
  const plan = threadBuildPlan(options);
  const { settings, height, spec, profile, major, minor, handSign, headHeight, shaftBottom, chamfer, chamferLow, chamferBottom, inward } = plan;
  // Any chamfer above zero counts, however small: a zero-width cone leaves the mouth exactly as wide as the outer diameter (forum, 14.10.2026).
  const lowBroken = chamferBottom && chamferLow > 0;
  const topBroken = chamfer > 0;
  // A cone at a mouth of an inside thread goes on, at 45 degrees, down to the core: it ends where
  // it has cut the crests away, not on a ledge at the outer diameter (#269).
  const reach = major - minor;
  const limitRadius = !lowBroken && !topBroken
    ? (_y: number, radius: number) => radius
    : inward
      ? (y: number, radius: number) => {
        const fromBottom = lowBroken ? chamferLow - (y - shaftBottom) : -Infinity;
        const fromTop = topBroken ? chamfer - (height - y) : -Infinity;
        const cut = Math.max(fromBottom, fromTop);
        return cut <= -reach ? radius : Math.max(radius, major + cut);
      }
      : (y: number, radius: number) => {
        const fromBottom = lowBroken ? chamferLow - (y - shaftBottom) : 0;
        const fromTop = topBroken ? chamfer - (height - y) : 0;
        const cut = Math.max(0, fromBottom, fromTop);
        if (cut <= 0) return radius;
        return Math.min(radius, Math.max(0.05, major - cut));
      };
  const spanTurns = Math.ceil((height - shaftBottom) / settings.pitch) + 4;
  const bandHeight = !lowBroken && !topBroken ? 0 : Math.max(topBroken ? chamfer : 0, lowBroken ? chamferLow : 0) + settings.pitch;
  const subdivisions = bandHeight > 0 ? CHAMFER_SUBDIVISIONS : 1;
  const denseSpan = Math.min(spanTurns, Math.ceil(bandHeight / settings.pitch) * 2 + 2);
  const pointsPerTurn = profile.points.length;
  const rows = ((spanTurns - denseSpan) * pointsPerTurn + denseSpan * pointsPerTurn * subdivisions) + 2;
  const requested = normalizeThreadQuality(settings.quality);
  const affordable = Math.floor(MAX_THREAD_VERTICES / Math.max(1, rows) / 6) * 6;
  const segments = clamp(Math.min(requested, affordable), MIN_THREAD_QUALITY, MAX_THREAD_QUALITY);
  // Die letzte Spalte liegt wieder bei null statt bei zwei Pi: sonst weicht
  // ihr Sinus um ein Rechenkorn ab und die Naht klafft, wenn auch nur um
  // ein Zehnbillionstel Millimeter.
  const angles = Array.from({ length: segments + 1 }, (_, index) => ((index % segments) / segments) * Math.PI * 2);

  const builder: Builder = { positions: [], indices: [] };

  const { rimBroken, rimFaceRadius } = plan;

  if (settings.role === "nut") {
    const outerRadiusAt = (angle: number) => hexRadius(angle, spec.acrossFlats);
    const outerBottom = rimBroken
      ? ring(builder, angles, () => rimFaceRadius, 0)
      : ring(builder, angles, outerRadiusAt, 0);
    const outerTop = rimBroken
      ? ring(builder, angles, () => rimFaceRadius, height)
      : ring(builder, angles, outerRadiusAt, height);
    if (rimBroken) {
      const flankeUnten = angles.map((angle) => pushVertex(builder, angle, outerRadiusAt(angle), outerRadiusAt(angle) - rimFaceRadius));
      const flankeOben = angles.map((angle) => pushVertex(builder, angle, outerRadiusAt(angle), height - (outerRadiusAt(angle) - rimFaceRadius)));
      wall(builder, outerBottom, flankeUnten);
      wall(builder, flankeUnten, flankeOben);
      wall(builder, flankeOben, outerTop);
    } else {
      wall(builder, outerBottom, outerTop);
    }
    const bore = threadWall(builder, angles, 0, height, major, minor, settings.pitch, handSign, true, limitRadius, subdivisions, bandHeight, profile.points);
    capRing(builder, bore.bottomEdge, outerBottom, false);
    capRing(builder, bore.topEdge, outerTop, true);
  } else if (settings.role === "screw") {
    const shaft = threadWall(builder, angles, shaftBottom, height, major, minor, settings.pitch, handSign, false, limitRadius, subdivisions, bandHeight, profile.points);
    capFan(builder, shaft.topEdge, height, true);

    const headRadiusAt = (angle: number, y: number) => {
      if (settings.head === "hex") return hexRadius(angle, spec.acrossFlats);
      if (settings.head === "countersunk") {
        const progress = headHeight > 0 ? y / headHeight : 1;
        const crown = plan.headCrown;
        return crown + (settings.diameter / 2 - crown) * progress;
      }
      return spec.headDiameter / 2;
    };
    const gebrochen = plan.headBroken;
    const faceRadius = plan.headFaceRadius;
    const headBottom = gebrochen
      ? ring(builder, angles, () => faceRadius, 0)
      : ring(builder, angles, (angle) => headRadiusAt(angle, 0), 0);
    const headTop = gebrochen
      ? ring(builder, angles, () => faceRadius, headHeight)
      : ring(builder, angles, (angle) => headRadiusAt(angle, headHeight), headHeight);
    if (gebrochen) {
      const flankeUnten = angles.map((angle) => {
        const flankRadius = headRadiusAt(angle, 0);
        return pushVertex(builder, angle, flankRadius, flankRadius - faceRadius);
      });
      const flankeOben = angles.map((angle) => {
        const flankRadius = headRadiusAt(angle, headHeight);
        return pushVertex(builder, angle, flankRadius, headHeight - (flankRadius - faceRadius));
      });
      wall(builder, headBottom, flankeUnten);
      wall(builder, flankeUnten, flankeOben);
      wall(builder, flankeOben, headTop);
    } else {
      wall(builder, headBottom, headTop);
    }
    capRing(builder, shaft.bottomEdge, headTop, true);

    const socketDepth = plan.socketDepth;
    if (plan.hasSocket) {
      const socketMouth = ring(builder, angles, (angle) => hexRadius(angle, spec.socket), 0);
      const socketFloor = ring(builder, angles, (angle) => hexRadius(angle, spec.socket), socketDepth);
      capRing(builder, socketMouth, headBottom, false);
      wall(builder, socketMouth, socketFloor, true);
      capFan(builder, socketFloor, socketDepth, false);
    } else {
      capFan(builder, headBottom, 0, false);
    }
  } else {
    const rod = threadWall(builder, angles, 0, height, major, minor, settings.pitch, handSign, false, limitRadius, subdivisions, bandHeight, profile.points);
    capFan(builder, rod.bottomEdge, 0, false);
    capFan(builder, rod.topEdge, height, true);
  }

  const { scaleX, scaleZ } = plan;
  if (scaleX !== 1 || scaleZ !== 1) {
    for (let offset = 0; offset < builder.positions.length; offset += 3) {
      builder.positions[offset] *= scaleX;
      builder.positions[offset + 2] *= scaleZ;
    }
  }

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(builder.positions, 3));
  indexed.setIndex(builder.indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(20));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}
