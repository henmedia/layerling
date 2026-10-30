import * as THREE from "three";
import type { SectionLoop, SectionPoint } from "@/lib/sectionSvg";
import { loopArea } from "@/lib/sectionSvg";

/**
 * The cut face of the section view (#516): where the plane goes through a solid, the cut is filled, so a
 * solid and a hole no longer look the same inside. The outlines come from the same bodies as the section
 * SVG - holes already taken out of the solids, so a hole shows as an inner outline - and are turned into
 * triangles here: an outline inside another is a hole of it, one inside that a body again, and so on.
 */
export type SectionCapMesh = { points: SectionPoint[]; triangles: number[] };

function contains(outer: readonly SectionPoint[], point: SectionPoint) {
  let inside = false;
  for (let index = 0, last = outer.length - 1; index < outer.length; last = index, index += 1) {
    const a = outer[index];
    const b = outer[last];
    if ((a.v > point.v) !== (b.v > point.v) && point.u < ((b.u - a.u) * (point.v - a.v)) / (b.v - a.v) + a.u) inside = !inside;
  }
  return inside;
}

export function sectionCapMesh(loops: readonly SectionLoop[]): SectionCapMesh {
  const usable = loops
    .filter((loop) => loop.closed && loop.points.length >= 3)
    .map((loop) => ({ points: loop.points, area: Math.abs(loopArea(loop.points)) }))
    .filter((loop) => loop.area > 1e-9);
  // Each outline knows the outlines around it; their number says whether it is a rim (even) or a hole (odd).
  const parents = usable.map((loop, index) =>
    usable
      .map((other, otherIndex) => ({ other, otherIndex }))
      .filter(({ other, otherIndex }) => otherIndex !== index && other.area > loop.area && contains(other.points, loop.points[0]))
      .sort((a, b) => a.other.area - b.other.area),
  );
  const points: SectionPoint[] = [];
  const triangles: number[] = [];
  usable.forEach((loop, index) => {
    if (parents[index].length % 2 !== 0) return;
    const holes = usable.filter((_, holeIndex) => parents[holeIndex].length % 2 === 1 && parents[holeIndex][0].otherIndex === index);
    const contour = loop.points.map((point) => new THREE.Vector2(point.u, point.v));
    const holeContours = holes.map((hole) => hole.points.map((point) => new THREE.Vector2(point.u, point.v)));
    const faces = THREE.ShapeUtils.triangulateShape(contour, holeContours);
    const base = points.length;
    points.push(...loop.points, ...holes.flatMap((hole) => hole.points));
    faces.forEach(([a, b, c]) => triangles.push(base + a, base + b, base + c));
  });
  return { points, triangles };
}

/** The area the cap covers, for tests and for telling an empty cut from a filled one. */
export function sectionCapArea(mesh: SectionCapMesh) {
  let area = 0;
  for (let index = 0; index + 2 < mesh.triangles.length; index += 3) {
    const a = mesh.points[mesh.triangles[index]];
    const b = mesh.points[mesh.triangles[index + 1]];
    const c = mesh.points[mesh.triangles[index + 2]];
    area += Math.abs((b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u)) / 2;
  }
  return area;
}

/**
 * How the cut face of the section view looks (#446): hatched like a drawing (the start), filled plain, or left
 * open as it was before #516, where one looks into the skin of the body.
 */
export type SectionCutFace = "hatch" | "fill" | "open";

export const SECTION_CUT_FACES: readonly SectionCutFace[] = ["hatch", "fill", "open"];

export function normalizeSectionCutFace(value: unknown): SectionCutFace {
  return value === "fill" || value === "open" ? value : "hatch";
}

/**
 * The distance between two hatch lines in millimetres: about forty lines across the cut, on a step of 1, 2 or 5
 * so that it stays put while the plane moves and the cut grows or shrinks a little.
 */
export function sectionHatchSpacing(meshes: readonly SectionCapMesh[]) {
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const mesh of meshes) {
    for (const point of mesh.points) {
      minU = Math.min(minU, point.u);
      maxU = Math.max(maxU, point.u);
      minV = Math.min(minV, point.v);
      maxV = Math.max(maxV, point.v);
    }
  }
  const extent = Math.max(maxU - minU, maxV - minV);
  if (!Number.isFinite(extent) || extent <= 0) return 1;
  const wanted = extent / 40;
  const power = 10 ** Math.floor(Math.log10(wanted));
  const step = [1, 2, 5, 10].find((factor) => factor * power >= wanted) ?? 10;
  return Math.min(20, Math.max(0.2, step * power));
}

/**
 * Which bodies turn their hatch the other way: a body inside an odd number of the others (#446, the truffle -
 * a sphere in a cube), so a body inside another stands apart from it, as in a drawing. "Inside" goes by the
 * outlines, not the filled part: the cube of the cut has the sphere taken out of it as a hole, and the sphere
 * still lies inside the cube. Each body is placed by the middle of its first triangle, which lies on it for
 * certain; only a larger body can hold it, so the cube does not count as inside the sphere where its first
 * triangle happens to cross it.
 */
export function sectionHatchTurned(bodies: readonly { cap: SectionCapMesh; loops: readonly SectionLoop[] }[]) {
  const outlines = bodies.map(({ loops }) =>
    loops
      .filter((loop) => loop.closed && loop.points.length >= 3)
      .map((loop) => {
        let minU = Infinity;
        let maxU = -Infinity;
        let minV = Infinity;
        let maxV = -Infinity;
        for (const point of loop.points) {
          minU = Math.min(minU, point.u);
          maxU = Math.max(maxU, point.u);
          minV = Math.min(minV, point.v);
          maxV = Math.max(maxV, point.v);
        }
        return { points: loop.points, minU, maxU, minV, maxV };
      }),
  );
  const areas = bodies.map(({ cap }) => sectionCapArea(cap));
  return bodies.map(({ cap }, index) => {
    if (cap.triangles.length < 3) return false;
    const [a, b, c] = [0, 1, 2].map((corner) => cap.points[cap.triangles[corner]]);
    const middle = { u: (a.u + b.u + c.u) / 3, v: (a.v + b.v + c.v) / 3 };
    let around = 0;
    outlines.forEach((loops, otherIndex) => {
      if (otherIndex === index || areas[otherIndex] <= areas[index]) return;
      // A box around each outline first, so that a cut through many bodies side by side stays quick.
      const holds = loops.some((loop) => middle.u >= loop.minU && middle.u <= loop.maxU && middle.v >= loop.minV && middle.v <= loop.maxV && contains(loop.points, middle));
      if (holds) around += 1;
    });
    return around % 2 === 1;
  });
}

/**
 * Texture coordinates for the hatch of one body: the lines of the texture run where u + v is a whole number,
 * so the coordinates are scaled for `spacing` millimetres between lines; `turned` runs them at 135 degrees
 * instead of 45.
 */
export function sectionHatchUvs(points: readonly SectionPoint[], spacing: number, turned = false) {
  const scale = 1 / (spacing * Math.SQRT2);
  const turn = turned ? -1 : 1;
  const uvs: number[] = [];
  for (const point of points) uvs.push(point.u * turn * scale, point.v * scale);
  return uvs;
}

/**
 * The hatch as a tile of `size` by `size` RGBA texels: white, with one soft dark line along the diagonal, which
 * wraps without a seam. White leaves the body's colour as it is; the line darkens it to about half.
 */
export function sectionHatchTexels(size = 32) {
  const data = new Uint8Array(size * size * 4);
  const halfWidth = 0.14;
  const soft = 1 / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const along = ((x + y + 1) / size) % 1;
      const distance = Math.min(along, 1 - along);
      const line = Math.min(1, Math.max(0, (halfWidth - distance) / soft + 0.5));
      const value = Math.round(255 - line * 128);
      const index = (y * size + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  return data;
}

export function sectionHatchTexture(size = 32) {
  const texture = new THREE.DataTexture(sectionHatchTexels(size), size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
