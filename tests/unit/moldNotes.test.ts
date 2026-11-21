import { describe, expect, it } from "vitest";
import { MOLD_ML_PER_US_FL_OZ, moldNotes } from "@/lib/moldTool";

describe("the mold's notes", () => {
  it("give the volume in millilitres and US fluid ounces", () => {
    const result = { parts: [], volume: 100, warnings: [], keys: 4, vents: 0, sprues: 1 };
    expect(moldNotes(result, "twoPart")[0]).toBe("Cavity: 100 ml / 3.38 fl oz.");
    expect(moldNotes({ ...result, volume: 74.3 }, "box")[0]).toBe("Silicone needed: about 74.3 ml / 2.51 fl oz.");
    expect(MOLD_ML_PER_US_FL_OZ).toBeCloseTo(29.5735, 4);
  });

  it("give no volume for a die, but its clearance", () => {
    expect(moldNotes({ parts: [], volume: 0, warnings: [], keys: 0, vents: 0, sprues: 0, clearance: 0.07 }, "die")).toEqual(["Clearance per side: 0.07 mm."]);
  });
});
