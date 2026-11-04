import { describe, expect, it } from "vitest";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierThreadForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch } from "@/lib/cadProfileSolid";
import { threadSettings, threadSizeById, threadSizeSettings } from "@/lib/threadGeometry";
import { cad, thread, displayMesh, body, triangles, inside } from "./helpers/threadHarness";
import type { Vec3 } from "./helpers/threadHarness";

/*
 * A tapered thread (NPT, Discussion #1267) as an exact body: each half turn is built where it
 * stands, its faces ruled between the tapered helices of the profile's points. The body must be the
 * drawn one - bounds, volume, and points just inside and outside its flanks - for every role.
 */
function npt(label: string, extra: Partial<WorkplaneShape> = {}): Partial<WorkplaneShape> {
  const size = threadSizeById(`${label}" NPT`)!;
  const chosen = threadSizeSettings(size, "v", null);
  return {
    threadDiameter: chosen.diameter,
    threadPitch: chosen.pitch,
    threadProfile: chosen.profile,
    threadDepth: chosen.depth,
    threadFlankAngle: chosen.flankAngle,
    threadTaper: chosen.taper,
    ...extra,
  };
}

describe("a tapered thread's exact body", () => {
  const cases: Array<[string, Partial<WorkplaneShape>]> = [
    ["a 1/2\" NPT rod", npt("1/2", { height: 20 })],
    ["a 1/2\" NPT rod, left hand, chamfered at the top only", npt("1/2", { height: 20, threadHand: "left", threadChamfer: 1, threadChamferBottom: 0 })],
    ["a 1/8\" NPT screw with a hex head", npt("1/8", { threadRole: "screw", threadHead: "hex", height: 16 })],
    ["a 1/2\" NPT nut", npt("1/2", { threadRole: "nut", height: 14 })],
    ["a 1/2\" NPT tapped hole", npt("1/2", { threadRole: "bore", hole: true, height: 16, threadChamfer: 0.8 })],
    ["a 1\" NPT rod (11.5 threads per inch)", npt("1", { height: 18 })],
    ["a tapered M6 rod with the V profile", { threadTaper: true, height: 14 }],
  ];

  it.each(cases)("matches the drawn %s", (_name, extra) => {
    const shape = thread(extra);
    const started = performance.now();
    const solid = body(shape);
    const took = performance.now() - started;
    expect(cad.isValid(solid)).toBe(true);
    // A rod of 20 mm builds in a few seconds even on a busy machine.
    expect(took).toBeLessThan(30000);
    const mesh = displayMesh(shape);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    expect(Math.abs(cad.getVolume(solid) - expected.volume) / expected.volume).toBeLessThan(0.01);
    const part = cadModifierThreadForShape(shape)!;
    expect(part.taper).toBeDefined();
    const settings = threadSettings(shape);
    const depth = settings.pitch * 0.06;
    const tris = triangles(solid, depth * 0.1);
    const onFlank = mesh.local.map((_, i) => i).filter((i) => {
      const [x, y, z] = mesh.local[i];
      const radius = Math.hypot(x, z);
      const shift = part.taper!.slope * (y - part.taper!.at);
      return radius > part.minor + shift - 1e-6 && radius < part.major + shift + 1e-6 && y > part.shaftBottom + 2 * settings.pitch && y < part.height - 2 * settings.pitch;
    });
    const picks = onFlank.filter((_, k) => k % Math.max(1, Math.floor(onFlank.length / 24)) === 0).slice(0, 24);
    let tested = 0;
    for (const i of picks) {
      const v = mesh.vertices[i];
      const n = mesh.normals[i];
      if (!n.every(Number.isFinite)) continue;
      const inPoint: Vec3 = [v[0] - n[0] * depth, v[1] - n[1] * depth, v[2] - n[2] * depth];
      const outPoint: Vec3 = [v[0] + n[0] * depth, v[1] + n[1] * depth, v[2] + n[2] * depth];
      expect(inside(tris, inPoint)).toBe(true);
      expect(inside(tris, outPoint)).toBe(false);
      tested += 1;
    }
    expect(tested).toBeGreaterThan(8);
  });

  it.each([
    ["a rod, narrower at its tip at the top", npt("1/2", { height: 20 }), 3, 16],
    ["a tapped hole, wider at its mouth at the top", npt("1/2", { threadRole: "bore", hole: true, height: 20 }), 16, 3],
  ] as const)("is %s", (_name, extra, wide, narrow) => {
    const shape = thread(extra);
    const part = cadModifierThreadForShape(shape)!;
    const tris = triangles(body(shape), 0.01);
    // Just inside the crest at the wide place: over one pitch the thread reaches that radius somewhere. At the
    // narrow place, 13 mm away, the taper has taken 13/32 mm off every radius, so nothing reaches it there.
    const radius = part.major + part.taper!.slope * (wide - part.taper!.at) - 0.05;
    const along = Array.from({ length: 24 }, (_, k) => (k * part.pitch) / 24);
    expect(along.some((dy) => inside(tris, [radius, wide + dy, 0]))).toBe(true);
    expect(along.some((dy) => inside(tris, [radius, narrow + dy, 0]))).toBe(false);
  });
});
