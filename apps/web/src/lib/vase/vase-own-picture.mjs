/**
 * One's own picture, or a text, as a relief pattern of the vase (the family `bild` of vase-patterns.mjs).
 *
 * The built-in families read their heights from tiles of a picture (vase-pattern-maps.mjs); here the picture comes
 * from the vase's settings instead: `patternImage`, in the form one's own image of a Surface Texture has -
 * { width, height, data } with the grey values (0 to 255, a row at a time from the top) as Base64, light the raised
 * relief. A text is drawn into such a picture by the editor, where there is a canvas (lib/vaseRelief.ts), and kept
 * beside it as `patternText` so it can be changed.
 *
 * For the pattern the picture becomes a tile like the built-in ones: `size` x `size` heights, its height `aspect`
 * times its width, so it is read, softened to the build grid and leaned exactly as they are. Round the vase it stands
 * side by side as often as the pattern's count says; up the vase either row upon row, or one such row (a band) in the
 * middle of the pattern's height range, or of that row one picture alone (vase-patterns.mjs places it).
 */

/** A picture has at most this many points on its longer side (it is kept in the design and in every undo step). */
export const OWN_PICTURE_SIZE = 512
/** A text for a relief has at most this many characters. */
export const OWN_TEXT_LENGTH = 60
/** Row upon row all the way up the height range, one row round the vase in its middle, or one picture alone there. */
export const PICTURE_FITS = { kacheln: 'Kacheln', band: 'Ein Band', einmal: 'Einmal' }

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64_VALUE = new Int16Array(128).fill(-1)
for (let i = 0; i < 64; i++) B64_VALUE[B64.charCodeAt(i)] = i

/** Base64 as bytes, or null where it is not Base64 of exactly `count` bytes. */
function base64Bytes(text, count) {
  const length = text.endsWith('==') ? text.length - 2 : text.endsWith('=') ? text.length - 1 : text.length
  if (text.length % 4 !== 0 || Math.floor((length * 3) / 4) !== count) return null
  const out = new Uint8Array(count)
  let o = 0
  for (let i = 0; i < length; i += 4) {
    const a = B64_VALUE[text.charCodeAt(i)], b = B64_VALUE[text.charCodeAt(i + 1)]
    const c = i + 2 < length ? B64_VALUE[text.charCodeAt(i + 2)] : 0, d = i + 3 < length ? B64_VALUE[text.charCodeAt(i + 3)] : 0
    if (!(a >= 0) || !(b >= 0) || !(c >= 0) || !(d >= 0)) return null
    const n = (a << 18) | (b << 12) | (c << 6) | d
    if (o < count) out[o++] = (n >> 16) & 255
    if (o < count) out[o++] = (n >> 8) & 255
    if (o < count) out[o++] = n & 255
  }
  return out
}

// A picture that has been looked through once is known by itself: a vase's settings are completed over and over while
// it is worked on, and the picture's grey values (up to a third of a megabyte of text) are read only the first time.
const pictureBytes = new WeakMap()
const pictureKeys = new WeakMap()
const pictureTiles = new WeakMap()
// The last few pictures by their grey values: a picture that comes in anew with the same values (out of a saved design,
// or copied into the worker that builds the vase) is the one already known, with all that was worked out for it.
const recentPictures = new Map()

/**
 * A picture as the settings may keep it: { width, height, data } with whole numbers from 2 to OWN_PICTURE_SIZE and
 * width x height grey values as Base64. Anything else is null. A picture that passed is frozen and comes back as it is.
 */
export function normalizeOwnPicture(input) {
  if (!input || typeof input !== 'object') return null
  if (pictureBytes.has(input)) return input
  const { width, height, data } = input
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || width > OWN_PICTURE_SIZE || height > OWN_PICTURE_SIZE) return null
  if (typeof data !== 'string') return null
  const known = recentPictures.get(data)
  if (known && known.width === width && known.height === height) return known
  const bytes = base64Bytes(data, width * height)
  if (!bytes) return null
  const picture = Object.freeze({ width, height, data })
  pictureBytes.set(picture, bytes)
  recentPictures.set(data, picture)
  if (recentPictures.size > 6) recentPictures.delete(recentPictures.keys().next().value)
  return picture
}

/**
 * A short name for a picture that changes with any of its points (FNV-1a over its grey values): for the keys of caches.
 * Anything that is not a picture has the name ''.
 */
export function ownPictureKey(input) {
  const picture = normalizeOwnPicture(input)
  if (!picture) return ''
  const known = pictureKeys.get(picture)
  if (known) return known
  let h = 2166136261
  for (let i = 0; i < picture.data.length; i++) h = Math.imul(h ^ picture.data.charCodeAt(i), 16777619)
  const key = `${picture.width}x${picture.height}:${(h >>> 0).toString(36)}`
  pictureKeys.set(picture, key)
  return key
}

/**
 * The picture as a tile of the pattern families' kind: { size, aspect, values } with `size` x `size` heights (0 low to
 * 255 high) and its height `aspect` times its width. The picture is read between its points onto the square the
 * families' tiles are, once per picture. Null for anything that is not a picture (see normalizeOwnPicture).
 */
export function ownPictureTile(input) {
  const picture = normalizeOwnPicture(input)
  if (!picture) return null
  const known = pictureTiles.get(picture)
  if (known) return known
  const { width: w, height: h } = picture
  const bytes = pictureBytes.get(picture)
  const size = Math.max(64, Math.min(OWN_PICTURE_SIZE, Math.max(w, h)))
  const values = new Uint8Array(size * size)
  for (let y = 0; y < size; y++) {
    const sy = Math.min(h - 1, Math.max(0, ((y + 0.5) * h) / size - 0.5))
    const y0 = Math.floor(sy), y1 = Math.min(h - 1, y0 + 1), fy = sy - y0
    for (let x = 0; x < size; x++) {
      const sx = Math.min(w - 1, Math.max(0, ((x + 0.5) * w) / size - 0.5))
      const x0 = Math.floor(sx), x1 = Math.min(w - 1, x0 + 1), fx = sx - x0
      const top = bytes[y0 * w + x0] + (bytes[y0 * w + x1] - bytes[y0 * w + x0]) * fx
      const bottom = bytes[y1 * w + x0] + (bytes[y1 * w + x1] - bytes[y1 * w + x0]) * fx
      values[y * size + x] = Math.round(top + (bottom - top) * fy)
    }
  }
  const tile = { size, aspect: h / w, values, own: true }
  pictureTiles.set(picture, tile)
  return tile
}

/**
 * What the gallery shows for the family while the vase has no picture of its own: a framed picture with a hill and a
 * sun, as heights 0..1 at (u, v) in 0..1, v up.
 */
export function ownPicturePlaceholder(u, v) {
  const frame = Math.min(u, 1 - u, v, 1 - v)
  if (frame < 0.08) return 0
  if (frame < 0.14) return 1
  const sun = Math.hypot(u - 0.68, v - 0.7)
  if (sun < 0.11) return 1
  const hill = 0.2 + 0.34 * Math.max(0, 1 - Math.abs(u - 0.4) / 0.3) + 0.2 * Math.max(0, 1 - Math.abs(u - 0.74) / 0.2)
  return v < hill ? 0.75 : 0.15
}
