/**
 * Quadrant corners per design/DESIGN.md rule 7: UI top-left, Technology
 * top-right, Tools bottom-left, Frameworks bottom-right. radial_min/max are
 * multiples of PI (atan2 convention, SVG y-down).
 * @type {Array.<{name: string, radial_min: number, radial_max: number}>}
 */
export const QUADRANTS = [
  { name: 'UI', radial_min: -1, radial_max: -0.5 },
  { name: 'Technology', radial_min: -0.5, radial_max: 0 },
  { name: 'Frameworks', radial_min: 0, radial_max: 0.5 },
  { name: 'Tools', radial_min: 0.5, radial_max: 1 }
]

/**
 * Ring names, center -> outside, per design/DESIGN.md rule 7.
 * @type {string[]}
 */
export const RINGS = ['ADOPT', 'USE', 'HOLD', 'STOP']

// ring boundaries as a fraction of the chart's outer radius
const RING_BOUNDS = [0, 0.3, 0.55, 0.78, 1]

/**
 * A 32-bit FNV-1a hash of a string, used to seed blipPosition()'s PRNG so
 * a given id always lands at the same position.
 * @param {string} str
 * @returns {number} unsigned 32-bit hash
 */
function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * A seeded pseudo-random number generator (mulberry32) - deterministic for
 * a given seed, unlike Math.random(), so blipPosition() is stable across
 * re-renders.
 * @param {number} seed
 * @returns {function(): number} a function that returns the next random float in [0, 1)
 */
function mulberry32(seed) {
  let a = seed
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A stable (seeded by id) position for a blip within its quadrant/ring
 * sector, so it doesn't jump around on re-render or when filters change.
 * @param {string} id
 * @param {string} quadrantName one of QUADRANTS' names
 * @param {string} ringName one of RINGS
 * @param {number} maxRadius pixels, the chart's outer ring radius
 * @returns {{x: number, y: number}|null}
 */
export function blipPosition(id, quadrantName, ringName, maxRadius) {
  const quadrant = QUADRANTS.find((q) => q.name === quadrantName)
  const ringIdx = RINGS.indexOf(ringName)
  if (!quadrant || ringIdx === -1) {
    return null
  }

  const rand = mulberry32(hashSeed(id))
  const angle = (quadrant.radial_min + rand() * (quadrant.radial_max - quadrant.radial_min)) * Math.PI
  const rMin = RING_BOUNDS[ringIdx] * maxRadius
  const rMax = RING_BOUNDS[ringIdx + 1] * maxRadius
  const padding = (rMax - rMin) * 0.15
  const r = rMin + padding + rand() * (rMax - rMin - 2 * padding)

  return { x: r * Math.cos(angle), y: r * Math.sin(angle) }
}

/**
 * The pixel radius of each ring boundary (ADOPT/USE/HOLD/STOP's outer
 * edges), for drawing the radar's ring circles.
 * @param {number} maxRadius pixels, the chart's outer ring radius
 * @returns {number[]} one radius per ring in RINGS, innermost first
 */
export function ringBoundaryRadii(maxRadius) {
  return RING_BOUNDS.slice(1).map((f) => f * maxRadius)
}
