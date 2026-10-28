import { describe, expect, it } from "vitest";
import { CYLINDER_WRAP_INWARD_OVERSHOOT_MM, CYLINDER_WRAP_STEP_DEGREES, wrapMeshAroundCylinder, type CylinderWrapInput, type CylinderWrapVec3 } from "@/lib/cylinderWrap";
import { validateClosedSolidTriangleSoup } from "@/lib/svgImport";

/** A closed box lying on the plate, faces wound outward. */
function plateBox(width: number, thickness: number, depth: number, at = { x: 0, y: 0, z: 0 }): CylinderWrapInput {
  const [x0, x1] = [at.x - width / 2, at.x + width / 2];
  const [y0, y1] = [at.y, at.y + thickness];
  const [z0, z1] = [at.z - depth / 2, at.z + depth / 2];
  const vertices: CylinderWrapInput["vertices"] = [
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
  ];
  const faces: CylinderWrapInput["faces"] = [
    [0, 1, 2], [0, 2, 3], // bottom (-y)
    [4, 6, 5], [4, 7, 6], // top (+y)
    [0, 4, 5], [0, 5, 1], // back (-z)
    [3, 2, 6], [3, 6, 7], // front (+z)
    [0, 3, 7], [0, 7, 4], // left (-x)
    [1, 5, 6], [1, 6, 2], // right (+x)
  ];
  return { vertices, faces };
}

function signedVolume(positions: number[]) {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(i, i + 9);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return volume;
}

function soup(mesh: CylinderWrapInput) {
  return mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index]));
}

/** The cut as it was: the whole mesh, plane after plane. The new cut has to give the same triangles in the same order. */
function oldCutPositions(mesh: CylinderWrapInput, diameter: number) {
  const radius = diameter / 2;
  const xs = mesh.vertices.map((vertex) => vertex[0]);
  const ys = mesh.vertices.map((vertex) => vertex[1]);
  const zs = mesh.vertices.map((vertex) => vertex[2]);
  const [minX, maxX, minY, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.min(...zs), Math.max(...zs)];
  const vertices: CylinderWrapVec3[] = mesh.vertices.map(([x, y, z]) => [x - (minX + maxX) / 2, y - minY, z - (minZ + maxZ) / 2]);
  let faces = mesh.faces.map((face) => [...face] as [number, number, number]);
  const width = maxX - minX;
  const step = radius * (CYLINDER_WRAP_STEP_DEGREES * Math.PI / 180);
  for (let k = Math.ceil((-width / 2) / step); k <= Math.floor((width / 2) / step); k += 1) {
    const cut = k * step;
    const points = new Map<string, number>();
    const onEdge = (a: number, b: number) => {
      const [i, j] = a < b ? [a, b] : [b, a];
      const known = points.get(`${i}:${j}`);
      if (known !== undefined) return known;
      const t = (cut - vertices[i][0]) / (vertices[j][0] - vertices[i][0]);
      vertices.push([cut, vertices[i][1] + (vertices[j][1] - vertices[i][1]) * t, vertices[i][2] + (vertices[j][2] - vertices[i][2]) * t]);
      points.set(`${i}:${j}`, vertices.length - 1);
      return vertices.length - 1;
    };
    const side = (index: number) => (Math.abs(vertices[index][0] - cut) <= 1e-9 ? 0 : Math.sign(vertices[index][0] - cut));
    const next: [number, number, number][] = [];
    faces.forEach((face) => {
      const sides = face.map(side);
      if (!(sides.some((value) => value > 0) && sides.some((value) => value < 0))) return void next.push(face);
      const zero = sides.indexOf(0);
      if (zero >= 0) {
        const [a, b, c] = [face[zero], face[(zero + 1) % 3], face[(zero + 2) % 3]];
        const m = onEdge(b, c);
        return void next.push([a, b, m], [a, m, c]);
      }
      const lone = sides.findIndex((value) => sides.filter((other) => other === value).length === 1);
      const [a, b, c] = [face[lone], face[(lone + 1) % 3], face[(lone + 2) % 3]];
      const ab = onEdge(a, b);
      const ca = onEdge(c, a);
      next.push([a, ab, ca], [ab, b, c], [ab, c, ca]);
    });
    faces = next;
  }
  return faces.flatMap((face) => face.flatMap((index) => vertices[index]));
}

/** A rough plate of many small slanted triangles, as text or a picture brings: a grid with a wavy top. */
function wavyPlate(columns: number, rows: number, size: number): CylinderWrapInput {
  const vertices: CylinderWrapVec3[] = [];
  const faces: CylinderWrapInput["faces"] = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      vertices.push([column * size + (row % 2) * size * 0.37, 1 + 0.4 * Math.sin(column * 0.7 + row), row * size]);
    }
  }
  const at = (row: number, column: number) => row * (columns + 1) + column;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      faces.push([at(row, column), at(row + 1, column), at(row + 1, column + 1)], [at(row, column), at(row + 1, column + 1), at(row, column + 1)]);
    }
  }
  return { vertices, faces };
}

describe("wrapping a flat body around a cylinder (#106)", () => {
  it("stays closed and keeps its faces wound outward", () => {
    const box = plateBox(60, 2, 20, { x: 15, y: 3, z: -7 });
    expect(signedVolume(soup(box))).toBeGreaterThan(0);
    const result = wrapMeshAroundCylinder(box, { diameter: 40 });
    if ("error" in result) throw new Error(result.error);
    expect(() => validateClosedSolidTriangleSoup(result.positions, "wrapped")).not.toThrow();
    expect(signedVolume(result.positions)).toBeGreaterThan(0);
    // Bending keeps the volume of a thin shell: arc length times depth times thickness, measured at the middle radius.
    expect(Math.abs(signedVolume(result.positions) - 60 * 20 * 2 * (21 / 20))).toBeLessThan(2);
  });

  it("lays the body on the wall: radius from the wall outward, depth as height, front at angle 0", () => {
    const result = wrapMeshAroundCylinder(plateBox(30, 3, 12), { diameter: 50 });
    if ("error" in result) throw new Error(result.error);
    let minR = Infinity, maxR = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < result.positions.length; i += 3) {
      const r = Math.hypot(result.positions[i], result.positions[i + 2]);
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minY = Math.min(minY, result.positions[i + 1]); maxY = Math.max(maxY, result.positions[i + 1]);
    }
    expect(minR).toBeCloseTo(25, 6);
    expect(maxR).toBeCloseTo(28, 6);
    expect(minY).toBeCloseTo(0, 6);
    expect(maxY).toBeCloseTo(12, 6);
    expect(result.outerRadius).toBeCloseTo(28, 6);
    expect(result.height).toBeCloseTo(12, 6);
    expect(result.arcDegrees).toBeCloseTo((30 / 25) * 180 / Math.PI, 6);
  });

  it("goes into the wall for an engraving, keeping the outside on the given diameter", () => {
    const result = wrapMeshAroundCylinder(plateBox(30, 3, 12), { diameter: 50, inward: true });
    if ("error" in result) throw new Error(result.error);
    const radii: number[] = [];
    for (let i = 0; i < result.positions.length; i += 3) radii.push(Math.hypot(result.positions[i], result.positions[i + 2]));
    expect(Math.min(...radii)).toBeCloseTo(22, 6);
    // The outside reaches a little over the wall, so that a hole cuts through the facets of a cylinder (#578).
    expect(Math.max(...radii)).toBeCloseTo(25 + CYLINDER_WRAP_INWARD_OVERSHOOT_MM, 6);
    expect(result.outerRadius).toBeCloseTo(25, 6);
  });

  it("keeps the back edge of the plate at the top of the wall", () => {
    // A thin strip only at the back of a deeper body: after wrapping it must sit high up.
    const mesh = plateBox(10, 1, 4, { x: 0, y: 0, z: -8 });
    const extra = plateBox(10, 1, 4, { x: 0, y: 0, z: 8 });
    const offset = mesh.vertices.length;
    const both: CylinderWrapInput = {
      vertices: [...mesh.vertices, ...extra.vertices],
      faces: [...mesh.faces, ...extra.faces.map((face) => face.map((index) => index + offset) as [number, number, number])],
    };
    const result = wrapMeshAroundCylinder(both, { diameter: 30 });
    if ("error" in result) throw new Error(result.error);
    // The first box's vertices come first in the output order of its faces.
    const firstBoxHeights = result.positions.filter((_, index) => index % 3 === 1).slice(0, 36);
    expect(Math.min(...firstBoxHeights)).toBeGreaterThan(10);
  });

  it("cuts the faces exactly as cutting the whole mesh plane after plane did", () => {
    for (const [mesh, diameter] of [[plateBox(60, 2, 20, { x: 15, y: 3, z: -7 }), 40], [wavyPlate(24, 4, 1.7), 30], [wavyPlate(12, 3, 4.1), 80]] as const) {
      const result = wrapMeshAroundCylinder(mesh, { diameter });
      if ("error" in result) throw new Error(result.error);
      const flat = oldCutPositions(mesh, diameter);
      expect(result.positions.length).toBe(flat.length);
      // The same flat triangles, bent: the height on the wall is the depth on the plate, unchanged by bending.
      const radius = diameter / 2;
      let worst = 0;
      for (let index = 0; index < flat.length; index += 3) {
        const angle = Math.atan2(result.positions[index], result.positions[index + 2]);
        worst = Math.max(
          worst,
          Math.abs(angle * radius - flat[index]),
          Math.abs(result.positions[index + 1] - (result.height / 2 - flat[index + 2])),
          Math.abs(Math.hypot(result.positions[index], result.positions[index + 2]) - (radius + flat[index + 1])),
        );
      }
      expect(worst).toBeLessThan(1e-9);
    }
  });

  it("refuses a body longer than the circumference, a missing diameter and too deep an engraving", () => {
    expect(wrapMeshAroundCylinder(plateBox(100, 2, 10), { diameter: 30 })).toEqual({ error: "tooWide" });
    expect(wrapMeshAroundCylinder(plateBox(10, 2, 10), { diameter: 0 })).toEqual({ error: "invalidDiameter" });
    expect(wrapMeshAroundCylinder(plateBox(10, 20, 10), { diameter: 30, inward: true })).toEqual({ error: "tooThick" });
    expect(wrapMeshAroundCylinder({ vertices: [], faces: [] }, { diameter: 30 })).toEqual({ error: "empty" });
  });
});
