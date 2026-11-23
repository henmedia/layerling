import { describe, expect, it } from "vitest";
import { LARGEST_SEARCH_MAX_KERNEL_FAULTS, largestHoldingSteps, probeSurvivingKernelFaults } from "@/lib/cadLargestAmount";
import { cadModifierPreviewKey } from "@/lib/cadModifierRuntime";

// Discussion #1970: on some bodies one size of a fillet crashes the CAD kernel and the next is refused cleanly.

const crash = () => new Error("RuntimeError: memory access out of bounds");
const isCrash = (error: unknown) => error instanceof Error && error.message.includes("memory access");
const always = () => true;

describe("searching the largest size that fits", () => {
  it("finds the largest size up to the limit", async () => {
    expect(await largestHoldingSteps(100, (steps) => steps <= 37, always)).toBe(37);
    expect(await largestHoldingSteps(100, () => false, always)).toBeNull();
  });

  it("goes on past a size that crashes the kernel, counting it as refused", async () => {
    let recovered = 0;
    const probe = probeSurvivingKernelFaults((steps: number) => {
      if (steps === 25 || steps === 18) throw crash();
      return steps <= 12;
    }, isCrash, async () => {
      recovered += 1;
    });
    expect(await largestHoldingSteps(100, probe.probe, () => !probe.gaveUp)).toBe(12);
    expect(recovered).toBe(2);
    expect(probe.gaveUp).toBe(false);
  });

  it("stops after a few crashes and gives what it found until then", async () => {
    // 50 crashes, 25 holds, then 37 and 31 crash: the third crash ends the search at 25.
    const probe = probeSurvivingKernelFaults((steps: number) => {
      if (steps <= 30) return true;
      throw crash();
    }, isCrash, async () => undefined);
    const found = await largestHoldingSteps(100, probe.probe, () => !probe.gaveUp);
    expect(probe.faults).toBe(LARGEST_SEARCH_MAX_KERNEL_FAULTS);
    expect(found).toBe(25);
  });

  it("gives nothing when every size crashes, without throwing", async () => {
    const probe = probeSurvivingKernelFaults(() => {
      throw crash();
    }, isCrash, async () => undefined);
    expect(await largestHoldingSteps(100, probe.probe, () => !probe.gaveUp)).toBeNull();
  });

  it("lets other errors and a failed recovery through as they came", async () => {
    const other = probeSurvivingKernelFaults(() => {
      throw new Error("Select at least one highlighted edge");
    }, isCrash, async () => undefined);
    await expect(other.probe()).rejects.toThrow("highlighted edge");
    const stuck = probeSurvivingKernelFaults(() => {
      throw crash();
    }, isCrash, async () => {
      throw new Error("no kernel");
    });
    await expect(stuck.probe()).rejects.toThrow("memory access");
  });
});

describe("the preview that crashed", () => {
  it("is the same request only for the same edges and values", () => {
    const session = { kind: "fillet", selectedEdgeIds: [1, 2], amount: 0.1, quality: "standard", chamferAngle: 45, endAmount: null, concave: false };
    expect(cadModifierPreviewKey(session)).toBe(cadModifierPreviewKey({ ...session, endAmount: undefined }));
    expect(cadModifierPreviewKey(session)).not.toBe(cadModifierPreviewKey({ ...session, amount: 0.2 }));
    expect(cadModifierPreviewKey(session)).not.toBe(cadModifierPreviewKey({ ...session, selectedEdgeIds: [1] }));
  });
});
