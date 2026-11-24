// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detailSnapshot } from "@/lib/detailLevel";
import { useDetailPeekKey } from "@/lib/useDetailLevel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  useDetailPeekKey("editor");
  return null;
}

const key = (type: "keydown" | "keyup", target: EventTarget, repeat = false) => {
  const event = new KeyboardEvent(type, { key: "v", code: "KeyV", repeat, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

describe("V held (Discussion #2008)", () => {
  let root: Root;
  let input: HTMLInputElement;

  beforeEach(() => {
    vi.useFakeTimers();
    const host = document.body.appendChild(document.createElement("div"));
    input = document.body.appendChild(document.createElement("input"));
    root = createRoot(host);
    act(() => root.render(createElement(Probe)));
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("shows everything until it is let go", () => {
    key("keydown", document.body);
    expect(detailSnapshot("editor").peeking).toBe(true);
    key("keyup", document.body);
    expect(detailSnapshot("editor").peeking).toBe(false);
  });

  it("does not write into a field clicked meanwhile, and keeps it shown until the field is left", () => {
    input.addEventListener("keydown", (event) => event.stopPropagation());
    key("keydown", document.body);
    input.focus();
    expect(key("keydown", input, true).defaultPrevented).toBe(true);
    key("keyup", input);
    vi.advanceTimersByTime(1000);
    expect(detailSnapshot("editor").peeking).toBe(true);
    // The field's own letters are its own again.
    expect(key("keydown", input).defaultPrevented).toBe(false);
    expect(key("keydown", input, true).defaultPrevented).toBe(false);
    input.blur();
    vi.advanceTimersByTime(1000);
    expect(detailSnapshot("editor").peeking).toBe(false);
  });

  it("a v typed in a field shows nothing and repeats as usual", () => {
    input.focus();
    key("keydown", input);
    expect(key("keydown", input, true).defaultPrevented).toBe(false);
    expect(detailSnapshot("editor").peeking).toBe(false);
  });
});
