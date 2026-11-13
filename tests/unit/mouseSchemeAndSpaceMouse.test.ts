import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { cameraButtonsFor, slicerLeftTurn } from "@/lib/cameraMouseButtons";
import { isSketchPanGesture } from "@/lib/sketchPointerControls";
import { moveCameraBySpaceMouse, readSpaceMouseReport, smoothSpaceMouseAxes, SPACE_MOUSE_NO_INVERT, SPACE_MOUSE_REST, spaceMouseAmount, type SpaceMouseAxes } from "@/lib/spaceMouse";
import { DEFAULT_WORKPLANE_WORKSPACE, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";

describe("mouse buttons as in Bambu Studio and OrcaSlicer (#1013)", () => {
  const press = (button: number, extra: Partial<{ pointerType: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean }> = {}) => ({
    button, pointerType: "mouse", shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...extra,
  });

  it("lets the right button shift the view in the slicer scheme and turn it in layerling's own", () => {
    expect(cameraButtonsFor("slicer")).toEqual({ MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN });
    expect(cameraButtonsFor("layerling")).toEqual({ MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE });
    expect(cameraButtonsFor(undefined)).toEqual({ MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE });
  });

  it("turns the view with a plain left press of a mouse or pen in the slicer scheme only; Shift, Alt, Ctrl and a finger keep their ways", () => {
    expect(slicerLeftTurn("slicer", press(0))).toBe(true);
    expect(slicerLeftTurn("slicer", press(0, { pointerType: "pen" }))).toBe(true);
    expect(slicerLeftTurn("layerling", press(0))).toBe(false);
    expect(slicerLeftTurn("slicer", press(0, { shiftKey: true }))).toBe(false);
    expect(slicerLeftTurn("slicer", press(0, { altKey: true }))).toBe(false);
    expect(slicerLeftTurn("slicer", press(0, { ctrlKey: true }))).toBe(false);
    expect(slicerLeftTurn("slicer", press(0, { pointerType: "touch" }))).toBe(false);
    expect(slicerLeftTurn("slicer", press(2))).toBe(false);
  });

  it("shifts a sketch with the right button alone in the slicer scheme, with a modifier in layerling's own", () => {
    const right = { button: 2, ctrlKey: false, metaKey: false, shiftKey: false };
    expect(isSketchPanGesture(right, "slicer")).toBe(true);
    expect(isSketchPanGesture(right)).toBe(false);
    expect(isSketchPanGesture({ ...right, ctrlKey: true })).toBe(true);
  });

  it("keeps layerling's own scheme unless the slicer one was chosen", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.mouseScheme).toBe("layerling");
    expect(normalizeWorkspaceSettings({ mouseScheme: "slicer" }).mouseScheme).toBe("slicer");
    expect(normalizeWorkspaceSettings({ mouseScheme: "blender" }).mouseScheme).toBe("layerling");
    expect(normalizeWorkspaceSettings({}).mouseScheme).toBe("layerling");
  });
});

describe("a 3D mouse over WebHID (#1013)", () => {
  const report = (...values: number[]) => {
    const data = new DataView(new ArrayBuffer(values.length * 2));
    values.forEach((value, index) => data.setInt16(index * 2, value, true));
    return data;
  };

  it("reads all six axes from one report of a newer device, and shifts and turns from two of an older one", () => {
    expect(readSpaceMouseReport(SPACE_MOUSE_REST, 1, report(10, -20, 30, -40, 50, -60))).toEqual({ tx: 10, ty: -20, tz: 30, rx: -40, ry: 50, rz: -60 });
    const shifted = readSpaceMouseReport(SPACE_MOUSE_REST, 1, report(100, 0, -5));
    expect(shifted).toEqual({ tx: 100, ty: 0, tz: -5, rx: 0, ry: 0, rz: 0 });
    expect(readSpaceMouseReport(shifted, 2, report(7, 8, 9))).toEqual({ tx: 100, ty: 0, tz: -5, rx: 7, ry: 8, rz: 9 });
    // The buttons (report 3) leave the axes as they were.
    expect(readSpaceMouseReport(shifted, 3, report(1))).toBe(shifted);
  });

  it("takes a cap near its rest as at rest, and gives small pushes fine moves", () => {
    expect(spaceMouseAmount(10)).toBe(0);
    expect(spaceMouseAmount(-12)).toBe(0);
    expect(spaceMouseAmount(350)).toBe(1);
    expect(spaceMouseAmount(-350)).toBe(-1);
    expect(spaceMouseAmount(500)).toBe(1);
    expect(Math.abs(spaceMouseAmount(100))).toBeLessThan(0.1);
  });

  const view = () => {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 6000);
    camera.position.set(0, 100, 200);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    return { camera, target: new THREE.Vector3() };
  };

  it("leaves the view alone while the cap rests", () => {
    const { camera, target } = view();
    expect(moveCameraBySpaceMouse(camera, target, { ...SPACE_MOUSE_REST, tx: 5 }, 0.016)).toBe(false);
    expect(camera.position.toArray()).toEqual([0, 100, 200]);
  });

  it("zooms in when the cap is pushed away, keeping the camera looking at the same point", () => {
    const { camera, target } = view();
    const before = camera.position.distanceTo(target);
    expect(moveCameraBySpaceMouse(camera, target, { ...SPACE_MOUSE_REST, ty: 350 }, 0.1)).toBe(true);
    expect(camera.position.distanceTo(target)).toBeLessThan(before);
    expect(target.length()).toBe(0);
  });

  it("turns the view about the up axis with a twist, at the same distance and height", () => {
    const { camera, target } = view();
    moveCameraBySpaceMouse(camera, target, { ...SPACE_MOUSE_REST, rz: 350 }, 0.2);
    expect(camera.position.distanceTo(target)).toBeCloseTo(Math.hypot(100, 200), 6);
    expect(camera.position.y).toBeCloseTo(100, 6);
    expect(Math.abs(camera.position.x)).toBeGreaterThan(1);
  });

  it("shifts camera and target together when the cap is shifted sideways, the model following the cap", () => {
    const { camera, target } = view();
    moveCameraBySpaceMouse(camera, target, { ...SPACE_MOUSE_REST, tx: 350 }, 0.1);
    // Cap to the right: the model goes right, so the view looks to the left (the first real device, Ciwa, 04.11.2026).
    expect(target.x).toBeLessThan(0);
    expect(camera.position.x).toBeCloseTo(target.x, 6);
    expect(camera.position.clone().sub(target).length()).toBeCloseTo(Math.hypot(100, 200), 6);
  });

  it("goes the other way for every direction the person turned round, and only for that one", () => {
    const run = (axes: Partial<typeof SPACE_MOUSE_REST>, invert = SPACE_MOUSE_NO_INVERT) => {
      const { camera, target } = view();
      moveCameraBySpaceMouse(camera, target, { ...SPACE_MOUSE_REST, ...axes }, 0.1, invert);
      return { camera, target };
    };
    expect(run({ tx: 350 }, { ...SPACE_MOUSE_NO_INVERT, shift: true }).target.x).toBeGreaterThan(0);
    expect(run({ tx: 350 }, { ...SPACE_MOUSE_NO_INVERT, zoom: true }).target.x).toBeLessThan(0);
    // Lifting the cap lifts the model, so the view goes down; turned round it goes up.
    expect(run({ tz: -350 }).target.y).toBeLessThan(0);
    expect(run({ tz: -350 }, { ...SPACE_MOUSE_NO_INVERT, lift: true }).target.y).toBeGreaterThan(0);
    const before = view().camera.position.distanceTo(new THREE.Vector3());
    expect(run({ ty: 350 }).camera.position.distanceTo(new THREE.Vector3())).toBeLessThan(before);
    expect(run({ ty: 350 }, { ...SPACE_MOUSE_NO_INVERT, zoom: true }).camera.position.distanceTo(new THREE.Vector3())).toBeGreaterThan(before);
    const twisted = run({ rz: 350 }).camera.position.x;
    expect(run({ rz: 350 }, { ...SPACE_MOUSE_NO_INVERT, twist: true }).camera.position.x).toBeCloseTo(-twisted, 6);
    const tilted = run({ rx: 350 }).camera.position.y;
    const tiltedBack = run({ rx: 350 }, { ...SPACE_MOUSE_NO_INVERT, tilt: true }).camera.position.y;
    expect(Math.sign(tiltedBack - 100)).toBe(-Math.sign(tilted - 100));
  });
});

describe("a 3D mouse turned freely moves the view smoothly (#1013)", () => {
  const frame = 1 / 60;
  /** A cap twisted and tilted at once, every axis trembling by up to `shake` device units from report to report. */
  const shaky = (index: number, shake: number): SpaceMouseAxes => {
    const wobble = (seed: number) => Math.sin(index * 12.9898 + seed * 78.233) * shake;
    return { tx: 30 + wobble(1), ty: wobble(2), tz: 20 + wobble(3), rx: 160 + wobble(4), ry: wobble(5), rz: 200 + wobble(6) };
  };
  const spread = (values: number[]) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  };

  it("evens out the trembling of several axes at once", () => {
    let smoothed = SPACE_MOUSE_REST;
    const raw: number[] = [];
    const even: number[] = [];
    for (let index = 0; index < 120; index += 1) {
      const axes = shaky(index, 60);
      smoothed = smoothSpaceMouseAxes(smoothed, axes, frame);
      if (index >= 60) {
        raw.push(spaceMouseAmount(axes.rz));
        even.push(spaceMouseAmount(smoothed.rz));
      }
    }
    expect(spread(even)).toBeLessThan(spread(raw) / 2);
  });

  it("follows a held cap within a few tenths of a second", () => {
    let smoothed = SPACE_MOUSE_REST;
    const held = { ...SPACE_MOUSE_REST, rz: 300 };
    for (let index = 0; index < 18; index += 1) smoothed = smoothSpaceMouseAxes(smoothed, held, frame);
    expect(smoothed.rz).toBeGreaterThan(290);
    expect(smoothed.rz).toBeLessThanOrEqual(300);
  });

  it("stops at once when the cap is let go, and a long frame does not overshoot", () => {
    const moving = { ...SPACE_MOUSE_REST, rz: 250, rx: -120 };
    expect(smoothSpaceMouseAxes(moving, { ...SPACE_MOUSE_REST, rz: 5, tx: -8 }, frame)).toBe(SPACE_MOUSE_REST);
    const caughtUp = smoothSpaceMouseAxes(SPACE_MOUSE_REST, moving, 5);
    expect(caughtUp.rz).toBeCloseTo(250, 3);
    expect(caughtUp.rx).toBeCloseTo(-120, 3);
  });
});
