import type { SVGProps } from "react";

type ProtractorIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number | string;
};

/**
 * The protractor's button (#1228): an angle, two legs and the arc between them, drawn on Lucide's
 * 24 grid with its stroke conventions so it sits beside the framing square in the camera toolbar.
 */
export function ProtractorIcon({ size = 24, strokeWidth = 2, ...props }: ProtractorIconProps) {
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
      <path d="M4 19h17" />
      <path d="M4 19 14.28 6.74" />
      <path d="M12 19a8 8 0 0 0-2.86-6.13" />
    </svg>
  );
}
