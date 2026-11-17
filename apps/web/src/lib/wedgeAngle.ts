/**
 * The wedge's slope as an angle (Discussion #1714). The wedge is a right triangle in the front view, rising across its
 * width from nothing at one side to its full height at the other (createBooleanWedgeGeometry), so its slope stands at
 * atan(height / width) to the plate. A wedge is often put down to set a face workplane at an angle; the angle field lets
 * that be typed instead of measured with a protractor.
 */

export const MIN_WEDGE_ANGLE = 1;
export const MAX_WEDGE_ANGLE = 89;

/** The slope's angle to the plate in degrees, rounded to a tenth. */
export function wedgeAngle(width: number, height: number) {
  if (!(width > 0) || !(height > 0)) return 0;
  return Math.round(toDegrees(Math.atan2(height, width)) * 10) / 10;
}

/** The height that gives the slope this angle at this width; the angle is kept between 1 and 89 degrees. */
export function wedgeHeightForAngle(width: number, angle: number) {
  const kept = Math.min(MAX_WEDGE_ANGLE, Math.max(MIN_WEDGE_ANGLE, Number.isFinite(angle) ? angle : 45));
  return width * Math.tan((kept * Math.PI) / 180);
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}
