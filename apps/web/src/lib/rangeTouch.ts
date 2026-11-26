/**
 * Sliders for a finger or a pen (Discussion #2019).
 *
 * A browser moves a slider to wherever a finger lands on it, so a swipe that starts on one
 * to scroll a panel changes a value instead. While a finger or a pen is in use (`data-pointer`
 * on <html>, see pointerReach.ts) the sliders take no pointer of their own (CSS), and this
 * module drives them: only a press on the knob, then a drag sideways, changes the value; a
 * press anywhere else on the bar leaves it alone and the panel scrolls. The slider still gets
 * its pointerdown, input, change and pointerup events, so its own handlers run as before.
 * A mouse keeps the browser's slider.
 */

/** The knob's width in pixels, as globals.css draws it for `.range-control`. */
export const RANGE_THUMB_PX = 17;
/** How far beside the knob a press still takes it. */
export const RANGE_THUMB_REACH_PX = 10;

export type RangeGeometry = {
  left: number;
  width: number;
  min: number;
  max: number;
  value: number;
  rtl?: boolean;
  thumb?: number;
};

/** The knob's middle on the screen. */
export function rangeThumbX({ left, width, min, max, value, rtl = false, thumb = RANGE_THUMB_PX }: RangeGeometry) {
  const span = max - min;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0;
  const travel = Math.max(0, width - thumb);
  const offset = thumb / 2 + (rtl ? 1 - ratio : ratio) * travel;
  return left + offset;
}

/** Whether a press at `clientX` takes the knob. */
export function pressTakesThumb(geometry: RangeGeometry, clientX: number, reach = RANGE_THUMB_REACH_PX) {
  const thumb = geometry.thumb ?? RANGE_THUMB_PX;
  return Math.abs(clientX - rangeThumbX(geometry)) <= thumb / 2 + reach;
}

/** The value for the knob's middle at `thumbX`, on the slider's steps. */
export function rangeValueAt(geometry: Omit<RangeGeometry, "value">, thumbX: number, step: number | "any") {
  const { left, width, min, max, rtl = false, thumb = RANGE_THUMB_PX } = geometry;
  const travel = Math.max(1, width - thumb);
  let ratio = Math.min(1, Math.max(0, (thumbX - left - thumb / 2) / travel));
  if (rtl) ratio = 1 - ratio;
  let value = min + ratio * (max - min);
  if (step !== "any" && step > 0) {
    value = min + Math.round((value - min) / step) * step;
    // Whole steps, without the float tail of 0.1 + 0.2.
    const decimals = (String(step).split(".")[1] ?? "").length;
    value = Number(value.toFixed(Math.min(10, decimals + 2)));
  }
  return Math.min(max, Math.max(min, value));
}

function numberAttribute(input: HTMLInputElement, name: "min" | "max", fallback: number) {
  const value = Number.parseFloat(input.getAttribute(name) ?? "");
  return Number.isFinite(value) ? value : fallback;
}

function stepOf(input: HTMLInputElement): number | "any" {
  const raw = input.getAttribute("step");
  if (raw === "any") return "any";
  const value = Number.parseFloat(raw ?? "");
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function geometryOf(input: HTMLInputElement): RangeGeometry {
  const rect = input.getBoundingClientRect();
  return {
    left: rect.left,
    width: rect.width,
    min: numberAttribute(input, "min", 0),
    max: numberAttribute(input, "max", 100),
    value: Number.parseFloat(input.value) || 0,
    rtl: getComputedStyle(input).direction === "rtl",
  };
}

/** A slider under the point that the browser does not drive itself right now. */
function sliderAt(target: EventTarget | null, clientX: number, clientY: number): HTMLInputElement | null {
  let element = target instanceof Element ? target : null;
  for (let depth = 0; element && depth < 4; depth += 1, element = element.parentElement) {
    const candidates = element.matches('input[type="range"]') ? [element as HTMLInputElement] : Array.from(element.querySelectorAll<HTMLInputElement>('input[type="range"]'));
    for (const input of candidates) {
      if (input.disabled) continue;
      const rect = input.getBoundingClientRect();
      if (clientX < rect.left - 4 || clientX > rect.right + 4 || clientY < rect.top - 8 || clientY > rect.bottom + 8) continue;
      if (getComputedStyle(input).pointerEvents !== "none") return null;
      return input;
    }
  }
  return null;
}

const valueSetter = typeof HTMLInputElement === "undefined" ? undefined : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

function setSliderValue(input: HTMLInputElement, value: number) {
  const text = String(value);
  if (input.value === text) return;
  valueSetter?.call(input, text);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function pointerCopy(type: string, event: PointerEvent) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    isPrimary: event.isPrimary,
    clientX: event.clientX,
    clientY: event.clientY,
    button: event.button,
    buttons: event.buttons,
  });
}

let installed = false;

export function installRangeTouch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  /** A press on a bar away from its knob: the click it ends in must not reach the row's label. */
  let swallowClickUntil = 0;

  window.addEventListener(
    "pointerdown",
    (event) => {
      // The events this module hands the slider itself go through untouched.
      if (!event.isTrusted) return;
      const input = sliderAt(event.target, event.clientX, event.clientY);
      if (!input) return;
      const geometry = geometryOf(input);
      const mouse = event.pointerType === "mouse";
      if (!mouse && !pressTakesThumb(geometry, event.clientX)) {
        swallowClickUntil = Date.now() + 1500;
        return;
      }
      swallowClickUntil = Date.now() + 1500;
      event.preventDefault();
      event.stopPropagation();
      const step = stepOf(input);
      // A finger or pen keeps the knob where it took it; a mouse that got here jumps it as the browser does.
      const grab = mouse ? 0 : event.clientX - rangeThumbX(geometry);
      const pointerId = event.pointerId;
      input.dispatchEvent(pointerCopy("pointerdown", event));
      if (mouse) setSliderValue(input, rangeValueAt(geometry, event.clientX, step));
      const move = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        moveEvent.preventDefault();
        setSliderValue(input, rangeValueAt(geometryOf(input), moveEvent.clientX - grab, step));
      };
      const end = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", end, true);
        window.removeEventListener("pointercancel", end, true);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(pointerCopy(endEvent.type, endEvent));
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", end, true);
      window.addEventListener("pointercancel", end, true);
    },
    true,
  );

  window.addEventListener(
    "click",
    (event) => {
      if (!event.isTrusted || Date.now() > swallowClickUntil) return;
      if (!sliderAt(event.target, event.clientX, event.clientY)) return;
      swallowClickUntil = 0;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  // A double tap on the bar sets the slider back, as a double click on it does.
  window.addEventListener(
    "dblclick",
    (event) => {
      if (!event.isTrusted) return;
      const input = sliderAt(event.target, event.clientX, event.clientY);
      if (!input) return;
      event.preventDefault();
      event.stopPropagation();
      input.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, clientX: event.clientX, clientY: event.clientY }));
    },
    true,
  );
}
