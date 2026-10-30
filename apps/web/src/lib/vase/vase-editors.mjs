/**
 * Drawing boards for vases, both in millimetres: top view (cross-section at the widest place,
 * base piece + symmetry) and side view (body form, right side, mirrored on the left). Grid in
 * mm, zooming (wheel, two fingers, buttons), panning (drag the background), fitting, snapping
 * to 1 mm. The selected point has number fields (position and angle) and a handle line that
 * drags the angle of the curve.
 *
 *   sectionEditor({ get, set }) / profileEditor({ get, set }) / twistEditor({ get, set }) -> { el, render, fit }
 *
 * The twist curve (twistEditor) shows the angle in degrees across and the height in mm upwards.
 *
 * `get()` returns the current vase settings, `set(patch, { draft })` takes a change (`draft`:
 * while dragging, a rough preview). `render()` after every change. Dragging a point beyond the
 * widest or the topmost one changes the diameter or the height with it - the drawing always
 * shows the real measures.
 *
 * Version for Layerling (taken over from the vase tool): all texts come through `tr(key, params)`
 * (keys vaseDraw.*), notes from the import modules through `note(text)`, numbers in the format of
 * `locale`; a mesh is read by `readMesh(name, bytes)` (triangles, Z up) with Layerling's own import, and
 * Trace's magnetic lasso finds its way along the photo's edges with `edgeLasso` (Layerling's pictureEdgePath).
 */
import {
  DRAW_PRESETS, DRAW_PROFILE, LIMITS, MAX_DRAW_POINTS, MAX_TWIST_ANGLE, PROFILES, PROFILE_CORNER, PROFILE_HANDLE,
  drawnSectionPoints, profileFunction, profileSpline, rotationFunction, secondSectionParams, sectionOutline, sectionTable, twistPointsFrom,
} from './vase-geometry.mjs'
import { svgToProfile, svgToSection } from './svg-import.mjs'
import { meshToProfile } from './vase-import.mjs'
import { findObject, outlineObject, photoPlacement, photoProfile } from './vase-photo.mjs'

const SVG = 'http://www.w3.org/2000/svg'
/** The most points a body form and a twist curve can have (as in the core). */
const MAX_PROFILE_POINTS = 40
const MAX_POINTS_TWIST = 40
const STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100]
const MAJOR = { 0.5: 5, 1: 10, 2: 10, 5: 50, 10: 50, 20: 100, 50: 250, 100: 500 }
/** Grid in degrees (twist curve): minor and major divisions. */
const DEG_STEPS = [1, 5, 15, 45, 90, 180]
const DEG_MAJOR = { 1: 15, 5: 45, 15: 90, 45: 180, 90: 360, 180: 720 }

function svgEl(name, attrs = {}, parent) {
  const el = document.createElementNS(SVG, name)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (parent) parent.append(el)
  return el
}
const pathOf = (pts, closed) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(3)} ${y.toFixed(3)}`).join('') + (closed ? 'Z' : '')
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
/** Number format of the language the drawing boards show right now (every drawing board sets it when it is created). */
let numberLocale = 'de-DE'
const nf = (v, digits = 1) => v.toLocaleString(numberLocale, { minimumFractionDigits: 0, maximumFractionDigits: digits })
/** A number from a text field: comma or point, spaces do not matter. */
const parseNum = (raw) => {
  const s = String(raw).trim().replace(/\s/g, '')
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? n : null
}

let styled = false
function injectStyle() {
  if (styled) return
  styled = true
  const style = document.createElement('style')
  style.textContent = `
  .vz { display: grid; gap: 8px; min-width: 0; --vz-accent: var(--accent, #d27009); --vz-bg: var(--surface, #fffdf9);
    --vz-grid: var(--grid, #e6d6b0); --vz-major: var(--grid-major, #c9a45a); --vz-label: var(--label, #8a7a66); --vz-edge: var(--field-edge, #e1d6c6); }
  .vz-board { position: relative; }
  .vz svg { display: block; width: 100%; height: var(--vz-height, 320px); background: var(--vz-bg); border: 1px solid var(--vz-edge);
    border-radius: 8px; touch-action: none; user-select: none; cursor: grab; outline: none; }
  .vz svg:focus-visible { box-shadow: 0 0 0 2px var(--vz-accent); }
  .vz svg.vz-panning { cursor: grabbing; }
  .vz .vz-g-minor { fill: none; stroke: var(--vz-grid); stroke-width: 1px; vector-effect: non-scaling-stroke; opacity: .55; }
  .vz .vz-g-major { fill: none; stroke: var(--vz-major); stroke-width: 1px; vector-effect: non-scaling-stroke; opacity: .55; }
  .vz .vz-g-label { fill: var(--vz-label); font-family: Arial, sans-serif; font-weight: 600; }
  .vz .vz-axis { fill: none; stroke: var(--vz-label); stroke-width: 1px; stroke-dasharray: 5 4; vector-effect: non-scaling-stroke; }
  .vz .vz-axis-label { fill: var(--vz-label); font-family: Arial, sans-serif; font-weight: 800; }
  .vz .vz-shape { fill: var(--vz-accent); fill-opacity: .13; stroke: var(--vz-accent); stroke-width: 1.5px; vector-effect: non-scaling-stroke; }
  .vz .vz-ghost { fill: var(--vz-accent); fill-opacity: .05; stroke: var(--vz-accent); stroke-opacity: .35; stroke-width: 1px; vector-effect: non-scaling-stroke; }
  .vz .vz-edit { fill: none; stroke: var(--vz-accent); stroke-width: 2.5px; vector-effect: non-scaling-stroke; }
  .vz .vz-curve-hit { fill: none; stroke: transparent; stroke-width: 14px; vector-effect: non-scaling-stroke; cursor: copy; }
  .vz .vz-hit { fill: transparent; cursor: move; }
  .vz .vz-knob { fill: var(--vz-bg); stroke: var(--vz-accent); stroke-width: 2px; vector-effect: non-scaling-stroke; pointer-events: none; }
  .vz .vz-knob.sel { fill: var(--vz-accent); }
  .vz .vz-tangent { stroke: var(--vz-accent); stroke-width: 1.5px; vector-effect: non-scaling-stroke; pointer-events: none; }
  .vz .vz-trace { fill: #e5484d; fill-opacity: .08; stroke: #e5484d; stroke-width: 2px; stroke-dasharray: 6 4; vector-effect: non-scaling-stroke; pointer-events: none; }
  .vz .vz-trace-knob { fill: #fff; stroke: #e5484d; stroke-width: 2px; vector-effect: non-scaling-stroke; pointer-events: none; }
  .vz .vz-lasso { fill: none; stroke: #0b72b9; stroke-width: 2px; vector-effect: non-scaling-stroke; pointer-events: none; }
  .vz .vz-lasso.vz-lasso-hover { stroke-dasharray: 4 3; stroke-opacity: .75; }
  .vz .vz-lasso.vz-lasso-done { fill: #0b72b9; fill-opacity: .06; stroke-dasharray: 6 4; }
  .vz .vz-lasso-knob { fill: #fff; stroke: #0b72b9; stroke-width: 2px; vector-effect: non-scaling-stroke; pointer-events: none; }
  .vz .vz-lasso-knob.vz-first { fill: #0b72b9; }
  .vz svg.vz-lassoing { cursor: crosshair; }
  .vz .vz-tknob { fill: var(--vz-bg); stroke: var(--vz-accent); stroke-width: 1.5px; vector-effect: non-scaling-stroke; pointer-events: none; }
  .vz .vz-readonly { position: absolute; inset: auto 10px 10px 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
    padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--vz-bg) 88%, transparent); border: 1px solid var(--vz-edge); font-size: 12.5px; }
  .vz .vz-zoom { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; }
  .vz .vz-zoom button, .vz .vz-row button { min-height: 30px; padding: 4px 10px; border-radius: 7px; border: 1px solid var(--vz-edge); background: var(--vz-bg);
    font: 700 12.5px/1 var(--font-ui, system-ui, sans-serif); color: inherit; cursor: pointer; }
  .vz .vz-zoom button { min-width: 30px; padding: 4px 0; }
  .vz button[aria-pressed="true"] { border-color: var(--vz-accent); color: var(--vz-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--vz-accent) 22%, transparent); }
  .vz button:disabled { opacity: .45; cursor: default; }
  .vz .vz-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .vz .vz-num { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; color: var(--vz-label); font-weight: 700; }
  .vz .vz-num input { width: 74px; min-height: 30px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--vz-edge); background: var(--vz-bg);
    font: 700 13px/1 var(--font-ui, system-ui, sans-serif); color: inherit; text-align: right; }
  .vz .vz-hint { margin: 0; color: var(--vz-label); font-size: 12.5px; }
  `
  document.head.append(style)
}

/**
 * The shared base: view in mm (y up), grid, zooming, panning, selecting and dragging points,
 * dragging handles, number fields. `api` knows the points of one view.
 */
function drawingBoard(api) {
  injectStyle()
  const tr = api.tr
  const el = document.createElement('div')
  el.className = 'vz'
  const wrap = document.createElement('div')
  wrap.className = 'vz-board'
  const svg = svgEl('svg', { role: 'img', 'aria-label': api.ariaLabel, tabindex: '0' })
  const world = svgEl('g', { transform: 'scale(1,-1)' }, svg)
  // Reference photo (only with api.photo): behind the grid, half transparent.
  const photoG = svgEl('g', {}, world)
  const gridG = svgEl('g', {}, world)
  const shapeG = svgEl('g', {}, world)
  const traceG = svgEl('g', {}, world)
  const knobG = svgEl('g', {}, world)
  const calibG = svgEl('g', {}, world)
  const labelG = svgEl('g', {}, svg) // labels not mirrored
  const zoom = document.createElement('div')
  zoom.className = 'vz-zoom'
  const readonly = document.createElement('div')
  readonly.className = 'vz-readonly'
  readonly.hidden = true
  wrap.append(svg, zoom, readonly)

  const pointRow = document.createElement('div')
  pointRow.className = 'vz-row'
  const numRow = document.createElement('div')
  numRow.className = 'vz-row'
  const editRow = document.createElement('div')
  editRow.className = 'vz-row'
  const hint = document.createElement('p')
  hint.className = 'vz-hint'
  hint.textContent = api.hint
  const photoRow = document.createElement('div')
  photoRow.className = 'vz-row'
  photoRow.hidden = !api.photo
  // Trace's settings, under the photo's row while it is on.
  const traceRow = document.createElement('div')
  traceRow.className = 'vz-row'
  traceRow.hidden = true
  el.append(wrap, pointRow, numRow, editRow, photoRow, traceRow, hint)

  const button = (parent, text, title, fn) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = text
    if (title) { b.title = title; b.setAttribute('aria-label', title) }
    b.addEventListener('click', fn)
    parent.append(b)
    return b
  }

  // View: lower left corner (x0, y0) and width w in mm; the height follows the aspect ratio.
  let view = null
  let snap = false
  let selected = null
  let drag = null
  const pointers = new Map()
  const size = () => [svg.clientWidth || 300, svg.clientHeight || 300]
  const pxPerMm = () => size()[0] / view.w
  function applyView() {
    const [cw, ch] = size()
    const h = (view.w * ch) / cw
    svg.setAttribute('viewBox', `${view.x0} ${-(view.y0 + h)} ${view.w} ${h}`)
    view.h = h
  }
  function fit() {
    const [bx0, by0, bx1, by1] = api.bounds()
    const [cw, ch] = size()
    const margin = 0.12
    const bw = (bx1 - bx0) * (1 + 2 * margin) || 10, bh = (by1 - by0) * (1 + 2 * margin) || 10
    const w = Math.max(bw, (bh * cw) / ch)
    const h = (w * ch) / cw
    view = { x0: (bx0 + bx1) / 2 - w / 2, y0: (by0 + by1) / 2 - h / 2, w }
    render()
  }
  function zoomAt(factor, mx, my) {
    const w = clamp(view.w * factor, 5, 3000)
    const f = w / view.w
    view.x0 = mx - (mx - view.x0) * f
    view.y0 = my - (my - view.y0) * f
    view.w = w
    render()
  }
  const mmOf = (event) => {
    const m = world.getScreenCTM()
    if (!m) return [0, 0]
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse())
    return [pt.x, pt.y]
  }
  // Across, the view can have a unit of its own (twist curve: degrees); `xScale` = mm per unit.
  const xScale = () => (api.xScale ? api.xScale() : 1)
  const snapped = ([x, y]) => (snap ? [Math.round(x / xScale()) * xScale(), Math.round(y)] : [x, y])

  button(zoom, '+', tr('vaseDraw.zoomIn'), () => zoomAt(1 / 1.3, view.x0 + view.w / 2, view.y0 + view.h / 2))
  button(zoom, '−', tr('vaseDraw.zoomOut'), () => zoomAt(1.3, view.x0 + view.w / 2, view.y0 + view.h / 2))
  button(zoom, '⤢', tr('vaseDraw.fit'), () => fit())
  const snapText = api.xScale ? ['1°', tr('vaseDraw.snapDegrees')] : ['1 mm', tr('vaseDraw.snapMm')]
  const snapBtn = button(zoom, snapText[0], snapText[1], () => { snap = !snap; snapBtn.setAttribute('aria-pressed', String(snap)) })
  snapBtn.setAttribute('aria-pressed', 'false')
  snapBtn.style.minWidth = '44px'

  // Kind of the selected point, and tools.
  const kindBtns = {}
  for (const [kind, text, title] of [['rund', tr('vaseDraw.round'), tr('vaseDraw.roundTitle')], ['anfasser', tr('vaseDraw.handle'), tr('vaseDraw.handleTitle')], ['ecke', tr('vaseDraw.corner'), tr('vaseDraw.cornerTitle')]]) {
    kindBtns[kind] = button(pointRow, text, title, () => {
      if (selected === null) return
      api.setKind(selected, kind)
    })
  }
  const addBtn = button(editRow, tr('vaseDraw.addPoint'), tr('vaseDraw.addPointTitle'), () => {
    const at = api.insertAfter(selected)
    if (at !== null) selected = at
  })
  const delBtn = button(editRow, tr('vaseDraw.deletePoint'), tr('vaseDraw.deletePointTitle'), () => {
    if (selected === null || !api.canDelete(selected)) return
    api.remove(selected)
    selected = null
  })
  button(editRow, tr('vaseDraw.reset'), tr('vaseDraw.resetTitle'), () => { selected = null; api.reset(); fit() })
  // Take an SVG from a drawing program (Inkscape, Illustrator, Affinity ...). Works also while
  // the shape comes from settings - reading it in switches to `gezeichnet` (drawn).
  let svgBtn = null
  if (api.importSvg) {
    const file = document.createElement('input')
    file.type = 'file'
    file.accept = '.svg,image/svg+xml'
    file.hidden = true
    file.addEventListener('change', async () => {
      const f = file.files?.[0]
      file.value = ''
      if (!f) return
      let message
      try { message = api.importSvg(await f.text()) } catch (error) { message = tr('vaseDraw.svgUnreadable', { error: error.message }) }
      selected = null
      fit()
      hint.textContent = message
      api.notify?.(message)
    })
    editRow.append(file)
    svgBtn = button(editRow, tr('vaseDraw.loadSvg'), api.svgTitle, () => file.click())
  }
  // Mesh (STL, 3MF, OBJ) of a model vase: take its body form (vase-import.mjs).
  let meshBtn = null
  if (api.importMesh) {
    const file = document.createElement('input')
    file.type = 'file'
    file.accept = '.stl,.3mf,.obj'
    file.hidden = true
    file.addEventListener('change', async () => {
      const f = file.files?.[0]
      file.value = ''
      if (!f) return
      meshBtn.disabled = true
      hint.textContent = tr('vaseDraw.reading', { name: f.name })
      let message
      try { message = await api.importMesh(f.name, new Uint8Array(await f.arrayBuffer())) } catch (error) { message = tr('vaseDraw.fileUnreadable', { error: error.message }) }
      meshBtn.disabled = false
      selected = null
      fit()
      hint.textContent = message
      api.notify?.(message)
    })
    editRow.append(file)
    meshBtn = button(editRow, tr('vaseDraw.loadMesh'), api.meshTitle, () => file.click())
  }

  /*
   * Reference photo (side view): put a photo of a vase behind the drawing and trace the body form. Before (or
   * after), enter the real measures of the object - height and width at the widest place. On loading, the object
   * is searched for in the photo (vase-photo.mjs) and the photo is laid so that the object is exactly that tall
   * and wide, centred on the axis, with its foot on the bed; the vase takes on the measures. "Take outline"
   * turns its outline into the body form. If nothing clear is found: as tall as the vase, centred, and
   * "Calibrate" (two points, real distance). Only in this session (photos are large).
   */
  let photo = null
  let calib = null // null | { points: [[x, y], ...] }
  let found = null // the object in the (scaled-down) photo, see findObject
  let photoPx = null // { width, height } of the scaled-down photo
  let photoPixels = null // its pixels, { width, height, data }, to search it again with another threshold (Trace)
  // Measures of the object: filled in from the vase until one enters them oneself.
  const sizeField = (label, key, title) => {
    const wrapS = document.createElement('label')
    wrapS.className = 'vz-num'
    wrapS.title = title
    const input = document.createElement('input')
    input.type = 'text'
    input.inputMode = 'decimal'
    input.autocomplete = 'off'
    input.dataset.key = key
    wrapS.append(`${label} `, input, ' mm')
    return { wrap: wrapS, input, edited: false }
  }
  const sizeH = sizeField(tr('vaseDraw.objectHeight'), 'height', tr('vaseDraw.objectHeightTitle'))
  const sizeD = sizeField(tr('vaseDraw.objectWidth'), 'diameter', tr('vaseDraw.objectWidthTitle'))
  /** The entered measures (otherwise the vase's), within the vase's limits. */
  const objectSize = () => {
    const v = api.photoSize()
    const h = sizeH.edited ? parseNum(sizeH.input.value) : null
    const d = sizeD.edited ? parseNum(sizeD.input.value) : null
    return { height: clamp(h > 0 ? h : v.height, ...LIMITS.height), diameter: clamp(d > 0 ? d : v.diameter, ...LIMITS.diameter) }
  }
  const syncSize = () => {
    const v = api.photo ? api.photoSize() : null
    if (!v) return
    if (!sizeH.edited && document.activeElement !== sizeH.input) sizeH.input.value = nf(v.height, 1)
    if (!sizeD.edited && document.activeElement !== sizeD.input) sizeD.input.value = nf(v.diameter, 1)
  }
  /** Lays the photo onto the found object and gives the vase its measures. */
  function placeFound() {
    if (!photo || !found?.ok) return
    const size = objectSize()
    Object.assign(photo, photoPlacement(photoPx, found.box, size))
    calib = null
    api.photoFit(size)
    photoState()
    fit()
    const extra = found.notes.length ? ` ${found.notes.map(api.note).join(' ')}` : ''
    photoHint(`${tr('vaseDraw.photoFound', { height: nf(size.height, 1), width: nf(size.diameter, 1) })}${extra}`)
  }
  const photoFile = document.createElement('input')
  photoFile.type = 'file'
  photoFile.accept = 'image/*'
  photoFile.hidden = true
  const opacity = document.createElement('input')
  opacity.type = 'range'
  opacity.min = '0.1'
  opacity.max = '1'
  opacity.step = '0.05'
  opacity.value = '0.5'
  opacity.title = tr('vaseDraw.photoOpacity')
  opacity.setAttribute('aria-label', tr('vaseDraw.photoOpacity'))
  const opacityWrap = document.createElement('label')
  opacityWrap.className = 'vz-num'
  const distWrap = document.createElement('label')
  distWrap.className = 'vz-num'
  const dist = document.createElement('input')
  dist.type = 'text'
  dist.inputMode = 'decimal'
  distWrap.append(`${tr('vaseDraw.distance')} `, dist, ' mm')
  distWrap.hidden = true
  let photoBtn = null, calibBtn = null, applyBtn = null, offBtn = null, outlineBtn = null, traceBtn = null
  const photoHint = (text) => { hint.textContent = text }
  function photoState() {
    if (!api.photo) return
    calibBtn.hidden = !photo
    offBtn.hidden = !photo
    outlineBtn.hidden = !(photo && found?.ok)
    // Without an object found (a busy background), Trace is still there for its magnetic lasso.
    traceBtn.hidden = !(photo && photoPixels && (found?.ok || api.edgeLasso))
    traceBtn.setAttribute('aria-pressed', String(Boolean(trace)))
    opacityWrap.hidden = !photo
    calibBtn.setAttribute('aria-pressed', String(Boolean(calib)))
    distWrap.hidden = !(calib && calib.points.length === 2)
    applyBtn.hidden = distWrap.hidden
    photoBtn.textContent = photo ? tr('vaseDraw.otherPhoto') : tr('vaseDraw.addPhoto')
  }
  function drawPhoto() {
    photoG.replaceChildren()
    calibG.replaceChildren()
    if (photo) {
      // The image itself mirrored, so that it stands upright in the mirrored world (y up).
      svgEl('image', { href: photo.href, x: photo.x0, y: -(photo.y0 + photo.h), width: photo.w, height: photo.h, transform: 'scale(1,-1)', opacity: photo.opacity, preserveAspectRatio: 'none' }, photoG)
    }
    if (calib) {
      const r = 7 / pxPerMm()
      for (const [x, y] of calib.points) {
        svgEl('line', { class: 'vz-tangent', x1: x - r, y1: y, x2: x + r, y2: y }, calibG)
        svgEl('line', { class: 'vz-tangent', x1: x, y1: y - r, x2: x, y2: y + r }, calibG)
      }
      if (calib.points.length === 2) {
        const [[ax, ay], [bx, by]] = calib.points
        svgEl('line', { class: 'vz-tangent', x1: ax, y1: ay, x2: bx, y2: by, 'stroke-dasharray': '4 3' }, calibG)
      }
    }
  }
  /*
   * Trace (Nachzeichnen): the object's outline taken with settings - how far a colour must lie from the
   * background's to belong to it (threshold), how many points, from what kink a point is a corner - and
   * shown in red over the photo before it becomes the body form. The photo follows the object as the
   * threshold changes it; Cancel lays it back. The magnetic lasso (with api.edgeLasso): clicks roughly
   * round the vase lay a line that follows the photo's edges between them, the way on to the pointer
   * shown as it moves; closed, it is the object instead of the search - a vase before a shelf or in a
   * room, which no background colour tells apart.
   */
  // `searched`: the search found the object when Trace began; `outline`: the lasso's, in the photo's pixels; `placed`: where the photo lay.
  let trace = null // null | { threshold, points, cornerAngle, found, result, searched, outline, placed }
  let traceThreshold = null, tracePoints = null, traceCorners = null
  let traceTimer = 0
  // The lasso: the photo made ready for it once, and the line being laid - spots in the photo's pixels.
  let lassoPicture = null
  let lasso = null // null | { anchors, draft, hover, spot, frame }
  let lassoBtn = null, lassoOffBtn = null
  function traceSlider(label, min, max, step, show, onChange) {
    const wrapT = document.createElement('label')
    wrapT.className = 'vz-num'
    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(min)
    input.max = String(max)
    input.step = String(step)
    input.style.cssText = 'width:110px;min-width:0;flex:0 0 auto'
    const value = document.createElement('span')
    value.style.cssText = 'min-width:44px;display:inline-block'
    wrapT.append(`${label} `, input, ' ', value)
    traceRow.append(wrapT)
    const slider = {
      wrap: wrapT,
      set(v) { input.value = String(v); value.textContent = show(v) },
    }
    input.addEventListener('input', () => {
      if (!trace) return
      const v = Number(input.value)
      value.textContent = show(v)
      onChange(v)
      // While the slider moves, trace again once it rests a moment.
      clearTimeout(traceTimer)
      traceTimer = setTimeout(updateTrace, 60)
    })
    return slider
  }
  function updateTrace() {
    if (!trace || !photo || !photoPixels) return
    const size = objectSize()
    // Drawn round with the lasso, the object is what the lasso holds; else it is searched for with the threshold.
    const f = trace.outline ? outlineObject(photoPixels, trace.outline) : findObject(photoPixels, { threshold: trace.threshold })
    trace.found = f
    trace.result = f.ok ? photoProfile(f, { ...size, tolerance: 0.001, maxPoints: trace.points, cornerAngle: trace.cornerAngle }) : f
    if (f.ok) Object.assign(photo, photoPlacement(photoPx, f.box, size))
    // While the lasso is laid, its hint stays.
    if (!lasso) photoHint(trace.result.ok ? tr(trace.outline ? 'vaseDraw.traceLassoResult' : 'vaseDraw.traceHint', { points: trace.result.profilePoints.length }) : trace.result.notes.map(api.note).join(' '))
    render()
  }
  function startTrace() {
    if (!photo || !photoPixels || !(found?.ok || api.edgeLasso)) return
    calib = null
    // To start, what Take outline would give: its threshold and its number of points.
    const searched = Boolean(found?.ok)
    const first = searched ? photoProfile(found, objectSize()) : null
    trace = { threshold: searched ? found.threshold : 0.25, points: first?.ok ? first.profilePoints.length : 8, cornerAngle: 20, found, result: null, searched, outline: null, placed: { x0: photo.x0, y0: photo.y0, w: photo.w, h: photo.h } }
    traceThreshold.set(Math.round(trace.threshold * 100))
    tracePoints.set(trace.points)
    traceCorners.set(trace.cornerAngle)
    traceRow.hidden = false
    photoState()
    lassoState()
    // Where the search found nothing (a busy background), the lasso is the way to the object.
    if (searched) updateTrace()
    else startLasso()
  }
  /** Trace off: with `apply`, its outline becomes the body form and the photo stays on the object as found; else all is as before. */
  function stopTrace(apply) {
    if (!trace) return
    const done = trace
    endTrace()
    if (apply && done.result?.ok) {
      found = done.found
      placeFound()
      photoHint(api.photoProfile(done.result))
      return
    }
    if (photo && found?.ok) Object.assign(photo, photoPlacement(photoPx, found.box, objectSize()))
    else if (photo) Object.assign(photo, done.placed)
    photoHint(api.hint)
    render()
  }
  function endTrace() {
    clearTimeout(traceTimer)
    stopLasso()
    trace = null
    traceRow.hidden = true
    if (traceBtn) photoState()
  }
  // A spot of the photo in its pixels (y down) and in mm on the board (y up), and back.
  const photoToMm = ([u, v]) => [photo.x0 + (u / photoPx.width) * photo.w, photo.y0 + (1 - v / photoPx.height) * photo.h]
  const mmToPhoto = ([x, y]) => [((x - photo.x0) / photo.w) * photoPx.width, (1 - (y - photo.y0) / photo.h) * photoPx.height]
  const onPhoto = ([u, v]) => u >= 0 && v >= 0 && u <= photoPx.width && v <= photoPx.height
  const lassoReady = () => (lassoPicture ??= api.edgeLasso.prepare(photoPixels))
  function startLasso() {
    if (!trace || !api.edgeLasso || !photoPixels) return
    lasso = { anchors: [], draft: [], hover: [], spot: null, frame: 0 }
    svg.classList.add('vz-lassoing')
    // Enter and Escape go to the board from now on.
    svg.focus({ preventScroll: true })
    photoHint(tr('vaseDraw.traceLassoHint'))
    lassoState()
    render()
  }
  function stopLasso() {
    if (lasso) cancelAnimationFrame(lasso.frame)
    lasso = null
    svg.classList.remove('vz-lassoing')
    lassoState()
  }
  /** The lasso's buttons, and the threshold: of no use while the lasso holds the object, or when the search found nothing. */
  function lassoState() {
    if (!lassoBtn) return
    lassoBtn.setAttribute('aria-pressed', String(Boolean(lasso)))
    lassoOffBtn.hidden = !trace?.outline
    traceThreshold.wrap.hidden = Boolean(trace?.outline) || !trace?.searched
  }
  /** A click on the photo while the lasso is on: the next spot, moved onto the edge near it - or, on the first spot, the line closed. */
  function lassoClick(event) {
    if (!lasso || !photo) return false
    svg.focus({ preventScroll: true })
    const spot = mmToPhoto(mmOf(event))
    if (!onPhoto(spot)) return true
    if (lasso.anchors.length >= 3) {
      const [fx, fy] = photoToMm(lasso.anchors[0])
      const [mx, my] = mmOf(event)
      if (Math.hypot(fx - mx, fy - my) * pxPerMm() <= 8) { closeLasso(); return true }
    }
    const picture = lassoReady()
    const at = api.edgeLasso.snap(picture, spot)
    const last = lasso.anchors[lasso.anchors.length - 1]
    if (last && last[0] === at[0] && last[1] === at[1]) return true
    // A way to the pointer still being looked for runs from the spot before.
    cancelAnimationFrame(lasso.frame)
    lasso.frame = 0
    lasso.draft = last ? [...lasso.draft, ...api.edgeLasso.path(picture, last, at).slice(1)] : [at]
    lasso.anchors.push(at)
    lasso.hover = []
    render()
    return true
  }
  /** The pointer over the board while the lasso is on: the way on to it along the edges, looked for once a frame at most. */
  function lassoHover(event) {
    if (!lasso?.anchors.length || !photo) return
    lasso.spot = mmToPhoto(mmOf(event))
    if (lasso.frame) return
    lasso.frame = requestAnimationFrame(() => {
      if (!lasso) return
      lasso.frame = 0
      const picture = lassoReady()
      lasso.hover = onPhoto(lasso.spot) ? api.edgeLasso.path(picture, lasso.anchors[lasso.anchors.length - 1], api.edgeLasso.snap(picture, lasso.spot)) : []
      drawTrace(pxPerMm())
    })
  }
  /** Closes the line (three spots at least) back to its first spot along the edge: from now on the object is what it holds. */
  function closeLasso() {
    if (!lasso || lasso.anchors.length < 3 || !trace) return
    const back = api.edgeLasso.path(lassoReady(), lasso.anchors[lasso.anchors.length - 1], lasso.anchors[0]).slice(1, -1)
    trace.outline = [...lasso.draft, ...back]
    stopLasso()
    updateTrace()
    fit()
  }
  /** Throws away the line laid so far; the lasso stays on. */
  function discardLassoLine() {
    cancelAnimationFrame(lasso.frame)
    Object.assign(lasso, { anchors: [], draft: [], hover: [], frame: 0 })
    render()
  }
  /** The lasso over the photo: the line laid, the way on to the pointer, the spots clicked (the first filled), and a closed one dashed. */
  function drawLasso(ppm) {
    if (!photo || !trace) return
    const inMm = (points) => points.map(photoToMm)
    if (trace.outline) svgEl('path', { class: 'vz-lasso vz-lasso-done', d: pathOf(inMm(trace.outline), true) }, traceG)
    if (!lasso) return
    if (lasso.draft.length > 1) svgEl('path', { class: 'vz-lasso', d: pathOf(inMm(lasso.draft), false) }, traceG)
    if (lasso.hover.length > 1) svgEl('path', { class: 'vz-lasso vz-lasso-hover', d: pathOf(inMm(lasso.hover), false) }, traceG)
    lasso.anchors.forEach((spot, i) => {
      const [x, y] = photoToMm(spot)
      svgEl('circle', { class: `vz-lasso-knob${i ? '' : ' vz-first'}`, cx: x, cy: y, r: (i ? 4 : 5.5) / ppm }, traceG)
    })
  }
  /** Trace's outline over the photo: the body form both sides of the axis, its points - corners square. */
  function drawTrace(ppm) {
    traceG.replaceChildren()
    drawLasso(ppm)
    const result = trace?.result
    if (!result?.ok) return
    const pts = result.profilePoints
    const f = profileFunction(pts)
    const maxR = Math.max(...pts.map((pt) => pt[1]))
    const R = result.diameter / 2
    const H = result.height
    const right = []
    for (let k = 0; k <= 240; k++) right.push([(Math.max(0.02, f(k / 240)) * R) / maxR, (k / 240) * H])
    svgEl('path', { class: 'vz-trace', d: pathOf([...right, ...right.slice().reverse().map(([x, y]) => [-x, y])], true) }, traceG)
    const s = 5 / ppm
    for (const pt of pts) {
      const x = (pt[1] * R) / maxR
      const y = pt[0] * H
      if (pt[2] === PROFILE_CORNER) svgEl('rect', { class: 'vz-trace-knob', x: x - s, y: y - s, width: 2 * s, height: 2 * s }, traceG)
      else svgEl('circle', { class: 'vz-trace-knob', cx: x, cy: y, r: s }, traceG)
    }
  }
  if (api.photo) {
    photoFile.addEventListener('change', () => {
      const f = photoFile.files?.[0]
      photoFile.value = ''
      if (!f) return
      const href = URL.createObjectURL(f)
      const img = new Image()
      img.onload = () => {
        if (photo) URL.revokeObjectURL(photo.href)
        endTrace()
        lassoPicture = null
        const [, , , by1] = api.bounds()
        const h = Math.max(10, by1 / 1.04)
        const w = (h * img.naturalWidth) / Math.max(1, img.naturalHeight)
        photo = { href, x0: -w / 2, y0: 0, w, h, opacity: Number(opacity.value) }
        calib = null
        // Search for the object - scaled down to at most 1200 pixels (precise enough, fast).
        found = null
        try {
          const s = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight))
          const c = document.createElement('canvas')
          c.width = Math.max(1, Math.round(img.naturalWidth * s))
          c.height = Math.max(1, Math.round(img.naturalHeight * s))
          const ctx = c.getContext('2d', { willReadFrequently: true })
          ctx.drawImage(img, 0, 0, c.width, c.height)
          photoPx = { width: c.width, height: c.height }
          photoPixels = { width: c.width, height: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data }
          found = findObject(photoPixels)
        } catch (error) {
          found = { ok: false, notes: [tr('vaseDraw.photoUnreadable', { error: error?.message || String(error) })] }
        }
        if (found.ok) { placeFound(); return }
        photoState()
        render()
        photoHint(`${found.notes.map(api.note).join(' ')} ${tr('vaseDraw.photoNotFound')}`)
      }
      img.onerror = () => { URL.revokeObjectURL(href); photoHint(tr('vaseDraw.imageUnreadable')) }
      img.src = href
    })
    photoRow.append(photoFile, sizeH.wrap, sizeD.wrap)
    for (const f of [sizeH, sizeD]) {
      const commit = () => {
        f.edited = f.input.value.trim() !== ''
        if (f.edited && !(parseNum(f.input.value) > 0)) { photoHint(tr('vaseDraw.sizeInvalid')); return }
        syncSize()
        if (trace) updateTrace()
        else if (photo && found?.ok) placeFound()
      }
      f.input.addEventListener('change', commit)
      f.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } })
    }
    photoBtn = button(photoRow, tr('vaseDraw.addPhoto'), tr('vaseDraw.addPhotoTitle'), () => photoFile.click())
    outlineBtn = button(photoRow, tr('vaseDraw.takeOutline'), tr('vaseDraw.takeOutlineTitle'), () => {
      endTrace()
      const r = photoProfile(found, objectSize())
      photoHint(api.photoProfile(r))
    })
    traceBtn = button(photoRow, tr('vaseDraw.trace'), tr('vaseDraw.traceTitle'), () => (trace ? stopTrace(false) : startTrace()))
    traceThreshold = traceSlider(tr('vaseDraw.traceThreshold'), 1, 99, 1, (v) => `${nf(v, 0)} %`, (v) => { trace.threshold = v / 100 })
    tracePoints = traceSlider(tr('vaseDraw.tracePoints'), 3, MAX_PROFILE_POINTS, 1, (v) => nf(v, 0), (v) => { trace.points = v })
    traceCorners = traceSlider(tr('vaseDraw.traceCorners'), 5, 180, 1, (v) => (v >= 180 ? tr('vaseDraw.traceNoCorners') : `${nf(v, 0)}°`), (v) => { trace.cornerAngle = v })
    if (api.edgeLasso) {
      lassoBtn = button(traceRow, tr('vaseDraw.traceLasso'), tr('vaseDraw.traceLassoTitle'), () => {
        if (!lasso) { startLasso(); return }
        stopLasso()
        updateTrace()
      })
      lassoOffBtn = button(traceRow, tr('vaseDraw.traceLassoOff'), tr('vaseDraw.traceLassoOffTitle'), () => {
        if (!trace) return
        trace.outline = null
        stopLasso()
        // Without an object found, the lasso is the only way to it: it starts again.
        if (trace.searched) updateTrace()
        else startLasso()
      })
      lassoOffBtn.hidden = true
    }
    button(traceRow, tr('vaseDraw.traceApply'), tr('vaseDraw.traceApplyTitle'), () => stopTrace(true))
    button(traceRow, tr('vaseDraw.traceCancel'), null, () => stopTrace(false))
    calibBtn = button(photoRow, tr('vaseDraw.calibrate'), tr('vaseDraw.calibrateTitle'), () => {
      stopTrace(false)
      calib = calib ? null : { points: [] }
      photoState()
      render()
      photoHint(calib ? tr('vaseDraw.calibrateFirst') : api.hint)
    })
    photoRow.append(distWrap)
    applyBtn = button(photoRow, tr('vaseDraw.apply'), tr('vaseDraw.applyTitle'), () => {
      const real = parseNum(dist.value)
      const [[ax, ay], [bx, by]] = calib.points
      const d = Math.hypot(bx - ax, by - ay)
      if (!(real > 0) || !(d > 0)) { photoHint(tr('vaseDraw.distanceInvalid')); return }
      const f = real / d
      // Position of A in the photo (as a fraction), then scale and put A at (0, 0).
      const u = (ax - photo.x0) / photo.w, v = (ay - photo.y0) / photo.h
      photo.w *= f
      photo.h *= f
      photo.x0 = -u * photo.w
      photo.y0 = -v * photo.h
      calib = null
      photoState()
      fit()
      photoHint(tr('vaseDraw.calibrated', { distance: nf(real, 1) }))
    })
    opacity.addEventListener('input', () => { if (photo) { photo.opacity = Number(opacity.value); drawPhoto() } })
    opacity.style.cssText = 'width:110px;min-width:0;flex:0 0 auto'
    opacityWrap.append(`${tr('vaseDraw.opacity')} `, opacity)
    photoRow.append(opacityWrap)
    offBtn = button(photoRow, tr('vaseDraw.photoOff'), tr('vaseDraw.photoOffTitle'), () => {
      if (photo) URL.revokeObjectURL(photo.href)
      endTrace()
      photo = null
      photoPixels = null
      lassoPicture = null
      calib = null
      found = null
      photoState()
      render()
      photoHint(api.hint)
    })
    photoState()
  }
  /** A click without dragging while calibrating: remember the point. */
  function calibClick(event) {
    if (!calib || !photo || calib.points.length >= 2) return false
    calib.points.push(mmOf(event))
    if (calib.points.length === 1) photoHint(tr('vaseDraw.calibrateSecond'))
    else {
      const [[ax, ay], [bx, by]] = calib.points
      dist.value = nf(Math.hypot(bx - ax, by - ay), 1)
      photoHint(tr('vaseDraw.calibrateDistance'))
      requestAnimationFrame(() => dist.focus())
    }
    photoState()
    render()
    return true
  }

  // Number fields: position (two values) and angle; input with comma or point.
  const field = (label, unit, onSet) => {
    const wrapF = document.createElement('label')
    wrapF.className = 'vz-num'
    const input = document.createElement('input')
    input.type = 'text'
    input.inputMode = 'decimal'
    input.autocomplete = 'off'
    wrapF.append(`${label} `, input, ` ${unit}`)
    const commit = () => {
      const n = parseNum(input.value)
      if (n !== null && selected !== null) onSet(n)
      render()
    }
    input.addEventListener('change', commit)
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } })
    numRow.append(wrapF)
    return { wrap: wrapF, input }
  }
  const [la, lb, lc] = api.fieldLabels
  const [ua, ub] = api.fieldUnits ?? ['mm', 'mm']
  const fA = field(la, ua, (n) => api.setCoord(selected, 0, n))
  const fB = field(lb, ub, (n) => api.setCoord(selected, 1, n))
  const fAngle = field(lc, '°', (n) => api.setAngle(selected, n))

  /* ---------- Drawing ---------- */
  function drawGrid() {
    gridG.replaceChildren()
    labelG.replaceChildren()
    const ppm = pxPerMm()
    const step = STEPS.find((s) => s * ppm >= 9) ?? 100
    const major = MAJOR[step]
    // Across in the view's own unit (mm or degrees).
    const xs = xScale()
    const degrees = Boolean(api.xScale)
    const stepX = degrees ? DEG_STEPS.find((s) => s * xs * ppm >= 9) ?? 180 : step
    const majorX = degrees ? DEG_MAJOR[stepX] : major
    const x1 = view.x0 + view.w, y1 = view.y0 + view.h
    let minor = '', majorD = ''
    for (let v = Math.ceil(view.x0 / xs / stepX) * stepX; v * xs <= x1; v += stepX) {
      const seg = `M${v * xs} ${view.y0}V${y1}`
      if (Math.abs(v / majorX - Math.round(v / majorX)) < 1e-6) majorD += seg
      else minor += seg
    }
    for (let y = Math.ceil(view.y0 / step) * step; y <= y1; y += step) {
      const seg = `M${view.x0} ${y}H${x1}`
      if (Math.abs(y / major - Math.round(y / major)) < 1e-6) majorD += seg
      else minor += seg
    }
    svgEl('path', { class: 'vz-g-minor', d: minor }, gridG)
    svgEl('path', { class: 'vz-g-major', d: majorD }, gridG)
    // Labels of the major lines in mm, along the bottom and the left edge.
    const font = 11 / ppm
    for (let v = Math.ceil(view.x0 / xs / majorX) * majorX; v * xs <= x1; v += majorX) {
      svgEl('text', { class: 'vz-g-label', x: v * xs + 3 / ppm, y: -(view.y0 + 4 / ppm), 'font-size': font }, labelG).textContent = `${nf(Math.abs(v) < 1e-9 ? 0 : v, 0)}${degrees ? '°' : ''}`
    }
    for (let y = Math.ceil(view.y0 / major) * major; y <= y1; y += major) {
      if (Math.abs(y - view.y0) < 12 / ppm) continue
      svgEl('text', { class: 'vz-g-label', x: view.x0 + 4 / ppm, y: -(y + 3 / ppm), 'font-size': font }, labelG).textContent = nf(Math.abs(y) < 1e-9 ? 0 : y, 0)
    }
  }

  function render() {
    if (!view) { fit(); return }
    applyView()
    drawPhoto()
    if (api.photo) syncSize()
    drawGrid()
    shapeG.replaceChildren()
    knobG.replaceChildren()
    const ppm = pxPerMm()
    const ctx = { ppm, labelG, shapeG, svgEl }
    api.drawShape(shapeG, ctx)
    drawTrace(ppm)
    const ro = api.readonly?.()
    // While calibrating, the foot often lies where the note "comes from the settings" is shown.
    readonly.hidden = !ro || Boolean(calib)
    if (ro) readonly.replaceChildren(...ro)
    const pts = api.pointsMm()
    if (selected !== null && selected >= pts.length) selected = null
    if (ro) selected = null
    // Double-click on the line: insert a point.
    const curve = api.editCurve?.()
    // While the lasso is laid, clicks belong to it: the points lie on the vase's edge, just where it is clicked.
    const editable = !ro && !lasso
    if (curve && editable) {
      const hitPath = svgEl('path', { class: 'vz-curve-hit', d: pathOf(curve, false) }, shapeG)
      hitPath.addEventListener('dblclick', (event) => {
        const at = api.insertNear(mmOf(event))
        if (at !== null) { selected = at; render() }
      })
    }
    const r = 6 / ppm
    if (editable) {
      pts.forEach((pt, i) => {
        const hit = svgEl('circle', { class: 'vz-hit', cx: pt.x, cy: pt.y, r: 15 / ppm }, knobG)
        if (pt.kind === 'ecke') svgEl('rect', { class: `vz-knob${i === selected ? ' sel' : ''}`, x: pt.x - r, y: pt.y - r, width: 2 * r, height: 2 * r }, knobG)
        else svgEl('circle', { class: `vz-knob${i === selected ? ' sel' : ''}`, cx: pt.x, cy: pt.y, r }, knobG)
        hit.addEventListener('pointerdown', (event) => {
          event.preventDefault()
          event.stopPropagation()
          selected = i
          drag = { kind: 'point', index: i }
          svg.setPointerCapture(event.pointerId)
          svg.focus({ preventScroll: true })
          render()
        })
      })
    }
    // Handle at the selected point: a line with two ends, both draggable.
    if (selected !== null && !ro) {
      const t = api.tangentMm(selected, ppm)
      if (t) {
        const p = pts[selected]
        svgEl('line', { class: 'vz-tangent', x1: p.x - t[0], y1: p.y - t[1], x2: p.x + t[0], y2: p.y + t[1] }, knobG)
        for (const sign of [1, -1]) {
          const ex = p.x + sign * t[0], ey = p.y + sign * t[1]
          svgEl('rect', { class: 'vz-tknob', x: ex - r * 0.75, y: ey - r * 0.75, width: 1.5 * r, height: 1.5 * r, transform: `rotate(45 ${ex} ${ey})` }, knobG)
          const hit = svgEl('circle', { class: 'vz-hit', cx: ex, cy: ey, r: 13 / ppm }, knobG)
          hit.addEventListener('pointerdown', (event) => {
            event.preventDefault()
            event.stopPropagation()
            drag = { kind: 'tangent', index: selected, sign }
            svg.setPointerCapture(event.pointerId)
          })
        }
      }
    }
    // Fields and buttons according to the selection.
    const sel = selected !== null ? pts[selected] : null
    for (const [kind, b] of Object.entries(kindBtns)) {
      b.disabled = !sel || (kind === 'ecke' && sel.noCorner)
      b.setAttribute('aria-pressed', String(Boolean(sel) && sel.kind === kind))
    }
    for (const f of [fA, fB, fAngle]) f.input.disabled = !sel
    if (document.activeElement !== fA.input) fA.input.value = sel ? nf(api.coord(sel, 0), 1) : ''
    if (document.activeElement !== fB.input) fB.input.value = sel ? nf(api.coord(sel, 1), 1) : ''
    const angle = sel ? api.angle(selected) : null
    fAngle.wrap.hidden = !sel || angle === null
    if (document.activeElement !== fAngle.input) fAngle.input.value = angle === null ? '' : nf(angle, 1)
    fA.input.disabled = !sel || sel.lockA
    fB.input.disabled = !sel || sel.lockB
    addBtn.disabled = ro || pts.length >= api.maxPoints
    delBtn.disabled = !sel || !api.canDelete(selected)
    pointRow.hidden = Boolean(ro)
    numRow.hidden = Boolean(ro)
    editRow.querySelectorAll('button').forEach((b) => { if (b !== addBtn && b !== delBtn && b !== svgBtn && b !== meshBtn) b.disabled = Boolean(ro) })
  }

  /* ---------- Input ---------- */
  svg.addEventListener('pointerdown', (event) => {
    pointers.set(event.pointerId, [event.clientX, event.clientY])
    if (drag) return
    svg.setPointerCapture(event.pointerId)
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      drag = { kind: 'pinch', dist: Math.hypot(a[0] - b[0], a[1] - b[1]), center: mmOf({ clientX: (a[0] + b[0]) / 2, clientY: (a[1] + b[1]) / 2 }) }
    } else {
      drag = { kind: 'pan', start: [event.clientX, event.clientY], view: { ...view }, moved: false }
      svg.classList.add('vz-panning')
    }
  })
  svg.addEventListener('pointermove', (event) => {
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, [event.clientX, event.clientY])
    if (!drag) { lassoHover(event); return }
    event.preventDefault()
    if (drag.kind === 'pan') {
      const ppm = pxPerMm()
      const dx = event.clientX - drag.start[0], dy = event.clientY - drag.start[1]
      if (Math.hypot(dx, dy) > 3) drag.moved = true
      view.x0 = drag.view.x0 - dx / ppm
      view.y0 = drag.view.y0 + dy / ppm
      render()
    } else if (drag.kind === 'pinch' && pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      const d = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (d > 0 && drag.dist > 0) zoomAt(drag.dist / d, drag.center[0], drag.center[1])
      drag.dist = d
    } else if (drag.kind === 'point') {
      api.movePoint(drag.index, snapped(mmOf(event)), true)
    } else if (drag.kind === 'tangent') {
      api.moveTangent(drag.index, mmOf(event), drag.sign, pxPerMm(), true)
    }
  })
  const end = (event) => {
    pointers.delete(event.pointerId)
    if (!drag) return
    const was = drag
    drag = null
    svg.classList.remove('vz-panning')
    if (was.kind === 'pan' && !was.moved) {
      if (lassoClick(event)) return
      if (calibClick(event)) return
      selected = null
      render()
    }
    if (was.kind === 'point' || was.kind === 'tangent') {
      api.finish() // recompute finely
      // If the shape has grown beyond the view (diameter, height), let the view follow.
      const [bx0, by0, bx1, by1] = api.bounds()
      if (bx0 < view.x0 || by0 < view.y0 || bx1 > view.x0 + view.w || by1 > view.y0 + view.h) fit()
    }
  }
  svg.addEventListener('pointerup', end)
  svg.addEventListener('pointercancel', end)
  svg.addEventListener('wheel', (event) => {
    event.preventDefault()
    const [mx, my] = mmOf(event)
    zoomAt(Math.exp(event.deltaY * 0.0015), mx, my)
  }, { passive: false })
  // The lasso: a double click closes the line too.
  svg.addEventListener('dblclick', () => { if (lasso?.anchors.length >= 3) closeLasso() })
  svg.addEventListener('keydown', (event) => {
    // The lasso: Enter closes the line, Escape throws it away (and then the lasso), ahead of the window, which would close.
    if (lasso && (event.key === 'Enter' || event.key === 'Escape')) {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Enter') closeLasso()
      else if (lasso.anchors.length) discardLassoLine()
      else { stopLasso(); updateTrace() }
      return
    }
    if (selected === null) return
    const step = event.shiftKey ? 10 : 1
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[event.key]
    if (d) {
      event.preventDefault()
      const p = api.pointsMm()[selected]
      api.movePoint(selected, [p.x + d[0], p.y + d[1]], false)
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && api.canDelete(selected)) {
      event.preventDefault()
      api.remove(selected)
      selected = null
    }
  })
  new ResizeObserver(() => { if (view) render() }).observe(svg)

  return { el, render: () => render(), fit: () => fit(), select: (i) => { selected = i; render() } }
}

/* ------------------------------------------------------------------ */
/* Top view: cross-section                                             */
/* ------------------------------------------------------------------ */

/** Drawing the cross-section: one base piece in mm; the symmetry makes the outline from it. */
export function sectionEditor({ get, set, notify, tr = (key) => key, note = (text) => text, locale, readMesh }) {
  if (locale) numberLocale = locale
  const R = () => get().diameter / 2
  // Drawn also when only the upper cross-section (transition) is drawn.
  const drawn = () => get().section === 'gezeichnet' || get().section2 === 'gezeichnet'
  /** Drawing sets the lower cross-section to `gezeichnet` (drawn) - unless the upper one already is. */
  const drawnPatch = () => (get().section2 === 'gezeichnet' ? {} : { section: 'gezeichnet' })
  const base = () => (get().drawPoints ?? DRAW_PRESETS[get().drawSymmetry]).map((pt) => ({ ...pt }))
  const sym = () => get().drawSymmetry
  /** Point on a mirror axis: i = 0 for half/quarter (x = 0), the last one for half (x = 0) or quarter (y = 0). */
  const axisOf = (pts, i) => {
    const last = i === pts.length - 1
    if (sym() === 'halb' && (i === 0 || last)) return 'y'
    if (sym() === 'viertel' && i === 0) return 'y'
    if (sym() === 'viertel' && last) return 'x'
    return null
  }
  /** Automatic tangent of a base point (as the curve computes it), in units of the radius. */
  const autoTangent = (pts, i) => {
    const all = drawnSectionPoints({ ...get(), drawPoints: pts.map(({ x, y, corner }) => ({ x, y, corner })) })
    const n = all.length
    const a = all[(i - 1 + n) % n], b = all[(i + 1) % n]
    return [(b.x - a.x) / 2, (b.y - a.y) / 2]
  }
  /** Commits; the outline is scaled so that its largest radius is 1 - the diameter grows with it. */
  function commit(pts, draft) {
    const outline = sectionOutline({ ...get(), section: 'gezeichnet', drawPoints: pts })
    const M = Math.max(...outline.map(([x, y]) => Math.hypot(x, y)))
    let diameter = get().diameter
    if (M > 1e-6 && Math.abs(M - 1) > 1e-4) {
      const d = clamp(diameter * M, ...LIMITS.diameter)
      diameter = d
      pts = pts.map((pt) => {
        const q = { ...pt, x: pt.x / M, y: pt.y / M }
        if (pt.tx !== undefined) Object.assign(q, { tx: pt.tx / M, ty: pt.ty / M })
        if (pt.ix !== undefined) Object.assign(q, { ix: pt.ix / M, iy: pt.iy / M })
        return q
      })
    }
    set({ ...drawnPatch(), drawPoints: pts, diameter }, { draft })
  }
  const toUnit = ([x, y]) => [x / R(), y / R()]

  const board = drawingBoard({
    tr,
    note,
    ariaLabel: tr('vaseDraw.sectionAria'),
    maxPoints: MAX_DRAW_POINTS,
    notify,
    svgTitle: tr('vaseDraw.sectionSvgTitle'),
    importSvg(text) {
      const r = svgToSection(text)
      if (!r.ok) return tr('vaseDraw.sectionNotTaken', { notes: r.notes.map(note).join(' ') })
      set({ ...drawnPatch(), drawSymmetry: 'frei', drawPoints: r.drawPoints })
      return [tr('vaseDraw.sectionTaken'), ...r.notes.map(note)].join(' ')
    },
    hint: tr('vaseDraw.sectionHint'),
    fieldLabels: ['X', 'Y', tr('vaseDraw.angle')],
    bounds() {
      const r = R() * 1.1
      return [-r, -r, r, r]
    },
    readonly() {
      if (drawn()) return null
      const text = document.createElement('span')
      text.textContent = tr('vaseDraw.sectionFromSettings')
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = tr('vaseDraw.drawYourself')
      b.addEventListener('click', () => set({ section: 'gezeichnet' }))
      b.style.cssText = 'min-height:30px;padding:4px 10px;border-radius:7px;border:1px solid var(--vz-accent);background:var(--vz-bg);color:var(--vz-accent);font-weight:700;cursor:pointer'
      return [text, b]
    },
    drawShape(g) {
      const r = R()
      svgEl('circle', { class: 'vz-axis', r }, g)
      const s = sym()
      // Cross-section transition: the other (not drawn) cross-section faintly behind.
      const v = get()
      if (v.section2 !== 'keiner') {
        const other = v.section === 'gezeichnet' ? secondSectionParams(v) : v.section2 === 'gezeichnet' ? v : secondSectionParams(v)
        if (other.section !== 'gezeichnet') {
          const table = sectionTable(other)
          const pts = []
          for (let k = 0; k < 720; k++) {
            const a = (2 * Math.PI * k) / 720
            pts.push([table.at(a) * r * Math.cos(a), table.at(a) * r * Math.sin(a)])
          }
          svgEl('path', { class: 'vz-ghost', d: pathOf(pts, true) }, g)
        }
      }
      if (drawn()) {
        const ext = r * 1.25
        if (s === 'halb' || s === 'viertel') svgEl('line', { class: 'vz-axis', x1: 0, y1: -ext, x2: 0, y2: ext }, g)
        if (s === 'viertel') svgEl('line', { class: 'vz-axis', x1: -ext, y1: 0, x2: ext, y2: 0 }, g)
        if (s === 'windmuehle') {
          for (let k = 0; k < get().drawRepeat; k++) {
            const a = Math.PI / 2 - (2 * Math.PI * k) / get().drawRepeat
            svgEl('line', { class: 'vz-axis', x1: 0, y1: 0, x2: ext * Math.cos(a), y2: ext * Math.sin(a) }, g)
          }
        }
        const outline = sectionOutline({ ...get(), section: 'gezeichnet', drawPoints: base() }).map(([x, y]) => [x * r, y * r])
        svgEl('path', { class: 'vz-shape', d: pathOf(outline, true) }, g)
        svgEl('path', { class: 'vz-edit', d: pathOf(this.editCurve(), s === 'frei') }, g)
      } else {
        const table = sectionTable(get())
        const pts = []
        for (let k = 0; k < 720; k++) {
          const a = (2 * Math.PI * k) / 720
          const q = table.at(a) * r
          pts.push([q * Math.cos(a), q * Math.sin(a)])
        }
        svgEl('path', { class: 'vz-shape', d: pathOf(pts, true) }, g)
      }
      svgEl('circle', { cx: 0, cy: 0, r: 1.2, fill: 'currentColor', opacity: 0.35 }, g)
    },
    /** Curve of the base piece (the points one drags) in mm - for double-click and highlighting. */
    editCurve() {
      if (!drawn()) return null
      const r = R()
      const pts = base()
      const all = drawnSectionPoints({ ...get(), drawPoints: pts })
      const outline = sectionOutline({ ...get(), section: 'gezeichnet', drawPoints: pts }, 16)
      // The outline has 16 samples per section; the base piece spans the first sections.
      const segs = sym() === 'frei' ? all.length : pts.length - 1
      return outline.slice(0, segs * 16 + 1).map(([x, y]) => [x * r, y * r])
    },
    pointsMm() {
      if (!drawn()) return []
      const pts = base()
      return pts.map((pt, i) => ({
        x: pt.x * R(), y: pt.y * R(),
        kind: pt.corner ? 'ecke' : pt.tx !== undefined ? 'anfasser' : 'rund',
        lockA: axisOf(pts, i) === 'y', lockB: axisOf(pts, i) === 'x',
      }))
    },
    coord: (pt, k) => (k === 0 ? pt.x : pt.y),
    setCoord(i, k, v) {
      const p = this.pointsMm()[i]
      this.movePoint(i, k === 0 ? [v, p.y] : [p.x, v], false)
    },
    movePoint(i, mm, draft) {
      const pts = base()
      let [x, y] = toUnit(mm)
      x = clamp(x, -3, 3)
      y = clamp(y, -3, 3)
      const axis = axisOf(pts, i)
      if (axis === 'y') x = 0
      if (axis === 'x') y = 0
      pts[i] = { ...pts[i], x, y }
      commit(pts, draft)
    },
    tangentMm(i, ppm) {
      const pts = base()
      const pt = pts[i]
      if (!pt || pt.corner) return null
      let [tx, ty] = pt.tx !== undefined ? [pt.tx, pt.ty] : autoTangent(pts, i)
      // Like a Bezier handle: a third of the tangent; at least 28 px long, so that one can grab it.
      let gx = (tx / 3) * R(), gy = (ty / 3) * R()
      const len = Math.hypot(gx, gy)
      const min = 28 / ppm
      if (len < 1e-9) { gx = min; gy = 0 } else if (len < min) { gx *= min / len; gy *= min / len }
      return [gx, gy]
    },
    moveTangent(i, mm, sign, ppm, draft) {
      const pts = base()
      const pt = pts[i]
      let gx = (mm[0] / R() - pt.x) * sign, gy = (mm[1] / R() - pt.y) * sign
      const axis = axisOf(pts, i)
      if (axis === 'y') gy = 0
      if (axis === 'x') gx = 0
      // Dragged handle: the same tangent on both sides (a separate one before the point is dropped).
      const { ix, iy, ...rest } = pt
      pts[i] = { ...rest, corner: false, tx: clamp(3 * gx, -4, 4), ty: clamp(3 * gy, -4, 4) }
      commit(pts, draft)
    },
    angle(i) {
      const pts = base()
      const pt = pts[i]
      if (!pt || pt.corner) return null
      const [tx, ty] = pt.tx !== undefined ? [pt.tx, pt.ty] : autoTangent(pts, i)
      return (Math.atan2(ty, tx) * 180) / Math.PI
    },
    setAngle(i, deg) {
      const pts = base()
      const pt = pts[i]
      if (!pt || pt.corner) return
      const [tx, ty] = pt.tx !== undefined ? [pt.tx, pt.ty] : autoTangent(pts, i)
      const len = Math.hypot(tx, ty) || 0.5
      const a = (deg * Math.PI) / 180
      let nx = len * Math.cos(a), ny = len * Math.sin(a)
      const axis = axisOf(pts, i)
      if (axis === 'y') ny = 0
      if (axis === 'x') nx = 0
      const { ix, iy, ...rest } = pt
      pts[i] = { ...rest, tx: nx, ty: ny }
      commit(pts, false)
    },
    setKind(i, kind) {
      const pts = base()
      const pt = pts[i]
      if (kind === 'ecke') pts[i] = { x: pt.x, y: pt.y, corner: true }
      else if (kind === 'rund') pts[i] = { x: pt.x, y: pt.y, corner: false }
      else {
        let [tx, ty] = pt.tx !== undefined ? [pt.tx, pt.ty] : autoTangent(pts, i)
        const axis = axisOf(pts, i)
        if (axis === 'y') ty = 0
        if (axis === 'x') tx = 0
        if (Math.hypot(tx, ty) < 1e-6) tx = 0.5
        pts[i] = { x: pt.x, y: pt.y, corner: false, tx, ty }
      }
      commit(pts, false)
    },
    insertAfter(i) {
      const pts = base()
      const closed = sym() === 'frei'
      let a = i ?? pts.length - 2, b = a + 1
      if (b >= pts.length) {
        if (closed) b = 0
        else { a -= 1; b -= 1 }
      }
      if (a < 0 || pts.length >= MAX_DRAW_POINTS) return null
      const at = b === 0 ? pts.length : b
      pts.splice(at, 0, { x: (pts[a].x + pts[b].x) / 2, y: (pts[a].y + pts[b].y) / 2, corner: false })
      commit(pts, false)
      return at
    },
    insertNear(mm) {
      const pts = base()
      if (pts.length >= MAX_DRAW_POINTS) return null
      const [ux, uy] = toUnit(mm)
      const curve = this.editCurve().map(([x, y]) => [x / R(), y / R()])
      // Nearest place on the curve; its section (16 samples per section) decides where the point goes.
      let best = 0, bestD = Infinity
      curve.forEach(([x, y], k) => { const d = (x - ux) ** 2 + (y - uy) ** 2; if (d < bestD) { bestD = d; best = k } })
      const seg = Math.min(Math.floor(best / 16), sym() === 'frei' ? pts.length - 1 : pts.length - 2)
      const at = seg + 1
      pts.splice(at, 0, { x: curve[best][0], y: curve[best][1], corner: false })
      commit(pts, false)
      return at
    },
    canDelete(i) {
      const pts = base()
      if (sym() === 'halb' || sym() === 'viertel') return i > 0 && i < pts.length - 1 && pts.length > 2
      return pts.length > (sym() === 'frei' ? 3 : 2)
    },
    remove(i) {
      const pts = base()
      pts.splice(i, 1)
      commit(pts, false)
    },
    reset() { set({ drawPoints: null }) },
    finish() { set({}) },
  })
  return board
}

/* ------------------------------------------------------------------ */
/* Side view: body form                                                */
/* ------------------------------------------------------------------ */

/** Drawing the body form: right side in mm (radius, height), mirrored on the left; axis of rotation at x = 0. */
export function profileEditor({ get, set, notify, tr = (key) => key, note = (text) => text, locale, readMesh, edgeLasso }) {
  if (locale) numberLocale = locale
  const drawn = () => get().profile === 'gezeichnet'
  /** Normalised points [height 0..1, radius 0..1, kind?, slope?] - drawn or from the preset. */
  const normPts = () => {
    const v = get()
    const src = drawn() ? (v.profilePoints ?? DRAW_PROFILE) : (PROFILES[v.profile]?.points ?? DRAW_PROFILE)
    return src.map((pt) => [...pt])
  }
  const scale = () => {
    const pts = normPts()
    const maxR = Math.max(...pts.map((pt) => pt[1]))
    return { H: get().height, R: get().diameter / 2, maxR }
  }
  /** Normalised -> mm: x = radius, y = height. Slope in mm: radius per height. */
  const toMm = (pt) => {
    const { H, R, maxR } = scale()
    return { x: (pt[1] * R) / maxR, y: pt[0] * H, kind: pt[2] === PROFILE_CORNER ? 'ecke' : pt[2] === PROFILE_HANDLE ? 'anfasser' : 'rund', slope: pt[2] === PROFILE_HANDLE ? (pt[3] * R) / maxR / H : null }
  }
  /** Slope (mm/mm) of the curve at point i, as it is drawn. */
  const slopeAt = (i) => {
    const pts = normPts()
    const mm = pts.map(toMm)
    if (mm[i].slope !== null) return mm[i].slope
    const { H, R, maxR } = scale()
    const f = profileFunction(pts)
    const t = pts[i][0]
    const e = 1e-4
    const a = Math.max(0, t - e), b = Math.min(1, t + e)
    return ((f(b) - f(a)) / (b - a)) * (R / maxR) / H
  }
  /**
   * Commits from mm: height = the topmost point, diameter = the widest point; everything else
   * normalised. So dragging up or outwards changes the height or the diameter.
   */
  function commit(mmPts, draft) {
    const H = clamp(mmPts[mmPts.length - 1].y, ...LIMITS.height)
    const maxR = clamp(Math.max(...mmPts.map((p) => p.x)), LIMITS.diameter[0] / 2, LIMITS.diameter[1] / 2)
    const profilePoints = mmPts.map((p, i) => {
      const t = i === 0 ? 0 : i === mmPts.length - 1 ? 1 : clamp(p.y / H, 0, 1)
      const q = [t, clamp(p.x / maxR, 0.03, 1)]
      if (p.kind === 'ecke') q.push(PROFILE_CORNER)
      else if (p.kind === 'anfasser' && p.slope !== null) q.push(PROFILE_HANDLE, (p.slope * H) / maxR)
      return q
    })
    set({ profile: 'gezeichnet', profilePoints, height: H, diameter: 2 * maxR }, { draft })
  }
  const current = () => normPts().map(toMm)
  /** Takes an imported body form (SVG or mesh): the points, plus height and diameter if they fit. */
  function takeProfile(r, source) {
    if (!r.ok) return tr('vaseDraw.profileNotTaken', { notes: r.notes.map(note).join(' ') })
    const patch = { profile: 'gezeichnet', profilePoints: r.profilePoints }
    const fits = (v, [a, b]) => v >= a && v <= b
    const notes = r.notes.map(note)
    if (fits(r.height, LIMITS.height) && fits(r.diameter, LIMITS.diameter)) {
      patch.height = Math.round(r.height * 10) / 10
      patch.diameter = Math.round(r.diameter * 10) / 10
    } else notes.push(tr('vaseDraw.profileOutOfLimits', { height: LIMITS.height.join('–'), diameter: LIMITS.diameter.join('–') }))
    set(patch)
    return [source === 'svg' ? tr('vaseDraw.profileTakenSvg') : source === 'photo' ? tr('vaseDraw.profileTakenPhoto') : tr('vaseDraw.profileTakenFile', { name: source }), ...notes].join(' ')
  }

  return drawingBoard({
    tr,
    note,
    ariaLabel: tr('vaseDraw.profileAria'),
    photo: true,
    // Photo: the vase's measures as the default for the object; measures entered are taken on by the vase.
    photoSize: () => ({ height: get().height, diameter: get().diameter }),
    photoFit({ height, diameter }) {
      if (Math.abs(height - get().height) > 1e-6 || Math.abs(diameter - get().diameter) > 1e-6) set({ height: Math.round(height * 10) / 10, diameter: Math.round(diameter * 10) / 10 })
    },
    photoProfile: (r) => takeProfile(r, 'photo'),
    // Trace's magnetic lasso, when Layerling hands over the way along the edges.
    edgeLasso,
    maxPoints: MAX_PROFILE_POINTS,
    notify,
    svgTitle: tr('vaseDraw.profileSvgTitle'),
    importSvg(text) {
      return takeProfile(svgToProfile(text), 'svg')
    },
    meshTitle: tr('vaseDraw.profileMeshTitle'),
    // Without a reader (readMesh), no button for it.
    importMesh: readMesh ? async (name, bytes) => takeProfile(meshToProfile(await readMesh(name, bytes)), name) : undefined,
    hint: tr('vaseDraw.profileHint'),
    fieldLabels: [tr('vaseDraw.radius'), tr('vaseDraw.height'), tr('vaseDraw.angle')],
    bounds() {
      const { H, R } = scale()
      return [-R * 1.05, -H * 0.04, R * 1.05, H * 1.04]
    },
    drawShape(g, ctx) {
      const { H } = scale()
      const right = this.editCurve()
      const outline = [...right, ...right.slice().reverse().map(([x, y]) => [-x, y])]
      svgEl('path', { class: 'vz-shape', d: pathOf(outline, true) }, g)
      svgEl('path', { class: 'vz-edit', d: pathOf(right, false) }, g)
      // Axis of rotation and print bed.
      svgEl('line', { class: 'vz-axis', x1: 0, y1: -H * 0.03, x2: 0, y2: H * 1.03 }, g)
      svgEl('line', { class: 'vz-axis', x1: -scale().R * 1.3, y1: 0, x2: scale().R * 1.3, y2: 0 }, g)
      const t = svgEl('text', { class: 'vz-axis-label', x: 4 / ctx.ppm, y: -(H * 1.03 - 4 / ctx.ppm), 'font-size': 10 / ctx.ppm }, ctx.labelG)
      t.textContent = tr('vaseDraw.axis')
    },
    editCurve() {
      const pts = normPts()
      const { H, R, maxR } = scale()
      const f = profileFunction(pts)
      const out = []
      for (let k = 0; k <= 240; k++) out.push([(Math.max(0.02, f(k / 240)) * R) / maxR, (k / 240) * H])
      return out
    },
    pointsMm() {
      // The lowest point stays on the print bed (height fixed).
      return current().map((p, i) => ({ ...p, lockB: i === 0 }))
    },
    coord: (pt, k) => (k === 0 ? pt.x : pt.y),
    setCoord(i, k, v) {
      const p = this.pointsMm()[i]
      this.movePoint(i, k === 0 ? [v, p.y] : [p.x, v], false)
    },
    movePoint(i, [x, y], draft) {
      const pts = current()
      const n = pts.length
      x = Math.max(0.5, x)
      if (i === 0) y = 0
      else if (i === n - 1) y = Math.max(pts[n - 2].y + 0.5, y)
      else y = clamp(y, pts[i - 1].y + 0.5, pts[i + 1].y - 0.5)
      pts[i] = { ...pts[i], x, y }
      commit(pts, draft)
    },
    tangentMm(i, ppm) {
      const pts = current()
      if (!pts[i] || pts[i].kind === 'ecke') return null
      const s = slopeAt(i)
      // Direction (radius, height) = (s, 1), 40 px long on screen.
      const len = Math.hypot(s, 1)
      const L = 40 / ppm
      return [(s / len) * L, (1 / len) * L]
    },
    moveTangent(i, [x, y], sign, ppm, draft) {
      const pts = current()
      const p = pts[i]
      let dx = (x - p.x) * sign, dy = (y - p.y) * sign
      // Never overhanging: the line always points up (at most nearly horizontal).
      if (dy < 0) { dx = -dx; dy = -dy }
      dy = Math.max(dy, Math.abs(dx) / 40)
      pts[i] = { ...p, kind: 'anfasser', slope: dx / dy }
      commit(pts, draft)
    },
    angle(i) {
      const pts = current()
      if (!pts[i] || pts[i].kind === 'ecke') return null
      return (Math.atan(slopeAt(i)) * 180) / Math.PI
    },
    setAngle(i, deg) {
      const pts = current()
      if (!pts[i] || pts[i].kind === 'ecke') return
      pts[i] = { ...pts[i], kind: 'anfasser', slope: Math.tan((clamp(deg, -88, 88) * Math.PI) / 180) }
      commit(pts, false)
    },
    setKind(i, kind) {
      const pts = current()
      const slope = kind === 'anfasser' ? slopeAt(i) : null
      pts[i] = { ...pts[i], kind, slope }
      commit(pts, false)
    },
    insertAfter(i) {
      const pts = current()
      let a = i ?? pts.length - 2, b = a + 1
      if (b >= pts.length) { a -= 1; b -= 1 }
      if (a < 0 || pts[b].y - pts[a].y < 2 || pts.length >= MAX_PROFILE_POINTS) return null
      const y = (pts[a].y + pts[b].y) / 2
      const curve = this.editCurve()
      const x = curve[Math.round((y / scale().H) * 240)][0]
      pts.splice(b, 0, { x, y, kind: 'rund', slope: null })
      commit(pts, false)
      return b
    },
    insertNear([, y]) {
      const pts = current()
      if (pts.length >= MAX_PROFILE_POINTS) return null
      const b = pts.findIndex((p) => p.y > y)
      if (b <= 0 || y - pts[b - 1].y < 1 || pts[b].y - y < 1) return null
      const x = this.editCurve()[Math.round((y / scale().H) * 240)][0]
      pts.splice(b, 0, { x, y, kind: 'rund', slope: null })
      commit(pts, false)
      return b
    },
    canDelete: (i) => i > 0 && i < current().length - 1,
    remove(i) {
      const pts = current()
      pts.splice(i, 1)
      commit(pts, false)
    },
    reset() { set({ profile: 'gezeichnet', profilePoints: DRAW_PROFILE.map((pt) => [...pt]) }) },
    finish() { set({}) },
  })
}

/* ------------------------------------------------------------------ */
/* Twist curve: angle per height                                       */
/* ------------------------------------------------------------------ */

/**
 * Drawing the twist of the cross-section as a curve: the angle (degrees) across, the height (mm)
 * upwards. One point at the bottom and one at the top; free in between. While the twist is even
 * (sliders), the board only shows it - "Draw as a curve" takes it over as points.
 */
export function twistEditor({ get, set, notify, tr = (key) => key, note = (text) => text, locale, readMesh }) {
  if (locale) numberLocale = locale
  const curve = () => get().twistMode === 'kurve'
  const H = () => get().height
  // 180 degrees as wide as the vase is tall - a sway of a few degrees stays visible.
  const xs = () => H() / 180
  const normPts = () => (get().twistPoints ?? twistPointsFrom(get())).map((pt) => [...pt])
  const toMm = (pt) => ({ x: pt[1] * xs(), y: pt[0] * H(), kind: pt[2] === PROFILE_CORNER ? 'ecke' : pt[2] === PROFILE_HANDLE ? 'anfasser' : 'rund', slope: pt[2] === PROFILE_HANDLE ? pt[3] : null })
  const current = () => normPts().map(toMm)
  /** Slope at point i in degrees per whole height, as the curve computes it. */
  const slopeAt = (i) => {
    const pts = normPts()
    if (pts[i][2] === PROFILE_HANDLE) return pts[i][3]
    const sp = profileSpline(pts)
    return i === 0 ? sp.mR[0] : i === pts.length - 1 ? sp.mL[i] : (sp.mL[i] + sp.mR[i]) / 2
  }
  function commit(mmPts, draft) {
    const twistPoints = mmPts.map((p, i) => {
      const t = i === 0 ? 0 : i === mmPts.length - 1 ? 1 : clamp(p.y / H(), 0, 1)
      const q = [t, clamp(p.x / xs(), -MAX_TWIST_ANGLE, MAX_TWIST_ANGLE)]
      if (p.kind === 'ecke') q.push(PROFILE_CORNER)
      else if (p.kind === 'anfasser' && p.slope !== null) q.push(PROFILE_HANDLE, p.slope)
      return q
    })
    set({ twistMode: 'kurve', twistPoints }, { draft })
  }
  return drawingBoard({
    tr,
    note,
    ariaLabel: tr('vaseDraw.twistAria'),
    hint: tr('vaseDraw.twistHint'),
    fieldLabels: [tr('vaseDraw.angle'), tr('vaseDraw.height'), tr('vaseDraw.tilt')],
    fieldUnits: ['°', 'mm'],
    maxPoints: MAX_POINTS_TWIST,
    notify,
    xScale: xs,
    bounds() {
      const angles = normPts().map((pt) => pt[1])
      const lo = Math.min(-90, ...angles) * xs(), hi = Math.max(90, ...angles) * xs()
      return [lo, -H() * 0.04, hi, H() * 1.04]
    },
    readonly() {
      if (curve()) return null
      const text = document.createElement('span')
      text.textContent = tr('vaseDraw.twistFromSettings')
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = tr('vaseDraw.drawAsCurve')
      b.addEventListener('click', () => set({ twistMode: 'kurve', twistPoints: twistPointsFrom(get()) }))
      b.style.cssText = 'min-height:30px;padding:4px 10px;border-radius:7px;border:1px solid var(--vz-accent);background:var(--vz-bg);color:var(--vz-accent);font-weight:700;cursor:pointer'
      return [text, b]
    },
    drawShape(g, ctx) {
      const h = H()
      // Zero line (no twist), print bed and rim.
      svgEl('line', { class: 'vz-axis', x1: 0, y1: -h * 0.03, x2: 0, y2: h * 1.03 }, g)
      svgEl('line', { class: 'vz-axis', x1: -400 * xs(), y1: 0, x2: 400 * xs(), y2: 0 }, g)
      svgEl('line', { class: 'vz-axis', x1: -400 * xs(), y1: h, x2: 400 * xs(), y2: h }, g)
      const t = svgEl('text', { class: 'vz-axis-label', x: 4 / ctx.ppm, y: -(h * 1.03 - 4 / ctx.ppm), 'font-size': 10 / ctx.ppm }, ctx.labelG)
      t.textContent = tr('vaseDraw.noTwist')
      svgEl('path', { class: 'vz-edit', d: pathOf(this.editCurve(), false) }, g)
    },
    editCurve() {
      const rot = rotationFunction(get())
      const out = []
      for (let k = 0; k <= 240; k++) out.push([((rot(k / 240) * 180) / Math.PI) * xs(), (k / 240) * H()])
      return out
    },
    pointsMm() {
      if (!curve()) return []
      const pts = current()
      return pts.map((p, i) => ({ ...p, lockB: i === 0 || i === pts.length - 1 }))
    },
    coord: (pt, k) => (k === 0 ? pt.x / xs() : pt.y),
    setCoord(i, k, v) {
      const p = this.pointsMm()[i]
      this.movePoint(i, k === 0 ? [v * xs(), p.y] : [p.x, v], false)
    },
    movePoint(i, [x, y], draft) {
      const pts = current()
      const n = pts.length
      if (i === 0) y = 0
      else if (i === n - 1) y = H()
      else y = clamp(y, pts[i - 1].y + 0.5, pts[i + 1].y - 0.5)
      pts[i] = { ...pts[i], x: clamp(x, -MAX_TWIST_ANGLE * xs(), MAX_TWIST_ANGLE * xs()), y }
      commit(pts, draft)
    },
    tangentMm(i, ppm) {
      const pts = current()
      if (!pts[i] || pts[i].kind === 'ecke') return null
      // Slope in degrees per height -> mm across per mm of height.
      const s = (slopeAt(i) * xs()) / H()
      const len = Math.hypot(s, 1)
      const L = 40 / ppm
      return [(s / len) * L, (1 / len) * L]
    },
    moveTangent(i, [x, y], sign, ppm, draft) {
      const pts = current()
      const p = pts[i]
      let dx = (x - p.x) * sign, dy = (y - p.y) * sign
      if (dy < 0) { dx = -dx; dy = -dy }
      dy = Math.max(dy, Math.abs(dx) / 200)
      pts[i] = { ...p, kind: 'anfasser', slope: ((dx / dy) * H()) / xs() }
      commit(pts, draft)
    },
    angle: () => null,
    setAngle() {},
    setKind(i, kind) {
      const pts = current()
      pts[i] = { ...pts[i], kind, slope: kind === 'anfasser' ? slopeAt(i) : null }
      commit(pts, false)
    },
    insertAfter(i) {
      const pts = current()
      let a = i ?? pts.length - 2, b = a + 1
      if (b >= pts.length) { a -= 1; b -= 1 }
      if (a < 0 || pts[b].y - pts[a].y < 2 || pts.length >= MAX_POINTS_TWIST) return null
      const y = (pts[a].y + pts[b].y) / 2
      const rot = rotationFunction(get())
      pts.splice(b, 0, { x: ((rot(y / H()) * 180) / Math.PI) * xs(), y, kind: 'rund', slope: null })
      commit(pts, false)
      return b
    },
    insertNear([, y]) {
      const pts = current()
      if (pts.length >= MAX_POINTS_TWIST) return null
      const b = pts.findIndex((p) => p.y > y)
      if (b <= 0 || y - pts[b - 1].y < 1 || pts[b].y - y < 1) return null
      const rot = rotationFunction(get())
      pts.splice(b, 0, { x: ((rot(y / H()) * 180) / Math.PI) * xs(), y, kind: 'rund', slope: null })
      commit(pts, false)
      return b
    },
    canDelete: (i) => i > 0 && i < current().length - 1,
    remove(i) {
      const pts = current()
      pts.splice(i, 1)
      commit(pts, false)
    },
    reset() { set({ twistMode: 'kurve', twistPoints: [[0, 0], [1, 0]] }) },
    finish() { set({}) },
  })
}
