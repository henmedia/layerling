import type { SketchProfile } from "@/types/layerling";

type Vec2 = { x: number; z: number };

/**
 * How an extruded sketch body that only stands turned about the vertical lies on the plate (forum, 621358): where
 * its sketch's origin is and where the sketch's own x and z axes point, all in plate coordinates. Opened with it,
 * the sketch shows the body as it stands in 3D, turned and moved, on the plate's own grid; finishing turns the
 * drawing back into the body's frame, so the body keeps its turn.
 */
export type SketchEditTurn = { origin: Vec2; xAxis: Vec2; zAxis: Vec2 };

/** The body's sketch axes as unit vectors in the plate; null when they are not a plain turn (tilted or mirrored). */
export function sketchEditTurn(origin: Vec2, xAxis: Vec2, zAxis: Vec2): SketchEditTurn | null {
  const lengthX = Math.hypot(xAxis.x, xAxis.z);
  const lengthZ = Math.hypot(zAxis.x, zAxis.z);
  if (!(Math.abs(lengthX - 1) < 1e-6 && Math.abs(lengthZ - 1) < 1e-6)) return null;
  // A turn keeps z a quarter turn on from x; a mirror would flip it.
  if (Math.abs(xAxis.x * zAxis.z - xAxis.z * zAxis.x - 1) > 1e-6) return null;
  return { origin, xAxis, zAxis };
}

function toPlate(turn: SketchEditTurn, point: Vec2): Vec2 {
  return {
    x: turn.origin.x + point.x * turn.xAxis.x + point.z * turn.zAxis.x,
    z: turn.origin.z + point.x * turn.xAxis.z + point.z * turn.zAxis.z,
  };
}

function toBody(turn: SketchEditTurn, point: Vec2): Vec2 {
  const dx = point.x - turn.origin.x;
  const dz = point.z - turn.origin.z;
  return { x: dx * turn.xAxis.x + dz * turn.xAxis.z, z: dx * turn.zAxis.x + dz * turn.zAxis.z };
}

/** The angle a picture turns by, in the sketch's own sense of a picture's rotation (counter-clockwise on screen). */
function turnDegrees(turn: SketchEditTurn) {
  return (Math.atan2(-turn.xAxis.z, turn.xAxis.x) * 180) / Math.PI;
}

/**
 * The profile moved between the body's frame and the plate: its points with their curve handles, its pictures
 * (middle and angle) and its notes. A key ring stays in the body's frame, so a profile with one is not turned.
 */
export function turnedSketchProfile(profile: SketchProfile, turn: SketchEditTurn, direction: "toPlate" | "toBody"): SketchProfile {
  const move = direction === "toPlate" ? (point: Vec2) => toPlate(turn, point) : (point: Vec2) => toBody(turn, point);
  const degrees = (direction === "toPlate" ? 1 : -1) * turnDegrees(turn);
  const moved = <T extends Vec2>(item: T): T => ({ ...item, ...move(item) });
  return {
    ...profile,
    points: profile.points.map((point) => ({
      ...moved(point),
      handleIn: point.handleIn ? move(point.handleIn) : undefined,
      handleOut: point.handleOut ? move(point.handleOut) : undefined,
    })),
    ...(profile.images ? { images: profile.images.map((image) => ({ ...moved(image), rotation: normalizedDegrees((image.rotation ?? 0) + degrees) })) } : {}),
    ...(profile.notes ? { notes: profile.notes.map(moved) } : {}),
  };
}

function normalizedDegrees(degrees: number) {
  let result = degrees % 360;
  if (result > 180) result -= 360;
  if (result <= -180) result += 360;
  return Math.abs(result) < 1e-9 ? 0 : result;
}
