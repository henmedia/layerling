import type { SVGProps } from "react";

type ViewScrollbarsIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number | string;
};

/**
 * A window with a scrollbar down its right side and one along its bottom, each with its thumb, for the switch in the
 * view bar that shows the 3D view's scrollbars (Discussion #1241). Drawn on Lucide's 24 grid with its stroke
 * conventions, so it sits beside the lucide-react icons there.
 */
export function ViewScrollbarsIcon({ size = 24, strokeWidth = 2, ...props }: ViewScrollbarsIconProps) {
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M16 3v13H3" strokeWidth={1.5} />
      <path d="M18.5 6v5M6 18.5h6" />
    </svg>
  );
}
