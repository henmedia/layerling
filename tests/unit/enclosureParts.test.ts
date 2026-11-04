import { describe, expect, it } from "vitest";
import type { IndexedMesh } from "@/lib/enclosureMesh";
import { screwBossMesh, screwBossPlan, screwBossSize } from "@/lib/screwBoss";
import { snapFitMesh, snapFitPlan } from "@/lib/snapFit";
import { ribMesh } from "@/lib/rib";
import { meshForShape } from "@/lib/editorMeshCore";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { analyzeTriangleSoup } from "@/lib/svgImport";

/** Closed and turned outward: every edge used once each way, the volume positive. Returns how many separate parts. */
function closedParts(mesh: IndexedMesh) {
  mesh.orient();
  const I = mesh.indices;
  const directed = new Map<string, number>();
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e += 1) {
    const key = `${I[t + e]},${I[t + ((e + 1) % 3)]}`;
    directed.set(key, (directed.get(key) ?? 0) + 1);
  }
  for (const [key, count] of directed) {
    const [a, b] = key.split(",");
    expect(count, key).toBe(1);
    expect(directed.get(`${b},${a}`), key).toBe(1);
  }
  expect(mesh.volume()).toBeGreaterThan(0);
  // Parts: points joined by the triangles.
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  for (let t = 0; t < I.length; t += 3) {
    const a = find(I[t]);
    for (const b of [I[t + 1], I[t + 2]]) parent.set(find(b), a);
  }
  return new Set(I.map(find)).size;
}

function extent(mesh: IndexedMesh) {
  const p = mesh.positions;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k += 1) {
    min[k] = Math.min(min[k], p[i + k]);
    max[k] = Math.max(max[k], p[i + k]);
  }
  return { min, max };
}

describe("the screw boss", () => {
  it("takes the hole an insert or a screw wants", () => {
    // Heat-set inserts: M3 4.0 mm for 5.7 mm, a millimetre deeper; inch sizes too.
    expect(screwBossPlan({ width: 8, height: 10 })).toMatchObject({ fastener: "insert", holeRadius: 2, holeDepth: 6.7, radius: 4, through: false });
    expect(screwBossSize("insert", "#4-40")).toMatchObject({ hole: 3.9, length: 5.7 });
    expect(screwBossSize("insert", "M5")).toMatchObject({ hole: 6.4, length: 9.5, outer: 12 });
    // Self-tapping screws: a pilot hole of 0.8 times the screw, the post 2.5 times it, 2.5 screws deep.
    expect(screwBossSize("selfTapping", "ST2.9")).toMatchObject({ hole: 2.3, outer: 7.5, length: 7.3 });
    expect(screwBossSize("selfTapping", "#6")).toMatchObject({ hole: 2.8, outer: 9 });
    // A hole as deep as the post goes through; typed-in values win over the size's.
    expect(screwBossPlan({ width: 8, height: 6 }).through).toBe(true);
    expect(screwBossPlan({ width: 8, height: 10, screwBossFastener: "custom", screwBossHole: 3.4, screwBossHoleDepth: 4 })).toMatchObject({ holeRadius: 1.7, holeDepth: 4, minWall: 0.4 });
  });

  it("is a closed body with its hole, as deep as asked", () => {
    const { mesh, plan } = screwBossMesh({ width: 8, height: 10 }, 96);
    expect(closedParts(mesh)).toBe(1);
    const cylinder = (r: number, h: number) => Math.PI * r * r * h;
    // The post less the hole and its small chamfer, within the polygon's few tenths of a percent.
    const expected = cylinder(4, 10) - cylinder(2, plan.holeDepth - plan.chamfer) - (Math.PI * plan.chamfer * (2 * 2 + 2 * 2.5 + 2.5 * 2.5)) / 3;
    expect(mesh.volume()).toBeGreaterThan(expected * 0.99);
    expect(mesh.volume()).toBeLessThan(expected * 1.001);
    const through = screwBossMesh({ width: 8, height: 5, screwBossFastener: "selfTapping", screwBossSize: "K30" });
    expect(through.plan.through).toBe(true);
    expect(closedParts(through.mesh)).toBe(1);
  });

  it("braces the post with gussets out to its footprint, and leaves them out where they do not fit", () => {
    for (const gussets of [2, 3, 4, 6]) {
      const { mesh, plan } = screwBossMesh({ width: 18, height: 12, screwBossDiameter: 8, screwBossGussets: gussets });
      expect(plan.gussets).toBe(gussets);
      expect(closedParts(mesh)).toBe(1);
      expect(extent(mesh).max[0]).toBeCloseTo(9, 6);
    }
    // No room beyond the post: no gussets.
    expect(screwBossPlan({ width: 8, height: 10, screwBossDiameter: 8, screwBossGussets: 4 }).gussets).toBe(0);
  });

  it("says when the wall round the hole is thinner than the fastener wants", () => {
    const thin = screwBossPlan({ width: 5, height: 10, screwBossDiameter: 5 });
    expect(thin.wall).toBeCloseTo(0.5, 6);
    expect(thin.wall).toBeLessThan(thin.minWall);
    expect(screwBossPlan({ width: 8, height: 10 }).wall).toBeGreaterThanOrEqual(1.6);
  });
});

describe("the snap-fit", () => {
  it("is a hook and its catch, apart by the clearance, each closed", () => {
    const { mesh, plan } = snapFitMesh({ width: 8, height: 16, depth: 9 });
    expect(closedParts(mesh)).toBe(2);
    // The catch's tip stands the clearance in front of the arm, its top the clearance under the barb's holding face.
    expect(plan.barbTip).toBeCloseTo(4.5 - 0.2, 9);
    expect(plan.armFront).toBeCloseTo(4.5 - 0.2 - 1, 9);
    expect(extent(mesh).max[2]).toBeCloseTo(4.5, 6);
    // It stands as under a lid: the foot at the top, the barb below the catch. The plan measures from the foot.
    const ys = new Set<number>();
    for (let i = 1; i < mesh.positions.length; i += 3) if (Math.abs(mesh.positions[i + 1] - (4.5 - 1)) < 1e-6) ys.add(Number(mesh.positions[i].toFixed(4)));
    expect(ys.has(Number((16 - (plan.holdY - plan.clearance)).toFixed(4)))).toBe(true);
    const footTop: number[] = [];
    for (let i = 1; i < mesh.positions.length; i += 3) if (Math.abs(mesh.positions[i] - 16) < 1e-6) footTop.push(mesh.positions[i + 1]);
    expect(Math.min(...footTop)).toBeCloseTo(-4.5, 6);
    expect(Math.max(...footTop)).toBeCloseTo(plan.armFront, 6);
    const tip: number[] = [];
    for (let i = 1; i < mesh.positions.length; i += 3) if (Math.abs(mesh.positions[i]) < 1e-6) tip.push(mesh.positions[i + 1]);
    expect(Math.min(...tip)).toBeCloseTo(plan.armBack, 6);
    expect(Math.max(...tip)).toBeCloseTo(plan.armFront, 6);
  });

  it("makes the hook or the catch alone", () => {
    expect(closedParts(snapFitMesh({ width: 8, height: 16, depth: 9, snapFitPart: "hook" }).mesh)).toBe(1);
    const catchOnly = snapFitMesh({ width: 8, height: 1.6, depth: 1, snapFitPart: "catch" }).mesh;
    expect(closedParts(catchOnly)).toBe(1);
    expect(extent(catchOnly).min[1]).toBeCloseTo(0, 6);
    expect(extent(catchOnly).max[1]).toBeCloseTo(1.6, 6);
    // A releasable holding face rises: the catch's top follows it.
    expect(closedParts(snapFitMesh({ width: 8, height: 16, depth: 9, snapFitRetainAngle: 45 }).mesh)).toBe(2);
    expect(closedParts(snapFitMesh({ width: 8, height: 16, depth: 3, snapFitPart: "hook", snapFitFoot: 0 }).mesh)).toBe(1);
  });

  it("says how much the arm stretches at its root as it snaps in", () => {
    // 1.5 * thickness * undercut / length^2: the default hook, 12.3 mm from the foot to the holding face.
    const plan = snapFitPlan({ width: 8, height: 16, depth: 9 });
    expect(plan.armLength).toBeCloseTo(16 - 1.732 - 0.4 - 1.6, 2);
    expect(plan.strain).toBeCloseTo((1.5 * 1.6 * 1) / plan.armLength ** 2, 9);
    expect(plan.strain).toBeLessThan(0.02);
    // Shorter and thicker it asks too much of PLA.
    expect(snapFitPlan({ width: 8, height: 10, depth: 9, snapFitThickness: 2 }).strain).toBeGreaterThan(0.04);
  });
});

describe("the rib", () => {
  it("is a straight strip with a flat, round or chamfered top, or a gusset", () => {
    const flat = ribMesh({ width: 40, height: 8, depth: 1.6 });
    expect(closedParts(flat)).toBe(1);
    expect(flat.volume()).toBeCloseTo(40 * 8 * 1.6, 6);
    for (const ribTop of ["round", "chamfer"] as const) {
      const mesh = ribMesh({ width: 40, height: 8, depth: 1.6, ribTop });
      expect(closedParts(mesh)).toBe(1);
      expect(mesh.volume()).toBeLessThan(40 * 8 * 1.6);
      expect(extent(mesh).max[1]).toBeCloseTo(8, 6);
    }
    const gusset = ribMesh({ width: 10, height: 12, depth: 1.6, ribStyle: "gusset" });
    expect(closedParts(gusset)).toBe(1);
    // A right triangle with its two ends cut off 0.6 mm short: (-5,0) (5,0) (5,0.6) (-4.4,12) (-5,12), 66.42 mm² by
    // the shoelace, a little more than half the box.
    expect(gusset.volume()).toBeCloseTo(66.42 * 1.6, 6);
    const box = extent(gusset);
    [-5, 0, -0.8].forEach((v, i) => expect(box.min[i]).toBeCloseTo(v, 6));
    [5, 12, 0.8].forEach((v, i) => expect(box.max[i]).toBeCloseTo(v, 6));
  });
});

describe("the enclosure parts in the library", () => {
  it("come out of the catalogue with their defaults, closed as the editor builds them", () => {
    for (const kind of ["screwBoss", "snapFit", "rib"] as const) {
      const asset = toolbarShapeAssets.find((entry) => entry.kind === kind)!;
      const shape = makeShapeFromAsset(asset, { x: 0, z: 0 });
      const mesh = meshForShape(shape);
      const soup = analyzeTriangleSoup(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
      expect(soup.boundaryEdges, kind).toBe(0);
      expect(soup.nonManifoldEdges, kind).toBe(0);
    }
    const boss = makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === "screwBoss")!, { x: 0, z: 0 });
    expect(boss).toMatchObject({ screwBossFastener: "insert", screwBossSize: "M3", width: 8, height: 10 });
    const snap = makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === "snapFit")!, { x: 0, z: 0 });
    expect(snap).toMatchObject({ snapFitPart: "both", snapFitUndercut: 1, snapFitRetainAngle: 90, height: 16 });
  });
});
