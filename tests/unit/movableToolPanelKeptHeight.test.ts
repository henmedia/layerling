// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom lays nothing out: the editor area is 1000 x 700, the title bar ends 64 px down, the buttons' row is 60 px high.
const layout: Record<string, Partial<Record<"offsetTop" | "offsetHeight" | "clientWidth" | "clientHeight", number>>> = {
  "workplane-stage": { clientWidth: 1000, clientHeight: 700 },
  movable: { offsetTop: 14, offsetHeight: 50 },
  "edge-modifier-footer": { offsetHeight: 60 },
};
for (const name of ["offsetTop", "offsetHeight", "clientWidth", "clientHeight"] as const) {
  vi.spyOn(HTMLElement.prototype, name, "get").mockImplementation(function (this: HTMLElement) {
    return layout[this.classList[0] ?? ""]?.[name] ?? 0;
  });
}

let host: HTMLDivElement | null = null;
afterEach(() => {
  host?.remove();
  host = null;
  window.localStorage.clear();
});

/** Opens a tool panel `height` px high at a remembered spot near the foot of the area. */
function openAt(top: number, height: number) {
  window.localStorage.setItem("layerling.editor.toolPanelPosition", JSON.stringify({ left: 100, top }));
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return { left: 0, top: 0, right: 0, bottom: 0, x: 0, y: 0, width: 0, height: this.tagName === "ASIDE" ? height : 0, toJSON: () => ({}) } as DOMRect;
  });
  host = document.createElement("div");
  host.className = "workplane-stage";
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(createElement(MovableToolPanel, { className: "edge-modifier-panel", ariaLabel: "Fillet edges" }, () => [
      createElement("div", { key: "h", className: "movable" }, "Fillet edges"),
      createElement("div", { key: "f", className: "edge-modifier-footer" }, "Cancel Apply"),
    ]));
  });
  return host.querySelector("aside") as HTMLElement;
}

describe("a tool panel at a remembered spot low in the editor area", () => {
  it("keeps its title bar, about three rows and its buttons in view", () => {
    const panel = openAt(690, 600);
    // 64 for the title bar, 120 for the rows, 60 for the buttons.
    expect(panel.style.top).toBe(`${700 - 244}px`);
    expect(panel.style.maxHeight).toBe("244px");
  });

  it("stays inside whole when it is shorter than that", () => {
    expect(openAt(690, 150).style.top).toBe(`${700 - 150}px`);
  });

  it("stays where it was put when that leaves enough in view", () => {
    expect(openAt(300, 600).style.top).toBe("300px");
  });
});
