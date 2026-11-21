import { describe, expect, it } from "vitest";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierHelicalGearForShape, cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { helicalGearPartSolid } from "@/lib/gearSolid";
import { extendedRackMeasures, helixTravelAt, internalGearDiameter, internalGearOutline, rackExtraTeeth, rackHelixTravel, rackLength, rackMeasures, rackOutlinePoints, ringGearHelixTwist } from "@/lib/gearGeometry";
import { stepSourceForShape } from "@/lib/stepExport";
import { cad, displayMesh, surfaceSides } from "./helpers/gearHarness";

/*
 * Ring gears and racks with slanted teeth (Discussion #1627): their exact bodies, for the edge tools and the STEP
 * export, against the display mesh - bounds, volume and the kernel's own comparison with the mesh. The rack's
 * mesh is exact (flat faces); the ring gear's mesh turns in steps, as the helical gear's does.
 */

function ring(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const diameter = internalGearDiameter(1.5, 36, 2, "involute");
  return {
    id: "r", name: "Ring gear", kind: "gear", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0,
    width: diameter, depth: diameter, size: diameter, height: 8, teeth: 36, gearType: "internal", gearProfile: "involute", gearRim: 2,
    helixQuality: 16, ringRackHelixAngle: 20, ...extra,
  } as WorkplaneShape;
}

function rack(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const length = rackLength(1.5, 12);
  return {
    id: "k", name: "Rack", kind: "gear", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0,
    width: length, depth: 6, size: length, height: 8, teeth: 12, gearType: "rack", gearProfile: "involute", ringRackHelixAngle: 20, ...extra,
  } as WorkplaneShape;
}

function exactBody(shape: WorkplaneShape) {
  const part = cadModifierHelicalGearForShape(shape, { anySize: true });
  expect(part).not.toBeNull();
  const local = helicalGearPartSolid(cad, part!);
  const transform = part!.transform;
  return !transform ? local : cadTransformRequiresGeneralTransform(transform) ? cad.generalTransform(local, transform) : cad.transform(local, transform);
}

describe("the exact bodies of ring gears and racks with slanted teeth (Discussion #1627)", () => {
  it.each<[string, WorkplaneShape, number]>([
    ["helical ring gear", ring(), 0.01],
    ["herringbone ring gear turned the other way", ring({ ringRackHelixAngle: -30, ringRackHerringbone: true }), 0.01],
    ["round-toothed helical ring gear, turned, lifted and mirrored", ring({ gearProfile: "round", rotation: 30, rotationX: 90, elevation: 4, x: 12, mirrorZ: true }), 0.01],
    ["helical rack", rack(), 1e-4],
    ["rack slanted steeply the other way", rack({ ringRackHelixAngle: -45 }), 1e-4],
    ["herringbone rack", rack({ ringRackHelixAngle: 30, ringRackHerringbone: true }), 1e-4],
    ["round-toothed herringbone rack, turned and lifted", rack({ gearProfile: "round", ringRackHerringbone: true, rotation: 45, elevation: 3, z: -7 }), 1e-4],
  ])("builds the %s as drawn", (_name, shape, volumeTolerance) => {
    expect(stepSourceForShape(shape)).toBe("helicalGear");
    expect(cadModifierProfileForShape(shape)).toBeNull();
    const solid = exactBody(shape);
    expect(cad.isValid(solid)).toBe(true);
    const expected = displayMesh(shape);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const box = cad.getBoundingBox(solid);
    [box.xmin, box.ymin, box.zmin, box.xmax, box.ymax, box.zmax].forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.01));
    const volume = cad.getVolume(solid);
    expect(Math.abs(expected.volume - volume) / volume).toBeLessThan(volumeTolerance);
  });

  // Bounds and volume cannot tell teeth slanted the wrong way: points just either side of every flank, at several
  // heights, where the teeth have moved to there, are tested against the body.
  it.each<[string, WorkplaneShape]>([
    ["helical ring gear", ring()],
    ["herringbone ring gear", ring({ ringRackHelixAngle: -30, ringRackHerringbone: true })],
    ["helical rack", rack()],
    ["herringbone rack", rack({ ringRackHelixAngle: 30, ringRackHerringbone: true })],
  ])("has the %s's teeth where they have moved to at every height", (_name, shape) => {
    const solid = exactBody(shape);
    const inside = surfaceSides(solid);
    const herringbone = shape.ringRackHerringbone === true;
    const shares = herringbone ? [0.15, 0.3, 0.5, 0.7, 0.85] : [0.15, 0.5, 0.85];
    let tested = 0;
    for (const share of shares) {
      const y = shape.height * share;
      let outline: Array<{ x: number; z: number }>;
      if (shape.gearType === "internal") {
        const { corners, stretch, module } = internalGearOutline(shape.width, shape.depth!, shape);
        const turn = helixTravelAt(ringGearHelixTwist(module, shape.teeth!, shape.height, shape.ringRackHelixAngle), share, herringbone);
        outline = corners.map((c) => ({ x: Math.cos(c.angle + turn) * c.radiusX * stretch.x, z: Math.sin(c.angle + turn) * c.radiusZ * stretch.z }));
      } else {
        const measures = rackMeasures(shape.width, shape.depth!, shape);
        const travel = rackHelixTravel(shape.height, shape.ringRackHelixAngle);
        const shift = helixTravelAt(travel, share, herringbone);
        outline = rackOutlinePoints(extendedRackMeasures(measures, rackExtraTeeth(measures, travel))).slice(2).map((p) => ({ x: p.x + shift, z: p.z }));
      }
      outline.forEach((a, index) => {
        // The ring gear's teeth close round; the rack's run from one end to the other.
        if (shape.gearType === "rack" && index === outline.length - 1) return;
        const b = outline[(index + 1) % outline.length];
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        const m = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
        if (length < 0.05 || Math.abs(m.x) > (shape.gearType === "rack" ? shape.width / 2 - 0.5 : Infinity)) return;
        // The teeth run counter-clockwise; to the right of a side lies the gap (a ring gear's teeth are its hole).
        const n = { x: (b.z - a.z) / length, z: -(b.x - a.x) / length };
        const material = shape.gearType === "internal" ? 1 : -1;
        expect(inside([m.x + n.x * 0.03 * material, y, m.z + n.z * 0.03 * material], 0.5), `material at ${m.x.toFixed(3)}, ${y}, ${m.z.toFixed(3)}`).toBe(true);
        expect(inside([m.x - n.x * 0.03 * material, y, m.z - n.z * 0.03 * material], 0.5), `gap at ${m.x.toFixed(3)}, ${y}, ${m.z.toFixed(3)}`).toBe(false);
        tested += 1;
      });
    }
    expect(tested).toBeGreaterThan(60);
  });

  it("keeps a straight ring gear and rack the straight extrusions they were", () => {
    for (const shape of [ring({ ringRackHelixAngle: 0 }), rack({ ringRackHelixAngle: undefined, ringRackHerringbone: true })]) {
      expect(cadModifierHelicalGearForShape(shape)).toBeNull();
      expect(cadModifierProfileForShape(shape)?.kind).toBe("extrusion");
    }
  });

  it("leaves an oval slanted ring gear on its mesh, as an oval helical gear", () => {
    expect(cadModifierHelicalGearForShape(ring({ width: 70, depth: 60 }))).toBeNull();
  });
});
