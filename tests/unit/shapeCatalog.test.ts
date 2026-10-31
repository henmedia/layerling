import { describe, expect, it } from "vitest";
import type { ShapeAsset } from "@/types/layerling";
import { clipboardShape, makeShapeFromAsset, parseDroppedShapeAsset, sceneShape, shapeAssetColor, toolbarShapeAssets } from "@/lib/shapeCatalog";

describe("shape catalog", () => {
  it("exposes roundedBox directly after box in the toolbar catalog", () => {
    const kinds = toolbarShapeAssets.map((asset) => asset.kind);

    expect(kinds).toContain("roundedBox");

    const boxIndex = kinds.indexOf("box");
    const roundedBoxIndex = kinds.indexOf("roundedBox");
    const cylinderIndex = kinds.indexOf("cylinder");
    expect(roundedBoxIndex).toBe(boxIndex + 1);
    expect(cylinderIndex).toBe(roundedBoxIndex + 1);
  });

  it("exposes slot between cylinder and ellipse in the toolbar catalog", () => {
    const kinds = toolbarShapeAssets.map((asset) => asset.kind);

    expect(kinds).toContain("slot");

    const cylinderIndex = kinds.indexOf("cylinder");
    const slotIndex = kinds.indexOf("slot");
    const ellipseIndex = kinds.indexOf("ellipse");
    expect(slotIndex).toBe(cylinderIndex + 1);
    expect(ellipseIndex).toBe(slotIndex + 1);
  });

  it("exposes bentTube directly after tube in the toolbar catalog", () => {
    const kinds = toolbarShapeAssets.map((asset) => asset.kind);

    expect(kinds).toContain("bentTube");
    expect(kinds.indexOf("bentTube")).toBe(kinds.indexOf("tube") + 1);
  });

  it("exposes star, heart, and crescent between tube and text in the toolbar catalog", () => {
    const kinds = toolbarShapeAssets.map((asset) => asset.kind);

    expect(kinds).toContain("star");
    expect(kinds).toContain("heart");
    expect(kinds).toContain("crescent");

    // Star, heart and crescent close the list, just before the ruler.
    const starIndex = kinds.indexOf("star");
    const heartIndex = kinds.indexOf("heart");
    const crescentIndex = kinds.indexOf("crescent");
    const rulerIndex = kinds.indexOf("ruler");
    expect(heartIndex).toBe(starIndex + 1);
    expect(crescentIndex).toBe(heartIndex + 1);
    expect(rulerIndex).toBe(crescentIndex + 1);
    expect(rulerIndex).toBe(kinds.length - 1);
  });

  it("puts the screw holes, the teardrop and the port opening after the bent tube, and text right behind them", () => {
    const kinds = toolbarShapeAssets.map((asset) => asset.kind);
    expect(kinds.indexOf("counterbore")).toBe(kinds.indexOf("bentTube") + 1);
    expect(kinds.indexOf("countersink")).toBe(kinds.indexOf("counterbore") + 1);
    expect(kinds.indexOf("doubleCountersink")).toBe(kinds.indexOf("countersink") + 1);
    expect(kinds.indexOf("teardrop")).toBe(kinds.indexOf("doubleCountersink") + 1);
    expect(kinds.indexOf("port")).toBe(kinds.indexOf("teardrop") + 1);
    expect(kinds.indexOf("text")).toBe(kinds.indexOf("port") + 1);
  });

  it("puts Gridfinity right after the spring", () => {
    const kinds = toolbarShapeAssets.map((asset) => asset.kind);
    expect(kinds.indexOf("gridfinity")).toBe(kinds.indexOf("spring") + 1);
  });

  it("exposes the Hirth joint, knurl, hinge and dovetail between gear and the decorative shapes in the toolbar catalog", () => {
    const kinds = toolbarShapeAssets.map((asset) => asset.kind);

    const gearIndex = kinds.indexOf("gear");
    const dovetailIndex = kinds.indexOf("dovetail");
    expect(kinds.indexOf("hirth")).toBe(gearIndex + 1);
    expect(kinds.indexOf("knurl")).toBe(gearIndex + 2);
    expect(kinds.indexOf("hinge")).toBe(gearIndex + 3);
    expect(dovetailIndex).toBe(gearIndex + 4);
    expect(kinds.indexOf("star")).toBe(dovetailIndex + 1);
  });

  it("no longer offers the honeycomb: the hole pattern tool replaced it (#223)", () => {
    expect(toolbarShapeAssets.map((asset) => asset.kind)).not.toContain("honeycomb");
  });

  it("creates placed shapes from toolbar assets", () => {
    const asset: ShapeAsset = { id: "box", name: "Box", src: "box.png", kind: "box", color: "#d41721" };
    const placed = makeShapeFromAsset(asset, { x: 12, z: -8, elevation: 4 });

    expect(placed.id).toMatch(/^box-/);
    expect(placed).toMatchObject({
      name: "Box",
      kind: "box",
      color: "#d41721",
      x: 12,
      z: -8,
      elevation: 4,
      size: 20,
      width: 20,
      depth: 20,
      height: 20,
      radius: 0,
      steps: 10,
      locked: false,
      hidden: false,
    });
  });

  it("uses shape-specific defaults for text and round profiles", () => {
    const text = makeShapeFromAsset({ id: "text", name: "Text", src: "text.png", kind: "text", color: "#cf101b" });
    const sphere = makeShapeFromAsset({ id: "sphere", name: "Sphere", src: "sphere.png", kind: "sphere", color: "#0098c7" });
    const torus = makeShapeFromAsset({ id: "torus", name: "Torus", src: "torus.png", kind: "torus", color: "#0098c7" });
    const gear = makeShapeFromAsset({ id: "gear", name: "Gear", src: "gear.svg", kind: "gear", color: "#6f7f8d" });
    const star = makeShapeFromAsset({ id: "star", name: "Star", src: "star.png", kind: "star", color: "#f5a623" });
    const heart = makeShapeFromAsset({ id: "heart", name: "Heart", src: "heart.png", kind: "heart", color: "#e0245e" });
    const crescent = makeShapeFromAsset({ id: "crescent", name: "Crescent", src: "crescent.png", kind: "crescent", color: "#f5c518" });
    const slot = makeShapeFromAsset({ id: "slot", name: "Capsule", src: "slot.png", kind: "slot", color: "#e67e22" });
    const honeycomb = makeShapeFromAsset({ id: "honeycomb", name: "Honeycomb", src: "honeycomb.png", kind: "honeycomb", color: "#0ea5e9" });
    const roundedBox = makeShapeFromAsset({ id: "roundedBox", name: "Rounded Box", src: "roundedBox.png", kind: "roundedBox", color: "#e74c3c" });

    expect(text).toMatchObject({ width: 86, depth: 28, height: 10, text: "TEXT", font: "Sans" });
    expect(sphere).toMatchObject({ size: 22, width: 22, depth: 22, height: 22 });
    expect(torus).toMatchObject({ size: 22, width: 22, depth: 22, height: 5 });
    // Involute teeth of module 2 (#201): 2 x (12 + 2) across.
    expect(gear).toMatchObject({
      gearProfile: "involute",
      gearPressureAngle: 20,
      gearBacklash: 0.2,
      size: 28,
      width: 28,
      depth: 28,
      height: 6,
      teeth: 12,
      toothSize: 2.5,
      centerHoleSize: 6,
      gearType: "spur",
      helixAngle: 22.5,
      helixQuality: 16,
    });
    expect(star).toMatchObject({
      size: 40,
      width: 40,
      depth: 40,
      height: 10,
      starPoints: 5,
      starInnerSize: 20,
      starOuterFillet: 0,
      starInnerFillet: 0,
    });
    expect(heart).toMatchObject({
      size: 40,
      width: 40,
      depth: 40,
      height: 10,
      heartTipFillet: 0,
      heartQuality: 32,
    });
    expect(crescent).toMatchObject({
      size: 40,
      width: 40,
      depth: 40,
      height: 10,
      crescentThickness: 14,
      crescentTipFillet: 0.5,
      crescentQuality: 32,
    });
    expect(slot).toMatchObject({
      size: 40,
      width: 40,
      depth: 20,
      height: 20,
    });
    expect(honeycomb).toMatchObject({
      size: 60,
      width: 60,
      depth: 60,
      height: 3,
      honeycombCellSize: 8,
      honeycombWallThickness: 1.6,
      honeycombFrameWidth: 3,
    });
    expect(roundedBox).toMatchObject({
      size: 40,
      width: 40,
      depth: 30,
      height: 20,
      cornerFillet: 5,
      topBottomFillet: 0,
      roundedBoxQuality: 8,
    });
  });

  it("applies only explicitly customized creation dimensions", () => {
    const asset: ShapeAsset = { id: "cone", name: "Cone", src: "cone.png", kind: "cone", color: "#6e2786" };
    const appDefault = makeShapeFromAsset(asset);
    const customized = makeShapeFromAsset(asset, undefined, { width: 320, depth: 240, height: 180 });

    expect(appDefault).toMatchObject({ width: 20, depth: 20, height: 20, baseRadius: 10 });
    expect(customized).toMatchObject({ width: 320, depth: 240, height: 180, size: 320, baseRadius: 160 });
  });

  it("keeps a cylinder circular even with mismatched customization, but lets an ellipse differ", () => {
    const cylinder = makeShapeFromAsset(
      { id: "cylinder", name: "Cylinder", src: "cylinder.png", kind: "cylinder", color: "#d97813" },
      undefined,
      { width: 30, depth: 20 },
    );
    const ellipse = makeShapeFromAsset(
      { id: "ellipse", name: "Ellipse", src: "ellipse.png", kind: "ellipse", color: "#e0a324" },
    );

    expect(cylinder).toMatchObject({ width: 30, depth: 30, size: 30 });
    expect(ellipse).toMatchObject({ width: 26, depth: 16 });
  });

  it("applies shape-specific creation defaults only when customized", () => {
    const cone = makeShapeFromAsset(
      { id: "cone", name: "Cone", src: "cone.png", kind: "cone", color: "#6e2786" },
      undefined,
      { topRadius: 3, baseRadius: 18, sides: 48 },
    );
    const text = makeShapeFromAsset(
      { id: "text", name: "Text", src: "text.png", kind: "text", color: "#cf101b" },
      undefined,
      { text: "HELLO", font: "Serif", bevel: 2, segments: 6 },
    );
    const gear = makeShapeFromAsset(
      { id: "gear", name: "Gear", src: "gear.svg", kind: "gear", color: "#6f7f8d" },
      undefined,
      { gearType: "helical", teeth: 24, toothSize: 3, toothWidth: 2, centerHoleSize: 10, helixAngle: 30, helixQuality: 24 },
    );
    const honeycomb = makeShapeFromAsset(
      { id: "honeycomb", name: "Honeycomb", src: "honeycomb.png", kind: "honeycomb", color: "#0ea5e9" },
      undefined,
      { honeycombCellSize: 12, honeycombWallThickness: 2.5, honeycombFrameWidth: 5 },
    );
    const roundedBox = makeShapeFromAsset(
      { id: "roundedBox", name: "Rounded Box", src: "roundedBox.png", kind: "roundedBox", color: "#e74c3c" },
      undefined,
      { cornerFillet: 8, topBottomFillet: 3, roundedBoxQuality: 16 },
    );

    expect(cone).toMatchObject({ topRadius: 3, baseRadius: 18, sides: 48 });
    expect(text).toMatchObject({ text: "HELLO", font: "Serif", bevel: 2, segments: 6 });
    expect(gear).toMatchObject({ gearType: "helical", teeth: 24, toothSize: 3, toothWidth: 2, centerHoleSize: 10, helixAngle: 30, helixQuality: 24 });
    expect(honeycomb).toMatchObject({ honeycombCellSize: 12, honeycombWallThickness: 2.5, honeycombFrameWidth: 5 });
    expect(roundedBox).toMatchObject({ cornerFillet: 8, topBottomFillet: 3, roundedBoxQuality: 16 });
  });

  it("creates canonical scene shapes with stable defaults", () => {
    const created = sceneShape({
      name: "Part",
      kind: "box",
      color: "#d41721",
      width: 12,
      depth: 18,
      rotation: 359.9,
      mirrorX: false,
    });

    expect(created.id).toMatch(/^shape-/);
    expect(created).toMatchObject({
      name: "Part",
      kind: "box",
      color: "#d41721",
      x: 0,
      z: 0,
      elevation: 0,
      width: 12,
      depth: 18,
      height: 20,
      size: 18,
      rotation: 0,
      locked: false,
      hidden: false,
    });
    expect(created.mirrorX).toBeUndefined();
  });

  it("keeps the circle of curved text it is given (the MCP create path)", () => {
    const text = makeShapeFromAsset({ id: "text", name: "Text", src: "text.png", kind: "text", color: "#cf101b" }, undefined, {
      textCurved: true,
      textRadius: 25,
      textSize: 8,
      textInward: true,
      textFlipped: true,
    });
    expect(text).toMatchObject({ textCurved: true, textRadius: 25, textSize: 8, textInward: true, textFlipped: true });
    const box = makeShapeFromAsset({ id: "box", name: "Box", src: "box.png", kind: "box", color: "#000" }, undefined, { textCurved: true });
    expect(box.textCurved).toBeUndefined();
  });
});

describe("dragging from the shape library", () => {
  it("lets every library shape onto the workplane", () => {
    for (const asset of toolbarShapeAssets) {
      expect(parseDroppedShapeAsset(JSON.stringify(asset))?.kind, asset.id).toBe(asset.kind);
    }
  });

  it("refuses data that is not a library shape", () => {
    expect(parseDroppedShapeAsset("not json")).toBeNull();
    expect(parseDroppedShapeAsset(JSON.stringify({ ...toolbarShapeAssets[0], kind: "nonsense" }))).toBeNull();
    expect(parseDroppedShapeAsset(JSON.stringify({ ...toolbarShapeAssets[0], hole: "yes" }))).toBeNull();
  });
});

describe("clipboardShape (#642)", () => {
  it("keeps what sceneShape does not name: see-through, mirroring, edges, twist", () => {
    const copied = sceneShape({ id: "a", name: "Box", kind: "box", color: "#d41721", width: 20, depth: 20, height: 10 });
    const withExtras = {
      ...copied,
      transparent: true,
      mirrorX: true,
      extrudeTwist: 15,
      edgeTreatments: [{ id: "e1", kind: "fillet", amount: 2, edges: ["top"] }],
    };
    // Through the text the other design reads from local storage.
    const pasted = clipboardShape(JSON.parse(JSON.stringify(withExtras)));
    expect(pasted?.transparent).toBe(true);
    expect(pasted?.mirrorX).toBe(true);
    expect(pasted?.extrudeTwist).toBe(15);
    expect(pasted?.edgeTreatments).toEqual(withExtras.edgeTreatments);
    expect(pasted?.width).toBe(20);
  });

  it("fills the defaults of a sparse copy and refuses what is no shape", () => {
    const pasted = clipboardShape({ name: "Box", kind: "box", color: "#fff" });
    expect(pasted?.height).toBe(20);
    expect(pasted?.elevation).toBe(0);
    expect(clipboardShape({ name: "Box", kind: "box" })).toBeNull();
    expect(clipboardShape("box")).toBeNull();
  });
});

describe("the colour the library shows", () => {
  const box = toolbarShapeAssets.find((asset) => asset.id === "box")!;

  it("is the asset's own until the shape defaults name another", () => {
    expect(shapeAssetColor(box)).toBe(box.color);
    expect(shapeAssetColor(box, { color: "#123456" })).toBe("#123456");
  });

  it("is the same colour the shape is added in", () => {
    expect(makeShapeFromAsset(box).color).toBe(box.color);
    expect(makeShapeFromAsset(box, undefined, { color: "#123456" }).color).toBe("#123456");
  });
});
