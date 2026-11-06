import { describe, expect, it } from "vitest";
import type { IndexedMesh } from "@/lib/enclosureMesh";
import { screwBossCavityMesh, screwBossMesh, screwBossPlan, screwBossSize } from "@/lib/screwBoss";
import { snapFitMesh, snapFitPlan } from "@/lib/snapFit";
import { MAX_RIB_OVAL_FOOT_STRETCH, RIB_OVAL_FOOT_SEGMENTS, ribBoxWidth, ribFootSwitch, ribGussetWallKeepingPlace, ribLengthKeepingPatch, ribMesh, ribOvalFootStretch, ribSize, ribThicknessOnFootPatch } from "@/lib/rib";
import { meshForShape } from "@/lib/editorMeshCore";
import { makeShapeFromAsset, sceneShape, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

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

/** A closed outline's area by the shoelace. */
function area(points: Array<[number, number]>) {
  let sum = 0;
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    sum += x * ny - nx * y;
  });
  return Math.abs(sum) / 2;
}

/** The mesh as the editor turns it into triangles, checked for holes and edges shared by more than two faces. */
function soupOf(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  return analyzeTriangleSoup(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
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

  it("grouped as a hole, cuts only the insert's pocket, not the whole post (#1288)", () => {
    const { mesh, plan } = screwBossCavityMesh({ width: 8, height: 10, screwBossGussets: 4 }, 96);
    expect(closedParts(mesh)).toBe(1);
    const cylinder = (r: number, h: number) => Math.PI * r * r * h;
    // The M3 insert's hole, 4 mm across and 6.7 mm deep from the top, with its chamfer: no post, no gussets.
    const expected = cylinder(2, plan.holeDepth - plan.chamfer) + (Math.PI * plan.chamfer * (2 * 2 + 2 * 2.5 + 2.5 * 2.5)) / 3;
    expect(plan.holeDepth).toBeCloseTo(6.7, 5);
    expect(mesh.volume()).toBeGreaterThan(expected * 0.98);
    expect(mesh.volume()).toBeLessThan(expected * 1.001);
    const ys = Array.from({ length: mesh.positions.length / 3 }, (_, i) => mesh.positions[i * 3 + 1]);
    const rs = Array.from({ length: mesh.positions.length / 3 }, (_, i) => Math.hypot(mesh.positions[i * 3], mesh.positions[i * 3 + 2]));
    expect(Math.min(...ys)).toBeCloseTo(10 - 6.7, 5);
    expect(Math.max(...ys)).toBeCloseTo(10, 5);
    expect(Math.max(...rs)).toBeCloseTo(2 + plan.chamfer, 5);
    // Through when it is as deep as the boss; and the editor builds a boss marked as a hole this way.
    const through = screwBossCavityMesh({ width: 8, height: 5, screwBossFastener: "selfTapping", screwBossSize: "K30" });
    expect(through.plan.through).toBe(true);
    expect(closedParts(through.mesh)).toBe(1);
    const shape = makeShapeFromAsset(toolbarShapeAssets.find((asset) => asset.kind === "screwBoss")!, { x: 0, z: 0 });
    // Across the body as the editor builds it, half its width in x and z.
    const halfWidth = (vertices: number[][]) => {
      const xs = vertices.map((v) => v[0]);
      return (Math.max(...xs) - Math.min(...xs)) / 2;
    };
    expect(halfWidth(meshForShape(shape).vertices)).toBeCloseTo(4, 1);
    expect(halfWidth(meshForShape({ ...shape, hole: true }).vertices)).toBeLessThan(2.6);
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

describe("the rib on its foot (Discussion #1307)", () => {
  const rib = toolbarShapeAssets.find((entry) => entry.kind === "rib")!;

  it("has none unless it is switched on, so a rib saved before stays as it was", () => {
    expect(ribSize({ width: 40, height: 8, depth: 1.6 }).foot).toBeNull();
    const plain = ribMesh({ width: 40, height: 8, depth: 1.6 });
    // What a foot switched off again leaves behind changes nothing either.
    const switchedOff = ribMesh({ width: 40, height: 8, depth: 1.6, ribFoot: false, ribThickness: 0.8, ribFootThickness: 1.2 });
    expect(switchedOff.positions).toEqual(plain.positions);
    expect(switchedOff.indices).toEqual(plain.indices);
    const fresh = makeShapeFromAsset(rib, { x: 0, z: 0 });
    expect(fresh.ribFoot).toBeUndefined();
    expect(fresh.depth).toBe(1.6);
  });

  it("is a thin plate under the whole straight rib, centred, the box as wide as the foot", () => {
    // A 1.6 mm rib on the foot it starts with: three times as wide, 0.8 mm thick, the height still the whole height.
    const fields = { width: 40, height: 8, depth: 4.8, ribFoot: true, ribThickness: 1.6 };
    expect(ribSize(fields).foot).toEqual({ width: 4.8, thickness: 0.8, shape: "square", length: 40 });
    const flat = ribMesh(fields);
    expect(closedParts(flat)).toBe(1);
    expect(flat.volume()).toBeCloseTo(40 * (1.6 * (8 - 0.8) + 4.8 * 0.8), 6);
    const box = extent(flat);
    [-20, 0, -2.4].forEach((v, i) => expect(box.min[i]).toBeCloseTo(v, 6));
    [20, 8, 2.4].forEach((v, i) => expect(box.max[i]).toBeCloseTo(v, 6));
    // Each top as without the foot: the rib's own volume, its lowest 0.8 mm traded for the foot.
    for (const ribTop of ["flat", "round", "chamfer"] as const) {
      const onFoot = ribMesh({ ...fields, ribTop });
      expect(closedParts(onFoot), ribTop).toBe(1);
      expect(extent(onFoot).max[1]).toBeCloseTo(8, 6);
      const alone = ribMesh({ width: 40, height: 8, depth: 1.6, ribTop }).orient().volume();
      expect(onFoot.volume(), ribTop).toBeCloseTo(alone - 40 * 1.6 * 0.8 + 40 * 4.8 * 0.8, 6);
    }
  });

  it("lies under a gusset's leg along the floor: the gusset ends in a thick foot, stands on a thin one to its tip", () => {
    // The gusset's tip is 0.6 mm high. Above a 0.8 mm foot its slope meets the foot at x = -4.4 + 11.2 / 11.4 * 9.4.
    const meets = -4.4 + (11.2 / 11.4) * 9.4;
    const cases: Array<[number, Array<[number, number]>]> = [
      [0.8, [[-5, 0.8], [meets, 0.8], [-4.4, 12], [-5, 12]]],
      [0.4, [[-5, 0.4], [5, 0.4], [5, 0.6], [-4.4, 12], [-5, 12]]],
    ];
    for (const [footThickness, above] of cases) {
      const mesh = ribMesh({ width: 10, height: 12, depth: 4.8, ribStyle: "gusset", ribFoot: true, ribThickness: 1.6, ribFootThickness: footThickness });
      expect(closedParts(mesh), String(footThickness)).toBe(1);
      expect(mesh.volume(), String(footThickness)).toBeCloseTo(area(above) * 1.6 + 10 * footThickness * 4.8, 6);
      const box = extent(mesh);
      [-5, 0, -2.4].forEach((v, i) => expect(box.min[i]).toBeCloseTo(v, 6));
      [5, 12, 2.4].forEach((v, i) => expect(box.max[i]).toBeCloseTo(v, 6));
    }
  });

  it("keeps the foot wider than the rib and lower than half the height", () => {
    const base = { width: 40, height: 8, ribFoot: true };
    // Without a thickness of its own the rib is a third of the foot.
    expect(ribSize({ ...base, depth: 4.8 }).thickness).toBeCloseTo(1.6, 9);
    // The foot reaches out a line (0.4 mm) beside the rib at least: the box is what is printed, so the rib gives way.
    expect(ribSize({ ...base, depth: 2, ribThickness: 1.6 }).thickness).toBeCloseTo(1.2, 9);
    expect(ribSize({ ...base, depth: 4.8, ribFootThickness: 10 }).foot?.thickness).toBe(4);
    expect(ribSize({ ...base, depth: 4.8, ribFootThickness: 0 }).foot?.thickness).toBe(0.2);
    // A round top too low above the foot stays flat, as it does on a rib too low without one.
    const low = ribMesh({ ...base, height: 1.6, depth: 4.8, ribThickness: 1.6, ribFootThickness: 0.8, ribTop: "round" });
    expect(closedParts(low)).toBe(1);
    expect(low.volume()).toBeCloseTo(40 * (1.6 * 0.8 + 4.8 * 0.8), 6);
  });

  it("switches on and off with the box following it, centred on the rib", () => {
    const on = ribFootSwitch({ width: 40, height: 8, depth: 1.6 }, true);
    expect(on).toEqual({ ribFoot: true, ribThickness: 1.6, depth: 4.8 });
    expect(ribFootSwitch({ width: 40, height: 8, ...on }, false)).toEqual({ ribFoot: false, ribThickness: undefined, depth: 1.6 });
    expect(ribFootSwitch({ width: 40, height: 8, depth: 0.8 }, true, { depth: 4 })).toEqual({ ribFoot: true, ribThickness: 0.8, depth: 4 });
    // A thicker rib widens its foot only where the foot would no longer reach out beside it.
    expect(ribThicknessOnFootPatch({ width: 40, height: 8, depth: 4.8 }, 2)).toEqual({ ribThickness: 2, depth: 4.8 });
    expect(ribThicknessOnFootPatch({ width: 40, height: 8, depth: 4.8 }, 4.4)).toEqual({ ribThickness: 4.4, depth: 5.2 });
  });

  it("comes out of the catalogue on its foot, closed, and keeps it through a saved design", async () => {
    const straight = makeShapeFromAsset(rib, { x: 0, z: 0 }, { ribFoot: true });
    expect(straight).toMatchObject({ ribFoot: true, ribThickness: 1.6, depth: 4.8, height: 8 });
    const gusset = makeShapeFromAsset(rib, { x: 30, z: 0 }, { ribFoot: true, ribStyle: "gusset", ribThickness: 1.2, ribFootThickness: 0.4, width: 10, height: 10 });
    expect(gusset).toMatchObject({ ribFoot: true, ribThickness: 1.2, ribFootThickness: 0.4, depth: 3.6 });
    for (const shape of [straight, gusset]) {
      const soup = soupOf(shape);
      expect(soup.boundaryEdges).toBe(0);
      expect(soup.nonManifoldEdges).toBe(0);
    }
    // The saved shape defaults take the three, false included, so a command can switch the foot off again.
    expect(normalizeShapeCustomizations({ rib: { ribFoot: false, ribThickness: 99, ribFootThickness: 0.6 } }).rib).toMatchObject({ ribFoot: false, ribThickness: 50, ribFootThickness: 0.6 });
    const shapes = [{ ...straight, id: "straight" }, { ...gusset, id: "gusset" }] as WorkplaneShape[];
    const exported = await exportLylProject({
      projectId: "ribs", projectName: "Ribs", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = new Map((await importLylProject(exported)).shapes.map((shape) => [shape.id, shape]));
    expect(restored.get("straight")).toMatchObject({ ribFoot: true, ribThickness: 1.6, depth: 4.8 });
    expect(restored.get("gusset")).toMatchObject({ ribFoot: true, ribThickness: 1.2, ribFootThickness: 0.4, ribStyle: "gusset" });
    // A foot that is neither on nor off is refused, as any other nonsense in a design file.
    const broken = [{ ...straight, id: "broken", ribFoot: "yes" }] as unknown as WorkplaneShape[];
    const brokenFile = await exportLylProject({
      projectId: "ribs", projectName: "Ribs", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: broken, history: [editorHistoryEntry(broken, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    await expect(importLylProject(brokenFile)).rejects.toThrow(/ribFoot/);
    // Scenes the editor builds itself (the lid tool, automations) carry the foot along too.
    expect(sceneShape({ name: "Rib", kind: "rib", color: "#7b8794", width: 40, depth: 2.4, height: 8, ribFoot: true, ribThickness: 0.8, ribFootThickness: 0.6 }))
      .toMatchObject({ ribFoot: true, ribThickness: 0.8, ribFootThickness: 0.6, depth: 2.4 });
  });
});

describe("the rib on an oval foot (Discussion #1307)", () => {
  const rib = toolbarShapeAssets.find((entry) => entry.kind === "rib")!;
  /** What the mesh's outline of an ellipse a by b leaves of it: a polygon of `pieces` sides round it (half of one for `half`). */
  const ovalArea = (a: number, b: number, half = false) => {
    const pieces = half ? RIB_OVAL_FOOT_SEGMENTS / 2 : RIB_OVAL_FOOT_SEGMENTS;
    return (pieces / 2) * a * b * Math.sin((half ? Math.PI : 2 * Math.PI) / pieces);
  };
  /** How far the foot reaches out from the rib's middle at its ends, the ellipse b wide stretched `stretch` times the rib. */
  const atTheEnds = (b: number, stretch: number) => b * Math.sqrt(1 - 1 / stretch ** 2);
  // A 1.6 mm rib on the 4.8 mm foot it starts with: 1 / sqrt(1 - (1.6 / 2.4)^2) = 1.342 times as long as the rib.
  const STRETCH = 1 / Math.sqrt(1 - (1.6 / 2.4) ** 2);

  it("is just long enough for the rib's ends to stand on it, cut short where that would be long, never too short", () => {
    expect(ribOvalFootStretch(1.6, 4.8)).toBeCloseTo(STRETCH, 9);
    // At the rib's ends the foot reaches out by the rib's thickness from its middle, half a rib beside each face.
    expect(atTheEnds(2.4, ribOvalFootStretch(1.6, 4.8))).toBeCloseTo(1.6, 9);
    // A wider foot needs less: 6.4 mm, 1.155 times.
    expect(ribOvalFootStretch(1.6, 6.4)).toBeCloseTo(1 / Math.sqrt(1 - 0.5 ** 2), 9);
    // 4 mm would need 1.667 times: cut short at 1.5, the ends on 1.49 mm of it, still more than the rib's 0.8.
    expect(ribOvalFootStretch(1.6, 4)).toBe(1.5);
    expect(atTheEnds(2, MAX_RIB_OVAL_FOOT_STRETCH)).toBeGreaterThan(1.4);
    // A foot no wider than twice the rib (2.4 mm, a line beside it) could not reach out by the rib's thickness at all.
    // Cut short at 1.5 its ends would stand on 0.09 mm beside the rib; it stays long enough for half the 0.4 mm of its
    // middle, 1.81 times.
    const narrow = ribOvalFootStretch(1.6, 2.4);
    expect(narrow).toBeGreaterThan(MAX_RIB_OVAL_FOOT_STRETCH);
    expect(atTheEnds(1.2, narrow) - 0.8).toBeCloseTo(0.2, 9);
    // Where it is cut short, and where cut short it would leave the ends too little, the length runs on without a step:
    // the ellipse through the ends is 1.5 times the rib at b = 3 / sqrt(5) t, the cut one gives way to the long one at
    // b = (t / 4) / (sqrt(5) / 3 - 1 / 2).
    for (const b of [(3 / Math.sqrt(5)) * 1.6, 0.4 / (Math.sqrt(5) / 3 - 0.5)]) {
      expect(Math.abs(ribOvalFootStretch(1.6, 2 * b - 1e-6) - ribOvalFootStretch(1.6, 2 * b + 1e-6)), String(b)).toBeLessThan(1e-4);
    }
    // A foot no wider than the rib is none.
    expect(ribOvalFootStretch(1.6, 1.6)).toBe(1);
  });

  it("is square unless set oval, so a foot saved before stays as it was", () => {
    const square = { width: 40, height: 8, depth: 4.8, ribFoot: true, ribThickness: 1.6 };
    expect(ribSize(square).foot).toEqual({ width: 4.8, thickness: 0.8, shape: "square", length: 40 });
    expect(ribSize({ ...square, ribFootShape: "square" }).width).toBe(40);
    const before = ribMesh(square);
    const named = ribMesh({ ...square, ribFootShape: "square" });
    expect(named.positions).toEqual(before.positions);
    expect(named.indices).toEqual(before.indices);
    // An oval shape on a rib without a foot changes nothing either.
    const plain = ribMesh({ width: 40, height: 8, depth: 1.6 });
    expect(ribMesh({ width: 40, height: 8, depth: 1.6, ribFootShape: "oval" }).positions).toEqual(plain.positions);
    expect(makeShapeFromAsset(rib, { x: 0, z: 0 }, { ribFoot: true }).ribFootShape).toBeUndefined();
  });

  it("is an ellipse under the straight rib, centred, the box as long as the foot and the rib inside it", () => {
    const length = 40 * STRETCH;
    const fields = { width: length, height: 8, depth: 4.8, ribFoot: true, ribThickness: 1.6, ribFootShape: "oval" as const };
    const size = ribSize(fields);
    expect(size.width).toBeCloseTo(40, 9);
    expect(size.foot).toEqual({ width: 4.8, thickness: 0.8, shape: "oval", length });
    for (const ribTop of ["flat", "round", "chamfer"] as const) {
      const mesh = ribMesh({ ...fields, ribTop });
      expect(closedParts(mesh), ribTop).toBe(1);
      // The rib as on the square foot, its lowest 0.8 mm traded for the ellipse's plate.
      const alone = ribMesh({ width: 40, height: 8, depth: 1.6, ribTop }).orient().volume();
      expect(mesh.volume(), ribTop).toBeCloseTo(alone - 40 * 1.6 * 0.8 + ovalArea(length / 2, 2.4) * 0.8, 6);
      const box = extent(mesh);
      [-length / 2, 0, -2.4].forEach((v, i) => expect(box.min[i], ribTop).toBeCloseTo(v, 6));
      [length / 2, 8, 2.4].forEach((v, i) => expect(box.max[i], ribTop).toBeCloseTo(v, 6));
    }
    // Cut short, and with a narrow foot kept long, the rib's ends still stand on it: the mesh closes round them.
    for (const depth of [4, 2.4]) {
      const mesh = ribMesh({ ...fields, depth, width: 60 });
      expect(closedParts(mesh), String(depth)).toBe(1);
      expect(mesh.volume()).toBeCloseTo((60 / ribOvalFootStretch(1.6, depth)) * 1.6 * 7.2 + ovalArea(30, depth / 2) * 0.8, 6);
    }
  });

  it("lies under a gusset as half an ellipse against its wall, reaching past its tip", () => {
    // A gusset 10 mm along the floor on the 4.8 mm foot: the half ellipse runs 13.42 mm from the wall.
    const length = 10 * STRETCH;
    const wall = -length / 2;
    const meets = wall + 0.6 + (11.2 / 11.4) * 9.4;
    const cases: Array<[number, Array<[number, number]>]> = [
      [0.8, [[wall, 0.8], [meets, 0.8], [wall + 0.6, 12], [wall, 12]]],
      [0.4, [[wall, 0.4], [wall + 10, 0.4], [wall + 10, 0.6], [wall + 0.6, 12], [wall, 12]]],
    ];
    for (const [footThickness, above] of cases) {
      const fields = { ribStyle: "gusset" as const, width: length, height: 12, depth: 4.8, ribFoot: true, ribThickness: 1.6, ribFootThickness: footThickness, ribFootShape: "oval" as const };
      expect(ribSize(fields).width).toBeCloseTo(10, 9);
      const mesh = ribMesh(fields);
      expect(closedParts(mesh), String(footThickness)).toBe(1);
      expect(mesh.volume(), String(footThickness)).toBeCloseTo(area(above) * 1.6 + ovalArea(length, 2.4, true) * footThickness, 6);
      // The box is the half ellipse's: from the wall to past the tip, as wide as the foot.
      const box = extent(mesh);
      [wall, 0, -2.4].forEach((v, i) => expect(box.min[i]).toBeCloseTo(v, 6));
      [length / 2, 12, 2.4].forEach((v, i) => expect(box.max[i]).toBeCloseTo(v, 6));
    }
  });

  it("keeps the rib as long as it was when the foot changes, and a gusset's wall where it stands", () => {
    const square = { width: 40, height: 8, depth: 4.8, ribFoot: true, ribThickness: 1.6 };
    // Square to oval and back: the box grows by the ellipse past the rib's ends, and shrinks to the rib again.
    const oval = { ...square, ribFootShape: "oval" as const };
    expect(ribLengthKeepingPatch(square, oval)).toEqual({ width: 53.67 });
    expect(ribLengthKeepingPatch({ ...oval, width: 53.67 }, square)).toEqual({ width: 40 });
    // A wider foot needs less of the ellipse, a thicker rib more; switched off, the box is the rib's length again.
    expect(ribLengthKeepingPatch({ ...oval, width: 53.67 }, { ...oval, width: 53.67, depth: 6.4 })).toEqual({ width: 46.19 });
    expect(ribLengthKeepingPatch({ ...oval, width: 53.67 }, { ...oval, width: 53.67, ribThickness: 2 })).toEqual({ width: 60 });
    expect(ribLengthKeepingPatch({ ...oval, width: 53.67 }, { ...oval, width: 53.67, ribFoot: false, depth: 1.6 })).toEqual({ width: 40 });
    // Switched on again with its shape kept oval, the ellipse comes back.
    expect(ribLengthKeepingPatch({ width: 40, height: 8, depth: 1.6, ribFootShape: "oval" }, oval)).toEqual({ width: 53.67 });
    // Square before and after: the width is the rib's, nothing to follow.
    expect(ribLengthKeepingPatch(square, { ...square, depth: 6 })).toEqual({});
    expect(ribBoxWidth(oval, 10)).toBe(13.42);
    expect(ribBoxWidth(square, 10)).toBe(10);
    // The gusset's box grows away from its wall: its middle moves half of that along the gusset, as it is turned.
    const plain = ribGussetWallKeepingPlace({ x: 10, z: 5, width: 10, rotation: 0 }, 13.42);
    expect(plain.x).toBeCloseTo(11.71, 9);
    expect(plain.z).toBe(5);
    expect(plain.elevation).toBeUndefined();
    const turned = ribGussetWallKeepingPlace({ x: 10, z: 5, width: 10, rotation: 90 }, 13.42);
    expect(turned.x).toBeCloseTo(10, 9);
    expect(turned.z).toBeCloseTo(5 - 1.71, 9);
    const mirrored = ribGussetWallKeepingPlace({ x: 10, z: 5, width: 10, rotation: 0, mirrorX: true }, 13.42);
    expect(mirrored.x).toBeCloseTo(8.29, 9);
    // Tipped onto its side about z, the box's middle rises with it.
    const tipped = ribGussetWallKeepingPlace({ x: 0, z: 0, elevation: 2, width: 10, rotation: 0, rotationZ: 90 }, 13.42);
    expect(tipped.x).toBeCloseTo(0, 9);
    expect(tipped.elevation).toBeCloseTo(3.71, 9);
  });

  it("comes out of the catalogue on its oval foot, closed, and keeps it through a saved design", async () => {
    const straight = makeShapeFromAsset(rib, { x: 0, z: 0 }, { ribFoot: true, ribFootShape: "oval" });
    // The new rib 40 mm long, its box the ellipse's 53.67.
    expect(straight).toMatchObject({ ribFoot: true, ribFootShape: "oval", ribThickness: 1.6, depth: 4.8, width: 53.67 });
    expect(ribSize({ ...straight, depth: straight.depth }).width).toBeCloseTo(40, 2);
    const gusset = makeShapeFromAsset(rib, { x: 30, z: 0 }, { ribFoot: true, ribFootShape: "oval", ribStyle: "gusset", width: 14, height: 10 });
    // A width asked for is the box's, as a depth asked for is the foot's width.
    expect(gusset).toMatchObject({ ribFootShape: "oval", width: 14, depth: 4.8 });
    for (const shape of [straight, gusset]) {
      const soup = soupOf(shape);
      expect(soup.boundaryEdges).toBe(0);
      expect(soup.nonManifoldEdges).toBe(0);
    }
    expect(normalizeShapeCustomizations({ rib: { ribFootShape: "oval" } }).rib).toMatchObject({ ribFootShape: "oval" });
    expect(normalizeShapeCustomizations({ rib: { ribFootShape: "round" } }).rib?.ribFootShape).toBeUndefined();
    const shapes = [{ ...straight, id: "straight" }, { ...gusset, id: "gusset" }] as WorkplaneShape[];
    const exported = await exportLylProject({
      projectId: "ribs", projectName: "Ribs", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = new Map((await importLylProject(exported)).shapes.map((shape) => [shape.id, shape]));
    expect(restored.get("straight")).toMatchObject({ ribFoot: true, ribFootShape: "oval", width: 53.67, depth: 4.8 });
    expect(restored.get("gusset")).toMatchObject({ ribFootShape: "oval", ribStyle: "gusset", width: 14 });
    // A shape the foot does not have is refused, as any other nonsense in a design file.
    const broken = [{ ...straight, id: "broken", ribFootShape: "round" }] as unknown as WorkplaneShape[];
    const brokenFile = await exportLylProject({
      projectId: "ribs", projectName: "Ribs", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: broken, history: [editorHistoryEntry(broken, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    await expect(importLylProject(brokenFile)).rejects.toThrow(/ribFootShape/);
    expect(sceneShape({ name: "Rib", kind: "rib", color: "#7b8794", width: 53.67, depth: 4.8, height: 8, ribFoot: true, ribFootShape: "oval" })).toMatchObject({ ribFootShape: "oval" });
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
