import type { SVGProps } from "react";

type FramingSquareIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number | string;
};

/**
 * A framing square drawn on Lucide's 24 grid with its stroke conventions, so it
 * sits beside the lucide-react icons in the camera toolbar. Lucide has no
 * square of its own; its Ruler is a straight rule.
 */
export function FramingSquareIcon({ size = 24, strokeWidth = 2, ...props }: FramingSquareIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4.5 2H10v13h9.5v7h-15Z" />
      <path d="M10 6H7.5" />
      <path d="M10 10.5H7.5" />
      <path d="M13 15v2.5" />
      <path d="M16.5 15v2.5" />
    </svg>
  );
}
