import { describe, expect, it } from "vitest";
import { MAX_LID_TURN_LENGTH, MIN_LID_TURN_LENGTH, TURN_BUTTON_PLAY, lidTurnButtonLedge, lidTurnButtonMeasures } from "@/lib/lidTurnButton";
import { LID_DEFAULTS, LID_LATCH_STYLES, normalizeLidOptions } from "@/lib/lidTool";

describe("a turn button on a lid (Discussion #2047)", () => {
  it("is a sixth kind of latch with a bar length kept to what is offered", () => {
    expect(LID_LATCH_STYLES).toContain("turn");
    expect(normalizeLidOptions({ latchStyle: "turn" }).latchStyle).toBe("turn");
    expect(LID_DEFAULTS.turnLength).toBe(24);
    expect(normalizeLidOptions({ turnLength: 99 }).turnLength).toBe(MAX_LID_TURN_LENGTH);
    expect(normalizeLidOptions({ turnLength: 1 }).turnLength).toBe(MIN_LID_TURN_LENGTH);
  });

  it("turns over the lid's edge, keeps its play off the pin, the ledge and the lid, and clicks a little past its play", () => {
    for (let length = MIN_LID_TURN_LENGTH; length <= MAX_LID_TURN_LENGTH; length += 2) {
      const measures = lidTurnButtonMeasures(length);
      // Turned a quarter turn it reaches well over the lid's edge; along the wall it keeps off it.
      expect(measures.overlap).toBeGreaterThan(length / 5);
      expect(measures.out - measures.width / 2).toBeGreaterThanOrEqual(measures.edgeGap);
      // Over the lid's top by the play, round the pin by the play.
      expect(measures.barBottom).toBeCloseTo(TURN_BUTTON_PLAY, 9);
      expect(measures.hole - measures.pin).toBeCloseTo(TURN_BUTTON_PLAY, 9);
      // The head's 45 degree face is the play off the countersink's, square to them.
      const sink = measures.barTop - measures.countersink;
      expect(((sink - measures.hole) - (measures.headStart - measures.pin)) / Math.SQRT2).toBeCloseTo(-TURN_BUTTON_PLAY, 9);
      // The bump stands higher than the bar can lift freely, but only just, and under the bar however it is turned.
      const freeLift = measures.play + measures.play * Math.SQRT2;
      expect(measures.bumpHeight - freeLift).toBeGreaterThan(0.05);
      expect(measures.bumpHeight - freeLift).toBeLessThan(0.2);
      expect(measures.detent + measures.bumpLength / 2 + measures.play).toBeLessThan(measures.width / 2 - 0.5);
      expect(measures.detent - measures.bumpLength / 2 - measures.play).toBeGreaterThan(measures.hole);
      // The groove for it leaves the bar above it whole, under the countersink.
      expect(measures.barBottom + measures.bumpHeight).toBeLessThan(sink);
      // The ledge under the bar keeps off the lid's edge above the rim, and falls back to the wall at 45 degrees.
      for (const rim of [1, 2, 4]) {
        const ledge = lidTurnButtonLedge(measures, rim);
        const above = ledge.points.filter(([, z]) => z > -rim + 1e-9);
        expect(Math.min(...above.map(([o]) => o))).toBeCloseTo(measures.edgeGap, 9);
        const [[o0, z0], [o1, z1]] = ledge.points;
        expect(z1 - z0).toBeCloseTo(o1 - o0, 9);
        expect(ledge.lowest).toBeLessThan(-rim);
      }
    }
  });
});
