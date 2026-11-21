/**
 * Opening a menu while the mouse rests on its tab, as the folded groups of the ribbon do (useToolbarCollapse). The Shapes
 * button carries the same chevron tab as they do since Discussion #1506 but opened only on a click (#1722): resting on its
 * tab now opens the panel too. A panel the resting mouse opened closes again a little after the mouse has left it; a click
 * on the button, or the pin, keeps it open like a panel opened by a click.
 */
export const HOVER_OPEN_DELAY_MS = 120;
export const HOVER_CLOSE_DELAY_MS = 300;

export type HoverOpener = {
  /** The mouse came onto the tab. */
  enterTab(pointerType: string): void;
  /** The mouse came onto the button or the panel: a close waiting for it is called off. */
  enter(pointerType: string): void;
  /** The mouse left the button with its tab and the panel. */
  leave(pointerType: string): void;
  /** A click on the button; true when it is to toggle the panel, false when it only keeps a panel the mouse opened. */
  click(): boolean;
  /** The panel closed some other way (a shape picked, a click elsewhere, Esc), or was pinned: the mouse leaving no longer closes it. */
  settle(): void;
  dispose(): void;
};

export type HoverOpenerOptions = {
  isOpen(): boolean;
  isPinned(): boolean;
  open(): void;
  close(): void;
  setTimer?: (action: () => void, delay: number) => unknown;
  clearTimer?: (timer: unknown) => void;
};

export function createHoverOpener(options: HoverOpenerOptions): HoverOpener {
  const setTimer = options.setTimer ?? ((action: () => void, delay: number) => setTimeout(action, delay));
  const clearTimer = options.clearTimer ?? ((timer: unknown) => clearTimeout(timer as ReturnType<typeof setTimeout>));
  let timer: unknown = null;
  let openedByHover = false;
  const cancel = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };
  const later = (action: () => void, delay: number) => {
    cancel();
    timer = setTimer(() => {
      timer = null;
      action();
    }, delay);
  };
  // A pen or a finger has no resting pointer; it opens with a tap, as before.
  const mouse = (pointerType: string) => pointerType === "mouse";

  return {
    enterTab(pointerType) {
      if (!mouse(pointerType)) return;
      if (options.isOpen()) {
        cancel();
        return;
      }
      later(() => {
        if (options.isOpen()) return;
        openedByHover = true;
        options.open();
      }, HOVER_OPEN_DELAY_MS);
    },
    enter(pointerType) {
      if (mouse(pointerType) && options.isOpen()) cancel();
    },
    leave(pointerType) {
      if (!mouse(pointerType)) return;
      if (!options.isOpen()) {
        cancel();
        return;
      }
      if (!openedByHover) return;
      later(() => {
        if (!openedByHover || options.isPinned()) return;
        openedByHover = false;
        options.close();
      }, HOVER_CLOSE_DELAY_MS);
    },
    click() {
      cancel();
      if (openedByHover && options.isOpen()) {
        openedByHover = false;
        return false;
      }
      openedByHover = false;
      return true;
    },
    settle() {
      cancel();
      openedByHover = false;
    },
    dispose() {
      cancel();
    },
  };
}
