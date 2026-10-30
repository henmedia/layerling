// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { cadSketchRegions } from "@/lib/sketchCadProfile";
import { pathWire } from "@/lib/sketchCadWire";
import { sketchProfileFromSvg } from "@/lib/svgSketch";

/*
 * #996: a traced outline (VTracer) joins its curves with kinks of a few degrees where the picture
 * runs on smoothly, and curves that come close to a circle were built as true arcs, which leave
 * their ends along the circle, not along the curve beside them. The kernel failed every chamfer
 * and fillet along such an outline, at any size. The SVG import now makes those joins smooth, and
 * a curve only becomes an arc when its handles lie on the circle's tangent.
 */

let cad: OcctKernel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
});

/**
 * A closed outline of cubic curves round an ellipse, as a tracer draws it: each piece leaves its
 * start turned by `kink` degrees, and both its handles lean off the ellipse by `lean` degrees,
 * which keeps the joins smooth but the handles off the circle's tangent.
 */
function kinkedOutline(rx: number, ry: number, pieces: number, kink: number, lean = 0) {
  const turn = ((kink + lean) * Math.PI) / 180;
  const tilt = (lean * Math.PI) / 180;
  const at = (angle: number) => ({ x: 100 + rx * Math.cos(angle), y: 100 + ry * Math.sin(angle) });
  const tangent = (angle: number) => ({ x: -rx * Math.sin(angle), y: ry * Math.cos(angle) });
  const step = (Math.PI * 2) / pieces;
  const k = (4 / 3) * Math.tan(step / 4);
  let d = "";
  for (let index = 0; index < pieces; index += 1) {
    const from = step * index;
    const to = from + step;
    const start = at(from);
    const end = at(to);
    const leave = tangent(from);
    const rotate = (vector: { x: number; y: number }, angle: number) => ({ x: vector.x * Math.cos(angle) - vector.y * Math.sin(angle), y: vector.x * Math.sin(angle) + vector.y * Math.cos(angle) });
    const turned = rotate(leave, turn);
    const arrive = rotate(tangent(to), tilt);
    if (index === 0) d += `M ${start.x} ${start.y} `;
    d += `C ${start.x + k * turned.x} ${start.y + k * turned.y} ${end.x - k * arrive.x} ${end.y - k * arrive.y} ${end.x} ${end.y} `;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="${d}Z"/></svg>`;
}

function chamferTop(svg: string, distance: number) {
  const profile = sketchProfileFromSvg(svg)!;
  const [region] = cadSketchRegions(profile);
  const solid = cad.extrude(cad.makeFace(pathWire(cad, region.outer)), 0, 10, 0);
  const top = cad.getSubShapes(solid, "edge").filter((edge) => {
    const box = cad.getBoundingBox(edge, false);
    return box.ymin > 9.99 && box.ymax - box.ymin < 1e-6;
  });
  const surfaces = cad.getSubShapes(solid, "face").map((face) => cad.surfaceType(face));
  const result = cad.chamfer(solid, top, distance);
  return { valid: cad.isValid(result), surfaces, top: top.length };
}

describe("traced SVG outlines take a chamfer (#996)", () => {
  it("chamfers a circle of curves whose handles lean a little off the circle", () => {
    // Close enough to a circle that each curve was built as an arc, which left its ends at an angle to the curve beside it.
    const { valid, surfaces, top } = chamferTop(kinkedOutline(40, 40, 4, 0, 0.3), 1);
    expect(valid).toBe(true);
    expect(top).toBe(4);
    expect(surfaces).not.toContain("cylinder");
  });

  it("chamfers an oval of curves meeting at kinks of several degrees", () => {
    const { valid } = chamferTop(kinkedOutline(60, 30, 8, 6), 1);
    expect(valid).toBe(true);
  });

  it("still builds a true circle as cylinder walls", () => {
    const { valid, surfaces } = chamferTop(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="40"/></svg>`, 1);
    expect(valid).toBe(true);
    expect(surfaces).toContain("cylinder");
  });
});
