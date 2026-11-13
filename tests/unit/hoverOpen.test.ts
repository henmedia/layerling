import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHoverOpener, HOVER_CLOSE_DELAY_MS, HOVER_OPEN_DELAY_MS } from "@/lib/hoverOpen";

function panel() {
  const state = { open: false, pinned: false };
  const opener = createHoverOpener({
    isOpen: () => state.open,
    isPinned: () => state.pinned,
    open: () => {
      state.open = true;
    },
    close: () => {
      state.open = false;
    },
  });
  // What the button's click does in the toolbar.
  const clickButton = () => {
    if (opener.click()) state.open = !state.open;
  };
  return { state, opener, clickButton };
}

describe("the Shapes panel opens while the mouse rests on its tab, like a folded group (#1722)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("opens after the mouse rests on the tab, not when it only passes over it", () => {
    const { state, opener } = panel();
    opener.enter("mouse");
    opener.enterTab("mouse");
    vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS - 1);
    expect(state.open).toBe(false);
    vi.advanceTimersByTime(1);
    expect(state.open).toBe(true);

    const passing = panel();
    passing.opener.enterTab("mouse");
    passing.opener.leave("mouse");
    vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS * 3);
    expect(passing.state.open).toBe(false);
  });

  it("closes what the mouse opened a little after the mouse has left, and stays while it comes back in time", () => {
    const { state, opener } = panel();
    opener.enterTab("mouse");
    vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS);
    opener.leave("mouse");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS - 50);
    opener.enter("mouse");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS * 2);
    expect(state.open).toBe(true);
    opener.leave("mouse");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS);
    expect(state.open).toBe(false);
  });

  it("keeps the panel open after a click on the button that follows, instead of closing it again", () => {
    const { state, opener, clickButton } = panel();
    opener.enterTab("mouse");
    vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS);
    clickButton();
    expect(state.open).toBe(true);
    opener.leave("mouse");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS * 2);
    expect(state.open).toBe(true);
    // The next click closes it, as before.
    clickButton();
    expect(state.open).toBe(false);
  });

  it("keeps a panel that was pinned or worked in, and one opened by a click", () => {
    const pinned = panel();
    pinned.opener.enterTab("mouse");
    vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS);
    pinned.state.pinned = true;
    pinned.opener.leave("mouse");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS * 2);
    expect(pinned.state.open).toBe(true);

    const worked = panel();
    worked.opener.enterTab("mouse");
    vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS);
    worked.opener.settle();
    worked.opener.leave("mouse");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS * 2);
    expect(worked.state.open).toBe(true);

    const clicked = panel();
    clicked.clickButton();
    clicked.opener.leave("mouse");
    vi.advanceTimersByTime(HOVER_CLOSE_DELAY_MS * 2);
    expect(clicked.state.open).toBe(true);
  });

  it("leaves a pen or a finger to a tap", () => {
    const { state, opener } = panel();
    opener.enterTab("touch");
    opener.enterTab("pen");
    vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS * 3);
    expect(state.open).toBe(false);
  });
});
