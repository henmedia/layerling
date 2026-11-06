import { describe, expect, it } from "vitest";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierThreadForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch } from "@/lib/cadProfileSolid";
import { threadSettings, threadStartsLimit } from "@/lib/threadGeometry";
import { cad, thread, displayMesh, body, triangles, inside } from "./helpers/threadHarness";
import type { Vec3 } from "./helpers/threadHarness";

/*
 * Threads of several starts (#1348): a T8x8 lead screw has four threads side by side, each one
 * pitch (2 mm) from the next and climbing 8 mm a turn. The exact body against the drawn mesh, as
 * for one start: bounds and volume, and points just inside and outside the drawn flanks, which
 * also tell a thread half a turn out of phase or of the wrong hand.
 */

const T8: Partial<WorkplaneShape> = { threadProfile: "trapezoidal", threadDiameter: 8, threadPitch: 2, height: 20 };

describe("a thread of several starts", () => {
  const cases: Array<[string, Partial<WorkplaneShape>]> = [
    ["T8x8 rod, four starts", { ...T8, threadStarts: 4 }],
    ["T8x4 rod, two starts, left hand", { ...T8, threadStarts: 2, threadHand: "left" }],
    ["T8x8 nut, four starts", { ...T8, threadRole: "nut", threadStarts: 4, height: 10 }],
    ["T8x8 tapped hole, four starts", { ...T8, threadRole: "bore", hole: true, threadStarts: 4, height: 12 }],
    ["M6 rod, three starts", { threadStarts: 3, height: 14 }],
    ["screw with two starts", { threadRole: "screw", threadStarts: 2 }],
    ["T8 rod, as many starts as it takes", { ...T8, threadStarts: 99, height: 16 }],
  ];

  it.each(cases)("matches the drawn %s", (_name, extra) => {
    const shape = thread(extra);
    const settings = threadSettings(shape);
    expect(settings.starts).toBe(Math.min(extra.threadStarts ?? 1, threadStartsLimit(settings.diameter, settings.pitch)));
    const solid = body(shape);
    expect(cad.isValid(solid)).toBe(true);
    const mesh = displayMesh(shape);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    expect(Math.abs(cad.getVolume(solid) - expected.volume) / expected.volume).toBeLessThan(0.01);
    const part = cadModifierThreadForShape(shape)!;
    const depth = settings.pitch * 0.06;
    const tris = triangles(solid, depth * 0.1);
    const lead = settings.pitch * settings.starts;
    const onFlank = mesh.local.map((_v, i) => i).filter((i) => {
      const [x, y, z] = mesh.local[i];
      const radius = Math.hypot(x, z);
      return radius > part.minor - 1e-6 && radius < part.major + 1e-6 && y > part.shaftBottom + 2 * settings.pitch && y < part.height - 2 * settings.pitch;
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
    expect(lead).toBeGreaterThan(settings.pitch * 1.5);
  });

  it("is as deep as one start of the same pitch: a rod's volume hardly changes with the starts", () => {
    const one = cad.getVolume(body(thread({ ...T8, threadStarts: 1 })));
    const four = cad.getVolume(body(thread({ ...T8, threadStarts: 4 })));
    expect(Math.abs(four - one) / one).toBeLessThan(0.03);
  });

  it("crosses a plane through the axis with as many tooth sections as one start", () => {
    // Along a line parallel to the axis just inside the crest, the teeth come a pitch apart
    // whatever the starts: four starts of pitch 2 are not one start of pitch 8.
    const shape = thread({ ...T8, threadStarts: 4 });
    const tris = triangles(body(shape), 0.01);
    const part = cadModifierThreadForShape(shape)!;
    const radius = (part.major + part.minor) / 2;
    let changes = 0;
    let last = inside(tris, [radius, 4, 0]);
    for (let y = 4; y <= 16; y += 0.05) {
      const now = inside(tris, [radius, y, 0]);
      if (now !== last) changes += 1;
      last = now;
    }
    // 12 mm of rod at pitch 2: six teeth, each entered and left once.
    expect(changes).toBeGreaterThanOrEqual(11);
    expect(changes).toBeLessThanOrEqual(13);
  });
});
