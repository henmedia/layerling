import * as THREE from "three";
import { groupedShape, quaternionForShape } from "@/lib/editorBooleans";
import { createLocalId } from "@/lib/localIds";
import { normalizePortClearance, portPresetFor, portScrewHoles } from "@/lib/portGeometry";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/** The screw holes the port opening's socket has (a D-Sub's two), or null for an opening without them. */
export function screwHolesOfPort(shape: WorkplaneShape | null | undefined) {
  if (!shape || shape.kind !== "port") return null;
  const clearance = normalizePortClearance(shape.portClearance);
  return portScrewHoles(portPresetFor(shapeWidth(shape), shape.height, shape.cornerFillet, shape.portProfile, clearance), clearance);
}

/**
 * The socket's two screw holes beside its opening, as holes of their own: round openings as deep
 * as it, turned as it is, their middles at its middle height and half the spacing to either side
 * along its width - wherever and however the opening stands.
 */
export function portScrewHoleShapes(port: WorkplaneShape): WorkplaneShape[] {
  const holes = screwHolesOfPort(port);
  if (!holes) return [];
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "port")!;
  const turn = quaternionForShape(port);
  const middle = new THREE.Vector3(port.x, (port.elevation ?? 0) + port.height / 2, port.z);
  const depth = shapeDepth(port);
  return [-1, 1].map((side) => {
    const centre = new THREE.Vector3(side * holes.spacing / 2, 0, 0).applyQuaternion(turn).add(middle);
    const shape = makeShapeFromAsset(asset, { x: centre.x, z: centre.z, elevation: centre.y - holes.diameter / 2 }, {
      width: holes.diameter,
      depth,
      height: holes.diameter,
      cornerFillet: holes.diameter / 2,
      portProfile: "rounded",
    });
    return canonicalizeShape({
      ...shape,
      id: createLocalId("screw-hole"),
      hole: true,
      color: port.color,
      rotation: port.rotation,
      rotationX: port.rotationX,
      rotationZ: port.rotationZ,
    });
  });
}

/**
 * The opening and its two screw holes as one group (all holes, so the group is a hole), named after
 * the socket: moved and turned as one, and grouped with a wall it cuts the opening and both holes.
 * Null for an opening whose socket has no screw holes.
 */
export function portWithScrewHolesGroup(port: WorkplaneShape): WorkplaneShape | null {
  const holes = portScrewHoleShapes(port);
  if (!holes.length) return null;
  const group = groupedShape([{ ...port, hole: true }, ...holes]);
  return group ? canonicalizeShape({ ...group, name: "D-Sub 9" }) : null;
}
