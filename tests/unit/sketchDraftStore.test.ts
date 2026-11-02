import { describe, expect, it } from "vitest";
import { sketchHasWork } from "@/lib/sketchDraftStore";
import { emptySketchProfile } from "@/lib/editorSketchCad";

describe("sketch draft", () => {
  it("keeps nothing for an empty sketch", () => {
    expect(sketchHasWork(emptySketchProfile())).toBe(false);
  });

  it("keeps a sketch with a point or a picture", () => {
    expect(sketchHasWork({ ...emptySketchProfile(), points: [{ id: "p", x: 0, z: 0 }] })).toBe(true);
    expect(sketchHasWork({ ...emptySketchProfile(), images: [{ id: "i" } as never] })).toBe(true);
  });
});
