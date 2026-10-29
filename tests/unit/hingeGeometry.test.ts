import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { hingeWorldParts } from "@/lib/hingeParts";
import { automaticSideCount } from "@/lib/roundSideCount";
import { hingeLeaves, hingeSections, hingeConeRadius, hingeKnucklesForWidth, hingeHasExactParts, normalizeHingeStyle, hingeLocalParts, hingePlan, hingeTriangles, normalizeHingeKnuckleWidth, normalizeHingeKnuckles, normalizeHingeLeafThickness, normalizeHingePinDiameter } from "@/lib/hingeGeometry";

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

  it("places B's exact boxes where the folded display mesh has its leaf (#699)", () => {
    for (const hingeAngle of [0, 45, 90, 135, 180]) {
      const fields = { ...shape, hingeAngle };
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
    expect(hingeHasExactParts({ hingeStyle: "pinless" })).toBe(true);
    expect(hingeHasExactParts({ hingePinless: true })).toBe(true);
    expect(hingeHasExactParts({ hingeStyle: "cone" })).toBe(false);
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
