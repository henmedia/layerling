// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTO_TITLE, applyAutoTitles, buttonLabel, watchAutoTitles } from "@/lib/autoButtonTitles";
import { holdTitle } from "@/lib/penHoverTip";

// The Export button as TopActionPanel.tsx draws it: the LYL label as text, the other formats' label in a hidden span.
function exportButton(format: "stl" | "lyl") {
  document.body.innerHTML = `<button class="export-primary-button"><svg></svg>${format === "lyl" ? "Save layerling design" : ""}<span ${format === "lyl" ? "hidden" : ""}>Export ${format.toUpperCase()}</span></button>`;
  return document.querySelector("button")!;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("titles the editor gives buttons (Discussion #1449)", () => {
  it("names a button after the label it shows, not after a hidden one", () => {
    expect(buttonLabel(exportButton("lyl"))).toBe("Save layerling design");
    expect(buttonLabel(exportButton("stl"))).toBe("Export STL");
  });

  it("follows the label when the format changes", () => {
    const button = exportButton("stl");
    applyAutoTitles(document);
    expect(button.title).toBe("Export STL");
    const span = button.querySelector("span")!;
    button.insertBefore(document.createTextNode("Save layerling design"), span);
    span.hidden = true;
    applyAutoTitles(document);
    expect(button.title).toBe("Save layerling design");
    expect(button.getAttribute(AUTO_TITLE)).toBe("Save layerling design");
  });

  it("leaves a title from React alone", () => {
    document.body.innerHTML = '<button title="Redo (Ctrl+Y)" aria-label="Redo"></button>';
    applyAutoTitles(document);
    expect(document.querySelector("button")!.title).toBe("Redo (Ctrl+Y)");
  });

  it("takes its own title off again when the label goes", () => {
    document.body.innerHTML = "<button>Undo</button>";
    const button = document.querySelector("button")!;
    applyAutoTitles(document);
    expect(button.title).toBe("Undo");
    button.textContent = "";
    applyAutoTitles(document);
    expect(button.hasAttribute("title")).toBe(false);
    expect(button.hasAttribute(AUTO_TITLE)).toBe(false);
  });

  it("waits while the hover bubble holds the button, and catches up when it lets go", () => {
    const button = exportButton("stl");
    applyAutoTitles(document);
    const release = holdTitle(button);
    button.querySelector("span")!.textContent = "Export OBJ";
    applyAutoTitles(document);
    expect(button.hasAttribute("title")).toBe(false);
    release();
    expect(button.title).toBe("Export STL");
    applyAutoTitles(document);
    expect(button.title).toBe("Export OBJ");
  });

  it("brings the titles up to date once a frame after a label's text changes", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    const button = exportButton("stl");
    const stop = watchAutoTitles(document);
    expect(button.title).toBe("Export STL");
    button.querySelector("span")!.firstChild!.nodeValue = "Export 3MF";
    await Promise.resolve();
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(button.title).toBe("Export 3MF");
    stop();
  });
});
