import manifoldModule, { type Manifold, type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import {
  HOLE_PATTERN_MAX_HOLE_TILT,
  HOLE_PATTERN_MIN_WALL,
  holeCrossSection,
  holeExitShift,
  holeFootprintPolygon,
  holePatternCenters,
  holePatternWall,
  holeTiltRadians,
  normalizeHolePattern,
  normalizeHoleTilt,
  rectangleOutline,
  type HolePatternSettings,
  type Point2,
} from "@/lib/holePattern";
import { holePatternShapes, readHolePatternFace, readPerforableFace, type PerforableFace } from "@/lib/holePatternShapes";
import { shapeToManifoldSolid } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/*
 * Holes sloping through the wall (holeTilt, in degrees): every hole of a pattern on a flat face is tipped about the
 * face's x axis, so on a standing wall the holes rise or fall into it. Positive puts the inner end higher, which sheds
 * rain. The size is the hole's own cross-section; the face shows it longer. The holes are fitted with their outline
 * on the face together with the same outline where it comes out of the back of the wall, so both ends keep the
 * margin, and the wall between holes is measured square to them.
 */

let runtime: ManifoldToplevel;
beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

const area = (polygon: readonly Point2[]) => {
  let sum = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    sum += a.u * b.v - b.u * a.v;
  }
  return Math.abs(sum) / 2;
};

/** World triangles of a solid, nine numbers each, as the editor hands them to the face reader. */
function triangles(solid: Manifold) {
  const mesh = solid.getMesh();
  const out: number[] = [];
  for (let t = 0; t < mesh.triVerts.length; t += 1) {
    const at = mesh.triVerts[t] * mesh.numProp;
    out.push(mesh.vertProperties[at], mesh.vertProperties[at + 1], mesh.vertProperties[at + 2]);
  }
  return out;
}

const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  runtime.Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);

/** A closed hollow box from (-40, 0, -30) to (40, 40, 30) with 2 mm walls; its front face looks along +z. */
function hollowBox() {
  return box(-40, 0, -30, 40, 40, 30).subtract(box(-38, 2, -28, 38, 38, 28));
}

function cutters(face: PerforableFace, settings: HolePatternSettings) {
  const plan = holePatternShapes(face, settings, "Hole");
  const created: Manifold[] = [];
  const solids = plan.holes.map((hole) => shapeToManifoldSolid(runtime, hole, created) as Manifold);
  return { plan, solids };
}

const frontWall = () => box(-40, 0, 28, 40, 40, 30);
const slab = (z0: number, z1: number) => box(-50, -10, z0, 50, 50, z1);
const centreY = (solid: Manifold) => {
  const bounds = solid.boundingBox();
  return (bounds.min[1] + bounds.max[1]) / 2;
};

const vents = (patch: Partial<HolePatternSettings> = {}) =>
  normalizeHolePattern({ form: "round", size: 5, spacing: 3, rowSpacing: 3, margin: 3, arrangement: "grid", depth: null, holeTilt: 30, ...patch });

describe("hole tilt: the setting", () => {
  it("keeps -60 to 60 degrees and drops what is not a number", () => {
    expect(normalizeHoleTilt(30)).toBe(30);
    expect(normalizeHoleTilt(-30)).toBe(-30);
    expect(normalizeHoleTilt(90)).toBe(HOLE_PATTERN_MAX_HOLE_TILT);
    expect(normalizeHoleTilt(-90)).toBe(-HOLE_PATTERN_MAX_HOLE_TILT);
    expect(Object.is(normalizeHoleTilt(-0), 0)).toBe(true);
    expect(normalizeHoleTilt(Number.NaN)).toBe(0);
    expect(normalizeHoleTilt("30")).toBe(0);
  });

  it("slopes plain holes only: not with a screw's head and not an own shape", () => {
    expect(holeTiltRadians({ form: "round", holeTilt: 30 })).toBeCloseTo(Math.PI / 6, 12);
    expect(holeTiltRadians({ form: "slot", holeTilt: -20 })).toBeCloseTo(-Math.PI / 9, 12);
    expect(holeTiltRadians({ form: "round", holeType: "counterbore", holeTilt: 30 })).toBe(0);
    expect(holeTiltRadians({ form: "round", holeType: "countersink", holeTilt: 30 })).toBe(0);
    expect(holeTiltRadians({ form: "custom", holeTilt: 30 })).toBe(0);
  });

  it("leaves a pattern with no slope exactly as it was", () => {
    const plain = normalizeHolePattern({ form: "slot", size: 12, height: 3, spacing: 2, holeAngle: 20 });
    const flat = normalizeHolePattern({ form: "slot", size: 12, height: 3, spacing: 2, holeAngle: 20, holeTilt: 0 });
    expect(flat).toEqual(plain);
    expect("holeTilt" in flat).toBe(false);
    const outline = rectangleOutline(0, 0, 80, 40);
    expect(holePatternCenters(outline, flat, 2).centers).toEqual(holePatternCenters(outline, plain).centers);
  });
});

describe("hole tilt: footprint, exit and the wall between holes", () => {
  it("shows a hole 1 / cos longer on the face and moves the exit up the wall by t tan", () => {
    const settings = vents();
    const footprint = holeFootprintPolygon(settings);
    const section = holeCrossSection(settings);
    const tall = (polygon: readonly Point2[]) => Math.max(...polygon.map((p) => p.v)) - Math.min(...polygon.map((p) => p.v));
    const wide = (polygon: readonly Point2[]) => Math.max(...polygon.map((p) => p.u)) - Math.min(...polygon.map((p) => p.u));
    expect(tall(footprint)).toBeCloseTo(tall(section) / Math.cos(Math.PI / 6), 9);
    expect(wide(footprint)).toBeCloseTo(wide(section), 9);
    // v points down a standing face: a positive slope comes out higher, at -v.
    expect(holeExitShift(settings, 2).v).toBeCloseTo(-2 * Math.tan(Math.PI / 6), 9);
    expect(holeExitShift(vents({ holeTilt: -30 }), 2).v).toBeCloseTo(2 * Math.tan(Math.PI / 6), 9);
  });

  for (const holeTilt of [20, 45, 60, -45]) {
    for (const arrangement of ["grid", "staggered"] as const) {
      it(`keeps the least wall square to the holes at ${holeTilt} degrees, ${arrangement}`, () => {
        const settings = normalizeHolePattern({ form: "round", size: 5, spacing: 0, rowSpacing: 0, margin: 3, arrangement, depth: null, holeTilt });
        expect(holePatternWall(settings)).toBeGreaterThanOrEqual(HOLE_PATTERN_MIN_WALL - 1e-9);
      });
    }
  }
});

describe("hole tilt: the holes cut into a hollow box's wall", () => {
  const read = () => {
    const result = readHolePatternFace(triangles(hollowBox()), { x: 0, y: 20, z: 30 }, { x: 0, y: 0, z: 1 });
    if (!result.ok) throw new Error("no face");
    return result.face as PerforableFace;
  };

  it("reads the wall behind the front face, not the whole box", () => {
    const face = read();
    expect(face.thickness).toBeCloseTo(60, 6);
    expect(face.wall).toBeCloseTo(2, 6);
  });

  for (const holeTilt of [30, -30, 50]) {
    it(`cuts every hole right through the front wall at ${holeTilt} degrees, and nothing else`, () => {
      const face = read();
      const settings = vents({ holeTilt });
      const { plan, solids } = cutters(face, settings);
      expect(plan.holes.length).toBeGreaterThan(6);
      const tilt = (holeTilt * Math.PI) / 180;
      const holes = runtime.Manifold.union(solids);
      const body = hollowBox();
      const cut = body.subtract(holes);

      // Each hole takes its cross-section times its length through the 2 mm wall: no skin left, no more taken.
      // (The cross-section is the cut shape's own, a fine polygon, rather than the fitter's coarser one.)
      const removed = body.volume() - cut.volume();
      const expected = solids.reduce((sum, solid, index) => sum + (solid.volume() / plan.holes[index].height) * (2 / Math.cos(tilt)), 0);
      expect(removed / expected).toBeCloseTo(1, 4);
      // The back wall, the floor and the roof are untouched.
      expect(body.subtract(frontWall()).volume()).toBeCloseTo(cut.subtract(frontWall()).volume(), 6);

      for (const solid of solids) {
        // Inner end higher for a positive slope: where the hole leaves the back of the wall it is higher than on the face.
        const outer = solid.intersect(slab(29.8, 30)).intersect(frontWall());
        const inner = solid.intersect(slab(28, 28.2)).intersect(frontWall());
        expect(Math.sign(centreY(inner) - centreY(outer))).toBe(Math.sign(holeTilt));
        expect(Math.abs(centreY(inner) - centreY(outer))).toBeCloseTo(1.8 * Math.tan(Math.abs(tilt)), 1);
        // Both ends keep the 3 mm margin from the face's edges.
        const inWall = solid.intersect(frontWall()).boundingBox();
        expect(inWall.min[0]).toBeGreaterThanOrEqual(-40 + 3 - 1e-3);
        expect(inWall.max[0]).toBeLessThanOrEqual(40 - 3 + 1e-3);
        expect(inWall.min[1]).toBeGreaterThanOrEqual(3 - 1e-3);
        expect(inWall.max[1]).toBeLessThanOrEqual(40 - 3 + 1e-3);
      }
    });
  }

  for (const holeTilt of [0, 45]) {
  it(`leaves at least the least wall between neighbouring holes, measured in the solid, at ${holeTilt} degrees`, () => {
    const face = read();
    const { solids } = cutters(face, vents({ holeTilt, spacing: 0, rowSpacing: 0, arrangement: "staggered" }));
    expect(solids.length).toBeGreaterThan(10);
    const wall = frontWall();
    const pieces = solids.map((solid) => solid.intersect(wall));
    const middle = pieces.map((piece) => piece.boundingBox()).map((bounds) => [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2]);
    let nearest = Infinity;
    for (let i = 0; i < pieces.length; i += 1) {
      for (let j = i + 1; j < pieces.length; j += 1) {
        // Only near neighbours can come within the wall of each other.
        if (Math.hypot(middle[i][0] - middle[j][0], middle[i][1] - middle[j][1]) > 12) continue;
        nearest = Math.min(nearest, pieces[i].minGap(pieces[j], 2));
      }
    }
    expect(nearest).toBeGreaterThanOrEqual(HOLE_PATTERN_MIN_WALL - 1e-3);
  });
  }

  it("stops a blind hole at the depth asked, measured straight in", () => {
    const plate = box(-40, 0, 0, 40, 40, 10);
    const result = readPerforableFace(triangles(plate), { x: 0, y: 20, z: 10 }, { x: 0, y: 0, z: 1 });
    if (!result.ok) throw new Error("no face");
    const { plan, solids } = cutters(result.face, vents({ holeTilt: 30, depth: 4 }));
    expect(plan.holes.length).toBeGreaterThan(6);
    for (const solid of solids) {
      // The bottom is square to the hole, so its middle is at 4 mm and it tips half its height either way.
      const bounds = solid.boundingBox();
      const half = 2.5 * Math.sin(Math.PI / 6);
      expect(10 - bounds.min[2]).toBeCloseTo(4 + half, 1);
    }
  });

  it("slopes holes on a level face front to back", () => {
    const plate = box(-40, 0, -30, 40, 3, 30);
    const result = readPerforableFace(triangles(plate), { x: 0, y: 3, z: 0 }, { x: 0, y: 1, z: 0 });
    if (!result.ok) throw new Error("no face");
    const { solids } = cutters(result.face, vents({ holeTilt: 30 }));
    expect(solids.length).toBeGreaterThan(6);
    for (const solid of solids) {
      const top = solid.intersect(box(-50, 2.8, -50, 50, 3, 50)).boundingBox();
      const bottom = solid.intersect(box(-50, 0, -50, 50, 0.2, 50)).boundingBox();
      const dz = (bottom.min[2] + bottom.max[2]) / 2 - (top.min[2] + top.max[2]) / 2;
      const dx = (bottom.min[0] + bottom.max[0]) / 2 - (top.min[0] + top.max[0]) / 2;
      expect(Math.abs(dx)).toBeLessThan(1e-3);
      expect(Math.abs(dz)).toBeCloseTo(2.8 * Math.tan(Math.PI / 6), 1);
    }
  });
});
