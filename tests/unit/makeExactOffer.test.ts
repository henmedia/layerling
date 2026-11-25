import { afterEach, describe, expect, it, vi } from "vitest";
import { EXACT_OFFER_CHECK_MS, EXACT_OFFER_MIN_TRIANGLES, exactOfferFits, exactOfferFitsOffThread, exactResultIsLighter, inExactOfferRange } from "@/lib/makeExactOffer";
import { LARGE_MESH_TRIANGLES } from "@/lib/largeMeshes";

/* Make exact, offered after an import of a mesh that would make a good exact body. */

type P = [number, number, number];

/** A closed cylinder: the wall in `rows` rows of `sides` quads, a flat cap at each end. */
function cylinder(sides: number, rows: number): number[] {
  const out: number[] = [];
  const at = (i: number, row: number): P => {
    const angle = ((i % sides) / sides) * Math.PI * 2;
    return [10 * Math.cos(angle), 10 * Math.sin(angle), (row / rows) * 20];
  };
  const push = (...points: P[]) => points.forEach((point) => out.push(...point));
  for (let i = 0; i < sides; i += 1) {
    for (let row = 0; row < rows; row += 1) {
      push(at(i, row), at(i + 1, row), at(i + 1, row + 1));
      push(at(i, row), at(i + 1, row + 1), at(i, row + 1));
    }
    push([0, 0, 0], at(i + 1, 0), at(i, 0));
    push([0, 0, 20], at(i, rows), at(i + 1, rows));
  }
  return out;
}

/** A closed lumpy ball, no simple surface anywhere. */
function lump(k: number): number[] {
  const out: number[] = [];
  const at = (i: number, j: number): P => {
    const u = ((i % (2 * k)) * Math.PI) / k;
    const v = (j * Math.PI) / k;
    const r = 20 + 3 * Math.sin(3 * u) * Math.sin(v) ** 3 * Math.cos(4 * v);
    return [r * Math.sin(v) * Math.cos(u), r * Math.sin(v) * Math.sin(u), r * Math.cos(v)];
  };
  for (let i = 0; i < 2 * k; i += 1) {
    for (let j = 0; j < k; j += 1) {
      if (j > 0) out.push(...at(i, j), ...at(i, j + 1), ...at(i + 1, j));
      if (j < k - 1) out.push(...at(i + 1, j), ...at(i, j + 1), ...at(i + 1, j + 1));
    }
  }
  return out;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the offer to make an import exact", () => {
  it("is for meshes between light and large", () => {
    expect(inExactOfferRange(EXACT_OFFER_MIN_TRIANGLES - 1)).toBe(false);
    expect(inExactOfferRange(EXACT_OFFER_MIN_TRIANGLES)).toBe(true);
    expect(inExactOfferRange(LARGE_MESH_TRIANGLES - 1)).toBe(true);
    // From there on the warning about large meshes speaks instead.
    expect(inExactOfferRange(LARGE_MESH_TRIANGLES)).toBe(false);
  });

  it("fits a part of flat and round faces, not a free-form one", () => {
    expect(exactOfferFits(cylinder(90, 4))).toBe(true);
    expect(exactOfferFits(lump(16))).toBe(false);
  });

  it("does not fit a mesh that is not closed", () => {
    expect(exactOfferFits(cylinder(90, 4).slice(9))).toBe(false);
  });

  it("takes the exact body only when it is clearly lighter", () => {
    // Measured: a perforated plate, fine and coarse, and a rounded box whose curved faces were given up for facets.
    expect(exactResultIsLighter({ before: 40_332, after: 5_196, brepLength: 650_000, facetShare: 0 })).toBe(true);
    expect(exactResultIsLighter({ before: 2_764, after: 5_196, brepLength: 650_000, facetShare: 0 })).toBe(false);
    expect(exactResultIsLighter({ before: 34_356, after: 34_348, brepLength: 49_000_000, facetShare: 0.99 })).toBe(false);
    expect(exactResultIsLighter({ before: 40_000, after: 5_000, brepLength: 49_000_000, facetShare: 0 })).toBe(false);
  });

  it("stops the check for good when the time is up, and makes no offer", async () => {
    vi.useFakeTimers();
    const terminate = vi.fn();
    vi.stubGlobal("Worker", class {
      onmessage: unknown = null;
      onerror: unknown = null;
      postMessage() {}
      terminate = terminate;
    });
    const asked = exactOfferFitsOffThread([0, 0, 0]);
    await vi.advanceTimersByTimeAsync(EXACT_OFFER_CHECK_MS + 1);
    await expect(asked).resolves.toBe(false);
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
