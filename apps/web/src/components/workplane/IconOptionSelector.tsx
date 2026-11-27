"use client";

import type { ReactNode } from "react";

/**
 * Dieselbe Kachelreihe wie bei der Zahnradart, nur mit gezeichneten Bildchen
 * statt Rasterdateien - so bleiben sie bei jeder Groesse scharf und nehmen die
 * Farbe des Themas an.
 */
export function IconOptionSelector({
  label,
  options,
  value,
  columns,
  disabled,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string; preview: ReactNode }>;
  value: string;
  columns: 2 | 3;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="gear-type-property" role="group" aria-label={label}>
      <span>{label}</span>
      <div className={columns === 2 ? "gear-type-options icon-options two-up" : "gear-type-options icon-options"}>
        {options.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? "selected" : ""}
            type="button"
            disabled={disabled}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.preview}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
