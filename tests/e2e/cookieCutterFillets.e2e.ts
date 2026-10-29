import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { COOKIE_CUTTER_DEFAULTS, cookieCutterFillets, cookieCutterProfiles } from "@/lib/cookieCutter";
import type { SketchProfile } from "@/types/layerling";

/** Squares of `half` round (cx, cz), one outline each, as a sketch. */
function squares(...rings: Array<[number, number, number]>): SketchProfile {
  const profile: SketchProfile = { points: [], segments: [] };
  rings.forEach(([cx, cz, half], ring) => {
    [[-half, -half], [half, -half], [half, half], [-half, half]].forEach(([x, z], index) => {
      profile.points.push({ id: `r${ring}-${index}`, x: cx + x, z: cz + z, mode: "corner" });
      profile.segments.push({ id: `t${ring}-${index}`, startId: `r${ring}-${index}`, endId: `r${ring}-${(index + 1) % 4}`, kind: "line" });
    });
  });
  return profile;
}

function heights(mesh: { positions: Float32Array }) {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (let index = 1; index < mesh.positions.length; index += 3) {
    low = Math.min(low, mesh.positions[index]);
    high = Math.max(high, mesh.positions[index]);
  }
  return { low, high };
}

describe("cookie cutter fillets (real Manifold kernel, avxmw #982)", () => {
  it("joins the outer wall to the rim with a slope as high as the fillet, and builds nothing without fillets", async () => {
    const runtime = await Module();
    runtime.setup();
    const plain = squares([0, 0, 20]);
    const options = { ...COOKIE_CUTTER_DEFAULTS, mirror: false, fillet: 1.5 };
    const mesh = cookieCutterFillets(runtime, cookieCutterProfiles(plain, options), options)!;
    expect(mesh.indices.length).toBeGreaterThan(0);
    const { low, high } = heights(mesh);
    expect(low).toBeCloseTo(options.rimHeight, 6);
    // The steps stand under the 45° slope, the top one a step below its full height.
    expect(high).toBeLessThanOrEqual(options.rimHeight + 1.5 + 1e-6);
    expect(high).toBeGreaterThan(options.rimHeight + 1.5 - 0.11);
    // It stays outside the wall's inner face: nothing of it lies inside the outline.
    let inside = 0;
    for (let index = 0; index < mesh.positions.length; index += 3) {
      if (Math.abs(mesh.positions[index]) < 19.99 && Math.abs(mesh.positions[index + 2]) < 19.99) inside += 1;
    }
    expect(inside).toBe(0);
    expect(cookieCutterFillets(runtime, cookieCutterProfiles(plain, { ...options, fillet: 0 }), { ...options, fillet: 0 })).toBeNull();
  });

  it("joins the inner walls to the bridges, and with a plate to the plate", async () => {
    const runtime = await Module();
    runtime.setup();
    const framed = squares([0, 0, 20], [0, 0, 8]);
    const bridged = { ...COOKIE_CUTTER_DEFAULTS, mirror: false, fillet: 1 };
    const onBridges = cookieCutterFillets(runtime, cookieCutterProfiles(framed, bridged), bridged)!;
    // The lowest steps stand on the rim and, inside, on the bridges; both are 2 and 3 mm high by default.
    const bridgeLevel = heights(onBridges);
    expect(bridgeLevel.low).toBeCloseTo(bridged.rimHeight, 6);
    expect(bridgeLevel.high).toBeGreaterThan(bridged.bridgeHeight + 1 - 0.11);
    const plated = { ...bridged, plate: 1 };
    const onPlate = cookieCutterFillets(runtime, cookieCutterProfiles(framed, plated), plated)!;
    expect(heights(onPlate).low).toBeCloseTo(1, 6);
  });
});
