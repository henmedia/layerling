import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { cadFaceList, cadFaceTessellation, DELETE_FACES_UNCHANGED_MESSAGE, deleteFacesSolid } from "@/lib/cadDeleteFaces";
import { exactSolidFromMesh } from "@/lib/cadMeshExact";
import { cadFaceWall } from "@/lib/cadFaceWall";
import { isThinFace, thinFacesWith } from "@/lib/cadThinFaces";

/*
 * Deleting faces of an exact body (#451): the faces around them grow to close
 * the gap, and the body stays one valid solid with the volume it had before
 * the feature was added. Where the gap cannot be closed the kernel hands the
 * body back unchanged without a word, which has to become a plain refusal.
 */

let cad: OcctKernel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
});

const box = () => cad.makeBox(40, 30, 20);
const facesWhere = (shape: ShapeHandle, test: (box: { xmin: number; xmax: number; ymin: number; ymax: number; zmin: number; zmax: number }, face: ShapeHandle) => boolean) =>
  cad.getSubShapes(shape, "face").filter((face) => test(cad.getBoundingBox(face), face));

describe("deleting faces of an exact body", () => {
  it("takes the fillets off the top edges of a box", () => {
    const b = box();
    const filleted = cad.fillet(b, cad.getSubShapes(b, "edge").filter((edge) => cad.getBoundingBox(edge).zmin > 19.99), 3);
    expect(cad.getVolume(filleted)).toBeCloseTo(23740, 0);
    const fillets = facesWhere(filleted, (_, face) => cad.surfaceType(face) !== "plane");
    expect(fillets).toHaveLength(4);
    const result = deleteFacesSolid(cad, filleted, fillets);
    expect(cad.isValid(result)).toBe(true);
    expect(cad.getVolume(result)).toBeCloseTo(24000, 3);
    expect(cad.getSubShapes(result, "face")).toHaveLength(6);
  });

  it("fills a hole, takes a boss off and a lower box joined at the side", () => {
    const hole = cad.cut(box(), cad.translate(cad.makeCylinder(5, 40), 20, 15, -10));
    expect(cad.getVolume(deleteFacesSolid(cad, hole, facesWhere(hole, (_, face) => cad.surfaceType(face) === "cylinder")))).toBeCloseTo(24000, 3);

    const boss = cad.fuse(box(), cad.translate(cad.makeCylinder(6, 10), 20, 15, 20));
    const bossFaces = facesWhere(boss, (bb, face) => (bb.zmin > 19.99 && cad.surfaceType(face) !== "plane") || bb.zmin > 29.99);
    expect(bossFaces).toHaveLength(2);
    expect(cad.getVolume(deleteFacesSolid(cad, boss, bossFaces))).toBeCloseTo(24000, 3);

    const stepped = cad.fuse(box(), cad.translate(cad.makeBox(20, 30, 8), 40, 0, 0));
    // The lower box's own five faces, not the main box's wall above it at x = 40.
    const lower = facesWhere(stepped, (bb) => bb.xmin > 39.99 && bb.xmax > 40.01);
    expect(lower).toHaveLength(5);
    expect(cad.getVolume(deleteFacesSolid(cad, stepped, lower))).toBeCloseTo(24000, 3);
  });

  it("refuses with a plain sentence where the gap cannot be closed, or a face too many is picked", () => {
    const b = box();
    expect(() => deleteFacesSolid(cad, b, facesWhere(b, (bb) => bb.xmax < 0.01))).toThrow(DELETE_FACES_UNCHANGED_MESSAGE);
    const stepped = cad.fuse(box(), cad.translate(cad.makeBox(20, 30, 8), 40, 0, 0));
    // The lower box plus the main box's wall above it: the kernel changes nothing.
    expect(() => deleteFacesSolid(cad, stepped, facesWhere(stepped, (bb) => bb.xmin > 39.99))).toThrow(DELETE_FACES_UNCHANGED_MESSAGE);

  });

  it("refuses when the kernel removes only part of what was picked", () => {
    // A hole and a plain side: the kernel fills the hole and builds the side again where it was.
    const hole = cad.cut(box(), cad.translate(cad.makeCylinder(5, 40), 20, 15, -10));
    const holeAndSide = facesWhere(hole, (bb, face) => cad.surfaceType(face) === "cylinder" || bb.xmax < 0.01);
    expect(holeAndSide).toHaveLength(2);
    expect(() => deleteFacesSolid(cad, hole, holeAndSide)).toThrow(DELETE_FACES_UNCHANGED_MESSAGE);
    // A hole and one face too many for the lower box: the kernel fills the hole and keeps the box.
    const stepped = cad.cut(cad.fuse(box(), cad.translate(cad.makeBox(20, 30, 8), 40, 0, 0)), cad.translate(cad.makeCylinder(5, 40), 20, 15, -10));
    const steppedSolid = cad.isSolid(stepped) ? stepped : cad.getSubShapes(stepped, "solid")[0];
    const holeAndTooMany = facesWhere(steppedSolid, (bb, face) => cad.surfaceType(face) === "cylinder" || bb.xmin > 39.99);
    expect(() => deleteFacesSolid(cad, steppedSolid, holeAndTooMany)).toThrow(DELETE_FACES_UNCHANGED_MESSAGE);
  });

  it("refuses a result the kernel's own check calls invalid", () => {
    const hole = cad.cut(box(), cad.translate(cad.makeCylinder(5, 40), 20, 15, -10));
    const wall = facesWhere(hole, (_, face) => cad.surfaceType(face) === "cylinder");
    // A real imported part (a planter from Fusion 360) makes defeature return invalid solids for two of its faces;
    // without that file the check is held to it this way.
    const isValid = vi.spyOn(cad, "isValid").mockReturnValue(false);
    try {
      expect(() => deleteFacesSolid(cad, hole, wall)).toThrow(DELETE_FACES_UNCHANGED_MESSAGE);
    } finally {
      isValid.mockRestore();
    }
    expect(cad.getVolume(deleteFacesSolid(cad, hole, wall))).toBeCloseTo(24000, 3);
  });

  it("fills the bore of a spool whose hub has the same kind, area and middle", () => {
    // Bore r2 over 10 mm and hub r4 over 5 mm: both cylinders of 40π mm² around the same middle.
    const flange = (z: number) => cad.translate(cad.makeCylinder(8, 2.5), 0, 0, z);
    const spool = cad.fuse(cad.fuse(flange(-5), flange(2.5)), cad.translate(cad.makeCylinder(4, 5), 0, 0, -2.5));
    const bored = cad.cut(spool, cad.translate(cad.makeCylinder(2, 20), 0, 0, -10));
    const body = cad.isSolid(bored) ? bored : cad.getSubShapes(bored, "solid")[0];
    const bore = facesWhere(body, (bb, face) => cad.surfaceType(face) === "cylinder" && bb.xmax < 2.01);
    expect(bore).toHaveLength(1);
    expect(cad.getVolume(deleteFacesSolid(cad, body, bore))).toBeCloseTo(Math.PI * (64 * 5 + 16 * 5), 3);
  });

  it("turns a pocket into a hole straight through when only its floor is deleted", () => {
    const pocket = cad.cut(box(), cad.translate(cad.makeBox(10, 10, 12), 15, 10, 8));
    expect(cad.getVolume(pocket)).toBeCloseTo(22800, 3);
    const floor = facesWhere(pocket, (bb) => Math.abs(bb.zmin - 8) < 1e-6 && Math.abs(bb.zmax - 8) < 1e-6);
    expect(floor).toHaveLength(1);
    expect(cad.getVolume(deleteFacesSolid(cad, pocket, floor))).toBeCloseTo(22000, 3);
  });

  it("leaves a body the edge tool can still fillet", () => {
    const hole = cad.cut(box(), cad.translate(cad.makeCylinder(5, 40), 20, 15, -10));
    const result = deleteFacesSolid(cad, hole, facesWhere(hole, (_, face) => cad.surfaceType(face) === "cylinder"));
    const rounded = cad.fillet(result, cad.getSubShapes(result, "edge").filter((edge) => cad.getBoundingBox(edge).zmin > 19.99), 2);
    expect(cad.isValid(rounded)).toBe(true);
    expect(cad.getVolume(rounded)).toBeLessThan(24000);
  });

  it("exports to STEP with its true faces", () => {
    const hole = cad.cut(box(), cad.translate(cad.makeCylinder(5, 40), 20, 15, -10));
    const result = deleteFacesSolid(cad, hole, facesWhere(hole, (_, face) => cad.surfaceType(face) === "cylinder"));
    const back = cad.importStep(cad.exportStep(result));
    expect(cad.getVolume(back)).toBeCloseTo(24000, 3);
    expect(cad.getSubShapes(back, "face").map((face) => cad.surfaceType(face))).toEqual(Array(6).fill("plane"));
  });

  it("lists the faces with their kind, area and middle, planes with their normal", () => {
    const hole = cad.cut(box(), cad.translate(cad.makeCylinder(5, 40), 20, 15, -10));
    const faces = cadFaceList(cad, hole);
    expect(faces).toHaveLength(7);
    const cylinder = faces.find((face) => face.kind === "cylinder")!;
    expect(cylinder.area).toBeCloseTo(Math.PI * 10 * 20, 0);
    expect(cylinder.normal).toBeUndefined();
    const top = faces.find((face) => face.kind === "plane" && face.center.z > 19.99)!;
    expect(top.normal).toEqual({ x: 0, y: 0, z: 1 });
    expect(top.area).toBeCloseTo(1200 - Math.PI * 25, 3);
    expect(faces.map((face) => face.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("measures a face's width as twice its area over its perimeter, and lists the faces it shares an edge with", () => {
    const top = cadFaceList(cad, cad.makeBox(10, 20, 5)).find((face) => Math.abs(face.area - 200) < 1e-6)!;
    expect(top.width).toBeCloseTo((2 * 200) / 60, 9);
    expect(top.neighbours).toHaveLength(4);
    // A pyramid's opposite sides meet only at the tip: they share no edge, so they are not neighbours.
    const corners = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]];
    const tip = [5, 5, 8];
    const triangles = [[0, 2, 1], [0, 3, 2]].map((k) => k.map((i) => corners[i])).concat(corners.map((corner, k) => [corner, corners[(k + 1) % 4], tip]));
    const pyramid = exactSolidFromMesh(cad, new Float32Array(triangles.flat(2)));
    if (!pyramid) throw new Error("not made exact");
    const faces = cadFaceList(cad, pyramid.solid);
    expect(faces).toHaveLength(5);
    expect(faces.map((face) => face.neighbours.length).sort()).toEqual([3, 3, 3, 3, 4]);
  });

  it("knows the face of every triangle it draws, a curved face as one piece", () => {
    const b = box();
    const filleted = cad.fillet(b, cad.getSubShapes(b, "edge").filter((edge) => cad.getBoundingBox(edge).zmin > 19.99), 3);
    const kinds = cadFaceList(cad, filleted).map((face) => face.kind);
    const { indices, triangleFaces } = cadFaceTessellation(cad, filleted, { linearDeflection: 0.1, angularDeflection: 0.3 });
    expect(triangleFaces).toHaveLength(indices.length / 3);
    expect([...triangleFaces].every((face) => face >= 0)).toBe(true);
    expect(new Set(triangleFaces).size).toBe(kinds.length);
    // The top is one flat face of two triangles; each fillet is many triangles of one face.
    const perFace = kinds.map((_, id) => [...triangleFaces].filter((face) => face === id).length);
    kinds.forEach((kind, id) => {
      if (kind !== "plane") expect(perFace[id]).toBeGreaterThan(10);
    });
  });

  it("names for every triangle the face it lies on", () => {
    const b = box();
    const filleted = cad.fillet(b, cad.getSubShapes(b, "edge").filter((edge) => cad.getBoundingBox(edge).zmin > 19.99), 3);
    const faces = cad.getSubShapes(filleted, "face");
    const bounds = faces.map((face) => cad.getBoundingBox(face));
    const { positions, indices, triangleFaces } = cadFaceTessellation(cad, filleted, { linearDeflection: 0.1, angularDeflection: 0.3 });
    // The middle of each triangle lies inside the box of its own face, and the faces of this body are told apart by their boxes.
    for (let triangle = 0; triangle < triangleFaces.length; triangle += 1) {
      const middle = [0, 1, 2].map((axis) => [0, 1, 2].reduce((sum, corner) => sum + positions[indices[triangle * 3 + corner] * 3 + axis], 0) / 3);
      const own = bounds[triangleFaces[triangle]];
      expect(middle[0] >= own.xmin - 1e-3 && middle[0] <= own.xmax + 1e-3 && middle[1] >= own.ymin - 1e-3 && middle[1] <= own.ymax + 1e-3 && middle[2] >= own.zmin - 1e-3 && middle[2] <= own.zmax + 1e-3).toBe(true);
    }
  });
});

/*
 * Hair-thin faces taken along (#451). An STL with bad triangles comes out of
 * Make exact with them as faces: a block with a corner cut off at 45 degrees
 * whose slanted side is three strips, the middle one 0.0015 mm out of the
 * plane, with slivers 0.002 mm wide between them. The strips cannot be
 * deleted without the slivers, and nobody can click those.
 */
describe("deleting faces of a mesh made exact", () => {
  const cut = 12 * Math.SQRT2;
  // Along the slanted side from (48, 0) to (60, 12): strip, sliver, strip, sliver, strip, each point moved off the plane by its offset.
  // The middle and far strips lean 0.00002 mm at their start: with them quite flat the kernel deletes the strips alone.
  const along = [0, 5, 5.002, 10, 10.002, cut];
  const offset = [0, 0, 0.0015 + 2e-5, 0.0015, 2e-5, 0];
  const outline: Array<[number, number]> = [[0, 0], ...along.map((u, k): [number, number] => [48 + (u + offset[k]) * Math.SQRT1_2, (u - offset[k]) * Math.SQRT1_2]), [60, 30], [0, 30]];
  const exactBlock = () => {
    const corners: number[] = [];
    const triangle = (...points: Array<[number, number, number]>) => points.forEach((point) => corners.push(...point));
    outline.forEach(([x, y], k) => {
      const [nx, ny] = outline[(k + 1) % outline.length];
      triangle([x, y, 0], [nx, ny, 0], [nx, ny, 25]);
      triangle([x, y, 0], [nx, ny, 25], [x, y, 25]);
    });
    const [ox, oy] = outline[outline.length - 1];
    for (let k = 0; k + 2 < outline.length; k += 1) {
      const [ax, ay] = outline[k];
      const [bx, by] = outline[k + 1];
      triangle([ox, oy, 0], [bx, by, 0], [ax, ay, 0]);
      triangle([ox, oy, 25], [ax, ay, 25], [bx, by, 25]);
    }
    const exact = exactSolidFromMesh(cad, new Float32Array(corners));
    if (!exact) throw new Error("not made exact");
    return exact.solid;
  };
  const slanted = (list: ReturnType<typeof cadFaceList>) => list.filter((face) => face.normal && Math.abs(face.normal.x - Math.SQRT1_2) < 0.01 && Math.abs(face.normal.y + Math.SQRT1_2) < 0.01);
  const strips = (list: ReturnType<typeof cadFaceList>) => slanted(list).filter((face) => !isThinFace(face)).sort((a, b) => a.area - b.area);

  it("finds the two slivers thin, each between two strips, and takes them along with the smaller strips", () => {
    const list = cadFaceList(cad, exactBlock());
    const thin = list.filter(isThinFace);
    expect(thin).toHaveLength(2);
    const side = strips(list);
    expect(side).toHaveLength(3);
    thin.forEach((sliver) => expect(sliver.neighbours.filter((id) => side.some((strip) => strip.id === id))).toHaveLength(2));
    expect(thinFacesWith([side[0].id, side[1].id], list)).toEqual(thin.map((face) => face.id));
  });

  it("leaves one slanted face when the two smaller strips go with the slivers, and refuses the strips alone", () => {
    const solid = exactBlock();
    const list = cadFaceList(cad, solid);
    const side = strips(list);
    const picked = [side[0].id, side[1].id];
    const faces = cad.getSubShapes(solid, "face");
    expect(() => deleteFacesSolid(cad, solid, picked.map((id) => faces[id]))).toThrow(DELETE_FACES_UNCHANGED_MESSAGE);
    const result = deleteFacesSolid(cad, solid, [...picked, ...thinFacesWith(picked, list)].map((id) => faces[id]));
    expect(cad.isValid(result)).toBe(true);
    const left = slanted(cadFaceList(cad, result));
    expect(left).toHaveLength(1);
    expect(left[0].area).toBeCloseTo(cut * 25, 1);
  });
});

describe("the whole wall at a face (#1797)", () => {
  const bend = (list: ReturnType<typeof cadFaceList>, a: number, b: number) => list[a].bends[list[a].neighbours.indexOf(b)];
  const bored = () => cad.cut(box(), cad.translate(cad.makeCylinder(5, 40), 20, 15, -10));
  const topEdges = (body: ShapeHandle) => cad.getSubShapes(body, "edge").filter((edge) => cad.getBoundingBox(edge).zmin > 19.99);
  const filletedTop = () => {
    const body = box();
    return cad.fillet(body, topEdges(body), 3);
  };
  const prism = (corners: Array<{ x: number; y: number; z: number }>, height: number) =>
    cad.extrude(cad.makeFace(cad.makeWire(corners.map((point, k) => cad.makeLineEdge(point, corners[(k + 1) % corners.length])))), 0, 0, height);
  const inside = (face: ReturnType<typeof cadFaceList>[number]) => face.center.x > 1 && face.center.x < 39 && face.center.y > 1 && face.center.y < 29;

  it("measures how far neighbouring faces turn: a box's edges, a bore's rim, a fillet and a chamfer", () => {
    cadFaceList(cad, box()).forEach((face) => face.bends.forEach((value, k) => expect(value, `face ${face.id} to ${face.neighbours[k]}`).toBeCloseTo(90, 3)));

    const bore = cadFaceList(cad, bored()).find((face) => face.kind === "cylinder")!;
    bore.bends.forEach((value, k) => expect(value, `to face ${bore.neighbours[k]}`).toBeCloseTo(90, 3));

    const filleted = cadFaceList(cad, filletedTop());
    filleted.filter((face) => face.kind !== "plane").forEach((fillet) => fillet.neighbours.forEach((other) => {
      if (filleted[other].kind === "plane") expect(bend(filleted, fillet.id, other), `faces ${fillet.id} and ${other}`).toBeLessThan(0.01);
    }));

    const c = box();
    const chamfered = cadFaceList(cad, cad.chamfer(c, topEdges(c), 3));
    const slopes = chamfered.filter((face) => face.normal && Math.abs(Math.abs(face.normal.z) - Math.SQRT1_2) < 1e-3);
    expect(slopes).toHaveLength(4);
    const lid = chamfered.find((face) => face.normal && face.normal.z > 0.999)!;
    slopes.forEach((slope) => expect(bend(chamfered, slope.id, lid.id), `face ${slope.id}`).toBeCloseTo(45, 3));
  });

  it("finds the sharp turn where a curved face meets a flat one on two edges, one of them shallow", () => {
    // A bar of tilted elliptic section cut flat: its one curved face turns into the flat top by 43.88 and 113.98 degrees (worked out by hand).
    const section = cad.makeEllipseArc({ x: 0, y: 15, z: 18 }, { x: 1, y: 0, z: 0 }, 6, 3, 0, 2 * Math.PI, { x: 0, y: Math.cos(Math.PI / 6), z: Math.sin(Math.PI / 6) });
    const bar = cad.extrude(cad.makeFace(cad.makeWire([section])), 40, 0, 0);
    const list = cadFaceList(cad, cad.cut(bar, cad.translate(cad.makeBox(50, 50, 20), -5, -5, 19)));
    const curved = list.filter((face) => face.kind !== "plane");
    expect(curved).toHaveLength(1);
    const top = list.find((face) => face.normal && face.normal.z > 0.999)!;
    expect(bend(list, curved[0].id, top.id)).toBeCloseTo(113.98, 1);
  });

  it("counts a turn it cannot measure as sharp, and lets a kernel memory fault through", () => {
    const failing = (error: Error) => new Proxy(cad, {
      get: (target, key) => {
        if (key === "curvePointAtParam") return () => { throw error; };
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const body = filletedTop();
    const list = cadFaceList(failing(new Error("no point")), body);
    list.filter((face) => face.kind !== "plane").forEach((fillet) => fillet.bends.forEach((value, k) => expect(value, `to face ${fillet.neighbours[k]}`).toBe(180)));
    expect(() => cadFaceList(failing(new Error("memory access out of bounds")), body)).toThrow("memory access out of bounds");
  });

  it("takes a bore's wall and no more, and from a filleted top the fillets and the sides it runs smoothly into", () => {
    const bore = cadFaceList(cad, bored());
    const wall = bore.filter((face) => face.kind === "cylinder").map((face) => face.id);
    expect(cadFaceWall(wall[0], bore)).toEqual(wall);

    const filleted = cadFaceList(cad, filletedTop());
    const bottom = filleted.find((face) => face.normal && face.normal.z < -0.999)!;
    const top = filleted.find((face) => face.normal && face.normal.z > 0.999)!;
    expect(cadFaceWall(top.id, filleted)).toEqual(filleted.filter((face) => face.id !== bottom.id).map((face) => face.id));
  });

  // A plate with a hole whose wall is 20 flat faces of uneven width, turning 8 to 27 degrees from one to the next, as Simplify leaves a round hole.
  const facetedPlate = () => {
    const corners = Array.from({ length: 20 }, (_, k) => {
      const angle = (2 * Math.PI * (k + 0.05 * Math.sin(k))) / 20;
      const radius = 8 + 0.1 * Math.sin(3 * k);
      return { x: 20 + radius * Math.cos(angle), y: 15 + radius * Math.sin(angle), z: -2 };
    });
    const mesh = cad.meshShape(cad.cut(cad.makeBox(40, 30, 6), prism(corners, 10)));
    const exact = exactSolidFromMesh(cad, mesh.positions, mesh.indices);
    if (!exact) throw new Error("not made exact");
    return exact.solid;
  };

  it("takes every facet of a faceted hole's wall in one go, and Delete fills the hole", () => {
    const solid = facetedPlate();
    const list = cadFaceList(cad, solid);
    // Made exact, the 20 facets stay flat faces.
    const walls = list.filter((face) => !(face.normal && Math.abs(face.normal.z) > 0.999) && inside(face));
    expect(walls.filter((face) => face.kind === "plane")).toHaveLength(20);
    const wall = cadFaceWall(walls[0].id, list);
    expect(wall).toEqual(walls.map((face) => face.id));
    const faces = cad.getSubShapes(solid, "face");
    const result = deleteFacesSolid(cad, solid, wall.map((id) => faces[id]));
    expect(cad.isValid(result)).toBe(true);
    expect(cad.getVolume(result)).toBeCloseTo(40 * 30 * 6, 1);
  });

  const polygonHole = (count: number, turned: number) => {
    const corners = Array.from({ length: count }, (_, k) => ({ x: 20 + 8 * Math.cos(turned + (2 * k * Math.PI) / count), y: 15 + 8 * Math.sin(turned + (2 * k * Math.PI) / count), z: -10 }));
    const list = cadFaceList(cad, cad.cut(box(), prism(corners, 40)));
    const sides = list.filter((face) => face.normal && Math.abs(face.normal.z) < 1e-3 && inside(face));
    expect(sides).toHaveLength(count);
    return { list, sides };
  };

  it("takes a hole in nine even sides whole whichever way it is turned, its sides turning by 40 degrees", () => {
    [0, 0.3, 1.1].forEach((turned) => {
      const { list, sides } = polygonHole(9, turned);
      expect(cadFaceWall(sides[0].id, list), `turned ${turned}`).toEqual(sides.map((side) => side.id));
    });
  });

  it("stops at each side of an octagonal hole, whose sides turn by 45 degrees, whichever way it is turned", () => {
    [0, 0.3, 1.1].forEach((turned) => {
      const { list, sides } = polygonHole(8, turned);
      sides.forEach((side) => expect(cadFaceWall(side.id, list), `turned ${turned}, face ${side.id}`).toEqual([side.id]));
    });
  });

  it("keeps a hole's wall out of a 45-degree chamfer on its rim", () => {
    const cut = bored();
    const body = cad.isSolid(cut) ? cut : cad.getSubShapes(cut, "solid")[0];
    const rim = cad.getSubShapes(body, "edge").filter((edge) => {
      const bounds = cad.getBoundingBox(edge);
      return bounds.zmin > 19.99 && bounds.xmin > 10 && bounds.xmax < 30;
    });
    const list = cadFaceList(cad, cad.chamfer(body, rim, 2));
    const bore = list.filter((face) => face.kind === "cylinder").map((face) => face.id);
    const chamfer = list.find((face) => face.kind === "cone")!;
    expect(cadFaceWall(bore[0], list)).toEqual(bore);
    expect(cadFaceWall(chamfer.id, list)).toEqual([chamfer.id]);
  });

  it("measures the turn along an edge, not at one point: a bore through a slope stops at it wherever the bore's seam lies", () => {
    // A wedge whose top falls at 60 degrees, bored straight down: the bore turns into the slope by 30 to 150 degrees round its rim.
    const profile = [{ x: 0, y: 0, z: 0 }, { x: 40, y: 0, z: 0 }, { x: 40, y: 0, z: 10 }, { x: 0, y: 0, z: 10 + 40 * Math.sqrt(3) }];
    const wedge = cad.extrude(cad.makeFace(cad.makeWire(profile.map((point, k) => cad.makeLineEdge(point, profile[(k + 1) % profile.length])))), 0, 30, 0);
    [0, 0.5, 1, 1.5].forEach((turns) => {
      const drill = cad.translate(cad.rotate(cad.makeCylinder(4, 100), { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } }, turns * Math.PI), 20, 15, -10);
      const list = cadFaceList(cad, cad.cut(wedge, drill));
      const bore = list.filter((face) => face.kind === "cylinder").map((face) => face.id);
      expect(cadFaceWall(bore[0], list), `seam turned ${turns * 180} degrees`).toEqual(bore);
    });
  });
});
