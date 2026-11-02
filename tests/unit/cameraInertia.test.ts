import { describe, expect, it } from "vitest";
import { CAMERA_DAMPING_PER_60HZ_FRAME, timedCameraDamping } from "@/lib/cameraInertia";

// What is left of the glide after `frames` frames of `elapsedMs` each.
function leftAfter(frames: number, elapsedMs: number) {
  return Math.pow(1 - timedCameraDamping(elapsedMs), frames);
}

describe("camera inertia by time", () => {
  it("brakes as before on a 60 Hz screen", () => {
    expect(timedCameraDamping(1000 / 60)).toBeCloseTo(CAMERA_DAMPING_PER_60HZ_FRAME, 10);
  });

  it("ends after the same time on a slow screen as on a fast one (Discussion #1143)", () => {
    // One second at 60, 144 and 8 frames per second.
    const fast = leftAfter(60, 1000 / 60);
    expect(leftAfter(144, 1000 / 144)).toBeCloseTo(fast, 10);
    expect(leftAfter(8, 1000 / 8)).toBeCloseTo(fast, 10);
  });

  it("stays a fraction for long gaps and falls back on odd timings", () => {
    expect(timedCameraDamping(5000)).toBeLessThanOrEqual(1);
    expect(timedCameraDamping(5000)).toBeGreaterThan(0.99);
    expect(timedCameraDamping(0)).toBe(CAMERA_DAMPING_PER_60HZ_FRAME);
    expect(timedCameraDamping(Number.NaN)).toBe(CAMERA_DAMPING_PER_60HZ_FRAME);
  });
});
