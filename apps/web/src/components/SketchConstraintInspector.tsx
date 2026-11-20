"use client";

import { sketchConstraintLabel } from "@/lib/sketchConstraintLabels";
import { localizedError } from "@/lib/userErrors";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Eye, EyeOff, ListTree, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { capturePointer } from "@/lib/pointerCapture";

const CONSTRAINT_PANEL: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto" },
  dockedAt: (area, panel) => ({ left: area.width - panel.width, top: 0 }),
};
import { sketchCircleGeometry, sketchOutlineSegments, sketchConstraintReferences, sketchConstraintRelationships, sketchConstraintGroups, sketchConstraintValueError } from "@/lib/sketchConstraints";
import type { SketchConstraint, SketchProfile } from "@/types/layerling";

export function SketchConstraintInspector({ rule: requestedRule, profile, onUpdate, onDelete, onClose, onSelect, onSelectShape, onRenameShape, rejectedConstraintId, annotationsVisible = true, onToggleAnnotations }: {
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
  useLanguage();
  const allConstraints = profile.constraints ?? [requestedRule];
  const relationships = sketchConstraintRelationships(profile, allConstraints);
  const relationship = relationships.find((entry) => entry.members.some((member) => member.id === requestedRule.id)) ?? { rule: requestedRule, members: [requestedRule], references: sketchConstraintReferences(requestedRule) };
  const rule = relationship.rule;
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
  const groups = relationship.references;
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
  const constraints = relationships.map((entry) => entry.rule);
  const constraintGroups = sketchConstraintGroups(profile, allConstraints).map((group) => ({ ...group,
    constraints: relationships.filter((entry) => entry.members.some((member) => group.constraints.some((rule) => rule.id === member.id))).map((entry) => entry.rule),
  }));
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('.sketch-constraint-row[aria-pressed="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [rule.id]);
  const title = sketchConstraintLabel(rule.kind);
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
      role="dialog" aria-label={t("sketchUi.constraintInspector")}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") onClose();
      }}>
      <div className="shape-inspector-header movable" {...movable.handleProps}>
        <button className="inspector-header-icon" type="button" aria-label={collapsed ? t("sketchUi.expandConstraints") : t("sketchUi.collapseConstraints")}
          onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <strong>{t("sketchUi.constraints")}</strong>
        <span className="outliner-count-badge">{constraints.length}</span>
        <div className="inspector-header-actions">
          <button className="inspector-header-icon" type="button" disabled={!onToggleAnnotations}
            aria-label={annotationsVisible ? t("sketchUi.hideConstraintAnnotations") : t("sketchUi.showConstraintAnnotations")}
            title={annotationsVisible ? t("sketchUi.hideConstraintAnnotations") : t("sketchUi.showConstraintAnnotations")}
            aria-pressed={annotationsVisible} onClick={onToggleAnnotations}>
            {annotationsVisible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button className="inspector-header-icon danger" type="button" disabled={!onDelete || rule.id === rejectedConstraintId}
            aria-label={t("sketchUi.deleteConstraint")} title={t("sketchUi.deleteConstraint")} onClick={() => deleteConstraint(rule.id)}>
            <Trash2 size={16} />
          </button>
          <button className="inspector-header-icon" type="button" aria-label={t("sketchUi.closeConstraints")} title={t("sketchUi.closeConstraints")} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>
      {!collapsed && <>
        <ul ref={listRef} style={{ height: listHeight }} className="outliner-list sketch-constraint-list" aria-label={t("sketchUi.sketchConstraints")}>
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
                          <input className="outliner-rename-input" aria-label={t("sketchUi.shapeName")} autoFocus
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
                              aria-label={t("sketchUi.select", { value0: shape.name })}
                              onClick={(event) => { event.stopPropagation(); onSelectShape?.(shape.pointIds, shape.segmentIds); }}
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                if (onRenameShape) setEditingShape({ id: shape.id, groupId: group.id, pointIds: shape.pointIds, draft: shape.name });
                              }}>{shape.name}</button>
                            <button className="outliner-action-btn rename-btn" type="button" disabled={!onRenameShape}
                              aria-label={t("sketchUi.rename", { value0: shape.name })} title={t("sketchUi.renameShape")}
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
                    <li className="outliner-item"><span className="outliner-row-main outliner-shape-kind">{t("sketchUi.noConstraints")}</span></li>
                  )}
          {group.constraints.map((entry) => {
            const members = relationships.find((item) => item.rule.id === entry.id)!.members;
            const pairCount = members.reduce((sum, member) => sum + (member.kind === "symmetry" && member.pair ? 2 : 1), 0);
            const partners = constraintGroups.filter((other) => other.id !== group.id &&
              other.constraints.some((constraint) => constraint.id === entry.id)).map((other) => other.label);
            return (
            <li className={`outliner-item ${entry.id === rule.id ? "selected" : ""}`} key={entry.id}>
              <div className="sketch-constraint-list-row">
              <button className="outliner-row-main sketch-constraint-row" type="button"
                aria-pressed={entry.id === rule.id} onClick={() => onSelect?.(entry.id)}>
                <ListTree size={16} aria-hidden="true" />
                <span className="outliner-info outliner-label-group">
                  <span className="outliner-shape-name">{sketchConstraintLabel(entry.kind)}</span>
                  <span className="outliner-shape-kind">
                    {"value" in entry ? `${entry.value} ${entry.kind === "angle" ? "°" : "mm"}`
                      : entry.kind === "concentric" && entry.radialGap !== undefined ? t("sketchUi.offsetMm", { value0: Math.abs(entry.radialGap) }) : members.length > 1
                        ? t("sketchUi.linkedSymmetryPointPairs", { value0: pairCount }) : t("sketchUi.geometricRelation")}
                    {partners.length > 0 && t("sketchUi.withShapes", { shapes: partners.join(", ") })}
                    {entry.id === rejectedConstraintId && t("sketchUi.rejectedAttempt")}
                  </span>
                </span>
              </button>
              <button className="inspector-header-icon danger" type="button" disabled={!onDelete || entry.id === rejectedConstraintId}
                aria-label={t("sketchUi.deleteConstraint2", { value0: sketchConstraintLabel(entry.kind) })} title={t("sketchUi.deleteThisConstraint")}
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
          aria-label={t("sketchUi.resizeConstraintList")} aria-orientation="horizontal" aria-valuemin={80} aria-valuenow={listHeight}
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
          {rule.id === rejectedConstraintId && <p className="sketch-constraint-error">{t("sketchUi.thisConstraintAttemptWasRejectedTheSavedSketchIs")}</p>}
          <div className="property-card-header">
            <span className="property-card-title"><SlidersHorizontal size={20} aria-hidden="true" />{t("inspector.properties")}</span>
          </div>
          <div className="property-list">
            <div className="sketch-constraint-property"><span>{t("prop.gridfinityType")}</span><strong>{title}</strong></div>
            {current !== undefined && (
              <form className="property-list" onSubmit={(event) => {
                event.preventDefault();
                if (rule.id === rejectedConstraintId) return;
                const value = draft.trim() ? Number(draft.replace(",", ".")) : NaN;
                const validation = sketchConstraintValueError(rule, value);
                if (validation) { setError(validation); return; }
                const signedValue = rule.kind === "concentric" && (radialGap ?? 0) < 0 ? -value : value;
                const saved = onUpdate?.(rule.id, signedValue);
                setError(saved ? undefined : t("sketchUi.couldNotApplyThisValueReviewTheHighlightedGeometry"));
              }}>
                <label className="sketch-image-position-field">
                  <span>{rule.kind === "concentric" ? t("sketchUi.radialOffset") : t("sketchUi.value")}</span>
                  <div className="sketch-image-range-row">
                    <input className="sketch-image-number-input" inputMode="decimal" aria-label={t("sketchUi.constraintValue")} readOnly={rule.id === rejectedConstraintId} value={draft}
                      onFocus={(event) => event.currentTarget.select()} onChange={(event) => setDraft(event.target.value)} />
                    <span>{unit}</span>
                  </div>
                </label>
                <button className="inspector-action-button" type="submit" disabled={!onUpdate || rule.id === rejectedConstraintId}>{t("align.gapApply")}</button>
              </form>
            )}
            {error && <span className="sketch-constraint-error" role="alert">{localizedError(error)}</span>}
          </div>
        </div>
        <div className={`property-card ${geometryOpen ? "" : "collapsed"}`}>
          <button className="property-card-header" type="button" aria-expanded={geometryOpen} aria-controls={geometryId}
            onClick={() => setGeometryOpen(!geometryOpen)}>
            <span className="property-card-title"><ListTree size={20} aria-hidden="true" />{t("sketchUi.geometry")}</span>
            <ChevronUp size={18} className={geometryOpen ? "" : "collapsed"} aria-hidden="true" />
          </button>
          {geometryOpen && <div className="property-list" id={geometryId}>
            {(rule.kind === "midpoint" || rule.kind === "point-on-line") && <span>
              {t("sketchUi.pointReference", { point: rule.c, a: rule.a, b: rule.b })}
              {rule.kind === "point-on-line" && ` ${t("sketchUi.infiniteLine")}`}
            </span>}
            {rule.kind === "symmetry" && <span>{t("sketchUi.reflectedGeometry", {
              geometry: t(rule.pair ? "sketchUi.segments" : "sketchUi.points"),
              pairs: `${rule.a} ↔ ${rule.b}${rule.pair ? `; ${rule.pair[0]} ↔ ${rule.pair[1]}` : ""}`,
              axis: rule.axis.join(" → "),
            })}</span>}
            {relationship.members.length > 1 && <span>{t("sketchUi.theseShapesShareOneSymmetryRelationshipDeletingItReleases")}</span>}
            <span>{t("sketchUi.affectedGeometry", { edges: segments.length, points: new Set(groups.flat()).size })}</span>
            <ul className="outliner-list sketch-constraint-geometry">
              {segments.map((segment, index) => (
                <li className="outliner-item" key={segment.id} title={segment.id}>
                  <span className="outliner-row-main">{t("inspector.positionEdge")} {index + 1}</span>
                </li>
              ))}
              {[...new Set(groups.flat())].map((id, index) => (
                <li className="outliner-item" key={id} title={id}>
                  <span className="outliner-row-main">{t("sketchUi.point")} {index + 1}</span>
                </li>
              ))}
            </ul>
          </div>}
        </div>
      </>}
    </aside>
  );
}
