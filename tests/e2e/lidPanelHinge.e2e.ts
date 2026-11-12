// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { LidPanel } from "@/components/workplane/LidPanel";
import { LID_DEFAULTS, type LidOptions } from "@/lib/lidTool";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

/** The lid's panel with these settings; what it hands on comes back in `changes`. */
function mount(settings: Partial<LidOptions> = {}) {
  const changes: Partial<LidOptions>[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(LidPanel, {
      targetName: "Box",
      settings: { ...LID_DEFAULTS, ...settings },
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      busy: false,
      error: null,
      onChange: (patch: Partial<LidOptions>) => changes.push(patch),
      onApply: () => {},
      onCancel: () => {},
    }));
  });
  return { panel: container, changes };
}

const checkbox = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label")]
  .find((label) => label.textContent?.trim() === name)
  ?.querySelector<HTMLInputElement>("input[type=checkbox]") ?? null;
const texts = (panel: HTMLElement) => panel.textContent ?? "";
const slider = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")]
  .find((row) => row.querySelector(".range-property-name")?.textContent === name)
  ?.querySelector<HTMLInputElement>("input[type=range]") ?? null;

describe("the lid's panel with a hinge", () => {
  it("offers a hinge and asks for its side, pin, clearance, pin play, knuckles and a printed pin once it is on", () => {
    const off = mount();
    const hinge = checkbox(off.panel, "Hinge")!;
    expect(hinge).not.toBeNull();
    expect(hinge.checked).toBe(false);
    expect(texts(off.panel)).not.toContain("Pin diameter");
    act(() => hinge.click());
    expect(off.changes.at(-1)).toEqual({ hinge: true });
    act(() => root?.unmount());
    const on = mount({ hinge: true });
    for (const label of ["Hinge side", "Pin diameter", "Hinge clearance", "Pin play (per side)", "Knuckles (0 = automatic)"]) expect(texts(on.panel)).toContain(label);
    // The play is the lid's: in the body's knuckles the pin sits tight (#1220).
    expect(texts(on.panel)).toContain("Only the lid's holes have this play, so the lid turns freely; in the body's holes the pin sits tight");
    expect(checkbox(on.panel, "Print the pin too")).not.toBeNull();
    // Teardrop holes are on to start with, and can be turned off.
    const teardrop = checkbox(on.panel, "Teardrop pin holes (no droop when printed)")!;
    expect(teardrop.checked).toBe(true);
    act(() => teardrop.click());
    expect(on.changes.at(-1)).toEqual({ hingeTeardrop: false });
    // The knuckles' size for a 1.75 mm pin: its hole with 0.15 mm play and a 1.6 mm wall round it.
    // 1.75 mm pin, 0.2 mm of play and a 1.6 mm wall round it: 5.35 mm across.
    expect(texts(on.panel)).toContain("Knuckles 5.4 mm");
  });

  it("puts the hinge at the back unless another side is picked", () => {
    const { panel, changes } = mount({ hinge: true });
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Hinge side"]')!;
    expect(group).not.toBeNull();
    const sides = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(sides.map((button) => button.textContent)).toEqual(["Back", "Right", "Front", "Left"]);
    expect(sides.filter((button) => button.getAttribute("aria-checked") === "true").map((button) => button.textContent)).toEqual(["Back"]);
    act(() => sides[1].click());
    expect(changes.at(-1)).toEqual({ hingeSide: "right" });
    act(() => root?.unmount());
    const left = mount({ hinge: true, hingeSide: "left" });
    expect(left.panel.querySelector('[aria-label="Hinge side"] [role="radio"][aria-checked="true"]')?.textContent).toBe("Left");
  });

  it("offers the hinge outside, flush in the wall or as pivot pins, and hides the knuckle count for pivot pins", () => {
    const { panel, changes } = mount({ hinge: true });
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Hinge type"]')!;
    expect(group).not.toBeNull();
    const styles = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(styles.map((button) => button.textContent)).toEqual(["Outside", "Flush", "Pivot pins"]);
    expect(group.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toBe("Outside");
    expect(texts(panel)).toContain("the lid opens all the way");
    act(() => styles[1].click());
    expect(changes.at(-1)).toEqual({ hingeStyle: "flush" });
    act(() => root?.unmount());
    const flush = mount({ hinge: true, hingeStyle: "flush" });
    expect(texts(flush.panel)).toContain("the box keeps its size");
    expect(texts(flush.panel)).toContain("Knuckles (0 = automatic)");
    act(() => root?.unmount());
    const pivot = mount({ hinge: true, hingeStyle: "pivot" });
    expect(texts(pivot.panel)).toContain("turns on two pins through the side walls");
    expect(texts(pivot.panel)).not.toContain("Knuckles (0 = automatic)");
  });

  it("offers end plugs with a flush hinge only, off to begin with, and says what they do once on (Discussion #1387)", () => {
    for (const hingeStyle of ["outside", "pivot"] as const) {
      const other = mount({ hinge: true, hingeStyle, hingeEndPlugs: true });
      expect(checkbox(other.panel, "End plugs"), hingeStyle).toBeNull();
      expect(texts(other.panel)).not.toContain("so the pin stays hidden and cannot slide out");
      act(() => root?.unmount());
    }
    const off = mount({ hinge: true, hingeStyle: "flush" });
    const plugs = checkbox(off.panel, "End plugs")!;
    expect(plugs).not.toBeNull();
    expect(plugs.checked).toBe(false);
    expect(texts(off.panel)).not.toContain("so the pin stays hidden and cannot slide out");
    act(() => plugs.click());
    expect(off.changes.at(-1)).toEqual({ hingeEndPlugs: true });
    act(() => root?.unmount());
    const on = mount({ hinge: true, hingeStyle: "flush", hingeEndPlugs: true });
    expect(checkbox(on.panel, "End plugs")!.checked).toBe(true);
    expect(texts(on.panel)).toContain("A square plug closes each end of the pin's hole, flush with the outside of the box, so the pin stays hidden and cannot slide out. Push the pin in first, then press in the plugs.");
    act(() => checkbox(on.panel, "End plugs")!.click());
    expect(on.changes.at(-1)).toEqual({ hingeEndPlugs: false });
  });

  it("goes with a lid that pushes in or a flat one, and says so for one with a rim round the outside", () => {
    const cap = mount({ type: "cap", hinge: true });
    const hinge = checkbox(cap.panel, "Hinge")!;
    expect(hinge.disabled).toBe(true);
    expect(hinge.checked).toBe(false);
    expect(texts(cap.panel)).toContain("A hinge goes with a lid that pushes in or a flat one.");
    expect(texts(cap.panel)).not.toContain("Pin diameter");
    act(() => root?.unmount());
    const flat = mount({ type: "flat", hinge: true });
    expect(checkbox(flat.panel, "Hinge")!.disabled).toBe(false);
    expect(texts(flat.panel)).toContain("Pin diameter");
  });
});

describe("the lid's panel with click bumps and a handle (#1234, #1230)", () => {
  it("offers click bumps, off to begin with, says what they do once on, and not for a flat lid or pivot pins", () => {
    const off = mount();
    const bumps = checkbox(off.panel, "Click bumps")!;
    expect(bumps).not.toBeNull();
    expect(bumps.checked).toBe(false);
    expect(bumps.disabled).toBe(false);
    expect(texts(off.panel)).not.toContain("snap into dimples in the body");
    act(() => bumps.click());
    expect(off.changes.at(-1)).toEqual({ clickBumps: true });
    act(() => root?.unmount());
    const on = mount({ clickBumps: true, type: "cap" });
    expect(checkbox(on.panel, "Click bumps")!.checked).toBe(true);
    expect(texts(on.panel)).toContain("snap into dimples in the body");
    act(() => root?.unmount());
    for (const settings of [{ type: "flat" as const }, { hinge: true, hingeStyle: "pivot" as const }]) {
      const refused = mount({ ...settings, clickBumps: true });
      const box = checkbox(refused.panel, "Click bumps")!;
      expect(box.disabled).toBe(true);
      expect(box.checked).toBe(false);
      expect(texts(refused.panel)).toContain("Not for a flat lid or pivot pins.");
      act(() => root?.unmount());
    }
  });

  it("asks how far the bumps reach into the wall only while they are on, 0.4 mm to begin with (#1220)", () => {
    const off = mount();
    expect(slider(off.panel, "Bump height")).toBeNull();
    expect(texts(off.panel)).not.toContain("Less for a small box or a stiff lip");
    act(() => root?.unmount());
    const on = mount({ clickBumps: true });
    const height = slider(on.panel, "Bump height")!;
    expect(height).not.toBeNull();
    expect(Number(height.value)).toBeCloseTo(0.4, 9);
    expect([Number(height.min), Number(height.max), Number(height.step)]).toEqual([0.2, 0.8, 0.05]);
    expect(texts(on.panel)).toContain("How far each bump reaches into the body's wall. Less for a small box or a stiff lip, more for a firmer click.");
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(height, "0.25");
      height.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(Object.keys(on.changes.at(-1)!)).toEqual(["clickBumpHeight"]);
    expect(on.changes.at(-1)!.clickBumpHeight).toBeCloseTo(0.25, 9);
    act(() => root?.unmount());
    // Not where the bumps are refused, though they are asked for.
    const flat = mount({ type: "flat", clickBumps: true });
    expect(slider(flat.panel, "Bump height")).toBeNull();
  });

  it("offers no handle, a pull tab or a finger notch, and none for a pivot lid", () => {
    const { panel, changes } = mount();
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Handle"]')!;
    expect(group).not.toBeNull();
    const options = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(options.map((button) => button.textContent)).toEqual(["None", "Pull tab", "Finger notch"]);
    expect(group.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toBe("None");
    act(() => options[1].click());
    expect(changes.at(-1)).toEqual({ handle: "tab" });
    act(() => root?.unmount());
    const tab = mount({ handle: "tab" });
    expect(texts(tab.panel)).toContain("6 mm out from its front edge");
    act(() => root?.unmount());
    const notch = mount({ handle: "notch" });
    expect(notch.panel.querySelector('[role="radiogroup"][aria-label="Handle"] [aria-checked="true"]')?.textContent).toBe("Finger notch");
    expect(texts(notch.panel)).toContain("for a finger to lift it");
    act(() => root?.unmount());
    const pivot = mount({ hinge: true, hingeStyle: "pivot", handle: "tab" });
    const pivotGroup = pivot.panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Handle"]')!;
    expect(pivotGroup.querySelector('[aria-checked="true"]')?.textContent).toBe("None");
    expect([...pivotGroup.querySelectorAll<HTMLButtonElement>('[role="radio"]')].map((button) => button.disabled)).toEqual([false, true, true]);
    expect(texts(pivot.panel)).toContain("A pivot lid lies in the opening");
  });
});

describe("the lid's panel with a screw lid (Discussion #1393)", () => {
  it("offers a screw lid as a fifth kind, the push-in lid still the one to begin with", () => {
    const { panel, changes } = mount();
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Kind"]')!;
    const kinds = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(kinds.map((button) => button.textContent)).toEqual(["Push in", "Over the top", "Both sides", "Flat", "Screw on", "Screw in", "Bayonet", "Slide-in"]);
    expect(group.querySelector('[aria-checked="true"]')?.textContent).toBe("Push in");
    act(() => kinds[4].click());
    expect(changes.at(-1)).toEqual({ type: "screw" });
  });

  it("asks for the thread's pitch and turns instead of a depth, keeps the gap and the rim's wall, and says how deep and long the thread is", () => {
    const { panel, changes } = mount({ type: "screw" });
    expect(slider(panel, "Thread pitch")!.value).toBe("3");
    expect(slider(panel, "Turns")!.value).toBe("2");
    expect(slider(panel, "Gap per side")).not.toBeNull();
    expect(slider(panel, "Rim wall")).not.toBeNull();
    expect(slider(panel, "Lip depth")).toBeNull();
    expect(slider(panel, "Rim depth")).toBeNull();
    // 3 mm pitch: 0.9 mm deep; two turns: 6 mm of rim.
    expect(texts(panel)).toContain("The body gets a thread 0.9 mm deep on the outside of its top, the cap the same one inside its rim, which reaches 6 mm down.");
    const pitch = slider(panel, "Thread pitch")!;
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setValue.call(pitch, "4.5");
      pitch.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(changes.at(-1)).toEqual({ threadPitch: 4.5 });
    act(() => root?.unmount());
    // A coarse pitch: 1.5 mm deep at most.
    const coarse = mount({ type: "screw", threadPitch: 6, threadTurns: 1.5 });
    expect(texts(coarse.panel)).toContain("a thread 1.5 mm deep");
    expect(texts(coarse.panel)).toContain("which reaches 9 mm down");
  });

  it("switches off magnets, hinge, click bumps and handle and says once why", () => {
    const { panel } = mount({ type: "screw", magnets: true, hinge: true, clickBumps: true, handle: "tab" });
    for (const name of ["Magnets in the corners", "Hinge", "Click bumps"]) {
      const box = checkbox(panel, name)!;
      expect(box.checked, name).toBe(false);
      expect(box.disabled, name).toBe(true);
    }
    const handles = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Handle"]')!;
    expect(handles.querySelector('[aria-checked="true"]')?.textContent).toBe("None");
    expect([...handles.querySelectorAll<HTMLButtonElement>('[role="radio"]')].map((button) => button.disabled)).toEqual([false, true, true]);
    expect(texts(panel).split("A screw lid holds by its thread: magnets, a hinge, click bumps and a handle do not go with it.").length).toBe(2);
    // Their own hints, which name other kinds of lid, stay away.
    expect(texts(panel)).not.toContain("A hinge goes with a lid that pushes in or a flat one.");
    expect(texts(panel)).not.toContain("Not for a flat lid or pivot pins.");
    expect(texts(panel)).not.toContain("A pivot lid lies in the opening");
    expect(texts(panel)).not.toContain("Magnet diameter");
  });
});

describe("the lid's panel with a bayonet lid (Discussion #1424)", () => {
  /** Types `value` into the slider named `name`, as a person drags it. */
  const drag = (panel: HTMLElement, name: string, value: string) => {
    const input = slider(panel, name)!;
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setValue.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  it("offers a bayonet lid as a sixth kind, the push-in lid still the one to begin with", () => {
    const { panel, changes } = mount();
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Kind"]')!;
    const kinds = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(kinds[6].textContent).toBe("Bayonet");
    expect(kinds[6].title).toContain("turned to lock");
    expect(group.querySelector('[aria-checked="true"]')?.textContent).toBe("Push in");
    act(() => kinds[6].click());
    expect(changes.at(-1)).toEqual({ type: "bayonet" });
  });

  it("asks for the lugs, how far the cap reaches down, the room above the ledge and the detent, keeps the gap and the rim's wall, and says how far to turn", () => {
    const { panel, changes } = mount({ type: "bayonet" });
    expect(slider(panel, "Lugs")!.value).toBe("3");
    expect(slider(panel, "Rim depth")!.value).toBe("8");
    expect(slider(panel, "Gap in height")!.value).toBe("0.3");
    expect(slider(panel, "Detent height")!.value).toBe("0.3");
    expect(slider(panel, "Gap per side")).not.toBeNull();
    expect(slider(panel, "Rim wall")).not.toBeNull();
    expect(slider(panel, "Lip depth")).toBeNull();
    expect(slider(panel, "Thread pitch")).toBeNull();
    // Three lugs: a turn of 40 degrees.
    expect(texts(panel)).toContain("3 lugs on the outside of the body's top, sized from its diameter, and an L-shaped slot for each inside the cap's rim. Push the cap down over them and turn it 40° clockwise until it clicks.");
    expect(texts(panel)).toContain("A small rib behind each locked lug");
    drag(panel, "Rim depth", "12");
    expect(changes.at(-1)).toEqual({ bayonetDepth: 12 });
    drag(panel, "Gap in height", "0.4");
    expect(changes.at(-1)).toEqual({ bayonetAxialGap: 0.4 });
    drag(panel, "Detent height", "0");
    expect(changes.at(-1)).toEqual({ bayonetDetent: 0 });
    drag(panel, "Lugs", "4");
    expect(changes.at(-1)).toEqual({ bayonetLugs: 4 });
    act(() => root?.unmount());
    // Four lugs turn 30 degrees, two 45.
    expect(texts(mount({ type: "bayonet", bayonetLugs: 4 }).panel)).toContain("turn it 30° clockwise");
    act(() => root?.unmount());
    expect(texts(mount({ type: "bayonet", bayonetLugs: 2 }).panel)).toContain("2 lugs on the outside");
    expect(texts(mount({ type: "bayonet", bayonetLugs: 2 }).panel)).toContain("turn it 45° clockwise");
  });

  it("asks how far the cap turns, 0 for the lugs' own turn, up to a quarter turn, and says that a turn that does not fit is held to what fits", () => {
    const { panel, changes } = mount({ type: "bayonet" });
    const turn = slider(panel, "Turn (0 = automatic)")!;
    expect(turn.value).toBe("0");
    expect([turn.min, turn.max, turn.step]).toEqual(["0", "90", "5"]);
    expect(texts(panel)).toContain("turn it 40° clockwise");
    expect(texts(panel)).not.toContain("a quarter turn");
    drag(panel, "Turn (0 = automatic)", "90");
    expect(changes.at(-1)).toEqual({ bayonetTurn: 90 });
    // A turn set by hand is 15 degrees at least.
    drag(panel, "Turn (0 = automatic)", "5");
    expect(changes.at(-1)).toEqual({ bayonetTurn: 15 });
    act(() => root?.unmount());
    const quarter = mount({ type: "bayonet", bayonetLugs: 2, bayonetTurn: 90 });
    expect(slider(quarter.panel, "Turn (0 = automatic)")!.value).toBe("90");
    expect(texts(quarter.panel)).toContain("2 lugs on the outside");
    expect(texts(quarter.panel)).toContain("turn it 90° clockwise");
    expect(texts(quarter.panel)).toContain("Up to 90°, a quarter turn, which two lugs leave room for. More lugs or a small body leave less room for the slots and the stops between them: a turn that does not fit is then held to what fits, and the status bar says so.");
    // Back at 0 it is the lugs' own again.
    drag(quarter.panel, "Turn (0 = automatic)", "0");
    expect(quarter.changes.at(-1)).toEqual({ bayonetTurn: 0 });
  });

  it("switches off magnets, hinge, click bumps and handle and says once why", () => {
    const { panel } = mount({ type: "bayonet", magnets: true, hinge: true, clickBumps: true, handle: "notch" });
    for (const name of ["Magnets in the corners", "Hinge", "Click bumps"]) {
      const box = checkbox(panel, name)!;
      expect(box.checked, name).toBe(false);
      expect(box.disabled, name).toBe(true);
    }
    const handles = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Handle"]')!;
    expect(handles.querySelector('[aria-checked="true"]')?.textContent).toBe("None");
    expect(texts(panel).split("A bayonet lid holds by its lugs: magnets, a hinge, click bumps and a handle do not go with it.").length).toBe(2);
    expect(texts(panel)).not.toContain("A screw lid holds by its thread");
    expect(texts(panel)).not.toContain("A hinge goes with a lid that pushes in or a flat one.");
    expect(texts(panel)).not.toContain("Magnet diameter");
  });
});

describe("the lid's panel with a standard bottle's or jar's thread", () => {
  const thread = (panel: HTMLElement) => panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Thread"]');

  it("offers a screw lid its own thread or a standard's, its own to begin with", () => {
    const { panel, changes } = mount({ type: "screw" });
    const group = thread(panel)!;
    expect(group).not.toBeNull();
    const options = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(options.map((button) => button.textContent)).toEqual(["Custom", "PCO 1881", "PCO 1810", "GL 45", "Mason 70", "Mason 86"]);
    expect(group.querySelector('[aria-checked="true"]')?.textContent).toBe("Custom");
    expect(options[3].title).toBe("Laboratory bottles with the GL 45 thread (DIN 168).");
    expect(slider(panel, "Thread pitch")).not.toBeNull();
    expect(slider(panel, "Turns")).not.toBeNull();
    act(() => options[1].click());
    expect(changes.at(-1)).toEqual({ threadStandard: "pco1881" });
    act(() => root?.unmount());
    // Only a screw lid has a thread to choose.
    for (const type of ["plug", "cap", "bayonet"] as const) {
      expect(thread(mount({ type, threadStandard: "gl45" }).panel), type).toBeNull();
      act(() => root?.unmount());
    }
  });

  it("hides pitch and turns with a standard and says what it is, what the cap fits and which body gets the neck's thread", () => {
    const { panel } = mount({ type: "screw", threadStandard: "pco1881" });
    expect(thread(panel)!.querySelector('[aria-checked="true"]')?.textContent).toBe("PCO 1881");
    expect(slider(panel, "Thread pitch")).toBeNull();
    expect(slider(panel, "Turns")).toBeNull();
    expect(slider(panel, "Gap per side")).not.toBeNull();
    expect(slider(panel, "Rim wall")).not.toBeNull();
    expect(texts(panel)).toContain("Most water and soft-drink bottles: the 28 mm neck with the short thread.");
    expect(texts(panel)).toContain("The cap fits a PCO 1881 neck: 27.4 mm across its thread, 2.7 mm a turn; it reaches 10 mm down. A body whose top is as wide as the neck under the thread (23.94 to 25.14 mm) gets the neck's thread; any other stays as it is, and only the cap is made.");
    // The own thread's line about its depth stays away.
    expect(texts(panel)).not.toContain("The flanks are at 45°");
    act(() => root?.unmount());
    const jar = mount({ type: "screw", threadStandard: "mason86" }).panel;
    expect(texts(jar)).toContain("Mason jars with a wide mouth.");
    expect(texts(jar)).toContain("try the cap on your jar first");
    expect(texts(jar)).toContain("85.85 mm across its thread, 6.35 mm a turn; it reaches 13 mm down");
    expect(texts(jar)).toContain("(81.25 to 82.45 mm)");
  });
});

describe("the lid's panel with a tether (asked in the Layerling User Group on Facebook)", () => {
  it("offers a tether for a screw or bayonet lid only, and says what it is and what to print it in once ticked", () => {
    for (const type of ["plug", "cap", "both", "flat"] as const) {
      const { panel } = mount({ type, tether: true });
      expect(checkbox(panel, "Tether"), type).toBeNull();
      expect(texts(panel), type).not.toContain("Keeps the cap with the body");
      act(() => root?.unmount());
    }
    for (const type of ["screw", "bayonet"] as const) {
      const off = mount({ type });
      const box = checkbox(off.panel, "Tether")!;
      expect(box, type).not.toBeNull();
      expect(box.checked).toBe(false);
      expect(texts(off.panel)).not.toContain("Keeps the cap with the body");
      act(() => box.click());
      expect(off.changes.at(-1)).toEqual({ tether: true });
      act(() => root?.unmount());
      const on = mount({ type, tether: true });
      expect(checkbox(on.panel, "Tether")!.checked).toBe(true);
      expect(texts(on.panel)).toContain("Keeps the cap with the body when it is open, as on a drinks bottle");
      expect(texts(on.panel)).toContain("best in PETG or TPU");
      act(() => checkbox(on.panel, "Tether")!.click());
      expect(on.changes.at(-1)).toEqual({ tether: false });
      act(() => root?.unmount());
    }
  });
});

describe("the lid's panel with a flip-top", () => {
  it("offers a flip-top with a screw lid and a bayonet lid only, off to begin with", () => {
    for (const type of ["plug", "cap", "both", "flat"] as const) {
      expect(checkbox(mount({ type }).panel, "Flip-top"), type).toBeNull();
      act(() => root?.unmount());
    }
    for (const type of ["screw", "bayonet"] as const) {
      const { panel, changes } = mount({ type });
      const flipTop = checkbox(panel, "Flip-top")!;
      expect(flipTop.checked, type).toBe(false);
      expect(slider(panel, "Opening"), type).toBeNull();
      act(() => flipTop.click());
      expect(changes.at(-1)).toEqual({ flipTop: true });
      act(() => root?.unmount());
    }
  });

  it("asks for the opening once it is on, 8 mm to begin with, says what it is and what to print it in", () => {
    const { panel, changes } = mount({ type: "screw", flipTop: true });
    expect(checkbox(panel, "Flip-top")!.checked).toBe(true);
    const opening = slider(panel, "Opening")!;
    expect(opening.value).toBe("8");
    expect([opening.min, opening.max]).toEqual(["4", "40"]);
    expect(texts(panel)).toContain("A thin strip at the flap's back is its hinge, so the cap stays on and the flap never comes off.");
    expect(texts(panel)).toContain("in PLA the strip breaks after a few bends");
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setValue.call(opening, "12");
      opening.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(changes.at(-1)).toEqual({ flipTopOpening: 12 });
    // The plate is thick enough to begin with; thinner than flap and hinge need, it says how thick.
    expect(texts(panel)).not.toContain("too thin for a flip-top");
    act(() => root?.unmount());
    expect(texts(mount({ type: "bayonet", flipTop: true, thickness: 1.4 }).panel)).toContain("The lid is too thin for a flip-top's flap and hinge: make it at least 1.8 mm thick.");
  });
});

describe("the lid's panel with a screw-in lid (Discussion #1432)", () => {
  it("offers a screw-in lid beside the screw lid, the push-in lid still the one to begin with", () => {
    const { panel, changes } = mount();
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Kind"]')!;
    const kinds = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(kinds[5].textContent).toBe("Screw in");
    expect(kinds[5].title).toContain("threaded plug below it that screws into the same thread inside the body's opening");
    expect(group.querySelector('[aria-checked="true"]')?.textContent).toBe("Push in");
    act(() => kinds[5].click());
    expect(changes.at(-1)).toEqual({ type: "screwIn" });
  });

  it("asks for the screw lid's pitch and turns and the plug's wall, keeps the gap, and says how deep and long the thread is and how thick the plug's wall", () => {
    const { panel, changes } = mount({ type: "screwIn" });
    expect(slider(panel, "Thread pitch")!.value).toBe("3");
    expect(slider(panel, "Turns")!.value).toBe("2");
    expect(slider(panel, "Gap per side")).not.toBeNull();
    expect(slider(panel, "Plug wall")!.value).toBe("1.6");
    expect(slider(panel, "Rim wall")).toBeNull();
    expect(slider(panel, "Lip wall")).toBeNull();
    expect(slider(panel, "Lip depth")).toBeNull();
    expect(slider(panel, "Rim depth")).toBeNull();
    // 3 mm pitch: 0.9 mm deep; two turns: 6 mm of plug.
    expect(texts(panel)).toContain("The body gets a thread 0.9 mm deep inside its opening, the lid the same one on a plug below its plate, which reaches 6 mm down. Where there is room, the plug is a ring with a 1.6 mm wall.");
    expect(texts(panel)).toContain("A plate on the rim with a threaded plug below it");
    expect(texts(panel)).not.toContain("on the outside of its top");
    const turns = slider(panel, "Turns")!;
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setValue.call(turns, "3");
      turns.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(changes.at(-1)).toEqual({ threadTurns: 3 });
    act(() => root?.unmount());
    // A coarse pitch, and a wall thinner than the plug keeps: 0.8 mm at least.
    const coarse = mount({ type: "screwIn", threadPitch: 6, threadTurns: 1.5, wall: 0.4 });
    expect(texts(coarse.panel)).toContain("a thread 1.5 mm deep inside its opening");
    expect(texts(coarse.panel)).toContain("which reaches 9 mm down");
    expect(texts(coarse.panel)).toContain("a ring with a 0.8 mm wall");
  });

  it("switches off magnets, hinge, click bumps and handle and says once why, as for a screw lid", () => {
    const { panel } = mount({ type: "screwIn", magnets: true, hinge: true, clickBumps: true, handle: "notch" });
    for (const name of ["Magnets in the corners", "Hinge", "Click bumps"]) {
      const box = checkbox(panel, name)!;
      expect(box.checked, name).toBe(false);
      expect(box.disabled, name).toBe(true);
    }
    const handles = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Handle"]')!;
    expect(handles.querySelector('[aria-checked="true"]')?.textContent).toBe("None");
    expect(texts(panel).split("A screw lid holds by its thread: magnets, a hinge, click bumps and a handle do not go with it.").length).toBe(2);
    expect(texts(panel)).not.toContain("A hinge goes with a lid that pushes in or a flat one.");
    expect(texts(panel)).not.toContain("Magnet diameter");
  });
});

describe("the lid's panel with a slide-in lid (Discussion #1443)", () => {
  it("offers a slide-in lid as the last kind, the push-in lid still the one to begin with", () => {
    const { panel, changes } = mount();
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Kind"]')!;
    const kinds = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(kinds[7].textContent).toBe("Slide-in");
    expect(kinds[7].title).toContain("like on a wooden pencil box");
    expect(group.querySelector('[aria-checked="true"]')?.textContent).toBe("Push in");
    act(() => kinds[7].click());
    expect(changes.at(-1)).toEqual({ type: "slide" });
  });

  it("asks for the wall it slides in through, the front to begin with, instead of a depth and a wall, and keeps thickness and gap", () => {
    const { panel, changes } = mount({ type: "slide" });
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Slides in from"]')!;
    expect(group).not.toBeNull();
    const sides = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(sides.map((button) => button.textContent)).toEqual(["Back", "Right", "Front", "Left"]);
    expect(group.querySelector('[aria-checked="true"]')?.textContent).toBe("Front");
    act(() => sides[1].click());
    expect(changes.at(-1)).toEqual({ slideSide: "right" });
    expect(slider(panel, "Lid thickness")).not.toBeNull();
    expect(slider(panel, "Gap per side")).not.toBeNull();
    for (const name of ["Lip depth", "Rim depth", "Lip wall", "Rim wall", "Thread pitch", "Lugs"]) expect(slider(panel, name), name).toBeNull();
    expect(texts(panel)).toContain("The lid's edges run in grooves in three walls; the fourth is cut down to the lid's underside");
    act(() => root?.unmount());
    const back = mount({ type: "slide", slideSide: "back" }).panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Slides in from"]')!;
    expect(back.querySelector('[aria-checked="true"]')?.textContent).toBe("Back");
  });

  it("switches off magnets and the hinge and says once why, but keeps click bumps and the handle, saying what they are on this lid", () => {
    const { panel, changes } = mount({ type: "slide", magnets: true, hinge: true });
    for (const name of ["Magnets in the corners", "Hinge"]) {
      const box = checkbox(panel, name)!;
      expect(box.checked, name).toBe(false);
      expect(box.disabled, name).toBe(true);
    }
    expect(texts(panel).split("A slide-in lid holds in its grooves: magnets and a hinge do not go with it.").length).toBe(2);
    expect(texts(panel)).not.toContain("Magnet diameter");
    expect(texts(panel)).not.toContain("A hinge goes with a lid that pushes in or a flat one.");
    expect(texts(panel)).not.toContain("Lid thickness raised");
    const bumps = checkbox(panel, "Click bumps")!;
    expect(bumps.disabled).toBe(false);
    act(() => bumps.click());
    expect(changes.at(-1)).toEqual({ clickBumps: true });
    act(() => root?.unmount());
    const on = mount({ type: "slide", clickBumps: true, handle: "notch" }).panel;
    expect(slider(on, "Bump height")).not.toBeNull();
    expect(texts(on)).toContain("A small bump under the lid's end clicks past the inner edge of the wall it slides in through");
    expect(texts(on)).not.toContain("snap into dimples in the body");
    expect(texts(on)).toContain("Four grooves across the lid's top near its end at the wall it slides in through, for a thumb to push it out.");
    expect(texts(on)).not.toContain("A recess in the body's front wall");
    const handles = on.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Handle"]')!;
    expect([...handles.querySelectorAll<HTMLButtonElement>('[role="radio"]')].every((button) => !button.disabled)).toBe(true);
    act(() => root?.unmount());
    expect(texts(mount({ type: "slide", handle: "tab" }).panel)).toContain("A tab as thick as the plate, 6 mm out from the lid's end at the wall it slides in through, to pull it out by.");
    act(() => root?.unmount());
    // With a frame that wall is not cut down but has a slot (#1497): the hints for the bump, the grip and the tab hold
    // for both, so none of them speaks of a cut wall.
    for (const handle of ["notch", "tab"] as const) {
      const framed = texts(mount({ type: "slide", slideFrame: 2, clickBumps: true, handle }).panel);
      expect(framed).toContain("clicks past the inner edge of the wall it slides in through");
      expect(framed).toContain(handle === "tab" ? "A tab as thick as the plate" : "Four grooves across the lid's top");
      expect(framed).not.toContain("cut wall");
      act(() => root?.unmount());
    }
  });

  it("asks how far below the rim the lid sits, framed by the walls, 0 to begin with, says what changes and how low a frame is too low", () => {
    const { panel, changes } = mount({ type: "slide" });
    const frame = slider(panel, "Frame above the lid")!;
    expect(frame).not.toBeNull();
    expect(frame.value).toBe("0");
    expect(frame.max).toBe("5");
    expect(texts(panel)).toContain("How far the lid sits below the rim, with the walls standing round it as a frame. 0: the lid is flush with the rim.");
    expect(texts(panel)).toContain("the fourth is cut down to the lid's underside");
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(frame, "2");
      frame.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(changes.at(-1)).toEqual({ slideFrame: 2 });
    act(() => root?.unmount());
    const framed = mount({ type: "slide", slideFrame: 2 }).panel;
    expect(texts(framed)).toContain("it slides in through a slot in the fourth, which keeps its full height above it");
    expect(texts(framed)).not.toContain("the fourth is cut down to the lid's underside");
    expect(texts(framed)).not.toContain("The frame is too low");
    act(() => root?.unmount());
    // The gap and the click bump's height over the lid, and 1 mm of wall above them.
    const low = mount({ type: "slide", slideFrame: 1.4, clickBumps: true }).panel;
    expect([...low.querySelectorAll('[role="status"]')].map((node) => node.textContent)).toContain("The frame is too low to keep the wall whole above the slot: set it to at least 1.6 mm, or to 0.");
    act(() => root?.unmount());
    // Only a slide-in lid has one.
    for (const type of ["plug", "cap", "flat", "screw", "bayonet"] as const) {
      expect(slider(mount({ type, slideFrame: 2 }).panel, "Frame above the lid"), type).toBeNull();
      act(() => root?.unmount());
    }
  });
});
