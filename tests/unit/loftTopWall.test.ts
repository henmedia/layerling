import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createLoftGeometry,
  loftFieldsFromMeasures,
  loftFrameSize,
  loftMeasuresPatch,
  loftPieces,
  loftProfileLoops,
  loftStoredMeasures,
  maxLoftWall,
  MIN_LOFT_TOP_WALL,
  normalizeLoftMeasures,
  type LoftShapeFields,
} from "@/lib/loftGeometry";
import { validateCadProfile } from "@/lib/cadProfileSolid";
import { workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A wall of its own at the top of a transition (Forum drucktipps3d, post 624069): a vacuum nozzle 3 mm thick on the
 * rectangle at the bottom that ends 1 mm thin on the round top.
 */

function loft(fields: Partial<LoftShapeFields>): LoftShapeFields {
  const base: LoftShapeFields = {
    size: 60,
    height: 50,
    loftBottomOutline: "rectangle",
    loftTopOutline: "round",
    loftBottomWidth: 60,
    loftBottomDepth: 40,
    loftTopWidth: 30,
    loftTopDepth: 30,
    loftBottomCorner: 4,
    loftTopCorner: 0,
    loftOffsetX: 0,
    loftOffsetZ: 0,
    loftWall: 3,
    ...fields,
  };
  const { width, depth } = loftFrameSize(loftStoredMeasures(base));
  return { width, depth, ...base, ...fields };
}

/** Signed volume and how many edges are not shared by exactly two triangles (0 = closed). */
function meshCheck(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const ids = new Map<string, number>();
  const id = (i: number) => {
    const k = [position.getX(i), position.getY(i), position.getZ(i)].map((v) => Math.round(v * 1e4)).join(",");
    if (!ids.has(k)) ids.set(k, ids.size);
    return ids.get(k) as number;
  };
  const edges = new Map<string, number>();
  let volume = 0;
  for (let i = 0; i < position.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => [position.getX(i + k), position.getY(i + k), position.getZ(i + k)]);
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    const v = [id(i), id(i + 1), id(i + 2)];
    for (let e = 0; e < 3; e += 1) {
      const [p, q] = [v[e], v[(e + 1) % 3]];
      if (p === q) continue;
      const edge = `${Math.min(p, q)}-${Math.max(p, q)}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  return { volume, open: [...edges.values()].filter((count) => count !== 2).length };
}

/** Width of an outline's pieces across x, from their sampled points. */
function spanX(pieces: ReturnType<typeof loftPieces>["outer"]["top"]) {
  const xs = pieces.flatMap((piece) => (piece.kind === "line" ? [piece.a.x, piece.b.x] : [0, 0.25, 0.5, 0.75, 1].map((f) => piece.cx + piece.rx * Math.cos(piece.t0 + (piece.t1 - piece.t0) * f))));
  return Math.max(...xs) - Math.min(...xs);
}

describe("transition: wall at the top (Forum 624069)", () => {
  it("follows the wall until it is set apart, and is 0 on a solid body", () => {
    expect(normalizeLoftMeasures({ wall: 3 }).topWall).toBe(3);
    expect(normalizeLoftMeasures({ wall: 3, topWall: 1 }).topWall).toBe(1);
    expect(normalizeLoftMeasures({ wall: 0, topWall: 1 }).topWall).toBe(0);
    // Never thinner than a rim, never closing the opening.
    expect(normalizeLoftMeasures({ wall: 3, topWall: 0 }).topWall).toBe(MIN_LOFT_TOP_WALL);
    const tight = normalizeLoftMeasures({ bottomWidth: 10, bottomDepth: 10, topWidth: 6, topDepth: 6, wall: 1, topWall: 9 });
    expect(tight.topWall).toBeCloseTo(maxLoftWall(tight), 9);
  });

  it("is stored only when it differs, so a changed wall takes a following top wall along", () => {
    const same = loft({});
    expect(loftFieldsFromMeasures(normalizeLoftMeasures({ wall: 3 })).loftTopWall).toBeUndefined();
    // The wall changes: the top follows.
    const thicker = loftMeasuresPatch(same, { wall: 2 }).patch;
    expect(thicker.loftWall).toBe(2);
    expect(thicker.loftTopWall).toBeUndefined();
    // Set apart, the top keeps its own value when the wall changes after.
    const apart = loft({ loftTopWall: 1 });
    expect(loftMeasuresPatch(apart, {}).patch.loftTopWall).toBe(1);
    expect(loftMeasuresPatch(apart, { wall: 2 }).patch.loftTopWall).toBe(1);
    // Set back to the wall's value, it follows again.
    expect(loftMeasuresPatch(apart, { topWall: 3 }).patch.loftTopWall).toBeUndefined();
    // A solid body starting a wall: the top starts with it.
    expect(loftStoredMeasures({ ...loftMeasuresPatch(loft({ loftWall: 0 }), { wall: 2 }).patch } as LoftShapeFields).topWall).toBe(2);
    // It is part of the design, which undo sees.
    expect(workplaneShapesEqual({ ...same, id: "a" } as WorkplaneShape, { ...same, id: "a", loftTopWall: 1 } as WorkplaneShape)).toBe(false);
  });

  it("insets the top opening by its own wall, the bottom by the wall", () => {
    const { outer, inner } = loftPieces(loft({ loftTopWall: 1 }));
    expect(inner).not.toBeNull();
    expect(spanX(outer.bottom) - spanX(inner!.bottom)).toBeCloseTo(6, 6);
    expect(spanX(outer.top) - spanX(inner!.top)).toBeCloseTo(2, 6);
  });

  it("is a closed body, thinner on top than with one wall, and the exact profile matches", () => {
    const even = meshCheck(createLoftGeometry(loft({})));
    const nozzle = meshCheck(createLoftGeometry(loft({ loftTopWall: 1 })));
    expect(nozzle.open).toBe(0);
    expect(nozzle.volume).toBeGreaterThan(0);
    expect(nozzle.volume).toBeLessThan(even.volume);
    const { loops, topLoops } = loftProfileLoops(loft({ loftTopWall: 1 }));
    expect(loops.length).toBe(2);
    expect(() => validateCadProfile({ kind: "loft", loops, topLoops, height: 50 })).not.toThrow();
  });

  it("gives a section in between the wall that suits its height", () => {
    const shape = loft({
      loftTopWall: 1,
      loftTopOutline: "round",
      loftSections: [{ at: 0.5, outline: "round", width: 40, depth: 40, corner: 0, sides: 6, offsetX: 0, offsetZ: 0 }],
    });
    const geometry = createLoftGeometry(shape);
    expect(meshCheck(geometry).open).toBe(0);
    // Halfway up the wall is halfway between 3 and 1: the opening there is 40 - 2 * 2 = 36 mm across.
    const position = geometry.getAttribute("position");
    let innerHalf = Infinity;
    for (let i = 0; i < position.count; i += 1) {
      if (Math.abs(position.getY(i) - 25) > 1e-6 || Math.abs(position.getZ(i)) > 1e-6) continue;
      innerHalf = Math.min(innerHalf, Math.abs(position.getX(i)));
    }
    expect(innerHalf).toBeCloseTo(18, 3);
  });
});
