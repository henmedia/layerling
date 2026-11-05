import { describe, expect, it } from "vitest";
import type { ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { createPulleyGeometry, GT2_GROOVE_DEPTH, pulleyFootprint, pulleyMeasures } from "@/lib/pulleyGeometry";
import { stepSourceForShape } from "@/lib/stepExport";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { cad, placer } from "./helpers/gearHarness";
import type { Vec3 } from "./helpers/gearHarness";

/*
 * The GT2 pulley's exact body (Discussion #1319) against its display mesh,
 * placed as transformMesh places it: the toothed band pushed up between the
 * flanges, the flanges and the hub joined to it, the bore cut through. The
 * mesh samples the same arcs the body is built from, so they agree closely.
 * The volume lies between the band filled to its root circle and filled to
 * its outside circle; a section through the band shows the 0.75 mm grooves.
 */

function pulley(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return canonicalizeShape({
    id: "p", name: "Pulley", kind: "pulley", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0,
    width: 1, depth: 1, size: 1, height: 1,
    teeth: 20, pulleyBeltWidth: 7, pulleyFlange: 1, pulleyFlangeRise: 1.5, pulleyHubHeight: 6, pulleyHubDiameter: 12, centerHoleSize: 5,
    ...extra,
  } as WorkplaneShape);
}

function displayMesh(shape: WorkplaneShape) {
  const geometry = createPulleyGeometry(shape);
  const position = geometry.getAttribute("position");
  const place = placer(shape);
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) vertices.push(place(position.getX(i), position.getY(i), position.getZ(i)));
  const faces: Vec3[] = [];
  const flip = [shape.mirrorX, shape.mirrorY, shape.mirrorZ].filter(Boolean).length % 2 === 1;
  for (let i = 0; i + 2 < vertices.length; i += 3) faces.push(flip ? [i, i + 2, i + 1] : [i, i + 1, i + 2]);
  return cadProfileExpectation(vertices, faces);
}

function body(shape: WorkplaneShape): ShapeHandle {
  const part = cadModifierProfileForShape(shape);
  expect(part?.pulley).toBeDefined();
  const local = profileExtrusionSolid(cad, part!);
  const transform = part!.transform;
  return !transform ? local : cadTransformRequiresGeneralTransform(transform) ? cad.generalTransform(local, transform) : cad.transform(local, transform);
}

function volumeBounds(shape: WorkplaneShape) {
  const m = pulleyMeasures(shape);
  const disc = (r: number, h: number) => Math.PI * r * r * h;
  const rest = 2 * disc(m.flangeRadius, m.flange) + disc(m.hubRadius, m.hubHeight) - disc(m.boreRadius, m.height);
  return { low: rest + disc(m.rootRadius, m.beltWidth), high: rest + disc(m.outsideRadius, m.beltWidth) };
}

describe("the GT2 pulley's exact body (Discussion #1319)", () => {
  it.each<[string, Partial<WorkplaneShape>]>([
    ["default pulley", {}],
    ["pulley without flanges", { pulleyFlange: 0 }],
    ["pulley without a hub", { pulleyHubHeight: 0 }],
    ["bare toothed band", { pulleyFlange: 0, pulleyHubHeight: 0, centerHoleSize: 0 }],
    ["pulley of 10 teeth", { teeth: 10, centerHoleSize: 3 }],
    ["pulley of 60 teeth", { teeth: 60, centerHoleSize: 8, pulleyHubDiameter: 22 }],
    ["pulley of 200 teeth", { teeth: 200, centerHoleSize: 8, pulleyHubDiameter: 30 }],
    ["pulley with a hub as wide as the flanges", { pulleyHubDiameter: 100 }],
    ["pulley turned, tipped and lifted", { rotation: 30, rotationX: 90, rotationZ: 15, elevation: 4, x: 12, z: -5 }],
    ["mirrored pulley", { mirrorX: true }],
  ])("matches the drawn %s", (_name, extra) => {
    const shape = pulley(extra);
    const solid = body(shape);
    expect(cad.isValid(solid)).toBe(true);
    expect(cad.getSubShapes(solid, "solid").length).toBe(1);
    const expected = displayMesh(shape);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const volume = cad.getVolume(solid);
    const { low, high } = volumeBounds(shape);
    expect(volume).toBeGreaterThan(low);
    expect(volume).toBeLessThan(high);
    expect(Math.abs(expected.volume - volume) / volume).toBeLessThan(0.005);
    expect(stepSourceForShape(shape)).toBe("profile");
  });

  it("sizes its box from the teeth, flanges and hub", () => {
    const shape = pulley();
    expect(shape.width).toBeCloseTo(12.224 + 3, 3);
    expect(shape.depth).toBeCloseTo(shape.width, 9);
    expect(shape.height).toBeCloseTo(15, 9);
    const box = cad.getBoundingBox(body(shape));
    expect(box.xmax - box.xmin).toBeCloseTo(shape.width, 3);
    expect(box.ymax - box.ymin).toBeCloseTo(15, 6);
    // A size that does not fit the measures is put right.
    expect(canonicalizeShape({ ...shape, width: 40, height: 3 })).toMatchObject(pulleyFootprint(shape));
  });

  it("builds the grooves from true arcs: round faces, no facets", () => {
    const solid = body(pulley());
    const faces = cad.getSubShapes(solid, "face");
    // Per groove fillet, flank, tip, flank, fillet; per tooth the land; plus the flanges', the hub's and the bore's walls.
    const round = faces.filter((face) => cad.surfaceType(face) === "cylinder").length;
    expect(round).toBeGreaterThanOrEqual(20 * 6 + 4);
    expect(faces.filter((face) => !["cylinder", "plane"].includes(cad.surfaceType(face))).length).toBe(0);
  });

  it("cuts the grooves 0.75 mm deep: a section through the band reaches the root circle", () => {
    const shape = pulley({ pulleyHubHeight: 0, centerHoleSize: 0 });
    const m = pulleyMeasures(shape);
    const solid = body(shape);
    const y = m.flange + m.beltWidth / 2;
    // A thin slab through the band: groove 0 lies on +x (and with 20 teeth groove 10 on -x), so across x it is a groove
    // short of the outside diameter at each end; its area lies between the root and the outside circle's.
    const slab = cad.translate(cad.makeBox(100, 0.2, 100), -50, y - 0.1, -50);
    const section = cad.common(solid, slab);
    const box = cad.getBoundingBox(section);
    expect(box.xmax - box.xmin).toBeLessThan(2 * m.outsideRadius);
    expect(box.xmax - box.xmin).toBeGreaterThan(2 * m.rootRadius - 1e-6);
    const area = cad.getVolume(section) / 0.2;
    expect(area).toBeLessThan(Math.PI * m.outsideRadius ** 2);
    expect(area).toBeGreaterThan(Math.PI * (m.outsideRadius - GT2_GROOVE_DEPTH) ** 2);
  });
});
