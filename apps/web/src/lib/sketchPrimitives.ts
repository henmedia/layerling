import type { SketchPoint, SketchSegment } from "@/types/layerling";

/**
 * Die fertigen Formen, die sich in eine Skizze legen lassen.
 *
 * Sie entstehen als ganz gewoehnliche Punkte und Kanten - genau das, was auch
 * von Hand gezeichnet wird. Danach ist an ihnen nichts Besonderes mehr: jeder
 * Punkt laesst sich anfassen, jede Kante teilen. Ein Kreis, den man nicht mehr
 * verformen kann, waere in einer Skizze wenig wert.
 */
export type SketchPrimitive =
  | "rectangle"
  | "circle"
  | "ellipse"
  | "halfCircle"
  | "pieSlice"
  | "triangle"
  | "hexagon"
  | "polygon"
  | "star"
  | "boltCircle";

export const SKETCH_PRIMITIVES: readonly SketchPrimitive[] = [
  "rectangle",
  "circle",
  "ellipse",
  "halfCircle",
  "pieSlice",
  "triangle",
  "hexagon",
  "polygon",
  "star",
  "boltCircle",
];

/**
 * Was sich an Vieleck und Stern vor dem Einfuegen einstellen laesst (#280): die Seiten- bzw.
 * Zackenzahl und beim Stern, wie weit die Taeler nach innen reichen (in Prozent des Aussenradius).
 * Danach sind es ganz gewoehnliche Eckpunkte, die Zahl steht nirgends mehr.
 */
export type SketchPrimitiveOptions = {
  sides?: number;
  innerPercent?: number;
  /** Nur beim Rechteck: seine Tiefe entlang z, wenn sie von der Breite (`size`) abweicht (#1048). */
  depth?: number;
};
export const SKETCH_POLYGON_DEFAULT_SIDES = 5;
export const SKETCH_POLYGON_MIN_SIDES = 3;
export const SKETCH_POLYGON_MAX_SIDES = 64;
export const SKETCH_STAR_DEFAULT_INNER_PERCENT = 40;
export const SKETCH_STAR_MIN_INNER_PERCENT = 10;
export const SKETCH_STAR_MAX_INNER_PERCENT = 90;

export function normalizePolygonSides(value: unknown): number {
  const sides = Math.round(Number(value));
  if (!Number.isFinite(sides)) return SKETCH_POLYGON_DEFAULT_SIDES;
  return Math.max(SKETCH_POLYGON_MIN_SIDES, Math.min(SKETCH_POLYGON_MAX_SIDES, sides));
}

export function normalizeStarInnerPercent(value: unknown): number {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return SKETCH_STAR_DEFAULT_INNER_PERCENT;
  return Math.max(SKETCH_STAR_MIN_INNER_PERCENT, Math.min(SKETCH_STAR_MAX_INNER_PERCENT, percent));
}

export function isSketchPrimitive(value: unknown): value is SketchPrimitive {
  return typeof value === "string" && (SKETCH_PRIMITIVES as readonly string[]).includes(value);
}

/**
 * Wie weit der Griff eines Bezierbogens reichen muss, damit ein Viertelkreis
 * herauskommt. Der Bogen liegt damit auf vier Nachkommastellen genau auf dem
 * echten Kreis - naeher kommt man mit vier Stuetzpunkten nicht heran.
 */
const KAPPA = 0.5522847498307936;

/** Die Kantenlaenge, mit der eine neu eingefuegte Form beginnt. */
export const SKETCH_PRIMITIVE_SIZE = 20;

const positiveSize = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;

/**
 * Womit eine Form in der Skizze beginnt (#1048): Das Rechteck nimmt Breite und Tiefe, die in den
 * Formvorgaben fuer den Quader stehen, Kreis und Ellipse die Breite des Zylinders als Durchmesser.
 * Die uebrigen Formen haben in der Bibliothek kein Gegenstueck und bleiben bei SKETCH_PRIMITIVE_SIZE,
 * ebenso alles, wofuer keine Vorgabe eingetragen ist.
 */
export function sketchPrimitiveStartSize(
  primitive: SketchPrimitive,
  defaults: Partial<Record<string, { width?: number; depth?: number }>>,
): { size: number; depth?: number } {
  if (primitive === "rectangle") {
    const box = defaults.box ?? {};
    const width = positiveSize(box.width) ?? SKETCH_PRIMITIVE_SIZE;
    const depth = positiveSize(box.depth) ?? SKETCH_PRIMITIVE_SIZE;
    return depth === width ? { size: width } : { size: width, depth };
  }
  if (primitive === "circle" || primitive === "ellipse") {
    const cylinder = defaults.cylinder ?? {};
    return { size: positiveSize(cylinder.width) ?? positiveSize(cylinder.depth) ?? SKETCH_PRIMITIVE_SIZE };
  }
  return { size: SKETCH_PRIMITIVE_SIZE };
}

export type SketchPrimitiveGeometry = { points: SketchPoint[]; segments: SketchSegment[] };
type MakeId = (prefix: string) => string;

/**
 * Die vier Stuetzpunkte einer geschlossenen Ellipse, im Uhrzeigersinn ab
 * rechts. Ein Kreis ist davon nur der Fall `rx === rz`, deshalb teilen sich
 * beide diese Funktion - sonst stuenden zwei Beschreibungen derselben Kurve
 * nebeneinander und nur eine wuerde gepflegt.
 */
function ellipsePoints(makeId: MakeId, cx: number, cz: number, rx: number, rz: number): SketchPoint[] {
  const hx = KAPPA * rx;
  const hz = KAPPA * rz;
  return [
    {
      id: makeId("sketch-point"), x: cx + rx, z: cz, mode: "smooth",
      handleIn: { x: cx + rx, z: cz - hz },
      handleOut: { x: cx + rx, z: cz + hz },
    },
    {
      id: makeId("sketch-point"), x: cx, z: cz + rz, mode: "smooth",
      handleIn: { x: cx + hx, z: cz + rz },
      handleOut: { x: cx - hx, z: cz + rz },
    },
    {
      id: makeId("sketch-point"), x: cx - rx, z: cz, mode: "smooth",
      handleIn: { x: cx - rx, z: cz + hz },
      handleOut: { x: cx - rx, z: cz - hz },
    },
    {
      id: makeId("sketch-point"), x: cx, z: cz - rz, mode: "smooth",
      handleIn: { x: cx - hx, z: cz - rz },
      handleOut: { x: cx + hx, z: cz - rz },
    },
  ];
}

/** Verbindet die Punkte der Reihe nach zu einem geschlossenen Zug. */
function closedLoop(makeId: MakeId, points: SketchPoint[], kind: SketchSegment["kind"]): SketchSegment[] {
  return points.map((point, index) => ({
    id: makeId("sketch-segment"),
    startId: point.id,
    endId: points[(index + 1) % points.length]!.id,
    kind,
  }));
}

/**
 * Der Halbkreis: Durchmesser waagerecht, Bogen darueber, und die Gerade
 * schliesst ihn. Eine Skizze wird nur extrudiert, wenn ihr Umriss geschlossen
 * ist - ein blosser Bogen waere hier also nichts, womit sich weiterarbeiten
 * liesse. Die beiden Enden sind Ecken: Dort trifft die Gerade im rechten
 * Winkel auf den Bogen, und das soll sie auch nach dem Verschieben noch.
 */
function halfCircleGeometry(makeId: MakeId, cx: number, cz: number, radius: number): SketchPrimitiveGeometry {
  const flatZ = cz + radius / 2;
  const topZ = flatZ - radius;
  const reach = KAPPA * radius;
  const rechts: SketchPoint = {
    id: makeId("sketch-point"), x: cx + radius, z: flatZ, mode: "corner",
    handleOut: { x: cx + radius, z: flatZ - reach },
  };
  const scheitel: SketchPoint = {
    id: makeId("sketch-point"), x: cx, z: topZ, mode: "smooth",
    handleIn: { x: cx + reach, z: topZ },
    handleOut: { x: cx - reach, z: topZ },
  };
  const links: SketchPoint = {
    id: makeId("sketch-point"), x: cx - radius, z: flatZ, mode: "corner",
    handleIn: { x: cx - radius, z: flatZ - reach },
  };
  const points = [rechts, scheitel, links];
  return {
    points,
    segments: [
      { id: makeId("sketch-segment"), startId: rechts.id, endId: scheitel.id, kind: "bezier" },
      { id: makeId("sketch-segment"), startId: scheitel.id, endId: links.id, kind: "bezier" },
      { id: makeId("sketch-segment"), startId: links.id, endId: rechts.id, kind: "line" },
    ],
  };
}

/**
 * Das Tortenstueck: ein Viertel des Kreises, den `circle` zeichnet, aus einem
 * Bogen und zwei Halbmessern. Ein Viertel, weil ein einzelner Bezierbogen
 * genau so weit traegt - alles darueber braeuchte einen zweiten und saehe
 * trotzdem nur nach demselben aus. Wer ein schmaleres Stueck will, zieht den
 * Bogen nach; dafuer ist er aus gewoehnlichen Punkten gebaut.
 *
 * Die Spitze liegt links unten, der Bogen spannt sich nach rechts oben, und
 * das Ganze steht mittig auf dem Einfuegepunkt wie jede andere Form auch.
 */
function pieSliceGeometry(makeId: MakeId, cx: number, cz: number, radius: number): SketchPrimitiveGeometry {
  const spitzeX = cx - radius / 2;
  const spitzeZ = cz + radius / 2;
  const reach = KAPPA * radius;
  const rechts: SketchPoint = {
    id: makeId("sketch-point"), x: spitzeX + radius, z: spitzeZ, mode: "corner",
    handleIn: { x: spitzeX + radius, z: spitzeZ - reach },
  };
  const oben: SketchPoint = {
    id: makeId("sketch-point"), x: spitzeX, z: spitzeZ - radius, mode: "corner",
    handleOut: { x: spitzeX + reach, z: spitzeZ - radius },
  };
  const spitze: SketchPoint = { id: makeId("sketch-point"), x: spitzeX, z: spitzeZ, mode: "corner" };
  return {
    points: [rechts, oben, spitze],
    segments: [
      { id: makeId("sketch-segment"), startId: oben.id, endId: rechts.id, kind: "bezier" },
      { id: makeId("sketch-segment"), startId: rechts.id, endId: spitze.id, kind: "line" },
      { id: makeId("sketch-segment"), startId: spitze.id, endId: oben.id, kind: "line" },
    ],
  };
}

/** Wie viele Bohrungen ein Lochkreis mitbringt und wie gross sie sind. */
export const BOLT_CIRCLE_HOLES = 6;
const BOLT_CIRCLE_PITCH = 0.65;
const BOLT_CIRCLE_HOLE = 0.15;

/**
 * Der Lochkreis: eine runde Scheibe und sechs Bohrungen darin, gleichmaessig
 * auf einem Teilkreis verteilt.
 *
 * Dass daraus wirklich Loecher werden, entscheidet die Skizze selbst - sie
 * zaehlt, wie tief ein geschlossener Umriss in anderen steckt, und was ungerade
 * tief liegt, wird ausgespart (`lib/sketchCadProfile.ts`). Deshalb muss die
 * Scheibe mitkommen: Sechs Kreise allein laegen nebeneinander und ergaeben beim
 * Extrudieren sechs Saeulen statt eines gelochten Tellers. Wer die Bohrungen in
 * einen eigenen Umriss setzen will, loescht den aeusseren Kreis - er ist ein
 * gewoehnlicher Zug wie jeder andere.
 *
 * Die Masse bei der Vorgabegroesse: Scheibe 20 durchmessend, Teilkreis 13,
 * Bohrungen 3 - also Platz fuer eine M3-Schraube.
 */
function boltCircleGeometry(makeId: MakeId, cx: number, cz: number, radius: number): SketchPrimitiveGeometry {
  const points: SketchPoint[] = [];
  const segments: SketchSegment[] = [];

  const scheibe = ellipsePoints(makeId, cx, cz, radius, radius);
  points.push(...scheibe);
  segments.push(...closedLoop(makeId, scheibe, "bezier"));

  const teilkreis = radius * BOLT_CIRCLE_PITCH;
  const bohrung = radius * BOLT_CIRCLE_HOLE;
  for (let index = 0; index < BOLT_CIRCLE_HOLES; index += 1) {
    // Die erste Bohrung sitzt oben, damit der Kreis symmetrisch zur Mittellinie
    // steht - so liegt er, wie man ihn auf einer Zeichnung bemasst.
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / BOLT_CIRCLE_HOLES;
    const loch = ellipsePoints(
      makeId,
      cx + Math.cos(angle) * teilkreis,
      cz + Math.sin(angle) * teilkreis,
      bohrung,
      bohrung,
    );
    points.push(...loch);
    segments.push(...closedLoop(makeId, loch, "bezier"));
  }

  return { points, segments };
}

/**
 * Baut eine Form um `center`. `makeId` kommt von aussen, damit sich das hier
 * ohne Browser pruefen laesst.
 */
export function sketchPrimitiveGeometry(
  primitive: SketchPrimitive,
  center: { x: number; z: number },
  makeId: MakeId,
  size = SKETCH_PRIMITIVE_SIZE,
  options: SketchPrimitiveOptions = {},
): SketchPrimitiveGeometry {
  const cx = center.x;
  const cz = center.z;
  const radius = size / 2;

  if (primitive === "circle" || primitive === "ellipse") {
    // Das Oval ist halb so hoch wie breit - flach genug, dass man es auf einen
    // Blick vom Kreis unterscheidet, ohne dass es zum Strich wird.
    const points = ellipsePoints(makeId, cx, cz, radius, primitive === "ellipse" ? radius / 2 : radius);
    return { points, segments: closedLoop(makeId, points, "bezier") };
  }

  if (primitive === "halfCircle") return halfCircleGeometry(makeId, cx, cz, radius);
  if (primitive === "pieSlice") return pieSliceGeometry(makeId, cx, cz, radius);
  if (primitive === "boltCircle") return boltCircleGeometry(makeId, cx, cz, radius);

  if (primitive === "polygon" || primitive === "star") {
    // Eine Ecke zeigt nach oben, wie beim Dreieck und beim Sechseck.
    const sides = normalizePolygonSides(options.sides);
    const inner = radius * normalizeStarInnerPercent(options.innerPercent) / 100;
    const count = primitive === "star" ? sides * 2 : sides;
    const corners: SketchPoint[] = Array.from({ length: count }, (_, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
      const reach = primitive === "star" && index % 2 === 1 ? inner : radius;
      return { id: makeId("sketch-point"), x: cx + Math.cos(angle) * reach, z: cz + Math.sin(angle) * reach, mode: "corner" };
    });
    return { points: corners, segments: closedLoop(makeId, corners, "line") };
  }

  const minX = cx - radius;
  const maxX = cx + radius;
  // Nur das Rechteck darf tiefer oder flacher sein als breit; Dreieck und Sechseck bleiben gleichmaessig.
  const halfDepth = primitive === "rectangle" ? (positiveSize(options.depth) ?? size) / 2 : radius;
  const minZ = cz - halfDepth;
  const maxZ = cz + halfDepth;
  const vertices: Array<{ x: number; z: number }> = primitive === "rectangle"
    ? [
        { x: minX, z: minZ },
        { x: maxX, z: minZ },
        { x: maxX, z: maxZ },
        { x: minX, z: maxZ },
      ]
    : primitive === "triangle"
      ? [
          { x: cx, z: minZ },
          { x: maxX, z: maxZ },
          { x: minX, z: maxZ },
        ]
      : Array.from({ length: 6 }, (_, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI) / 3;
          return { x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius };
        });

  const points: SketchPoint[] = vertices.map((vertex) => ({ id: makeId("sketch-point"), ...vertex, mode: "corner" }));
  return { points, segments: closedLoop(makeId, points, "line") };
}
