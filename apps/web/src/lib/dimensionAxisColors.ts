/**
 * Which of the user's axes a value box measures along, for the workspace setting
 * "Dimension boxes in axis colours" (Discussion #1279): with it on, each box takes
 * the colour of that axis, red X, green Y and blue Z, as the size handles and the
 * arrows at the corner of the plate. The box carries it as `data-axis`; the colour
 * itself is CSS under `.workplane-wrap.dimension-axis-colors`.
 */
export type DimensionUserAxis = "x" | "y" | "z";

/** A size box of the selection: width runs along X, depth along Y, height and the lift above the plate along Z. */
export function sizeDimensionAxis(axis: "width" | "depth" | "height" | "elevation"): DimensionUserAxis {
  if (axis === "width") return "x";
  if (axis === "depth") return "y";
  return "z";
}

/** A move or origin distance: inside, z counts towards the back and is the user's Y (#182); lift is Z. */
export function sceneDimensionAxis(axis: "x" | "z" | "lift"): DimensionUserAxis {
  if (axis === "lift") return "z";
  if (axis === "z") return "y";
  return "x";
}
