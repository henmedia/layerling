// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { EDITOR_PROFILE_ELEMENT_ID, EDITOR_PROFILE_MAX_LENGTH, parseEditorProfile, profileBooleanValue, profileToolVisible } from "@/lib/editorProfile";
import { SIMPLE_MODE_BOOT_SCRIPT, SIMPLE_MODE_STORAGE_KEY, simpleModeKeepsTool } from "@/lib/simpleMode";

describe("an editor profile", () => {
  it("overrides individual tools and inherits the layout for omitted tools", () => {
    const profile = parseEditorProfile(JSON.stringify({
      version: 1,
      base: "simple",
      enlargeInSimpleMode: false,
      tools: { "print-check": { visible: true }, lid: { visible: false }, flexi: { visible: "false" } },
    }));
    expect(profile?.base).toBe("simple");
    expect(profile?.enlargeInSimpleMode).toBe(false);
    const visible = (id: string) => profileToolVisible(profile, id, simpleModeKeepsTool(id));
    expect(visible("print-check")).toBe(true);
    expect(visible("lid")).toBe(false);
    expect(visible("flexi")).toBe(true);
    expect(visible("split")).toBe(false);
    expect(profileToolVisible(null, "lid", true)).toBe(true);
  });

  it("ignores unsupported versions, malformed JSON, oversized profiles and invalid values", () => {
    expect(parseEditorProfile("{")).toBeNull();
    expect(parseEditorProfile('{"version":2}')).toBeNull();
    expect(parseEditorProfile(" ".repeat(EDITOR_PROFILE_MAX_LENGTH) + '{"version":1}')).toBeNull();
    const profile = parseEditorProfile('{"version":1,"base":"other","tools":{"__proto__":{"visible":true},"fillet":{"options":{"amount":{"default":-1},"onlyVisibleEdges":{"locked":true}}}}}');
    expect(profile?.base).toBeUndefined();
    expect(profile?.tools.__proto__).toBeUndefined();
    expect(profile?.tools.fillet.options?.amount).toBeUndefined();
    expect(profile?.tools.fillet.options?.onlyVisibleEdges?.locked).toBe(false);
  });

  it("validates a fillet radius and distinguishes a remembered value from a locked option", () => {
    const profile = parseEditorProfile('{"version":1,"tools":{"fillet":{"options":{"amount":{"default":2},"onlyVisibleEdges":{"visible":false,"default":true,"locked":true}}}}}');
    const options = profile?.tools.fillet.options;
    expect(options?.amount?.default).toBe(2);
    expect(options?.onlyVisibleEdges?.visible).toBe(false);
    expect(profileBooleanValue(options?.onlyVisibleEdges, false)).toBe(true);
    expect(profileBooleanValue({ default: true }, false)).toBe(false);
    expect(profileBooleanValue({ default: true }, undefined)).toBe(true);
    expect(profileBooleanValue(undefined, false)).toBe(false);
  });
});

describe("starting with a host-selected layout", () => {
  afterEach(() => {
    document.getElementById(EDITOR_PROFILE_ELEMENT_ID)?.remove();
    delete document.documentElement.dataset.simpleMode;
    delete document.documentElement.dataset.simpleModeEnlarge;
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
  });

  it.each([["simple", "full", "on"], ["full", "simple", undefined]])("uses %s even with a link asking for %s", (base, mode, expected) => {
    const script = document.createElement("script");
    script.type = "application/json";
    script.id = EDITOR_PROFILE_ELEMENT_ID;
    script.textContent = JSON.stringify({ version: 1, base });
    document.head.appendChild(script);
    window.history.replaceState(null, "", `/?editor=1&mode=${mode}`);
    window.localStorage.setItem(SIMPLE_MODE_STORAGE_KEY, "off");
    Function(SIMPLE_MODE_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.simpleMode).toBe(expected);
    expect(window.location.search).toBe("?editor=1");
    expect(window.localStorage.getItem(SIMPLE_MODE_STORAGE_KEY)).toBe("off");
  });

  it("reads a profile parsed during startup before applying the normal server and browser choices", async () => {
    vi.resetModules();
    const readyState = vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    try {
      const mode = await import("@/lib/simpleMode");
      expect(mode.getSimpleMode()).toBe(false);
      const script = document.createElement("script");
      script.type = "application/json";
      script.id = EDITOR_PROFILE_ELEMENT_ID;
      script.textContent = '{"version":1,"base":"full","enlargeInSimpleMode":false}';
      document.head.appendChild(script);
      mode.setServerSimpleMode("always");
      mode.setSimpleMode(true);
      expect(mode.isSimpleModeFixed()).toBe(true);
      expect(document.documentElement.dataset.simpleModeEnlarge).toBe("off");
      expect(mode.getSimpleMode()).toBe(false);
      expect(window.localStorage.getItem(SIMPLE_MODE_STORAGE_KEY)).toBeNull();
    } finally {
      readyState.mockRestore();
    }
  });

  it("opts out of larger simple-mode controls before the page paints", () => {
    const script = document.createElement("script");
    script.type = "application/json";
    script.id = EDITOR_PROFILE_ELEMENT_ID;
    script.textContent = '{"version":1,"base":"simple","enlargeInSimpleMode":false}';
    document.head.appendChild(script);
    Function(SIMPLE_MODE_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.simpleMode).toBe("on");
    expect(document.documentElement.dataset.simpleModeEnlarge).toBe("off");
  });

  it("keeps the ordinary link behavior without a profile", () => {
    window.history.replaceState(null, "", "/?mode=simple");
    Function(SIMPLE_MODE_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.simpleMode).toBe("on");
    expect(window.localStorage.getItem(SIMPLE_MODE_STORAGE_KEY)).toBe("on");
    expect(document.documentElement.dataset.simpleModeEnlarge).toBeUndefined();
  });
});
