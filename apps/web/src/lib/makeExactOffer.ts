import { freeformShare, segmentMesh, weldMesh } from "@/lib/meshSurfaceSegments";
import { LARGE_MESH_TRIANGLES } from "@/lib/largeMeshes";
import { BUILD_ID, buildsDiffer, isBuildMessage, reportWorkerBuild } from "@/lib/buildStamp";

/*
 * Make exact, offered after an import: a finely meshed part made of flat faces and bores becomes far lighter as an exact
 * body, and fillets follow its clean edges. A coarse mesh becomes heavier instead, and a free-form one has nothing to
 * find, so the mesh is looked through first, and the result is looked at before it replaces the mesh.
 */

/** Below this many triangles a mesh is light anyway, and an exact body may well be drawn with more. */
export const EXACT_OFFER_MIN_TRIANGLES = 10_000;
/** The check stops after this long, without an offer: on free-form meshes and rings it can take minutes. */
export const EXACT_OFFER_CHECK_MS = 5_000;
/** Memory a triangle of a mesh takes: nine coordinates of eight bytes. */
const BYTES_PER_TRIANGLE = 72;

export function inExactOfferRange(triangles: number) {
  return triangles >= EXACT_OFFER_MIN_TRIANGLES && triangles < LARGE_MESH_TRIANGLES;
}

/**
 * Whether a mesh comes apart into few clean faces: next to nothing in doubt, and many triangles to a face. It runs for
 * as long as it needs, so the page asks through exactOfferFitsOffThread.
 */
export function exactOfferFits(positions: ArrayLike<number>) {
  const welded = weldMesh(positions);
  const seg = segmentMesh(welded, { budgetMs: EXACT_OFFER_CHECK_MS });
  return Boolean(seg && freeformShare(seg) <= 0.01 && seg.regions.length * 20 <= welded.triangles.length);
}

/**
 * Whether the exact body is worth taking instead of its mesh: clearly fewer triangles, CAD data no bigger than the mesh
 * was, and hardly any of its surface left as facets. The check before cannot know: curved faces that do not close are
 * given up for facets, and a rounded box of 34,000 triangles came out with as many faces and 49 MB of CAD data.
 */
export function exactResultIsLighter(result: { before: number; after: number; brepLength: number; facetShare: number }) {
  return result.after <= result.before * 0.8 && result.brepLength <= result.before * BYTES_PER_TRIANGLE && result.facetShare <= 0.05;
}

export type ExactOfferRequest = { positions: Float32Array };
export type ExactOfferResponse = { fits: boolean };

/**
 * exactOfferFits in a worker of its own, stopped for good when the time is up: in the geometry worker it would hold up
 * the next cut. Anything that goes wrong means no offer.
 */
export function exactOfferFitsOffThread(positions: ArrayLike<number>): Promise<boolean> {
  if (typeof Worker === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("../workers/makeExactOffer.worker.ts", import.meta.url), { type: "module" });
    } catch {
      resolve(false);
      return;
    }
    const finish = (fits: boolean) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(fits);
    };
    const timer = setTimeout(() => finish(false), EXACT_OFFER_CHECK_MS);
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (isBuildMessage(message)) {
        reportWorkerBuild(message);
        // A worker of another build may judge otherwise; the page offers a reload instead.
        if (buildsDiffer(BUILD_ID, message.build)) finish(false);
        return;
      }
      finish((message as ExactOfferResponse).fits === true);
    };
    worker.onerror = () => finish(false);
    const copy = Float32Array.from(positions);
    worker.postMessage({ positions: copy } satisfies ExactOfferRequest, [copy.buffer]);
  });
}
