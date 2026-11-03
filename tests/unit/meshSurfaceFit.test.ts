import { describe, expect, it } from "vitest";
import { add, fitCone, fitCylinder, fitPlane, fitSphere, fitTorus, maxDistance, perpendicularFrame, scale, unit, type V3 } from "@/lib/meshSurfaceFit";

const along = (o: V3, a: V3, u: V3, v: V3, x: number, y: number, z: number): V3 => add(o, add(scale(u, x), add(scale(v, y), scale(a, z))));

describe("fitting surfaces to the corners of a mesh", () => {
  const axis = unit([0.3, -0.5, 0.8]);
  const [u, v] = perpendicularFrame(axis);
  const origin: V3 = [12, -4, 7];

  it("finds a plane", () => {
    const pts: V3[] = [];
    for (let i = 0; i < 5; i += 1) for (let j = 0; j < 4; j += 1) pts.push(along(origin, axis, u, v, i * 3, j * 2, 0));
    const plane = fitPlane(pts);
    expect(Math.abs(Math.abs(plane.normal[0] * axis[0] + plane.normal[1] * axis[1] + plane.normal[2] * axis[2]) - 1)).toBeLessThan(1e-9);
    expect(maxDistance(plane, pts)).toBeLessThan(1e-9);
  });

  it("finds a cylinder from a quarter of it, its radius and axis", () => {
    const pts: V3[] = [], normals: V3[] = [];
    for (let i = 0; i <= 6; i += 1) for (let h = 0; h < 3; h += 1) {
      const t = (i / 6) * (Math.PI / 2);
      pts.push(along(origin, axis, u, v, 4 * Math.cos(t), 4 * Math.sin(t), h * 5));
      normals.push(unit(add(scale(u, Math.cos(t)), scale(v, Math.sin(t)))));
    }
    const cyl = fitCylinder(pts, normals)!;
    expect(cyl.radius).toBeCloseTo(4, 7);
    expect(maxDistance(cyl, pts)).toBeLessThan(1e-7);
  });

  it("finds a cone with its apex and half angle", () => {
    const pts: V3[] = [], normals: V3[] = [];
    const alpha = 0.4;
    for (let i = 0; i < 12; i += 1) for (const h of [2, 5, 9]) {
      const t = (i / 12) * 2 * Math.PI;
      const radial = unit(add(scale(u, Math.cos(t)), scale(v, Math.sin(t))));
      pts.push(add(origin, add(scale(axis, h), scale(radial, h * Math.tan(alpha)))));
      normals.push(unit(add(scale(radial, Math.cos(alpha)), scale(axis, -Math.sin(alpha)))));
    }
    const cone = fitCone(pts, normals)!;
    expect(cone.halfAngle).toBeCloseTo(alpha, 7);
    expect(maxDistance(cone, pts)).toBeLessThan(1e-7);
  });

  it("finds a sphere from a cap", () => {
    const pts: V3[] = [];
    for (let i = 0; i < 8; i += 1) for (const lat of [1.1, 1.3, 1.5]) {
      const t = (i / 8) * 2 * Math.PI;
      pts.push(add(origin, scale(add(scale(axis, Math.sin(lat)), scale(add(scale(u, Math.cos(t)), scale(v, Math.sin(t))), Math.cos(lat))), 7.5)));
    }
    const sphere = fitSphere(pts)!;
    expect(sphere.radius).toBeCloseTo(7.5, 7);
    expect(maxDistance(sphere, pts)).toBeLessThan(1e-7);
  });

  it("finds a torus from a fillet round a circle", () => {
    const pts: V3[] = [], normals: V3[] = [];
    const R = 10, r = 2;
    for (let i = 0; i < 16; i += 1) for (let j = 0; j <= 4; j += 1) {
      const t = (i / 16) * 2 * Math.PI, w = (j / 4) * (Math.PI / 2);
      const radial = unit(add(scale(u, Math.cos(t)), scale(v, Math.sin(t))));
      const n = unit(add(scale(radial, Math.cos(w)), scale(axis, Math.sin(w))));
      pts.push(add(add(origin, scale(radial, R)), scale(n, r)));
      normals.push(n);
    }
    const torus = fitTorus(pts, normals)!;
    expect(torus.major).toBeCloseTo(R, 6);
    expect(torus.minor).toBeCloseTo(r, 6);
    expect(maxDistance(torus, pts)).toBeLessThan(1e-6);
  });
});
