import { describe, expect, it } from "vitest";
import { screwHoleHeightForLengthBelowHead, screwHoleLengthBelowHead } from "@/lib/screwHoleGeometry";
import { MESSAGES_EN as en } from "@/lib/messages.en";

/*
 * A counterbore's length below the head (Discussion #1670): socket head cap screws are sold by the length under the
 * head, so the hole is that long plus its pocket; the Total length stays the whole.
 */

describe("the length below a counterbore's head", () => {
  it("is the total length less the pocket", () => {
    expect(screwHoleLengthBelowHead(12, 3.2)).toBeCloseTo(8.8, 9);
    // The pocket is the default 3.2 deep when its depth is left out.
    expect(screwHoleLengthBelowHead(15.2, undefined)).toBeCloseTo(12, 9);
    // A pocket set deeper than the hole allows counts as clamped, leaving the least shaft.
    expect(screwHoleLengthBelowHead(2, 3.2)).toBeCloseTo(0.2, 9);
  });

  it("sets a total length that gives back the length entered", () => {
    // M3 x 12 with the 3.2 mm pocket makes a hole 15.2 mm long.
    expect(screwHoleHeightForLengthBelowHead(12, 3.2)).toBeCloseTo(15.2, 9);
    expect(screwHoleHeightForLengthBelowHead(12, undefined)).toBeCloseTo(15.2, 9);
    for (const [length, headDepth] of [[12, 3.2], [30, 8.4], [0.5, 1], [6, 20]] as const) {
      const height = screwHoleHeightForLengthBelowHead(length, headDepth);
      expect(screwHoleLengthBelowHead(height, headDepth)).toBeCloseTo(length, 9);
    }
    // The pocket a short hole had clamped comes back as set: the shaft still gets the length entered.
    expect(screwHoleLengthBelowHead(screwHoleHeightForLengthBelowHead(10, 3.2), 3.2)).toBeCloseTo(10, 9);
    // It never leaves less than a sliver of shaft.
    expect(screwHoleHeightForLengthBelowHead(0, 3.2)).toBeCloseTo(3.4, 9);
  });

  it("has its field and hint named", () => {
    expect(en["prop.screwHoleLengthBelowHead"]).toBe("Screw length");
    expect(en["prop.screwHoleLengthBelowHeadHint"]).toMatch(/under the head/);
  });
});
