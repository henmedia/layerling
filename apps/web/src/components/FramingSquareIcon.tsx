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
      <path d="M3 2h8v12h10v8H3Z" />
      <path d="M11 6H7.5" />
      <path d="M11 10H8.5" />
      <path d="M15 14v3.5" />
      <path d="M18.5 14v2" />
    </svg>
  );
}
