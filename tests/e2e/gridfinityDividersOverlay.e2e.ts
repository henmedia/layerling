// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { endGridfinityDividerDrag, GridfinityDividersOverlay, syncGridfinityDividersOverlay, type GridfinityDividerDrag, type GridfinityDividersOverlayState } from "@/components/workplane/GridfinityDividersOverlay";
import { updateShapeObjectTransform } from "@/components/workplane/viewportShapeObjects";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import { gridfinityDividerGrips } from "@/lib/gridfinityDividerGrips";
import { GRIDFINITY_LIP_HEIGHT } from "@/lib/gridfinityGeometry";
import { setLengthUnit } from "@/lib/measurementUnits";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A Gridfinity bin's dividers dragged in the view (Discussion #1799). The view looks straight down at 4 pixels a
 * millimetre, the bin's middle at 200, 200, so a place x, z of the bin's plan is at 200 + 4 x, 200 + 4 z on the screen.
 * The bin is 2 x 1 x 3 units (81.6 x 39.6 inside), 3 compartments across and 2 deep: dividers at -13.8 and 13.8 across,
 * at 0 deep, each compartment 26.4 x 19.2.
 */
let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

function bin(fields: Record<string, unknown> = {}) {
  return { id: "g", name: "Bin", kind: "gridfinity", color: "#4f7fa8", x: 0, z: 0, elevation: 0, size: 83.5, width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT, rotation: 0, gridfinityType: "bin", gridfinityLip: true, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, ...fields } as unknown as WorkplaneShape;
}

/** A camera put at `from`, looking at `to`. */
function aim<C extends THREE.Camera>(camera: C, from: [number, number, number], to: [number, number, number], up?: [number, number, number]) {
  if (up) camera.up.set(...up);
  camera.position.set(...from);
  camera.lookAt(...to);
  camera.updateMatrixWorld();
  return camera;
}
const flatCamera = () => new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 1000);
const eyeCamera = (fov = 50) => new THREE.PerspectiveCamera(fov, 1, 0.1, 2000);
/** A camera looking straight down from 300 mm, 100 mm across the 400 pixels of the view. */
const fromAbove = (near = 0.1) => aim(new THREE.OrthographicCamera(-50, 50, 50, -50, near, 1000), [0, 300, 0], [0, 0, 0], [0, 0, -1]);
/** Standing in the bin 40 mm up and 10 mm in front of its middle, looking to the back. */
const inside = () => aim(eyeCamera(90), [0, 40, 10], [0, 40, -100]);

/** The view, with each bin's object placed as the viewport places it: at half its height, turned and mirrored. */
function viewOf(shapes: WorkplaneShape[], camera: THREE.Camera = fromAbove()) {
  const objectOf = (shape: WorkplaneShape) => {
    const object = new THREE.Group();
    updateShapeObjectTransform(object, shape);
    object.updateMatrixWorld(true);
    return { object, shape };
  };
  return {
    camera,
    pointer: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    renderer: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }) } },
    shapeRecords: new Map(shapes.map((shape) => [shape.id, objectOf(shape)])),
  } as unknown as ThreeState;
}

function overlayOf(shape: WorkplaneShape, camera?: THREE.Camera, dragged: GridfinityDividerDrag | null = null) {
  let overlay: GridfinityDividersOverlayState | null = null;
  syncGridfinityDividersOverlay(viewOf([shape], camera), shape, { current: null }, (next) => { overlay = next as GridfinityDividersOverlayState | null; }, dragged);
  return overlay as GridfinityDividersOverlayState | null;
}

/**
 * The overlay over the view, drawn again with every change it writes; `change` changes the bin from outside, as the MCP
 * does, and `view` moves the camera.
 */
function mount(start: WorkplaneShape, options: { camera?: THREE.Camera } = {}) {
  let lens = options.camera;
  let shape = start;
  const updates: Partial<WorkplaneShape>[] = [];
  const active: boolean[] = [];
  const camera: string[] = [];
  const dragRef: { current: GridfinityDividerDrag | null } = { current: null };
  const threeRef = { current: viewOf([start], options.camera) };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const render = () => root!.render(createElement(GridfinityDividersOverlay, {
    overlay: overlayOf(shape, lens, dragRef.current)!,
    shape,
    threeRef,
    dragRef,
    onUpdateShape: (_id: string, patch: Partial<WorkplaneShape>) => {
      updates.push(patch);
      shape = { ...shape, ...patch };
      render();
    },
    onInteractionActiveChange: (value: boolean) => active.push(value),
    // As the viewport's: only a middle or right press, which goes no further.
    onBeginCameraDrag: (event: { button: number; stopPropagation: () => void }) => {
      if (event.button !== 1 && event.button !== 2) return;
      event.stopPropagation();
      camera.push(`drag ${event.button}`);
    },
    onCameraWheel: () => camera.push("wheel"),
  }));
  act(render);
  const change = (fields: Partial<WorkplaneShape>) => {
    shape = { ...shape, ...fields };
    act(render);
  };
  const view = (next: THREE.Camera) => {
    lens = next;
    threeRef.current.camera = next;
    act(render);
  };
  return { panel: container, updates, active, camera, dragRef, threeRef, shape: () => shape, change, view };
}

const grips = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>('[data-testid="gridfinity-dividers-overlay-grip"]')];
const placeOf = (element: HTMLElement) => ({ x: Number.parseFloat(element.style.left), y: Number.parseFloat(element.style.top) });
function pointer(element: Element, type: string, x: number, y: number, altKey = false, pointerId = 1) {
  act(() => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0, altKey });
    Object.defineProperty(event, "pointerId", { value: pointerId });
    element.dispatchEvent(event);
  });
}
/** Presses a grip at its place and lets go after moving the pointer through the given places. */
function drag(element: HTMLElement, places: [number, number][], altKey = false) {
  const { x, y } = placeOf(element);
  pointer(element, "pointerdown", x, y, altKey);
  places.forEach(([px, py]) => pointer(element, "pointermove", px, py, altKey));
  const [lx, ly] = places[places.length - 1] ?? [x, y];
  pointer(element, "pointerup", lx, ly, altKey);
}
const near = (point: { x: number; y: number }) => ({ x: expect.closeTo(point.x, 1), y: expect.closeTo(point.y, 1) });

describe("gridfinity dividers dragged in the view", () => {
  it("puts a grip on each divider's top, off the crossing, and each compartment's size between the faces", () => {
    const overlay = overlayOf(bin())!;
    // Across at -13.8 and 13.8 (grips on the back halves, z -10.2), deep at 0 (grip in the middle stretch, x 0).
    expect(overlay.dividers.map((divider) => divider.grip)).toEqual([near({ x: 144.8, y: 159.2 }), near({ x: 255.2, y: 159.2 }), near({ x: 200, y: 200 })]);
    expect(overlay.dividers[0].from).toEqual(near({ x: 144.8, y: 120.8 }));
    expect(overlay.dividers[0].to).toEqual(near({ x: 144.8, y: 279.2 }));
    expect(overlay.dividers[2].from).toEqual(near({ x: 36.8, y: 200 }));
    // In whole millimetres, as Hollow's sizes are: 26.4 x 19.2.
    expect(overlay.compartments.map((entry) => entry.text)).toEqual(Array.from({ length: 6 }, () => "26 × 19"));
    expect(overlay.compartments[0].at).toEqual(near({ x: 89.6, y: 159.2 }));
  });

  it("shows the sizes in inches in an inch workspace, to the nearest eighth or to two decimals", () => {
    try {
      // 26.4 mm = 1.039 in, 19.2 mm = 0.756 in.
      setLengthUnit({ units: "Imperial", scale: "1:1 (inches)" });
      expect(overlayOf(bin())!.compartments[0].text).toBe("1 × ¾");
      setLengthUnit({ units: "Imperial", scale: "1:1 (inches)", inchFormat: "decimal" });
      expect(overlayOf(bin())!.compartments[0].text).toBe("1.04 × 0.76");
    } finally {
      setLengthUnit({ units: "Metric (Default)", scale: "1:1 (millimeters)" });
    }
  });

  it("shows a size only where its compartment on screen is 48 pixels wide and wide enough for its characters, 7 pixels each", () => {
    // From above, the 26.4 mm compartments at the given pixels a millimetre.
    const scaled = (pixels: number) => overlayOf(bin(), aim(new THREE.OrthographicCamera(-200 / pixels, 200 / pixels, 200 / pixels, -200 / pixels, 0.1, 1000), [0, 300, 0], [0, 0, 0], [0, 0, -1]))!.compartments;
    // 52.8 pixels: room for "26 × 19" (49).
    expect(scaled(2)).toHaveLength(6);
    try {
      // 69.9 pixels: not for "1.04 × 0.76" (77).
      setLengthUnit({ units: "Imperial", scale: "1:1 (inches)", inchFormat: "decimal" });
      expect(scaled(2.65)).toEqual([]);
      // 42.2 pixels: below 48, though "1 × ¾" would take only 35.
      setLengthUnit({ units: "Imperial", scale: "1:1 (inches)" });
      expect(overlayOf(bin())!.compartments[0].text).toBe("1 × ¾");
      expect(scaled(1.6)).toEqual([]);
    } finally {
      setLengthUnit({ units: "Metric (Default)", scale: "1:1 (millimeters)" });
    }
  });

  it("draws the walls between the parts of a split compartment without a grip, and leaves out a size its compartment has no room for", () => {
    // The middle compartment at the back split in three: parts of 8 mm, 32 pixels, narrower than the 48 a size needs.
    const overlay = overlayOf(bin({ gridfinityCompartmentSplits: [{ column: 1, row: 0, x: 3 }] }))!;
    expect(overlay.dividers).toHaveLength(3);
    expect(overlay.parts).toHaveLength(2);
    expect(overlay.parts[0].from).toEqual(near({ x: 181.6, y: 120.8 }));
    expect(overlay.parts[0].to).toEqual(near({ x: 181.6, y: 197.6 }));
    expect(overlay.parts[1].from).toEqual(near({ x: 218.4, y: 120.8 }));
    expect(overlay.compartments.map((entry) => entry.text)).toEqual(Array.from({ length: 5 }, () => "26 × 19"));
  });

  it("moves the divider whose grip is dragged, in steps of 0.5 mm, as one interaction", () => {
    const { panel, updates, active, shape } = mount(bin());
    // 20 pixels to the right are 5 mm; the first 2 pixels are not yet a drag.
    drag(grips(panel)[0], [[146.8, 159.2], [164.8, 160]]);
    expect(updates).toHaveLength(1);
    expect(shape().gridfinityDividerPositionsX!.map((p) => Number(p.toFixed(6)))).toEqual([32, 54.6]);
    expect(shape().gridfinityDividerPositionsZ).toBeUndefined();
    expect(active).toEqual([true, false]);
    // The grip went with it.
    expect(placeOf(grips(panel)[0])).toEqual(near({ x: 164.8, y: 159.2 }));
  });

  it("leaves the axis evenly spaced after a drag out and back to where it began", () => {
    const { panel, updates, active, shape } = mount(bin());
    drag(grips(panel)[0], [[164.8, 159.2], [145.2, 159.2]]);
    expect(updates).toHaveLength(2);
    expect(shape()).toHaveProperty("gridfinityDividerPositionsX", undefined);
    expect(active).toEqual([true, false]);
  });

  it("moves in steps of 0.1 mm with Alt held", () => {
    const { panel, shape } = mount(bin());
    drag(grips(panel)[0], [[165.6, 159.2]], true);
    expect(shape().gridfinityDividerPositionsX![0]).toBe(32.2);
  });

  it("moves a divider deep along the depth", () => {
    const { panel, shape } = mount(bin());
    // 17.6 pixels to the back are 4.4 mm: 19.8 - 4.4 = 15.4, on the step 15.5.
    drag(grips(panel)[2], [[200, 182.4]]);
    expect(shape().gridfinityDividerPositionsZ).toEqual([15.5]);
    expect(shape().gridfinityDividerPositionsX).toBeUndefined();
  });

  it("follows a bin turned a quarter and a mirrored bin", () => {
    // Turned 90 degrees, the bin's x runs to the back of the scene: the first divider's grip at -10.2, 13.8 in the scene.
    const turned = mount(bin({ rotation: 90 }));
    expect(placeOf(grips(turned.panel)[0])).toEqual(near({ x: 159.2, y: 255.2 }));
    drag(grips(turned.panel)[0], [[159.2, 235.2]]);
    expect(turned.shape().gridfinityDividerPositionsX!.map((p) => Number(p.toFixed(6)))).toEqual([32, 54.6]);
    act(() => root?.unmount());
    // Mirrored left to right, the first divider is on the right, and dragging it to the right moves it to the left.
    const mirrored = mount(bin({ mirrorX: true }));
    expect(placeOf(grips(mirrored.panel)[0])).toEqual(near({ x: 255.2, y: 159.2 }));
    drag(grips(mirrored.panel)[0], [[275.2, 159.2]]);
    expect(mirrored.shape().gridfinityDividerPositionsX!.map((p) => Number(p.toFixed(6)))).toEqual([22, 54.6]);
  });

  it("writes nothing for a click with a shaky hand, so evenly spaced dividers stay evenly spaced", () => {
    const { panel, updates, active, shape } = mount(bin());
    drag(grips(panel)[0], [[146.4, 160.2], [143.6, 157.8]]);
    expect(updates).toEqual([]);
    expect(active).toEqual([]);
    expect(shape().gridfinityDividerPositionsX).toBeUndefined();
  });

  it("calls a drag off with Esc: the editor puts the bin back, the interaction ends, and the pointer moves nothing after", () => {
    const { panel, updates, active, dragRef } = mount(bin());
    const grip = grips(panel)[0];
    pointer(grip, "pointerdown", 144.8, 159.2);
    pointer(grip, "pointermove", 164.8, 159.2);
    expect(updates).toHaveLength(1);
    const cancelled: string[] = [];
    expect(endGridfinityDividerDrag(dragRef, (value) => active.push(value), () => cancelled.push("cancel"))).toBe(true);
    expect(cancelled).toEqual(["cancel"]);
    expect(active).toEqual([true, false]);
    expect(dragRef.current).toBeNull();
    pointer(grip, "pointermove", 184.8, 159.2);
    pointer(grip, "pointerup", 184.8, 159.2);
    expect(updates).toHaveLength(1);
    expect(active).toEqual([true, false]);
    // A grip pressed but not yet dragged has nothing for the editor to put back.
    pointer(grips(panel)[0], "pointerdown", 164.8, 159.2);
    expect(endGridfinityDividerDrag(dragRef, (value) => active.push(value), () => cancelled.push("cancel"))).toBe(true);
    expect(cancelled).toEqual(["cancel"]);
    expect(active).toEqual([true, false]);
    expect(endGridfinityDividerDrag(dragRef)).toBe(false);
  });

  it("ends the interaction when the grips go in the middle of a drag", () => {
    const { panel, active, dragRef } = mount(bin());
    pointer(grips(panel)[0], "pointerdown", 144.8, 159.2);
    pointer(grips(panel)[0], "pointermove", 164.8, 159.2);
    act(() => root?.unmount());
    root = null;
    expect(active).toEqual([true, false]);
    expect(dragRef.current).toBeNull();
  });

  it("ends the drag when the number of dividers that way changes in the middle of it, and writes nothing more", () => {
    // The MCP, say: two across or four across now; the drag's places and list from the start fit neither.
    for (const count of [2, 4]) {
      const { panel, updates, active, dragRef, change } = mount(bin());
      const grip = grips(panel)[0];
      pointer(grip, "pointerdown", 144.8, 159.2);
      pointer(grip, "pointermove", 164.8, 159.2);
      expect(updates, `${count}`).toHaveLength(1);
      change({ gridfinityCompartmentsX: count, gridfinityDividerPositionsX: undefined });
      expect(active, `${count}`).toEqual([true, false]);
      expect(dragRef.current, `${count}`).toBeNull();
      pointer(grip, "pointermove", 184.8, 159.2);
      pointer(grip, "pointerup", 184.8, 159.2);
      expect(updates, `${count}`).toHaveLength(1);
      act(() => root?.unmount());
    }
  });

  it("leaves a running drag to its own pointer when a second one presses a grip, and ends it once", () => {
    const { panel, updates, active, dragRef } = mount(bin());
    pointer(grips(panel)[0], "pointerdown", 144.8, 159.2);
    pointer(grips(panel)[0], "pointermove", 164.8, 159.2);
    // A second finger on the same grip, lifted there, then on another one.
    pointer(grips(panel)[0], "pointerdown", 164.8, 159.2, false, 2);
    pointer(grips(panel)[0], "pointerup", 164.8, 159.2, false, 2);
    pointer(grips(panel)[1], "pointerdown", 255.2, 159.2, false, 2);
    expect(dragRef.current?.pointer).toBe(1);
    pointer(grips(panel)[1], "pointermove", 235.2, 159.2, false, 2);
    pointer(grips(panel)[1], "pointerup", 235.2, 159.2, false, 2);
    expect(updates).toHaveLength(1);
    pointer(grips(panel)[0], "pointerup", 164.8, 159.2);
    expect(active).toEqual([true, false]);
    expect(dragRef.current).toBeNull();
  });

  it("ends a drag whose pointer presses again, its letting go missed, and starts the new one, which only its own grip ends", () => {
    const { panel, updates, active, dragRef } = mount(bin());
    pointer(grips(panel)[0], "pointerdown", 144.8, 159.2);
    pointer(grips(panel)[0], "pointermove", 164.8, 159.2);
    pointer(grips(panel)[1], "pointerdown", 255.2, 159.2);
    expect(active).toEqual([true, false]);
    expect(dragRef.current?.index).toBe(1);
    pointer(grips(panel)[1], "pointermove", 235.2, 159.2);
    // A late lost capture of the grip pressed before does not end the new drag; only the grip holding it does.
    pointer(grips(panel)[0], "lostpointercapture", 164.8, 159.2);
    expect(dragRef.current?.index).toBe(1);
    pointer(grips(panel)[1], "pointerup", 235.2, 159.2);
    expect(updates).toHaveLength(2);
    expect(active).toEqual([true, false, true, false]);
  });

  it("moves nothing while the view looks along the dividers' top", () => {
    // The view turned almost to the front in the middle of a drag (a view key, say).
    const { panel, updates, threeRef } = mount(bin());
    pointer(grips(panel)[0], "pointerdown", 144.8, 159.2);
    pointer(grips(panel)[0], "pointermove", 164.8, 159.2);
    expect(updates).toHaveLength(1);
    // 10 degrees up: rays still meet the top, far off, but too flat to follow.
    const angle = THREE.MathUtils.degToRad(10);
    threeRef.current.camera = aim(flatCamera(), [0, 20.15 + 300 * Math.sin(angle), 300 * Math.cos(angle)], [0, 20.15, 0]);
    pointer(grips(panel)[0], "pointermove", 190, 150);
    pointer(grips(panel)[0], "pointermove", 100, 210);
    expect(updates).toHaveLength(1);
  });

  it("hands a middle or right press and the wheel on a grip to the view, leaves back and forward alone, and keeps a left press", () => {
    const { panel, active, camera, dragRef } = mount(bin());
    // What the page round the overlay hears of a press on a grip.
    const reached: number[] = [];
    const listen = (event: Event) => reached.push((event as MouseEvent).button);
    document.body.addEventListener("pointerdown", listen);
    for (const button of [1, 2, 3]) {
      act(() => {
        const event = new MouseEvent("pointerdown", { bubbles: true, clientX: 144.8, clientY: 159.2, button });
        Object.defineProperty(event, "pointerId", { value: 1 });
        grips(panel)[0].dispatchEvent(event);
      });
    }
    act(() => grips(panel)[0].dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: -100 })));
    expect(camera).toEqual(["drag 1", "drag 2", "wheel"]);
    expect(reached).toEqual([3]);
    expect(dragRef.current).toBeNull();
    pointer(grips(panel)[0], "pointerdown", 144.8, 159.2);
    expect(reached).toEqual([3]);
    expect(camera).toHaveLength(3);
    expect(dragRef.current).not.toBeNull();
    expect(active).toEqual([]);
    document.body.removeEventListener("pointerdown", listen);
  });

  it("keeps the browser's menu from a right click on a grip", () => {
    const { panel } = mount(bin());
    const heard: string[] = [];
    const listen = () => heard.push("contextmenu");
    document.body.addEventListener("contextmenu", listen);
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 });
    act(() => grips(panel)[0].dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(heard).toEqual([]);
    document.body.removeEventListener("contextmenu", listen);
  });

  it("keeps the grip being dragged while its divider reaches behind the camera, so letting go ends the drag once", () => {
    // Zoomed in during the drag until the camera stands in the bin: the dividers across reach behind it.
    const { panel, active, dragRef, view } = mount(bin());
    const grip = grips(panel)[0];
    pointer(grip, "pointerdown", 144.8, 159.2);
    pointer(grip, "pointermove", 164.8, 159.2);
    view(inside());
    const titles = grips(panel).map((element) => element.title);
    expect(titles).toEqual(["Divider 1 from the left", "Divider 1 from the back"]);
    expect(grips(panel)[0]).toBe(grip);
    pointer(grip, "pointerup", 164.8, 159.2);
    expect(active).toEqual([true, false]);
    // Esc afterwards has no drag to call off.
    const cancelled: string[] = [];
    expect(endGridfinityDividerDrag(dragRef, (value) => active.push(value), () => cancelled.push("cancel"))).toBe(false);
    expect(cancelled).toEqual([]);
    expect(active).toEqual([true, false]);
  });

  it("ends the drag when the grip lost the pointer", () => {
    const { panel, active, dragRef } = mount(bin());
    pointer(grips(panel)[0], "pointerdown", 144.8, 159.2);
    pointer(grips(panel)[0], "pointermove", 164.8, 159.2);
    pointer(grips(panel)[0], "lostpointercapture", 164.8, 159.2);
    expect(active).toEqual([true, false]);
    expect(dragRef.current).toBeNull();
  });

  it("follows the pointer in a flat view whose camera stands below the dividers' top", () => {
    // A flat view's camera may stand anywhere along its line, with the near plane behind it (Discussion #1558); here 10 mm up.
    const low = fromAbove(-1000);
    low.position.y = 10;
    low.updateMatrixWorld();
    const { panel, shape } = mount(bin(), { camera: low });
    drag(grips(panel)[0], [[164.8, 159.2]]);
    expect(shape().gridfinityDividerPositionsX!.map((p) => Number(p.toFixed(6)))).toEqual([32, 54.6]);
  });

  it("stands the grips on the dividers' top in a view at an angle", () => {
    // Seen from the front and above, the height shows on the screen: the first grip is at -13.8, 20.15, -10.2 in the scene.
    const camera = aim(new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 2000), [0, 300, 300], [0, 0, 0]);
    const projected = new THREE.Vector3(-13.8, 20.15, -10.2).project(camera);
    const overlay = overlayOf(bin(), camera)!;
    expect(overlay.dividers[0].grip).toEqual(near({ x: ((projected.x + 1) / 2) * 400, y: ((1 - projected.y) / 2) * 400 }));
  });

  it("keeps the grip being dragged while the view turns it too flat to follow, so letting go ends the drag once", () => {
    // Orbited during the drag to 39 mm over the dividers' top and 100 mm to the right of the bin's middle: the middle is
    // seen 21.3 degrees up, the first divider's grip (-13.8, -10.2), 114.3 mm away, only 18.8 degrees.
    const { panel, active, view } = mount(bin());
    const grip = grips(panel)[0];
    pointer(grip, "pointerdown", 144.8, 159.2);
    pointer(grip, "pointermove", 164.8, 159.2);
    view(aim(eyeCamera(), [100, 20.15 + 39, 0], [0, 20.15, 0]));
    expect(grips(panel)[0]).toBe(grip);
    expect(grip.title).toBe("Divider 1 from the left");
    pointer(grip, "pointerup", 164.8, 159.2);
    expect(active).toEqual([true, false]);
  });

  it("leaves out a divider, a wall between parts or a compartment that reaches behind the camera, and draws the rest", () => {
    // In the bin, looking to the back: the dividers across run to the front, behind the camera; the divider deep and the
    // back compartments lie in front of it, and so does nothing of the middle front compartment, split in two.
    const split = bin({ gridfinityCompartmentSplits: [{ column: 1, row: 1, x: 2 }] });
    const overlay = overlayOf(split, inside())!;
    expect(overlay.dividers.map((divider) => `${divider.axis}${divider.index}`)).toEqual(["z0"]);
    expect(overlay.parts).toEqual([]);
    // The three back compartments show their sizes, on one line; the front ones reach behind the camera.
    expect(overlay.compartments).toHaveLength(3);
    expect(new Set(overlay.compartments.map((entry) => Math.round(entry.at.y))).size).toBe(1);
    const outside = overlayOf(split, aim(eyeCamera(), [0, 200, 200], [0, 0, 0]))!;
    expect(outside.dividers).toHaveLength(3);
    expect(outside.parts).toHaveLength(1);
  });

  it("leaves out a grip the camera sees too flat to follow, though the bin's middle is steep enough", () => {
    // A bin of 6 x 6 units, 4 x 4 compartments, seen 21 degrees up from 400 mm in front of its middle: the grips at the
    // back are seen flatter than 20 degrees and go, those at the front stay.
    const large = bin({ width: 251.5, depth: 251.5, gridfinityCompartmentsX: 4, gridfinityCompartmentsZ: 4 });
    const angle = THREE.MathUtils.degToRad(21);
    const eye = aim(eyeCamera(), [0, 20.15 + 400 * Math.sin(angle), 400 * Math.cos(angle)], [0, 20.15, 0]);
    const overlay = overlayOf(large, eye)!;
    const all = gridfinityDividerGrips(large)!.dividers;
    expect(overlay.dividers.length).toBeGreaterThan(0);
    expect(overlay.dividers.length).toBeLessThan(all.length);
    for (const shown of overlay.dividers) {
      const { grip } = all.find((divider) => divider.axis === shown.axis && divider.index === shown.index)!;
      const ray = new THREE.Vector3(grip.x, 20.15, grip.z).sub(eye.position).normalize();
      expect(Math.abs(ray.y), `${shown.axis}${shown.index}`).toBeGreaterThanOrEqual(Math.sin(THREE.MathUtils.degToRad(20)));
    }
  });

  it("draws nothing seen straight from the front, where the dividers' top is seen along its edge, and draws it from a little higher", () => {
    expect(overlayOf(bin(), aim(flatCamera(), [0, 20.15, 300], [0, 20.15, 0]))).toBeNull();
    expect(overlayOf(bin(), aim(eyeCamera(), [0, 20.15, 300], [0, 20.15, 0]))).toBeNull();
    // 25 degrees up: drawn. 15 degrees up: still too flat.
    for (const [degrees, drawn] of [[25, true], [15, false]] as const) {
      const angle = THREE.MathUtils.degToRad(degrees);
      const raised = aim(flatCamera(), [0, 20.15 + 300 * Math.sin(angle), 300 * Math.cos(angle)], [0, 20.15, 0]);
      expect(overlayOf(bin(), raised) !== null, `${degrees}`).toBe(drawn);
    }
  });
});
