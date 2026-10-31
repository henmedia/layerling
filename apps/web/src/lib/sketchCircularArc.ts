type Point = { x: number; z: number };

/**
 * How far a Bezier curve may stray from the circle through its ends and middle and still count as
 * that arc, as a share of the radius. A quarter circle as one cubic Bezier is off by 0.027 %, a
 * 120 degree arc by 0.15 %: that is what the sketch's fillet draws, up to corners of about 55
 * degrees. A freely drawn curve is far above this.
 */
const ARC_TOLERANCE = 2e-3;

/**
 * How far (radians) a handle may point off the circle's tangent at its end. The arc through the
 * ends and the middle leaves each end along the circle, not along the handle: a curve that only
 * comes close to a circle - a traced outline (#996) - turned into that arc gets a kink of up to
 * 3 degrees against the curve beside it, and every chamfer and fillet running along the outline
 * fails at such a kink. A fillet's own Bezier, an SVG arc or a DXF circle has its handles on the
 * tangent; rounded coordinates in a file stay well inside this.
 */
const ARC_TANGENT_TOLERANCE = 1e-5;

function bezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
    z: u ** 3 * p0.z + 3 * u * u * t * p1.z + 3 * u * t * t * p2.z + t ** 3 * p3.z,
  };
}

/**
 * The point halfway along a cubic Bezier curve when the curve is a circular arc (a rounded
 * corner of the sketch), null for any other curve. The kernel draws an arc through its ends and
 * this point as a true cylinder wall, not as the free-form surface a Bezier becomes - which it
 * meshes unevenly, shading the wall in patches - and the edge tool and the offset can work on a
 * circle where they cannot on a spline.
 */
export function circularArcMidpoint(p0: Point, p1: Point, p2: Point, p3: Point): Point | null {
  return circularArc(p0, p1, p2, p3)?.mid ?? null;
}

/** The centre of the circle a Bezier curve is an arc of, null for any other curve: where a point snaps to a circle's middle. */
export function circularArcCenter(p0: Point, p1: Point, p2: Point, p3: Point): Point | null {
  return circularArc(p0, p1, p2, p3)?.center ?? null;
}

function circularArc(p0: Point, p1: Point, p2: Point, p3: Point): { mid: Point; center: Point } | null {
  const mid = bezierPoint(p0, p1, p2, p3, 0.5);
  const ax = p0.x - mid.x;
  const az = p0.z - mid.z;
  const bx = p3.x - mid.x;
  const bz = p3.z - mid.z;
  const cross = ax * bz - az * bx;
  const chord = Math.hypot(p3.x - p0.x, p3.z - p0.z);
  // Ends and middle on one line: a straight piece, not an arc.
  if (!(chord > 1e-9) || Math.abs(cross) < 1e-6 * chord * chord) return null;
  const aa = ax * ax + az * az;
  const bb = bx * bx + bz * bz;
  const cx = mid.x + (bz * aa - az * bb) / (2 * cross);
  const cz = mid.z + (ax * bb - bx * aa) / (2 * cross);
  const radius = Math.hypot(p0.x - cx, p0.z - cz);
  if (!(radius > 1e-9) || Math.abs(Math.hypot(p3.x - cx, p3.z - cz) - radius) > ARC_TOLERANCE * radius) return null;
  for (let step = 1; step < 10; step += 1) {
    const point = bezierPoint(p0, p1, p2, p3, step / 10);
    if (Math.abs(Math.hypot(point.x - cx, point.z - cz) - radius) > ARC_TOLERANCE * radius) return null;
  }
  // The handle runs square to the radius at its end, or the arc would leave the curve beside it at an angle.
  for (const [end, handle] of [[p0, p1], [p3, p2]] as const) {
    const hx = handle.x - end.x;
    const hz = handle.z - end.z;
    const length = Math.hypot(hx, hz);
    if (!(length > 1e-12)) return null;
    const along = Math.abs(hx * (end.x - cx) + hz * (end.z - cz)) / (length * radius);
    if (along > Math.sin(ARC_TANGENT_TOLERANCE)) return null;
  }
  return { mid, center: { x: cx, z: cz } };
}
