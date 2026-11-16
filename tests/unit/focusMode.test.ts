import { describe, expect, it } from "vitest";
import { browserFillsScreen, focusModeShown, isFocusModeKey } from "@/lib/focusMode";

const key = (over: Partial<{ key: string; code: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }>) => ({
  key: "F",
  code: "KeyF",
  ctrlKey: true,
  metaKey: false,
  shiftKey: true,
  altKey: false,
  ...over,
});

describe("focus mode (Discussion #1554)", () => {
  it("shows when chosen, or while the browser fills the screen unless it was switched off there", () => {
    expect(focusModeShown(false, false, false)).toBe(false);
    expect(focusModeShown(true, false, false)).toBe(true);
    expect(focusModeShown(false, true, false)).toBe(true);
    expect(focusModeShown(false, true, true)).toBe(false);
    expect(focusModeShown(true, true, true)).toBe(true);
  });

  it("takes Ctrl+Shift+F and Cmd+Shift+F, not F, Shift+F or Ctrl+Alt+Shift+F", () => {
    expect(isFocusModeKey(key({}))).toBe(true);
    expect(isFocusModeKey(key({ ctrlKey: false, metaKey: true }))).toBe(true);
    // A keyboard layout that gives another letter on that key still counts by its position.
    expect(isFocusModeKey(key({ key: "Ф" }))).toBe(true);
    expect(isFocusModeKey(key({ ctrlKey: false }))).toBe(false);
    expect(isFocusModeKey(key({ shiftKey: false }))).toBe(false);
    expect(isFocusModeKey(key({ altKey: true }))).toBe(false);
    expect(isFocusModeKey(key({ key: "g", code: "KeyG" }))).toBe(false);
  });

  it("knows the browser's full screen by display-mode or by a window as large as the screen", () => {
    const screen = { width: 1920, height: 1080 };
    expect(browserFillsScreen({ innerWidth: 1920, innerHeight: 1080, screen })).toBe(true);
    // Rounding at a zoom that is not 100 %.
    expect(browserFillsScreen({ innerWidth: 1919.5, innerHeight: 1079.5, screen })).toBe(true);
    // A maximised window keeps the task bar and the browser's bars.
    expect(browserFillsScreen({ innerWidth: 1920, innerHeight: 937, screen })).toBe(false);
    expect(browserFillsScreen({ innerWidth: 800, innerHeight: 600, screen, matchMedia: () => ({ matches: true }) })).toBe(true);
    expect(browserFillsScreen({ innerWidth: 1920, innerHeight: 1080, screen: null })).toBe(false);
    expect(browserFillsScreen({ innerWidth: 1920, innerHeight: 1080, screen: { width: 0, height: 0 } })).toBe(false);
  });

  it("is not fooled by the browser's zoom (#1738)", () => {
    const screen = { width: 1920, height: 1080 };
    // A maximised window zoomed out to 75 %: the page is 2560 x 1333 of its own pixels, the window 1920 wide as ever.
    expect(browserFillsScreen({ innerWidth: 2560, innerHeight: 1333, outerWidth: 1920, screen })).toBe(false);
    // The same at 50 % and at 80 %, and at 100 % with the window's border.
    expect(browserFillsScreen({ innerWidth: 3840, innerHeight: 2000, outerWidth: 1920, screen })).toBe(false);
    expect(browserFillsScreen({ innerWidth: 2400, innerHeight: 1200, outerWidth: 1920, screen })).toBe(false);
    expect(browserFillsScreen({ innerWidth: 1920, innerHeight: 937, outerWidth: 1936, screen })).toBe(false);
    // F11 still counts, zoomed or not.
    expect(browserFillsScreen({ innerWidth: 1920, innerHeight: 1080, outerWidth: 1920, screen })).toBe(true);
    expect(browserFillsScreen({ innerWidth: 2560, innerHeight: 1440, outerWidth: 1920, screen })).toBe(true);
  });
});
