import { describe, expect, it } from "vitest";
import { LID_DEFAULTS, MAX_LID_GAP, MAX_LID_THICKNESS, MIN_LID_WALL, normalizeLidOptions } from "@/lib/lidTool";

describe("lid options (#1009)", () => {
  it("starts from a push-in lid with a normal fit", () => {
    expect(normalizeLidOptions()).toEqual(LID_DEFAULTS);
    expect(LID_DEFAULTS).toEqual({ type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6 });
  });

  it("takes the kind in any case and keeps the default for an unknown one", () => {
    expect(normalizeLidOptions({ type: " CAP " }).type).toBe("cap");
    expect(normalizeLidOptions({ type: "flat" }).type).toBe("flat");
    expect(normalizeLidOptions({ type: "thread" }).type).toBe("plug");
  });

  it("brings sizes into range and ignores what is not a number", () => {
    const options = normalizeLidOptions({ thickness: 50, gap: -1, depth: "6", wall: 0.1 });
    expect(options.thickness).toBe(MAX_LID_THICKNESS);
    expect(options.gap).toBe(0);
    expect(options.depth).toBe(6);
    expect(options.wall).toBe(MIN_LID_WALL);
    expect(normalizeLidOptions({ gap: 5 }).gap).toBe(MAX_LID_GAP);
    expect(normalizeLidOptions({ thickness: "thick" }).thickness).toBe(LID_DEFAULTS.thickness);
  });
});
