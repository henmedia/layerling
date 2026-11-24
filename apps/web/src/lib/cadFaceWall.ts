/**
 * The whole wall at a face, for Delete face (#1797). A mesh made exact can keep a round wall as many small flat faces, and
 * clicking them one by one misses the tiny ones, so the gap cannot close. With Shift, a click takes the face and every
 * face reached from it across edges where the surface turns by no more than WALL_EDGE_ANGLE: the wall of a hole, stopping
 * at a sharp rim. A plain click stays one face, as an exact body's fillet runs smoothly into its neighbours too.
 */
import type { CadFaceInfo } from "@/lib/cadModifierTypes";

/**
 * Where the surface turns by more than this (degrees), the wall stops: a round hole in 9 even facets (40) comes whole, an
 * octagonal one (45) side by side, and a 45-degree chamfer or a 90-degree countersink stays out of the hole's wall.
 */
export const WALL_EDGE_ANGLE = 44;

type WallFaceFacts = Pick<CadFaceInfo, "neighbours" | "bends">;

/** The face and the faces joined to it across edges of WALL_EDGE_ANGLE or less, in id order. faces[id] is the face with that id, as cadFaceList gives them. */
export function cadFaceWall(start: number, faces: WallFaceFacts[]) {
  const wall = new Set([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const { neighbours, bends } = faces[queue[head]];
    neighbours.forEach((next, index) => {
      if (bends[index] <= WALL_EDGE_ANGLE && !wall.has(next)) {
        wall.add(next);
        queue.push(next);
      }
    });
  }
  return [...wall].sort((a, b) => a - b);
}

/** The picked faces after a click on these faces: all of them go when all are picked, else the missing ones come. */
export function toggledFaces(picked: number[], faces: number[]) {
  const missing = faces.filter((id) => !picked.includes(id));
  return missing.length > 0 ? [...picked, ...missing] : picked.filter((id) => !faces.includes(id));
}
