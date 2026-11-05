import { describe, expect, it } from "vitest";
import { meshAabb } from "@/lib/editorMeshCore";
import { undersideOffset } from "@/lib/positionUnderside";
import type { WorkplaneShape } from "@/types/layerling";

// A cylinder 5 mm across and 15 mm long, lying on its side on the plate as in Discussion #1303:
// turned about its middle, its elevation is 2.5 - 7.5 = -5.
const cylinder = (patch: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id: "c", name: "Cylinder", kind: "cylinder", color: "#ff0000", x: 0, z: 0, elevation: 0,
  size: 5, width: 5, depth: 5, height: 15, rotation: 0, ...patch,
});

describe("Z shows the underside of a tilted body (Discussion #1303)", () => {
  it("keeps the elevation for a body standing upright or turned only about Z", () => {
    expect(undersideOffset(cylinder())).toBe(0);
    expect(undersideOffset(cylinder({ rotation: 45 }))).toBe(0);
  });

  it("shows 0 for a 15 mm cylinder lying on the plate", () => {
    const lying = cylinder({ rotationX: 90, elevation: -5 });
    expect(meshAabb(lying).minY).toBeCloseTo(0, 4);
    expect((lying.elevation ?? 0) + undersideOffset(lying)).toBeCloseTo(0, 4);
  });

  it("puts the underside at the height typed into Z", () => {
    const lying = cylinder({ rotationZ: 90, elevation: -5 });
    const below = undersideOffset(lying);
    const raised = { ...lying, elevation: 10 - below };
    expect(meshAabb(raised).minY).toBeCloseTo(10, 4);
  });
});
