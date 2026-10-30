import { Blend } from "lucide-react";
import type { CSSProperties, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
type SpriteRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const toolbarSprite = "assets/editor/toolbar-sprite.svg?v=2";
const vectorToolbarSprite = "assets/editor/vector-toolbar-icons.svg?v=1";

// The drawn height of a sprite icon comes from --sprite-icon-size (35px unless
// a stylesheet sets it), so the toolbar size setting can scale it from CSS.
const spriteIconSize = "var(--sprite-icon-size, 35px)";

function spriteLength(rect: SpriteRect) {
  return (value: number) => `calc(${spriteIconSize} * ${value / rect.height})`;
}

function ToolbarSpriteIcon({ rect, className, style }: IconProps & { rect: SpriteRect }) {
  const scaled = spriteLength(rect);

  return (
    <span
      aria-hidden="true"
      className={["toolbar-sprite-icon", className].filter(Boolean).join(" ")}
      style={
        {
          "--sprite-x": scaled(-rect.x),
          "--sprite-y": scaled(-rect.y),
          "--sprite-width": scaled(260),
          "--sprite-height": scaled(80),
          width: scaled(rect.width),
          height: spriteIconSize,
          backgroundImage: `url(${toolbarSprite})`,
          ...(style as CSSProperties),
        } as CSSProperties
      }
    />
  );
}

function VectorToolbarSpriteIcon({ rect, className, style }: IconProps & { rect: SpriteRect }) {
  const scaled = spriteLength(rect);

  return (
    <span
      aria-hidden="true"
      className={["vector-toolbar-sprite-icon", className].filter(Boolean).join(" ")}
      style={
        {
          "--vector-sprite-x": scaled(-rect.x),
          "--vector-sprite-y": scaled(-rect.y),
          "--vector-sprite-width": scaled(165),
          "--vector-sprite-height": scaled(27),
          width: scaled(rect.width),
          height: spriteIconSize,
          backgroundImage: `url(${vectorToolbarSprite})`,
          ...(style as CSSProperties),
        } as CSSProperties
      }
    />
  );
}

export function ToolbarShapeAddIcon(props: IconProps) {
  return <VectorToolbarSpriteIcon rect={{ x: 104, y: 0, width: 29, height: 27 }} {...props} />;
}

export function ToolbarHideSelectedIcon(props: IconProps) {
  return <VectorToolbarSpriteIcon rect={{ x: 138, y: 0, width: 27, height: 27 }} {...props} />;
}

export function ToolbarCaretDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <path d="m16 19 8 9 8-9z" fill="currentColor" />
    </svg>
  );
}

export function ToolbarIntersectionIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="toolbar-vector-art-icon" {...props}>
      <circle cx="19" cy="24" r="13" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="29" cy="24" r="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeDasharray="4 3" />
      <path d="M24 11.99A13 13 0 0 1 24 36.01A13 13 0 0 1 24 11.99Z" fill="currentColor" opacity="0.82" />
    </svg>
  );
}

// Hull (#863): two parts of different sizes, wrapped in one outline that touches both.
export function ToolbarHullIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="toolbar-vector-art-icon" {...props}>
      <path d="M13.4 19.2L29.4 11.1A12 12 0 1 1 29.4 34.9L13.4 30.8A6 6 0 0 1 13.4 19.2Z" fill="currentColor" opacity="0.22" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="14" cy="25" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2.5" />
      <circle cx="32" cy="23" r="12" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2.5" />
    </svg>
  );
}

// Loft between two sketches: a small outline above a large one, joined by the walls between them.
export function ToolbarLoftSketchesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="toolbar-vector-art-icon" {...props}>
      <path d="M17 11H31L42 37H6Z" fill="currentColor" opacity="0.22" />
      <path d="M17 11L6 37M31 11L42 37" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="15" y="7" width="18" height="8" rx="3" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <rect x="4" y="32" width="40" height="10" rx="4" fill="none" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  );
}

// The class gives it the same disabled dimming as the rest of the ribbon; the
// bare theme colour alone left it looking live on the dark grounds.
export function ToolbarIntersectPreviewIcon({ className, ...props }: IconProps) {
  return <Blend className={["toolbar-vector-art-icon", className].filter(Boolean).join(" ")} {...props} />;
}

export function ToolbarAlignIcon(props: IconProps) {
  return <ToolbarSpriteIcon rect={{ x: 97.3, y: 46.7, width: 29.1, height: 32.5 }} {...props} />;
}

// The drawn PNG set gave way to vectors so tool icons can take their group colour.
export {
  SketchBoltCircleIcon,
  SketchEllipseIcon,
  SketchHalfCircleIcon,
  SketchPieSliceIcon,
  ToolbarAttachmentsIcon,
  ToolbarCenterOnWorkplaneIcon,
  ToolbarChamferIcon,
  ToolbarCookieCutterIcon,
  ToolbarCopyIcon,
  ToolbarDropToWorkplaneIcon,
  ToolbarDuplicateIcon,
  ToolbarExportIcon,
  ToolbarFilletIcon,
  ToolbarFlexiIcon,
  ToolbarHistoryIcon,
  ToolbarHollowIcon,
  ToolbarOffsetIcon,
  ToolbarCutOutIcon,
  ToolbarDeleteFaceIcon,
  ToolbarSimplifyIcon,
  ToolbarSurfaceTextureIcon,
  ToolbarBundleIcon,
  ToolbarGroupIcon,
  ToolbarGuideIcon,
  ToolbarHomeIcon,
  ToolbarImportIcon,
  ToolbarKeyboardIcon,
  ToolbarMirrorIcon,
  ToolbarRotationPivotIcon,
  ToolbarPatternIcon,
  ToolbarHolePatternIcon,
  ToolbarFaceToolIcon,
  ToolbarConstructionLineIcon,
  ToolbarMiddleLineIcon,
  ToolbarLayFlatIcon,
  ToolbarLidIcon,
  ToolbarMateFacesIcon,
  ToolbarNoteIcon,
  ToolbarSplitIcon,
  ToolbarPasteIcon,
  ToolbarRedoIcon,
  ToolbarSettingsIcon,
  ToolbarSnapGridIcon,
  ToolbarTrashIcon,
  ToolbarUndoIcon,
  ToolbarUngroupIcon,
  ToolbarVectorExportIcon,
  ToolbarWorkplaneIcon,
} from "@/components/toolbarIcons";
