import { describe, expect, it } from "vitest";
import { DEFAULT_WORKPLANE_WORKSPACE, normalizeWorkspaceSettings } from "../../apps/web/src/lib/workplaneSettings";
import {
  buildSettingsFile,
  parseSettingsFile,
  readBrowserSettings,
  SETTINGS_FILE_FORMAT,
  settingsFileName,
  settingsFileText,
} from "../../apps/web/src/lib/settingsFile";

function storage(values: Record<string, string>) {
  return { getItem: (key: string) => values[key] ?? null };
}

const NOW = new Date("2026-11-06T22:00:00Z");

describe("settings file (Discussion #1407)", () => {
  it("gives back what was written, without the design's plates", () => {
    const workspace = normalizeWorkspaceSettings({ ...DEFAULT_WORKPLANE_WORKSPACE, background: "#112233", plates: ["A", "B"] });
    const browser = readBrowserSettings(storage({
      "layerling.theme": "dark",
      "layerling.toolbarSize": "large",
      "layerling.viewCubePosition": "bottom-left",
      "layerling.shapeColors": "off",
      "layerling.printerPlays": JSON.stringify({ "some-printer": 0.15, broken: "x" }),
      "layerling.customShortcuts": JSON.stringify({ center: { combo: "Shift+C", label: "Center on workplane" }, "object-1": { combo: "J", label: "a body" } }),
    }));
    expect(browser).toEqual({
      theme: "dark",
      toolbarSize: "large",
      viewCubePosition: "bottom-left",
      shapeColors: false,
      printerPlays: { "some-printer": 0.15 },
      customShortcuts: { center: { combo: "Shift+C", label: "Center on workplane" } },
    });
    const parsed = parseSettingsFile(settingsFileText(buildSettingsFile(workspace, "2.0 mm", browser, NOW)));
    expect(parsed).not.toBeNull();
    expect(parsed!.workspace.background).toBe("#112233");
    expect(parsed!.workspace.plates).toBeUndefined();
    expect(parsed!.snap).toBe("2.0 mm");
    expect(parsed!.browser).toEqual(browser);
  });

  it("reads a browser that never chose anything as the start", () => {
    expect(readBrowserSettings(storage({}))).toEqual({
      theme: "system",
      toolbarSize: "medium",
      viewCubePosition: "top-left",
      shapeColors: true,
      printerPlays: {},
      customShortcuts: {},
    });
    expect(readBrowserSettings(null).shapeColors).toBe(true);
  });

  it("refuses what is not a layerling settings file", () => {
    expect(parseSettingsFile("not json")).toBeNull();
    expect(parseSettingsFile("[]")).toBeNull();
    expect(parseSettingsFile(JSON.stringify({ format: "other", version: 1, workspace: {} }))).toBeNull();
    expect(parseSettingsFile(JSON.stringify({ format: SETTINGS_FILE_FORMAT, version: 99, workspace: {} }))).toBeNull();
    expect(parseSettingsFile(JSON.stringify({ format: SETTINGS_FILE_FORMAT, version: 1 }))).toBeNull();
    expect(parseSettingsFile("x".repeat(2_000_001))).toBeNull();
  });

  it("brings wrong values back into range instead of taking them over", () => {
    const parsed = parseSettingsFile(JSON.stringify({
      format: SETTINGS_FILE_FORMAT,
      version: 1,
      workspace: {},
      snap: "no such grid",
      browser: { theme: "pink", toolbarSize: 7, shapeColors: "yes", printerPlays: { a: -1, b: 0.2 } },
    }));
    expect(parsed).not.toBeNull();
    expect(parsed!.workspace.background).toBe(DEFAULT_WORKPLANE_WORKSPACE.background);
    expect(parsed!.snap).toBe("1.0 mm");
    expect(parsed!.browser.theme).toBe("system");
    expect(parsed!.browser.toolbarSize).toBe("medium");
    expect(parsed!.browser.shapeColors).toBe(true);
    expect(parsed!.browser.printerPlays).toEqual({ b: 0.2 });
  });

  it("carries your own keys (Discussion #1399), and a file from before them leaves the keys alone", () => {
    const withKeys = parseSettingsFile(JSON.stringify({
      format: SETTINGS_FILE_FORMAT,
      version: 1,
      workspace: {},
      browser: { customShortcuts: { "shapes-panel": { combo: "shift+ctrl+k", label: "Shapes" }, center: { combo: "Space", label: "no key" } } },
    }));
    // Modifiers in the wrong case or order are not ours to guess; a key that cannot carry a command is dropped.
    expect(withKeys!.browser.customShortcuts).toEqual({});
    const sound = parseSettingsFile(JSON.stringify({
      format: SETTINGS_FILE_FORMAT,
      version: 1,
      workspace: {},
      browser: { customShortcuts: { "shapes-panel": { combo: "Shift+Ctrl+K", label: "Shapes" } } },
    }));
    expect(sound!.browser.customShortcuts).toEqual({ "shapes-panel": { combo: "Ctrl+Shift+K", label: "Shapes" } });
    const older = parseSettingsFile(JSON.stringify({ format: SETTINGS_FILE_FORMAT, version: 1, workspace: {}, browser: { theme: "dark" } }));
    expect(older!.browser.customShortcuts).toBeUndefined();
  });

  it("names the download after the day", () => {
    expect(settingsFileName(NOW)).toBe("layerling-settings-2026-11-06.json");
  });
});
