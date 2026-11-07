// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { normalizeSurfaceTexture, SURFACE_TEXTURE_PATTERNS, type SurfaceTextureFace, type SurfaceTextureSettings } from "@/lib/surfaceTexture";
import { surfaceTexturedShape, surfaceTextureInput, surfaceTextureResultShape, textureSurfacePositions } from "@/lib/surfaceTextureShape";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The surface texture in a shape's settings: the card shows the patterns by their pictures, a pattern chosen starts from values of its
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

type Calls = { applied: SurfaceTextureSettings[]; layers: SurfaceTextureSettings[][]; removed: number; updates: Array<Partial<WorkplaneShape>>; picks: Array<SurfaceTextureFace[] | null> };

/**
 * The settings panel for this shape, with the surface texture card open as the editor holds it. `render` draws it again
 * with the editor's face picking as given.
 */
function mount(shape: WorkplaneShape) {
  const calls: Calls = { applied: [], layers: [], removed: 0, updates: [], picks: [] };
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
      onSurfaceTexture: (settings: SurfaceTextureSettings, layers?: SurfaceTextureSettings[]) => {
        calls.applied.push(settings);
        calls.layers.push(layers ?? []);
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

/** The pattern's field: it shows the chosen pattern's picture and name, and opens a grid of all of them. */
const patternField = (panel: HTMLElement) => card(panel).querySelector<HTMLButtonElement>(".pattern-picker-trigger")!;
const patternShown = (panel: HTMLElement) => patternField(panel).textContent;
const patternTiles = (panel: HTMLElement) => [...card(panel).querySelectorAll<HTMLButtonElement>(".pattern-picker-grid [role=option]")];

/** Opens the pattern's pictures and clicks the one named `name`, as a user does. */
function choosePattern(panel: HTMLElement, name: string) {
  act(() => patternField(panel).click());
  const tile = patternTiles(panel).find((option) => option.textContent === name);
  expect(tile, name).toBeDefined();
  act(() => tile!.click());
  expect(patternTiles(panel)).toHaveLength(0);
}

function choose(select: HTMLSelectElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

/** Types a value into a field and leaves it, as a user does. */
function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

describe("the surface texture card in a shape's settings", () => {
  it("shows the twenty patterns by their pictures, knurling first chosen", () => {
    const { panel } = mount(cylinder);
    // The pattern is no longer a list of names: the field shows the chosen one's picture.
    expect(selectWith(panel, "knurl")).toBeUndefined();
    expect(patternShown(panel)).toBe("Knurling");
    expect(patternField(panel).querySelector("img")?.getAttribute("src")).toBe("assets/editor/surface-patterns/knurl.png");
    act(() => patternField(panel).click());
    const tiles = patternTiles(panel);
    expect(tiles.map((tile) => tile.textContent)).toEqual([
      "Grooves", "Knurling", "Honeycomb", "Bumps", "Cells", "Bricks", "Half-timbering", "Stone wall", "Squares", "Triangles", "Knitting", "Rope", "Basket weave", "Bark", "Wood grain", "Carbon (twill)", "Grain", "Image", "Cracks (kintsugi)", "Text (stuck on)",
    ]);
    expect(tiles.map((tile) => tile.querySelector("img")?.getAttribute("src"))).toEqual(SURFACE_TEXTURE_PATTERNS.map((pattern) => `assets/editor/surface-patterns/${pattern}.png`));
    expect(tiles.filter((tile) => tile.getAttribute("aria-selected") === "true").map((tile) => tile.textContent)).toEqual(["Knurling"]);
  });

  it("lays carbon in twill: its weave, the bands' widths, and what Apply hands on", async () => {
    const { panel, calls } = mount(cylinder);
    choosePattern(panel, "Carbon (twill)");
    expect(rangeNamed(panel, "Band width")?.value).toBe("2.50");
    expect(rangeNamed(panel, "Crossing band width")).toBeTruthy();
    choose(selectWith(panel, "twill22")!, "twill21");
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.applied[0]).toMatchObject({ pattern: "carbon", carbonWeave: "twill21", carbonCross: 0, spacing: 2.5, depth: 0.4, width: 0.95, direction: "outward" });
  });

  it("starts a pattern from its own values, and hands the settings to the editor", async () => {
    const { panel, calls } = mount(cylinder);
    choosePattern(panel, "Knitting");
    expect(rangeNamed(panel, "Stitch width")?.value).toBe("5.00");
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.applied).toHaveLength(1);
    expect(calls.applied[0]).toMatchObject({ pattern: "knit", spacing: 5, depth: 1.2, direction: "outward", profile: "round" });
    // Leaving it gives the next pattern the plain values back: knurling's spacing, not a stitch's.
    choosePattern(panel, "Knurling");
    expect(rangeNamed(panel, "Spacing")?.value).toBe("3.00");
  });

  it("makes bumps half balls, and shows the ready images and a button for one's own", () => {
    const { panel } = mount(cylinder);
    choosePattern(panel, "Bumps");
    expect(selectWith(panel, "dome")?.value).toBe("dome");
    choosePattern(panel, "Image");
    const images = selectWith(panel, "topography")!;
    expect(images.options).toHaveLength(12);
    expect(button(panel, "Load your own image…")).toBeDefined();
  });

  it("presses an image on once where it is put, as a text: width, place and turn, and the projection and faces gone", async () => {
    const { panel, calls } = mount(cylinder);
    choosePattern(panel, "Image");
    expect(rangeNamed(panel, "Tile width")).toBeTruthy();
    expect(selectWith(panel, "allRound")).toBeDefined();
    expect(rangeNamed(panel, "Around (°)")).toBeUndefined();
    choose(selectWith(panel, "staggered")!, "once");
    expect(rangeNamed(panel, "Tile width")).toBeUndefined();
    expect(rangeNamed(panel, "Image width")).toBeTruthy();
    expect(rangeNamed(panel, "Image height")).toBeTruthy();
    expect(rangeNamed(panel, "Image width")?.value).toBe("40.00");
    expect(rangeNamed(panel, "Around (°)")).toBeTruthy();
    expect(rangeNamed(panel, "Height (%)")).toBeTruthy();
    expect(rangeNamed(panel, "Turned (°)")).toBeTruthy();
    // It goes where it is put: no projection, no faces to pick.
    expect(selectWith(panel, "allRound")).toBeUndefined();
    expect(button(panel, "Pick faces")).toBeUndefined();
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.applied[0]).toMatchObject({ pattern: "image", imageTiling: "once", textAround: 0, textHeight: 50 });
  });

  it("lays bricks in a bond, with a course's height and the joint's width in mm", async () => {
    const { panel, calls } = mount(cylinder);
    choosePattern(panel, "Bricks");
    const bond = selectWith(panel, "flemish")!;
    expect(bond.value).toBe("running");
    expect([...bond.options].map((option) => option.textContent)).toEqual(["Running bond", "Stack bond", "English bond", "English cross bond", "Flemish bond"]);
    expect(rangeNamed(panel, "Brick length")?.value).toBe("12.00");
    expect(rangeNamed(panel, "Course height")?.value).toBe("4.00");
    expect(rangeNamed(panel, "Joint width")?.value).toBe("0.80");
    choose(bond, "english");
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.applied[0]).toMatchObject({ pattern: "bricks", brickBond: "english", spacing: 12, brickHeight: 4, brickJoint: 0.8, depth: 0.6, profile: "flat" });
    // Leaving bricks gives the next pattern its own spacing and profile back.
    choosePattern(panel, "Knurling");
    expect(rangeNamed(panel, "Spacing")?.value).toBe("3.00");
  });

  it("lays half-timbering: its bracing, a storey's height, the beams' width and height, rails and how strong the grain is", async () => {
    const { panel, calls } = mount(cylinder);
    choosePattern(panel, "Half-timbering");
    const bracing = selectWith(panel, "knee")!;
    expect(bracing.value).toBe("mixed");
    expect([...bracing.options].map((option) => option.textContent)).toEqual(["None", "Braces", "St Andrew's crosses", "Corner braces", "Mixed"]);
    expect(card(panel).textContent).toContain("Braces at the ends, then crosses and corner braces in turn towards the middle.");
    expect(rangeNamed(panel, "Panel width")?.value).toBe("12.00");
    expect(rangeNamed(panel, "Storey height")?.value).toBe("30.00");
    expect(rangeNamed(panel, "Beam width")?.value).toBe("2.40");
    expect(rangeNamed(panel, "Rails per storey")?.value).toBe("1");
    // The depth is how far the beams stand out; they stand out, and the profile and a groove's width are not theirs.
    expect(rangeNamed(panel, "Beam height")?.value).toBe("0.80");
    expect(rangeNamed(panel, "Depth")).toBeUndefined();
    expect(selectWith(panel, "outward")?.value).toBe("outward");
    // The grain from none through fine to strong, starting as it was when it was only on or off.
    const grain = rangeNamed(panel, "Wood grain (%)")!;
    expect(grain.value).toBe("50");
    expect(card(panel).textContent).toContain("0 %: none. Below 50 % finer: more grooves, thinner and shallower. Above 50 % stronger: two wide, deep ones.");
    type(grain, "20");
    choose(bracing, "cross");
    expect(card(panel).textContent).toContain("An X in the panel under the lowest rail.");
    act(() => button(panel, "More")!.click());
    expect(rangeNamed(panel, "Groove width (%)")).toBeUndefined();
    expect(selectWith(panel, "pointed")).toBeUndefined();
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.applied[0]).toMatchObject({ pattern: "timber", timberBracing: "cross", spacing: 12, timberHeight: 30, timberBeam: 2.4, timberRails: 1, timberGrain: 0.2, depth: 0.8, direction: "outward", keepEdges: false });
    // Leaving it gives knurling its own spacing, depth and direction back.
    choosePattern(panel, "Knurling");
    expect(rangeNamed(panel, "Spacing")?.value).toBe("3.00");
    expect(rangeNamed(panel, "Depth")?.value).toBe("0.60");
    expect(selectWith(panel, "outward")?.value).toBe("inward");
  });

  it("lays a stone wall: stone size, how different and how round, the joint and the arrangement", async () => {
    const { panel, calls } = mount(cylinder);
    choosePattern(panel, "Stone wall");
    expect(rangeNamed(panel, "Stone size")?.value).toBe("8.00");
    expect(rangeNamed(panel, "Size variation (%)")?.value).toBe("50");
    expect(rangeNamed(panel, "Roundness (%)")?.value).toBe("50");
    expect(card(panel).textContent).toContain("0 %: broken stone with sharp edges, 100 %: rounded field stones.");
    expect(rangeNamed(panel, "Joint width")?.value).toBe("0.80");
    expect(rangeNamed(panel, "Arrangement")?.value).toBe("1");
    expect(selectWith(panel, "outward")?.value).toBe("outward");
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.applied[0]).toMatchObject({ pattern: "stones", spacing: 8, stoneVary: 0.5, stoneRound: 0.5, stoneJoint: 0.8, seed: 1, depth: 0.8, direction: "outward" });
  });

  it("lays squares and triangles with a gap in mm, from the bottom edge if asked, and hands them to the editor", async () => {
    const { panel, calls } = mount(cylinder);
    choosePattern(panel, "Squares");
    expect(rangeNamed(panel, "Square size")?.value).toBe("4.00");
    expect(rangeNamed(panel, "Gap")?.value).toBe("2.00");
    expect(selectWith(panel, "outward")?.value).toBe("outward");
    const fromBottom = [...card(panel).querySelectorAll<HTMLLabelElement>("label.check-property")].find((row) => row.textContent === "From the bottom edge")!.querySelector("input")!;
    expect(fromBottom.checked).toBe(false);
    act(() => fromBottom.click());
    // A tile has no width of its own share: no groove width under More, and the profile tells what it makes of a tile.
    act(() => button(panel, "More")!.click());
    expect(rangeNamed(panel, "Groove width (%)")).toBeUndefined();
    expect(card(panel).textContent).toContain("pointed makes pyramids");
    choosePattern(panel, "Triangles");
    expect(rangeNamed(panel, "Triangle size")?.value).toBe("6.00");
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.applied[0]).toMatchObject({ pattern: "triangles", spacing: 6, tileGap: 2, tileFromBottom: true, profile: "flat", direction: "outward" });
    // Leaving them gives knurling its own spacing and direction back.
    choosePattern(panel, "Knurling");
    expect(rangeNamed(panel, "Spacing")?.value).toBe("3.00");
    expect(selectWith(panel, "outward")?.value).toBe("inward");
  });

  it("starts a bark at its tree's size and depth, with the annual rings on the ends", () => {
    const { panel } = mount(cylinder);
    choosePattern(panel, "Bark");
    const tree = selectWith(panel, "birch")!;
    expect(tree.value).toBe("oak");
    expect([...tree.options].map((option) => option.textContent)).toEqual(["Oak", "Pine", "Spruce", "Birch", "Beech"]);
    expect(rangeNamed(panel, "Bark size")?.value).toBe("8.00");
    expect(rangeNamed(panel, "Depth")?.value).toBe("1.50");
    expect(rangeNamed(panel, "Ring width")?.value).toBe("3.00");
    choose(tree, "birch");
    expect(rangeNamed(panel, "Bark size")?.value).toBe("10.00");
    expect(rangeNamed(panel, "Depth")?.value).toBe("0.60");
    // Leaving bark gives knurling its own spacing and depth back.
    choosePattern(panel, "Knurling");
    expect(rangeNamed(panel, "Spacing")?.value).toBe("3.00");
    expect(rangeNamed(panel, "Depth")?.value).toBe("0.60");
  });

  it("lays wood grain by wood, cut and ring width, and hands them to the editor", async () => {
    const { panel, calls } = mount(cylinder);
    choosePattern(panel, "Wood grain");
    const wood = selectWith(panel, "walnut")!;
    expect([...wood.options].map((option) => option.textContent)).toEqual(["Oak", "Ash", "Beech", "Pine", "Walnut"]);
    expect(selectWith(panel, "flatSawn")?.value).toBe("log");
    expect(rangeNamed(panel, "Ring width")?.value).toBe("3.00");
    choose(wood, "pine");
    expect(rangeNamed(panel, "Ring width")?.value).toBe("4.00");
    choose(selectWith(panel, "flatSawn")!, "flatSawn");
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.applied[0]).toMatchObject({ pattern: "wood", woodType: "pine", woodCut: "flatSawn", ringWidth: 4, topFree: 0, bottomFree: 0 });
  });

  it("shows a textured body's settings, to change or to remove", async () => {
    const grooves = normalizeSurfaceTexture({ pattern: "grooves", spacing: 4, depth: 0.5, angle: 0 });
    const textured = surfaceTexturedShape(cylinder, textureSurfacePositions(surfaceTextureInput(cylinder), grooves, 150_000).positions, grooves)!;
    const { panel, calls } = mount(textured);
    expect(patternShown(panel)).toBe("Grooves");
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

  it("puts a second pattern on faces of its own: a tab per layer, its faces asked for, every layer handed to the editor", async () => {
    const { panel, calls, render } = mount(cylinder);
    const tabs = () => [...card(panel).querySelectorAll<HTMLButtonElement>(".surface-layers [role=tab]")];
    const apply = () => button(panel, "Apply texture")!;
    expect(tabs()).toHaveLength(1);
    choosePattern(panel, "Grooves");
    // A new layer asks for its faces at once: picking starts with none.
    act(() => button(panel, "Layer")!.click());
    expect(tabs().map((tab) => tab.textContent)).toEqual(["1Grooves", "2Knurling"]);
    expect(tabs()[1].getAttribute("aria-selected")).toBe("true");
    expect(calls.picks.at(-1)).toEqual([]);
    render({ surfaceFacePicking: true, surfacePickedFaces: [] });
    expect(card(panel).textContent).toContain("Pick the faces for this layer");
    expect(card(panel).textContent).toContain("Layer 2 has no faces yet");
    expect(apply().disabled).toBe(true);
    // The top clicked in the view belongs to the second layer; the first now takes the faces left over.
    const top: SurfaceTextureFace = { at: [0.5, 1, 0.5], normal: [0, 1, 0] };
    render({ surfaceFacePicking: true, surfacePickedFaces: [top] });
    expect(card(panel).textContent).toContain("Picked faces: 1. Only they get the pattern.");
    expect(apply().disabled).toBe(false);
    act(() => tabs()[0].click());
    expect(card(panel).textContent).toContain("The pattern goes on the faces the other layers leave free.");
    expect(patternShown(panel)).toBe("Grooves");
    await act(async () => apply().click());
    expect(calls.applied[0]).toMatchObject({ pattern: "grooves", faces: [] });
    expect(calls.layers[0]).toHaveLength(1);
    expect(calls.layers[0][0]).toMatchObject({ pattern: "knurl", faces: [top] });
  });

  it("takes a layer away again, and shows a textured body's layers to change", () => {
    const grooves = normalizeSurfaceTexture({ pattern: "grooves" });
    const knurl = normalizeSurfaceTexture({ pattern: "knurl", faces: [{ at: [0.5, 1, 0.5], normal: [0, 1, 0] }] });
    const textured = surfaceTexturedShape(cylinder, textureSurfacePositions(surfaceTextureInput(cylinder), grooves, 150_000).positions, grooves, Date.now(), [knurl])!;
    const { panel } = mount(textured);
    const tabs = () => [...card(panel).querySelectorAll<HTMLButtonElement>(".surface-layers [role=tab]")];
    expect(tabs().map((tab) => tab.textContent)).toEqual(["1Grooves", "2Knurling"]);
    expect(card(panel).textContent).toContain("Grooves + Knurling");
    act(() => tabs()[1].click());
    expect(card(panel).textContent).toContain("Picked faces: 1. Only they get the pattern.");
    act(() => button(panel, "Remove this layer")!.click());
    expect(tabs().map((tab) => tab.textContent)).toEqual(["1Grooves"]);
  });

  /** A check box of the card by its words. */
  const check = (panel: HTMLElement, name: string) => [...card(panel).querySelectorAll<HTMLLabelElement>("label.check-property")].find((row) => row.textContent === name)?.querySelector("input");
  const swatch = (panel: HTMLElement) => card(panel).querySelector<HTMLInputElement>(".surface-pattern-color input[type=color]");

  it("makes the pattern a part of its own in a colour of its own (Discussion #1347), raised or cut in", async () => {
    const { panel, calls } = mount(cylinder);
    expect(check(panel, "Pattern as its own part")?.checked).toBe(false);
    expect(swatch(panel)).toBeNull();
    act(() => check(panel, "Pattern as its own part")!.click());
    // Knurling goes into the body: the part fills the cut. It starts white against the orange body.
    expect(card(panel).textContent).toContain("fills the cut up to the surface");
    expect(swatch(panel)?.value).toBe("#ffffff");
    act(() => {
      swatch(panel)!.value = "#33983d";
      swatch(panel)!.dispatchEvent(new Event("change"));
    });
    expect(swatch(panel)?.value).toBe("#33983d");
    // Both ways there is no body under it: it stays one with the body.
    choose(selectWith(panel, "both")!, "both");
    expect(card(panel).textContent).toContain("the pattern stays one with the body");
    choose(selectWith(panel, "both")!, "outward");
    expect(card(panel).textContent).toContain("the body stays as it was");
    await act(async () => button(panel, "Apply texture")!.click());
    expect(calls.applied[0]).toMatchObject({ pattern: "knurl", direction: "outward", patternPart: true, patternColor: "#33983d" });
  });

  it("lets the cracks have their gold or the pattern part, one or the other", () => {
    const { panel } = mount(cylinder);
    choosePattern(panel, "Cracks (kintsugi)");
    act(() => check(panel, "Gold filling as a part of its own")!.click());
    expect(check(panel, "Gold filling as a part of its own")?.checked).toBe(true);
    act(() => check(panel, "Pattern as its own part")!.click());
    expect(check(panel, "Pattern as its own part")?.checked).toBe(true);
    expect(check(panel, "Gold filling as a part of its own")?.checked).toBe(false);
    act(() => check(panel, "Gold filling as a part of its own")!.click());
    expect(check(panel, "Pattern as its own part")?.checked).toBe(false);
  });

  it("shows a body with its pattern part as it was made, to change or to remove", async () => {
    const settings = normalizeSurfaceTexture({ pattern: "grooves", spacing: 4, depth: 0.5, direction: "outward", patternPart: true, patternColor: "#111111" });
    const bundle = surfaceTextureResultShape(cylinder, null, textureSurfacePositions(surfaceTextureInput(cylinder), settings, 150_000), settings, [], "Cylinder – Pattern")!;
    expect(bundle.groupOperation).toBe("bundle");
    const { panel, calls } = mount(bundle);
    expect(patternShown(panel)).toBe("Grooves");
    expect(check(panel, "Pattern as its own part")?.checked).toBe(true);
    expect(swatch(panel)?.value).toBe("#111111");
    await act(async () => button(panel, "Change texture")!.click());
    expect(calls.applied[0]).toMatchObject({ pattern: "grooves", patternPart: true, patternColor: "#111111" });
    act(() => button(panel, "Remove texture")!.click());
    expect(calls.removed).toBe(1);
  }, 30_000);
});
