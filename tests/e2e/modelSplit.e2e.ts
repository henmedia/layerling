import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { dropSplitSlivers, splitByPlaneClearOfFaces, unionSplitManifoldComponents, type ManifoldSolid } from "@/lib/manifoldSplit";

function dispose(values: unknown[]) {
  Array.from(new Set(values)).forEach((value) => (value as { delete?: () => void })?.delete?.());
}

describe("model split topology (real Manifold kernel)", () => {
  it("unions overlapping closed components before splitting", async () => {
    const runtime = await Module();
    runtime.setup();
    const created: ManifoldSolid[] = [];
    const left = runtime.Manifold.cube([20, 20, 20], true).translate([-5, 0, 0]);
    const right = runtime.Manifold.cube([20, 20, 20], true).translate([5, 0, 0]);
    created.push(left, right);

    const vertProperties: number[] = [];
    const triVerts: number[] = [];
    for (const solid of [left, right]) {
      const mesh = solid.getMesh();
      const vertexOffset = vertProperties.length / 3;
      for (let vertex = 0; vertex < mesh.numVert; vertex += 1) {
        const offset = vertex * mesh.numProp;
        vertProperties.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
      }
      for (const index of mesh.triVerts) triVerts.push(vertexOffset + index);
    }
    const aggregateMesh = new runtime.Mesh({
      numProp: 3,
      vertProperties: new Float32Array(vertProperties),
      triVerts: new Uint32Array(triVerts),
      tolerance: 0.0001,
    });
    aggregateMesh.merge();
    const aggregate = runtime.Manifold.ofMesh(aggregateMesh);
    created.push(aggregate);
    const aggregateComponents = aggregate.decompose();
    created.push(...aggregateComponents);
    expect(aggregateComponents).toHaveLength(2);
    expect(aggregate.volume()).toBeCloseTo(16_000, 5);

    const normalized = unionSplitManifoldComponents(runtime, aggregate);
    created.push(...normalized.created);
    expect(normalized.solid?.volume()).toBeCloseTo(12_000, 5);
    const [positive, negative] = normalized.solid?.splitByPlane([1, 0, 0], 0) ?? [];
    if (positive) created.push(positive);
    if (negative) created.push(negative);
    expect(positive?.status()).toBe("NoError");
    expect(negative?.status()).toBe("NoError");
    expect(positive?.volume()).toBeCloseTo(6_000, 5);
    expect(negative?.volume()).toBeCloseTo(6_000, 5);

    const negativeMesh = negative?.getMesh();
    const flattenedPositions: number[] = [];
    if (negativeMesh) {
      for (const vertex of negativeMesh.triVerts) {
        const offset = vertex * negativeMesh.numProp;
        flattenedPositions.push(
          negativeMesh.vertProperties[offset],
          negativeMesh.vertProperties[offset + 1],
          negativeMesh.vertProperties[offset + 2],
        );
      }
    }
    const flattenedMesh = new runtime.Mesh({
      numProp: 3,
      vertProperties: new Float32Array(flattenedPositions),
      triVerts: new Uint32Array(flattenedPositions.length / 3).map((_, index) => index),
      tolerance: 0.0001,
    });
    flattenedMesh.merge();
    const restoredHalf = runtime.Manifold.ofMesh(flattenedMesh);
    created.push(restoredHalf);
    const restoredNormalized = unionSplitManifoldComponents(runtime, restoredHalf);
    created.push(...restoredNormalized.created);
    const [front, back] = restoredNormalized.solid?.splitByPlane([0, 0, 1], 0) ?? [];
    if (front) created.push(front);
    if (back) created.push(back);
    expect(front?.status()).toBe("NoError");
    expect(back?.status()).toBe("NoError");
    expect(front?.volume()).toBeCloseTo(3_000, 5);
    expect(back?.volume()).toBeCloseTo(3_000, 5);
    dispose(created);
  });

  it("keeps the cavity of a closed hollow body", async () => {
    const runtime = await Module();
    runtime.setup();
    const outer = runtime.Manifold.cube([20, 20, 20], true);
    const inner = runtime.Manifold.cube([16, 16, 16], true);
    const hollow = outer.subtract(inner);
    const created: ManifoldSolid[] = [outer, inner, hollow];
    expect(hollow.volume()).toBeCloseTo(8_000 - 4_096, 5);

    const normalized = unionSplitManifoldComponents(runtime, hollow);
    created.push(...normalized.created);
    expect(normalized.solid?.volume()).toBeCloseTo(3_904, 5);
    const [top, bottom] = normalized.solid?.splitByPlane([0, 1, 0], 3) ?? [];
    if (top) created.push(top);
    if (bottom) created.push(bottom);
    // Wall above the cut: 20x20x7 minus the 16x16x5 of cavity it encloses.
    expect(top?.volume()).toBeCloseTo(2_800 - 1_280, 5);
    expect(bottom?.volume()).toBeCloseTo(5_200 - 2_816, 5);
    dispose(created);
  });

  it("keeps a cavity when overlapping bodies are united", async () => {
    const runtime = await Module();
    runtime.setup();
    const outer = runtime.Manifold.cube([20, 20, 20], true);
    const inner = runtime.Manifold.cube([16, 16, 16], true);
    const hollow = outer.subtract(inner);
    // A post sunk 1 mm into one wall, not reaching the cavity.
    const post = runtime.Manifold.cube([4, 4, 8], true).translate([0, 0, 13]);
    const both = runtime.Manifold.compose([hollow, post]);
    const created: ManifoldSolid[] = [outer, inner, hollow, post, both];

    const normalized = unionSplitManifoldComponents(runtime, both);
    created.push(...normalized.created);
    // The post adds the 7 mm outside the wall; a filled cavity would add 4096 more.
    expect(normalized.solid?.volume()).toBeCloseTo(3_904 + 4 * 4 * 7, 5);
    dispose(created);
  });

  it("drops the flat skin a cut lying on a face leaves behind", async () => {
    const runtime = await Module();
    runtime.setup();
    // An L: a 40 wide base 10 high, with a 10 wide tower up to 20 on its left.
    const base = runtime.Manifold.cube([40, 10, 20], false);
    const tower = runtime.Manifold.cube([10, 20, 20], false);
    const shape = runtime.Manifold.union([base, tower]);
    const created: ManifoldSolid[] = [base, tower, shape];
    // Exactly on the step, and a picked point's float noise below it.
    for (const position of [10, 10 - 1e-13]) {
      const [top, bottom] = shape.splitByPlane([0, 1, 0], position);
      created.push(top, bottom);
      const topComponents = top.decompose();
      created.push(...topComponents);
      expect(topComponents.length).toBe(2);
      const trimmed = dropSplitSlivers(runtime, top);
      created.push(...trimmed.created);
      expect(trimmed.solid?.decompose().length).toBe(1);
      expect(trimmed.solid?.volume()).toBeCloseTo(2_000, 5);
      const kept = dropSplitSlivers(runtime, bottom);
      created.push(...kept.created);
      expect(kept.solid).toBe(bottom);
    }
    dispose(created);
  });

  it("cuts a lid at its plate without leaving the plate's brim on the rim (#1263)", async () => {
    const runtime = await Module();
    runtime.setup();
    const { Manifold } = runtime;
    const plate = Manifold.cylinder(2, 100, 100, 128);
    const outer = Manifold.cylinder(4, 97.8, 97.8, 128);
    const inner = Manifold.cylinder(4, 95.8, 95.8, 128);
    const rim = outer.subtract(inner);
    const lidUp = plate.add(rim.translate([0, 0, 2]));
    const lidDown = rim.add(plate.translate([0, 0, 4]));
    const created: ManifoldSolid[] = [plate, outer, inner, rim, lidUp, lidDown];
    const plateVolume = plate.volume();
    const rimVolume = rim.volume();
    const width = (solid: ManifoldSolid) => solid.boundingBox().max[0] - solid.boundingBox().min[0];

    // Lying as the lid tool lays it out: plate down, rim up; cut on the plate's top.
    // A plain split hands the rim a brim 200 wide (the bug); the normal's length does not matter.
    const [plainTop, plainBottom] = lidUp.splitByPlane([0, 0, 1], 2);
    created.push(plainTop, plainBottom);
    expect(width(plainTop)).toBeCloseTo(200, 1);
    for (const normal of [[0, 0, 1], [0, 0, 3]] as [number, number, number][]) {
      const [top, bottom] = splitByPlaneClearOfFaces(lidUp, normal, 2);
      created.push(top, bottom);
      expect(top.status()).toBe("NoError");
      expect(bottom.status()).toBe("NoError");
      expect(width(top)).toBeCloseTo(2 * 97.8, 1);
      expect(top.boundingBox().min[2]).toBeCloseTo(2, 6);
      expect(top.volume()).toBeCloseTo(rimVolume, 1);
      expect(width(bottom)).toBeCloseTo(200, 1);
      expect(bottom.boundingBox().max[2]).toBeCloseTo(2, 6);
      expect(bottom.volume()).toBeCloseTo(plateVolume, 1);
    }

    // The other way up: the brim would go to the lower half.
    const [top, bottom] = splitByPlaneClearOfFaces(lidDown, [0, 0, 1], 4);
    created.push(top, bottom);
    expect(width(bottom)).toBeCloseTo(2 * 97.8, 1);
    expect(bottom.volume()).toBeCloseTo(rimVolume, 1);
    expect(top.volume()).toBeCloseTo(plateVolume, 1);
    expect(top.boundingBox().min[2]).toBeCloseTo(4, 6);
    dispose(created);
  });

  it("cuts on a step of a body and leaves a plain cut as Manifold makes it (#1263)", async () => {
    const runtime = await Module();
    runtime.setup();
    const base = runtime.Manifold.cube([40, 10, 20], false);
    const tower = runtime.Manifold.cube([10, 20, 20], false);
    const shape = runtime.Manifold.union([base, tower]);
    const created: ManifoldSolid[] = [base, tower, shape];
    // On the step: the tower's half is the tower only, 10 wide, in one piece.
    const [top, bottom] = splitByPlaneClearOfFaces(shape, [0, 1, 0], 10);
    created.push(top, bottom);
    const trimmed = dropSplitSlivers(runtime, top);
    created.push(...trimmed.created);
    expect(trimmed.solid?.volume()).toBeCloseTo(2_000, 3);
    expect(trimmed.solid?.boundingBox().max[0]).toBeCloseTo(10, 6);
    expect(bottom.volume()).toBeCloseTo(8_000, 3);
    // Through the middle of a slanted plane, away from every corner: the same as Manifold's own split.
    const normal: [number, number, number] = [0.3, 1, 0.2];
    const [ownTop, ownBottom] = shape.splitByPlane(normal, 7.3);
    const [clearTop, clearBottom] = splitByPlaneClearOfFaces(shape, normal, 7.3);
    created.push(ownTop, ownBottom, clearTop, clearBottom);
    expect(clearTop.volume()).toBeCloseTo(ownTop.volume(), 6);
    expect(clearBottom.volume()).toBeCloseTo(ownBottom.volume(), 6);
    dispose(created);
  });

  it("keeps a cut half's cavity when dropping skins", async () => {
    const runtime = await Module();
    runtime.setup();
    const outer = runtime.Manifold.cube([20, 20, 20], true);
    const inner = runtime.Manifold.cube([16, 16, 16], true);
    const hollow = outer.subtract(inner);
    // On the cavity's floor: the skin goes, the wall and cavity above stay.
    const [top, bottom] = hollow.splitByPlane([0, 1, 0], -8);
    const created: ManifoldSolid[] = [outer, inner, hollow, top, bottom];
    const trimmedTop = dropSplitSlivers(runtime, top);
    const trimmedBottom = dropSplitSlivers(runtime, bottom);
    created.push(...trimmedTop.created, ...trimmedBottom.created);
    expect(trimmedTop.solid?.volume()).toBeCloseTo(20 * 20 * 18 - 4_096, 5);
    expect(trimmedBottom.solid?.volume()).toBeCloseTo(20 * 20 * 2, 5);
    dispose(created);
  });
  it("cuts a pile of overlapping shells correctly only after the shells are joined", async () => {
    const runtime = await Module();
    runtime.setup();
    // What a group of solids hands to the kernel: the surfaces of its parts in one
    // mesh. Two 20 mm cubes, one standing 10 mm inside the other, a third lying exactly on the first.
    const cubes = [[0, 0], [10, 0], [0, 0]].map(([x, z]) => runtime.Manifold.cube([20, 20, 20], false).translate([x, 0, z]));
    const meshes = cubes.map((cube) => cube.getMesh());
    const vertProperties: number[] = [];
    const triVerts: number[] = [];
    meshes.forEach((mesh) => {
      const offset = vertProperties.length / 3;
      vertProperties.push(...Array.from(mesh.vertProperties));
      triVerts.push(...Array.from(mesh.triVerts).map((index) => index + offset));
    });
    const pile = new runtime.Mesh({ numProp: 3, vertProperties: Float32Array.from(vertProperties), triVerts: Uint32Array.from(triVerts) });
    const solid = runtime.Manifold.ofMesh(pile);
    const cutter = runtime.Manifold.cube([40, 40, 40], false).translate([15, -5, -5]);
    const created: ManifoldSolid[] = [...cubes, solid, cutter];

    const normalized = unionSplitManifoldComponents(runtime, solid);
    created.push(...normalized.created);
    expect(normalized.solid).not.toBeNull();
    const cut = normalized.solid!.subtract(cutter);
    created.push(cut);
    // The union of the cubes is 30 x 20 x 20 = 12 000; the cutter takes everything right of x = 15.
    expect(cut.volume()).toBeCloseTo(15 * 20 * 20, 5);
    expect(cut.decompose().length).toBe(1);
    dispose(created);
  });
});
