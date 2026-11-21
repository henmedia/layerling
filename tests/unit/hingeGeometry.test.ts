import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { hingePartScope, hingeWorldParts } from "@/lib/hingeParts";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";
import { automaticSideCount } from "@/lib/roundSideCount";
import { hingeLeaves, minimumHingeDepth, normalizeHingeAngle, normalizeHingeNutWidth, normalizeHingeScrewHead, hingeSections, hingeConeRadius, hingeKnucklesForWidth, normalizeHingeStyle, hingeLocalParts, hingePlan, hingeTriangles, normalizeHingeKnuckleWidth, normalizeHingeKnuckles, normalizeHingeLeafThickness, normalizeHingePinDiameter, normalizeHingeSnapGrip } from "@/lib/hingeGeometry";

type V = [number, number, number];

function weld(triangles: V[][]) {
  const ids = new Map<string, number>();
  const id = (v: V) => {
    const key = v.map((n) => Math.round(n * 1e5)).join(",");
    if (!ids.has(key)) ids.set(key, ids.size);
    return ids.get(key)!;
  };
  return triangles.map((t) => t.map(id) as [number, number, number]);
}

/** Every directed edge appears once and its reverse once: closed, consistently wound, two-manifold. */
function edgeProblems(triangles: V[][]) {
  const faces = weld(triangles);
  const directed = new Map<string, number>();
  faces.forEach(([a, b, c]) => {
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      if (p === q) continue;
      const key = `${p}>${q}`;
      directed.set(key, (directed.get(key) ?? 0) + 1);
    }
  });
  let problems = 0;
  directed.forEach((count, key) => {
    const [p, q] = key.split(">");
    if (count !== 1 || directed.get(`${q}>${p}`) !== 1) problems += 1;
  });
  return problems;
}

function signedVolume(triangles: V[][]) {
  return triangles.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
}

function components(triangles: V[][]) {
  const faces = weld(triangles);
  const parent = new Map<number, number>();
  const find = (x: number): number => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  faces.forEach(([a, b, c]) => { parent.set(find(b), find(a)); parent.set(find(c), find(a)); });
  return new Set(faces.map(([a]) => find(a))).size;
}

const shape = { width: 40, depth: 40, height: 8 };

describe("hinge geometry", () => {
  it("is closed, wound outwards and in two separate parts", () => {
    const triangles = hingeTriangles(shape);
    expect(edgeProblems(triangles)).toBe(0);
    expect(signedVolume(triangles)).toBeGreaterThan(0);
    expect(components(triangles)).toBe(2);
  });

  it("stays closed for other sizes, counts and settings", () => {
    for (const fields of [
      { width: 25, depth: 30, height: 6, hingeKnuckles: 3 },
      { width: 80, depth: 60, height: 12, hingeKnuckles: 9, hingePinDiameter: 5, hingeLeafThickness: 3, hingeClearance: 0.25 },
      { width: 40, depth: 40, height: 8, hingeClearance: 1, sides: 24 },
    ]) {
      const triangles = hingeTriangles(fields);
      expect(edgeProblems(triangles)).toBe(0);
      expect(signedVolume(triangles)).toBeGreaterThan(0);
      expect(components(triangles)).toBe(2);
    }
  });

  it("without the pin the bore runs through every knuckle: closed, two parts, less material, tubes instead of the pin", () => {
    for (const fields of [{ width: 40, depth: 40, height: 8 }, { width: 80, depth: 60, height: 12, hingeKnuckles: 9, hingePinDiameter: 5, hingeLeafThickness: 3 }]) {
      const pinless = hingeTriangles({ ...fields, hingePinless: true });
      expect(edgeProblems(pinless)).toBe(0);
      expect(signedVolume(pinless)).toBeGreaterThan(0);
      expect(components(pinless)).toBe(2);
      expect(signedVolume(pinless)).toBeLessThan(signedVolume(hingeTriangles(fields)));
      const parts = hingeLocalParts({ ...fields, hingePinless: true });
      const plan = hingePlan({ ...fields, hingePinless: true });
      // no pin cylinder along the whole width, and A's knuckles are tubes like B's
      expect(parts.filter((part) => part.kind === "cylinder")).toHaveLength(0);
      expect(parts.filter((part) => part.kind === "tube")).toHaveLength(plan.knuckles);
    }
  });

  it("fills its frame: width along the axis, both leaves across, the knuckle as height", () => {
    const points = hingeTriangles(shape).flat();
    const range = (i: number) => [Math.min(...points.map((p) => p[i])), Math.max(...points.map((p) => p[i]))];
    expect(range(0)).toEqual([-20, 20]);
    expect(range(1)[0]).toBeCloseTo(0, 6);
    expect(range(1)[1]).toBeCloseTo(8, 1);
    expect(range(2)).toEqual([-20, 20]);
  });

  it("keeps the clearance between the parts", () => {
    const plan = hingePlan(shape);
    // B's bore is wider than the pin by the clearance, the knuckles keep a gap of it.
    expect(plan.boreRadius - plan.pinRadius).toBeCloseTo(0.4, 9);
    plan.segments.slice(1).forEach((segment, i) => expect(segment.x0 - plan.segments[i].x1).toBeCloseTo(0.4, 9));
    // A leaf's top corner, its closest point to the other part's round knuckle, keeps the clearance.
    expect(Math.hypot(plan.leafStart, plan.radius - plan.leaf) - plan.radius).toBeCloseTo(0.4, 9);
    // So does every point of the display mesh's knuckles: the nearest leaf corner is that far away.
    const corner = { u: -plan.leafStart, v: plan.leaf };
    const bKnuckle = hingeTriangles(shape).flat().filter(([x, y, z]) => Math.abs(x - plan.segments[1].x0) < 1e-6 && z < 0 && y > 0);
    expect(bKnuckle.length).toBeGreaterThan(10);
    const closest = Math.min(...bKnuckle.map(([, y, z]) => Math.hypot(z - corner.u, y - corner.v)));
    expect(closest).toBeGreaterThanOrEqual(0.4 - 1e-6);
    // And stays below B's bore.
    expect(plan.leaf).toBeLessThanOrEqual(plan.radius - plan.boreRadius + 1e-9);
    expect(plan.segments.map((segment) => segment.owner)).toEqual(["a", "b", "a", "b", "a"]);
  });

  it("keeps the settings printable", () => {
    expect(normalizeHingeKnuckles(4)).toBe(5);
    expect(normalizeHingeKnuckles(15, 10, 0.4)).toBeLessThan(15);
    expect(normalizeHingePinDiameter(20, 8)).toBeLessThan(8);
    expect(normalizeHingeLeafThickness(10, 8, 3, 0.4)).toBeCloseTo(4 - 1.5 - 0.4, 9);
  });

  it("splits into parts the CAD kernel knows, covering the frame", () => {
    const parts = hingeLocalParts(shape);
    expect(new Set(parts.map((part) => part.kind))).toEqual(new Set(["box", "cylinder", "tube"]));
    expect(parts.filter((part) => part.kind === "tube")).toHaveLength(2);
    expect(parts.filter((part) => part.kind === "cylinder")).toHaveLength(4);
  });

  it.each([30, 90, 180])("folds part B up by %i degrees about the pin without changing the bodies (#699)", (hingeAngle) => {
    const flat = hingeTriangles(shape);
    const folded = hingeTriangles({ ...shape, hingeAngle });
    expect(edgeProblems(folded)).toBe(0);
    expect(components(folded)).toBe(2);
    expect(signedVolume(folded)).toBeCloseTo(signedVolume(flat), 6);
    const plan = hingePlan(shape);
    const top = Math.max(...folded.flat().map(([, y]) => y));
    expect(top).toBeGreaterThanOrEqual(plan.height - 1e-6);
    if (hingeAngle === 90) expect(top).toBeCloseTo(plan.radius + plan.depth / 2, 6);
  });

  it("places B's exact boxes where the folded display mesh has its leaf (#699), raised or not, folded either way", () => {
    for (const hingeLeafStyle of ["plate", "raised"]) for (const hingeAngle of [-90, 0, 45, 90, 135, 180]) {
      const fields = { ...shape, hingeLeafStyle, hingeAngle };
      const mesh = hingeTriangles(fields).flat();
      const corners: V[] = [];
      hingeLocalParts(fields).filter((part) => part.kind === "box").forEach((part) => {
        const turn = ((part.rotationX ?? 0) * Math.PI) / 180;
        const cy = (part.elevation ?? 0) + part.height / 2;
        for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) {
          const y = dy * part.height;
          const z = dz * (part.depth ?? 0);
          // Three's rotation about x by `turn`: y' = y cos - z sin, z' = y sin + z cos.
          corners.push([(part.x) + dx * part.width, cy + y * Math.cos(turn) - z * Math.sin(turn), (part.z ?? 0) + y * Math.sin(turn) + z * Math.cos(turn)]);
        }
      });
      // The knuckles' square, which the round tubes and the pin stay inside.
      for (const y of [0, shape.height]) for (const z of [-shape.height / 2, shape.height / 2]) corners.push([0, y, z]);
      for (const axis of [1, 2]) {
        expect(Math.max(...corners.map((c) => c[axis]))).toBeCloseTo(Math.max(...mesh.map((v) => v[axis])), 3);
        expect(Math.min(...corners.map((c) => c[axis]))).toBeCloseTo(Math.min(...mesh.map((v) => v[axis])), 3);
      }
    }
  });

  it("keeps the folded boxes in the world where the turned hinge's display mesh is (#699)", () => {
    const hinge = { id: "h", name: "H", kind: "hinge", color: "#fff", x: 12, z: -7, elevation: 3, size: 40, ...shape, rotation: 30, rotationX: 20, rotationZ: 15, hingeAngle: 70 } as never as Parameters<typeof hingeWorldParts>[0];
    const centerY = shape.height / 2;
    const turn = new THREE.Euler(THREE.MathUtils.degToRad(20), THREE.MathUtils.degToRad(30), THREE.MathUtils.degToRad(15), "XYZ");
    const matrix = new THREE.Matrix4().makeTranslation(12, 3 + centerY, -7).multiply(new THREE.Matrix4().makeRotationFromEuler(turn)).multiply(new THREE.Matrix4().makeTranslation(0, -centerY, 0));
    const mesh = hingeTriangles({ ...shape, hingeAngle: 70 }).flat().map(([x, y, z]) => new THREE.Vector3(x, y, z).applyMatrix4(matrix));
    const corners: THREE.Vector3[] = [];
    hingeWorldParts(hinge).filter((part) => part.kind === "box").forEach((part) => {
      const box = new THREE.Matrix4()
        .makeTranslation(part.x, (part.elevation ?? 0) + part.height / 2, part.z)
        .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(part.rotationX ?? 0), THREE.MathUtils.degToRad(part.rotation), THREE.MathUtils.degToRad(part.rotationZ ?? 0), "XYZ")));
      for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) corners.push(new THREE.Vector3(dx * part.width, dy * part.height, dz * (part.depth ?? 0)).applyMatrix4(box));
    });
    // The round knuckles, which the boxes do not cover.
    for (let k = 0; k < 720; k += 1) for (const x of [-shape.width / 2, shape.width / 2]) corners.push(new THREE.Vector3(x, centerY + centerY * Math.sin((k * Math.PI) / 360), centerY * Math.cos((k * Math.PI) / 360)).applyMatrix4(matrix));
    const range = (points: THREE.Vector3[], axis: "x" | "y" | "z") => [Math.min(...points.map((p) => p[axis])), Math.max(...points.map((p) => p[axis]))];
    for (const axis of ["y", "z"] as const) {
      expect(range(corners, axis)[0]).toBeCloseTo(range(mesh, axis)[0], 1);
      expect(range(corners, axis)[1]).toBeCloseTo(range(mesh, axis)[1], 1);
    }
  });
});

describe("a knuckle width instead of a count (#907)", () => {
  it("takes the fewest odd knuckles that are not wider than asked", () => {
    // 40 mm with 0.4 mm gaps: 3 knuckles are 13.07 wide, 5 are 7.68, 7 are 5.37, 9 are 4.09.
    expect(hingeKnucklesForWidth(40, 14)).toBe(3);
    expect(hingeKnucklesForWidth(40, 8)).toBe(5);
    expect(hingeKnucklesForWidth(40, 5.4)).toBe(7);
    expect(hingeKnucklesForWidth(40, 5.3)).toBe(9);
  });

  it("follows the length of the hinge", () => {
    expect(hingeKnucklesForWidth(80, 8)).toBe(11);
    expect(hingePlan({ width: 80, height: 8, hingeKnuckleWidth: 8 }).knuckles).toBe(11);
    expect(hingePlan({ width: 40, height: 8, hingeKnuckleWidth: 8 }).knuckles).toBe(5);
  });

  it("reaches 31 knuckles and no further, and never one shorter than 1 mm", () => {
    expect(hingeKnucklesForWidth(300, 1)).toBe(31);
    expect(hingePlan({ width: 20, height: 8, hingeKnuckleWidth: 1 }).knuckleLength).toBeGreaterThanOrEqual(1);
  });

  it("leaves the count to hingeKnuckles without a width, and a width below 1 counts as 1", () => {
    expect(hingePlan({ width: 40, height: 8, hingeKnuckles: 7 }).knuckles).toBe(7);
    expect(hingePlan({ width: 40, height: 8, hingeKnuckles: 7, hingeKnuckleWidth: 0 }).knuckles).toBe(7);
    expect(normalizeHingeKnuckleWidth(0)).toBeUndefined();
    expect(normalizeHingeKnuckleWidth(-3)).toBeUndefined();
    expect(normalizeHingeKnuckleWidth(0.4)).toBe(1);
    expect(normalizeHingeKnuckleWidth(6)).toBe(6);
  });

  it("builds a closed body with the computed count", () => {
    const triangles = hingeTriangles({ width: 40, height: 8, hingeKnuckleWidth: 5.4 });
    expect(edgeProblems(triangles)).toBe(0);
    expect(hingePlan({ width: 40, height: 8, hingeKnuckleWidth: 5.4 }).knuckles).toBe(7);
  });
});

describe("the cone hinge (#907)", () => {
  const cases = [
    { width: 40, height: 8, hingeStyle: "cone" },
    { width: 40, height: 8, hingeStyle: "cone", hingeAngle: 90 },
    { width: 60, depth: 50, height: 10, hingeStyle: "cone", hingeKnuckles: 7, hingeClearance: 0.3, sides: 24 },
    { width: 30, height: 6, hingeStyle: "cone", hingeKnuckleWidth: 5 },
    { width: 15, height: 12, hingeStyle: "cone", hingeKnuckles: 15 },
  ];

  it("is a closed, consistently wound body in every case", () => {
    cases.forEach((shape) => expect(edgeProblems(hingeTriangles(shape)), JSON.stringify(shape)).toBe(0));
  });

  it("has no pin and no bore, only cones and recesses", () => {
    const plain = JSON.stringify(hingeTriangles({ width: 40, height: 8 }));
    const coned = JSON.stringify(hingeTriangles({ width: 40, height: 8, hingeStyle: "cone" }));
    expect(coned).not.toBe(plain);
    const plan = hingePlan({ width: 40, height: 8, hingeStyle: "cone" });
    expect(plan.style).toBe("cone");
    expect(plan.coneRadius).toBeGreaterThan(0.7);
    expect(plan.recessRadius).toBeGreaterThan(plan.coneRadius - plan.clearance);
  });

  it("keeps a thin wall between the two recesses of a knuckle and the clearance to the cone", () => {
    cases.forEach((shape) => {
      const plan = hingePlan(shape);
      expect(plan.knuckleLength - 2 * plan.recessDepth, JSON.stringify(shape)).toBeGreaterThanOrEqual(0.39);
      // The cone's point stays short of the recess's by the radial gap.
      expect(plan.recessDepth + plan.clearance - plan.coneRadius).toBeGreaterThan(0);
    });
  });

  it("makes fewer knuckles when they are too short for a cone", () => {
    const plan = hingePlan({ width: 15, height: 12, hingeStyle: "cone", hingeKnuckles: 15 });
    expect(plan.knuckles).toBeLessThan(15);
    expect(hingeConeRadius(plan.knuckleLength, 12, plan.clearance)).toBeGreaterThanOrEqual(0.8);
  });

  it("is the pin hinge when the style is anything else", () => {
    expect(hingePlan({ width: 40, height: 8, hingeStyle: "other" }).style).toBe("pin");
    expect(hingeTriangles({ width: 40, height: 8, hingeStyle: "other" }).length).toBe(hingeTriangles({ width: 40, height: 8 }).length);
  });
});

describe("the cone hinge, second round (#907)", () => {
  it("lets the leaf be as thick as the whole knuckle, and the body stays closed", () => {
    const flush = { width: 40, height: 6, hingeStyle: "cone", hingeLeafThickness: 6 };
    expect(hingePlan(flush).leaf).toBe(6);
    expect(edgeProblems(hingeTriangles(flush))).toBe(0);
    const thick = { width: 40, height: 6, hingeStyle: "cone", hingeLeafThickness: 4.5, hingeAngle: 60 };
    expect(hingePlan(thick).leaf).toBe(4.5);
    expect(edgeProblems(hingeTriangles(thick))).toBe(0);
    // The pin hinge keeps its limit: the leaf stays below the bore.
    expect(hingePlan({ width: 40, height: 6, hingeLeafThickness: 6 }).leaf).toBeLessThan(2);
  });

  it("keeps the clearance to the other part's knuckle with a thick leaf", () => {
    const plan = hingePlan({ width: 40, height: 6, hingeStyle: "cone", hingeLeafThickness: 6 });
    // A leaf thicker than the radius ends the clearance away from the knuckle's side, level with the axis.
    expect(plan.leafStart).toBeCloseTo(plan.radius + plan.clearance, 6);
  });

  it("takes a cone diameter, never larger than fits", () => {
    const largest = hingePlan({ width: 40, height: 8, hingeStyle: "cone" }).coneRadius;
    expect(hingePlan({ width: 40, height: 8, hingeStyle: "cone", hingeConeSize: 3 }).coneRadius).toBeCloseTo(1.5, 6);
    expect(hingePlan({ width: 40, height: 8, hingeStyle: "cone", hingeConeSize: 99 }).coneRadius).toBeCloseTo(largest, 6);
    expect(largest).toBeGreaterThan(2.4);
    expect(edgeProblems(hingeTriangles({ width: 40, height: 8, hingeStyle: "cone", hingeConeSize: 3 }))).toBe(0);
  });

  it("has the pin, the bore for a pin of one's own and the cones as one choice of style", () => {
    expect(normalizeHingeStyle(undefined)).toBe("pin");
    expect(normalizeHingeStyle("pinless")).toBe("pinless");
    expect(normalizeHingeStyle("cone")).toBe("cone");
    // A design saved with the old switch keeps its bore; an explicit style wins.
    expect(normalizeHingeStyle(undefined, true)).toBe("pinless");
    expect(normalizeHingeStyle("pin", true)).toBe("pin");
    expect(hingePlan({ width: 40, height: 8, hingePinless: true }).pinless).toBe(true);
    expect(hingePlan({ width: 40, height: 8, hingeStyle: "pinless" }).pinless).toBe(true);
    expect(hingePlan({ width: 40, height: 8, hingeStyle: "cone", hingePinless: true }).pinless).toBe(false);
  });
});

describe("the two parts keep the clearance apart in every section (#907)", () => {
  type Pt = { u: number; v: number };
  const segDist = (p: Pt, q: Pt, r: Pt, s: Pt) => {
    const pointToSeg = (a: Pt, b: Pt, c: Pt) => {
      const dx = c.u - b.u; const dy = c.v - b.v;
      const l = dx * dx + dy * dy;
      const k = l === 0 ? 0 : Math.max(0, Math.min(1, ((a.u - b.u) * dx + (a.v - b.v) * dy) / l));
      return Math.hypot(a.u - (b.u + k * dx), a.v - (b.v + k * dy));
    };
    return Math.min(pointToSeg(p, r, s), pointToSeg(q, r, s), pointToSeg(r, p, q), pointToSeg(s, p, q));
  };
  const gap = (a: Pt[], b: Pt[]) => {
    let best = Infinity;
    for (let i = 0; i < a.length; i += 1) for (let j = 0; j < b.length; j += 1) best = Math.min(best, segDist(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length]));
    return best;
  };
  const cases = [
    { width: 40, height: 8 },
    { width: 40, height: 8, hingeLeafThickness: 3 },
    { width: 40, height: 6, hingeStyle: "cone", hingeLeafThickness: 3 },
    { width: 40, height: 6, hingeStyle: "cone", hingeLeafThickness: 4.5 },
    { width: 40, height: 6, hingeStyle: "cone", hingeLeafThickness: 6 },
    { width: 40, height: 2, hingeStyle: "cone", hingeLeafThickness: 2 },
    { width: 40, height: 12, hingeStyle: "cone", hingeLeafThickness: 12, hingeClearance: 0.6 },
    { width: 40, height: 6, hingePinDiameter: 3, hingeLeafThickness: 1.1, hingeLeafStyle: "raised" },
    { width: 40, height: 6, hingeStyle: "cone", hingeLeafThickness: 1.1, hingeLeafStyle: "raised" },
    { width: 40, height: 6, hingeStyle: "cone", hingeLeafThickness: 6, hingeLeafStyle: "raised" },
    { width: 40, height: 8, hingeLeafStyle: "raised" },
    { width: 40, height: 12, hingePinDiameter: 4, hingeLeafThickness: 3, hingeClearance: 0.25, hingeLeafStyle: "raised" },
  ];
  it("holds the clearance between A's and B's sections", () => {
    cases.forEach((shape) => {
      const plan = hingePlan(shape);
      const s = hingeSections(plan);
      const clearance = plan.clearance;
      // Where A's knuckle stands, B shows its leaf; where B's knuckle stands, A shows its leaf strip.
      expect(gap(s.aFull, s.bLeaf), JSON.stringify(shape)).toBeGreaterThanOrEqual(clearance - 1e-6);
      expect(gap(s.bFull, s.aLeaf), JSON.stringify(shape)).toBeGreaterThanOrEqual(clearance - 1e-6);
    });
  });
});

describe("screw holes and rounded corners in the leaves", () => {
  const polygonArea = (r: number, sides: number) => (sides / 2) * r * r * Math.sin((2 * Math.PI) / sides);

  it("stays closed, wound outwards and in two parts with holes and corners in every style and fold", () => {
    for (const fields of [
      { ...shape, hingeScrewHoles: 2 },
      { ...shape, hingeScrewHoles: 3, hingeScrewCountersink: false },
      { ...shape, hingeCornerRadius: 4 },
      { ...shape, hingeCornerRadius: 50 },
      { ...shape, hingeScrewHoles: 2, hingeCornerRadius: 6, hingeAngle: 90 },
      { ...shape, hingeScrewHoles: 2, hingeCornerRadius: 3, hingeStyle: "cone", hingeAngle: 45 },
      { ...shape, hingeScrewHoles: 1, hingeStyle: "cone", hingeLeafThickness: 8 },
      { ...shape, hingeScrewHoles: 2, hingeStyle: "pinless", hingeAngle: 180 },
      { width: 80, depth: 60, height: 12, hingeKnuckles: 9, hingePinDiameter: 5, hingeLeafThickness: 3, hingeScrewHoles: 4, hingeScrewDiameter: 4.5, hingeScrewSpacing: 18, hingeScrewAcross: 40, hingeCornerRadius: 5 },
      { width: 25, depth: 30, height: 6, hingeKnuckles: 3, hingeScrewHoles: 6, hingeCornerRadius: 2, sides: 24 },
    ]) {
      const triangles = hingeTriangles(fields);
      expect(edgeProblems(triangles), JSON.stringify(fields)).toBe(0);
      expect(signedVolume(triangles)).toBeGreaterThan(0);
      expect(components(triangles)).toBe(2);
    }
  });

  it("takes out exactly the straight holes: their area times the leaf, in both leaves", () => {
    const plain = signedVolume(hingeTriangles(shape));
    const fields = { ...shape, hingeScrewHoles: 2, hingeScrewCountersink: false };
    const plan = hingePlan(fields);
    expect(plan.screwXs).toHaveLength(2);
    expect(plan.screwSink).toBe(0);
    const sides = automaticSideCount(2 * plan.screwRadius, 2 * plan.screwRadius);
    expect(plain - signedVolume(hingeTriangles(fields))).toBeCloseTo(2 * 2 * polygonArea(plan.screwRadius, sides) * plan.leaf, 6);
  });

  it("countersinks at 90 degrees on top, leaving some straight hole below", () => {
    const plain = signedVolume(hingeTriangles(shape));
    const fields = { ...shape, hingeScrewHoles: 3 };
    const plan = hingePlan(fields);
    // 3.5 mm holes in a 2 mm leaf: a full head of twice the hole's diameter; in a thinner leaf the cone stops 0.2 mm above the bottom.
    expect(plan.screwSink).toBeCloseTo(plan.screwRadius, 9);
    expect(hingePlan({ ...fields, hingeLeafThickness: 1.5 }).screwSink).toBeCloseTo(1.3, 9);
    expect(plan.screwHeadRadius - plan.screwRadius).toBeCloseTo(plan.screwSink, 9);
    const sides = automaticSideCount(2 * plan.screwHeadRadius, 2 * plan.screwHeadRadius);
    const shaft = polygonArea(plan.screwRadius, sides);
    const head = polygonArea(plan.screwHeadRadius, sides);
    const hole = shaft * (plan.leaf - plan.screwSink) + (plan.screwSink / 3) * (shaft + head + Math.sqrt(shaft * head));
    expect(plain - signedVolume(hingeTriangles(fields))).toBeCloseTo(2 * 3 * hole, 6);
    // In a thin leaf a countersink too shallow to take a head is left out.
    expect(hingePlan({ ...fields, hingeLeafThickness: 0.4, hingeScrewDiameter: 6 }).screwSink).toBe(0);
  });

  it("spreads the holes evenly by default and keeps them on the leaf, clear of the knuckles", () => {
    const plan = hingePlan({ ...shape, hingeScrewHoles: 2 });
    expect(plan.screwXs[0]).toBeCloseTo(-10, 9);
    expect(plan.screwXs[1]).toBeCloseTo(10, 9);
    // In the middle of the leaf beside the knuckles, with half a millimetre to spare each way.
    expect(plan.screwZ - plan.screwHeadRadius).toBeGreaterThanOrEqual(plan.leafStart + 0.5 - 1e-9);
    expect(plan.screwZ + plan.screwHeadRadius).toBeLessThanOrEqual(plan.depth / 2 - 0.5 + 1e-9);
  });

  it("takes a spacing along and a distance across, within the leaf", () => {
    const plan = hingePlan({ ...shape, hingeScrewHoles: 3, hingeScrewSpacing: 12, hingeScrewAcross: 30 });
    expect(plan.screwXs.map((x) => Math.round(x * 1e6) / 1e6)).toEqual([-12, 0, 12]);
    expect(plan.screwZ).toBeCloseTo(15, 9);
    // Too far apart or out past the edge: pulled in until they fit.
    const wide = hingePlan({ ...shape, hingeScrewHoles: 2, hingeScrewSpacing: 100, hingeScrewAcross: 100 });
    expect(wide.screwXs[1] + wide.screwHeadRadius).toBeLessThanOrEqual(20 - 0.5 + 1e-9);
    expect(wide.screwZ + wide.screwHeadRadius).toBeLessThanOrEqual(20 - 0.5 + 1e-9);
  });

  it("makes fewer holes where fewer fit, and none on a leaf too small for one", () => {
    const crowded = hingePlan({ ...shape, width: 20, hingeScrewHoles: 6 });
    expect(crowded.screwXs.length).toBeLessThan(6);
    expect(crowded.screwXs.length).toBeGreaterThan(0);
    crowded.screwXs.slice(1).forEach((x, i) => expect(x - crowded.screwXs[i]).toBeGreaterThanOrEqual(2 * crowded.screwHeadRadius + 0.5 - 1e-9));
    expect(hingePlan({ ...shape, depth: 16, hingeScrewHoles: 2 }).screwXs).toEqual([]);
  });

  it("keeps a hole clear of a rounded corner", () => {
    const plan = hingePlan({ ...shape, hingeScrewHoles: 2, hingeCornerRadius: 12, hingeScrewAcross: 34 });
    const r = plan.cornerRadius;
    const arc = { x: plan.width / 2 - r, w: plan.depth / 2 - r };
    const x = plan.screwXs[1];
    expect(r).toBe(12);
    expect(r - Math.hypot(x - arc.x, plan.screwZ - arc.w)).toBeGreaterThanOrEqual(plan.screwHeadRadius + 0.5 - 1e-6);
  });

  it("rounds no more than the leaf beside the knuckles is deep", () => {
    const plan = hingePlan({ ...shape, hingeCornerRadius: 100 });
    expect(plan.cornerRadius).toBeCloseTo(Math.min(plan.depth / 2 - plan.leafStart, plan.width / 2) - 0.05, 9);
    expect(hingePlan(shape).cornerRadius).toBe(0);
  });

  it("builds the exact leaf of two boxes and two corner cylinders, the holes as cutters", () => {
    const fields = { ...shape, hingeScrewHoles: 2, hingeCornerRadius: 4 };
    const parts = hingeLocalParts(fields);
    const plan = hingePlan(fields);
    const corners = parts.filter((part) => part.kind === "cylinder" && part.rotationZ === undefined && !part.hole);
    expect(corners).toHaveLength(4);
    corners.forEach((part) => {
      expect(part.width).toBeCloseTo(8, 9);
      expect(part.height).toBeCloseTo(plan.leaf, 9);
    });
    const holes = parts.filter((part) => part.hole);
    expect(holes).toHaveLength(4);
    holes.forEach((part) => {
      expect(part.kind).toBe("countersink");
      expect(part.screwHoleShaft).toBeCloseTo(3.5, 9);
      // Reaching past both faces: the head's cone meets the top at the head's diameter.
      expect(part.elevation).toBeLessThan(0);
      expect((part.elevation ?? 0) + part.height).toBeGreaterThan(plan.leaf);
    });
    // Straight holes are cylinders.
    expect(hingeLocalParts({ ...fields, hingeScrewCountersink: false }).filter((part) => part.hole).every((part) => part.kind === "cylinder")).toBe(true);
    // Without either, the leaves stay one box each.
    expect(hingeLocalParts(shape).filter((part) => part.kind === "box" && Math.abs(part.z ?? 0) > plan.leafStart)).toHaveLength(2);
  });

  it("folds B's corners and holes with its leaf, where the display mesh has them", () => {
    const fields = { ...shape, hingeScrewHoles: 2, hingeCornerRadius: 4, hingeAngle: 90 };
    const plan = hingePlan(fields);
    const parts = hingeLocalParts(fields);
    const turn = Math.PI / 2;
    // A point of B's flat leaf, folded up about the axis as the display mesh folds it.
    const folded = (y: number, z: number) => ({ y: plan.radius + (y - plan.radius) * Math.cos(turn) + z * Math.sin(turn), z: -(y - plan.radius) * Math.sin(turn) + z * Math.cos(turn) });
    const bHoles = parts.filter((part) => part.hole && part.rotationX === -90);
    expect(bHoles).toHaveLength(2);
    const want = folded(plan.leaf / 2, plan.screwZ);
    bHoles.forEach((part) => {
      expect((part.elevation ?? 0) + part.height / 2).toBeCloseTo(want.y, 9);
      expect(part.z).toBeCloseTo(want.z, 9);
    });
    const bCorners = parts.filter((part) => part.kind === "cylinder" && !part.hole && part.rotationX === -90);
    expect(bCorners).toHaveLength(2);
    // The mesh reaches as high as B's outer edge, folded straight up.
    const top = Math.max(...hingeTriangles(fields).flat().map(([, y]) => y));
    expect(top).toBeCloseTo(plan.radius + plan.depth / 2, 6);
  });

  it("points every countersink's head to its leaf's top in the world, folded or mirrored", () => {
    const base = { id: "h", name: "H", kind: "hinge", color: "#fff", x: 0, z: 0, elevation: 0, size: 40, rotation: 0, ...shape, hingeScrewHoles: 1 };
    const heads = (extra: object) => hingeWorldParts({ ...base, ...extra } as never).filter((part) => part.kind === "countersink").map((part) => {
      const up = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(THREE.MathUtils.degToRad(part.rotationX ?? 0), THREE.MathUtils.degToRad(part.rotation), THREE.MathUtils.degToRad(part.rotationZ ?? 0), "XYZ"));
      return { z: part.z, up: Math.round(up.y) };
    });
    // Lying open, both heads are on top.
    expect(heads({}).map((head) => head.up)).toEqual([1, 1]);
    // Closed, B's head faces down onto A's.
    expect(heads({ hingeAngle: 180 }).map((head) => head.up)).toEqual([1, -1]);
    // Mirrored upside down, the heads go with the leaves' tops.
    expect(heads({ mirrorY: true }).map((head) => head.up)).toEqual([-1, -1]);
  });
});

describe("fingers instead of leaves", () => {
  const fingers = { ...shape, hingeLeafStyle: "fingers" };

  it("stays closed in every style and fold; the pin holds A's fingers, B's and the coned ones are loose pieces", () => {
    for (const [fields, pieces] of [
      [fingers, 1 + 2],
      [{ ...fingers, hingeAngle: 180 }, 1 + 2],
      [{ ...fingers, hingeStyle: "pinless", hingeAngle: 90 }, 5],
      [{ ...fingers, hingeStyle: "cone", hingeLeafThickness: 8, hingeAngle: 180 }, 5],
      [{ ...fingers, hingeStyle: "cone", hingeCornerRadius: 2, hingeAngle: 270 }, 5],
      [{ width: 80, depth: 60, height: 12, hingeKnuckles: 9, hingeLeafThickness: 3, hingeCornerRadius: 3, hingeLeafStyle: "fingers" }, 1 + 4],
    ] as const) {
      const triangles = hingeTriangles(fields);
      expect(edgeProblems(triangles), JSON.stringify(fields)).toBe(0);
      expect(signedVolume(triangles)).toBeGreaterThan(0);
      expect(components(triangles), JSON.stringify(fields)).toBe(pieces);
    }
  });

  it("is a leaf under each knuckle, as wide as it, and less material than two leaves", () => {
    const plan = hingePlan(fingers);
    expect(plan.fingers).toBe(true);
    const leaves = hingeLeaves(plan);
    expect(leaves).toHaveLength(plan.knuckles);
    leaves.forEach((leaf, i) => {
      expect(leaf.x0).toBeCloseTo(plan.segments[i].x0, 9);
      expect(leaf.x1).toBeCloseTo(plan.segments[i].x1, 9);
      expect(leaf.side).toBe(plan.segments[i].owner === "a" ? -1 : 1);
    });
    // Two leaves are the same thing along the whole length.
    expect(hingeLeaves(hingePlan(shape)).map((leaf) => [leaf.x0, leaf.x1])).toEqual([[-20, 20], [-20, 20]]);
    // The fingers leave out the leaf beside the other side's knuckles and in the gaps: A beside B's two knuckles, B beside
    // A's three, each side in the four gaps.
    const missing = (5 * plan.knuckleLength + 2 * 4 * plan.clearance) * (plan.depth / 2 - plan.leafStart) * plan.leaf;
    expect(signedVolume(hingeTriangles(shape)) - signedVolume(hingeTriangles(fingers))).toBeCloseTo(missing, 6);
  });

  it("closes flat with cones and fingers as thick as the knuckle: as thick as one finger, the volume kept", () => {
    const flush = { ...fingers, hingeStyle: "cone", hingeLeafThickness: 8 };
    const open = hingeTriangles(flush);
    const closed = hingeTriangles({ ...flush, hingeAngle: 180 });
    expect(edgeProblems(closed)).toBe(0);
    expect(signedVolume(closed)).toBeCloseTo(signedVolume(open), 6);
    const ys = closed.flat().map(([, y]) => y);
    expect(Math.min(...ys)).toBeCloseTo(0, 6);
    expect(Math.max(...ys)).toBeCloseTo(8, 6);
    // B's fingers lie between A's, on A's side.
    const zs = closed.flat().map(([, , z]) => z);
    expect(Math.max(...zs)).toBeLessThanOrEqual(hingePlan(flush).radius + 1e-6);
  });

  it("rounds the finger tips no more than half a finger, and takes no screw holes", () => {
    const plan = hingePlan({ ...fingers, hingeCornerRadius: 100, hingeScrewHoles: 3 });
    expect(plan.cornerRadius).toBeCloseTo(plan.knuckleLength / 2 - 0.05, 9);
    expect(plan.screwXs).toEqual([]);
  });

  it("builds each finger of the exact parts as wide as its knuckle, B's folding with it", () => {
    const fields = { ...fingers, hingeAngle: 90 };
    const plan = hingePlan(fields);
    const parts = hingeLocalParts(fields);
    const fingerBoxes = parts.filter((part) => part.kind === "box" && Math.abs((part.depth ?? 0) - (plan.depth / 2 - plan.leafStart)) < 1e-9);
    expect(fingerBoxes).toHaveLength(plan.knuckles);
    fingerBoxes.forEach((part) => expect(part.width).toBeCloseTo(plan.knuckleLength, 9));
    expect(fingerBoxes.filter((part) => part.rotationX === -90)).toHaveLength(2);
    // With rounded tips: two boxes and two corner cylinders a finger.
    expect(hingeLocalParts({ ...fields, hingeCornerRadius: 2 }).filter((part) => part.kind === "cylinder" && part.rotationZ === undefined)).toHaveLength(2 * plan.knuckles);
  });
});

describe("the lift-off hinge", () => {
  const liftOff = { ...shape, hingeStyle: "liftOff" };
  const parts = (triangles: V[][]) => {
    // Points by component, so A (with the pin) and B (the sleeve) can be told apart.
    const faces = weld(triangles);
    const parent = new Map<number, number>();
    const find = (x: number): number => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
    faces.forEach(([a, b, c]) => { parent.set(find(b), find(a)); parent.set(find(c), find(a)); });
    const groups = new Map<number, V[]>();
    triangles.forEach((t, i) => { const root = find(faces[i][0]); groups.set(root, [...(groups.get(root) ?? []), ...t]); });
    return [...groups.values()];
  };

  it("has two knuckles whatever the count says, and is closed in two parts in every fold and with fingers or holes", () => {
    expect(hingePlan({ ...liftOff, hingeKnuckles: 9 }).knuckles).toBe(2);
    expect(hingePlan({ ...liftOff, hingeKnuckleWidth: 3 }).segments.map((segment) => segment.owner)).toEqual(["a", "b"]);
    for (const fields of [
      liftOff,
      { ...liftOff, hingeAngle: 90 },
      { ...liftOff, hingeAngle: 180, hingeScrewHoles: 2, hingeScrewHead: "nut" },
      { ...liftOff, hingeLeafStyle: "fingers", hingeCornerRadius: 3 },
      { width: 60, depth: 50, height: 10, hingeStyle: "liftOff", hingePinDiameter: 4, hingeLeafThickness: 2.5, hingeScrewHoles: 2, hingeScrewHead: "countersunkNut", hingeCornerRadius: 6 },
    ]) {
      const triangles = hingeTriangles(fields);
      expect(edgeProblems(triangles), JSON.stringify(fields)).toBe(0);
      expect(signedVolume(triangles)).toBeGreaterThan(0);
      expect(components(triangles)).toBe(2);
    }
  });

  it("lets the sleeve come off: the pin runs to the end inside B's bore, and nothing of B is in its way", () => {
    const plan = hingePlan(liftOff);
    const [a, b] = parts(hingeTriangles(liftOff)).sort((p, q) => Math.max(...q.map(([x]) => x)) - Math.max(...p.map(([x]) => x)) || 0);
    const axis = ([, y, z]: V) => Math.hypot(y - plan.radius, z);
    const pinSide = [a, b].find((points) => points.some(([x, y, z]) => Math.abs(x - plan.width / 2) < 1e-6 && Math.abs(axis([x, y, z]) - plan.pinRadius) < 1e-6))!;
    const sleeve = pinSide === a ? b : a;
    const [, sleeveSegment] = plan.segments;
    // Past A's knuckle, round the axis A is nothing but the pin (its leaf goes on beside B's knuckle), and it reaches the end.
    expect(Math.max(...pinSide.map(([x]) => x))).toBeCloseTo(plan.width / 2, 9);
    const near = pinSide.filter(([x, , z]) => x > plan.segments[0].x1 + 1e-6 && Math.abs(z) < plan.leafStart - 1e-6);
    expect(near.length).toBeGreaterThan(10);
    near.forEach((p) => expect(axis(p)).toBeLessThanOrEqual(plan.pinRadius + 1e-6));
    // B keeps the bore clear over its whole length, open at both ends.
    sleeve.filter(([x]) => x >= sleeveSegment.x0 - 1e-9).forEach((p) => expect(axis(p)).toBeGreaterThanOrEqual(plan.boreRadius - 1e-6));
    expect(Math.min(...sleeve.map(([x]) => x))).toBeCloseTo(-plan.width / 2, 9);
  });

  it("is built of the pin hinge's exact parts: the pin along the whole length, one knuckle each", () => {
    const local = hingeLocalParts(liftOff);
    const lying = local.filter((part) => part.rotationZ === 90);
    expect(lying.filter((part) => part.kind === "cylinder" && Math.abs(part.height - shape.width) < 1e-9)).toHaveLength(1);
    expect(lying.filter((part) => part.kind === "cylinder")).toHaveLength(2);
    expect(lying.filter((part) => part.kind === "tube")).toHaveLength(1);
  });
});

describe("the snap hinge (#1520)", () => {
  const snap = { ...shape, hingeStyle: "snap" };
  const shoelace = (loop: Array<{ u: number; v: number }>) => loop.reduce((sum, p, n) => { const q = loop[(n + 1) % loop.length]; return sum + (p.u * q.v - q.u * p.v) / 2; }, 0);
  const cases = [
    snap,
    { ...snap, hingeAngle: 180 },
    { ...snap, hingeAngle: -90, hingeScrewHoles: 2, hingeScrewHead: "nut", hingeCornerRadius: 3 },
    { ...snap, hingeLeafStyle: "fingers", hingeAngle: 135 },
    { ...snap, hingeLeafStyle: "raised" },
    { ...snap, hingeSnapGrip: 1.5, hingeClearance: 0.2, sides: 24 },
    { width: 25, depth: 30, height: 4, hingeKnuckles: 3, hingeStyle: "snap", hingeLeafThickness: 0.8 },
    { width: 80, depth: 60, height: 12, hingeKnuckles: 9, hingePinDiameter: 5, hingeLeafThickness: 3, hingeClearance: 0.25, hingeStyle: "snap" },
    // A pin near its largest with a thin raised leaf: the opening would cut the clip off its leaf, which stays on the plate.
    { width: 40, depth: 40, height: 8, hingePinDiameter: 6.4, hingeLeafThickness: 0.4, hingeLeafStyle: "raised", hingeStyle: "snap" },
    { width: 40, depth: 40, height: 8, hingePinDiameter: 0.2, hingeStyle: "snap" },
  ];

  it("takes a grip from 0.05 to 1.5 mm, 0.3 when left out, and is a style of its own", () => {
    expect(normalizeHingeStyle("snap")).toBe("snap");
    expect(normalizeHingeStyle("snap", true)).toBe("snap");
    expect(normalizeHingeSnapGrip(undefined)).toBe(0.3);
    expect(normalizeHingeSnapGrip(0)).toBe(0.05);
    expect(normalizeHingeSnapGrip(9)).toBe(1.5);
    expect(normalizeHingeSnapGrip(Number.NaN)).toBe(0.3);
    expect(hingePlan(snap)).toMatchObject({ style: "snap", pinless: false, snapGrip: 0.3 });
    // The pin hinge has no lead-in, and its sections are the pin hinge's own.
    expect(hingePlan(shape).snapLeadIn).toBe(0);
    expect(hingeSections(hingePlan(shape)).clip).toEqual(hingeSections(hingePlan(shape)).bKnuckle);
  });

  it("raises B's leaf only where it joins its clip below the opening", () => {
    expect(hingePlan({ ...snap, hingeLeafStyle: "raised" })).toMatchObject({ raised: true, lift: 8 - 4 - 0.4 });
    const wide = { width: 40, depth: 40, height: 8, hingePinDiameter: 6.4, hingeLeafThickness: 0.4, hingeLeafStyle: "raised" };
    expect(hingePlan(wide).raised).toBe(true);
    expect(hingePlan({ ...wide, hingeStyle: "snap" })).toMatchObject({ raised: false, lift: 0 });
    // Raised, the strip that joins B's leaf to its clip ends below where the opening and its lead-in begin.
    const plan = hingePlan({ ...snap, hingeLeafStyle: "raised", hingeSnapGrip: 0.05 });
    expect(plan.raised).toBe(true);
    const s = hingeSections(plan);
    // The leaf's top meets the clip's outside where it did, clear of the opening.
    expect(s.clip.slice(0, 2)).toEqual(s.bKnuckle.slice(0, 2));
    expect(s.clip[1].v).toBeCloseTo(plan.lift + plan.leaf, 9);
    expect(s.clip[1].u).toBeGreaterThan(plan.snapHalf + 0.2 - 1e-9);
  });

  it("is closed, wound outwards and in two parts in every fold and leaf shape; B's fingers are loose clips", () => {
    cases.forEach((fields) => {
      const triangles = hingeTriangles(fields);
      expect(edgeProblems(triangles), JSON.stringify(fields)).toBe(0);
      expect(signedVolume(triangles), JSON.stringify(fields)).toBeGreaterThan(0);
      const plan = hingePlan(fields);
      expect(components(triangles), JSON.stringify(fields)).toBe(plan.fingers ? 1 + (plan.knuckles - 1) / 2 : 2);
      // Folding turns B and keeps its volume.
      expect(signedVolume(triangles)).toBeCloseTo(signedVolume(hingeTriangles({ ...fields, hingeAngle: 0 })), 6);
    });
  });

  it("opens each clip at the top, narrower than the pin by the grip, with a lead-in wider than the pin at the mouth", () => {
    cases.forEach((fields) => {
      const plan = hingePlan(fields);
      const s = hingeSections(plan);
      const pin = plan.pinRadius;
      const key = JSON.stringify(fields);
      expect(2 * plan.snapHalf, key).toBeCloseTo(pin > 0.4 ? 2 * pin - plan.snapGrip : Math.max(2 * pin - plan.snapGrip, Math.min(0.4, pin)), 9);
      expect(plan.snapHalf).toBeLessThan(pin);
      // Nothing of B in the opening above the axis, and nothing inside the bore: the pin turns freely and comes in from the top.
      s.clip.forEach((p) => {
        if (p.v > plan.radius + 1e-9) expect(Math.abs(p.u), key).toBeGreaterThanOrEqual(plan.snapHalf - 1e-9);
        expect(Math.hypot(p.u, p.v - plan.radius), key).toBeGreaterThanOrEqual(plan.boreRadius * Math.cos(Math.PI / plan.sides) - 1e-9);
      });
      // The slot's two sides, from the bore up.
      const lip = plan.radius + Math.sqrt(plan.boreRadius ** 2 - plan.snapHalf ** 2);
      for (const side of [-1, 1]) expect(s.clip.some((p) => Math.abs(p.u - side * plan.snapHalf) < 1e-9 && Math.abs(p.v - lip) < 1e-9), key).toBe(true);
      // The clip is the knuckle less the bore and the opening, and still starts and ends where the leaf joins it.
      expect(shoelace(s.clip), key).toBeGreaterThan(0);
      expect(shoelace(s.clip)).toBeLessThan(shoelace(s.bKnuckle) - Math.PI * plan.boreRadius ** 2 * 0.9);
      expect(s.clip[0]).toEqual(s.bKnuckle[0]);
      expect(s.clip[s.clip.length - 1]).toEqual(s.bKnuckle[s.bKnuckle.length - 1]);
    });
    // At the default size: a 3 mm pin, a 2.7 mm opening, and where the chamfers meet the knuckle's outside the mouth is
    // wider than the pin, so the pin rests in it before it is pressed in.
    const plan = hingePlan(snap);
    expect(2 * plan.snapHalf).toBeCloseTo(2.7, 9);
    expect(plan.snapLeadIn).toBeCloseTo(0.65, 9);
    const mouth = hingeSections(plan).clip.filter((p) => Math.abs(Math.hypot(p.u, p.v - plan.radius) - plan.radius) < 1e-6 && p.v > plan.radius);
    const inner = mouth.reduce((best, p) => (Math.abs(p.u) < Math.abs(best.u) ? p : best));
    expect(2 * Math.abs(inner.u)).toBeGreaterThan(2 * plan.pinRadius);
  });

  it("chamfers the mouth at 45 degrees, which prints without supports, and leaves no bridge over the bore", () => {
    const plan = hingePlan(snap);
    const clip = hingeSections(plan).clip;
    const top = 2 * plan.radius;
    for (const side of [-1, 1]) {
      const corner = clip.findIndex((p) => Math.abs(p.u - side * plan.snapHalf) < 1e-9 && Math.abs(p.v - (top - plan.snapLeadIn)) < 1e-9);
      expect(corner).toBeGreaterThanOrEqual(0);
      // Its neighbour away from the slot is on the knuckle's outside, up and out at 45 degrees.
      const out = [clip[corner - 1], clip[corner + 1]].find((p) => Math.abs(p.u) > plan.snapHalf + 1e-9)!;
      expect(Math.abs(out.v - clip[corner].v)).toBeCloseTo(Math.abs(out.u - clip[corner].u), 9);
      expect(out.v).toBeGreaterThan(clip[corner].v);
    }
    // Above the bore there is no material between the slot's sides: the bore's top is open, not a bridge.
    const above = clip.filter((p) => p.v > plan.radius + plan.boreRadius - 1e-9);
    expect(above.every((p) => Math.abs(p.u) >= plan.snapHalf - 1e-9)).toBe(true);
  });

  it("keeps the pin hinge's part A, the pin running through every knuckle", () => {
    const plan = hingePlan(snap);
    const pinPoints = (fields: object) => hingeTriangles(fields).flat().filter(([, y, z]) => Math.abs(Math.hypot(y - plan.radius, z) - plan.pinRadius) < 1e-6).length;
    expect(pinPoints(snap)).toBe(pinPoints(shape));
    // Less material than the pin hinge: the opening.
    expect(signedVolume(hingeTriangles(snap))).toBeLessThan(signedVolume(hingeTriangles(shape)));
  });

  it("builds each clip of the exact parts on its own: the knuckle and strip, a slot and two lead-in boxes cut out", () => {
    cases.forEach((fields) => {
      const plan = hingePlan(fields);
      const parts = hingeLocalParts(fields);
      const key = JSON.stringify(fields);
      expect(parts.filter((part) => part.kind === "cylinder" && part.rotationZ === 90 && Math.abs(part.height - plan.width) < 1e-9), key).toHaveLength(1);
      plan.segments.forEach((segment, index) => {
        const own = parts.filter((part) => part.knuckle === index);
        if (segment.owner === "a") return expect(own).toHaveLength(0);
        expect(own.map((part) => `${part.kind}${part.hole ? " hole" : ""}`).sort(), key).toEqual(plan.snapLeadIn > 0 ? ["box", "box hole", "box hole", "box hole", "tube"] : ["box", "box hole", "tube"]);
        const slot = own.find((part) => part.hole && part.depth === 2 * plan.snapHalf)!;
        expect(slot.width).toBeGreaterThan(plan.knuckleLength);
      });
      // The screw holes stay on the hinge's own level.
      expect(parts.filter((part) => part.hole && part.knuckle === undefined)).toHaveLength(2 * plan.screwXs.length + (plan.screwTops.a === "nut" ? plan.screwXs.length : 0) + (plan.screwTops.b === "nut" ? plan.screwXs.length : 0));
    });
  });

  it("puts the corners of the exact lead-in where the display mesh has them, folded with B", () => {
    for (const hingeAngle of [0, 70, 180, -90]) {
      const fields = { ...snap, hingeAngle };
      const plan = hingePlan(fields);
      const mesh = hingeTriangles(fields).flat();
      const leadIns = hingeLocalParts(fields).filter((part) => part.hole && part.knuckle !== undefined && part.rotationX !== undefined && Math.abs(Math.abs(part.rotationX - (45 - hingeAngle)) % 360) < 1e-9);
      expect(leadIns, String(hingeAngle)).toHaveLength(2 * (plan.knuckles - 1) / 2);
      leadIns.forEach((part) => {
        const center = new THREE.Vector3(part.x, (part.elevation ?? 0) + part.height / 2, part.z ?? 0);
        const segment = plan.segments.find((one) => Math.abs((one.x0 + one.x1) / 2 - part.x) < 1e-9)!;
        // Of the turned square's four corners, the one where the chamfer meets the slot lies on the knuckle's end face.
        const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([y, z]) => new THREE.Vector3(segment.x0, (y * part.height) / 2, (z * (part.depth ?? 0)) / 2)
          .applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(part.rotationX ?? 0)).add(new THREE.Vector3(0, center.y, center.z)));
        const nearest = Math.min(...corners.map((corner) => Math.min(...mesh.map(([x, y, z]) => Math.hypot(x - corner.x, y - corner.y, z - corner.z)))));
        expect(nearest, String(hingeAngle)).toBeLessThan(1e-6);
      });
    }
  });

  it("keeps the style and grip in saved defaults, AI commands, new hinges and a saved design file", async () => {
    const hinge = (source: Record<string, unknown>) => normalizeShapeCustomizations({ hinge: source }).hinge ?? {};
    expect(hinge({ hingeStyle: "snap", hingeSnapGrip: 0.5 })).toMatchObject({ hingeStyle: "snap", hingeSnapGrip: 0.5 });
    expect(hinge({ hingeSnapGrip: 7 }).hingeSnapGrip).toBe(1.5);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "hinge")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { hingeStyle: "snap", hingeSnapGrip: 0.45 })).toMatchObject({ hingeStyle: "snap", hingeSnapGrip: 0.45 });
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { hingeSnapGrip: 0.45 }).hingeSnapGrip).toBeUndefined();
    const base = { name: "Hinge", kind: "hinge", color: "#9aa5b1", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 40, height: 8, rotation: 0 };
    const shapes = [canonicalizeShape({ ...base, id: "snap", hingeStyle: "snap", hingeSnapGrip: 0.4 } as WorkplaneShape)];
    const exported = await exportLylProject({
      projectId: "hinge", projectName: "Hinge", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = await importLylProject(exported);
    expect(restored.shapes.find((one) => one.id === "snap")).toMatchObject({ hingeStyle: "snap", hingeSnapGrip: 0.4 });
  });
});

describe("nut pockets", () => {
  const holes = { ...shape, hingeLeafThickness: 2, hingeScrewHoles: 2 };
  const hexArea = (r: number) => ((3 * Math.sqrt(3)) / 2) * r * r;
  const polygonArea = (r: number, sides: number) => (sides / 2) * r * r * Math.sin((2 * Math.PI * 2) / (2 * sides));

  it("takes the nut's width from the hole, M2 to M8, with play, or as given", () => {
    expect(normalizeHingeNutWidth(undefined, 3.5)).toBeCloseTo(5.8, 9);
    expect(normalizeHingeNutWidth(0, 4.5)).toBeCloseTo(7.3, 9);
    expect(normalizeHingeNutWidth(undefined, 6.6)).toBeCloseTo(10.3, 9);
    expect(normalizeHingeNutWidth(6.2, 3.5)).toBeCloseTo(6.2, 9);
    // Never narrower than the hole.
    expect(normalizeHingeNutWidth(2, 3.5)).toBeCloseTo(4.1, 9);
    expect(normalizeHingeScrewHead(undefined, false)).toBe("straight");
    expect(normalizeHingeScrewHead("nut", false)).toBe("nut");
    expect(normalizeHingeScrewHead(undefined)).toBe("countersunk");
  });

  it("cuts a six-sided pocket over the hole, as deep as the leaf allows, the leaf closed", () => {
    const fields = { ...holes, hingeScrewHead: "nut" };
    const plan = hingePlan(fields);
    expect(plan.screwTops).toEqual({ a: "nut", b: "nut" });
    expect(plan.nutDepth).toBeCloseTo(plan.leaf - 0.6, 9);
    const triangles = hingeTriangles(fields);
    expect(edgeProblems(triangles)).toBe(0);
    const sides = automaticSideCount(2 * plan.screwHeadRadius, 2 * plan.screwHeadRadius);
    const shaft = polygonArea(plan.screwRadius, sides);
    const hole = shaft * plan.leaf + (hexArea(plan.nutRadius) - shaft) * plan.nutDepth;
    expect(signedVolume(hingeTriangles(shape)) - signedVolume(triangles)).toBeCloseTo(2 * 2 * hole, 6);
  });

  it("puts a countersink on A and a nut on B when asked to, and leaves a pocket out where the leaf is too thin", () => {
    expect(hingePlan({ ...holes, hingeScrewHead: "countersunkNut" }).screwTops).toEqual({ a: "countersunk", b: "nut" });
    const thin = hingePlan({ ...holes, hingeScrewHead: "nut", hingeLeafThickness: 0.8 });
    expect(thin.nutDepth).toBe(0);
    expect(thin.screwTops).toEqual({ a: "straight", b: "straight" });
    // The holes keep their walls by the nut's corners.
    const plan = hingePlan({ ...holes, hingeScrewHead: "nut" });
    expect(plan.screwZ - plan.nutRadius).toBeGreaterThanOrEqual(plan.leafStart + 0.5 - 1e-9);
  });

  it("cuts the pocket exactly as a six-sided prism with the hole, on B folding with its leaf", () => {
    const fields = { ...holes, hingeScrewHead: "countersunkNut", hingeAngle: 90 };
    const plan = hingePlan(fields);
    const cutters = hingeLocalParts(fields).filter((part) => part.hole);
    expect(cutters.filter((part) => part.kind === "countersink")).toHaveLength(2);
    const pockets = cutters.filter((part) => part.kind === "polygon");
    expect(pockets).toHaveLength(2);
    pockets.forEach((part) => {
      expect(part.sides).toBe(6);
      expect(part.width).toBeCloseTo(plan.nutWidth, 9);
      expect(part.rotationX).toBe(-90);
    });
    expect(cutters.filter((part) => part.kind === "cylinder" && part.rotationX === -90)).toHaveLength(2);
  });

  it("turns a pocket with the hinge in the world, flats across the axis", () => {
    const base = { id: "h", name: "H", kind: "hinge", color: "#fff", x: 0, z: 0, elevation: 0, size: 40, ...holes, hingeScrewHead: "nut", hingeScrewHoles: 1 };
    const pocket = (extra: object) => hingeWorldParts({ ...base, ...extra } as never).filter((part) => part.kind === "polygon");
    expect(pocket({ rotation: 30 }).map((part) => Math.round(part.rotation))).toEqual([30, 30]);
    expect(pocket({ rotation: 0 }).map((part) => Math.round(part.rotation))).toEqual([0, 0]);
  });
});

describe("the cone hinge as exact parts (#1007)", () => {
  const cases = [
    { width: 40, height: 8, hingeStyle: "cone" },
    { width: 60, depth: 50, height: 10, hingeStyle: "cone", hingeKnuckles: 7, hingeClearance: 0.3 },
    { width: 40, height: 6, hingeStyle: "cone", hingeLeafThickness: 6, hingeLeafStyle: "fingers" as const, hingeCornerRadius: 2 },
    { width: 40, height: 8, hingeStyle: "cone", hingeConeSize: 3, hingeScrewHoles: 2 },
  ];

  it("has a cone into each neighbour and a recess cut in each end of B's knuckles, and no pin", () => {
    cases.forEach((shape) => {
      const plan = hingePlan(shape);
      const parts = hingeLocalParts(shape);
      const cones = parts.filter((part) => part.kind === "cone" && !part.hole);
      const recesses = parts.filter((part) => part.kind === "cone" && part.hole);
      expect(cones, JSON.stringify(shape)).toHaveLength(plan.knuckles - 1);
      expect(recesses).toHaveLength(plan.knuckles - 1);
      expect(parts.some((part) => part.kind === "cylinder" && part.height >= plan.width - 1e-9)).toBe(false);
      // Each knuckle of B and what is cut out of it alone: the knuckle, the strip under it and its two recesses.
      plan.segments.forEach((segment, index) => {
        const own = parts.filter((part) => part.knuckle === index);
        if (segment.owner === "a") return expect(own).toHaveLength(0);
        expect(own.map((part) => `${part.kind}${part.hole ? " hole" : ""}`).sort()).toEqual(["box", "cone hole", "cone hole", "cylinder"]);
      });
      // A's parts and the screw holes stay on the hinge's own level.
      expect(cones.every((part) => part.knuckle === undefined)).toBe(true);
      const screws = parts.filter((part) => part.hole && part.kind !== "cone");
      expect(screws).toHaveLength(2 * plan.screwXs.length);
      expect(screws.every((part) => part.knuckle === undefined)).toBe(true);
    });
  });

  it("sinks each cone a little into its own knuckle and starts each recess's cutter a little outside, so no faces lie flush", () => {
    cases.forEach((shape) => {
      const plan = hingePlan(shape);
      const ends = plan.segments.flatMap((segment) => [segment.x0, segment.x1]);
      hingeLocalParts(shape).filter((part) => part.kind === "cone").forEach((part) => {
        const toward = part.rotationZ === -90 ? 1 : -1;
        const base = part.x - (toward * part.height) / 2;
        const face = ends.reduce((nearest, x) => (Math.abs(x - base) < Math.abs(nearest - base) ? x : nearest));
        // Behind the end face, seen from the point: inside A's knuckle for a cone, outside B's for a recess.
        const behind = (face - base) * toward;
        expect(behind, JSON.stringify(shape)).toBeGreaterThan(0.01);
        // At 45 degrees, so the end face still meets it at the display mesh's radius.
        expect(part.width / 2 - behind).toBeCloseTo(part.hole ? plan.recessRadius : plan.coneRadius, 9);
        expect(part.height).toBeCloseTo(part.width / 2, 9);
      });
    });
  });

  it("sends each knuckle of B to the kernel in a scope of its own, below the numbers the groups round it use", () => {
    const hinge = { id: "h", name: "H", kind: "hinge", color: "#fff", x: 0, z: 0, elevation: 0, size: 40, rotation: 0, width: 40, height: 8, hingeStyle: "cone" } as never as Parameters<typeof hingeWorldParts>[0];
    const parts = hingeWorldParts(hinge);
    const scopes = new Set(parts.map((part) => JSON.stringify(hingePartScope([2], part))));
    // B's two knuckles of five, and the hinge's own level for the rest; a hinge inside a group's scope stays inside it.
    expect([...scopes].sort()).toEqual(["[2,-2]", "[2,-4]", "[2]"]);
    expect(hingePartScope([], parts.find((part) => part.knuckle === 1)!)).toEqual([-2]);
  });

  it("puts the tip of every cone and recess where the display mesh has it, also turned, mirrored and folded", () => {
    cases.forEach((fields) => {
      for (const place of [{}, { rotation: 30, rotationX: 20, rotationZ: 15, hingeAngle: 70 }, { rotation: 120, mirrorX: true, hingeAngle: 135 }]) {
        const shape = { ...fields, ...place } as typeof fields & typeof place & { rotation?: number; rotationX?: number; rotationZ?: number; mirrorX?: boolean };
        const hinge = { id: "h", name: "H", kind: "hinge", color: "#fff", x: 12, z: -7, elevation: 3, size: shape.width, rotation: 0, ...shape } as never as Parameters<typeof hingeWorldParts>[0];
        const centerY = shape.height / 2;
        const turn = new THREE.Euler(THREE.MathUtils.degToRad(shape.rotationX ?? 0), THREE.MathUtils.degToRad(shape.rotation ?? 0), THREE.MathUtils.degToRad(shape.rotationZ ?? 0), "XYZ");
        const matrix = new THREE.Matrix4().makeTranslation(12, 3 + centerY, -7)
          .multiply(new THREE.Matrix4().makeRotationFromEuler(turn))
          .multiply(new THREE.Matrix4().makeScale(shape.mirrorX ? -1 : 1, 1, 1))
          .multiply(new THREE.Matrix4().makeTranslation(0, -centerY, 0));
        const mesh = hingeTriangles(shape).flat().map(([x, y, z]) => new THREE.Vector3(x, y, z).applyMatrix4(matrix));
        const cones = hingeWorldParts(hinge).filter((part) => part.kind === "cone");
        expect(cones.length).toBeGreaterThan(0);
        cones.forEach((part) => {
          // A cone's tip is the top of its own frame, half its height above its middle.
          const tip = new THREE.Vector3(0, part.height / 2, 0)
            .applyEuler(new THREE.Euler(THREE.MathUtils.degToRad(part.rotationX ?? 0), THREE.MathUtils.degToRad(part.rotation ?? 0), THREE.MathUtils.degToRad(part.rotationZ ?? 0), "XYZ"))
            .add(new THREE.Vector3(part.x, (part.elevation ?? 0) + part.height / 2, part.z));
          expect(Math.min(...mesh.map((v) => v.distanceTo(tip))), JSON.stringify(shape)).toBeLessThan(1e-3);
        });
      }
    });
  });

  it("folds the strip under each knuckle of B with B's leaf, as the pin hinge does", () => {
    for (const hingeAngle of [0, 70, 135]) {
      const plan = hingePlan({ width: 40, height: 8, hingeStyle: "cone", hingeAngle });
      const strips = (hingeStyle: string) => hingeLocalParts({ width: 40, height: 8, hingeStyle, hingeAngle })
        .filter((part) => part.kind === "box" && plan.segments.some((segment) => segment.owner === "b" && Math.abs(part.x - (segment.x0 + segment.x1) / 2) < 1e-9))
        .map(({ x, z, elevation, width, depth, height, rotationX }) => ({ x, z, elevation, width, depth, height, rotationX }));
      expect(strips("cone")).toHaveLength((plan.knuckles - 1) / 2);
      expect(strips("cone")).toEqual(strips("pin"));
    }
  });

  it("goes to the kernel in parts from both of the editor's calls, each knuckle of B in its scope, and as its mesh as a hole", () => {
    const editor = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/LayerlingEditor.tsx", import.meta.url)), "utf8").replace(/\s+/g, " ");
    expect(editor.match(/cadModifierSourceParts\((?:entry\.)?shape\)\.map\(\(part\) => \(\{ part, scope: hingePartScope\((?:entry\.)?scope, part\) \}\)\)/g)).toHaveLength(2);
    // Set as a hole, its parts would be joined as solids; its mesh is cut out whole.
    expect(editor).toMatch(/if \(shape\.kind === "hinge" && !shape\.hole && [^;]*\) return hingeWorldParts\(shape\);/);
  });
});

describe("a raised leaf that closes flat on the other (#1259)", () => {
  // As gramar-bot's hinge: a 6 mm knuckle, a 3 mm pin, leaves 1.1 mm thick, the default clearance of 0.4.
  const raised = { width: 40, depth: 40, height: 6, hingePinDiameter: 3, hingeLeafThickness: 1.1, hingeLeafStyle: "raised" };

  it("lifts B's leaf so that closed it lies on A's with the clearance between", () => {
    const plan = hingePlan(raised);
    // 6 - 2 * 1.1 - 0.4.
    expect(plan.lift).toBeCloseTo(3.4, 9);
    // A's leaf beside B's knuckles as before; B's band is 0.4 above the axis at its lowest, so it starts further out.
    expect(plan.leafStart).toBeCloseTo(Math.sqrt(3.4 ** 2 - 1.9 ** 2), 9);
    expect(plan.leafStartB).toBeCloseTo(Math.sqrt(3.4 ** 2 - 0.4 ** 2), 9);
    expect(hingePlan({ ...raised, hingeLeafStyle: "plate" }).lift).toBe(0);
    // With the default 8 mm knuckle and 2 mm leaf, B's band straddles the axis: it starts the radius and clearance out.
    expect(hingePlan({ width: 40, height: 8, hingeLeafStyle: "raised" }).leafStartB).toBeCloseTo(4.4, 9);
  });

  it.each([-140, -90, 0, 90, 180])("is closed in two parts at %i degrees, in every style, with holes and nuts", (hingeAngle) => {
    for (const extra of [{}, { hingeStyle: "pinless" }, { hingeStyle: "liftOff" }, { hingeStyle: "cone" }, { hingeScrewHoles: 2, hingeCornerRadius: 3 }, { hingeScrewHoles: 2, hingeScrewHead: "countersunkNut" }]) {
      const fields = { ...raised, ...extra, hingeAngle };
      const triangles = hingeTriangles(fields);
      expect(edgeProblems(triangles), JSON.stringify(fields)).toBe(0);
      expect(components(triangles), JSON.stringify(fields)).toBe(2);
      expect(signedVolume(triangles)).toBeCloseTo(signedVolume(hingeTriangles({ ...fields, hingeAngle: 0 })), 6);
    }
  });

  it("closed, B lies on A's leaf with the clearance between, beside the knuckles", () => {
    const plan = hingePlan(raised);
    const flat = hingeTriangles(raised).flat();
    const closed = hingeTriangles({ ...raised, hingeAngle: 180 }).flat();
    // Lying open, B's leaf is lifted; closed, it lies over A's leaf (z < 0), from 1.5 to 2.6 above the plate.
    const beside = (points: V[], sign: number) => points.filter(([, , z]) => sign * z > plan.leafStartB + 0.1);
    expect(Math.min(...beside(flat, 1).map(([, y]) => y))).toBeCloseTo(3.4, 6);
    const bOver = beside(closed, -1).filter(([, y]) => y > plan.leaf + 0.01);
    expect(Math.min(...bOver.map(([, y]) => y))).toBeCloseTo(1.1 + 0.4, 6);
    expect(Math.max(...bOver.map(([, y]) => y))).toBeCloseTo(2 * 1.1 + 0.4, 6);
  });

  it("stays closed with a cone hinge's leaf at its most, whatever the knuckle and clearance", () => {
    // There the lift is 0 but for rounding, which must not tear B's knuckle open.
    for (const height of [2, 3, 6, 9, 15, 30]) for (const hingeClearance of [0.1, 0.25, 0.4, 0.7, 1]) for (const hingeLeafThickness of [999, (height - hingeClearance) / 2]) {
      const fields = { width: 40, depth: 40, height, hingeStyle: "cone", hingeLeafStyle: "raised", hingeClearance, hingeLeafThickness };
      expect(hingePlan(fields).lift, JSON.stringify(fields)).toBe(0);
      const triangles = hingeTriangles(fields);
      expect(edgeProblems(triangles), JSON.stringify(fields)).toBe(0);
      expect(components(triangles), JSON.stringify(fields)).toBe(2);
    }
  });

  it("keeps B's exact strip under its knuckle out of the bore, on its lift", () => {
    for (const extra of [{}, { hingeStyle: "pinless" }, { hingeStyle: "liftOff" }]) {
      const plan = hingePlan({ ...raised, ...extra });
      const under = hingeLocalParts({ ...raised, ...extra }).filter((part) => part.kind === "box" && (part.z ?? 0) > 0 && part.width === plan.knuckleLength);
      expect(under.length, JSON.stringify(extra)).toBe(plan.segments.filter((segment) => segment.owner === "b").length);
      // Each starts where the bore ends 0.4 above the axis's level, B's band's lowest, so the pin turns freely, and stands
      // where B's leaf does.
      under.forEach((part) => expect((part.z ?? 0) - (part.depth ?? 0) / 2, JSON.stringify(extra)).toBeCloseTo(Math.sqrt(plan.boreRadius ** 2 - 0.4 ** 2), 9));
      under.forEach((part) => expect(part.elevation).toBeCloseTo(plan.lift, 9));
    }
  });

  it("starts B's exact strip where the bore ends at the raised leaf's height, touching the knuckle, even with a large pin", () => {
    for (const fields of [raised, { ...raised, hingePinDiameter: 4.4 }, { ...raised, height: 8, hingePinDiameter: 6.4, hingeLeafThickness: 2 }, { ...raised, height: 8, hingePinDiameter: 5.2, hingeLeafThickness: 0.4, hingeClearance: 1 }]) {
      const plan = hingePlan(fields);
      const near = Math.max(0, plan.lift - plan.radius, plan.radius - plan.lift - plan.leaf);
      const under = hingeLocalParts(fields).filter((part) => part.kind === "box" && (part.z ?? 0) > 0 && part.width === plan.knuckleLength);
      expect(under.length).toBeGreaterThan(0);
      under.forEach((part) => {
        const from = (part.z ?? 0) - (part.depth ?? 0) / 2;
        expect(from ** 2 + near ** 2, JSON.stringify(fields)).toBeGreaterThanOrEqual(plan.boreRadius ** 2 - 1e-9);
        expect(from, JSON.stringify(fields)).toBeLessThan(Math.sqrt(plan.radius ** 2 - near ** 2));
      });
    }
  });

  it("stands B's exact leaf, strips and nut pockets on its lift, the leaf from B's start", () => {
    for (const extra of [{}, { hingeStyle: "cone" }, { hingeScrewHoles: 2, hingeScrewHead: "countersunkNut" }, { hingeScrewHoles: 2, hingeScrewHead: "straight" }]) {
      const fields = { ...raised, ...extra }, plan = hingePlan(fields), parts = hingeLocalParts(fields).filter((part) => (part.z ?? 0) > 0);
      parts.filter((part) => part.kind === "box").forEach((part) => expect(part.elevation, JSON.stringify(extra)).toBeCloseTo(plan.lift, 9));
      // Every box reaches out to B's leaf start at least, the strips under the knuckles included.
      parts.filter((part) => part.kind === "box").forEach((part) => expect((part.z ?? 0) + (part.depth ?? 0) / 2).toBeGreaterThanOrEqual(plan.leafStartB - 1e-9));
      parts.filter((part) => part.kind === "cylinder" && part.hole).forEach((part) => expect((part.elevation ?? 0) + part.height / 2).toBeCloseTo(plan.lift + plan.leaf / 2, 9));
      const leafBoxes = parts.filter((part) => part.kind === "box" && part.width !== plan.knuckleLength);
      expect(Math.min(...leafBoxes.map((part) => (part.z ?? 0) - (part.depth ?? 0) / 2))).toBeCloseTo(plan.leafStartB, 9);
      parts.filter((part) => part.kind === "polygon").forEach((part) => expect(part.elevation).toBeCloseTo(plan.lift + plan.leaf - plan.nutDepth, 9));
    }
  });

  it("keeps the holes clear of B's leaf start, cuts them through B where it stands, B's heads facing A when closed", () => {
    // A narrow hinge, where the holes only just fit: each keeps its wall to B's leaf start, which lies further out than A's,
    // so at 10.5 mm a plate hinge has its holes and a raised one none yet.
    const narrow = (depth: number, hingeLeafStyle: string) => hingePlan({ ...raised, depth, hingeLeafStyle, hingeScrewHoles: 2, hingeScrewHead: "straight", hingeScrewDiameter: 1 });
    expect(narrow(10.5, "plate").screwXs).toHaveLength(2);
    expect(narrow(10.5, "raised").screwXs).toHaveLength(0);
    const wide = narrow(11, "raised");
    expect(wide.screwXs).toHaveLength(2);
    expect(wide.screwZ - wide.screwRadius).toBeGreaterThanOrEqual(wide.leafStartB + 0.5 - 1e-9);
    const fields = { ...raised, hingeScrewHoles: 2 };
    const plan = hingePlan(fields);
    expect(plan.screwZ - plan.screwHeadRadius).toBeGreaterThanOrEqual(plan.leafStartB + 0.5 - 1e-9);
    const base = { id: "h", name: "H", kind: "hinge", color: "#fff", x: 0, z: 0, elevation: 0, size: 40, rotation: 0, ...fields };
    const heads = (extra: object) => hingeWorldParts({ ...base, ...extra } as never).filter((part) => part.kind === "countersink").map((part) => {
      const up = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(THREE.MathUtils.degToRad(part.rotationX ?? 0), THREE.MathUtils.degToRad(part.rotation), THREE.MathUtils.degToRad(part.rotationZ ?? 0), "XYZ"));
      return { middle: (part.elevation ?? 0) + part.height / 2, up: Math.round(up.y) };
    });
    // Lying open: A's cutters through A's leaf, B's through B's raised one.
    heads({}).forEach((head, k) => expect(head.middle).toBeCloseTo(k < 2 ? plan.leaf / 2 : plan.lift + plan.leaf / 2, 9));
    expect(heads({}).map((head) => head.up)).toEqual([1, 1, 1, 1]);
    expect(heads({ hingeAngle: 180 }).map((head) => head.up)).toEqual([1, 1, -1, -1]);
  });

  it("is as deep as B's raised leaf needs at the least", () => {
    const plan = hingePlan({ ...raised, depth: 1 });
    expect(plan.depth).toBeCloseTo(minimumHingeDepth(6, 1.1, 0.4, 3.4), 9);
    expect(plan.depth / 2 - plan.leafStartB).toBeCloseTo(0.5, 9);
    expect(edgeProblems(hingeTriangles({ ...raised, depth: 1 }))).toBe(0);
    // Its corners stay within B's leaf, which starts further out than A's.
    const tight = hingePlan({ ...raised, depth: 1, hingeCornerRadius: 99 });
    expect(tight.cornerRadius).toBeCloseTo(tight.depth / 2 - tight.leafStartB - 0.05, 9);
    expect(edgeProblems(hingeTriangles({ ...raised, depth: 1, hingeCornerRadius: 99 }))).toBe(0);
  });

  it("limits a raised cone hinge's leaf so B stays above the plate", () => {
    const plan = hingePlan({ ...raised, hingeStyle: "cone", hingeLeafThickness: 6 });
    expect(plan.leaf).toBeCloseTo((6 - 0.4) / 2, 9);
    // A knuckle with no room for two leaves keeps both on the plate, at the leaf they were asked for.
    const small = { width: 40, height: 1.5, hingeClearance: 1, hingeStyle: "cone" };
    expect(hingePlan({ ...small, hingeLeafStyle: "raised" })).toMatchObject({ raised: false, lift: 0, leaf: hingePlan(small).leaf });
  });

  it("keeps the raised leaf in saved defaults, AI commands, new hinges and a saved design file", async () => {
    expect(normalizeShapeCustomizations({ hinge: { hingeLeafStyle: "raised" } }).hinge?.hingeLeafStyle).toBe("raised");
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "hinge")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { hingeLeafStyle: "raised" }).hingeLeafStyle).toBe("raised");
    const base = { name: "Hinge", kind: "hinge", color: "#9aa5b1", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 40, height: 6, rotation: 0 };
    const shapes = [canonicalizeShape({ ...base, id: "raised", hingeLeafStyle: "raised", hingeAngle: -120 } as WorkplaneShape)];
    const exported = await exportLylProject({
      projectId: "hinge", projectName: "Hinge", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = await importLylProject(exported);
    expect(restored.shapes.find((shape) => shape.id === "raised")).toMatchObject({ hingeLeafStyle: "raised", hingeAngle: -120 });
  });
});

describe("the opening angle below lying flat (#1259)", () => {
  it("takes an angle from -180 to 180 and folds B down past lying flat, closed, the volume kept", () => {
    expect(normalizeHingeAngle(-90)).toBe(-90);
    expect(normalizeHingeAngle(-200)).toBe(-180);
    expect(normalizeHingeAngle(undefined)).toBe(0);
    expect(normalizeHingeAngle(270)).toBe(180);
    const folded = hingeTriangles({ ...shape, hingeAngle: -90 });
    expect(edgeProblems(folded)).toBe(0);
    expect(signedVolume(folded)).toBeCloseTo(signedVolume(hingeTriangles(shape)), 6);
    // Folded straight down, B's outer edge is half the depth below the axis.
    const plan = hingePlan(shape);
    expect(Math.min(...folded.flat().map(([, y]) => y))).toBeCloseTo(plan.radius - plan.depth / 2, 6);
  });

  it("keeps the angle in saved defaults and AI commands, and gives it to a new hinge", () => {
    const hinge = (source: Record<string, unknown>) => normalizeShapeCustomizations({ hinge: source }).hinge ?? {};
    expect(hinge({ hingeAngle: -90 }).hingeAngle).toBe(-90);
    expect(hinge({ hingeAngle: -500 }).hingeAngle).toBe(-180);
    expect(hinge({ hingeAngle: 270 }).hingeAngle).toBe(180);
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "hinge")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, { hingeAngle: -90 }).hingeAngle).toBe(-90);
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }).hingeAngle).toBeUndefined();
  });
});
