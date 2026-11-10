// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShortcutsModal } from "@/components/workplane/ShortcutsModal";
import {
  CUSTOM_SHORTCUTS_STORAGE_KEY,
  customShortcutRecording,
  forgetCustomShortcutsCache,
  readCustomShortcuts,
  runCustomShortcutKey,
  setCustomShortcutCommandSource,
  writeCustomShortcuts,
  type RunnableCommand,
} from "@/lib/customShortcuts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Keys of your own (Discussion #1399): set in the shortcuts window, run by the key wherever the editor's keys work.
const runs: string[] = [];
const commands = (): (RunnableCommand & { group: string })[] => [
  { id: "center-workplane", label: "Center on workplane", group: "Arrange", enabled: true, run: () => runs.push("center") },
  { id: "shapes-panel", label: "Open the shapes panel", group: "Shapes", enabled: true, run: () => runs.push("shapes") },
  { id: "fillet", label: "Fillet", group: "Modify", enabled: false, run: () => runs.push("fillet") },
];

const keydown = (target: EventTarget, key: string, code: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", { key, code, bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
};

beforeEach(() => {
  window.localStorage.clear();
  forgetCustomShortcutsCache();
  runs.length = 0;
  setCustomShortcutCommandSource(commands);
});

describe("a key of your own pressed in the editor", () => {
  const press = (key: string, code: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
    const event = new KeyboardEvent("keydown", { key, code, bubbles: true, cancelable: true, ...init });
    Object.defineProperty(event, "target", { value: target });
    const unavailable = vi.fn();
    const taken = runCustomShortcutKey(event, commands, { unavailable });
    return { taken, event, unavailable };
  };

  it("runs its command and stops the key, so nothing else answers it", () => {
    writeCustomShortcuts({ "center-workplane": { combo: "Shift+C", label: "Center on workplane" } });
    const { taken, event } = press("C", "KeyC", { shiftKey: true });
    expect(taken).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(runs).toEqual(["center"]);
  });

  it("says so when the command cannot run now, and still keeps the key", () => {
    writeCustomShortcuts({ fillet: { combo: "K", label: "Fillet" } });
    const { taken, unavailable } = press("k", "KeyK");
    expect(taken).toBe(true);
    expect(runs).toEqual([]);
    expect(unavailable).toHaveBeenCalledWith(expect.objectContaining({ id: "fillet" }));
  });

  it("leaves every other key alone, and a key whose command is not here now", () => {
    writeCustomShortcuts({ "sketch-line": { combo: "U", label: "Line" } });
    expect(press("g", "KeyG").taken).toBe(false);
    expect(press("u", "KeyU").taken).toBe(false);
    expect(runs).toEqual([]);
  });

  it("keeps out of a text field, a window that holds the keys, a held key and the overview", () => {
    writeCustomShortcuts({ "shapes-panel": { combo: "G", label: "Open the shapes panel" } });
    const input = document.createElement("input");
    document.body.appendChild(input);
    expect(press("g", "KeyG", {}, input).taken).toBe(false);
    input.remove();
    expect(press("g", "KeyG", { repeat: true }).taken).toBe(false);

    const dialog = document.createElement("div");
    dialog.setAttribute("aria-modal", "true");
    document.body.appendChild(dialog);
    expect(press("g", "KeyG").taken).toBe(false);
    dialog.remove();

    const stage = document.createElement("div");
    stage.className = "editor-stage";
    document.body.appendChild(stage);
    expect(press("g", "KeyG").taken).toBe(false);
    stage.classList.add("active");
    expect(press("g", "KeyG").taken).toBe(true);
    stage.remove();
    expect(runs).toEqual(["shapes"]);
  });

  it("waits while a body is split", () => {
    writeCustomShortcuts({ "shapes-panel": { combo: "G", label: "Open the shapes panel" } });
    const event = new KeyboardEvent("keydown", { key: "g", code: "KeyG", bubbles: true, cancelable: true });
    expect(runCustomShortcutKey(event, commands, { blocked: true })).toBe(false);
    expect(runs).toEqual([]);
  });
});

describe("the shortcuts window's own keys", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const onClose = vi.fn();
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
    onClose.mockReset();
  });

  const mount = () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(createElement(ShortcutsModal, { sketchMode: false, onClose })));
  };
  const q = <T extends Element>(selector: string) => container!.querySelector<T>(selector);
  const click = (element: Element | null) => {
    expect(element).not.toBeNull();
    act(() => (element as HTMLElement).click());
  };
  const type = (input: HTMLInputElement, text: string) => {
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const message = () => q(".shortcuts-custom-message")?.textContent ?? "";
  const ownRows = () => [...container!.querySelectorAll(".shortcuts-custom .shortcuts-row")].map((row) => row.textContent);

  it("finds a command, takes the key pressed and keeps it", () => {
    mount();
    click(q(".shortcuts-custom-add"));
    const find = q<HTMLInputElement>(".shortcuts-custom-find input")!;
    expect(document.activeElement).toBe(find);
    type(find, "center");
    const results = [...container!.querySelectorAll(".shortcuts-custom-results button")];
    expect(results.map((button) => button.querySelector(".shortcuts-custom-result-label")?.textContent)).toEqual(["Center on workplane"]);
    click(results[0]);
    const record = q<HTMLDivElement>(".shortcuts-custom-record")!;
    expect(document.activeElement).toBe(record);
    expect(customShortcutRecording()).toBe(true);
    // A modifier alone waits for the key that follows.
    keydown(record, "Shift", "ShiftLeft", { shiftKey: true });
    expect(q(".shortcuts-custom-record")).not.toBeNull();
    keydown(record, "C", "KeyC", { shiftKey: true });
    expect(q(".shortcuts-custom-record")).toBeNull();
    expect(customShortcutRecording()).toBe(false);
    expect(message()).toBe("Shift+C now runs “Center on workplane”.");
    expect(readCustomShortcuts()).toEqual({ "center-workplane": { combo: "Shift+C", label: "Center on workplane" } });
    expect(JSON.parse(window.localStorage.getItem(CUSTOM_SHORTCUTS_STORAGE_KEY) ?? "{}")).toEqual(readCustomShortcuts());
    expect(ownRows()).toEqual(["Center on workplaneShift+C"]);
    // The focus stays in the window, so Esc closes it instead of reaching the editor behind it.
    expect(document.activeElement).toBe(q(".shortcuts-custom-add"));
    keydown(document.activeElement!, "Escape", "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("refuses a taken key with what it does, and Esc only stops waiting", () => {
    mount();
    click(q(".shortcuts-custom-add"));
    type(q<HTMLInputElement>(".shortcuts-custom-find input")!, "shapes");
    click(container!.querySelector(".shortcuts-custom-results button"));
    const record = q<HTMLDivElement>(".shortcuts-custom-record")!;
    keydown(record, "l", "KeyL");
    expect(message()).toMatch(/^L is taken: /);
    keydown(record, "w", "KeyW", { ctrlKey: true });
    expect(message()).toBe("Ctrl+W belongs to the browser.");
    keydown(record, " ", "Space");
    expect(message()).toMatch(/^Space can’t take a command/);
    expect(readCustomShortcuts()).toEqual({});
    keydown(record, "Escape", "Escape");
    expect(q(".shortcuts-custom-record")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("changes, removes and, on a second click, removes all keys", () => {
    writeCustomShortcuts({
      "center-workplane": { combo: "Shift+C", label: "Center on workplane" },
      "shapes-panel": { combo: "G", label: "Open the shapes panel" },
    });
    mount();
    expect(ownRows()).toEqual(["Center on workplaneShift+C", "Open the shapes panelG"]);
    click(q(".shortcuts-custom-change"));
    keydown(q(".shortcuts-custom-record")!, "g", "KeyG");
    expect(message()).toBe("G already runs “Open the shapes panel”. Remove it there first, or take another key.");
    keydown(q(".shortcuts-custom-record")!, "j", "KeyJ");
    expect(readCustomShortcuts()["center-workplane"].combo).toBe("J");
    click(container!.querySelectorAll(".shortcuts-custom-remove")[1]);
    expect(Object.keys(readCustomShortcuts())).toEqual(["center-workplane"]);
    const reset = q<HTMLButtonElement>(".shortcuts-custom-reset")!;
    click(reset);
    expect(Object.keys(readCustomShortcuts())).toEqual(["center-workplane"]);
    click(reset);
    expect(readCustomShortcuts()).toEqual({});
    expect(window.localStorage.getItem(CUSTOM_SHORTCUTS_STORAGE_KEY)).toBeNull();
  });

  it("lists a key whose command is not in this mode, so it can still be removed", () => {
    writeCustomShortcuts({ "sketch-line": { combo: "U", label: "Line" } });
    mount();
    expect(ownRows()).toEqual(["Line (not in this mode)U"]);
  });
});
