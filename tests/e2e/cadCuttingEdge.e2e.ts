import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { buildStrokedSketchSolid, chamferTopEdges } from "@/lib/cadSketchStroke";
import { silhouetteSketchProfile } from "@/lib/sketchCadProfile";
import type { SketchProfile, SketchStroke } from "@/types/layerling";

/** Squares of 20 mm round the given middles, one outline each. */
function squares(...middles: number[]): SketchProfile {
  const profile: SketchProfile = { points: [], segments: [] };
  middles.forEach((middle, ring) => {
    [[-10, -10], [10, -10], [10, 10], [-10, 10]].forEach(([x, z], index) => {
      profile.points.push({ id: `p${ring}-${index}`, x: middle + x, z, mode: "corner" });
      profile.segments.push({ id: `s${ring}-${index}`, startId: `p${ring}-${index}`, endId: `p${ring}-${(index + 1) % 4}`, kind: "line" });
    });
  });
  return profile;
}

const wall: SketchStroke = { width: 1.2, align: "outside", join: "round", cap: "flat" };

/** A circle of `count` straight pieces, as a cylinder's footprint is cut from its triangles. */
function polygonRing(count: number, radius: number): SketchProfile {
  const ring: SketchProfile = { points: [], segments: [] };
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    ring.points.push({ id: `c${index}`, x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, mode: "corner" });
    ring.segments.push({ id: `d${index}`, startId: `c${index}`, endId: `c${(index + 1) % count}`, kind: "line" });
  }
  return ring;
}

describe("a cutting edge on a stroked wall with the real OCCT kernel (#982)", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  /** Where the edges at the top cross the front wall (x = middle, z < 0), front to back. */
  function topCrossings(shape: ShapeHandle, middle: number) {
    return kernel.getSubShapes(shape, "edge")
      .map((edge) => {
        const { first, last } = kernel.curveParameters(edge);
        return [kernel.curvePointAtParam(edge, first), kernel.curvePointAtParam(edge, last)];
      })
      .filter(([a, b]) => Math.abs(a.y - 15) < 1e-4 && Math.abs(b.y - 15) < 1e-4 && Math.abs(a.z - b.z) < 1e-6 && a.z < 0 && Math.min(a.x, b.x) < middle && Math.max(a.x, b.x) > middle)
      .map(([a]) => Number(a.z.toFixed(4)))
      .sort((a, b) => a - b);
  }

  it("runs the top of a 1.2 mm wall in to 0.4 mm with a 0.4 mm chamfer on both sides", () => {
    const solid = buildStrokedSketchSolid(kernel, squares(0), wall, 15)!;
    const chamfered = chamferTopEdges(kernel, solid, 15, 0.4);
    expect(chamfered).not.toBeNull();
    expect(kernel.isValid(chamfered!)).toBe(true);
    // The wall stood from z = -11.2 to -10 at the front; its top now from -10.8 to -10.4.
    expect(topCrossings(chamfered!, 0)).toEqual([-10.8, -10.4]);
    expect(kernel.getBoundingBox(chamfered!, false).ymax).toBeCloseTo(15, 6);
    // Two 0.4 mm triangles off each of the wall's two rims, all the way round.
    expect(kernel.getVolume(chamfered!)).toBeLessThan(kernel.getVolume(solid));
  });

  it("chamfers every wall of an outline in pieces, which the kernel hands over as a compound", () => {
    const solid = buildStrokedSketchSolid(kernel, squares(0, 40), wall, 15)!;
    expect(kernel.getSubShapes(solid, "solid")).toHaveLength(2);
    const chamfered = chamferTopEdges(kernel, solid, 15, 0.4);
    expect(chamfered).not.toBeNull();
    expect(topCrossings(chamfered!, 0)).toEqual([-10.8, -10.4]);
    expect(topCrossings(chamfered!, 40)).toEqual([-10.8, -10.4]);
  });

  it("leaves walls grown into each other to the polygon stroke when the fuse loses one of them", () => {
    // The outline a cookie cutter took from a mirrored "Rb": with a 5.2 mm line the two letters' rims run into each other,
    // and the kernel's fuse kept the R alone - a valid solid, 30 mm wide instead of 50.
    const outline = silhouetteSketchProfile(JSON.parse(readFileSync("tests/fixtures/mirrored-rb-outline-982.json", "utf8")) as SketchProfile);
    const rim = buildStrokedSketchSolid(kernel, outline, { ...wall, width: 5.2 }, 2);
    if (rim) {
      const box = kernel.getBoundingBox(rim, false);
      expect(box.xmax - box.xmin).toBeGreaterThan(50);
    }
    const thin = buildStrokedSketchSolid(kernel, outline, wall, 2);
    expect(thin).not.toBeNull();
    expect(kernel.getBoundingBox(thin!, false).xmin).toBeCloseTo(-21.17194, 3);
  });

  it("chamfers the two rims of a drawn letter one after the other where they meet in a tight bend", () => {
    // An "R" and a "b" drawn with curves, as an SVG brings them: chamfering both rims at once fails at the R's tight bends.
    const outline = silhouetteSketchProfile(JSON.parse(readFileSync("tests/fixtures/rb-svg-outline-982.json", "utf8")) as SketchProfile);
    const solid = buildStrokedSketchSolid(kernel, outline, wall, 15)!;
    const chamfered = chamferTopEdges(kernel, solid, 15, 0.4);
    expect(chamfered).not.toBeNull();
    expect(kernel.getVolume(chamfered!)).toBeLessThan(kernel.getVolume(solid));
    expect(kernel.getBoundingBox(chamfered!, false).ymax).toBeCloseTo(15, 6);
  });

  it("chamfers a clean outline of many straight pieces, such as a cylinder's footprint", () => {
    const solid = buildStrokedSketchSolid(kernel, polygonRing(120, 15), wall, 15)!;
    expect(chamferTopEdges(kernel, solid, 15, 0.4)).not.toBeNull();
  });

  it("gives up at once on an outline with pieces of a few thousandths of a millimetre instead of trying for minutes", () => {
    // The outline a mirrored text body "Rb" stood on, cut from its triangles: its wall has arcs 0.003 mm long. One try of the
    // kernel at the 1 670 pieces of a text body "Wera" ran 159 s, past the sketch worker's 30 s.
    const outline = silhouetteSketchProfile(JSON.parse(readFileSync("tests/fixtures/mirrored-rb-outline-982.json", "utf8")) as SketchProfile);
    const solid = buildStrokedSketchSolid(kernel, outline, wall, 15)!;
    const started = performance.now();
    expect(chamferTopEdges(kernel, solid, 15, 0.4)).toBeNull();
    expect(performance.now() - started).toBeLessThan(3000);
  });

  it("builds a wall round a hole as well, inside it, and chamfers both walls (#982)", () => {
    // A square of 30 with a hole of 12 off its middle: the inside of a letter. The wall runs outside the outer line and inside
    // the hole, so the dough between them is what the cutter cuts out.
    const frame = squares(0);
    [[-6, -6], [6, -6], [6, 6], [-6, 6]].forEach(([x, z], index) => {
      frame.points.push({ id: `h${index}`, x: x + 3, z, mode: "corner" });
      frame.segments.push({ id: `hs${index}`, startId: `h${index}`, endId: `h${(index + 1) % 4}`, kind: "line" });
    });
    frame.points.forEach((point) => {
      if (point.id.startsWith("p")) Object.assign(point, { x: point.x * 1.5, z: point.z * 1.5 });
    });
    const solid = buildStrokedSketchSolid(kernel, frame, wall, 15)!;
    expect(kernel.getSubShapes(solid, "solid")).toHaveLength(2);
    const box = kernel.getBoundingBox(solid, false);
    expect(box.xmin).toBeCloseTo(-16.2, 4);
    const chamfered = chamferTopEdges(kernel, solid, 15, 0.4);
    expect(chamfered).not.toBeNull();
    expect(kernel.isValid(chamfered!)).toBe(true);
  });
});
