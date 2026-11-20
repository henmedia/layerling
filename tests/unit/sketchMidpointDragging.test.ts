// @vitest-environment jsdom
import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SketchWorkspace } from "@/components/SketchWorkspace";
import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import { selectionSnapTargets } from "@/lib/sketchSnapPoints";
import { applySketchConstraints } from "@/lib/sketchConstraints";
import type { SketchProfile } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const twoLines = (halfLength = 1): SketchProfile => ({
  points: [{ id: "a", x: -halfLength, z: 0 }, { id: "b", x: halfLength, z: 0 },
    { id: "p", x: 0, z: 0 }, { id: "q", x: 0, z: 20 }],
  segments: [{ id: "ab", startId: "a", endId: "b" }, { id: "pq", startId: "p", endId: "q" }],
  constraints: [{ id: "mid", kind: "midpoint", a: "a", b: "b", c: "p" }],
});

describe("midpoint drag regression", () => {
  it("does not reject a small diagonal update inside the per-coordinate tolerance", () => {
    const profile = twoLines(50);
    profile.points[2] = { ...profile.points[2], x: 0.000008, z: 0.000008 };
    expect(applySketchConstraints(profile, new Set(["p"])).ok).toBe(true);
  });

  it.each([{ ids: ["a", "b"] }, { ids: ["a"] }, { ids: ["b"] }, { ids: ["p"] }, { ids: ["p", "q"] }])("keeps the midpoint valid through repeated drags of $ids", ({ ids }) => {
    let profile = twoLines(50);
    const initial = cloneSketchProfile(profile);
    for (let step = 0; step < 150; step++) {
      const requested = { ...profile, points: profile.points.map(point => ids.includes(point.id)
        ? { ...point, x: point.x + 0.031, z: point.z - 0.047 } : point) };
      const before = JSON.stringify(requested);
      const result = applySketchConstraints(requested, new Set(ids));
      expect(result.ok).toBe(true);
      if (!result.ok) throw Error("A free midpoint drag was rejected");
      expect(JSON.stringify(requested)).toBe(before);
      profile = result.profile;
      const [a, b, p] = profile.points;
      expect(p.x).toBeCloseTo((a.x + b.x) / 2, 7);
      expect(p.z).toBeCloseTo((a.z + b.z) / 2, 7);
      expect(profile.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.z))).toBe(true);
      for (const id of ids) expect(profile.points.find(point => point.id === id))
        .toEqual(requested.points.find(point => point.id === id));
    }
    expect(profile.constraints).toEqual(initial.constraints);
    const undo = cloneSketchProfile(initial), redo = cloneSketchProfile(profile);
    expect(applySketchConstraints(undo).ok).toBe(true);
    expect(applySketchConstraints(redo).ok).toBe(true);
    expect(undo).toEqual(initial);
    expect(redo).toEqual(cloneSketchProfile(profile));
    expect(redo.points).not.toEqual(undo.points);
  });

  it("rejects an impossible locked midpoint drag without mutating either input or last valid geometry", () => {
    const valid = twoLines(50);
    valid.points[0].locked = true; valid.points[1].locked = true;
    const before = JSON.stringify(valid);
    const requested = { ...valid, points: valid.points.map(point => point.id === "p" ? { ...point, z: 1 } : point) };
    const attempted = JSON.stringify(requested);
    const result = applySketchConstraints(requested, new Set(["p"]));
    expect(result.ok).toBe(false);
    expect(JSON.stringify(valid)).toBe(before); expect(JSON.stringify(requested)).toBe(attempted);
    if (!result.ok) expect(result.failure.unsatisfied.map(rule => rule.id)).toEqual(["mid"]);
  });

  it("keeps unrelated geometry available for snapping, but excludes constraint participants", () => {
    const profile = twoLines();
    profile.points.push({ id: "r", x: 50, z: 40 }, { id: "s", x: 60, z: 40 });
    profile.segments.push({ id: "rs", startId: "r", endId: "s" });
    expect(selectionSnapTargets(profile, new Set(["p"]))).toEqual(expect.arrayContaining([
      { x: 50, z: 40 }, { x: 60, z: 40 }, { x: 55, z: 40 },
    ]));
    expect(selectionSnapTargets(profile, new Set(["p"]))).not.toContainEqual({ x: 0, z: 0 });
  });

  let container: HTMLDivElement, root: Root;
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    Object.defineProperties(SVGSVGElement.prototype, {
      getScreenCTM: { configurable: true, value: () => ({ a: 1, b: 0, c: 0, d: 1, inverse() { return this; } }) },
      createSVGPoint: { configurable: true, value: () => ({ x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y }; } }) },
      hasPointerCapture: { configurable: true, value: () => false },
    });
  });
  afterEach(() => {
    act(() => root.unmount()); container.remove(); vi.unstubAllGlobals();
    for (const name of ["getScreenCTM", "createSVGPoint", "hasPointerCapture"]) Reflect.deleteProperty(SVGSVGElement.prototype, name);
  });
  function render(profile: SketchProfile) {
    const noop = vi.fn();
    const props: ComponentProps<typeof SketchWorkspace> = {
      profile, referenceShapes: [], tool: "select", activePointId: null, selected: null,
      measurement: null, pendingMeasurementStart: null, initialSnap: "Off",
      onPlanePoint: noop, onAddPrimitive: noop, onPointPress: noop,
      onSelectSegment: noop, onSelectMany: noop, onToggleSelect: noop,
      onSelectImage: noop, onUpdateImage: noop, onDeleteImage: noop,
      onDeletePoint: noop, onDeleteSegment: noop, onMovePoint: vi.fn(),
      onTransformPoints: vi.fn(), onMoveHandle: noop, onInsertPoint: noop,
      onSetPointMode: noop, onClearMeasurement: noop, onMeasureTool: noop, onAddConstraint: noop,
    };
    act(() => root.render(createElement(SketchWorkspace, props)));
    return props;
  }
  function pointer(target: Element, type: string, x: number, z: number) {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: z });
    Object.defineProperty(event, "pointerId", { value: 1 });
    act(() => target.dispatchEvent(event));
  }
  function positions() {
    return [...container.querySelectorAll('[data-sketch-entity="point"]')]
      .map(point => ({ x: Number(point.getAttribute("cx")), z: Number(point.getAttribute("cy")) }));
  }
  it("does not alternate between moving snap targets while the pointer stands still", () => {
    render(twoLines());
    const svg = container.querySelector("svg.sketch-plate")!;
    pointer(container.querySelectorAll('[data-sketch-entity="point"]')[2], "pointerdown", 0, 0);
    const frames = [];
    for (let i = 0; i < 6; i++) { pointer(svg, "pointermove", 0, 1); frames.push(positions()); }
    expect(frames.every(frame => JSON.stringify(frame) === JSON.stringify(frames[0]))).toBe(true);
    expect(frames[0][2]).toEqual({ x: 0, z: 1 });
    expect(frames[0][2].z).toBeCloseTo((frames[0][0].z + frames[0][1].z) / 2);
  });
  it("retains open-end snapping on independent unconstrained paths", () => {
    render({ ...twoLines(50), constraints: [] });
    const svg = container.querySelector("svg.sketch-plate")!;
    pointer(container.querySelectorAll('[data-sketch-entity="point"]')[2], "pointerdown", 0, 0);
    pointer(svg, "pointermove", 0, 19);
    expect(positions()[2]).toEqual({ x: 0, z: 20 });
  });

  it.each([0, 1, 2])("keeps point %s previews stable through repeated small pointer updates", index => {
    const initial = twoLines(50);
    render(initial);
    const svg = container.querySelector("svg.sketch-plate")!;
    const start = initial.points[index];
    pointer(container.querySelectorAll('[data-sketch-entity="point"]')[index], "pointerdown", start.x, start.z);
    for (let step = 1; step <= 20; step++) {
      const x = start.x + step / 10, z = start.z - step / 10;
      pointer(svg, "pointermove", x, z);
      const frame = positions();
      expect(frame[index].x).toBeCloseTo(x, 7); expect(frame[index].z).toBeCloseTo(z, 7);
      expect(frame[2].x).toBeCloseTo((frame[0].x + frame[1].x) / 2, 7);
      expect(frame[2].z).toBeCloseTo((frame[0].z + frame[1].z) / 2, 7);
      pointer(svg, "pointermove", x, z);
      expect(positions()).toEqual(frame);
    }
  });

  it.each([0, 1])("preserves the midpoint while dragging line %s and commits only on release", index => {
    const props = render(twoLines(50));
    const svg = container.querySelector("svg.sketch-plate")!;
    const z = index === 0 ? 0 : 10;
    pointer(container.querySelectorAll('[data-sketch-entity="segment"]')[index], "pointerdown", 0, z);
    pointer(svg, "pointermove", 5, z - 6);
    const frame = positions();
    expect(frame[2].x).toBeCloseTo((frame[0].x + frame[1].x) / 2, 7);
    expect(frame[2].z).toBeCloseTo((frame[0].z + frame[1].z) / 2, 7);
    expect(frame[index === 0 ? 0 : 2].z).toBeCloseTo(-6, 7);
    expect(props.onTransformPoints).not.toHaveBeenCalled();
    pointer(svg, "pointerup", 5, z - 6);
    expect(props.onTransformPoints).toHaveBeenCalledOnce();
    const moved = (props.onTransformPoints as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const movedById = new Map(moved.map((point: { id: string }) => [point.id, point]));
    const profile = twoLines(50);
    const result = applySketchConstraints({ ...profile, points: profile.points.map(point => movedById.get(point.id) ?? point) } as SketchProfile,
      new Set(movedById.keys() as Iterable<string>));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.points.map(({ x, z }) => ({ x, z }))).toEqual(frame);
      // Sketch undo/redo restores independent cloned profiles, without solving again.
      const before = cloneSketchProfile(profile), after = cloneSketchProfile(result.profile);
      render(cloneSketchProfile(before));
      expect(positions()).toEqual(profile.points.map(({ x, z }) => ({ x, z })));
      render(cloneSketchProfile(after));
      expect(positions()).toEqual(frame);
      expect(before.constraints).toEqual(after.constraints);
      expect(before.points).toEqual(profile.points);
    }
  });

});
