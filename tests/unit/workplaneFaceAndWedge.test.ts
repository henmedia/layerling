import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createGridLines, showWorkplanePlates } from "@/components/workplane/viewportScene";
import { MAX_WEDGE_ANGLE, MIN_WEDGE_ANGLE, wedgeAngle, wedgeHeightForAngle } from "@/lib/wedgeAngle";
import { AXIS_ARROW_COLORS } from "@/lib/workplaneGrid";

// Discussion #1714: the wedge's angle, the build plate hidden apart from a face workplane, the zero lines in colour.

describe("the wedge's slope angle", () => {
  it("is atan(height / width), and the height follows a typed angle", () => {
    expect(wedgeAngle(20, 20)).toBe(45);
    expect(wedgeAngle(20, 20 * Math.tan(Math.PI / 6))).toBe(30);
    expect(wedgeHeightForAngle(20, 45)).toBeCloseTo(20, 6);
    expect(wedgeHeightForAngle(10, 60)).toBeCloseTo(10 * Math.sqrt(3), 6);
    expect(wedgeAngle(10, wedgeHeightForAngle(10, 17))).toBe(17);
  });

  it("keeps a typed angle between 1 and 89 degrees", () => {
    expect(wedgeHeightForAngle(10, 0)).toBeCloseTo(10 * Math.tan((MIN_WEDGE_ANGLE * Math.PI) / 180), 6);
    expect(wedgeHeightForAngle(10, 90)).toBeCloseTo(10 * Math.tan((MAX_WEDGE_ANGLE * Math.PI) / 180), 6);
    expect(wedgeHeightForAngle(10, Number.NaN)).toBeCloseTo(10, 6);
    expect(wedgeAngle(0, 5)).toBe(0);
  });
});

describe("the view bar's workplane switch with a face workplane", () => {
  const layer = () => {
    const root = new THREE.Group();
    const plate = new THREE.Group();
    const extraPlate = new THREE.Group();
    const face = new THREE.Group();
    face.userData.faceWorkplane = true;
    root.add(plate, extraPlate, face);
    return { root, plate, extraPlate, face };
  };

  it("hides the build plates and leaves the workplane on the face", () => {
    const { root, plate, extraPlate, face } = layer();
    showWorkplanePlates(root, false);
    expect(root.visible).toBe(true);
    expect(plate.visible).toBe(false);
    expect(extraPlate.visible).toBe(false);
    expect(face.visible).toBe(true);
    expect(root.userData.platesHidden).toBe(true);
    showWorkplanePlates(root, true);
    expect([plate.visible, extraPlate.visible, face.visible]).toEqual([true, true, true]);
    expect(root.userData.platesHidden).toBe(false);
  });

  it("hides everything when the workplane is the plate itself", () => {
    const root = new THREE.Group();
    const plate = new THREE.Group();
    root.add(plate);
    showWorkplanePlates(root, false);
    expect(plate.visible).toBe(false);
  });
});

describe("the zero lines in the axis arrows' colours", () => {
  const lineColours = (group: THREE.Group) => group.children
    .filter((child): child is THREE.LineSegments => child instanceof THREE.LineSegments)
    .map((line) => `#${(line.material as THREE.LineBasicMaterial).color.getHexString()}`);

  it("draws the X line red and the Y line green on the active plate", () => {
    const colours = lineColours(createGridLines(200, 200, undefined, "light", undefined, "default", false, "", true, false, true));
    expect(colours).toContain(AXIS_ARROW_COLORS.x);
    expect(colours).toContain(AXIS_ARROW_COLORS.y);
  });

  it("keeps one colour on a greyed plate", () => {
    const colours = lineColours(createGridLines(200, 200, undefined, "light", undefined, "default", false, "", true, false, false));
    expect(colours).not.toContain(AXIS_ARROW_COLORS.x);
    expect(colours).not.toContain(AXIS_ARROW_COLORS.y);
  });
});
