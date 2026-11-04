/**
 * Thin faces taken along when faces are deleted (#451). A mesh made exact (#1245) can keep hair-thin faces where bad
 * triangles were: they part one flat face into strips, they are too thin to click, and the strips alone cannot be deleted
 * because the sliver between them stays. Such a face goes along with a picked flat face it touches, together with the
 * thin faces joined to it that touch a face in that plane too, when they lead on to another face in the plane; one that
 * only leads to faces in other planes (a thread's crest, a narrow chamfer, the facets of a curve) stays where it is.
 */
import type { CadFaceInfo } from "@/lib/cadModifierTypes";

/** Narrower than this (twice the area over the perimeter) a face is thin: no printer makes it. */
export const THIN_FACE_WIDTH = 0.05;
/** Normals within half a degree point the same way. */
const SAME_PLANE_COS = Math.cos((0.5 * Math.PI) / 180);
/** Parallel planes this close (mm) are one plane, as Make exact leaves them. */
const SAME_PLANE_OFFSET = 0.01;

type ThinFaceFacts = Pick<CadFaceInfo, "id" | "center" | "normal" | "width" | "neighbours">;

/** Whether a face is thin, as list_faces marks it. */
export function isThinFace(face: Pick<CadFaceInfo, "width">) {
  return face.width < THIN_FACE_WIDTH;
}

function samePlane(a: ThinFaceFacts, b: ThinFaceFacts) {
  // Only flat faces have a normal.
  if (!a.normal || !b.normal) return false;
  const n = a.normal;
  if (n.x * b.normal.x + n.y * b.normal.y + n.z * b.normal.z < SAME_PLANE_COS) return false;
  return Math.abs(n.x * (b.center.x - a.center.x) + n.y * (b.center.y - a.center.y) + n.z * (b.center.z - a.center.z)) <= SAME_PLANE_OFFSET;
}

/**
 * The thin faces that go along with the picked ones, in id order, the picked faces not among them. For each picked
 * flat face that is not thin itself, a thin face touching it goes along together with the thin faces joined to it,
 * directly or through each other, that also touch a face in its plane, when that group reaches a face in the plane
 * other than the picked one. A face in the plane is one that is not thin itself and faces the same way. faces[id] is
 * the face with that id, as cadFaceList gives them.
 */
export function thinFacesWith(picked: number[], faces: ThinFaceFacts[]) {
  const chosen = new Set(picked);
  const taken = new Set<number>();
  picked.forEach((id) => {
    // Only a flat picked face that is not thin itself has a plane for thin faces to lie along.
    const face = faces[id];
    if (!face.normal || isThinFace(face)) return;
    const inPlane = (other: ThinFaceFacts) => !isThinFace(other) && samePlane(face, other);
    const touchesPlane = (thin: ThinFaceFacts) => thin.neighbours.some((next) => inPlane(faces[next]));
    const seen = new Set<number>();
    face.neighbours.forEach((start) => {
      const first = faces[start];
      if (!isThinFace(first) || seen.has(start)) return;
      // The thin faces joined to this one that lie along the plane too, a thin face picked by hand among them.
      const group = [first];
      seen.add(start);
      for (let head = 0; head < group.length; head += 1) {
        group[head].neighbours.forEach((next) => {
          const other = faces[next];
          if (isThinFace(other) && !seen.has(next) && touchesPlane(other)) {
            seen.add(next);
            group.push(other);
          }
        });
      }
      const bridges = group.some((thin) => thin.neighbours.some((next) => next !== id && inPlane(faces[next])));
      if (bridges) group.filter((thin) => !chosen.has(thin.id)).forEach((thin) => taken.add(thin.id));
    });
  });
  return [...taken].sort((a, b) => a - b);
}
