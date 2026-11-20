// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLanguage, translate } from "@/lib/i18n";
import { sketchPrimitiveGeometry } from "@/lib/sketchPrimitives";
import { SketchConstraintInspector } from "@/components/SketchConstraintInspector";
import type { SketchConstraint, SketchProfile } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("constraint inspector", () => {
  let container: HTMLDivElement;
  let root: Root;
  const profile: SketchProfile = {
    points: [{ id: "a", x: 0, z: 0 }, { id: "b", x: 8, z: 0 }],
    segments: [{ id: "edge", startId: "a", endId: "b" }],
  };
  const rule: SketchConstraint = { id: "dimension", kind: "distance", a: "a", b: "b", value: 8 };

  beforeEach(() => {
    localStorage.removeItem("layerling.sketch.constraintListHeight");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(overrides: Partial<Parameters<typeof SketchConstraintInspector>[0]> = {}) {
    const props = { rule, profile, onUpdate: vi.fn(() => true), onDelete: vi.fn(), onClose: vi.fn(), ...overrides };
    act(() => root.render(createElement(SketchConstraintInspector, props)));
    return props;
  }
  it("updates the open inspector when the interface language changes", async () => {
    render();
    try {
      await act(async () => { await setLanguage("de", false); });
      expect(container.querySelector('[role="dialog"]')?.getAttribute("aria-label"))
        .toBe(translate("de", "sketchUi.constraintInspector"));
      expect(container.textContent).toContain(translate("de", "inspector.properties"));
      expect(container.textContent).not.toContain("Properties");
    } finally {
      await act(async () => { await setLanguage("en", false); });
    }
  });

  function setValue(value: string) {
    const input = container.querySelector("input")!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  function submit() {
    act(() => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  }

  it.each(["midpoint", "point-on-line", "symmetry"] as const)("inspects and deletes %s without a dimension editor", (kind) => {
    const profile: SketchProfile = {
      points: [{id:"a",x:0,z:0},{id:"b",x:100,z:0},{id:"p",x:50,z:0},{id:"q",x:50,z:0}],
      segments: [{id:"axis",startId:"a",endId:"b"}],
    };
    const rule: SketchConstraint = kind === "symmetry" ? {id:"r",kind,a:"p",b:"q",axis:["a","b"]}
      : {id:"r",kind,a:"a",b:"b",c:"p"};
    const props = render({profile:{...profile,constraints:[rule]},rule});
    expect(container.querySelector("form")).toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('button[aria-controls]')!.click());
    expect(container.textContent).toContain(kind === "symmetry" ? "Axis: a → b" : "Reference line: a → b");
    if(kind === "point-on-line") expect(container.textContent).toContain("infinite supporting line");
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Delete constraint"]')!.click());
    expect(props.onDelete).toHaveBeenCalledWith("r");expect(profile.points).toHaveLength(4);
  });

  it("shows several Mirror equations as one selectable relationship per shape",()=>{
    const profile: SketchProfile = {
      points:[{id:"a",x:10,z:10},{id:"b",x:20,z:30},{id:"c",x:30,z:10},{id:"d",x:-10,z:10},{id:"e",x:-20,z:30},{id:"f",x:-30,z:10},{id:"u",x:0,z:0},{id:"v",x:0,z:50}],
      segments:[{id:"ab",startId:"a",endId:"b"},{id:"bc",startId:"b",endId:"c"},{id:"de",startId:"d",endId:"e"},{id:"ef",startId:"e",endId:"f"},{id:"axis",startId:"u",endId:"v"}],
      constraints:[{id:"first",kind:"symmetry",a:"a",b:"d",pair:["b","e"],axis:["u","v"],relationshipId:"mirror"},
        {id:"second",kind:"symmetry",a:"c",b:"f",axis:["u","v"],relationshipId:"mirror"}],
    };
    const props=render({profile,rule:profile.constraints![1]});
    const rows=container.querySelectorAll('.sketch-constraint-row');expect(rows).toHaveLength(3);
    expect(container.querySelector('.outliner-count-badge')?.textContent).toBe("1");
    expect(container.textContent).toContain("Linked symmetry · 3 point pairs");
    act(()=>container.querySelector<HTMLButtonElement>('button[aria-controls]')!.click());
    expect(container.textContent).toContain("Affects 5 edges and 8 points");
    expect([...rows].every(row=>row.getAttribute('aria-pressed')==="true")).toBe(true);
    act(()=>container.querySelector<HTMLButtonElement>('[aria-label="Delete constraint"]')!.click());
    expect(props.onDelete).toHaveBeenCalledWith("first");expect(props.onClose).toHaveBeenCalled();
  });

  it("shows affected geometry and updates the existing constraint by ID", () => {
    const props = render();
    act(() => container.querySelector<HTMLButtonElement>('button[aria-controls]')!.click());
    expect(container.textContent).toContain("Affects 1 edges and 2 points");
    expect(container.querySelector('[title="edge"]')).not.toBeNull();
    setValue("12.5");
    submit();
    expect(props.onUpdate).toHaveBeenCalledWith("dimension", 12.5);
  });

  it.each(["", "-2", "Infinity"])("keeps invalid dimension %s out of the sketch", (value) => {
    const props = render();
    setValue(value);
    submit();
    expect(props.onUpdate).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("keeps the inspector open and explains a rejected edit", () => {
    render({ onUpdate: vi.fn(() => false) });
    setValue("20");
    submit();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not apply");
  });

  it("deletes an individual constraint by ID", () => {
    const props = render();
    act(() => {
      container.querySelector<HTMLButtonElement>('[aria-label="Delete constraint"]')!.click();
    });
    expect(props.onDelete).toHaveBeenCalledWith("dimension");
    expect(props.onClose).toHaveBeenCalled();
    expect(profile.points).toHaveLength(2);
  });

  it.each([false, true])("adds an offset to a concentric constraint with reversed order %s", (reversed) => {
    let id = 0;
    const nextId = () => `circle-${++id}`;
    const inner = sketchPrimitiveGeometry("circle", { x: 0, z: 0 }, nextId, 10);
    const outer = sketchPrimitiveGeometry("circle", { x: 0, z: 0 }, nextId, 20);
    const circles: [string[], string[]] = [inner.points.map((p) => p.id), outer.points.map((p) => p.id)];
    if (reversed) circles.reverse();
    const props = render({
      profile: { points: [...inner.points, ...outer.points], segments: [...inner.segments, ...outer.segments] },
      rule: { id: "concentric", kind: "concentric", a: circles[0][0], b: circles[1][0], circles },
    });
    expect(container.querySelector("input")?.value).toBe("5");
    setValue("3");
    submit();
    expect(props.onUpdate).toHaveBeenCalledWith("concentric", reversed ? -3 : 3);
  });

  it("selects a constraint from the list styled like the Objects panel", () => {
    const other: SketchConstraint = { id: "horizontal", kind: "horizontal", a: "a", b: "b" };
    const onSelect = vi.fn();
    render({ profile: { ...profile, constraints: [rule, other] }, onSelect });
    const rows = container.querySelectorAll<HTMLButtonElement>(".sketch-constraint-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute("aria-pressed")).toBe("true");
    act(() => rows[1].click());
    expect(onSelect).toHaveBeenCalledWith("horizontal");
  });

  it("collapses the panel through its header and expands it again", () => {
    render();
    expect(container.querySelector(".shape-inspector")).not.toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Collapse constraints"]')!.click());
    expect(container.querySelector("form")).toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Expand constraints"]')!.click());
    expect(container.querySelector("form")).not.toBeNull();
  });

  it("collapses geometry without hiding the constraint properties", () => {
    render();
    const toggle = container.querySelector<HTMLButtonElement>('button[aria-controls]')!;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".sketch-constraint-geometry")).toBeNull();
    expect(container.querySelector("form")).not.toBeNull();
    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".sketch-constraint-geometry")).not.toBeNull();
    act(() => toggle.click());
    expect(container.querySelector(".sketch-constraint-geometry")).toBeNull();
  });

  it("deletes another constraint from its row and keeps the current inspector open", () => {
    const other: SketchConstraint = { id: "horizontal", kind: "horizontal", a: "a", b: "b" };
    const props = render({ profile: { ...profile, constraints: [rule, other] } });
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Delete Horizontal constraint"]')!.click());
    expect(props.onDelete).toHaveBeenCalledWith("horizontal");
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("selects the next constraint after deleting the inspected row", () => {
    const other: SketchConstraint = { id: "horizontal", kind: "horizontal", a: "a", b: "b" };
    const onSelect = vi.fn();
    const props = render({ profile: { ...profile, constraints: [rule, other] }, onSelect });
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Delete Distance constraint"]')!.click());
    expect(props.onDelete).toHaveBeenCalledWith("dimension");
    expect(onSelect).toHaveBeenCalledWith("horizontal");
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("renders collapsible groups for constraints on separate shapes", () => {
    const other: SketchConstraint = { id: "other", kind: "horizontal", a: "c", b: "d" };
    render({ profile: {
      points: [...profile.points, { id: "c", x: 20, z: 0 }, { id: "d", x: 30, z: 0 }],
      segments: [...profile.segments, { id: "other-edge", startId: "c", endId: "d" }],
      constraints: [rule, other],
    } });
    const groups = container.querySelectorAll("details");
    expect(groups).toHaveLength(2);
    expect(groups[0].querySelector("summary")?.textContent).toContain("Shape 1");
    expect(groups[1].querySelector("summary")?.textContent).toContain("Shape 2");
    expect(groups[0].querySelector('[aria-label="Delete Distance constraint"]')).not.toBeNull();
    expect(groups[1].querySelector('[aria-label="Delete Horizontal constraint"]')).not.toBeNull();
    act(() => groups[0].querySelector("summary")!.click());
    expect(groups[0].open).toBe(false);
    expect(groups[1].open).toBe(false);
  });

  it("renames a shape inline and trims its name on Enter", () => {
    const onRenameShape = vi.fn();
    render({ onRenameShape });
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Rename Shape 1"]')!.click());
    const input = container.querySelector<HTMLInputElement>('[aria-label="Shape name"]')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "  Mounting plate  ");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(onRenameShape).toHaveBeenCalledWith(["a", "b"], "Mounting plate");
    expect(container.querySelector('[aria-label="Shape name"]')).toBeNull();
  });

  it("cancels inline renaming on Escape without closing the inspector", () => {
    const onRenameShape = vi.fn();
    const props = render({ onRenameShape });
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Rename Shape 1"]')!.click());
    act(() => container.querySelector<HTMLInputElement>('[aria-label="Shape name"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onRenameShape).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("selects the complete shape for geometry editing", () => {
    const onSelectShape = vi.fn();
    render({ onSelectShape });
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Select Shape 1"]')!.click());
    expect(onSelectShape).toHaveBeenCalledWith(["a", "b"], ["edge"]);
  });

  it("lists each shape once and labels the other end of a shared constraint", () => {
    const relation: SketchConstraint = { id: "parallel", kind: "parallel", a: "a", b: "b", c: "c", d: "d" };
    render({ onRenameShape: vi.fn(), profile: {
      points: [...profile.points, { id: "c", x: 20, z: 0 }, { id: "d", x: 30, z: 0 }],
      segments: [...profile.segments, { id: "other-edge", startId: "c", endId: "d" }],
      constraints: [rule, relation],
    } });
    const buttons = container.querySelectorAll<HTMLButtonElement>('[aria-label="Rename Shape 1"]');
    expect(buttons).toHaveLength(1);
    expect(container.querySelectorAll("details")).toHaveLength(2);
    expect(container.textContent).toContain("with Shape 2");
    expect(container.textContent).toContain("with Shape 1");
    act(() => buttons[0].click());
    expect(container.querySelectorAll('[aria-label="Shape name"]')).toHaveLength(1);
  });

  it("retains a shape group when it has no constraints", () => {
    render({ profile: {
      points: [...profile.points, { id: "c", x: 20, z: 0 }, { id: "d", x: 30, z: 0 }],
      segments: [...profile.segments, { id: "other-edge", startId: "c", endId: "d" }],
      constraints: [rule],
    } });
    expect(container.querySelectorAll("details")).toHaveLength(2);
    expect(container.textContent).toContain("No constraints");
  });

  it("resizes the constraint list with the keyboard and remembers the height", () => {
    render();
    const separator = container.querySelector<HTMLElement>('[aria-label="Resize constraint list"]')!;
    expect(container.querySelector<HTMLElement>(".sketch-constraint-list")!.style.height).toBe("220px");
    act(() => separator.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(container.querySelector<HTMLElement>(".sketch-constraint-list")!.style.height).toBe("240px");
    expect(localStorage.getItem("layerling.sketch.constraintListHeight")).toBe("240");
    expect(separator.getAttribute("aria-valuenow")).toBe("240");
  });

  it("restores the resized list height and enforces a usable minimum", () => {
    localStorage.setItem("layerling.sketch.constraintListHeight", "80");
    render();
    const separator = container.querySelector<HTMLElement>('[aria-label="Resize constraint list"]')!;
    expect(container.querySelector<HTMLElement>(".sketch-constraint-list")!.style.height).toBe("80px");
    act(() => separator.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })));
    expect(container.querySelector<HTMLElement>(".sketch-constraint-list")!.style.height).toBe("80px");
  });

  it("drags the list's bottom edge and stops resizing when released", () => {
    render();
    const separator = container.querySelector<HTMLElement>('[aria-label="Resize constraint list"]')!;
    const pointer = (type: string, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientY: y });
      Object.defineProperty(event, "pointerId", { value: 7 });
      act(() => separator.dispatchEvent(event));
    };
    pointer("pointerdown", 100);
    pointer("pointermove", 240);
    expect(container.querySelector<HTMLElement>(".sketch-constraint-list")!.style.height).toBe("360px");
    pointer("pointerup", 240);
    pointer("pointermove", 300);
    expect(container.querySelector<HTMLElement>(".sketch-constraint-list")!.style.height).toBe("360px");
  });

  it("opens only groups related to the inspected constraint", () => {
    const other: SketchConstraint = { id: "other", kind: "horizontal", a: "c", b: "d" };
    const relation: SketchConstraint = { id: "parallel", kind: "parallel", a: "a", b: "b", c: "c", d: "d" };
    const sketch: SketchProfile = {
      points: [...profile.points, { id: "c", x: 20, z: 0 }, { id: "d", x: 30, z: 0 }, { id: "e", x: 50, z: 0 }],
      segments: [...profile.segments, { id: "other-edge", startId: "c", endId: "d" }],
      constraints: [rule, other, relation],
    };
    render({ profile: sketch });
    expect([...container.querySelectorAll("details")].map((group) => group.open)).toEqual([true, false, false]);
    render({ profile: sketch, rule: other });
    expect([...container.querySelectorAll("details")].map((group) => group.open)).toEqual([false, true, false]);
    render({ profile: sketch, rule: relation });
    expect([...container.querySelectorAll("details")].map((group) => group.open)).toEqual([true, true, false]);
  });

  it("opens the affected shape for a rejected constraint without allowing mutation", () => {
    const attempted: SketchConstraint = { id: "attempt", kind: "offset-x", a: "a", b: "b", value: 20 };
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    render({ profile: { ...profile, constraints: [rule, attempted] },
      rule: attempted, rejectedConstraintId: attempted.id, onUpdate, onDelete });
    expect(container.querySelector("details")!.open).toBe(true);
    expect(container.textContent).toContain("rejected attempt");
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Delete Offset x constraint"]')!.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Delete constraint"]')!.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('[aria-label="Constraint value"]')!.readOnly).toBe(true);
    submit();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("toggles constraint annotation visibility from the header", () => {
    const onToggleAnnotations = vi.fn();
    render({ onToggleAnnotations });
    const hide = container.querySelector<HTMLButtonElement>('[aria-label="Hide constraint annotations"]')!;
    expect(hide.getAttribute("aria-pressed")).toBe("true");
    act(() => hide.click());
    expect(onToggleAnnotations).toHaveBeenCalledOnce();
    render({ onToggleAnnotations, annotationsVisible: false });
    expect(container.querySelector('[aria-label="Show constraint annotations"]')?.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelector("form")).not.toBeNull();
  });

  it("edits an existing radial gap", () => {
    const props = render({ rule: { id: "ring", kind: "concentric", a: "a", b: "b", circles: [["a"], ["b"]], radialGap: 3 } });
    expect(container.textContent).toContain("Radial offset");
    setValue("4");
    submit();
    expect(props.onUpdate).toHaveBeenCalledWith("ring", 4);
  });
});
