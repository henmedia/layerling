/**
 * DinguinCAD - Gewindeeinsaetze 1.3
 * Sicherheitspruefung VOR dem Erzeugen einer Bohrung.
 */

export type DinguinInsertSpec = {
  name: string;
  d1: number;
  d2: number;
  d3: number;
  L: number;
  W: number;
};

export const DINGUIN_INSERT_SIZES: DinguinInsertSpec[] = [
  { name: "M2", d1: 3.6, d2: 3.1, d3: 3.2, L: 4, W: 1.3 },
  { name: "M2.5", d1: 4.6, d2: 3.9, d3: 4, L: 5.7, W: 1.6 },
  { name: "M3", d1: 4.6, d2: 3.9, d3: 4, L: 5.7, W: 1.6 },
  { name: "M4", d1: 6.3, d2: 5.5, d3: 5.6, L: 8.1, W: 2.1 },
  { name: "M5", d1: 7.1, d2: 6.3, d3: 6.4, L: 9.5, W: 2.6 },
  { name: "M6", d1: 8.7, d2: 7.9, d3: 8, L: 12.7, W: 3.3 },
  { name: "M8", d1: 10.1, d2: 9.5, d3: 9.6, L: 12.7, W: 4.5 },
  { name: "M3 SHORT", d1: 4.6, d2: 3.9, d3: 4, L: 4, W: 1.6 },
  { name: "M4 SHORT", d1: 6.3, d2: 5.5, d3: 5.6, L: 4, W: 2.1 },
  { name: "M5 SHORT", d1: 7.1, d2: 6.3, d3: 6.4, L: 5.8, W: 2.6 },
  { name: "1/4-20", d1: 8.7, d2: 7.9, d3: 8, L: 12.7, W: 3.3 },
];

// Benutzerdefiniert: Durchmesser d3 und Laenge L eingeben.
// W wird automatisch berechnet und auf 0,1 mm AUFGERUNDET.
export function customDinguinInsert(
  d3: number,
  L: number
): DinguinInsertSpec {
  const W = Math.ceil((d3 / 2.45) * 10 - 1e-9) / 10;
  return {
    name: "Benutzerdefiniert",
    d1: d3,
    d2: d3,
    d3,
    L,
    W,
  };
}

export type DinguinInsertCheck = {
  // Kuerzester Abstand: Lochmitte bis Bauteilkante
  edgeDistance: number;

  // Tatsaechliche Materialtiefe in Bohrrichtung
  materialDepth: number;
};

export type DinguinInsertResult = {
  allowed: boolean;
  warnings: string[];
  requiredEdgeDistance: number;
  requiredDepth: number;
  minimumOuterDiameter: number;
};

const fmt = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 3 });

export function checkDinguinThreadInsert(
  spec: DinguinInsertSpec,
  check: DinguinInsertCheck
): DinguinInsertResult {
  const warnings: string[] = [];

  const requiredEdgeDistance = spec.d3 / 2 + spec.W;
  const requiredDepth = spec.L;
  const minimumOuterDiameter = spec.d3 + 2 * spec.W;

  const result = (): DinguinInsertResult => ({
    allowed: warnings.length === 0,
    warnings,
    requiredEdgeDistance,
    requiredDepth,
    minimumOuterDiameter,
  });

  const values = [
    spec.d1, spec.d2, spec.d3, spec.L, spec.W,
    check.edgeDistance, check.materialDepth,
  ];

  if (
    values.some((v) => !Number.isFinite(v)) ||
    spec.d3 <= 0 || spec.L <= 0 || spec.W <= 0 ||
    spec.d1 <= 0 || spec.d2 <= 0 ||
    check.edgeDistance < 0 || check.materialDepth < 0
  ) {
    warnings.push("Ungueltige Masse. Bohrung gesperrt.");
    return result();
  }

  const actualWall = check.edgeDistance - spec.d3 / 2;

  // PRUEFUNG 1: Fleischseite W
  if (actualWall + 1e-6 < spec.W) {
    warnings.push(
      `RANDABSTAND ZU KLEIN!\n` +
      `${spec.name}: mindestens ${fmt(spec.W)} mm Fleischseite.\n` +
      `Vorhanden: ${fmt(actualWall)} mm.`
    );
  }

  // PRUEFUNG 2: Materialtiefe L
  if (check.materialDepth + 1e-6 < spec.L) {
    warnings.push(
      `MATERIALTIEFE ZU GERING!\n` +
      `${spec.name}: benoetigt ${fmt(spec.L)} mm.\n` +
      `Vorhanden: ${fmt(check.materialDepth)} mm.\n` +
      `Es fehlen ${fmt(spec.L - check.materialDepth)} mm.`
    );
  }

  return result();
}