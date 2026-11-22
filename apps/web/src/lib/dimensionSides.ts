import type * as THREE from "three";

type FrameAxes = { xAxis: THREE.Vector3; yAxis?: THREE.Vector3; zAxis: THREE.Vector3 };
type Signs = { x: number; z: number };
type Side = "width" | "depth" | "height";

/**
 * The numbers on the edges of a body count along the workplane; its fields (width, depth, height)
 * count along its own sides. With a workplane on a face, and a body turned by a quarter, the two
 * differ: the number on the long edge belongs to the field called depth, not width (#419), and for a
 * body laid on its side the number on the vertical edge belongs to depth or width, not height (#480).
 * Returns the field a mark stands for and how a held edge (the signs of the handle, in the workplane's
 * frame) reads in the body's own frame - or null when the body does not lie along the workplane's
 * axes, where the mark is only the box round it and belongs to no single side.
 */
export function ownSideForMark(markFrame: FrameAxes, ownFrame: FrameAxes, markAxis: Side) {
  const along = markAxis === "width" ? markFrame.xAxis : markAxis === "depth" ? markFrame.zAxis : markFrame.yAxis;
  if (!along) return null;
  const alignment: Record<Side, number> = {
    width: Math.abs(along.dot(ownFrame.xAxis)),
    depth: Math.abs(along.dot(ownFrame.zAxis)),
    height: ownFrame.yAxis ? Math.abs(along.dot(ownFrame.yAxis)) : 0,
  };
  const axis = (Object.keys(alignment) as Side[]).reduce((best, side) => (alignment[side] > alignment[best] ? side : best), "width" as Side);
  // The mark's axis runs along one of the body's own sides: that side is the one it stands for.
  if (alignment[axis] < 0.98) return null;
  const convertSigns = (signs: Signs): Signs => {
    const direction = markFrame.xAxis.clone().multiplyScalar(signs.x).addScaledVector(markFrame.zAxis, signs.z);
    const x = direction.dot(ownFrame.xAxis);
    const z = direction.dot(ownFrame.zAxis);
    return { x: Math.abs(x) > 0.5 ? Math.sign(x) : 0, z: Math.abs(z) > 0.5 ? Math.sign(z) : 0 };
  };
  return { axis, convertSigns };
}

/**
 * A body lying on its side (Discussion #1838): its own height runs along the workplane, under a mark on the plate.
 * Which end of that height the handle of the mark stands at - the body's own top or its base ("bottom") - so a
 * typed size holds the other one; null when the handle does not pull along that mark.
 */
export function ownHeightSidePressed(markFrame: FrameAxes, ownFrame: FrameAxes, markAxis: "width" | "depth", signs: Signs): "top" | "bottom" | null {
  const sign = markAxis === "width" ? signs.x : signs.z;
  if (!sign || !ownFrame.yAxis) return null;
  const along = (markAxis === "width" ? markFrame.xAxis : markFrame.zAxis).dot(ownFrame.yAxis) * sign;
  return Math.abs(along) < 0.5 ? null : along > 0 ? "top" : "bottom";
}
