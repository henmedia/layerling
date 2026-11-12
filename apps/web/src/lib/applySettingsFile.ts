"use client";

import { setAppTheme } from "@/lib/appTheme";
import { writeCustomShortcuts } from "@/lib/customShortcuts";
import { setPrinterPlayFor } from "@/lib/printerPlay";
import { writeRibbonFold } from "@/lib/ribbonFold";
import { writeRibbonHidden } from "@/lib/ribbonHidden";
import { writeRibbonOrder } from "@/lib/ribbonOrder";
import { writeRibbonToolOrder } from "@/lib/ribbonToolOrder";
import { buildSettingsFile, readBrowserSettings, type SettingsFile } from "@/lib/settingsFile";
import { setShapeColors } from "@/lib/shapeColors";
import { setToolbarSize } from "@/lib/toolbarSize";
import { setViewCubePosition } from "@/lib/viewCubePosition";
import { DEFAULT_SNAP_GRID, normalizeWorkspaceSettings, readWorkspaceDefault, saveWorkspaceDefault } from "@/lib/workplaneSettings";

/**
 * Takes a settings file over in this browser: its workspace becomes the default for new designs, and the settings that
 * are the browser's (theme, toolbar size, view cube, shape colours, printers, keys, ribbon) are set. Used by "Import
 * settings" and by "Restore backup" when the backup's settings are to come along (Discussion #1678). An open design is
 * not touched here; "Import settings" puts the file on it by itself.
 */
export function applySettingsFile(file: SettingsFile) {
  saveWorkspaceDefault(file.workspace, file.snap);
  setAppTheme(file.browser.theme);
  setToolbarSize(file.browser.toolbarSize);
  setViewCubePosition(file.browser.viewCubePosition);
  setShapeColors(file.browser.shapeColors);
  for (const [printer, play] of Object.entries(file.browser.printerPlays)) setPrinterPlayFor(printer, play);
  // A file from before your own keys existed has none and leaves this browser's keys as they are.
  if (file.browser.customShortcuts) writeCustomShortcuts(file.browser.customShortcuts);
  if (file.browser.ribbonHidden) writeRibbonHidden(file.browser.ribbonHidden);
  if (file.browser.ribbonOrder) writeRibbonOrder(file.browser.ribbonOrder);
  if (file.browser.ribbonToolOrder) writeRibbonToolOrder(file.browser.ribbonToolOrder);
  if (file.browser.ribbonFold) writeRibbonFold(file.browser.ribbonFold);
}

/**
 * The settings of this browser as a settings file, for a full backup (Discussion #1678): the default for new designs
 * (what "Make default" saved, or the app's own when none was saved) and the browser's own settings.
 */
export function browserSettingsFile(now = new Date()): SettingsFile {
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  const saved = readWorkspaceDefault(storage);
  return buildSettingsFile(saved?.workspace ?? normalizeWorkspaceSettings(undefined), saved?.snap ?? DEFAULT_SNAP_GRID, readBrowserSettings(storage), now);
}
