// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profileEditor } from "@/lib/vase/vase-editors.mjs";
import { normalizeVaseSettings } from "@/lib/vaseSettings";

// jsdom has no ResizeObserver, loads no pictures and draws on no canvas: the photo is a picture that loads at once.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

let made: string[] = [];
let released: string[] = [];
/** Pictures waiting to load, in the order they were asked for. */
let loading: Array<{ onload: (() => void) | null }> = [];

beforeEach(() => {
  made = [];
  released = [];
  loading = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
    const url = `blob:photo-${made.length + 1}`;
    made.push(url);
    return url;
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url: string) => { released.push(url); });
  vi.stubGlobal("Image", class {
    naturalWidth = 300;
    naturalHeight = 600;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) { loading.push(this); }
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The side view's board, as the drawing window makes it. */
function board() {
  let value = normalizeVaseSettings({});
  return profileEditor({ get: () => value, set: (patch: Record<string, unknown>) => { value = { ...value, ...patch }; }, notify: () => {} });
}

/** Picks a photo in the board's file field; `load` lets the picture finish loading. */
function pickPhoto(el: HTMLElement, load = true) {
  const input = el.querySelector<HTMLInputElement>('input[type="file"][accept="image/*"]')!;
  Object.defineProperty(input, "files", { value: [new File(["photo"], "vase.jpg", { type: "image/jpeg" })], configurable: true });
  input.dispatchEvent(new Event("change"));
  if (load) loading.shift()!.onload?.();
}

const shownPhoto = (el: HTMLElement) => el.querySelector("svg image")?.getAttribute("href") ?? null;

describe("the reference photo in the vase drawing (#2161)", () => {
  it("releases the photo's object URL when the board goes", () => {
    const { el, dispose } = board();
    pickPhoto(el);
    expect(shownPhoto(el)).toBe("blob:photo-1");
    expect(released).toEqual([]);
    dispose();
    expect(released).toEqual(["blob:photo-1"]);
  });

  it("releases each photo once: the one replaced at once, the last when the board goes", () => {
    const { el, dispose } = board();
    pickPhoto(el);
    pickPhoto(el);
    expect(shownPhoto(el)).toBe("blob:photo-2");
    expect(released).toEqual(["blob:photo-1"]);
    dispose();
    dispose();
    expect(released).toEqual(["blob:photo-1", "blob:photo-2"]);
  });

  it("releases a photo still loading when the board goes, and does not show it", () => {
    const { el, dispose } = board();
    pickPhoto(el, false);
    dispose();
    loading.shift()!.onload?.();
    expect(released).toEqual(["blob:photo-1"]);
    expect(shownPhoto(el)).toBeNull();
  });

  it("has nothing to release without a photo, or after Photo off", () => {
    const { el, dispose } = board();
    pickPhoto(el);
    const off = [...el.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "vaseDraw.photoOff")!;
    off.click();
    expect(released).toEqual(["blob:photo-1"]);
    dispose();
    expect(released).toEqual(["blob:photo-1"]);
  });
});
