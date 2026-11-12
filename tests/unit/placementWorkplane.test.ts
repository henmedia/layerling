import { describe, expect, it } from "vitest";
import {
  horizontalPlacementWorkplane,
  normalizePlacementWorkplane,
  placementPatchForNewShape,
  placementWorkplaneCoordinates,
  placementWorkplaneFingerprint,
  placementWorkplaneFromSurface,
  placementWorkplaneLiesOnBase,
  placementWorkplanePlateShift,
  placementWorkplanePoint,
  snapPlacementWorkplaneOrigin,
  translationToWorkplane,
} from "@/lib/placementWorkplane";

describe("placement workplanes", () => {
  it("knows when a workplane lies in the plate's plane (#178)", () => {
    const moved = { ...horizontalPlacementWorkplane(), origin: { x: 40, y: 0, z: -25 } };
    expect(placementWorkplaneLiesOnBase(moved)).toBe(true);
    const turned = placementWorkplaneFromSurface({ x: 10, y: 0, z: 5 }, { x: 0, y: 1, z: 0 }, { x: 0.6, y: 0, z: 0.8 });
    expect(placementWorkplaneLiesOnBase(turned)).toBe(true);
    expect(placementWorkplaneLiesOnBase(horizontalPlacementWorkplane(12))).toBe(false);
    const tilted = placementWorkplaneFromSurface({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 });
    expect(placementWorkplaneLiesOnBase(tilted)).toBe(false);
  });

  it("round-trips coordinates on an oriented surface", () => {
    const plane = placementWorkplaneFromSurface(
      { x: 10, y: 5, z: -4 },
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 0 },
    );
    const world = placementWorkplanePoint(plane, 12, -7);
    const local = placementWorkplaneCoordinates(plane, world);

    expect(local.x).toBeCloseTo(12);
    expect(local.y).toBeCloseTo(0);
    expect(local.z).toBeCloseTo(-7);
  });

  it("keeps a sketch upright on every side of a box", () => {
    // Forum 617195: auf der Rueck- und der rechten Seite stand die Skizze auf dem Kopf.
    const sides = [
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0.6, y: 0.6, z: 0.52915 },
    ];
    for (const normal of sides) {
      for (const reverse of [false, true]) {
        const plane = placementWorkplaneFromSurface({ x: 0, y: 5, z: 0 }, normal, { x: 1, y: 0, z: 0 }, reverse, true);
        const n = plane.normal;
        // "oben" in der Skizze ist -z und zeigt in der Welt nach oben
        expect(-plane.zAxis.y).toBeGreaterThan(0);
        expect(Math.abs(plane.xAxis.y)).toBeLessThan(1e-9);
        // gleiche Haendigkeit wie die Grundebene: z = x x n
        const cross = {
          x: plane.xAxis.y * n.z - plane.xAxis.z * n.y,
          y: plane.xAxis.z * n.x - plane.xAxis.x * n.z,
          z: plane.xAxis.x * n.y - plane.xAxis.y * n.x,
        };
        expect(cross.x).toBeCloseTo(plane.zAxis.x);
        expect(cross.y).toBeCloseTo(plane.zAxis.y);
        expect(cross.z).toBeCloseTo(plane.zAxis.z);
        // ein gespeicherter Rahmen kommt unveraendert zurueck
        expect(placementWorkplaneFingerprint(normalizePlacementWorkplane(plane))).toBe(placementWorkplaneFingerprint(plane));
      }
    }
  });

  it("leaves a flat face to its edge", () => {
    const plane = placementWorkplaneFromSurface({ x: 0, y: 5, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, false, true);
    expect(plane.xAxis.z).toBeCloseTo(1);
  });

  it("places a new shape flush with a vertical face", () => {
    const plane = placementWorkplaneFromSurface(
      { x: 20, y: 10, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    );
    const patch = placementPatchForNewShape({ height: 8 }, plane);

    expect(patch.x).toBeCloseTo(24);
    expect(patch.elevation).toBeCloseTo(6);
    expect(Math.abs(patch.rotationZ ?? 0)).toBeCloseTo(90);
  });

  it("reverses which side receives newly placed shapes", () => {
    const normal = { x: 0, y: 1, z: 0 };
    const regular = placementWorkplaneFromSurface({ x: 0, y: 4, z: 0 }, normal, { x: 1, y: 0, z: 0 });
    const reversed = placementWorkplaneFromSurface({ x: 0, y: 4, z: 0 }, normal, { x: 1, y: 0, z: 0 }, true);

    expect(placementPatchForNewShape({ height: 10 }, regular).elevation).toBe(4);
    expect(placementPatchForNewShape({ height: 10 }, reversed).elevation).toBe(-6);
  });

  it("snaps a horizontal surface origin to the base grid", () => {
    const plane = placementWorkplaneFromSurface(
      { x: 7.3, y: 12, z: -4.6 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
    );
    const snapped = snapPlacementWorkplaneOrigin(plane, 2);

    expect(snapped.origin).toEqual({ x: 8, y: 12, z: -4 });
  });

  it("snaps both in-plane coordinates without moving a vertical surface", () => {
    const plane = placementWorkplaneFromSurface(
      { x: 20, y: 7.3, z: -4.6 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    );
    const snapped = snapPlacementWorkplaneOrigin(plane, 2);

    expect(snapped.origin).toEqual({ x: 20, y: 8, z: -4 });
    expect(snapped.origin.x).toBe(plane.origin.x);
  });

  it("keeps an angled surface coplanar while snapping from the base origin", () => {
    const plane = placementWorkplaneFromSurface(
      { x: 7.2, y: 5.1, z: -3.8 },
      { x: 1, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    );
    const snapped = snapPlacementWorkplaneOrigin(plane, 2.5);
    const snappedCoordinates = placementWorkplaneCoordinates(plane, snapped.origin);
    const planeOffset = (
      plane.origin.x * plane.normal.x
      + plane.origin.y * plane.normal.y
      + plane.origin.z * plane.normal.z
    );
    const baseGridAnchor = {
      ...plane,
      origin: {
        x: plane.normal.x * planeOffset,
        y: plane.normal.y * planeOffset,
        z: plane.normal.z * planeOffset,
      },
    };
    const gridCoordinates = placementWorkplaneCoordinates(baseGridAnchor, snapped.origin);

    expect(snappedCoordinates.y).toBeCloseTo(0);
    expect(gridCoordinates.x / 2.5).toBeCloseTo(Math.round(gridCoordinates.x / 2.5));
    expect(gridCoordinates.z / 2.5).toBeCloseTo(Math.round(gridCoordinates.z / 2.5));
  });

  it("computes the exact translation required to drop geometry onto a plane", () => {
    const plane = horizontalPlacementWorkplane(3);
    const translation = translationToWorkplane(plane, [
      { x: -2, y: 8, z: -2 },
      { x: 2, y: 8, z: 2 },
      { x: 0, y: 12, z: 0 },
    ]);

    expect(translation).toEqual({ x: 0, y: -5, z: 0 });
  });

  it("normalizes malformed workplane descriptors to horizontal base fallback", () => {
    expect(normalizePlacementWorkplane(null, 15).origin.y).toBe(15);
    expect(normalizePlacementWorkplane({}, 8).origin.y).toBe(8);
    expect(normalizePlacementWorkplane({ origin: { x: 0, y: "bad", z: 0 } }, 4).origin.y).toBe(4);
  });

  it("produces consistent fingerprints and distinguishes different workplanes", () => {
    const planeA = horizontalPlacementWorkplane(0);
    const planeB = horizontalPlacementWorkplane(10);
    const planeC = horizontalPlacementWorkplane(0);

    expect(placementWorkplaneFingerprint(planeA)).toBe(placementWorkplaneFingerprint(planeC));
    expect(placementWorkplaneFingerprint(planeA)).not.toBe(placementWorkplaneFingerprint(planeB));
  });

  it("normalizes a stored oblique workplane to a fixed point", () => {
    // Re-normalizing used to flip the last bit back and forth, so saving the
    // project list never settled ("Maximum update depth exceeded").
    for (const upright of [false, true]) {
      for (let i = 0; i < 200; i += 1) {
        const plane = placementWorkplaneFromSurface(
          { x: 12.5, y: 3 + i, z: -7 },
          { x: Math.sin(i), y: Math.cos(i * 0.7), z: 0.3 + Math.sin(i * 1.3) },
          { x: Math.cos(i * 2.1), y: 0.2, z: Math.sin(i * 0.4) },
          false,
          upright,
        );
        const once = normalizePlacementWorkplane(JSON.parse(JSON.stringify(plane)));
        const twice = normalizePlacementWorkplane(JSON.parse(JSON.stringify(once)));
        expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
        expect(JSON.stringify(once)).toBe(JSON.stringify(plane));
      }
    }
  });
});

describe("placementWorkplanePlateShift", () => {
  it("reads how far a plate's own plane was moved sideways onto another build plate (#1660)", () => {
    const base = horizontalPlacementWorkplane();
    expect(placementWorkplanePlateShift(base)).toBe(0);
    expect(placementWorkplanePlateShift({ ...base, origin: { x: 260, y: 0, z: 0 } })).toBe(260);
  });

  it("takes no other workplane for the plate", () => {
    const base = horizontalPlacementWorkplane();
    expect(placementWorkplanePlateShift(horizontalPlacementWorkplane(5))).toBeNull();
    expect(placementWorkplanePlateShift({ ...base, origin: { x: 260, y: 0, z: 10 } })).toBeNull();
    expect(placementWorkplanePlateShift({ ...base, xAxis: { x: 0, y: 0, z: -1 }, zAxis: { x: 1, y: 0, z: 0 } })).toBeNull();
    expect(placementWorkplanePlateShift({ ...base, normal: { x: 0, y: 0, z: 1 } })).toBeNull();
  });
});
