import { normalizeAppThemePreference, type AppThemePreference } from "@/lib/appTheme";
import { CUSTOM_SHORTCUTS_STORAGE_KEY, normalizeCustomShortcuts, type CustomShortcuts } from "@/lib/customShortcuts";
import { normalizePrinterPlay, PRINTER_PLAYS_STORAGE_KEY } from "@/lib/printerPlay";
import { normalizeShapeColors, SHAPE_COLORS_STORAGE_KEY } from "@/lib/shapeColors";
import { normalizeToolbarSize, TOOLBAR_SIZE_STORAGE_KEY, type ToolbarSize } from "@/lib/toolbarSize";
import { normalizeViewCubePosition, VIEW_CUBE_POSITION_STORAGE_KEY, type ViewCubePosition } from "@/lib/viewCubePosition";
import { APP_THEME_STORAGE_KEY } from "@/lib/appTheme";
import { DEFAULT_SNAP_GRID, normalizeSnapGrid, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";
import type { GridSize, WorkplaneWorkspaceSettings } from "@/types/layerling";

/**
 * The settings of the settings window in a file (Discussion #1407): the colours, grid, shadows, camera and shape
 * starts of the window, and the few choices of this browser that sit beside them (theme, toolbar size, view cube,
 * shape colours, the play of each printer, your own keys of #1399). It is what a person sets up once and wants back on another computer or
 * after the browser's data went. Nothing of a design is in it: not its plates, not its objects.
 */
export const SETTINGS_FILE_FORMAT = "layerling-settings";
export const SETTINGS_FILE_VERSION = 1;
/** A settings file is a few kilobytes; one far beyond that is not one. */
export const SETTINGS_FILE_MAX_BYTES = 2_000_000;

export type BrowserSettings = {
  theme: AppThemePreference;
  toolbarSize: ToolbarSize;
  viewCubePosition: ViewCubePosition;
  shapeColors: boolean;
  /** The play of each printer, from the printer's id to millimetres. */
  printerPlays: Record<string, number>;
  /**
   * Your own keys (Discussion #1399), by command. Always written; read from a file only when it has them, so a file
   * saved before they existed leaves the keys of this browser alone.
   */
  customShortcuts?: CustomShortcuts;
};

export type SettingsFile = {
  format: typeof SETTINGS_FILE_FORMAT;
  version: number;
  savedAt: string;
  workspace: WorkplaneWorkspaceSettings;
  snap: GridSize;
  browser: BrowserSettings;
};

/** The file name a download gets: layerling-settings-2026-11-06.json. */
export function settingsFileName(now: Date) {
  return `layerling-settings-${now.toISOString().slice(0, 10)}.json`;
}

function readText(storage: Pick<Storage, "getItem"> | null, key: string) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function normalizePrinterPlays(value: unknown): Record<string, number> {
  const plays: Record<string, number> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return plays;
  for (const [printer, play] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizePrinterPlay(play);
    if (normalized !== null && printer.length > 0 && printer.length <= 200) plays[printer] = normalized;
  }
  return plays;
}

/** The choices of this browser that go into the file, as they are stored now. */
export function readBrowserSettings(storage: Pick<Storage, "getItem"> | null): BrowserSettings {
  let printerPlays: Record<string, number> = {};
  try {
    printerPlays = normalizePrinterPlays(JSON.parse(readText(storage, PRINTER_PLAYS_STORAGE_KEY) ?? "{}"));
  } catch {
    printerPlays = {};
  }
  let customShortcuts: CustomShortcuts = {};
  try {
    customShortcuts = normalizeCustomShortcuts(JSON.parse(readText(storage, CUSTOM_SHORTCUTS_STORAGE_KEY) ?? "{}"));
  } catch {
    customShortcuts = {};
  }
  return {
    theme: normalizeAppThemePreference(readText(storage, APP_THEME_STORAGE_KEY)),
    toolbarSize: normalizeToolbarSize(readText(storage, TOOLBAR_SIZE_STORAGE_KEY)),
    viewCubePosition: normalizeViewCubePosition(readText(storage, VIEW_CUBE_POSITION_STORAGE_KEY)),
    shapeColors: normalizeShapeColors(readText(storage, SHAPE_COLORS_STORAGE_KEY)),
    printerPlays,
    customShortcuts,
  };
}

export function buildSettingsFile(
  workspace: WorkplaneWorkspaceSettings,
  snap: GridSize,
  browser: BrowserSettings,
  now: Date,
): SettingsFile {
  return {
    format: SETTINGS_FILE_FORMAT,
    version: SETTINGS_FILE_VERSION,
    savedAt: now.toISOString(),
    // A design's plates are its own, as in "Make default".
    workspace: { ...normalizeWorkspaceSettings(workspace), plates: undefined },
    snap: normalizeSnapGrid(snap, DEFAULT_SNAP_GRID),
    browser,
  };
}

export function settingsFileText(file: SettingsFile) {
  return `${JSON.stringify(file, null, 2)}\n`;
}

/**
 * What a settings file holds, each value brought into range the way the app reads its own storage, or null when the
 * text is not a layerling settings file (not JSON, another format, or a newer version than this one knows).
 */
export function parseSettingsFile(text: string): SettingsFile | null {
  if (text.length > SETTINGS_FILE_MAX_BYTES) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const file = raw as Record<string, unknown>;
  if (file.format !== SETTINGS_FILE_FORMAT) return null;
  if (typeof file.version !== "number" || file.version < 1 || file.version > SETTINGS_FILE_VERSION) return null;
  if (!file.workspace || typeof file.workspace !== "object") return null;
  const browser = file.browser && typeof file.browser === "object" ? (file.browser as Record<string, unknown>) : {};
  return {
    format: SETTINGS_FILE_FORMAT,
    version: SETTINGS_FILE_VERSION,
    savedAt: typeof file.savedAt === "string" ? file.savedAt : "",
    workspace: { ...normalizeWorkspaceSettings(file.workspace), plates: undefined },
    snap: normalizeSnapGrid(file.snap, DEFAULT_SNAP_GRID),
    browser: {
      theme: normalizeAppThemePreference(browser.theme),
      toolbarSize: normalizeToolbarSize(browser.toolbarSize),
      viewCubePosition: normalizeViewCubePosition(browser.viewCubePosition),
      shapeColors: typeof browser.shapeColors === "boolean" ? browser.shapeColors : true,
      printerPlays: normalizePrinterPlays(browser.printerPlays),
      ...("customShortcuts" in browser ? { customShortcuts: normalizeCustomShortcuts(browser.customShortcuts) } : {}),
    },
  };
}
