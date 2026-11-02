import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import manifoldModule from "manifold-3d";
import { OcctKernel } from "occt-wasm";
import { buildRevolvedSketchSolid } from "@/lib/cadSketchRevolve";
import { shellSolid } from "@/lib/cadShell";
import { revolveAxisOffset } from "@/lib/revolveAxis";
import { strokedSketchProfile } from "@/lib/sketchStroke";
import type { SketchPoint, SketchProfile } from "@/types/layerling";

function polygon(coordinates: Array<[number, number]>): SketchProfile {
  const points: SketchPoint[] = coordinates.map(([x, z], index) => ({ id: `p${index}`, x, z }));
  return {
    points,
    segments: points.map((point, index) => ({ id: `s${index}`, kind: "line" as const, startId: point.id, endId: points[(index + 1) % points.length].id })),
  };
}

describe("a revolved sketch as an exact solid, with the real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  // The profile stands left of the axis (x <= 0); sketch z runs downwards, so the top is the smallest z.
  const cup = () => polygon([[-20, 0], [0, 0], [0, 30], [-20, 30]]);

  it("turns a rectangle into a cylinder of the right size, standing up", () => {
    const solid = buildRevolvedSketchSolid(kernel, cup(), 0, 360);
    expect(kernel.isValid(solid)).toBe(true);
    expect(kernel.getVolume(solid)).toBeCloseTo(Math.PI * 20 * 20 * 30, 1);
    const bounds = kernel.getBoundingBox(solid, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(40, 3);
    expect(bounds.zmax - bounds.zmin).toBeCloseTo(40, 3);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(30, 3);
    expect(bounds.ymin).toBeCloseTo(0, 3);
  });

  it("takes a part of the turn, from a start angle, either way round", () => {
    const quarter = buildRevolvedSketchSolid(kernel, cup(), 0, 90);
    expect(kernel.getVolume(quarter)).toBeCloseTo((Math.PI * 20 * 20 * 30) / 4, 1);
    const bounds = kernel.getBoundingBox(quarter, false);
    // From +x towards -z: x and -z are positive.
    expect(bounds.xmin).toBeGreaterThan(-1e-6);
    expect(bounds.zmax).toBeLessThan(1e-6);
    const turned = buildRevolvedSketchSolid(kernel, cup(), 90, 90);
    expect(kernel.getVolume(turned)).toBeCloseTo((Math.PI * 20 * 20 * 30) / 4, 1);
    expect(kernel.getBoundingBox(turned, false).zmax).toBeLessThan(1e-6);
    expect(kernel.getBoundingBox(turned, false).xmax).toBeLessThan(1e-6);
    const back = buildRevolvedSketchSolid(kernel, cup(), 90, -90);
    const backBounds = kernel.getBoundingBox(back, false);
    expect(backBounds.xmin).toBeGreaterThan(-1e-6);
    expect(backBounds.zmax).toBeLessThan(1e-6);
  });

  it.each([[0, 90], [0, 180], [30, 200], [0, -120], [300, 150]])("lies about its axis the way revolveAxisOffset says (start %d, sweep %d)", (startAngle, sweepAngle) => {
    const ring = polygon([[-20, 0], [-8, 0], [-8, 30], [-20, 30]]);
    const bounds = kernel.getBoundingBox(buildRevolvedSketchSolid(kernel, ring, startAngle, sweepAngle), false);
    const offset = revolveAxisOffset(ring, { startAngle, sweepAngle });
    // The axis is at the origin of the solid, so the middle of its box is minus the offset.
    expect((bounds.xmin + bounds.xmax) / 2).toBeCloseTo(-offset.x, 2);
    expect((bounds.zmin + bounds.zmax) / 2).toBeCloseTo(-offset.z, 2);
  });

  it("keeps a curve exact: a quarter circle profile makes a dome with the volume of a half sphere", () => {
    // From the axis at the top, out to the rim at the base, bulging outwards.
    const k = 0.5522847498;
    const profile: SketchProfile = {
      points: [
        { id: "a", x: 0, z: 0, handleOut: { x: -20 * k, z: 0 } },
        { id: "b", x: -20, z: 20, handleIn: { x: -20, z: 20 - 20 * k } },
        { id: "c", x: 0, z: 20 },
      ],
      segments: [
        { id: "ab", kind: "bezier", startId: "a", endId: "b" },
        { id: "bc", kind: "line", startId: "b", endId: "c" },
        { id: "ca", kind: "line", startId: "c", endId: "a" },
      ],
    };
    const dome = buildRevolvedSketchSolid(kernel, profile, 0, 360);
    expect(kernel.isValid(dome)).toBe(true);
    // A Bezier quarter circle is within a few hundredths of a percent of the true arc.
    expect(Math.abs(kernel.getVolume(dome) / ((2 / 3) * Math.PI * 20 ** 3) - 1)).toBeLessThan(0.002);
    // The quarter circle is built as an arc, so the dome is a true sphere surface (type 4 in the BREP text), not a free-form revolution.
    const brep = kernel.toBREP(dome);
    const surfaces = brep.slice(brep.indexOf("Surfaces"), brep.indexOf("TShapes")).split(String.fromCharCode(10)).map((row) => row.split(" ")[0]);
    expect(surfaces).toContain("4");
  });

  it("leaves a ring as a ring when the profile has a hole in it", () => {
    const outer = [[-20, 0], [-5, 0], [-5, 30], [-20, 30]] as Array<[number, number]>;
    const inner = [[-15, 5], [-10, 5], [-10, 25], [-15, 25]] as Array<[number, number]>;
    const outerProfile = polygon(outer);
    const innerProfile = polygon(inner);
    const profile: SketchProfile = {
      points: [...outerProfile.points, ...innerProfile.points.map((point) => ({ ...point, id: `i-${point.id}` }))],
      segments: [...outerProfile.segments, ...innerProfile.segments.map((segment) => ({ ...segment, id: `i-${segment.id}`, startId: `i-${segment.startId}`, endId: `i-${segment.endId}` }))],
    };
    const ring = buildRevolvedSketchSolid(kernel, profile, 0, 360);
    const expected = Math.PI * (20 ** 2 - 5 ** 2) * 30 - Math.PI * (15 ** 2 - 10 ** 2) * 20;
    expect(kernel.getVolume(ring)).toBeCloseTo(expected, 0);
  });

  // The reason for all this (#167): a revolved cup could not be hollowed.
  it("can be hollowed: a cup with the top open", () => {
    const solid = buildRevolvedSketchSolid(kernel, cup(), 0, 360);
    const hollow = shellSolid(kernel, solid, 2, "top");
    expect(kernel.isValid(hollow)).toBe(true);
    const outerVolume = Math.PI * 20 * 20 * 30;
    const cavity = Math.PI * 18 * 18 * 28;
    expect(kernel.getVolume(hollow)).toBeCloseTo(outerVolume - cavity, 0);
  });

  // A line with a width turns into a wall (#347): the vase of a Tinkercad video, drawn as one line.
  it("turns an open line with a width into a thin wall", async () => {
    const manifold = await manifoldModule();
    manifold.setup();
    const line: SketchProfile = {
      points: [{ id: "a", x: -20, z: 0 }, { id: "b", x: -20, z: 30 }],
      segments: [{ id: "s", kind: "line", startId: "a", endId: "b" }],
      stroke: { width: 2, align: "center", join: "miter", cap: "flat" },
    };
    const band = strokedSketchProfile(manifold, line, { clipToRevolveSide: true });
    expect(band).not.toBeNull();
    const solid = buildRevolvedSketchSolid(kernel, band!, 0, 360);
    expect(kernel.isValid(solid)).toBe(true);
    expect(kernel.getVolume(solid)).toBeCloseTo(Math.PI * (21 ** 2 - 19 ** 2) * 30, 0);
    const bounds = kernel.getBoundingBox(solid, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(42, 3);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(30, 3);
  });

  it("cuts off at the axis what reaches past it, so the body stays exact and can be hollowed (#1183)", () => {
    // The reporter's bowl: the top's curve has a handle 1.5 mm right of the axis, the curve itself stays left.
    const point = (id: string, x: number, z: number, extra: Partial<SketchPoint> = {}): SketchPoint => ({ id, x, z, mode: "corner", ...extra });
    const points = [
      point("a", 0, 0),
      point("b", -7, 0, { handleOut: { x: -8, z: -1.8333 } }),
      point("c", -13.5, -4, { handleIn: { x: -12, z: -2 }, handleOut: { x: -14.5, z: -5.5 } }),
      point("d", -14.5, -8, { handleIn: { x: -14.5, z: -5.5 }, handleOut: { x: -14, z: -10 } }),
      point("e", -12.5, -11.5, { handleIn: { x: -14, z: -10 }, handleOut: { x: -8, z: -12 } }),
      point("f", -6, -15, { handleIn: { x: -6.6, z: -15 }, handleOut: { x: 1.5453, z: -15 } }),
      point("g", 0, -15, { handleIn: { x: -3.0879, z: -15 } }),
    ];
    const order = ["a", "b", "c", "d", "e", "f", "g"];
    const bowl: SketchProfile = {
      points,
      segments: order.map((id, index) => ({ id: `s${index}`, kind: index === 0 || index === 6 ? "line" as const : "bezier" as const, startId: id, endId: order[(index + 1) % order.length] })),
    };
    const solid = buildRevolvedSketchSolid(kernel, bowl, 0, 360);
    expect(kernel.isValid(solid)).toBe(true);
    const bounds = kernel.getBoundingBox(solid, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(29, 1);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(15, 3);
    expect(kernel.isValid(shellSolid(kernel, solid, 2, "top"))).toBe(true);
    // A rectangle half past the axis keeps its left half, as the mesh revolve does.
    const across = buildRevolvedSketchSolid(kernel, polygon([[-20, 0], [10, 0], [10, 30], [-20, 30]]), 0, 360);
    expect(kernel.getVolume(across)).toBeCloseTo(Math.PI * 20 * 20 * 30, 1);
    // Wholly right of the axis there is nothing to turn, and the caller falls back to the mesh revolve.
    expect(() => buildRevolvedSketchSolid(kernel, polygon([[5, 0], [10, 0], [10, 30], [5, 30]]), 0, 360)).toThrow(/axis/);
  });
});
