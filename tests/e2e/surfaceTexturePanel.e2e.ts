// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { normalizeSurfaceTexture, type SurfaceTextureFace, type SurfaceTextureSettings } from "@/lib/surfaceTexture";
import { surfaceTexturedShape, surfaceTextureInput, textureSurfacePositions } from "@/lib/surfaceTextureShape";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The surface texture in a shape's settings: the card lists the patterns, a pattern chosen starts from values of its
 * own, the button hands the settings to the editor, a textured body shows them again to change or remove, and a box,
 * cylinder, sphere, cone or pyramid can be a texture mask.
 */
beforeAll(() => {
  // jsdom lays nothing out; the panel scrolls itself back to the top and the card into view.
  Element.prototype.scrollTo ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

const cylinder = canonicalizeShape({
  id: "c1", name: "Cylinder", kind: "cylinder", color: "#d97813", x: 0, z: 0, elevation: 0,
  size: 30, width: 30, depth: 30, height: 20, rotation: 0,
});

type Calls = { applied: SurfaceTextureSettings[]; removed: number; updates: Array<Partial<WorkplaneShape>>; picks: Array<SurfaceTextureFace[] | null> };

/**
 * The settings panel for this shape, with the surface texture card open as the editor holds it. `render` draws it again
 * with the editor's face picking as given.
 */
function mount(shape: WorkplaneShape) {
  const calls: Calls = { applied: [], removed: 0, updates: [], picks: [] };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const render = (picking: { surfaceFacePicking?: boolean; surfacePickedFaces?: SurfaceTextureFace[] | null } = {}) => act(() => {
    root!.render(createElement(ShapeInspector, {
      shape,
      snap: DEFAULT_SNAP_GRID,
      snapOpen: false,
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      onUpdate: (patch: Partial<WorkplaneShape>) => calls.updates.push(patch),
      onSnapChange: () => {},
      onSnapOpenChange: () => {},
      onSurfaceTexture: (settings: SurfaceTextureSettings) => {
        calls.applied.push(settings);
      },
      onRemoveSurfaceTexture: () => {
        calls.removed += 1;
      },
      surfaceTextureOpen: true,
      onSurfaceTextureOpenChange: () => {},
      onSurfaceFacePick: (faces: SurfaceTextureFace[] | null) => {
        calls.picks.push(faces);
      },
      ...picking,
    }));
  });
  render();
  return { panel: container, calls, render };
}

const card = (panel: HTMLElement) => panel.querySelector<HTMLElement>("[id^=surface-texture-]")!;
const selectWith = (panel: HTMLElement, value: string) => [...card(panel).querySelectorAll<HTMLSelectElement>("select")].find((select) => [...select.options].some((option) => option.value === value));
const rangeNamed = (panel: HTMLElement, name: string) => [...card(panel).querySelectorAll<HTMLLabelElement>("label.range-property")]
  .find((row) => row.querySelector(".range-property-name")?.textContent === name)
  ?.querySelector<HTMLInputElement>("input:not([type=range])");
const button = (panel: HTMLElement, text: string) => [...card(panel).querySelectorAll<HTMLButtonElement>("button")].find((entry) => entry.textContent === text);

function choose(select: HTMLSelectElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("the surface texture card in a shape's settings", () => {
  it("lists the twelve patterns, knurling first chosen", () => {
    const { panel } = mount(cylinder);
    const pattern = selectWith(panel, "knurl")!;
    expect(pattern.value).toBe("knurl");
    expect([...pattern.options].map((option) => option.textContent)).toEqual([
      "Grooves", "Knurling", "Honeycomb", "Bumps", "Cells", "Knitting", "Rope", "Basket weave", "Grain", "Image", "Cracks (kintsugi)", "Text (stuck on)",
    ]);
  });

  it("starts a pattern from its own values, and hands the settings to the editor", async () => {
    const { panel, calls } = mount(cylinder);
    choose(selectWith(panel, "knurl")!, "knit");
    expect(rangeNamed(panel, "Stitch width")?.value).toBe("5.00");
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.applied).toHaveLength(1);
    expect(calls.applied[0]).toMatchObject({ pattern: "knit", spacing: 5, depth: 1.2, direction: "outward", profile: "round" });
    // Leaving it gives the next pattern the plain values back: knurling's spacing, not a stitch's.
    choose(selectWith(panel, "knit")!, "knurl");
    expect(rangeNamed(panel, "Spacing")?.value).toBe("3.00");
  });

  it("makes bumps half balls, and shows the ready images and a button for one's own", () => {
    const { panel } = mount(cylinder);
    choose(selectWith(panel, "knurl")!, "bumps");
    expect(selectWith(panel, "dome")?.value).toBe("dome");
    choose(selectWith(panel, "bumps")!, "image");
    const images = selectWith(panel, "topography")!;
    expect(images.options).toHaveLength(12);
    expect(button(panel, "Load your own image…")).toBeDefined();
  });

  it("shows a textured body's settings, to change or to remove", async () => {
    const grooves = normalizeSurfaceTexture({ pattern: "grooves", spacing: 4, depth: 0.5, angle: 0 });
    const textured = surfaceTexturedShape(cylinder, textureSurfacePositions(surfaceTextureInput(cylinder), grooves, 150_000).positions, grooves)!;
    const { panel, calls } = mount(textured);
    expect(selectWith(panel, "knurl")?.value).toBe("grooves");
    expect(rangeNamed(panel, "Spacing")?.value).toBe("4.00");
    await act(async () => button(panel, "Change texture")!.click());
    expect(calls.applied[0]).toMatchObject({ pattern: "grooves", spacing: 4, depth: 0.5 });
    act(() => button(panel, "Remove texture")!.click());
    expect(calls.removed).toBe(1);
  });

  it("picks faces in the view: the editor gets the clicks, the card the faces, and only they get the pattern", async () => {
    const { panel, calls, render } = mount(cylinder);
    expect(card(panel).textContent).toContain("The pattern goes on every face.");
    act(() => button(panel, "Pick faces")!.click());
    expect(calls.picks).toEqual([[]]);
    // A click on the top in the view comes back from the editor as the faces picked so far.
    const top: SurfaceTextureFace = { at: [0.5, 1, 0.5], normal: [0, 1, 0] };
    render({ surfaceFacePicking: true, surfacePickedFaces: [top] });
    expect(card(panel).textContent).toContain("Picked faces: 1. Only they get the pattern.");
    expect(button(panel, "Done picking")).toBeDefined();
    // Picked faces say where it goes: the smooth top and bottom and the height band leave the card.
    act(() => button(panel, "More")!.click());
    expect(rangeNamed(panel, "Top smooth to (°)")).toBeUndefined();
    expect(rangeNamed(panel, "Fade in over")).toBeDefined();
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.picks.at(-1)).toBeNull();
    expect(calls.applied[0].faces).toEqual([top]);
    // Every face again: none picked, and picking starts over from none.
    render({ surfaceFacePicking: true, surfacePickedFaces: [top] });
    act(() => button(panel, "Every face again")!.click());
    expect(calls.picks.at(-1)).toEqual([]);
    render({ surfaceFacePicking: false, surfacePickedFaces: null });
    expect(card(panel).textContent).toContain("The pattern goes on every face.");
  });

  it("lets a box be a texture mask, which turns it transparent", () => {
    const box = canonicalizeShape({ ...cylinder, id: "b1", name: "Box", kind: "box" });
    const { panel, calls } = mount(box);
    const mask = [...panel.querySelectorAll<HTMLSelectElement>("select")].find((select) => [...select.options].some((option) => option.value === "exclude"))!;
    expect(mask.value).toBe("none");
    choose(mask, "exclude");
    expect(calls.updates.at(-1)).toEqual({ surfaceTextureMask: "exclude", transparent: true });
  });
});
