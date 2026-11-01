import { describe, expect, it } from "vitest";
import { NOTICE_CHANGE_WINDOW_MS, NOTICE_LINGER_MS, NOTICE_PATIENT_MS, noticeDurationMs, noticeReportsLastChange } from "@/lib/noticeTiming";
import { DEFAULT_WORKPLANE_WORKSPACE, snapGridForUnits, workspaceForUnits } from "@/lib/workplaneSettings";

describe("how long a message of the status line stays (#422)", () => {
  it("keeps a short message for the usual few seconds", () => {
    expect(noticeDurationMs("Saved")).toBe(NOTICE_LINGER_MS);
    expect(noticeDurationMs("x".repeat(30))).toBe(NOTICE_LINGER_MS);
  });

  it("keeps a long message longer, in step with its length", () => {
    const medium = noticeDurationMs("x".repeat(100));
    const long = noticeDurationMs("x".repeat(250));
    expect(medium).toBeGreaterThan(NOTICE_LINGER_MS);
    expect(long).toBeGreaterThan(medium);
  });

  it("never keeps a message longer than the patient time, and a patient one at least that long", () => {
    expect(noticeDurationMs("x".repeat(5000))).toBe(NOTICE_PATIENT_MS);
    expect(noticeDurationMs("Short but patient", true)).toBe(NOTICE_PATIENT_MS);
  });
});

describe("the unit switch beside the snap grid (#422)", () => {
  it("moves the plate's grid and the scale into inches and back, as the settings do", () => {
    const metric = { ...DEFAULT_WORKPLANE_WORKSPACE };
    const imperial = workspaceForUnits(metric, "Imperial");
    expect(imperial.units).toBe("Imperial");
    // The grid of the plate is an inch preset now, not the millimetre one.
    expect(imperial.gridBlockPreset).not.toBe(metric.gridBlockPreset);
    const back = workspaceForUnits(imperial, "Metric (Default)");
    expect(back.units).toBe("Metric (Default)");
    expect(back.gridBlockPreset).toBe(metric.gridBlockPreset);
  });

  it("brings the grid back that was set before, after a trip to inches (#442)", () => {
    const metric = { ...DEFAULT_WORKPLANE_WORKSPACE, gridBlockPreset: "1 mm", gridBlockSize: 1 };
    const imperial = workspaceForUnits(metric, "Imperial");
    expect(imperial.gridBlockPreset).not.toBe("1 mm");
    const back = workspaceForUnits(imperial, "Metric (Default)");
    expect(back.gridBlockPreset).toBe("1 mm");
    expect(back.gridBlockSize).toBe(1);
    // An inch grid is remembered the same way.
    const again = workspaceForUnits({ ...back, gridBlockOtherUnits: imperial.gridBlockPreset }, "Imperial");
    expect(again.gridBlockPreset).toBe(imperial.gridBlockPreset);
    // A custom size is never lost, and the remembered preset is not overwritten by it.
    const custom = workspaceForUnits({ ...metric, gridBlockPreset: "Custom", gridBlockSize: 12 }, "Imperial");
    expect(custom.gridBlockSize).toBe(12);
    expect(workspaceForUnits(custom, "Metric (Default)").gridBlockSize).toBe(12);
    // The same unit system changes nothing.
    expect(workspaceForUnits(metric, "Metric (Default)")).toBe(metric);
  });

  it("gives the snap step one the unit system offers", () => {
    expect(snapGridForUnits("Imperial", "1.0 mm")).toBe("1/8 in");
    expect(snapGridForUnits("Metric (Default)", "1/8 in")).toBe("1.0 mm");
  });
});

describe("a message that reports the step just taken offers Undo", () => {
  const change = { at: 5000, index: 3 };
  it("offers it for a message right before or after the step", () => {
    expect(noticeReportsLastChange(5200, change, 3)).toBe(true);
    expect(noticeReportsLastChange(4900, change, 3)).toBe(true);
  });
  it("not for a message long after it, nor once the step is undone or followed by another", () => {
    expect(noticeReportsLastChange(5000 + NOTICE_CHANGE_WINDOW_MS + 1, change, 3)).toBe(false);
    expect(noticeReportsLastChange(5100, change, 2)).toBe(false);
    expect(noticeReportsLastChange(5100, null, 3)).toBe(false);
  });
  it("not for the first entry, which there is nothing before", () => {
    expect(noticeReportsLastChange(5000, { at: 5000, index: 0 }, 0)).toBe(false);
  });
});
