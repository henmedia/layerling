import { describe, expect, it } from "vitest";
import type { WorkplaneShape } from "@/types/layerling";
import { aabbsOverlap, shapeYawDegrees, stepSourceForShape, worldAabb } from "@/lib/stepExport";

function shape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "s1",
    name: "Shape",
    kind: "box",
    color: "#ffffff",
    x: 0,
    z: 0,
    size: 10,
    width: 10,
    depth: 10,
    height: 10,
    rotation: 0,
    ...overrides,
  };
}

describe("shapeYawDegrees", () => {
  it("drops yaw on a circular cylinder so the exported diameter is invariant", () => {
    expect(shapeYawDegrees(shape({ kind: "cylinder", width: 8, depth: 8, rotation: 30 }))).toBe(0);
  });

  it("drops yaw on a circular cone too", () => {
    expect(shapeYawDegrees(shape({ kind: "cone", width: 8, depth: 8, rotation: 30 }))).toBe(0);
  });

  it("keeps yaw on an elliptical cylinder where orientation matters", () => {
    expect(shapeYawDegrees(shape({ kind: "cylinder", width: 8, depth: 4, rotation: 30 }))).toBe(30);
  });

  it("keeps yaw on a box regardless of footprint", () => {
    expect(shapeYawDegrees(shape({ kind: "box", width: 8, depth: 8, rotation: 45 }))).toBe(45);
  });
});

describe("worldAabb", () => {
  it("builds a tight box for an axis-aligned shape, offset by elevation", () => {
    const box = worldAabb(shape({ x: 5, z: -3, elevation: 2, width: 10, depth: 6, height: 4 }));
    expect(box.min).toEqual([0, 2, -6]);
    expect(box.max).toEqual([10, 6, 0]);
  });

  it("falls back to the bounding-sphere box for a rotated shape", () => {
    const box = worldAabb(shape({ width: 10, depth: 6, height: 4, rotation: 30 }));
    const r = 0.5 * Math.sqrt(10 * 10 + 4 * 4 + 6 * 6);
    expect(box.min).toEqual([-r, 2 - r, -r]);
    expect(box.max).toEqual([r, 2 + r, r]);
  });

  it("treats a circular cylinder's yaw as no rotation and keeps the tight box", () => {
    const box = worldAabb(shape({ kind: "cylinder", width: 8, depth: 8, height: 4, rotation: 90 }));
    expect(box.min).toEqual([-4, 0, -4]);
    expect(box.max).toEqual([4, 4, 4]);
  });
});

describe("aabbsOverlap", () => {
  const a = { min: [0, 0, 0] as [number, number, number], max: [10, 10, 10] as [number, number, number] };

  it("detects overlapping boxes", () => {
    expect(aabbsOverlap(a, { min: [5, 5, 5], max: [15, 15, 15] })).toBe(true);
  });

  it("treats face-touching boxes as overlapping (inclusive bounds)", () => {
    expect(aabbsOverlap(a, { min: [10, 0, 0], max: [20, 10, 10] })).toBe(true);
  });

  it("rejects boxes separated on a single axis", () => {
    expect(aabbsOverlap(a, { min: [11, 0, 0], max: [20, 10, 10] })).toBe(false);
    expect(aabbsOverlap(a, { min: [0, 0, 11], max: [10, 10, 20] })).toBe(false);
  });
});

/*
 * Woraus die STEP-Ausfuhr einen Koerper baut. Der Fall, an dem es lange
 * scheiterte: Ein verrundeter Quader ist danach ein Netz - und ein Netz traegt
 * STEP nicht. Die exakte Form lag die ganze Zeit als `cadBrep` daneben, wurde
 * aber nicht angesehen, und die Ausfuhr brach mit "No box/cylinder/sphere" ab.
 */
describe("stepSourceForShape", () => {
  it("baut ein Grundelement aus seinen Massen", () => {
    expect(stepSourceForShape(shape({ kind: "box" }))).toBe("primitive");
    expect(stepSourceForShape(shape({ kind: "cylinder" }))).toBe("primitive");
    expect(stepSourceForShape(shape({ kind: "sphere" }))).toBe("primitive");
    expect(stepSourceForShape(shape({ kind: "cone" }))).toBe("primitive");
  });

  it("nimmt bei einem bearbeiteten Koerper das abgelegte B-Rep", () => {
    const verrundet = shape({ kind: "mesh", cadBrep: "DBRep_DrawableShape …" });
    expect(stepSourceForShape(verrundet)).toBe("baked");
  });

  it("nimmt auch bei einer Aussparung das abgelegte B-Rep", () => {
    expect(stepSourceForShape(shape({ kind: "mesh", hole: true, cadBrep: "DBRep …" }))).toBe("baked");
  });

  it("bevorzugt die eingelesene STEP-Quelle, wo es sie gibt", () => {
    const eingelesen = shape({
      kind: "mesh",
      importedMesh: { positions: new Float32Array(), baseWidth: 1, baseDepth: 1, baseHeight: 1, triangleCount: 0, brepStep: "ISO-10303-21;" },
    });
    expect(stepSourceForShape(eingelesen)).toBe("imported");
  });

  it("baut ein Gewinde als exakten Koerper aus seinen Massen", () => {
    expect(stepSourceForShape(shape({ kind: "thread" }))).toBe("thread");
    expect(stepSourceForShape(shape({ kind: "thread", threadRole: "nut" }))).toBe("thread");
  });

  it("baut eine Feder als exakten Koerper aus ihren Massen", () => {
    expect(stepSourceForShape(shape({ kind: "spring", width: 20, depth: 20, height: 30 }))).toBe("spring");
    expect(stepSourceForShape(shape({ kind: "spring", width: 20, depth: 12, height: 30, springTurns: 3, springWire: 1 }))).toBe("spring");
  });

  it("exports a Gridfinity bin and baseplate as their exact bodies", () => {
    expect(stepSourceForShape(shape({ kind: "gridfinity", width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" }))).toBe("gridfinity");
    expect(stepSourceForShape(shape({ kind: "gridfinity", width: 84, depth: 42, height: 5, gridfinityType: "baseplate" }))).toBe("gridfinity");
  });

  it("baut Schraeg- und Kegelraeder als exakte Koerper", () => {
    expect(stepSourceForShape(shape({ kind: "gear", width: 30, depth: 30, height: 6, gearType: "helical" }))).toBe("helicalGear");
    expect(stepSourceForShape(shape({ kind: "gear", width: 30, depth: 30, height: 6, gearType: "bevel" }))).toBe("profile");
    expect(stepSourceForShape(shape({ kind: "gear", width: 30, depth: 18, height: 6, gearType: "bevel" }))).toBe("profile");
    // Ein ovales Schraegrad dreht keinen festen Zahnkranz: es bleibt ein Netz.
    expect(stepSourceForShape(shape({ kind: "gear", width: 30, depth: 18, height: 6, gearType: "helical" }))).toBe("unsupported");
    // Ein Pfeilrad ist exakt, oval bleibt es ein Netz (#1007).
    expect(stepSourceForShape(shape({ kind: "gear", width: 30, depth: 30, height: 6, gearType: "herringbone" }))).toBe("helicalGear");
    expect(stepSourceForShape(shape({ kind: "gear", width: 30, depth: 18, height: 6, gearType: "herringbone" }))).toBe("unsupported");
  });

  it("laesst tragen, was STEP nicht abbilden kann", () => {
    // Eine Verdrillung hat noch keine exakte Form.
    expect(stepSourceForShape(shape({ kind: "box", extrudeTwist: 45 }))).toBe("profile");
    expect(stepSourceForShape(shape({ kind: "text" }))).toBe("unsupported");
    // Ein eingelesenes Netz ohne Quelle: kein B-Rep, nur Dreiecke.
    const netz = shape({
      kind: "mesh",
      importedMesh: { positions: new Float32Array(), baseWidth: 1, baseDepth: 1, baseHeight: 1, triangleCount: 12 },
    });
    expect(stepSourceForShape(netz)).toBe("unsupported");
  });
});
