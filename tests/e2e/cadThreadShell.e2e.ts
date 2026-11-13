import { describe, expect, it } from "vitest";
import type { ShapeHandle } from "occt-wasm";
import { cadModifierThreadForShape } from "@/lib/cadProfileExtrusion";
import { shellThreadByCore, threadShellCoreOf } from "@/lib/cadShell";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";
import { body, cad, thread } from "./helpers/threadHarness";

/*
 * Issue #1687: hollowing a threaded rod ran OCCT's thick solid over the helical flanks until the CAD worker timed out.
 * A rod or screw is hollowed through its plain core now: the cavity of a hollowed cylinder of the root's size.
 */

function partOf(shape: WorkplaneShape) {
  const part = cadModifierThreadForShape(shape);
  expect(part).not.toBeNull();
  return { thread: part!, hole: Boolean(shape.hole) };
}

function bounds(shape: ShapeHandle) {
  const box = cad.getBoundingBox(shape, false);
  return [box.xmax - box.xmin, box.ymax - box.ymin, box.zmax - box.zmin];
}

function solidCount(shape: ShapeHandle) {
  return cad.isSolid(shape) ? 1 : cad.getSubShapes(shape, "solid").length;
}

// The rod of the report: 23.5 mm across, 2 mm pitch, 25 mm tall, the ends chamfered.
const reported = () => thread({ threadDiameter: 23.5, threadPitch: 2, height: 25, threadChamfer: 1.25 });

describe("hollowing a thread through its core (#1687)", () => {
  it("hollows the reported rod, open at the top, in moments and keeps its outside", () => {
    const shape = reported();
    const core = threadShellCoreOf([partOf(shape)]);
    expect(core).not.toBeNull();
    const solid = body(shape);
    const started = Date.now();
    const result = shellThreadByCore(cad, solid, core!, 4, "top");
    expect(Date.now() - started).toBeLessThan(20_000);
    expect(cad.isValid(result)).toBe(true);
    expect(solidCount(result)).toBe(1);
    bounds(result).forEach((size, axis) => expect(size).toBeCloseTo(bounds(solid)[axis], 3));
    // The cavity: the core less the wall all round and at the bottom, open at the top.
    const inner = core!.radius - 4;
    const cavity = Math.PI * inner * inner * (core!.height - 4);
    expect(cad.getVolume(solid) - cad.getVolume(result)).toBeCloseTo(cavity, -1);
  }, 60_000);

  it("leaves a closed cavity inside when no side is open", () => {
    const shape = reported();
    const core = threadShellCoreOf([partOf(shape)])!;
    const solid = body(shape);
    const result = shellThreadByCore(cad, solid, core, 3, "none");
    expect(cad.isValid(result)).toBe(true);
    const inner = core.radius - 3;
    expect(cad.getVolume(solid) - cad.getVolume(result)).toBeCloseTo(Math.PI * inner * inner * (core.height - 6), -1);
  }, 60_000);

  it("hollows a screw through its head when the bottom is open", () => {
    const shape = thread({ threadRole: "screw", threadDiameter: 12, threadPitch: 1.75, height: 30 });
    const core = threadShellCoreOf([partOf(shape)])!;
    const solid = body(shape);
    const result = shellThreadByCore(cad, solid, core, 2, "bottom");
    expect(cad.isValid(result)).toBe(true);
    expect(solidCount(result)).toBe(1);
    expect(cad.getVolume(result)).toBeLessThan(cad.getVolume(solid));
  }, 60_000);

  it("hollows a thread lying on its side, its ends open", () => {
    const shape = canonicalizeShape({ ...thread({ threadDiameter: 10, threadPitch: 1.5, height: 20 }), rotationZ: 90 });
    const core = threadShellCoreOf([partOf(shape)])!;
    const solid = body(shape);
    const result = shellThreadByCore(cad, solid, core, 1.5, ["left", "right"]);
    expect(cad.isValid(result)).toBe(true);
    const inner = core.radius - 1.5;
    expect(cad.getVolume(solid) - cad.getVolume(result)).toBeCloseTo(Math.PI * inner * inner * core.height, -1);
  }, 60_000);

  it("says the wall is too thick for the core rather than timing out", () => {
    const shape = reported();
    const core = threadShellCoreOf([partOf(shape)])!;
    expect(() => shellThreadByCore(cad, body(shape), core, core.radius + 1, "top")).toThrow(/thinner wall|cannot be hollowed/);
  }, 60_000);

  it("leaves a nut, a tapped hole and a tapered thread to the usual way", () => {
    expect(threadShellCoreOf([partOf(thread({ threadRole: "nut" }))])).toBeNull();
    expect(threadShellCoreOf([partOf(thread({ threadRole: "bore", hole: true }))])).toBeNull();
    expect(threadShellCoreOf([partOf(thread({ threadTaper: true, threadDiameter: 21.3, threadPitch: 25.4 / 14, height: 20 }))])).toBeNull();
    expect(threadShellCoreOf([partOf(reported()), partOf(reported())])).toBeNull();
  });
});
