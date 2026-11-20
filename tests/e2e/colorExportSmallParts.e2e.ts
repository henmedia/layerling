import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { closedMeshVolume } from "@/lib/cadProfileExtrusion";
import { colorSeparatedExportMeshes, exportBodiesWithLooseHoles, groupedShape, unionOverlappingExportMeshes, visibleExportShapes } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/**
 * Small parts of a design in the colour-separated export (Issue #1781: "parts like teeth are missing" from the 3MF,
 * while two STLs of the same design had them all). Colours are bodies of their own in a 3MF, and a later body of
 * another colour cuts its place out of an earlier one (Discussion #79); what such a cut or a merge leaves behind as
 * tiny loose pieces is left out (#352). A group of small parts is one body of several loose pieces, so the teeth
 * of a face, each left with a few tenths of a cubic millimetre outside the head, went as splinters of the cut. They
 * are parts someone drew and stay, as they do when they are not grouped.
 */
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));
beforeAll(async () => {
  kernel.runtime = manifoldModule().then((runtime) => { runtime.setup(); rememberManifoldRuntime(runtime); return runtime; });
  await kernel.runtime;
});

const WHITE = "#ffffff";
const RED = "#d41721";
const box = (id: string, color: string, x: number, z: number, elevation: number, width: number, height: number, depth: number): WorkplaneShape => (
  { id, name: id, kind: "box", color, x, z, elevation, rotation: 0, width, depth, size: Math.max(width, depth), height, locked: false, hidden: false } as WorkplaneShape
);
const group = (name: string, parts: WorkplaneShape[]) => ({ ...groupedShape(parts)!, name }) as WorkplaneShape;

/** A head of 30 x 20 x 30 mm; its front face stands at z = 15. */
const head = () => box("head", RED, 0, 0, 0, 30, 20, 30);
/** An eye of 4 mm that stands 1 mm out of the front of the head. */
const eye = (index: number, x: number) => box(`eye-${index}`, WHITE, x, 14, 12, 4, 4, 4);
/** A tooth of 1 mm that stands `out` mm out of the front of the head. */
const tooth = (index: number, out: number) => box(`tooth-${index}`, WHITE, -4.5 + index * 3, 14.5 + out, 4, 1, 1, 1);
const TEETH = [0, 1, 2, 3];

/** Corners at the same place are one corner; the loose pieces are what the faces join. */
function loosePieces(mesh: { vertices: [number, number, number][]; faces: [number, number, number][] }) {
  const keyOf = (vertex: [number, number, number]) => vertex.map((value) => Math.round(value * 1000)).join(",");
  const parent = new Map<string, string>();
  const find = (key: string) => {
    let node = key;
    while (parent.get(node) !== node) node = parent.get(node)!;
    return node;
  };
  mesh.vertices.forEach((vertex) => parent.set(keyOf(vertex), keyOf(vertex)));
  mesh.faces.forEach(([a, b, c]) => {
    const root = find(keyOf(mesh.vertices[a]));
    parent.set(find(keyOf(mesh.vertices[b])), root);
    parent.set(find(keyOf(mesh.vertices[c])), root);
  });
  return new Set(mesh.vertices.map((vertex) => find(keyOf(vertex)))).size;
}

/** What a 3MF holds of these shapes: per body its name, its loose pieces and what it holds, and the pieces left out. */
async function threeMfBodies(shapes: WorkplaneShape[]) {
  const { visible } = visibleExportShapes(shapes);
  const { solids, meshes, cut } = await exportBodiesWithLooseHoles(visible, { painted: true });
  const separated = await colorSeparatedExportMeshes(solids, meshes, cut);
  return {
    splinters: separated.splinters,
    bodies: separated.meshes.map((mesh, index) => ({ name: solids[separated.quellen[index]].name, pieces: loosePieces(mesh), volume: Math.abs(closedMeshVolume(mesh.vertices, mesh.faces)) })),
  };
}

describe("small parts in the colour-separated export (Issue #1781)", () => {
  it("keeps every tooth of a group that a later head of another colour cuts", async () => {
    const details = group("details", [eye(0, -6), eye(1, 6), ...TEETH.map((index) => tooth(index, 0.3))]);
    const { bodies, splinters } = await threeMfBodies([details, head()]);
    expect(splinters).toBe(0);
    const written = bodies.find((body) => body.name === "details")!;
    // Two eyes and four teeth, each with what stands out of the head: 2 x 4 x 4 x 1 and 4 x 1 x 1 x 0.3 mm3.
    expect(written.pieces).toBe(6);
    expect(written.volume).toBeCloseTo(2 * 16 + 4 * 0.3, 3);
    expect(bodies.find((body) => body.name === "head")!.volume).toBeCloseTo(30 * 20 * 30, 3);
  });

  it("writes the grouped teeth as it writes them one by one", async () => {
    const apart = await threeMfBodies([...TEETH.map((index) => tooth(index, 0.3)), head()]);
    const grouped = await threeMfBodies([group("teeth", TEETH.map((index) => tooth(index, 0.3))), head()]);
    const teethApart = apart.bodies.filter((body) => body.name.startsWith("tooth"));
    expect(teethApart).toHaveLength(4);
    const teethGrouped = grouped.bodies.find((body) => body.name === "teeth")!;
    expect(teethGrouped.pieces).toBe(4);
    expect(teethGrouped.volume).toBeCloseTo(teethApart.reduce((sum, body) => sum + body.volume, 0), 3);
    expect(grouped.splinters).toBe(0);
  });

  it("holds the same teeth as an STL of the group alone", async () => {
    const details = group("details", TEETH.map((index) => tooth(index, 0.3)));
    const { solids, meshes, cut } = await exportBodiesWithLooseHoles(visibleExportShapes([details]).visible);
    const stl = await unionOverlappingExportMeshes(solids, meshes, cut);
    expect(stl.meshes.reduce((sum, mesh) => sum + loosePieces(mesh), 0)).toBe(4);
    const threeMf = await threeMfBodies([details, head()]);
    expect(threeMf.bodies.find((body) => body.name === "details")!.pieces).toBe(4);
  });

  it("keeps a small part that is only merged with a body of its colour whose box it lies in", async () => {
    // A speck of 0.6 mm between the two eyes of one group, touching neither: the boxes overlap, so the two are joined.
    const eyes = group("eyes", [eye(0, -6), eye(1, 6)]);
    const speck = box("speck", WHITE, 0, 14, 13, 0.6, 0.6, 0.6);
    const { bodies, splinters } = await threeMfBodies([eyes, speck]);
    expect(splinters).toBe(0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].pieces).toBe(3);
    expect(bodies[0].volume).toBeCloseTo(2 * 64 + 0.6 ** 3, 3);
  });

  it("still leaves out the slivers a cut makes of a body drawn in one piece", async () => {
    // A bar through the head: the head, later and of another colour, takes its middle and leaves 0.05 mm at each end.
    const bar = box("bar", WHITE, 0, 0, 4, 30.1, 1, 1);
    // A round stud on top of the head is the piece of the most triangles, which always stays.
    const stud = { ...box("stud", WHITE, 0, 0, 20, 4, 4, 4), kind: "cylinder" } as WorkplaneShape;
    const { bodies, splinters } = await threeMfBodies([group("trim", [bar, stud]), head()]);
    expect(splinters).toBe(2);
    const trim = bodies.find((body) => body.name === "trim")!;
    expect(trim.pieces).toBe(1);
    expect(trim.volume).toBeGreaterThan(49);
    expect(trim.volume).toBeLessThan(51);
  });

  /*
   * The report's own design: a cat's face, its yellow inlay a group of 41 loose pieces - teeth, whisker dots, stripes
   * of fur, 1 mm high. The editor keeps a group as the mesh it worked out for it (sourceFormat "json"), and such a mesh
   * was not asked for its drawn pieces at all, as a cut made earlier may have left splinters in it. So 16 of the 41
   * pieces, each under half a cubic millimetre, still went. They have hundreds of triangles round their outline;
   * what a cut leaves behind has a handful (#352), and only that is not taken for drawn in such a mesh.
   */
  describe("in a group as the editor keeps it, a mesh worked out from its parts", () => {
    type Vec = [number, number, number];
    type Part = { vertices: Vec[]; faces: [number, number, number][] };
    const YELLOW = "#f2cf10";
    const PURPLE = "#9b3bd2";

    /** A standing prism with a regular base, outward facing: a dot of 4n - 4 triangles. */
    function dot(sides: number, radius: number, height: number, x: number, y: number): Part {
      const vertices: Vec[] = [];
      for (let level = 0; level < 2; level += 1) {
        for (let k = 0; k < sides; k += 1) vertices.push([x + radius * Math.cos((k / sides) * 2 * Math.PI), y + level * height, radius * Math.sin((k / sides) * 2 * Math.PI)]);
      }
      const faces: [number, number, number][] = [];
      for (let k = 1; k < sides - 1; k += 1) faces.push([0, k + 1, k], [sides, sides + k, sides + k + 1]);
      for (let k = 0; k < sides; k += 1) {
        const next = (k + 1) % sides;
        faces.push([k, next, sides + next], [k, sides + next, sides + k]);
      }
      return { vertices, faces };
    }

    /** A bar of 20 x 6 x 10 mm from x = 10 to 30, 2 mm above the plate, as twelve triangles. */
    const bar = (): Part => {
      const [x0, y0, z0, x1, y1, z1] = [10, 2, -5, 30, 8, 5];
      const vertices: Vec[] = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      const faces: [number, number, number][] = [];
      for (const [a, b, c, d] of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [3, 0, 4, 7]]) faces.push([a, b, c], [a, c, d]);
      return { vertices, faces };
    };

    /** These pieces as one body the way a group is kept: its mesh, worked out by layerling, and no parts to build it from. */
    function keptGroup(name: string, color: string, parts: Part[]): WorkplaneShape {
      const corners = parts.flatMap((part) => part.vertices);
      const min = [0, 1, 2].map((axis) => Math.min(...corners.map((corner) => corner[axis])));
      const max = [0, 1, 2].map((axis) => Math.max(...corners.map((corner) => corner[axis])));
      const [width, height, depth] = [0, 1, 2].map((axis) => max[axis] - min[axis]);
      const centerX = (min[0] + max[0]) / 2;
      const centerZ = (min[2] + max[2]) / 2;
      const positions: number[] = [];
      parts.forEach((part) => part.faces.forEach((face) => face.forEach((index) => {
        const [x, y, z] = part.vertices[index];
        positions.push(x - centerX, y - min[1], z - centerZ);
      })));
      return {
        id: name, name, kind: "mesh", color, x: centerX, z: centerZ, elevation: min[1], rotation: 0, width, depth, height, size: Math.max(width, depth), locked: false, hidden: false,
        importedMesh: { positions, baseWidth: width, baseDepth: depth, baseHeight: height, triangleCount: positions.length / 9, sourceFormat: "json" },
      } as WorkplaneShape;
    }

    // The face, 40 x 10 x 40 mm round the middle, comes later and takes the half of the bar that lies in it.
    const face = () => box("face", PURPLE, 0, 0, 0, 40, 10, 40);
    // Three whisker dots of 0.3 mm beside the bar that the face does not reach: 60 triangles and 0.07 mm3 each.
    const dots = () => [32, 33, 34].map((x) => dot(16, 0.15, 1, x, 9));

    it("keeps the dots of the group when another colour cuts it", async () => {
      const { bodies, splinters } = await threeMfBodies([keptGroup("inlay", YELLOW, [bar(), ...dots()]), face()]);
      expect(splinters).toBe(0);
      const inlay = bodies.find((body) => body.name === "inlay")!;
      expect(inlay.pieces).toBe(4);
      const one = dot(16, 0.15, 1, 0, 0);
      expect(inlay.volume).toBeCloseTo(10 * 6 * 10 + 3 * Math.abs(closedMeshVolume(one.vertices, one.faces)), 2);
    });

    it("still leaves out a grain of a few triangles that an earlier cut left in the group", async () => {
      // A closed grain of four triangles and 0.036 mm3 beside the dots: what #352 was about, already in the group's mesh.
      const grain: Part = { vertices: [[36, 9, 0], [36.6, 9, 0], [36, 9.6, 0], [36, 9, 0.6]], faces: [[0, 2, 1], [0, 1, 3], [1, 2, 3], [0, 3, 2]] };
      const { bodies, splinters } = await threeMfBodies([keptGroup("inlay", YELLOW, [bar(), ...dots(), grain]), face()]);
      expect(splinters).toBe(1);
      expect(bodies.find((body) => body.name === "inlay")!.pieces).toBe(4);
    });
  });
});
