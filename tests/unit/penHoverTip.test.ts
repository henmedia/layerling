// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { helpNameOf } from "@/lib/guideHelp";
import { holdTitle, hoverTipFor, hoverTitled, PEN_TIP_HALF_WIDTH, penTipPosition } from "@/lib/penHoverTip";

const screen = { width: 1180, height: 820 };

describe("penTipPosition", () => {
  it("puts the text under the middle of the control", () => {
    const place = penTipPosition({ left: 500, right: 540, top: 100, bottom: 140 }, screen);
    expect(place.left).toBe(520);
    expect(place.top).toBe(148);
    expect(place.above).toBe(false);
  });

  it("keeps the text on the screen at the left and right edge", () => {
    expect(penTipPosition({ left: 0, right: 30, top: 100, bottom: 140 }, screen).left).toBe(PEN_TIP_HALF_WIDTH + 8);
    expect(penTipPosition({ left: 1150, right: 1180, top: 100, bottom: 140 }, screen).left).toBe(screen.width - PEN_TIP_HALF_WIDTH - 8);
  });

  it("goes above the control when there is no room below", () => {
    const place = penTipPosition({ left: 500, right: 540, top: 780, bottom: 815 }, screen);
    expect(place.above).toBe(true);
    expect(place.top).toBeLessThan(780);
  });

  it("stays usable on a screen narrower than the text", () => {
    const place = penTipPosition({ left: 10, right: 40, top: 100, bottom: 140 }, { width: 200, height: 500 });
    expect(place.left).toBeGreaterThan(0);
  });
});

describe("hoverTipFor", () => {
  it("gives the pen its bubble only on an iPad or iPhone", () => {
    expect(hoverTipFor("pen", { appleTouch: true, installedApp: false })).toBe(true);
    expect(hoverTipFor("pen", { appleTouch: false, installedApp: false })).toBe(false);
  });

  it("gives the mouse its bubble only in the installed app (#1013)", () => {
    expect(hoverTipFor("mouse", { appleTouch: false, installedApp: true })).toBe(true);
    expect(hoverTipFor("mouse", { appleTouch: false, installedApp: false })).toBe(false);
    expect(hoverTipFor("mouse", { appleTouch: true, installedApp: false })).toBe(false);
  });

  it("never gives a finger one", () => {
    expect(hoverTipFor("touch", { appleTouch: true, installedApp: true })).toBe(false);
  });
});

describe("holdTitle", () => {
  const button = () => {
    document.body.innerHTML = '<button title="Import (Ctrl+I)"><span>icon</span></button>';
    return document.querySelector("button")!;
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("takes the title off while held and puts it back", () => {
    const element = button();
    const release = holdTitle(element);
    expect(element.hasAttribute("title")).toBe(false);
    expect(hoverTitled(element.querySelector("span"))?.text).toBe("Import (Ctrl+I)");
    release();
    expect(element.getAttribute("title")).toBe("Import (Ctrl+I)");
    expect(element.hasAttribute("data-hover-title")).toBe(false);
  });

  it("also takes off a title set again while held, and puts back the newest", async () => {
    const element = button();
    const release = holdTitle(element);
    element.title = "Export";
    await settle();
    expect(element.hasAttribute("title")).toBe(false);
    expect(hoverTitled(element)?.text).toBe("Export");
    release();
    expect(element.getAttribute("title")).toBe("Export");
  });

  it("keeps the keys when the editor names the button after its label meanwhile", async () => {
    document.body.innerHTML = '<button title="Redo (Ctrl+Y)" aria-label="Redo"></button>';
    const element = document.querySelector("button")!;
    const release = holdTitle(element);
    element.title = "Redo";
    await settle();
    expect(element.hasAttribute("title")).toBe(false);
    expect(hoverTitled(element)?.text).toBe("Redo (Ctrl+Y)");
    release();
    expect(element.getAttribute("title")).toBe("Redo (Ctrl+Y)");
  });

  it("leaves the Interactive Help the name of a held control", () => {
    const element = button();
    const release = holdTitle(element);
    expect(helpNameOf(element)).toBe("Import");
    release();
  });
});
