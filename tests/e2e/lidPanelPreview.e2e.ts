// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { LidPanel } from "@/components/workplane/LidPanel";
import { lidPreviewBounds, lidPreviewGroup, syncLidPreviewOverlay } from "@/components/workplane/LidPreviewOverlay";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import { t } from "@/lib/i18n";
import { LID_DEFAULTS, type LidPreviewPart } from "@/lib/lidTool";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The lid panel's live preview (Discussion #2130): a switch, one status line and "Look at it" in the panel, and the lid
 * drawn flat and grey in the view, taking no clicks.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

type Preview = { on: boolean; working: boolean; shown: boolean; note: string | null };

function mount(preview: Preview | null) {
  const toggled: boolean[] = [];
  let shows = 0;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(LidPanel, {
      targetName: "Box",
      settings: LID_DEFAULTS,
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      busy: false,
      error: null,
      onChange: () => {},
      onApply: () => {},
      onCancel: () => {},
      preview: preview ? { ...preview, onToggle: (on: boolean) => toggled.push(on), onShow: () => { shows += 1; } } : null,
    }));
  });
  const panel = container;
  return {
    panel,
    toggled,
    shows: () => shows,
    status: () => panel.querySelector('[data-testid="lid-preview-status"]')?.textContent ?? null,
    show: () => panel.querySelector<HTMLButtonElement>('[data-testid="lid-preview-show"]'),
    toggle: () => panel.querySelector<HTMLInputElement>('[data-testid="lid-preview-toggle"]'),
  };
}

describe("the lid panel's preview switch", () => {
  it("is ticked when the preview is on and hands on a change", () => {
    const view = mount({ on: true, working: false, shown: true, note: null });
    expect(view.toggle()?.checked).toBe(true);
    act(() => view.toggle()!.click());
    expect(view.toggled).toEqual([false]);
  });

  it("says what it is doing: working, shown, or why there is none", () => {
    expect(mount({ on: true, working: true, shown: true, note: null }).status()).toBe(t("lid.preview.working"));
    act(() => root?.unmount());
    expect(mount({ on: true, working: false, shown: true, note: null }).status()).toBe(t("lid.preview.hint"));
    act(() => root?.unmount());
    const reason = t("lid.error.hingeAlready");
    expect(mount({ on: true, working: false, shown: false, note: reason }).status()).toBe(t("lid.preview.none", { reason }));
  });

  it("offers Look at it only while a preview is shown", () => {
    const shown = mount({ on: true, working: false, shown: true, note: null });
    expect(shown.show()?.textContent).toBe(t("lid.preview.show"));
    act(() => shown.show()!.click());
    expect(shown.shows()).toBe(1);
    act(() => root?.unmount());
    expect(mount({ on: true, working: false, shown: false, note: "x" }).show()).toBeNull();
  });

  it("shows no status when switched off, and nothing at all without a preview", () => {
    const off = mount({ on: false, working: false, shown: false, note: null });
    expect(off.toggle()?.checked).toBe(false);
    expect(off.status()).toBeNull();
    act(() => root?.unmount());
    expect(mount(null).panel.querySelector('[data-testid="lid-preview"]')).toBeNull();
  });
});

describe("the lid preview in the view", () => {
  const box = (id: string, x: number): WorkplaneShape => ({ id, name: id, kind: "box", x, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 4, rotation: 0, color: "#d41721" }) as WorkplaneShape;
  const state = () => ({ scene: new THREE.Scene(), needsRender: false }) as unknown as ThreeState;

  it("draws every part grey and see-through, taking no clicks, and goes again when there is nothing to show", () => {
    const view = state();
    const parts: LidPreviewPart[] = [{ shape: box("lid", 30), role: "lid" }, { shape: box("clip", 50), role: "loose" }, { shape: box("post", 0), role: "body" }];
    syncLidPreviewOverlay(view, parts);
    const group = lidPreviewGroup(view);
    expect(group?.parent).toBe(view.scene);
    expect(group?.children.map((child) => child.userData.lidPreviewRole)).toEqual(["lid", "loose", "body"]);
    const meshes: THREE.Mesh[] = [];
    group!.traverse((child) => { if (child instanceof THREE.Mesh) meshes.push(child); });
    expect(meshes.length).toBeGreaterThanOrEqual(3);
    for (const mesh of meshes) {
      const material = mesh.material as THREE.MeshLambertMaterial;
      expect(material.transparent).toBe(true);
      expect(material.opacity).toBeLessThan(1);
      expect(material.color.getHexString()).not.toBe("d41721");
      const hits: THREE.Intersection[] = [];
      mesh.raycast(new THREE.Raycaster(new THREE.Vector3(30, 50, 0), new THREE.Vector3(0, -1, 0)), hits);
      expect(hits).toEqual([]);
    }
    // The box round it takes in all three parts.
    const bounds = lidPreviewBounds(view)!;
    expect(bounds.min.x).toBeLessThanOrEqual(-5 + 1e-6);
    expect(bounds.max.x).toBeGreaterThanOrEqual(55 - 1e-6);
    expect(view.needsRender).toBe(true);

    syncLidPreviewOverlay(view, null);
    expect(lidPreviewGroup(view)).toBeNull();
    expect(view.scene.children).toHaveLength(0);
    expect(lidPreviewBounds(view)).toBeNull();
  });
});
