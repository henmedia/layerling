import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";

/** Lage und Masse des Lineal-Koerpers, so wie sie auf der Arbeitsebene stehen. */
export type RulerPose = {
  x: number;
  z: number;
  /** Height of the ruler's middle; only matters once the ruler is tipped out of the plate (#799). */
  y?: number;
  rotation: number;
  rotationX?: number;
  rotationZ?: number;
  /** Laenge - das ist am Lineal-Koerper das Feld `width`. */
  length: number;
  /** Kreuzbreite quer zur Laenge - am Lineal-Koerper das Feld `depth`. */
  crossWidth: number;
};

/** Lage, Drehung und Masse eines Koerpers, der neben dem Lineal liegen koennte. */
export type RulerCandidatePose = {
  x: number;
  z: number;
  /** Height of the body's middle; only matters for a tipped ruler. */
  y?: number;
  rotation: number;
  rotationX?: number;
  rotationZ?: number;
  width: number;
  height: number;
  depth: number;
};

export type RulerDimensionField = "width" | "height" | "depth";

export type RulerDimensionMatch = {
  /** Abstand des Koerpermittelpunkts von der Lineal-Mitte, entlang der Lineal-Achse (mm). */
  alongOffset: number;
  /** Abstand des Koerpermittelpunkts von der Lineal-Mittellinie, quer zur Achse (mm, mit Vorzeichen). */
  acrossOffset: number;
  /** Die volle Ausdehnung des Koerpers entlang der Lineal-Achse (mm). */
  extentAlong: number;
  /** Its full extent across the ruler, in the ruler's face (mm). */
  extentAcross: number;
  /**
   * Welches eigene Feld des Koerpers dieser Ausdehnung entspricht - nur gesetzt,
   * wenn eine seiner drei Achsen (innerhalb der Toleranz) parallel zur
   * Lineal-Achse steht. Sonst ist die Ausdehnung eine Diagonale und gehoert zu
   * keiner einzelnen Eigenschaft, also nicht eintippbar.
   */
  alignedField: RulerDimensionField | null;
};

const ALIGNMENT_TOLERANCE_DEGREES = 2;
const ALIGNMENT_COS_TOLERANCE = Math.cos(THREE.MathUtils.degToRad(ALIGNMENT_TOLERANCE_DEGREES));

/**
 * Ob und wie ein Koerper das Band eines Lineals kreuzt. Gemessen wird entlang
 * der Achse des Lineals, wie es im Raum steht: flach auf der Platte die
 * Grundflaeche (die Hoehe spielt keine Rolle), aufgestellt die Hoehe (#799).
 * Quer zur Flaeche des Lineals zaehlt der Abstand nicht, so wie ein flaches
 * Lineal auch einen Koerper ueber sich misst. Unabhaengig von der Koerperart,
 * damit es fuer ein Gewinde oder eine Gruppe genauso gilt wie fuer einen Quader.
 */
export function rulerDimensionMatch(ruler: RulerPose, candidate: RulerCandidatePose): RulerDimensionMatch | null {
  const rulerQuaternion = quaternionForShape(ruler);
  const axisAlong = new THREE.Vector3(1, 0, 0).applyQuaternion(rulerQuaternion);
  const axisAcross = new THREE.Vector3(0, 0, 1).applyQuaternion(rulerQuaternion);

  const candidateQuaternion = quaternionForShape(candidate);
  const candidateAxes: Array<{ field: RulerDimensionField; direction: THREE.Vector3; half: number }> = [
    { field: "width", direction: new THREE.Vector3(1, 0, 0).applyQuaternion(candidateQuaternion), half: candidate.width / 2 },
    { field: "height", direction: new THREE.Vector3(0, 1, 0).applyQuaternion(candidateQuaternion), half: candidate.height / 2 },
    { field: "depth", direction: new THREE.Vector3(0, 0, 1).applyQuaternion(candidateQuaternion), half: candidate.depth / 2 },
  ];

  const extentAlongHalf = candidateAxes.reduce((sum, axis) => sum + Math.abs(axis.direction.dot(axisAlong)) * axis.half, 0);
  const extentAcrossHalf = candidateAxes.reduce((sum, axis) => sum + Math.abs(axis.direction.dot(axisAcross)) * axis.half, 0);

  const relative = new THREE.Vector3(candidate.x - ruler.x, (candidate.y ?? 0) - (ruler.y ?? 0), candidate.z - ruler.z);
  const acrossOffset = relative.dot(axisAcross);
  if (Math.abs(acrossOffset) > ruler.crossWidth / 2 + extentAcrossHalf) {
    return null;
  }

  const aligned = candidateAxes.find((axis) => Math.abs(axis.direction.dot(axisAlong)) >= ALIGNMENT_COS_TOLERANCE);

  return {
    alongOffset: relative.dot(axisAlong),
    acrossOffset,
    extentAlong: extentAlongHalf * 2,
    extentAcross: extentAcrossHalf * 2,
    alignedField: aligned?.field ?? null,
  };
}

/** Weltkoordinaten eines Punkts, der auf der Lineal-Achse im Abstand `alongOffset` von dessen Mitte liegt. */
export function pointAlongRuler(ruler: RulerPose, alongOffset: number): { x: number; y: number; z: number } {
  const axisAlong = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternionForShape(ruler));
  return { x: ruler.x + axisAlong.x * alongOffset, y: (ruler.y ?? 0) + axisAlong.y * alongOffset, z: ruler.z + axisAlong.z * alongOffset };
}

/**
 * Whether the ruler lies flat, its face up or down. Only then do its numbers sit over the plate and does its
 * handle place a copy on it; a tipped ruler still measures along its own direction (#799).
 */
export function rulerLiesFlat(ruler: Pick<RulerPose, "rotation" | "rotationX" | "rotationZ">): boolean {
  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(ruler));
  return Math.abs(normal.y) >= 1 - 1e-6;
}

/** Lage und Armlaengen des Winkellineals, so wie es auf der Arbeitsebene steht. */
export type CornerRulerPose = {
  x: number;
  z: number;
  rotation: number;
  /** Laenge des ersten Arms (lokale X-Achse) - am Koerper das Feld `width`. */
  armLengthX: number;
  /** Laenge des zweiten Arms (lokale Z-Achse) - am Koerper das Feld `depth`. */
  armLengthZ: number;
  /** Kreuzbreite beider Arme. */
  armWidth: number;
};

/**
 * Die Ecke, an der sich beide Arme treffen - anders als beim geraden Lineal ist
 * `x`/`z` des Winkellineals die Mitte der Bounding-Box (wie bei jeder anderen
 * Form, damit Zieh-Griffe/Auswahl keine Sonderbehandlung brauchen), nicht der
 * Nullpunkt der Skala. Die Ecke ist ein abgeleiteter Punkt, eine halbe
 * Armlaenge je Achse von der Mitte entfernt, in Richtung der eigenen Drehung.
 */
/**
 * The name the position fields give to the axis a ruler arm runs along: X to the right, Y to the back, Z up.
 * The arms of a placed corner ruler do not stand along fixed axes (the one that is called x here runs to the
 * back at first, and the corner turns by quarter turns), so the numbers on them are named by where the arm
 * points and not by which arm it is (#597).
 */
export function worldAxisNameOfDirection(direction: { x: number; y: number; z: number }): "X" | "Y" | "Z" {
  const along = { x: Math.abs(direction.x), y: Math.abs(direction.y), z: Math.abs(direction.z) };
  if (along.y >= along.x && along.y >= along.z) return "Z";
  return along.x >= along.z ? "X" : "Y";
}

export function cornerRulerCorner(pose: CornerRulerPose): { x: number; z: number } {
  const quaternion = quaternionForShape({ rotation: pose.rotation });
  const local = new THREE.Vector3(-pose.armLengthX / 2, 0, -pose.armLengthZ / 2).applyQuaternion(quaternion);
  return { x: pose.x + local.x, z: pose.z + local.z };
}

/**
 * Wie `rulerDimensionMatch`, aber fuer beide Arme des Winkellineals auf einmal -
 * ruft die bestehende Funktion zweimal auf, einmal je Arm-Richtung (0 Grad bzw.
 * 90 Grad zur eigenen Drehung), von der gemeinsamen Ecke aus. Keine Aenderung an
 * `rulerDimensionMatch` noetig, weil sie schon eine freie Pose entgegennimmt statt
 * eines tatsaechlichen Lineal-Koerpers.
 */
export function cornerRulerDimensionMatches(pose: CornerRulerPose, candidate: RulerCandidatePose): {
  armX: RulerDimensionMatch | null;
  armZ: RulerDimensionMatch | null;
} {
  const corner = cornerRulerCorner(pose);
  return cornerRulerDimensionMatchesFromCorner(corner, pose.rotation, pose.armLengthX, pose.armLengthZ, pose.armWidth, candidate);
}

/**
 * Wie `cornerRulerDimensionMatches`, aber wenn der Ursprungspunkt schon die
 * Ecke selbst ist statt der Bounding-Box-Mitte einer Form - so sitzt das
 * platzierte Winkellineal-Werkzeug, das direkt an seiner Ecke gesetzt wird,
 * nicht an einer daraus abgeleiteten Mitte.
 */
export function cornerRulerDimensionMatchesFromCorner(
  corner: { x: number; z: number },
  rotation: number,
  armLengthX: number,
  armLengthZ: number,
  armWidth: number,
  candidate: RulerCandidatePose,
): { armX: RulerDimensionMatch | null; armZ: RulerDimensionMatch | null } {
  const armX = rulerDimensionMatch({ x: corner.x, z: corner.z, rotation, length: armLengthX, crossWidth: armWidth }, candidate);
  const armZ = rulerDimensionMatch({ x: corner.x, z: corner.z, rotation: rotation + 90, length: armLengthZ, crossWidth: armWidth }, candidate);
  // Only a body at an arm counts: beside it within its length and on the side the other arm points to, or across it.
  // One that only touches the corner from outside the square, or lies behind it on an arm's extension, kept its
  // numbers on screen as if it stood at the arm (#831).
  // The arms as they are drawn: the first along the rotation's x, the second along its z (frame.zAxis). The second
  // arm's match is taken a quarter turn on, so its own "along" runs against the drawn arm.
  const quaternion = quaternionForShape({ rotation });
  const armXDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
  const armZDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
  const zQuaternion = quaternionForShape({ rotation: rotation + 90 });
  const zMatchAlong = new THREE.Vector3(1, 0, 0).applyQuaternion(zQuaternion);
  const zMatchAcross = new THREE.Vector3(0, 0, 1).applyQuaternion(zQuaternion);
  const atArm = (match: RulerDimensionMatch | null, length: number, alongSign: number, inward: number) => {
    if (!match) return null;
    const along = alongSign * match.alongOffset;
    const overlapsArm = along + match.extentAlong / 2 > CORNER_RULER_SIDE_TOLERANCE
      && along - match.extentAlong / 2 < length - CORNER_RULER_SIDE_TOLERANCE;
    const reachesInside = inward * match.acrossOffset + match.extentAcross / 2 > CORNER_RULER_SIDE_TOLERANCE;
    return overlapsArm && reachesInside ? match : null;
  };
  return {
    // The first arm's across is the second arm's direction: inside is its positive side.
    armX: atArm(armX, armLengthX, 1, 1),
    armZ: atArm(armZ, armLengthZ, Math.sign(zMatchAlong.dot(armZDirection)) || 1, Math.sign(zMatchAcross.dot(armXDirection)) || 1),
  };
}

/** How far a body must reach past an arm's line or end (mm) to count as standing at it, not just touching it from outside. */
const CORNER_RULER_SIDE_TOLERANCE = 0.01;

/**
 * Teilstriche fuer einen Arm des Winkellineal-Werkzeugs, als reine Zahlenliste,
 * damit die Bildschirm-Anzeige jeden Strich einzeln ueber `projectToScreen`
 * platzieren kann. Metrisch einer je Millimeter mit Zahl alle 10 mm; mit Zoll
 * (oder Fuss) eingestellt einer je 1/16" mit Zahl an jedem ganzen Zoll, wie auf
 * einem echten Winkel (Discussion #1618: vorher immer Millimeter).
 * `offset` ist immer in Millimetern, `height` der Anteil der Armbreite.
 */
export type CornerRulerTick = {
  offset: number;
  height: number;
  label?: string;
};

const CORNER_RULER_INCH_STEPS = 16;

export function cornerRulerTicks(length: number, unitLabel = "mm"): CornerRulerTick[] {
  const ticks: CornerRulerTick[] = [];
  if (unitLabel === "in" || unitLabel === "ft") {
    const step = 25.4 / CORNER_RULER_INCH_STEPS;
    const last = Math.max(0, Math.floor(length / step + 1e-6));
    for (let index = 0; index <= last; index += 1) {
      const height = index % 16 === 0 ? 0.62 : index % 8 === 0 ? 0.48 : index % 4 === 0 ? 0.38 : index % 2 === 0 ? 0.3 : 0.22;
      const inches = index / CORNER_RULER_INCH_STEPS;
      ticks.push({ offset: index * step, height, label: index > 0 && index % 16 === 0 ? (unitLabel === "ft" ? `${inches}"` : String(inches)) : undefined });
    }
    return ticks;
  }
  const last = Math.max(0, Math.floor(length));
  for (let value = 0; value <= last; value += 1) {
    const isTen = value % 10 === 0;
    ticks.push({ offset: value, height: isTen ? 0.62 : value % 5 === 0 ? 0.42 : 0.26, label: isTen && value > 0 ? String(value) : undefined });
  }
  return ticks;
}

export type CornerRulerMode = "endpoint" | "midpoint";

/** The three numbers a framing square gives a body: along its two arms and in height. */
export type CornerRulerAxis = "x" | "z" | "elevation";

/** A mode for single axes; what is not named follows the square's overall mode. */
export type CornerRulerAxisModes = Partial<Record<CornerRulerAxis, CornerRulerMode>>;

const CORNER_RULER_AXES: readonly CornerRulerAxis[] = ["x", "z", "elevation"];

/** What each of the three numbers counts to: the edge of the body or its middle. */
export function cornerRulerAxisModes(mode: CornerRulerMode | undefined, axisModes?: CornerRulerAxisModes): Record<CornerRulerAxis, CornerRulerMode> {
  const base: CornerRulerMode = mode === "midpoint" ? "midpoint" : "endpoint";
  return { x: axisModes?.x ?? base, z: axisModes?.z ?? base, elevation: axisModes?.elevation ?? base };
}

/**
 * One axis switched between the edge and the middle, the others as they were. When all three agree
 * again that is the square's overall mode and no single settings are kept (a standing cylinder:
 * the middle in x and z, the bottom in height).
 */
export function toggledCornerRulerAxis(mode: CornerRulerMode | undefined, axisModes: CornerRulerAxisModes | undefined, axis: CornerRulerAxis): { mode: CornerRulerMode; axisModes?: CornerRulerAxisModes } {
  const current = cornerRulerAxisModes(mode, axisModes);
  const next = { ...current, [axis]: current[axis] === "midpoint" ? "endpoint" : "midpoint" } as Record<CornerRulerAxis, CornerRulerMode>;
  if (CORNER_RULER_AXES.every((entry) => next[entry] === next.x)) return { mode: next.x };
  return { mode: mode === "midpoint" ? "midpoint" : "endpoint", axisModes: next };
}

/** The whole square switched at once: to the other mode, or to the edge when the axes differ. */
export function toggledCornerRulerMode(mode: CornerRulerMode | undefined, axisModes?: CornerRulerAxisModes): { mode: CornerRulerMode; axisModes?: CornerRulerAxisModes } {
  const current = cornerRulerAxisModes(mode, axisModes);
  const same = CORNER_RULER_AXES.every((entry) => current[entry] === current.x);
  return { mode: same && current.x === "endpoint" ? "midpoint" : "endpoint" };
}

type CornerRulerVector = { x: number; y: number; z: number };

/**
 * The plane a framing square lies in: its two arms and the direction its
 * height counts in. On the plate that is the plate itself, on a face
 * workplane the face (#105).
 */
export type CornerRulerFrame = {
  xAxis: CornerRulerVector;
  zAxis: CornerRulerVector;
  normal: CornerRulerVector;
};

const toVector = (value: CornerRulerVector) => new THREE.Vector3(value.x, value.y, value.z);
const fromVector = (value: THREE.Vector3): CornerRulerVector => ({
  x: Math.abs(value.x) < 1e-12 ? 0 : value.x,
  y: Math.abs(value.y) < 1e-12 ? 0 : value.y,
  z: Math.abs(value.z) < 1e-12 ? 0 : value.z,
});

/** The frame turned by a quarter turn about its normal, as a click on the handle does. */
export function rotateCornerRulerFrame(frame: CornerRulerFrame): CornerRulerFrame {
  const normal = toVector(frame.normal).normalize();
  return {
    xAxis: fromVector(toVector(frame.xAxis).applyAxisAngle(normal, Math.PI / 2)),
    zAxis: fromVector(toVector(frame.zAxis).applyAxisAngle(normal, Math.PI / 2)),
    normal: fromVector(normal),
  };
}

/**
 * The frame a framing square starts with on a workplane: the workplane's own
 * axes, turned a quarter as on the plate, where it has always started at 90 degrees.
 */
export function cornerRulerFrameForWorkplane(workplane: { xAxis: CornerRulerVector; zAxis: CornerRulerVector; normal: CornerRulerVector }): CornerRulerFrame {
  return rotateCornerRulerFrame({ xAxis: workplane.xAxis, zAxis: workplane.zAxis, normal: workplane.normal });
}

/** An arm dragged at its end stays this long at least and this long at most, in whole millimetres (Discussion #1469). */
export const CORNER_RULER_MIN_ARM = 10;
export const CORNER_RULER_MAX_ARM = 5000;

/**
 * How long an arm becomes when its end is dragged to `point`: the distance from the corner along that arm, rounded
 * to whole millimetres and kept between CORNER_RULER_MIN_ARM and CORNER_RULER_MAX_ARM. A point behind the corner
 * leaves the shortest arm (Discussion #1469).
 */
export function cornerRulerArmLength(ruler: { corner: CornerRulerVector; frame: CornerRulerFrame }, arm: "x" | "z", point: CornerRulerVector) {
  const axis = toVector(arm === "x" ? ruler.frame.xAxis : ruler.frame.zAxis).normalize();
  const along = toVector(point).sub(toVector(ruler.corner)).dot(axis);
  return Math.min(CORNER_RULER_MAX_ARM, Math.max(CORNER_RULER_MIN_ARM, Math.round(along)));
}

/** How long the third arm, the one standing up from the corner along the square's normal, is to begin with (Discussion #1649). */
export const CORNER_RULER_DEFAULT_ARM_ELEVATION = 50;

/** Which arms a framing square shows when it says nothing: the two in its plane, not the third (Discussion #1649). */
const CORNER_RULER_ARMS_DEFAULT: Record<CornerRulerAxis, boolean> = { x: true, z: true, elevation: false };

/** Which of its three arms a framing square shows: the two in its plane unless switched off, the third only when switched on. */
export function cornerRulerArmsShown(arms?: Partial<Record<CornerRulerAxis, boolean>>): Record<CornerRulerAxis, boolean> {
  return {
    x: typeof arms?.x === "boolean" ? arms.x : CORNER_RULER_ARMS_DEFAULT.x,
    z: typeof arms?.z === "boolean" ? arms.z : CORNER_RULER_ARMS_DEFAULT.z,
    elevation: typeof arms?.elevation === "boolean" ? arms.elevation : CORNER_RULER_ARMS_DEFAULT.elevation,
  };
}

/**
 * One arm switched on or off, the others as they were (Discussion #1649). The last arm shown stays on. What is kept
 * names only the arms that differ from the start, so a square as it always was keeps nothing (undefined).
 */
export function toggledCornerRulerArms(arms: Partial<Record<CornerRulerAxis, boolean>> | undefined, arm: CornerRulerAxis): Partial<Record<CornerRulerAxis, boolean>> | undefined {
  const shown = cornerRulerArmsShown(arms);
  const next = { ...shown, [arm]: !shown[arm] };
  return keptCornerRulerArms(CORNER_RULER_AXES.some((entry) => next[entry]) ? next : shown);
}

/**
 * What is kept of the arms a square shows: only those that differ from the start, undefined when none does. Arms
 * with none shown are no square's: they keep nothing, so the square shows its two arms again.
 */
export function keptCornerRulerArms(arms: Partial<Record<CornerRulerAxis, boolean>> | undefined): Partial<Record<CornerRulerAxis, boolean>> | undefined {
  const shown = cornerRulerArmsShown(arms);
  if (!CORNER_RULER_AXES.some((entry) => shown[entry])) return undefined;
  const result: Partial<Record<CornerRulerAxis, boolean>> = {};
  CORNER_RULER_AXES.forEach((entry) => { if (shown[entry] !== CORNER_RULER_ARMS_DEFAULT[entry]) result[entry] = shown[entry]; });
  return Object.keys(result).length ? result : undefined;
}

/**
 * How long the third arm becomes when its end is dragged (Discussion #1649): the arm stands out of the square's
 * plane, so the pointer's ray is taken, and the point of the arm's line closest to that ray. Whole millimetres,
 * between CORNER_RULER_MIN_ARM and CORNER_RULER_MAX_ARM. Null when the ray runs almost along the arm, as when looking
 * straight down onto a square on the plate: then the place along it cannot be told.
 */
export function cornerRulerElevationArmLength(
  ruler: { corner: CornerRulerVector; frame: CornerRulerFrame },
  ray: { origin: CornerRulerVector; direction: CornerRulerVector },
): number | null {
  const arm = toVector(ruler.frame.normal).normalize();
  const along = toVector(ray.direction).normalize();
  const offset = toVector(ruler.corner).sub(toVector(ray.origin));
  const b = arm.dot(along);
  const denominator = 1 - b * b;
  // Less than about 3 degrees between the ray and the arm.
  if (denominator < 0.0025) return null;
  const t = (b * along.dot(offset) - arm.dot(offset)) / denominator;
  return Math.min(CORNER_RULER_MAX_ARM, Math.max(CORNER_RULER_MIN_ARM, Math.round(t)));
}

/**
 * Both arms as long as the build plate: the arm that runs more along the plate's width (x) gets the width, the other
 * its depth, so a square turned a quarter still spans the plate (Discussion #1469).
 */
export function cornerRulerPlateArms(frame: CornerRulerFrame, width: number, depth: number) {
  const alongWidth = (axis: CornerRulerVector) => Math.abs(axis.x) >= Math.abs(axis.z);
  return {
    armLengthX: Math.round(alongWidth(frame.xAxis) ? width : depth),
    armLengthZ: Math.round(alongWidth(frame.zAxis) ? width : depth),
  };
}

/**
 * The turn about the vertical of a frame that lies flat on the plate the right
 * way up, in degrees; null for any other frame. The measurements of shapes at
 * the arms only work on the plate.
 */
export function cornerRulerFlatRotation(frame: CornerRulerFrame): number | null {
  const { xAxis, zAxis, normal } = frame;
  if (Math.abs(normal.y - 1) > 1e-6 || Math.abs(xAxis.y) > 1e-6 || Math.abs(zAxis.y) > 1e-6) return null;
  const rotation = THREE.MathUtils.radToDeg(Math.atan2(-xAxis.z, xAxis.x));
  // z must be x turned a quarter the same way as in quaternionForShape.
  const expectedZ = { x: Math.sin(THREE.MathUtils.degToRad(rotation)), z: Math.cos(THREE.MathUtils.degToRad(rotation)) };
  if (Math.abs(zAxis.x - expectedZ.x) > 1e-6 || Math.abs(zAxis.z - expectedZ.z) > 1e-6) return null;
  return ((rotation % 360) + 360) % 360;
}

/** How far to move shapes so their distance along one of the frame's directions changes by `delta`. */
export function cornerRulerShiftVector(frame: CornerRulerFrame, axis: "x" | "z" | "elevation", delta: number): CornerRulerVector {
  const direction = axis === "x" ? frame.xAxis : axis === "z" ? frame.zAxis : frame.normal;
  return fromVector(toVector(direction).normalize().multiplyScalar(delta));
}

export type CornerRulerCoordinateInput = {
  rulerCorner: { x: number; y?: number; z: number };
  rulerRotation: number;
  /** The plane the square lies in; when given it replaces `rulerRotation`. */
  frame?: CornerRulerFrame;
  mode?: CornerRulerMode;
  /** Single axes that count differently from `mode`. */
  axisModes?: CornerRulerAxisModes;
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
};

export type CornerRulerRelativeCoordinates = {
  mode: CornerRulerMode;
  /** What each number counts to, with the single settings applied. */
  modes: Record<CornerRulerAxis, CornerRulerMode>;
  x: number;
  z: number;
  elevation: number;
  rulerOriginWorld: { x: number; y: number; z: number };
  axisXDirection: { x: number; y: number; z: number };
  axisZDirection: { x: number; y: number; z: number };
  xEndpointOnAxis: { x: number; y: number; z: number };
  zEndpointOnAxis: { x: number; y: number; z: number };
  xTargetPoint: { x: number; y: number; z: number };
  zTargetPoint: { x: number; y: number; z: number };
  elevationBasePoint: { x: number; y: number; z: number };
  elevationTargetPoint: { x: number; y: number; z: number };
};

export function computeCornerRulerRelativeCoordinates(
  input: CornerRulerCoordinateInput
): CornerRulerRelativeCoordinates {
  const mode: CornerRulerMode = input.mode === "midpoint" ? "midpoint" : "endpoint";
  const modes = cornerRulerAxisModes(mode, input.axisModes);
  const rulerQuat = quaternionForShape({ rotation: input.rulerRotation });
  const axisX = input.frame ? toVector(input.frame.xAxis).normalize() : new THREE.Vector3(1, 0, 0).applyQuaternion(rulerQuat);
  const axisZ = input.frame ? toVector(input.frame.zAxis).normalize() : new THREE.Vector3(0, 0, 1).applyQuaternion(rulerQuat);
  const axisY = input.frame ? toVector(input.frame.normal).normalize() : new THREE.Vector3(0, 1, 0);

  const rulerCorner = new THREE.Vector3(input.rulerCorner.x, input.rulerCorner.y ?? 0, input.rulerCorner.z);
  const { min, max } = input.bounds;

  const x = modes.x === "midpoint" ? (min.x + max.x) / 2 : min.x;
  const z = modes.z === "midpoint" ? (min.z + max.z) / 2 : min.z;
  const elevation = modes.elevation === "midpoint" ? (min.y + max.y) / 2 : min.y;

  const xEndpointOnAxis = rulerCorner.clone().addScaledVector(axisX, x);
  const zEndpointOnAxis = rulerCorner.clone().addScaledVector(axisZ, z);

  // The guide lines run along the floor - the plane the ruler lies in - to the point below (or beside) the body
  // that the numbers count to; the height has its own arrow (DrJones, forum).
  const xTargetPoint = rulerCorner
    .clone()
    .addScaledVector(axisX, x)
    .addScaledVector(axisZ, z);

  const zTargetPoint = xTargetPoint.clone();

  // The height arrow stands where the two guide lines meet, not at a corner of its own (DrJones, forum).
  const elevationBasePoint = xTargetPoint.clone();

  const elevationTargetPoint = elevationBasePoint
    .clone()
    .addScaledVector(axisY, elevation);

  return {
    mode,
    modes,
    x,
    z,
    elevation,
    rulerOriginWorld: { x: rulerCorner.x, y: rulerCorner.y, z: rulerCorner.z },
    axisXDirection: { x: axisX.x, y: axisX.y, z: axisX.z },
    axisZDirection: { x: axisZ.x, y: axisZ.y, z: axisZ.z },
    xEndpointOnAxis: { x: xEndpointOnAxis.x, y: xEndpointOnAxis.y, z: xEndpointOnAxis.z },
    zEndpointOnAxis: { x: zEndpointOnAxis.x, y: zEndpointOnAxis.y, z: zEndpointOnAxis.z },
    xTargetPoint: { x: xTargetPoint.x, y: xTargetPoint.y, z: xTargetPoint.z },
    zTargetPoint: { x: zTargetPoint.x, y: zTargetPoint.y, z: zTargetPoint.z },
    elevationBasePoint: { x: elevationBasePoint.x, y: elevationBasePoint.y, z: elevationBasePoint.z },
    elevationTargetPoint: { x: elevationTargetPoint.x, y: elevationTargetPoint.y, z: elevationTargetPoint.z },
  };
}

export function computeCornerRulerShift(
  rulerRotation: number,
  axis: "x" | "z",
  delta: number
): { x: number; z: number } {
  const rulerQuat = quaternionForShape({ rotation: rulerRotation });
  const dir = axis === "x"
    ? new THREE.Vector3(1, 0, 0).applyQuaternion(rulerQuat)
    : new THREE.Vector3(0, 0, 1).applyQuaternion(rulerQuat);
  const shift = dir.multiplyScalar(delta);
  return { x: shift.x, z: shift.z };
}

/** One line of a ruler's printed scale: how far along it stands (mm), how long it is across the ruler (a share of its width), and a number when it carries one. */
export type RulerTick = { offset: number; height: number; label?: string };

const MM_PER_INCH = 25.4;

/**
 * The printed scale of a ruler `length` mm long (#500): a line every millimetre, longer at five and at ten, with
 * the tens numbered; or, for someone who works in inches, a line every sixteenth of an inch, longer at the eighths,
 * quarters, halves and whole inches, with the whole inches numbered.
 */
export function rulerTicks(length: number, inches = false): RulerTick[] {
  const ticks: RulerTick[] = [];
  if (!(length > 0)) return ticks;
  if (inches) {
    const last = Math.floor((length / MM_PER_INCH) * 16);
    for (let step = 0; step <= last; step += 1) {
      const whole = step % 16 === 0;
      const height = whole ? 0.62 : step % 8 === 0 ? 0.5 : step % 4 === 0 ? 0.42 : step % 2 === 0 ? 0.34 : 0.26;
      ticks.push({ offset: (step * MM_PER_INCH) / 16, height, ...(whole ? { label: String(step / 16) } : {}) });
    }
    return ticks;
  }
  const last = Math.floor(length);
  for (let value = 0; value <= last; value += 1) {
    const ten = value % 10 === 0;
    ticks.push({ offset: value, height: ten ? 0.62 : value % 5 === 0 ? 0.42 : 0.26, ...(ten ? { label: String(value) } : {}) });
  }
  return ticks;
}

/** The size of a green number field with its switch, in screen pixels (a little over the real one, so a gap is left). */
export const CORNER_RULER_FIELD_SIZE = { width: 74, height: 30 } as const;

type ScreenPoint = { x: number; y: number };
type ScreenBox = { x: number; y: number; halfWidth: number; halfHeight: number };

function boxesOverlap(a: ScreenBox, b: ScreenBox) {
  return Math.abs(a.x - b.x) < a.halfWidth + b.halfWidth && Math.abs(a.y - b.y) < a.halfHeight + b.halfHeight;
}

/** Space left between the height number and the body's outline, in screen pixels. */
const ELEVATION_FIELD_GAP = 6;
/** Half the width of the body's own height box at its corner, which the height number must not cover either. */
const ELEVATION_ARROW_CLEARANCE = 30;

/**
 * Where the height number goes when its spot lies on the measured body (#1279). At height 0 its arrow
 * has no length, so the middle of the arrow is the body's own corner and the field covered the body.
 * It now moves sideways out of the body's outline on the screen, to the side nearer the arrow, at the
 * same height on the screen. A field that is already clear of the body stays where it is.
 */
export function cornerRulerElevationFieldBesideBody(
  field: ScreenPoint,
  arrowX: number,
  body: ScreenBox,
  size: { width: number; height: number } = CORNER_RULER_FIELD_SIZE,
): ScreenPoint {
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  if (!boxesOverlap({ x: field.x, y: field.y, halfWidth, halfHeight }, body)) return field;
  const toLeft = arrowX - (body.x - body.halfWidth) <= body.x + body.halfWidth - arrowX;
  // The arrow's foot is the body's corner, where its grip and its own height box sit: keep clear of them too.
  const leftEdge = Math.min(body.x - body.halfWidth, arrowX - ELEVATION_ARROW_CLEARANCE);
  const rightEdge = Math.max(body.x + body.halfWidth, arrowX + ELEVATION_ARROW_CLEARANCE);
  return {
    x: toLeft ? leftEdge - halfWidth - ELEVATION_FIELD_GAP : rightEdge + halfWidth + ELEVATION_FIELD_GAP,
    y: field.y,
  };
}

/**
 * Moves the centres of the green number fields apart where they would cover each other or the ruler's
 * own buttons (#777): a body next to the ruler's corner has next to no distance, so all numbers sit
 * where the arms meet. A field that is clear stays where it is; one that is not takes the nearest
 * free place around its own spot, to the side, above or below. The order is kept, so the first
 * numbers stay and the later ones step aside.
 */
export function spreadCornerRulerFields(
  fields: ScreenPoint[],
  obstacles: ScreenBox[] = [],
  size: { width: number; height: number } = CORNER_RULER_FIELD_SIZE,
  /** Places only one field must keep clear of, by its index (the height number and the body, #1279). */
  fieldObstacles: ReadonlyArray<ScreenBox[] | undefined> = [],
): ScreenPoint[] {
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  const placed: ScreenBox[] = [];
  return fields.map((field, index) => {
    const own = fieldObstacles[index] ?? [];
    const free = (x: number, y: number) => {
      const box = { x, y, halfWidth, halfHeight };
      return !placed.some((other) => boxesOverlap(box, other))
        && !obstacles.some((other) => boxesOverlap(box, other))
        && !own.some((other) => boxesOverlap(box, other));
    };
    let best: ScreenPoint = field;
    if (!free(field.x, field.y)) {
      let bestDistance = Infinity;
      for (let ring = 1; ring <= 4; ring += 1) {
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const x = field.x + dx * ring * size.width;
          const y = field.y + dy * ring * size.height;
          const distance = Math.hypot(x - field.x, y - field.y);
          if (distance < bestDistance && free(x, y)) {
            best = { x, y };
            bestDistance = distance;
          }
        }
        if (bestDistance < Infinity) break;
      }
    }
    placed.push({ x: best.x, y: best.y, halfWidth, halfHeight });
    return best;
  });
}
