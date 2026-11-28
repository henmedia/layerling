import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts } from "@/lib/textFonts";
import { createTextGeometry, curvedRadiusPatch, curvedTextFootprint, curvedTextMovedOver, curvedTextPatch, textGlyphShapes } from "@/lib/textGeometry";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Issue #2196: a name on a 330 mm arc ("along the bottom") had a box 664 mm deep, symmetric about the circle's centre,
 * and the editor said it did not fit the printer. Curved text now has a box of its own letters; older curved text is
 * moved over to it when a design opens, the letters staying where they were.
 */

function text(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "t", name: "Text", kind: "text", color: "#111111", x: 0, z: 0, size: 40, width: 40, depth: 20, height: 0.6, rotation: 0, text: "Jerry Lundquist", font: "Sans", ...overrides };
}

/** A curved text as the editor makes it now: switched on from a straight one. */
function curved(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const straight = text(overrides);
  return { ...straight, ...curvedTextPatch(straight, { textCurved: true, textRadius: overrides.textRadius ?? 330, textSize: overrides.textSize ?? 15 }) };
}

/** A curved text as saved before #2196: the box symmetric about the circle's centre, without the marker. */
function older(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const now = curved(overrides);
  const { textArcTight: _tight, ...rest } = now;
  const legacy = { ...rest, ...overrides } as WorkplaneShape;
  // The old box: what the letters reach from the centre, twice.
  const { width, depth } = curvedTextFootprint(legacy);
  return { ...legacy, width, depth, size: Math.max(width, depth) };
}

/** Where the letters' box lies on the plate: the drawn geometry mirrored, turned and moved as the shape is. */
function lettersOnPlate(shape: WorkplaneShape) {
  const geometry = createTextGeometry(shape);
  geometry.scale(shape.mirrorX ? -1 : 1, shape.mirrorY ? -1 : 1, shape.mirrorZ ? -1 : 1);
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
    "XYZ",
  )));
  geometry.translate(shape.x, shape.elevation ?? 0, shape.z);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!.clone();
  geometry.dispose();
  return box;
}

function expectSameBox(a: THREE.Box3, b: THREE.Box3) {
  for (const key of ["x", "y", "z"] as const) {
    expect(a.min[key]).toBeCloseTo(b.min[key], 2);
    expect(a.max[key]).toBeCloseTo(b.max[key], 2);
  }
}

describe("curved text with a box of its own letters (#2196)", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  it("gives a name on a 330 mm arc a box round the name, not round the circle", () => {
    for (const textInward of [true, false]) {
      const shape = curved({ textInward });
      expect(shape.textArcTight).toBe(true);
      expect(shape.depth).toBeLessThan(30);
      expect(shape.width).toBeGreaterThan(80);
      expect(shape.width).toBeLessThan(160);
      // The letters fill that box, about its middle.
      const box = lettersOnPlate(shape);
      expect(box.max.x - box.min.x).toBeCloseTo(shape.width, 1);
      expect(box.max.z - box.min.z).toBeCloseTo(shape.depth, 1);
      expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 2);
      expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 2);
    }
  });

  it("moves an older curved text over with its letters where they were, turned, tilted or mirrored", () => {
    const cases: Array<Partial<WorkplaneShape>> = [
      { textInward: true, x: 2.377, z: -322.643, elevation: 0.294 },
      { textRadius: 40, textSize: 8, text: "HELLO" },
      { textRadius: 40, textSize: 8, text: "HELLO", rotation: 30, x: 12, z: -7 },
      { textRadius: 60, textSize: 6, text: "Abc", rotationX: 90, elevation: 5 },
      { textRadius: 35, textSize: 7, text: "Mirror", mirrorX: true, rotation: -45, x: 4 },
      { textRadius: 40, textSize: 8, text: "Down", textVertical: true, textInward: true },
    ];
    for (const overrides of cases) {
      const before = older(overrides);
      const after = curvedTextMovedOver(before);
      expect(after.textArcTight).toBe(true);
      expect(Math.min(after.width, after.depth)).toBeLessThan(Math.min(before.width, before.depth) + 1e-6);
      expectSameBox(lettersOnPlate(after), lettersOnPlate(before));
      // Once over, it stays where it is.
      expect(curvedTextMovedOver(after)).toBe(after);
    }
  });

  it("leaves an older curved text with a fillet in its old box", () => {
    const filleted = { ...older({ textRadius: 40, textSize: 8 }), edgeTreatments: [{ kind: "fillet" as const, amount: 0.2, edgeCount: 4 }] };
    expect(curvedTextMovedOver(filleted)).toBe(filleted);
  });

  it("keeps a text that closes its circle centred on it", () => {
    const ring = older({ text: "1 2 3 4 5 6 7 8 9 10 11 12", textRadius: 30, textSize: 5, textFullCircle: true });
    const after = curvedTextMovedOver(ring);
    expect(after.x).toBe(ring.x);
    expect(after.z).toBe(ring.z);
    expectSameBox(lettersOnPlate(after), lettersOnPlate(ring));
  });

  it("keeps the letters in place when the radius changes", () => {
    // The middle letter's middle on the plate, from the exact outlines the edge tool uses.
    const middleOnPlate = (shape: WorkplaneShape) => {
      const glyphs = textGlyphShapes(shape)!.glyphs;
      const middle = glyphs[Math.floor(glyphs.length / 2)];
      const points = middle.glyph.getPoints().map((point) => middle.map(point));
      const local = new THREE.Vector3(
        (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2,
        0,
        (Math.min(...points.map((p) => p.z)) + Math.max(...points.map((p) => p.z))) / 2,
      );
      local.multiply(new THREE.Vector3(shape.mirrorX ? -1 : 1, 1, shape.mirrorZ ? -1 : 1));
      local.applyEuler(new THREE.Euler(0, THREE.MathUtils.degToRad(shape.rotation), 0, "XYZ"));
      return new THREE.Vector2(shape.x + local.x, shape.z + local.z);
    };
    const cases: Array<Partial<WorkplaneShape>> = [
      { text: "HHHHH", textRadius: 40, textSize: 8 },
      { text: "HHHHH", textRadius: 40, textSize: 8, textInward: true },
      { text: "HHHHH", textRadius: 40, textSize: 8, textVertical: true },
      { text: "HHHHH", textRadius: 40, textSize: 8, rotation: 30, mirrorX: true, x: 12, z: -7 },
    ];
    for (const overrides of cases) {
      const shape = curved(overrides);
      const moved = { ...shape, ...curvedRadiusPatch(shape, 70) };
      const resized = { ...moved, ...curvedTextPatch(moved, { textRadius: 70 }) };
      expect(middleOnPlate(resized).distanceTo(middleOnPlate(shape))).toBeLessThan(1e-3);
    }
  });

  it("puts the exact outlines on the drawn letters", () => {
    const shape = curved({ text: "Layerling", textRadius: 50, textSize: 9, textInward: true });
    const glyphs = textGlyphShapes(shape)!.glyphs;
    const xs: number[] = [];
    const zs: number[] = [];
    glyphs.forEach(({ glyph, map }) => glyph.getPoints().forEach((point) => {
      const placed = map(point);
      xs.push(placed.x);
      zs.push(placed.z);
    }));
    const drawn = lettersOnPlate(shape);
    expect(Math.min(...xs)).toBeCloseTo(drawn.min.x, 1);
    expect(Math.max(...xs)).toBeCloseTo(drawn.max.x, 1);
    expect(Math.min(...zs)).toBeCloseTo(drawn.min.z, 1);
    expect(Math.max(...zs)).toBeCloseTo(drawn.max.z, 1);
  });

  it("keeps the box through saving and opening, and moves an older text over when its design opens", async () => {
    const roundTrip = async (shape: WorkplaneShape) => {
      const shapes = [shape];
      const bytes = await exportLylProject({
        projectId: "p", projectName: "Curved", createdAt: 1, modifiedAt: 2, shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0,
        assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
      });
      return (await importLylProject(bytes)).shapes[0];
    };
    const now = curved({ textInward: true, x: 3, z: 1 });
    const reopened = await roundTrip(now);
    expect(reopened.textArcTight).toBe(true);
    expect(reopened.x).toBeCloseTo(now.x, 6);
    expect(reopened.z).toBeCloseTo(now.z, 6);
    expect(reopened.depth).toBeCloseTo(now.depth, 6);

    const before = older({ textInward: true, x: 2.377, z: -322.643, elevation: 0.294 });
    const opened = await roundTrip(before);
    expect(opened.textArcTight).toBe(true);
    expect(opened.depth).toBeLessThan(30);
    expectSameBox(lettersOnPlate(opened), lettersOnPlate(before));
  });
});
