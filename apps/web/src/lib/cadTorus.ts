import type { OcctKernel, ShapeHandle } from "occt-wasm";

const Y_AXIS = { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 } };
/** z up to y up: (x, y, z) -> (x, z, -y). */
const ROTATE_Z_TO_Y = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];

/**
 * A torus about the y axis, centred on the origin (#2187). With the ring at least as wide as the tube
 * it is the kernel's torus. With a tube wider than the ring the circle would run through the axis and
 * the surface through itself, so only the part of the circle outside the axis is turned: a spindle
 * torus, round outside with a dimple on top and below where the hole was. A ring of nothing is a sphere.
 */
export function torusSolid(cad: OcctKernel, majorRadius: number, minorRadius: number): ShapeHandle {
  if (![majorRadius, minorRadius].every(Number.isFinite) || majorRadius < 0 || minorRadius <= 0) {
    throw new Error("The selected primitive has invalid dimensions");
  }
  if (majorRadius >= minorRadius) {
    const raw = cad.makeTorus(majorRadius, minorRadius);
    const solid = cad.transform(raw, ROTATE_Z_TO_Y);
    cad.release(raw);
    return solid;
  }
  if (majorRadius <= minorRadius * 1e-9) return cad.makeSphere(minorRadius);
  // Where the circle about (R, 0) of radius r crosses the axis.
  const reach = Math.sqrt(minorRadius * minorRadius - majorRadius * majorRadius);
  const bottom = { x: 0, y: -reach, z: 0 };
  const top = { x: 0, y: reach, z: 0 };
  const arc = cad.makeArcEdge(bottom, { x: majorRadius + minorRadius, y: 0, z: 0 }, top);
  const axis = cad.makeLineEdge(top, bottom);
  const face = cad.makeFace(cad.makeWire([arc, axis]));
  return cad.revolve(face, Y_AXIS, 2 * Math.PI);
}

/**
 * The radii of a torus grown (or shrunk) by `distance` along its faces: the tube takes the distance,
 * the ring stays. Null when a shrink leaves no tube. `scale` is the even scale its placement carries.
 */
export function offsetTorusRadii(majorRadius: number, minorRadius: number, distance: number, shrink: boolean, scale = 1) {
  const minor = minorRadius + (shrink ? -distance : distance) / scale;
  if (!(minor > 1e-6)) return null;
  return { majorRadius, minorRadius: minor };
}
