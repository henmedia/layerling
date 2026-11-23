/*
 * The search behind "largest size that fits" (Discussion #1635), apart from the kernel so it can be tested.
 * Sizes are counted in steps; `holds` says whether the picked edges take a size of that many steps.
 */

/** How many times the kernel may crash during one search before the search gives up (Discussion #1970). */
export const LARGEST_SEARCH_MAX_KERNEL_FAULTS = 3;

/**
 * The largest number of steps up to `top` that still holds, or null when not even one step does or the time ran
 * out before any did. First halved down until a size goes through, then halved between that and the one that
 * failed; only a size that went through is ever given back. `nearLimit` is the last try a hair below the size that
 * failed, for a size the kernel refuses only because it takes the face beside the edge away whole.
 */
export async function largestHoldingSteps(
  top: number,
  holds: (steps: number, nearLimit: boolean) => boolean | Promise<boolean>,
  inTime: () => boolean,
): Promise<number | null> {
  let high = top;
  let low = 0;
  for (let probe = Math.floor(high / 2); probe >= 1; probe = Math.floor(probe / 2)) {
    if (!inTime()) return null;
    if (await holds(probe, false)) {
      low = probe;
      break;
    }
    high = probe;
  }
  if (low === 0) return null;
  while (high - low > 1 && inTime()) {
    const middle = Math.floor((low + high) / 2);
    if (await holds(middle, false)) low = middle;
    else high = middle;
  }
  if (high - low === 1 && high < top && inTime() && await holds(high, true)) low = high;
  return low;
}

/**
 * A probe that survives a crash of the kernel (Discussion #1970): on some bodies OCCT runs out of memory at one size
 * and refuses the next cleanly. A crash counts as "does not hold" once `recover` has the kernel and the body back.
 * After `maxFaults` crashes `gaveUp` turns true, and the search should stop there with what it found; a crash that
 * cannot be recovered from goes up as it came.
 */
export function probeSurvivingKernelFaults<T extends unknown[]>(
  probe: (...args: T) => boolean | Promise<boolean>,
  isFault: (error: unknown) => boolean,
  recover: () => Promise<void>,
  maxFaults = LARGEST_SEARCH_MAX_KERNEL_FAULTS,
) {
  const state = {
    faults: 0,
    get gaveUp() {
      return state.faults >= maxFaults;
    },
    probe: async (...args: T) => {
      try {
        return await probe(...args);
      } catch (error) {
        if (!isFault(error)) throw error;
        state.faults += 1;
        try {
          await recover();
        } catch {
          throw error;
        }
        return false;
      }
    },
  };
  return state;
}
