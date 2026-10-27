import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { meshForShape } from "@/lib/editorMeshCore";
import { mcpShapeSummary } from "@/lib/editorMcpSummary";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { makeShapeFromAsset, sceneShape, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import { normalizeVaseSettings, parseVaseSettingsInput, vaseSettingsChanges } from "@/lib/vaseSettings";
import { fittedVaseMesh, sceneWithVaseAccessories, vaseAccessories, vaseAccessoryShape, vaseNaturalFrame, vaseShapePatch, type VaseAccessoryKind } from "@/lib/vaseShape";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

const asset = toolbarShapeAssets.find((entry) => entry.kind === "vase");

function vase(settings: Record<string, unknown> = {}, frame: Partial<WorkplaneShape> = {}): WorkplaneShape {
  if (!asset) throw new Error("no vase in the catalogue");
  const shape = makeShapeFromAsset(asset, { x: 10, z: -20 });
  return canonicalizeShape({ ...shape, ...frame, vase: normalizeVaseSettings({ ...shape.vase, quality: "entwurf", ...settings }) });
}

function soupOf(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  return mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index]));
}

function bounds(soup: number[]) {
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < soup.length; i += 3) {
    box.minX = Math.min(box.minX, soup[i]); box.maxX = Math.max(box.maxX, soup[i]);
    box.minY = Math.min(box.minY, soup[i + 1]); box.maxY = Math.max(box.maxY, soup[i + 1]);
    box.minZ = Math.min(box.minZ, soup[i + 2]); box.maxZ = Math.max(box.maxZ, soup[i + 2]);
  }
  return box;
}

function volume(soup: number[]) {
  let v = 0;
  for (let i = 0; i < soup.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = soup.slice(i, i + 9);
    v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return v / 6;
}

describe("the vase as a shape", () => {
  it("comes from the catalogue as the vase tool's bottle, 90 by 180 mm, standing where it was put", () => {
    expect(asset).toBeDefined();
    const shape = vase();
    expect(shape.kind).toBe("vase");
    expect(shape.vase?.profile).toBe("flasche");
    expect([shape.width, shape.depth, shape.height]).toEqual([90, 90, 180]);
    const soup = soupOf(shape);
    const box = bounds(soup);
    expect(box.maxX - box.minX).toBeCloseTo(90, 3);
    expect(box.maxZ - box.minZ).toBeCloseTo(90, 3);
    expect(box.maxY - box.minY).toBeCloseTo(180, 3);
    expect((box.minX + box.maxX) / 2).toBeCloseTo(10, 3);
    expect((box.minZ + box.maxZ) / 2).toBeCloseTo(-20, 3);
    expect(box.minY).toBeCloseTo(0, 6);
    const analysis = analyzeTriangleSoup(soup);
    expect(analysis.boundaryEdges).toBe(0);
    expect(analysis.nonManifoldEdges).toBe(0);
    // Facing out: the enclosed volume is positive.
    expect(volume(soup)).toBeGreaterThan(0);
  });

  it("fills its frame: a smaller frame makes a smaller vase", () => {
    const shape = vase({}, { width: 60, depth: 60, size: 60, height: 120 });
    const box = bounds(soupOf(shape));
    expect(box.maxX - box.minX).toBeCloseTo(60, 3);
    expect(box.maxY - box.minY).toBeCloseTo(120, 3);
  });

  it("starts plain: a new vase has no pattern until one is chosen", () => {
    const shape = makeShapeFromAsset(asset!, { x: 0, z: 0 });
    expect(shape.vase?.effect).toBe("keine");
    // A vase saved with grooves keeps them.
    expect(normalizeVaseSettings({ ...shape.vase, effect: "rillen" }).effect).toBe("rillen");
  });

  it("builds a closed body with every pattern, solid or hollow", () => {
    for (const effect of ["keine", "rillen", "streifen", "voronoi", "lowpoly"]) {
      for (const body of ["voll", "hohl"]) {
        const soup = soupOf(vase({ effect, body }, { width: 50, depth: 50, size: 50, height: 80 }));
        const analysis = analyzeTriangleSoup(soup);
        expect(analysis.boundaryEdges, `${effect} ${body}`).toBe(0);
        expect(analysis.nonManifoldEdges, `${effect} ${body}`).toBe(0);
      }
    }
    // Ten whole vases, the Voronoi ones cut along their joints: more than the default 5 s when the suite runs in parallel.
  }, 30_000);

  it("stays closed with its bottom and wall features", () => {
    const variants: Array<[string, Record<string, unknown>]> = [
      ["drain holes and a hollow foot", { body: "hohl", drainHoles: 5, drainDiameter: 6, floorSlope: 1, footHeight: 12 }],
      ["recesses for feet", { body: "voll", rubberFeet: 4 }],
      ["an open Voronoi wall", { body: "hohl", effect: "keine", cutout: "voronoi", cutoutSize: 12 }],
      ["a honeycomb wall with whole holes", { body: "hohl", effect: "keine", cutout: "waben", cutoutEdge: "ganz" }],
      ["a hanging lampshade", { body: "hohl", effect: "keine", lamp: "haengend" }],
      ["a standing lampshade", { body: "hohl", effect: "keine", lamp: "stehend", footHeight: 20 }],
      ["ribs for vase mode", { body: "voll", effect: "keine", reinforce: "rippen", reinforceCount: 8 }],
      ["a double wall for vase mode", { body: "voll", effect: "keine", reinforce: "doppelwand", reinforceCount: 8 }],
      ["a cross-section that turns into a hexagon", { section2: "vieleck", section2Sides: 6, effect: "keine" }],
      ["winding grooves", { effect: "rillen", waveAmplitude: 4, waveCount: 3 }],
      ["no bottom", { body: "hohl", effect: "keine", bottom: 0 }],
      ["no bottom, with grooves and legs moulded on", { body: "hohl", effect: "rillen", bottom: 0, legMode: "angeformt" }],
    ];
    for (const [name, settings] of variants) {
      const analysis = analyzeTriangleSoup(soupOf(vase(settings, { width: 70, depth: 70, size: 70, height: 110 })));
      expect(analysis.boundaryEdges, name).toBe(0);
      expect(analysis.nonManifoldEdges, name).toBe(0);
    }
  });

  it("must hold water: wall and bottom at least 1.6 mm", () => {
    const settings = normalizeVaseSettings({ body: "hohl", wall: 0.8, bottom: 1, watertight: "ja" });
    expect(settings.wall).toBeGreaterThanOrEqual(1.6);
    expect(settings.bottom).toBeGreaterThanOrEqual(1.6);
  });

  it("can have no bottom: a tube open at both ends, for a bell or a mouthpiece", () => {
    expect(normalizeVaseSettings({ body: "hohl", bottom: 0 }).bottom).toBe(0);
    // Thinner than a layer pair is no bottom; from 0.2 mm on, at least 0.4 mm.
    expect(normalizeVaseSettings({ body: "hohl", bottom: 0.1 }).bottom).toBe(0);
    expect(normalizeVaseSettings({ body: "hohl", bottom: 0.3 }).bottom).toBe(0.4);
    // Holding water wins: it needs a bottom.
    expect(normalizeVaseSettings({ body: "hohl", bottom: 0, watertight: "ja" }).bottom).toBeGreaterThanOrEqual(1.6);
    // Looking down the axis: a vase with a bottom has it in the way, one without has nothing (its top is open too).
    const across = (soup: number[]) => {
      const box = bounds(soup);
      const [px, pz] = [(box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2];
      let count = 0;
      for (let i = 0; i < soup.length; i += 9) {
        const [ax, , az, bx, , bz, cx, , cz] = soup.slice(i, i + 9);
        const d1 = (px - bx) * (az - bz) - (ax - bx) * (pz - bz), d2 = (px - cx) * (bz - cz) - (bx - cx) * (pz - cz), d3 = (px - ax) * (cz - az) - (cx - ax) * (pz - az);
        if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) count += 1;
      }
      return count;
    };
    const frame = { width: 40, depth: 40, size: 40, height: 80 };
    const settings = { profile: "zylinder", effect: "keine", body: "hohl", wall: 2, footHeight: 10 };
    const floored = soupOf(vase({ ...settings, bottom: 2 }, frame));
    const open = soupOf(vase({ ...settings, bottom: 0 }, frame));
    expect(across(floored)).toBeGreaterThan(0);
    expect(across(open)).toBe(0);
    // Without the bottom and the hollow foot, only the wall is left.
    expect(volume(open)).toBeLessThan(volume(floored));
    expect(bounds(open).minY).toBeCloseTo(0, 6);
    expect(bounds(open).maxY - bounds(open).minY).toBeCloseTo(80, 3);
  });

  it("is solid for the slicer's vase mode, or hollow with a wall", () => {
    const solid = volume(soupOf(vase({ effect: "keine", body: "voll" })));
    const hollow = volume(soupOf(vase({ effect: "keine", body: "hohl", wall: 2, bottom: 2 })));
    expect(hollow).toBeGreaterThan(0);
    // A 2 mm wall round a 90 mm bottle is a small share of the solid body.
    expect(hollow / solid).toBeLessThan(0.25);
  });

  it("keeps a polygon's proportions: the frame follows the outline", () => {
    const shape = vase({ section: "vieleck", polySides: 6, polyRound: 0, effect: "keine" });
    const frame = vaseNaturalFrame(shape.vase, shape.width, shape.depth, shape.height);
    expect(Math.max(frame.width, frame.depth)).toBeCloseTo(90, 6);
    // A hexagon is narrower across its flats than across its corners.
    expect(Math.min(frame.width, frame.depth) / 90).toBeCloseTo(Math.cos(Math.PI / 6), 2);
    const patch = vaseShapePatch(shape, shape.vase!);
    const fitted = canonicalizeShape({ ...shape, ...patch });
    const box = bounds(soupOf(fitted));
    expect(box.maxX - box.minX).toBeCloseTo(patch.width, 3);
    expect(box.maxZ - box.minZ).toBeCloseTo(patch.depth, 3);
  });

  it("builds a vase once for drawing, bounds and export", () => {
    const shape = vase({ effect: "rillen" });
    expect(fittedVaseMesh(shape)).toBe(fittedVaseMesh({ ...shape }));
  });

  it("counts a change of its settings as a change of the shape, and keeps them on copy", () => {
    const shape = vase();
    expect(workplaneShapesEqual(shape, { ...shape, vase: normalizeVaseSettings({ ...shape.vase, twist: 45 }) })).toBe(false);
    expect(workplaneShapesEqual(shape, { ...shape, vase: normalizeVaseSettings({ ...shape.vase }) })).toBe(true);
    expect(sceneShape(shape).vase).toEqual(shape.vase);
  });

  it("tells an assistant what makes it this vase, and takes that back", () => {
    const shape = vase({ profile: "bauchig", section: "welle", sectionWaves: 12 });
    const reported = mcpShapeSummary(shape).settings?.vase;
    expect(typeof reported).toBe("string");
    const changes = parseVaseSettingsInput(reported);
    expect(changes).toEqual(vaseSettingsChanges(shape.vase));
    expect(changes).toMatchObject({ profile: "bauchig", section: "welle", sectionWaves: 12 });
    expect(changes).not.toHaveProperty("height");
    expect(parseVaseSettingsInput("not json")).toBeUndefined();
    expect(parseVaseSettingsInput([1, 2])).toBeUndefined();
  });

  it("keeps its settings through saving and opening the project", async () => {
    const shape = vase({ profile: "fass", twist: 30, body: "hohl", wall: 2.4 });
    const exported = await exportLylProject({
      projectId: "project-vase",
      projectName: "Vase",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [shape],
      history: [editorHistoryEntry([shape], [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const restored = (await importLylProject(exported)).shapes[0];
    expect(restored.kind).toBe("vase");
    expect(restored.vase).toEqual(shape.vase);
    expect(workplaneShapesEqual(restored, shape)).toBe(true);
  });

  it("stands on legs moulded on, the whole filling its frame", () => {
    const shape = vase({ effect: "keine", legMode: "angeformt", legCount: 3, legHeight: 15 });
    const soup = soupOf(shape);
    const box = bounds(soup);
    expect(box.maxY - box.minY).toBeCloseTo(180, 3);
    expect(box.minY).toBeCloseTo(0, 6);
    // Only the legs reach the bed: the bottom of the body is above it.
    const onBed = [];
    for (let i = 1; i < soup.length; i += 3) if (soup[i] < 1) onBed.push(soup[i - 1]);
    expect(onBed.length).toBeGreaterThan(0);
    // Each leg is closed on its own, and so is the body.
    const analysis = analyzeTriangleSoup(soup);
    expect(analysis.boundaryEdges).toBe(0);
    expect(analysis.nonManifoldEdges).toBe(0);
    expect(vaseAccessories(shape)).toEqual([]);
  });

  it("lays out every accessory as a closed part on the bed beside the vase", () => {
    const sets: Array<Record<string, unknown>> = [
      { body: "hohl", legMode: "stecken", legCount: 3, saucerMode: "schale", lidMode: "stuelp" },
      { body: "hohl", profile: "zylinder", legMode: "staender", insertMode: "bewaesserung", lidMode: "schraube" },
      { body: "hohl", profile: "zylinder", footHeight: 20, saucerMode: "versteckt", insertMode: "pflanze", lidMode: "schnapp" },
      { body: "hohl", insertMode: "stecker" },
      { body: "hohl", insertMode: "roehrchen" },
    ];
    const kinds = new Set<VaseAccessoryKind>();
    for (const settings of sets) {
      const shape = vase({ effect: "keine", ...settings }, { x: 0, z: 0 });
      const vaseBox = bounds(soupOf(shape));
      const accessories = vaseAccessories(shape);
      expect(accessories.length, JSON.stringify(settings)).toBeGreaterThan(0);
      for (const accessory of accessories) {
        kinds.add(accessory.kind);
        const name = `${accessory.kind} ${JSON.stringify(settings)}`;
        const analysis = analyzeTriangleSoup(accessory.positions);
        expect(analysis.boundaryEdges, name).toBe(0);
        expect(analysis.nonManifoldEdges, name).toBe(0);
        expect(volume(accessory.positions), name).toBeGreaterThan(0);
        const box = bounds(accessory.positions);
        expect(box.minY, name).toBeCloseTo(0, 3);
        expect(box.minX, name).toBeGreaterThan(vaseBox.maxX);
      }
    }
    expect([...kinds].sort()).toEqual(["frog", "hiddenSaucer", "leg", "lid", "plantInsert", "saucer", "stand", "tube", "wateringInsert"]);
  });

  it("makes each accessory an object of its own that remembers its vase", () => {
    const shape = vase({ effect: "keine", body: "hohl", lidMode: "stuelp" }, { elevation: 5 });
    const [lid] = vaseAccessories(shape);
    expect(lid.kind).toBe("lid");
    const part = vaseAccessoryShape(shape, lid, "Deckel");
    expect(part.kind).toBe("mesh");
    expect(part.vasePartOf).toBe(shape.id);
    expect(part.color).toBe(shape.color);
    const soup = soupOf(part);
    const analysis = analyzeTriangleSoup(soup);
    expect(analysis.boundaryEdges).toBe(0);
    expect(analysis.nonManifoldEdges).toBe(0);
    // Where it was laid out, beside the vase where it stands.
    const laid = bounds(lid.positions);
    const box = bounds(soup);
    expect(box.minX).toBeCloseTo(laid.minX + 10, 2);
    expect(box.maxZ).toBeCloseTo(laid.maxZ - 20, 2);
    expect(box.minY).toBeCloseTo(5, 3);
    expect(sceneShape(part).vasePartOf).toBe(shape.id);
    expect(workplaneShapesEqual(part, { ...part, vasePartOf: undefined })).toBe(false);
  });

  it("lays its accessories out anew, the ones from before giving way", () => {
    const shape = vase({ effect: "keine", body: "hohl", lidMode: "stuelp", saucerMode: "schale" });
    const other = vase({}, { id: "other-vase", x: -200 });
    const name = () => "part";
    const first = sceneWithVaseAccessories([shape, other], shape.id, name);
    expect(first.parts).toHaveLength(2);
    expect(first.shapes).toHaveLength(4);
    const changed = { ...shape, vase: normalizeVaseSettings({ ...shape.vase, saucerMode: "keine" }) };
    const scene = first.shapes.map((entry) => entry.id === shape.id ? changed : entry);
    const second = sceneWithVaseAccessories(scene, shape.id, name);
    expect(second.parts).toHaveLength(1);
    expect(second.shapes.map((entry) => entry.id)).toEqual([shape.id, "other-vase", second.parts[0].id]);
    expect(first.missing).toEqual([]);
    const none = [vase({ effect: "keine" })];
    expect(sceneWithVaseAccessories(none, none[0].id, name)).toEqual({ shapes: none, parts: [], missing: [] });
  });

  it("says which accessories do not fit, instead of leaving them out silently", () => {
    // The bottle's neck is too narrow for an insert with a water store; the lid is made.
    const bottle = vase({ effect: "keine", body: "hohl", insertMode: "bewaesserung", lidMode: "stuelp" });
    const result = sceneWithVaseAccessories([bottle], bottle.id, () => "part");
    expect(result.parts.map((part) => part.vasePartOf)).toEqual([bottle.id]);
    expect(result.missing).toEqual(["wateringInsert"]);
  });
});
