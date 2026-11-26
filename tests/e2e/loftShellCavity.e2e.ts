import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import type { ShellOpenings } from "@/types/layerling";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { shellLoftByCavity } from "@/lib/cadShell";
import { loftFrameSize, loftStoredMeasures } from "@/lib/loftGeometry";
import { loftShellCavity } from "@/lib/loftShellCavity";

function loft(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const base = {
    id: "loft", name: "loft", kind: "loft", x: 12, z: -7, elevation: 3, size: 40, height: 30, rotation: 25, color: "#c0703a",
    loftBottomOutline: "rectangle", loftTopOutline: "round", loftBottomWidth: 40, loftBottomDepth: 40, loftTopWidth: 30, loftTopDepth: 30,
    loftBottomCorner: 3, loftTopCorner: 3, loftOffsetX: 0, loftOffsetZ: 0, loftWall: 0,
    ...extra,
  } as WorkplaneShape;
  const frame = loftFrameSize(loftStoredMeasures(base));
  return { ...base, width: frame.width, depth: frame.depth };
}

const isOpen = (openings: ShellOpenings, side: "top" | "bottom") => Array.isArray(openings) && openings.includes(side);

describe("hollowing a transition whose ends differ (Making Layers)", () => {
  let cad: OcctKernel;
  beforeAll(async () => {
    cad = await OcctKernel.init({ wasm: join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm") });
  });

  function body(shape: WorkplaneShape) {
    const part = cadModifierProfileForShape(shape)!;
    const local = profileExtrusionSolid(cad, part);
    return part.transform ? cad.transform(local, part.transform) : local;
  }

  /** The thinnest and thickest wall round the sides, from points of the inside to the outside's side faces. */
  function walls(solid: ShapeHandle, hollow: ShapeHandle) {
    const inside = cad.cut(solid, hollow);
    const outer = cad.getSubShapes(solid, "face").filter((face) => {
      const box = cad.getBoundingBox(face, false);
      return box.ymax - box.ymin > 1;
    });
    const { positions } = cad.tessellate(inside, { linearDeflection: 0.02, angularDeflection: 0.2 });
    const box = cad.getBoundingBox(inside, false);
    const points = Array.from({ length: positions.length / 3 }, (_, i) => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]);
    const step = Math.max(1, Math.floor(points.length / 120));
    const distances = points.filter((_, i) => i % step === 0).map(([x, y, z]) => {
      const vertex = cad.makeVertex(x, y, z);
      return Math.min(...outer.map((face) => cad.distanceBetween(vertex, face)));
    });
    return { least: Math.min(...distances), most: Math.max(...distances), low: box.ymin, high: box.ymax };
  }

  const shapes: Record<string, Partial<WorkplaneShape>> = {
    standard: {},
    "sharp corners": { loftBottomCorner: 0 },
    "as wide above": { loftTopWidth: 40, loftTopDepth: 40 },
    "rounded rectangles": { loftTopOutline: "rectangle", loftTopWidth: 25 },
    hexagon: { loftBottomOutline: "polygon", loftBottomSides: 6, loftBottomCorner: 0 },
    "moved aside": { loftOffsetX: 8 },
    twisted: { loftTwist: 30 },
    smooth: { loftSmooth: 1 },
  };
  for (const [name, extra] of Object.entries(shapes)) {
    for (const openings of (name === "standard" ? [["top"], ["bottom"], ["top", "bottom"], "none"] : [["top"]]) as ShellOpenings[]) {
      it(`${name}, open: ${String(openings)}`, () => {
        const shape = loft(extra);
        const solid = body(shape);
        const inside = loftShellCavity(shape, 2);
        expect(inside).not.toBeNull();
        const hollow = shellLoftByCavity(cad, solid, inside!, 2, openings);
        expect(hollow).not.toBeNull();
        expect(cad.isValid(hollow!)).toBe(true);
        const { least, most, low, high } = walls(solid, hollow!);
        expect(least).toBeGreaterThan(1.98);
        expect(most).toBeLessThan(2.5);
        expect(low).toBeCloseTo(isOpen(openings, "bottom") ? 3 : 5, 2);
        expect(high).toBeCloseTo(isOpen(openings, "top") ? 33 : 31, 2);
      });
    }
  }

  it("leaves what the kernel hollows itself, and what would get uneven walls, to the kernel", () => {
    expect(loftShellCavity(loft({ loftBottomOutline: "round" }), 2)).toBeNull();
    expect(loftShellCavity(loft({ loftTopOutline: "rectangle", loftBottomCorner: 0, loftTopCorner: 0 }), 2)).toBeNull();
    expect(loftShellCavity(loft({ loftOffsetX: 60 }), 2)).toBeNull();
    expect(loftShellCavity(loft({ loftTiltX: 10 }), 2)).toBeNull();
    expect(loftShellCavity(loft({ rotationX: 90 }), 2)).toBeNull();
    expect(loftShellCavity(loft(), 20)).toBeNull();
  });
});
