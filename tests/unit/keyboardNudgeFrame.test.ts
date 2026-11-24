// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { moveFrame, movesAlongShapeAxes, screenAlignedNudge, shapeGivingAxes, shapeMoveWorkplane, shapeOwnAxes } from "@/lib/keyboardNudge";
import { createKeyRepeatBatch, type KeyNudge } from "@/lib/keyRepeatBatch";
import { horizontalPlacementWorkplane, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { isShapeAxisKey, shapeAxisKeyHeld, startsShapeAxisHold, useShapeAxisKey } from "@/lib/shapeAxisKey";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Direction = { x: number; y: number; z: number };
const plate = horizontalPlacementWorkplane();
const front = { right: { x: 1, y: 0, z: 0 }, away: { x: 0, y: 0.3, z: -1 } };
const S = Math.SQRT1_2;

function expectDirection(actual: Direction, expected: Direction) {
  expect(actual.x).toBeCloseTo(expected.x, 9);
  expect(actual.y).toBeCloseTo(expected.y, 9);
  expect(actual.z).toBeCloseTo(expected.z, 9);
}

/** Where an arrow key moves a shape in this frame, seen from `screen`: right (+x step) or down (+z step). */
function arrowMove(frame: PlacementWorkplane, deltaX: number, deltaZ: number, screen = front): Direction {
  const { xStep, zStep } = screenAlignedNudge(frame, deltaX, deltaZ, screen);
  return {
    x: frame.xAxis.x * xStep + frame.zAxis.x * zStep,
    y: frame.xAxis.y * xStep + frame.zAxis.y * zStep,
    z: frame.xAxis.z * xStep + frame.zAxis.z * zStep,
  };
}

describe("grid or shape mode (hold J)", () => {
  it("J switches to the shape's axes, and back to the grid with the setting on", () => {
    expect(movesAlongShapeAxes(false, false)).toBe(false);
    expect(movesAlongShapeAxes(false, true)).toBe(true);
    expect(movesAlongShapeAxes(true, false)).toBe(true);
    expect(movesAlongShapeAxes(true, true)).toBe(false);
  });

  it("keeps the workplane in grid mode and when no shape gives axes", () => {
    const shapes = [{ id: "a", rotation: 45 }, { id: "b", rotation: 30, locked: true }];
    expect(moveFrame(plate, false, ["a"], shapes)).toBe(plate);
    expect(moveFrame(plate, true, ["b"], shapes)).toBe(plate);
    expect(moveFrame(plate, true, [], shapes)).toBe(plate);
  });

  it("takes the axes of the last selected shape that is not locked", () => {
    const shapes = [{ id: "a", rotation: 10 }, { id: "b", rotation: 20 }, { id: "c", rotation: 30, locked: true }];
    expect(shapeGivingAxes(["a", "b", "c"], shapes)?.id).toBe("b");
    expect(shapeGivingAxes(["b", "a"], shapes)?.id).toBe("a");
    expect(shapeGivingAxes(["c"], shapes)).toBeNull();
  });
});

describe("the shape's own axes", () => {
  it("moves a shape spun 45° on the plate along its sides", () => {
    const frame = shapeMoveWorkplane({ rotation: 45 }, plate);
    expectDirection(frame.normal, { x: 0, y: 1, z: 0 });
    // Turned 45° about Y: its X runs to the right and back, its Z to the right and front.
    expectDirection(frame.xAxis, { x: S, y: 0, z: -S });
    expectDirection(frame.zAxis, { x: S, y: 0, z: S });
    // Seen square on, both sides lie 45° off the screen: → settles on the shape's X every time.
    expectDirection(arrowMove(frame, 1, 0), { x: S, y: 0, z: -S });
    expectDirection(arrowMove(frame, 0, 1), { x: S, y: 0, z: S });
  });

  it("settles the 45° tie in the arrow keys despite rounding noise", () => {
    const frame = { xAxis: { x: S, y: 0, z: -S }, zAxis: { x: S + 1e-15, y: 0, z: S } };
    expect(screenAlignedNudge(frame, 1, 0, front)).toEqual({ xStep: 1, zStep: 0 });
  });

  it("moves a tilted shape up its slope, and Ctrl along its own up", () => {
    // Tilted 30° about X: its up leans towards the front, its Z climbs towards the back.
    const frame = shapeMoveWorkplane({ rotation: 0, rotationX: 30 }, plate);
    expectDirection(frame.normal, { x: 0, y: Math.cos(Math.PI / 6), z: 0.5 });
    expectDirection(frame.xAxis, { x: 1, y: 0, z: 0 });
    expectDirection(frame.zAxis, { x: 0, y: -0.5, z: Math.cos(Math.PI / 6) });
    // ↑ (away, -z step) climbs the slope; ↓ comes down it.
    expectDirection(arrowMove(frame, 0, -1), { x: 0, y: 0.5, z: -Math.cos(Math.PI / 6) });
    expectDirection(arrowMove(frame, 0, 1), { x: 0, y: -0.5, z: Math.cos(Math.PI / 6) });
  });

  it("applies the X tilt last (Euler XYZ, Rx·Ry·Rz)", () => {
    // Spun 90° about Y, X runs to -Z; the tilt of 90° about X, applied after, stands it up.
    const [x, y, z] = shapeOwnAxes({ rotation: 90, rotationX: 90 });
    expectDirection(x, { x: 0, y: 1, z: 0 });
    expectDirection(y, { x: 0, y: 0, z: 1 });
    expectDirection(z, { x: 1, y: 0, z: 0 });
    // The shape's X is then its up.
    expectDirection(shapeMoveWorkplane({ rotation: 90, rotationX: 90 }, plate).normal, x);
  });

  it("flips up for an upside-down shape, so Ctrl+↑ still raises it", () => {
    const frame = shapeMoveWorkplane({ rotation: 0, rotationX: 180 }, plate);
    expectDirection(frame.normal, { x: 0, y: 1, z: 0 });
  });

  it("settles an exact 45° tilt on the earlier axis", () => {
    const frame = shapeMoveWorkplane({ rotation: 0, rotationX: 45 }, plate);
    // Y and Z both lie 45° from the plate's normal: Y comes first.
    expectDirection(frame.normal, { x: 0, y: S, z: S });
  });

  it("works on a workplane on a side wall", () => {
    const wall: PlacementWorkplane = {
      origin: { x: 50, y: 10, z: 0 },
      normal: { x: 1, y: 0, z: 0 },
      xAxis: { x: 0, y: 0, z: -1 },
      zAxis: { x: 0, y: -1, z: 0 },
    };
    const frame = shapeMoveWorkplane({ rotation: 0 }, wall);
    expectDirection(frame.normal, { x: 1, y: 0, z: 0 });
    expectDirection(frame.xAxis, { x: 0, y: 0, z: -1 });
    expectDirection(frame.zAxis, { x: 0, y: -1, z: 0 });
    expect(frame.origin).toEqual(wall.origin);
  });

  it("builds a right-handed frame, as every workplane is", () => {
    for (const turn of [{ rotation: 17 }, { rotation: 200, rotationX: 33, rotationZ: -71 }, { rotation: -90, rotationZ: 90 }]) {
      const { xAxis: x, normal: n, zAxis: z } = shapeMoveWorkplane(turn, plate);
      // x × n = z
      expectDirection({ x: x.y * n.z - x.z * n.y, y: x.z * n.x - x.x * n.z, z: x.x * n.y - x.y * n.x }, z);
    }
  });
});

describe("the J key", () => {
  it("reads the letter on the key, and the key's place on other scripts", () => {
    expect(isShapeAxisKey({ key: "j", code: "KeyJ" })).toBe(true);
    expect(isShapeAxisKey({ key: "J", code: "KeyJ" })).toBe(true);
    // Cyrillic: о on the J key.
    expect(isShapeAxisKey({ key: "о", code: "KeyJ" })).toBe(true);
    // Dvorak: J sits where QWERTY has C.
    expect(isShapeAxisKey({ key: "j", code: "KeyC" })).toBe(true);
    expect(isShapeAxisKey({ key: "h", code: "KeyJ" })).toBe(false);
  });

  it("takes Option+J on a Mac, which types ∆", () => {
    expect(isShapeAxisKey({ key: "∆", code: "KeyJ", altKey: true })).toBe(true);
    expect(isShapeAxisKey({ key: "∆", code: "KeyJ" })).toBe(false);
    // With Alt a letter still counts as itself.
    expect(isShapeAxisKey({ key: "h", code: "KeyJ", altKey: true })).toBe(false);
  });

  it("starts with Shift or Alt, not after Ctrl, and not on a repeat", () => {
    expect(startsShapeAxisHold({ key: "J", code: "KeyJ" })).toBe(true);
    expect(startsShapeAxisHold({ key: "j", code: "KeyJ", altKey: true })).toBe(true);
    expect(startsShapeAxisHold({ key: "j", code: "KeyJ", ctrlKey: true })).toBe(false);
    expect(startsShapeAxisHold({ key: "j", code: "KeyJ", metaKey: true })).toBe(false);
    expect(startsShapeAxisHold({ key: "j", code: "KeyJ", repeat: true })).toBe(false);
  });

  describe("held", () => {
    let root: Root;
    let input: HTMLInputElement;
    const key = (type: "keydown" | "keyup", target: EventTarget, init: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent(type, { key: "j", code: "KeyJ", bubbles: true, cancelable: true, ...init });
      target.dispatchEvent(event);
      return event;
    };
    function Probe() {
      useShapeAxisKey();
      return null;
    }

    beforeEach(() => {
      const host = document.body.appendChild(document.createElement("div"));
      input = document.body.appendChild(document.createElement("input"));
      root = createRoot(host);
      act(() => root.render(createElement(Probe)));
    });

    afterEach(() => {
      act(() => root.unmount());
      document.body.innerHTML = "";
    });

    it("holds until the same key comes up, also when Ctrl was pressed after J", () => {
      key("keydown", document.body);
      expect(shapeAxisKeyHeld()).toBe(true);
      expect(key("keydown", document.body, { repeat: true }).defaultPrevented).toBe(true);
      // Ctrl pressed after J: the key reports something else on the way up, its code is the same.
      key("keyup", document.body, { key: "\n", ctrlKey: true });
      expect(shapeAxisKeyHeld()).toBe(false);
    });

    it("ends when the window loses focus or the tab is hidden", () => {
      key("keydown", document.body);
      window.dispatchEvent(new Event("blur"));
      expect(shapeAxisKeyHeld()).toBe(false);
      key("keydown", document.body);
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
      expect(shapeAxisKeyHeld()).toBe(false);
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    });

    it("ignores J typed into a field, and a J another key of yours has taken", () => {
      input.focus();
      key("keydown", input);
      expect(shapeAxisKeyHeld()).toBe(false);
      input.blur();
      const taken = (event: KeyboardEvent) => event.stopImmediatePropagation();
      window.addEventListener("keydown", taken, true);
      key("keydown", document.body);
      expect(shapeAxisKeyHeld()).toBe(false);
      window.removeEventListener("keydown", taken, true);
    });
  });
});

describe("held keys in two modes", () => {
  it("does not add up moves along the grid and along the shape", () => {
    const moves: KeyNudge[] = [];
    const runs: Array<() => void> = [];
    const batch = createKeyRepeatBatch((nudge) => moves.push(nudge), {
      schedule: (run) => runs.push(run),
      cancel: () => {},
    });
    batch.add({ x: 1, z: 0, rise: 0 }, true);
    batch.add({ x: 1, z: 0, rise: 0 }, true);
    // J pressed mid-hold: the grid's moves go first, on their own.
    batch.add({ x: 1, z: 0, rise: 0, alongShape: true }, true);
    expect(moves).toEqual([{ x: 2, z: 0, rise: 0 }]);
    batch.add({ x: 1, z: 0, rise: 0, alongShape: true }, true);
    batch.flush();
    expect(moves).toEqual([{ x: 2, z: 0, rise: 0 }, { x: 2, z: 0, rise: 0, alongShape: true }]);
  });
});
