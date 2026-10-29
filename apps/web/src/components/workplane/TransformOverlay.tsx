import { useRef, type CSSProperties } from "react";
import { Lock } from "lucide-react";
import { t } from "@/lib/i18n";
import * as THREE from "three";
import {
  measureKeyForHandle,
  ROTATION_WHEEL_SHIFT_SNAP_DEGREES,
  ROTATION_WHEEL_SNAP_DEGREES,
  type TransformOverlayProps,
  type TransformOverlayState,
} from "@/components/workplane/transformOverlayTypes";

export {
  continuousSnappedWheelRotation,
  dimensionMarkNeedsScreenLayout,
  dimensionMarkScreenPush,
  getElevationMeasureKey,
  isPointInsideTransformBounds,
  measureKeyForHandle,
  normalizedRotationPlaneBasis,
  rotateHandleArrow,
  rotationPlaneDirectionSign,
  screenSpaceDimensionMark,
  transformBoundsIntersectClipVolume,
  transformOverlayScreenPoint,
  snappedRotationDelta,
  snappedWheelRotation,
  DIMENSION_LABEL_MAX_SCREEN_OFFSET,
  DIMENSION_LABEL_MIN_SCREEN_OFFSET,
  ROTATION_WHEEL_SHIFT_SNAP_DEGREES,
  ROTATION_WHEEL_SNAP_DEGREES,
  type DimensionMark,
  type EditingCorner,
  type EditingDimension,
  type EditingRotation,
  type PinnedRotationWheelView,
  type RotationAxis,
  type RotationPlaneBasis,
  type RotationPlaneView,
  type RotationReadout,
  type RotationWheelView,
  type TransformHandleKind,
  type TransformOverlayState,
} from "@/components/workplane/transformOverlayTypes";
import { selectWholeValue } from "@/lib/numberField";
import { useTouchSecondTap } from "@/lib/touchSecondTap";
import { visibleWorkArea, type VisibleWorkArea } from "@/lib/visibleWorkArea";

/** Below this many screen pixels across, the handles of a touch screen lose their wide catch zone (#574). */
const SMALL_BODY_SCREEN_PX = 80;

/** A figure's place, pulled in so the whole box of it stays inside the visible area. */
function overlayPoint(area: VisibleWorkArea, x: number, y: number): CSSProperties {
  const halfWidth = 40;
  const halfHeight = 16;
  const clampInto = (value: number, low: number, high: number) => (high < low ? (low + high) / 2 : Math.min(high, Math.max(low, value)));
  return {
    "--overlay-x": `${clampInto(x, area.left + halfWidth, area.right - halfWidth)}px`,
    "--overlay-y": `${clampInto(y, area.top + halfHeight, area.bottom - halfHeight)}px`,
  } as CSSProperties;
}

export function TransformOverlay({
  box,
  measureKey,
  editingDimension,
  editingCorner,
  editingRotation,
  rotationReadout,
  angleBadge = null,
  locked = false,
  showRotationWheel,
  hideSelectionChrome,
  hideDimensionMarks,
  rotationWheelAxis,
  pinnedRotationWheelView,
  onBeginCameraDrag,
  onCameraWheel,
  onBeginPivotDrag,
  onBeginTransform,
  onMoveTransform,
  onFinishTransform,
  onHoverMeasure,
  onPinMeasure,
  onBeginDimensionEdit,
  onBeginLiftEdit,
  onBeginCornerEdit,
  onEditingCornerChange,
  onCommitCornerEdit,
  onCancelCornerEdit,
  onEditingDimensionChange,
  onCommitDimensionEdit,
  onTabDimensionEdit,
  onCancelDimensionEdit,
  onBeginRotationEdit,
  onEditingRotationChange,
  onCommitRotationEdit,
  onCancelRotationEdit,
}: TransformOverlayProps) {
  // With no handle hovered or pinned, a lone selection shows the marks listed
  // in alwaysVisibleDimensionKeys. That list is filled when "Dimensions always
  // visible" is on, so the marks appear as soon as the shape is selected.
  const rootRef = useRef<HTMLDivElement>(null);
  const { armed, accept } = useTouchSecondTap();
  const keepVisible = visibleWorkArea(rootRef.current, box.width, box.height);
  const marks = measureKey
    ? (box.dimensions[measureKey] ?? [])
    : box.alwaysVisibleDimensionKeys.flatMap((key) => (box.dimensions[key] ?? []).filter((mark) => !mark.labelOnly));
  const visibleMarks = (hideDimensionMarks ? [] : marks).filter((mark) => mark.key !== editingDimension?.key && !editingCorner?.entries.some((entry) => entry.key === mark.key));
  const handleMeasureKey = (handle: TransformOverlayState["handles"][number]) => measureKeyForHandle(handle.kind, handle.key, box);
  // A tick for every step the turn snaps to: 22.5°, and 11.25° while Shift is held inside the wheel.
  const tickStep = rotationReadout?.fine ? ROTATION_WHEEL_SHIFT_SNAP_DEGREES : ROTATION_WHEEL_SNAP_DEGREES;
  const protractorTicks = Array.from({ length: Math.round(360 / tickStep) }, (_, index) => {
    const tickDegrees = index * tickStep;
    const degrees = tickDegrees - 90;
    const radians = THREE.MathUtils.degToRad(degrees);
    const major = tickDegrees % 45 === 0;
    const fine = tickDegrees % ROTATION_WHEEL_SNAP_DEGREES !== 0;
    const outer = 94;
    const inner = major ? 80 : fine ? 90 : 86;
    return {
      key: `tick-${index}`,
      major,
      fine,
      x1: Math.cos(radians) * inner,
      y1: Math.sin(radians) * inner,
      x2: Math.cos(radians) * outer,
      y2: Math.sin(radians) * outer,
    };
  });
  const activeAngle = rotationReadout?.angle ?? 0;
  const activeRadians = rotationReadout?.pointerAngle === undefined
    ? THREE.MathUtils.degToRad(activeAngle - 90)
    : THREE.MathUtils.degToRad(rotationReadout.pointerAngle);
  const activeLine = {
    x: Math.cos(activeRadians) * 92,
    y: Math.sin(activeRadians) * 92,
  };
  const pinnedWheel = pinnedRotationWheelView?.axis === rotationWheelAxis ? pinnedRotationWheelView : null;
  const plane = pinnedWheel?.plane ?? box.rotationPlanes[rotationWheelAxis];
  const wheel = pinnedWheel?.wheel ?? box.rotationWheels[rotationWheelAxis] ?? box.rotationWheel;
  // A locked selection wears a lock beside the arrow that lifts it.
  const liftHandle = locked ? box.handles.find((handle) => handle.kind === "lift") : undefined;
  // A body that is small on the screen: the wide catch zone the handles have for a finger would cover all of it (#574).
  const scaleHandles = box.handles.filter((handle) => handle.kind === "scale");
  const smallOnScreen = scaleHandles.length > 0
    && Math.max(
      Math.max(...scaleHandles.map((handle) => handle.x)) - Math.min(...scaleHandles.map((handle) => handle.x)),
      Math.max(...scaleHandles.map((handle) => handle.y)) - Math.min(...scaleHandles.map((handle) => handle.y)),
    ) < SMALL_BODY_SCREEN_PX;
  return (
    <div
      ref={rootRef}
      className={`transform-overlay ${hideSelectionChrome ? "hide-selection-chrome" : ""} ${locked ? "locked" : ""} ${smallOnScreen ? "small-body" : ""}`}
      onPointerDownCapture={(event) => {
        if (event.button === 1 || event.button === 2) {
          onHoverMeasure(null);
          onPinMeasure(null);
          onBeginCameraDrag(event);
        }
      }}
      onWheelCapture={onCameraWheel}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {showRotationWheel && wheel && plane ? (
        <svg
          className={`rotation-protractor-plane axis-${rotationWheelAxis}`}
          aria-hidden="true"
          viewBox={`0 0 ${box.width} ${box.height}`}
          preserveAspectRatio="none"
          onPointerDown={(event) => {
            if (event.button === 0) {
              onBeginTransform("rotate", `rotate-wheel-${rotationWheelAxis}`, event);
            }
          }}
          onPointerMove={(event) => onMoveTransform(event.clientX, event.clientY, event.shiftKey, event.altKey)}
          onPointerUp={onFinishTransform}
          onPointerCancel={onFinishTransform}
        >
          <g transform={`matrix(${plane.a} ${plane.b} ${plane.c} ${plane.d} ${plane.x} ${plane.y})`}>
            <circle className="rotation-protractor-outer" cx="0" cy="0" r="94" />
            <circle className="rotation-protractor-inner" cx="0" cy="0" r="68" />
            {protractorTicks.map((tick) => (
              <line
                key={tick.key}
                className={tick.major ? "rotation-tick major" : tick.fine ? "rotation-tick fine" : "rotation-tick"}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
              />
            ))}
            <line className="rotation-zero-line" x1="0" y1="0" x2="0" y2="-92" />
            <line className="rotation-current-line" x1="0" y1="0" x2={activeLine.x} y2={activeLine.y} />
            <text className="rotation-zero-label" x="0" y="-75">
              0&deg;
            </text>
          </g>
        </svg>
      ) : null}
      <svg className="transform-guides" viewBox={`0 0 ${box.width} ${box.height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker id="dimension-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0 4 L8 0 L5.2 4 L8 8 Z" />
          </marker>
        </defs>
        {box.guides.map((line, index) => (
          <line key={`guide-${index}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
        ))}
        {visibleMarks.filter((mark) => !mark.labelOnly).map((mark) => (
          <g key={mark.key} className="dimension-mark">
            <line className="dimension-extension" x1={mark.e1x1} y1={mark.e1y1} x2={mark.e1x2} y2={mark.e1y2} />
            <line className="dimension-extension" x1={mark.e2x1} y1={mark.e2y1} x2={mark.e2x2} y2={mark.e2y2} />
            <line className="dimension-line" x1={mark.x1} y1={mark.y1} x2={mark.x2} y2={mark.y2} />
          </g>
        ))}
      </svg>
      {visibleMarks.map((mark) => (
        <button
          key={`${mark.key}-label`}
          className={armed === mark.key ? "dimension-label armed" : "dimension-label"}
          type="button"
          style={overlayPoint(keepVisible, mark.labelX, mark.labelY)}
          disabled={locked}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => { if (accept(mark.key)) onBeginDimensionEdit(mark); }}
        >
          {mark.label}
        </button>
      ))}
      {editingDimension ? (
        <input
          className="dimension-input"
          style={overlayPoint(keepVisible, editingDimension.x, editingDimension.y)}
          value={editingDimension.value}
          autoFocus
          inputMode="decimal"
          onPointerDown={(event) => event.stopPropagation()}
          onFocus={(event) => selectWholeValue(event.currentTarget)}
          onChange={(event) => onEditingDimensionChange(event.target.value)}
          onBlur={() => onCommitDimensionEdit()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onCommitDimensionEdit(event.altKey, event.shiftKey);
            }
            if (event.key === "Escape") {
              onCancelDimensionEdit();
            }
            if (event.key === "Tab") {
              event.preventDefault();
              onTabDimensionEdit(event.shiftKey);
            }
          }}
        />
      ) : null}
      {editingCorner?.entries.map((entry, index) => (
        <input
          key={entry.key}
          className="dimension-input"
          data-corner-input="true"
          style={overlayPoint(keepVisible, entry.x, entry.y)}
          value={entry.value}
          autoFocus={index === 0}
          inputMode="text"
          aria-label={entry.axis === "width" ? t("transform.cornerWidth") : t("transform.cornerDepth")}
          onPointerDown={(event) => event.stopPropagation()}
          onFocus={(event) => selectWholeValue(event.currentTarget)}
          onChange={(event) => onEditingCornerChange(entry.axis, event.target.value)}
          onBlur={(event) => {
            // Tab or a click into the other box keeps the pair open.
            if ((event.relatedTarget as HTMLElement | null)?.dataset?.cornerInput) return;
            onCommitCornerEdit();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommitCornerEdit(event.altKey);
            if (event.key === "Escape") onCancelCornerEdit();
          }}
        />
      ))}
      {editingRotation ? (
        <label className="rotation-edit" style={{ "--overlay-x": `${editingRotation.x}px`, "--overlay-y": `${editingRotation.y}px` } as CSSProperties}>
          <input
            value={editingRotation.value}
            autoFocus
            inputMode="decimal"
            onPointerDown={(event) => event.stopPropagation()}
            onFocus={(event) => selectWholeValue(event.currentTarget)}
            onChange={(event) => onEditingRotationChange(event.target.value)}
            onBlur={onCommitRotationEdit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onCommitRotationEdit();
              }
              if (event.key === "Escape") {
                onCancelRotationEdit();
              }
            }}
          />
          <span>&deg;</span>
        </label>
      ) : null}
      {box.handles.map((handle) => (
        <button
          key={handle.key}
          className={`transform-handle ${handle.className}`}
          style={{
            "--overlay-x": `${handle.x}px`,
            "--overlay-y": `${handle.y}px`,
            "--transform-handle-angle": `${handle.angle ?? 0}deg`,
          } as CSSProperties}
          title={locked ? t("status.objectLocked") : handle.title}
          onPointerEnter={(event) => {
            if ((event.buttons & 4) !== 0) {
              onHoverMeasure(null);
              return;
            }
            onHoverMeasure(handle.kind === "lift" ? null : handleMeasureKey(handle));
          }}
          onPointerLeave={() => onHoverMeasure(null)}
          onPointerDown={(event) => {
            if (event.button !== 0 || locked) {
              return;
            }
            onPinMeasure(handleMeasureKey(handle));
            onBeginTransform(handle.kind, handle.key, event);
          }}
          onPointerMove={(event) => onMoveTransform(event.clientX, event.clientY, event.shiftKey, event.altKey)}
          onPointerUp={onFinishTransform}
          onPointerCancel={onFinishTransform}
          onClick={(event) => {
            if (locked) {
              event.stopPropagation();
            } else if (handle.kind === "lift") {
              event.stopPropagation();
              onBeginLiftEdit(handle.key, handle.x + 42, handle.y - 32);
            } else if (handle.kind === "scale" && handle.className.startsWith("corner")) {
              event.stopPropagation();
              onBeginCornerEdit(handle.key);
            }
          }}
        />
      ))}
      {box.rotateHandles.map((handle) => (
        <button
          key={handle.key}
          className={`rotate-handle ${handle.className}`}
          style={{
            "--overlay-x": `${handle.x}px`,
            "--overlay-y": `${handle.y}px`,
          } as CSSProperties}
          title={locked ? t("status.objectLocked") : t("transform.rotateHandle")}
          onPointerDown={(event) => {
            if (event.button === 0 && !locked) {
              onBeginTransform("rotate", handle.key, event);
            }
          }}
          onPointerMove={(event) => onMoveTransform(event.clientX, event.clientY, event.shiftKey, event.altKey)}
          onPointerUp={onFinishTransform}
          onPointerCancel={onFinishTransform}
          onClick={(event) => {
            event.stopPropagation();
            if (!locked) {
              onBeginRotationEdit(handle.key, handle.x + 34, handle.y - 28);
            }
          }}
        >
          <span className="rotate-handle-icon" aria-hidden="true">
            <svg viewBox="-20 -20 40 40" focusable="false">
              <path className="rotate-arrow-arc" d={handle.arc} />
              <path className="rotate-arrow-heads" d={handle.heads} />
            </svg>
          </span>
        </button>
      ))}
      {liftHandle ? (
        <span
          className="transform-lock-badge"
          title={t("status.objectLocked")}
          style={{ "--overlay-x": `${liftHandle.x + 18}px`, "--overlay-y": `${liftHandle.y}px` } as CSSProperties}
        >
          <Lock size={12} strokeWidth={2.4} aria-hidden="true" />
        </span>
      ) : null}
      {box.pivotMarker ? (
        <span
          className={`rotation-pivot-marker ${onBeginPivotDrag ? "draggable" : ""}`}
          aria-hidden="true"
          title={onBeginPivotDrag ? t("pivot.dragHint") : undefined}
          style={{ "--overlay-x": `${box.pivotMarker.x}px`, "--overlay-y": `${box.pivotMarker.y}px` } as CSSProperties}
          onPointerDown={onBeginPivotDrag}
        />
      ) : null}
      {!hideDimensionMarks && !rotationReadout && angleBadge && box.handles.length > 0 ? (
        // Below the lowest handle, centred under the selection.
        <div
          className="rotation-angle-badge"
          style={{
            "--overlay-x": `${box.handles.reduce((sum, handle) => sum + handle.x, 0) / box.handles.length}px`,
            "--overlay-y": `${Math.max(...box.handles.map((handle) => handle.y)) + 30}px`,
          } as CSSProperties}
        >
          {angleBadge}
        </div>
      ) : null}
      {!hideDimensionMarks && rotationReadout ? (
        <div className="rotation-readout" style={{ "--overlay-x": `${rotationReadout.x}px`, "--overlay-y": `${rotationReadout.y}px` } as CSSProperties}>
          {rotationReadout.text}
        </div>
      ) : null}
    </div>
  );
}
