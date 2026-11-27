// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { readImportSvgSize, readImportSvgWidth, setImportSvgSize, setImportSvgWidth, takeImportSvgSize, takeImportSvgWidth } from "@/lib/importPreferences";

// Discussion #2121: the size typed in the import window as a width or a height, for one import or kept for those that follow.

const KEY = "layerling.importSvgSize";

beforeEach(() => {
  setImportSvgSize({ value: null, height: false, keep: false });
  window.localStorage.clear();
});

describe("the size an SVG or a picture comes in at", () => {
  it("counts once when it is not kept: the import takes it, and it is gone", () => {
    setImportSvgSize({ value: 60, height: false, keep: false });
    expect(readImportSvgSize()).toEqual({ value: 60, height: false, keep: false });
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(takeImportSvgSize()).toEqual({ svgWidth: 60, svgHeight: null });
    expect(takeImportSvgSize()).toEqual({ svgWidth: null, svgHeight: null });
    expect(readImportSvgSize().value).toBeNull();
  });

  it("is handed on as a height when that is ticked, and the tick stays after the import", () => {
    setImportSvgSize({ value: 45, height: true, keep: false });
    expect(takeImportSvgSize()).toEqual({ svgWidth: null, svgHeight: 45 });
    expect(readImportSvgSize()).toEqual({ value: null, height: true, keep: false });
  });

  it("stays for the imports that follow when it is kept, and is kept in the browser", () => {
    setImportSvgSize({ value: 80, height: true, keep: true });
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual({ value: 80, height: true });
    expect(takeImportSvgSize()).toEqual({ svgWidth: null, svgHeight: 80 });
    expect(takeImportSvgSize()).toEqual({ svgWidth: null, svgHeight: 80 });
    expect(readImportSvgSize()).toEqual({ value: 80, height: true, keep: true });
    // The tick taken off: it counts once again, and the browser forgets it.
    setImportSvgSize({ value: 80, height: true, keep: false });
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(takeImportSvgSize()).toEqual({ svgWidth: null, svgHeight: 80 });
    expect(takeImportSvgSize()).toEqual({ svgWidth: null, svgHeight: null });
  });

  it("keeps nothing in the browser while the field is empty, and takes no nonsense", () => {
    setImportSvgSize({ value: null, height: false, keep: true });
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(takeImportSvgSize()).toEqual({ svgWidth: null, svgHeight: null });
    setImportSvgSize({ value: -5, height: false, keep: true });
    expect(readImportSvgSize().value).toBeNull();
    setImportSvgSize({ value: Number.NaN, height: true, keep: false });
    expect(readImportSvgSize().value).toBeNull();
  });

  it("still answers the callers that know the width only", () => {
    setImportSvgWidth(60);
    expect(readImportSvgWidth()).toBe(60);
    expect(takeImportSvgWidth()).toBe(60);
    expect(takeImportSvgWidth()).toBeNull();
    // A height is no width.
    setImportSvgSize({ value: 30, height: true, keep: true });
    expect(readImportSvgWidth()).toBeNull();
    expect(takeImportSvgWidth()).toBeNull();
  });
});
