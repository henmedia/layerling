import { describe, expect, it } from "vitest";
import { rotationNeedleAngle, snappedWheelRotation } from "@/components/workplane/transformOverlayTypes";

// #1672: the protractor's needle followed the pointer and started beside the zero when the arrow was grabbed off its middle.
describe("the protractor's needle", () => {
  it("starts on the zero line, straight up", () => {
    expect(rotationNeedleAngle(0)).toBe(-90);
    expect(rotationNeedleAngle(0, -1)).toBe(-90);
  });

  it("moves by the turn applied, in the wheel's direction", () => {
    expect(rotationNeedleAngle(45)).toBe(-45);
    expect(rotationNeedleAngle(45, -1)).toBe(-135);
    expect(rotationNeedleAngle(270)).toBe(180);
    expect(rotationNeedleAngle(-180)).toBe(90);
  });

  it("sits on the tick the readout names however far beside the arrow it was grabbed", () => {
    // Grabbed 8 degrees right of the arrow (zero at -90), dragged on by 40: the wheel snaps the turn to 45.
    const turn = snappedWheelRotation(-82 + 40, -82, 1);
    expect(turn.delta).toBe(45);
    expect(rotationNeedleAngle(turn.delta, 1)).toBe(-45);
  });
});
