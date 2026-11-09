import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JoinType, OcctKernel, type ShapeHandle } from "occt-wasm";
import { shellSolid } from "@/lib/cadShell";
import { exactSolidFromMesh } from "@/lib/cadMeshExact";

// Layerling is Y-up; OCCT primitives are built along Z.
const ROTATE_Z_TO_Y: number[] = [
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, -1, 0, 0,
];

describe("hollowing a solid with the real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  function yUp(shape: ShapeHandle) {
    const turned = kernel.transform(shape, ROTATE_Z_TO_Y);
    kernel.release(shape);
    return turned;
  }

  // 40 x 20 x 30 (x, y = up, z), standing on y = 0.
  function box() {
    return yUp(kernel.makeBox(40, 30, 20));
  }

  function expectHollow(result: ShapeHandle, expectedVolume: number) {
    expect(kernel.isValid(result)).toBe(true);
    expect(kernel.getVolume(result)).toBeCloseTo(expectedVolume, 3);
    const bounds = kernel.getBoundingBox(result, false);
    // Walls grow inward: the outside does not move.
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(40, 4);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(20, 4);
    expect(bounds.zmax - bounds.zmin).toBeCloseTo(30, 4);
  }

  // Fratercula's 1 mm frame: a wall as thick as the part is tall. The height
  // only limits the wall where a floor or lid is left standing.
  it("hollows a 1 mm plate into a frame with a 1 mm wall", () => {
    const plate = yUp(kernel.makeBox(40, 30, 1));
    const result = shellSolid(kernel, plate, 1, "top-bottom");
    expect(kernel.isValid(result)).toBe(true);
    expect(kernel.getVolume(result)).toBeCloseTo(40 * 30 * 1 - 38 * 28 * 1, 3);
    kernel.release(result);
    kernel.release(plate);
  });

  it("leaves a floor thicker than half the height when only the top is open", () => {
    const plate = yUp(kernel.makeBox(40, 30, 2));
    const result = shellSolid(kernel, plate, 1.5, "top");
    expect(kernel.isValid(result)).toBe(true);
    // Cavity 37 x 27 x 0.5 above a 1.5 mm floor.
    expect(kernel.getVolume(result)).toBeCloseTo(40 * 30 * 2 - 37 * 27 * 0.5, 3);
    kernel.release(result);
    kernel.release(plate);
  });

  it("opens the top of a box like a tray", () => {
    const solid = box();
    const result = shellSolid(kernel, solid, 2, "top");
    // Cavity 36 x 18 x 26: the floor stays 2 mm, the top is gone.
    expectHollow(result, 40 * 20 * 30 - 36 * 18 * 26);
    kernel.release(result);
    kernel.release(solid);
  });

  // RobbieKnobbie's drawer slot (#159): one side open instead of the top.
  it("opens the front of a box like a drawer slot", () => {
    const solid = box();
    const result = shellSolid(kernel, solid, 2, ["front"]);
    // Cavity 36 x 16 x 28: walls left, right, top, bottom and back stay.
    expectHollow(result, 40 * 20 * 30 - 36 * 16 * 28);
    kernel.release(result);
    kernel.release(solid);
  });

  it("opens two opposite sides into a tunnel", () => {
    const solid = box();
    const result = shellSolid(kernel, solid, 2, ["left", "right"]);
    expectHollow(result, 40 * 20 * 30 - 40 * 16 * 26);
    kernel.release(result);
    kernel.release(solid);
  });

  it("opens the top and the back together", () => {
    const solid = box();
    const result = shellSolid(kernel, solid, 2, ["top", "back"]);
    expectHollow(result, 40 * 20 * 30 - 36 * 18 * 28);
    kernel.release(result);
    kernel.release(solid);
  });

  it("refuses a side without a flat face at its edge", () => {
    const cylinder = yUp(kernel.makeCylinder(10, 20));
    expect(() => shellSolid(kernel, cylinder, 1, ["front"])).toThrow(/no flat front face/);
    kernel.release(cylinder);
  });

  it("opens the bottom of a box like a lid", () => {
    const solid = box();
    const result = shellSolid(kernel, solid, 2, "bottom");
    expectHollow(result, 40 * 20 * 30 - 36 * 18 * 26);
    kernel.release(result);
    kernel.release(solid);
  });

  it("opens top and bottom into a frame", () => {
    const solid = box();
    const result = shellSolid(kernel, solid, 2, "top-bottom");
    expectHollow(result, 40 * 20 * 30 - 36 * 20 * 26);
    kernel.release(result);
    kernel.release(solid);
  });

  it("closes a box on every side around a sealed cavity", () => {
    const solid = box();
    const result = shellSolid(kernel, solid, 2, "none");
    expectHollow(result, 40 * 20 * 30 - 36 * 16 * 26);
    kernel.release(result);
    kernel.release(solid);
  });

  it("turns a cylinder into a cup with its opening on top", () => {
    const solid = yUp(kernel.makeCylinder(10, 20));
    const result = shellSolid(kernel, solid, 1.5, "top");
    expect(kernel.isValid(result)).toBe(true);
    const expected = Math.PI * 10 * 10 * 20 - Math.PI * 8.5 * 8.5 * 18.5;
    expect(kernel.getVolume(result) / expected).toBeCloseTo(1, 3);
    kernel.release(result);
    kernel.release(solid);
  });

  it("hollows a sphere, which has no flat face, as a closed shell", () => {
    const solid = kernel.makeSphere(10);
    const result = shellSolid(kernel, solid, 1, "none");
    const expected = (4 / 3) * Math.PI * (10 ** 3 - 9 ** 3);
    expect(kernel.getVolume(result) / expected).toBeCloseTo(1, 2);
    kernel.release(result);
    kernel.release(solid);
  });

  it("leaves a top cut off at an angle open (Discussion #1544)", () => {
    // The box 40 x 20 x 30 with a wedge taken off its top: 20 mm high at x = 0, 12 mm at x = 40.
    const wedgeCut = kernel.makeBox(80, 60, 80);
    const tilted = kernel.translate(kernel.rotate(wedgeCut, { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } }, -Math.atan2(8, 40)), -20, 24, -40);
    const solid = kernel.cut(box(), tilted);
    const open = shellSolid(kernel, solid, 1, "top");
    const closed = shellSolid(kernel, solid, 1, "none");
    expect(kernel.isValid(open)).toBe(true);
    // Open, it lacks the sloping lid the sealed one keeps: about 40 x 30 x 1 mm, a little more along the slope.
    const lidVolume = kernel.getVolume(closed) - kernel.getVolume(open);
    expect(lidVolume).toBeGreaterThan(38 * 28 * 1);
    expect(lidVolume).toBeLessThan(41 * 30 * 1.05);
    // The walls stay where they were.
    const bounds = kernel.getBoundingBox(open, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(40, 4);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(20, 4);
    [open, closed, solid].forEach((shape) => kernel.release(shape));
  });

  it("takes the sloping face of a roof as its top only while it leans no more than 60 degrees", () => {
    // What is left of the box below a face running down at 70 degrees from its top left edge: too steep to be a top.
    const steep = kernel.rotate(kernel.makeBox(80, 80, 80), { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } }, -(70 * Math.PI) / 180);
    const solid = kernel.cut(box(), kernel.translate(steep, -5, 20 + 5 * Math.tan((70 * Math.PI) / 180), -40));
    expect(() => shellSolid(kernel, solid, 1, "top")).toThrow(/no flat top face/);
    kernel.release(solid);
  });

  it("explains when there is no flat face to open", () => {
    const solid = kernel.makeSphere(10);
    expect(() => shellSolid(kernel, solid, 1, "top")).toThrow(/no flat top face/);
    kernel.release(solid);
  });

  function surfaceTypes(shape: ShapeHandle) {
    const faces = kernel.getSubShapes(shape, "face");
    const types = faces.map((face) => kernel.surfaceType(face));
    faces.forEach((face) => kernel.release(face));
    return types;
  }

  // An L-shaped tray: one concave vertical edge, where the inner walls move
  // apart when they grow inward.
  function lShape() {
    return yUp(kernel.unifySameDomain(kernel.fuse(kernel.makeBox(40, 20, 20), kernel.makeBox(20, 40, 20))));
  }

  it("rounds the inner wall at a concave edge by default", () => {
    const solid = lShape();
    const result = shellSolid(kernel, solid, 3, "top");
    expect(surfaceTypes(result)).toContain("cylinder");
    kernel.release(result);
    kernel.release(solid);
  });

  it("keeps the inner wall sharp with sharp edges", () => {
    const solid = lShape();
    const round = shellSolid(kernel, solid, 3, "top", "round");
    const sharp = shellSolid(kernel, solid, 3, "top", "sharp");
    expect(kernel.isValid(sharp)).toBe(true);
    expect(surfaceTypes(sharp).every((type) => type === "plane")).toBe(true);
    // At the inner corner the sharp cavity stops at a 3 x 3 square, the
    // rounded one at a quarter circle of radius 3 - over the 17 mm cavity
    // height the sharp body keeps that difference as extra wall.
    const extraWall = (3 * 3 - (Math.PI * 3 * 3) / 4) * 17;
    expect(kernel.getVolume(sharp) - kernel.getVolume(round)).toBeCloseTo(extraWall, 1);
    const bounds = kernel.getBoundingBox(sharp, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(40, 4);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(20, 4);
    kernel.release(round);
    kernel.release(sharp);
    kernel.release(solid);
  });

  it("hollows a closed body with an inner corner, rounded or sharp", () => {
    // The inward offset of such a body comes back as a shell, not a solid.
    const solid = lShape();
    const round = shellSolid(kernel, solid, 3, "none", "round");
    const sharp = shellSolid(kernel, solid, 3, "none", "sharp");
    expect(kernel.isValid(round)).toBe(true);
    expect(kernel.isValid(sharp)).toBe(true);
    expect(surfaceTypes(sharp).every((type) => type === "plane")).toBe(true);
    // Closed on top and bottom, the cavity is 14 mm high.
    const extraWall = (3 * 3 - (Math.PI * 3 * 3) / 4) * 14;
    expect(kernel.getVolume(sharp) - kernel.getVolume(round)).toBeCloseTo(extraWall, 1);
    kernel.release(round);
    kernel.release(sharp);
    kernel.release(solid);
  });

  it("refuses walls too thick for the body", () => {
    const solid = box();
    // Two 16 mm walls do not fit into the 30 mm depth.
    expect(() => shellSolid(kernel, solid, 16, "top")).toThrow(/thinner wall/);
    kernel.release(solid);
  });

  it("builds sharp inner corners when the rounded ones cannot be built (forum 618422)", () => {
    // A traced outline of many short pieces defeated the arc joins at every wall thickness while sharp
    // joins worked; a kernel whose arc joins always fail stands in for it.
    const arcsFail = new Proxy(kernel, {
      get(target, property) {
        if (property === "shell") {
          return (solid: ShapeHandle, faces: ShapeHandle[], wall: number, tolerance: number, join: JoinType) => {
            if (join === JoinType.Arc) throw new Error("the arc joins failed");
            return target.shell(solid, faces, wall, tolerance, join);
          };
        }
        const value = Reflect.get(target, property) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const solid = box();
    const result = shellSolid(arcsFail, solid, 2, "top", "round");
    expectHollow(result, 40 * 30 * 20 - 36 * 26 * 18);
    kernel.release(result);
    kernel.release(solid);
  });

  it("takes sliver faces out of the body before hollowing it (forum 618422)", () => {
    // A box 40 x 20 x 30 whose top is cut into a big face and a strip 0.005 mm wide, as a mesh
    // that overlapped a little leaves it.
    const quad = (points: Array<[number, number, number]>) =>
      kernel.makeFace(kernel.makeWire(points.map((from, index) => {
        const to = points[(index + 1) % points.length];
        return kernel.makeLineEdge({ x: from[0], y: from[1], z: from[2] }, { x: to[0], y: to[1], z: to[2] });
      })));
    const strip = 29.995;
    const faces = [
      quad([[0, 0, 0], [40, 0, 0], [40, 0, 30], [0, 0, 30]]),
      quad([[0, 20, 0], [40, 20, 0], [40, 20, strip], [0, 20, strip]]),
      quad([[0, 20, strip], [40, 20, strip], [40, 20, 30], [0, 20, 30]]),
      quad([[0, 0, 0], [40, 0, 0], [40, 20, 0], [0, 20, 0]]),
      quad([[0, 0, 30], [40, 0, 30], [40, 20, 30], [0, 20, 30]]),
      quad([[0, 0, 0], [0, 0, 30], [0, 20, 30], [0, 20, strip], [0, 20, 0]]),
      quad([[40, 0, 0], [40, 0, 30], [40, 20, 30], [40, 20, strip], [40, 20, 0]]),
    ];
    const body = kernel.fixFaceOrientations(kernel.sewAndSolidify(faces, 1e-6));
    expect(kernel.isSolid(body)).toBe(true);
    expect(kernel.getSubShapes(body, "face")).toHaveLength(7);

    let cleaned = 0;
    const watching = new Proxy(kernel, {
      get(target, property) {
        if (property === "defeature") {
          return (shape: ShapeHandle, remove: ShapeHandle[], tolerance: number) => {
            cleaned += remove.length;
            return target.defeature(shape, remove, tolerance);
          };
        }
        const value = Reflect.get(target, property) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const result = shellSolid(watching, body, 2, "top");
    expect(cleaned).toBe(1);
    expect(kernel.isValid(result)).toBe(true);
    expect(kernel.getVolume(result)).toBeCloseTo(40 * 20 * 30 - 36 * 18 * 26, 1);
    kernel.release(result);
    kernel.release(body);
  });

  it("does not blame the wall when the body cannot be hollowed at all (forum 618422)", () => {
    // Two boxes that touch along one edge only: no solid the kernel can shell, whatever the wall.
    const joined = kernel.fuse(kernel.makeBox(20, 20, 20), kernel.translate(kernel.makeBox(20, 20, 20), 20, 20, 0));
    for (const wall of [0.2, 1]) {
      expect(() => shellSolid(kernel, joined, wall, "top")).toThrow(/cannot be hollowed with any wall thickness/);
      expect(() => shellSolid(kernel, joined, wall, "top")).not.toThrow(/thinner wall/);
    }
    kernel.release(joined);
  });

  // #302: a block 20 x 10 x 20 with a pocket 10 x 10 and 5 deep from the top. The top face is a ring
  // round the pocket; the kernel's thick solid cannot leave a face like that open, so the body is
  // grown over it and hollowed from its inward offset.
  function blockWithPocket(depthOfPocket: number) {
    const block = yUp(kernel.makeBox(20, 20, 10));
    const pocket = yUp(kernel.translate(kernel.makeBox(10, 10, 10), 5, 5, 10 - depthOfPocket));
    const cut = kernel.cut(block, pocket);
    kernel.release(block);
    kernel.release(pocket);
    return cut;
  }

  it("leaves the top open on a block with a blind pocket (#302)", () => {
    const body = blockWithPocket(5);
    const result = shellSolid(kernel, body, 1.5, "top", "sharp");
    expect(kernel.isValid(result)).toBe(true);
    // The cavity: a ring 17 x 17 minus 13 x 13 up to the open top (8.5 high), and 13 x 13 under the pocket (2 high).
    const cavity = (17 * 17 - 13 * 13) * 8.5 + 13 * 13 * 2;
    expect(kernel.getVolume(result)).toBeCloseTo(20 * 20 * 10 - 10 * 10 * 5 - cavity, 3);
    const bounds = kernel.getBoundingBox(result, false);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(10, 4);
    kernel.release(result);
    kernel.release(body);
  });

  it("hollows a block with a pocket from any side it can be opened on, and through a hole", () => {
    const body = blockWithPocket(5);
    for (const openings of ["bottom", "top-bottom", "none"] as const) {
      const result = shellSolid(kernel, body, 1, openings);
      expect(kernel.isValid(result)).toBe(true);
      expect(kernel.getVolume(result)).toBeGreaterThan(0);
      expect(kernel.getVolume(result)).toBeLessThan(kernel.getVolume(body));
      kernel.release(result);
    }
    kernel.release(body);
    // A pocket right through the block: a square tube, open at the top.
    const tube = blockWithPocket(10);
    const result = shellSolid(kernel, tube, 1.5, "top");
    expect(kernel.isValid(result)).toBe(true);
    expect(kernel.getVolume(result)).toBeLessThan(kernel.getVolume(tube));
    kernel.release(result);
    kernel.release(tube);
  });

  it("hollows a prism whose outline of short pieces runs into a sharp corner (Making Layers, mail 08.11.2026)", () => {
    // A box with an oval of 156 straight pieces on its end, the oval cut off where the box's side runs on: the cut
    // makes a sharp corner among pieces 0.7 mm long. From a 1.5 mm wall on, the thick solid lost faces there and
    // handed the body back untouched; the reporter's STL failed the same way at 2 mm. The editor rebuilds such an STL
    // with arcs first (exactSolidFromMesh), and on that body the thick solid did not come back at all.
    const segments = 156;
    const oval = Array.from({ length: segments }, (_, index) => {
      const angle = (2 * Math.PI * index) / segments;
      return { x: 22 + 18.18 * Math.cos(angle), y: 78.5 + 23.75 * Math.sin(angle), z: 0 };
    });
    const ovalPrism = kernel.extrude(kernel.makeFace(kernel.makeWire(oval.map((point, index) => kernel.makeLineEdge(point, oval[(index + 1) % segments])))), 0, 0, 50);
    const block = kernel.makeBoxFromCorners({ x: -1, y: 0, z: 0 }, { x: 32.8, y: 71.25, z: 50 });
    const keep = kernel.makeBoxFromCorners({ x: -10, y: -10, z: -1 }, { x: 32.8, y: 120, z: 51 });
    const solids = kernel.getSubShapes(kernel.unifySameDomain(kernel.common(kernel.fuse(block, ovalPrism), keep)), "solid");
    expect(solids).toHaveLength(1);
    const pieces = yUp(solids[0]);
    const mesh = kernel.meshShape(pieces, { linearDeflection: 0.01, angularDeflection: 0.5 });
    const rebuilt = exactSolidFromMesh(kernel, mesh.positions, mesh.indices, { budgetMs: 6000 });
    expect(rebuilt).not.toBeNull();
    expect(rebuilt!.report.cylinder).toBeGreaterThan(0);
    for (const [label, body] of [["straight pieces", pieces], ["rebuilt with arcs", rebuilt!.solid]] as const) {
      const volume = kernel.getVolume(body);
      for (const [openings, edges] of [["top", "round"], ["top", "sharp"], ["top-bottom", "round"], ["none", "round"]] as const) {
        const result = shellSolid(kernel, body, 2, openings, edges);
        const name = `${label}, ${openings} ${edges}`;
        expect(kernel.isValid(result), name).toBe(true);
        // A 2 mm wall round about 280 mm of outline, 50 mm high, and a floor or lid where they stay: a fifth to a
        // quarter of the body, by far not all of it.
        expect(kernel.getVolume(result), name).toBeGreaterThan(volume * 0.12);
        expect(kernel.getVolume(result), name).toBeLessThan(volume * 0.3);
        // The outside stays where it was (an outline of arcs is sampled within 0.01 mm where it must be).
        const bounds = kernel.getBoundingBox(result, false);
        const before = kernel.getBoundingBox(body, false);
        expect(bounds.xmax - bounds.xmin, name).toBeCloseTo(before.xmax - before.xmin, 1);
        expect(bounds.ymax - bounds.ymin, name).toBeCloseTo(before.ymax - before.ymin, 3);
        expect(bounds.zmax - bounds.zmin, name).toBeCloseTo(before.zmax - before.zmin, 1);
        kernel.release(result);
      }
      // Too thick a wall is still refused as such.
      expect(() => shellSolid(kernel, body, 17, "top"), label).toThrow(/thinner wall/);
    }
    kernel.release(rebuilt!.solid);
    kernel.release(pieces);
  });

  // #1521: a box rounded by 1 mm with 2 mm walls. The cavity's roundings would shrink below nothing;
  // the kernel's offset came back turned inside out or in loose pieces. Inside such a wall the box
  // is hollowed as if its edges were sharp, and the outside keeps its roundings.
  it("hollows a box whose rounded edges are thinner than the wall, closed and open at the bottom", () => {
    const box = kernel.makeBox(160, 50, 185);
    const rounded = kernel.fillet(box, kernel.getSubShapes(box, "edge"), 1);
    const outside = kernel.getVolume(rounded);
    const closed = shellSolid(kernel, rounded, 2, "none");
    expect(kernel.isValid(closed)).toBe(true);
    expect(kernel.getVolume(closed)).toBeCloseTo(outside - 156 * 46 * 181, 0);
    const open = shellSolid(kernel, rounded, 2, "bottom");
    expect(kernel.isValid(open)).toBe(true);
    expect(kernel.subShapeCount(open, "shell")).toBe(1);
    expect(kernel.getVolume(open)).toBeCloseTo(outside - 156 * 48 * 181, 0);
    [open, closed, rounded, box].forEach((handle) => kernel.release(handle));
  });

  it("hollows the enclosure from the report, with its groove and notch, open at the bottom", () => {
    const box = kernel.makeBox(160, 50, 185);
    const rounded = kernel.fillet(box, kernel.getSubShapes(box, "edge"), 1);
    const groove = kernel.makeBoxFromCorners({ x: 60, y: 42, z: -1 }, { x: 100, y: 51, z: 186 });
    const notch = kernel.makeBoxFromCorners({ x: 60, y: 22.5, z: 158 }, { x: 100, y: 51, z: 186 });
    const grooved = kernel.cut(rounded, groove);
    const body = kernel.cut(grooved, notch);
    const open = shellSolid(kernel, body, 2, "bottom");
    expect(kernel.isValid(open)).toBe(true);
    expect(kernel.subShapeCount(open, "solid")).toBe(1);
    expect(kernel.getVolume(open)).toBeLessThan(kernel.getVolume(body) * 0.2);
    [open, body, grooved, notch, groove, rounded, box].forEach((handle) => kernel.release(handle));
  });
});
