import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { describe, expect, it } from "vitest";
import { createShapeObject, updateShapeObjectTransform } from "@/components/workplane/viewportShapeObjects";
import { RENDER_LAYER_SHAPES } from "@/components/workplane/viewportPicking";
import { pickModelTapeCandidate, tapeCentresNear, tapeMeshFaces, tapeRimOpen } from "@/components/workplane/viewportTape";
import { syncTapeOverlay, TapeOverlay, tapeLengthMoverOf, tapePointWorld, type TapeModel, type TapeOverlayState, type ThreeState } from "@/components/workplane/ViewportOverlays";
import { planarFaces } from "@/lib/faceCentre";
import { tapeLengthShift } from "@/lib/tapeCircle";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The tape measure snaps to the centre of a face and of a round hole (Discussion #610): click the two centres, type a
 * distance, and the second body moves centre to centre.
 */

type Positions = ArrayLike<number>;

/** The first triangle whose three corners pass `test`. */
function triangleWhere(positions: Positions, index: ArrayLike<number> | null, test: (x: number, y: number, z: number) => boolean) {
  const count = (index ? index.length : positions.length / 3) / 3;
  for (let tri = 0; tri < count; tri += 1) {
    const corners = [0, 1, 2].map((corner) => (index ? index[tri * 3 + corner] : tri * 3 + corner));
    if (corners.every((vertex) => test(positions[vertex * 3], positions[vertex * 3 + 1], positions[vertex * 3 + 2]))) return tri;
  }
  return -1;
}

function facesOf(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute("position").array;
  const index = geometry.index?.array ?? null;
  return { positions, index, faces: planarFaces(positions, index)! };
}

/** The centre of the area of a polygon with holes, by the shoelace formula: what the face's centre must come to. */
function polygonCentroid(outer: THREE.Vector2[], holes: THREE.Vector2[][] = []) {
  const moments = (points: THREE.Vector2[]) => {
    let area = 0;
    let x = 0;
    let y = 0;
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      const cross = point.x * next.y - next.x * point.y;
      area += cross / 2;
      x += (point.x + next.x) * cross / 6;
      y += (point.y + next.y) * cross / 6;
    });
    return { area: Math.abs(area), x: Math.sign(area) * x, y: Math.sign(area) * y };
  };
  const all = [moments(outer), ...holes.map(moments).map((hole) => ({ area: -hole.area, x: -hole.x, y: -hole.y }))];
  const area = all.reduce((sum, entry) => sum + entry.area, 0);
  return { x: all.reduce((sum, entry) => sum + entry.x, 0) / area, y: all.reduce((sum, entry) => sum + entry.y, 0) / area };
}

/** A 40 x 40 plate, 6 thick, with a round hole of radius 5 off its middle: as a group's mesh with a hole cut into it. */
function plateWithHole() {
  const outline = new THREE.Shape([new THREE.Vector2(-20, -20), new THREE.Vector2(20, -20), new THREE.Vector2(20, 20), new THREE.Vector2(-20, 20)]);
  const hole = new THREE.Path();
  hole.absarc(8, 6, 5, 0, Math.PI * 2, true);
  outline.holes.push(hole);
  // Lying on the plate: the shape's y is the room's -z, the 6 mm it is extruded by its height.
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: 6, bevelEnabled: false, curveSegments: 24 }).rotateX(-Math.PI / 2);
  const { shape, holes } = outline.extractPoints(24);
  const top = polygonCentroid(shape, holes);
  return { positions: Array.from(geometry.getAttribute("position").array), holeCentre: new THREE.Vector3(8, 6, -6), topCentre: new THREE.Vector3(top.x, 6, -top.y) };
}

function scene(cameraHeight = 150, pinEdges = false) {
  const plate = plateWithHole();
  const shapes: WorkplaneShape[] = [
    {
      id: "plate", name: "Plate", kind: "mesh", color: "#d41721", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 40, height: 6, rotation: 0,
      importedMesh: { positions: plate.positions, baseWidth: 40, baseDepth: 40, baseHeight: 6, triangleCount: plate.positions.length / 9, sourceFormat: "json" },
    } as WorkplaneShape,
    { id: "pin", name: "Cylinder", kind: "cylinder", color: "#1a73e8", x: 34, z: 10, elevation: 0, size: 8, width: 8, depth: 8, height: 12, rotation: 0 } as WorkplaneShape,
  ];
  const shapeLayer = new THREE.Group();
  const shapeRecords = new Map<string, { object: THREE.Group }>();
  shapes.forEach((shape) => {
    // A selected body draws its edges, the rims of a cylinder among them.
    const object = createShapeObject(shape, pinEdges && shape.id === "pin");
    shapeLayer.add(object);
    shapeRecords.set(shape.id, { object });
  });
  shapeLayer.updateMatrixWorld(true);
  // Straight down onto the plate and the pin.
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
  camera.position.set(12, cameraHeight, -2);
  camera.up.set(0, 0, -1);
  camera.lookAt(12, 0, -2);
  camera.updateMatrixWorld(true);
  const state = {
    renderer: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }) } },
    pointer: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    camera,
    scene: new THREE.Scene(),
    shapeLayer,
    shapeRecords,
    sectionPlane: null,
  } as unknown as ThreeState;
  return { state, shapes, plate, ids: shapes.map((shape) => shape.id) };
}

function screenOf(state: ThreeState, point: THREE.Vector3) {
  const projected = point.clone().project(state.camera);
  return { x: ((projected.x + 1) / 2) * 400, y: ((1 - projected.y) / 2) * 400 };
}

describe("the centre of a flat face (Discussion #610)", () => {
  it("is the middle of a rectangle, whichever of its triangles is hit", () => {
    const { positions, index, faces } = facesOf(new THREE.BoxGeometry(40, 10, 20).translate(5, 5, -3));
    const first = triangleWhere(positions, index, (_x, y) => Math.abs(y - 10) < 1e-6);
    const face = faces.faceOf(first)!;
    expect(face.centre[0]).toBeCloseTo(5, 6);
    expect(face.centre[1]).toBeCloseTo(10, 6);
    expect(face.centre[2]).toBeCloseTo(-3, 6);
    expect(face.area).toBeCloseTo(800, 6);
    expect(face.curved).toBe(false);
    // The other triangle of the top is the same face.
    const count = index!.length / 3;
    const other = Array.from({ length: count }, (_, tri) => tri).find((tri) => tri !== first && faces.faceOf(tri) === face);
    expect(other).toBeDefined();
  });

  it("of an L is the centre of its area, not of the box around it", () => {
    const outline = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(30, 0), new THREE.Vector2(30, 10), new THREE.Vector2(10, 10), new THREE.Vector2(10, 40), new THREE.Vector2(0, 40)]);
    const { positions, index, faces } = facesOf(new THREE.ExtrudeGeometry(outline, { depth: 5, bevelEnabled: false }));
    const face = faces.faceOf(triangleWhere(positions, index, (_x, _y, z) => Math.abs(z - 5) < 1e-6))!;
    // Two rectangles of 300 mm² each, their middles at (15, 5) and (5, 25).
    expect(face.centre[0]).toBeCloseTo(10, 5);
    expect(face.centre[1]).toBeCloseTo(15, 5);
    expect(face.centre[2]).toBeCloseTo(5, 6);
    expect(face.area).toBeCloseTo(600, 4);
    expect(face.curved).toBe(false);
  });

  it("of a round face is the centre of its circle, and a side facet of the cylinder is no face", () => {
    const { positions, index, faces } = facesOf(new THREE.CylinderGeometry(15, 15, 30, 48).translate(-7, 15, 12).toNonIndexed());
    const top = faces.faceOf(triangleWhere(positions, index, (_x, y) => Math.abs(y - 30) < 1e-6))!;
    expect(top.centre[0]).toBeCloseTo(-7, 5);
    expect(top.centre[1]).toBeCloseTo(30, 5);
    expect(top.centre[2]).toBeCloseTo(12, 5);
    expect(top.curved).toBe(false);
    const side = faces.faceOf(triangleWhere(positions, index, (x, _y, z) => Math.abs(Math.hypot(x + 7, z - 12) - 15) < 1e-4))!;
    expect(side.curved).toBe(true);
  });

  it("of a face with a hole is the centre of what is left of it", () => {
    const plate = plateWithHole();
    const faces = planarFaces(plate.positions, null)!;
    const face = faces.faceOf(triangleWhere(plate.positions, null, (_x, y) => Math.abs(y - 6) < 1e-6))!;
    expect(face.centre[0]).toBeCloseTo(plate.topCentre.x, 4);
    expect(face.centre[1]).toBeCloseTo(6, 5);
    expect(face.centre[2]).toBeCloseTo(plate.topCentre.z, 4);
    // Away from the middle of the square, on the far side from the hole.
    expect(plate.topCentre.x).toBeLessThan(-0.3);
    expect(plate.topCentre.z).toBeGreaterThan(0.2);
  });

  it("is kept for the top of a box with rounded edges, but not for a strip of its rounding or a sphere", () => {
    const rounded = facesOf(new RoundedBoxGeometry(30, 10, 20, 4, 3));
    const top = rounded.faces.faceOf(triangleWhere(rounded.positions, rounded.index, (_x, y) => Math.abs(y - 5) < 1e-6))!;
    expect(top.curved).toBe(false);
    expect(top.centre[0]).toBeCloseTo(0, 5);
    expect(top.centre[2]).toBeCloseTo(0, 5);
    const strip = rounded.faces.faceOf(triangleWhere(rounded.positions, rounded.index, (x, y) => y > 2.1 && y < 4.9 && x > 13.1))!;
    expect(strip.curved).toBe(true);
    const sphere = facesOf(new THREE.SphereGeometry(10, 32, 16));
    const count = sphere.index!.length / 3;
    for (let tri = 0; tri < count; tri += 37) expect(sphere.faces.faceOf(tri)?.curved ?? true).toBe(true);
  });

  it("keeps two faces apart that meet at a very slight fold, as on a flat roof", () => {
    // Two slopes of 20 x 20 mm, a quarter of a degree each, meeting along the ridge at x = 0: their normals are
    // closer than the face test's limit, but the far one does not lie in the near one's plane.
    const rise = 20 * Math.tan((0.25 * Math.PI) / 180);
    const corner = (x: number, z: number) => [x, 10 + (x < 0 ? rise * (1 + x / 20) : rise * (1 - x / 20)), z];
    const quad = (x0: number, x1: number) => [...corner(x0, 0), ...corner(x1, 20), ...corner(x1, 0), ...corner(x0, 0), ...corner(x0, 20), ...corner(x1, 20)];
    const positions = [...quad(-20, 0), ...quad(0, 20)];
    const face = planarFaces(positions, null)!.faceOf(0)!;
    expect(face.centre[0]).toBeCloseTo(-10, 4);
    expect(face.area).toBeCloseTo(400 / Math.cos((0.25 * Math.PI) / 180), 6);
  });

  it("keeps two separate faces in the same plane apart", () => {
    const left = new THREE.BoxGeometry(10, 10, 10).translate(-20, 5, 0).toNonIndexed();
    const right = new THREE.BoxGeometry(10, 10, 10).translate(20, 5, 0).toNonIndexed();
    const positions = new Float32Array([...left.getAttribute("position").array, ...right.getAttribute("position").array]);
    const faces = planarFaces(positions, null)!;
    const tri = triangleWhere(positions, null, (x, y) => Math.abs(y - 10) < 1e-6 && x > 0);
    expect(faces.faceOf(tri)!.centre[0]).toBeCloseTo(20, 5);
  });

  it("is looked up, not searched again, while a mesh stays as it is", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10));
    const faces = tapeMeshFaces(mesh);
    expect(tapeMeshFaces(mesh)).toBe(faces);
    mesh.geometry.getAttribute("position").needsUpdate = true;
    expect(tapeMeshFaces(mesh)).not.toBe(faces);
  });
});

describe("the tape measure snaps to centres (Discussion #610)", () => {
  it("catches the centre of a hole cut into a mesh, as a point on that body", () => {
    const { state, ids, plate } = scene();
    const at = screenOf(state, plate.holeCentre);
    const { snap, offers } = tapeCentresNear(state, ids, at.x + 4, at.y - 3);
    expect(snap?.candidate.centre).toBe("hole");
    expect(offers.map((offer) => offer.kind)).toContain("hole");
    const candidate = snap!.candidate;
    // The rim at the top, in front of the one at the bottom.
    expect(candidate.x).toBeCloseTo(plate.holeCentre.x, 4);
    expect(candidate.y).toBeCloseTo(6, 4);
    expect(candidate.z).toBeCloseTo(plate.holeCentre.z, 4);
    expect(candidate.attachment?.shapeId).toBe("plate");
    expect(candidate.attachment?.kind).toBe("surface");
    expect(pickModelTapeCandidate(state, ids, at.x + 4, at.y - 3, null, null, false, false, false, snap)).toBe(candidate);
  });

  it("catches the middle of the face under the pointer, the hole left out", () => {
    const { state, ids, plate } = scene();
    const at = screenOf(state, plate.topCentre);
    const { snap, offers } = tapeCentresNear(state, ids, at.x - 5, at.y + 6);
    expect(offers).toHaveLength(1);
    expect(snap?.candidate.centre).toBe("face");
    expect(snap!.candidate.x).toBeCloseTo(plate.topCentre.x, 4);
    expect(snap!.candidate.y).toBeCloseTo(6, 4);
    expect(snap!.candidate.z).toBeCloseTo(plate.topCentre.z, 4);
    expect(snap!.candidate.attachment?.shapeId).toBe("plate");
    expect(snap!.candidate.surfaceNormal?.[1]).toBeCloseTo(1, 6);
  });

  it("offers the centre of a hole from anywhere inside its rim, but catches it only close by", () => {
    const { state, ids, plate } = scene();
    const at = screenOf(state, plate.holeCentre);
    const { snap, offers } = tapeCentresNear(state, ids, at.x + 18, at.y);
    expect(snap).toBeNull();
    expect(offers.find((offer) => offer.kind === "hole")?.x).toBeCloseTo(plate.holeCentre.x, 4);
  });

  it("offers no centre that another body hides", () => {
    const { state, ids, plate } = scene();
    const lid = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 20), new THREE.MeshBasicMaterial());
    lid.position.set(plate.holeCentre.x, 20, plate.holeCentre.z);
    lid.layers.set(RENDER_LAYER_SHAPES);
    lid.userData.shapeId = "lid";
    state.shapeLayer.add(lid);
    state.shapeLayer.updateMatrixWorld(true);
    const at = screenOf(state, plate.holeCentre);
    expect(tapeCentresNear(state, ids, at.x, at.y).offers).toEqual([]);
  });

  it("gives way to the rim of a small hole when the pointer is on the rim, not in the middle", () => {
    // From far above, the hole's radius is only about 7 pixels: its rim lies within reach of the middle.
    const { state, ids, plate } = scene(500);
    const centre = screenOf(state, plate.holeCentre);
    // Across from where the rim's line begins, which counts as a corner.
    const rim = screenOf(state, plate.holeCentre.clone().add(new THREE.Vector3(-5, 0, 0)));
    expect(Math.hypot(rim.x - centre.x, rim.y - centre.y)).toBeLessThan(10);
    const inMiddle = tapeCentresNear(state, ids, centre.x, centre.y);
    expect(pickModelTapeCandidate(state, ids, centre.x, centre.y, null, null, false, false, false, inMiddle.snap)?.centre).toBe("hole");
    const onRim = tapeCentresNear(state, ids, rim.x, rim.y);
    expect(onRim.snap).not.toBeNull();
    const picked = pickModelTapeCandidate(state, ids, rim.x, rim.y, null, null, false, false, false, onRim.snap);
    expect(picked?.centre).toBeUndefined();
    expect(picked?.attachment?.kind).toBe("edge");
  });

  it("catches the middle of a cylinder's top, as a point on the cylinder", () => {
    const { state, ids } = scene();
    const top = new THREE.Vector3(34, 12, 10);
    const at = screenOf(state, top);
    const { snap } = tapeCentresNear(state, ids, at.x + 3, at.y + 3);
    expect(snap?.candidate.centre).toBe("face");
    expect(snap!.candidate.attachment?.shapeId).toBe("pin");
    expect(new THREE.Vector3(snap!.candidate.x, snap!.candidate.y, snap!.candidate.z).distanceTo(top)).toBeLessThan(1e-4);
  });

  it("shows the middle of a cylinder's top once, as the face's, when its rim is drawn as well", () => {
    const { state, ids } = scene(150, true);
    const top = new THREE.Vector3(34, 12, 10);
    const at = screenOf(state, top);
    const { snap, offers } = tapeCentresNear(state, ids, at.x + 2, at.y + 2);
    expect(offers.filter((offer) => new THREE.Vector3(offer.x, offer.y, offer.z).distanceTo(top) < 1e-3)).toHaveLength(1);
    expect(snap?.candidate.centre).toBe("face");
  });

  it("then moves the second body by a typed length, centre to centre, to exactly that length", () => {
    const { state, ids, shapes, plate } = scene();
    const holeAt = screenOf(state, plate.holeCentre);
    const pinAt = screenOf(state, new THREE.Vector3(34, 12, 10));
    // A few pixels off each middle, as a hand puts the pointer.
    const start = tapeCentresNear(state, ids, holeAt.x + 4, holeAt.y - 3).snap!.candidate;
    const end = tapeCentresNear(state, ids, pinAt.x + 3, pinAt.y + 2).snap!.candidate;
    expect(tapePointWorld(state, start).distanceTo(plate.holeCentre)).toBeLessThan(1e-4);
    expect(tapePointWorld(state, end).distanceTo(new THREE.Vector3(34, 12, 10))).toBeLessThan(1e-4);
    const model: TapeModel = {
      points: [
        { id: "tape-point-1", x: start.x, y: start.y, z: start.z, attachment: start.attachment },
        { id: "tape-point-2", x: end.x, y: end.y, z: end.z, attachment: end.attachment },
      ],
      segments: [{ id: "tape-segment-3", startId: "tape-point-1", endId: "tape-point-2" }],
      startPointId: null,
      hover: null,
    };
    expect(tapeLengthMoverOf(model, "tape-segment-3", { shapes, selectedIds: [] })).toEqual({ shapeId: "pin", movesEnd: true });
    const shift = tapeLengthShift(tapePointWorld(state, model.points[0]), tapePointWorld(state, model.points[1]), 25, true)!;
    // What the field does with the typed length: the pin goes along the line, up or down as well.
    const pin = shapes[1];
    const moved = { ...pin, x: pin.x + shift.x, z: pin.z + shift.z, elevation: (pin.elevation ?? 0) + shift.y };
    const object = (state as unknown as { shapeRecords: Map<string, { object: THREE.Group }> }).shapeRecords.get("pin")!.object;
    updateShapeObjectTransform(object, moved);
    const first = tapePointWorld(state, model.points[0]);
    const second = tapePointWorld(state, model.points[1]);
    expect(first.distanceTo(second)).toBeCloseTo(25, 9);
    // The second point is still the middle of the pin's top, and the first the hole's centre.
    expect(second.distanceTo(new THREE.Vector3(moved.x, moved.elevation + 12, moved.z))).toBeLessThan(1e-9);
    expect(first.distanceTo(new THREE.Vector3(start.x, start.y, start.z))).toBeLessThan(1e-9);
  });
});

describe("whether the middle of a round edge is open (Discussion #610)", () => {
  const body = (...geometries: THREE.BufferGeometry[]) => {
    const group = new THREE.Group();
    geometries.forEach((geometry) => {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      mesh.layers.set(RENDER_LAYER_SHAPES);
      group.add(mesh);
    });
    group.updateMatrixWorld(true);
    return group;
  };
  const up = new THREE.Vector3(0, 1, 0);

  it("is open for a hole through a plate, and filled on the top of a cylinder", () => {
    const plate = plateWithHole();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(plate.positions, 3));
    expect(tapeRimOpen(body(geometry), { center: plate.holeCentre, radius: 5, normal: up })).toBe(true);
    expect(tapeRimOpen(body(geometry), { center: plate.holeCentre.clone().setY(0), radius: 5, normal: up })).toBe(true);
    const cylinder = new THREE.CylinderGeometry(4, 4, 12, 32).translate(0, 6, 0);
    expect(tapeRimOpen(body(cylinder), { center: new THREE.Vector3(0, 12, 0), radius: 4, normal: up })).toBe(false);
    // The bottom rim, its circle facing into the cylinder: counted along the axis, the ray meets both ends.
    expect(tapeRimOpen(body(cylinder), { center: new THREE.Vector3(0, 0, 0), radius: 4, normal: up })).toBe(false);
  });

  it("is filled at the foot of a boss that stands on a plate as one body", () => {
    // The plate's top has the boss's foot cut out, the boss has no floor: one closed body (its sides left out,
    // which the axis does not meet). The middle of the foot lies inside it.
    const outline = new THREE.Shape([new THREE.Vector2(-15, -15), new THREE.Vector2(15, -15), new THREE.Vector2(15, 15), new THREE.Vector2(-15, 15)]);
    const foot = new THREE.Path();
    foot.absarc(0, 0, 4, 0, Math.PI * 2, true);
    outline.holes.push(foot);
    const plateTop = new THREE.ShapeGeometry(outline, 16).rotateX(-Math.PI / 2).translate(0, 6, 0);
    const plateBottom = new THREE.PlaneGeometry(30, 30).rotateX(Math.PI / 2);
    const bossSide = new THREE.CylinderGeometry(4, 4, 8, 32, 1, true).translate(0, 10, 0);
    const bossTop = new THREE.CircleGeometry(4, 32).rotateX(-Math.PI / 2).translate(0, 14, 0);
    expect(tapeRimOpen(body(plateTop, plateBottom, bossSide, bossTop), { center: new THREE.Vector3(0, 6, 0), radius: 4, normal: up })).toBe(false);
  });
});

describe("the marks of the centres on offer (Discussion #610)", () => {
  it("draw the centre the point sits on in full, with its hint, and the others faint, unlike a corner", () => {
    const { state, ids, plate } = scene();
    const at = screenOf(state, plate.holeCentre);
    const { snap, offers } = tapeCentresNear(state, ids, at.x, at.y);
    const other = { x: plate.topCentre.x, y: plate.topCentre.y, z: plate.topCentre.z, kind: "face" as const };
    const model: TapeModel = { points: [], segments: [], startPointId: null, hover: { ...snap!.candidate, centres: [...offers, other] } };
    let overlay: TapeOverlayState | null = null;
    syncTapeOverlay(state, model, { current: null }, (next) => { overlay = next as TapeOverlayState; }, 2);
    const hover = (overlay as unknown as TapeOverlayState).hover!;
    expect(hover.centre).toBe("hole");
    expect(hover.centres).toHaveLength(1);
    expect(hover.centres![0].screenX).toBeCloseTo(screenOf(state, plate.topCentre).x, 6);
    const props = { overlay: overlay as unknown as TapeOverlayState, startPointId: null, active: true, deleteMode: false, moveMode: false, onPointPointerDown: () => {}, onPointPointerMove: () => {}, onPointPointerUp: () => {}, onSegmentPointerDown: () => {} };
    const markup = renderToStaticMarkup(createElement(TapeOverlay, props));
    expect(markup.match(/class="tape-centre snapped"/g)).toHaveLength(1);
    expect(markup.match(/class="tape-centre "/g)).toHaveLength(1);
    expect(markup).not.toContain("tape-hover-point");
    expect(markup).toContain("Centre of hole");
    // A point that is no centre keeps the ring a corner has, and no hint.
    syncTapeOverlay(state, { ...model, hover: { x: 0, y: 6, z: 0, centres: [other] } }, { current: null }, (next) => { overlay = next as TapeOverlayState; }, 2);
    const plain = renderToStaticMarkup(createElement(TapeOverlay, { ...props, overlay: overlay as unknown as TapeOverlayState }));
    expect(plain).toContain("tape-hover-point");
    expect(plain).not.toContain("tape-centre snapped");
    expect(plain).not.toContain("tape-centre-hint");
  });
});
