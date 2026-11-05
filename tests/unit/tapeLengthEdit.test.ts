import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { tapeLengthMoverOf, tapeLengthRefusalText, type TapeModel } from "@/components/workplane/ViewportOverlays";
import { formatLengthMm, parseLengthMm, setLengthUnit } from "@/lib/measurementUnits";
import { tapeAxisLengthShift, tapeLengthShift } from "@/lib/tapeCircle";
import { TAPE_EDITOR_AXIS, TAPE_SCENE_AXIS, tapeLengthFieldToApply, tapeLengthMcpRefusal, tapeLengthMover } from "@/lib/tapeLengthEdit";
import { tapeAxisSpans, tapeDeltaAxes } from "@/lib/tapeLabels";
import type { WorkplaneShape } from "@/types/layerling";

const box = (id: string, overrides: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#d41721", x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0, ...overrides,
});

// Discussion #610: click two points, type a distance, and the second body moves until the two are that far apart.
describe("which body a typed tape length moves", () => {
  const shapes = new Map([["a", box("a")], ["b", box("b")], ["held", box("held", { locked: true })]]);
  const lookup = (id: string) => shapes.get(id);
  const ends = (startShapeId: string | null, endShapeId: string | null, wholeEdge = false) => ({ startShapeId, endShapeId, wholeEdge });

  it("moves the body at the second point and leaves the first one where it is", () => {
    expect(tapeLengthMover(ends("a", "b"), lookup, [])).toEqual({ shapeId: "b", movesEnd: true });
    expect(tapeLengthMover(ends("a", "b"), lookup, ["a", "b"])).toEqual({ shapeId: "b", movesEnd: true });
  });

  it("moves the body at the first point when only that one is selected (#823)", () => {
    expect(tapeLengthMover(ends("a", "b"), lookup, ["a"])).toEqual({ shapeId: "a", movesEnd: false });
  });

  it("moves the one body there is when the other point is on the workplane", () => {
    expect(tapeLengthMover(ends("a", null), lookup, [])).toEqual({ shapeId: "a", movesEnd: false });
    expect(tapeLengthMover(ends(null, "b"), lookup, [])).toEqual({ shapeId: "b", movesEnd: true });
  });

  it("refuses a locked body and names it, but lets the other one move when only that is selected", () => {
    expect(tapeLengthMover(ends("a", "held"), lookup, [])).toEqual({ refusal: "locked", shapeId: "held" });
    expect(tapeLengthMover(ends("a", "held"), lookup, ["a"])).toEqual({ shapeId: "a", movesEnd: false });
  });

  it("refuses two points on one body, on no body, or a whole edge", () => {
    expect(tapeLengthMover(ends("a", "a"), lookup, [])).toEqual({ refusal: "sameBody" });
    expect(tapeLengthMover(ends(null, null), lookup, [])).toEqual({ refusal: "noBody" });
    expect(tapeLengthMover(ends("a", "b", true), lookup, [])).toEqual({ refusal: "edge" });
  });

  it("counts a point on a body that is gone as a point on nothing", () => {
    expect(tapeLengthMover(ends("a", "gone"), lookup, [])).toEqual({ shapeId: "a", movesEnd: false });
    expect(tapeLengthMover(ends("gone", "lost"), lookup, [])).toEqual({ refusal: "noBody" });
  });

  it("reads the bodies off the tape measure's points and lines", () => {
    const model: TapeModel = {
      points: [
        { id: "p1", x: 0, y: 20, z: 0, attachment: { shapeId: "a", normalized: [0, 0.5, 0] } },
        { id: "p2", x: 40, y: 20, z: 0, attachment: { shapeId: "b", normalized: [0, 0.5, 0] } },
        { id: "p3", x: 40, y: 0, z: 30 },
      ],
      segments: [
        { id: "s1", startId: "p1", endId: "p2" },
        { id: "s2", startId: "p2", endId: "p3" },
        { id: "s3", startId: "p1", endId: "p2", edge: { key: "e", shapeId: "a", normalizedPoints: [[0, 0, 0], [1, 0, 0]] } },
      ],
      startPointId: null,
      hover: null,
    };
    const bodies = { shapes: [...shapes.values()], selectedIds: [] };
    expect(tapeLengthMoverOf(model, "s1", bodies)).toEqual({ shapeId: "b", movesEnd: true });
    expect(tapeLengthMoverOf(model, "s2", bodies)).toEqual({ shapeId: "b", movesEnd: false });
    expect(tapeLengthMoverOf(model, "s3", bodies)).toEqual({ refusal: "edge" });
    expect(tapeLengthMoverOf(model, "none", bodies)).toBeNull();
  });

  it("says why in the label's tip, naming a locked body", () => {
    expect(tapeLengthRefusalText("locked", "Lid")).toContain("“Lid”");
    for (const refusal of ["sameBody", "noBody", "edge"] as const) expect(tapeLengthRefusalText(refusal, "")).not.toBe("");
    expect(new Set((["sameBody", "noBody", "edge", "locked"] as const).map((refusal) => tapeLengthRefusalText(refusal, "Lid"))).size).toBe(4);
  });

  it("says why to MCP in English, with the axis that gives no direction", () => {
    expect(tapeLengthMcpRefusal("locked", "Lid")).toContain('"Lid" is locked');
    expect(tapeLengthMcpRefusal("noDirection", "", "y")).toContain("level along y");
    expect(tapeLengthMcpRefusal("noDirection", "")).toContain("on top of each other");
    expect(tapeLengthMcpRefusal("missing", "")).toContain("No measurement");
  });
});

describe("a typed reach along one axis (Discussion #610)", () => {
  // The middle of a box's top at x = -25 and of another's at x = 25, 3 mm further back (inside z = -3) and 5 mm higher.
  const start = new THREE.Vector3(-25, 20, 0);
  const end = new THREE.Vector3(25, 25, -3);

  it("moves the body along that axis only, until the points are that far apart on it", () => {
    const shift = tapeAxisLengthShift(start, end, "x", 30, true)!;
    expect(shift.toArray()).toEqual([-20, 0, 0]);
    const moved = end.clone().add(shift);
    expect(moved.x - start.x).toBeCloseTo(30, 9);
    expect([moved.y, moved.z]).toEqual([end.y, end.z]);
  });

  it("keeps the side the body was on, also below or in front of the other point", () => {
    // The second point lies 3 mm towards the back (inside z is -3): 10 keeps it at the back.
    expect(end.clone().add(tapeAxisLengthShift(start, end, "z", 10, true)!).z).toBeCloseTo(-10, 9);
    const lower = new THREE.Vector3(25, 5, 0);
    expect(lower.clone().add(tapeAxisLengthShift(start, lower, "y", 4, true)!).y).toBeCloseTo(16, 9);
  });

  it("takes it to the other side for a negative length, and lines the points up for 0", () => {
    expect(end.clone().add(tapeAxisLengthShift(start, end, "x", -5, true)!).x).toBeCloseTo(-30, 9);
    expect(end.clone().add(tapeAxisLengthShift(start, end, "y", 0, true)!).y).toBeCloseTo(start.y, 9);
  });

  it("moves the body at the first point the other way when that one moves", () => {
    const moved = start.clone().add(tapeAxisLengthShift(start, end, "x", 30, false)!);
    expect(end.x - moved.x).toBeCloseTo(30, 9);
    expect([moved.y, moved.z]).toEqual([start.y, start.z]);
  });

  it("gives no direction along an axis the points are level on", () => {
    expect(tapeAxisLengthShift(start, new THREE.Vector3(25, 20, 0), "y", 10, true)).toBeNull();
  });

  it("names the axes as the editor does: Y is the depth (inside z), Z the height (inside y)", () => {
    expect(TAPE_SCENE_AXIS).toEqual({ X: "x", Y: "z", Z: "y" });
    for (const axis of ["X", "Y", "Z"] as const) expect(TAPE_EDITOR_AXIS[TAPE_SCENE_AXIS[axis]]).toBe(axis);
  });

  it("offers a field for each axis the label's tip lists, none along a single axis", () => {
    expect(tapeDeltaAxes(tapeAxisSpans([start, end]), 2)).toEqual(["X", "Y", "Z"]);
    expect(tapeDeltaAxes(tapeAxisSpans([start, new THREE.Vector3(25, 20, -3)]), 2)).toEqual(["X", "Y"]);
    expect(tapeDeltaAxes(tapeAxisSpans([start, new THREE.Vector3(25, 20, 0)]), 2)).toEqual([]);
    // A reach the accuracy shows as 0.00 is no axis of its own.
    expect(tapeDeltaAxes(tapeAxisSpans([start, new THREE.Vector3(25, 20.001, 0)]), 2)).toEqual([]);
  });
});

describe("the typed number is in the user's unit (Discussion #610)", () => {
  afterEach(() => setLengthUnit({ units: "Metric (Default)", scale: "1:1 (millimeters)" }));
  const start = new THREE.Vector3(0, 10, 0);
  const end = new THREE.Vector3(30, 10, -40);

  it("reads millimetres in a metric design", () => {
    const moved = end.clone().add(tapeLengthShift(start, end, parseLengthMm("25"), true)!);
    expect(moved.distanceTo(start)).toBeCloseTo(25, 9);
  });

  it("reads inches, as fractions too, in an imperial design", () => {
    setLengthUnit({ units: "Imperial", scale: "1:1 (inches)" });
    const moved = end.clone().add(tapeLengthShift(start, end, parseLengthMm("1 1/2"), true)!);
    expect(moved.distanceTo(start)).toBeCloseTo(38.1, 9);
    expect(formatLengthMm(moved.distanceTo(start), 2)).toBe("1½");
    const along = end.clone().add(tapeAxisLengthShift(start, end, "x", parseLengthMm("2"), true)!);
    expect(along.x - start.x).toBeCloseTo(50.8, 9);
  });

  it("gives nothing to move by for text that is no number", () => {
    expect(Number.isFinite(parseLengthMm("abc"))).toBe(false);
  });
});

describe("which number the field applies", () => {
  it("applies the one typed into last, on Enter and on leaving", () => {
    expect(tapeLengthFieldToApply("X", "length", "enter")).toBe("X");
    expect(tapeLengthFieldToApply("length", null, "leave")).toBe("length");
  });

  it("makes the focused number exact on Enter before anything was typed", () => {
    expect(tapeLengthFieldToApply(null, "Y", "enter")).toBe("Y");
  });

  it("moves nothing when it is left without typing, so a rounded number is no reason to nudge the body", () => {
    expect(tapeLengthFieldToApply(null, "length", "leave")).toBeNull();
  });
});
