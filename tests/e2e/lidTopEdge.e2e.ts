import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { lidForSolid, lidTopEdgeFits, lidTopEdgeSize, normalizeLidOptions } from "@/lib/lidTool";

type Solid = { delete?: () => void };

function dispose(values: Solid[]) {
  Array.from(new Set(values)).forEach((value) => value?.delete?.());
}

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}

type Kernel = Awaited<ReturnType<typeof runtime>>;

/** A round pot 60 across and 50 high (y up), wall and floor 2 mm, open at the top, as the other lid tests have it. */
function openPot(kernel: Kernel, created: Solid[]) {
  const outer = kernel.Manifold.cylinder(50, 30, 30, 192).rotate([-90, 0, 0]);
  const cavity = kernel.Manifold.cylinder(50, 28, 28, 192).rotate([-90, 0, 0]).translate([0, 2, 0]);
  const pot = outer.subtract(cavity);
  created.push(outer, cavity, pot);
  return pot;
}

/** The cap for the pot with these options: its volume, its radius, and how many pieces it is. */
function cap(kernel: Kernel, given: Record<string, unknown>) {
  const created: Solid[] = [];
  try {
    const options = normalizeLidOptions({ type: "screw", thickness: 2, gap: 0.2, wall: 1.6, ...given });
    const result = lidForSolid(kernel, openPot(kernel, created), options);
    if ("error" in result) throw new Error(JSON.stringify(result.error));
    created.push(result.lid, ...(result.screw?.thread ? [result.screw.thread] : []), ...(result.bayonet ? [result.bayonet.lugs] : []));
    const diameter = result.screw?.diameter ?? result.bayonet?.diameter ?? 0;
    const pieces = result.lid.decompose();
    created.push(...pieces);
    return { volume: result.lid.volume(), radius: diameter / 2, pieces: pieces.length, height: result.lid.boundingBox().max[1] - result.lid.boundingBox().min[1] };
  } finally {
    dispose(created);
  }
}

/**
 * Discussion #1426: Tom prints his pottery lids top down and wanted the top rim rounded. Cap and thread are one mesh of
 * about 29,000 triangles, far more than the edge tool takes, so the lid tool makes the edge with the cap.
 */
describe("a screw or bayonet cap's rounded or chamfered top edge", () => {
  it("chamfers the rim by the size asked for, and rounds it by as much", async () => {
    const kernel = await runtime();
    const square = cap(kernel, {});
    const chamfered = cap(kernel, { topEdge: "chamfer", topEdgeSize: 1.5 });
    const rounded = cap(kernel, { topEdge: "round", topEdgeSize: 1.5 });
    // The corner taken away, turned about the axis: a triangle of 1.5 x 1.5, or the square less a quarter circle.
    const ring = (area: number) => 2 * Math.PI * (square.radius - 0.5) * area;
    expect(square.volume - chamfered.volume).toBeGreaterThan(ring(1.125) * 0.9);
    expect(square.volume - chamfered.volume).toBeLessThan(ring(1.125) * 1.1);
    expect(square.volume - rounded.volume).toBeGreaterThan(ring(2.25 * (1 - Math.PI / 4)) * 0.85);
    expect(square.volume - rounded.volume).toBeLessThan(ring(2.25 * (1 - Math.PI / 4)) * 1.15);
    // One piece still, as high and as wide as before.
    expect(chamfered.pieces).toBe(1);
    expect(rounded.pieces).toBe(1);
    expect(chamfered.height).toBeCloseTo(square.height, 3);
    expect(chamfered.radius).toBeCloseTo(square.radius, 3);
  });

  it("works on a bayonet cap too", async () => {
    const kernel = await runtime();
    const square = cap(kernel, { type: "bayonet" });
    const chamfered = cap(kernel, { type: "bayonet", topEdge: "chamfer", topEdgeSize: 1 });
    expect(square.volume - chamfered.volume).toBeGreaterThan(2 * Math.PI * (square.radius - 0.4) * 0.5 * 0.9);
    expect(chamfered.pieces).toBe(1);
  });

  it("holds the edge to the plate's thickness", async () => {
    const kernel = await runtime();
    expect(lidTopEdgeSize(normalizeLidOptions({ thickness: 2, topEdgeSize: 5 }))).toBe(2);
    const asked = cap(kernel, { topEdge: "chamfer", topEdgeSize: 5 });
    const held = cap(kernel, { topEdge: "chamfer", topEdgeSize: 2 });
    expect(asked.volume).toBeCloseTo(held.volume, 3);
  });

  it("is only for screw and bayonet caps, square unless asked", () => {
    expect(normalizeLidOptions({}).topEdge).toBe("square");
    expect(normalizeLidOptions({ topEdge: "ROUND", topEdgeSize: 0 })).toMatchObject({ topEdge: "round", topEdgeSize: 0.2 });
    expect(normalizeLidOptions({ topEdge: "bevel" }).topEdge).toBe("square");
    expect(lidTopEdgeFits({ type: "screw" })).toBe(true);
    expect(lidTopEdgeFits({ type: "bayonet" })).toBe(true);
    expect(lidTopEdgeFits({ type: "screwIn" })).toBe(false);
    expect(lidTopEdgeFits({ type: "plug" })).toBe(false);
  });
});
