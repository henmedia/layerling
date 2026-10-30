/*
 * Wie rund ist rund? Die Zahlen dazu stehen nur hier. Das Programm rechnet
 * mit ihnen, und die Anleitung liest sie beim Bauen mit {{value:NAME}} aus
 * dieser Datei (scripts/build-guide.mjs) - so koennen Text und Code nicht
 * auseinanderlaufen. Deshalb importiert diese Datei nichts: der Anleitungsbau
 * laedt sie ohne den Rest des Programms.
 */

/**
 * Wie weit ein Vieleck vom echten Kreis abweichen darf, bevor man es sieht.
 * Fuenf Tausendstel Millimeter liegen weit unter dem, was ein Drucker
 * aufloest - eine 0,4er-Duese legt Bahnen, die achtzigmal breiter sind.
 */
export const ROUND_DEVIATION_TOLERANCE = 0.005;

/** Unter vierundzwanzig Seiten sieht auch ein kleiner Stift eckig aus. */
export const MIN_AUTOMATIC_SIDES = 24;

/**
 * Wie weit ein Vieleck mit gesetzter Seitenzahl hoechstens vom Kreis
 * abweichen darf (die Pfeilhoehe seiner Abschnitte), damit das
 * Kantenwerkzeug es trotzdem als echten Kreis baut: 0,05 mm ist die groesste
 * Sehnenabweichung, die dessen eigene Netze im Standard haben - was darunter
 * liegt, zeichnet auch der exakte Koerper nicht anders (die Standardstufe in
 * TESSELLATION_QUALITY, cadModifierRuntime.ts).
 */
export const EXACT_ROUND_TOLERANCE = 0.05;

/**
 * Ab welcher gesetzten Zahl ein runder Koerper rund gemeint ist, in der
 * Einheit seines eigenen Reglers: so fein zeichnet ihn die Form von sich aus.
 * Zylinder, Kegel, Rohr und Ring trugen 96 Seiten fest, bevor die Seitenzahl
 * der Groesse folgte; aeltere Projekte haben sie gespeichert. Kugel,
 * Halbkugel, Paraboloid und Rundbogendach haben ihre Vorgabe noch
 * (shapeCatalog.ts; ein Test prueft, dass beide Stellen gleich bleiben).
 */
export const ROUND_FROM_SIDES = 96;
export const ROUND_FROM_SPHERE_STEPS = 24;
export const ROUND_FROM_HALF_SPHERE_STEPS = 32;
/** Der Torus trug 144 Ecken rund um den Ring und 36 rund um den Wulst fest (torusTessellation.ts). */
export const ROUND_FROM_TORUS_SIDES = 96;
export const ROUND_FROM_TORUS_STEPS = 24;
export const ROUND_FROM_ROOF_SIDES = 64;
/** Das gebogene Rohr zeichnet ein rundes Profil mit `bentTubeQuality` Ecken, von sich aus 32 (bentTubeGeometry.ts). */
export const ROUND_FROM_BENT_TUBE_QUALITY = 32;

/**
 * Ob ein runder Katalogkoerper rund gemeint ist. `set` ist die gesetzte
 * Seiten- oder Stufenzahl (undefined: sie folgt der Groesse oder der
 * Vorgabe), `roundFrom` die Zahl, ab der er rund gemeint ist, `corners` die
 * Ecken, die das Anzeigenetz damit rundum zeichnet, `width` und `depth` die
 * Durchmesser. Darunter gilt er nur als rund, wenn das Vieleck hoechstens
 * EXACT_ROUND_TOLERANCE vom Kreis abweicht. Ein Zylinder mit sechs gesetzten
 * Seiten ist ein Sechskant und bleibt einer.
 */
export function drawnRound(set: number | null | undefined, roundFrom: number, corners: number, width: number, depth: number) {
  // Kein brauchbarer Wert (auch null aus einer von Hand bearbeiteten Datei): wie nicht gesetzt.
  if (set === undefined || set === null || !Number.isFinite(set)) return true;
  // Gezaehlt wird, was gezeichnet wird: 95,6 Seiten sind 96.
  if (Math.round(set) >= roundFrom) return true;
  const radius = Math.max(width, depth) / 2;
  return radius * (1 - Math.cos(Math.PI / Math.max(3, corners))) <= EXACT_ROUND_TOLERANCE;
}
