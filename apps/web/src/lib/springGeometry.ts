import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import { createFlatSpringGeometry } from "@/lib/flatSpringGeometry";
import type { FlatSpringEnds, FlatSpringPattern, SpringForm, ThreadHand } from "@/types/layerling";

export const DEFAULT_SPRING_TURNS = 6;
export const DEFAULT_SPRING_WIRE = 3;
export const DEFAULT_SPRING_QUALITY = 36;
/** Druckfedern sind ueblicherweise rechtsgewickelt. */
export const DEFAULT_SPRING_HAND: ThreadHand = "right";

export const MIN_SPRING_TURNS = 1;
export const MAX_SPRING_TURNS = 60;
export const MIN_SPRING_WIRE = 0.3;
export const MIN_SPRING_QUALITY = 12;
export const MAX_SPRING_QUALITY = 96;

/**
 * Damit sich die Windungen nicht durchdringen, bleibt zwischen ihnen ein
 * schmaler Spalt. Beruehrende Flaechen waeren kein Koerper mehr, den ein
 * Schneidewerkzeug oder ein Slicer sauber lesen kann.
 */
const MIN_PITCH_FACTOR = 1.05;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export type SpringShapeFields = {
  springTurns?: number;
  springWire?: number;
  springQuality?: number;
  springHand?: ThreadHand;
  springForm?: SpringForm;
  springPattern?: FlatSpringPattern;
  springEnds?: FlatSpringEnds;
};

export type SpringSettings = {
  turns: number;
  wire: number;
  quality: number;
  hand: ThreadHand;
};

export function normalizeSpringHand(value?: string): ThreadHand {
  return value === "left" ? "left" : DEFAULT_SPRING_HAND;
}

/** Die Drahtstaerke passt in den Durchmesser und laesst noch eine Mitte frei. */
export function springWireLimits(diameter: number, height: number) {
  const across = Math.max(0.2, Math.min(diameter, height));
  return { min: MIN_SPRING_WIRE, max: Math.max(MIN_SPRING_WIRE, across * 0.4) };
}

export function normalizeSpringWire(value: number | undefined, diameter: number, height: number) {
  const limits = springWireLimits(diameter, height);
  return clamp(finite(value, DEFAULT_SPRING_WIRE), limits.min, limits.max);
}

/**
 * Wie viele Windungen in die Hoehe passen. Mehr als das waere ein Koerper, der
 * sich selbst durchdringt - deshalb ist die Grenze hier hart und nicht bloss
 * eine Empfehlung.
 */
export function springTurnLimits(diameter: number, height: number, wire?: number) {
  const thickness = normalizeSpringWire(wire, diameter, height);
  const usable = Math.max(0, height - thickness);
  const fit = Math.floor(usable / (thickness * MIN_PITCH_FACTOR));
  return { min: MIN_SPRING_TURNS, max: clamp(fit, MIN_SPRING_TURNS, MAX_SPRING_TURNS) };
}

export function normalizeSpringTurns(value: number | undefined, diameter: number, height: number, wire?: number) {
  const limits = springTurnLimits(diameter, height, wire);
  return clamp(Math.round(finite(value, DEFAULT_SPRING_TURNS)), limits.min, limits.max);
}

export function normalizeSpringQuality(value?: number) {
  const rounded = Math.round(clamp(finite(value, DEFAULT_SPRING_QUALITY), MIN_SPRING_QUALITY, MAX_SPRING_QUALITY) / 4) * 4;
  return clamp(rounded, MIN_SPRING_QUALITY, MAX_SPRING_QUALITY);
}

export function springSettings(shape: SpringShapeFields, diameter: number, height: number): SpringSettings {
  const wire = normalizeSpringWire(shape.springWire, diameter, height);
  return {
    wire,
    turns: normalizeSpringTurns(shape.springTurns, diameter, height, wire),
    quality: normalizeSpringQuality(shape.springQuality),
    hand: normalizeSpringHand(shape.springHand),
  };
}

/** Punkte je Drahtring im Anzeigenetz: ein Vieleck im Drahtkreis, also etwas weniger Querschnitt als der Kreis. */
export function springRingSegments(quality: number) {
  return clamp(Math.round(quality / 3) * 2, 8, 24);
}

/**
 * Wie viel vom runden Drahtquerschnitt das Vieleck des Anzeigenetzes fasst:
 * 0,989 bei der Standardqualitaet, 0,900 bei der groebsten. Der exakte
 * Koerper hat den runden Draht, das Netz entsprechend weniger Volumen.
 */
export function springRingSectionShare(quality: number) {
  const segments = springRingSegments(quality);
  return (segments / (2 * Math.PI)) * Math.sin((2 * Math.PI) / segments);
}

export type SpringGeometryOptions = SpringShapeFields & {
  width: number;
  depth: number;
  height: number;
};

type Builder = { positions: number[]; indices: number[] };

function triangle(builder: Builder, a: number, b: number, c: number) {
  if (a === b || b === c || a === c) return;
  builder.indices.push(a, b, c);
}

/**
 * Die Masse der Feder, aus denen das Anzeigenetz gezeichnet und der exakte
 * Koerper (`springSolid.ts`) gebaut wird - beide aus derselben Rechnung, damit
 * sie nicht auseinanderlaufen. Die Mittellinie ist eine Wendel um die
 * Hochachse: Halbmesser `coilRadius`, von `bottom` aus `span` hoch, in
 * `turns` Windungen, beginnend auf +x. Rechtsgewickelt laeuft sie von +x
 * nach -z (rechtsherum um +y) und steigt dabei, linksgewickelt von +x nach
 * +z: `zSign` ist -1 oder 1. Gezeichnet wird mit dem groesseren Durchmesser
 * und danach auf `scaleX`/`scaleZ` gezogen.
 */
export function springBuildPlan(options: SpringGeometryOptions) {
  const width = Math.max(0.2, options.width);
  const depth = Math.max(0.2, options.depth);
  const height = Math.max(0.2, options.height);
  const diameter = Math.max(width, depth);
  const settings = springSettings(options, diameter, height);
  const wireRadius = settings.wire / 2;
  const coilRadius = Math.max(0.05, diameter / 2 - wireRadius);
  const twist = Math.PI * 2 * settings.turns;
  /*
   * Der Draht steht nach oben nicht um seinen vollen Halbmesser ueber die
   * Mittellinie hinaus, sondern nur um den waagerechten Anteil der
   * Laufrichtung - je steiler die Wendel, desto weniger. Damit der Koerper
   * genau die verlangte Hoehe bekommt, wird dieser Anteil hier eingerechnet.
   * Er haengt von der Laenge ab, die er selbst bestimmt, also ein paar
   * Durchgaenge: das sitzt nach dreien auf ein Tausendstel genau.
   */
  const reach = coilRadius * twist;
  let span = Math.max(0.01, height - settings.wire);
  for (let pass = 0; pass < 4; pass += 1) {
    const horizontalShare = reach / Math.hypot(reach, span);
    span = Math.max(0.01, height - settings.wire * horizontalShare);
  }
  const bottom = (height - span) / 2;
  const zSign = settings.hand === "left" ? 1 : -1;
  return { settings, wireRadius, coilRadius, twist, span, bottom, zSign, scaleX: width / diameter, scaleZ: depth / diameter };
}

/**
 * Eine Feder ist ein Draht, der einer Wendel folgt. Gebaut wird sie als Rohr
 * entlang dieser Wendel: an jeder Station steht ein Ring aus Punkten quer zur
 * Laufrichtung, und die Ringe werden zu einem geschlossenen Schlauch
 * verbunden.
 *
 * Das Begleitbein entsteht aus der Laufrichtung und der Senkrechten - bei
 * einer Wendel ergibt das die Richtung nach innen und steht nie still, also
 * dreht sich der Querschnitt unterwegs auch nicht auf.
 */
export function createSpringGeometry(options: SpringGeometryOptions) {
  if (options.springForm === "flat") return createFlatSpringGeometry(options);
  const { settings, wireRadius, coilRadius, twist, span, bottom, zSign, scaleX, scaleZ } = springBuildPlan(options);
  const stations = Math.max(8, Math.round(settings.quality)) * settings.turns;
  const ringSegments = springRingSegments(settings.quality);

  const builder: Builder = { positions: [], indices: [] };
  const rings: number[][] = [];
  const centres: number[] = [];

  for (let station = 0; station <= stations; station += 1) {
    const progress = station / stations;
    const angle = twist * progress;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const centreX = cos * coilRadius;
    const centreY = bottom + span * progress;
    const centreZ = zSign * sin * coilRadius;

    // Laufrichtung der Wendel an dieser Stelle.
    const tangentX = -sin * coilRadius * twist;
    const tangentY = span;
    const tangentZ = zSign * cos * coilRadius * twist;
    const tangentLength = Math.hypot(tangentX, tangentY, tangentZ) || 1;
    const tx = tangentX / tangentLength;
    const ty = tangentY / tangentLength;
    const tz = tangentZ / tangentLength;

    // Senkrecht dazu: erst quer zur Hochachse, dann das dritte Bein.
    let ax = tz;
    const ay = 0;
    let az = -tx;
    const aLength = Math.hypot(ax, ay, az) || 1;
    ax /= aLength;
    az /= aLength;
    const bx = ty * az - tz * ay;
    const by = tz * ax - tx * az;
    const bz = tx * ay - ty * ax;

    const ring: number[] = [];
    for (let segment = 0; segment < ringSegments; segment += 1) {
      const around = (segment / ringSegments) * Math.PI * 2;
      const c = Math.cos(around) * wireRadius;
      const s = Math.sin(around) * wireRadius;
      const index = builder.positions.length / 3;
      builder.positions.push(
        centreX + ax * c + bx * s,
        centreY + ay * c + by * s,
        centreZ + az * c + bz * s,
      );
      ring.push(index);
    }
    rings.push(ring);
    centres.push(builder.positions.length / 3);
    builder.positions.push(centreX, centreY, centreZ);
  }

  for (let station = 0; station < stations; station += 1) {
    const here = rings[station];
    const next = rings[station + 1];
    for (let segment = 0; segment < ringSegments; segment += 1) {
      const after = (segment + 1) % ringSegments;
      triangle(builder, here[segment], here[after], next[after]);
      triangle(builder, here[segment], next[after], next[segment]);
    }
  }

  // Deckel an beiden Enden, quer zur Laufrichtung.
  const first = rings[0];
  const last = rings[rings.length - 1];
  for (let segment = 0; segment < ringSegments; segment += 1) {
    const after = (segment + 1) % ringSegments;
    triangle(builder, centres[0], first[after], first[segment]);
    triangle(builder, centres[centres.length - 1], last[segment], last[after]);
  }

  // Auf die verlangte Grundflaeche ziehen, wie bei den uebrigen Koerpern.
  if (scaleX !== 1 || scaleZ !== 1) {
    for (let offset = 0; offset < builder.positions.length; offset += 3) {
      builder.positions[offset] *= scaleX;
      builder.positions[offset + 2] *= scaleZ;
    }
  }

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(builder.positions, 3));
  indexed.setIndex(builder.indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(35));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}
