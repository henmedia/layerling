import { describe, expect, it } from "vitest";
import Module from "manifold-3d";
import { countFindings, filterFindings, sortFindings, stepFinding } from "@/lib/findings";
import { checkLayersOfSolid, layerAtHeight, normalizeLayerCheckOptions, LayerCheckStopped, type LayerCheckOptions } from "@/lib/layerCheck";

/*
 * The test bodies of the layer check (Druckanalyse), each built z up with Manifold and turned into the scene's frame
 * (y up) as the editor hands them over.
 */

type Solid = { delete?: () => void };

async function runtime() {
  const manifold = await Module();
  manifold.setup();
  return manifold;
}
type Kernel = Awaited<ReturnType<typeof runtime>>;
type Body = ReturnType<Kernel["Manifold"]["cube"]>;

const kernelPromise = runtime();

function scene(body: Body) {
  return body.rotate([-90, 0, 0]);
}

async function check(build: (kernel: Kernel, keep: <T extends Solid>(value: T) => T) => Body, options: Partial<LayerCheckOptions> = {}) {
  const kernel = await kernelPromise;
  const created: Solid[] = [];
  const keep = <T extends Solid>(value: T) => (created.push(value), value);
  try {
    const body = keep(scene(build(kernel, keep)));
    return checkLayersOfSolid(kernel, body as never, options, [{ id: "part", name: "Teil", box: { min: [-1000, -1000, -1000], max: [1000, 1000, 1000] } }]);
  } finally {
    created.forEach((value) => value.delete?.());
  }
}

/** A prism whose right side leans out by `angle` degrees from the vertical, 10 mm high, 20 mm deep. */
function slope(angle: number) {
  return (kernel: Kernel, keep: <T extends Solid>(value: T) => T) => {
    const lean = 10 * Math.tan((angle * Math.PI) / 180);
    const profile = keep(kernel.CrossSection.ofPolygons([[[0, 0], [10, 0], [10 + lean, 10], [0, 10]]]));
    return keep(keep(profile.extrude(20)).rotate([90, 0, 0]));
  };
}

describe("layer check (Druckanalyse)", () => {
  it("finds nothing on a cube standing on the plate", async () => {
    const result = await check((kernel) => kernel.Manifold.cube([20, 20, 20], true).translate([0, 0, 10]));
    expect(result.findings).toEqual([]);
    expect(result.layers.length).toBe(100);
    expect(result.layers[0].areaMm2).toBeCloseTo(400, 0);
    expect(result.layers[0].islands).toBe(1);
  });

  it("says a part sunk 4.2 mm into the plate is in the plate and counts no layer below it", async () => {
    const result = await check((kernel, keep) => {
      const foot = keep(kernel.Manifold.cylinder(10, 10, 5, 4).rotate([0, 0, 45]));
      const ball = keep(keep(kernel.Manifold.sphere(7, 64)).translate([0, 0, 16]));
      return keep(foot.add(ball)).translate([0, 0, -4.2]);
    });
    const inBed = result.findings.filter((finding) => finding.kind === "inBed");
    expect(inBed).toHaveLength(1);
    expect(inBed[0].level).toBe("problem");
    expect(inBed[0].value).toBeCloseTo(4.2, 1);
    expect(result.layers[0].bottom).toBe(0);
    expect(result.layers.every((layer) => layer.bottom >= 0)).toBe(true);
    // From the plate to the top of the ball: 23 - 4.2 = 18.8 mm.
    expect(result.layers.length).toBe(Math.ceil(18.8 / 0.2));
  });

  it("finds no unsupported place or overhang at the tip of a cone", async () => {
    const result = await check((kernel) => kernel.Manifold.cylinder(20, 10, 0, 96));
    expect(result.findings.filter((finding) => ["unsupported", "overhang", "bridge", "thinWall", "smallIsland"].includes(finding.kind))).toEqual([]);
  });

  it("finds the arms of a T without support as one finding", async () => {
    const result = await check((kernel, keep) => {
      const stem = keep(kernel.Manifold.cube([6, 6, 20], true).translate([0, 0, 10]));
      const bar = keep(kernel.Manifold.cube([30, 6, 4], true).translate([0, 0, 22]));
      return keep(stem.add(bar));
    });
    const loose = result.findings.filter((finding) => finding.kind === "unsupported");
    expect(loose).toHaveLength(1);
    expect(loose[0].level).toBe("problem");
    expect(loose[0].layerFrom).toBe(101);
    expect(loose[0].zFrom).toBeCloseTo(20, 5);
    // Both arms, 12 x 6 mm each less what the stem holds up at 45 degrees.
    expect(loose[0].areaMm2).toBeGreaterThan(120);
    expect(loose[0].action).toBe("supportRib");
  });

  it("rates slopes of 30, 50 and 70 degrees as nothing, a hint and a problem, as one finding each", async () => {
    const thirty = await check(slope(30));
    expect(thirty.findings).toEqual([]);
    const fifty = await check(slope(50));
    const hint = fifty.findings.filter((finding) => finding.kind === "overhang");
    expect(hint).toHaveLength(1);
    expect(hint[0].level).toBe("hint");
    expect(hint[0].value).toBeGreaterThan(47);
    expect(hint[0].value).toBeLessThan(53);
    expect(hint[0].layerFrom).toBe(2);
    expect(hint[0].layerTo).toBe(50);
    const seventy = await check(slope(70));
    const problem = seventy.findings.filter((finding) => finding.kind === "overhang");
    expect(problem).toHaveLength(1);
    expect(problem[0].level).toBe("problem");
    expect(problem[0].value).toBeGreaterThan(67);
    expect(problem[0].value).toBeLessThan(73);
  });

  it("lets a bridge of 5 mm pass and gives a hint for one of 30 mm", async () => {
    const bridge = (gap: number) => (kernel: Kernel, keep: <T extends Solid>(value: T) => T) => {
      const left = keep(kernel.Manifold.cube([5, 10, 10]).translate([0, 0, 0]));
      const right = keep(kernel.Manifold.cube([5, 10, 10]).translate([5 + gap, 0, 0]));
      const deck = keep(kernel.Manifold.cube([10 + gap, 10, 3]).translate([0, 0, 10]));
      return keep(kernel.Manifold.union([left, right, deck]));
    };
    const short = await check(bridge(5));
    expect(short.findings.filter((finding) => finding.kind !== "adhesion")).toEqual([]);
    const long = await check(bridge(30));
    const found = long.findings.filter((finding) => finding.kind === "bridge");
    expect(found).toHaveLength(1);
    expect(found[0].level).toBe("hint");
    expect(found[0].value).toBeGreaterThan(28);
    expect(found[0].value).toBeLessThan(31);
    expect(long.findings.filter((finding) => finding.kind === "unsupported")).toEqual([]);
  });

  it("gives a hint for a wall 0.4 mm thick", async () => {
    const result = await check((kernel) => kernel.Manifold.cube([20, 0.4, 10]));
    const thin = result.findings.filter((finding) => finding.kind === "thinWall");
    expect(thin).toHaveLength(1);
    expect(thin[0].level).toBe("hint");
    expect(thin[0].value).toBeCloseTo(0.4, 1);
    expect(thin[0].layerFrom).toBe(1);
    expect(thin[0].layerTo).toBe(50);
  });

  it("does not call the round top of a sphere a thin wall", async () => {
    const result = await check((kernel) => kernel.Manifold.sphere(10, 96).translate([0, 0, 10]));
    expect(result.findings.filter((finding) => finding.kind === "thinWall" || finding.kind === "smallIsland")).toEqual([]);
  });

  it("finds a thin pin as a small island, and a part floating above the plate", async () => {
    const pin = await check((kernel, keep) => keep(kernel.Manifold.cube([20, 20, 2])).add(keep(kernel.Manifold.cylinder(10, 0.6, 0.6, 32).translate([10, 10, 2]))));
    expect(pin.findings.filter((finding) => finding.kind === "smallIsland")).toHaveLength(1);
    const floating = await check((kernel) => kernel.Manifold.cube([10, 10, 10]).translate([0, 0, 3]));
    const above = floating.findings.filter((finding) => finding.kind === "floatsAbove");
    expect(above).toHaveLength(1);
    expect(above[0].value).toBeCloseTo(3, 3);
    expect(floating.findings.filter((finding) => finding.kind === "unsupported")).toEqual([]);
  });

  it("says a part larger than the printer does not fit", async () => {
    const result = await check((kernel) => kernel.Manifold.cube([300, 20, 10]), { buildVolume: [256, 256, 256] });
    expect(result.findings.map((finding) => finding.kind)).toContain("tooLarge");
    const turned = await check((kernel) => kernel.Manifold.cube([200, 100, 10]), { buildVolume: [120, 220, 100] });
    expect(turned.findings.map((finding) => finding.kind)).not.toContain("tooLarge");
  });

  it("sorts problems first, filters, steps round and finds the layer of a height", async () => {
    const result = await check((kernel, keep) => {
      const stem = keep(kernel.Manifold.cube([6, 6, 20], true).translate([0, 0, 10]));
      const bar = keep(kernel.Manifold.cube([30, 6, 4], true).translate([0, 0, 22]));
      const wall = keep(kernel.Manifold.cube([0.4, 20, 8]).translate([20, -10, 0]));
      return keep(kernel.Manifold.union([stem, bar, wall]));
    });
    const sorted = sortFindings(result.findings);
    expect(sorted[0].level).toBe("problem");
    expect(countFindings(sorted).problems).toBeGreaterThan(0);
    expect(filterFindings(sorted, { kinds: ["thinWall"] }).every((finding) => finding.kind === "thinWall")).toBe(true);
    expect(stepFinding(sorted, null, 1)?.id).toBe(sorted[0].id);
    expect(stepFinding(sorted, sorted[0].id, -1)?.id).toBe(sorted[sorted.length - 1].id);
    expect(layerAtHeight(result, 20.1)).toBe(101);
    expect(layerAtHeight(result, -3)).toBe(1);
  });

  it("stops when asked", async () => {
    const kernel = await kernelPromise;
    const body = scene(kernel.Manifold.cube([10, 10, 50]));
    try {
      expect(() => checkLayersOfSolid(kernel, body as never, {}, [], { stopped: () => true })).toThrow(LayerCheckStopped);
    } finally {
      body.delete();
    }
  });

  it("keeps the settings to their ranges", () => {
    const options = normalizeLayerCheckOptions({ layerHeight: 5, overhangHint: 50, overhangProblem: 40, nozzle: "0.6" });
    expect(options.layerHeight).toBe(1);
    expect(options.overhangProblem).toBe(50);
    expect(options.nozzle).toBe(0.6);
  });

  it("checks a part of about 100,000 triangles at 0.2 mm in a few seconds", async () => {
    const kernel = await kernelPromise;
    const ball = kernel.Manifold.sphere(25, 448).translate([0, 0, 25]);
    const body = scene(ball);
    try {
      const triangles = body.numTri();
      expect(triangles).toBeGreaterThan(90_000);
      const started = performance.now();
      let calls = 0;
      const result = checkLayersOfSolid(kernel, body as never, { layerHeight: 0.2 }, [], { progress: () => (calls += 1) });
      const seconds = (performance.now() - started) / 1000;
      expect(result.layers.length).toBe(250);
      expect(calls).toBeGreaterThan(10);
      // The report quotes this figure (it runs in the worker in the editor).
      expect(seconds).toBeLessThan(30);
      expect({ triangles, seconds: Math.round(seconds * 10) / 10 }).toBeTruthy();
    } finally {
      ball.delete();
      body.delete();
    }
  });
});
