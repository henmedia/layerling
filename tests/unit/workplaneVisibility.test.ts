import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GridEyeIcon } from "@/components/GridEyeIcon";
import { MESSAGES_DE } from "@/lib/messages.de";
import { MESSAGES_EN } from "@/lib/messages.en";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8");

const SLASH = 'd="M4 2.5 20 12.5"';

describe("the grid-and-eye icon", () => {
  it("draws the plate, its grid and the eye on Lucide's 24 grid", () => {
    const markup = renderToStaticMarkup(createElement(GridEyeIcon));
    expect(markup).toContain('viewBox="0 0 24 24"');
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('d="M12 14 22 18 12 22 2 18Z"');
    expect(markup).toContain('d="M7 16 17 20M17 16 7 20"');
    expect(markup).toContain("<circle");
    expect(markup).not.toContain(SLASH);
  });

  it("strikes the eye through only when crossed", () => {
    expect(renderToStaticMarkup(createElement(GridEyeIcon, { crossed: true }))).toContain(SLASH);
    expect(renderToStaticMarkup(createElement(GridEyeIcon, { crossed: false }))).not.toContain(SLASH);
  });

  it("takes size, stroke width and passes other props through", () => {
    const markup = renderToStaticMarkup(createElement(GridEyeIcon, { size: 25, strokeWidth: 2.1, "aria-hidden": "true" }));
    expect(markup).toContain('width="25"');
    expect(markup).toContain('height="25"');
    expect(markup).toContain('stroke-width="2.1"');
    expect(markup).toContain('aria-hidden="true"');
    // The thin grid lines keep their own width whatever the outline is.
    expect(markup).toContain('stroke-width="1.5"');
  });

  it("does not leak crossed onto the svg element", () => {
    expect(renderToStaticMarkup(createElement(GridEyeIcon, { crossed: true }))).not.toContain("crossed");
  });
});

describe("hiding the workplane from the camera bar", () => {
  const viewport = read("apps/web/src/components/WorkplaneViewport.tsx");
  const button = viewport.slice(
    viewport.indexOf('<div className="workplane-display-control-group">'),
    viewport.indexOf('<div className="workplane-control-group">'),
  );

  it("sits right below the orthographic button, above Place workplane", () => {
    const ortho = viewport.indexOf("onClick={toggleProjection}");
    const display = viewport.indexOf('<div className="workplane-display-control-group">');
    const place = viewport.indexOf('<div className="workplane-control-group">');
    expect(ortho).toBeGreaterThan(-1);
    expect(display).toBeGreaterThan(ortho);
    expect(place).toBeGreaterThan(display);
  });

  it("is a pressed toggle named for what a click does next", () => {
    expect(button).toContain("aria-pressed={workplaneLayerHidden}");
    expect(button).toContain('workplaneLayerHidden ? t("camera.showWorkplane") : t("camera.hideWorkplane")');
    expect(button).toContain("setWorkplaneLayerHidden((current) => !current)");
    expect(button).toContain("crossed={workplaneLayerHidden}");
  });

  it("hides the whole workplane layer, also on a scene built while it is hidden", () => {
    // On a change: the layer that holds plate, grid, labels and face workplane.
    expect(viewport).toMatch(/state\.workplaneLayer\.visible = !workplaneLayerHidden;\s*state\.needsRender = true;\s*\}, \[workplaneLayerHidden\]\);/);
    // On a new scene: read through the ref. The effect above runs before the
    // scene exists on mount, so this is what hides a plate built while hidden.
    expect(viewport).toMatch(/threeRef\.current = state;\s*rebuildWorkplane\([^\n]*\);\s*state\.workplaneLayer\.visible = !workplaneLayerHiddenRef\.current;/);
    expect(viewport).toContain("workplaneLayerHiddenRef.current = workplaneLayerHidden;");
  });

  it("keeps the face workplane's eye under its own name", () => {
    expect(viewport).toContain('workplaneHidden ? t("camera.showFaceWorkplane") : t("camera.hideFaceWorkplane")');
  });

  it("joins the tools in the two-column bar of a flat window, so plus and minus stay side by side", () => {
    const css = read("apps/web/src/app/globals.css");
    const compact = css.slice(css.indexOf("@container workplane (max-height: 660px)"));
    expect(compact).toMatch(/\.camera-controls > \.camera-group \{\s*display: grid;\s*grid-template-columns: repeat\(2, auto\);\s*grid-column: 1 \/ -1;/);
  });
});

describe("workplane visibility labels and guide", () => {
  it("names the two eyes differently in every language", () => {
    for (const messages of [MESSAGES_EN, MESSAGES_DE]) {
      const names = [
        messages["camera.hideWorkplane"],
        messages["camera.showWorkplane"],
        messages["camera.hideFaceWorkplane"],
        messages["camera.showFaceWorkplane"],
      ];
      expect(names.every(Boolean)).toBe(true);
      expect(new Set(names).size).toBe(names.length);
    }
    expect(MESSAGES_EN["camera.hideWorkplane"]).toBe("Hide workplane");
    expect(MESSAGES_EN["camera.showWorkplane"]).toBe("Show workplane");
  });

  it("describes the button in the camera bar section of both guides", () => {
    const chapters = {
      "docs/guide/en/02-view-and-workplane.md": "### The camera bar",
      "docs/guide/de/02-ansicht-und-arbeitsebene.md": "### Die Kameraleiste",
    };
    for (const [chapter, heading] of Object.entries(chapters)) {
      const text = read(chapter);
      const start = text.indexOf(heading);
      expect(start, chapter).toBeGreaterThan(-1);
      const bar = text.slice(start, text.indexOf("\n## ", start));
      expect(bar, chapter).toContain("{{ui:camera.hideWorkplane}}");
      expect(bar.indexOf("{{ui:camera.hideWorkplane}}"), chapter).toBeLessThan(bar.indexOf("{{ui:camera.placeWorkplane}}"));
    }
  });
});
