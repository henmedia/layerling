// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { importedShapeFromSvg } from "@/lib/svgImport";
import { sketchProfileFromSvg } from "@/lib/svgSketch";
import { cadSketchRegions, orderedCadSketchPaths, silhouetteSketchProfile, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import type { SketchProfile } from "@/types/layerling";

/*
 * #197: an SVG comes in as a sketch, its outlines as lines and Bezier curves. The sketch must hold
 * the same outline the mesh import makes - same footprint, same area, the same holes.
 */

// The reporter's Inkscape outline with a round hole, unchanged (see svgImportHoles.test.ts).
const OUTLINE_WITH_HOLE = `<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="80mm" viewBox="0 0 60 80">
  <g transform="translate(0,-217)">
    <path d="M 30.000236 217 A 30 30 0 0 0 0 247.00024 A 30 30 0 0 0 14.850256 272.89375 L 14.850256 296.99977 L 19.849951 296.99977 L 19.849951 271.99974 L 40.150004 271.99974 L 40.150004 296.99977 L 45.150216 296.99977 L 45.150216 272.89375 A 30 30 0 0 0 59.999955 247.00024 A 30 30 0 0 0 30.000236 217 z M 30.000236 226.99991 A 20 20 0 0 1 50.000049 247.00024 A 20 20 0 0 1 30.000236 267.00005 A 20 20 0 0 1 9.9999064 247.00024 A 20 20 0 0 1 30.000236 226.99991 z " />
  </g>
</svg>`;

function svg(body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${body}</svg>`;
}

function sampled(path: OrderedCadSketchPath, steps = 64) {
  const points: Array<{ x: number; z: number }> = [];
  path.steps.forEach(({ segment, from, to }) => {
    const forward = segment.startId === from.id;
    const first = forward ? from.handleOut : from.handleIn;
    const second = forward ? to.handleIn : to.handleOut;
    if (segment.kind === "line" || !first || !second) {
      points.push({ x: from.x, z: from.z });
      return;
    }
    for (let index = 0; index < steps; index += 1) {
      const t = index / steps;
      const u = 1 - t;
      points.push({
        x: u ** 3 * from.x + 3 * u * u * t * first.x + 3 * u * t * t * second.x + t ** 3 * to.x,
        z: u ** 3 * from.z + 3 * u * u * t * first.z + 3 * u * t * t * second.z + t ** 3 * to.z,
      });
    }
  });
  return points;
}

function area(points: Array<{ x: number; z: number }>) {
  let sum = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    sum += point.x * next.z - next.x * point.z;
  });
  return Math.abs(sum) / 2;
}

/** The filled area of the sketch: outlines less their holes. */
function profileArea(profile: SketchProfile) {
  return cadSketchRegions(profile).reduce((total, region) => (
    total + area(sampled(region.outer)) - region.holes.reduce((holes, hole) => holes + area(sampled(hole)), 0)
  ), 0);
}

function bounds(profile: SketchProfile) {
  const xs = orderedCadSketchPaths(profile).flatMap((path) => sampled(path).map((point) => point.x));
  const zs = orderedCadSketchPaths(profile).flatMap((path) => sampled(path).map((point) => point.z));
  return { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

function meshArea(source: string) {
  const mesh = importedShapeFromSvg("test.svg", source);
  const positions = mesh.importedMesh!.positions;
  let volume = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(i, i + 9);
    volume += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return { area: Math.abs(volume / 6) / mesh.height, width: mesh.width, depth: mesh.depth };
}

describe("SVG as a sketch (#197)", () => {
  it("brings the reporter's outline in with its round hole, arcs as curves", () => {
    const profile = sketchProfileFromSvg(OUTLINE_WITH_HOLE)!;
    expect(profile).not.toBeNull();
    const regions = cadSketchRegions(profile);
    expect(regions).toHaveLength(1);
    expect(regions[0].holes).toHaveLength(1);
    expect(profile.segments.some((segment) => segment.kind === "bezier")).toBe(true);
    const mesh = meshArea(OUTLINE_WITH_HOLE);
    // The mesh import cuts arcs into 16 chords each; the curves sit a little outside them.
    expect(profileArea(profile)).toBeGreaterThan(mesh.area);
    expect(profileArea(profile)).toBeLessThan(mesh.area * 1.01);
    const box = bounds(profile);
    expect(box.width).toBeCloseTo(60, 2);
    expect(box.depth).toBeCloseTo(80, 2);
  });

  it("reads right from above: the drawing's top at the back, where the old mesh lay mirrored", () => {
    // A bar along the top of the drawing (small y) and a long leg down.
    const source = svg(`<path d="M 0 0 L 100 0 L 100 10 L 10 10 L 10 100 L 0 100 Z" />`);
    const profile = sketchProfileFromSvg(source)!;
    // The top view has the back (-z) at the top of the screen: the bar belongs there.
    expect(profile.points.find((point) => point.x > 40)!.z).toBeLessThan(0);
    // The mesh, as older designs rebuild it, has it at the front; a new import mirrors it back.
    const positions = importedShapeFromSvg("l.svg", source).importedMesh!.positions;
    let meshBarZ = 0;
    for (let index = 0; index < positions.length; index += 3) {
      if (positions[index] > 40) meshBarZ = Math.sign(positions[index + 2]);
    }
    expect(meshBarZ).toBe(1);
  });

  it("turns circles, rotated ellipses and quadratic curves into cubic curves of the same area", () => {
    const shapes = [
      svg(`<circle cx="50" cy="50" r="40" />`),
      svg(`<ellipse cx="100" cy="100" rx="60" ry="25" transform="rotate(30 100 100)" />`),
      svg(`<path d="M 10 100 Q 100 0 190 100 Q 100 200 10 100 Z" />`),
      svg(`<rect x="10" y="20" width="80" height="40" rx="10" />`),
    ];
    shapes.forEach((source) => {
      const profile = sketchProfileFromSvg(source)!;
      expect(cadSketchRegions(profile)).toHaveLength(1);
      const mesh = meshArea(source);
      expect(Math.abs(profileArea(profile) - mesh.area) / mesh.area).toBeLessThan(0.01);
      const box = bounds(profile);
      expect(box.width).toBeCloseTo(mesh.width, 0);
      expect(box.depth).toBeCloseTo(mesh.depth, 0);
    });
  });

  it("gives an outline of only two curves a third step, so it counts as closed", () => {
    const profile = sketchProfileFromSvg(svg(`<path d="M 0 50 C 30 0 70 0 100 50 C 70 100 30 100 0 50 Z" />`))!;
    const paths = orderedCadSketchPaths(profile);
    expect(paths).toHaveLength(1);
    expect(paths[0].closed).toBe(true);
    expect(paths[0].steps.length).toBeGreaterThanOrEqual(3);
  });

  it("makes a traced outline's near-smooth joins smooth and keeps its real corners (#996)", () => {
    // Two curves meeting at the top at a 4 degree kink, a curve running into a line at 4 degrees,
    // and two real corners of 27 and 16 degrees, as a tracer leaves them.
    const profile = sketchProfileFromSvg(svg(`<path d="M 20 100 C 20 60 60 40 100 40 C 140 37 183 60 180 100 L 180 140 C 170 160 40 170 20 100 Z" />`))!;
    const [path] = orderedCadSketchPaths(profile);
    const kinks = path.steps.map(({ segment, from, to }, index) => {
      const next = path.steps[(index + 1) % path.steps.length];
      const arriving = segment.kind === "line" ? from : (segment.startId === from.id ? to.handleIn : to.handleOut)!;
      const leaving = next.segment.kind === "line" ? next.to : (next.segment.startId === next.from.id ? next.from.handleOut : next.from.handleIn)!;
      const a = Math.atan2(to.z - arriving.z, to.x - arriving.x);
      const b = Math.atan2(leaving.z - to.z, leaving.x - to.x);
      return Math.abs(((b - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * (180 / Math.PI);
    });
    const at = (x: number, z: number) => kinks[path.steps.findIndex(({ to }) => Math.abs(to.x - x) < 1e-6 && Math.abs(to.z - z) < 1e-6)];
    // The sketch is centred on the outline's ends: the top join at (100, 40) sits at (0, -50).
    expect(at(0, -50)).toBeLessThan(1e-9);
    expect(at(80, 10)).toBeLessThan(1e-9);
    expect(at(80, 50)).toBeCloseTo(26.57, 1);
    expect(at(-80, 10)).toBeCloseTo(15.95, 1);
  });

  it("leaves open strokes out and gives up on a drawing with nothing closed", () => {
    expect(sketchProfileFromSvg(svg(`<path d="M 0 0 L 50 50" stroke="black" stroke-width="2" fill="none" />`))).toBeNull();
  });

  it("drops the holes for the silhouette, islands inside them too", () => {
    const source = svg(`<path fill-rule="evenodd" d="M 0 0 H 100 V 100 H 0 Z M 20 20 H 80 V 80 H 20 Z M 40 40 H 60 V 60 H 40 Z" />`);
    const profile = sketchProfileFromSvg(source)!;
    expect(cadSketchRegions(profile).map((region) => region.holes.length)).toEqual([1, 0]);
    const silhouette = silhouetteSketchProfile({ ...profile, silhouette: true });
    const regions = cadSketchRegions(silhouette);
    expect(regions).toHaveLength(1);
    expect(regions[0].holes).toHaveLength(0);
    expect(profileArea(silhouette)).toBeCloseTo(100 * 100, 6);
    expect(silhouette.silhouette).toBe(true);
  });
});
