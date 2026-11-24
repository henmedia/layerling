// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { MESSAGES_EN } from "@/lib/messages.en";
import { SETTINGS_KEYWORDS } from "@/lib/settingsKeywords";
import { applySettingsSearch, clearSettingsSearch, closeSearchOpened, matchRanges, matchSetting } from "@/lib/settingsSearch";

const row = (id: string, label: string, hint = "", body = "") =>
  `<label class="workspace-toggle" id="${id}" data-help="${label}"><span><span>${label}</span><small>${hint}</small></span>${body}</label>`;

const WINDOW = `
  <section data-settings-section="controls">
    <div class="workspace-section-heading"><strong>Steuerung</strong><span>Maus und Kamera</span></div>
    ${row("zoom", "Zoomgeschwindigkeit", "langsam")}
    ${row("pan", "Verschieben", "Wie weit ein Dreh am Rad zoomt")}
    <hr id="line" />
    ${row("inertia", "Trägheit")}
    <p id="inertia-note">Die Fläche läuft nach.</p>
  </section>
  <section data-settings-section="workplane">
    <div class="workspace-section-heading"><strong>Arbeitsebene</strong></div>
    ${row("printer", "Drucker", "", "<select><option>Keiner</option><option>Bambu Lab A1</option><option>Bambu Lab X1</option><option>Prusa MK4</option></select>")}
    <details class="ribbon-buttons-group" id="group"><summary id="summary">Ansicht</summary><div class="ribbon-buttons-tools">${row("fit", "Zoom auf alles")}${row("flat", "Flach")}</div></details>
  </section>
  <section data-settings-section="output"><div class="workspace-section-heading"><strong>Ausgabe</strong></div>${row("stl", "STL")}</section>`;

const KEYWORDS = new Map([["Zoomgeschwindigkeit", ["Mausrad", "mouse wheel"]]]);
let root: HTMLElement;
let kept: WeakSet<Element>;
const run = (query: string, mode: "filter" | "mark" = "filter") => {
  kept = new WeakSet();
  return applySettingsSearch(root, { query, mode, keywords: KEYWORDS, kept });
};
const shown = (id: string) => !root.querySelector(`#${id}`)!.closest("[data-search-hidden]");
const at = (id: string) => root.querySelector(`#${id}`)!;

describe("the search in the settings window", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="root">${WINDOW}</div>`;
    root = document.querySelector("#root")!;
  });

  it("leaves the settings that match, of every tab, and counts them", () => {
    expect(run("Zoom")).toEqual({ controls: 2, workplane: 1, output: 0 });
    expect(["zoom", "pan", "fit"].every(shown)).toBe(true);
    expect(["inertia", "inertia-note", "line", "printer", "flat", "stl"].some(shown)).toBe(false);
  });

  it("opens a folded group for a hit inside and folds it shut again", () => {
    const group = at("group") as HTMLDetailsElement;
    run("zoom");
    expect(group.open).toBe(true);
    run("Prusa");
    expect(group.open).toBe(false);
    group.open = true;
    run("zoom");
    clearSettingsSearch(root);
    closeSearchOpened(root);
    expect(group.open).toBe(true);
    expect(root.querySelector("[data-search-hidden], [data-search-hit]")).toBeNull();
  });

  it("finds a choice of a menu and names it", () => {
    expect(run("drucker bambu a1").workplane).toBe(1);
    expect(at("printer").getAttribute("data-search-options")).toBe("Bambu Lab A1");
    run("Drucker");
    expect(at("printer").hasAttribute("data-search-options")).toBe(false);
  });

  it("finds a setting by a note below it, by another word and in both umlaut spellings", () => {
    expect(run("flaeche").controls).toBe(1);
    expect(shown("inertia") && shown("inertia-note")).toBe(true);
    expect(run("mausrad").controls).toBe(1);
    expect(shown("zoom")).toBe(true);
    expect(run("traegheit").controls).toBe(1);
    expect(run("tragheit").controls).toBe(1);
  });

  it("shows a whole tab for its name when nothing in it goes by that name", () => {
    expect(run("Ausgabe").output).toBe(1);
    expect(shown("stl")).toBe(true);
  });

  it("finds nothing for an unknown word, and hides nothing when it only marks", () => {
    expect(Object.values(run("xyzzy")).every((count) => count === 0)).toBe(true);
    run("zoom", "mark");
    expect(root.querySelector("[data-search-hidden]")).toBeNull();
    expect(at("zoom").hasAttribute("data-search-hit")).toBe(true);
    expect(at("inertia").hasAttribute("data-search-hit")).toBe(false);
  });

  it("keeps a setting whose hint changes while it is being changed", () => {
    run("langsam");
    at("zoom").querySelector("small")!.textContent = "schnell";
    const again = applySettingsSearch(root, { query: "langsam", mode: "filter", keywords: KEYWORDS, kept });
    expect(again.controls).toBe(1);
  });

  it("marks the places that match", () => {
    expect(matchRanges("zoom", "Zoomgeschwindigkeit")).toEqual([[0, 4]]);
    expect(matchRanges("flaeche", "Die Fläche")).toEqual([[4, 10]]);
    expect(matchSetting("a1", "Drucker", ["Bambu Lab A1"])).toEqual({ options: ["Bambu Lab A1"] });
    expect(matchSetting("?", "Drucker", [])).toBeNull();
  });

  it("gives extra words to settings that exist", () => {
    for (const key of Object.keys(SETTINGS_KEYWORDS)) expect(MESSAGES_EN, key).toHaveProperty([key]);
  });
});
