import { freeformShare, segmentMesh, weldMesh } from "@/lib/meshSurfaceSegments";

/*
 * The part of Make exact's offer that runs in its worker. It lives apart from makeExactOffer.ts, which starts that
 * worker: if the worker imported the file that starts it, webpack would see a chunk cycle between the two.
 */

/** The check stops after this long, without an offer: on free-form meshes and rings it can take minutes. */
export const EXACT_OFFER_CHECK_MS = 5_000;

/**
 * Whether a mesh comes apart into few clean faces: next to nothing in doubt, and many triangles to a face. It runs for
 * as long as it needs, so the page asks through exactOfferFitsOffThread.
 */
export function exactOfferFits(positions: ArrayLike<number>) {
  const welded = weldMesh(positions);
  const seg = segmentMesh(welded, { budgetMs: EXACT_OFFER_CHECK_MS });
  return Boolean(seg && freeformShare(seg) <= 0.01 && seg.regions.length * 20 <= welded.triangles.length);
}

export type ExactOfferRequest = { positions: Float32Array };
export type ExactOfferResponse = { fits: boolean };
