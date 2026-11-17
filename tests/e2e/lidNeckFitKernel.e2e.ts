import { beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { WorkplaneShape } from "@/types/layerling";

// Manifold loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };

let lidTool: typeof import("@/lib/lidTool");
let canonicalizeShape: typeof import("@/lib/workplaneShapes").canonicalizeShape;

beforeAll(async () => {
  lidTool = await import("@/lib/lidTool");
  ({ canonicalizeShape } = await import("@/lib/workplaneShapes"));
});

function shape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return canonicalizeShape({ id: "jar", name: "Jar", kind: "cylinder", color: "#d97813", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 40, height: 60, rotation: 0, ...overrides } as WorkplaneShape);
}

/** What "Fit the body to the neck" leaves: the body with the patch the button lays on it. */
function fitted(body: WorkplaneShape, standard: "pco1881" | "pco1810" | "gl45" | "mason70" | "mason86") {
  const patch = lidTool.lidNeckFitPatch(body, standard);
  if (!patch) throw new Error(`${body.kind} cannot be fitted`);
  return canonicalizeShape({ ...body, ...patch });
}

describe("fitting a body to a standard's neck, with the real Manifold kernel (issue #1482)", () => {
  it("measures the top as Make lid does, and after the fit Make lid gives the body the neck's thread", async () => {
    const { lidTopForShapes, lidForShapes, lidNeckFit, normalizeLidOptions } = lidTool;
    const options = normalizeLidOptions({ type: "screw", threadStandard: "mason70" });
    // The cylinder of issue #1482: 40 mm across, only the cap, which the panel now says before.
    const before = shape();
    const measured = await lidTopForShapes([before]);
    expect(measured?.round?.outer).toBeCloseTo(20, 3);
    expect(lidNeckFit("mason70", measured!.round)).toEqual({ reason: "size", diameter: 40 });
    const capOnly = await lidForShapes([before], options);
    if (!capOnly.lid) throw new Error(capOnly.error);
    expect(capOnly.screw?.thread).toBeNull();
    expect(capOnly.screw?.capOnly).toEqual({ reason: "size", diameter: 40 });
    // Fitted, it measures as the neck, and Make lid threads it; its height stays.
    const after = fitted(before, "mason70");
    expect(after.height).toBe(60);
    const top = await lidTopForShapes([after]);
    expect(2 * top!.round!.outer).toBeCloseTo(65.85, 2);
    expect(lidNeckFit("mason70", top!.round)).toBeNull();
    const threaded = await lidForShapes([after], options);
    if (!threaded.lid) throw new Error(threaded.error);
    expect(threaded.screw?.capOnly).toBeNull();
    expect(threaded.screw?.thread).not.toBeNull();
    // The neck's thread, 69.85 mm across its crest, round the body's axis.
    const thread = threaded.screw!.thread!;
    expect(thread.width).toBeGreaterThan(69.7);
    expect(thread.width).toBeLessThan(69.9);
  });

  it("threads a fitted tube, an elliptic cylinder and a cylinder for every standard", async () => {
    const { lidForShapes, normalizeLidOptions } = lidTool;
    const cases = [
      { body: shape({ kind: "tube", bevel: 3, width: 30, depth: 30 }), standard: "gl45" as const },
      { body: shape({ kind: "ellipse", width: 50, depth: 30 }), standard: "mason86" as const },
      { body: shape({ width: 100, depth: 100 }), standard: "pco1881" as const },
      { body: shape(), standard: "pco1810" as const },
    ];
    for (const { body, standard } of cases) {
      const result = await lidForShapes([fitted(body, standard)], normalizeLidOptions({ type: "screw", threadStandard: standard }));
      if (!result.lid) throw new Error(`${body.kind} ${standard}: ${result.error}`);
      expect(result.screw?.capOnly, `${body.kind} ${standard}`).toBeNull();
      expect(result.screw?.thread, `${body.kind} ${standard}`).not.toBeNull();
    }
  });

  it("measures a body it cannot resize as well, a group of a cylinder and its hole, and a top that is not round", async () => {
    const { lidTopForShapes } = lidTool;
    const pot = [shape({ id: "outer", width: 50, depth: 50, height: 40 }), shape({ id: "inner", width: 46, depth: 46, height: 40, elevation: 2, hole: true })];
    const measured = await lidTopForShapes(pot);
    expect(2 * measured!.round!.outer).toBeCloseTo(50, 2);
    const box = await lidTopForShapes([shape({ kind: "box", width: 40, depth: 30 })]);
    expect(box).toEqual({ round: null });
    expect(await lidTopForShapes([shape({ hole: true })])).toBeNull();
  });
});
