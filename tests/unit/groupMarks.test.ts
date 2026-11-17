import manifoldModule from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { groupedShape, restoreGroupedChildren } from "@/lib/editorBooleans";
import { layeredTextShape, offersTextLayers, textLayerStack } from "@/lib/editorTextTags";
import { groupMarksOf } from "@/lib/groupMarks";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { NAME_TAG_LAYERS } from "@/lib/nameTag";
import { loadTextFonts } from "@/lib/textFonts";
import type { WorkplaneShape } from "@/types/layerling";

// Discussion #1692: Done in Edit Bundle built a name tag or icon tag again as a plain bundle, and its card was gone.
beforeAll(async () => {
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
  await loadTextFonts();
});

const text = (): WorkplaneShape => ({
  id: "t", name: "Text", kind: "text", color: "#ffffff", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 60, depth: 20, height: 1.2, size: 60, text: "Name", font: "Sans",
} as WorkplaneShape);

/** What Done in Edit Bundle does with an unchanged bundle: the same parts grouped again, with what the group knows about itself. */
function doneWithoutChanges(tag: WorkplaneShape) {
  const rebuilt = groupedShape(restoreGroupedChildren(tag))!;
  return { ...rebuilt, groupOperation: "bundle" as const, id: tag.id, name: tag.name, ...groupMarksOf(tag) };
}

describe("a made group keeps what it is after Done (#1692)", () => {
  it("a name tag opened and closed again still has its layers card", () => {
    const tag = layeredTextShape(text(), NAME_TAG_LAYERS, [], "tag", { locked: false, hidden: false, name: "Name" });
    const before = textLayerStack(tag);
    expect(before).not.toBeNull();
    const after = doneWithoutChanges(tag);
    expect(after.layeredText).toBe(true);
    expect(offersTextLayers(after)).toBe(true);
    expect(textLayerStack(after)?.layers).toEqual(before?.layers);
  });

  it("without the marks the bundle forgot it was a name tag (the bug)", () => {
    const tag = layeredTextShape(text(), NAME_TAG_LAYERS, [], "tag", { locked: false, hidden: false, name: "Name" });
    const plain = groupedShape(restoreGroupedChildren(tag))!;
    expect(textLayerStack({ ...plain, groupOperation: "bundle" })).toBeNull();
  });

  it("keeps the icon tag, QR code and SBC board marks, and the tag marks only on a bundle", () => {
    const icon = { id: "i", groupOperation: "bundle", layeredIcon: true } as WorkplaneShape;
    expect(groupMarksOf(icon)).toEqual({ layeredIcon: true });
    const qr = { id: "q", groupOperation: "group", qrCode: { text: "https://layerling.com" } } as unknown as WorkplaneShape;
    const marks = groupMarksOf(qr);
    expect(marks.qrCode).toEqual(qr.qrCode);
    expect(marks.qrCode).not.toBe(qr.qrCode);
    expect(groupMarksOf({ id: "g", groupOperation: "group", layeredIcon: true, layeredText: true } as WorkplaneShape)).toEqual({});
    expect(groupMarksOf({ id: "p" } as WorkplaneShape)).toEqual({});
  });
});
