import { describe, expect, it } from "vitest";
import { LID_DEFAULTS, lidHingedBefore, lidPanelAsk, lidPreviewParts, normalizeLidOptions } from "@/lib/lidTool";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The lid panel's live preview (Discussion #2130): it asks for the lid as the panel's Apply does (lidPanelAsk), shows
 * the lid with its loose parts and what goes onto the body (lidPreviewParts), and does not try where Make lid refuses.
 */

const part = (id: string, extra: Partial<WorkplaneShape> = {}) => ({ id, name: id, kind: "box", x: 0, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0, color: "#888888", ...extra }) as WorkplaneShape;

describe("what the lid panel asks for", () => {
  it("leaves out what the panel does not show", () => {
    // A screw lid takes no magnets, hinge, click bumps or handle; a flip-top only goes with a cap.
    const screw = lidPanelAsk(normalizeLidOptions({ type: "screw", magnets: true, hinge: true, clickBumps: true, handle: "tab", latches: 2 }, LID_DEFAULTS));
    expect(screw).toMatchObject({ magnets: false, hinge: false, clickBumps: false, handle: "none", latches: 0 });
    // A hinge only goes with a plug or a flat lid, end plugs only with a flush hinge.
    const cap = lidPanelAsk(normalizeLidOptions({ type: "cap", hinge: true, hingeEndPlugs: true }, LID_DEFAULTS));
    expect(cap.hinge).toBe(false);
    const plug = lidPanelAsk(normalizeLidOptions({ type: "plug", hinge: true, hingeStyle: "outside", hingeEndPlugs: true }, LID_DEFAULTS));
    expect(plug).toMatchObject({ hinge: true, hingeEndPlugs: false });
    // Latches on the back only without a hinge; clips in place not with a stacking top.
    const latched = lidPanelAsk(normalizeLidOptions({ type: "plug", latches: 2, latchBack: true, hinge: true, latchInPlace: true, stackTop: true }, LID_DEFAULTS));
    expect(latched.latchBack).toBe(false);
    expect(latched.latchInPlace).toBe(false);
  });

  it("keeps everything the panel shows as it is", () => {
    const shown = normalizeLidOptions({ type: "plug", thickness: 2.4, gap: 0.3, depth: 6, magnets: true, clickBumps: true, handle: "tab", latches: 2, latchWidth: 12 }, LID_DEFAULTS);
    const asked = lidPanelAsk(shown);
    expect(asked).toMatchObject({ type: "plug", thickness: 2.4, gap: 0.3, depth: 6, magnets: true, clickBumps: true, handle: "tab", latches: 2, latchWidth: 12 });
    expect(Object.keys(asked).sort()).toEqual(Object.keys(shown).sort());
  });
});

describe("what the lid preview shows", () => {
  it("shows the lid, its loose parts and what goes onto the body, but nothing cut into the body", () => {
    const lid = part("lid");
    const parts = lidPreviewParts({
      lid,
      hinge: { knuckles: part("knuckles"), pin: part("pin"), plugs: part("plugs"), cuts: part("slots", { hole: true }), count: 3, style: "flush", pinLength: 40 },
      latch: { body: part("cheeks"), clips: part("clips"), count: 2, width: 12, pin: 3 },
      magnets: { posts: [part("post-a"), part("post-b")], pockets: [part("pocket", { hole: true })] },
      slide: { cuts: part("grooves", { hole: true }), side: "front", depth: 2, wall: 2, bumps: 1, frame: 0 },
      clickBumps: { count: 4, dimples: part("dimples", { hole: true }) },
    });
    const by = (role: string) => parts.filter((p) => p.role === role).map((p) => p.shape.id);
    expect(by("lid")).toEqual(["lid"]);
    expect(by("loose")).toEqual(["pin", "plugs", "clips"]);
    expect(by("body")).toEqual(["knuckles", "cheeks", "post-a", "post-b"]);
    expect(parts.some((p) => p.shape.hole)).toBe(false);
  });

  it("is only the lid for a plain lid", () => {
    expect(lidPreviewParts({ lid: part("lid") })).toEqual([{ shape: part("lid"), role: "lid" }]);
  });
});

describe("a body with a hinge from an earlier lid", () => {
  it("is found by its knuckles, also inside a group, but not by a pin or the slots", () => {
    expect(lidHingedBefore(part("box", { groupedShapes: [part("box-hinge-1")] }))).toBe(true);
    expect(lidHingedBefore(part("outer", { groupedShapes: [part("box", { groupedShapes: [part("box-hinge-2")] })] }))).toBe(true);
    expect(lidHingedBefore(part("box", { groupedShapes: [part("box-hinge-pin-1"), part("box-hinge-cuts-1")] }))).toBe(false);
    expect(lidHingedBefore(part("box"))).toBe(false);
  });
});
