import { describe, expect, it } from "vitest";
import {
  CORNER_RULER_FIELD_SIZE,
  cornerRulerElevationFieldBesideBody,
  spreadCornerRulerFields,
  computeCornerRulerRelativeCoordinates,
  cornerRulerAxisModes,
  computeCornerRulerShift,
  cornerRulerFlatRotation,
  cornerRulerFrameForWorkplane,
  cornerRulerShiftVector,
  rotateCornerRulerFrame,
  cornerRulerCorner,
  cornerRulerDimensionMatches,
  cornerRulerDimensionMatchesFromCorner,
  cornerRulerTicks,
  worldAxisNameOfDirection,
  rulerTicks,
  pointAlongRuler,
  rulerDimensionMatch,
  rulerLiesFlat,
  type CornerRulerPose,
  type RulerCandidatePose,
  type RulerPose,
  toggledCornerRulerAxis,
  toggledCornerRulerMode,
} from "@/lib/rulerDimensions";

function ruler(overrides: Partial<RulerPose> = {}): RulerPose {
  return { x: 0, z: 0, rotation: 0, length: 150, crossWidth: 25, ...overrides };
}

function candidate(overrides: Partial<RulerCandidatePose> = {}): RulerCandidatePose {
  return { x: 0, z: 0, rotation: 0, width: 20, height: 20, depth: 12, ...overrides };
}

describe("rulerDimensionMatch", () => {
  it("liest die Breite eines achsparallelen Koerpers direkt ab", () => {
    const match = rulerDimensionMatch(ruler(), candidate());

    expect(match).not.toBeNull();
    expect(match?.extentAlong).toBeCloseTo(20, 6);
    expect(match?.alignedField).toBe("width");
    expect(match?.alongOffset).toBeCloseTo(0, 6);
  });

  it("liest nach einer 90-Grad-Drehung die Tiefe statt der Breite ab", () => {
    const match = rulerDimensionMatch(ruler(), candidate({ rotation: 90 }));

    expect(match?.extentAlong).toBeCloseTo(12, 6);
    expect(match?.alignedField).toBe("depth");
  });

  it("zeigt bei 45 Grad nur die Randausdehnung, keine eintippbare Eigenschaft", () => {
    const match = rulerDimensionMatch(ruler(), candidate({ rotation: 45 }));
    const erwartet = 20 * Math.abs(Math.cos(Math.PI / 4)) + 12 * Math.abs(Math.sin(Math.PI / 4));

    expect(match?.alignedField).toBeNull();
    expect(match?.extentAlong).toBeCloseTo(erwartet, 6);
  });

  it("ignoriert einen Koerper ausserhalb des Lineal-Bandes", () => {
    const match = rulerDimensionMatch(ruler({ crossWidth: 25 }), candidate({ z: 50 }));

    expect(match).toBeNull();
  });

  it("folgt der eigenen Drehung des Lineals", () => {
    const gedreht = ruler({ rotation: 90 });
    const match = rulerDimensionMatch(gedreht, candidate());

    // Ungedreht steht die Tiefe des Koerpers jetzt parallel zur gedrehten Lineal-Achse.
    expect(match?.alignedField).toBe("depth");
    expect(match?.extentAlong).toBeCloseTo(12, 6);
  });

  it("misst den Versatz entlang der Achse, nicht die Weltkoordinate", () => {
    const match = rulerDimensionMatch(ruler(), candidate({ x: 40 }));

    expect(match?.alongOffset).toBeCloseTo(40, 6);
  });
});

describe("pointAlongRuler", () => {
  it("laeuft bei Drehung 0 entlang der Weltachse X", () => {
    const punkt = pointAlongRuler(ruler({ x: 5, z: 5 }), 30);

    expect(punkt.x).toBeCloseTo(35, 6);
    expect(punkt.z).toBeCloseTo(5, 6);
  });

  it("folgt einer 90-Grad-Drehung des Lineals", () => {
    const punkt = pointAlongRuler(ruler({ rotation: 90 }), 30);

    expect(punkt.x).toBeCloseTo(0, 6);
    expect(punkt.z).toBeCloseTo(-30, 6);
  });
});

function cornerPose(overrides: Partial<CornerRulerPose> = {}): CornerRulerPose {
  return { x: 0, z: 0, rotation: 0, armLengthX: 100, armLengthZ: 80, armWidth: 12, ...overrides };
}

describe("cornerRulerCorner", () => {
  it("liegt bei Drehung 0 eine halbe Armlaenge je Achse von der Mitte entfernt", () => {
    const corner = cornerRulerCorner(cornerPose());

    expect(corner.x).toBeCloseTo(-50, 6);
    expect(corner.z).toBeCloseTo(-40, 6);
  });

  it("folgt der eigenen Drehung der Form", () => {
    const corner = cornerRulerCorner(cornerPose({ rotation: 90 }));

    expect(corner.x).toBeCloseTo(-40, 6);
    expect(corner.z).toBeCloseTo(50, 6);
  });
});

describe("cornerRulerDimensionMatches", () => {
  it("erkennt einen Nachbarn nur am Arm, in dessen Band er liegt", () => {
    const nearArmX = cornerRulerDimensionMatches(cornerPose(), candidate({ x: 10, z: -40 }));

    expect(nearArmX.armX).not.toBeNull();
    expect(nearArmX.armX?.extentAlong).toBeCloseTo(20, 6);
    expect(nearArmX.armZ).toBeNull();
  });

  it("erkennt denselben Nachbarn am anderen Arm, wenn er dort liegt", () => {
    const nearArmZ = cornerRulerDimensionMatches(cornerPose(), candidate({ x: -50, z: 10 }));

    expect(nearArmZ.armX).toBeNull();
    expect(nearArmZ.armZ).not.toBeNull();
    expect(nearArmZ.armZ?.extentAlong).toBeCloseTo(12, 6);
  });

  it("meldet keinen Treffer, wenn der Nachbar zu weit von beiden Armen absteht", () => {
    const weitWeg = cornerRulerDimensionMatches(cornerPose(), candidate({ x: 200, z: 200 }));

    expect(weitWeg.armX).toBeNull();
    expect(weitWeg.armZ).toBeNull();
  });
});

describe("cornerRulerDimensionMatchesFromCorner", () => {
  it("liefert dasselbe Ergebnis wie cornerRulerDimensionMatches, wenn die Ecke direkt vorliegt", () => {
    const pose = cornerPose();
    const corner = cornerRulerCorner(pose);
    const viaCenter = cornerRulerDimensionMatches(pose, candidate({ x: 10, z: -40 }));
    const viaCornerDirekt = cornerRulerDimensionMatchesFromCorner(corner, pose.rotation, pose.armLengthX, pose.armLengthZ, pose.armWidth, candidate({ x: 10, z: -40 }));

    expect(viaCornerDirekt.armX?.extentAlong).toBeCloseTo(viaCenter.armX?.extentAlong ?? NaN, 6);
    expect(viaCornerDirekt.armZ).toBeNull();
    expect(viaCenter.armZ).toBeNull();
  });
});

describe("a framing square shows the sizes of bodies at its arms only (#831)", () => {
  // The corner at the origin, the first arm along +x (100 mm), the second along +z (80 mm), bands 12 mm wide.
  const at = (x: number, z: number) => cornerRulerDimensionMatchesFromCorner({ x: 0, z: 0 }, 0, 100, 80, 12, candidate({ x, z }));

  it("a body inside the square, beside an arm or across it, gets its size", () => {
    expect(at(20, 8).armX?.extentAlong).toBeCloseTo(20, 6);
    expect(at(20, 0).armX).not.toBeNull();
    expect(at(8, 30).armZ?.extentAlong).toBeCloseTo(12, 6);
  });

  it("a body outside the square, behind the corner or beside an arm from outside, gets none", () => {
    // Behind the corner on the first arm's extension.
    expect(at(-15, 3).armX).toBeNull();
    // Below the first arm, touching it from outside.
    expect(at(20, -7).armX).toBeNull();
    // Left of the second arm, touching it from outside.
    expect(at(-10.5, 30).armZ).toBeNull();
    // At the corner from outside, in reach of both bands, as in the report.
    expect(at(-11, 7)).toEqual({ armX: null, armZ: null });
  });
});

describe("cornerRulerTicks", () => {
  it("erzeugt einen Teilstrich je Millimeter, einschliesslich beider Enden", () => {
    const ticks = cornerRulerTicks(10);

    expect(ticks).toHaveLength(11);
    expect(ticks[0]).toEqual({ offset: 0, isTen: true, isFive: true });
    expect(ticks[10]).toEqual({ offset: 10, isTen: true, isFive: true });
  });

  it("markiert Fuenfer- und Zehner-Teilstriche richtig", () => {
    const ticks = cornerRulerTicks(12);

    expect(ticks.find((tick) => tick.offset === 5)).toMatchObject({ isFive: true, isTen: false });
    expect(ticks.find((tick) => tick.offset === 7)).toMatchObject({ isFive: false, isTen: false });
    expect(ticks.find((tick) => tick.offset === 12)).toMatchObject({ isFive: false, isTen: false });
  });

  it("liefert nur den Nullstrich fuer eine Laenge von 0", () => {
    const ticks = cornerRulerTicks(0);

    expect(ticks).toEqual([{ offset: 0, isTen: true, isFive: true }]);
  });
});

describe("computeCornerRulerRelativeCoordinates", () => {
  const bounds = {
    min: { x: 10, y: 5, z: 5 },
    max: { x: 16.5, y: 15, z: 11.5 },
  };

  it("legt die Hilfslinien auf den Boden: der Zielpunkt liegt in der Ebene des Lineals, nicht auf der Hoehe des Koerpers (Forum)", () => {
    for (const mode of ["endpoint", "midpoint"] as const) {
      const coords = computeCornerRulerRelativeCoordinates({ rulerCorner: { x: 0, y: 0, z: 0 }, rulerRotation: 0, mode, bounds });
      expect(coords.xTargetPoint.y).toBeCloseTo(0, 6);
      expect(coords.zTargetPoint.y).toBeCloseTo(0, 6);
      expect(coords.xTargetPoint.x).toBeCloseTo(coords.x, 6);
      expect(coords.xTargetPoint.z).toBeCloseTo(coords.z, 6);
      // Die Hoehe hat ihren eigenen Pfeil, am Koerper entlang.
      expect(coords.elevationTargetPoint.y).toBeCloseTo(coords.elevation, 6);
      // ... und er steht dort, wo sich die beiden Hilfslinien am Boden treffen.
      expect(coords.elevationBasePoint.x).toBeCloseTo(coords.xTargetPoint.x, 6);
      expect(coords.elevationBasePoint.z).toBeCloseTo(coords.xTargetPoint.z, 6);
      expect(coords.elevationBasePoint.y).toBeCloseTo(0, 6);
    }
  });

  it("berechnet im Eckpunkt-Modus die minimale Ecke", () => {
    const coords = computeCornerRulerRelativeCoordinates({
      rulerCorner: { x: 0, y: 0, z: 0 },
      rulerRotation: 0,
      mode: "endpoint",
      bounds,
    });

    expect(coords.x).toBeCloseTo(10, 6);
    expect(coords.z).toBeCloseTo(5, 6);
    expect(coords.elevation).toBeCloseTo(5, 6);
    expect(coords.xEndpointOnAxis).toEqual({ x: 10, y: 0, z: 0 });
    expect(coords.zEndpointOnAxis).toEqual({ x: 0, y: 0, z: 5 });
  });

  it("berechnet im Mittelpunkt-Modus das Zentrum", () => {
    const coords = computeCornerRulerRelativeCoordinates({
      rulerCorner: { x: 0, y: 0, z: 0 },
      rulerRotation: 0,
      mode: "midpoint",
      bounds,
    });

    expect(coords.x).toBeCloseTo(13.25, 6);
    expect(coords.z).toBeCloseTo(8.25, 6);
    expect(coords.elevation).toBeCloseTo(10, 6);
    expect(coords.xEndpointOnAxis).toEqual({ x: 13.25, y: 0, z: 0 });
    expect(coords.zEndpointOnAxis).toEqual({ x: 0, y: 0, z: 8.25 });
  });

  it("folgt einer 90-Grad-Drehung des Lineals", () => {
    const coords = computeCornerRulerRelativeCoordinates({
      rulerCorner: { x: 20, y: 0, z: 30 },
      rulerRotation: 90,
      mode: "endpoint",
      bounds,
    });

    expect(coords.x).toBeCloseTo(10, 6);
    expect(coords.z).toBeCloseTo(5, 6);
    // Bei 90 Grad zeigt axisX nach (0, 0, -1) und axisZ nach (1, 0, 0)
    expect(coords.axisXDirection.x).toBeCloseTo(0, 5);
    expect(coords.axisXDirection.z).toBeCloseTo(-1, 5);
    expect(coords.axisZDirection.x).toBeCloseTo(1, 5);
    expect(coords.axisZDirection.z).toBeCloseTo(0, 5);
  });
});

describe("framing square on any workplane (#105)", () => {
  const plate = { xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 1, z: 0 } };
  // A face facing the viewer (+z): x runs right, z runs down the face.
  const wall = { xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: -1, z: 0 }, normal: { x: 0, y: 0, z: 1 } };

  it("starts on the plate turned to 90 degrees, as it always has", () => {
    const frame = cornerRulerFrameForWorkplane(plate);
    expect(frame.xAxis.x).toBeCloseTo(0, 6);
    expect(frame.xAxis.z).toBeCloseTo(-1, 6);
    expect(frame.zAxis.x).toBeCloseTo(1, 6);
    expect(cornerRulerFlatRotation(frame)).toBeCloseTo(90, 6);
  });

  it("turns a quarter about the normal per click and comes back after four", () => {
    let frame = cornerRulerFrameForWorkplane(wall);
    const start = frame;
    for (let turn = 0; turn < 4; turn += 1) {
      frame = rotateCornerRulerFrame(frame);
      expect(frame.normal).toEqual(wall.normal);
      expect(frame.xAxis.z).toBeCloseTo(0, 6);
      expect(frame.zAxis.z).toBeCloseTo(0, 6);
    }
    expect(frame.xAxis.x).toBeCloseTo(start.xAxis.x, 6);
    expect(frame.xAxis.y).toBeCloseTo(start.xAxis.y, 6);
  });

  it("measures on a wall along the wall and its height along the normal", () => {
    // Corner at the wall's top left; the shape's box in the frame's own axes.
    const coords = computeCornerRulerRelativeCoordinates({
      rulerCorner: { x: 0, y: 200, z: 10 },
      rulerRotation: 0,
      frame: wall,
      mode: "midpoint",
      bounds: { min: { x: 30, y: -5, z: 180 }, max: { x: 50, y: 5, z: 200 } },
    });
    expect(coords.x).toBeCloseTo(40, 6);
    expect(coords.z).toBeCloseTo(190, 6);
    expect(coords.elevation).toBeCloseTo(0, 6);
    expect(coords.xEndpointOnAxis).toEqual({ x: 40, y: 200, z: 10 });
    expect(coords.zEndpointOnAxis.y).toBeCloseTo(10, 6);
  });

  it("moves shapes along the frame's own directions", () => {
    expect(cornerRulerShiftVector(wall, "x", 5)).toEqual({ x: 5, y: 0, z: 0 });
    expect(cornerRulerShiftVector(wall, "z", 5)).toEqual({ x: 0, y: -5, z: 0 });
    expect(cornerRulerShiftVector(wall, "elevation", 2)).toEqual({ x: 0, y: 0, z: 2 });
    expect(cornerRulerShiftVector(plate, "elevation", 3)).toEqual({ x: 0, y: 3, z: 0 });
  });

  it("keeps the arm measurements to the plate", () => {
    expect(cornerRulerFlatRotation(cornerRulerFrameForWorkplane(wall))).toBeNull();
    expect(cornerRulerFlatRotation({ ...plate, normal: { x: 0, y: -1, z: 0 } })).toBeNull();
    expect(cornerRulerFlatRotation(rotateCornerRulerFrame(cornerRulerFrameForWorkplane(plate)))).toBeCloseTo(180, 6);
  });
});

describe("computeCornerRulerShift", () => {
  it("verschiebt bei Drehung 0 entlang Welt-X bzw. Welt-Z", () => {
    const shiftX = computeCornerRulerShift(0, "x", 15);
    expect(shiftX.x).toBeCloseTo(15, 6);
    expect(shiftX.z).toBeCloseTo(0, 6);

    const shiftZ = computeCornerRulerShift(0, "z", -8);
    expect(shiftZ.x).toBeCloseTo(0, 6);
    expect(shiftZ.z).toBeCloseTo(-8, 6);
  });

  it("verschiebt bei Drehung 90 entlang der rotierten Achsen", () => {
    const shiftX = computeCornerRulerShift(90, "x", 10);
    expect(shiftX.x).toBeCloseTo(0, 5);
    expect(shiftX.z).toBeCloseTo(-10, 5);

    const shiftZ = computeCornerRulerShift(90, "z", 10);
    expect(shiftZ.x).toBeCloseTo(10, 5);
    expect(shiftZ.z).toBeCloseTo(0, 5);
  });
});

describe("framing square: one mode for each number", () => {
  const bounds = { min: { x: 10, y: 5, z: 5 }, max: { x: 16.5, y: 15, z: 11.5 } };

  it("counts a standing body to the middle in x and z and to the bottom in height", () => {
    const coords = computeCornerRulerRelativeCoordinates({ rulerCorner: { x: 0, y: 0, z: 0 }, rulerRotation: 0, mode: "endpoint", axisModes: { x: "midpoint", z: "midpoint" }, bounds });
    expect(coords.x).toBeCloseTo(13.25, 6);
    expect(coords.z).toBeCloseTo(8.25, 6);
    expect(coords.elevation).toBeCloseTo(5, 6);
    expect(coords.modes).toEqual({ x: "midpoint", z: "midpoint", elevation: "endpoint" });
    expect(coords.xEndpointOnAxis).toEqual({ x: 13.25, y: 0, z: 0 });
  });

  it("lets a single axis differ from the overall mode the other way round", () => {
    const coords = computeCornerRulerRelativeCoordinates({ rulerCorner: { x: 0, y: 0, z: 0 }, rulerRotation: 0, mode: "midpoint", axisModes: { x: "endpoint" }, bounds });
    expect(coords.x).toBeCloseTo(10, 6);
    expect(coords.z).toBeCloseTo(8.25, 6);
    expect(coords.elevation).toBeCloseTo(10, 6);
  });

  it("knows the modes of the three axes", () => {
    expect(cornerRulerAxisModes(undefined)).toEqual({ x: "endpoint", z: "endpoint", elevation: "endpoint" });
    expect(cornerRulerAxisModes("midpoint", { z: "endpoint" })).toEqual({ x: "midpoint", z: "endpoint", elevation: "midpoint" });
  });

  it("switches one axis and keeps the others", () => {
    expect(toggledCornerRulerAxis("endpoint", undefined, "z")).toEqual({ mode: "endpoint", axisModes: { x: "endpoint", z: "midpoint", elevation: "endpoint" } });
    expect(toggledCornerRulerAxis("midpoint", { x: "endpoint" }, "x")).toEqual({ mode: "midpoint" });
  });

  it("goes back to one overall mode when all three agree", () => {
    const one = toggledCornerRulerAxis("endpoint", undefined, "x");
    const two = toggledCornerRulerAxis(one.mode, one.axisModes, "z");
    const three = toggledCornerRulerAxis(two.mode, two.axisModes, "elevation");
    expect(three).toEqual({ mode: "midpoint" });
  });

  it("switches the whole square, and goes to the edge when the axes differ", () => {
    expect(toggledCornerRulerMode("endpoint")).toEqual({ mode: "midpoint" });
    expect(toggledCornerRulerMode("midpoint")).toEqual({ mode: "endpoint" });
    expect(toggledCornerRulerMode("endpoint", { z: "midpoint" })).toEqual({ mode: "endpoint" });
  });
});

describe("the printed scale of a ruler (#500)", () => {
  it("has a line every millimetre, longer at five and ten, and numbers the tens", () => {
    const ticks = rulerTicks(150);
    expect(ticks).toHaveLength(151);
    expect(ticks[0]).toEqual({ offset: 0, height: 0.62, label: "0" });
    expect(ticks[1].height).toBe(0.26);
    expect(ticks[5].height).toBe(0.42);
    expect(ticks[10]).toEqual({ offset: 10, height: 0.62, label: "10" });
    expect(ticks.filter((tick) => tick.label !== undefined)).toHaveLength(16);
  });

  it("has a line every sixteenth of an inch for a ruler in inches, with the whole inches numbered", () => {
    const ticks = rulerTicks(101.6, true);
    // 4 inches = 64 sixteenths, with both ends.
    expect(ticks).toHaveLength(65);
    expect(ticks[16].offset).toBeCloseTo(25.4, 9);
    expect(ticks.filter((tick) => tick.label !== undefined).map((tick) => tick.label)).toEqual(["0", "1", "2", "3", "4"]);
    expect([ticks[1], ticks[2], ticks[4], ticks[8], ticks[16]].map((tick) => tick.height)).toEqual([0.26, 0.34, 0.42, 0.5, 0.62]);
  });

  it("stops at the end of the ruler and has no scale without a length", () => {
    const ticks = rulerTicks(30, true);
    expect(ticks.at(-1)!.offset).toBeLessThanOrEqual(30);
    expect(ticks).toHaveLength(Math.floor((30 / 25.4) * 16) + 1);
    expect(rulerTicks(0)).toEqual([]);
    expect(rulerTicks(Number.NaN, true)).toEqual([]);
  });
});

describe("the name of the axis a ruler arm runs along (#597)", () => {
  it("calls an arm along the plate's x axis X, along its z axis Y (to the back) and an upright one Z", () => {
    expect(worldAxisNameOfDirection({ x: 1, y: 0, z: 0 })).toBe("X");
    expect(worldAxisNameOfDirection({ x: -1, y: 0, z: 0 })).toBe("X");
    expect(worldAxisNameOfDirection({ x: 0, y: 0, z: 1 })).toBe("Y");
    expect(worldAxisNameOfDirection({ x: 0, y: 0, z: -1 })).toBe("Y");
    expect(worldAxisNameOfDirection({ x: 0, y: 1, z: 0 })).toBe("Z");
  });

  it("names the arms of a corner ruler on the plate by where they point: the first arm runs to the back, so it is Y, the other X", () => {
    const frame = cornerRulerFrameForWorkplane({ xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 1, z: 0 } });
    expect(worldAxisNameOfDirection(frame.xAxis)).toBe("Y");
    expect(worldAxisNameOfDirection(frame.zAxis)).toBe("X");
    expect(worldAxisNameOfDirection(frame.normal)).toBe("Z");
    // One more quarter turn and the arms trade places.
    const turned = rotateCornerRulerFrame(frame);
    expect(worldAxisNameOfDirection(turned.xAxis)).toBe("X");
    expect(worldAxisNameOfDirection(turned.zAxis)).toBe("Y");
  });
});

describe("spreadCornerRulerFields (#777)", () => {
  const box = (p: { x: number; y: number }) => ({ x: p.x, y: p.y, halfWidth: CORNER_RULER_FIELD_SIZE.width / 2, halfHeight: CORNER_RULER_FIELD_SIZE.height / 2 });
  const overlap = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const [first, second] = [box(a), box(b)];
    return Math.abs(first.x - second.x) < first.halfWidth + second.halfWidth && Math.abs(first.y - second.y) < first.halfHeight + second.halfHeight;
  };

  it("leaves fields that are clear where they are", () => {
    const fields = [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 100, y: 300 }];
    expect(spreadCornerRulerFields(fields)).toEqual(fields);
  });

  it("moves three fields that sit on each other so that none covers another", () => {
    const spot = { x: 500, y: 400 };
    const spread = spreadCornerRulerFields([spot, spot, spot]);
    expect(spread[0]).toEqual(spot);
    expect(overlap(spread[0], spread[1])).toBe(false);
    expect(overlap(spread[0], spread[2])).toBe(false);
    expect(overlap(spread[1], spread[2])).toBe(false);
  });

  it("keeps the fields off the ruler's buttons", () => {
    const button = { x: 500, y: 400, halfWidth: 34, halfHeight: 30 };
    const [field] = spreadCornerRulerFields([{ x: 500, y: 400 }], [button]);
    const apart = Math.abs(field.x - button.x) >= button.halfWidth + CORNER_RULER_FIELD_SIZE.width / 2 || Math.abs(field.y - button.y) >= button.halfHeight + CORNER_RULER_FIELD_SIZE.height / 2;
    expect(apart).toBe(true);
  });
});

describe("the height number stays off the measured body (#1279)", () => {
  const half = { w: CORNER_RULER_FIELD_SIZE.width / 2, h: CORNER_RULER_FIELD_SIZE.height / 2 };
  const onBody = (field: { x: number; y: number }, body: { x: number; y: number; halfWidth: number; halfHeight: number }) =>
    Math.abs(field.x - body.x) < half.w + body.halfWidth && Math.abs(field.y - body.y) < half.h + body.halfHeight;
  // The body's outline on the screen, 200 to 300 across and 150 to 260 down.
  const body = { x: 250, y: 205, halfWidth: 50, halfHeight: 55 };

  it("moves the number at height 0 out of the body, to the side of the arrow", () => {
    // The arrow stands at the body's near left corner; at height 0 its middle is that corner.
    const field = cornerRulerElevationFieldBesideBody({ x: 210 + 28, y: 240 }, 210, body);
    expect(onBody(field, body)).toBe(false);
    expect(field.x).toBeLessThan(200);
    expect(field.y).toBe(240);
  });

  it("goes to the right when the arrow is nearer the body's right edge", () => {
    const field = cornerRulerElevationFieldBesideBody({ x: 290 + 28, y: 240 }, 290, body);
    expect(onBody(field, body)).toBe(false);
    expect(field.x).toBeGreaterThan(300);
  });

  it("leaves a number that is already clear of the body where it is", () => {
    const clear = { x: 120, y: 320 };
    expect(cornerRulerElevationFieldBesideBody(clear, 92, body)).toEqual(clear);
  });

  it("does not let the spreading push the number back onto the body", () => {
    const beside = cornerRulerElevationFieldBesideBody({ x: 238, y: 240 }, 210, body);
    // The X number already sits where the height number went.
    const [, field] = spreadCornerRulerFields([beside, beside], [], undefined, [undefined, [body]]);
    expect(onBody(field, body)).toBe(false);
  });
});

describe("tipped ruler (#799)", () => {
  // The case from the video: a 40 x 20 x 20 box, the ruler turned by 3 degrees and then stood up.
  const box = candidate({ width: 40, depth: 20, height: 20, y: 10 });

  it("stood up, it reads the height of the body, not its width along the old direction", () => {
    const upright = ruler({ rotation: 3, rotationZ: 90, y: 75 });
    const match = rulerDimensionMatch(upright, box);

    expect(match?.extentAlong).toBeCloseTo(20, 6);
    expect(match?.alignedField).toBe("height");
    // The body's middle sits 65 mm below the ruler's middle, along the ruler.
    expect(match?.alongOffset).toBeCloseTo(-65, 6);
  });

  it("lying flat it keeps reading along the plate, however high the body stands", () => {
    const flat = rulerDimensionMatch(ruler({ rotation: 3, y: 2 }), { ...box, y: 50 });

    // 40.99 as in the video: the box stands 3 degrees off the ruler, so the number is not one of its fields.
    expect(flat?.extentAlong).toBeCloseTo(40 * Math.cos(Math.PI / 60) + 20 * Math.sin(Math.PI / 60), 6);
    expect(flat?.alignedField).toBeNull();
  });

  it("knows when it lies flat", () => {
    expect(rulerLiesFlat({ rotation: 30 })).toBe(true);
    expect(rulerLiesFlat({ rotation: 0, rotationX: 180 })).toBe(true);
    expect(rulerLiesFlat({ rotation: 0, rotationZ: 90 })).toBe(false);
    expect(rulerLiesFlat({ rotation: 0, rotationX: 90 })).toBe(false);
  });

  it("finds points along a standing ruler in height", () => {
    const point = pointAlongRuler(ruler({ rotationZ: 90, y: 75 }), 10);

    expect(point.x).toBeCloseTo(0, 6);
    expect(point.y).toBeCloseTo(85, 6);
    expect(point.z).toBeCloseTo(0, 6);
  });
});
