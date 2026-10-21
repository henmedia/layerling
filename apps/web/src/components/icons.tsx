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
  ToolbarCenterOnWorkplaneIcon,
  ToolbarChamferIcon,
  ToolbarCopyIcon,
  ToolbarDropToWorkplaneIcon,
  ToolbarDuplicateIcon,
  ToolbarExportIcon,
  ToolbarFilletIcon,
  ToolbarHistoryIcon,
  ToolbarHollowIcon,
  ToolbarDeleteFaceIcon,
  ToolbarSimplifyIcon,
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
