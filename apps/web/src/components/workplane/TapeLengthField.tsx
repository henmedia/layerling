"use client";

import { useRef, useState, type CSSProperties, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { t } from "@/lib/i18n";
import { tapeLengthFieldToApply, type TapeAxis, type TapeLengthFieldName } from "@/lib/tapeLengthEdit";

export type TapeLengthFieldValue = { field: TapeLengthFieldName; text: string };

/**
 * The field a click on a tape measurement's number opens (#823): the length, where the number stood,
 * and under it the reach along each axis when the label's tip lists them (Discussion #610), as ΔX, ΔY
 * and ΔZ. The length moves the body along the measured line, an axis along that axis only. Only one
 * of them applies (see tapeLengthFieldToApply): typing into one puts the others back to what they read,
 * so the field never shows two changes of which one would be lost. Enter applies it, Escape takes the
 * field away, and leaving it - a click elsewhere, Tab out of the last field - applies what was typed;
 * Tab between the fields keeps it open. The numbers are in the workspace unit, like the label's.
 */
export function TapeLengthField({
  x,
  y,
  length,
  axes,
  onApply,
  onCancel,
}: {
  x: number;
  y: number;
  /** What the measurement reads, as the label shows it. */
  length: string;
  /** The reach along each axis the label's tip lists, none when the measurement runs along one axis. */
  axes: ReadonlyArray<{ axis: TapeAxis; text: string }>;
  onApply: (value: TapeLengthFieldValue) => void;
  onCancel: () => void;
}) {
  const [initial] = useState<Partial<Record<TapeLengthFieldName, string>>>(() => ({ length, ...Object.fromEntries(axes.map((entry) => [entry.axis, entry.text])) }));
  const [texts, setTexts] = useState(initial);
  const typedRef = useRef<TapeLengthFieldName | null>(null);
  // Enter, Escape and leaving all end it; whichever comes first counts, a blur after Escape does not apply anything.
  const doneRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const finish = (name: TapeLengthFieldName | null) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (name) onApply({ field: name, text: texts[name] ?? "" });
    else onCancel();
  };
  const change = (name: TapeLengthFieldName, text: string) => {
    typedRef.current = name;
    setTexts({ ...initial, [name]: text });
  };
  const keyDown = (name: TapeLengthFieldName) => (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(tapeLengthFieldToApply(typedRef.current, name, "enter"));
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(null);
    }
  };
  const leave = (event: ReactFocusEvent<HTMLInputElement>) => {
    if (event.relatedTarget instanceof Node && boxRef.current?.contains(event.relatedTarget)) return;
    finish(tapeLengthFieldToApply(typedRef.current, null, "leave"));
  };
  const field = (name: TapeLengthFieldName) => ({
    value: texts[name] ?? "",
    inputMode: "decimal" as const,
    onFocus: (event: ReactFocusEvent<HTMLInputElement>) => event.currentTarget.select(),
    onChange: (event: { target: { value: string } }) => change(name, event.target.value),
    onKeyDown: keyDown(name),
    onBlur: leave,
  });

  return (
    <div
      ref={boxRef}
      className="tape-length-field"
      style={{ "--overlay-x": `${x}px`, "--overlay-y": `${y}px` } as CSSProperties}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <input className="dimension-input tape-length-input" autoComplete="off" autoFocus aria-label={t("camera.tapeTypeLength")} {...field("length")} />
      {axes.length ? (
        <div className="tape-length-axes">
          {axes.map(({ axis }) => (
            <label key={axis} className="tape-length-axis">
              <span aria-hidden="true">Δ{axis}</span>
              <input className="dimension-input" autoComplete="off" data-axis={axis.toLowerCase()} aria-label={t("camera.tapeLengthAlong", { axis })} {...field(axis)} />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
