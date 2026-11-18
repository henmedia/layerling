"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Eye, EyeOff, Pencil, Trash2, Unlink, X } from "lucide-react";
import { ToolbarOffsetIcon } from "@/components/toolbarIcons";
import { sketchOffsetSliderLimit } from "@/lib/sketchOffsetSelection";
import { createLocalId } from "@/lib/localIds";
import { currentLengthUnitLabel, formatLengthMm, parseLengthMm } from "@/lib/measurementUnits";
import { orderedSketchPaths } from "@/lib/sketchSmoothHandles";
import { offsetGeometryProfile, removeSketchOffset, sketchOffsetGeometry, sketchOffsetSource, updateSketchOffsets } from "@/lib/sketchOffsets";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import type { SketchOffset, SketchProfile } from "@/types/layerling";

const PANEL: MovablePanelOptions = { floatingStyle: { right: "auto", bottom: "auto" },
  dockedAt: (area, panel) => ({ left: area.width - panel.width, top: 0 }) };

export function SketchOffsetPanel({ profile, selectedSegmentIds, featureId, accuracy, distanceRequest, onCommit, onPreview,
  onEdit, onClose }: {
  profile: SketchProfile; selectedSegmentIds: string[]; featureId: string | null; accuracy: 1 | 2 | 3;
  onCommit: (profile: SketchProfile) => boolean | undefined;
  distanceRequest?: { value: number } | null;
  onPreview: (profile: SketchProfile | null, details?: { sourceSegmentIds: string[]; distance: number; changed?: boolean }) => void;
  onEdit: (id: string | null) => void;
  onClose: () => void;
}) {
  const feature = profile.offsets?.find((offset) => offset.id === featureId);
  const defaultName = `Offset ${(profile.offsets?.length ?? 0) + 1}`;
  const [nameText, setNameText] = useState(feature?.name ?? (feature ? `Offset ${profile.offsets!.indexOf(feature) + 1}` : defaultName));
  const createRef = useRef<HTMLLIElement>(null);
  const [distanceText, setDistanceText] = useState(formatLengthMm(feature?.distance ?? 2, accuracy));
  const [join, setJoin] = useState<SketchOffset["join"]>(feature?.join ?? "miter");
  const [limitText, setLimitText] = useState(String(feature?.miterLimit ?? 4));
  const [wholePath, setWholePath] = useState(true);
  const [associative, setAssociative] = useState(true);
  const [bothSides, setBothSides] = useState(false);
  const [independent, setIndependent] = useState(false);
  const [secondText, setSecondText] = useState(formatLengthMm(2, accuracy));
  const [error, setError] = useState<string>();
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [editingName, setEditingName] = useState<{ id: string; draft: string } | null>(null);
  // Saved parameter changes (including undo/redo) update their own fields without erasing other drafts.
  useEffect(() => { if (feature) setDistanceText(formatLengthMm(feature.distance, accuracy)); }, [feature?.distance, accuracy]);
  useEffect(() => { if (feature) setJoin(feature.join); }, [feature?.join]);
  useEffect(() => { if (feature) setLimitText(String(feature.miterLimit)); }, [feature?.miterLimit]);
  useEffect(() => { if (feature) setNameText(feature.name ?? `Offset ${profile.offsets!.indexOf(feature) + 1}`); }, [feature?.name]);
  useEffect(() => {
    if (distanceRequest) setDistanceText(formatLengthMm(distanceRequest.value, accuracy));
  }, [distanceRequest, accuracy]);
  const movable = useMovablePanel<HTMLElement>("layerling.sketch.offsetPanelPosition", PANEL);
  const distance = parseLengthMm(distanceText), miterLimit = Number(limitText);
  // Formatting a saved value for display must not count as an edit or round it on another change.
  const displayedSavedDistance = feature ? parseLengthMm(formatLengthMm(feature.distance, accuracy)) : undefined;
  const distanceChanged = Boolean(feature && distance !== feature.distance && distance !== displayedSavedDistance);
  const hasChanges = !feature || distanceChanged || join !== feature.join || miterLimit !== feature.miterLimit;
  const selectionKey = selectedSegmentIds.join("|");
  const preview = useMemo(() => {
    try {
      let source = feature?.sourceSegmentIds ?? selectedSegmentIds;
      if (!feature && wholePath && source.length === 1) {
        const path = orderedSketchPaths(profile).find((candidate) => candidate.steps.some((step) => step.segment.id === source[0]));
        if (path) source = path.steps.map((step) => step.segment.id);
      }
      const path = sketchOffsetSource(profile, source);
      const geometry = sketchOffsetGeometry(profile, source, distance, join, miterLimit);
      const draft: SketchOffset = { id: "offset-preview", sourceSegmentIds: source, pointIds: [], segmentIds: [], distance, join, miterLimit };
      const generated = offsetGeometryProfile(draft, geometry);
      let second: SketchProfile | null = null;
      if (!feature && bothSides && !path.closed) {
        const otherDistance = independent ? -Math.sign(distance) * Math.abs(parseLengthMm(secondText)) : -distance;
        second = offsetGeometryProfile({ ...draft, id: "offset-preview-other" },
          sketchOffsetGeometry(profile, source, otherDistance, join, miterLimit));
      }
      return { ok: true as const, source, closed: path.closed, approximate: geometry.approximate, profile: {
        points: [...generated.points, ...(second?.points ?? [])], segments: [...generated.segments, ...(second?.segments ?? [])],
      } };
    } catch (failure) {
      return { ok: false as const, message: failure instanceof Error ? failure.message : "The offset preview could not be calculated." };
    }
  }, [profile, feature, selectionKey, distance, join, miterLimit, wholePath, bothSides, independent, secondText]);
  const sliderLimit = sketchOffsetSliderLimit(profile, feature?.sourceSegmentIds ?? (preview.ok ? preview.source : selectedSegmentIds));
  useEffect(() => {
    if (!feature) createRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [featureId, selectionKey]);
  useEffect(() => { onPreview(detailsOpen && preview.ok ? preview.profile : null, detailsOpen && preview.ok ? { sourceSegmentIds: preview.source, distance, changed: hasChanges } : undefined); }, [preview, distance, detailsOpen, hasChanges, onPreview]);
  useEffect(() => () => onPreview(null), [onPreview]);

  const apply = () => {
    if (!preview.ok || !hasChanges) return;
    const add = (id: string, value: number): SketchOffset => ({
      id, name: nameText.trim() || undefined, sourceSegmentIds: preview.source, pointIds: [], segmentIds: [], distance: value, join, miterLimit,
    });
    const primary = feature ? { ...feature, name: nameText.trim() || undefined, distance: distanceChanged ? distance : feature.distance, join, miterLimit } : add(createLocalId("sketch-offset"), distance);
    let offsets = feature ? profile.offsets!.map((offset) => offset.id === feature.id ? primary : offset) : [...profile.offsets ?? [], primary];
    if (!feature && bothSides && !preview.closed) {
      offsets = [...offsets, add(createLocalId("sketch-offset"),
        independent ? -Math.sign(distance) * Math.abs(parseLengthMm(secondText)) : -distance)];
    }
    const updated = updateSketchOffsets({ ...profile, offsets });
    if (!updated.ok) { setError(updated.message); return; }
    const next = !feature && !associative
      ? { ...updated.profile, offsets: updated.profile.offsets?.filter((offset) => (profile.offsets ?? []).some((old) => old.id === offset.id)) }
      : updated.profile;
    if (onCommit(next)) {
      setError(undefined);
      onPreview(null);
      if (associative) onEdit(primary.id);
    } else setError("The offset could not be applied. Review the source geometry and constraints.");
  };

  const saveName = () => {
    if (!editingName) return;
    const name = editingName.draft.trim();
    if (editingName.id === "new") setNameText(name);
    else {
      const next = { ...profile, offsets: profile.offsets!.map(offset => offset.id === editingName.id ? { ...offset, name: name || undefined } : offset) };
      if (!onCommit(next)) { setError("The offset could not be renamed."); return; }
      if (editingName.id === featureId) setNameText(name);
    }
    setEditingName(null);
  };
  const nameHeader = (id: string, label: string) => (
    <span className="sketch-constraint-shape-name">
      {editingName?.id === id ? <input className="outliner-rename-input" type="text" data-offset-rename="true"
        aria-label="Offset name" autoFocus maxLength={80} value={editingName.draft}
        onFocus={event => event.currentTarget.select()}
        onClick={event => { event.stopPropagation(); event.preventDefault(); }}
        onChange={event => setEditingName({ id, draft: event.target.value })}
        onBlur={saveName} onKeyDown={event => {
          event.stopPropagation();
          if (event.key === "Enter") { event.preventDefault(); saveName(); }
          if (event.key === "Escape") { event.preventDefault(); setEditingName(null); }
        }} /> : <>
        <span>{label}</span>
        <button className="outliner-action-btn rename-btn" type="button" aria-label={`Rename offset ${label}`} title="Rename offset"
          onClick={event => { event.preventDefault(); event.stopPropagation(); setEditingName({ id, draft: label }); }}><Pencil size={13} /></button>
      </>}
    </span>
  );
  const settings = (
<div className="property-card" style={{ paddingTop: 14 }} aria-label={feature ? "Offset properties" : "New offset properties"}>
        <div className="property-list">
          {!feature && <label className="check-property"><input type="checkbox" checked={wholePath} onChange={(event) => setWholePath(event.target.checked)} />Whole connected path</label>}
          <label className="sketch-image-position-field"><span>Distance ({currentLengthUnitLabel()})</span>
            <input type="text" className="sketch-image-number-input" aria-label="Offset distance" value={distanceText}
              onChange={(event) => { setDistanceText(event.target.value); setError(undefined); }} />
          </label>
          <input type="range" aria-label="Drag offset distance" min={-sliderLimit} max={sliderLimit}
            step={10 ** -accuracy} value={Number.isFinite(distance) ? Math.max(-sliderLimit, Math.min(sliderLimit, distance)) : 0}
            onChange={(event) => setDistanceText(formatLengthMm(Number(event.target.value), accuracy))} />
          <span className="outliner-shape-kind">Slider: ±{formatLengthMm(sliderLimit, accuracy)} {currentLengthUnitLabel()}. Type a distance for a larger offset.</span>
          <span className="outliner-shape-kind">{preview.ok && !preview.closed
            ? "Positive is left of start → end. Negative is right." : "Positive is outset. Negative is inset."}</span>
          {preview.ok && preview.approximate && <span className="outliner-shape-kind">Curve approximation target: 0.01 mm</span>}
          <button type="button" className="inspector-action-button" onClick={() => setDistanceText(formatLengthMm(-distance, accuracy))}>Flip direction</button>
          <label className="sketch-image-position-field"><span>Corner style</span>
            <select aria-label="Offset corner style" value={join} onChange={(event) => setJoin(event.target.value as SketchOffset["join"])}>
              <option value="miter">Miter / Sharp</option><option value="round">Round</option><option value="bevel">Bevel</option>
            </select>
          </label>
          {join === "miter" && <label className="sketch-image-position-field"><span>Miter limit</span>
            <input type="text" className="sketch-image-number-input" aria-label="Offset miter limit" value={limitText} onChange={(event) => setLimitText(event.target.value)} />
          </label>}
          {!feature && <>
            <label className="check-property"><input type="checkbox" checked={associative} onChange={(event) => setAssociative(event.target.checked)} />Keep linked to source</label>
            {preview.ok && !preview.closed && <>
              <label className="check-property"><input type="checkbox" checked={bothSides} onChange={(event) => setBothSides(event.target.checked)} />Both sides</label>
              {bothSides && <>
                <label className="check-property"><input type="checkbox" checked={independent} onChange={(event) => setIndependent(event.target.checked)} />Independent opposite distance</label>
                {independent && <label className="sketch-image-position-field"><span>Opposite distance ({currentLengthUnitLabel()})</span>
                  <input className="sketch-image-number-input" aria-label="Opposite offset distance" value={secondText} onChange={(event) => setSecondText(event.target.value)} />
                </label>}
              </>}
            </>}
          </>}
          {error || !preview.ok ? <p role="alert" className="sketch-constraint-error">{error ?? (!preview.ok ? preview.message : "")}</p> : null}
          <button type="button" className="inspector-action-button" disabled={!preview.ok || !hasChanges} onClick={apply}>{feature ? "Apply offset" : "Create offset"}</button>
          {feature && <button type="button" className="inspector-action-button" onClick={() => {
            if (onCommit(removeSketchOffset(profile, feature.id, true))) onEdit(null);
          }}><Unlink size={16} aria-hidden="true" />Detach geometry</button>}
        </div>
</div>
  );

  return (
    <aside ref={movable.panelRef} style={movable.style}
      className={`shape-inspector sketch-offset-inspector ${movable.moved ? "floating" : ""}`}
      aria-label="Offset and inset" onPointerDown={event => event.stopPropagation()}
      onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") onClose(); }}>
      <div className="shape-inspector-header movable" {...movable.handleProps}>
        <ToolbarOffsetIcon width={17} height={17} aria-hidden="true" /><strong>Offsets</strong>
        <span className="outliner-count-badge">{profile.offsets?.length ?? 0}</span>
        <button type="button" className="inspector-header-icon" aria-label="Close offset settings" onClick={onClose}><X size={16} /></button>
      </div>
      <ul className="outliner-list" aria-label="Sketch offsets">
        {(profile.offsets ?? []).map((offset, index) => {
          const active = featureId === offset.id;
          const label = offset.name ?? `Offset ${index + 1}`;
          const open = active && detailsOpen;
          return <li key={offset.id} className="sketch-constraint-group" data-offset-id={offset.id}>
            <details open={open}>
              <summary className="sketch-constraint-group-header" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
                onClick={event => { event.preventDefault(); if (active) setDetailsOpen(value => !value); else onEdit(offset.id); }}>
                <ChevronDown size={15} aria-hidden="true" />
                <span className="sketch-constraint-group-shapes">{nameHeader(offset.id, label)}</span>
                <button type="button" className="inspector-header-icon" aria-label={offset.hidden ? "Show offset geometry" : "Hide offset geometry"}
                  onClick={event => { event.preventDefault(); event.stopPropagation(); onCommit({ ...profile, offsets: profile.offsets!.map(entry => entry.id === offset.id ? { ...entry, hidden: !entry.hidden } : entry) }); }}>
                  {offset.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button type="button" className="inspector-header-icon danger" aria-label="Delete offset" onClick={event => {
                  event.preventDefault(); event.stopPropagation();
                  if (onCommit(removeSketchOffset(profile, offset.id))) onEdit(null);
                }}><Trash2 size={16} /></button>
              </summary>
              {open && settings}
            </details>
          </li>;
        })}
        <li ref={createRef} className="sketch-constraint-group" aria-label="Create new offset"
          style={!feature ? { outline: "2px solid var(--primary)", outlineOffset: -1 } : undefined}>
          <details open={!feature && detailsOpen}>
            <summary className="sketch-constraint-group-header" aria-expanded={!feature && detailsOpen} aria-label="Create offset settings"
              onClick={event => { event.preventDefault(); if (feature) onEdit(null); else setDetailsOpen(value => !value); }}>
              <ChevronDown size={15} aria-hidden="true" />
              <span className="sketch-constraint-group-shapes">{feature ? "Create offset" : nameHeader("new", nameText || defaultName)}</span>
              {!feature && <span className="outliner-count-badge">New</span>}
            </summary>
            {!feature && detailsOpen && settings}
          </details>
        </li>
      </ul>
    </aside>
  );
}
