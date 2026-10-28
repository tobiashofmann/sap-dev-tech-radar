// Quadrant corners per design/DESIGN.md rule 7: UI top-left, Technology
// top-right, Tools bottom-left, Frameworks bottom-right. radial_min/max are
// multiples of PI (atan2 convention, SVG y-down).
export const QUADRANTS = [
  { name: 'UI', radial_min: -1, radial_max: -0.5 },
  { name: 'Technology', radial_min: -0.5, radial_max: 0 },
  { name: 'Frameworks', radial_min: 0, radial_max: 0.5 },
  { name: 'Tools', radial_min: 0.5, radial_max: 1 }
]

// center -> outside, per design/DESIGN.md rule 7
export const RINGS = ['ADOPT', 'USE', 'HOLD', 'STOP']

// ring boundaries as a fraction of the chart's outer radius
const RING_BOUNDS = [0, 0.3, 0.55, 0.78, 1]

function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

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

export function ringBoundaryRadii(maxRadius) {
  return RING_BOUNDS.slice(1).map((f) => f * maxRadius)
}
