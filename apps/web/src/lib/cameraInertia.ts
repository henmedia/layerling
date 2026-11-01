/**
 * OrbitControls brakes the camera by its damping factor once per drawn frame, so on a computer
 * that draws few frames the glide after a drag lasts seconds (Discussion #1143). The factor below
 * brakes by the time that passed instead: as much as a 60 Hz screen would in that time.
 */

/** The braking per frame on a 60 Hz screen, as the 3D view always had it. */
export const CAMERA_DAMPING_PER_60HZ_FRAME = 0.08;

const FRAME_MS_60HZ = 1000 / 60;

/** The damping factor for a frame that came `elapsedMs` after the one before. */
export function timedCameraDamping(elapsedMs: number, perFrame = CAMERA_DAMPING_PER_60HZ_FRAME): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return perFrame;
  return 1 - Math.pow(1 - perFrame, elapsedMs / FRAME_MS_60HZ);
}
