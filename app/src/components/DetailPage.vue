<script setup>
import { computed } from 'vue'
import RingPill from './RingPill.vue'
import { sanitizeDescription } from '../sanitize.js'
import { TREND_ARROWS } from '../trendIcons.js'
import { QUADRANTS, blipPosition, ringBoundaryRadii } from '../radarLayout.js'
import { RING_COLORS } from '../ringColors.js'

const props = defineProps({
  entry: { type: Object, required: true },
  allEntries: { type: Array, required: true }
})
const emit = defineEmits(['back', 'open-detail', 'show-on-radar'])

// most recent ring transition: the ring right before it, and the release
// it happened in (null = happened in the current, not-yet-released draft)
const lastChange = computed(() => {
  const sequence = [...props.entry.releaseHistory, { release: null, ring: props.entry.ring }]
  let previousRing = null
  let release = null
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i].ring !== sequence[i - 1].ring) {
      previousRing = sequence[i - 1].ring
      release = sequence[i].release
    }
  }
  return { previousRing, release }
})

const voteLink = computed(() =>
  props.entry.links.find((l) => l.name === 'Ring proposal & vote')
)

// shown separately under "What to do" above - excluded here to avoid
// listing it twice
const referenceLinks = computed(() =>
  props.entry.links.filter((l) => l.name !== 'Ring proposal & vote')
)

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// Ring history timeline (design/DESIGN.md screen B), capped to the last 5
// positions. If the ring hasn't changed since its most recent release, that
// release entry itself is marked "now" rather than appending a separate,
// dateless "current" entry - so a stable technology just shows its real
// release history with the last pill tagged "now".
const MAX_TIMELINE_ENTRIES = 5
const timelineEntries = computed(() => {
  const history = props.entry.releaseHistory
  const lastHistoryRing = history.length ? history[history.length - 1].ring : null
  const entries =
    lastHistoryRing === props.entry.ring
      ? history.map((h, i) => ({ release: h.release, ring: h.ring, isNow: i === history.length - 1 }))
      : [...history.map((h) => ({ release: h.release, ring: h.ring, isNow: false })), { release: null, ring: props.entry.ring, isNow: true }]
  return entries.slice(-MAX_TIMELINE_ENTRIES)
})

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function ringChipStyle(ring) {
  const color = RING_COLORS[ring]
  return { color, borderColor: color, background: hexToRgba(color, 0.12) }
}

// "What to do" card is tinted in the technology's own ring color (design
// mock: light green fill + green border for a USE entry), not a fixed
// info-blue - the ring itself IS the recommendation's color coding.
// ui5-card paints its own white background inside shadow DOM, so a plain
// inline background/border on the host is invisible - these go through
// as CSS custom properties instead, read by the ::part(root) rule below
// (the only way to reach the shadow background from outside).
const whatToDoStyle = computed(() => {
  const color = RING_COLORS[props.entry.ring]
  return { '--what-to-do-bg': hexToRgba(color, 0.08), '--what-to-do-border': color }
})

// --- "Position on radar": a quadrant excerpt (design/DESIGN.md screen B) --
// Reuses the same quadrant angle ranges and ring boundaries the full radar
// (RadarPage.vue) draws with, just cropped to this technology's own
// quadrant and zoomed into whichever box corner that quadrant occupies on
// the full radar (design/DESIGN.md rule 7: UI top-left, Technology
// top-right, Tools bottom-left, Frameworks bottom-right).
const BOX = 200
const MAX_R = 190
const QUADRANT_ORIGIN = {
  UI: { x: BOX, y: BOX },
  Technology: { x: 0, y: BOX },
  Frameworks: { x: 0, y: 0 },
  Tools: { x: BOX, y: 0 }
}

const positionOnRadar = computed(() => {
  const quadrant = QUADRANTS.find((q) => q.name === props.entry.quadrant)
  const origin = QUADRANT_ORIGIN[props.entry.quadrant]
  const ownPos = blipPosition(props.entry.id, props.entry.quadrant, props.entry.ring, MAX_R)
  if (!quadrant || !origin || !ownPos) {
    return null
  }

  const angleMin = quadrant.radial_min * Math.PI
  const angleMax = quadrant.radial_max * Math.PI
  const point = (angle, r) => ({ x: origin.x + r * Math.cos(angle), y: origin.y + r * Math.sin(angle) })

  const edgeMin = point(angleMin, MAX_R)
  const edgeMax = point(angleMax, MAX_R)
  const sectorPath = `M ${origin.x} ${origin.y} L ${edgeMin.x} ${edgeMin.y} A ${MAX_R} ${MAX_R} 0 0 1 ${edgeMax.x} ${edgeMax.y} Z`

  const ringArcs = ringBoundaryRadii(MAX_R)
    .slice(0, -1)
    .map((r) => {
      const a = point(angleMin, r)
      const b = point(angleMax, r)
      return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`
    })

  const otherBlips = props.allEntries
    .filter((e) => e.quadrant === props.entry.quadrant && e.ring !== 'DEPRECATED' && e.id !== props.entry.id)
    .map((e) => {
      const pos = blipPosition(e.id, e.quadrant, e.ring, MAX_R)
      return pos ? { id: e.id, x: origin.x + pos.x, y: origin.y + pos.y } : null
    })
    .filter(Boolean)

  return {
    sectorPath,
    ringArcs,
    otherBlips,
    own: { x: origin.x + ownPos.x, y: origin.y + ownPos.y, color: RING_COLORS[props.entry.ring] }
  }
})
</script>

<template>
  <div class="detail-page">
    <nav class="breadcrumb">
      <a href="#" @click.prevent="emit('back')">Radar</a> &rsaquo;
      {{ entry.quadrant }} &rsaquo; {{ entry.title }}
    </nav>

    <ui5-card class="header-card">
      <div class="card-body">
        <div class="header-top">
          <div class="header-text">
            <h1>{{ entry.title }}</h1>
            <p class="description" v-html="sanitizeDescription(entry.description)"></p>
          </div>
          <div class="meta-row">
            <RingPill :ring="entry.ring" />
            <span class="tag">{{ entry.quadrant }}</span>
            <span class="tag">{{ TREND_ARROWS[entry.trend] }} {{ entry.trend }}</span>
          </div>
        </div>
        <hr class="header-divider" />
        <p v-if="lastChange.previousRing" class="meta-line">
          Previous ring: <b>{{ lastChange.previousRing }}</b> &middot;
          Last change: <b>{{ lastChange.release ?? 'current (not yet released)' }}</b>
        </p>
        <p class="meta-line">Support: {{ entry.support }}</p>
      </div>
    </ui5-card>

    <div class="detail-layout">
      <div class="detail-main">
        <ui5-card class="what-to-do-card" :style="whatToDoStyle">
          <ui5-card-header slot="header" title-text="What to do"></ui5-card-header>
          <div class="card-body">
            <p class="recommendation">{{ entry.recommendation }}</p>
            <p class="meta-line">Reason: {{ entry.reason }}
              <a v-if="voteLink" :href="voteLink.url" target="_blank" rel="noopener">View ring proposal &amp; vote</a>
            </p>
          </div>
        </ui5-card>

        <ui5-card>
          <ui5-card-header slot="header" title-text="Ring history"></ui5-card-header>
          <div class="card-body">
            <div class="ring-timeline">
              <template v-for="(item, i) in timelineEntries" :key="item.release ?? 'now'">
                <div v-if="i > 0" class="timeline-connector" aria-hidden="true"></div>
                <div class="timeline-item" :class="{ now: item.isNow }">
                  <span class="ring-chip" :style="ringChipStyle(item.ring)">
                    {{ item.ring }}<template v-if="item.isNow"> &middot; now</template>
                  </span>
                  <span class="release">{{ item.release ?? 'now' }}</span>
                </div>
              </template>
            </div>
          </div>
        </ui5-card>

        <ui5-card v-if="referenceLinks.length">
          <ui5-card-header slot="header" title-text="References"></ui5-card-header>
          <div class="card-body">
            <div class="reference-grid">
              <a
                v-for="l in referenceLinks"
                :key="l.name"
                :href="l.url"
                target="_blank"
                rel="noopener"
                class="reference-chip"
              >
                <span class="reference-text"><b>{{ l.name }}</b> <span class="reference-host">{{ hostnameOf(l.url) }}</span></span>
                <span class="reference-arrow" aria-hidden="true">&#8599;</span>
              </a>
            </div>
          </div>
        </ui5-card>
      </div>

      <div class="detail-side">
        <ui5-card v-if="positionOnRadar">
          <ui5-card-header slot="header" title-text="Position on radar" :subtitle-text="entry.quadrant"></ui5-card-header>
          <div class="card-body">
            <svg viewBox="0 0 200 200" class="position-svg">
              <path :d="positionOnRadar.sectorPath" fill="#f3f4f6"></path>
              <path v-for="(d, i) in positionOnRadar.ringArcs" :key="i" :d="d" fill="none" stroke="#d9d9d9"></path>
              <circle v-for="b in positionOnRadar.otherBlips" :key="b.id" :cx="b.x" :cy="b.y" r="3" fill="#c3c9cf"></circle>
              <circle
                :cx="positionOnRadar.own.x"
                :cy="positionOnRadar.own.y"
                r="7"
                :fill="positionOnRadar.own.color"
                stroke="#131e29"
                stroke-width="2"
              ></circle>
            </svg>
            <a href="#" class="show-on-radar" @click.prevent="emit('show-on-radar', entry.id)">Show on full radar &rarr;</a>
          </div>
        </ui5-card>

        <ui5-card v-if="entry.related.length">
          <ui5-card-header slot="header" title-text="Related technologies"></ui5-card-header>
          <div class="card-body">
            <table>
              <thead><tr><th>Technology</th><th>Quadrant</th><th>Ring</th></tr></thead>
              <tbody>
                <tr v-for="r in entry.related" :key="r.id">
                  <td><a href="#" @click.prevent="emit('open-detail', r.id)">{{ r.title }}</a></td>
                  <td>{{ r.quadrant }}</td>
                  <td><RingPill :ring="r.ring" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </ui5-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page { padding: 1.5rem; max-width: 1280px; margin: 0 auto; }
.breadcrumb { margin-bottom: 1rem; font-size: 0.85rem; color: var(--sap-text-muted, #5b738b); }

.header-card { margin-bottom: 1.5rem; }
.what-to-do-card::part(root) {
  background: var(--what-to-do-bg) !important;
  border: 1px solid var(--what-to-do-border) !important;
}
.what-to-do-card ui5-card-header::part(root) {
  border-bottom: 1px solid var(--what-to-do-border) !important;
}
.what-to-do-card .card-body { padding-top: 0.5rem; }
.detail-layout { display: flex; align-items: flex-start; gap: 1.5rem; }
.detail-main { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 1.5rem; }
.detail-side { flex: 0 0 320px; display: flex; flex-direction: column; gap: 1.5rem; }

.card-body { padding: 1rem 1.25rem 1.25rem; }
.header-card .card-body { padding-top: 1.25rem; }
.description { color: var(--sap-text, #1a2733); }
.meta-line { color: var(--sap-text-muted, #5b738b); font-size: 0.9rem; }
.recommendation { font-weight: 600; font-size: 1.05rem; }

.header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; margin-bottom: 0.75rem; }
.header-divider { border: none; border-top: 1px solid var(--sap-border, #e4e7eb); margin: 0.75rem 0; }
.header-text { flex: 1 1 auto; min-width: 0; }
.meta-row { display: flex; align-items: center; gap: 0.5rem; flex: 0 0 auto; flex-wrap: wrap; justify-content: flex-end; }
.tag {
  display: inline-block;
  padding: 0.1rem 0.6rem;
  border: 1px solid var(--sap-border, #d9d9d9);
  border-radius: 0.75rem;
  font-size: 0.8rem;
  color: var(--sap-text-muted, #5b738b);
}

.ring-timeline { display: flex; align-items: flex-start; flex-wrap: wrap; row-gap: 1rem; }
.timeline-item { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
.timeline-item .release { font-size: 0.85rem; color: var(--sap-text-muted, #5b738b); }
.timeline-connector { flex: 1 1 2rem; min-width: 1.5rem; height: 1px; background: var(--sap-text-muted, #5b738b); margin: 0.65rem 0.5rem 0; }
.ring-chip {
  display: inline-block;
  padding: 0.15rem 0.7rem;
  border: 1px solid;
  border-radius: 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
}
.timeline-item.now .ring-chip { box-shadow: 0 0 0 3px rgba(0, 100, 217, 0.15); border-color: var(--sap-adopt, #0064d9); }

.reference-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.reference-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  height: 2.75rem;
  padding: 0 0.9rem;
  border: 1px solid var(--sap-border, #d9d9d9);
  border-radius: 0.5rem;
  background: #fff;
  color: var(--sap-text, #1a2733);
  text-decoration: none;
}
.reference-chip:hover { border-color: var(--sap-adopt, #0064d9); }
.reference-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reference-host { color: var(--sap-text-muted, #5b738b); font-weight: 400; margin-left: 0.3rem; font-size: 0.85rem; }
.reference-arrow { flex: 0 0 auto; color: var(--sap-text-muted, #5b738b); }

table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.4rem 0.3rem; border-bottom: 1px solid #f0f0f0; }

.position-svg { width: 100%; height: auto; display: block; }
.show-on-radar { display: inline-block; margin-top: 0.75rem; font-size: 0.9rem; }

@media (max-width: 900px) {
  .detail-layout { flex-direction: column; }
  .detail-side { flex: 1 1 auto; width: 100%; }
}

@media (max-width: 640px) {
  .reference-grid { grid-template-columns: 1fr; }
}
</style>
