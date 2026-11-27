import { pathToFileURL } from "node:url";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildGroupedShapeFromSelection, buildIntersectionShapeFromSelection, previewSplitConnectors, splitShapeByPlane } from "@/lib/editorBooleans";
import { meshForShape, setManifoldAssetBase } from "@/lib/editorMeshCore";
import { MAX_AUTO_LIP_WIDTH, SPLIT_CONNECTOR_DEFAULTS, lipWidthFor, normalizeSplitConnectorOptions } from "@/lib/splitConnectors";
import type { WorkplaneShape } from "@/types/layerling";

// Discussion #2181: a long hollow part split in two, with a lip round its bore that goes into the other half.

const lip = { ...SPLIT_CONNECTOR_DEFAULTS, kind: "lip" as const };
const across: { axis: "y"; normal: [number, number, number]; position: number } = { axis: "y", normal: [0, 1, 0], position: 20 };

function shape(id: string, kind: string, width: number, height: number, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind, color: "#2f9bd8", x: 0, z: 0, elevation: 0, size: width, width, depth: width, height, rotation: 0, locked: false, hidden: false, sides: 96, ...extra } as WorkplaneShape;
}

async function tube(outer: number, bore: number) {
  const built = await buildGroupedShapeFromSelection([shape("outer", "cylinder", outer, 40), shape("bore", "cylinder", bore, 60, { elevation: -10, hole: true })], 400_000);
  if (!built.group) throw new Error("no tube");
  return built.group;
}

/** How far the corners of a body at a height lie from the axis: the nearest and the farthest. */
function radii(body: WorkplaneShape, height: number) {
  const found = meshForShape(body).vertices.filter(([, y]) => Math.abs(y - height) < 0.01).map(([x, , z]) => Math.hypot(x, z));
  return [Math.min(...found), Math.max(...found)];
}

describe("how wide a lip gets", () => {
  it("takes half of what the clearance leaves of the wall, at most 3 mm", () => {
    expect(lipWidthFor(4.2, lip)).toBeCloseTo(2, 6);
    expect(lipWidthFor(20, lip)).toBe(MAX_AUTO_LIP_WIDTH);
  });

  it("is nothing where the lip or the wall left beside it would be thinner than 0.8 mm", () => {
    expect(lipWidthFor(1.7, lip)).toBeNull();
    expect(lipWidthFor(1.9, lip)).toBeCloseTo(0.85, 6);
    expect(lipWidthFor(4, { ...lip, lipWidth: 3.5 })).toBeNull();
    expect(lipWidthFor(4, { ...lip, lipWidth: 1.2 })).toBe(1.2);
  });

  it("keeps a width of 0 as the wall's choice and holds one typed within its limits", () => {
    expect(normalizeSplitConnectorOptions({ kind: "lip" }).lipWidth).toBe(0);
    expect(normalizeSplitConnectorOptions({ lipWidth: 0.2 }).lipWidth).toBe(0.8);
    expect(normalizeSplitConnectorOptions({ lipWidth: -1 }).lipWidth).toBe(0);
  });
});

describe("a tube split with a lip", () => {
  beforeAll(() => {
    setManifoldAssetBase(pathToFileURL(path.resolve("node_modules/manifold-3d") + path.sep).href);
  });

  it("stands a ring round the bore on the minus half, into a wider recess in the plus half", async () => {
    // Outer 20, bore 12: a wall of 4 mm, so the lip is (4 - 0.2) / 2 = 1.9 mm wide.
    const result = await splitShapeByPlane(await tube(20, 12), across, lip);
    if (!result.parts) throw new Error(result.error);
    const [plus, minus] = result.parts;
    expect(result.parts).toHaveLength(2);
    expect(result.connectors).toMatchObject({ placed: 1, faces: 1, tooSmall: 0, tooThin: 0 });
    // The minus half reaches the lip's height above the cut: the depth less the end play.
    expect(minus.height).toBeCloseTo(20 + lip.depth - 0.3, 2);
    expect(plus.height).toBeCloseTo(20, 2);
    // Its tip is a step narrower; the bore stays as it was.
    const [tipInner, tipOuter] = radii(minus, 20 + lip.depth - 0.3);
    expect(tipInner).toBeCloseTo(6, 1);
    expect(tipOuter).toBeCloseTo(6 + 1.9 - 0.3, 1);
    // The recess ends the depth into the plus half, 0.2 mm wider than the lip.
    const floor = radii(plus, 20 + lip.depth);
    expect(floor[1]).toBeGreaterThan(8);
  });

  it("makes the two halves fit: put back together they share no material", async () => {
    const result = await splitShapeByPlane(await tube(20, 12), across, lip);
    if (!result.parts) throw new Error(result.error);
    const shared = await buildIntersectionShapeFromSelection(result.parts, 400_000);
    expect(shared.group).toBeNull();
    // The same check finds the overlap once the two are pushed into each other.
    const pushed = await buildIntersectionShapeFromSelection([result.parts[0], { ...result.parts[1], x: result.parts[1].x + 0.6 }], 400_000);
    expect(pushed.group).toBeTruthy();
  });

  // The lip's inner face once lay on the bore's own and left hundreds of slivers, drawn as lines down the bore.
  it("leaves no slivers along the seam", async () => {
    const result = await splitShapeByPlane(await tube(20, 12), across, lip);
    if (!result.parts) throw new Error(result.error);
    for (const half of result.parts) {
      const mesh = meshForShape(half);
      const thin = mesh.faces.filter((face) => {
        const [p, q, r] = face.map((index) => mesh.vertices[index]);
        const u = q.map((value, axis) => value - p[axis]);
        const v = r.map((value, axis) => value - p[axis]);
        const twice = Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
        const longest = Math.max(...[[p, q], [q, r], [r, p]].map(([from, to]) => Math.hypot(...from.map((value, axis) => value - to[axis]))));
        return twice / longest < 0.002;
      });
      expect(thin).toHaveLength(0);
    }
  });

  it("follows a square tube", async () => {
    const built = await buildGroupedShapeFromSelection([shape("outer", "box", 24, 40), shape("bore", "box", 16, 60, { elevation: -10, hole: true })], 400_000);
    const result = await splitShapeByPlane(built.group!, across, lip);
    if (!result.parts) throw new Error(result.error);
    expect(result.connectors).toMatchObject({ placed: 1 });
    const tip = meshForShape(result.parts[1]).vertices.filter(([, y]) => Math.abs(y - (20 + lip.depth - 0.3)) < 0.01);
    // Square corners stay square: the tip's corners lie 8 + 1.9 - 0.3 from the middle along both sides.
    expect(Math.max(...tip.map(([x]) => x))).toBeCloseTo(9.6, 2);
    expect(Math.max(...tip.map(([, , z]) => z))).toBeCloseTo(9.6, 2);
  });

  it("splits without where the wall is too thin, and a solid rod has no lip", async () => {
    for (const body of [await tube(20, 17), shape("rod", "cylinder", 20, 40)]) {
      const result = await splitShapeByPlane(body, across, lip);
      if (!result.parts) throw new Error(result.error);
      expect(result.connectors).toMatchObject({ placed: 0, faces: 1, tooSmall: 1 });
      expect(result.parts[1].height).toBeCloseTo(20, 2);
    }
  });

  it("leaves out a lip whose recess would go through a short half", async () => {
    const result = await splitShapeByPlane(await tube(20, 12), { ...across, position: 36 }, lip);
    if (!result.parts) throw new Error(result.error);
    expect(result.connectors).toMatchObject({ placed: 0, tooThin: 1 });
  });

  it("shows the ring's two edges in the preview", async () => {
    const preview = await previewSplitConnectors([await tube(20, 12)], across, lip);
    expect(preview.tally.placed).toBe(1);
    expect(preview.lips).toHaveLength(2);
    const reach = preview.lips!.map((ring) => Math.max(...ring.map(([x, , z]) => Math.hypot(x, z)))).sort((a, b) => a - b);
    expect(reach[0]).toBeCloseTo(6, 1);
    expect(reach[1]).toBeCloseTo(7.9, 1);
    expect(preview.lips![0][0][1]).toBeCloseTo(20, 3);
  });
});
