import { describe, expect, it } from "vitest";
import Module, { type CrossSection } from "manifold-3d";
import { DRAW_LATCH_PLAY, MAX_LID_DRAW_CLAMP, MAX_LID_DRAW_WIDTH, MIN_LID_DRAW_CLAMP, MIN_LID_DRAW_WIDTH, lidDrawLatchMeasures, lidDrawLatchPull, lidDrawLatchSections } from "@/lib/lidDrawLatch";
import { LID_DEFAULTS, normalizeLidOptions } from "@/lib/lidTool";

const WIDTHS = [MIN_LID_DRAW_WIDTH, 12, 16, 20, MAX_LID_DRAW_WIDTH];
const CLAMPS = [MIN_LID_DRAW_CLAMP, 0.2, 0.5, MAX_LID_DRAW_CLAMP];

describe("a draw latch on a lid (Discussion #2047)", () => {
  it("is a fifth kind of latch with a clamp kept to what is offered", () => {
    expect(normalizeLidOptions({ latchStyle: "draw" }).latchStyle).toBe("draw");
    expect(LID_DEFAULTS.drawClamp).toBe(0.2);
    expect(normalizeLidOptions({ drawClamp: 5 }).drawClamp).toBe(MAX_LID_DRAW_CLAMP);
    expect(normalizeLidOptions({ drawClamp: -1 }).drawClamp).toBe(MIN_LID_DRAW_CLAMP);
    // Narrower than its two plates and the link between them allow, it is made as narrow as it can be.
    expect(lidDrawLatchMeasures(6, 0.2).width).toBe(MIN_LID_DRAW_WIDTH);
  });

  it("goes over centre: the link is pulled tightest past where the lever is shut, and gives the clamp when shut", () => {
    for (const width of WIDTHS) {
      for (const clamp of CLAMPS) {
        const measures = lidDrawLatchMeasures(width, clamp);
        const pull = lidDrawLatchPull(measures);
        expect(pull.shut).toBeCloseTo(clamp, 6);
        // A snap of a tenth of a millimetre or more past what holds it shut.
        expect(pull.dead - pull.shut).toBeGreaterThan(0.15);
        // Shut, the cross pin is past the line from the lever's pin to the lid's, on the wall's side.
        expect(measures.link[0]).toBeLessThan(measures.pivot[0]);
        expect(measures.dead[0]).toBeCloseTo(measures.pivot[0], 9);
        // The link fits between the lever's plates with the play on both sides.
        expect(measures.linkWidth + 2 * (measures.plate + DRAW_LATCH_PLAY)).toBeCloseTo(measures.width, 9);
        expect(measures.linkWidth).toBeGreaterThan(5);
      }
    }
  });

  it("draws its parts apart from each other, the pins and the wall, with the play of a part printed in place", async () => {
    const kernel = await Module();
    kernel.setup();
    for (const width of WIDTHS) {
      for (const clamp of [MIN_LID_DRAW_CLAMP, MAX_LID_DRAW_CLAMP]) {
        const created: { delete?: () => void }[] = [];
        const keep = <T extends { delete?: () => void }>(value: T) => (created.push(value), value);
        try {
          const measures = lidDrawLatchMeasures(width, clamp);
          const parts = lidDrawLatchSections(kernel, measures, created);
          const pin = keep(keep(kernel.CrossSection.circle(measures.pin, 48)).translate(measures.pivot));
          const lidPin = keep(keep(kernel.CrossSection.circle(measures.pin, 48)).translate([measures.out, 0]));
          // The wall up to the rim, and the lid's plate on it, in front of which nothing may come closer than 0.4 mm.
          const wall = keep(keep(kernel.CrossSection.square([40, 80])).translate([-40 + 0.4 - DRAW_LATCH_PLAY, -70]));
          // Two sections are `gap` apart when each grown by half of it does not touch the other.
          const apart = (a: CrossSection, b: CrossSection, gap: number) => keep(keep(a.offset(gap / 2 - 1e-3, "Round")).intersect(keep(b.offset(gap / 2 - 1e-3, "Round")))).area();
          for (const [a, b] of [[parts.leverMiddle, parts.link], [parts.leverMiddle, pin], [parts.leverSide, pin], [parts.link, pin], [parts.link, parts.rest], [parts.leverMiddle, parts.rest], [parts.leverSide, parts.rest]] as const) {
            expect(apart(a, b, DRAW_LATCH_PLAY)).toBe(0);
          }
          for (const part of [parts.leverMiddle, parts.leverSide, parts.link]) expect(keep(part.intersect(wall)).area()).toBe(0);
          // The hook prints that much lower than it bears on the lid's pin: it overlaps where the pin will be.
          expect(keep(parts.link.intersect(lidPin)).area()).toBeGreaterThan(0);
          // Each part is one piece, the lever's ring and the link's ring closed round their pins.
          expect(parts.link.numContour()).toBe(2);
          expect(parts.leverMiddle.area()).toBeGreaterThan(0);
        } finally {
          Array.from(new Set(created)).forEach((value) => value.delete?.());
        }
      }
    }
  });
});
