import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShellPanel } from "@/components/workplane/ShellPanel";
import { createLatestJobRunner, shellPreviewKey } from "@/lib/shellPreview";
import { t } from "@/lib/i18n";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

/*
 * The Hollow panel's preview (Discussion #1811). The geometry is the same hollowing Apply always did; what is checked
 * here is the promise around it: the CAD worker gets one hollowing at a time, only the newest settings are built, and
 * Apply takes what the preview has built already instead of hollowing a second time.
 */

/** A job that comes back when the test says so. */
function job<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  let started = 0;
  return { make: () => { started += 1; return promise; }, resolve, reject, get started() { return started; } };
}

const settings = { thickness: 2, openings: "top", edges: "round" };

describe("shellPreviewKey", () => {
  it("is the same for the same body and settings, whatever the panel shows about itself", () => {
    const plain = shellPreviewKey("body-1", settings);
    expect(shellPreviewKey("body-1", { ...settings, busy: true, error: "too thick" } as typeof settings)).toBe(plain);
    expect(shellPreviewKey("body-1", { ...settings, stack: 0, gridCells: 0, gridFit: false, dividers: null })).toBe(plain);
  });

  it("changes with the body and with every setting that changes the result", () => {
    const plain = shellPreviewKey("body-1", settings);
    const others = [
      shellPreviewKey("body-2", settings),
      shellPreviewKey("body-1", { ...settings, thickness: 2.1 }),
      shellPreviewKey("body-1", { ...settings, openings: ["top", "front"] }),
      shellPreviewKey("body-1", { ...settings, edges: "sharp" }),
      shellPreviewKey("body-1", { ...settings, stack: 4 }),
      shellPreviewKey("body-1", { ...settings, stack: 4, stackFoot: { hollow: true } }),
      shellPreviewKey("body-1", { ...settings, gridCells: 4 }),
      shellPreviewKey("body-1", { ...settings, gridCells: 4, gridFit: true }),
      shellPreviewKey("body-1", { ...settings, gridCells: 4, gridMagnets: true }),
      shellPreviewKey("body-1", { ...settings, gridCells: 4, gridColumns: 2, gridRows: 3 }),
      shellPreviewKey("body-1", { ...settings, dividers: { x: 1, z: 2 } }),
      shellPreviewKey("body-1", { ...settings, shelf: 2 }),
      shellPreviewKey("body-1", { ...settings, shelf: 2, shelfHeight: 12 }),
    ];
    expect(new Set([plain, ...others]).size).toBe(others.length + 1);
  });
});

describe("the runner behind the preview", () => {
  it("starts the first job at once and gives its result", async () => {
    const runner = createLatestJobRunner<string>();
    const first = job<string>();
    const asked = runner.request("a", first.make);
    expect(first.started).toBe(1);
    expect(runner.working).toBe(true);
    first.resolve("hollow a");
    await expect(asked).resolves.toBe("hollow a");
    expect(runner.working).toBe(false);
  });

  it("keeps one job at work and builds only the newest of what was asked meanwhile", async () => {
    const runner = createLatestJobRunner<string>();
    const first = job<string>(), second = job<string>(), third = job<string>();
    const askedFirst = runner.request("a", first.make);
    const askedSecond = runner.request("b", second.make);
    const askedThird = runner.request("c", third.make);
    // The slider went on: b is never built.
    await expect(askedSecond).resolves.toBeNull();
    expect(second.started).toBe(0);
    expect(third.started).toBe(0);
    first.resolve("hollow a");
    await askedFirst;
    await Promise.resolve();
    expect(third.started).toBe(1);
    third.resolve("hollow c");
    await expect(askedThird).resolves.toBe("hollow c");
    expect(second.started).toBe(0);
  });

  it("gives Apply what the preview built, without building it again", async () => {
    const runner = createLatestJobRunner<string>();
    const preview = job<string>(), apply = job<string>();
    const shown = runner.request("a", preview.make);
    preview.resolve("hollow a");
    await shown;
    await expect(runner.request("a", apply.make, { retryFailed: true })).resolves.toBe("hollow a");
    expect(apply.started).toBe(0);
  });

  it("lets Apply wait for the preview still at work for the same settings", async () => {
    const runner = createLatestJobRunner<string>();
    const preview = job<string>(), apply = job<string>();
    void runner.request("a", preview.make);
    const applied = runner.request("a", apply.make, { retryFailed: true });
    preview.resolve("hollow a");
    await expect(applied).resolves.toBe("hollow a");
    expect(apply.started).toBe(0);
  });

  it("starts Apply's own job after a preview at work for older settings", async () => {
    const runner = createLatestJobRunner<string>();
    const preview = job<string>(), apply = job<string>();
    const shown = runner.request("a", preview.make);
    const applied = runner.request("b", apply.make, { retryFailed: true });
    expect(apply.started).toBe(0);
    preview.resolve("hollow a");
    await shown;
    await Promise.resolve();
    expect(apply.started).toBe(1);
    apply.resolve("hollow b");
    await expect(applied).resolves.toBe("hollow b");
  });

  it("does not build settings that failed a second time for the preview, but does for Apply", async () => {
    const runner = createLatestJobRunner<string>();
    const first = job<string>(), again = job<string>(), applied = job<string>();
    const asked = runner.request("a", first.make);
    first.reject(new Error("too thick"));
    await expect(asked).rejects.toThrow("too thick");
    await expect(runner.request("a", again.make)).rejects.toThrow("too thick");
    expect(again.started).toBe(0);
    const retried = runner.request("a", applied.make, { retryFailed: true });
    expect(applied.started).toBe(1);
    applied.resolve("hollow a");
    await expect(retried).resolves.toBe("hollow a");
  });

  it("forgets the last result when the panel closes, and keeps nothing of a job that comes back later", async () => {
    const runner = createLatestJobRunner<string>();
    const first = job<string>(), late = job<string>(), fresh = job<string>(), afterLate = job<string>();
    const asked = runner.request("a", first.make);
    first.resolve("hollow a");
    await asked;
    runner.reset();
    const running = runner.request("b", late.make);
    runner.reset();
    late.resolve("hollow b");
    await running;
    await Promise.resolve();
    void runner.request("a", fresh.make);
    expect(fresh.started).toBe(1);
    fresh.resolve("hollow a again");
    await Promise.resolve();
    await Promise.resolve();
    void runner.request("b", afterLate.make);
    expect(afterLate.started).toBe(1);
  });

  it("comes back from settled() when the job at work is done, and drops what waited", async () => {
    const runner = createLatestJobRunner<string>();
    const first = job<string>(), second = job<string>();
    void runner.request("a", first.make).catch(() => undefined);
    const waiting = runner.request("b", second.make);
    let free = false;
    const settled = runner.settled().then(() => { free = true; });
    await expect(waiting).resolves.toBeNull();
    expect(free).toBe(false);
    first.reject(new Error("worker restarted"));
    await settled;
    expect(free).toBe(true);
    expect(second.started).toBe(0);
    await expect(createLatestJobRunner<string>().settled()).resolves.toBeUndefined();
  });
});

describe("the hollow panel while its preview is built", () => {
  const noop = () => {};
  const panel = (extra: Record<string, unknown>) => renderToStaticMarkup(createElement(ShellPanel, {
    targetName: "Box",
    thickness: 2,
    maxThickness: 10,
    openings: "top",
    edges: "round",
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    busy: false,
    error: null,
    appliedFeatureCount: 0,
    reversibleFeatureCount: 0,
    historyOptions: [],
    onRemoveFeature: noop,
    onThicknessChange: noop,
    onOpeningsChange: noop,
    onEdgesChange: noop,
    onApply: noop,
    onCancel: noop,
    ...extra,
  } as unknown as Parameters<typeof ShellPanel>[0]));

  it("says that the preview is being computed", () => {
    expect(panel({ previewBusy: true })).toContain(t("edge.previewBusy"));
    expect(panel({})).not.toContain(t("edge.previewBusy"));
  });

  it("shows an error or Apply at work instead", () => {
    expect(panel({ previewBusy: true, error: "The walls cannot be this thick for this body. Choose a thinner wall." })).not.toContain(t("edge.previewBusy"));
    const applying = panel({ previewBusy: true, busy: true });
    expect(applying).not.toContain(t("edge.previewBusy"));
    expect(applying).toContain(t("shell.working"));
  });
});
