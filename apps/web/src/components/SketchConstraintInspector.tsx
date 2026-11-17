"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Eye, EyeOff, ListTree, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { capturePointer } from "@/lib/pointerCapture";

const CONSTRAINT_PANEL: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto" },
  dockedAt: (area, panel) => ({ left: area.width - panel.width, top: 0 }),
};
import { sketchCircleGeometry, sketchOutlineSegments, sketchConstraintReferences, sketchConstraintGroups, sketchConstraintValueError } from "@/lib/sketchConstraints";
import type { SketchConstraint, SketchProfile } from "@/types/layerling";

export function SketchConstraintInspector({ rule, profile, onUpdate, onDelete, onClose, onSelect, onSelectShape, onRenameShape, rejectedConstraintId, annotationsVisible = true, onToggleAnnotations }: {
  rule: SketchConstraint;
  profile: SketchProfile;
  onUpdate?: (id: string, value: number) => boolean | undefined;
  onDelete?: (id: string) => void;
  onClose: () => void;
  onSelect?: (id: string) => void;
  onSelectShape?: (pointIds: string[], segmentIds: string[]) => void;
  onRenameShape?: (pointIds: string[], name: string) => void;
  rejectedConstraintId?: string;
  annotationsVisible?: boolean;
  onToggleAnnotations?: () => void;
}) {
  const radialGap = (() => {
    if (rule.kind !== "concentric") return undefined;
    if (rule.radialGap !== undefined) return rule.radialGap;
    const points = new Map(profile.points.map((point) => [point.id, point]));
    const circles = rule.circles.map((ids) => {
      const segments = sketchOutlineSegments(profile, ids);
      return segments && sketchCircleGeometry(points, segments);
    });
    const [first, second] = circles;
    return first && second ? second.radius - first.radius : undefined;
  })();
  const current = "value" in rule ? rule.value : radialGap === undefined ? undefined : Math.abs(radialGap);
  const [draft, setDraft] = useState(String(current ?? ""));
  const [error, setError] = useState<string>();
  const groups = sketchConstraintReferences(rule);
  const segments = profile.segments.filter((segment) =>
    groups.some((ids) => ids.includes(segment.startId) && ids.includes(segment.endId)));
  const unit = rule.kind === "angle" ? "°" : "mm";
  const listRef = useRef<HTMLUListElement>(null);
  const listDrag = useRef<{ pointerId: number; y: number; height: number; scale: number } | null>(null);
  const [listHeight, setListHeight] = useState(220);
  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem("layerling.sketch.constraintListHeight"));
      if (Number.isFinite(stored) && stored >= 80) setListHeight(stored);
    } catch {
      // The default size works when browser storage is unavailable.
    }
  }, []);
  const resizeList = (height: number) => {
    const next = Math.max(80, Math.round(height));
    setListHeight(next);
    try {
      localStorage.setItem("layerling.sketch.constraintListHeight", String(next));
    } catch {
      // Resizing still works for this panel when browser storage is unavailable.
    }
  };
  const [collapsed, setCollapsed] = useState(false);
  const [geometryOpen, setGeometryOpen] = useState(false);
  const [editingShape, setEditingShape] = useState<{ id: string; groupId: string; pointIds: string[]; draft: string } | null>(null);
  const commitShapeName = () => {
    if (!editingShape) return;
    onRenameShape?.(editingShape.pointIds, editingShape.draft.trim());
    setEditingShape(null);
  };
  const geometryId = useId();
  const movable = useMovablePanel<HTMLElement>("layerling.sketch.constraintInspectorPosition", CONSTRAINT_PANEL);
  const constraints = profile.constraints ?? [rule];
  const constraintGroups = sketchConstraintGroups(profile, constraints);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('.sketch-constraint-row[aria-pressed="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [rule.id]);
  const title = rule.kind.replaceAll("-", " ");
  const deleteConstraint = (id: string) => {
    if (id === rejectedConstraintId) return;
    onDelete?.(id);
    if (id !== rule.id) return;
    const next = constraints.find((entry) => entry.id !== id);
    if (next && onSelect) onSelect(next.id);
    else onClose();
  };
  return (
    <aside ref={movable.panelRef} style={movable.style}
      className={`shape-inspector sketch-constraint-inspector ${collapsed ? "minimized" : ""} ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      role="dialog" aria-label="Constraint inspector"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") onClose();
      }}>
      <div className="shape-inspector-header movable" {...movable.handleProps}>
        <button className="inspector-header-icon" type="button" aria-label={collapsed ? "Expand constraints" : "Collapse constraints"}
          onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <strong>Constraints</strong>
        <span className="outliner-count-badge">{constraints.length}</span>
        <div className="inspector-header-actions">
          <button className="inspector-header-icon" type="button" disabled={!onToggleAnnotations}
            aria-label={annotationsVisible ? "Hide constraint annotations" : "Show constraint annotations"}
            title={annotationsVisible ? "Hide constraint annotations" : "Show constraint annotations"}
            aria-pressed={annotationsVisible} onClick={onToggleAnnotations}>
            {annotationsVisible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button className="inspector-header-icon danger" type="button" disabled={!onDelete || rule.id === rejectedConstraintId}
            aria-label="Delete constraint" title="Delete constraint" onClick={() => deleteConstraint(rule.id)}>
            <Trash2 size={16} />
          </button>
          <button className="inspector-header-icon" type="button" aria-label="Close constraints" title="Close constraints" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>
      {!collapsed && <>
        <ul ref={listRef} style={{ height: listHeight }} className="outliner-list sketch-constraint-list" aria-label="Sketch constraints">
          {constraintGroups.map((group) => (
            <li key={group.id} className="sketch-constraint-group">
              <details open={group.constraints.some((entry) => entry.id === rule.id)}>
                <summary className="sketch-constraint-group-header">
                  <ChevronDown size={15} aria-hidden="true" />
                  <span className="sketch-constraint-group-shapes">
                    {group.shapes.map((shape, index) => (
                      <span className="sketch-constraint-shape-name" key={shape.id}>
                        {index > 0 && <span aria-hidden="true"> + </span>}
                        {editingShape?.id === shape.id && editingShape.groupId === group.id ? (
                          <input className="outliner-rename-input" aria-label="Shape name" autoFocus
                            value={editingShape.draft}
                            onFocus={(event) => event.currentTarget.select()}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setEditingShape({ ...editingShape, draft: event.target.value })}
                            onBlur={commitShapeName}
                            onKeyDown={(event) => {
                              event.stopPropagation();
                              if (event.key === "Enter") { event.preventDefault(); commitShapeName(); }
                              if (event.key === "Escape") { event.preventDefault(); setEditingShape(null); }
                            }} />
                        ) : (
                          <>
                            <button className="sketch-constraint-shape-select" type="button"
                              aria-label={`Select ${shape.name}`}
                              onClick={(event) => { event.stopPropagation(); onSelectShape?.(shape.pointIds, shape.segmentIds); }}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                if (onRenameShape) setEditingShape({ id: shape.id, groupId: group.id, pointIds: shape.pointIds, draft: shape.name });
                              }}>{shape.name}</button>
                            <button className="outliner-action-btn rename-btn" type="button" disabled={!onRenameShape}
                              aria-label={`Rename ${shape.name}`} title="Rename shape"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingShape({ id: shape.id, groupId: group.id, pointIds: shape.pointIds, draft: shape.name });
                              }}><Pencil size={13} /></button>
                          </>
                        )}
                      </span>
                    ))}
                    {!group.shapes.length && group.label}
                  </span>
                  <span className="outliner-count-badge">{group.constraints.length}</span>
                </summary>
                <ul className="outliner-list">
                  {group.constraints.length === 0 && (
                    <li className="outliner-item"><span className="outliner-row-main outliner-shape-kind">No constraints</span></li>
                  )}
          {group.constraints.map((entry) => {
            const partners = constraintGroups.filter((other) => other.id !== group.id &&
              other.constraints.some((constraint) => constraint.id === entry.id)).map((other) => other.label);
            return (
            <li className={`outliner-item ${entry.id === rule.id ? "selected" : ""}`} key={entry.id}>
              <div className="sketch-constraint-list-row">
              <button className="outliner-row-main sketch-constraint-row" type="button"
                aria-pressed={entry.id === rule.id} onClick={() => onSelect?.(entry.id)}>
                <ListTree size={16} aria-hidden="true" />
                <span className="outliner-info outliner-label-group">
                  <span className="outliner-shape-name">{entry.kind.replaceAll("-", " ")}</span>
                  <span className="outliner-shape-kind">
                    {"value" in entry ? `${entry.value} ${entry.kind === "angle" ? "°" : "mm"}`
                      : entry.kind === "concentric" && entry.radialGap !== undefined ? `Offset ${Math.abs(entry.radialGap)} mm` : "Geometric relation"}
                    {partners.length > 0 && ` · with ${partners.join(", ")}`}
                    {entry.id === rejectedConstraintId && " · rejected attempt"}
                  </span>
                </span>
              </button>
              <button className="inspector-header-icon danger" type="button" disabled={!onDelete || entry.id === rejectedConstraintId}
                aria-label={`Delete ${entry.kind.replaceAll("-", " ")} constraint`} title="Delete this constraint"
                onClick={() => deleteConstraint(entry.id)}>
                <Trash2 size={15} />
              </button>
              </div>
            </li>
            );
          })}
                </ul>
              </details>
            </li>
          ))}
        </ul>
        <div className="sketch-constraint-list-resize" role="separator" tabIndex={0}
          aria-label="Resize constraint list" aria-orientation="horizontal" aria-valuemin={80} aria-valuenow={listHeight}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            const list = listRef.current;
            const scale = list?.offsetHeight ? list.getBoundingClientRect().height / list.offsetHeight : 1;
            listDrag.current = { pointerId: event.pointerId, y: event.clientY, height: listHeight, scale: scale || 1 };
            capturePointer(event.currentTarget, event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = listDrag.current;
            if (drag && drag.pointerId === event.pointerId) resizeList(drag.height + (event.clientY - drag.y) / drag.scale);
          }}
          onPointerUp={() => { listDrag.current = null; }}
          onPointerCancel={() => { listDrag.current = null; }}
          onLostPointerCapture={() => { listDrag.current = null; }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            resizeList(listHeight + (event.key === "ArrowDown" ? 20 : -20));
          }} />
        <div className="property-card">
          {rule.id === rejectedConstraintId && <p className="sketch-constraint-error">This constraint attempt was rejected. The saved sketch is unchanged.</p>}
          <div className="property-card-header">
            <span className="property-card-title"><SlidersHorizontal size={20} aria-hidden="true" />Properties</span>
          </div>
          <div className="property-list">
            <div className="sketch-constraint-property"><span>Type</span><strong>{title}</strong></div>
            {current !== undefined && (
              <form className="property-list" onSubmit={(event) => {
                event.preventDefault();
                if (rule.id === rejectedConstraintId) return;
                const value = draft.trim() ? Number(draft.replace(",", ".")) : NaN;
                const validation = sketchConstraintValueError(rule, value);
                if (validation) { setError(validation); return; }
                const signedValue = rule.kind === "concentric" && (radialGap ?? 0) < 0 ? -value : value;
                const saved = onUpdate?.(rule.id, signedValue);
                setError(saved ? undefined : "Could not apply this value. Review the highlighted geometry.");
              }}>
                <label className="sketch-image-position-field">
                  <span>{rule.kind === "concentric" ? "Radial offset" : "Value"}</span>
                  <div className="sketch-image-range-row">
                    <input className="sketch-image-number-input" inputMode="decimal" aria-label="Constraint value" readOnly={rule.id === rejectedConstraintId} value={draft}
                      onFocus={(event) => event.currentTarget.select()} onChange={(event) => setDraft(event.target.value)} />
                    <span>{unit}</span>
                  </div>
                </label>
                <button className="inspector-action-button" type="submit" disabled={!onUpdate || rule.id === rejectedConstraintId}>Apply</button>
              </form>
            )}
            {error && <span className="sketch-constraint-error" role="alert">{error}</span>}
          </div>
        </div>
        <div className={`property-card ${geometryOpen ? "" : "collapsed"}`}>
          <button className="property-card-header" type="button" aria-expanded={geometryOpen} aria-controls={geometryId}
            onClick={() => setGeometryOpen(!geometryOpen)}>
            <span className="property-card-title"><ListTree size={20} aria-hidden="true" />Geometry</span>
            <ChevronUp size={18} className={geometryOpen ? "" : "collapsed"} aria-hidden="true" />
          </button>
          {geometryOpen && <div className="property-list" id={geometryId}>
            <span>Affects {segments.length} edges and {new Set(groups.flat()).size} points</span>
            <ul className="outliner-list sketch-constraint-geometry">
              {segments.map((segment, index) => (
                <li className="outliner-item" key={segment.id} title={segment.id}>
                  <span className="outliner-row-main">Edge {index + 1}</span>
                </li>
              ))}
              {[...new Set(groups.flat())].map((id, index) => (
                <li className="outliner-item" key={id} title={id}>
                  <span className="outliner-row-main">Point {index + 1}</span>
                </li>
              ))}
            </ul>
          </div>}
        </div>
      </>}
    </aside>
  );
}
