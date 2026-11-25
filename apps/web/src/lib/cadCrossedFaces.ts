import type { OcctKernel, ShapeHandle } from "occt-wasm";
import { openMeshEdges } from "@/lib/cadInnerCorners";

/*
 * A fillet or chamfer round a notch can come back as a "valid" solid whose faces run through each other, or with a flat
 * face meshed over a place outside its outline: grouped discs where one barely shows between two others came out that
 * way, once in a hundred tries, with a volume a sixth too large. Two things give it away together: its coarse mesh is
 * open along a dozen edges and more, and a fine mesh holds another volume than the body's own surfaces do. On a sound
 * body the fine mesh keeps the volume to a few hundredths of a percent.
 *
 * Faces that cross in a small place leave the volume alone: there a middling mesh that is open as well gives it away.
 * Of 1472 fillets and chamfers of random discs that were taken, the one with crossed faces had 38 and 58 open edges in
 * the two meshes, the others at most one and two. A fine mesh alone says nothing, sound bodies show hundreds in it.
 *
 * Only a body of flat and round faces is judged. A herringbone gear (#1007) shows both signs once its middle edges are
 * rounded, where the kernel's surfaces do not quite meet; it stays accepted as before.
 *
 * Both are meshed on a fresh copy, which leaves the triangulation the body already carries as it is.
 */

const COARSE = { linearDeflection: 0.1, angularDeflection: 0.5 };
const MIDDLING = { linearDeflection: 0.02, angularDeflection: 0.2 };
const FINE = { linearDeflection: 0.005, angularDeflection: 0.1 };
const MAX_LOOSE_EDGES = 4;
const VOLUME_TOLERANCE = 0.003;
/** Above this many faces the meshing would cost more than it is worth, and such a body is hardly a notched outline. */
const MAX_FACES = 400;
const PLAIN_SURFACES = new Set(["plane", "cylinder", "cone", "sphere", "torus"]);

/** Whether the fillet or chamfer of `before` came out as a body with faces that cross. A body too large to ask, or that cannot be meshed, is not judged. */
export function cadTreatmentCrossesFaces(cad: OcctKernel, before: ShapeHandle, body: ShapeHandle, isFatal: (error: unknown) => boolean) {
  const own: ShapeHandle[] = [];
  const fresh = () => {
    const copy = cad.copy(body);
    own.push(copy);
    return copy;
  };
  try {
    if (cad.subShapeCount(body, "face") > MAX_FACES) return false;
    const faces = cad.getSubShapes(before, "face");
    own.push(...faces);
    if (faces.some((face) => !PLAIN_SURFACES.has(cad.surfaceType(face)))) return false;
    if (openMeshEdges(cad, fresh(), COARSE) <= MAX_LOOSE_EDGES) return false;
    if (openMeshEdges(cad, fresh(), MIDDLING) > MAX_LOOSE_EDGES) return true;
    const { positions, indices } = cad.tessellate(fresh(), FINE);
    const volume = cad.getVolume(body);
    return Math.abs(meshVolume(positions, indices) - volume) > Math.abs(volume) * VOLUME_TOLERANCE;
  } catch (error) {
    if (isFatal(error)) throw error;
    return false;
  } finally {
    for (const handle of own) {
      try {
        cad.release(handle);
      } catch {
        // Gone already.
      }
    }
  }
}

function meshVolume(positions: ArrayLike<number>, indices: ArrayLike<number>) {
  let volume = 0;
  for (let index = 0; index < indices.length; index += 3) {
    const [a, b, c] = [indices[index] * 3, indices[index + 1] * 3, indices[index + 2] * 3];
    volume += (positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1])
      - positions[a + 1] * (positions[b] * positions[c + 2] - positions[b + 2] * positions[c])
      + positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c])) / 6;
  }
  return Math.abs(volume);
}
